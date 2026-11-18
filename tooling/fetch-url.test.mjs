import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePolicyUrl, fetchPolicyUrl } from './fetch-url.mjs';
import { extractHtml } from './html-text.mjs';

test('only public HTTPS URLs are accepted', () => {
  for (const url of ['http://example.com/privacy','https://localhost/privacy','https://127.0.0.1/privacy','https://[::1]/privacy','https://user:pass@example.com/privacy','https://example.com:8443/privacy']) assert.throws(() => validatePolicyUrl(url));
  assert.equal(validatePolicyUrl('https://example.com/privacy').hostname, 'example.com');
});
test('redirects are revalidated; HTML extraction retains headings and clauses', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    if (calls === 1) return new Response(null, { status: 302, headers: { location: 'https://example.com/privacy' } });
    return new Response('<title>Example Privacy</title><nav>Menu</nav><main><h1>Privacy Policy</h1><p>We collect data only when you opt in.</p><p>Except where law requires us to retain it.</p></main>', { headers: { 'content-type': 'text/html' } });
  };
  const result = await fetchPolicyUrl('https://example.com/old', { fetchImpl });
  assert.equal(calls, 2);
  assert.match(result.text, /only when you opt in/);
  assert.match(result.text, /Except where law requires/);
  assert.doesNotMatch(result.text, /Menu/);
  assert.equal(result.source.finalUrl, 'https://example.com/privacy');
});
test('redirect to a private destination and oversized bodies are rejected', async () => {
  await assert.rejects(fetchPolicyUrl('https://example.com', { fetchImpl: async () => new Response(null, { status: 302, headers: { location: 'http://localhost/secrets' } }) }));
  await assert.rejects(fetchPolicyUrl('https://example.com', { fetchImpl: async () => new Response('a'.repeat(3_000_001), { headers: { 'content-type': 'text/plain' } }) }));
});
test('entity decoding and nested HTML preserve readable content', () => {
  const out = extractHtml('<main><h2>Your choices</h2><p>We don\'t sell data &amp; we honor deletion.</p><ul><li>Except when required by law.</li></ul></main>');
  assert.match(out.text, /Your choices/);
  assert.match(out.text, /Except when required by law/);
  assert.doesNotMatch(out.text, /<li>/);
});
test('HTML policy tables retain row and cell cues with an explicit warning', () => {
  const out=extractHtml('<main><h1>Privacy</h1><table><tr><th>Data</th><th>Choice</th></tr><tr><td>Location</td><td>Turn off in settings</td></tr></table></main>');
  assert.match(out.text,/Data\s*\|\s*Choice/);
  assert.match(out.text,/Location\s*\|\s*Turn off/);
  assert.ok(out.warnings.some(w=>w.includes('table')));
});
