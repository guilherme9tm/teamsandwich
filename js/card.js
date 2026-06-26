// ===========================
// CARD.JS — Results page logic
// Depends on common.js (sites, getSelected, etc.)
// ===========================

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

  let img = cardData.image_uris?.normal || cardData.card_faces?.[0]?.image_uris?.normal || cardData.image_uris?.small || cardData.card_faces?.[0]?.image_uris?.small;
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
    if (paginationBarBottom) paginationBarBottom.style.display = "none";
    if (navTop) navTop.innerHTML = `<span class="page-info">${allCards.length} carte(s)</span>`;
    return;
  }

  if (paginationBarBottom) paginationBarBottom.style.display = "flex";

  const buildNav = (navEl) => {
    if (!navEl) return;
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
    titleEl.textContent = nome;
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
