
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
    detailsFr: "Tournoi amical Standard. Venez tester vos nouveaux decks et gagner des boosters promos !",
    detailsEn: "Casual Standard tournament. Come test your new decks and win promo boosters!",
    entryFr: "10$",
    entryEn: "$10",
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
    detailsFr: "Entrée: 10$. Boosters de participation et dotation en cartes promos aux vainqueurs.",
    detailsEn: "Entry: $10. Participation boosters and promo cards awarded to winners.",
    entryFr: "10$",
    entryEn: "$10",
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
    detailsFr: "Format Modern compétitif. Decklist requise. Qualificatif pour le tournoi régional.",
    detailsEn: "Competitive Modern format. Decklist required. Regional tournament qualifier.",
    entryFr: "25$",
    entryEn: "$25",
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
    detailsFr: "Venez jouer en Commander (EDH) multijoueur. Tables libres et ambiance conviviale !",
    detailsEn: "Come play multiplayer Commander (EDH). Open tables and friendly atmosphere!",
    entryFr: "Gratuit",
    entryEn: "Free",
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
    const noun = I18N.t(filtered.length > 1 ? 'eventCountPlural' : 'eventCountSingular');
    badge.textContent = `${filtered.length} ${noun}`;
  }

  if (title) {
    if (fmt && fmt !== "all") {
      title.textContent = `${I18N.t('eventsHeaderPrefix')}${fmt.charAt(0).toUpperCase() + fmt.slice(1)}`;
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
        ${filtered.map(event => {
          const kind = ['Standard', 'Pioneer', 'Modern', 'Commander'][event.id - 1];
          const name = I18N.t(`event${kind}Name`);
          const details = I18N.t(`event${kind}Details`);
          const entry = event.id === 4 ? I18N.t('freeEntry') : new Intl.NumberFormat(I18N.current, { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(event.id === 3 ? 25 : 10);
          const date = new Date(Date.UTC(2026, event.month === 'JUN' ? 5 : 6, Number(event.day))).toLocaleDateString(I18N.current, { day: 'numeric', month: 'short', timeZone: 'UTC' });
          return `
            <div class="event-card">
              <div class="event-card-media">
                <img src="${event.img}" alt="${name}" class="event-img" onerror="this.src='assets/images/IMG_6262.jpg'">
                <span class="event-format-chip">${event.format.toUpperCase()}</span>
              </div>
              <div class="event-info">
                <div class="event-meta-row">
                  <span class="event-date-badge">${date} • ${event.time || '18:00'}</span>
                  <span class="event-entry-badge">${entry}</span>
                </div>
                <h3 class="event-name-title">${name}</h3>
                <p class="event-location-text">${event.location}</p>
                <p class="event-desc-text">${details}</p>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  if (typeof I18N !== 'undefined') I18N.updateDOM();
  const notice = document.createElement('p'); notice.className = 'demo-notice'; notice.textContent = I18N.t('demoNotice'); grid.prepend(notice);
}

function renderHomeStores() {
  const container = document.getElementById("homeStoresGrid");
  if (!container || typeof sites === "undefined") return;

  const titlePrefix = I18N.t('buyAt');

  container.innerHTML = storesForGame().map(site => `
    <a href="card.html?name=Sol%20Ring" class="home-store-chip" title="${titlePrefix} ${site.nome}" target="_blank" onclick="event.preventDefault(); searchCardForStore('${site.id}');">
      ${site.logo ? `<img src="${site.logo}" alt="${site.nome}" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">` : ''}
      <span class="home-store-name" style="${site.logo ? 'display:none;' : ''}">${site.nome}</span>
      <span class="home-store-ext-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg></span>
    </a>
  `).join('');
}

function searchCardForStore(storeId) {
  const searchInput = document.getElementById("headerSearchInput");
  if (searchInput && searchInput.value.trim()) {
    window.location.href = gameUrl('card.html', { name: searchInput.value.trim() });
  } else {
    window.location.href = gameUrl('card.html', CardData.game === 'mtg' ? { set: 'dsk' } : {});
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

let popularSetsData = null;
async function loadHeroCards() {
  const slots = [...document.querySelectorAll('.hero-card-back')];
  const game = CardData.game;
  const names = game === 'pokemon' ? ['Pikachu', 'Charizard', 'Eevee'] : ['Lightning Bolt', 'Sol Ring', 'Black Lotus'];
  await Promise.allSettled(slots.map(async (slot, index) => {
    const fallback = slot.querySelector('span');
    try {
      const card = await CardData.provider(game).named(names[index]);
      const url = card.images.normal || card.images.small;
      if (!slot.isConnected || !url || !/^https:\/\//i.test(url)) { I18N.bind(fallback, 'imageUnavailable'); return; }
      const img = document.createElement('img');
      img.alt = card.name; img.width = 488; img.height = 680; img.decoding = 'async';
      img.onload = () => slot.classList.add('has-image');
      img.onerror = () => { img.remove(); slot.classList.remove('has-image'); I18N.bind(fallback, 'imageUnavailable'); };
      slot.href = gameUrl('card-detail.html', { id: card.id });
      slot.title = card.name;
      img.src = url; slot.append(img);
    } catch { I18N.bind(fallback, 'imageUnavailable'); }
  }));
}
async function loadPopularSets() {
  const grid = document.getElementById("popularSetsGrid");
  if (!grid) return;
  grid.replaceChildren();
  const status = document.createElement('p'); I18N.bind(status, 'loading'); grid.append(status);
  try {
    const sets = popularSetsData || await CardData.provider().sets();
    popularSetsData = sets;
    const relevantTypes = ['expansion', 'core', 'masters', 'draft_innovation'];
    
    const latestSets = sets
      .filter(s => relevantTypes.includes(s.set_type) && !s.digital && s.card_count > 20)
      .sort((a, b) => new Date(b.released_at) - new Date(a.released_at))
      .slice(0, 8);

    if (latestSets.length > 0) {
      grid.replaceChildren();
      latestSets.forEach(set => {
        const year = set.released_at ? new Date(set.released_at).getFullYear() : '';
        const link = document.createElement('a'); link.className = 'popular-set-card'; link.href = gameUrl('card.html', { set: set.code });
        const symbol = createSetSymbol(set);
        const info = document.createElement('div'); info.className = 'popular-set-info';
        const title = document.createElement('h4'); title.textContent = set.name;
        const detail = document.createElement('p'); detail.textContent = [year, `${set.card_count} ${I18N.t('catalogCardCount')}`].filter(Boolean).join(' · ');
        info.append(title, detail); link.append(symbol, info); grid.append(link);
      });
    } else {
      I18N.bind(status, 'noCollectionsFound'); grid.replaceChildren(status);
    }
  } catch (e) {
    I18N.bind(status, e.code || 'sourceUnavailable');
    const retry = document.createElement('button'); retry.className = 'btn-secondary'; retry.textContent = I18N.t('retry'); retry.onclick = loadPopularSets; grid.append(retry);
  }
}

window.addEventListener('languageChanged', () => {
  renderHomepageEvents(currentHomeFormat);
  renderHomeStores();
  loadPopularSets();
});

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const format = params.get("format") || "all";

  currentHomeFormat = format;

  document.querySelectorAll(".format-pill").forEach(pill => {
    pill.classList.toggle("active", pill.dataset.format === format);
  });

  renderHomepageEvents(format);
  renderHomeStores();
  loadPopularSets();
  void loadHeroCards();
});

