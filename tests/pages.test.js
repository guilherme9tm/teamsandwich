const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

const baseCard = { id: 'first-print', name: 'A deliberately long card name for testing compact titles', set: 'one', set_name: 'First set', collector_number: '1', oracle_id: 'oracle-one', rarity: 'rare', lang: 'en', type_line: 'Creature', oracle_text: 'Draw a card.', image_uris: { normal: 'https://example.com/card.jpg' }, prices: { usd: '2.00', usd_foil: '4.00' }, legalities: { modern: 'legal' } };
const otherCard = { ...baseCard, id: 'second-print', set: 'two', set_name: 'Second set', prices: { usd: null, usd_foil: '8.00' } };
const tournament = { id: 'event-one', name: 'Integration fixture tournament', game: 'PTCG', format: 'STANDARD', date: '2026-11-01T12:00:00Z', players: 16 };
const standings = [{ name: 'Integration player', player: 'player-one', placing: 1, deck: { name: 'Integration archetype' }, decklist: { pokemon: [{ name: 'Tangela', count: 4, set: 'TWM', number: '1' }] } }];
async function waitFor(predicate, message) {
  const deadline = Date.now() + 6000;
  while (!predicate()) { if (Date.now() > deadline) throw new Error(`Timed out: ${message}`); await new Promise(resolve => setTimeout(resolve, 20)); }
}
function page(file, query = '', { failure = false, pokemonFailure = false, disablePokemon = false, searchPages = null, rateFailure = false } = {}) {
  const html = fs.readFileSync(file, 'utf8');
  const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(match => match[1]);
  const errors = []; const requests = [];
  const virtualConsole = new VirtualConsole(); virtualConsole.on('jsdomError', error => errors.push(error));
  let rejectSearch = failure;
  const dom = new JSDOM(html.replace(/<script src="[^"]+"><\/script>/g, ''), {
    url: `http://localhost/${file}${query}`, runScripts: 'dangerously', virtualConsole,
    beforeParse(window) {
      window.scrollTo = () => {};
      window.fetch = async url => {
        requests.push(String(url));
        if (url.includes('bankofcanada.ca')) return rateFailure ? new Response('', { status: 503 })
          : Response.json({ observations: [{ d: new Date().toISOString().slice(0, 10), FXUSDCAD: { v: '1.40' }, FXEURCAD: { v: '1.50' } }] });
        if (url.includes('play.limitlesstcg.com')) return Response.json(url.includes('/standings') ? standings : [tournament]);
        if (url.startsWith('/api/')) return Response.json({ error: 'topdeckConfiguration' }, { status: 503 });
        if (url.includes('api.tcgdex.net')) {
          if (pokemonFailure) return new Response('', { status: 503 });
          if (url.includes('/series/')) return Response.json({ sets: [{ id: 'A1' }] });
          if (url.includes('/sets?abbreviation')) return Response.json([{ id: 'sv06' }]);
          if (url.endsWith('/sets/sv06')) return Response.json({ cards: [{ id: 'sv06-001', name: 'Tangela', localId: '001' }] });
          if (url.includes('/sets')) return Response.json([{ id: 'sv06', name: 'Twilight Masquerade', cardCount: { total: 226 } }]);
          if (url.includes('/cards?')) return Response.json([{ id: 'sv06-001', name: 'Tangela', localId: '001', image: 'https://assets.tcgdex.net/en/sv/sv06/001' }]);
          return Response.json({ id: 'sv06-001', name: 'Tangela', localId: '001', rarity: 'Rare Holo', category: 'Pokemon', set: { id: 'sv06', name: 'Twilight Masquerade' }, legal: { standard: true }, variants_detailed: [{ type: 'normal', variantId: 'verified', thirdParty: { tcgplayer: 1 }, pricing: { tcgplayer: { unit: 'USD', normal: { productId: 1, marketPrice: 1.25 } } } }] });
        }
        if (url.includes('/sets')) return Response.json({ object: 'list', data: [{ code: 'one', name: 'First set', icon_svg_uri: 'https://example.com/set.svg', set_type: 'expansion', card_count: 100, released_at: '2026-11-01' }] });
        if (url.includes('/cards/search?')) {
          if (rejectSearch) return new Response('', { status: 503 });
          if (searchPages) return Response.json(searchPages[Number(new URL(url).searchParams.get('page')) - 1]);
          return Response.json({ object: 'list', data: [baseCard, otherCard], has_more: false, total_cards: 2 });
        }
        if (url.includes('/cards/collection')) return Response.json({ object: 'list', data: [baseCard] });
        return Response.json(url.includes('second-print') ? otherCard : baseCard);
      };
      window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
      window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); this.dispatchEvent(new window.Event('close')); };
      Object.defineProperty(window.navigator, 'clipboard', { value: { writeText: async value => { window.copiedText = value; } } });
    }
  });
  for (const script of scripts) {
    if (disablePokemon && script === 'js/pokemon-provider.js') continue;
    const element = dom.window.document.createElement('script'); element.textContent = fs.readFileSync(path.resolve(script), 'utf8'); dom.window.document.body.append(element);
  }
  return { dom, errors, requests, allowSearch: () => { rejectSearch = false; } };
}
test('all page headers display the original Team Sandwich logo', () => {
  for (const file of ['index.html', 'card.html', 'card-detail.html', 'competitive.html']) {
    const dom = new JSDOM(fs.readFileSync(file, 'utf8'));
    try {
      const document = dom.window.document;
      const logo = document.querySelector('.logo-link-header .header-logo');
      assert.ok(logo, `${file}: header logo`);
      assert.equal(logo.getAttribute('src'), 'assets/images/IMG_6262.jpg');
      assert.equal(logo.alt, 'Team Sandwich');
      assert.ok(fs.existsSync(path.resolve(logo.getAttribute('src'))));
      assert.equal(document.querySelector('.brand-mark'), null);
    } finally { dom.window.close(); }
  }
});

