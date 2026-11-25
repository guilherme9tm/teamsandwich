(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const key = 'teamSandwich.myDecks.v1';
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const id = () => crypto.randomUUID();
  const validCount = (value, min) => Number.isSafeInteger(value) && value >= min && value <= 1000;
  let decks = [];
  let selected = new URLSearchParams(window.location.search).get('deck');
  let fileRead = 0;
  let readFailed = false;
  const images = new Map();

  function guard() {
    if (DeckAccess.allowed()) return true;
    $('decksWorkspace').hidden = true;
    $('deckDetail').replaceChildren();
    $('deckBoxes').replaceChildren();
    if ($('importDialog').open) $('importDialog').close();
    window.location.replace('login.html');
    return false;
  }
  if (!guard()) return;
  const emptyDetail = $('deckDetail').innerHTML;

  function read() {
    const raw = AppStorage.local.getItem(key);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (data.version !== 1 || !Array.isArray(data.decks) || data.decks.length > 200) throw new Error('invalidStorage');
    const ids = new Set();
    for (const deck of data.decks) {
      if (!deck || typeof deck.id !== 'string' || ids.has(deck.id) || typeof deck.name !== 'string'
        || !deck.name.trim() || deck.name.length > 100 || !Array.isArray(deck.cards) || deck.cards.length > 1000) throw new Error('invalidStorage');
      ids.add(deck.id);
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
  function status(message, error = false) {
    $('saveStatus').textContent = message;
    $('saveStatus').classList.toggle('deck-error', error);
  }
  function persist() {
    if (!guard() || readFailed) return;
    const saved = AppStorage.local.setItem(key, JSON.stringify({ version: 1, decks }));
    status(saved ? '✓ Alterações salvas neste navegador.' : 'Armazenamento indisponível ou cheio. As alterações estão apenas nesta página; não recarregue antes de liberar espaço.', !saved);
  }
  function current() { return decks.find(deck => deck.id === selected); }
  function totals(cards) {
    return cards.reduce((sum, card) => ({ quantity: sum.quantity + card.quantity, missing: sum.missing + Math.max(0, card.quantity - (card.owned || 0)) }), { quantity: 0, missing: 0 });
  }
  function boxes() {
    $('deckBoxes').replaceChildren();
    if (!decks.length) $('deckBoxes').innerHTML = '<p class="deck-note">Nenhum deck salvo. Importe sua primeira lista.</p>';
    for (const deck of decks) {
      const total = totals(deck.cards);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'deck-box';
      button.setAttribute('aria-pressed', String(deck.id === selected));
      button.innerHTML = `<span class="deck-stack-icon" aria-hidden="true">TS</span><span><strong>${escape(deck.name)}</strong><small>${total.quantity} cartas · ${total.missing ? `${total.missing} pendentes` : 'Completo'}</small></span>`;
      button.onclick = () => {
        if (!guard()) return;
        selected = deck.id;
        window.history.replaceState(null, '', `?deck=${encodeURIComponent(deck.id)}`);
        boxes(); detail();
      };
      $('deckBoxes').append(button);
    }
  }
  function summary(tile, card) {
    const missing = Math.max(0, card.quantity - card.owned);
    tile.classList.toggle('is-missing', missing > 0);
    tile.querySelector('.deck-card-status').textContent = `${card.owned} de ${card.quantity} · ${missing ? `Faltam ${missing}` : 'Completa'}`;
  }
  function updateSummary() {
    const total = totals(current().cards);
    $('deckSummary').textContent = `${total.quantity} cartas no total · ${total.missing} cópias pendentes`;
    boxes();
  }
  function cardTile(card) {
    const tile = document.createElement('article');
    tile.className = 'deck-card';
    tile.innerHTML = `<div class="deck-card-art"><span class="deck-image-fallback">Carregando imagem…</span></div>
      <h3>${escape(card.name)}</h3><p class="deck-card-status" aria-live="polite"></p>
      <div class="deck-card-counts"><label>Exigidas<input class="required-count" type="number" min="1" max="1000" step="1" value="${card.quantity}" aria-label="Cópias exigidas de ${escape(card.name)}"></label>
      <label>Possuídas<input class="owned-count" type="number" min="0" max="1000" step="1" value="${card.owned}" aria-label="Cópias possuídas de ${escape(card.name)}"></label></div>
      <div class="deck-card-actions"><button type="button" class="deck-button minus" aria-label="Diminuir possuídas de ${escape(card.name)}">−</button><button type="button" class="deck-button plus" aria-label="Aumentar possuídas de ${escape(card.name)}">+</button><button type="button" class="deck-remove">Remover</button></div>`;
    const required = tile.querySelector('.required-count');
    const owned = tile.querySelector('.owned-count');
    const change = (field, input, min) => {
      if (!guard()) return;
      const value = input.value === '' ? NaN : Number(input.value);
      if (!validCount(value, min)) {
        input.value = card[field];
        status(`Use um número inteiro de ${min} a 1000 para ${card.name}.`, true);
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
      current().cards = current().cards.filter(item => item.id !== card.id);
      persist(); boxes(); detail();
    };
    summary(tile, card);
    return tile;
  }
  const imageKey = card => JSON.stringify([card.name.toLowerCase(), card.set || '', card.number || '']);
  function showImage(tile, card, url) {
    if (!tile.isConnected) return;
    const art = tile.querySelector('.deck-card-art');
    art.querySelector('.deck-image-fallback').textContent = 'Imagem indisponível';
    if (!url || !/^https:\/\//i.test(url)) return;
    const img = document.createElement('img');
    img.alt = card.name; img.loading = 'lazy'; img.width = 488; img.height = 680;
    img.onload = () => { art.classList.add('has-image'); };
    img.onerror = () => { img.remove(); art.classList.remove('has-image'); };
    img.src = url; art.append(img);
  }
  async function loadImages(items) {
    const missing = [];
    for (const item of items) {
      if (images.has(imageKey(item.card))) showImage(item.tile, item.card, images.get(imageKey(item.card)));
      else missing.push(item);
    }
    for (let offset = 0; offset < missing.length; offset += 75) {
      if (!DeckAccess.allowed()) return;
      const batch = missing.slice(offset, offset + 75);
      let result = [];
      try { result = await CardData.provider('mtg').collection(batch.map(item => item.card)); } catch { /* Editing works offline. */ }
      batch.forEach((item, index) => {
        const url = result[index]?.images?.normal || result[index]?.images?.small || null;
        if (url) images.set(imageKey(item.card), url);
        showImage(item.tile, item.card, url);
      });
    }
  }
  function detail() {
    const deck = current();
    if (!deck) return;
    $('deckDetail').innerHTML = `<div class="deck-detail-heading"><div><p class="deck-eyebrow">SUA LISTA</p><h2 id="deckTitle"></h2><p id="deckSummary" class="deck-note"></p></div></div>
      <form id="renameDeck" class="deck-inline-form"><label for="deckName">Nome do deck<input id="deckName" maxlength="100" required></label><button class="deck-button" type="submit">Renomear</button></form>
      <details class="deck-add"><summary>+ Adicionar carta</summary><form id="addCard" class="deck-inline-form"><label>Nome da carta<input id="addName" maxlength="200" placeholder="Ex.: Lightning Bolt" required></label><label>Exigidas<input id="addQuantity" type="number" min="1" max="1000" step="1" value="1" required></label><label>Seção<select id="addSection"><option value="main">Deck principal</option><option value="sideboard">Sideboard</option></select></label><button class="deck-button" type="submit">Adicionar</button></form><p id="addError" class="deck-error" role="alert"></p></details>
      <div id="deckSections"></div>`;
    $('deckTitle').textContent = deck.name;
    $('deckName').value = deck.name;
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
      const existing = deck.cards.find(card => card.name.toLowerCase() === name.toLowerCase() && card.section === section && !card.set);
      if (existing ? existing.quantity + quantity > 1000 : deck.cards.length >= 1000) {
        $('addError').textContent = 'Limite de 1000 cartas distintas ou 1000 cópias por carta atingido.'; return;
      }
      if (existing) existing.quantity += quantity;
      else deck.cards.push({ id: id(), name, quantity, owned: 0, section });
      persist(); boxes(); detail();
    };
    const items = [];
    for (const [section, title] of [['main', 'Deck principal'], ['sideboard', 'Sideboard']]) {
      const cards = deck.cards.filter(card => card.section === section);
      const group = document.createElement('section');
      group.className = 'deck-section';
      group.innerHTML = `<h3 class="deck-section-title">${title} <span>${totals(cards).quantity}</span></h3><div class="deck-card-grid"></div>`;
      if (!cards.length) group.querySelector('.deck-card-grid').innerHTML = '<p class="deck-note">Nenhuma carta nesta seção.</p>';
      for (const card of cards) {
        const tile = cardTile(card);
        group.querySelector('.deck-card-grid').append(tile);
        items.push({ card, tile });
      }
      $('deckSections').append(group);
    }
    updateSummary();
    void loadImages(items);
  }
  function preview() {
    let parsed;
    try { parsed = DeckImport.parse($('importText').value, { requireQuantity: true }); }
    catch { $('importErrors').textContent = 'Lista muito grande. Limite: 256 KB e 1000 cartas distintas.'; $('saveImport').disabled = true; return null; }
    const lines = $('importText').value.split(/\r?\n/);
    $('importErrors').replaceChildren();
    if (parsed.warnings.length) {
      const heading = document.createElement('p'); heading.textContent = 'Corrija estas linhas antes de salvar:'; $('importErrors').append(heading);
      const list = document.createElement('ul');
      for (const line of parsed.warnings) { const item = document.createElement('li'); item.textContent = `Linha ${line}: ${lines[line - 1]}`; list.append(item); }
      $('importErrors').append(list);
    } else $('importErrors').textContent = parsed.entries.length ? `${totals(parsed.entries).quantity} cartas · ${parsed.entries.length} entradas válidas` : 'Adicione ao menos uma linha com quantidade e nome.';
    $('saveImport').disabled = !!parsed.warnings.length || !parsed.entries.length;
    return parsed;
  }
  $('importDeck').onclick = () => { if (guard()) $('deckFile').click(); };
  $('deckFile').onchange = async () => {
    if (!guard()) return;
    const file = $('deckFile').files[0];
    $('deckFile').value = '';
    if (!file) return;
    if (!/\.txt$/i.test(file.name) || file.size > 256000) { status('Selecione um arquivo .txt de até 256 KB.', true); return; }
    const token = ++fileRead;
    try {
      const text = await file.text();
      if (!guard() || token !== fileRead) return;
      $('importName').value = file.name.replace(/\.txt$/i, '').slice(0, 100);
      $('importText').value = text;
      preview(); $('importDialog').showModal();
    } catch { status('Não foi possível ler o arquivo. Tente selecioná-lo novamente.', true); }
  };
  $('importText').oninput = preview;
  $('cancelImport').onclick = () => $('importDialog').close();
  $('importForm').onsubmit = event => {
    event.preventDefault();
    if (!guard() || readFailed) return;
    const parsed = preview();
    const name = $('importName').value.trim();
    if (!name || !parsed?.entries.length || parsed.warnings.length) return;
    if (decks.length >= 200) { $('importErrors').textContent = 'Limite de 200 decks neste navegador atingido.'; return; }
    decks.push({ id: id(), name, cards: parsed.entries.map(card => ({ ...card, id: id(), owned: 0 })) });
    persist(); boxes(); $('importDialog').close();
  };
  $('deckLogout').onclick = () => { DeckAccess.logout(); guard(); };
  window.addEventListener('pageshow', guard);
  window.addEventListener('storage', event => {
    if (!guard() || event.key !== key && event.key !== null) return;
    try {
      decks = read(); readFailed = false; boxes();
      if (current()) detail(); else $('deckDetail').innerHTML = emptyDetail;
      $('importDeck').disabled = false;
      status('Biblioteca atualizada a partir de outra aba.');
    } catch {
      readFailed = true;
      $('importDeck').disabled = true;
      $('deckDetail').innerHTML = emptyDetail;
      status('Os dados salvos não puderam ser lidos. A gravação foi bloqueada para preservar sua biblioteca.', true);
    }
  });
  try { decks = read(); } catch { readFailed = true; status('Os dados salvos não puderam ser lidos. A gravação foi bloqueada para preservar sua biblioteca.', true); }
  $('importDeck').disabled = readFailed;
  boxes();
  if (current()) detail();
  $('decksWorkspace').hidden = false;
})();
