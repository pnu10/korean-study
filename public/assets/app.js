/* english-study — Toss-style paste-to-study English helper.
 * Pure ES module, no build step. State persists in localStorage.
 */

/* ---------------- storage ---------------- */
const KEY = {
  sets: 'es.sets',          // [{ id, title, date, level, purpose, data }]
  wrong: 'es.wrong',        // [{ id, question, your, answer, explain, date }]
  cards: 'es.cards',        // { cardKey: { status: 'know'|'meh'|'no', front, back, example, date } }
  usage: 'es.usage',        // { date: 'YYYY-MM-DD', count }
};

/* daily limit for generating study sets */
const DAILY_LIMIT = 5;
function quotaToday() {
  const u = load(KEY.usage, { date: '', count: 0 });
  return u.date === todayStr() ? u : { date: todayStr(), count: 0 };
}
const quotaLeft = () => Math.max(0, DAILY_LIMIT - quotaToday().count);
function bumpQuota() {
  const u = quotaToday();
  u.count += 1;
  save(KEY.usage, u);
}
const load = (k, fallback) => {
  try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fallback; } catch { return fallback; }
};
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const todayStr = () => new Date().toISOString().slice(0, 10);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (iso) => {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
};
// 'YYYY-MM-DD' → Today / Yesterday / Jun 9
function dayLabel(dayStr) {
  const today = todayStr();
  if (dayStr === today) return 'Today';
  const diff = Math.round((new Date(today + 'T00:00:00') - new Date(dayStr + 'T00:00:00')) / 86400000);
  if (diff === 1) return 'Yesterday';
  return fmtDate(dayStr);
}
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------------- Lucide line icons (inline SVG, no CDN) ---------------- */
const ICONS = {
  'wand-sparkles': '<path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/>',
  'square-stack': '<path d="M4 10c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2"/><path d="M8 14c-1.1 0-2-.9-2-2v-4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2"/><rect width="8" height="8" x="10" y="10" rx="2"/>',
  brain: '<path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M19.938 10.5a4 4 0 0 1 .585.396"/><path d="M6 18a4 4 0 0 1-1.967-.516"/><path d="M19.967 17.484A4 4 0 0 1 18 18"/>',
  'library-big': '<rect width="8" height="18" x="3" y="3" rx="1"/><path d="M7 3v18"/><path d="M20.4 18.9c.2.5-.1 1.1-.6 1.3l-1.9.7c-.5.2-1.1-.1-1.3-.6L11.1 5.1c-.2-.5.1-1.1.6-1.3l1.9-.7c.5-.2 1.1.1 1.3.6Z"/>',
  'circle-x': '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  'image-plus': '<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><line x1="16" x2="22" y1="5" y2="5"/><line x1="19" x2="19" y1="2" y2="8"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'volume-2': '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/>',
};
const icon = (name) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;

