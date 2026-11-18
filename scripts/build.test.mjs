import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

test('the static build includes static and lazy imports with standalone PDF libraries', async () => {
  await promisify(execFile)(process.execPath, [new URL('./build.mjs', import.meta.url).pathname]);
  const visited = new Set();
  async function checkModule(file) {
    if (visited.has(file)) return;
    visited.add(file);
    const built = new URL(`../app/dist/${file}`, import.meta.url);
    const source = await readFile(built, 'utf8');
    if (file.startsWith('vendor/')) {
      const library=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
        .catch(error=>{throw new Error(error.message.split(' from ')[0]);});
      if (file==='vendor/fontkit.js') assert.equal(typeof library.default.create,'function');
      if (file==='vendor/pdf-lib.js') assert.equal(typeof library.PDFDocument.create,'function');
    } else {
      assert.equal(source, await readFile(new URL(`../app/${file}`, import.meta.url), 'utf8'));
      for (const [, name] of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*)['"]\.\/([^'"]+)['"]/g)) await checkModule(name);
    }
  }
  await checkModule('app.js');
  assert.ok(visited.has('vendor/fontkit.js'),'follow the PDF download lazy import');
  assert.ok(visited.has('vendor/pdf-lib.js'));
  assert.ok(visited.has('report-pdf.js'));
  for (const id of ['meta','tiktok-us','youtube-google']) {
    assert.equal(JSON.parse(await readFile(new URL(`../app/dist/data/featured/${id}.json`, import.meta.url), 'utf8')).id, id);
  }
});
