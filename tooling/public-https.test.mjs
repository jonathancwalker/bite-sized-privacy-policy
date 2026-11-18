import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { isPublicAddress, publicHttpsFetch } from './public-https.mjs';
import { fetchPolicyUrl } from './fetch-url.mjs';

test('local, special-use and embedded IPv4 addresses are never public destinations', () => {
  for (const address of ['127.0.0.1','10.1.2.3','172.31.0.2','192.168.1.1','169.254.169.254','100.64.0.1','198.18.0.1','0.0.0.0','224.1.1.1','192.0.2.1','::1','::ffff:127.0.0.1','fc00::1','fe80::1','2002:7f00:1::','2001:db8::1','not-an-ip']) {
    assert.equal(isPublicAddress(address), false, address);
  }
  for (const address of ['93.184.216.34','8.8.8.8','2001:4860:4860::8888','2606:4700:4700::1111']) assert.equal(isPublicAddress(address), true, address);
});

function responseRequest(inspect, status = 200, headers = {'content-type':'text/plain'}) {
  return (url, options, callback) => {
    inspect(url, options);
    const req = new EventEmitter();
    req.end = () => {
      const response = new PassThrough();
      Object.assign(response, {statusCode:status, headers});
      callback(response);
      response.end('We collect email addresses when you register.');
    };
    return req;
  };
}

test('the HTTPS connection uses the exact DNS address that passed validation', async () => {
  let resolutions = 0;
  const response = await publicHttpsFetch(new URL('https://policy.example.com/privacy'), {
    lookupImpl:async () => { resolutions++; return [{address:'93.184.216.34', family:4}]; },
    requestImpl:responseRequest((_url, options) => {
      assert.equal(options.agent, false);
      options.lookup('policy.example.com', {all:true}, (error, addresses) => {
        assert.equal(error, null);
        assert.deepEqual(addresses, [{address:'93.184.216.34', family:4}]);
      });
      options.lookup('policy.example.com', {family:4}, (error, address, family) => {
        assert.equal(error, null);
        assert.equal(address, '93.184.216.34');
        assert.equal(family, 4);
      });
    })
  });
  assert.match(await response.text(), /email/);
  assert.equal(resolutions, 1);
});

test('a redirect to a public hostname with a private DNS answer is blocked', async () => {
  let requests = 0;
  await assert.rejects(fetchPolicyUrl('https://public.example.com/privacy', {
    lookupImpl:async hostname => [{address:hostname.startsWith('public.')?'93.184.216.34':'10.0.0.1', family:4}],
    requestImpl:responseRequest(() => { requests++; }, 302, {location:'https://private.example.com/privacy'})
  }), /public internet/);
  assert.equal(requests, 1);
});
