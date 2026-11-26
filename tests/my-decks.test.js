const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const DeckImport = require('../js/deck-import');
const user = { id: '11111111-1111-4111-8111-111111111111', email: 'player@example.com' };
const legacyKey = 'teamSandwich.myDecks.v1';
const storageKey = `${legacyKey}:${user.id}`;
const accessKey = 'teamSandwich.deckAccess.v1';

async function page(file = 'my-decks.html', { authenticated = true, local = {}, query = '', offline = false, identity = user, authError = null } = {}) {
  const html = fs.readFileSync(file, 'utf8');
  const errors = []; const requests = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  const dom = new JSDOM(html.replace(/<script src="[^"]+"><\/script>/g, ''), {
    url: `http://localhost/${file}${query}`, runScripts: 'dangerously', virtualConsole,
    beforeParse(window) {
      if (authenticated) window.sessionStorage.setItem(accessKey, 'granted');
      for (const [key, value] of Object.entries(local)) window.localStorage.setItem(key, value);
      window.fetch = async (url, options) => {
        requests.push(url);
        if (url === '/api/auth/session') {
          if (authError) return Response.json({ error: authError }, { status: 503 });
          return Response.json(authenticated ? { user: identity } : { error: 'authRequired' }, { status: authenticated ? 200 : 401 });
        }
        if (url === '/api/auth/login') return Response.json(JSON.parse(options.body).password === 'correct-secret' ? { user } : { error: 'authInvalidCredentials' }, { status: JSON.parse(options.body).password === 'correct-secret' ? 200 : 401 });
        if (url === '/api/auth/signup') return Response.json({ confirmationRequired: true });
        if (url === '/api/auth/logout') { authenticated = false; return Response.json({ user: null }); }
        if (offline) throw new Error('Offline');
        if (url.includes('api.tcgdex.net')) {
          if (url.includes('/series/')) return Response.json({ sets: [] });
          if (url.includes('/sets?')) return Response.json([{ id: 'sv06' }]);
          if (url.endsWith('/sets/sv06')) return Response.json({ cards: [{ id: 'sv06-001', name: 'Tangela', localId: '001' }] });
          if (url.includes('/cards?')) return Response.json([{ id: 'sv06-001', name: 'Tangela' }]);
          return Response.json({ id: 'sv06-001', name: 'Tangela', localId: '001', set: { id: 'sv06', name: 'Twilight Masquerade' }, image: 'https://assets.tcgdex.net/en/sv/sv06/001' });
        }
        const entries = JSON.parse(options.body).identifiers;
        return Response.json({ object: 'list', data: entries.map((entry, index) => ({ id: `fixture-${index}`, name: entry.name, image_uris: { normal: 'https://example.com/card.jpg' } })) });
      };
      window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
      window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
    }
  });
  for (const match of html.matchAll(/<script src="([^"]+)"><\/script>/g)) {
    const script = dom.window.document.createElement('script');
    script.textContent = fs.readFileSync(match[1], 'utf8'); dom.window.document.body.append(script);
  }
  await dom.window.eval('DeckAccess.ready');
  await new Promise(resolve => setTimeout(resolve, 0));
  return { dom, document: dom.window.document, errors, requests };
}
function submit(current, form) {
  current.document.getElementById(form).dispatchEvent(new current.dom.window.Event('submit', { bubbles: true, cancelable: true }));
}
async function upload(current, text, name = 'Mono Red Burn.txt') {
  const input = current.document.getElementById('deckFile');
  Object.defineProperty(input, 'files', { configurable: true, value: [{ name, size: text.length, text: async () => text }] });
  input.dispatchEvent(new current.dom.window.Event('change'));
  await new Promise(resolve => setTimeout(resolve, 0));
}
function change(current, input, value) {
  input.value = value; input.dispatchEvent(new current.dom.window.Event('change', { bubbles: true }));
}
function saved(current) { return JSON.parse(current.dom.window.localStorage.getItem(storageKey)); }
async function waitFor(predicate) {
  const deadline = Date.now() + 6000;
  while (!predicate()) {
    if (Date.now() > deadline) assert.fail('Timed out waiting for card images');
    await new Promise(resolve => setTimeout(resolve, 20));
  }
}

