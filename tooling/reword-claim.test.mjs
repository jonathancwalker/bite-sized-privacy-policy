import test from 'node:test';
import assert from 'node:assert/strict';
import { rewordClaim } from './reword-claim.mjs';

test('rewording has a deadline and returns the model wording without storing source text', async () => {
  const reworded = 'We delete your data after 30 days unless the law requires longer.';
  const result = await rewordClaim({claim:'Account records are retained for a period of 30 days, except when a longer retention period is legally required.', sourceQuote:reworded}, {
    apiKey:'test-key', fetchImpl:async (_url, options) => {
      assert.ok(options.signal instanceof AbortSignal);
      assert.equal(JSON.parse(options.body).store, false);
      return new Response(JSON.stringify({output_text:JSON.stringify({reworded})}));
    }
  });
  assert.equal(result, reworded);
});

const original = 'We retain your account data for 30 days unless the law requires us to keep it longer.';
const clearer = 'After 30 days, we delete your account data. We keep it longer only if the law requires it.';
const respond = reworded => new Response(JSON.stringify({output_text:JSON.stringify({reworded})}));

test('rewording retries a one-word substitution and returns a rebuilt explanation', async () => {
  let calls = 0;
  const result = await rewordClaim({claim:original,sourceQuote:original}, {apiKey:'test-key',fetchImpl:async () => {
    calls++;
    return respond(calls === 1 ? original.replace('retain','keep') : clearer);
  }});
  assert.equal(calls, 2);
  assert.equal(result, clearer);
});

test('two cosmetic responses produce an honest failure instead of a fake rewording', async () => {
  let calls = 0;
  await assert.rejects(rewordClaim({claim:original,sourceQuote:original}, {apiKey:'test-key',fetchImpl:async () => {
    calls++;
    return respond(original.replace('retain','keep'));
  }}), /different|clearer/i);
  assert.equal(calls, 2);
});
