(async () => {
  'use strict';
  const $ = id => document.getElementById(id);
  await DeckAccess.ready;
  const owner = DeckAccess.user()?.id;
  const legacyKey = 'teamSandwich.myDecks.v1';
  const key = `${legacyKey}:${owner}`;
  const cacheKey = `teamSandwich.cloudCache.v1:${owner}:decks`;
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const id = () => crypto.randomUUID();
  const validCount = (value, min) => Number.isSafeInteger(value) && value >= min && value <= 1000;
  let decks = [];
  let selected = new URLSearchParams(window.location.search).get('deck');
  let fileRead = 0;
  let readFailed = false;
  const images = new Map();
  const imageRequests = new Map();
  const gameName = game => game === 'pokemon' ? 'Pokémon TCG' : 'Magic: The Gathering';

  function guard() {
    if (DeckAccess.allowed() && DeckAccess.user().id === owner) return true;
    $('decksWorkspace').hidden = true;
    $('deckDetail').replaceChildren();
    $('deckBoxes').replaceChildren();
    if ($('importDialog').open) $('importDialog').close();
    window.location.replace('login.html');
    return false;
  }
  if (!guard()) return;
  const emptyDetail = $('deckDetail').innerHTML;
  let library;
  try { library = await AccountLibrary.open('decks'); }
  catch (error) {
    I18N.bind($('deckSessionStatus'), ['libraryNotConfigured', 'authNotConfigured'].includes(error.message) ? error.message : 'libraryUnavailable');
    $('deckLoadRetry').hidden = false;
    $('deckLoadRetry').onclick = () => window.location.reload();
    return;
  }
  if (!guard()) return;

  function canAnimate(element) {
    return element.isConnected && typeof element.animate === 'function'
      && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }
  function enter(element, delay = 0) {
    if (!canAnimate(element)) return;
    element.animate([
      { opacity: 0, transform: 'translateY(16px) scale(.97)' },
      { opacity: 1, transform: 'translateY(0) scale(1)' }
    ], { duration: 280, delay, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
  }
  function leave(element, done) {
    if (!canAnimate(element)) { done(); return; }
    if (element.dataset.leaving) return;
    element.dataset.leaving = 'true';
    element.inert = true;
    element.getAnimations().forEach(animation => animation.cancel());
    const animation = element.animate([
      { opacity: 1, transform: 'translateY(0) scale(1)' },
      { opacity: 0, transform: 'translateY(-10px) scale(.96)' }
    ], { duration: 180, easing: 'ease-in', fill: 'forwards' });
    animation.finished.catch(() => {}).then(() => {
      animation.cancel();
      element.inert = false;
      delete element.dataset.leaving;
      done();
    });
  }
  function closeImport() {
    leave($('importDialog'), () => $('importDialog').close());
  }

  function read(sourceKey = key) {
    const raw = AppStorage.local.getItem(sourceKey);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (data.version !== 1 || !Array.isArray(data.decks) || data.decks.length > 200) throw new Error('invalidStorage');
    const ids = new Set();
    for (const deck of data.decks) {
      if (!deck || typeof deck.id !== 'string' || ids.has(deck.id) || typeof deck.name !== 'string'
        || !deck.name.trim() || deck.name.length > 100 || !Array.isArray(deck.cards) || deck.cards.length > 1000) throw new Error('invalidStorage');
      ids.add(deck.id);
      if (deck.game === undefined) deck.game = 'mtg';
      if (!['mtg', 'pokemon'].includes(deck.game)) throw new Error('invalidStorage');
      const cardIds = new Set();
      for (const card of deck.cards) {
        if (!card || typeof card.id !== 'string' || cardIds.has(card.id) || typeof card.name !== 'string'
          || !card.name.trim() || card.name.length > 200 || !validCount(card.quantity, 1) || !validCount(card.owned, 0)
          || !['main', 'sideboard'].includes(card.section)) throw new Error('invalidStorage');
        cardIds.add(card.id);
      }
    }
    return data.decks;
  }
  function status(key, error = false, params = {}) {
    I18N.bind($('saveStatus'), key, params);
    $('saveStatus').classList.toggle('deck-error', error);
  }
  function persist() {
    if (!guard() || readFailed) return;
    // Retain the existing local copy for migration/rollback; cloud acknowledgement
    // alone controls the visible saved status.
    AppStorage.local.setItem(cacheKey, JSON.stringify({ version: 1, decks }));
    try { library.save(decks); } catch { status('libraryInvalidData', true); }
  }
  function current() { return decks.find(deck => deck.id === selected); }
  function totals(cards) {
    return cards.reduce((sum, card) => ({ quantity: sum.quantity + card.quantity, missing: sum.missing + Math.max(0, card.quantity - (card.owned || 0)) }), { quantity: 0, missing: 0 });
  }
  function boxes() {
    const existing = new Map([...$('deckBoxes').querySelectorAll('.deck-box')].map(button => [button.dataset.deckId, button]));
    for (const [deckId, button] of existing) {
      if (!decks.some(deck => deck.id === deckId)) leave(button, () => button.remove());
    }
    $('deckBoxes').querySelector('.deck-library-empty')?.remove();
    if (!decks.length) {
      const empty = document.createElement('p');
      empty.className = 'deck-note deck-library-empty';
      I18N.bind(empty, 'noSavedDecks');
      $('deckBoxes').append(empty);
    }
    for (const deck of decks) {
      const total = totals(deck.cards);
      const button = existing.get(deck.id) || document.createElement('button');
      const isNew = !existing.has(deck.id);
      button.type = 'button';
      button.className = 'deck-box';
      button.dataset.deckId = deck.id;
      button.hidden = $('deckFilter').value !== 'all' && $('deckFilter').value !== deck.game;
      button.setAttribute('aria-pressed', String(deck.id === selected));
      if (isNew) button.innerHTML = '<span class="deck-cover" aria-hidden="true"><span class="deck-image-fallback"></span></span><span class="deck-box-info"><strong></strong><small class="deck-game-label"></small><small class="deck-box-count"></small></span>';
      button.querySelector('strong').textContent = deck.name;
      button.querySelector('.deck-game-label').textContent = gameName(deck.game);
      button.querySelector('.deck-box-count').textContent = I18N.t('deckBoxCount', { count: total.quantity, status: total.missing ? I18N.t('pendingCopies', { count: total.missing }) : I18N.t('deckComplete') });
      button.onclick = () => {
        if (!guard()) return;
        selected = deck.id;
        window.history.replaceState(null, '', `?deck=${encodeURIComponent(deck.id)}`);
        boxes(); detail();
      };
      $('deckBoxes').append(button);
      const cover = deck.cards.find(card => card.section === 'main') || deck.cards[0];
      const coverKey = cover ? imageKey(cover, deck.game) : '';
      if (button.dataset.coverKey !== coverKey) {
        button.dataset.coverKey = coverKey;
        const art = button.querySelector('.deck-cover');
        art.querySelector('img')?.remove(); art.classList.remove('has-image');
        I18N.bind(art.querySelector('.deck-image-fallback'), cover ? 'loadingImage' : 'imageUnavailable');
        if (cover) void loadImages([{ tile: art, card: cover }], deck.game);
      }
      if (isNew) enter(button, Math.min(decks.indexOf(deck) * 35, 140));
    }
  }
  function summary(tile, card) {
    const missing = Math.max(0, card.quantity - card.owned);
    tile.classList.toggle('is-missing', missing > 0);
    tile.querySelector('.deck-card-status').textContent = I18N.t('ownedSummary', { owned: card.owned, quantity: card.quantity, status: missing ? I18N.t('missingCards', { count: missing }) : I18N.t('cardComplete') });
  }
  function updateSummary() {
    const total = totals(current().cards);
    $('deckSummary').textContent = I18N.t('deckSummary', total);
    boxes();
  }
  function cardTile(card) {
    const tile = document.createElement('article');
    tile.className = 'deck-card';
    tile.dataset.cardId = card.id;
    tile.innerHTML = `<div class="deck-card-art"><span class="deck-image-fallback" data-i18n="loadingImage">${I18N.t('loadingImage')}</span></div>
      <h3>${escape(card.name)}</h3>${card.set && card.number ? `<p class="deck-printing">${escape(card.set.toUpperCase())} · ${escape(card.number)}</p>` : ''}<p class="deck-card-status" aria-live="polite"></p>
      <div class="deck-card-counts"><label><span data-i18n="requiredCopies">${I18N.t('requiredCopies')}</span><input class="required-count" type="number" min="1" max="1000" step="1" value="${card.quantity}" data-i18n-aria="requiredCardCopies" aria-label="${escape(I18N.t('requiredCardCopies', { name: card.name }))}"></label>
      <label><span data-i18n="ownedCopies">${I18N.t('ownedCopies')}</span><input class="owned-count" type="number" min="0" max="1000" step="1" value="${card.owned}" data-i18n-aria="ownedCardCopies" aria-label="${escape(I18N.t('ownedCardCopies', { name: card.name }))}"></label></div>
      <div class="deck-card-actions"><button type="button" class="deck-button minus" data-i18n-aria="decreaseOwned" aria-label="${escape(I18N.t('decreaseOwned', { name: card.name }))}">−</button><button type="button" class="deck-button plus" data-i18n-aria="increaseOwned" aria-label="${escape(I18N.t('increaseOwned', { name: card.name }))}">+</button><button type="button" class="deck-remove" data-i18n="remove">${I18N.t('remove')}</button></div>`;
    tile.querySelectorAll('[data-i18n-aria]').forEach(element => {
      element.dataset.i18nParams = JSON.stringify({ name: card.name });
    });
    const required = tile.querySelector('.required-count');
    const owned = tile.querySelector('.owned-count');
    const change = (field, input, min) => {
      if (!guard()) return;
      const value = input.value === '' ? NaN : Number(input.value);
      if (!validCount(value, min)) {
        input.value = card[field];
        status('invalidCopyCount', true, { min, name: card.name });
        return;
      }
      card[field] = value;
      summary(tile, card);
      tile.querySelector('.minus').disabled = card.owned === 0;
      tile.querySelector('.plus').disabled = card.owned === 1000;
      persist(); updateSummary();
    };
    required.onchange = () => change('quantity', required, 1);
    owned.onchange = () => change('owned', owned, 0);
    required.oninput = () => { if (required.value !== '' && validCount(Number(required.value), 1)) change('quantity', required, 1); };
    owned.oninput = () => { if (owned.value !== '' && validCount(Number(owned.value), 0)) change('owned', owned, 0); };
    tile.querySelector('.minus').onclick = () => { owned.value = Math.max(0, card.owned - 1); change('owned', owned, 0); };
    tile.querySelector('.plus').onclick = () => { owned.value = Math.min(1000, card.owned + 1); change('owned', owned, 0); };
    tile.querySelector('.minus').disabled = card.owned === 0;
    tile.querySelector('.plus').disabled = card.owned === 1000;
    tile.querySelector('.deck-remove').onclick = () => {
      if (!guard()) return;
      const deck = current();
      deck.cards = deck.cards.filter(item => item.id !== card.id);
      persist(); updateSummary();
      leave(tile, () => {
        if (tile.isConnected && current()?.id === deck.id && DeckAccess.allowed()) detail(false);
        else tile.remove();
      });
    };
    summary(tile, card);
    return tile;
  }
  const imageKey = (card, game) => JSON.stringify([game, card.name.toLowerCase(), card.set || '', card.number || '']);
  function showImage(tile, card, url) {
    if (!tile.isConnected) return;
    const art = tile.matches('.deck-cover') ? tile : tile.querySelector('.deck-card-art');
    I18N.bind(art.querySelector('.deck-image-fallback'), 'imageUnavailable');
    if (!url || !/^https:\/\//i.test(url)) return;
    if (art.querySelector('img')?.getAttribute('src') === url) return;
    art.querySelector('img')?.remove();
    const img = document.createElement('img');
    img.alt = card.name; img.loading = 'lazy'; img.width = 488; img.height = 680;
    img.onload = () => {
      if (!img.isConnected) return;
      art.style.setProperty('--deck-card-image', `url(${JSON.stringify(img.currentSrc || img.src)})`);
      art.classList.add('has-image');
    };
    img.onerror = () => {
      if (!img.isConnected) return;
      img.remove();
      art.style.removeProperty('--deck-card-image');
      art.classList.remove('has-image');
    };
    img.src = url; art.append(img);
  }
  async function loadImages(items, game) {
    const missing = [];
    for (const item of items) {
      const key = imageKey(item.card, game);
      if (images.has(key)) { showImage(item.tile, item.card, images.get(key)); continue; }
      if (!imageRequests.has(key)) {
        let resolve;
        const promise = new Promise(done => { resolve = done; });
        imageRequests.set(key, promise);
        missing.push({ ...item, key, resolve });
      }
      void imageRequests.get(key).then(url => {
        if (item.tile.matches('.deck-cover') && item.tile.closest('.deck-box')?.dataset.coverKey !== key) return;
        showImage(item.tile, item.card, url);
      });
    }
    // Pokémon resolves one printing at a time so a missing source response cannot
    // discard images already found for the rest of the deck.
    const batchSize = game === 'pokemon' ? 1 : 30;
    for (let offset = 0; offset < missing.length; offset += batchSize) {
      const batch = missing.slice(offset, offset + batchSize);
      let result = [];
      if (DeckAccess.allowed()) {
        try { result = await CardData.provider(game).collection(batch.map(item => item.card)); } catch { /* Editing works offline. */ }
      }
      batch.forEach((item, index) => {
        const url = result[index]?.images?.normal || result[index]?.images?.small || null;
        if (url) images.set(item.key, url);
        imageRequests.delete(item.key); item.resolve(url);
      });
    }
  }
  function detail(animate = true) {
    const deck = current();
    if (!deck) return;
    $('deckDetail').getAnimations?.().forEach(animation => animation.cancel());
    $('deckDetail').inert = false;
    $('deckDetail').innerHTML = `<div class="deck-detail-heading"><div><p class="deck-eyebrow" data-i18n="yourList">${I18N.t('yourList')}</p><h2 id="deckTitle"></h2><p id="deckSummary" class="deck-note"></p></div></div>
      <form id="renameDeck" class="deck-inline-form"><label for="deckName"><span data-i18n="deckName">${I18N.t('deckName')}</span><input id="deckName" maxlength="100" required></label><button class="deck-button" type="submit" data-i18n="rename">${I18N.t('rename')}</button><button id="deleteDeck" class="deck-button deck-delete" type="button" data-i18n="deleteDeck">${I18N.t('deleteDeck')}</button></form>
      <details class="deck-add"><summary data-i18n="addCard">${I18N.t('addCard')}</summary><form id="addCard" class="deck-inline-form"><label><span data-i18n="cardName">${I18N.t('cardName')}</span><input id="addName" maxlength="200" data-i18n="cardExample" placeholder="${I18N.t('cardExample')}" required></label><label><span data-i18n="requiredCopies">${I18N.t('requiredCopies')}</span><input id="addQuantity" type="number" min="1" max="1000" step="1" value="1" required></label><label><span data-i18n="section">${I18N.t('section')}</span><select id="addSection"><option value="main" data-i18n="mainDeck">${I18N.t('mainDeck')}</option><option value="sideboard" data-i18n="sideboard">${I18N.t('sideboard')}</option></select></label><button class="deck-button" type="submit" data-i18n="add">${I18N.t('add')}</button></form><p id="addError" class="deck-error" role="alert"></p></details>
      <div id="deckSections"></div>`;
    $('deckTitle').textContent = deck.name;
    const gameLabel = document.createElement('p'); gameLabel.className = 'deck-game-label'; gameLabel.textContent = gameName(deck.game);
    $('deckTitle').after(gameLabel);
    if (deck.game === 'pokemon') {
      $('addSection').querySelector('[value="sideboard"]').remove();
      I18N.bind($('addName'), 'pokemonCardExample');
    }
    $('deckName').value = deck.name;
    $('deleteDeck').onclick = () => {
      if (!guard() || readFailed) return;
      if (!window.confirm(I18N.t('confirmDeleteDeck', { name: deck.name }))) return;
      decks = decks.filter(item => item.id !== deck.id);
      selected = null;
      const url = new URL(window.location.href);
      url.searchParams.delete('deck');
      window.history.replaceState(null, '', url);
      persist(); boxes();
      leave($('deckDetail'), () => {
        if (selected || !DeckAccess.allowed()) return;
        $('deckDetail').innerHTML = emptyDetail;
        I18N.updateDOM();
        enter($('deckDetail').firstElementChild);
        ($('deckBoxes').querySelector('button:not([data-leaving])') || $('importDeck')).focus();
      });
    };
    $('renameDeck').onsubmit = event => {
      event.preventDefault();
      if (!guard()) return;
      const name = $('deckName').value.trim();
      if (!name) { $('deckName').focus(); return; }
      deck.name = name; $('deckTitle').textContent = name;
      persist(); boxes();
    };
    $('addCard').onsubmit = event => {
      event.preventDefault();
      if (!guard()) return;
      const name = $('addName').value.trim();
      const quantity = Number($('addQuantity').value);
      const section = $('addSection').value;
      if (!name || !validCount(quantity, 1)) return;
      const parsed = DeckImport.parse(`${quantity} ${name}`, { game: deck.game, requireQuantity: true });
      if (parsed.warnings.length || parsed.entries.length !== 1) return;
      const entry = { ...parsed.entries[0], section };
      const existing = deck.cards.find(card => card.name.toLowerCase() === entry.name.toLowerCase() && card.section === section && (card.set || '') === (entry.set || '') && (card.number || '') === (entry.number || ''));
      if (existing ? existing.quantity + quantity > 1000 : deck.cards.length >= 1000) {
        I18N.bind($('addError'), 'deckCardLimit'); return;
      }
      if (existing) existing.quantity += quantity;
      else deck.cards.push({ ...entry, id: id(), owned: 0 });
      persist(); boxes(); detail();
    };
    const items = [];
    for (const [section, title] of [['main', 'mainDeck'], ['sideboard', 'sideboard']]) {
      const cards = deck.cards.filter(card => card.section === section);
      if (deck.game === 'pokemon' && section === 'sideboard' && !cards.length) continue;
      const group = document.createElement('section');
      group.className = 'deck-section';
      group.innerHTML = `<h3 class="deck-section-title"><b data-i18n="${title}">${I18N.t(title)}</b> <span>${totals(cards).quantity}</span></h3><div class="deck-card-grid"></div>`;
      if (!cards.length) group.querySelector('.deck-card-grid').innerHTML = `<p class="deck-note" data-i18n="emptyDeckSection">${I18N.t('emptyDeckSection')}</p>`;
      for (const card of cards) {
        const tile = cardTile(card);
        group.querySelector('.deck-card-grid').append(tile);
        items.push({ card, tile });
      }
      $('deckSections').append(group);
    }
    updateSummary();
    if (animate) {
      enter($('deckDetail').querySelector('.deck-detail-heading'));
      items.forEach((item, index) => enter(item.tile, Math.min(index * 35, 175)));
    }
    void loadImages(items, deck.game);
  }
  function preview() {
    let parsed;
    try { parsed = DeckImport.parse($('importText').value, { game: $('importGame').value, requireQuantity: true }); }
    catch { I18N.bind($('importErrors'), 'deckImportLimit'); $('saveImport').disabled = true; return null; }
    const lines = $('importText').value.split(/\r?\n/);
    delete $('importErrors').dataset.i18n;
    delete $('importErrors').dataset.i18nParams;
    $('importErrors').replaceChildren();
    if (parsed.warnings.length) {
      const heading = document.createElement('p'); I18N.bind(heading, 'fixImportLines'); $('importErrors').append(heading);
      const list = document.createElement('ul');
      for (const line of parsed.warnings) { const item = document.createElement('li'); I18N.bind(item, 'invalidImportLine', { line, text: lines[line - 1] }); list.append(item); }
      $('importErrors').append(list);
    } else I18N.bind($('importErrors'), parsed.entries.length ? 'validImportEntries' : 'addImportLine', { quantity: totals(parsed.entries).quantity, entries: parsed.entries.length });
    $('saveImport').disabled = !!parsed.warnings.length || !parsed.entries.length;
    return parsed;
  }
  $('importDeck').onclick = () => { if (guard()) $('deckFile').click(); };
  $('deckFile').onchange = async () => {
    if (!guard()) return;
    const file = $('deckFile').files[0];
    $('deckFile').value = '';
    if (!file) return;
    if (!/\.txt$/i.test(file.name) || file.size > 256000) { status('selectDeckFile', true); return; }
    const token = ++fileRead;
    try {
      const text = await file.text();
      if (!guard() || token !== fileRead) return;
      $('importName').value = file.name.replace(/\.txt$/i, '').slice(0, 100);
      $('importText').value = text;
      preview(); $('importDialog').showModal();
    } catch { status('deckFileReadError', true); }
  };
  $('importText').oninput = preview;
  $('importGame').onchange = () => { I18N.bind($('importHelp'), $('importGame').value === 'pokemon' ? 'pokemonImportHelp' : 'importHelp'); preview(); };
  $('deckFilter').onchange = boxes;
  $('cancelImport').onclick = closeImport;
  $('importDialog').addEventListener('cancel', event => { event.preventDefault(); closeImport(); });
  $('importForm').onsubmit = event => {
    event.preventDefault();
    if (!guard() || readFailed) return;
    const parsed = preview();
    const name = $('importName').value.trim();
    if (!name || !parsed?.entries.length || parsed.warnings.length) return;
    if (decks.length >= 200) { I18N.bind($('importErrors'), 'deckLibraryLimit'); return; }
    decks.push({ id: id(), name, game: $('importGame').value, cards: parsed.entries.map(card => ({ ...card, id: id(), owned: 0 })) });
    persist(); boxes(); closeImport();
  };
  window.addEventListener('languageChanged', () => {
    boxes();
    const deck = current();
    if (deck) {
      updateSummary();
      $('deckSections').querySelectorAll('.deck-card').forEach(tile => {
        const card = deck.cards.find(item => item.id === tile.dataset.cardId);
        if (card) summary(tile, card);
      });
    }
  });
  $('deckLogout').onclick = async () => {
    try { await DeckAccess.logout(); guard(); } catch { status('authUnavailable', true); }
  };
  window.addEventListener('authChanged', guard);
  window.addEventListener('pageshow', guard);
  decks = library.items;
  AccountLibrary.controls(library, $('libraryControls'), $('saveStatus'), () => {
    if (!guard()) return;
    decks = library.items; boxes();
    if (current()) detail(); else $('deckDetail').innerHTML = emptyDetail;
    I18N.updateDOM();
  });
  $('deckAccount').textContent = DeckAccess.user().email;
  const localSource = AppStorage.local.getItem(key) !== null ? key : legacyKey;
  $('importLegacyDecks').hidden = library.revision > 0 || decks.length > 0 || AppStorage.local.getItem(localSource) === null;
  $('importLegacyDecks').onclick = () => {
    if (!guard() || !window.confirm(I18N.t('authImportLegacyConfirm'))) return;
    try {
      const legacy = read(localSource);
      if (decks.length + legacy.length > 200) { status('deckLibraryLimit', true); return; }
      decks.push(...legacy.map(deck => ({ ...deck, id: id(), cards: deck.cards.map(card => ({ ...card, id: id() })) })));
      persist(); boxes(); $('importLegacyDecks').hidden = true;
    } catch { status('deckLibraryReadError', true); }
  };
  $('importDeck').disabled = readFailed;
  boxes();
  if (current()) detail();
  $('decksWorkspace').hidden = false;
  $('deckSessionStatus').hidden = true;
})();
