/* Shared, frontend-only card data layer. No credentials or server required. */
const CardData = (() => {
  class DataError extends Error {
    constructor(code, status = 0, retryAfter = 0) {
      super(code);
      Object.assign(this, { code, status, retryAfter });
    }
  }

  const abortError = () => new DOMException('Request cancelled', 'AbortError');
  const isAbort = error => error?.name === 'AbortError';

  // A caller can stop waiting without cancelling a request shared by other callers.
  function subscribe(promise, signal) {
    if (!signal) return promise;
    if (signal.aborted) return Promise.reject(abortError());
    return new Promise((resolve, reject) => {
      const abort = () => reject(abortError());
      signal.addEventListener('abort', abort, { once: true });
      promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
    });
  }

  function createClient({ fetchImpl = (...args) => fetch(...args), interval = 120,
    timeout = 10000, maxEntries = 160, maxBytes = 4 * 1024 * 1024, now = Date.now } = {}) {
    const cache = new Map();
    const pending = new Map();
    const queue = [];
    let bytes = 0;
    let active = 0;
    let nextStart = 0;
    let cooldown = 0;
    let timer;
    const persisted = typeof AppStorage !== 'undefined' ? AppStorage.session.readJSON('scryfallCache', []) : [];
    if (Array.isArray(persisted)) for (const stored of persisted) {
      if (!Array.isArray(stored) || stored.length !== 2) continue;
      const [key, entry] = stored;
      if (entry?.expires > now() && typeof entry.size === 'number' && entry.size > 0 && bytes + entry.size <= maxBytes && cache.size < maxEntries) {
        cache.set(key, entry); bytes += entry.size;
      }
    }

    function pump() {
      clearTimeout(timer);
      if (!queue.length || active >= 2) return;
      const delay = Math.max(0, nextStart - now());
      if (delay) { timer = setTimeout(pump, delay); return; }
      const job = queue.shift();
      active++;
      nextStart = now() + interval;
      job.run().then(job.resolve, job.reject).finally(() => { active--; pump(); });
      pump();
    }

    async function download(path, body) {
      if (cooldown > now()) throw new DataError('rateLimited', 429, Math.ceil((cooldown - now()) / 1000));
      const controller = new AbortController();
      const deadline = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetchImpl(`https://api.scryfall.com${path}`, {
          method: body ? 'POST' : 'GET',
          headers: { Accept: 'application/json', ...(typeof window === 'undefined' ? { 'User-Agent': 'TeamSandwich/1.1 (TCG catalog validation)' } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        });
        if (response.status === 429) {
          const header = response.headers.get('retry-after');
          const seconds = Number(header) || Math.ceil((Date.parse(header) - now()) / 1000) || 60;
          const retryAfter = Math.max(1, Math.min(seconds, 86400));
          cooldown = now() + retryAfter * 1000;
          throw new DataError('rateLimited', 429, retryAfter);
        }
        if (response.status === 404) throw new DataError('cardNotFoundTitle', 404);
        if (response.status === 400 || response.status === 422) throw new DataError('invalidQuery', response.status);
        if (!response.ok) throw new DataError('sourceUnavailable', response.status);
        let result;
        try { result = await response.json(); } catch (error) {
          if (controller.signal.aborted) throw error;
          throw new DataError('invalidResponse', 502);
        }
        if (!result || typeof result !== 'object' || result.object === 'error') throw new DataError('invalidResponse', 502);
        const listPath = /^\/(?:sets|cards\/(?:search|collection|autocomplete))(?:\?|$)/.test(path);
        if (listPath && !Array.isArray(result.data)) throw new DataError('invalidResponse', 502);
        if (path.startsWith('/cards/autocomplete') && result.data.some(name => typeof name !== 'string')) throw new DataError('invalidResponse', 502);
        if (/^\/cards\/(?:search|collection)(?:\?|$)/.test(path)
          && result.data.some(card => !card || typeof card.id !== 'string' || typeof card.name !== 'string')) throw new DataError('invalidResponse', 502);
        if (!listPath && (typeof result.id !== 'string' || typeof result.name !== 'string')) throw new DataError('invalidResponse', 502);
        const retrievedAt = new Date(now()).toISOString();
        if (Array.isArray(result.data)) result.data.forEach(card => { if (card && typeof card === 'object') card._retrievedAt = retrievedAt; });
        else result._retrievedAt = retrievedAt;
        return result;
      } catch (error) {
        if (error instanceof DataError) throw error;
        throw new DataError(controller.signal.aborted ? 'requestTimeout' : 'sourceUnavailable');
      } finally { clearTimeout(deadline); }
    }

    function remove(key) {
      bytes -= cache.get(key)?.size || 0;
      cache.delete(key);
    }

    function request(path, { body, signal, ttl = 300000, background = false } = {}) {
      if (signal?.aborted) return Promise.reject(abortError());
      if (!path.startsWith('/') || path.startsWith('//')) return Promise.reject(new DataError('invalidQuery', 400));
      const key = `${path}:${JSON.stringify(body || null)}`;
      const stored = cache.get(key);
      if (stored?.expires > now()) {
        cache.delete(key);
        cache.set(key, stored);
        return subscribe(Promise.resolve(stored.value), signal);
      }
      if (stored) remove(key);
      if (!pending.has(key)) {
        if (queue.length >= 100) return Promise.reject(new DataError('sourceBusy', 503));
        const promise = new Promise((resolve, reject) => {
          const job = { resolve, reject, background, run: () => download(path, body) };
          const firstBackground = queue.findIndex(item => item.background);
          if (!background && firstBackground >= 0) queue.splice(firstBackground, 0, job);
          else queue.push(job);
          pump();
        }).then(value => {
          const size = JSON.stringify(value).length * 2;
          if (size <= maxBytes) {
            while (cache.size >= maxEntries || bytes + size > maxBytes) remove(cache.keys().next().value);
            cache.set(key, { value, size, expires: now() + ttl });
            bytes += size;
            if (typeof AppStorage !== 'undefined') AppStorage.session.setItem('scryfallCache', JSON.stringify([...cache]));
          }
          return value;
        }).finally(() => pending.delete(key));
        pending.set(key, promise);
      }
      return subscribe(pending.get(key), signal);
    }

    return { request };
  }

  const pick = (object, fields) => Object.fromEntries(fields.filter(key => object[key] !== undefined).map(key => [key, object[key]]));

  // Adapter-independent contract. Missing values stay null; collector and serial
  // numbers are separate. Game-specific rules remain inside metadata.
  function normalizeCard(card) {
    if (!card || typeof card.id !== 'string' || typeof card.name !== 'string' || !card.game) throw new DataError('invalidResponse', 502);
    return {
      id: card.id, game: card.game, source: card.source || null, name: card.name,
      collection: card.collection || { id: null, name: null },
      number: card.number ?? null, rarity: card.rarity ?? null,
      images: card.images || {}, prices: card.prices || {},
      serialization: card.serialization || { isSerialized: false, number: null, total: null },
      fetchedAt: card.fetchedAt || null, priceUpdatedAt: card.priceUpdatedAt || null,
      metadata: card.metadata || {}
    };
  }

  function normalizeMtg(card) {
    if (!card || typeof card.id !== 'string' || typeof card.name !== 'string') throw new DataError('invalidResponse', 502);
    return normalizeCard({
      id: card.id, game: 'mtg', source: 'scryfall', name: card.name,
      collection: { id: card.set || null, name: card.set_name || null },
      number: card.collector_number || null, rarity: card.rarity, fetchedAt: card._retrievedAt || new Date().toISOString(),
      images: card.image_uris || card.card_faces?.[0]?.image_uris || {}, prices: card.prices,
      serialization: {
        isSerialized: !!card.promo_types?.includes('serialized') || card.serial_number != null,
        number: card.serial_number ?? null, total: card.serial_total ?? null
      },
      metadata: pick(card, ['oracle_id', 'lang', 'type_line', 'colors', 'color_identity', 'card_faces',
        'mana_cost', 'oracle_text', 'printed_name', 'printed_text', 'printed_type_line', 'flavor_text',
        'power', 'toughness', 'loyalty', 'defense', 'artist', 'legalities', 'set_uri'])
    });
  }

  // Compatibility view for the existing MTG components; providers never depend on the DOM.
  function toView(card) {
    return { ...card.metadata, ...card, set: card.collection.id, set_name: card.collection.name,
      collector_number: card.number, image_uris: card.images };
  }

  function readList(result) {
    if (!Array.isArray(result.data)) throw new DataError('invalidResponse', 502);
    return result.data;
  }

  function createMtgProvider(client = createClient()) {
    const request = client.request;
    async function search({ query, set, page = 1, prints = false, signal } = {}) {
      const q = set ? `set:${set}` : (query || 'game:paper');
      const params = new URLSearchParams({ q, page: String(page), unique: prints ? 'prints' : 'cards', order: prints ? 'released' : 'name' });
      if (prints) {
        params.set('include_multilingual', 'false');
        params.set('include_variations', 'true');
      }
      try {
        const result = await request(`/cards/search?${params}`, { signal });
        return { cards: readList(result).map(normalizeMtg), total: result.total_cards,
          nextPage: result.has_more ? page + 1 : null };
      } catch (error) {
        if (error.status === 404) return { cards: [], total: 0, nextPage: null };
        throw error;
      }
    }
    return {
      id: 'mtg', name: 'Magic: The Gathering', search,
      async get(id, options) { return normalizeMtg(await request(`/cards/${encodeURIComponent(id)}`, options)); },
      async named(name, options) {
        try { return normalizeMtg(await request(`/cards/named?exact=${encodeURIComponent(name)}`, options)); }
        catch (error) {
          if (error.status !== 404) throw error;
          return normalizeMtg(await request(`/cards/named?fuzzy=${encodeURIComponent(name)}`, options));
        }
      },
      async sets() { return readList(await request('/sets', { ttl: 3600000 })); },
      async autocomplete(query, options) {
        return readList(await request(`/cards/autocomplete?q=${encodeURIComponent(query)}`, options))
          .filter(name => typeof name === 'string').slice(0, 8);
      },
      async collection(entries, options = {}) {
        if (!entries.length || entries.length > 75) throw new DataError('invalidQuery', 400);
        const identifiers = entries.map(entry => entry.set && entry.number
          ? { set: entry.set.toLowerCase(), collector_number: entry.number } : { name: entry.name });
        const result = await request('/cards/collection', { ...options, body: { identifiers } });
        const cards = readList(result);
        // Missing cards are omitted by Scryfall. Match by identifier, never by index.
        return identifiers.map(identifier => {
          const found = cards.find(card => identifier.set
            ? card.set === identifier.set && card.collector_number === identifier.collector_number
            : [card.name, ...(card.card_faces || []).map(face => face.name)].some(name => name?.toLowerCase() === identifier.name.toLowerCase()));
          return found ? normalizeMtg(found) : null;
        });
      },
      async arts(card, page = 1, options = {}) {
        const oracleId = card.metadata?.oracle_id || card.oracle_id;
        if (!oracleId) return { cards: [card], total: 1, nextPage: null };
        return search({ query: `oracleid:${oracleId} include:extras`, page, prints: true, ...options });
      },
      async localized(card, lang, options = {}) {
        if ((card.metadata?.lang || card.lang) === lang) return card;
        const set = card.collection?.id || card.set;
        const number = card.number || card.collector_number;
        if (!set || !number) return null;
        try {
          return normalizeMtg(await request(`/cards/${encodeURIComponent(set)}/${encodeURIComponent(number)}/${encodeURIComponent(lang)}`, { ...options, background: true }));
        } catch (error) {
          if (error.status === 404) return null;
          throw error;
        }
      }
    };
  }

  const providers = new Map();
  function register(provider) {
    for (const method of ['search', 'get', 'named', 'sets', 'autocomplete', 'collection', 'arts', 'localized']) {
      if (typeof provider[method] !== 'function') throw new TypeError(`Missing provider method: ${method}`);
    }
    providers.set(provider.id, provider);
  }
  let activeGame = 'mtg';
  function provider(game = activeGame) {
    if (!providers.has(game)) throw new DataError('unsupportedGame', 400);
    return providers.get(game);
  }
  register(createMtgProvider());
  function selectGame(game) { provider(game); activeGame = game; }
  return { provider, register, selectGame, get game() { return activeGame; }, normalizeCard, normalizeMtg, toView, createClient, createMtgProvider, DataError, isAbort };
})();

if (typeof module !== 'undefined') module.exports = CardData;
