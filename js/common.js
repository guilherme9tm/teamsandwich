
function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

const sites = [
  { id: 'facetoface', nome: 'Face to Face', link: n => `https://facetofacegames.com/search?q=${n}`, logo: 'https://facetofacegames.com/cdn/shop/files/wide-f2f-EN-white-logo.png?v=1784296074&width=255' },
  { id: 'levalet', nome: 'Levalet', link: n => `https://levalet.crystalcommerce.com/products/search?q=${n}&c=1`, logo: 'https://cc-client-assets.nyc3.cdn.digitaloceanspaces.com/store/levalet/13b0d4f01acb11e9a8aac9b93f52c525/large/logolevalet.png' },
  { id: 'secretdesk', nome: 'Secret Desk', link: n => `https://www.lesecretdeskorrigans.com/products/search?q=${n}`, logo: 'https://cc-client-assets.nyc3.cdn.digitaloceanspaces.com/store/lesecretdeskorrigans/d6c705a0588d40bcad29108b0f9fda1b/medium/logolesecretfavi.png' },
  { id: 'cardhoarder', nome: 'Cardhoarder', link: n => `https://www.cardhoarder.com/cards?cardname=${n}`, logo: 'https://cdn.shopify.com/s/files/1/1781/6359/files/nav-logo.png?height=628&pad_color=fff&v=1613525588&width=1200' },
  { id: 'gamekeeper', nome: 'Gamekeeper', link: n => `https://www.gamekeeperonline.com/products/search?q=${n}`, logo: 'https://cc-client-assets.nyc3.cdn.digitaloceanspaces.com/photo/gamekeeperonline/file/768163/logo-2017.png?1508604932' },
  { id: 'expedition', nome: 'Expedition', link: n => `https://www.expeditionjeux.com/products/search?q=${n}`, logo: 'https://cc-client-assets.nyc3.cdn.digitaloceanspaces.com/store/expeditionjeux/26105d544a1449c7b3d28a192b99b961/large/expedition_logo_long.png' },
  { id: 'tcgplayer', nome: 'TCGPlayer', link: n => `https://www.tcgplayer.com/search/magic/product?q=${n}`, logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRwc05VHb_4Y30nHRhc-thfIAdqVAN19LqSgQ&s' },
  { id: 'mtgtop8', nome: 'MTGTop8', link: n => `https://www.mtgtop8.com/search.php?cards=${n}`, logo: 'https://mtgtop8.com/graph/title.png' },
  { id: 'silvergoblin', nome: 'Silver Goblin', link: n => `https://silvergoblin.cards/search?q=${n}&options%5Bprefix%5D=last`, logo: 'https://silvergoblin.cards/cdn/shop/files/Homepage_logo_5f1b015e-ccda-4e73-8c97-9259e49ab786.png?v=1741746772&width=1500' },
  { id: 'altf4', nome: 'Alt F4', link: n => `https://altf4online.com/search?options%5Bprefix%5D=last&q=${n}`, logo: 'https://altf4online.com/cdn/shop/files/altf4_altf4-logo-color-web.png?v=1734379537&width=270' },
  { id: 'threekings', nome: 'Three Kings Loot', link: n => `https://www.threekingsloot.com/products/search?q=${n}`, logo: 'https://bluedefault.crystalcommerce.com/themes/clients/threekingsloot/assets/img/logo.png?1415786210' },
  { id: 'mythicstore', nome: 'Boutique Mythic', link: n => `https://themythicstore.com/a/search?q=${n}`, logo: 'https://cdn.shopify.com/s/files/1/0360/6895/0061/files/Social_Media_Share_TMS.png?v=1714682307' },
  { id: 'wizardtower', nome: 'Wizard Tower', link: n => `https://store.wizardtower.com/search?q=${n}&options%5Bprefix%5D=last`, logo: 'https://store.wizardtower.com/cdn/shop/files/Long-Wt.png?v=1758040051&width=270' },
  { id: 'chezgeeks', nome: 'Chez Geeks', link: n => `https://www.chezgeeks.com/products/search?q=${n}`, logo: 'https://cc-client-assets.nyc3.cdn.digitaloceanspaces.com/photo/chezgeeks/file/30f1d741378c4f31909b23ade89a46ae/Chez%20Geeks%20LOGO%20scaled.png' }
];

function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const params = new URLSearchParams(window.location.search);
  const activeFormat = params.get('format') || 'all';

  sidebar.innerHTML = `
    <div class="sidebar-drawer-header">
      <button class="sidebar-close-btn" onclick="closeSidebarDrawer()" aria-label="Fermer le menu">
        &times;
      </button>
    </div>

    <div class="sidebar-mobile-actions">
      <div class="sidebar-mobile-lang">
        <label class="sidebar-field-label" data-i18n="languageLabel">Langue / Language</label>
        <select class="sidebar-lang-select" aria-label="Language" onchange="I18N.setLang(this.value)">
          <option value="fr">FR</option>
          <option value="en">EN</option>
        </select>
      </div>
      <div class="sidebar-mobile-auth" id="sidebarUserActions"></div>
    </div>

    <div class="sidebar-menu">
      <div class="sidebar-section" id="sectionFormats">
        <div class="sidebar-section-header" onclick="toggleSection('sectionFormats')">
          <span class="sec-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.56,20.17A5.75,5.75,0,0,1,15,15.39V14a1,1,0,0,0-.55-.89l-2-1a1,1,0,0,0-.9,0l-2,1A1,1,0,0,0,9,14v1.42a5.75,5.75,0,0,1-2.56,4.78A1,1,0,0,0,7,22H17a1,1,0,0,0,.56-1.83Z" fill="currentColor"/><path d="M18,22H6a1,1,0,0,1,0-2H18a1,1,0,0,1,0,2ZM19.45,7.28a1,1,0,0,0-.81-.69l-4-.56L12.89,2.55a1,1,0,0,0-1.78,0L9.34,6l-4,.56a1,1,0,0,0-.81.69,1,1,0,0,0,.26,1L7.67,11,7,14.83a1,1,0,0,0,.39,1,1,1,0,0,0,1,.09L12,14.07l3.56,1.82A1.07,1.07,0,0,0,16,16a1,1,0,0,0,1-1.17L16.33,11l2.86-2.7A1,1,0,0,0,19.45,7.28Z" fill="var(--accent)"/></svg></span>
          <span class="sec-title" data-i18n="formats">Formats de jeu</span>
          <span class="sec-arrow">▼</span>
        </div>
        <div class="sidebar-section-content">
          <ul class="format-links">
            <li class="${activeFormat === 'all' ? 'active' : ''}" data-format="all" onclick="handleMenuFormatClick('all',event)"><span class="format-dot"></span><span data-i18n="all">Toutes</span></li>
            <li class="${activeFormat === 'standard' ? 'active' : ''}" data-format="standard" onclick="handleMenuFormatClick('standard',event)"><span class="format-dot"></span><span>Standard</span></li>
            <li class="${activeFormat === 'pioneer' ? 'active' : ''}" data-format="pioneer" onclick="handleMenuFormatClick('pioneer',event)"><span class="format-dot"></span><span>Pioneer</span></li>
            <li class="${activeFormat === 'modern' ? 'active' : ''}" data-format="modern" onclick="handleMenuFormatClick('modern',event)"><span class="format-dot"></span><span>Modern</span></li>
            <li class="${activeFormat === 'commander' ? 'active' : ''}" data-format="commander" onclick="handleMenuFormatClick('commander',event)"><span class="format-dot"></span><span>Commander (EDH)</span></li>
          </ul>
        </div>
      </div>

      <div class="sidebar-section" id="sectionImport">
        <div class="sidebar-section-header" onclick="toggleSection('sectionImport')">
          <span class="sec-icon"><svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 1H5L8 3H13V5H3.7457L2.03141 11H4.11144L5.2543 7H16L14 14H0V1Z" fill="var(--accent)"/></svg></span>
          <span class="sec-title" data-i18n="importTitle">Importer un fichier</span>
          <span class="sec-arrow">▼</span>
        </div>
        <div class="sidebar-section-content">
          <div class="menu-section-body">
            <input type="file" id="arquivoInput" accept=".txt" onchange="handleFileSelected(event)">
            <button class="btn-primary" onclick="processarArquivo()" data-i18n="processFile">Traiter le fichier</button>
          </div>
        </div>
      </div>

      <div class="sidebar-section" id="sectionStores">
        <div class="sidebar-section-header" onclick="toggleSection('sectionStores')">
          <span class="sec-icon"><svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none"><g id="shop"><path fill="none" stroke="var(--accent)" stroke-linecap="square" stroke-miterlimit="10" stroke-width="1.91" d="M7.23,6.27v5.25a2.39,2.39,0,0,1-4.78,0L4.36,6.27Z"></path><path fill="none" stroke="var(--accent)" stroke-linecap="square" stroke-miterlimit="10" stroke-width="1.91" d="M12,6.27v5.25a2.39,2.39,0,1,1-4.77,0V6.27Z"></path><path fill="none" stroke="var(--accent)" stroke-linecap="square" stroke-miterlimit="10" stroke-width="1.91" d="M16.77,6.27v5.25a2.39,2.39,0,1,1-4.77,0V6.27Z"></path><path fill="none" stroke="var(--accent)" stroke-linecap="square" stroke-miterlimit="10" stroke-width="1.91" d="M21.55,11.52a2.39,2.39,0,0,1-4.78,0V6.27h2.87Z"></path><path fill="none" stroke="var(--accent)" stroke-linecap="square" stroke-miterlimit="10" stroke-width="1.91" d="M19.64,13.91V22.5H4.36V13.91h.48a2.39,2.39,0,0,0,2.39-2.39,2.39,2.39,0,1,0,4.77,0,2.39,2.39,0,1,0,4.77,0,2.39,2.39,0,0,0,2.39,2.39Z"></path><polyline fill="none" stroke="var(--accent)" stroke-linecap="square" stroke-miterlimit="10" stroke-width="1.91" points="1.5 22.5 4.36 22.5 19.64 22.5 22.5 22.5"></polyline><rect fill="none" stroke="var(--accent)" stroke-linecap="square" stroke-miterlimit="10" stroke-width="1.91" x="6.27" y="1.5" width="11.45" height="4.77"></rect><rect fill="none" stroke="var(--accent)" stroke-linecap="square" stroke-miterlimit="10" stroke-width="1.91" x="8.18" y="17.73" width="7.64" height="4.77"></rect></g></svg></span>
          <span class="sec-title" data-i18n="stores">Magasins</span>
          <span class="sec-arrow">▼</span>
        </div>
        <div class="sidebar-section-content">
          <div class="menu-section-body" id="storeList"></div>
        </div>
      </div>

      <div class="sidebar-section" id="sectionCollections">
        <div class="sidebar-section-header" onclick="toggleSection('sectionCollections')">
          <span class="sec-icon"><svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="shop-box"><path d="M7 1H4L1 6V15H15V6L12 1H9V6H7V1Z" fill="var(--accent)"></path></g></svg></span>
          <span class="sec-title" data-i18n="collections">Collections</span>
          <span class="sec-arrow">▼</span>
        </div>
        <div class="sidebar-section-content">
          <div class="menu-set-list" id="setList"></div>
        </div>
      </div>
    </div>
  `;
}

