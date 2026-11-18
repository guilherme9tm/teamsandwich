const TournamentData = (() => {
  function safeLink(value) {
    try { const url = new URL(value); return url.protocol === 'https:' ? url.href : null; } catch { return null; }
  }
  function cardEntry(card, section = 'main') {
    const quantity = Number(card.count ?? card.quantity);
    if (typeof card.name !== 'string' || !card.name.trim() || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000) return null;
    return { name: card.name, quantity, section, set: card.set || null, number: card.number || null,
      oracleId: card.oracle_id || null };
  }
  function deckEntries(deck, game) {
    if (!deck || typeof deck !== 'object') return null;
    const sections = game === 'pokemon' ? ['pokemon', 'trainer', 'energy'] : ['mainboard', 'sideboard', 'commanders', 'main', 'commander'];
    const result = [];
    for (const section of sections) {
      const raw = deck[section] || deck[section.charAt(0).toUpperCase() + section.slice(1)];
      const values = Array.isArray(raw) ? raw : raw && typeof raw === 'object'
        ? Object.entries(raw).map(([name, value]) => typeof value === 'number' ? { name, quantity: value } : { ...value, name: value?.name || name }) : [];
      for (const card of values) {
        const entry = cardEntry(card, section === 'sideboard' ? 'sideboard' : 'main');
        if (!entry) return null;
        result.push(entry);
      }
    }
    return result.length ? result : null;
  }
  function normalizeStanding(row, tournament, index) {
    let entries = deckEntries(row.deckObj || row.decklist, tournament.game);
    const deckUrl = typeof row.decklist === 'string' ? safeLink(row.decklist) : null;
    if (!entries && typeof row.decklist === 'string' && !deckUrl && !/^https?:/i.test(row.decklist)) {
      const parser = typeof DeckImport !== 'undefined' ? DeckImport : typeof require !== 'undefined' ? require('./deck-import.js') : null;
      if (parser) {
        const parsed = parser.parse(row.decklist.replace(/~~([^~]+)~~/g, '$1'));
        if (!parsed.warnings.length) entries = parsed.entries;
      }
    }
    return { id: `${tournament.source}:${tournament.id}:${row.player || row.id || index}`,
      player: typeof row.name === 'string' ? row.name : null,
      placing: Number.isInteger(row.placing ?? row.standing) ? (row.placing ?? row.standing) : null,
      archetype: row.deck?.name || row.archetype || row.leader || null,
      entries, deckUrl, tournamentId: tournament.id, tournament: tournament.name, game: tournament.game,
      format: tournament.format, date: tournament.date, source: tournament.source, sourceUrl: tournament.sourceUrl,
      provenance: 'published', fetchedAt: new Date().toISOString() };
  }
  function normalizeLimitless(row) {
    if (!row || typeof row.id !== 'string' || typeof row.name !== 'string' || row.game !== 'PTCG') throw new Error('invalidResponse');
    return { id: row.id, name: row.name, game: 'pokemon', format: row.format || null, date: row.date || null,
      participants: typeof row.players === 'number' ? row.players : null, location: row.platform || null,
      source: 'Limitless', sourceUrl: `https://play.limitlesstcg.com/tournament/${encodeURIComponent(row.id)}` };
  }
  function normalizeTopdeck(row) {
    if (!row || typeof row.tid !== 'string' || typeof row.name !== 'string' || row.game !== 'Magic: The Gathering') throw new Error('invalidResponse');
    return { id: row.tid, name: row.name, game: 'mtg', format: row.format || null,
      date: Number.isFinite(row.startDate) ? new Date(row.startDate * 1000).toISOString() : null,
      participants: Number.isFinite(row.registeredCount) ? row.registeredCount : null,
      location: [row.location?.city, row.location?.country].filter(Boolean).join(', ') || null,
      source: 'TopDeck.gg', sourceUrl: `https://topdeck.gg/event/${encodeURIComponent(row.tid)}` };
  }
  function createProvider({ fetchImpl = (...args) => fetch(...args) } = {}) {
    const cache = new Map();
    const pending = new Map();
    let nextStart = 0;
    let cooldown = 0;
    let tail = Promise.resolve();
    async function request(url, signal) {
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      if (cache.get(url)?.expires > Date.now()) return cache.get(url).value;
      if (!pending.has(url)) {
        const job = tail.then(async () => {
          await new Promise(resolve => setTimeout(resolve, Math.max(0, nextStart - Date.now())));
          nextStart = Date.now() + 500;
          if (cooldown > Date.now()) throw new Error('rateLimited');
          let response;
          try { response = await fetchImpl(url, { signal: AbortSignal.timeout(15000), headers: { Accept: 'application/json' } }); }
          catch { throw new Error('sourceUnavailable'); }
          if (url.startsWith('/api/') && [404, 503].includes(response.status)) {
            let payload;
            try { payload = await response.json(); } catch { payload = {}; }
            throw new Error(['topdeckConfiguration', 'sourceBusy'].includes(payload.error) ? payload.error : 'topdeckConfiguration');
          }
          if (response.status === 429) { cooldown = Date.now() + Math.max(60, Number(response.headers.get('retry-after')) || 60) * 1000; throw new Error('rateLimited'); }
          if (!response.ok) throw new Error('sourceUnavailable');
          let value;
          try { value = await response.json(); } catch { throw new Error(url.startsWith('/api/') ? 'topdeckConfiguration' : 'invalidResponse'); }
          if (cache.size >= 80) cache.delete(cache.keys().next().value);
          cache.set(url, { value, expires: Date.now() + 600000 });
          return value;
        });
        tail = job.catch(() => {});
        pending.set(url, job.finally(() => pending.delete(url)));
      }
      const value = await pending.get(url);
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      return value;
    }
    async function list({ game = 'mtg', format = '', page = 1, start, end, signal } = {}) {
      const params = new URLSearchParams({ page: String(page) });
      if (format) params.set('format', format);
      let rows;
      let nextPage;
      if (game === 'pokemon') {
        params.set('game', 'PTCG'); params.set('limit', '24');
        rows = await request(`https://play.limitlesstcg.com/api/tournaments?${params}`, signal);
        if (!Array.isArray(rows)) throw new Error('invalidResponse');
        nextPage = rows.length === 24 ? page + 1 : null;
        rows = rows.map(normalizeLimitless);
      } else if (game === 'mtg') {
        if (start) params.set('start', start);
        if (end) params.set('end', end);
        const data = await request(`/api/topdeck/tournaments?${params}`, signal);
        if (!Array.isArray(data.tournaments)) throw new Error('invalidResponse');
        rows = data.tournaments;
        nextPage = data.nextPage;
      } else throw new Error('unsupportedGame');
      return { tournaments: rows.filter(row => (!start || Date.parse(row.date) >= Date.parse(start)) && (!end || Date.parse(row.date) <= Date.parse(end) + 86399999)), nextPage };
    }
    async function standings(tournament, { signal } = {}) {
      const rows = tournament.game === 'pokemon'
        ? await request(`https://play.limitlesstcg.com/api/tournaments/${encodeURIComponent(tournament.id)}/standings`, signal)
        : await request(`/api/topdeck/tournaments/${encodeURIComponent(tournament.id)}/standings`, signal);
      if (!Array.isArray(rows)) throw new Error('invalidResponse');
      if (tournament.game === 'mtg') return rows;
      return rows.map((row, index) => normalizeStanding(row, tournament, index));
    }
    return { list, standings };
  }
  return { createProvider, normalizeLimitless, normalizeTopdeck, normalizeStanding, deckEntries, safeLink };
})();
if (typeof module !== 'undefined') module.exports = TournamentData;
