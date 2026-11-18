import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

test('the static build includes every module imported by the app and all featured policies', async () => {
  await promisify(execFile)(process.execPath, [new URL('./build.mjs', import.meta.url).pathname]);
  const visited = new Set();
  async function checkModule(file) {
    if (visited.has(file)) return;
    visited.add(file);
    const built = new URL(`../app/dist/${file}`, import.meta.url);
    const source = await readFile(built, 'utf8');
    assert.equal(source, await readFile(new URL(`../app/${file}`, import.meta.url), 'utf8'));
    for (const [, name] of source.matchAll(/from ['"]\.\/([^'"]+)['"]/g)) await checkModule(name);
  }
  await checkModule('app.js');
  for (const id of ['meta','tiktok-us','youtube-google']) {
    assert.equal(JSON.parse(await readFile(new URL(`../app/dist/data/featured/${id}.json`, import.meta.url), 'utf8')).id, id);
  }
});