/* ---------------- text-to-speech (Korean, Web Speech API) ---------------- */
let _koVoice = null;
function pickKoVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = speechSynthesis.getVoices();
  _koVoice = voices.find((v) => (v.lang || '').toLowerCase().startsWith('ko')) || null;
  return _koVoice;
}
if ('speechSynthesis' in window) {
  pickKoVoice();
  speechSynthesis.onvoiceschanged = pickKoVoice;
}
function speak(text) {
  if (!text || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  u.rate = 0.9;
  if (_koVoice || pickKoVoice()) u.voice = _koVoice;
  speechSynthesis.speak(u);
}
// One small round speaker button that reads the given Korean text aloud.
const speakBtn = (kr) => `<button class="speak" data-say="${esc(kr)}" aria-label="Play pronunciation" type="button">${icon('volume-2')}</button>`;
// Delegated: any .speak click plays its Korean text (stops bubbling so cards don't flip).
document.addEventListener('click', (e) => {
  const b = e.target.closest('.speak');
  if (!b) return;
  e.stopPropagation();
  e.preventDefault();
  speak(b.dataset.say);
});

document.addEventListener('click', (e) => {
  const chip = e.target.closest('.kw-chip');
  if (!chip) return;
  e.stopPropagation();
  const detail = chip.closest('.ex__kw-wrap')?.querySelector('.kw-detail');
  if (!detail) return;
  const isGr = chip.classList.contains('kw-chip--gr');
  let data;
  try { data = JSON.parse(chip.dataset.kwdetail); } catch { return; }

  // toggle off if same chip is active
  if (detail.dataset.activeChip === chip.dataset.kwdetail && !detail.hidden) {
    detail.hidden = true;
    chip.classList.remove('is-active');
    return;
  }
  chip.closest('.ex__kw-wrap').querySelectorAll('.kw-chip').forEach(c => c.classList.remove('is-active'));
  chip.classList.add('is-active');
  detail.dataset.activeChip = chip.dataset.kwdetail;

  if (isGr) {
    detail.innerHTML = `
      <div class="kw-detail__pattern">${esc(data.pattern)}</div>
      <div class="kw-detail__meaning">${esc(data.meaning)}</div>
      ${data.example ? `<div class="kw-detail__ex">${esc(data.example)}</div>` : ''}
    `;
  } else {
    detail.innerHTML = `
      <div class="kw-detail__word">${esc(data.word)}${data.roman ? `<span class="kw-detail__roman">${esc(data.roman)}</span>` : ''}</div>
      <div class="kw-detail__meaning">${esc(data.meaning)}</div>
      ${data.note ? `<div class="kw-detail__note">${esc(data.note)}</div>` : ''}
    `;
  }
  detail.hidden = false;
});

/* ---------------- image helpers (client-side resize → base64 for OCR) ---------------- */
const MAX_PHOTOS = 5;
function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
async function downscaleImage(file, max = 1600, quality = 0.85) {
  const img = await fileToImage(file);
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  return { dataUrl, media_type: 'image/jpeg', data: dataUrl.split(',')[1] };
}

/* ---------------- dom helpers ---------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const screen = $('#screen');
const topbarTitle = $('#topbarTitle');
const backBtn = $('#backBtn');

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.hidden = true), 1800);
}

/* ---------------- api ---------------- */
async function generate(mode, payload) {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode, payload }),
  });
  const j = await res.json().catch(() => ({ ok: false, error: 'bad_response' }));
  if (!j.ok) throw new Error(j.error === 'missing_api_key' ? 'API key is not set.' : (j.error || 'Failed to generate'));
  return j.data;
}

/* ---------------- router ---------------- */
const views = {};
let current = 'home';
let history = [];

function go(view, opts = {}, { push = true } = {}) {
  if (push && view !== current) history.push({ view: current });
  current = view;
  render(view, opts);
  updateChrome(view);
  screen.scrollTop = 0;
}
function back() {
  const prev = history.pop();
  if (prev) go(prev.view, {}, { push: false });
  else go('home', {}, { push: false });
}
backBtn.addEventListener('click', back);

function updateChrome(view) {
  const tabViews = ['home', 'review', 'vocab', 'wrong', 'sets'];
  const isTab = tabViews.includes(view);
  backBtn.hidden = isTab;
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('is-active', t.dataset.view === view));
  topbarTitle.textContent = TITLES[view] || '아기의 한국어 공부';
}
const TITLES = {
  home: '아기의 한국어 공부',
  result: 'Study set',
  review: 'Review',
  vocab: 'Vocab',
  wrong: 'Mistakes',
  sets: 'Library',
  flashplay: 'Flashcards',
};

document.querySelectorAll('.tab').forEach((t) => {
  t.addEventListener('click', () => { history = []; go(t.dataset.view, {}, { push: false }); });
});

function render(view, opts) {
  const fn = views[view] || views.home;
  screen.innerHTML = '';
  const el = document.createElement('div');
  el.className = 'view';
  screen.appendChild(el);
  fn(el, opts);
}

/* ================================================================
 * HOME — paste & generate
 * ================================================================ */
