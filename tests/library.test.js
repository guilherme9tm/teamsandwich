const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createServer } = require('../server');
const { validate } = require('../js/library-data');
const origin = 'https://cards.example';
const users = { a: { id: '11111111-1111-4111-8111-111111111111', email: 'a@example.com' }, b: { id: '22222222-2222-4222-8222-222222222222', email: 'b@example.com' } };
const deck = { id: 'deck', name: 'Burn', game: 'mtg', cards: [{ id: 'bolt', name: 'Lightning Bolt', quantity: 4, owned: 2, section: 'main' }] };
const wish = { id: 'wish', printingId: 'sv06-001', name: 'Tangela', game: 'pokemon', quantity: 2, set: 'Twilight Masquerade', number: '1' };
async function setup(action, override) {
  const records = new Map(), calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    const account = options.headers.Authorization?.split(' ')[1];
    if (url.endsWith('/auth/v1/user')) return Response.json(users[account] || {}, { status: users[account] ? 200 : 401 });
    if (override) return override(url, options);
    assert.equal(options.headers.apikey, 'sb_publishable_test');
    const kind = url.includes('/rpc/') ? JSON.parse(options.body).p_kind : new URL(url).searchParams.get('kind').slice(3);
    const key = `${account}:${kind}`;
    if (options.method === 'GET') {
      assert.equal(new URL(url).searchParams.get('user_id'), `eq.${users[account].id}`);
      return Response.json(records.has(key) ? [records.get(key)] : []);
    }
    const body = JSON.parse(options.body), row = records.get(key) || { revision: 0, items: [] };
    assert.deepEqual(Object.keys(body).sort(), ['p_expected_revision', 'p_items', 'p_kind']);
    if (row.revision !== body.p_expected_revision) return Response.json({ code: 'PT409' }, { status: 409 });
    const next = { revision: row.revision + 1, items: body.p_items }; records.set(key, next); return Response.json(next);
  };
  const server = createServer({ auth: { url: 'https://example.supabase.co', key: 'sb_publishable_test', origin }, fetchImpl });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (account, kind, input, extra = {}) => fetch(`${base}/api/library/${kind}`, {
    method: input ? 'PUT' : 'GET', headers: { Cookie: account ? `__Host-ts_access=${account}` : '', Origin: origin,
      'Content-Type': 'application/json', 'X-Account-ID': users[account]?.id || '', ...extra }, ...(input ? { body: JSON.stringify(input) } : {})
  });
  try { await action(request, records, calls); } finally { await new Promise(resolve => server.close(resolve)); }
}
test('decks and wishlist persist independently for each authenticated account', async () => setup(async request => {
  assert.deepEqual(await (await request('a', 'decks')).json(), { items: [], revision: 0 });
  assert.equal((await request('a', 'decks', { items: [deck], revision: 0 })).status, 200);
  assert.equal((await request('a', 'wishlist', { items: [wish], revision: 0 })).status, 200);
  assert.deepEqual((await (await request('a', 'decks')).json()).items, [deck]);
  assert.deepEqual((await (await request('a', 'wishlist')).json()).items, [wish]);
  assert.deepEqual((await (await request('b', 'decks')).json()).items, []);
  assert.deepEqual((await (await request('b', 'wishlist')).json()).items, []);
}));
test('anonymous callers, cross-site writes and account changes cannot read or write libraries', async () => setup(async (request, records, calls) => {
  assert.equal((await request(null, 'decks')).status, 401);
  assert.equal((await request('a', 'decks', { items: [deck], revision: 0 }, { Origin: 'https://attacker.example' })).status, 403);
  const changed = await request('b', 'decks', { items: [deck], revision: 0 }, { 'X-Account-ID': users.a.id });
  assert.equal(changed.status, 409); assert.equal((await changed.json()).error, 'authAccountChanged');
  assert.equal(records.size, 0); assert.equal(calls.filter(call => call.url.includes('/rest/')).length, 0);
}));
test('optimistic concurrency rejects stale replacements and preserves the newer data', async () => setup(async request => {
  await request('a', 'decks', { items: [deck], revision: 0 });
  const conflict = await request('a', 'decks', { items: [], revision: 0 });
  assert.equal(conflict.status, 409); assert.equal((await conflict.json()).error, 'libraryConflict');
  assert.deepEqual((await (await request('a', 'decks')).json()).items, [deck]);
  assert.equal((await request('a', 'decks', { items: [], revision: 1 })).status, 200);
  assert.deepEqual((await (await request('a', 'decks')).json()).items, []);
}));
test('library input is bounded, validates game/counts and rejects client ownership fields', async () => setup(async request => {
  const invalid = [
    { items: [deck], revision: -1 }, { items: [deck], revision: 0, user_id: users.b.id },
    { items: [{ ...deck, game: 'unknown' }], revision: 0 },
    { items: [{ ...deck, cards: [{ ...deck.cards[0], owned: -1 }] }], revision: 0 },
    { items: [deck, deck], revision: 0 }, { items: Array(201).fill(deck), revision: 0 }
  ];
  for (const body of invalid) assert.equal((await request('a', 'decks', body)).status, 400);
  assert.equal((await request('a', 'wishlist', { items: [{ ...wish, quantity: 0 }], revision: 0 })).status, 400);
  assert.equal((await request('a', 'wishlist', { items: [{ ...wish, printingId: '' }], revision: 0 })).status, 400);
  assert.equal((await request('a', 'decks', { items: [], revision: 0, padding: 'x'.repeat(4 * 1024 * 1024) })).status, 413);
}));
test('missing SQL setup and provider failures are actionable without exposing database errors', async () => {
  for (const [code, error] of [['PGRST205', 'libraryNotConfigured'], ['PGRST202', 'libraryNotConfigured'], ['42P01', 'libraryNotConfigured'], ['42501', 'libraryUnavailable']]) {
    await setup(async request => {
      const result = await request('a', 'decks'); assert.equal(result.status, 503);
      assert.deepEqual(await result.json(), { error });
    }, () => Response.json({ code, message: 'private database details' }, { status: 400 }));
  }
});
test('invalid stored responses are never treated as an empty library', async () => {
  await setup(async request => {
    const result = await request('a', 'decks'); assert.equal(result.status, 503); assert.equal((await result.json()).error, 'libraryUnavailable');
  }, () => Response.json([{ items: [{ ...deck, cards: null }], revision: 1 }]));
  assert.throws(() => validate('wishlist', [{ ...wish, game: 'invalid' }]), /libraryInvalidData/);
});
