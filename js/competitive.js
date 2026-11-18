const Competitive = (() => {
  const provider = TournamentData.createProvider();
  const byId = id => document.getElementById(id);
  let tournaments = [];
  let results = new Map();
  let nextPage = 1;
  let loading = false;
  let controller = new AbortController();
  let generation = 0;
  let currentDeck = null;
  let deckController = null;
  let focusBeforeDeck = null;
  const formats = { mtg: ['Standard', 'Pioneer', 'Modern', 'Legacy', 'EDH', 'Pauper', 'Vintage', 'Premodern'], pokemon: ['STANDARD', 'EXPANDED', 'GLC', 'CUSTOM'] };
  function filters() {
    return { game: CardData.game, format: byId('tournamentFormat').value,
      start: byId('tournamentStart').value, end: byId('tournamentEnd').value };
  }
  function button(text, action) {
    const element = document.createElement('button'); element.type = 'button'; element.className = 'btn-secondary'; element.textContent = text; element.onclick = action; return element;
  }
  function sourceLink(container, label, url) {
    container.replaceChildren();
    const anchor = document.createElement('a'); anchor.textContent = label; anchor.href = url; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; container.append(anchor);
  }
  async function load(reset = false) {
    if (loading && !reset) return;
    if (filters().start && filters().end && filters().start > filters().end) { byId('tournamentStatus').textContent = I18N.t('invalidQuery'); return; }
    if (reset) { controller.abort(); controller = new AbortController(); generation++; tournaments = []; results = new Map(); nextPage = 1; render(); }
    const version = generation;
    loading = true;
    byId('tournamentStatus').textContent = I18N.t('loading');
    byId('tournamentRetry').hidden = true;
    byId('moreTournaments').disabled = true;
    try {
      const page = await provider.list({ ...filters(), page: nextPage || 1, signal: controller.signal });
      if (version !== generation) return;
      const known = new Set(tournaments.map(tournament => tournament.id));
      tournaments.push(...page.tournaments.filter(tournament => !known.has(tournament.id)));
      nextPage = page.nextPage;
      byId('tournamentStatus').textContent = tournaments.length ? `${tournaments.length} ${I18N.t('tournamentsLoaded')}` : I18N.t('noResults');
      render();
    } catch (error) {
      if (version !== generation || error.name === 'AbortError') return;
      byId('tournamentStatus').textContent = I18N.t(error.message || 'sourceUnavailable');
      byId('tournamentRetry').hidden = false;
    } finally {
      if (version === generation) { loading = false; byId('moreTournaments').disabled = false; byId('moreTournaments').hidden = !nextPage; }
    }
  }
  function visibleTournaments() {
    const query = byId('tournamentSearch').value.trim().toLowerCase();
    const player = byId('playerSearch').value.trim().toLowerCase();
    const archetype = byId('archetypeSearch').value.trim().toLowerCase();
    return tournaments.filter(tournament => tournament.name.toLowerCase().includes(query)
      && (!player && !archetype || (results.get(tournament.id) || []).some(deck => (deck.player || '').toLowerCase().includes(player) && (deck.archetype || '').toLowerCase().includes(archetype))));
  }
  async function loadResults(tournament, actionButton) {
    if (actionButton) actionButton.disabled = true;
    const version = generation;
    try {
      if (!results.has(tournament.id)) {
        const standings = await provider.standings(tournament, { signal: controller.signal });
        if (version !== generation) return;
        results.set(tournament.id, standings);
      }
      render();
    } catch (error) {
      if (version === generation && error.name !== 'AbortError') byId('tournamentStatus').textContent = I18N.t(error.message || 'sourceUnavailable');
    } finally { if (actionButton) actionButton.disabled = false; }
  }
  function render() {
    const grid = byId('tournamentGrid'); grid.replaceChildren();
    const playerQuery = byId('playerSearch').value.trim().toLowerCase();
    const archetypeQuery = byId('archetypeSearch').value.trim().toLowerCase();
    for (const tournament of visibleTournaments()) {
      const card = document.createElement('article'); card.className = 'tournament-card';
      const title = document.createElement('h2'); title.textContent = tournament.name;
      const details = document.createElement('p'); details.textContent = `${tournament.date ? new Date(tournament.date).toLocaleDateString(I18N.current) : '—'} · ${tournament.format || '—'} · ${tournament.participants ?? '—'} ${I18N.t('participants')}`;
      const location = document.createElement('p'); location.textContent = tournament.location || I18N.t('locationUnavailable');
      const source = document.createElement('p'); sourceLink(source, tournament.source, tournament.sourceUrl);
      card.append(title, details, location, source);
      const standings = results.get(tournament.id);
      if (!standings) {
        const open = button(I18N.t('viewResults'), () => loadResults(tournament, open)); card.append(open);
      } else {
        const sampleSelect = document.createElement('select'); sampleSelect.setAttribute('aria-label', I18N.t('sample'));
        for (const [value, label] of [['8', 'Top 8'], ['16', 'Top 16'], ['0', I18N.t('allLists')]]) { const option = new Option(label, value); sampleSelect.add(option); }
        const list = document.createElement('div');
        function show() {
          list.replaceChildren(); const limit = Number(sampleSelect.value);
          for (const deck of standings.filter(deck => (!limit || deck.placing && deck.placing <= limit)
            && (deck.player || '').toLowerCase().includes(playerQuery) && (deck.archetype || '').toLowerCase().includes(archetypeQuery))) {
            const row = document.createElement('div'); row.className = 'standings-row';
            const label = document.createElement('span'); label.textContent = `#${deck.placing ?? '—'} ${deck.player || '—'} · ${deck.archetype || I18N.t('unknownArchetype')}`; row.append(label);
            if (deck.entries?.length) row.append(button(I18N.t('openDeck'), () => openDeck(deck)));
            else if (deck.deckUrl) { const link = document.createElement('a'); link.textContent = I18N.t('externalDeck'); link.href = deck.deckUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; row.append(link); }
            else { const absent = document.createElement('small'); absent.textContent = I18N.t('deckUnavailable'); row.append(absent); }
            list.append(row);
          }
          if (!list.children.length) list.textContent = I18N.t('noResults');
        }
        sampleSelect.onchange = show; show(); card.append(sampleSelect, list);
      }
      grid.append(card);
    }
    updateAnalysisOptions(); analyze();
  }
  function availableDecks() { return [...results.values()].flat().filter(deck => deck.entries?.length); }
  function setOptions(select, options, all = false) {
    const previous = select.value; select.replaceChildren();
    if (all) select.add(new Option(I18N.t('all'), ''));
    for (const [id, name] of options) select.add(new Option(name, id));
    if ([...select.options].some(option => option.value === previous)) select.value = previous;
  }
  function updateAnalysisOptions() {
    const decks = availableDecks();
    setOptions(byId('analysisTournament'), tournaments.filter(tournament => results.has(tournament.id)).map(tournament => [tournament.id, tournament.name]), true);
    setOptions(byId('analysisArchetype'), [...new Set(decks.map(deck => deck.archetype).filter(Boolean))].sort().map(name => [name, name]), true);
    for (const id of ['compareFirst', 'compareSecond']) setOptions(byId(id), decks.map(deck => [deck.id, `${deck.player} · ${deck.tournament} · ${deck.archetype || '—'}`]));
  }
  function analyze() {
    const format = filters().format;
    const target = byId('frequencyRanking'); target.replaceChildren();
    if (!format) { byId('analysisStatus').textContent = I18N.t('selectAnalysisFormat'); return; }
    const sample = Number(byId('analysisSample').value);
    const tournamentId = byId('analysisTournament').value;
    const archetype = byId('analysisArchetype').value;
    const decks = availableDecks().filter(deck => (!filters().start || Date.parse(deck.date) >= Date.parse(filters().start)) && (!filters().end || Date.parse(deck.date) <= Date.parse(filters().end) + 86399999) && (!sample || deck.placing && deck.placing <= sample)
      && (!tournamentId || deck.tournamentId === tournamentId) && (!archetype || deck.archetype === archetype));
    try {
      const analysis = MetaAnalysis.analyze(decks, { game: CardData.game, format, core: Number(byId('coreThreshold').value), flex: Number(byId('flexThreshold').value), section: byId('analysisSection').value });
      byId('analysisStatus').textContent = `${analysis.sample} ${I18N.t('decksAnalyzed')} · ${format} · ${filters().start || '—'} — ${filters().end || '—'} · ${analysis.sources.join(', ')} · ${I18N.t('sampleLimitNotice')}`;
      if (CardData.game === 'pokemon') byId('analysisStatus').textContent += ` ${I18N.t('pokemonIdentityNotice')}`;
      for (const [index, stat] of analysis.cards.entries()) {
        const row = document.createElement('div'); row.className = 'frequency-row';
        const label = document.createElement('span'); label.textContent = `${index + 1}. ${stat.name}${CardData.game === 'pokemon' && stat.set ? ` (${stat.set} ${stat.number})` : ''} · ${I18N.t(stat.category)}`;
        const values = document.createElement('div');
        const frequency = document.createElement('p'); frequency.textContent = `${stat.frequency.toFixed(1)}% · ${stat.decks}/${analysis.sample} ${I18N.t('decks')} · ${stat.averageCopies.toFixed(2)} ${I18N.t('averageCopies')}`;
        const bar = document.createElement('progress'); bar.max = 100; bar.value = stat.frequency; bar.setAttribute('aria-label', `${stat.name}: ${stat.frequency.toFixed(1)}%`);
        values.append(frequency, bar);
        const distribution = document.createElement('small'); distribution.textContent = Object.entries(stat.archetypes).map(([name, count]) => `${name}: ${count}`).join(' · '); values.append(distribution);
        if (stat.history.length >= 2) { const history = document.createElement('p'); history.textContent = stat.history.map(period => `${period.month}: ${period.frequency.toFixed(1)}% (n=${period.sample})`).join(' → '); values.append(history); }
        row.append(label, values); target.append(row);
      }
    } catch (error) { byId('analysisStatus').textContent = I18N.t(error.message); }
  }
  function deckText(deck) {
    return ['main', 'sideboard'].map(section => {
      const entries = deck.entries.filter(entry => entry.section === section);
      return entries.length ? `${section === 'main' ? 'Deck' : 'Sideboard'}\n${entries.map(entry => `${entry.quantity} ${entry.name}${entry.set && entry.number ? ` (${entry.set}) ${entry.number}` : ''}`).join('\n')}` : '';
    }).filter(Boolean).join('\n\n');
  }
  function renderDeck() {
    if (!currentDeck) return;
    byId('deckTitle').textContent = currentDeck.archetype || I18N.t('deckName');
    byId('deckMetadata').textContent = `${currentDeck.player || '—'} · ${currentDeck.tournament || '—'} · #${currentDeck.placing ?? '—'} · ${currentDeck.format || '—'}`;
    byId('deckText').textContent = deckText(currentDeck);
    if (currentDeck.sourceUrl) sourceLink(byId('deckOrigin'), `${I18N.t('publishedList')} · ${currentDeck.source} · ${I18N.t('retrievedAt')}: ${new Date(currentDeck.fetchedAt).toLocaleString(I18N.current)}`, currentDeck.sourceUrl);
    else byId('deckOrigin').textContent = I18N.t('localImportNotice');
  }
  async function openDeck(deck) {
    currentDeck = deck;
    deckController?.abort(); deckController = new AbortController(); const signal = deckController.signal;
    focusBeforeDeck = document.activeElement;
    renderDeck(); byId('deckImages').replaceChildren(); byId('deckPrice').textContent = I18N.t('loading'); byId('deckCopyStatus').textContent = '';
    if (!byId('deckDialog').open) byId('deckDialog').showModal();
    let subtotal = 0; let priced = 0; let total = 0;
    try {
      const cardProvider = CardData.provider(deck.game);
      for (let offset = 0; offset < deck.entries.length; offset += 30) {
        const entries = deck.entries.slice(offset, offset + 30);
        const cards = await cardProvider.collection(entries, { signal });
        if (signal.aborted) return;
        entries.forEach((entry, index) => {
          const card = cards[index]; const price = card ? CardPrices.main(card) : null;
          total += entry.quantity;
          if (price) { subtotal += price.value * entry.quantity; priced += entry.quantity; }
          const figure = document.createElement('figure');
          const caption = document.createElement('figcaption'); caption.textContent = `${entry.quantity} × ${entry.name} · ${I18N.t(entry.section === 'sideboard' ? 'sideboard' : 'mainDeck')}`;
          if (card?.images.normal) { const link = document.createElement('a'); link.href = gameUrl('card-detail.html', { id: card.id, name: card.name }); const image = document.createElement('img'); image.src = card.images.normal; image.alt = card.name; image.loading = 'lazy'; link.append(image); figure.append(link); }
          figure.append(caption); byId('deckImages').append(figure);
        });
        byId('deckPrice').textContent = `${I18N.t(priced === total && offset + entries.length >= deck.entries.length ? 'deckEstimate' : 'pricedSubtotal')}: ${priced ? CardPrices.format({ value: subtotal, currency: 'USD' }, I18N.current) : I18N.t('priceUnavailable')} · ${priced}/${deck.entries.reduce((sum, entry) => sum + entry.quantity, 0)} ${I18N.t('copiesPriced')} · ${I18N.t('representativePrintings')}`;
      }
    } catch (error) { if (!signal.aborted) byId('deckPrice').textContent = I18N.t(error.code || error.message || 'sourceUnavailable'); }
  }
  function compare() {
    const target = byId('comparison'); target.replaceChildren();
    const decks = availableDecks(); const first = decks.find(deck => deck.id === byId('compareFirst').value); const second = decks.find(deck => deck.id === byId('compareSecond').value);
    if (!first || !second) { target.textContent = I18N.t('deckUnavailable'); return; }
    try {
      for (const row of MetaAnalysis.compare(first, second)) {
        const element = document.createElement('p'); element.textContent = `${row.name} · ${I18N.t(row.section === 'sideboard' ? 'sideboard' : 'mainDeck')}: ${row.first} / ${row.second} (${row.second - row.first >= 0 ? '+' : ''}${row.second - row.first})`; target.append(element);
      }
    } catch (error) { target.textContent = I18N.t(error.message); }
  }
  function init() {
    const tabs = [...document.querySelectorAll('.workspace-tabs [role="tab"]')];
    function activateTab(tab) {
      tabs.forEach(element => {
        const selected = element === tab;
        element.setAttribute('aria-selected', String(selected));
        element.tabIndex = selected ? 0 : -1;
        byId(element.getAttribute('aria-controls')).hidden = !selected;
      });
    }
    tabs.forEach((tab, index) => {
      tab.onclick = () => activateTab(tab);
      tab.onkeydown = event => {
        const destination = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
        if (destination === null) return;
        event.preventDefault(); activateTab(tabs[destination]); tabs[destination].focus();
      };
    });
    byId('configureAnalysis').onclick = () => { activateTab(byId('resultsTab')); byId('tournamentFormat').focus(); };
    byId('tournamentGame').value = CardData.game;
    setOptions(byId('tournamentFormat'), formats[CardData.game].map(value => [value, value]), true);
    byId('tournamentStart').value = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    byId('tournamentEnd').value = new Date().toISOString().slice(0, 10);
    sourceLink(byId('tournamentSource'), `${I18N.t('source')}: ${CardData.game === 'mtg' ? 'TopDeck.gg' : 'Limitless TCG'}`, CardData.game === 'mtg' ? 'https://topdeck.gg' : 'https://play.limitlesstcg.com');
    byId('tournamentFilters').onsubmit = event => { event.preventDefault(); void load(true); };
    byId('tournamentGame').onchange = event => { location.href = `competitive.html?game=${event.target.value}`; };
    for (const id of ['tournamentSearch', 'playerSearch', 'archetypeSearch']) byId(id).oninput = render;
    byId('tournamentFormat').onchange = () => { void load(true); };
    byId('moreTournaments').onclick = () => load(); byId('tournamentRetry').onclick = () => load();
    byId('loadStandings').onclick = async event => {
      const element = event.currentTarget; element.disabled = true;
      const version = generation;
      try { for (const tournament of tournaments) { if (version !== generation) break; await loadResults(tournament); } }
      finally { element.disabled = false; }
    };
    byId('analysisFilters').onsubmit = event => { event.preventDefault(); analyze(); };
    byId('compareButton').onclick = compare;
    byId('pasteDeckForm').onsubmit = event => {
      event.preventDefault();
      try {
        const parsed = DeckImport.parse(byId('pasteDeck').value, { game: CardData.game });
        if (!parsed.entries.length || parsed.warnings.length) throw new Error('invalidImport');
        const deck = { id: `local:${Date.now()}`, game: CardData.game, format: byId('importDeckFormat').value, archetype: byId('importDeckName').value || I18N.t('deckName'), entries: parsed.entries, provenance: 'local', source: 'local' };
        byId('importStatus').textContent = ''; void openDeck(deck);
      } catch (error) { byId('importStatus').textContent = I18N.t(error.message); }
    };
    byId('closeDeck').onclick = () => byId('deckDialog').close();
    byId('deckDialog').addEventListener('close', () => { deckController?.abort(); focusBeforeDeck?.focus(); });
    byId('copyDeck').onclick = async () => {
      try { await navigator.clipboard.writeText(deckText(currentDeck)); byId('deckCopyStatus').textContent = I18N.t('copied'); }
      catch { byId('deckCopyStatus').textContent = I18N.t('copyFailed'); }
    };
    byId('printDeck').onclick = () => window.print();
    window.addEventListener('languageChanged', () => { render(); renderDeck(); });
    I18N.updateDOM(); void load();
  }
  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('pagehide', () => { controller.abort(); deckController?.abort(); });
  return { deckText };
})();