function handleMenuFormatClick(fmt, event) {
  if (event) event.preventDefault();
  closeSidebarDrawer();
  selectFormat(fmt, event);
}

function handleFileSelected(event) {
  const input = event.target;
  if (input && input.files.length) {
    const fileName = input.files[0].name;
    const btn = input.nextElementSibling;
    if (btn) btn.textContent = `Traiter "${fileName}"`;
  }
}

async function processarArquivo() {
  const arquivoInput = document.getElementById('arquivoInput');
  if (!arquivoInput || !arquivoInput.files || !arquivoInput.files.length) {
    alert(typeof I18N !== 'undefined' ? I18N.t('filePrompt') : 'Veuillez choisir un fichier TXT');
    return;
  }

  try {
    const file = arquivoInput.files[0];
    if (file.size > 256000) throw new Error('importTooLarge');
    const deck = DeckImport.parse(await file.text());
    if (deck.entries.length === 0) {
      alert(I18N.t('emptyImport'));
      return;
    }
    if (!AppStorage.session.setItem('fileCards', JSON.stringify(deck))) {
      alert(I18N.t('importStorageUnavailable'));
      return;
    }
    if (deck.warnings.length) alert(`${I18N.t('importSkippedLines')} ${deck.warnings.join(', ')}`);
    closeSidebarDrawer();
    window.location.href = "card.html?source=file";
  } catch (err) {
    console.error("Erreur lors de la lecture du fichier:", err);
    alert(I18N.t(err.message === 'importTooLarge' ? 'importTooLarge' : 'invalidImport'));
  }
}

