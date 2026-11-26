function createWishlistButton(card) {
  const wrapper = document.createElement('span'); wrapper.className = 'wishlist-action';
  const button = document.createElement('button'); button.type = 'button'; button.className = 'btn-wishlist'; I18N.bind(button, 'wishlistAdd');
  const status = document.createElement('span'); status.className = 'wishlist-feedback'; status.setAttribute('role', 'status');
  const link = document.createElement('a'); link.href = 'wishlist.html'; I18N.bind(link, 'wishlist'); link.hidden = true;
  wrapper.append(button, status, link);
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
    } catch (error) {
      const supported = ['libraryConflict', 'libraryNotConfigured', 'authNotConfigured', 'libraryInvalidData', 'authAccountChanged'];
      I18N.bind(status, supported.includes(error.message) ? error.message : 'libraryUnavailable'); link.hidden = false;
    } finally { button.disabled = false; }
  };
  return wrapper;
}
