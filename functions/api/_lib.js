/* Shared logic for the Claude-backed study generator.
 * Imported by both the Cloudflare Pages Function (functions/api/generate.js)
 * and the dependency-free local dev server (dev-server.mjs).
 *
 * Exposes:
 *   buildRequest(mode, payload) -> { system, user, max_tokens }
 *   parseResult(mode, text)     -> normalized object the frontend renders
 *   callClaude({ apiKey, fetchImpl, mode, payload }) -> { ok, data } | { ok:false, error }
 */

const MODEL = 'claude-sonnet-4-6';

/* ---- Prompt builders per mode ----
 * 목적: 한국어 학습(한글 ↔ 영어). 입력은 영어/한국어 어느 쪽이든 가능하며,
 * 결과는 항상 "익혀야 할 한국어 표현"을 중심에 두고 영어를 도우미 언어로 제공한다.
 */

function studyPrompt(payload) {
  const text = String(payload?.text || '').slice(0, 6000);
  const hasImg = Array.isArray(payload?.images) && payload.images.length > 0;
  const system = [
    'You are a smart tutor that helps ENGLISH-speaking learners study KOREAN.',
    'The learner is a native English speaker. ALL explanatory text (title, summary, "when", nuance, tips, quiz explanations) MUST be in natural English.',
    'Korean only appears as the target phrases/words being learned. For every Korean string, also give a Revised-Romanization reading so the learner can pronounce it.',
    hasImg
      ? 'Images are attached. Read the text in them (printed AND handwriting) via OCR and use that as the study material. Combine all pages.'
      : '',
    'Use Korean that people actually say, and accurate English equivalents.',
    '',
    'Beyond the input material, ALSO add a few naturally related expressions a Korean would say in the same situation (e.g. if the topic is sending emails, also include 지금 느낌 좋아 type casual expressions, greetings, or responses that fit the same context). These additions make the set feel alive and complete.',
    'Output EXACTLY one JSON object matching this schema. No code block, no preface, no commentary.',
    `{
  "title": string,                        // short English title (e.g. "Talking about your hobbies")
  "summary": [string, string, string],    // 3 short summary lines, in English
  "examples": [                           // 6+ items — include both the source material AND naturally related bonus expressions
    {
      "en": string,                       // the English sentence
      "koEasy": string, "koEasyRoman": string,        // Casual/everyday Korean + romanization
      "koNatural": string, "koNaturalRoman": string,  // Polite Korean + romanization
      "koAdvanced": string, "koAdvancedRoman": string,// Formal/honorific Korean + romanization
      "keywords": [{ "word": string, "roman": string, "meaning": string, "note": string }],  // 3-5 key vocab items from this sentence
      "grammar": [{ "pattern": string, "meaning": string, "example": string }],              // 2-3 grammar/particle points
      "when": string                      // usage note in English
    }
  ],
  "synonyms": [                           // 8+ — similar Korean words/expressions
    { "word": string, "roman": string, "similar": string, "similarRoman": string, "nuance": string }
  ],
  "tips": [string, string, string],       // "Good to know" — grammar, formal/casual, mix-ups, culture. In English, 3+
  "quiz": [                               // EXACTLY 10. Mix types evenly. DO NOT force the learner to type Korean.
    {
      "type": "choice" | "ko2en" | "en2ko" | "fill",
      "question": string,
      "options": [string] | null,         // 4 options for choice/en2ko, else null
      "answer": string,
      "explain": string
    }
  ],
  "flashcards": [                         // EXACTLY 10
    {
      "front": string, "roman": string, "back": string,
      "pos": string,                      // part of speech in English (Verb / Noun / Adjective / Expression / Adverb)
      "example": string,                  // Korean example sentence
      "exampleEn": string,                // English translation of the example
      "keywords": [{ "word": string, "meaning": string }]  // 2-3 key words from the example
    }
  ]
}`,
  ].filter(Boolean).join('\n');
  const user = hasImg
    ? `Read the attached image(s) and build a Korean study set for an English speaker.${text ? `\n\nExtra notes:\n${text}` : ''}`
    : `Build a Korean study set for an English speaker from this:\n\n${text}`;
  return { system, user, max_tokens: 8000 };
}

