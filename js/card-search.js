// Progressive loading is separate from presentation/filtering in card.js.
const searchParams = new URLSearchParams(window.location.search);
let nextRemotePage = 1;
let mainEntries = [];
let sideboardEntries = [];
let mainOffset = 0;
let sideboardOffset = 0;
let isLoadingCards = false;
let loadError = null;
let retryLoad = null;
let remoteTotal = null;
let searchController = new AbortController();
const importMode = searchParams.get('source') === 'file';
const pokemonSetDirectory = CardData.game === 'pokemon' && !importMode && !['name', 'set', 'category'].some(key => searchParams.get(key));

function hasMoreMain() {
  return importMode ? mainOffset < mainEntries.length : nextRemotePage !== null;
}

function renderLoadControls() {
  const controls = document.getElementById('searchLoadControls');
  if (!controls) return;
  if (pokemonSetDirectory) { controls.hidden = true; return; }
  controls.replaceChildren();
  const message = document.createElement('p');
  if (loadError) {
    message.className = 'load-error';
    message.textContent = I18N.t(loadError.code || loadError.message || 'sourceUnavailable');
  } else if (isLoadingCards) message.textContent = I18N.t('loading');
  else if (remoteTotal !== null && nextRemotePage) message.textContent = `${allCards.length} / ${remoteTotal} · ${I18N.t('filtersLoadedOnly')}`;
  else if (!allCards.length && !hasMoreMain() && !sideboardEntries.length) message.textContent = I18N.t('emptyResults');
  controls.appendChild(message);
  function button(label, action) {
    const element = document.createElement('button');
    element.className = 'btn-secondary';
    element.type = 'button';
    element.textContent = label;
    element.disabled = isLoadingCards;
    element.onclick = action;
    controls.appendChild(element);
  }
  if (loadError && retryLoad) button(I18N.t('retry'), retryLoad);
  if (sideboardOffset < sideboardEntries.length && !(loadError && retryLoad === loadSideboard)) {
    button(`${I18N.t('loadSideboard')} (${sideboardEntries.length - sideboardOffset})`, loadSideboard);
  }
  renderPagination();
}

function appendCards(cards) {
  allCards.push(...cards);
  applyFilters(false);
  updateSearchTitles();
}

async function loadImportBatch(entries, offset) {
  const batch = entries.slice(offset, offset + 30);
  const data = await CardData.provider().collection(batch, { signal: searchController.signal });
  return batch.map((entry, index) => ({
    ...(data[index] ? CardData.toView(data[index]) : { _notFound: true, name: entry.name }),
    _deck: entry
  }));
}

async function withLoading(action, retry) {
  if (isLoadingCards) return;
  isLoadingCards = true;
  document.getElementById('resultado').setAttribute('aria-busy', 'true');
  loadError = null;
  retryLoad = retry;
  renderLoadControls();
  if (!allCards.length) {
    document.getElementById('resultado').innerHTML = Array.from({ length: 12 }, () => '<div class="card card-skeleton" aria-hidden="true"></div>').join('');
  }
  try { await action(); }
  catch (error) {
    if (!CardData.isAbort(error)) loadError = error;
  } finally {
    isLoadingCards = false;
    document.getElementById('resultado').setAttribute('aria-busy', 'false');
    if (!allCards.length) document.getElementById('resultado').replaceChildren();
    renderLoadControls();
  }
}

async function loadNextCards() {
  if (!hasMoreMain()) return;
  return withLoading(async () => {
    if (importMode) {
      const cards = await loadImportBatch(mainEntries, mainOffset);
      mainOffset += cards.length;
      appendCards(cards);
    } else {
      const result = await CardData.provider().search({ query: typeof Lands !== 'undefined' && Lands.active ? Lands.query() : searchParams.get('name'),
        set: typeof Lands !== 'undefined' && Lands.active ? null : searchParams.get('set'), category: searchParams.get('category'), page: nextRemotePage, signal: searchController.signal });
      nextRemotePage = result.nextPage;
      remoteTotal = result.total;
      const knownIds = new Set(allCards.map(card => card.id));
      appendCards(result.cards.filter(card => !knownIds.has(card.id)).map(CardData.toView));
    }
  }, loadNextCards);
}

async function loadSideboard() {
  return withLoading(async () => {
    const cards = await loadImportBatch(sideboardEntries, sideboardOffset);
    sideboardOffset += cards.length;
    appendCards(cards);
  }, loadSideboard);
}

