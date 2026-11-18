import path from 'node:path';
import { ingestPolicy } from '../tooling/ingest.mjs';
import { intelligentDecompose } from '../tooling/llm-decompose.mjs';
import { rewordClaim } from '../tooling/reword-claim.mjs';
import { POLICY_CATALOG } from '../tooling/catalog.mjs';
import { MAX_UPLOAD_BYTES, MAX_REQUEST_BYTES } from '../app/limits.js';

const MAX_TEXT_CHARS = 80_000;
const MAX_FILE_BYTES = MAX_UPLOAD_BYTES;
const MAX_JSON_BYTES = MAX_REQUEST_BYTES;

class HttpError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

export function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(data));
}

async function readJson(req) {
  if (!/^application\/json(?:\s*;|\s*$)/i.test(req.headers['content-type'] || '')) {
    throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Send JSON with Content-Type: application/json.');
  }
  const declared = Number(req.headers['content-length']);
  if (Number.isFinite(declared) && declared > MAX_JSON_BYTES) throw new HttpError(413, 'REQUEST_TOO_LARGE', 'This file is too large. Try one under 3 MB.');
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_JSON_BYTES) throw new HttpError(413, 'REQUEST_TOO_LARGE', 'This file is too large. Try one under 3 MB.');
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
  if (Math.floor(base64.length * 3 / 4) > MAX_FILE_BYTES + 2) throw new HttpError(413, 'FILE_TOO_LARGE', 'Use a file under 3 MB.');
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length > MAX_FILE_BYTES) throw new HttpError(413, 'FILE_TOO_LARGE', 'Use a file under 3 MB.');
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

function requireAppRequest(req, publicOrigins) {
  if (publicOrigins !== undefined) {
    const target = publicOrigins.find(origin => new URL(origin).host === req.headers.host);
    if (!target) throw new HttpError(403, 'INVALID_HOST', 'Open the app through its published address.');
    if ((req.method !== 'GET' && req.method !== 'HEAD' && !req.headers.origin) ||
        (req.headers.origin && req.headers.origin !== target)) {
      throw new HttpError(403, 'INVALID_ORIGIN', 'Send this request from the Plainer app.');
    }
    return;
  }
  let target;
  try { target = new URL(`http://${req.headers.host}`); }
  catch { throw new HttpError(403, 'INVALID_HOST', 'Open the app through its local address.'); }
  if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
      target.username || target.password || target.host !== req.headers.host) {
    throw new HttpError(403, 'INVALID_HOST', 'Open the app through its local address.');
  }
  if (req.headers.origin && req.headers.origin !== target.origin) {
    throw new HttpError(403, 'INVALID_ORIGIN', 'API requests must come from this local app.');
  }
}

export async function handleApi(req, res, { apiKey, ingest, decompose, reword, publicOrigins, signal } = {}) {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname.startsWith('/api/')) requireAppRequest(req, publicOrigins);
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
      if (!apiKey) throw new HttpError(503, 'MODEL_UNAVAILABLE', 'AI analysis is temporarily unavailable. You can still review a featured policy.');
      const analysis = await (decompose || intelligentDecompose)({ title, text, source:body.source?.finalUrl || body.source?.kind || '' }, { apiKey, mode, signal });
      return json(res, 200, { analysis });
    }
    if (pathname === '/api/reword') {
      if (req.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use POST to reword a claim.');
      const body=await readJson(req);
      if(typeof body.claim!=='string'||!body.claim.trim()||body.claim.length>600||typeof body.sourceQuote!=='string'||body.sourceQuote.length<12||body.sourceQuote.length>4000||body.contextQuote!=null&&(typeof body.contextQuote!=='string'||body.contextQuote.length>2000))throw new HttpError(400,'INVALID_CLAIM','This claim could not be reworded.');
      if(body.previousWording!=null&&(typeof body.previousWording!=='string'||body.previousWording.length>600))throw new HttpError(400,'INVALID_CLAIM','This claim could not be reworded.');
      if(!apiKey)throw new HttpError(503,'MODEL_UNAVAILABLE','AI rewording is temporarily unavailable. Your wording is unchanged.');
      const reworded=await (reword||rewordClaim)({claim:body.claim,sourceQuote:body.sourceQuote,contextQuote:body.contextQuote||'',previousWording:body.previousWording||body.claim},{apiKey, signal});
      return json(res,200,{reworded});
    }
    throw new HttpError(404, 'NOT_FOUND', 'Not found.');
  } catch (error) {
    if (res.headersSent) return res.end();
    if (signal?.aborted) return json(res, 504, {error:'Analysis took too long. Try Quick overview or a shorter policy.', code:'ANALYSIS_TIMEOUT'});
    const status = error.status || (error.code === 'ENOENT' ? 404 : 400);
    const code = error.code || 'PREPARATION_FAILED';
    const message = error.status ? error.message : error.code === 'ENOENT' ? 'Not found.' : error.message || 'This policy could not be prepared.';
    json(res, status, { error: message, code });
  }
}
