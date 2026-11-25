
const CHEVRON_DOWN_SVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
const CHEVRON_UP_SVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg>`;

function toggleCard(btn) {
  const card = btn.closest(".card");
  if (!card) return;
  const extra = card.querySelector(".card-extra");
  if (!extra) return;

  if (extra.style.display === "block") {
    extra.style.display = "none";
    btn.classList.remove("active");
    btn.innerHTML = CHEVRON_DOWN_SVG;
  } else {
    extra.style.display = "block";
    btn.classList.add("active");
    btn.innerHTML = CHEVRON_UP_SVG;
  }
}

function renderCardElement(cardData, selected = getSelected(false)) {
  const n = encodeURIComponent(cardData.name);
  const cardDetailUrl = gameUrl('card-detail.html', { id: cardData.id || '', name: cardData.name });
  const cardIdAttr = cardData.id || cardData.name;

  const currentLang = 'en';
  let img = getCardImageUrl(cardData, currentLang);

  const price = CardPrices.main(cardData);
  const cad = CardPrices.format(price, I18N.current) || I18N.t('priceUnavailable');

  const card = document.createElement("div");
  card.className = "card";
  card.dataset.printingId = cardData.id;

  if (img) {
    card.innerHTML += `<a href="${cardDetailUrl}" class="card-img-link" title="${escapeHTML(cardData.name)}"><img src="${escapeHTML(img)}" alt="${escapeHTML(cardData.name)}" data-card-id="${escapeHTML(cardIdAttr)}" loading="lazy" decoding="async"></a>`;
  } else {
    card.innerHTML += `<a href="${cardDetailUrl}" class="card-img-link"><span class="card-image-placeholder">${I18N.t('imageUnavailable')}</span></a>`;
  }

  card.innerHTML += `
    <div class="card-copy">
    <a href="${cardDetailUrl}" class="card-title-link" title="${escapeHTML(cardData.name)}"><strong>${escapeHTML(cardData.name)}</strong></a>
    ${cardData._deck ? `<span class="deck-card-badge">${cardData._deck.quantity} × · ${I18N.t(cardData._deck.section === 'sideboard' ? 'sideboard' : 'mainDeck')}</span>` : ''}
    <em class="card-price">${cad}</em>
    <small class="card-edition" title="${escapeHTML(cardData.set_name || cardData.set || '')}">${escapeHTML(cardData.set_name || cardData.set || '')} · #${escapeHTML(cardData.collector_number || '')}</small>
    <div class="card-actions-row">
      <a href="${cardDetailUrl}" class="btn-card-detail">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        ${I18N.t('cardDetailsBtn')}
      </a>
      <button class="toggle-btn" onclick="toggleCard(this)" title="${I18N.t('quickPreviewTooltip')}">
        ${CHEVRON_DOWN_SVG}
      </button>
    </div>
    </div>
  `;

  const extra = document.createElement("div");
  extra.className = "card-extra";

  const links = document.createElement("div");
  links.className = "links-container";

  const c1 = document.createElement("div");
  const c2 = document.createElement("div");
  c1.className = c2.className = "links-column";

  let i = 0;
  (CardData.game === 'mtg' ? sites : sites.filter(site => site.id === 'tcgplayer')).forEach(site => {
    if (!selected.includes(site.id)) return;
    const a = document.createElement("a");
    a.href = site.link(n);
    a.target = "_blank";
    a.rel = 'noopener noreferrer';
    a.title = `${I18N.t('searchAtStore')} ${site.nome}`;
    a.setAttribute('aria-label', a.title);
    const im = document.createElement("img");
    im.src = site.logo;
    im.alt = site.nome;
    im.loading = 'lazy';
    im.onerror = function() { this.style.display = 'none'; };
    a.appendChild(im);
    (i++ % 2 === 0 ? c1 : c2).appendChild(a);
  });

  links.appendChild(c1);
  links.appendChild(c2);
  extra.appendChild(links);
  card.appendChild(extra);

  return card;
}

const localizedCardCache = new Map();
let localizationController = null;
let priceController = null;

async function enrichVisiblePrices(cards) {
  priceController?.abort();
  if (CardData.game !== 'pokemon') return;
  const controller = new AbortController(); priceController = controller;
  const pending = cards.filter(card => !card._notFound && !card.metadata?.detailed);
  let next = 0;
  async function worker() {
    while (!controller.signal.aborted && next < pending.length) {
      const card = pending[next++];
      try {
        const full = CardData.toView(await CardData.provider('pokemon').get(card.id, { signal: controller.signal }));
        if (controller.signal.aborted) return;
        full.metadata.detailed = true;
        Object.assign(card, full);
        document.querySelectorAll('.card[data-printing-id]').forEach(element => {
          if (element.dataset.printingId !== card.id) return;
          element.querySelector('.card-price').textContent = CardPrices.format(CardPrices.main(card), I18N.current) || I18N.t('priceUnavailable');
          const edition = element.querySelector('.card-edition'); edition.textContent = `${card.set_name || card.set} · #${card.collector_number}`; edition.title = card.set_name || card.set;
        });
      } catch (error) { if (controller.signal.aborted || error.status === 429) return; }
    }
  }
  await Promise.all([worker(), worker()]);
}