async function initPokemonSets() {
  const controls = document.createElement('div');
  controls.className = 'lands-controls pokemon-set-controls';
  const status = document.createElement('div');
  status.className = 'pokemon-set-status';
  status.setAttribute('role', 'status');
  const setLabel = document.createElement('label');
  const setText = document.createElement('span');
  setText.dataset.i18n = 'collections'; setText.textContent = I18N.t('collections');
  const setSelect = document.createElement('select');
  setSelect.id = 'pokemonSetFilter';
  setSelect.disabled = true;
  const allOption = new Option(I18N.t('allCollections'), '');
  allOption.dataset.i18n = 'allCollections';
  setSelect.add(allOption);
  if (searchParams.get('set')) setSelect.add(new Option(searchParams.get('set').toUpperCase(), searchParams.get('set')));
  setSelect.value = searchParams.get('set') || '';
  setSelect.onchange = () => {
    const url = new URL(location.href);
    if (setSelect.value) url.searchParams.set('set', setSelect.value);
    else url.searchParams.delete('set');
    location.href = url.href;
  };
  setLabel.append(setText, setSelect); controls.append(setLabel);
  if (!pokemonSetDirectory) {
    const typeLabel = document.createElement('label');
    const typeText = document.createElement('span');
    typeText.dataset.i18n = 'filterByType'; typeText.textContent = I18N.t('filterByType');
    const typeSelect = document.createElement('select');
    typeSelect.id = 'pokemonCategoryFilter';
    for (const [value, key] of [['', 'all'], ['Pokemon', 'pokemonCategory'], ['Trainer', 'trainerCategory'], ['Energy', 'energyCategory']]) {
      const option = new Option(I18N.t(key), value);
      option.dataset.i18n = key;
      typeSelect.add(option);
    }
    typeSelect.value = searchParams.get('category') || '';
    typeSelect.onchange = () => {
      const url = new URL(location.href);
      if (typeSelect.value) url.searchParams.set('category', typeSelect.value);
      else url.searchParams.delete('category');
      location.href = url.href;
    };
    typeLabel.append(typeText, typeSelect); controls.append(typeLabel);
    const browse = document.createElement('a');
    browse.className = 'btn-secondary'; browse.href = gameUrl('card.html');
    browse.dataset.i18n = 'browseSetsCta'; browse.textContent = I18N.t('browseSetsCta');
    controls.append(browse);
  }
  controls.append(status);
  document.getElementById('cardFiltersBar').before(controls);
  let directory;
  let searchInput;
  if (pokemonSetDirectory) {
    document.querySelectorAll('#cardFiltersBar, .pagination-bar, .results-section, #searchLoadControls').forEach(element => { element.hidden = true; });
    const searchLabel = document.createElement('label');
    const searchText = document.createElement('span');
    searchText.dataset.i18n = 'searchCollections'; searchText.textContent = I18N.t('searchCollections');
    searchInput = document.createElement('input');
    searchInput.type = 'search'; searchInput.id = 'pokemonSetSearch';
    searchLabel.append(searchText, searchInput); controls.insertBefore(searchLabel, status);
    directory = document.createElement('div');
    directory.id = 'pokemonSets'; directory.className = 'pokemon-sets-grid popular-sets-grid';
    controls.after(directory);
  }
  async function load() {
    I18N.bind(status, 'loading');
    try {
      const sets = await CardData.provider().sets();
      setSelect.replaceChildren(allOption);
      for (const set of sets) {
        const option = new Option(`${set.name} (${set.code.toUpperCase()})`, set.code);
        option.dataset.name = set.name; setSelect.add(option);
      }
      const selected = searchParams.get('set');
      if (selected && !sets.some(set => set.code === selected)) setSelect.add(new Option(selected.toUpperCase(), selected));
      setSelect.value = selected || ''; setSelect.disabled = false;
      delete status.dataset.i18n;
      status.replaceChildren();
      if (directory) {
        const render = () => {
          const query = searchInput.value.trim().toLocaleLowerCase();
          const filtered = sets.filter(set => `${set.name} ${set.code}`.toLocaleLowerCase().includes(query));
          directory.replaceChildren();
          for (const set of filtered) {
            const link = document.createElement('a'); link.className = 'popular-set-card'; link.href = gameUrl('card.html', { set: set.code });
            const info = document.createElement('span'); info.className = 'popular-set-info';
            const title = document.createElement('h4'); title.textContent = set.name;
            info.append(title); link.append(createSetSymbol(set), info); directory.append(link);
          }
          if (!filtered.length) directory.textContent = I18N.t('noCollectionsFound');
        };
        searchInput.oninput = render; render();
        window.addEventListener('languageChanged', render);
      }
      updateSearchTitles();
    } catch (error) {
      delete status.dataset.i18n;
      const message = document.createElement('span');
      I18N.bind(message, error.code || 'sourceUnavailable');
      status.replaceChildren(message);
      const retry = document.createElement('button');
      retry.type = 'button'; retry.className = 'btn-secondary'; I18N.bind(retry, 'retry'); retry.onclick = load;
      status.append(retry);
    }
  }
  await load();
}

async function initSearch() {
  initLayout();
  updateSearchTitles();
  if (importMode) {
    try {
      const stored = AppStorage.session.readJSON('fileCards', null);
      if (!stored) throw new Error('emptyImport');
      const deck = DeckImport.readStored(stored);
      mainEntries = deck.entries.filter(entry => entry.section !== 'sideboard');
      sideboardEntries = deck.entries.filter(entry => entry.section === 'sideboard');
    } catch (error) { loadError = error; renderLoadControls(); return; }
  }
  if (typeof Lands !== 'undefined') Lands.init();
  if (CardData.game === 'pokemon') {
    document.querySelectorAll('.filter-dropdown:not(:first-child), .filters-mobile-btn').forEach(element => { element.hidden = true; });
    if (!importMode) await initPokemonSets();
  }
  if (pokemonSetDirectory) return;
  renderLoadControls();
  await loadNextCards();
  if (!allCards.length) document.getElementById('resultado').replaceChildren();
}

window.addEventListener('pagehide', () => { searchController.abort(); localizationController?.abort(); priceController?.abort(); });
window.addEventListener('pageshow', event => {
  if (!event.persisted) return;
  searchController = new AbortController();
  renderPage();
  renderLoadControls();
  if (!pokemonSetDirectory && !allCards.length && hasMoreMain()) void loadNextCards();
});
// Scripts live at the end of body; waiting also lets common.js initialize stores.
document.addEventListener('DOMContentLoaded', initSearch);