test('Pokémon Live imports retain game, exact printing, real images and quantities after reload', async () => {
  const current = await page(); let reopened;
  try {
    await upload(current, 'Pokémon: 1\n4 Tangela TWM 1\nTrainer: 0\nEnergy: 0\nTotal Cards: 4', 'Pokemon.txt');
    assert.equal(current.document.getElementById('saveImport').disabled, true);
    change(current, current.document.getElementById('importGame'), 'pokemon');
    assert.equal(current.document.getElementById('saveImport').disabled, false);
    submit(current, 'importForm'); current.document.querySelector('.deck-box').click();
    const deck = saved(current).decks[0];
    assert.equal(deck.game, 'pokemon'); assert.equal(deck.cards[0].name, 'Tangela');
    assert.equal(deck.cards[0].set, 'twm'); assert.equal(deck.cards[0].number, '1');
    await waitFor(() => current.document.querySelector('.deck-card-art img'));
    assert.equal(current.document.querySelector('.deck-card-art img').src, 'https://assets.tcgdex.net/en/sv/sv06/001/high.webp');
    assert.equal(current.document.querySelector('.deck-cover img').src, current.document.querySelector('.deck-card-art img').src);
    assert.equal(current.requests.some(url => url.includes('scryfall')), false);
    assert.equal(current.document.querySelector('#addSection option[value="sideboard"]'), null);
    change(current, current.document.querySelector('.owned-count'), '2');
    const local = { [storageKey]: current.dom.window.localStorage.getItem(storageKey) };
    reopened = await page('my-decks.html', { local, query: current.dom.window.location.search });
    assert.match(reopened.document.querySelector('.deck-detail-heading').textContent, /Pokémon TCG/);
    assert.equal(reopened.document.querySelector('.owned-count').value, '2');
    assert.deepEqual(current.errors, []); assert.deepEqual(reopened.errors, []);
  } finally { current.dom.window.close(); reopened?.dom.window.close(); }
});