views.home = (root) => {
  root.innerHTML = `
    <div class="hero">
      <h2>Paste anything and get<br/>Korean phrases, words<br/>&amp; quizzes.</h2>
      <p>Paste English (or Korean) — learn how to say it in Korean, with pronunciation &amp; audio.</p>
    </div>

    <div class="field-card">
      <textarea class="textarea textarea--bare" id="paste" placeholder="Paste what you want to study here.&#10;e.g. I'm into photography. / 사진에 관심 있어요 ..."></textarea>
      <input type="file" id="fileInput" accept="image/*" multiple hidden />
      <div class="thumbs" id="thumbs"></div>
      <div class="field-card__foot">
        <button class="linkbtn" id="addPhoto" type="button">${icon('image-plus')}<span>Add photos</span> <b id="photoCount">0</b>/${MAX_PHOTOS}</button>
      </div>
    </div>
    <p class="muted" style="margin:9px 4px 0;font-size:12px">Upload photos of a textbook or notes — we'll read the text and build a study set.</p>

    <button class="btn btn--primary btn--lg" id="makeBtn" style="margin-top:16px">Create study set</button>
    <p class="muted center" id="quotaInfo" style="margin:11px 0 0"></p>

    <div class="section-title">Shortcuts</div>
    <div class="menu-card">
      <button data-q="sets"><span class="iconbox iconbox--sm">${icon('library-big')}</span><span class="menu-row__body"><span class="menu-row__t">My library</span><span class="menu-row__d">Saved study sets</span></span><span class="menu-row__go">${icon('chevron-right')}</span></button>
      <button data-q="review"><span class="iconbox iconbox--sm">${icon('brain')}</span><span class="menu-row__body"><span class="menu-row__t">Review</span><span class="menu-row__d">Redo what you missed</span></span><span class="menu-row__go">${icon('chevron-right')}</span></button>
      <button data-q="vocab"><span class="iconbox iconbox--sm">${icon('square-stack')}</span><span class="menu-row__body"><span class="menu-row__t">Today's vocab</span><span class="menu-row__d">Random Korean words</span></span><span class="menu-row__go">${icon('chevron-right')}</span></button>
    </div>
  `;

  const makeBtn = $('#makeBtn', root);
  const refreshQuota = () => {
    const left = quotaLeft();
    $('#quotaInfo', root).textContent = left > 0
      ? `${left}/${DAILY_LIMIT} study sets left today`
      : "You've used all of today's study sets. Come back tomorrow!";
    makeBtn.disabled = left <= 0;
  };
  refreshQuota();

  root.querySelectorAll('.menu-card button').forEach((b) =>
    b.addEventListener('click', () => { history = [{ view: 'home' }]; go(b.dataset.q); }));

  /* ---- photo attachments (max 5, OCR by Claude vision) ---- */
  const photos = [];
  const fileInput = $('#fileInput', root);
  const addPhoto = $('#addPhoto', root);
  const thumbs = $('#thumbs', root);
  const photoCount = $('#photoCount', root);

  const renderThumbs = () => {
    photoCount.textContent = String(photos.length);
    addPhoto.disabled = photos.length >= MAX_PHOTOS;
    thumbs.innerHTML = photos.map((p, i) =>
      `<div class="thumb"><img src="${p.dataUrl}" alt="photo ${i + 1}" /><button class="thumb__rm" data-i="${i}" aria-label="remove">×</button></div>`).join('');
    thumbs.querySelectorAll('.thumb__rm').forEach((b) =>
      b.addEventListener('click', () => { photos.splice(Number(b.dataset.i), 1); renderThumbs(); }));
  };

  addPhoto.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const files = [...fileInput.files];
    fileInput.value = '';
    for (const file of files) {
      if (photos.length >= MAX_PHOTOS) { toast(`Up to ${MAX_PHOTOS} photos.`); break; }
      if (!file.type.startsWith('image/')) continue;
      try { photos.push(await downscaleImage(file)); } catch { toast("Couldn't read that image."); }
    }
    renderThumbs();
  });

  makeBtn.addEventListener('click', async () => {
    if (quotaLeft() <= 0) { toast(`You can create ${DAILY_LIMIT} study sets per day.`); return; }
    const text = $('#paste', root).value.trim();
    if (text.length < 4 && photos.length === 0) { toast('Paste some text or add a photo first.'); return; }
    const withImg = photos.length > 0;
    loading(
      withImg ? 'Reading your photos and building a study set…' : 'Building your study set…',
      withImg
        ? ['Reading the text in your photos', 'Summarizing the key points', 'Writing the quiz']
        : ['Summarizing the key points', 'Picking Korean phrases', 'Writing the quiz']
    );
    try {
      const images = photos.map((p) => ({ media_type: p.media_type, data: p.data }));
      const data = await generate('study', { text, images });
      bumpQuota();
      const set = { id: uid(), title: data.title || 'Study set', date: new Date().toISOString(), data };
      go('result', { set, fresh: true });
    } catch (e) {
      go('home');
      toast(e.message);
    }
  });
};

function loading(title, steps = []) {
  screen.innerHTML = `<div class="loader"><div class="spinner"></div><p id="ldTxt">${esc(title)}</p></div>`;
  if (steps.length) {
    let i = 0;
    const el = $('#ldTxt');
    clearInterval(loading._t);
    loading._t = setInterval(() => { if (el) el.textContent = steps[i++ % steps.length] + '…'; }, 1400);
  }
}

/* ================================================================
 * RESULT — full study set (cards)
 * ================================================================ */
