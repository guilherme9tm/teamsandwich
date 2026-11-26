const DeckImport = (() => {
  const MAX_ENTRIES = 1000;
  const MAX_QUANTITY = 1000;

  function parse(text, { game = 'mtg', requireQuantity = false } = {}) {
    if (text.length > 256000) throw new Error('importTooLarge');
    let section = 'main';
    const entries = new Map();
    const warnings = [];
    for (const [index, raw] of text.split(/\r?\n/).entries()) {
      let line = raw.trim().replace(/^\uFEFF/, '');
      if (!line) continue;
      // Also accept headings exported as comments, without swallowing split card names.
      const heading = line.replace(/^(?:\/\/|#)\s*/, '').replace(/[:\s]+$/, '').toLowerCase();
      if (game === 'pokemon' && /^(?:pokémon|pokemon|trainers?|treinadores?|energy|energias?)\s*:\s*\d+$/.test(heading)) { section = 'main'; continue; }
      if (game === 'pokemon' && /^total (?:cards|de cartas)\s*:\s*\d+$/.test(heading)) continue;
      if (/^(?:sideboard|side board|reserve)(?:\s*\(\d+\))?$/.test(heading)) { section = 'sideboard'; continue; }
      if (/^(?:deck|mainboard|main deck|commander|commanders|companion|pokemon|pokémon|trainer|trainers|energy)(?:\s*\(\d+\))?$/.test(heading)) { section = 'main'; continue; }
      if (/^(?:maybeboard|considering)(?:\s*\(\d+\))?$/.test(heading)) { section = 'ignored'; continue; }
      if (line.startsWith('//') || line.startsWith('#')) continue;
      let cardSection = section;
      if (/^SB\s*:/i.test(line)) { cardSection = 'sideboard'; line = line.replace(/^SB\s*:\s*/i, ''); }
      if (cardSection === 'ignored') continue;
      const match = line.match(/^(\d+)\s*x?\s+(.+)$/i) || line.match(/^(\d+)x\s*(.+)$/i);
      if (requireQuantity && !match) { warnings.push(index + 1); continue; }
      const quantity = match ? Number(match[1]) : 1;
      let name = (match ? match[2] : line).replace(/\s+\*(?:F|E)\*\s*$/i, '').trim();
      let set = null;
      let number = null;
      const printing = name.match(/^(.*?)\s+\(([a-z\d]+)\)\s+([\w★-]+)$/i)
        || (game === 'pokemon' ? name.match(/^(.*?)\s+([A-Z\d]{2,7})\s+([\w★-]+)$/) : null);
      if (printing) { [, name, set, number] = printing; set = set.toLowerCase(); }
      if (!name || name.length > 200 || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
        warnings.push(index + 1); continue;
      }
      const key = `${cardSection}|${name.toLowerCase()}|${set || ''}|${number || ''}`;
      const previous = entries.get(key);
      if (previous) {
        if (previous.quantity + quantity > MAX_QUANTITY) { warnings.push(index + 1); continue; }
        previous.quantity += quantity;
      } else {
        if (entries.size >= MAX_ENTRIES) throw new Error('importTooLarge');
        entries.set(key, { name, set, number, quantity, section: cardSection });
      }
    }
    return { version: 2, entries: [...entries.values()], warnings };
  }

  function readStored(value) {
    // Accept lists saved by previous versions, applying the same bounds/parser.
    if (Array.isArray(value)) return parse(value.join('\n'));
    if (value?.version !== 2 || !Array.isArray(value.entries)) throw new Error('invalidImport');
    return parse(value.entries.map(entry => {
      if (!entry || typeof entry.name !== 'string' || /[\r\n]/.test(entry.name)) throw new Error('invalidImport');
      return `${entry.section === 'sideboard' ? 'SB: ' : ''}${entry.quantity} ${entry.name}${entry.set && entry.number ? ` (${entry.set}) ${entry.number}` : ''}`;
    }).join('\n'));
  }
  return { parse, readStored };
})();

if (typeof module !== 'undefined') module.exports = DeckImport;
