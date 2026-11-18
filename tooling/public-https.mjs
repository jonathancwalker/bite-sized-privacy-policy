import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { isIP } from 'node:net';

const MAX_BYTES = 3_000_000;

export function isPublicAddress(address) {
  if (isIP(address) === 4) {
    const [a, b, c] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 192 && b === 0 && (c === 0 || c === 2)) ||
      (a === 192 && b === 88 && c === 99) || (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113));
  }
  if (isIP(address) === 6) {
    const [first, second = '0'] = address.split(':');
    const a = parseInt(first, 16), b = parseInt(second || '0', 16);
    // Only global unicast; exclude special-use, transition and documentation ranges.
    return a >= 0x2000 && a <= 0x3fff && a !== 0x2002 &&
      !(a === 0x2001 && (b < 0x200 || b === 0xdb8)) &&
      !(a === 0x3fff && b < 0x1000);
  }
  return false;
}

export async function publicHttpsFetch(url, { headers, signal, lookupImpl = lookup, requestImpl = request } = {}) {
  signal?.throwIfAborted();
  const resolution = lookupImpl(url.hostname, {all:true, verbatim:true});
  let abort;
  const aborted = new Promise((_, reject) => {
    abort = () => reject(signal.reason);
    signal?.addEventListener('abort', abort, {once:true});
  });
  let addresses;
  try {
    addresses = await (signal ? Promise.race([resolution, aborted]) : resolution);
  } finally {
    signal?.removeEventListener('abort', abort);
  }
  if (!addresses.length || addresses.some(item => !isPublicAddress(item.address))) {
    throw new Error('Policy URLs must resolve only to public internet addresses.');
  }
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const req = requestImpl(url, {
      headers, signal, agent:false,
      // Pin the checked addresses for this connection; do not resolve again at connect time.
      lookup(_hostname, options, callback) {
        const family = typeof options === 'number' ? options : options.family;
        const candidates = addresses.filter(item => !family || item.family === family);
        if (!candidates.length) return callback(new Error('No public address is available for this connection.'));
        if (options.all) callback(null, candidates);
        else callback(null, candidates[0].address, candidates[0].family);
      }
    }, response => {
      const init = {
        status:response.statusCode,
        headers:Object.entries(response.headers).filter(([, value]) => value !== undefined)
          .map(([name, value]) => [name, Array.isArray(value) ? value.join(', ') : value])
      };
      response.on('error', reject);
      if ([204, 205, 301, 302, 303, 304, 307, 308].includes(response.statusCode)) {
        response.destroy();
        resolve(new Response(null, init));
        return;
      }
      const chunks = [];
      let size = 0;
      const tooLarge = () => {
        response.destroy();
        reject(new Error('Policy page exceeds the 3 MB download limit.'));
      };
      if (Number(response.headers['content-length']) > MAX_BYTES) return tooLarge();
      response.on('data', chunk => {
        size += chunk.length;
        if (size > MAX_BYTES) tooLarge();
        else chunks.push(chunk);
      });
      response.on('aborted', () => reject(new Error('Policy download was interrupted.')));
      response.on('end', () => resolve(new Response(Buffer.concat(chunks), init)));
    });
    req.on('error', reject);
    req.end();
  });
}