function initSidebar() {

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSidebarDrawer();
    }
  });
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  if (sidebar.classList.contains('open') || sidebar.classList.contains('mobile-open')) {
    closeSidebarDrawer();
  } else {
    openSidebarDrawer();
  }
}

function toggleSidebarMobile() {
  toggleSidebar();
}

function openSidebarDrawer() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('menuOverlay');
  const btn = document.getElementById('hamburgerBtn');
  if (!sidebar) return;

  sidebar.classList.remove('collapsed');
  sidebar.classList.add('open');
  sidebar.classList.add('mobile-open');
  if (overlay) overlay.classList.add('open');
  if (btn) btn.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSidebarDrawer() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('menuOverlay');
  const btn = document.getElementById('hamburgerBtn');
  if (!sidebar) return;

  sidebar.classList.add('collapsed');
  sidebar.classList.remove('open');
  sidebar.classList.remove('mobile-open');
  if (overlay) overlay.classList.remove('open');
  if (btn) btn.classList.remove('active');
  document.body.style.overflow = '';
}

function toggleMenu() {
  toggleSidebar();
}

function buscarCartaManuellement() {
  const input = document.getElementById('pesquisaInput');
  if (!input) return;
  const nome = input.value.trim();
  if (!nome) {
    alert(typeof I18N !== 'undefined' ? I18N.t('enterName') : 'Entrez un nom');
    return;
  }
  closeSidebarDrawer();
  window.location.href = `card.html?name=${encodeURIComponent(nome)}`;
}

