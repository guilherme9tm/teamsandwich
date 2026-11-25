const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const DeckImport = require('../js/deck-import');
const storageKey = 'teamSandwich.myDecks.v1';
const accessKey = 'teamSandwich.deckAccess.v1';

function page(file = 'my-decks.html', { authenticated = true, local = {}, query = '', offline = false } = {}) {
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
        if (offline) throw new Error('Offline');
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

test('strict deck imports report exact invalid lines, combine duplicates and preserve sideboard', () => {
  const parsed = DeckImport.parse('4 Lightning Bolt\n2 Lightning Bolt\nwrong\n0 Island\n-2 Mountain\nSideboard\n2 Island\nSB: 1 Island', { requireQuantity: true });
  assert.deepEqual(parsed.warnings, [3, 4, 5]);
  assert.deepEqual(parsed.entries.map(card => [card.name, card.quantity, card.section]), [['Lightning Bolt', 6, 'main'], ['Island', 3, 'sideboard']]);
  assert.equal(DeckImport.parse('Lightning Bolt').entries[0].quantity, 1, 'legacy catalog import stays compatible');
});

test('direct URL stays locked even with a legacy demo user and saved decks', () => {
  const current = page('my-decks.html', { authenticated: false, local: { user: JSON.stringify({ username: 'Legacy', email: 'legacy@example.com' }), [storageKey]: '{"version":1,"decks":[]}' } });
  try {
    assert.equal(current.document.getElementById('decksWorkspace').hidden, true);
    assert.equal(current.document.querySelectorAll('.deck-box, .deck-card').length, 0);
    assert.equal(current.requests.length, 0);
    assert.ok(current.errors.some(error => /navigation/.test(error.message)), 'redirect to login requested');
  } finally { current.dom.window.close(); }
});

test('wrong password is rejected; correct password creates only a session gate', () => {
  const current = page('login.html', { authenticated: false });
  try {
    const input = current.document.getElementById('deckPassword');
    input.value = 'wrong'; submit(current, 'deckLoginForm');
    assert.match(current.document.getElementById('loginError').textContent, /Senha incorreta/);
    assert.equal(current.dom.window.sessionStorage.getItem(accessKey), null);
    input.value = 'teamsandwich'; submit(current, 'deckLoginForm');
    assert.equal(current.dom.window.sessionStorage.getItem(accessKey), 'granted');
    assert.equal(current.dom.window.localStorage.length, 0);
    assert.equal(input.value, '');
  } finally { current.dom.window.close(); }
});

test('import, open folder, own two Bolts, reload and retain the missing-two label', async () => {
  const current = page(); let reopened;
  try {
    await upload(current, '4 Lightning Bolt');
    assert.equal(current.document.getElementById('importName').value, 'Mono Red Burn');
    submit(current, 'importForm');
    assert.equal(saved(current).decks[0].cards[0].owned, 0);
    current.document.querySelector('.deck-box').click();
    const owned = current.document.querySelector('.owned-count');
    owned.value = '2'; owned.dispatchEvent(new current.dom.window.Event('input', { bubbles: true }));
    assert.equal(current.document.querySelector('.deck-card-status').textContent, '2 de 4 · Faltam 2');
    assert.ok(current.document.querySelector('.deck-card.is-missing'));
    const local = { [storageKey]: current.dom.window.localStorage.getItem(storageKey) };
    reopened = page('my-decks.html', { local, query: current.dom.window.location.search });
    assert.equal(reopened.document.querySelector('#deckTitle').textContent, 'Mono Red Burn');
    assert.equal(reopened.document.querySelector('.deck-card-status').textContent, '2 de 4 · Faltam 2');
    assert.deepEqual(current.errors, []); assert.deepEqual(reopened.errors, []);
  } finally { current.dom.window.close(); reopened?.dom.window.close(); }
});

test('invalid imports cannot save until corrected; main and sideboard own counts stay separate', async () => {
  const current = page();
  try {
    await upload(current, '4 Lightning Bolt\ninvalid\nSideboard\n2 Lightning Bolt');
    assert.match(current.document.getElementById('importErrors').textContent, /Linha 2: invalid/);
    assert.equal(current.document.getElementById('saveImport').disabled, true);
    submit(current, 'importForm'); assert.equal(saved(current), null);
    current.document.getElementById('importText').value = '4 Lightning Bolt\nSideboard\n2 Lightning Bolt';
    current.document.getElementById('importText').dispatchEvent(new current.dom.window.Event('input'));
    submit(current, 'importForm'); current.document.querySelector('.deck-box').click();
    const cards = current.document.querySelectorAll('.deck-card'); assert.equal(cards.length, 2);
    cards[0].querySelector('.plus').click();
    assert.equal(cards[0].querySelector('.deck-card-status').textContent, '1 de 4 · Faltam 3');
    assert.equal(cards[1].querySelector('.deck-card-status').textContent, '0 de 2 · Faltam 2');
  } finally { current.dom.window.close(); }
});

test('rename, add, adjust requirements, complete, reject invalid counts and remove persist', async () => {
  const current = page();
  try {
    await upload(current, '4 Lightning Bolt'); submit(current, 'importForm'); current.document.querySelector('.deck-box').click();
    current.document.getElementById('deckName').value = '<Burn & Friends>'; submit(current, 'renameDeck');
    assert.equal(saved(current).decks[0].name, '<Burn & Friends>');
    assert.equal(current.document.querySelector('.deck-box strong').textContent, '<Burn & Friends>');
    change(current, current.document.querySelector('.required-count'), '2');
    change(current, current.document.querySelector('.owned-count'), '2');
    assert.equal(current.document.querySelector('.deck-card-status').textContent, '2 de 2 · Completa');
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
  const current = page('my-decks.html', { offline: true });
  try {
    await upload(current, '4 Lightning Bolt'); submit(current, 'importForm'); current.document.querySelector('.deck-box').click();
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.match(current.document.querySelector('.deck-image-fallback').textContent, /Imagem indisponível/);
    assert.equal(current.document.querySelector('.deck-card h3').textContent, 'Lightning Bolt');
    change(current, current.document.querySelector('.owned-count'), '2');
    assert.equal(saved(current).decks[0].cards[0].owned, 2);
    assert.deepEqual(current.errors, []);
  } finally { current.dom.window.close(); }
});

test('deleting a deck requires confirmation, preserves other decks and persists after reload', async () => {
  const current = page(); let reopened;
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
    reopened = page('my-decks.html', {
      local: { [storageKey]: current.dom.window.localStorage.getItem(storageKey) },
      query: `?deck=${controlId}`
    });
    assert.equal(reopened.document.querySelectorAll('.deck-box').length, 1);
    assert.equal(reopened.document.getElementById('deckTitle').textContent, 'Control');
    reopened.dom.window.confirm = () => true;
    reopened.document.getElementById('deleteDeck').click();
    assert.deepEqual(saved(reopened).decks, []);
    assert.match(reopened.document.getElementById('deckBoxes').textContent, /Nenhum deck salvo/);
    assert.equal(reopened.document.getElementById('deckTitle'), null);
    assert.deepEqual(current.errors, []); assert.deepEqual(reopened.errors, []);
  } finally { current.dom.window.close(); reopened?.dom.window.close(); }
});

test('storage quota failure is visible and corrupt saved data is preserved', async () => {
  const current = page(); const corrupt = page('my-decks.html', { local: { [storageKey]: 'broken json' } });
  try {
    await upload(current, '4 Lightning Bolt');
    const native = current.dom.window.Storage.prototype.setItem;
    current.dom.window.Storage.prototype.setItem = function (key, value) {
      if (key === storageKey) throw new Error('Quota exceeded'); return native.call(this, key, value);
    };
    submit(current, 'importForm');
    assert.match(current.document.getElementById('saveStatus').textContent, /apenas nesta página/);
    assert.equal(current.dom.window.localStorage.getItem(storageKey), null);
    assert.equal(corrupt.document.getElementById('importDeck').disabled, true);
    assert.equal(corrupt.dom.window.localStorage.getItem(storageKey), 'broken json');
  } finally { current.dom.window.close(); corrupt.dom.window.close(); }
});
