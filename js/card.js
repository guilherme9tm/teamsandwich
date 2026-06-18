// ===========================
// STORE DEFINITIONS (shared)
// ===========================
const sites = [
  {
    id: 'facetoface',
    nome: 'Face to Face',
    link: n => `https://facetofacegames.com/search?q=${n}`,
    logo: 'https://facetofacegames.com/cdn/shop/files/F2F_Black_Logo_074ba862-2d20-45b5-85c5-99f407f34e31.png?v=1742222734'
  },
  {
    id: 'levalet',
    nome: 'Levalet',
    link: n => `https://levalet.crystalcommerce.com/products/search?q=${n}&c=1`,
    logo: 'https://cc-client-assets.nyc3.cdn.digitaloceanspaces.com/store/levalet/13b0d4f01acb11e9a8aac9b93f52c525/large/logolevalet.png'
  },
  {
    id: 'secretdesk',
    nome: 'Secret Desk',
    link: n => `https://www.lesecretdeskorrigans.com/products/search?q=${n}`,
    logo: 'https://cc-client-assets.nyc3.cdn.digitaloceanspaces.com/store/lesecretdeskorrigans/d6c705a0588d40bcad29108b0f9fda1b/medium/logolesecretfavi.png'
  },
  {
    id: 'cardhoarder',
    nome: 'Cardhoarder',
    link: n => `https://www.cardhoarder.com/cards?cardname=${n}`,
    logo: 'https://cdn.shopify.com/s/files/1/1781/6359/files/nav-logo.png?height=628&pad_color=fff&v=1613525588&width=1200'
  },
  {
    id: 'gamekeeper',
    nome: 'Gamekeeper',
    link: n => `https://www.gamekeeperonline.com/products/search?q=${n}`,
    logo: 'https://cc-client-assets.nyc3.cdn.digitaloceanspaces.com/photo/gamekeeperonline/file/768163/logo-2017.png?1508604932'
  },
  {
    id: 'expedition',
    nome: 'Expedition',
    link: n => `https://www.expeditionjeux.com/products/search?q=${n}`,
    logo: 'https://cc-client-assets.nyc3.cdn.digitaloceanspaces.com/store/expeditionjeux/26105d544a1449c7b3d28a192b99b961/large/expedition_logo_long.png'
  },
  {
    id: 'tcgplayer',
    nome: 'TCGPlayer',
    link: n => `https://www.tcgplayer.com/search/magic/product?q=${n}`,
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRwc05VHb_4Y30nHRhc-thfIAdqVAN19LqSgQ&s'
  },
  {
    id: 'mtgtop8',
    nome: 'MTGTop8',
    link: n => `https://www.mtgtop8.com/search.php?cards=${n}`,
    logo: 'https://mtgtop8.com/graph/title.png'
  },
  {
    id: 'silvergoblin',
    nome: 'Silver Goblin',
    link: n => `https://silvergoblin.cards/search?q=${n}&options%5Bprefix%5D=last`,
    logo: 'https://silvergoblin.cards/cdn/shop/files/Homepage_logo_5f1b015e-ccda-4e73-8c97-9259e49ab786.png?v=1741746772&width=1500'
  },
  {
    id: 'altf4',
    nome: 'Alt F4',
    link: n => `https://altf4online.com/search?options%5Bprefix%5D=last&q=${n}`,
    logo: 'data:image/png;base64,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'
  },
  {
    id: 'threekings',
    nome: 'Three Kings Loot',
    link: n => `https://www.threekingsloot.com/products/search?q=${n}`,
    logo: 'https://bluedefault.crystalcommerce.com/themes/clients/threekingsloot/assets/img/logo.png?1415786210'
  },
  {
    id: 'mythicstore',
    nome: 'Boutique Mythic',
    link: n => `https://themythicstore.com/a/search?q=${n}`,
    logo: 'https://cdn.shopify.com/s/files/1/0360/6895/0061/files/Social_Media_Share_TMS.png?v=1714682307'
  },
  {
    id: 'wizardtower',
    nome: 'Wizard Tower',
    link: n => `https://store.wizardtower.com/search?q=${n}&options%5Bprefix%5D=last`,
    logo: 'data:image/png;base64,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'
  },
  {
    id: 'chezgeeks',
    nome: 'Chez Geeks',
    link: n => `https://www.chezgeeks.com/products/search?q=${n}`,
    logo: 'https://cc-client-assets.nyc3.cdn.digitaloceanspaces.com/photo/chezgeeks/file/30f1d741378c4f31909b23ade89a46ae/Chez%20Geeks%20LOGO%20scaled.png'
  }
];

