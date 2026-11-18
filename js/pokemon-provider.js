const PokemonCards = (() => {
  function normalize(card) {
    const priceRecords = [];
    const fields = { normal: 'normal', holo: 'holofoil', reverse: 'reverse-holofoil' };
    for (const variant of card.variants_detailed || []) {
      if (!variant.variantId || !fields[variant.type] || variant.size && variant.size !== 'standard') continue;
      const tcg = variant.pricing?.tcgplayer;
      const record = tcg?.[fields[variant.type]];
      if (typeof record?.marketPrice === 'number' && Number.isFinite(record.marketPrice) && record.marketPrice >= 0 && tcg.unit === 'USD'
        && variant.thirdParty?.tcgplayer != null && record.productId === variant.thirdParty.tcgplayer) {
        priceRecords.push({ printingId: card.id, variantId: variant.variantId, currency: 'USD', variant: variant.type, market: 'TCGplayer', source: 'tcgdex', value: record.marketPrice, updatedAt: tcg.updated || null });
      }
      const market = variant.pricing?.cardmarket;
      const field = variant.type === 'normal' ? 'trend' : variant.type === 'holo' ? 'trend-holo' : null;
      if (field && typeof market?.[field] === 'number' && Number.isFinite(market[field]) && market[field] >= 0 && market.unit === 'EUR'
        && variant.thirdParty?.cardmarket != null && market.idProduct === variant.thirdParty.cardmarket) {
        priceRecords.push({ printingId: card.id, variantId: variant.variantId, currency: 'EUR', variant: variant.type, market: 'Cardmarket', source: 'tcgdex', value: market[field], updatedAt: market.updated || null });
      }
    }
    return CardData.normalizeCard({ id: card.id, game: 'pokemon', source: 'tcgdex', name: card.name,
      collection: { id: card.set?.id || card.id.slice(0, card.id.lastIndexOf('-')), name: card.set?.name || null },
      number: card.localId, rarity: card.rarity || null,
      images: card.image ? { small: `${card.image}/low.webp`, normal: `${card.image}/high.webp`, large: `${card.image}/high.webp` } : {},
      prices: { usd: priceRecords.find(price => price.currency === 'USD' && price.variant === 'normal')?.value ?? null },
      fetchedAt: card._retrievedAt || new Date().toISOString(), metadata: { lang: 'en', detailed: !!card.category, type_line: [card.category, ...(card.types || [])].filter(Boolean).join(' · '),
        oracle_text: [...(card.abilities || []), ...(card.attacks || [])].map(effect => `${effect.name}${effect.damage ? ` (${effect.damage})` : ''}: ${effect.effect || ''}`).concat(card.effect || []).join('\n\n'),
        legalities: Object.fromEntries(Object.entries(card.legal || {}).map(([format, legal]) => [format, legal ? 'legal' : 'not_legal'])),
        hp: card.hp, artist: card.illustrator, variants: card.variants || {}, priceRecords, updatedAt: card.updated || null } });
  }
  function createProvider({ fetchImpl = (...args) => fetch(...args) } = {}) {
    const cache = new Map();
    const pending = new Map();
    let tail = Promise.resolve();
    let nextStart = 0;
    let cooldown = 0;
    const persisted = typeof AppStorage !== 'undefined' ? AppStorage.session.readJSON('tcgdexCache', []) : [];
    if (Array.isArray(persisted)) for (const stored of persisted.slice(-100)) {
      if (Array.isArray(stored) && typeof stored[0] === 'string' && stored[1]?.expires > Date.now()) cache.set(stored[0], stored[1]);
    }
    async function pocketSets() {
      const series = await request('/series/tcgp');
      if (!Array.isArray(series.sets)) throw new CardData.DataError('invalidResponse', 502);
      return new Set(series.sets.map(set => set.id));
    }
    async function request(path, { signal } = {}) {
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      const cached = cache.get(path);
      if (cached?.expires > Date.now()) return cached.data;
      if (!pending.has(path)) {
        const job = tail.then(async () => {
          if (Date.now() < cooldown) throw new CardData.DataError('rateLimited', 429);
          await new Promise(resolve => setTimeout(resolve, Math.max(0, nextStart - Date.now())));
          nextStart = Date.now() + 150;
          let response;
          try { response = await fetchImpl(`https://api.tcgdex.net/v2/en${path}`, { signal: AbortSignal.timeout(12000) }); }
          catch { throw new CardData.DataError('sourceUnavailable'); }
          if (response.status === 429) { cooldown = Date.now() + Math.max(60, Number(response.headers.get('retry-after')) || 60) * 1000; }
          if (!response.ok) throw new CardData.DataError(response.status === 404 ? 'cardNotFoundTitle' : response.status === 429 ? 'rateLimited' : 'sourceUnavailable', response.status);
          let data;
          try { data = await response.json(); } catch { throw new CardData.DataError('invalidResponse', 502); }
          if (!data || typeof data !== 'object') throw new CardData.DataError('invalidResponse', 502);
          if (!Array.isArray(data)) data._retrievedAt = new Date().toISOString();
          if (cache.size >= 100) cache.delete(cache.keys().next().value);
          cache.set(path, { data, expires: Date.now() + 300000 });
          const snapshot = JSON.stringify([...cache]);
          if (snapshot.length <= 1000000 && typeof AppStorage !== 'undefined') AppStorage.session.setItem('tcgdexCache', snapshot);
          return data;
        });
        tail = job.catch(() => {});
        pending.set(path, job.finally(() => pending.delete(path)));
      }
      const data = await pending.get(path);
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      return data;
    }
    async function search({ query, set, category, page = 1, perPage = 30, signal } = {}) {
      const excluded = await pocketSets();
      const params = new URLSearchParams({ 'pagination:page': page, 'pagination:itemsPerPage': perPage });
      if (query) params.set('name', query);
      if (set) params.set('set.id', `eq:${set}`);
      if (category) params.set('category', `eq:${category}`);
      const data = await request(`/cards?${params}`, { signal });
      if (!Array.isArray(data) || data.some(card => !card.id || !card.name)) throw new CardData.DataError('invalidResponse', 502);
      return { cards: data.filter(card => !excluded.has(card.id.slice(0, card.id.lastIndexOf('-')))).map(normalize), total: null, nextPage: data.length === perPage ? page + 1 : null };
    }
    async function get(id, options) {
      const excluded = await pocketSets();
      if (excluded.has(id.slice(0, id.lastIndexOf('-')))) throw new CardData.DataError('cardNotFoundTitle', 404);
      return normalize(await request(`/cards/${encodeURIComponent(id)}`, options));
    }
    async function externalPrinting(entry, options) {
      const matching = await request(`/sets?${new URLSearchParams({ 'abbreviation.official': `eq:${entry.set.toUpperCase()}` })}`, options);
      if (!Array.isArray(matching) || matching.length !== 1) return null;
      const set = await request(`/sets/${encodeURIComponent(matching[0].id)}`, options);
      const candidates = set.cards?.filter(card => String(card.localId).replace(/^0+(?=\d)/, '') === String(entry.number).replace(/^0+(?=\d)/, '')) || [];
      if (candidates.length !== 1 || candidates[0].name.toLowerCase() !== entry.name.toLowerCase()) return null;
      return get(candidates[0].id, options);
    }
    async function named(name, options) {
      const result = await search({ query: `eq:${name}`, ...options });
      if (!result.cards.length) throw new CardData.DataError('cardNotFoundTitle', 404);
      return get(result.cards[0].id, options);
    }
    return { id: 'pokemon', name: 'Pokémon TCG', search, get, named,
      async sets() {
        const excluded = await pocketSets();
        const data = await request('/sets?sort:field=releaseDate&sort:order=DESC');
        if (!Array.isArray(data)) throw new CardData.DataError('invalidResponse', 502);
        return data.filter(set => !excluded.has(set.id)).map(set => ({ ...set, code: set.id, icon_svg_uri: set.symbol ? `${set.symbol}.webp` : '', set_type: 'expansion', card_count: set.cardCount?.total || 0 }));
      },
      async autocomplete(query, options) { return [...new Set((await search({ query, ...options })).cards.map(card => card.name))].slice(0, 8); },
      async collection(entries, options) {
        if (entries.length > 75) throw new CardData.DataError('invalidQuery', 400);
        const results = [];
        for (const entry of entries) {
          try { results.push(entry.set && entry.number ? await externalPrinting(entry, options) : await named(entry.name, options)); }
          catch (error) { if (error.status !== 404) throw error; results.push(null); }
        }
        return results;
      },
      async arts(card, page, options) {
        const result = await search({ query: `eq:${card.name}`, page, perPage: 6, ...options });
        const cards = [];
        for (const printing of result.cards) cards.push(await get(printing.id, options));
        return { ...result, cards };
      },
      async localized(card) { return card; }
    };
  }
  return { normalize, createProvider };
})();
CardData.register(PokemonCards.createProvider());
if (typeof module !== 'undefined') module.exports = PokemonCards;
