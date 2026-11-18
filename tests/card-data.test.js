const test = require('node:test');
const assert = require('node:assert/strict');
const CardData = require('../js/card-data.js');
const CardPrices = require('../js/prices.js');

const card = { id: 'printing-a', name: 'Example', set: 'one', set_name: 'First', collector_number: '1', prices: { usd: '0.00', usd_foil: '3.50', eur: '2.00' } };
test('Scryfall shares concurrent requests, caches and expires entries', async () => {
  let requests = 0; let clock = 100;
  const client = CardData.createClient({ interval: 0, now: () => clock, fetchImpl: async () => { requests++; return Response.json(card); } });
  await Promise.all([client.request('/cards/printing-a', { ttl: 10 }), client.request('/cards/printing-a', { ttl: 10 })]);
  await client.request('/cards/printing-a'); assert.equal(requests, 1);
  clock = 111; await client.request('/cards/printing-a'); assert.equal(requests, 2);
});
test('a cancelled subscriber does not cancel other subscribers', async () => {
  const controller = new AbortController();
  const client = CardData.createClient({ interval: 0, fetchImpl: async () => { await new Promise(resolve => setTimeout(resolve, 10)); return Response.json(card); } });
  const cancelled = client.request('/cards/printing-a', { signal: controller.signal });
  const shared = client.request('/cards/printing-a'); controller.abort();
  await assert.rejects(cancelled, { name: 'AbortError' }); assert.equal((await shared).id, card.id);
});
test('errors and rate limits stay actionable; malformed lists are rejected', async () => {
  const limited = CardData.createClient({ fetchImpl: async () => new Response('', { status: 429, headers: { 'Retry-After': '60' } }) });
  await assert.rejects(limited.request('/cards/a'), error => error.code === 'rateLimited' && error.retryAfter === 60);
  const malformed = CardData.createClient({ fetchImpl: async () => Response.json({ data: [null] }) });
  await assert.rejects(malformed.request('/cards/search?q=test'), error => error.code === 'invalidResponse');
});
test('automatic catalog queries are bounded to the first remote page', async () => {
  let requestPath;
  const provider = CardData.createMtgProvider({ request: async request => { requestPath = request; return { data: [card], total_cards: 300, has_more: true }; } });
  const result = await provider.search(); assert.equal(result.cards.length, 1); assert.equal(result.nextPage, 2);
  const params = new URLSearchParams(requestPath.split('?')[1]); assert.equal(params.get('page'), '1'); assert.equal(params.get('q'), 'game:paper');
});
test('prices retain exact printing, variant, currency, zero and missing values', () => {
  const normalized = CardData.normalizeMtg(card); const values = CardPrices.entries(normalized);
  assert.equal(CardPrices.main(normalized).value, 0); assert.equal(values.find(price => price.variant === 'foil').value, 3.5);
  assert.ok(values.every(price => price.printingId === 'printing-a'));
  const noRegular = CardData.normalizeMtg({ ...card, id: 'printing-b', prices: { usd: null, usd_foil: '9.00' } });
  assert.equal(CardPrices.main(noRegular), null); assert.equal(CardPrices.entries(noRegular)[0].printingId, 'printing-b');
  assert.match(CardPrices.format(values[0]), /USD/);
  assert.deepEqual(CardPrices.entries({ id: 'selected', metadata: { priceRecords: [{ printingId: 'other', value: 20, currency: 'USD' }] } }), []);
});
test('collection matches missing cards by printing identifier rather than response position', async () => {
  const provider = CardData.createMtgProvider({ request: async () => ({ data: [card] }) });
  const results = await provider.collection([{ name: 'Missing' }, { name: 'Example', set: 'one', number: '1' }]);
  assert.equal(results[0], null); assert.equal(results[1].id, card.id);
});
test('only registered providers can be selected', () => {
  CardData.selectGame('mtg'); assert.equal(CardData.game, 'mtg');
  assert.throws(() => CardData.selectGame('unsupported')); assert.equal(CardData.game, 'mtg');
});