async function fetchLocalizedCardData(card, lang, signal) {
  const key = `${card.id}_${lang}`;
  if (localizedCardCache.has(key)) return localizedCardCache.get(key);
  const localized = await CardData.provider(card.game).localized(card, lang, { signal });
  const view = localized ? CardData.toView(localized) : null;
  localizedCardCache.set(key, view);
  return view;
}

function getCardImageUrl(cardData, lang) {
  if (!cardData || cardData._notFound) return '';

  if (lang && lang !== 'en') {
    const key = `${cardData.id || cardData.name}_${lang}`;
    const locCard = localizedCardCache.get(key);
    if (locCard) {
      let locImg = locCard.image_uris?.normal || locCard.card_faces?.[0]?.image_uris?.normal || locCard.image_uris?.small || locCard.card_faces?.[0]?.image_uris?.small;
      if (locImg) return locImg.split('?')[0];
    }
  }

  let img = cardData.image_uris?.normal || cardData.card_faces?.[0]?.image_uris?.normal || cardData.image_uris?.small || cardData.card_faces?.[0]?.image_uris?.small;
  if (img) img = img.split('?')[0];
  return img || '';
}

let allCards = [];
let filteredCards = [];
let currentPage = 1;
let perPage = 15;

let activeSort = null; 
let activeRarityFilters = [];
let activeColorFilters = [];
let activeTypeFilters = [];

let currentLayout = ['auto', 'grid-2', 'grid-list'].includes(AppStorage.local.getItem('gridLayout')) ? AppStorage.local.getItem('gridLayout') : 'auto';