function vocabPrompt(payload) {
  const count = Math.min(Math.max(Number(payload?.count) || 5, 3), 15);
  const seed = String(payload?.seed || '');
  const system = [
    'You recommend "Korean words to learn today" to a native ENGLISH speaker learning Korean.',
    'Pick useful, real-life Korean words/expressions. Choose your own theme; mix difficulty and parts of speech; keep it fresh each time.',
    'Output EXACTLY one JSON object. No code block, no commentary.',
    `{
  "words": [
    { "word": string, "roman": string, "pos": string, "meaning": string, "example": string, "exampleRoman": string, "en": string }
  ]  // exactly ${count} items. word=Korean word/phrase, roman=romanization, pos=part of speech (English, e.g. noun/verb/adj), meaning=English meaning, example=Korean example sentence, exampleRoman=its romanization, en=English translation of the example
}`,
  ].join('\n');
  return {
    system,
    user: `Recommend ${count} Korean words to learn today.${seed ? ` (diversity seed: ${seed})` : ''}`,
    max_tokens: 2048,
  };
}

export function buildRequest(mode, payload) {
  if (mode === 'vocab') return vocabPrompt(payload);
  return studyPrompt(payload);
}

/* ---- Result parsing ---- */

function extractJson(text) {
  if (!text) return null;
  // strip code fences if the model added them
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

export function parseResult(mode, text) {
  const obj = extractJson(text);
  if (!obj) return null;
  if (mode === 'vocab') {
    if (!Array.isArray(obj.words)) return null;
    return obj;
  }
  // study
  if (!Array.isArray(obj.examples) || !Array.isArray(obj.quiz)) return null;
  obj.summary = Array.isArray(obj.summary) ? obj.summary : [];
  obj.synonyms = Array.isArray(obj.synonyms) ? obj.synonyms : [];
  obj.tips = Array.isArray(obj.tips) ? obj.tips : [];
  obj.flashcards = Array.isArray(obj.flashcards) ? obj.flashcards : [];
  return obj;
}

/* Build an Anthropic image content block from a data URL or { media_type, data }. */
function toImageBlock(img) {
  let media_type, data;
  if (typeof img === 'string') {
    const m = img.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!m) return null;
    media_type = m[1];
    data = m[2];
  } else if (img && img.data) {
    media_type = img.media_type || 'image/jpeg';
    data = String(img.data).replace(/^data:[^,]+,/, '');
  } else {
    return null;
  }
  return { type: 'image', source: { type: 'base64', media_type, data } };
}

/* ---- Claude call ---- */

export async function callClaude({ apiKey, fetchImpl, mode, payload }) {
  if (!apiKey) return { ok: false, error: 'missing_api_key' };
  const f = fetchImpl || fetch;
  const { system, user, max_tokens } = buildRequest(mode, payload);

  // study mode may include up to 5 attached images (Claude vision = OCR)
  let content = user;
  const imgs = mode === 'study' && Array.isArray(payload?.images) ? payload.images.slice(0, 5) : [];
  const blocks = imgs.map(toImageBlock).filter(Boolean);
  if (blocks.length) content = [...blocks, { type: 'text', text: user }];

  try {
    const res = await f('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens,
        system,
        messages: [{ role: 'user', content }],
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return { ok: false, error: `claude_http_${res.status}`, detail: detail.slice(0, 500) };
    }
    const data = await res.json();
    const text = (data?.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    const parsed = parseResult(mode, text);
    if (!parsed) return { ok: false, error: 'parse_failed', detail: text.slice(0, 500) };
    return { ok: true, data: parsed };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

export { MODEL };
