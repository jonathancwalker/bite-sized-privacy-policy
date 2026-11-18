import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_ASSETS, readAppAsset } from './assets.mjs';
import { handleApi, json } from './api.mjs';

const root = fileURLToPath(new URL('../app/', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.ttf': 'font/ttf' };
const assets = new Set(APP_ASSETS);

async function handle(req, res, options) {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname.startsWith('/api/')) return handleApi(req, res, options);
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, {error:'This route does not accept that request method.',code:'METHOD_NOT_ALLOWED'});
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root) || !assets.has(path.relative(root, file))) return json(res, 404, {error:'Not found.',code:'NOT_FOUND'});
    const content = await readAppAsset(path.relative(root, file));
    res.writeHead(200, { 'Content-Type':types[path.extname(file)] || 'text/plain', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch (error) {
    json(res, error.code === 'ENOENT' ? 404 : 400, {error:'This request could not be completed.',code:error.code || 'INVALID_REQUEST'});
  }
}

export function createAppServer(options = {}) {
  return http.createServer((req, res) => handle(req, res, {apiKey:process.env.OPENAI_API_KEY, signal:AbortSignal.timeout(240_000), ...options}));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4173);
  createAppServer().listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}`));
}
