import { readFile } from 'node:fs/promises';
import { intelligentDecompose } from './llm-decompose.mjs';
const path=process.argv[2];if(!path)throw new Error('Pass a JSON output path from tooling/cli.mjs --url.');
const imported=JSON.parse(await readFile(path,'utf8'));
const text=imported.document?.text;if(!text)throw new Error('Input JSON lacks document.text.');
const limit=imported.sections?.find(s=>s.end>=5000)?.end || Math.min(text.length,6000);
const sample=text.slice(0,Math.min(limit,9000));
const result=await intelligentDecompose({text:sample,title:imported.document.title,source:imported.document.source});
console.log(JSON.stringify({title:result.document.title,sampleCharacters:sample.length,units:result.units.length,claims:result.claims.length,unclaimed:result.unclaimedUnitIds.length,rejected:result.rejected.length,failures:result.failures,status:result.status,examples:result.claims.slice(0,8).map(c=>({claim:c.claim,sourceQuote:c.sourceQuote,contextUnitId:c.contextUnitId,validationFlags:c.validationFlags}))},null,2));