function limparResultado() {
  const input = document.getElementById('pesquisaInput');
  if (input) input.value = '';
}

function toggleSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.classList.toggle('active');
    if (sectionId === 'sectionCollections' && section.classList.contains('active') && (!allSetsData || allSetsData.length === 0)) {
      loadSets();
    }
  }
}

let currentFormat = 'all';
function selectFormat(fmt, event) {
  event && event.preventDefault();
  currentFormat = fmt;

  document.querySelectorAll('.format-links li').forEach(li => {
    li.classList.toggle('active', li.dataset.format === fmt);
  });

  const params = new URLSearchParams(window.location.search);
  if (fmt === 'all') {
    params.delete('format');
  } else {
    params.set('format', fmt);
  }

  const isHomepage = window.location.pathname.includes('index.html') ||
    window.location.pathname === '/' ||
    window.location.pathname.endsWith('/teamsandwich/') ||
    window.location.pathname.endsWith('/teamsandwich/index.html');

  if (isHomepage) {
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    history.pushState(null, '', newUrl);
    if (typeof selectFormatFromHome === 'function') {
      selectFormatFromHome(fmt);
    } else if (typeof renderHomepageEvents === 'function') {
      renderHomepageEvents(fmt);
    }
  } else {
    window.location.href = `index.html?format=${fmt}`;
  }
}

function initStores() {
  const stored = AppStorage.local.readJSON("stores", []);
  const saved = Array.isArray(stored) ? stored : [];
  const container = document.getElementById("storeList");
  if (!container) return;

  container.innerHTML = '';
  sites.forEach(site => {
    const checked = saved.length ? saved.includes(site.id) : true;
    const div = document.createElement("label");
    div.className = "store-item-checkbox";
    div.innerHTML = `
      <input type="checkbox" value="${site.id}" ${checked ? "checked" : ""} onchange="getSelected()">
      ${site.logo ? `<img src="${site.logo}" alt="${site.nome}" onerror="this.style.display='none'">` : ''}
      <span>${site.nome}</span>
    `;
    container.appendChild(div);
  });
}

