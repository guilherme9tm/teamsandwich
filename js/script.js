// ===========================
// SCRIPT.JS — INDEX PAGE LOGIC
// ===========================

// Mock events data with standard formats
const mockEvents = [
  {
    id: 1,
    name: "Friday Night Magic - Standard",
    format: "standard",
    date: "26 Jun",
    day: "26",
    month: "JUN",
    location: "Boutique Sandwich",
    img: "assets/images/mtg_standard_event.png",
    details: "Tournoi amical Standard. Venez tester vos nouveaux decks !",
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
    location: "L'Abyss MTG",
    img: "assets/images/mtg_pioneer_event.png",
    details: "Entrée: 10$. Boosters de participation et dotation aux vainqueurs.",
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
    location: "Face to Face Games",
    img: "assets/images/mtg_modern_event.png",
    details: "Format Modern compétitif. Decklist requise.",
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
    location: "Chez Geeks",
    img: "assets/images/mtg_commander_event.png",
    details: "Venez jouer en Commander (EDH) multijoueur. Tables libres !",
    ranking: [
      { pos: 1, name: "Arthur", pts: "9 pts" },
      { pos: 2, name: "Nicolas", pts: "6 pts" },
      { pos: 3, name: "Valérie", pts: "6 pts" }
    ]
  }
];

function filterHomepageEvents(fmt) {
  const grid = document.getElementById("eventsGrid");
  const panelEvents = document.getElementById("panelEvents");
  const welcomeSection = document.getElementById("welcomeSection");
  if (!grid || !panelEvents || !welcomeSection) return;

  // If no format selected/clicked yet, hide the events panel completely, show welcome Section
  if (!fmt || fmt === "") {
    welcomeSection.classList.remove("hidden");
    panelEvents.classList.add("hidden");

    if (typeof I18N !== 'undefined') I18N.updateDOM();
    return;
  }

  // Otherwise, show events panel and hide welcome section
  welcomeSection.classList.add("hidden");
  panelEvents.classList.remove("hidden");

  // Filter events
  const filtered = fmt === "all" ? mockEvents : mockEvents.filter(e => e.format === fmt);

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="event-card placeholder-card" style="width: 100%; border: 2px dashed var(--border-medium); padding: 40px 20px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; height: 100%;">
        <div class="event-img-placeholder" style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; background: var(--bg-glass); border-radius: 50%; font-size: 2rem;"><span>📸</span></div>
        <p class="event-label" data-i18n="noEvents">Aucun événement pour le moment</p>
        <p class="event-sublabel" data-i18n="eventsSublabel">Les photos des événements apparaîtront ici</p>
      </div>
    `;
    if (typeof I18N !== 'undefined') I18N.updateDOM();
  } else {
    grid.innerHTML = `
      <div class="events-list-grid">
        ${filtered.map(event => `
          <div class="event-card" style="border: 1px solid var(--border-subtle); border-radius: var(--radius-md); overflow: hidden; display: flex; flex-direction: column; background: var(--bg-card); transition: var(--transition);">
            <img src="${event.img}" alt="${event.name}" class="event-img" style="width: 100%; height: 140px; object-fit: cover;" onerror="this.src='assets/images/IMG_6262.jpg'">
            <div class="event-info" style="padding: 14px; display: flex; flex-direction: column; gap: 6px;">
              <span class="event-date-badge" style="display: inline-block; align-self: flex-start; padding: 3px 6px; background: var(--accent); color: white; font-size: 0.7rem; font-weight: 700; border-radius: 4px;">${event.date}</span>
              <h3 class="event-name-title" style="font-size: 0.95rem; font-weight: 700; margin: 4px 0 0 0; color: var(--text-primary);">${event.name}</h3>
              <p class="event-location-text" style="font-size: 0.8rem; color: var(--text-secondary); margin: 0;">📍 ${event.location}</p>
              <p class="event-desc-text" style="font-size: 0.78rem; color: var(--text-muted); margin: 0; line-height: 1.3;">${event.details}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
}

// On page load, read URL format parameter and apply filter
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const format = params.get("format") || ""; // Default is empty to trigger select format prompt!

  // Sync sidebar active class
  if (format) {
    document.querySelectorAll('.format-links li').forEach(li => {
      li.classList.toggle('active', li.dataset.format === format);
    });
  } else {
    document.querySelectorAll('.format-links li').forEach(li => {
      li.classList.remove('active');
    });
  }

  filterHomepageEvents(format);
});
