import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppServer } from './serve.mjs';

async function withServer(options, run) {
  const server = createAppServer(options);
  await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', error => error ? reject(error) : resolve()));
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await run(base); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
const post = (base, route, body) => fetch(base + route, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body) });

test('catalog and local page are served without a key', async () => {
  await withServer({ apiKey:null }, async base => {
    const catalog = await fetch(base + '/api/catalog');
    assert.equal(catalog.status, 200);
    const data = await catalog.json();
    assert.ok(data.entries.some(entry => entry.id === 'anthropic'));
    const page = await fetch(base + '/');
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Plainer/);
  });
});

test('saved featured policies are served directly without a model key', async () => {
  await withServer({apiKey:null}, async base => {
    for (const id of ['meta','tiktok-us','youtube-google']) {
      const response = await fetch(`${base}/data/featured/${id}.json`);
      assert.equal(response.status,200);
      const saved = await response.json();
      assert.equal(saved.id,id);
      assert.equal(saved.imported.source.catalogId,id);
      assert.equal(saved.analyses.user.document.text,saved.imported.text);
      assert.equal(saved.analyses.lawyer.document.text,saved.imported.text);
      assert.ok(saved.analyses.user.claims.length < saved.analyses.lawyer.claims.length);
      for (const mode of ['user','lawyer']) {
        const analysis=saved.analyses[mode];
        assert.equal(analysis.coverage.complete,true);
        assert.equal(analysis.failures.length,0);
        assert.ok(analysis.claims.every(claim=>saved.imported.text.slice(claim.sourceRange.start,claim.sourceRange.end)===claim.sourceQuote));
      }
    }
    assert.equal((await fetch(`${base}/data/featured/unknown.json`)).status,404);
  });
});

test('paste and TXT upload return one canonical import record', async () => {
  await withServer({ apiKey:null }, async base => {
    const paste = await post(base, '/api/import', { kind:'paste', title:'My policy', text:'We collect account information when you register.' });
    assert.equal(paste.status, 200);
    const pasted = await paste.json();
    assert.equal(pasted.title, 'My policy');
    assert.equal(pasted.source.kind, 'paste');
    const file = await post(base, '/api/import', { kind:'file', filename:'policy.txt', base64:Buffer.from('We do not sell your data.').toString('base64') });
    assert.equal(file.status, 200);
    const imported = await file.json();
    assert.equal(imported.text, 'We do not sell your data.');
    assert.equal(imported.source.format, 'txt');
  });
});

test('URL and catalog inputs are routed through canonical intake', async () => {
  const received = [];
  await withServer({ apiKey:null, ingest:async input => { received.push(input); return {title:'Policy',text:'We collect account data only with your consent.',source:{kind:input.kind},warnings:[]}; } }, async base => {
    for (const body of [{kind:'url',url:'https://example.com/privacy'},{kind:'catalog',id:'anthropic'}]) {
      assert.equal((await post(base, '/api/import', body)).status, 200);
    }
  });
  assert.deepEqual(received.map(input => input.kind), ['url','catalog']);
  assert.equal(received[0].url, 'https://example.com/privacy');
  assert.equal(received[1].id, 'anthropic');
});

test('decomposition keeps the key server-side and returns analysis', async () => {
  let received;
  await withServer({ apiKey:'test-key', decompose:async (document, options) => {
    received = { document, options };
    return { status:'structurally_complete', claims:[], units:[] };
  } }, async base => {
    const response = await post(base, '/api/decompose', { title:'Policy', text:'We collect account data only with your consent.', source:{kind:'paste'} });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.analysis.status, 'structurally_complete');
    assert.equal(JSON.stringify(result).includes('test-key'), false);
  });
  assert.equal(received.document.source, 'paste');
  assert.equal(received.options.apiKey, 'test-key');
});

test('missing key and invalid uploads fail with clear JSON errors', async () => {
  await withServer({ apiKey:null }, async base => {
    const noKey = await post(base, '/api/decompose', { title:'Policy', text:'We collect account data only with your consent.' });
    assert.equal(noKey.status, 503);
    assert.equal((await noKey.json()).code, 'MODEL_UNAVAILABLE');
    const invalid = await post(base, '/api/import', { kind:'file', filename:'policy.pdf', base64:'???' });
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).code, 'INVALID_FILE');
    const huge = await post(base, '/api/import', { kind:'paste', text:'a'.repeat(80_001) });
    assert.equal(huge.status, 413);
    assert.equal((await huge.json()).code, 'POLICY_TOO_LONG');
  });
});
