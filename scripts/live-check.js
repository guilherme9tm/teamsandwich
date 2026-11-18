const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
global.CardData = require('../js/card-data.js');
const PokemonCards = require('../js/pokemon-provider.js');
const TournamentData = require('../js/tournament-data.js');
const CardPrices = require('../js/prices.js');

async function main() {
  const context = vm.createContext({ module: { exports: {} } });
  vm.runInContext(fs.readFileSync('js/lands.js', 'utf8'), context);
  const lands = context.module.exports;
  const magic = CardData.provider('mtg');
  for (const [id, cycle] of Object.entries(lands.cycles)) {
    const query = `t:land (${cycle.cards.map(name => `!"${name}"`).join(' or ')})`;
    const result = await magic.search({ query });
    assert.equal(result.cards.length, cycle.cards.length, `${id}: exact cycle coverage`);
    assert.equal(new Set(result.cards.map(card => card.metadata.oracle_id)).size, cycle.cards.length);
    console.log(`Scryfall ${id}: ${result.cards.length} distinct cards`);
  }
  const pokemon = PokemonCards.createProvider();
  const search = await pokemon.search({ query: 'Pikachu' });
  assert.ok(search.cards.length > 0); assert.equal(search.cards[0].game, 'pokemon');
  const card = await pokemon.get('swsh3-136');
  assert.equal(card.name, 'Furret'); assert.ok(card.images.normal.endsWith('/high.webp'));
  assert.ok(CardPrices.entries(card).every(price => price.printingId === card.id && price.variantId));
  const external = await pokemon.collection([{ name: 'Tangela', set: 'TWM', number: '1' }]);
  assert.equal(external[0]?.id, 'sv06-001');
  console.log(`TCGdex: paginated search, details and external printing mapping OK; ${CardPrices.entries(card).length} verified price records`);
  const tournaments = TournamentData.createProvider();
  const recent = await tournaments.list({ game: 'pokemon' });
  assert.ok(recent.tournaments.length > 0);
  const standings = await tournaments.standings(recent.tournaments[0]);
  assert.ok(Array.isArray(standings));
  console.log(`Limitless: ${recent.tournaments.length} recent tournaments; ${standings.length} standings in latest event`);
  console.log('TopDeck live validation requires TOPDECK_API_KEY and is not exercised by this command.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
