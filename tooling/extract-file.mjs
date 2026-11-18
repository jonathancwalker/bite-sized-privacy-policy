import { readFile } from 'node:fs/promises';
import { inflateRawSync } from 'node:zlib';
import path from 'node:path';
const windows1252 = new TextDecoder('windows-1252');

export const DEFAULT_MAX_BYTES = 12 * 1024 * 1024;
const DEFAULT_MAX_TEXT_CHARS = 2_000_000;
const FORMATS = new Set(['txt', 'rtf', 'pdf', 'docx']);

function fail(message, code) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function normalizeInput(input, metadata = {}) {
  if (typeof input === 'string') {
    return { source: input, filename: metadata.filename ?? path.basename(input), metadata };
  }
  if (input && typeof input === 'object' && !Buffer.isBuffer(input) && !(input instanceof Uint8Array)) {
    const bytes = input.bytes ?? input.data ?? input.buffer;
    if (!bytes) fail('Pass a file path or an object with bytes and filename.', 'ERR_FILE_INPUT');
    return { source: bytes, filename: input.filename ?? input.name ?? metadata.filename, metadata: { ...metadata, ...(input.metadata ?? {}) } };
  }
  return { source: input, filename: metadata.filename ?? metadata.name, metadata };
}

function detectFormat(filename, metadata = {}) {
  const ext = path.extname(String(filename ?? '')).slice(1).toLowerCase();
  const mime = String(metadata.mimeType ?? metadata.type ?? '').toLowerCase();
  const byMime = mime.includes('pdf') ? 'pdf'
    : mime.includes('wordprocessingml') ? 'docx'
    : mime.includes('rtf') ? 'rtf'
    : mime.startsWith('text/') ? 'txt' : undefined;
  const format = ext || byMime;
  if (!format || !FORMATS.has(format)) fail(`Unsupported file type${filename ? `: ${filename}` : ''}. Supported types are .txt, .rtf, .pdf, and .docx.`, 'ERR_UNSUPPORTED_FILE_TYPE');
  return format;
}

function toBuffer(source) {
  if (Buffer.isBuffer(source)) return source;
  if (source instanceof Uint8Array) return Buffer.from(source.buffer, source.byteOffset, source.byteLength);
  fail('File bytes must be a Buffer or Uint8Array.', 'ERR_FILE_INPUT');
}

function decodeTextBytes(bytes) {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) return bytes.subarray(2).toString('utf16le');
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    const swapped = Buffer.alloc(bytes.length - 2);
    for (let i = 2; i + 1 < bytes.length; i += 2) { swapped[i - 2] = bytes[i + 1]; swapped[i - 1] = bytes[i]; }
    return swapped.toString('utf16le');
  }
  return bytes.toString('utf8').replace(/^\uFEFF/, '');
}

