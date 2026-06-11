/* Cloudflare Pages Function — POST /api/generate
 * Proxies the Claude API so the API key never reaches the browser.
 * Body: { mode: "study"|"transform"|"vocab", payload: {...} }
 * Set ANTHROPIC_API_KEY in the Pages project environment variables.
 */
import { callClaude } from './_lib.js';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'bad_json' }, 400);
  }
  const mode = body?.mode || 'study';
  if (!['study', 'vocab'].includes(mode)) {
    return json({ ok: false, error: 'bad_mode' }, 400);
  }
  const result = await callClaude({
    apiKey: env.ANTHROPIC_API_KEY,
    fetchImpl: fetch,
    mode,
    payload: body?.payload || {},
  });
  return json(result, result.ok ? 200 : 502);
}

export async function onRequestGet() {
  return json({ ok: true, hint: 'POST { mode, payload } here.' });
}
