function createWishlistButton(card, { compact = false, feedbackTarget = null } = {}) {
  const wrapper = document.createElement('span'); wrapper.className = 'wishlist-action';
  const button = document.createElement('button'); button.type = 'button'; button.className = 'btn-wishlist';
  if (compact) {
    wrapper.classList.add('is-compact');
    button.dataset.i18nAria = 'wishlistAdd'; button.dataset.i18nTitle = 'wishlistAdd';
    I18N.translateElement(button);
    button.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>';
  } else I18N.bind(button, 'wishlistAdd');
  const status = document.createElement('span'); status.className = 'wishlist-feedback'; status.setAttribute('role', 'status');
  const link = document.createElement('a'); link.href = 'wishlist.html'; I18N.bind(link, 'wishlist'); link.hidden = true;
  wrapper.append(button);
  (feedbackTarget || wrapper).append(status, link);
  button.disabled = !card.id;
  button.onclick = async () => {
    if (button.disabled) return;
    button.disabled = true;
    await DeckAccess.ready;
    if (!DeckAccess.allowed()) { button.disabled = false; location.href = 'login.html'; return; }
    try {
      const library = await AccountLibrary.open('wishlist');
      if (library.error()) throw new Error(library.error());
      const game = card.game || CardData.game;
      if (!library.items.some(item => item.game === game && item.printingId === card.id)) {
        library.save([...library.items, { id: crypto.randomUUID(), game, printingId: card.id, name: card.name, quantity: 1,
          set: card.set_name || card.collection?.name || card.set || '', number: String(card.collector_number || card.number || '') }]);
        await library.flush();
        if (library.error()) throw new Error(library.error());
      }
      I18N.bind(status, 'wishlistAdded'); link.hidden = false;
      button.classList.add('is-added');
      if (compact) { button.dataset.i18nAria = 'wishlistAdded'; button.dataset.i18nTitle = 'wishlistAdded'; I18N.translateElement(button); }
    } catch (error) {
      const supported = ['libraryConflict', 'libraryNotConfigured', 'authNotConfigured', 'libraryInvalidData', 'authAccountChanged'];
      I18N.bind(status, supported.includes(error.message) ? error.message : 'libraryUnavailable'); link.hidden = false;
    } finally { button.disabled = false; }
  };
  return wrapper;
}
