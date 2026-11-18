import { Readable } from 'node:stream';
import { handleApi } from './api.mjs';

export function deploymentOrigins(env) {
  const origins = [env.VERCEL_URL, env.VERCEL_BRANCH_URL, env.VERCEL_PROJECT_PRODUCTION_URL]
    .filter(Boolean).map(host => `https://${host}`);
  if (env.PUBLIC_APP_ORIGIN) origins.push(env.PUBLIC_APP_ORIGIN);
  return [...new Set(origins)].filter(value => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && url.origin === value && !url.username && !url.password;
    } catch { return false; }
  });
}

// The same API serves local Node and Vercel; static assets stay on Vercel's CDN.
export function vercelEndpoint(route, {env = process.env, ...options} = {}) {
  return {
    async fetch(request) {
      const incoming = request.body ? Readable.fromWeb(request.body) : Readable.from([]);
      Object.assign(incoming, {
        url:route, method:request.method,
        headers:{...Object.fromEntries(request.headers),host:new URL(request.url).host}
      });
      let status = 500, headers, body;
      const response = {
        headersSent:false,
        writeHead(code, values) {status=code;headers=values;this.headersSent=true;},
        end(value) {body=value;}
      };
      await handleApi(incoming, response, {
        apiKey:env.OPENAI_API_KEY,
        publicOrigins:deploymentOrigins(env),
        signal:AbortSignal.any([request.signal,AbortSignal.timeout(240_000)]),
        ...options
      });
      return new Response(request.method === 'HEAD' ? null : body, {status, headers});
    }
  };
}
