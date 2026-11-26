(async () => {
  const $ = id => document.getElementById(id);
  await DeckAccess.ready;
  const owner = DeckAccess.user()?.id;
  function guard() {
    if (owner && DeckAccess.user()?.id === owner) return true;
    $('wishlistWorkspace').hidden = true; $('wishlistCards').replaceChildren(); location.replace('login.html'); return false;
  }
  if (!guard()) return;
  window.addEventListener('authChanged', guard);
  let library;
  try { library = await AccountLibrary.open('wishlist'); }
  catch (error) {
    I18N.bind($('wishlistLoading'), ['libraryNotConfigured', 'authNotConfigured'].includes(error.message) ? error.message : 'libraryUnavailable');
    $('wishlistRetry').hidden = false; $('wishlistRetry').onclick = () => location.reload(); return;
  }
  if (!guard()) return;
  let page = 0;
  const imageCache = new Map();
  async function image(item, article) {
    const identity = `${item.game}:${item.printingId}`;
    if (!imageCache.has(identity)) imageCache.set(identity, CardData.provider(item.game).get(item.printingId).catch(() => null));
    const card = await imageCache.get(identity);
    if (!article.isConnected || DeckAccess.user()?.id !== owner || !card?.images?.normal) return;
    const img = document.createElement('img'); img.alt = item.name; img.loading = 'lazy'; img.src = card.images.normal;
    img.onload = () => article.querySelector('.deck-card-art').classList.add('has-image'); img.onerror = () => img.remove();
    article.querySelector('.deck-card-art').append(img);
  }
  function render() {
    if (!guard()) return;
    const filtered = library.items.filter(item => $('wishlistGame').value === 'all' || item.game === $('wishlistGame').value);
    document.querySelector('[data-i18n="wishlistBrowse"]').href = `card.html?game=${$('wishlistGame').value === 'pokemon' ? 'pokemon' : 'mtg'}`;
    page = Math.max(0, Math.min(page, Math.ceil(filtered.length / 20) - 1));
    $('wishlistCards').replaceChildren();
    I18N.bind($('wishlistCount'), 'wishlistCount', { count: filtered.length });
    if (!filtered.length) { const empty = document.createElement('p'); I18N.bind(empty, 'wishlistEmpty'); $('wishlistCards').append(empty); }
    for (const item of filtered.slice(page * 20, page * 20 + 20)) {
      const article = document.createElement('article'); article.className = 'deck-card';
      const art = document.createElement('a'); art.className = 'deck-card-art';
      art.href = `card-detail.html?game=${encodeURIComponent(item.game)}&id=${encodeURIComponent(item.printingId)}`;
      const placeholder = document.createElement('span'); placeholder.className = 'deck-image-fallback'; I18N.bind(placeholder, 'imageUnavailable'); art.append(placeholder);
      const title = document.createElement('h3'); title.textContent = item.name;
      const printing = document.createElement('p'); printing.className = 'deck-note'; printing.textContent = `${item.game === 'pokemon' ? 'Pokémon TCG' : 'Magic: The Gathering'} · ${item.set || ''} #${item.number || ''}`;
      const label = document.createElement('label'), caption = document.createElement('span'); I18N.bind(caption, 'wishlistQuantity'); label.append(caption);
      const quantity = document.createElement('input'); quantity.type = 'number'; quantity.min = '1'; quantity.max = '1000'; quantity.step = '1'; quantity.value = item.quantity;
      quantity.onchange = () => {
        if (!guard()) return;
        const count = Number(quantity.value);
        if (!Number.isSafeInteger(count) || count < 1 || count > 1000) { quantity.value = library.items.find(row => row.id === item.id)?.quantity || 1; return; }
        const items = library.items.map(row => row.id === item.id ? { ...row, quantity: count } : row); library.save(items);
      };
      label.append(quantity);
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'deck-button'; I18N.bind(remove, 'wishlistRemove');
      remove.onclick = () => { if (guard()) { library.save(library.items.filter(row => row.id !== item.id)); render(); } };
      article.append(art, title, printing, label, remove); $('wishlistCards').append(article); void image(item, article);
    }
    $('wishlistPrev').disabled = page === 0; $('wishlistNext').disabled = (page + 1) * 20 >= filtered.length;
  }
  AccountLibrary.bindStatus(library, $('wishlistStatus'), render);
  $('wishlistGame').onchange = () => { page = 0; render(); };
  $('wishlistPrev').onclick = () => { page--; render(); }; $('wishlistNext').onclick = () => { page++; render(); };
  $('wishlistLogout').onclick = async () => { try { await DeckAccess.logout(); } catch { I18N.bind($('wishlistStatus'), 'authUnavailable'); } };
  $('wishlistAccount').textContent = DeckAccess.user().email;
  $('wishlistLoading').hidden = true; $('wishlistWorkspace').hidden = false; render();
})();