function changePerPage(value) {
  if (value === 'all') {
    perPage = filteredCards.length || 9999;
  } else {
    perPage = parseInt(value, 10);
  }
  currentPage = 1;
  renderPage();
  renderPagination();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function goToPage(page) {
  if (page > Math.ceil(filteredCards.length / perPage) && hasMoreMain()) {
    if (isLoadingCards) return;
    await loadNextCards();
  }
  const totalPages = Math.ceil(filteredCards.length / perPage);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderPage();
  renderPagination();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderPage() {
  localizationController?.abort();
  const container = document.getElementById("resultado");
  container.innerHTML = "";

  if (filteredCards.length === 0 && allCards.length > 0) {
    container.innerHTML = `
      <div class="no-filter-results">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
        <p data-i18n="noFilterResults">${I18N.t('noFilterResults')}</p>
      </div>
    `;
    return;
  }

  const start = (currentPage - 1) * perPage;
  const end = Math.min(start + perPage, filteredCards.length);
  const pageCards = filteredCards.slice(start, end);
  const selected = getSelected(false);

  pageCards.forEach(cardData => {
    if (cardData._notFound) {
      const errDiv = document.createElement("div");
      errDiv.className = "card card-not-found";
      errDiv.innerHTML = `<p>${I18N.t('cardNotFound')} ${escapeHTML(cardData.name)}</p>${cardData._deck ? `<span class="deck-card-badge">${cardData._deck.quantity} × · ${I18N.t(cardData._deck.section === 'sideboard' ? 'sideboard' : 'mainDeck')}</span>` : ''}`;
      container.appendChild(errDiv);
    } else {
      container.appendChild(renderCardElement(cardData, selected));
    }
  });

  void enrichVisiblePrices(pageCards);

}

async function loadLocalizedImagesForPage(pageCards) {
  const lang = I18N.current;
  if (lang === 'en') return;
  const controller = new AbortController();
  localizationController = controller;
  // Let essential results paint before starting optional language requests.
  await new Promise(resolve => setTimeout(resolve, 150));
  const entries = pageCards.filter(card => card && !card._notFound);
  let next = 0;
  async function worker() {
    while (!controller.signal.aborted && next < entries.length) {
      const card = entries[next++];
      try {
        await fetchLocalizedCardData(card, lang, controller.signal);
        if (controller.signal.aborted || I18N.current !== lang) return;
        const url = getCardImageUrl(card, lang);
        document.querySelectorAll('img[data-card-id]').forEach(image => {
          if (image.dataset.cardId === card.id && url) image.src = url;
        });
      } catch (error) {
        // An optional translation must never hide the card or keep an obsolete page loading.
        if (CardData.isAbort(error) || error.status === 429) return;
      }
    }
  }
  await Promise.all([worker(), worker()]);
}

function renderPagination() {
  const totalPages = Math.ceil(filteredCards.length / perPage);
  const moreAvailable = hasMoreMain() && !pokemonSetDirectory;
  const navTop = document.getElementById("pageNav");
  const navBottom = document.getElementById("pageNavBottom");
  const paginationBar = document.getElementById("paginationBar");
  const paginationBarBottom = document.getElementById("paginationBarBottom");

  if (totalPages <= 1 && !moreAvailable) {
    if (paginationBarBottom) paginationBarBottom.style.display = "none";
    if (navTop) navTop.innerHTML = `<span class="page-info">${filteredCards.length} ${I18N.t('cardsFoundCount')}</span>`;
    if (navBottom) navBottom.replaceChildren();
    return;
  }

  if (paginationBarBottom) paginationBarBottom.style.display = "flex";

  const buildNav = (navEl) => {
    if (!navEl) return;
    navEl.innerHTML = "";

    const prevBtn = document.createElement("button");
    prevBtn.className = "page-btn arrow-btn";
    prevBtn.textContent = "‹";
    prevBtn.setAttribute('aria-label', I18N.t('previousPage'));
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => goToPage(currentPage - 1);
    navEl.appendChild(prevBtn);

    const maxVisible = 7;
    let pages = [];

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);

      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    pages.forEach(p => {
      if (p === '...') {
        const ellipsis = document.createElement("span");
        ellipsis.className = "page-ellipsis";
        ellipsis.textContent = "…";
        navEl.appendChild(ellipsis);
      } else {
        const btn = document.createElement("button");
        btn.className = `page-btn${p === currentPage ? ' active' : ''}`;
        btn.textContent = p;
        btn.onclick = () => goToPage(p);
        navEl.appendChild(btn);
      }
    });

    const nextBtn = document.createElement("button");
    nextBtn.className = "page-btn arrow-btn";
    nextBtn.textContent = "›";
    nextBtn.setAttribute('aria-label', I18N.t('nextPage'));
    nextBtn.disabled = currentPage >= totalPages && (!moreAvailable || isLoadingCards);
    nextBtn.onclick = () => goToPage(currentPage + 1);
    navEl.appendChild(nextBtn);

    const info = document.createElement("span");
    info.className = "page-info";
    const from = (currentPage - 1) * perPage + 1;
    const to = Math.min(currentPage * perPage, filteredCards.length);
    info.textContent = `${from}–${to} ${I18N.t('pageFromTo')} ${filteredCards.length}`;
    navEl.appendChild(info);
  };

  buildNav(navTop);
  buildNav(navBottom);
}

function getCardPrice(card) {
  return parseFloat(card.prices?.usd) || parseFloat(card.prices?.usd_foil) || 0;
}

function getCardColors(card) {
  const colors = card.colors || card.color_identity || [];
  if (card.card_faces && card.card_faces.length > 0) {
    const faceColors = [];
    card.card_faces.forEach(face => {
      if (face.colors) faceColors.push(...face.colors);
    });
    if (faceColors.length > 0) return [...new Set(faceColors)];
  }
  return colors;
}

function getCardTypeLine(card) {
  return card.type_line || (card.card_faces && card.card_faces[0] ? card.card_faces[0].type_line : '') || '';
}

function applyFilters(resetPage = true) {
  let result = [...allCards].filter(c => !c._notFound);
  if (typeof Lands !== 'undefined') result = result.filter(Lands.matches);
  const notFound = allCards.filter(c => c._notFound);

  if (activeRarityFilters.length > 0) {
    result = result.filter(card => activeRarityFilters.includes(card.rarity));
  }

  if (activeColorFilters.length > 0) {
    result = result.filter(card => {
      const cardColors = getCardColors(card);

      if (activeColorFilters.includes('C')) {
        if (cardColors.length === 0) return true;
      }

      if (activeColorFilters.includes('M')) {
        if (cardColors.length > 1) return true;
      }

      const specificColors = activeColorFilters.filter(c => !['C', 'M'].includes(c));
      if (specificColors.length > 0) {
        if (specificColors.some(c => cardColors.includes(c))) return true;
      }

      if (specificColors.length === 0) return false;

      return false;
    });
  }

  if (activeTypeFilters.length > 0) {
    result = result.filter(card => {
      const typeLine = getCardTypeLine(card).toLowerCase();
      return activeTypeFilters.some(type => typeLine.includes(type.toLowerCase()));
    });
  }

  if (activeSort === 'alpha') {
    result.sort((a, b) => a.name.localeCompare(b.name));
  } else if (activeSort === 'price-asc') {
    result.sort((a, b) => (CardPrices.main(a)?.value ?? Infinity) - (CardPrices.main(b)?.value ?? Infinity));
  } else if (activeSort === 'price-desc') {
    result.sort((a, b) => (CardPrices.main(b)?.value ?? -Infinity) - (CardPrices.main(a)?.value ?? -Infinity));
  }

  filteredCards = [...result, ...notFound];
  if (resetPage) currentPage = 1;
  if (document.getElementById('perPageSelect')?.value === 'all') perPage = filteredCards.length || 15;
  currentPage = Math.min(currentPage, Math.max(1, Math.ceil(filteredCards.length / perPage)));
  renderPage();
  renderPagination();
  updateFilterUI();
}

function updateFilters() {
  
  activeRarityFilters = [];
  activeColorFilters = [];
  activeTypeFilters = [];

  document.querySelectorAll('#filterRarity .filter-checkbox input:checked, #filterDrawer .filter-drawer-section:nth-child(2) .filter-checkbox input:checked').forEach(cb => {
    if (!activeRarityFilters.includes(cb.value)) activeRarityFilters.push(cb.value);
  });

  document.querySelectorAll('#filterColor .filter-checkbox input:checked, #filterDrawer .filter-drawer-section:nth-child(3) .filter-checkbox input:checked').forEach(cb => {
    if (!activeColorFilters.includes(cb.value)) activeColorFilters.push(cb.value);
  });

  document.querySelectorAll('#filterType .filter-checkbox input:checked, #filterDrawer .filter-drawer-section:nth-child(4) .filter-checkbox input:checked').forEach(cb => {
    if (!activeTypeFilters.includes(cb.value)) activeTypeFilters.push(cb.value);
  });

  applyFilters();
}

function setFilterSort(sortType) {
  if (activeSort === sortType) {
    activeSort = null;
  } else {
    activeSort = sortType;
  }

  document.querySelectorAll('#filterPrice .filter-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === activeSort);
  });

  document.querySelectorAll('#filterDrawer .filter-drawer-chip').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === activeSort);
  });

  applyFilters();
}