function getSelected(persist = true) {
  const boxes = document.querySelectorAll("#storeList input");
  const selected = [];
  boxes.forEach(b => { if (b.checked) selected.push(b.value); });
  if (persist) AppStorage.local.setItem("stores", JSON.stringify(selected));
  return selected;
}

let allSetsData = [];

async function loadSets() {
  const container = document.getElementById("setList");
  if (!container) return;
  try {
    allSetsData = (await CardData.provider().sets())
      .filter(set => set.icon_svg_uri)
      .sort((a, b) => new Date(b.released_at) - new Date(a.released_at));

    const recentSets = allSetsData.slice(0, 8);
    container.innerHTML = '';

    recentSets.forEach(set => {
      const div = document.createElement("div");
      div.className = "store-item";
      div.innerHTML = `<img src="${set.icon_svg_uri}" width="24"><span>${set.code.toUpperCase()} - ${set.name}</span>`;
      div.style.cursor = "pointer";
      div.onclick = () => { window.location.href = `card.html?set=${encodeURIComponent(set.code)}`; };
      container.appendChild(div);
    });

    const viewAllBtn = document.createElement("button");
    viewAllBtn.className = "btn-view-all-collections";
    viewAllBtn.setAttribute("data-i18n", "viewAllCollections");
    viewAllBtn.textContent = I18N.t('viewAllCollections');
    viewAllBtn.onclick = () => openCollectionsModal();
    container.appendChild(viewAllBtn);

  } catch (e) {
    console.warn('Could not load sets:', e);
  }
}

let collectionsModalSort = 'newest';

function openCollectionsModal() {
  closeSidebarDrawer();
  const modal = document.getElementById('collectionsModal');
  const overlay = document.getElementById('collectionsModalOverlay');
  if (!modal || !overlay) return;

  modal.classList.add('visible');
  overlay.classList.add('visible');
  document.body.style.overflow = 'hidden';

  const searchInput = document.getElementById('collectionsSearchInput');
  if (searchInput) searchInput.value = '';
  collectionsModalSort = 'newest';
  updateCollectionsSortButtons();
  renderCollectionsGrid(allSetsData);
}

function closeCollectionsModal() {
  const modal = document.getElementById('collectionsModal');
  const overlay = document.getElementById('collectionsModalOverlay');
  if (modal) modal.classList.remove('visible');
  if (overlay) overlay.classList.remove('visible');
  document.body.style.overflow = '';
}

function setCollectionsSort(sortType) {
  collectionsModalSort = sortType;
  updateCollectionsSortButtons();
  filterAndRenderCollections();
}

function updateCollectionsSortButtons() {
  document.querySelectorAll('.collections-sort-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sort === collectionsModalSort);
  });
}

function filterAndRenderCollections() {
  const searchInput = document.getElementById('collectionsSearchInput');
  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

  let filtered = allSetsData;
  if (query) {
    filtered = allSetsData.filter(set =>
      set.name.toLowerCase().includes(query) ||
      set.code.toLowerCase().includes(query)
    );
  }

  let sorted = [...filtered];
  switch (collectionsModalSort) {
    case 'newest':
      sorted.sort((a, b) => new Date(b.released_at) - new Date(a.released_at));
      break;
    case 'oldest':
      sorted.sort((a, b) => new Date(a.released_at) - new Date(b.released_at));
      break;
    case 'az':
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'za':
      sorted.sort((a, b) => b.name.localeCompare(a.name));
      break;
  }

  renderCollectionsGrid(sorted);
}

