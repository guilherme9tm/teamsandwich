const CardPrices = (() => {
  const fields = { usd: ['USD', 'normal', 'TCGplayer'], usd_foil: ['USD', 'foil', 'TCGplayer'],
    usd_etched: ['USD', 'etched', 'TCGplayer'], eur: ['EUR', 'normal', 'Cardmarket'],
    eur_foil: ['EUR', 'foil', 'Cardmarket'], tix: ['TIX', 'digital', 'Cardhoarder'] };
  function entries(card) {
    if (Array.isArray(card.metadata?.priceRecords)) return card.metadata.priceRecords.filter(price => price.printingId === card.id
      && typeof price.value === 'number' && Number.isFinite(price.value) && price.value >= 0 && ['USD', 'EUR', 'TIX'].includes(price.currency));
    return Object.entries(fields).flatMap(([field, [currency, variant, market]]) => {
      const raw = card.prices?.[field];
      if (raw == null || raw === '' || !Number.isFinite(Number(raw)) || Number(raw) < 0) return [];
      return [{ printingId: card.id, currency, variant, market, value: Number(raw),
        source: card.source || 'scryfall', updatedAt: card.priceUpdatedAt || null, fetchedAt: card.fetchedAt || null }];
    });
  }
  function main(card) { return entries(card).find(price => price.currency === 'USD' && price.variant === 'normal') || null; }
  function format(price, lang = 'en') {
    if (!price) return null;
    if (price.currency === 'TIX') return `${price.value.toFixed(2)} TIX`;
    return new Intl.NumberFormat(lang, { style: 'currency', currency: price.currency, currencyDisplay: 'code' }).format(price.value);
  }
  return { entries, main, format };
})();
if (typeof module !== 'undefined') module.exports = CardPrices;
