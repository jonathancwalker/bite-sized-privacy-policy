import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ingestPolicy } from '../tooling/ingest.mjs';
import { intelligentDecompose } from '../tooling/llm-decompose.mjs';
import { rewordClaim } from '../tooling/reword-claim.mjs';
import { POLICY_CATALOG } from '../tooling/catalog.mjs';

const root = fileURLToPath(new URL('../app/', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8' };
const assets = new Set(['index.html', 'styles.css', 'app.js', 'engine.js', 'concepts.html', 'concepts.css', 'concepts.js', ...['meta','tiktok-us','youtube-google'].map(id=>`data/featured/${id}.json`)]);
const MAX_TEXT_CHARS = 80_000;
const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_JSON_BYTES = 17_500_000; // 12 MiB file encoded as base64, plus JSON metadata.

class HttpError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(data));
}

async function readJson(req) {
  if (!/^application\/json(?:\s*;|\s*$)/i.test(req.headers['content-type'] || '')) {
    throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Send JSON with Content-Type: application/json.');
  }
  const declared = Number(req.headers['content-length']);
  if (Number.isFinite(declared) && declared > MAX_JSON_BYTES) throw new HttpError(413, 'REQUEST_TOO_LARGE', 'This file is too large. Try one under 12 MB.');
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_JSON_BYTES) throw new HttpError(413, 'REQUEST_TOO_LARGE', 'This file is too large. Try one under 12 MB.');
    chunks.push(chunk);
  }
  let value;
  try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new HttpError(400, 'INVALID_JSON', 'The request could not be read. Please try again.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'INVALID_INPUT', 'Choose a privacy policy source.');
  return value;
}

function limitedText(text) {
  if (typeof text !== 'string' || !text.trim()) throw new HttpError(400, 'EMPTY_POLICY', 'Add a privacy policy before continuing.');
  if (text.length > MAX_TEXT_CHARS) throw new HttpError(413, 'POLICY_TOO_LONG', 'This policy is over the 80,000-character limit.');
  return text;
}

function optionalTitle(value) {
  if (value == null || value === '') return undefined;
  if (typeof value !== 'string' || value.length > 160) throw new HttpError(400, 'INVALID_TITLE', 'Use a policy name under 160 characters.');
  return value.trim() || undefined;
}

function fileBytes(base64) {
  if (typeof base64 !== 'string' || !base64 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)) {
    throw new HttpError(400, 'INVALID_FILE', 'The uploaded file could not be read. Please choose it again.');
  }
  if (Math.floor(base64.length * 3 / 4) > MAX_FILE_BYTES + 2) throw new HttpError(413, 'FILE_TOO_LARGE', 'Use a file under 12 MB.');
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length > MAX_FILE_BYTES) throw new HttpError(413, 'FILE_TOO_LARGE', 'Use a file under 12 MB.');
  return bytes;
}

function importInput(body) {
  const title = optionalTitle(body.title);
  if (body.kind === 'paste') return { kind:'paste', title, text:limitedText(body.text) };
  if (body.kind === 'url') {
    if (typeof body.url !== 'string') throw new HttpError(400, 'INVALID_URL', 'Enter a full HTTPS privacy policy URL.');
    return { kind:'url', title, url:body.url };
  }
  if (body.kind === 'catalog') {
    if (typeof body.id !== 'string') throw new HttpError(400, 'INVALID_CATALOG_ID', 'Choose a policy from the list.');
    return { kind:'catalog', id:body.id };
  }
  if (body.kind === 'file') {
    if (typeof body.filename !== 'string' || !body.filename || body.filename.length > 180) throw new HttpError(400, 'INVALID_FILENAME', 'Choose a TXT, RTF, DOCX, or PDF file.');
    return { kind:'file', title, filename:path.basename(body.filename), bytes:fileBytes(body.base64) };
  }
  throw new HttpError(400, 'INVALID_SOURCE', 'Choose a policy from the list, enter a URL, paste text, or upload a file.');
}

async function handle(req, res, { apiKey, ingest, decompose, reword } = {}) {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/api/catalog') {
      if (req.method !== 'GET') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use GET for the policy list.');
      return json(res, 200, { entries: POLICY_CATALOG });
    }
    if (pathname === '/api/import') {
      if (req.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use POST to import a policy.');
      const input = importInput(await readJson(req));
      const imported = await (ingest || ingestPolicy)(input, { maxBytes:MAX_FILE_BYTES, maxTextChars:MAX_TEXT_CHARS });
      limitedText(imported.text);
      return json(res, 200, imported);
    }
    if (pathname === '/api/decompose') {
      if (req.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use POST to prepare policy points.');
      const body = await readJson(req);
      const title = optionalTitle(body.title) || 'Privacy policy';
      const text = limitedText(body.text);
      const mode = body.mode == null ? 'user' : body.mode;
      if (!['user','lawyer'].includes(mode)) throw new HttpError(400, 'INVALID_MODE', 'Choose user or lawyer mode.');
      if (!apiKey) throw new HttpError(503, 'MODEL_UNAVAILABLE', 'Intelligent parsing is unavailable in this local run. Restart the server with OPENAI_API_KEY set.');
      const analysis = await (decompose || intelligentDecompose)({ title, text, source:body.source?.finalUrl || body.source?.kind || '' }, { apiKey, mode });
      return json(res, 200, { analysis });
    }
    if (pathname === '/api/reword') {
      if (req.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use POST to reword a claim.');
      const body=await readJson(req);
      if(typeof body.claim!=='string'||!body.claim.trim()||body.claim.length>600||typeof body.sourceQuote!=='string'||body.sourceQuote.length<12||body.sourceQuote.length>4000||body.contextQuote!=null&&(typeof body.contextQuote!=='string'||body.contextQuote.length>2000))throw new HttpError(400,'INVALID_CLAIM','This claim could not be reworded.');
      if(!apiKey)throw new HttpError(503,'MODEL_UNAVAILABLE','Rewording is unavailable in this local run. Restart the server with OPENAI_API_KEY set.');
      const reworded=await (reword||rewordClaim)({claim:body.claim,sourceQuote:body.sourceQuote,contextQuote:body.contextQuote||''},{apiKey});
      return json(res,200,{reworded});
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'This route does not accept that request method.');
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root) || !assets.has(path.relative(root, file))) throw new HttpError(404, 'NOT_FOUND', 'Not found.');
    const content = await readFile(file);
    res.writeHead(200, { 'Content-Type':types[path.extname(file)] || 'text/plain', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch (error) {
    if (res.headersSent) return res.end();
    const status = error.status || (error.code === 'ENOENT' ? 404 : 400);
    const code = error.code || 'PREPARATION_FAILED';
    const message = error.status ? error.message : error.code === 'ENOENT' ? 'Not found.' : error.message || 'This policy could not be prepared.';
    json(res, status, { error: message, code });
  }
}

export function createAppServer(options = {}) {
  return http.createServer((req, res) => handle(req, res, { apiKey:process.env.OPENAI_API_KEY, ...options }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4173);
  createAppServer().listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}`));
}