function clearAllFilters() {
  activeSort = null;
  activeRarityFilters = [];
  activeColorFilters = [];
  activeTypeFilters = [];

  document.querySelectorAll('.filter-checkbox input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
  });

  document.querySelectorAll('.filter-option, .filter-drawer-chip').forEach(btn => {
    btn.classList.remove('active');
  });

  applyFilters();
}

function updateFilterUI() {
  const totalActive = activeRarityFilters.length + activeColorFilters.length + activeTypeFilters.length + (activeSort ? 1 : 0);

  const clearBtn = document.getElementById('filterClearBtn');
  if (clearBtn) clearBtn.style.display = totalActive > 0 ? 'flex' : 'none';

  const badge = document.getElementById('filterBadge');
  if (badge) {
    badge.style.display = totalActive > 0 ? 'inline-flex' : 'none';
    badge.textContent = totalActive;
  }

  const strip = document.getElementById('activeFiltersStrip');
  const text = document.getElementById('activeFiltersText');
  if (strip && text) {
    if (totalActive > 0) {
      strip.style.display = 'flex';
      text.textContent = `${totalActive} ${I18N.t('activeFilters')}`;
    } else {
      strip.style.display = 'none';
    }
  }

  document.querySelectorAll('.filter-dropdown').forEach(dd => {
    const hasActive = dd.querySelector('.filter-checkbox input:checked') || dd.querySelector('.filter-option.active');
    dd.querySelector('.filter-dropdown-btn').classList.toggle('has-active', !!hasActive);
  });
}

