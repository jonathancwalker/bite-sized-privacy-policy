import test from 'node:test';
import assert from 'node:assert/strict';
import { callOpenAI, intelligentDecompose, validateClaims, validateNonClaimUnits } from './llm-decompose.mjs';
import { decompose } from './decompose.mjs';

const text='Data retention\n\nWe delete your account data within 30 days unless the law requires us to keep it longer.\n\nYou may request a copy of your account data.';
test('grounded claims keep exact source ranges and full base coverage', async()=>{
  const result=await intelligentDecompose({text},{propose:async ({units})=>({claims:units.map(unit=>({unitId:unit.id,claim:'Account data is deleted within 30 days unless law requires longer retention.',sourceQuote:unit.text.trim().slice(0,Math.min(unit.text.trim().length,90)),contextUnitId:'',contextQuote:'',qualifiers:['unless law requires longer retention']}))})});
  assert.equal(result.coverage.complete,true);
  assert.equal(result.units.map(x=>x.text).join(''),text);
  assert.ok(result.claims.every(c=>text.slice(c.sourceRange.start,c.sourceRange.end)===c.sourceQuote));
});
test('unsupported quote and unknown unit are rejected, source units remain',()=>{
  const base=decompose({text});const result=validateClaims(base,{claims:[{unitId:base.units[0].id,claim:'They sell data',sourceQuote:'They sell all of your data',contextUnitId:'',contextQuote:'',qualifiers:[]},{unitId:'fake',claim:'Something',sourceQuote:'We delete your account data',contextUnitId:'',contextQuote:'',qualifiers:[]}]});
  assert.equal(result.accepted.length,0);assert.deepEqual(result.rejected.map(x=>x.reason),['quote-not-in-unit','unknown-unit']);
  assert.equal(base.coverage.complete,true);
});
test('failed model batch returns source units with an explicit failure',async()=>{
  const result=await intelligentDecompose({text},{propose:async()=>{throw new Error('model unavailable')}});
  assert.equal(result.status,'partial');assert.equal(result.claims.length,0);assert.ok(result.unclaimedUnitIds.length);assert.equal(result.failures[0].message,'model unavailable');
});
test('partial or rejected claims cannot be marked structurally complete',async()=>{
  const splitText='1. First Section\n\nWe collect email addresses when you register.\n\n2. Second Section\n\nWe delete account records after 30 days.';
  const result=await intelligentDecompose({text:splitText},{propose:async ({units})=>({claims:[{unitId:units[0].id,claim:'Something unrelated',sourceQuote:units[0].text.trim().slice(0,50),contextUnitId:'',contextQuote:'',qualifiers:[]}]} )});
  assert.equal(result.status,'needs_review');
  assert.ok(result.unclaimedUnitIds.length);
});
test('non-claim headings remain in source but do not require a card',async()=>{
  const source='Privacy Policy\n\n1. Collection\n\nWe collect email addresses when you register.';
  const result=await intelligentDecompose({text:source},{propose:async ({units})=>({claims:units.filter(unit=>unit.text.includes('We collect')).map(unit=>({unitId:unit.id,claim:'We collect your email address when you register.',sourceQuote:'We collect email addresses when you register.',contextUnitId:'',contextQuote:'',qualifiers:[]})),nonClaimUnits:units.filter(unit=>unit.text.trim()==='Privacy Policy').map(unit=>({unitId:unit.id,reason:'heading_or_title'}))})});
  assert.equal(result.status,'structurally_complete');
  assert.equal(result.nonClaimUnits.length,1);
  assert.equal(result.unclaimedUnitIds.length,0);
  assert.equal(result.units.map(unit=>unit.text).join(''),source);
});
test('non-claim disposition rejects overlap, unknown IDs, and invalid reasons',()=>{
  const base=decompose({text:'Privacy Policy\n\nWe collect email addresses when you register.'});
  const id=base.units[0].id;
  const result=validateNonClaimUnits(base,{nonClaimUnits:[{unitId:id,reason:'heading_or_title'},{unitId:'unit-999',reason:'heading_or_title'},{unitId:id,reason:'marketing'}]},[{unitId:id}]);
  assert.deepEqual(result.rejected.map(item=>item.reason),['claim-nonclaim-overlap','unknown-unit','invalid-nonclaim-reason']);
});
test('context quote must belong to the cited adjacent unit',()=>{
  const base=decompose({text});
  const unit=base.units.at(-1);
  const proposed={claims:[{unitId:unit.id,claim:'You may request data.',sourceQuote:'You may request a copy of your account data.',contextUnitId:'unit-999',contextQuote:'Data retention',qualifiers:[]}]};
  assert.equal(validateClaims(base,proposed).rejected[0].reason,'invalid-context-link');
});
test('user overview caps cards per group while groups run concurrently', async()=>{
  const longText=Array.from({length:320},(_,i)=>`Section ${i+1}\n\nWe collect account detail ${i+1} when you use this feature, unless you disable it in settings.\n\n`).join('');
  let active=0, peak=0, groups=0;
  const result=await intelligentDecompose({text:longText},{mode:'user',concurrency:3,propose:async ({units})=>{
    groups++;active++;peak=Math.max(peak,active);
    await new Promise(resolve=>setTimeout(resolve,10));active--;
    return {claims:units.slice(0,4).map(unit=>({unitId:unit.id,claim:'The service collects account details for a feature unless you disable it.',sourceQuote:unit.text.trim().slice(0,Math.min(65,unit.text.trim().length)),contextUnitId:'',contextQuote:'',qualifiers:[]})),nonClaimUnits:[]};
  }});
  assert.ok(groups>1);
  assert.ok(peak>1);
  assert.ok(result.claims.length<=2*groups);
  assert.equal(result.status,'selective_overview');
  assert.ok(result.unclaimedUnitIds.length>0);
});

