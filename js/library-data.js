// Shared validation for account data received from browsers and the database.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LibraryData = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const text = (value, max) => typeof value === 'string' && !!value.trim() && value.length <= max;
  const count = (value, min) => Number.isSafeInteger(value) && value >= min && value <= 1000;
  const optional = (value, max) => value === undefined || value === null || typeof value === 'string' && value.length <= max;
  function validate(kind, items) {
    if (!['decks', 'wishlist'].includes(kind) || !Array.isArray(items) || items.length > (kind === 'decks' ? 200 : 1000)) throw new Error('libraryInvalidData');
    const ids = new Set();
    for (const item of items) {
      if (!item || !text(item.id, 100) || ids.has(item.id) || !text(item.name, kind === 'decks' ? 100 : 200)) throw new Error('libraryInvalidData');
      ids.add(item.id);
      if (item.game === undefined && kind === 'decks') item.game = 'mtg';
      if (!['mtg', 'pokemon'].includes(item.game)) throw new Error('libraryInvalidData');
      if (kind === 'decks') {
        if (!Array.isArray(item.cards) || item.cards.length > 1000) throw new Error('libraryInvalidData');
        const cardIds = new Set();
        for (const card of item.cards) {
          if (!card || !text(card.id, 100) || cardIds.has(card.id) || !text(card.name, 200)
            || !count(card.quantity, 1) || !count(card.owned, 0) || !['main', 'sideboard'].includes(card.section)
            || !optional(card.set, 40) || !optional(card.number, 40)) throw new Error('libraryInvalidData');
          cardIds.add(card.id);
        }
      } else if (!text(item.printingId, 100) || !count(item.quantity, 1) || !optional(item.set, 100) || !optional(item.number, 40)) throw new Error('libraryInvalidData');
    }
    return items;
  }
  return { validate };
});