function toggleFilterDropdown(id) {
  const dropdown = document.getElementById(id);
  if (!dropdown) return;

  const wasOpen = dropdown.classList.contains('open');

  document.querySelectorAll('.filter-dropdown.open').forEach(dd => {
    dd.classList.remove('open');
  });

  if (!wasOpen) {
    dropdown.classList.add('open');
  }
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.filter-dropdown')) {
    document.querySelectorAll('.filter-dropdown.open').forEach(dd => {
      dd.classList.remove('open');
    });
  }
});

function openFilterDrawer() {
  const drawer = document.getElementById('filterDrawer');
  const overlay = document.getElementById('filterDrawerOverlay');
  if (drawer) drawer.classList.add('open');
  if (overlay) overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeFilterDrawer() {
  const drawer = document.getElementById('filterDrawer');
  const overlay = document.getElementById('filterDrawerOverlay');
  if (drawer) drawer.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

function setGridLayout(layout) {
  currentLayout = layout;
  AppStorage.local.setItem('gridLayout', layout);

  const grid = document.getElementById('resultado');
  if (!grid) return;

  grid.classList.remove('grid-2', 'grid-list');

  if (layout !== 'auto') {
    grid.classList.add(layout);
  }

  document.querySelectorAll('.layout-toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.layout === layout);
  });
}

function initLayout() {
  setGridLayout(currentLayout);
}

function updateSearchTitles() {
  const pageTitle = document.querySelector('title');
  I18N.bind(pageTitle, typeof Lands !== 'undefined' && Lands.active ? 'landsPageTitle' : 'catalogPageTitle');
  const params = new URLSearchParams(window.location.search);
  const titleEl = document.getElementById("searchTitle");
  const subtitleEl = document.getElementById("searchSubtitle");
  if (!titleEl || !subtitleEl) return;

  const validCards = allCards.filter(c => !c._notFound);

  if (typeof pokemonSetDirectory !== 'undefined' && pokemonSetDirectory) {
    titleEl.textContent = I18N.t('allCollections');
    subtitleEl.textContent = I18N.t('browseSetsCta');
  } else if (params.has("name")) {
    titleEl.textContent = params.get("name");
    subtitleEl.textContent = `${validCards.length} ${I18N.t('cardsFoundCount')}`;
  } else if (params.get("source") === "file") {
    titleEl.textContent = I18N.t('fileImportTitle');
    subtitleEl.textContent = `${validCards.length} ${I18N.t('cardsLoadedCount')}`;
  } else if (params.has("set")) {
    const code = params.get("set");
    const setName = document.getElementById('pokemonSetFilter')?.selectedOptions[0]?.dataset.name;
    titleEl.textContent = `${I18N.t('setCollectionTitle')} ${setName || code.toUpperCase()}`;
    subtitleEl.textContent = `${validCards.length} ${I18N.t('cardsLoadedCount')}`;
  } else {
    titleEl.textContent = typeof Lands !== 'undefined' && Lands.active ? I18N.t('lands') : I18N.t('noSearchTitle');
    subtitleEl.textContent = I18N.t('noSearchSubtitle');
  }
}

window.addEventListener('languageChanged', () => {
  renderPage();
  renderPagination();
  updateFilterUI();
  updateSearchTitles();
  renderLoadControls();
});

window.addEventListener('pricesChanged', () => { if (allCards.length) renderPage(); });
