import { extractHtml } from './html-text.mjs';

const MAX_BYTES = 3_000_000;
function isPrivateHost(host) {
  const value = host.toLowerCase().replace(/\.$/, '');
  if (value === 'localhost' || value.endsWith('.localhost') || value.endsWith('.local') || value.endsWith('.internal')) return true;
  if (value.includes(':')) return true; // Reject IP literals, including IPv6.
  if (/^\d+(?:\.\d+){3}$/.test(value)) return true;
  if (!/^[a-z0-9.-]+$/.test(value) || !value.includes('.') || value.startsWith('.') || value.endsWith('.')) return true;
  return false;
}
export function validatePolicyUrl(input) {
  let url;
  try { url = new URL(input); } catch { throw new Error('Enter a full HTTPS policy URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || isPrivateHost(url.hostname)) throw new Error('Only public HTTPS policy URLs without credentials or custom ports are supported.');
  return url;
}

/** Fetch public HTML/PDF policy pages with redirect and response limits. */
export async function fetchPolicyUrl(input, { fetchImpl = fetch } = {}) {
  let url = validatePolicyUrl(input);
  let response;
  for (let hop = 0; hop < 4; hop++) {
    response = await fetchImpl(url, { redirect: 'manual', headers: { accept: 'text/html, text/plain;q=0.8, application/pdf;q=0.5', 'user-agent': 'BiteSizedPrivacy/0.2 (+policy reading prototype)' } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw new Error('Policy page redirected without a destination.');
      url = validatePolicyUrl(new URL(location, url).href);
      continue;
    }
    break;
  }
  if ([301, 302, 303, 307, 308].includes(response.status)) throw new Error('Policy page redirected too many times.');
  if (!response.ok) throw new Error(`Policy page returned HTTP ${response.status}.`);
  const type = response.headers.get('content-type')?.toLowerCase() || '';
  if (!/text\/html|text\/plain/.test(type)) throw new Error(`This URL returned ${type || 'an unknown file type'}. Use file import for PDF or other formats.`);
  const knownLength = Number(response.headers.get('content-length'));
  if (knownLength > MAX_BYTES) throw new Error('Policy page exceeds the 3 MB download limit.');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('The policy page had no readable body.');
  const chunks = []; let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) { await reader.cancel(); throw new Error('Policy page exceeds the 3 MB download limit.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  const extracted = type.includes('html') ? extractHtml(decoded, url.href) : { text: decoded.trim(), title: '', warnings: [] };
  if (!extracted.text.trim()) throw new Error('No readable policy text was found at this URL.');
  return { ...extracted, source: { kind: 'url', requestedUrl: String(input), finalUrl: url.href, fetchedAt: new Date().toISOString(), contentType: type }, byteCount: total };
}
