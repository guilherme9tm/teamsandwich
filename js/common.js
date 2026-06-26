// ===========================
// COMMON.JS — SHARED LOGIC
// All pages load this file.
// ===========================

// ===========================
// STORE DEFINITIONS
// ===========================
const sites = [
  { id: 'facetoface', nome: 'Face to Face', link: n => `https://facetofacegames.com/search?q=${n}`, logo: 'https://facetofacegames.com/cdn/shop/files/F2F_Black_Logo_074ba862-2d20-45b5-85c5-99f407f34e31.png?v=1742222734' },
  { id: 'levalet', nome: 'Levalet', link: n => `https://levalet.crystalcommerce.com/products/search?q=${n}&c=1`, logo: 'https://cc-client-assets.nyc3.cdn.digitaloceanspaces.com/store/levalet/13b0d4f01acb11e9a8aac9b93f52c525/large/logolevalet.png' },
  { id: 'secretdesk', nome: 'Secret Desk', link: n => `https://www.lesecretdeskorrigans.com/products/search?q=${n}`, logo: 'https://cc-client-assets.nyc3.cdn.digitaloceanspaces.com/store/lesecretdeskorrigans/d6c705a0588d40bcad29108b0f9fda1b/medium/logolesecretfavi.png' },
  { id: 'cardhoarder', nome: 'Cardhoarder', link: n => `https://www.cardhoarder.com/cards?cardname=${n}`, logo: 'https://cdn.shopify.com/s/files/1/1781/6359/files/nav-logo.png?height=628&pad_color=fff&v=1613525588&width=1200' },
  { id: 'gamekeeper', nome: 'Gamekeeper', link: n => `https://www.gamekeeperonline.com/products/search?q=${n}`, logo: 'https://cc-client-assets.nyc3.cdn.digitaloceanspaces.com/photo/gamekeeperonline/file/768163/logo-2017.png?1508604932' },
  { id: 'expedition', nome: 'Expedition', link: n => `https://www.expeditionjeux.com/products/search?q=${n}`, logo: 'https://cc-client-assets.nyc3.cdn.digitaloceanspaces.com/store/expeditionjeux/26105d544a1449c7b3d28a192b99b961/large/expedition_logo_long.png' },
  { id: 'tcgplayer', nome: 'TCGPlayer', link: n => `https://www.tcgplayer.com/search/magic/product?q=${n}`, logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRwc05VHb_4Y30nHRhc-thfIAdqVAN19LqSgQ&s' },
  { id: 'mtgtop8', nome: 'MTGTop8', link: n => `https://www.mtgtop8.com/search.php?cards=${n}`, logo: 'https://mtgtop8.com/graph/title.png' },
  { id: 'silvergoblin', nome: 'Silver Goblin', link: n => `https://silvergoblin.cards/search?q=${n}&options%5Bprefix%5D=last`, logo: 'https://silvergoblin.cards/cdn/shop/files/Homepage_logo_5f1b015e-ccda-4e73-8c97-9259e49ab786.png?v=1741746772&width=1500' },
  { id: 'altf4', nome: 'Alt F4', link: n => `https://altf4online.com/search?options%5Bprefix%5D=last&q=${n}`, logo: '' },
  { id: 'threekings', nome: 'Three Kings Loot', link: n => `https://www.threekingsloot.com/products/search?q=${n}`, logo: 'https://bluedefault.crystalcommerce.com/themes/clients/threekingsloot/assets/img/logo.png?1415786210' },
  { id: 'mythicstore', nome: 'Boutique Mythic', link: n => `https://themythicstore.com/a/search?q=${n}`, logo: 'https://cdn.shopify.com/s/files/1/0360/6895/0061/files/Social_Media_Share_TMS.png?v=1714682307' },
  { id: 'wizardtower', nome: 'Wizard Tower', link: n => `https://store.wizardtower.com/search?q=${n}&options%5Bprefix%5D=last`, logo: '' },
  { id: 'chezgeeks', nome: 'Chez Geeks', link: n => `https://www.chezgeeks.com/products/search?q=${n}`, logo: 'https://cc-client-assets.nyc3.cdn.digitaloceanspaces.com/photo/chezgeeks/file/30f1d741378c4f31909b23ade89a46ae/Chez%20Geeks%20LOGO%20scaled.png' }
];

// ===========================
// DYNAMIC SIDEBAR RENDER
// ===========================
function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const params = new URLSearchParams(window.location.search);
  const activeFormat = params.get('format') || 'all';

  sidebar.innerHTML = `
    <div class="sidebar-header">
      <button class="sidebar-toggle-btn" id="sidebarToggleBtn" onclick="toggleSidebar()" aria-label="Toggle sidebar">
        <svg class="arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
    </div>

    <div class="sidebar-menu">
      <!-- Formats -->
      <div class="sidebar-section active" id="sectionFormats">
        <div class="sidebar-section-header" onclick="toggleSection('sectionFormats')">
          <span class="sec-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.56,20.17A5.75,5.75,0,0,1,15,15.39V14a1,1,0,0,0-.55-.89l-2-1a1,1,0,0,0-.9,0l-2,1A1,1,0,0,0,9,14v1.42a5.75,5.75,0,0,1-2.56,4.78A1,1,0,0,0,7,22H17a1,1,0,0,0,.56-1.83Z" fill="currentColor"/><path d="M18,22H6a1,1,0,0,1,0-2H18a1,1,0,0,1,0,2ZM19.45,7.28a1,1,0,0,0-.81-.69l-4-.56L12.89,2.55a1,1,0,0,0-1.78,0L9.34,6l-4,.56a1,1,0,0,0-.81.69,1,1,0,0,0,.26,1L7.67,11,7,14.83a1,1,0,0,0,.39,1,1,1,0,0,0,1,.09L12,14.07l3.56,1.82A1.07,1.07,0,0,0,16,16a1,1,0,0,0,1-1.17L16.33,11l2.86-2.7A1,1,0,0,0,19.45,7.28Z" fill="var(--accent)"/></svg></span>
          <span class="sec-title" data-i18n="formats">Formats de jeu</span>
          <span class="sec-arrow">▼</span>
        </div>
        <div class="sidebar-section-content">
          <ul class="format-links">
            <li class="${activeFormat === 'all' ? 'active' : ''}" data-format="all" onclick="selectFormat('all',event)"><span class="format-dot"></span><span data-i18n="all">Toutes</span></li>
            <li class="${activeFormat === 'standard' ? 'active' : ''}" data-format="standard" onclick="selectFormat('standard',event)"><span class="format-dot"></span><span>Standard</span></li>
            <li class="${activeFormat === 'pioneer' ? 'active' : ''}" data-format="pioneer" onclick="selectFormat('pioneer',event)"><span class="format-dot"></span><span>Pioneer</span></li>
            <li class="${activeFormat === 'modern' ? 'active' : ''}" data-format="modern" onclick="selectFormat('modern',event)"><span class="format-dot"></span><span>Modern</span></li>
            <li class="${activeFormat === 'commander' ? 'active' : ''}" data-format="commander" onclick="selectFormat('commander',event)"><span class="format-dot"></span><span>Commander (EDH)</span></li>
          </ul>
        </div>
      </div>

      <!-- Import -->
      <div class="sidebar-section" id="sectionImport">
        <div class="sidebar-section-header" onclick="toggleSection('sectionImport')">
          <span class="sec-icon"><svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 1H5L8 3H13V5H3.7457L2.03141 11H4.11144L5.2543 7H16L14 14H0V1Z" fill="#7c5cfc"/></svg></span>
          <span class="sec-title" data-i18n="importTitle">Importer un fichier</span>
          <span class="sec-arrow">▼</span>
        </div>
        <div class="sidebar-section-content">
          <div class="menu-section-body">
            <input type="file" id="arquivoInput" accept=".txt">
            <button class="btn-primary" onclick="processarArquivo()" data-i18n="processFile">Traiter le fichier</button>
          </div>
        </div>
      </div>

      <!-- Stores -->
      <div class="sidebar-section" id="sectionStores">
        <div class="sidebar-section-header" onclick="toggleSection('sectionStores')">
          <span class="sec-icon"><svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none"><g id="shop"><path fill="none" stroke="#7c5cfc" stroke-linecap="square" stroke-miterlimit="10" stroke-width="1.91" d="M7.23,6.27v5.25a2.39,2.39,0,0,1-4.78,0L4.36,6.27Z"></path><path fill="none" stroke="#7c5cfc" stroke-linecap="square" stroke-miterlimit="10" stroke-width="1.91" d="M12,6.27v5.25a2.39,2.39,0,1,1-4.77,0V6.27Z"></path><path fill="none" stroke="#7c5cfc" stroke-linecap="square" stroke-miterlimit="10" stroke-width="1.91" d="M16.77,6.27v5.25a2.39,2.39,0,1,1-4.77,0V6.27Z"></path><path fill="none" stroke="#7c5cfc" stroke-linecap="square" stroke-miterlimit="10" stroke-width="1.91" d="M21.55,11.52a2.39,2.39,0,0,1-4.78,0V6.27h2.87Z"></path><path fill="none" stroke="#7c5cfc" stroke-linecap="square" stroke-miterlimit="10" stroke-width="1.91" d="M19.64,13.91V22.5H4.36V13.91h.48a2.39,2.39,0,0,0,2.39-2.39,2.39,2.39,0,1,0,4.77,0,2.39,2.39,0,1,0,4.77,0,2.39,2.39,0,0,0,2.39,2.39Z"></path><polyline fill="none" stroke="#7c5cfc" stroke-linecap="square" stroke-miterlimit="10" stroke-width="1.91" points="1.5 22.5 4.36 22.5 19.64 22.5 22.5 22.5"></polyline><rect fill="none" stroke="#7c5cfc" stroke-linecap="square" stroke-miterlimit="10" stroke-width="1.91" x="6.27" y="1.5" width="11.45" height="4.77"></rect><rect fill="none" stroke="#7c5cfc" stroke-linecap="square" stroke-miterlimit="10" stroke-width="1.91" x="8.18" y="17.73" width="7.64" height="4.77"></rect></g></svg></span>
          <span class="sec-title" data-i18n="stores">Magasins</span>
          <span class="sec-arrow">▼</span>
        </div>
        <div class="sidebar-section-content">
          <div class="menu-section-body" id="storeList"></div>
        </div>
      </div>

      <!-- Collections -->
      <div class="sidebar-section" id="sectionCollections">
        <div class="sidebar-section-header" onclick="toggleSection('sectionCollections')">
          <span class="sec-icon"><svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="shop-box"><path d="M7 1H4L1 6V15H15V6L12 1H9V6H7V1Z" fill="#7c5cfc"></path></g></svg></span>
          <span class="sec-title" data-i18n="collections">Collections</span>
          <span class="sec-arrow">▼</span>
        </div>
        <div class="sidebar-section-content menu-set-list" id="setList"></div>
      </div>
    </div>
  `;
}

