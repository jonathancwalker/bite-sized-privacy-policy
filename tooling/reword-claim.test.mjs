import test from 'node:test';
import assert from 'node:assert/strict';
import { rewordClaim } from './reword-claim.mjs';

test('rewording has a deadline and returns the model wording without storing source text', async () => {
  const reworded = 'We delete your data after 30 days unless the law requires longer.';
  const result = await rewordClaim({claim:reworded, sourceQuote:reworded}, {
    apiKey:'test-key', fetchImpl:async (_url, options) => {
      assert.ok(options.signal instanceof AbortSignal);
      assert.equal(JSON.parse(options.body).store, false);
      return new Response(JSON.stringify({output_text:JSON.stringify({reworded})}));
    }
  });
  assert.equal(result, reworded);
});
