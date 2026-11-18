import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { vercelEndpoint, deploymentOrigins } from './vercel.mjs';

const env = {VERCEL_URL:'plainer-preview.vercel.app',VERCEL_PROJECT_PRODUCTION_URL:'plainer-example.vercel.app'};
const origin = 'https://plainer-example.vercel.app';
function post(route, body, headers = {}) {
  return new Request(origin+route, {method:'POST',headers:{origin,'content-type':'application/json',...headers},body:JSON.stringify(body)});
}

test('the Vercel entry accepts a streamed paste request and returns the canonical import', async () => {
  const endpoint = vercelEndpoint('/api/import', {env});
  const response = await endpoint.fetch(post('/api/import', {kind:'paste',text:'We delete your account data within 30 days.'}));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await response.json()).text, 'We delete your account data within 30 days.');
});

test('the hosted upload path extracts text from a real PDF', async () => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage().drawText('We delete your account data within 30 days.', {font,size:12});
  const endpoint = vercelEndpoint('/api/import', {env});
  const response = await endpoint.fetch(post('/api/import', {
    kind:'file',filename:'policy.pdf',base64:Buffer.from(await pdf.save()).toString('base64')
  }));
  const body = await response.json();
  assert.equal(response.status, 200, body.error);
  assert.equal(body.text, 'We delete your account data within 30 days.');
});

test('Vercel credentials and the request deadline reach the model without reaching the response', async () => {
  const endpoint = vercelEndpoint('/api/decompose', {
    env:{...env,OPENAI_API_KEY:'test-server-secret'},
    decompose:async (input, options) => {
      assert.equal(options.apiKey, 'test-server-secret');
      assert.ok(options.signal instanceof AbortSignal);
      assert.equal(options.mode, 'user');
      return {title:input.title};
    }
  });
  const response = await endpoint.fetch(post('/api/decompose', {text:'We collect email addresses.'}));
  assert.equal(response.status, 200);
  assert.doesNotMatch(await response.text(), /test-server-secret/);
});

test('unknown deployment addresses fail closed, even with a matching browser Origin', async () => {
  const endpoint = vercelEndpoint('/api/import', {env:{}});
  const response = await endpoint.fetch(post('/api/import', {kind:'paste',text:'We collect email addresses.'}));
  assert.equal(response.status, 403);
  assert.deepEqual(deploymentOrigins({...env,PUBLIC_APP_ORIGIN:'https://privacy.example'}), [
    'https://plainer-preview.vercel.app',origin,'https://privacy.example'
  ]);
  assert.deepEqual(deploymentOrigins({PUBLIC_APP_ORIGIN:'http://privacy.example'}), []);
});

test('a reached analysis deadline returns an actionable timeout instead of a platform error', async () => {
  const signal = AbortSignal.abort(new Error('Deadline reached'));
  const endpoint = vercelEndpoint('/api/decompose', {
    env:{...env,OPENAI_API_KEY:'test-key'}, signal,
    decompose:async (_input, options) => options.signal.throwIfAborted()
  });
  const response = await endpoint.fetch(post('/api/decompose', {text:'We collect email addresses.'}));
  assert.equal(response.status, 504);
  assert.match((await response.json()).error, /Quick overview/);
});