// ===========================
// FILE PROCESSING (Shared)
// ===========================
async function processarArquivo() {
  const arquivoInput = document.getElementById('arquivoInput');
  if (!arquivoInput || !arquivoInput.files.length) {
    alert(I18N.t('filePrompt'));
    return;
  }

  const texto = await arquivoInput.files[0].text();
  const linhas = texto.split(/\r?\n/);
  const cartas = [];

  linhas.forEach(linha => {
    const l = inline = linha.trim();
    if (!l) return;

    const match = l.match(/^(\d+)\s+(.+)$/);
    if (match) {
      const qtd = parseInt(match[1], 10);
      const nome = match[2];
      for (let i = 0; i < qtd; i++) cartas.push(nome);
    } else {
      cartas.push(l);
    }
  });

  sessionStorage.setItem("fileCards", JSON.stringify(cartas));
  window.location.href = "card.html?source=file";
}

// ===========================
// SIDEBAR: collapse / expand
// ===========================
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  const saved = localStorage.getItem('sidebarCollapsed');
  if (saved === 'false') {
    sidebar.classList.remove('collapsed');
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  sidebar.classList.toggle('collapsed');
  localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
}

function toggleSidebarMobile() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('menuOverlay');
  if (!sidebar) return;
  sidebar.classList.toggle('mobile-open');
  if (overlay) overlay.classList.toggle('open');
  document.body.style.overflow = sidebar.classList.contains('mobile-open') ? 'hidden' : '';
}

