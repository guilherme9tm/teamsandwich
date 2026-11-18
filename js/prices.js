const CardPrices = (() => {
  const rateUrl = 'https://www.bankofcanada.ca/valet/observations/FXUSDCAD,FXEURCAD/json?recent=1';
  const maxAge = 7 * 86400000;
  let rates = null;
  let pending = null;
  function validRates(value) {
    const age = Date.now() - Date.parse(value?.date);
    return Number.isFinite(age) && age >= 0 && age <= maxAge
      && ['USD', 'EUR'].every(currency => typeof value[currency] === 'number' && Number.isFinite(value[currency]) && value[currency] > 0);
  }
  if (typeof AppStorage !== 'undefined') {
    const cached = AppStorage.session.readJSON('cadExchangeRates', null);
    if (validRates(cached)) rates = cached;
  }
  async function loadRates(fetchImpl = (...args) => fetch(...args)) {
    if (pending) return pending;
    pending = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetchImpl(rateUrl, { signal: controller.signal, headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error('exchangeRateUnavailable');
        const data = await response.json();
        const observation = data.observations?.at(-1);
        const value = { date: observation?.d, USD: Number(observation?.FXUSDCAD?.v), EUR: Number(observation?.FXEURCAD?.v) };
        if (!validRates(value)) throw new Error('exchangeRateUnavailable');
        rates = value;
        if (typeof AppStorage !== 'undefined') AppStorage.session.setItem('cadExchangeRates', JSON.stringify(rates));
      } catch {
        if (!validRates(rates)) rates = null;
      } finally { clearTimeout(timer); }
      return rates;
    })();
    try { return await pending; } finally { pending = null; }
  }
  const fields = { usd: ['USD', 'normal', 'TCGplayer'], usd_foil: ['USD', 'foil', 'TCGplayer'],
    usd_etched: ['USD', 'etched', 'TCGplayer'], eur: ['EUR', 'normal', 'Cardmarket'],
    eur_foil: ['EUR', 'foil', 'Cardmarket'], tix: ['TIX', 'digital', 'Cardhoarder'] };
  function entries(card) {
    if (Array.isArray(card.metadata?.priceRecords)) return card.metadata.priceRecords.filter(price => price.printingId === card.id
      && typeof price.value === 'number' && Number.isFinite(price.value) && price.value >= 0 && ['CAD', 'USD', 'EUR', 'TIX'].includes(price.currency));
    return Object.entries(fields).flatMap(([field, [currency, variant, market]]) => {
      const raw = card.prices?.[field];
      if (raw == null || raw === '' || !Number.isFinite(Number(raw)) || Number(raw) < 0) return [];
      return [{ printingId: card.id, currency, variant, market, value: Number(raw),
        source: card.source || 'scryfall', updatedAt: card.priceUpdatedAt || null, fetchedAt: card.fetchedAt || null }];
    });
  }
  function main(card) {
    const prices = entries(card);
    return prices.find(price => price.currency === 'CAD' && price.variant === 'normal')
      || prices.find(price => price.currency === 'USD' && price.variant === 'normal') || null;
  }
  function toCAD(price) {
    if (!price || !Number.isFinite(price.value) || price.value < 0) return null;
    if (price.currency === 'CAD') return price;
    if (!['USD', 'EUR'].includes(price.currency)) return null;
    if (price.value !== 0 && !validRates(rates)) return null;
    return { ...price, currency: 'CAD', value: price.value === 0 ? 0 : price.value * rates[price.currency] };
  }
  function format(price, lang = 'en') {
    if (!price) return null;
    if (price.currency === 'TIX') return `${price.value.toFixed(2)} TIX`;
    const converted = toCAD(price);
    return converted ? new Intl.NumberFormat(lang, { style: 'currency', currency: 'CAD', currencyDisplay: 'code' }).format(converted.value) : null;
  }
  return { entries, main, format, toCAD, loadRates, get rateDate() { return validRates(rates) ? rates.date : null; } };
})();
if (typeof module !== 'undefined') module.exports = CardPrices;
if (typeof window !== 'undefined') {
  CardPrices.ready = CardPrices.loadRates().then(() => window.dispatchEvent(new Event('pricesChanged')));
}