test('catalog loads automatically, preserves imports/actions and applies exclusive game state', async () => {
  const { dom, requests, errors } = page('card.html');
  try {
    const document = dom.window.document;
    await waitFor(() => document.querySelectorAll('#resultado .card-title-link').length === 2, 'initial cards');
    assert.equal(requests.filter(url => url.includes('/cards/search?')).length, 1);
    await waitFor(() => document.querySelector('.card-price').textContent.includes('CAD'), 'CAD conversion');
    assert.match(document.querySelector('.card-price').textContent, /2\.80/);
    assert.equal(document.querySelector('.card-title-link').title, baseCard.name);
    assert.equal(document.querySelectorAll('.game-selector [aria-pressed="true"]').length, 1);
    assert.equal(document.querySelector('.game-selector [aria-pressed="true"]').textContent, 'Magic: The Gathering');
    assert.ok(document.querySelector('a[href*="view=lands"]'));
    assert.ok(document.getElementById('arquivoInput'));
    document.querySelector('.lang-selector-select').value = 'pt'; document.querySelector('.lang-selector-select').dispatchEvent(new dom.window.Event('change'));
    assert.equal(document.documentElement.lang, 'pt'); assert.equal(dom.window.localStorage.getItem('lang'), 'pt');
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});
test('pagination fetches more cards on demand without a load-more button', async () => {
  const firstBatch = Array.from({ length: 15 }, (_, index) => ({ ...baseCard, id: `print-${index}`, name: `Card ${index}` }));
  const secondBatch = Array.from({ length: 5 }, (_, index) => ({ ...baseCard, id: `next-${index}`, name: `Next ${index}` }));
  const { dom, requests, errors } = page('card.html', '', { searchPages: [
    { object: 'list', data: firstBatch, has_more: true, total_cards: 20 },
    { object: 'list', data: secondBatch, has_more: false, total_cards: 20 }
  ] });
  try {
    const document = dom.window.document;
    await waitFor(() => document.querySelectorAll('#resultado .card-title-link').length === 15, 'first page');
    assert.equal(document.querySelector('#searchLoadControls button'), null);
    assert.equal(requests.filter(url => url.includes('/cards/search?')).length, 1);
    const next = document.querySelector('#pageNav .arrow-btn:last-of-type');
    assert.equal(next.disabled, false);
    next.click(); next.click();
    await waitFor(() => document.querySelector('.card-title-link')?.textContent === 'Next 0', 'remote page navigation');
    assert.equal(document.querySelectorAll('#resultado .card-title-link').length, 5);
    assert.equal(requests.filter(url => url.includes('/cards/search?')).length, 2);
    assert.equal(document.querySelector('#pageNav .arrow-btn:last-of-type').disabled, true);
    assert.equal(document.querySelector('#searchLoadControls button'), null);
    document.querySelector('#pageNav .arrow-btn').click();
    assert.equal(document.querySelector('.card-title-link').textContent, 'Card 0');
    assert.equal(requests.filter(url => url.includes('/cards/search?')).length, 2);
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('catalog failures expose a working retry and clear skeletons', async () => {
  const current = page('card.html', '', { failure: true });
  try {
    const document = current.dom.window.document;
    await waitFor(() => document.querySelector('.load-error'), 'error state');
    assert.equal(document.querySelectorAll('.card-skeleton').length, 0);
    current.allowSearch(); document.querySelector('#searchLoadControls button').click();
    await waitFor(() => document.querySelector('.card-title-link'), 'retry result'); assert.deepEqual(current.errors, []);
  } finally { current.dom.window.close(); }
});
test('game selector disables Pokémon when no validated adapter is registered', async () => {
  const { dom, errors } = page('card.html', '', { disablePokemon: true });
  try {
    await waitFor(() => dom.window.document.querySelector('.game-selector'), 'game selector');
    const buttons = dom.window.document.querySelectorAll('.game-selector button');
    assert.equal(buttons[1].disabled, true); assert.equal(buttons[0].getAttribute('aria-pressed'), 'true'); assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});
test('Pokémon search stays separate, hides Magic filters and enriches only visible prices', async () => {
  const { dom, requests, errors } = page('card.html', '?game=pokemon&name=Tangela');
  try {
    const document = dom.window.document;
    await waitFor(() => document.querySelector('.card-price')?.textContent.includes('1.75'), 'Pokémon CAD price enrichment');
    assert.ok(requests.some(url => url.includes('api.tcgdex.net/v2/en/cards?')));
    assert.ok(!requests.some(url => url.includes('scryfall')));
    assert.equal(document.querySelectorAll('.game-selector [aria-pressed="true"]').length, 1);
    assert.equal(document.querySelector('.game-selector [aria-pressed="true"]').textContent, 'Pokémon TCG');
    assert.equal(document.querySelector('a[href*="view=lands"]'), null);
    assert.match(document.querySelector('.card-title-link').href, /game=pokemon/); assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});
test('Pokemon catalog opens a searchable set directory instead of mixed cards', async () => {
  const { dom, requests, errors } = page('card.html', '?game=pokemon');
  try {
    const document = dom.window.document;
    await waitFor(() => document.querySelector('#pokemonSets a'), 'set directory');
    const link = document.querySelector('#pokemonSets a');
    assert.match(link.textContent, /Twilight Masquerade/);
    assert.equal(new URL(link.href).searchParams.get('set'), 'sv06');
    assert.equal(document.getElementById('searchTitle').textContent, 'All Collections');
    assert.equal(document.querySelector('.results-section').hidden, true);
    assert.ok(!requests.some(url => url.includes('/cards?')));
    const input = document.getElementById('pokemonSetSearch');
    input.value = 'unknown'; input.dispatchEvent(new dom.window.Event('input'));
    assert.equal(document.querySelectorAll('#pokemonSets a').length, 0);
    input.value = 'sv06'; input.dispatchEvent(new dom.window.Event('input'));
    assert.equal(document.querySelectorAll('#pokemonSets a').length, 1);
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('Pokemon set pages scope remote cards by set and display the collection name', async () => {
  const { dom, requests, errors } = page('card.html', '?game=pokemon&set=sv06&category=Pokemon');
  try {
    const document = dom.window.document;
    await waitFor(() => document.querySelector('.card-title-link'), 'set cards');
    const url = new URL(requests.find(url => url.includes('/cards?')));
    assert.equal(url.searchParams.get('set.id'), 'eq:sv06');
    assert.equal(url.searchParams.get('category'), 'eq:Pokemon');
    assert.equal(document.getElementById('pokemonSetFilter').value, 'sv06');
    assert.equal(document.getElementById('pokemonCategoryFilter').value, 'Pokemon');
    assert.match(document.getElementById('searchTitle').textContent, /Twilight Masquerade/);
    assert.equal(document.getElementById('pokemonSets'), null);
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('Pokemon directory failures offer retry without loading mixed cards', async () => {
  const { dom, requests, errors } = page('card.html', '?game=pokemon', { pokemonFailure: true });
  try {
    await waitFor(() => dom.window.document.querySelector('.pokemon-set-status button'), 'set retry');
    assert.ok(!requests.some(url => url.includes('/cards?')));
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('details keep missing regular price unavailable and load per-printing comparisons automatically', async () => {
  const { dom, errors } = page('card-detail.html', '?id=second-print');
  try {
    const document = dom.window.document;
    await waitFor(() => document.querySelectorAll('.printing-price-row').length === 2, 'printing comparisons');
    assert.equal(document.querySelector('.primary-price-panel > strong').textContent, 'Price unavailable');
    assert.match(document.querySelector('.variant-prices').textContent, /CAD/);
    assert.match(document.querySelector('.variant-prices').textContent, /11\.20/);
    assert.equal(document.querySelector('.primary-price-panel').nextElementSibling, document.querySelector('.detail-stores-section'));
    assert.equal(document.querySelector('.detail-stores-section h3').textContent, 'Store availability');
    assert.equal(document.querySelector('.detail-store-cta'), null);
    for (const link of document.querySelectorAll('.detail-store-item')) {
      assert.ok(link.getAttribute('aria-label'));
      assert.equal(link.querySelector('svg'), null);
      assert.ok(link.querySelector('img'));
    }
    assert.match(document.querySelector('.primary-price-panel').textContent, /two #1/); assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('exchange failures keep CAD prices unavailable while store buttons remain usable', async () => {
  const { dom, errors } = page('card-detail.html', '?id=first-print', { rateFailure: true });
  try {
    const document = dom.window.document;
    await waitFor(() => document.querySelector('.primary-price-panel'), 'detail with unavailable exchange rate');
    assert.equal(document.querySelector('.primary-price-panel > strong').textContent, 'Price unavailable');
    assert.equal(document.querySelector('.exchange-rate-note').textContent, 'CAD conversion unavailable');
    assert.ok(document.querySelector('.detail-store-item').href.startsWith('https://'));
    assert.ok(!document.querySelector('.variant-prices').textContent.includes('null'));
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});
test('Lands uses the common catalog and sends explicit cycle membership to Scryfall', async () => {
  const { dom, requests, errors } = page('card.html', '?view=lands');
  try {
    await waitFor(() => dom.window.document.querySelector('.card-title-link'), 'land results');
    const url = new URL(requests.find(url => url.includes('/cards/search?'))); assert.match(url.searchParams.get('q'), /!"Arid Mesa"/);
    assert.equal(dom.window.document.querySelectorAll('#landCycle option').length, 14); assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});
test('Pokémon details preserve source rarity and distinguish same-name cards from functional reprints', async () => {
  const { dom, errors } = page('card-detail.html', '?game=pokemon&id=sv06-001');
  try {
    const document = dom.window.document;
    await waitFor(() => document.querySelector('.printing-price-row'), 'Pokémon printing comparisons');
    assert.equal(document.querySelector('.detail-rarity-chip').textContent, 'Rare Holo');
    assert.match(document.querySelector('.printing-prices h2').textContent, /rules may differ/);
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});
test('competitive page loads real-provider schemas, filters standings, analyzes and copies imports', async () => {
  const { dom, errors } = page('competitive.html', '?game=pokemon');
  try {
    const document = dom.window.document;
    await waitFor(() => document.querySelector('.tournament-card'), 'tournament');
    document.querySelector('.tournament-card button').click();
    await waitFor(() => document.querySelector('.standings-row'), 'standings');
    document.getElementById('tournamentFormat').value = 'STANDARD';
    document.getElementById('analysisFilters').dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
    assert.match(document.getElementById('frequencyRanking').textContent, /100.0%/);
    document.getElementById('playerSearch').value = 'absent'; document.getElementById('playerSearch').dispatchEvent(new dom.window.Event('input'));
    assert.equal(document.querySelectorAll('.tournament-card').length, 0);
    document.getElementById('pasteDeck').value = 'Deck\n4 Tangela (TWM) 1'; document.getElementById('pasteDeckForm').dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
    assert.equal(document.getElementById('deckDialog').open, true);
    document.getElementById('copyDeck').click(); await waitFor(() => dom.window.copiedText, 'clipboard'); assert.match(dom.window.copiedText, /4 Tangela \(twm\) 1/);
    await waitFor(() => document.querySelector('#deckImages figure'), 'imported deck images');
    assert.match(document.getElementById('deckPrice').textContent, /CAD.*7\.00/);
    document.getElementById('closeDeck').click();
    assert.match(document.getElementById('deckOrigin').textContent, /User import/); assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});
test('Magic tournaments report the missing credential with no fictitious cards', async () => {
  const { dom, errors } = page('competitive.html');
  try {
    await waitFor(() => dom.window.document.getElementById('tournamentStatus').textContent.includes('TOPDECK_API_KEY'), 'configuration notice');
    assert.equal(dom.window.document.querySelectorAll('.tournament-card').length, 0); assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});