// ===========================
// SIDEBAR SECTIONS
// ===========================
function toggleSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) section.classList.toggle('active');
}

// ===========================
// FORMAT SELECTION
// ===========================
let currentFormat = 'all';
function selectFormat(fmt, event) {
  event && event.preventDefault();
  currentFormat = fmt;

  document.querySelectorAll('.format-links li').forEach(li => {
    li.classList.toggle('active', li.dataset.format === fmt);
  });

  const params = new URLSearchParams(window.location.search);
  params.set('format', fmt);

  const isHomepage = window.location.pathname.includes('index.html') || 
                     window.location.pathname === '/' || 
                     window.location.pathname.endsWith('/teamsandwich/') ||
                     window.location.pathname.endsWith('/teamsandwich/index.html');

  if (isHomepage) {
    history.pushState(null, '', `?${params.toString()}`);
    if (typeof filterHomepageEvents === 'function') {
      filterHomepageEvents(fmt);
    }
  } else {
    window.location.href = `index.html?format=${fmt}`;
  }
}

// ===========================
// STORE INITIALIZATION
// ===========================
function initStores() {
  const saved = JSON.parse(localStorage.getItem("stores") || "[]");
  const container = document.getElementById("storeList");
  if (!container) return;

  sites.forEach(site => {
    const checked = saved.length ? saved.includes(site.id) : true;
    const div = document.createElement("div");
    div.className = "store-item";
    div.innerHTML = `
      <input type="checkbox" value="${site.id}" ${checked ? "checked" : ""}>
      <img src="${site.logo}" onerror="this.style.display='none'">
      ${site.nome}
    `;
    container.appendChild(div);
  });
}