function cleanText(text) {
  return text.replace(/\r\n?/g, '\n').replace(/[\t \u00a0]+\n/g, '\n').replace(/\n[\t ]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function decodeRtf(bytes) {
  const s = decodeTextBytes(bytes);
  if (!/^\s*\{\\rtf\d/i.test(s)) fail('The file does not contain a valid RTF document.', 'ERR_INVALID_RTF');
  let out = '', i = 0, depth = 0, skip = false, uc = 1, fallback = 0;
  const stack = [];
  const add = (v) => { if (!skip && fallback === 0) out += v; };
  while (i < s.length) {
    const ch = s[i++];
    if (ch === '{') { stack.push({ skip, uc }); depth++; continue; }
    if (ch === '}') { const st = stack.pop(); if (st) ({ skip, uc } = st); depth--; continue; }
    if (ch !== '\\') { if (fallback) { fallback--; continue; } if (ch !== '\n' && ch !== '\r') add(ch); continue; }
    if (i >= s.length) break;
    const c = s[i++];
    if (c === "\\" || c === '{' || c === '}') { if (fallback) fallback--; else add(c); continue; }
    if (c === "'") {
      const hex = s.slice(i, i + 2); i += 2;
      if (/^[0-9a-f]{2}$/i.test(hex)) { if (fallback) fallback--; else add(windows1252.decode(Buffer.from([parseInt(hex, 16)]))); }
      continue;
    }
    if (c === '*') { skip = true; continue; }
    if (!/[a-zA-Z]/.test(c)) { if (c === '~') add('\u00a0'); else if (c === '-') add('\u00ad'); else if (c === '_') add('\u2011'); continue; }
    let word = c;
    while (i < s.length && /[a-zA-Z]/.test(s[i])) word += s[i++];
    let sign = 1;
    if (s[i] === '-') { sign = -1; i++; }
    let digits = '';
    while (i < s.length && /\d/.test(s[i])) digits += s[i++];
    const arg = digits ? sign * Number(digits) : undefined;
    if (s[i] === ' ') i++;
    if (word === 'u' && arg !== undefined) { add(String.fromCharCode(arg < 0 ? arg + 65536 : arg)); fallback = uc; }
    else if (word === 'uc' && arg !== undefined) uc = Math.max(0, Math.min(arg, 16));
    else if (word === 'par' || word === 'line') { if (!skip) out += '\n'; }
    else if (word === 'tab') add('\t');
    else if (word === 'emdash') add('\u2014');
    else if (word === 'endash') add('\u2013');
    else if (word === 'bullet') add('\u2022');
    else if (word === 'page' || word === 'sect') { if (!skip) out += '\n'; }
  }
  return cleanText(out);
}

function findEocd(b) {
  const start = Math.max(0, b.length - 65_557);
  for (let i = b.length - 22; i >= start; i--) if (b.readUInt32LE(i) === 0x06054b50) return i;
  fail('The DOCX file is not a valid ZIP archive.', 'ERR_INVALID_DOCX');
}

function zipEntry(b, wanted, maxUncompressed) {
  const eocd = findEocd(b);
  const total = b.readUInt16LE(eocd + 10), cdSize = b.readUInt32LE(eocd + 12), cdOffset = b.readUInt32LE(eocd + 16);
  if (total === 0xffff || cdOffset === 0xffffffff || cdSize === 0xffffffff) fail('ZIP64 DOCX files are not supported.', 'ERR_DOCX_ZIP64');
  if (cdOffset + cdSize > b.length) fail('The DOCX ZIP directory is truncated.', 'ERR_INVALID_DOCX');
  let p = cdOffset;
  for (let n = 0; n < total; n++) {
    if (b.readUInt32LE(p) !== 0x02014b50) fail('The DOCX ZIP directory is malformed.', 'ERR_INVALID_DOCX');
    const flags = b.readUInt16LE(p + 8), method = b.readUInt16LE(p + 10), csize = b.readUInt32LE(p + 20), usize = b.readUInt32LE(p + 24);
    const nl = b.readUInt16LE(p + 28), el = b.readUInt16LE(p + 30), cl = b.readUInt16LE(p + 32), localOffset = b.readUInt32LE(p + 42);
    const name = b.subarray(p + 46, p + 46 + nl).toString('utf8');
    if (name === wanted) {
      if (flags & 1) fail('Encrypted DOCX files are not supported.', 'ERR_ENCRYPTED_DOCX');
      if (usize > maxUncompressed) fail(`The DOCX document content exceeds the ${maxUncompressed} byte extraction limit.`, 'ERR_FILE_TOO_LARGE');
      if (b.readUInt32LE(localOffset) !== 0x04034b50) fail('The DOCX file entry is malformed.', 'ERR_INVALID_DOCX');
      const lnl = b.readUInt16LE(localOffset + 26), lel = b.readUInt16LE(localOffset + 28), dataStart = localOffset + 30 + lnl + lel;
      if (dataStart + csize > b.length) fail('The DOCX document content is truncated.', 'ERR_INVALID_DOCX');
      const compressed = b.subarray(dataStart, dataStart + csize);
      let result;
      try {
        if (method === 0) result = Buffer.from(compressed);
        else if (method === 8) result = inflateRawSync(compressed, { maxOutputLength: maxUncompressed });
        else fail(`DOCX uses unsupported ZIP compression method ${method}.`, 'ERR_DOCX_COMPRESSION');
      } catch (e) {
        if (e.code === 'ERR_BUFFER_TOO_LARGE') fail(`The DOCX document content exceeds the ${maxUncompressed} byte extraction limit.`, 'ERR_FILE_TOO_LARGE');
        if (e.code) throw e;
        fail('Could not decompress the DOCX document content.', 'ERR_INVALID_DOCX');
      }
      if (result.length > maxUncompressed) fail(`The DOCX document content exceeds the ${maxUncompressed} byte extraction limit.`, 'ERR_FILE_TOO_LARGE');
      return result;
    }
    p += 46 + nl + el + cl;
  }
  fail('The DOCX file is missing word/document.xml.', 'ERR_INVALID_DOCX');
}

function xmlUnescape(s) {
  return s.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, key) => {
    const k = key.toLowerCase();
    if (k === 'amp') return '&'; if (k === 'lt') return '<'; if (k === 'gt') return '>'; if (k === 'quot') return '"'; if (k === 'apos') return "'";
    const n = k.startsWith('#x') ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
    return Number.isFinite(n) && n <= 0x10ffff ? String.fromCodePoint(n) : '\uFFFD';
  });
}

function decodeDocx(bytes, maxUncompressed) {
  const xml = zipEntry(bytes, 'word/document.xml', maxUncompressed).toString('utf8');
  const paragraphs = [];
  const pRe = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/gi;
  for (const p of xml.matchAll(pRe)) {
    let value = '', m;
    const tokenRe = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:tab\b[^>]*\/>|<w:br\b[^>]*\/>|<w:cr\b[^>]*\/>/gi;
    while ((m = tokenRe.exec(p[1]))) {
      if (m[1] !== undefined) value += xmlUnescape(m[1].replace(/<[^>]+>/g, ''));
      else if (/tab/i.test(m[0])) value += '\t';
      else value += '\n';
    }
    value = value.trim();
    if (value) paragraphs.push(value);
  }
  return cleanText(paragraphs.join('\n'));
}

async function decodePdf(bytes, maxTextChars) {
  if (/(?:^|[\r\n])trailer\s*<<[\s\S]*?\/Encrypt\b/i.test(bytes.toString('latin1'))) fail('Encrypted PDFs cannot be extracted. Remove the password protection and try again.', 'ERR_ENCRYPTED_PDF');
  let pdfjs;
  try { pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs'); }
  catch { fail('PDF extraction requires the pdfjs-dist package. Install it in the app environment and retry.', 'ERR_PDF_DEPENDENCY_MISSING'); }
  let doc;
  let loadingTask;
  try {
    loadingTask = pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, useSystemFonts: true });
    doc = await loadingTask.promise;
  } catch (e) {
    if (/password|encrypted/i.test(e?.message ?? '')) fail('Encrypted PDFs cannot be extracted. Remove the password protection and try again.', 'ERR_ENCRYPTED_PDF');
    fail(`Could not read this PDF: ${e?.message ?? 'invalid PDF document'}`, 'ERR_INVALID_PDF');
  }
  const parts = [];
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      let line = '', prevY;
      for (const item of content.items) {
        if (typeof item.str !== 'string') continue;
        const y = item.transform?.[5];
        if (line && prevY !== undefined && y !== undefined && Math.abs(y - prevY) > 2) { parts.push(line.trim()); line = ''; }
        line += item.str;
        if (item.hasEOL) { parts.push(line.trim()); line = ''; }
        prevY = y;
      }
      if (line.trim()) parts.push(line.trim());
      if (parts.join('\n').length > maxTextChars) fail(`Extracted text exceeds the ${maxTextChars} character limit.`, 'ERR_TEXT_TOO_LARGE');
    }
  } finally { await loadingTask?.destroy?.(); }
  const text = cleanText(parts.filter(Boolean).join('\n'));
  if (!text) fail('This PDF contains no extractable text. It may be scanned or image-only; OCR is not performed.', 'ERR_PDF_NO_TEXT');
  return text;
}

