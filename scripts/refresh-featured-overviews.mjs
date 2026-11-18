import { readFile, rename, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { intelligentDecompose } from '../tooling/llm-decompose.mjs';

const featuredIds = ['meta', 'tiktok-us', 'youtube-google'];
const ids = process.argv.slice(2).length ? process.argv.slice(2) : featuredIds;
if (ids.some(id => !featuredIds.includes(id))) throw new Error(`Choose a featured ID: ${featuredIds.join(', ')}`);
if (!process.env.OPENAI_API_KEY) throw new Error('Set OPENAI_API_KEY to refresh featured overviews.');

const directory = fileURLToPath(new URL('../app/data/featured/', import.meta.url));
for (const id of ids) {
  try {
    const target = path.join(directory, `${id}.json`);
    const saved = JSON.parse(await readFile(target, 'utf8'));
    if (saved.version !== 1 || saved.id !== id || !saved.imported?.text || !saved.analyses?.lawyer) throw new Error('Saved source or detailed analysis is incomplete.');
    const { title, text, source } = saved.imported;
    const user = await intelligentDecompose({ title, text, source: source?.finalUrl }, { mode: 'user' });
    if (user.status !== 'selective_overview' || !user.coverage.complete || user.failures.length || user.rejected.length) throw new Error(`Overview needs review: ${user.status}`);
    const updated = { ...saved, savedAt: new Date().toISOString(), analyses: { ...saved.analyses, user } };
    const temporary = `${target}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(updated));
    await rename(temporary, target);
    console.log(`${id}: ${user.claims.length} overview cards from source fetched ${source?.fetchedAt || 'at an unknown time'}`);
  } catch (error) {
    process.exitCode = 1;
    console.error(`${id}: ${error.message}`);
  }
}