test('a malformed claim does not discard another valid claim in the same response', () => {
  const base = decompose({text:'We delete account data after 30 days.'});
  const valid = {unitId:base.units[0].id, claim:'Account data is deleted after 30 days.', sourceQuote:base.document.text, contextUnitId:'', contextQuote:'', qualifiers:[]};
  const result = validateClaims(base, {claims:[null, valid]});
  assert.equal(result.accepted.length, 1);
  assert.equal(result.rejected.length, 1);
});

test('a model group cannot claim or dismiss units assigned to another group', async () => {
  const source = Array.from({length:220}, (_, i) => `Section ${i+1}\n\nWe collect account detail ${i+1} only when you enable this feature in your account settings.\n\n`).join('');
  const first = decompose({text:source}).units[0];
  const result = await intelligentDecompose({text:source}, {propose:async () => ({
    claims:[{unitId:first.id, claim:'This feature collects account details when enabled.', sourceQuote:first.text, contextUnitId:'', contextQuote:'', qualifiers:[]}],
    nonClaimUnits:[]
  })});
  assert.equal(result.claims.length, 1);
  assert.ok(result.rejected.some(item => item.reason === 'unit-outside-group'));
});

test('invalid worker counts fail explicitly instead of silently skipping analysis', async () => {
  for (const concurrency of [0, -1, NaN, Infinity, 1.5, '2', 5]) {
    await assert.rejects(intelligentDecompose({text}, {concurrency, propose:async () => ({claims:[], nonClaimUnits:[]})}), /concurrency/i);
  }
});

test('model requests have a deadline and do not store policy text', async () => {
  await callOpenAI({units:[]}, {apiKey:'test-key', fetchImpl:async (_url, options) => {
    assert.ok(options.signal instanceof AbortSignal, 'A stalled model request must be abortable.');
    assert.equal(JSON.parse(options.body).store, false);
    return new Response(JSON.stringify({output_text:'{"claims":[],"nonClaimUnits":[]}'}));
  }});
});

test('a cancelled hosted analysis stops before starting further model groups', async () => {
  const controller = new AbortController();
  const longText = Array.from({length:200},(_,i)=>`Section ${i+1}\n\nWe collect account detail ${i+1} when you register for this feature.\n\n`).join('');
  let calls = 0;
  await assert.rejects(intelligentDecompose({text:longText}, {
    signal:controller.signal, concurrency:1,
    propose:async () => {calls++; controller.abort(new Error('Analysis deadline reached')); return {claims:[],nonClaimUnits:[]};}
  }), /deadline/);
  assert.equal(calls, 1);
});

test('the hosted analysis deadline reaches an in-flight OpenAI request', async () => {
  const controller = new AbortController();
  await assert.rejects(callOpenAI({units:[]}, {
    apiKey:'test-key', signal:controller.signal,
    fetchImpl:async (_url, options) => {
      controller.abort(new Error('Analysis deadline reached'));
      options.signal.throwIfAborted();
      return new Response(JSON.stringify({output_text:'{"claims":[],"nonClaimUnits":[]}'}));
    }
  }), /deadline/);
});
