const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const TournamentData = require('./js/tournament-data.js');

function createServer({ apiKey = process.env.TOPDECK_API_KEY, fetchImpl = fetch, root = __dirname } = {}) {
  const cache = new Map();
  const pending = new Map();
  let queue = Promise.resolve();
  let nextStart = 0;
  let cooldown = 0;
  async function topdeck(endpoint) {
    if (!apiKey) throw Object.assign(new Error('topdeckConfiguration'), { status: 503 });
    if (cache.get(endpoint)?.expires > Date.now()) return cache.get(endpoint).value;
    if (!pending.has(endpoint)) {
      if (pending.size >= 30) throw Object.assign(new Error('sourceBusy'), { status: 503 });
      const task = queue.then(async () => {
        if (cooldown > Date.now()) throw Object.assign(new Error('rateLimited'), { status: 429 });
        await new Promise(resolve => setTimeout(resolve, Math.max(0, nextStart - Date.now())));
        nextStart = Date.now() + 1500;
        const response = await fetchImpl(`https://topdeck.gg/api/v2/${endpoint}`, {
          headers: { Authorization: apiKey, Accept: 'application/json' }, signal: AbortSignal.timeout(15000)
        });
        if (response.status === 429) {
          cooldown = Date.now() + Math.max(60, Number(response.headers.get('retry-after')) || 60) * 1000;
          throw Object.assign(new Error('rateLimited'), { status: 429 });
        }
        if (!response.ok) throw Object.assign(new Error('sourceUnavailable'), { status: 502 });
        const value = await response.json();
        if (cache.size >= 200) cache.delete(cache.keys().next().value);
        cache.set(endpoint, { value, expires: Date.now() + 600000 });
        return value;
      });
      queue = task.catch(() => {});
      pending.set(endpoint, task.finally(() => pending.delete(endpoint)));
    }
    return pending.get(endpoint);
  }
  function json(response, status, value) {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(JSON.stringify(value));
  }
  return http.createServer(async (request, response) => {
    try {
      if (request.method !== 'GET' && request.method !== 'HEAD') return json(response, 405, { error: 'methodNotAllowed' });
      const url = new URL(request.url, 'http://localhost');
      if (url.pathname === '/api/topdeck/tournaments') {
        const page = Math.max(1, Math.min(1000, Number.parseInt(url.searchParams.get('page'), 10) || 1));
        const start = url.searchParams.get('start') || new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
        const end = url.searchParams.get('end') || new Date().toISOString().slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || !Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end))) return json(response, 400, { error: 'invalidQuery' });
        const params = new URLSearchParams({ game: 'Magic: The Gathering', page, perPage: 24,
          start: Math.floor(Date.parse(start) / 1000), end: Math.floor((Date.parse(end) + 86399999) / 1000) });
        const format = url.searchParams.get('format');
        if (format && /^[\w :/-]{1,60}$/.test(format)) params.set('format', format);
        const result = await topdeck(`tournaments?${params}`);
        if (!Array.isArray(result.tournaments)) throw new Error('invalidResponse');
        return json(response, 200, { tournaments: result.tournaments.map(TournamentData.normalizeTopdeck), nextPage: page * 24 < result.found ? page + 1 : null });
      }
      const standingsMatch = url.pathname.match(/^\/api\/topdeck\/tournaments\/([a-zA-Z0-9_-]{1,100})\/standings$/);
      if (standingsMatch) {
        const result = await topdeck(`tournaments/${standingsMatch[1]}`);
        const tournament = TournamentData.normalizeTopdeck(result.data);
        if (!Array.isArray(result.standings)) throw new Error('invalidResponse');
        return json(response, 200, result.standings.map((row, index) => TournamentData.normalizeStanding(row, tournament, index)));
      }
      if (url.pathname.startsWith('/api/')) return json(response, 404, { error: 'notFound' });
      const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      const resolved = path.resolve(root, `.${relative}`);
      const inside = path.relative(root, resolved);
      const segments = inside.split(/[\\/]/);
      if (inside.startsWith('..') || path.isAbsolute(inside) || segments.some(segment => segment.startsWith('.')) || !/\.(html|css|js|json|png|jpg|jpeg|webp|svg|ico|woff2)$/i.test(resolved)
        || !['assets', 'css', 'js'].includes(segments[0]) && segments.length > 1
        || segments.length === 1 && !/\.html$/i.test(resolved)) return json(response, 404, { error: 'notFound' });
      const data = await fs.readFile(resolved);
      const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon' };
      response.writeHead(200, { 'Content-Type': `${types[path.extname(resolved)] || 'application/octet-stream'}; charset=utf-8`, 'X-Content-Type-Options': 'nosniff' });
      response.end(request.method === 'HEAD' ? undefined : data);
    } catch (error) {
      json(response, error.code === 'ENOENT' ? 404 : error.status || 502, { error: ['topdeckConfiguration', 'rateLimited', 'sourceBusy'].includes(error.message) ? error.message : 'sourceUnavailable' });
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 5500;
  const host = process.env.HOST || '127.0.0.1';
  createServer().listen(port, host, () => console.log(`Team Sandwich: http://${host}:${port}`));
}
module.exports = { createServer };