function renderCollectionsGrid(sets) {
  const grid = document.getElementById('collectionsGrid');
  if (!grid) return;

  if (sets.length === 0) {
    grid.innerHTML = `<div class="collections-empty">${I18N.t('noCollectionsFound')}</div>`;
    return;
  }

  grid.innerHTML = sets.map(set => {
    const year = set.released_at ? new Date(set.released_at).getFullYear() : '';
    return `
      <div class="collection-card" onclick="window.location.href='card.html?set=${encodeURIComponent(set.code)}'">
        <div class="collection-card-icon">
          <img src="${set.icon_svg_uri}" alt="${set.name}" width="32" height="32">
        </div>
        <div class="collection-card-info">
          <span class="collection-card-code">${set.code.toUpperCase()}</span>
          <span class="collection-card-name">${set.name}</span>
          ${year ? `<span class="collection-card-year">${year}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function initCollectionsSearch() {
  const input = document.getElementById('collectionsSearchInput');
  if (!input) return;
  let debounce;
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => filterAndRenderCollections(), 200);
  });
}

let searchDebounceTimer = null;
let currentAutocompleteQuery = '';
let autocompleteController = null;

function initHeaderSearch() {
  const input = document.getElementById('headerSearchInput');
  if (!input) return;

  input.addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    autocompleteController?.abort();
    const q = input.value.trim();
    currentAutocompleteQuery = q;
    if (q.length < 2) {
      hideAutocomplete();
      currentAutocompleteQuery = '';
      return;
    }
    searchDebounceTimer = setTimeout(() => fetchAutocomplete(q), 300);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      hideAutocomplete();
      submitHeaderSearch();
    }
  });

  document.addEventListener('click', (e) => {
    const container = document.querySelector('.header-search-container');
    if (container && !container.contains(e.target)) hideAutocomplete();
  });
}

async function fetchAutocomplete(query) {
  currentAutocompleteQuery = query;
  autocompleteController?.abort();
  const controller = new AbortController();
  autocompleteController = controller;
  try {
    const names = await CardData.provider().autocomplete(query, { signal: controller.signal });
    if (controller.signal.aborted || currentAutocompleteQuery !== query) return;
    if (!names.length) {
      hideAutocomplete();
      return;
    }

    // Names are useful immediately; thumbnails are optional background enrichment.
    showAutocomplete(names.map(name => ({ name })));
    try {
      const cards = await CardData.provider().collection(names.map(name => ({ name })), { signal: controller.signal, background: true });
      if (controller.signal.aborted || currentAutocompleteQuery !== query) return;
      showAutocomplete(names.map((name, index) => ({ name, id: cards[index]?.id, image: cards[index]?.images.small })));
    } catch (error) { /* Keep names when optional thumbnails are unavailable. */ }
  } catch (e) {
    if (!CardData.isAbort(e) && currentAutocompleteQuery === query) {
      hideAutocomplete();
    }
  }
}

function showAutocomplete(cards) {
  const dd = document.getElementById('autocompleteDropdown');
  if (!dd) return;
  if (!cards.length) { hideAutocomplete(); return; }

  dd.replaceChildren();
  cards.forEach(card => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'ac-item';
    item.onclick = () => selectAutocomplete(card.name, card.id);
    const thumbnail = document.createElement(card.image ? 'img' : 'span');
    thumbnail.className = card.image ? 'ac-thumbnail' : 'ac-thumbnail-placeholder';
    if (card.image) { thumbnail.src = card.image; thumbnail.alt = ''; thumbnail.loading = 'lazy'; }
    const name = document.createElement('span');
    name.className = 'ac-name';
    name.textContent = card.name;
    item.append(thumbnail, name);
    dd.appendChild(item);
  });
  dd.classList.add('visible');
}

function hideAutocomplete() {
  clearTimeout(searchDebounceTimer);
  autocompleteController?.abort();
  const dd = document.getElementById('autocompleteDropdown');
  if (dd) dd.classList.remove('visible');
}

function selectAutocomplete(name, cardId) {
  hideAutocomplete();
  if (cardId) {
    window.location.href = `card-detail.html?id=${encodeURIComponent(cardId)}&name=${encodeURIComponent(name)}`;
  } else {
    window.location.href = `card-detail.html?name=${encodeURIComponent(name)}`;
  }
}