// ===========================
// HELPER: GET SELECTED STORES
// ===========================
function getSelected() {
  const saved = JSON.parse(localStorage.getItem("stores") || "[]");
  // If nothing saved, all are selected
  if (!saved.length) return sites.map(s => s.id);
  return saved;
}

// ===========================
// TOGGLE CARD DETAILS
// ===========================
function toggleCard(btn) {
  const card = btn.closest(".card");
  if (!card) return;
  const extra = card.querySelector(".card-extra");
  if (!extra) return;

  if (extra.style.display === "block") {
    extra.style.display = "none";
    btn.textContent = "Afficher plus";
  } else {
    extra.style.display = "block";
    btn.textContent = "Masquer";
  }
}

// ===========================
// FETCH & RENDER A SINGLE CARD
// ===========================
function renderCardElement(cardData) {
  const n = encodeURIComponent(cardData.name);

  let img = cardData.image_uris?.small || cardData.card_faces?.[0]?.image_uris?.small;
  if (img) img = img.split('?')[0];

  const usd = parseFloat(cardData.prices?.usd) || parseFloat(cardData.prices?.usd_foil) || 0;
  const cad = usd ? `CAD ${(usd * 1.38).toFixed(2)}` : "Prix indisponible";

  const selected = getSelected();

  const card = document.createElement("div");
  card.className = "card";

  if (img) card.innerHTML += `<img src="${img}">`;

  card.innerHTML += `
    <strong>${cardData.name}</strong><br>
    <em>${cad}</em>
    <button class="toggle-btn" onclick="toggleCard(this)">
      Afficher plus
    </button>
  `;

  const extra = document.createElement("div");
  extra.className = "card-extra";

  const links = document.createElement("div");
  links.className = "links-container";

  const c1 = document.createElement("div");
  const c2 = document.createElement("div");
  c1.className = c2.className = "links-column";

  let i = 0;
  sites.forEach(site => {
    if (!selected.includes(site.id)) return;
    const a = document.createElement("a");
    a.href = site.link(n);
    a.target = "_blank";
    const im = document.createElement("img");
    im.src = site.logo;
    a.appendChild(im);
    (i++ % 2 === 0 ? c1 : c2).appendChild(a);
  });

  links.appendChild(c1);
  links.appendChild(c2);
  extra.appendChild(links);
  card.appendChild(extra);

  return card;
}

