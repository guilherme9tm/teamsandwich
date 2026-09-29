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

function hasMoreMain() {
  return importMode ? mainOffset < mainEntries.length : nextRemotePage !== null;
}

function renderLoadControls() {
  const controls = document.getElementById('searchLoadControls');
  if (!controls) return;
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
  else if (hasMoreMain()) button(I18N.t('loadMoreResults'), loadNextCards);
  if (sideboardOffset < sideboardEntries.length && !(loadError && retryLoad === loadSideboard)) {
    button(`${I18N.t('loadSideboard')} (${sideboardEntries.length - sideboardOffset})`, loadSideboard);
  }
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
  loadError = null;
  retryLoad = retry;
  renderLoadControls();
  try { await action(); }
  catch (error) {
    if (!CardData.isAbort(error)) loadError = error;
  } finally {
    isLoadingCards = false;
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
      const result = await CardData.provider().search({ query: searchParams.get('name'),
        set: searchParams.get('set'), page: nextRemotePage, signal: searchController.signal });
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
  } else if (!searchParams.has('name') && !searchParams.has('set')) {
    nextRemotePage = null;
    return;
  }
  renderLoadControls();
  await loadNextCards();
}

window.addEventListener('pagehide', () => { searchController.abort(); localizationController?.abort(); });
window.addEventListener('pageshow', event => {
  if (!event.persisted) return;
  searchController = new AbortController();
  renderPage();
  renderLoadControls();
  if (!allCards.length && hasMoreMain()) void loadNextCards();
});
// Scripts live at the end of body; waiting also lets common.js initialize stores.
document.addEventListener('DOMContentLoaded', initSearch);