function submitHeaderSearch() {
  const input = document.getElementById('headerSearchInput');
  if (!input) return;
  const q = input.value.trim();
  if (!q) return;
  window.location.href = `card.html?name=${encodeURIComponent(q)}`;
}

function clearHeaderSearch() {
  const input = document.getElementById('headerSearchInput');
  if (input) input.value = '';
  hideAutocomplete();
}

function openLoginModal() {
  closeAuthModals();
  closeSidebarDrawer();
  const modal = document.getElementById('loginModal');
  const overlay = document.getElementById('authModalOverlay');
  if (modal) modal.classList.add('visible');
  if (overlay) overlay.classList.add('visible');
}

function openSignupModal() {
  closeAuthModals();
  closeSidebarDrawer();
  const modal = document.getElementById('signupModal');
  const overlay = document.getElementById('authModalOverlay');
  if (modal) modal.classList.add('visible');
  if (overlay) overlay.classList.add('visible');
}

function closeAuthModals() {
  document.querySelectorAll('.auth-modal').forEach(m => m.classList.remove('visible'));
  const overlay = document.getElementById('authModalOverlay');
  if (overlay) overlay.classList.remove('visible');
}

function switchToSignup(e) { e && e.preventDefault(); closeAuthModals(); openSignupModal(); }
function switchToLogin(e) { e && e.preventDefault(); closeAuthModals(); openLoginModal(); }

function handleLoginSubmit(e) {
  // Existing demo account only. Real password validation requires the deferred backend.
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  AppStorage.local.setItem('user', JSON.stringify({ email, username: email.split('@')[0] }));
  document.getElementById('loginPassword').value = '';
  closeAuthModals();
  updateUserUI();
}

function handleSignupSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('signupUsername').value;
  const email = document.getElementById('signupEmail').value;
  AppStorage.local.setItem('user', JSON.stringify({ email, username }));
  document.getElementById('signupPassword').value = '';
  closeAuthModals();
  updateUserUI();
}

function updateUserUI() {
  const userActions = document.getElementById('headerUserActions');
  const sidebarActions = document.getElementById('sidebarUserActions');
  const storedUser = AppStorage.local.readJSON('user', null);
  const user = typeof storedUser?.username === 'string' && typeof storedUser?.email === 'string' ? storedUser : null;

  const renderAuth = (container) => {
    if (!container) return;
    if (user) {
      container.innerHTML = `
        <span class="user-greeting">${escapeHTML(user.username)}</span>
        <button class="btn-logout-header" onclick="logoutUser()" data-i18n="logout">${I18N.t('logout')}</button>
      `;
    } else {
      container.innerHTML = `
        <button class="btn-login-header" onclick="openLoginModal()" data-i18n="login">${I18N.t('login')}</button>
        <button class="btn-signup-header" onclick="openSignupModal()" data-i18n="signup">${I18N.t('signup')}</button>
      `;
    }
  };

  renderAuth(userActions);
  renderAuth(sidebarActions);
}

function logoutUser() {
  AppStorage.local.removeItem('user');
  updateUserUI();
}

function initLangSelector() {
  const selector = document.querySelector('.lang-selector-select');
  if (selector) {
    selector.value = I18N.current;
    selector.addEventListener('change', (e) => {
      I18N.setLang(e.target.value);
      updateUserUI();
    });
  }

  const sidebarSelector = document.querySelector('.sidebar-lang-select');
  if (sidebarSelector) {
    sidebarSelector.value = I18N.current;
    sidebarSelector.addEventListener('change', (e) => {
      I18N.setLang(e.target.value);
      updateUserUI();
    });
  }
}

window.addEventListener('languageChanged', () => {
  updateUserUI();
});

window.addEventListener('pageshow', updateUserUI);
window.addEventListener('storage', event => {
  if (event.key === 'user' || event.key === null) updateUserUI();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') updateUserUI();
});

document.addEventListener('DOMContentLoaded', () => {
  renderSidebar();
  initSidebar();
  initStores();
  loadSets();
  initCollectionsSearch();
  initHeaderSearch();
  initLangSelector();
  I18N.updateDOM();
  updateUserUI();
});
