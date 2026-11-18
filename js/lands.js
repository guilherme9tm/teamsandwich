const Lands = (() => {
  const cycles = {
    fetch: { label: 'Fetchlands', cards: ['Arid Mesa', 'Marsh Flats', 'Misty Rainforest', 'Scalding Tarn', 'Verdant Catacombs', 'Flooded Strand', 'Polluted Delta', 'Bloodstained Mire', 'Wooded Foothills', 'Windswept Heath'] },
    shock: { label: 'Shocklands', cards: ['Hallowed Fountain', 'Watery Grave', 'Blood Crypt', 'Stomping Ground', 'Temple Garden', 'Godless Shrine', 'Steam Vents', 'Overgrown Tomb', 'Sacred Foundry', 'Breeding Pool'] },
    fast: { label: 'Fast Lands', cards: ['Seachrome Coast', 'Darkslick Shores', 'Blackcleave Cliffs', 'Copperline Gorge', 'Razorverge Thicket', 'Concealed Courtyard', 'Spirebluff Canal', 'Blooming Marsh', 'Inspiring Vantage', 'Botanical Sanctum'] },
    dual: { label: 'Original Dual Lands', cards: ['Tundra', 'Underground Sea', 'Badlands', 'Taiga', 'Savannah', 'Scrubland', 'Volcanic Island', 'Bayou', 'Plateau', 'Tropical Island'] },
    check: { label: 'Check Lands', cards: ['Glacial Fortress', 'Drowned Catacomb', 'Dragonskull Summit', 'Rootbound Crag', 'Sunpetal Grove', 'Isolated Chapel', 'Sulfur Falls', 'Woodland Cemetery', 'Clifftop Retreat', 'Hinterland Harbor'] },
    pain: { label: 'Pain Lands', cards: ['Adarkar Wastes', 'Underground River', 'Sulfurous Springs', 'Karplusan Forest', 'Brushland', 'Caves of Koilos', 'Shivan Reef', 'Llanowar Wastes', 'Battlefield Forge', 'Yavimaya Coast'] },
    filter: { label: 'Filter Lands', cards: ['Mystic Gate', 'Sunken Ruins', 'Graven Cairns', 'Fire-Lit Thicket', 'Wooded Bastion', 'Fetid Heath', 'Cascade Bluffs', 'Twilight Mire', 'Rugged Prairie', 'Flooded Grove'] },
    bond: { label: 'Bond Lands', cards: ['Sea of Clouds', 'Morphic Pool', 'Luxury Suite', 'Spire Garden', 'Bountiful Promenade', 'Vault of Champions', 'Training Center', 'Undergrowth Stadium', 'Spectator Seating', 'Rejuvenating Springs'] },
    horizon: { label: 'Horizon Lands', cards: ['Horizon Canopy', 'Silent Clearing', 'Fiery Islet', 'Nurturing Peatland', 'Sunbaked Canyon', 'Waterlogged Grove'] },
    pathway: { label: 'Pathway Lands', cards: ['Brightclimb Pathway', 'Clearwater Pathway', 'Riverglide Pathway', 'Cragcrown Pathway', 'Branchloft Pathway', 'Needleverge Pathway', 'Hengegate Pathway', 'Blightstep Pathway', 'Darkbore Pathway', 'Barkchannel Pathway'] },
    triome: { label: 'Triomes', cards: ['Indatha Triome', 'Ketria Triome', 'Raugrin Triome', 'Savai Triome', 'Zagoth Triome', "Raffine's Tower", "Spara's Headquarters", "Xander's Lounge", "Ziatora's Proving Ground", "Jetmir's Garden"] },
    surveil: { label: 'Surveil Lands', cards: ['Meticulous Archive', 'Undercity Sewers', 'Raucous Theater', 'Commercial District', 'Lush Portico', 'Shadowy Backstreet', 'Thundering Falls', 'Underground Mortuary', 'Elegant Parlor', 'Hedge Maze'] },
    utility: { label: 'Utility Lands', cards: ['Boseiju, Who Endures', 'Otawara, Soaring City', 'Urza\'s Saga', 'Wasteland', 'Strip Mine', 'Field of Ruin', 'Cavern of Souls', 'Ancient Tomb', 'City of Traitors', 'Karakas'] },
    creature: { label: 'Manlands / Creature Lands', cards: ['Celestial Colonnade', 'Creeping Tar Pit', 'Lavaclaw Reaches', 'Raging Ravine', 'Stirring Wildwood', 'Shambling Vent', 'Wandering Fumarole', 'Hissing Quagmire', 'Needle Spires', 'Lumbering Falls', 'Mutavault', 'Mishra\'s Factory'] }
  };
  const active = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('view') === 'lands' && CardData.game === 'mtg';
  let cycle = 'fetch';
  let color = '';
  let format = '';
  let name = '';
  function query() {
    const names = cycles[cycle].cards.map(card => `!"${card}"`).join(' or ');
    return `t:land (${names})${color ? ` id<=${color}` : ''}${format ? ` legal:${format}` : ''}`;
  }
  function includes(cycleId, cardName) {
    return !!cycles[cycleId]?.cards.includes(cardName.split(' // ')[0]);
  }
  function init() {
    if (!active) return;
    const title = document.getElementById('searchTitle');
    if (title) title.textContent = I18N.t('lands');
    const controls = document.createElement('form');
    controls.className = 'lands-controls';
    controls.innerHTML = `<label><span data-i18n="cycle"></span><select id="landCycle">${Object.entries(cycles).map(([id, data]) => `<option value="${id}">${data.label}</option>`).join('')}</select></label>
      <label><span data-i18n="filterByColor"></span><select id="landColor"><option value="" data-i18n="all"></option>${['W', 'U', 'B', 'R', 'G', 'WU', 'UB', 'BR', 'RG', 'GW', 'WB', 'UR', 'BG', 'RW', 'GU', 'WUBRG'].map(value => `<option>${value}</option>`).join('')}</select></label>
      <label><span data-i18n="formats"></span><select id="landFormat"><option value="" data-i18n="all"></option>${['standard', 'pioneer', 'modern', 'legacy', 'vintage', 'pauper', 'commander'].map(value => `<option>${value}</option>`).join('')}</select></label>
      <label><span data-i18n="searchPlaceholder"></span><input id="landName" type="search"></label>
      <label><span data-i18n="sort"></span><select id="landSort"><option value="alpha" data-i18n="sortAZ"></option><option value="price-asc" data-i18n="priceLowToHigh"></option><option value="price-desc" data-i18n="priceHighToLow"></option></select></label>`;
    document.querySelector('.results-section').before(controls);
    controls.onsubmit = event => event.preventDefault();
    controls.onchange = async event => {
      if (event.target.id === 'landSort') { activeSort = event.target.value; applyFilters(); return; }
      if (event.target.id === 'landName') return;
      searchController.abort();
      searchController = new AbortController();
      cycle = controls.querySelector('#landCycle').value;
      color = controls.querySelector('#landColor').value;
      format = controls.querySelector('#landFormat').value;
      allCards = []; nextRemotePage = 1; remoteTotal = null;
      while (isLoadingCards) await new Promise(resolve => setTimeout(resolve, 20));
      applyFilters();
      await loadNextCards();
    };
    controls.querySelector('#landName').oninput = event => { name = event.target.value.trim().toLowerCase(); applyFilters(); };
    activeSort = 'alpha';
    I18N.updateDOM();
  }
  return { active, cycles, query, includes, init, matches: card => !active || card.name.toLowerCase().includes(name) };
})();
if (typeof module !== 'undefined') module.exports = Lands;