async function fetchCardData(nome) {
  const n = encodeURIComponent(nome);

  let res = await fetch(`https://api.scryfall.com/cards/named?exact=${n}`);
  if (!res.ok) {
    res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${n}`);
  }
  if (!res.ok) {
    return { _notFound: true, name: nome };
  }

  return await res.json();
}

// ===========================
// PAGINATION STATE
// ===========================
let allCards = [];
let currentPage = 1;
let perPage = 15;

function changePerPage(value) {
  if (value === 'all') {
    perPage = allCards.length || 9999;
  } else {
    perPage = parseInt(value, 10);
  }
  currentPage = 1;
  renderPage();
  renderPagination();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToPage(page) {
  const totalPages = Math.ceil(allCards.length / perPage);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderPage();
  renderPagination();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderPage() {
  const container = document.getElementById("resultado");
  container.innerHTML = "";

  const start = (currentPage - 1) * perPage;
  const end = Math.min(start + perPage, allCards.length);
  const pageCards = allCards.slice(start, end);

  pageCards.forEach(cardData => {
    if (cardData._notFound) {
      const errDiv = document.createElement("div");
      errDiv.className = "card card-not-found";
      errDiv.innerHTML = `<p>Carte non trouvée : ${cardData.name}</p>`;
      container.appendChild(errDiv);
    } else {
      container.appendChild(renderCardElement(cardData));
    }
  });
}

function renderPagination() {
  const totalPages = Math.ceil(allCards.length / perPage);
  const navTop = document.getElementById("pageNav");
  const navBottom = document.getElementById("pageNavBottom");
  const paginationBar = document.getElementById("paginationBar");
  const paginationBarBottom = document.getElementById("paginationBarBottom");

  // Hide pagination if only 1 page
  if (totalPages <= 1) {
    paginationBarBottom.style.display = "none";
    navTop.innerHTML = `<span class="page-info">${allCards.length} carte(s)</span>`;
    return;
  }

  paginationBarBottom.style.display = "flex";

  const buildNav = (navEl) => {
    navEl.innerHTML = "";

    // Prev button
    const prevBtn = document.createElement("button");
    prevBtn.className = "page-btn arrow-btn";
    prevBtn.textContent = "‹";
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => goToPage(currentPage - 1);
    navEl.appendChild(prevBtn);

    // Page numbers with ellipsis
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

    // Next button
    const nextBtn = document.createElement("button");
    nextBtn.className = "page-btn arrow-btn";
    nextBtn.textContent = "›";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => goToPage(currentPage + 1);
    navEl.appendChild(nextBtn);

    // Page info
    const info = document.createElement("span");
    info.className = "page-info";
    const from = (currentPage - 1) * perPage + 1;
    const to = Math.min(currentPage * perPage, allCards.length);
    info.textContent = `${from}–${to} de ${allCards.length}`;
    navEl.appendChild(info);
  };

  buildNav(navTop);
  buildNav(navBottom);
}

// ===========================
// PAGE INIT — READ URL PARAMS
// ===========================
async function init() {
  const params = new URLSearchParams(window.location.search);
  const container = document.getElementById("resultado");
  const titleEl = document.getElementById("searchTitle");
  const subtitleEl = document.getElementById("searchSubtitle");

  const showLoader = (msg) => {
    container.innerHTML = `
      <div class="loading-indicator">
        <div class="spinner"></div>
        <span class="loading-text">${msg}</span>
      </div>
    `;
  };

  const removeLoader = () => {
    const loader = container.querySelector('.loading-indicator');
    if (loader) loader.remove();
  };

  // Single card search: ?name=CardName
  if (params.has("name")) {
    const nome = params.get("name");
    titleEl.textContent = `🔍 « ${nome} »`;
    subtitleEl.textContent = "Recherche d'une carte...";
    showLoader("Chargement...");

    const data = await fetchCardData(nome);
    allCards.push(data);

    removeLoader();
    renderPage();
    renderPagination();
    subtitleEl.textContent = "1 carte trouvée";
  }

  // File import: ?source=file
  else if (params.get("source") === "file") {
    const cartas = JSON.parse(sessionStorage.getItem("fileCards") || "[]");
    titleEl.textContent = `📂 Importation de fichier`;
    subtitleEl.textContent = `${cartas.length} carte(s) à charger...`;
    showLoader(`Chargement de ${cartas.length} carte(s)...`);

    let loaded = 0;
    for (let nome of cartas) {
      const data = await fetchCardData(nome);
      allCards.push(data);
      await new Promise(r => setTimeout(r, 100));
      loaded++;
      subtitleEl.textContent = `${loaded} / ${cartas.length} carte(s) chargée(s)`;
    }

    removeLoader();
    renderPage();
    renderPagination();
    subtitleEl.textContent = `${cartas.length} carte(s) chargée(s)`;
  }

  // Collection: ?set=CODE
  else if (params.has("set")) {
    const code = params.get("set");
    titleEl.textContent = `📦 Collection : ${code.toUpperCase()}`;
    subtitleEl.textContent = "Chargement de la collection...";
    showLoader(`Chargement de la collection ${code.toUpperCase()}...`);

    let url = `https://api.scryfall.com/cards/search?q=set:${code}`;
    let loaded = 0;

    while (url) {
      const res = await fetch(url);
      const data = await res.json();

      for (let card of data.data) {
        allCards.push(card);
        loaded++;
        subtitleEl.textContent = `${loaded} carte(s) chargée(s)...`;
      }

      url = data.has_more ? data.next_page : null;
    }

    removeLoader();
    renderPage();
    renderPagination();
    subtitleEl.textContent = `${loaded} carte(s) chargée(s)`;
  }

  // No params
  else {
    titleEl.textContent = "Aucune recherche";
    subtitleEl.textContent = "Retournez à la page d'accueil pour effectuer une recherche.";
  }
}

init();

