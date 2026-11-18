import { mkdir, rename, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { POLICY_CATALOG } from '../tooling/catalog.mjs';
import { ingestPolicy } from '../tooling/ingest.mjs';
import { DEFAULT_MODEL, intelligentDecompose } from '../tooling/llm-decompose.mjs';

const featuredIds = ['meta','tiktok-us','youtube-google'];
const requested = process.argv.slice(2);
const ids = requested.length ? requested : featuredIds;
if (ids.some(id=>!featuredIds.includes(id))) throw new Error(`Choose a featured ID: ${featuredIds.join(', ')}`);
if (!process.env.OPENAI_API_KEY) throw new Error('Set OPENAI_API_KEY to save featured policies.');
const directory = fileURLToPath(new URL('../app/data/featured/', import.meta.url));
await mkdir(directory,{recursive:true});
for (const id of ids) {
  try {
    const entry=POLICY_CATALOG.find(item=>item.id===id);
    const imported=await ingestPolicy({kind:'catalog',id});
    if (imported.text.length > 80_000) throw new Error('Extracted policy exceeds the app’s 80,000-character limit.');
    const analyses={};
    for (const mode of ['user','lawyer']) {
      const analysis=await intelligentDecompose({title:imported.title,text:imported.text,source:imported.source?.finalUrl||entry.url},{apiKey:process.env.OPENAI_API_KEY,mode});
      const expected=mode==='user'?'selective_overview':'structurally_complete';
      if (analysis.status!==expected||!analysis.coverage.complete||analysis.failures.length||analysis.rejected.length) throw new Error(`${mode} analysis needs review: ${analysis.status}`);
      analyses[mode]=analysis;
      console.log(`${id} ${mode}: ${analysis.claims.length} cards`);
    }
    const snapshot={version:1,id,savedAt:new Date().toISOString(),model:DEFAULT_MODEL,imported,analyses};
    const target=path.join(directory,`${id}.json`),temporary=`${target}.${randomUUID()}.tmp`;
    await writeFile(temporary,JSON.stringify(snapshot));
    await rename(temporary,target);
    console.log(`${id}: saved ${imported.source?.fetchedAt||'source date unavailable'}`);
  } catch(error) {process.exitCode=1;console.error(`${id}: ${error.message}`);}
}
