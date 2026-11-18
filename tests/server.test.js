const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createServer } = require('../server.js');
async function withServer(options, action) {
  const server = createServer(options); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  try { await action(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
test('static server serves existing pages and blocks credentials and source files', async () => {
  await withServer({ apiKey: '' }, async base => {
    assert.equal((await fetch(`${base}/index.html`)).status, 200);
    for (const pathname of ['/.env', '/server.js', '/package.json', '/.git/config', '/api/anything', '/%2e%2e%5c.env']) assert.equal((await fetch(`${base}${pathname}`)).status, 404);
    const response = await fetch(`${base}/api/topdeck/tournaments`); assert.equal(response.status, 503); assert.equal((await response.json()).error, 'topdeckConfiguration');
  });
});
test('TopDeck key stays on the server, output is normalized and requests cached', async () => {
  let calls = 0;
  await withServer({ apiKey: 'test-secret', fetchImpl: async (url, options) => {
    calls++; assert.equal(options.headers.Authorization, 'test-secret'); assert.match(url, /^https:\/\/topdeck.gg\/api\/v2\/tournaments\?/);
    return Response.json({ found: 1, tournaments: [{ tid: 'one', name: 'Schema fixture', game: 'Magic: The Gathering', format: 'Modern', startDate: 1793552400, registeredCount: 16, privateField: 'hidden' }] });
  } }, async base => {
    const url = `${base}/api/topdeck/tournaments?start=2026-11-01&end=2026-11-18`;
    const result = await (await fetch(url)).json(); assert.equal(result.tournaments[0].source, 'TopDeck.gg'); assert.equal(result.tournaments[0].privateField, undefined);
    assert.ok(!JSON.stringify(result).includes('test-secret')); await fetch(url); assert.equal(calls, 1);
    assert.equal((await fetch(`${base}/api/topdeck/tournaments?start=invalid`)).status, 400);
  });
});