/**
 * Extract readable text from a local privacy-policy file.
 * @param {string|Buffer|Uint8Array|{bytes:Buffer|Uint8Array,filename:string,metadata?:object}} input
 * @param {{filename?:string,mimeType?:string,maxBytes?:number,maxTextChars?:number}} metadata
 * @returns {Promise<{text:string,format:string,warnings:string[],metadata:object}>}
 */
export async function extractFile(input, metadata = {}) {
  const normalized = normalizeInput(input, metadata);
  const format = detectFormat(normalized.filename, normalized.metadata);
  const maxBytes = metadata.maxBytes ?? normalized.metadata.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxTextChars = metadata.maxTextChars ?? normalized.metadata.maxTextChars ?? DEFAULT_MAX_TEXT_CHARS;
  let bytes;
  if (typeof normalized.source === 'string') bytes = await readFile(normalized.source);
  else bytes = toBuffer(normalized.source);
  if (bytes.length > maxBytes) fail(`File exceeds the ${maxBytes} byte extraction limit.`, 'ERR_FILE_TOO_LARGE');
  let text;
  if (format === 'txt') text = cleanText(decodeTextBytes(bytes));
  else if (format === 'rtf') text = decodeRtf(bytes);
  else if (format === 'docx') text = decodeDocx(bytes, maxBytes);
  else text = await decodePdf(bytes, maxTextChars);
  if (!text) fail('The file contains no extractable text.', format === 'pdf' ? 'ERR_PDF_NO_TEXT' : 'ERR_NO_TEXT');
  if (text.length > maxTextChars) fail(`Extracted text exceeds the ${maxTextChars} character limit.`, 'ERR_TEXT_TOO_LARGE');
  const warnings = format === 'pdf'
    ? ['PDF reading order and layout may be imperfect; scanned pages and OCR are not supported.']
    : format === 'docx' ? ['DOCX extraction preserves paragraph and line breaks; visual layout, headers, footers, and comments may not be included.']
    : format === 'rtf' ? ['RTF extraction preserves text and paragraph breaks; complex formatting is omitted.'] : [];
  return { text, format, warnings, metadata: { filename: normalized.filename ?? null, bytes: bytes.length, ...normalized.metadata } };
}

export default extractFile;