views.result = (root, { set, fresh } = {}) => {
  clearInterval(loading._t);
  if (!set) { renderEmpty(root, '🗂️', 'Create a study set first.'); return; }
  const d = set.data;

  const savedAlready = load(KEY.sets, []).some((s) => s.id === set.id);

  root.innerHTML = `
    <div class="hero" style="padding-bottom:0">
      <h2 style="font-size:21px;margin-bottom:4px">${esc(set.title)}</h2>
      <p>${fmtDate(set.date)} · English → Korean</p>
    </div>

    ${cardSummary(d)}
    ${cardExamples(d)}
    ${cardSynonyms(d)}
    ${cardTips(d)}

    <div class="card center">
      <div class="card__head" style="justify-content:center"><span class="card__ico">📝</span><h3 class="card__title">Quiz · ${d.quiz.length} questions</h3></div>
      <p class="muted" style="margin:0 0 14px">Check what you just learned.</p>
      <button class="btn btn--primary" id="quizBtn">Start quiz</button>
    </div>

    <div class="card center">
      <div class="card__head" style="justify-content:center"><span class="card__ico">🃏</span><h3 class="card__title">Flashcards · ${d.flashcards.length}</h3></div>
      <p class="muted" style="margin:0 0 14px">Sort each card into Got it / Almost / Forgot.</p>
      <button class="btn btn--ghost" id="flashBtn">Open flashcards</button>
    </div>

    <button class="btn ${savedAlready ? 'btn--ghost' : 'btn--primary'}" id="saveBtn" style="margin-top:6px">
      ${savedAlready ? '✓ Saved' : 'Save this study set'}
    </button>
  `;

  $('#quizBtn', root).addEventListener('click', () => openQuiz(d.quiz, set.title));
  $('#flashBtn', root).addEventListener('click', () => go('flashplay', { cards: d.flashcards, title: set.title }));
  $('#saveBtn', root).addEventListener('click', (e) => {
    const sets = load(KEY.sets, []);
    if (sets.some((s) => s.id === set.id)) { toast('Already saved.'); return; }
    sets.unshift(set);
    save(KEY.sets, sets);
    e.target.className = 'btn btn--ghost';
    e.target.textContent = '✓ Saved';
    toast('Saved to your library.');
  });

  if (fresh) {
    const sets = load(KEY.sets, []);
    if (!sets.some((s) => s.id === set.id)) { sets.unshift(set); save(KEY.sets, sets); }
  }
};

function cardSummary(d) {
  return `
  <div class="card">
    <div class="card__head"><span class="card__ico">⭐</span><h3 class="card__title">Summary</h3></div>
    <ul class="sumlist">${(d.summary || []).map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
  </div>`;
}

// One Korean line: pill + (Korean text + romanization) + speaker button
function koRow(label, cls, kr, roman) {
  if (!kr) return '';
  return `<div class="ex__line">
    <span class="pill ${cls}">${label}</span>
    <span class="ex__kr"><span class="ex__krtext">${esc(kr)}</span>${roman ? `<span class="ex__roman">${esc(roman)}</span>` : ''}</span>
    ${speakBtn(kr)}
  </div>`;
}

function kwChipRow(label, chips, type) {
  if (!chips || !chips.length) return '';
  return `<div class="ex__chips-row">
    <span class="ex__chips-label">${label}</span>
    <div class="ex__chips">
      ${chips.map((c) => {
        const word = type === 'grammar' ? c.pattern : c.word;
        const meaning = c.meaning;
        const detail = esc(JSON.stringify(c));
        return `<button class="kw-chip${type === 'grammar' ? ' kw-chip--gr' : ''}" data-kwdetail='${detail}'><span class="kw-chip__w">${esc(word)}</span><span class="kw-chip__sep">·</span><span class="kw-chip__m">${esc(meaning)}</span></button>`;
      }).join('')}
    </div>
  </div>`;
}

function cardExamples(d) {
  return `
  <div class="card">
    <div class="card__head"><span class="card__ico">💬</span><h3 class="card__title">Phrases</h3>
      <div style="flex:1"></div><span class="muted">English → Korean</span></div>
    ${(d.examples || []).map((e) => `
      <div class="ex">
        <div class="ex__line"><span class="pill">EN</span><span class="ex__en" style="font-weight:500;color:var(--ink-2)">${esc(e.en)}</span></div>
        ${koRow('Casual', 'pill--easy', e.koEasy, e.koEasyRoman)}
        ${koRow('Polite', 'pill--natural', e.koNatural, e.koNaturalRoman)}
        ${koRow('Formal', 'pill--adv', e.koAdvanced, e.koAdvancedRoman)}
        ${(e.keywords?.length || e.grammar?.length) ? `
          <div class="ex__kw-wrap">
            ${kwChipRow('Key words', e.keywords, 'word')}
            ${kwChipRow('Grammar', e.grammar, 'grammar')}
            <div class="ex__chips-hint">Tap any chip for details</div>
            <div class="kw-detail" hidden></div>
          </div>` : ''}
        ${e.when ? `<div class="ex__when"><b class="ex__when-title">💡 Usage tip</b><br/>${esc(e.when)}</div>` : ''}
      </div>`).join('')}
  </div>`;
}

