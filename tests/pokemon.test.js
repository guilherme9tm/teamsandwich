const test = require('node:test');
const assert = require('node:assert/strict');
global.CardData = require('../js/card-data.js');
const PokemonCards = require('../js/pokemon-provider.js');
const prices = require('../js/prices.js');
test('Pokémon provider uses its own paginated source and excludes Pocket sets', async () => {
  const requests = [];
  const provider = PokemonCards.createProvider({ fetchImpl: async url => {
    requests.push(url);
    if (url.includes('/series/')) return Response.json({ sets: [{ id: 'A1' }] });
    return Response.json([{ id: 'A1-001', name: 'Pocket' }, { id: 'sv06-001', name: 'Tangela' }]);
  } });
  const result = await provider.search({ query: 'Tangela', set: 'sv06', page: 2, category: 'Pokemon' });
  assert.deepEqual(result.cards.map(card => card.id), ['sv06-001']);
  const url = new URL(requests[1]); assert.equal(url.searchParams.get('pagination:page'), '2'); assert.equal(url.searchParams.get('pagination:itemsPerPage'), '30'); assert.equal(url.searchParams.get('category'), 'eq:Pokemon');
  assert.ok(requests.every(url => url.startsWith('https://api.tcgdex.net/')));
  assert.equal(url.searchParams.get('set.id'), 'eq:sv06');
  await assert.rejects(provider.get('A1-001'), error => error.status === 404);
});
test('Pokémon prices are associated with reported finish and currency only', () => {
  const card = PokemonCards.normalize({ id: 'set-1', name: 'Example', variants_detailed: [
    { type: 'normal', variantId: 'normal-id', thirdParty: { tcgplayer: 1 }, pricing: { tcgplayer: { unit: 'USD', normal: { productId: 1, marketPrice: 1.25 } } } },
    { type: 'reverse', variantId: 'reverse-id', thirdParty: { tcgplayer: 1 }, pricing: { tcgplayer: { unit: 'USD', 'reverse-holofoil': { productId: 1, marketPrice: 4 } } } }
  ] });
  assert.equal(prices.main(card).value, 1.25); assert.equal(prices.entries(card)[1].variant, 'reverse'); assert.equal(prices.entries(card)[1].printingId, 'set-1');
  assert.deepEqual(prices.entries(PokemonCards.normalize({ id: 'set-2', name: 'Legacy mapping', pricing: { tcgplayer: { unit: 'USD', normal: { marketPrice: 99 } } } })), []);
});
test('external set codes and collector number padding resolve exact Pokémon printings', async () => {
  const provider = PokemonCards.createProvider({ fetchImpl: async url => {
    if (url.includes('/series/')) return Response.json({ sets: [] });
    if (url.includes('/sets?')) return Response.json([{ id: 'sv06' }]);
    if (url.endsWith('/sets/sv06')) return Response.json({ cards: [{ id: 'sv06-001', localId: '001', name: 'Tangela' }] });
    if (url.endsWith('/cards/sv06-001')) return Response.json({ id: 'sv06-001', name: 'Tangela', localId: '001' });
    throw new Error('unexpected endpoint');
  } });
  const result = await provider.collection([{ name: 'Tangela', set: 'TWM', number: '1' }, { name: 'Different card', set: 'TWM', number: '1' }]);
  assert.equal(result[0].id, 'sv06-001'); assert.equal(result[1], null);
});
test('game selection remains exclusive and Magic stays the default', () => {
  assert.equal(CardData.game, 'mtg'); CardData.selectGame('pokemon'); assert.equal(CardData.provider().id, 'pokemon');
  CardData.selectGame('mtg'); assert.equal(CardData.provider().id, 'mtg');
});