function getSelected() {
  const boxes = document.querySelectorAll("#storeList input");
  const selected = [];
  boxes.forEach(b => { if (b.checked) selected.push(b.value); });
  localStorage.setItem("stores", JSON.stringify(selected));
  return selected;
}

// ===========================
// SET (COLLECTION) LOADING
// ===========================
let allSetsData = []; // Global store for all sets

async function loadSets() {
  const container = document.getElementById("setList");
  if (!container) return;
  try {
    const res = await fetch("https://api.scryfall.com/sets");
    const data = await res.json();
    allSetsData = data.data
      .filter(set => set.icon_svg_uri)
      .sort((a, b) => new Date(b.released_at) - new Date(a.released_at));

    // Show only the 8 most recent in sidebar
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

    // Add "View All" button
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

// ===========================
// COLLECTIONS MODAL
// ===========================
let collectionsModalSort = 'newest'; // 'newest', 'oldest', 'az', 'za'

function openCollectionsModal() {
  const modal = document.getElementById('collectionsModal');
  const overlay = document.getElementById('collectionsModalOverlay');
  if (!modal || !overlay) return;

  modal.classList.add('visible');
  overlay.classList.add('visible');
  document.body.style.overflow = 'hidden';

  // Reset search & sort
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

  // Sort
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

// ===========================
// HEADER SEARCH + AUTOCOMPLETE
// ===========================
let searchDebounceTimer = null;
let currentAutocompleteQuery = '';

function initHeaderSearch() {
  const input = document.getElementById('headerSearchInput');
  if (!input) return;

  input.addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    const q = input.value.trim();
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

  // Close on outside click
  document.addEventListener('click', (e) => {
    const container = document.querySelector('.header-search-container');
    if (container && !container.contains(e.target)) hideAutocomplete();
  });
}

async function fetchAutocomplete(query) {
  currentAutocompleteQuery = query;
  try {
    const res = await fetch(`https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(query)}`);
    if (currentAutocompleteQuery !== query) return;
    const data = await res.json();
    if (currentAutocompleteQuery !== query) return;

    const names = data.data || [];
    if (!names.length) {
      hideAutocomplete();
      return;
    }

    const sliceNames = names.slice(0, 8);
    const collectionRes = await fetch('https://api.scryfall.com/cards/collection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        identifiers: sliceNames.map(name => ({ name }))
      })
    });
    if (currentAutocompleteQuery !== query) return;
    const collectionData = await collectionRes.json();
    if (currentAutocompleteQuery !== query) return;

    const cards = (collectionData.data || []).map(card => {
      let image = '';
      if (card.image_uris && card.image_uris.small) {
        image = card.image_uris.small;
      } else if (card.card_faces && card.card_faces[0] && card.card_faces[0].image_uris && card.card_faces[0].image_uris.small) {
        image = card.card_faces[0].image_uris.small;
      }
      return {
        name: card.name,
        image: image
      };
    });

    showAutocomplete(cards);
  } catch (e) {
    if (currentAutocompleteQuery === query) {
      hideAutocomplete();
    }
  }
}