test('mixed libraries isolate same-name card images by game and filter without deleting decks', async () => {
  const current = await page();
  try {
    await upload(current, '4 Tangela', 'Magic.txt'); submit(current, 'importForm');
    await upload(current, '4 Tangela', 'Pokemon.txt');
    change(current, current.document.getElementById('importGame'), 'pokemon'); submit(current, 'importForm');
    await waitFor(() => current.document.querySelectorAll('.deck-cover img').length === 2);
    const boxes = current.document.querySelectorAll('.deck-box');
    assert.equal(boxes[0].querySelector('img').src, 'https://example.com/card.jpg');
    assert.match(boxes[1].querySelector('img').src, /^https:\/\/assets.tcgdex.net\//);
    change(current, current.document.getElementById('deckFilter'), 'pokemon');
    assert.equal(boxes[0].hidden, true); assert.equal(boxes[1].hidden, false);
    assert.equal(saved(current).decks.length, 2);
    boxes[1].click();
    current.document.getElementById('addName').value = 'Tangela TWM 1'; submit(current, 'addCard');
    assert.equal(saved(current).decks[1].cards[1].set, 'twm');
    assert.equal(saved(current).decks[1].cards[1].name, 'Tangela');
  } finally { current.dom.window.close(); }
});

test('a missing Pokémon printing never borrows another image or prevents later cards from loading', async () => {
  const current = await page();
  try {
    await upload(current, '1 Tangela TWM 99\n2 Tangela TWM 1', 'Pokemon.txt');
    change(current, current.document.getElementById('importGame'), 'pokemon');
    submit(current, 'importForm'); current.document.querySelector('.deck-box').click();
    await waitFor(() => current.document.querySelectorAll('.deck-card')[1].querySelector('img'));
    const tiles = current.document.querySelectorAll('.deck-card');
    assert.equal(tiles[0].querySelector('img'), null);
    assert.match(tiles[0].textContent, /Image unavailable/);
    const img = tiles[1].querySelector('img');
    img.dispatchEvent(new current.dom.window.Event('load'));
    assert.equal(tiles[1].querySelector('.deck-card-art').classList.contains('has-image'), true);
    img.dispatchEvent(new current.dom.window.Event('error'));
    assert.equal(tiles[1].querySelector('img'), null);
    change(current, tiles[1].querySelector('.owned-count'), '1');
    assert.equal(saved(current).decks[0].cards[1].owned, 1);
  } finally { current.dom.window.close(); }
});

test('legacy libraries without a game remain editable as Magic without losing card identities', async () => {
  const deck = { id: 'legacy', name: 'Old deck', cards: [{ id: 'card', name: 'Lightning Bolt', quantity: 4, owned: 2, section: 'main', set: 'm11', number: '146' }] };
  const current = await page('my-decks.html', { local: { [storageKey]: JSON.stringify({ version: 1, decks: [deck] }) }, query: '?deck=legacy' });
  try {
    assert.match(current.document.querySelector('.deck-detail-heading').textContent, /Magic: The Gathering/);
    change(current, current.document.querySelector('.owned-count'), '3');
    assert.equal(saved(current).decks[0].game, 'mtg');
    assert.equal(saved(current).decks[0].cards[0].id, 'card');
    assert.equal(saved(current).decks[0].cards[0].set, 'm11');
  } finally { current.dom.window.close(); }
});

test('old shared libraries require an explicit import and preserve the original', async () => {
  const legacy = JSON.stringify({ version: 1, decks: [{ id: 'old', name: 'Old deck', cards: [{ id: 'card', name: 'Lightning Bolt', quantity: 4, owned: 2, section: 'main' }] }] });
  const current = await page('my-decks.html', { local: { [legacyKey]: legacy } });
  try {
    assert.equal(current.document.querySelector('.deck-box'), null);
    const button = current.document.getElementById('importLegacyDecks'); assert.equal(button.hidden, false);
    current.dom.window.confirm = () => false; button.click(); assert.equal(saved(current), null);
    current.dom.window.confirm = () => true; button.click();
    const deck = saved(current).decks[0];
    assert.equal(deck.game, 'mtg'); assert.equal(deck.cards[0].owned, 2); assert.notEqual(deck.id, 'old');
    assert.equal(current.dom.window.localStorage.getItem(legacyKey), legacy);
    assert.equal(button.hidden, true);
  } finally { current.dom.window.close(); }
});

test('accounts see separate local libraries; logout hides the workspace', async () => {
  const other = { id: '22222222-2222-4222-8222-222222222222', email: 'other@example.com' };
  const data = JSON.stringify({ version: 1, decks: [{ id: 'private', name: 'First account deck', game: 'mtg', cards: [] }] });
  const current = await page('my-decks.html', { identity: other, local: { [storageKey]: data } });
  try {
    assert.equal(current.document.querySelector('.deck-box'), null);
    assert.equal(current.document.getElementById('deckAccount').textContent, other.email);
    await current.dom.window.eval('DeckAccess.logout()');
    assert.equal(current.document.getElementById('decksWorkspace').hidden, true);
    assert.equal(current.dom.window.localStorage.getItem(storageKey), data);
  } finally { current.dom.window.close(); }
});

test('signup validates confirmation, avoids duplicate requests and shows the email confirmation state', async () => {
  const current = await page('login.html', { authenticated: false, query: '?mode=signup' });
  try {
    assert.equal(current.document.getElementById('signupFields').hidden, false);
    current.document.getElementById('authEmail').value = user.email;
    current.document.getElementById('deckPassword').value = 'valid-secret';
    current.document.getElementById('confirmPassword').value = 'different';
    submit(current, 'deckLoginForm');
    assert.match(current.document.getElementById('loginError').textContent, /do not match/);
    assert.equal(current.requests.includes('/api/auth/signup'), false);
    current.document.getElementById('confirmPassword').value = 'valid-secret';
    submit(current, 'deckLoginForm'); submit(current, 'deckLoginForm');
    await waitFor(() => !current.document.getElementById('authSubmit').disabled);
    assert.equal(current.requests.filter(url => url === '/api/auth/signup').length, 1);
    assert.equal(current.document.getElementById('signupFields').hidden, true);
    assert.match(current.document.getElementById('loginError').textContent, /check your email/);
    assert.equal(current.dom.window.eval('DeckAccess.allowed()'), false);
    assert.equal(current.document.getElementById('deckPassword').value, '');
  } finally { current.dom.window.close(); }
});

test('missing configuration is explained and URL tokens never establish a browser session', async () => {
  const current = await page('login.html', { authenticated: false, authError: 'authNotConfigured', query: '#access_token=forged&refresh_token=forged' });
  try {
    assert.match(current.document.getElementById('loginError').textContent, /awaiting server configuration/);
    assert.equal(current.dom.window.location.hash, '');
    assert.equal(current.dom.window.eval('DeckAccess.allowed()'), false);
    assert.deepEqual(current.requests, ['/api/auth/session']);
    assert.equal(current.dom.window.sessionStorage.getItem(accessKey), null);
  } finally { current.dom.window.close(); }
});

test('strict deck imports report exact invalid lines, combine duplicates and preserve sideboard', async () => {
  const parsed = DeckImport.parse('4 Lightning Bolt\n2 Lightning Bolt\nwrong\n0 Island\n-2 Mountain\nSideboard\n2 Island\nSB: 1 Island', { requireQuantity: true });
  assert.deepEqual(parsed.warnings, [3, 4, 5]);
  assert.deepEqual(parsed.entries.map(card => [card.name, card.quantity, card.section]), [['Lightning Bolt', 6, 'main'], ['Island', 3, 'sideboard']]);
  assert.equal(DeckImport.parse('Lightning Bolt').entries[0].quantity, 1, 'legacy catalog import stays compatible');
});

test('direct URL stays locked even with a legacy demo user and saved decks', async () => {
  const current = await page('my-decks.html', { authenticated: false, local: { user: JSON.stringify({ username: 'Legacy', email: 'legacy@example.com' }), [storageKey]: '{"version":1,"decks":[]}' } });
  try {
    assert.equal(current.document.getElementById('decksWorkspace').hidden, true);
    assert.equal(current.document.querySelectorAll('.deck-box, .deck-card').length, 0);
    assert.deepEqual(current.requests, ['/api/auth/session']);
    assert.ok(current.errors.some(error => /navigation/.test(error.message)), 'redirect to login requested');
  } finally { current.dom.window.close(); }
});

test('login uses server authentication and never creates the old session gate', async () => {
  const current = await page('login.html', { authenticated: false });
  try {
    current.document.getElementById('authEmail').value = user.email;
    const input = current.document.getElementById('deckPassword');
    input.value = 'wrong'; submit(current, 'deckLoginForm');
    await waitFor(() => current.document.getElementById('loginError').textContent === 'Incorrect email or password.');
    assert.equal(current.dom.window.sessionStorage.getItem(accessKey), null);
    input.value = 'correct-secret'; submit(current, 'deckLoginForm');
    await waitFor(() => current.dom.window.eval('DeckAccess.allowed()'));
    assert.equal(current.dom.window.sessionStorage.getItem(accessKey), null);
    assert.equal(input.value, '');
    assert.equal(current.dom.window.eval('DeckAccess.user().email'), user.email);
    assert.ok(![...Array(current.dom.window.localStorage.length)].map((_, i) => current.dom.window.localStorage.getItem(current.dom.window.localStorage.key(i))).join('').includes('correct-secret'));
  } finally { current.dom.window.close(); }
});

test('import, open folder, own two Bolts, reload and retain the missing-two label', async () => {
  const current = await page(); let reopened;
  try {
    await upload(current, '4 Lightning Bolt');
    assert.equal(current.document.getElementById('importName').value, 'Mono Red Burn');
    submit(current, 'importForm');
    assert.equal(saved(current).decks[0].cards[0].owned, 0);
    current.document.querySelector('.deck-box').click();
    const owned = current.document.querySelector('.owned-count');
    owned.value = '2'; owned.dispatchEvent(new current.dom.window.Event('input', { bubbles: true }));
    assert.equal(current.document.querySelector('.deck-card-status').textContent, '2 of 4 · Missing 2');
    assert.ok(current.document.querySelector('.deck-card.is-missing'));
    const local = { [storageKey]: current.dom.window.localStorage.getItem(storageKey) };
    reopened = await page('my-decks.html', { local, query: current.dom.window.location.search });
    assert.equal(reopened.document.querySelector('#deckTitle').textContent, 'Mono Red Burn');
    assert.equal(reopened.document.querySelector('.deck-card-status').textContent, '2 of 4 · Missing 2');
    assert.deepEqual(current.errors, []); assert.deepEqual(reopened.errors, []);
  } finally { current.dom.window.close(); reopened?.dom.window.close(); }
});

test('invalid imports cannot save until corrected; main and sideboard own counts stay separate', async () => {
  const current = await page();
  try {
    await upload(current, '4 Lightning Bolt\ninvalid\nSideboard\n2 Lightning Bolt');
    assert.match(current.document.getElementById('importErrors').textContent, /Line 2: invalid/);
    assert.equal(current.document.getElementById('saveImport').disabled, true);
    submit(current, 'importForm'); assert.equal(saved(current), null);
    current.document.getElementById('importText').value = '4 Lightning Bolt\nSideboard\n2 Lightning Bolt';
    current.document.getElementById('importText').dispatchEvent(new current.dom.window.Event('input'));
    submit(current, 'importForm'); current.document.querySelector('.deck-box').click();
    const cards = current.document.querySelectorAll('.deck-card'); assert.equal(cards.length, 2);
    cards[0].querySelector('.plus').click();
    assert.equal(cards[0].querySelector('.deck-card-status').textContent, '1 of 4 · Missing 3');
    assert.equal(cards[1].querySelector('.deck-card-status').textContent, '0 of 2 · Missing 2');
  } finally { current.dom.window.close(); }
});

test('rename, add, adjust requirements, complete, reject invalid counts and remove persist', async () => {
  const current = await page();
  try {
    await upload(current, '4 Lightning Bolt'); submit(current, 'importForm'); current.document.querySelector('.deck-box').click();
    current.document.getElementById('deckName').value = '<Burn & Friends>'; submit(current, 'renameDeck');
    assert.equal(saved(current).decks[0].name, '<Burn & Friends>');
    assert.equal(current.document.querySelector('.deck-box strong').textContent, '<Burn & Friends>');
    change(current, current.document.querySelector('.required-count'), '2');
    change(current, current.document.querySelector('.owned-count'), '2');
    assert.equal(current.document.querySelector('.deck-card-status').textContent, '2 of 2 · Complete');
    assert.equal(current.document.querySelector('.is-missing'), null);
    change(current, current.document.querySelector('.owned-count'), '-1');
    assert.equal(saved(current).decks[0].cards[0].owned, 2);
    current.document.getElementById('addName').value = 'Island'; current.document.getElementById('addSection').value = 'sideboard'; submit(current, 'addCard');
    assert.equal(saved(current).decks[0].cards[1].section, 'sideboard');
    current.document.querySelector('.deck-remove').click();
    assert.equal(saved(current).decks[0].cards.length, 1); assert.equal(saved(current).decks[0].cards[0].name, 'Island');
  } finally { current.dom.window.close(); }
});

test('unavailable catalog and images leave names, counts and edits usable', async () => {
  const current = await page('my-decks.html', { offline: true });
  try {
    await upload(current, '4 Lightning Bolt'); submit(current, 'importForm'); current.document.querySelector('.deck-box').click();
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.match(current.document.querySelector('.deck-image-fallback').textContent, /Image unavailable/);
    assert.equal(current.document.querySelector('.deck-card h3').textContent, 'Lightning Bolt');
    change(current, current.document.querySelector('.owned-count'), '2');
    assert.equal(saved(current).decks[0].cards[0].owned, 2);
    assert.deepEqual(current.errors, []);
  } finally { current.dom.window.close(); }
});

test('deleting a deck requires confirmation, preserves other decks and persists after reload', async () => {
  const current = await page(); let reopened;
  try {
    await upload(current, '4 Lightning Bolt', 'Burn.txt'); submit(current, 'importForm');
    await upload(current, '2 Island', 'Control.txt'); submit(current, 'importForm');
    const controlId = saved(current).decks[1].id;
    current.document.querySelector('.deck-box').click();
    const before = current.dom.window.localStorage.getItem(storageKey);
    current.dom.window.confirm = message => { assert.match(message, /Burn/); return false; };
    current.document.getElementById('deleteDeck').click();
    assert.equal(current.dom.window.localStorage.getItem(storageKey), before);
    assert.equal(current.document.querySelectorAll('.deck-box').length, 2);
    assert.equal(current.document.getElementById('deckTitle').textContent, 'Burn');
    current.dom.window.confirm = () => true;
    current.document.getElementById('deleteDeck').click();
    assert.deepEqual(saved(current).decks.map(deck => deck.name), ['Control']);
    assert.equal(saved(current).decks[0].cards[0].name, 'Island');
    assert.equal(current.document.querySelector('.deck-card'), null);
    assert.equal(current.dom.window.location.search, '');
    reopened = await page('my-decks.html', {
      local: { [storageKey]: current.dom.window.localStorage.getItem(storageKey) },
      query: `?deck=${controlId}`
    });
    assert.equal(reopened.document.querySelectorAll('.deck-box').length, 1);
    assert.equal(reopened.document.getElementById('deckTitle').textContent, 'Control');
    reopened.dom.window.confirm = () => true;
    reopened.document.getElementById('deleteDeck').click();
    assert.deepEqual(saved(reopened).decks, []);
    assert.match(reopened.document.getElementById('deckBoxes').textContent, /No saved decks/);
    assert.equal(reopened.document.getElementById('deckTitle'), null);
    assert.deepEqual(current.errors, []); assert.deepEqual(reopened.errors, []);
  } finally { current.dom.window.close(); reopened?.dom.window.close(); }
});

test('storage quota failure is visible and corrupt saved data is preserved', async () => {
  const current = await page(); const corrupt = await page('my-decks.html', { local: { [storageKey]: 'broken json' } });
  try {
    await upload(current, '4 Lightning Bolt');
    const native = current.dom.window.Storage.prototype.setItem;
    current.dom.window.Storage.prototype.setItem = function (key, value) {
      if (key === storageKey) throw new Error('Quota exceeded'); return native.call(this, key, value);
    };
    submit(current, 'importForm');
    assert.match(current.document.getElementById('saveStatus').textContent, /only exist on this page/);
    assert.equal(current.dom.window.localStorage.getItem(storageKey), null);
    assert.equal(corrupt.document.getElementById('importDeck').disabled, true);
    assert.equal(corrupt.dom.window.localStorage.getItem(storageKey), 'broken json');
  } finally { current.dom.window.close(); corrupt.dom.window.close(); }
});

test('login restores all supported languages and translates existing validation without clearing the password', async () => {
  const labels = { en: 'My Decks', pt: 'Meus Decks', es: 'Mis mazos', fr: 'Mes decks', de: 'Meine Decks' };
  for (const [lang, label] of Object.entries(labels)) {
    const current = await page('login.html', { authenticated: false, local: { lang } });
    try {
      assert.equal(current.document.documentElement.lang, lang);
      assert.equal(current.document.querySelector('h1').textContent, label);
      const input = current.document.getElementById('deckPassword');
      current.document.getElementById('authEmail').value = user.email;
      input.value = 'wrong'; submit(current, 'deckLoginForm');
      await waitFor(() => !current.document.getElementById('authSubmit').disabled);
      input.value = 'draft password';
      const select = current.document.querySelector('.lang-selector-select');
      change(current, select, 'pt');
      assert.equal(current.document.getElementById('loginError').textContent, 'E-mail ou senha incorretos.');
      assert.equal(input.value, 'draft password');
      assert.equal(select.options.length, 5);
      assert.equal(current.document.title, 'Entrar · Meus Decks — Team Sandwich');
      assert.deepEqual(current.errors, []);
    } finally { current.dom.window.close(); }
  }
});

test('deck language changes preserve drafts, selected deck, quantities and import errors across tabs and reloads', async () => {
  const current = await page('my-decks.html', { local: { lang: 'pt' } }); let reopened;
  try {
    await upload(current, '4 Lightning Bolt'); submit(current, 'importForm');
    current.document.querySelector('.deck-box').click();
    const owned = current.document.querySelector('.owned-count');
    change(current, owned, '2');
    const name = current.document.getElementById('deckName'); name.value = 'Unsaved name';
    current.document.getElementById('addName').value = 'Island';
    await upload(current, '4 Lightning Bolt\ninvalid');
    const before = current.dom.window.localStorage.getItem(storageKey);
    const select = current.document.querySelector('.lang-selector-select');
    change(current, select, 'es');
    assert.equal(current.document.documentElement.lang, 'es');
    assert.equal(current.document.querySelector('.deck-card-status').textContent, '2 de 4 · Faltan 2');
    assert.match(current.document.getElementById('importErrors').textContent, /Línea 2: invalid/);
    assert.equal(current.document.querySelector('.owned-count'), owned);
    assert.equal(name.value, 'Unsaved name');
    assert.equal(current.document.getElementById('addName').value, 'Island');
    assert.equal(current.document.getElementById('importDialog').open, true);
    assert.equal(current.dom.window.localStorage.getItem(storageKey), before);
    current.dom.window.localStorage.setItem('lang', 'de');
    current.dom.window.dispatchEvent(new current.dom.window.StorageEvent('storage', { key: 'lang', newValue: 'de' }));
    assert.equal(current.document.querySelector('h1').textContent, 'Meine Decks');
    assert.equal(current.document.querySelector('.owned-count').getAttribute('aria-label'), 'Exemplare im Besitz von Lightning Bolt');
    assert.equal(current.document.querySelector('.deck-card-status').textContent, '2 von 4 · 2 fehlen');
    assert.equal(name.value, 'Unsaved name');
    reopened = await page('my-decks.html', { local: { lang: 'de', [storageKey]: before }, query: current.dom.window.location.search });
    assert.equal(reopened.document.querySelector('h1').textContent, 'Meine Decks');
    assert.equal(reopened.document.querySelector('.owned-count').value, '2');
    assert.equal(reopened.document.querySelector('.deck-card-status').textContent, '2 von 4 · 2 fehlen');
    current.dom.window.localStorage.setItem('lang', 'fr');
    current.dom.window.dispatchEvent(new current.dom.window.PageTransitionEvent('pageshow', { persisted: true }));
    assert.equal(current.document.querySelector('h1').textContent, 'Mes decks');
    assert.equal(select.value, 'fr');
    assert.deepEqual(current.errors, []); assert.deepEqual(reopened.errors, []);
  } finally { current.dom.window.close(); reopened?.dom.window.close(); }
});
