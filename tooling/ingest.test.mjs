import test from 'node:test';import assert from 'node:assert/strict';
import {ingestPolicy} from './ingest.mjs';
test('paste and file enter the same canonical record shape',async()=>{
  const pasted=await ingestPolicy({kind:'paste',text:'We do not sell data.',title:'Pasted'});
  const file=await ingestPolicy({kind:'file',bytes:new TextEncoder().encode('We do not sell data.'),filename:'policy.txt'});
  for(const result of [pasted,file]){assert.equal(result.text,'We do not sell data.');assert.ok(result.title);assert.ok(result.source.kind);assert.ok(Array.isArray(result.warnings));}
  assert.equal(file.source.format,'txt');
});
test('URL intake retains final URL and fetch timestamp',async()=>{
  const result=await ingestPolicy({kind:'url',url:'https://example.com/privacy'},{fetchImpl:async()=>new Response('<main><h1>Privacy</h1><p>We collect account information only with consent.</p></main>',{headers:{'content-type':'text/html'}})});
  assert.equal(result.source.finalUrl,'https://example.com/privacy');assert.ok(result.source.fetchedAt);assert.match(result.text,/only with consent/);
});