function showAutocomplete(cards) {
  const dd = document.getElementById('autocompleteDropdown');
  if (!dd) return;
  if (!cards.length) { hideAutocomplete(); return; }

  dd.innerHTML = cards.map(card => {
    const escapedName = card.name.replace(/'/g, "\\'");
    const imgHtml = card.image
      ? `<img src="${card.image}" class="ac-thumbnail" alt="${card.name}" loading="lazy">`
      : `<div class="ac-thumbnail-placeholder"></div>`;
    return `<div class="ac-item" onclick="selectAutocomplete('${escapedName}')">
      ${imgHtml}
      <span class="ac-name">${card.name}</span>
    </div>`;
  }).join('');
  dd.classList.add('visible');
}

// Close on autocomplete selection
function hideAutocomplete() {
  const dd = document.getElementById('autocompleteDropdown');
  if (dd) dd.classList.remove('visible');
}

function selectAutocomplete(name) {
  const input = document.getElementById('headerSearchInput');
  if (input) input.value = name;
  hideAutocomplete();
  submitHeaderSearch();
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

// ===========================
// AUTH MODALS (Simulated)
// ===========================
function openLoginModal() {
  closeAuthModals();
  document.getElementById('loginModal').classList.add('visible');
  document.getElementById('authModalOverlay').classList.add('visible');
}

// Open Sign Up
function openSignupModal() {
  closeAuthModals();
  document.getElementById('signupModal').classList.add('visible');
  document.getElementById('authModalOverlay').classList.add('visible');
}

function closeAuthModals() {
  document.querySelectorAll('.auth-modal').forEach(m => m.classList.remove('visible'));
  const overlay = document.getElementById('authModalOverlay');
  if (overlay) overlay.classList.remove('visible');
}

function switchToSignup(e) { e && e.preventDefault(); closeAuthModals(); openSignupModal(); }
function switchToLogin(e) { e && e.preventDefault(); closeAuthModals(); openLoginModal(); }

function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  localStorage.setItem('user', JSON.stringify({ email, username: email.split('@')[0] }));
  closeAuthModals();
  updateUserUI();
}

function handleSignupSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('signupUsername').value;
  const email = document.getElementById('signupEmail').value;
  localStorage.setItem('user', JSON.stringify({ email, username }));
  closeAuthModals();
  updateUserUI();
}

function updateUserUI() {
  const userActions = document.getElementById('headerUserActions');
  if (!userActions) return;
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  if (user) {
    userActions.innerHTML = `
      <span class="user-greeting">👤 ${user.username}</span>
      <button class="btn-logout-header" onclick="logoutUser()" data-i18n="logout">${I18N.t('logout')}</button>
    `;
  } else {
    userActions.innerHTML = `
      <button class="btn-login-header" onclick="openLoginModal()" data-i18n="login">${I18N.t('login')}</button>
      <button class="btn-signup-header" onclick="openSignupModal()" data-i18n="signup">${I18N.t('signup')}</button>
    `;
  }
}

function logoutUser() {
  localStorage.removeItem('user');
  updateUserUI();
}

// ===========================
// LANGUAGE SELECTOR
// ===========================
function initLangSelector() {
  const selector = document.querySelector('.lang-selector-select');
  if (!selector) return;
  selector.value = I18N.current;
  selector.addEventListener('change', (e) => {
    I18N.setLang(e.target.value);
    updateUserUI(); // re-render user buttons with new lang
  });
}

// ===========================
// GLOBAL INITIALIZATION
// ===========================
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
