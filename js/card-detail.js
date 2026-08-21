
let currentCardData = null;
let currentFrenchCardData = null;
let currentFaceIndex = 0;

function goBackOrHome() {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = "index.html";
  }
}

function formatManaSymbol(symbol) {
  const clean = symbol.replace(/[{}]/g, '').replace('/', '');
  return `<img src="https://svgs.scryfall.io/card-symbols/${clean}.svg" class="oracle-mana-img" alt="${symbol}">`;
}

function formatOracleText(text) {
  if (!text) return '';
  
  let formatted = text.replace(/\{[^}]+\}/g, match => formatManaSymbol(match));
  
  formatted = formatted.replace(/\(([^)]+)\)/g, '<em>($1)</em>');
  
  return formatted;
}

function formatManaCost(manaCost) {
  if (!manaCost) return '';
  return manaCost.replace(/\{[^}]+\}/g, match => formatManaSymbol(match));
}

async function fetchFrenchCardData(card) {
  if (!card) return null;

  if (card.set && card.collector_number) {
    try {
      const res = await fetch(`https://api.scryfall.com/cards/${card.set}/${card.collector_number}/fr`, {
        headers: { 'Accept': 'application/json;q=0.9,*/*;q=0.8' }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {}
  }

  if (card.oracle_id) {
    try {
      const res = await fetch(`https://api.scryfall.com/cards/search?q=oracleid:${card.oracle_id}+lang:fr`, {
        headers: { 'Accept': 'application/json;q=0.9,*/*;q=0.8' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.data && data.data.length > 0) {
          return data.data[0];
        }
      }
    } catch (e) {}
  }

  if (card.name) {
    try {
      const res = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}&lang=fr`, {
        headers: { 'Accept': 'application/json;q=0.9,*/*;q=0.8' }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {}
  }

  return null;
}

async function loadCardDetails() {
  const params = new URLSearchParams(window.location.search);
  const container = document.getElementById("detailContainer");
  const breadcrumb = document.getElementById("breadcrumbCurrent");

  if (!params.has("id") && !params.has("name")) {
    if (container) {
      container.innerHTML = `
        <div class="detail-loading-state">
          <h3>${I18N.t('noCardSpecifiedTitle')}</h3>
          <p>${I18N.t('noCardSpecifiedDesc')}</p>
          <a href="index.html" class="btn-primary" style="margin-top:10px;">${I18N.t('backToHome')}</a>
        </div>
      `;
    }
    return;
  }

  let apiUrl = '';
  if (params.has("id")) {
    apiUrl = `https://api.scryfall.com/cards/${encodeURIComponent(params.get("id"))}`;
  } else if (params.has("name")) {
    apiUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(params.get("name"))}`;
  }

  try {
    let res = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json;q=0.9,*/*;q=0.8' }
    });

    if (!res.ok && params.has("name")) {
      res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(params.get("name"))}`, {
        headers: { 'Accept': 'application/json;q=0.9,*/*;q=0.8' }
      });
    }

    if (!res.ok) {
      throw new Error("Carte non trouvée");
    }

    currentCardData = await res.json();
    document.title = `${currentCardData.name} — TEAM SANDWICH`;
    if (breadcrumb) breadcrumb.textContent = currentCardData.name;

    if (I18N.current === 'fr') {
      currentFrenchCardData = await fetchFrenchCardData(currentCardData);
    }

    renderCardDetailView(currentCardData);
  } catch (err) {
    console.error("Card detail error:", err);
    if (container) {
      container.innerHTML = `
        <div class="detail-loading-state">
          <h3>${I18N.t('cardNotFoundTitle')}</h3>
          <p>${I18N.t('cardNotFoundDesc')}</p>
          <button onclick="goBackOrHome()" class="btn-primary" style="margin-top:10px;">${I18N.t('backBtn')}</button>
        </div>
      `;
    }
  }
}

function getCardActiveFace(card) {
  if (card.card_faces && card.card_faces.length > 1 && card.card_faces[0].image_uris) {
    return card.card_faces[currentFaceIndex];
  }
  return card;
}

function toggleCardFace() {
  if (!currentCardData || !currentCardData.card_faces) return;
  currentFaceIndex = currentFaceIndex === 0 ? 1 : 0;
  renderCardDetailView(currentCardData);
}

function renderCardDetailView(card) {
  const container = document.getElementById("detailContainer");
  if (!container) return;

  const isFrench = typeof I18N !== 'undefined' && I18N.current === 'fr';
  const frCard = isFrench ? currentFrenchCardData : null;

  const isDoubleFaced = card.card_faces && card.card_faces.length > 1 && card.card_faces[0].image_uris;
  const activeFace = isDoubleFaced ? card.card_faces[currentFaceIndex] : card;
  const frActiveFace = (frCard && frCard.card_faces && frCard.card_faces.length > currentFaceIndex)
    ? frCard.card_faces[currentFaceIndex]
    : (frCard || null);

  let imgUrl = activeFace.image_uris?.large || activeFace.image_uris?.normal || card.image_uris?.large || card.image_uris?.normal || '';
  if (isFrench && frActiveFace) {
    const frImg = frActiveFace.image_uris?.large || frActiveFace.image_uris?.normal || frCard?.image_uris?.large || frCard?.image_uris?.normal;
    if (frImg) {
      imgUrl = frImg;
    }
  }
  if (imgUrl) imgUrl = imgUrl.split('?')[0];

  const manaCostHtml = formatManaCost(activeFace.mana_cost || card.mana_cost || '');

  let rawOracleText = activeFace.oracle_text || card.oracle_text || '';
  if (isFrench && frActiveFace) {
    rawOracleText = frActiveFace.printed_text || frActiveFace.oracle_text || frCard.printed_text || frCard.oracle_text || rawOracleText;
  }
  const oracleHtml = formatOracleText(rawOracleText);

  let nameDisplay = activeFace.name || card.name;
  if (isFrench && frActiveFace) {
    const frName = frActiveFace.printed_name || frActiveFace.name || frCard.printed_name || frCard.name;
    if (frName && frName !== nameDisplay) {
      nameDisplay = `${frName} <span style="font-size:0.7em; opacity:0.8; font-weight:normal; margin-left:6px;">(${activeFace.name || card.name})</span>`;
    }
  }

  let typeLineDisplay = activeFace.type_line || card.type_line;
  if (isFrench && frActiveFace) {
    typeLineDisplay = frActiveFace.printed_type_line || frActiveFace.type_line || frCard.printed_type_line || frCard.type_line || typeLineDisplay;
  }

  let flavorText = activeFace.flavor_text || card.flavor_text || '';
  if (isFrench && frActiveFace) {
    flavorText = frActiveFace.flavor_text || frCard.flavor_text || flavorText;
  }

  const usd = parseFloat(card.prices?.usd) || 0;
  const usdFoil = parseFloat(card.prices?.usd_foil) || 0;
  const cadReg = usd ? `CAD ${(usd * 1.38).toFixed(2)}` : I18N.t('unavailable');
  const cadFoil = usdFoil ? `CAD ${(usdFoil * 1.38).toFixed(2)}` : I18N.t('unavailable');

  const statsHtml = (activeFace.power !== undefined && activeFace.toughness !== undefined)
    ? `<div class="detail-stat-pill">${I18N.t('powerToughness')} ${activeFace.power} / ${activeFace.toughness}</div>`
    : (activeFace.loyalty !== undefined
      ? `<div class="detail-stat-pill">${I18N.t('startingLoyalty')} ${activeFace.loyalty}</div>`
      : (activeFace.defense !== undefined
        ? `<div class="detail-stat-pill">${I18N.t('defense')} ${activeFace.defense}</div>`
        : ''));

  const majorFormats = ['standard', 'pioneer', 'modern', 'commander', 'legacy', 'pauper'];
  const legalitiesHtml = majorFormats.map(fmt => {
    const status = card.legalities?.[fmt] || 'not_legal';
    const statusLabel = status === 'legal' ? I18N.t('legal') : (status === 'banned' ? I18N.t('banned') : (status === 'restricted' ? I18N.t('restricted') : I18N.t('notLegal')));
    return `
      <div class="legality-item">
        <span class="legality-name">${fmt}</span>
        <span class="legality-status ${status}">${statusLabel}</span>
      </div>
    `;
  }).join('');

  const encodedCardName = encodeURIComponent(card.name);
  const storesList = typeof sites !== 'undefined' ? sites : [];
  const storesHtml = storesList.map(site => {
    return `
      <a href="${site.link(encodedCardName)}" target="_blank" rel="noopener noreferrer" class="detail-store-item" title="${I18N.t('searchAtStore')} ${site.nome}">
        <div class="detail-store-left">
          ${site.logo ? `<img src="${site.logo}" alt="${site.nome}" class="detail-store-logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">` : ''}
          <span class="detail-store-name" style="${site.logo ? 'display:none;' : ''}">${site.nome}</span>
        </div>
        <span class="detail-store-cta">
          <span>${I18N.t('viewPrice')}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
        </span>
      </a>
    `;
  }).join('');

  const rarityClass = card.rarity || 'common';
  const rarityKey = `rarity${rarityClass.charAt(0).toUpperCase() + rarityClass.slice(1)}`;
  const rarityName = I18N.dict.fr[rarityKey] ? I18N.t(rarityKey) : (rarityClass.charAt(0).toUpperCase() + rarityClass.slice(1));
  const setSvgUri = card.set_uri ? `https://svgs.scryfall.io/sets/${card.set}.svg` : '';

  container.innerHTML = `
    <div class="detail-grid">
      
      <div class="detail-left-col">
        <div class="detail-card-frame">
          <img src="${imgUrl}" alt="${activeFace.name || card.name}" class="detail-card-img" onerror="this.src='assets/images/IMG_6262.jpg'">
        </div>

        ${isDoubleFaced ? `
          <button class="detail-flip-btn" onclick="toggleCardFace()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            <span>${currentFaceIndex === 0 ? I18N.t('flipCardBack') : I18N.t('flipCardFront')}</span>
          </button>
        ` : ''}

        <div class="detail-legalities-box">
          <div class="detail-legalities-title">${I18N.t('formatLegalities')}</div>
          <div class="legalities-grid">
            ${legalitiesHtml}
          </div>
        </div>
      </div>

      <div class="detail-right-col">
        
        <div class="detail-header-card">
          <div class="detail-title-row">
            <h1 class="detail-card-name">${nameDisplay}</h1>
            <div class="detail-mana-cost">${manaCostHtml}</div>
          </div>

          <div class="detail-type-row">
            <span class="detail-type-line">${typeLineDisplay}</span>
            <span class="detail-rarity-chip ${rarityClass}">${rarityName}</span>
            <span class="detail-set-badge">
              ${setSvgUri ? `<img src="${setSvgUri}" alt="${card.set_name}" onerror="this.style.display='none'">` : ''}
              <span>${card.set_name} (#${card.collector_number})</span>
            </span>
          </div>
        </div>

        <div class="detail-oracle-box">
          <div class="detail-section-title">${I18N.t('oracleTextTitle')}</div>
          
          <div class="detail-oracle-text">${oracleHtml || `<em>${I18N.t('noOracleText')}</em>`}</div>

          ${flavorText ? `
            <div class="detail-flavor-box">
              "${flavorText}"
            </div>
          ` : ''}

          ${statsHtml ? `
            <div class="detail-stats-bar">
              ${statsHtml}
            </div>
          ` : ''}
        </div>

        <div class="detail-prices-box">
          <div class="detail-price-card">
            <span class="detail-price-label">${I18N.t('estimatedPriceReg')}</span>
            <span class="detail-price-val">${cadReg}</span>
            <span class="detail-price-sub">${usd ? `~$${usd.toFixed(2)} USD` : I18N.t('averagePrice')}</span>
          </div>
          <div class="detail-price-card">
            <span class="detail-price-label">${I18N.t('estimatedPriceFoil')}</span>
            <span class="detail-price-val">${cadFoil}</span>
            <span class="detail-price-sub">${usdFoil ? `~$${usdFoil.toFixed(2)} USD` : I18N.t('averagePrice')}</span>
          </div>
        </div>

        <div class="detail-stores-section">
          <div class="detail-stores-header">
            <div class="detail-stores-title-group">
              <h3>${I18N.t('storesSectionTitle')}</h3>
              <p>${I18N.t('storesSectionDesc')}</p>
            </div>
          </div>

          <div class="detail-stores-grid">
            ${storesHtml}
          </div>
        </div>

        <div class="detail-card-meta-footer">
          ${I18N.t('illustrator')} <strong>${activeFace.artist || card.artist || I18N.t('unknownArtist')}</strong> • © Wizards of the Coast • ${I18N.t('dataProvidedBy')}
        </div>

      </div>

    </div>
  `;
}

window.addEventListener('languageChanged', async () => {
  if (currentCardData) {
    if (I18N.current === 'fr' && !currentFrenchCardData) {
      currentFrenchCardData = await fetchFrenchCardData(currentCardData);
    }
    renderCardDetailView(currentCardData);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  loadCardDetails();
});


