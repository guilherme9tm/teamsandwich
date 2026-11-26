const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const userA = { id: '11111111-1111-4111-8111-111111111111', email: 'a@example.com' };
const userB = { id: '22222222-2222-4222-8222-222222222222', email: 'b@example.com' };
const deck = name => ({ id: 'deck', name, game: 'mtg', cards: [] });
const wish = game => ({ id: `${game}-wish`, printingId: 'printing', name: 'Example', game, quantity: 1, set: 'Set', number: '1' });
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
async function client(remote, { user = userA, local = {}, file = null, control = {} } = {}) {
  const errors = [], calls = [];
  let current = user;
  const html = file ? fs.readFileSync(file, 'utf8') : '<div id="actions"></div>';
  const dom = new JSDOM(html.replace(/<script src="[^"]+"><\/script>/g, ''), { url: `https://cards.example/${file || 'index.html'}`, runScripts: 'dangerously',
    virtualConsole: new VirtualConsole().on('jsdomError', error => errors.push(error)), beforeParse(window) {
      for (const [key, value] of Object.entries(local)) window.localStorage.setItem(key, value);
      window.fetch = async (url, options = {}) => {
        if (url === '/api/auth/session') return Response.json({ user: current });
        if (url.startsWith('/api/library/')) {
          calls.push({ url, ...options });
          if (control.fail) throw new Error('Offline');
          if (options.headers['X-Account-ID'] !== current.id) return Response.json({ error: 'authAccountChanged' }, { status: 409 });
          const key = `${current.id}:${url.split('/').pop()}`;
          const input = options.body && JSON.parse(options.body);
          if (control.wait && input) await control.wait();
          const row = remote.get(key) || { items: [], revision: 0 };
          if (input) {
            if (input.revision !== row.revision) return Response.json({ error: 'libraryConflict' }, { status: 409 });
            const next = { items: input.items, revision: row.revision + 1 }; remote.set(key, next); return Response.json(next);
          }
          return Response.json(row);
        }
        if (url.includes('tcgdex')) return Response.json({ id: 'printing', name: 'Example', image: 'https://assets.tcgdex.net/en/sv/sv06/001', set: { id: 'sv06', name: 'Set' } });
        return Response.json({ id: 'printing', name: 'Example', image_uris: { normal: 'https://cards.scryfall.io/example.jpg' } });
      };
    } });
  const scripts = file ? [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(match => match[1])
    : ['js/storage.js', 'js/i18n.js', 'js/locales.js', 'js/library-data.js', 'js/account-library.js', 'js/wishlist-action.js'];
  for (const path of scripts) {
    const script = dom.window.document.createElement('script'); script.textContent = fs.readFileSync(path, 'utf8'); dom.window.document.body.append(script);
  }
  await dom.window.eval('DeckAccess.ready'); await tick();
  return { dom, calls, errors, control, eval: code => dom.window.eval(code),
    async open(kind = 'decks') { return dom.window.eval(`AccountLibrary.open('${kind}')`); },
    setUser(next) { current = next; }, close() { dom.window.close(); } };
}
test('account data survives a fresh browser with no local storage and stays isolated from other accounts', async () => {
  const remote = new Map(), first = await client(remote); let second, other;
  try {
    const library = await first.open(); library.save([deck('Cloud deck')]); await library.flush();
    const wishlist = await first.open('wishlist'); wishlist.save([wish('pokemon')]); await wishlist.flush();
    second = await client(remote); other = await client(remote, { user: userB });
    assert.equal((await second.open()).items[0].name, 'Cloud deck');
    assert.equal((await second.open('wishlist')).items[0].game, 'pokemon');
    assert.equal((await other.open()).items.length, 0); assert.equal((await other.open('wishlist')).items.length, 0);
    assert.deepEqual(first.errors, []);
  } finally { first.close(); second?.close(); other?.close(); }
});
test('conflicting drafts survive reload and later edits cannot silently overwrite another device', async () => {
  const remote = new Map(), first = await client(remote), second = await client(remote); let reopened;
  try {
    const a = await first.open(), b = await second.open();
    a.save([deck('New cloud version')]); await a.flush(); b.save([deck('Unsynced draft')]); await b.flush();
    assert.equal(b.error(), 'libraryConflict');
    const key = b.draftKey;
    reopened = await client(remote, { local: { [key]: second.dom.window.localStorage.getItem(key) } });
    const draft = await reopened.open(); assert.equal(draft.error(), 'libraryConflict');
    draft.save([deck('Still a draft')]); await draft.flush();
    assert.equal(remote.get(`${userA.id}:decks`).items[0].name, 'New cloud version');
    const saved = JSON.parse(reopened.dom.window.localStorage.getItem(draft.draftKey)); assert.equal(saved.revision, 0);
    await draft.reload(); assert.equal(draft.items[0].name, 'New cloud version'); assert.equal(draft.pending(), false);
    assert.equal(JSON.parse(reopened.dom.window.localStorage.getItem(`${draft.draftKey}:backup`)).items[0].name, 'Still a draft');
  } finally { first.close(); second.close(); reopened?.close(); }
});
test('a failed save retains a draft and an explicit retry clears it only after acknowledgement', async () => {
  const remote = new Map(), current = await client(remote);
  try {
    const library = await current.open(); current.control.fail = true;
    library.save([deck('Offline edit')]); await library.flush();
    assert.equal(library.error(), 'libraryUnavailable'); assert.equal(library.pending(), true);
    assert.equal(remote.size, 0);
    const key = library.draftKey; assert.ok(current.dom.window.localStorage.getItem(key));
    current.control.fail = false; library.retry(); await library.flush();
    assert.equal(remote.get(`${userA.id}:decks`).items[0].name, 'Offline edit');
    assert.equal(library.pending(), false); assert.equal(current.dom.window.localStorage.getItem(key), null);
  } finally { current.close(); }
});
test('edits made during a save are serialized with the latest revision', async () => {
  const remote = new Map(), current = await client(remote); let release;
  try {
    const library = await current.open(); current.control.wait = () => new Promise(resolve => { release = resolve; });
    library.save([deck('First')]); library.save([deck('Second')]);
    current.control.wait = null; release(); await library.flush();
    assert.equal(remote.get(`${userA.id}:decks`).items[0].name, 'Second');
    assert.deepEqual(current.calls.filter(call => call.method === 'PUT').map(call => JSON.parse(call.body).revision), [0, 1]);
  } finally { current.close(); }
});
test('a cookie/account switch before identity refresh cannot send the previous account data to the new account', async () => {
  const remote = new Map(), current = await client(remote);
  try {
    const library = await current.open(); current.setUser(userB); library.save([deck('Account A only')]); await library.flush();
    assert.equal(library.error(), 'authAccountChanged'); assert.equal(remote.size, 0);
    await current.eval('DeckAccess.refresh()'); assert.throws(() => library.save([]), /authAccountChanged/);
  } finally { current.close(); }
});
test('wishlist actions keep exact printings and games distinct without duplicating repeated clicks', async () => {
  const remote = new Map(), current = await client(remote);
  try {
    for (const game of ['mtg', 'pokemon', 'mtg']) {
      current.eval(`document.getElementById('actions').append(createWishlistButton({ id: 'printing', name: 'Example', game: '${game}', set_name: 'Set', collector_number: '1' }))`);
      const button = current.dom.window.document.querySelector('#actions > :last-child button'); button.click();
      while (button.disabled) await tick();
    }
    const items = remote.get(`${userA.id}:wishlist`).items;
    assert.equal(items.length, 2); assert.deepEqual(items.map(item => item.game), ['mtg', 'pokemon']); assert.ok(items.every(item => item.quantity === 1 && item.printingId === 'printing'));
  } finally { current.close(); }
});
test('compact wishlist actions retain their icon after saving and keep feedback outside the price actions', async () => {
  const remote = new Map(), current = await client(remote);
  try {
    current.eval("const feedback = document.createElement('div'); feedback.id = 'feedback'; document.body.append(feedback); document.getElementById('actions').append(createWishlistButton({ id: 'printing', name: 'Example', game: 'mtg' }, { compact: true, feedbackTarget: feedback }))");
    const document = current.dom.window.document, button = document.querySelector('#actions button');
    assert.equal(button.textContent, ''); assert.ok(button.querySelector('svg'));
    button.click(); while (button.disabled) await tick();
    assert.equal(remote.get(`${userA.id}:wishlist`).items[0].name, 'Example');
    assert.ok(button.querySelector('svg')); assert.ok(button.classList.contains('is-added'));
    assert.match(document.getElementById('feedback').textContent, /Saved to your wishlist/);
    current.eval("I18N.setLang('pt')");
    assert.ok(button.querySelector('svg')); assert.match(button.getAttribute('aria-label'), /Salva/);
  } finally { current.close(); }
});