function cardTips(d) {
  if (!d.tips || !d.tips.length) return '';
  return `
  <div class="card">
    <div class="card__head"><span class="card__ico">💡</span><h3 class="card__title">Good to know</h3></div>
    <ul class="sumlist">${d.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
  </div>`;
}

function cardSynonyms(d) {
  if (!d.synonyms || !d.synonyms.length) return '';
  return `
  <div class="card">
    <div class="card__head"><span class="card__ico">🔗</span><h3 class="card__title">Similar expressions</h3></div>
    <div class="syn">
      <div class="syn__h">Word</div><div class="syn__h">Similar</div><div class="syn__h">Nuance</div>
      ${d.synonyms.map((s) => `
        <div class="syn__w">${esc(s.word)}${s.roman ? `<span class="syn__roman">${esc(s.roman)}</span>` : ''}</div>
        <div>${esc(s.similar)}${s.similarRoman ? `<span class="syn__roman">${esc(s.similarRoman)}</span>` : ''}</div>
        <div class="syn__n">${esc(s.nuance)}</div>
      `).join('')}
    </div>
  </div>`;
}

/* ================================================================
 * QUIZ — overlay-ish in-place flow
 * ================================================================ */
function openQuiz(quiz, setTitle) {
  let i = 0;
  let correct = 0;
  history.push({ view: current });
  current = 'quiz';
  updateChrome('result');
  topbarTitle.textContent = 'Quiz';

  const step = () => {
    if (i >= quiz.length) return finishQuiz(correct, quiz.length, setTitle);
    const q = quiz[i];
    screen.scrollTop = 0;
    screen.innerHTML = `<div class="view"><div class="card">
      <div class="quiz__progress">${i + 1} / ${quiz.length}</div>
      <p class="quiz__q">${esc(q.question)}</p>
      <div id="qbody"></div>
      <div id="qfeed"></div>
    </div></div>`;
    const body = $('#qbody');
    const feed = $('#qfeed');

    const hasOptions = Array.isArray(q.options) && q.options.length;
    if (hasOptions) {
      body.innerHTML = `<div class="quiz__opts">${q.options.map((o, k) => `<button class="quiz__opt" data-k="${k}">${esc(o)}</button>`).join('')}</div>`;
      body.querySelectorAll('.quiz__opt').forEach((btn) =>
        btn.addEventListener('click', () => {
          const chosen = q.options[Number(btn.dataset.k)];
          const ok = norm(chosen) === norm(q.answer);
          body.querySelectorAll('.quiz__opt').forEach((b) => {
            b.disabled = true;
            if (norm(q.options[Number(b.dataset.k)]) === norm(q.answer)) b.classList.add('is-correct');
          });
          if (!ok) btn.classList.add('is-wrong');
          afterAnswer(ok, chosen, q, feed, step, () => (i++, correct += ok ? 1 : 0));
        }));
    } else {
      body.innerHTML = `
        <input class="input" id="qinput" placeholder="Type your answer" autocapitalize="off" autocomplete="off" />
        <div class="btn-row"><button class="btn btn--primary" id="qsubmit">Check</button></div>`;
      const submit = () => {
        const val = $('#qinput').value.trim();
        if (!val) return;
        const ok = norm(val) === norm(q.answer) || softMatch(val, q.answer);
        $('#qinput').disabled = true;
        $('#qsubmit').disabled = true;
        afterAnswer(ok, val, q, feed, step, () => (i++, correct += ok ? 1 : 0));
      };
      $('#qsubmit').addEventListener('click', submit);
      $('#qinput').addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
      $('#qinput').focus();
    }
  };
  step();
}

