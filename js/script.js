
const mockEvents = [
  {
    id: 1,
    name: "Friday Night Magic - Standard",
    format: "standard",
    date: "26 Jun",
    day: "26",
    month: "JUN",
    time: "18:30",
    location: "Boutique Sandwich",
    img: "assets/images/mtg_standard_event.png",
    details: "Tournoi amical Standard. Venez tester vos nouveaux decks et gagner des boosters promos !",
    entry: "10$",
    ranking: [
      { pos: 1, name: "Guillaume", pts: "15 pts" },
      { pos: 2, name: "Alexandre", pts: "12 pts" },
      { pos: 3, name: "Hugo", pts: "10 pts" }
    ]
  },
  {
    id: 2,
    name: "Pioneer Showdown",
    format: "pioneer",
    date: "28 Jun",
    day: "28",
    month: "JUN",
    time: "14:00",
    location: "L'Abyss MTG",
    img: "assets/images/mtg_pioneer_event.png",
    details: "Entrée: 10$. Boosters de participation et dotation en cartes promos aux vainqueurs.",
    entry: "10$",
    ranking: [
      { pos: 1, name: "Maxime", pts: "18 pts" },
      { pos: 2, name: "Lucas", pts: "15 pts" },
      { pos: 3, name: "Chloé", pts: "11 pts" }
    ]
  },
  {
    id: 3,
    name: "Modern Championship Qualifying",
    format: "modern",
    date: "02 Jul",
    day: "02",
    month: "JUL",
    time: "11:00",
    location: "Face to Face Games",
    img: "assets/images/mtg_modern_event.png",
    details: "Format Modern compétitif. Decklist requise. Qualificatif pour le tournoi régional.",
    entry: "25$",
    ranking: [
      { pos: 1, name: "Julien", pts: "24 pts" },
      { pos: 2, name: "Thomas", pts: "21 pts" },
      { pos: 3, name: "Sébastien", pts: "18 pts" }
    ]
  },
  {
    id: 4,
    name: "Commander Casual Night",
    format: "commander",
    date: "05 Jul",
    day: "05",
    month: "JUL",
    time: "17:00",
    location: "Chez Geeks",
    img: "assets/images/mtg_commander_event.png",
    details: "Venez jouer en Commander (EDH) multijoueur. Tables libres et ambiance conviviale !",
    entry: "Gratuit",
    ranking: [
      { pos: 1, name: "Arthur", pts: "9 pts" },
      { pos: 2, name: "Nicolas", pts: "6 pts" },
      { pos: 3, name: "Valérie", pts: "6 pts" }
    ]
  }
];

let currentHomeFormat = "all";

function selectFormatFromHome(fmt) {
  currentHomeFormat = fmt;

  document.querySelectorAll(".format-pill").forEach(pill => {
    pill.classList.toggle("active", pill.dataset.format === fmt);
  });

  document.querySelectorAll(".format-links li").forEach(li => {
    li.classList.toggle("active", li.dataset.format === fmt);
  });

  const url = new URL(window.location);
  if (fmt === "all") {
    url.searchParams.delete("format");
  } else {
    url.searchParams.set("format", fmt);
  }
  window.history.replaceState({}, "", url);

  renderHomepageEvents(fmt);
}

function selectFormat(fmt, e) {
  if (e) e.stopPropagation();
  selectFormatFromHome(fmt);
  if (window.innerWidth <= 768) {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("menuOverlay");
    if (sidebar) sidebar.classList.remove("mobile-open");
    if (overlay) overlay.classList.remove("open");
  }
}

function renderHomepageEvents(fmt) {
  const grid = document.getElementById("eventsGrid");
  const badge = document.getElementById("eventsCountBadge");
  const title = document.getElementById("eventsPanelTitle");
  if (!grid) return;

  const filtered = (!fmt || fmt === "all") 
    ? mockEvents 
    : mockEvents.filter(e => e.format === fmt);

  if (badge) {
    badge.textContent = `${filtered.length} événement${filtered.length > 1 ? 's' : ''}`;
  }

  if (title) {
    if (fmt && fmt !== "all") {
      title.textContent = `Événements — ${fmt.charAt(0).toUpperCase() + fmt.slice(1)}`;
    } else {
      title.textContent = I18N.t("featuredEvents");
    }
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="event-placeholder-box">
        <div class="event-img-placeholder"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg></div>
        <p class="event-label" data-i18n="noEvents">${I18N.t('noEvents')}</p>
        <p class="event-sublabel" data-i18n="eventsSublabel">${I18N.t('eventsSublabel')}</p>
      </div>
    `;
  } else {
    grid.innerHTML = `
      <div class="events-list-grid">
        ${filtered.map(event => `
          <div class="event-card">
            <div class="event-card-media">
              <img src="${event.img}" alt="${event.name}" class="event-img" onerror="this.src='assets/images/IMG_6262.jpg'">
              <span class="event-format-chip">${event.format.toUpperCase()}</span>
            </div>
            <div class="event-info">
              <div class="event-meta-row">
                <span class="event-date-badge">${event.date} • ${event.time || '18:00'}</span>
                <span class="event-entry-badge">${event.entry || 'Entrée'}</span>
              </div>
              <h3 class="event-name-title">${event.name}</h3>
              <p class="event-location-text">${event.location}</p>
              <p class="event-desc-text">${event.details}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  if (typeof I18N !== 'undefined') I18N.updateDOM();
}

function renderHomeStores() {
  const container = document.getElementById("homeStoresGrid");
  if (!container || typeof sites === "undefined") return;

  container.innerHTML = sites.map(site => `
    <a href="card.html?name=Sol%20Ring" class="home-store-chip" title="Acheter chez ${site.nome}" target="_blank" onclick="event.preventDefault(); searchCardForStore('${site.id}');">
      ${site.logo ? `<img src="${site.logo}" alt="${site.nome}" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">` : ''}
      <span class="home-store-name" style="${site.logo ? 'display:none;' : ''}">${site.nome}</span>
      <span class="home-store-ext-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg></span>
    </a>
  `).join('');
}

function searchCardForStore(storeId) {
  const searchInput = document.getElementById("headerSearchInput");
  if (searchInput && searchInput.value.trim()) {
    window.location.href = `card.html?name=${encodeURIComponent(searchInput.value.trim())}`;
  } else {
    window.location.href = `card.html?set=dsk`;
  }
}

function focusHeaderSearch() {
  const input = document.getElementById("headerSearchInput");
  if (input) {
    input.focus();
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function triggerImportFile() {
  const sidebar = document.getElementById("sidebar");
  if (sidebar && sidebar.classList.contains("collapsed")) {
    toggleSidebar();
  }
  const fileSection = document.getElementById("sectionImport");
  if (fileSection && !fileSection.classList.contains("active")) {
    toggleSection("sectionImport");
  }
  const fileInput = document.getElementById("arquivoInput");
  if (fileInput) {
    fileInput.click();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const format = params.get("format") || "all";

  currentHomeFormat = format;

  document.querySelectorAll(".format-pill").forEach(pill => {
    pill.classList.toggle("active", pill.dataset.format === format);
  });

  renderHomepageEvents(format);
  renderHomeStores();
});
