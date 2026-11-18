const test = require('node:test');
const assert = require('node:assert/strict');
const MetaAnalysis = require('../js/meta-analysis.js');
const DeckImport = require('../js/deck-import.js');
const TournamentData = require('../js/tournament-data.js');
test('frequency boundaries, duplicate printings and copy averages use deck counts', () => {
  const decks = Array.from({ length: 100 }, (_, index) => ({ id: String(index), game: 'mtg', format: 'Modern', date: index < 50 ? '2026-10-01' : '2026-11-01', source: 'test fixture', archetype: 'Control', entries: [
    ...(index < 70 ? [{ name: 'Core', quantity: 1, section: 'main', set: 'a' }, { name: 'Core', quantity: 3, section: 'main', set: 'b' }] : []),
    ...(index < 10 ? [{ name: 'Flex', quantity: 2, section: 'main' }] : []),
    ...(index < 9 ? [{ name: 'Choice', quantity: 1, section: 'main' }] : []),
    { name: 'Side', quantity: 1, section: 'sideboard' }
  ] }));
  const result = MetaAnalysis.analyze([...decks, decks[0]], { game: 'mtg', format: 'Modern' });
  assert.equal(result.sample, 100); assert.equal(result.cards.length, 3);
  const core = result.cards.find(card => card.name === 'Core'); assert.equal(core.frequency, 70); assert.equal(core.averageCopies, 2.8); assert.equal(core.averageWhenPresent, 4); assert.equal(core.category, 'core');
  assert.equal(result.cards.find(card => card.name === 'Flex').category, 'flex'); assert.equal(result.cards.find(card => card.name === 'Choice').category, 'uncommon');
  assert.deepEqual(core.history.map(period => period.frequency), [100, 40]);
  assert.equal(MetaAnalysis.analyze(decks, { section: 'sideboard' }).cards[0].frequency, 100);
});
test('mixed games and formats cannot silently enter one analysis', () => {
  const deck = { id: 'a', game: 'mtg', format: 'Modern', entries: [{ name: 'A', quantity: 1, section: 'main' }] };
  assert.throws(() => MetaAnalysis.analyze([deck, { ...deck, id: 'b', format: 'Legacy' }]), /mixedSample/);
  assert.throws(() => MetaAnalysis.analyze([deck], { flex: 70, core: 70 }), /invalidThresholds/);
  assert.equal(MetaAnalysis.analyze([]).sample, 0);
});
test('Pokémon cards with the same name remain distinct without a verified equivalence map', () => {
  assert.notEqual(MetaAnalysis.identity({ name: 'Charizard', set: 'A', number: '1' }, 'pokemon'), MetaAnalysis.identity({ name: 'Charizard', set: 'B', number: '1' }, 'pokemon'));
});
test('text import preserves quantities, sections and printing identifiers', () => {
  const deck = DeckImport.parse('Deck\n2 Lightning Bolt (M11) 146\n1 Lightning Bolt (M11) 146\nSideboard\n2 Negate');
  assert.equal(deck.entries[0].quantity, 3); assert.equal(deck.entries[0].set, 'm11'); assert.equal(deck.entries[1].section, 'sideboard');
  assert.deepEqual(DeckImport.readStored(deck).entries, deck.entries);
  assert.throws(() => DeckImport.parse('x'.repeat(256001)), /importTooLarge/);
});
test('real-provider schemas normalize decklists without fetching mutable external URLs', () => {
  const tournament = TournamentData.normalizeLimitless({ id: 'fixture', game: 'PTCG', format: 'STANDARD', name: 'Schema fixture', date: '2026-11-01' });
  const deck = TournamentData.normalizeStanding({ player: 'one', name: 'Player', placing: 1, decklist: { pokemon: [{ name: 'Tangela', count: 4, set: 'TWM', number: '1' }] }, deck: { name: 'Example' } }, tournament, 0);
  assert.equal(deck.entries[0].quantity, 4); assert.equal(deck.provenance, 'published');
  const external = TournamentData.normalizeStanding({ decklist: 'https://example.com/deck' }, { ...tournament, game: 'mtg' }, 1);
  assert.equal(external.entries, null); assert.equal(external.deckUrl, 'https://example.com/deck');
  assert.equal(TournamentData.safeLink('javascript:alert(1)'), null);
});
test('Pokémon text exports preserve printed set codes and skip counted section headings', () => {
  const deck = DeckImport.parse('Pokémon: 1\n4 Tangela TWM 1\nTrainer: 1\n2 Ultra Ball SVI 196\nEnergy: 0\nTotal Cards: 6', { game: 'pokemon' });
  assert.equal(deck.entries.length, 2); assert.equal(deck.entries[0].name, 'Tangela'); assert.equal(deck.entries[0].set, 'twm'); assert.equal(deck.entries[1].number, '196');
  assert.deepEqual(DeckImport.readStored(deck).entries, deck.entries);
});
test('deck comparison counts sections and combines reprints', () => {
  const first = { game: 'mtg', format: 'Modern', entries: [{ name: 'A', quantity: 2, section: 'main' }, { name: 'A', quantity: 1, section: 'main' }] };
  const second = { ...first, entries: [{ name: 'A', quantity: 4, section: 'main' }] };
  assert.deepEqual(MetaAnalysis.compare(first, second)[0], { name: 'A', section: 'main', first: 3, second: 4 });
});
test('tournament API errors and empty responses do not produce invented results', async () => {
  const empty = TournamentData.createProvider({ fetchImpl: async () => Response.json([]) });
  assert.deepEqual((await empty.list({ game: 'pokemon' })).tournaments, []);
  const unavailable = TournamentData.createProvider({ fetchImpl: async () => new Response('', { status: 503 }) });
  await assert.rejects(unavailable.list(), /topdeckConfiguration/);
});