function afterAnswer(ok, your, q, feed, next, commit) {
  commit();
  if (!ok) recordWrong(q, your);
  feed.innerHTML = `
    <div class="quiz__feedback ${ok ? 'ok' : 'no'}">
      ${ok ? '✅ Correct!' : `❌ Not quite. Answer: <b>${esc(q.answer)}</b>`}
      ${q.explain ? `<small>${esc(q.explain)}</small>` : ''}
    </div>
    <div class="btn-row"><button class="btn btn--primary" id="qnext">Next</button></div>`;
  $('#qnext').addEventListener('click', next);
  feed.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function finishQuiz(correct, total, setTitle) {
  const pct = Math.round((correct / total) * 100);
  const msg = pct === 100 ? 'Perfect! 🎉' : pct >= 60 ? 'Nice work! 👏' : 'Review your mistakes 💪';
  screen.innerHTML = `<div class="view"><div class="card center">
    <div style="font-size:46px">${pct >= 60 ? '🎉' : '📕'}</div>
    <h3 class="card__title" style="margin:10px 0 4px">${msg}</h3>
    <p class="muted"><b style="color:var(--blue)">${correct}</b> / ${total} correct (${pct}%)</p>
    <div class="btn-row" style="margin-top:18px">
      <button class="btn btn--ghost" id="toWrong">Mistakes</button>
      <button class="btn btn--primary" id="qdone">Done</button>
    </div>
  </div></div>`;
  $('#qdone').addEventListener('click', () => { current = 'result'; back(); });
  $('#toWrong').addEventListener('click', () => { history = [{ view: 'home' }]; go('wrong'); });
}

const norm = (s) => String(s || '').toLowerCase().replace(/[.,!?;:'"]/g, '').replace(/\s+/g, ' ').trim();
const softMatch = (a, b) => { const x = norm(a), y = norm(b); return x.length > 3 && (x === y || y.includes(x) || x.includes(y)); };

function recordWrong(q, your) {
  const list = load(KEY.wrong, []);
  list.unshift({ id: uid(), question: q.question, your, answer: q.answer, explain: q.explain || '', date: new Date().toISOString() });
  save(KEY.wrong, list.slice(0, 100));
}

/* ================================================================
 * FLASHCARDS
 * ================================================================ */
const cardKey = (c) => `${norm(c.front)}|${norm(c.back)}`;

views.flashplay = (root, { cards, title } = {}) => {
  const store = load(KEY.cards, {});
  if (!cards || !cards.length) { renderEmpty(root, '🃏', 'No flashcards yet.'); return; }
  let i = 0;
  const shortTitle = (() => { const m = (title || '').match(/\(([^)]+)\)/); return m ? m[1] : (title || '').slice(0, 30); })();

  const view = () => {
    const c = cards[i];
    const pct = Math.round((i / cards.length) * 100);
    const backKws = c.keywords?.length
      ? `<div class="flash__kws">${c.keywords.map((k) => `<span class="flash__kw"><span class="flash__kw-w">${esc(k.word)}</span><span class="flash__kw-sep">·</span><span class="flash__kw-m">${esc(k.meaning)}</span></span>`).join('')}</div>`
      : '';

    root.innerHTML = `
      <div class="flash__header">
        <div class="flash__title">${esc(shortTitle)}</div>
        <div class="flash__prog-bar"><div class="flash__prog-fill" style="width:${pct}%"></div></div>
        <div class="flash__counter">${i + 1} of ${cards.length}</div>
      </div>
      <div class="flash" id="flash">
        <div class="flash__inner">
          <div class="flash__face flash__front">
            ${c.pos ? `<div class="flash__pos">${esc(c.pos)}</div>` : ''}
            <div class="flash__big">${esc(c.front)}</div>
            ${c.roman ? `<div class="flash__roman">${esc(c.roman)}</div>` : ''}
            <button class="speak flash__listen" data-say="${esc(c.front)}" type="button">${icon('volume-2')}<span>Listen</span></button>
            <div class="flash__hint">Tap to reveal meaning</div>
          </div>
          <div class="flash__face flash__back">
            <div class="flash__back-word">${esc(c.front)}${c.roman ? `<span class="flash__back-roman">${esc(c.roman)}</span>` : ''}</div>
            <div class="flash__meaning">${esc(c.back)}</div>
            ${c.example ? `<div class="flash__ex-block"><div class="flash__ex-label">Example</div><div class="flash__ex-kr">${esc(c.example)}</div>${c.exampleEn ? `<div class="flash__ex-en">${esc(c.exampleEn)}</div>` : ''}</div>` : ''}
            ${backKws}
          </div>
        </div>
      </div>
      <div class="flash__rate">
        <button class="rate--no" data-s="no">Forgot</button>
        <button class="rate--meh" data-s="meh">Almost</button>
        <button class="rate--know" data-s="know">Got it</button>
      </div>
    `;
    const flash = $('#flash', root);
    flash.addEventListener('click', (e) => { if (e.target.closest('.speak')) return; flash.classList.toggle('is-flipped'); });
    root.querySelectorAll('.flash__rate button').forEach((b) =>
      b.addEventListener('click', () => {
        store[cardKey(c)] = { status: b.dataset.s, front: c.front, roman: c.roman || '', back: c.back, example: c.example || '', date: new Date().toISOString() };
        save(KEY.cards, store);
        i++;
        if (i >= cards.length) return done();
        view();
      }));
  };

  const done = () => {
    root.innerHTML = `<div class="card center">
      <div style="font-size:46px">🃏</div>
      <h3 class="card__title" style="margin:10px 0 4px">All done!</h3>
      <p class="muted">Cards you marked "Almost" or "Forgot" come back in the <b>Review</b> tab.</p>
      <div class="btn-row" style="margin-top:18px">
        <button class="btn btn--ghost" id="again">Again</button>
        <button class="btn btn--primary" id="toReview">Go to Review</button>
      </div>
    </div>`;
    $('#again', root).addEventListener('click', () => { i = 0; view(); });
    $('#toReview', root).addEventListener('click', () => { history = [{ view: 'home' }]; go('review'); });
  };

  view();
};

/* ================================================================
 * REVIEW — 오늘의 복습 (헷갈린 카드 + 최근 오답)
 * ================================================================ */
views.review = (root) => {
  const store = load(KEY.cards, {});
  const due = Object.values(store).filter((c) => c.status === 'meh' || c.status === 'no');
  const wrong = load(KEY.wrong, []);

  if (!due.length && !wrong.length) {
    renderEmpty(root, '🔁', "Nothing to review yet.\nCreate a study set, then try the quiz and flashcards.");
    return;
  }

  root.innerHTML = `
    <div class="hero hero--icon">
      <span class="iconbox">${icon('brain')}</span>
      <div>
        <h2 style="font-size:21px">${due.length + Math.min(wrong.length, 99)} things to review today</h2>
        <p>Start with what tripped you up.</p>
      </div>
    </div>
    ${due.length ? `
      <div class="card">
        <div class="card__head"><span class="card__ico">🤔</span><h3 class="card__title">${due.length} tricky cards</h3></div>
        <p class="muted" style="margin:0 0 12px">Cards you marked "Almost" or "Forgot".</p>
        <button class="btn btn--primary" id="reviewCards">Review now</button>
      </div>` : ''}
    ${wrong.length ? `
      <div class="card">
        <div class="card__head"><span class="card__ico">📕</span><h3 class="card__title">${wrong.length} recent mistakes</h3></div>
        <p class="muted" style="margin:0 0 12px">Redo them from your Mistakes list.</p>
        <button class="btn btn--ghost" id="reviewWrong">Open Mistakes</button>
      </div>` : ''}
  `;

  const cardsBtn = $('#reviewCards', root);
  if (cardsBtn) cardsBtn.addEventListener('click', () =>
    go('flashplay', { cards: due.map((c) => ({ front: c.front, roman: c.roman, back: c.back, example: c.example })), title: 'Review' }));
  const wrongBtn = $('#reviewWrong', root);
  if (wrongBtn) wrongBtn.addEventListener('click', () => go('wrong'));
};

/* ================================================================
 * WRONG NOTES — 오답노트
 * ================================================================ */
views.wrong = (root) => {
  const list = load(KEY.wrong, []);
  if (!list.length) { renderEmpty(root, '📕', "No mistakes yet.\nQuestions you miss in the quiz collect here."); return; }

  root.innerHTML = `
    <div class="card">
      <div class="card__head"><span class="card__ico">📕</span><h3 class="card__title">Mistakes</h3>
        <div style="flex:1"></div>
        <button class="btn btn--ghost btn--sm" id="clearWrong">Clear all</button>
      </div>
      <div id="wrongList">
        ${list.map((w) => `
          <div class="wrong">
            <div class="wrong__q">${esc(w.question)}</div>
            <div class="wrong__row"><span class="k">You</span><span class="wrong__bad">${esc(w.your || '—')}</span></div>
            <div class="wrong__row"><span class="k">Answer</span><span class="wrong__good">${esc(w.answer)}</span></div>
            ${w.explain ? `<div class="wrong__row muted">${esc(w.explain)}</div>` : ''}
          </div>`).join('')}
      </div>
    </div>
    <button class="btn btn--primary" id="retryWrong">Retry these</button>
  `;

  $('#clearWrong', root).addEventListener('click', () => {
    if (confirm('Clear all mistakes?')) { save(KEY.wrong, []); go('wrong', {}, { push: false }); toast('Mistakes cleared.'); }
  });
  $('#retryWrong', root).addEventListener('click', () => {
    const quiz = list.map((w) => ({ type: 'fill', question: w.question, options: null, answer: w.answer, explain: w.explain }));
    openQuiz(quiz, 'Retry mistakes');
  });
};

/* ================================================================
 * VOCAB — 오늘의 보카 (random words)
 * ================================================================ */
views.vocab = (root) => {
  root.innerHTML = `
    <div class="hero hero--icon">
      <span class="iconbox">${icon('square-stack')}</span>
      <div>
        <h2 style="font-size:21px">Korean words for today</h2>
        <p>A fresh random set of useful, everyday Korean words.</p>
      </div>
    </div>
    <div id="vout"></div>
  `;
  const out = $('#vout', root);
  const run = async () => {
    out.innerHTML = `<div class="loader"><div class="spinner"></div><p>Picking today's words…</p></div>`;
    try {
      const data = await generate('vocab', { count: 5, seed: uid() });
      out.innerHTML = `
        <div class="card" style="margin-top:14px">
          <div class="card__head"><span class="card__ico">🎯</span><h3 class="card__title">${data.words.length} words today</h3></div>
          ${data.words.map((w) => `
            <div class="ex">
              <div class="ex__line">
                <span class="ex__kr"><span class="ex__krtext">${esc(w.word)}</span>${w.roman ? `<span class="ex__roman">${esc(w.roman)}</span>` : ''}</span>
                <span class="pill">${esc(w.pos || '')}</span>${speakBtn(w.word)}
              </div>
              <div class="ex__ko"><b>${esc(w.meaning)}</b></div>
              <div class="ex__ko">"${esc(w.example)}"${w.exampleRoman ? ` <span class="muted">· ${esc(w.exampleRoman)}</span>` : ''}</div>
              <div class="ex__ko muted">${esc(w.en)}</div>
            </div>`).join('')}
          <button class="btn btn--primary" id="vsave" style="margin-top:14px">Save as flashcards</button>
        </div>`;
      $('#vsave', out).addEventListener('click', () => {
        const store = load(KEY.cards, {});
        data.words.forEach((w) => {
          const c = { front: w.word, roman: w.roman || '', back: w.meaning, example: w.example };
          store[cardKey(c)] = { status: 'meh', ...c, date: new Date().toISOString() };
        });
        save(KEY.cards, store);
        toast('Added to your review cards.');
      });
    } catch (e) {
      out.innerHTML = `<p class="empty">${esc(e.message)}</p>`;
    }
  };
  run(); // auto-load random words on open
};

/* ================================================================
 * SETS — 내 학습 (saved sets)
 * ================================================================ */
views.sets = (root) => {
  const sets = load(KEY.sets, []);
  if (!sets.length) { renderEmpty(root, '🗂️', "No saved study sets yet.\nCreate one from the Create tab."); return; }

  // group by date
  const byDate = {};
  sets.forEach((s) => { const d = s.date.slice(0, 10); (byDate[d] = byDate[d] || []).push(s); });
  const days = Object.keys(byDate).sort().reverse();

  root.innerHTML = `
    <div class="hero hero--icon">
      <span class="iconbox">${icon('library-big')}</span>
      <div>
        <h2 style="font-size:21px">My library</h2>
        <p>${sets.length} ${sets.length === 1 ? 'set' : 'sets'} saved across ${days.length} ${days.length === 1 ? 'day' : 'days'}.</p>
      </div>
    </div>
  ` + days.map((day) => `
    <div class="section-title">${dayLabel(day)} <span class="day-count">${byDate[day].length}</span></div>
    <div class="card" style="padding:6px 14px">
      ${byDate[day].map((s) => `
        <div class="setrow" data-id="${s.id}">
          <div class="iconbox iconbox--sm">${icon('square-stack')}</div>
          <div class="setrow__body">
            <div class="setrow__title">${esc(s.title)}</div>
            <div class="setrow__meta">${s.data.examples?.length || 0} phrases · ${s.data.quiz?.length || 0} quiz · ${s.data.flashcards?.length || 0} cards</div>
          </div>
          <div class="setrow__go">${icon('chevron-right')}</div>
        </div>`).join('')}
    </div>
  `).join('') + `<button class="btn btn--ghost" id="clearSets" style="margin-top:8px">Delete all</button>`;

  root.querySelectorAll('.setrow').forEach((row) =>
    row.addEventListener('click', () => {
      const set = sets.find((s) => s.id === row.dataset.id);
      if (set) go('result', { set });
    }));
  $('#clearSets', root).addEventListener('click', () => {
    if (confirm('Delete all saved study sets?')) { save(KEY.sets, []); go('sets', {}, { push: false }); toast('All deleted.'); }
  });
};

/* ---------------- shared empty state ---------------- */
function renderEmpty(root, ico, text) {
  root.innerHTML = `<div class="empty"><div class="empty__ico">${ico}</div><p>${esc(text).replace(/\n/g, '<br/>')}</p></div>`;
}

/* ---------------- boot ---------------- */
go('home', {}, { push: false });
