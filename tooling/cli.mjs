#!/usr/bin/env node
import { POLICY_CATALOG } from './catalog.mjs';
import { ingestPolicy } from './ingest.mjs';
import { decompose } from './decompose.mjs';
import { intelligentDecompose } from './llm-decompose.mjs';

const args = process.argv.slice(2);
const flag = name => {const at=args.indexOf(name);return at<0?null:args[at+1]};
if (args.includes('--list')) { console.log(JSON.stringify(POLICY_CATALOG,null,2));process.exit(0); }
const chosen=[flag('--catalog'),flag('--url'),flag('--file'),args.includes('--stdin')?'stdin':null].filter(Boolean);
if(chosen.length!==1){console.error('Use one of --catalog ID, --url HTTPS_URL, --file PATH, or --stdin. Add --llm for structured claims.');process.exit(2);}
try {
  let intake;
  if(flag('--catalog'))intake={kind:'catalog',id:flag('--catalog')};
  else if(flag('--url'))intake={kind:'url',url:flag('--url')};
  else if(flag('--file'))intake={kind:'file',path:flag('--file')};
  else {let value='';for await(const chunk of process.stdin)value+=chunk;intake={kind:'paste',text:value,title:flag('--title')};}
  const document=await ingestPolicy(intake);
  const result=args.includes('--llm')?await intelligentDecompose(document,{model:flag('--model')||undefined}):decompose(document);
  result.intakeWarnings=document.warnings;
  const output=JSON.stringify(result,null,2)+'\n';
  if(flag('--out'))await (await import('node:fs/promises')).writeFile(flag('--out'),output);else process.stdout.write(output);
  if(args.includes('--llm')&&result.status!=='structurally_complete'){console.error(`LLM decomposition ${result.status}; ${result.unclaimedUnitIds.length} units lack cited draft claims.`);process.exitCode=1;}
}catch(error){console.error(error.message);process.exitCode=1;}
