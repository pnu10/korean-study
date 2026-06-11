/* Local dev server — dependency-free (Node 18+).
 * Serves /public statically and implements POST /api/generate the same way the
 * Cloudflare Pages Function does, so you can develop against the live Claude API
 * without wrangler:
 *
 *   ANTHROPIC_API_KEY=sk-ant-... node dev-server.mjs   # http://localhost:4173
 *
 * Production uses functions/api/generate.js on Cloudflare Pages.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { callClaude } from './functions/api/_lib.js';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), 'public');
const PORT = Number(process.env.PORT) || Number(process.argv[2]) || 4173;
const API_KEY = process.env.ANTHROPIC_API_KEY || '';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function json(res, body, status = 200) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 30e6) req.destroy(); // allow up to ~30MB for attached images
    });
    req.on('end', () => resolve(data));
    req.on('error', () => resolve(data));
  });
}

async function handleGenerate(req, res) {
  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    return json(res, { ok: false, error: 'bad_json' }, 400);
  }
  const mode = body?.mode || 'study';
  if (!['study', 'vocab'].includes(mode)) {
    return json(res, { ok: false, error: 'bad_mode' }, 400);
  }
  if (!API_KEY) {
    return json(res, { ok: false, error: 'missing_api_key', detail: 'set ANTHROPIC_API_KEY env var' }, 500);
  }
  const result = await callClaude({ apiKey: API_KEY, fetchImpl: fetch, mode, payload: body?.payload || {} });
  json(res, result, result.ok ? 200 : 502);
}

async function serveStatic(pathname, res) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const filePath = normalize(join(ROOT, rel));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  try {
    const buf = await readFile(filePath);
    res.writeHead(200, { 'content-type': MIME[extname(filePath)] || 'application/octet-stream' });
    res.end(buf);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found');
  }
}

createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === '/api/generate' && req.method === 'POST') return void handleGenerate(req, res);
  serveStatic(url.pathname, res);
}).listen(PORT, () => {
  console.log(`english-study dev → http://localhost:${PORT}`);
  if (!API_KEY) console.log('⚠  ANTHROPIC_API_KEY not set — /api/generate will return missing_api_key');
});
