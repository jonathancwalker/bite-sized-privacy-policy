import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createAppServer } from './serve.mjs';

async function dispatch(route, body, options = {}, headers = {}) {
  const server = createAppServer({apiKey:null, ...options});
  const request = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]);
  Object.assign(request, {url:route, method:body === undefined?'GET':'POST', headers:{host:'localhost:4173', 'content-type':'application/json', ...headers}});
  let status, responseHeaders, content;
  const response = {
    headersSent:false,
    writeHead(code, values){status=code;responseHeaders=values;this.headersSent=true;},
    end(value){content=value;}
  };
  await server.listeners('request')[0](request, response);
  return {status, headers:responseHeaders, json:() => JSON.parse(content), text:() => String(content)};
}

test('an unrelated Origin is rejected before the local API calls the model', async () => {
  let calls = 0;
  const result = await dispatch('/api/decompose', {text:'We collect email addresses when you register.'}, {
    apiKey:'test-key', decompose:async () => {calls++; return {};}
  }, {origin:'https://unrelated.example'});
  assert.equal(result.status, 403);
  assert.equal(calls, 0);
});

test('a non-local Host header is rejected before processing API input', async () => {
  const result = await dispatch('/api/import', {kind:'paste',text:'We collect email addresses.'}, {}, {host:'rebound.example:4173'});
  assert.equal(result.status, 403);
});

test('same-origin imports and old saved policies work without model credentials', async () => {
  const imported = await dispatch('/api/import', {kind:'paste',text:'We collect email addresses.'}, {}, {origin:'http://localhost:4173'});
  assert.equal(imported.status, 200);
  assert.equal(imported.json().source.kind, 'paste');
  for (const id of ['meta','tiktok-us','youtube-google']) {
    const result = await dispatch(`/data/featured/${id}.json`);
    assert.equal(result.status, 200);
    assert.equal(result.json().id, id);
  }
  assert.equal((await dispatch('/review-state.js')).status, 200);
});

test('missing model credentials and invalid imports produce actionable errors', async () => {
  const noKey = await dispatch('/api/decompose', {text:'We collect email addresses.'});
  assert.equal(noKey.status, 503);
  assert.equal(noKey.json().code, 'MODEL_UNAVAILABLE');
  assert.equal((await dispatch('/api/import', {kind:'file',filename:'x.txt',base64:'???'})).status, 400);
  assert.equal((await dispatch('/api/import', {kind:'paste',text:'a'.repeat(80_001)})).status, 413);
  assert.equal((await dispatch('/../package.json')).status, 404);
});