test('wishlist shows cloud cards, edits quantities, preserves fields on language change and removes entries', async () => {
  const remote = new Map([[`${userA.id}:wishlist`, { revision: 1, items: [wish('mtg'), wish('pokemon')] }]]);
  const current = await client(remote, { file: 'wishlist.html' });
  try {
    const document = current.dom.window.document;
    assert.equal(document.getElementById('wishlistWorkspace').hidden, false); assert.equal(document.querySelectorAll('.deck-card').length, 2);
    const input = document.querySelector('.deck-card input'); input.value = '3'; input.dispatchEvent(new current.dom.window.Event('change'));
    await tick(); assert.equal(remote.get(`${userA.id}:wishlist`).items[0].quantity, 3);
    input.value = '7'; current.eval("I18N.setLang('pt')"); assert.equal(document.querySelector('.deck-card input'), input); assert.equal(input.value, '7');
    input.value = '-1'; input.dispatchEvent(new current.dom.window.Event('change')); assert.equal(input.value, '3');
    document.querySelector('.deck-card button').click(); await tick();
    assert.equal(remote.get(`${userA.id}:wishlist`).items.length, 1); assert.equal(document.querySelectorAll('.deck-card').length, 1);
    assert.deepEqual(current.errors, []);
  } finally { current.close(); }
});
