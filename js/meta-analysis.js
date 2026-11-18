const MetaAnalysis = (() => {
  function identity(entry, game) {
    const name = entry.name.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
    return `${game}:${entry.oracleId || (game === 'pokemon' && entry.set && entry.number ? `${entry.set.toLowerCase()}:${entry.number}` : name)}`;
  }
  function analyze(decks, { core = 70, flex = 10, game, format, section = 'main' } = {}) {
    if (!(core > flex && core <= 100 && flex >= 0)) throw new Error('invalidThresholds');
    const seen = new Set();
    const sample = decks.filter(deck => {
      if (!deck.entries?.length || (game && deck.game !== game) || (format && deck.format !== format) || seen.has(deck.id)) return false;
      seen.add(deck.id);
      return true;
    });
    if (new Set(sample.map(deck => deck.game)).size > 1 || new Set(sample.map(deck => deck.format)).size > 1) throw new Error('mixedSample');
    const totals = new Map();
    for (const deck of sample) {
      const cards = new Map();
      for (const entry of deck.entries) {
        if (section !== 'all' && entry.section !== section) continue;
        const key = identity(entry, deck.game);
        const existing = cards.get(key) || { ...entry, quantity: 0 };
        existing.quantity += entry.quantity;
        cards.set(key, existing);
      }
      for (const [key, entry] of cards) {
        const stat = totals.get(key) || { key, name: entry.name, set: entry.set, number: entry.number, decks: 0, copies: 0, archetypes: {}, formats: {}, history: {} };
        stat.decks++; stat.copies += entry.quantity;
        if (deck.archetype) stat.archetypes[deck.archetype] = (stat.archetypes[deck.archetype] || 0) + 1;
        stat.formats[deck.format] = (stat.formats[deck.format] || 0) + 1;
        const month = deck.date?.slice(0, 7);
        if (month) stat.history[month] = (stat.history[month] || 0) + 1;
        totals.set(key, stat);
      }
    }
    const periods = {};
    for (const deck of sample) {
      const month = deck.date?.slice(0, 7);
      if (month) periods[month] = (periods[month] || 0) + 1;
    }
    const cards = [...totals.values()].map(stat => {
      const frequency = 100 * stat.decks / sample.length;
      return { ...stat, frequency, averageCopies: stat.copies / sample.length, averageWhenPresent: stat.copies / stat.decks,
        category: frequency >= core ? 'core' : frequency >= flex ? 'flex' : 'uncommon',
        history: Object.keys(periods).sort().map(month => ({ month, decks: stat.history[month] || 0, sample: periods[month], frequency: 100 * (stat.history[month] || 0) / periods[month] })) };
    }).sort((first, second) => second.frequency - first.frequency || first.name.localeCompare(second.name));
    return { sample: sample.length, cards, periods, sources: [...new Set(sample.map(deck => deck.source))] };
  }
  function compare(first, second) {
    if (first.game !== second.game || first.format !== second.format) throw new Error('mixedSample');
    const collect = deck => {
      const values = new Map();
      for (const entry of deck.entries || []) {
        const key = `${identity(entry, deck.game)}:${entry.section}`;
        const previous = values.get(key) || { name: entry.name, section: entry.section, quantity: 0 };
        previous.quantity += entry.quantity; values.set(key, previous);
      }
      return values;
    };
    const left = collect(first); const right = collect(second);
    return [...new Set([...left.keys(), ...right.keys()])].map(key => ({ name: (left.get(key) || right.get(key)).name,
      section: (left.get(key) || right.get(key)).section, first: left.get(key)?.quantity || 0, second: right.get(key)?.quantity || 0 }));
  }
  return { identity, analyze, compare };
})();
if (typeof module !== 'undefined') module.exports = MetaAnalysis;
