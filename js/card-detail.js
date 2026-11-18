
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
  const clean = symbol.replace(/[^a-z0-9]/gi, '');
  return `<img src="https://svgs.scryfall.io/card-symbols/${clean}.svg" class="oracle-mana-img" alt="${escapeHTML(symbol)}">`;
}

function formatOracleText(text) {
  if (!text) return '';
  
  let formatted = escapeHTML(text).replace(/\{[^}]+\}/g, match => formatManaSymbol(match));
  
  formatted = formatted.replace(/\(([^)]+)\)/g, '<em>($1)</em>');
  
  return formatted;
}

function formatManaCost(manaCost) {
  if (!manaCost) return '';
  return escapeHTML(manaCost).replace(/\{[^}]+\}/g, match => formatManaSymbol(match));
}

let frenchRequest = null;
let frenchLoaded = false;

async function loadFrenchDetails() {
  if (!currentCardData || currentCardData.metadata?.cardLanguage !== 'fr' || frenchLoaded) return;
  if (frenchRequest) return frenchRequest;
  frenchRequest = (async () => {
    try {
      const localized = await CardData.provider().localized(currentCardData, 'fr');
      currentFrenchCardData = localized ? CardData.toView(localized) : null;
      frenchLoaded = true;
      if (I18N.current === 'fr') renderCardDetailView(currentCardData);
    } catch (error) {
      // The primary card remains usable when translation is unavailable.
    } finally { frenchRequest = null; }
  })();
  return frenchRequest;
}

async function loadCardDetails() {
  const params = new URLSearchParams(window.location.search);
  const container = document.getElementById('detailContainer');
  const breadcrumb = document.getElementById('breadcrumbCurrent');
  if (!params.get('id') && !params.get('name')) {
    container.innerHTML = `<div class="detail-loading-state"><h3>${I18N.t('noCardSpecifiedTitle')}</h3><p>${I18N.t('noCardSpecifiedDesc')}</p><a href="index.html" class="btn-primary">${I18N.t('backToHome')}</a></div>`;
    return;
  }
  container.innerHTML = `<div class="detail-loading-state"><div class="spinner"></div><p>${I18N.t('loadingCardInfo')}</p></div>`;
  try {
    const provider = CardData.provider();
    let result;
    if (params.get('id')) {
      result = await provider.get(params.get('id'));
    } else result = await provider.named(params.get('name'));
    currentCardData = CardData.toView(result);
    document.title = `${currentCardData.name} — TEAM SANDWICH`;
    if (breadcrumb) breadcrumb.textContent = currentCardData.name;
    renderCardDetailView(currentCardData);
    void loadAlternateArts();
  } catch (error) {
    container.innerHTML = `<div class="detail-loading-state"><h3>${I18N.t(error.code || 'sourceUnavailable')}</h3><button type="button" onclick="loadCardDetails()" class="btn-primary">${I18N.t('retry')}</button><button type="button" onclick="goBackOrHome()" class="btn-secondary">${I18N.t('backBtn')}</button></div>`;
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

  const isFrench = false;
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

  let nameDisplay = escapeHTML(activeFace.name || card.name);
  if (isFrench && frActiveFace) {
    const frName = frActiveFace.printed_name || frActiveFace.name || frCard.printed_name || frCard.name;
    if (frName && frName !== nameDisplay) {
      nameDisplay = `${escapeHTML(frName)} <span style="font-size:0.7em; opacity:0.8; font-weight:normal; margin-left:6px;">(${escapeHTML(activeFace.name || card.name)})</span>`;
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

  const priceRecords = CardPrices.entries(card);
  const mainPrice = CardPrices.main(card);

  const statsHtml = (activeFace.power !== undefined && activeFace.toughness !== undefined)
    ? `<div class="detail-stat-pill">${I18N.t('powerToughness')} ${escapeHTML(activeFace.power)} / ${escapeHTML(activeFace.toughness)}</div>`
    : (activeFace.loyalty !== undefined
      ? `<div class="detail-stat-pill">${I18N.t('startingLoyalty')} ${escapeHTML(activeFace.loyalty)}</div>`
      : (activeFace.defense !== undefined
        ? `<div class="detail-stat-pill">${I18N.t('defense')} ${escapeHTML(activeFace.defense)}</div>`
        : ''));

  const majorFormats = card.game === 'pokemon' ? ['standard', 'expanded'] : ['standard', 'pioneer', 'modern', 'commander', 'legacy', 'pauper'];
  const legalitiesHtml = majorFormats.map(fmt => {
    const rawStatus = card.legalities?.[fmt];
    const status = ['legal', 'banned', 'restricted'].includes(rawStatus) ? rawStatus : 'not_legal';
    const statusLabel = status === 'legal' ? I18N.t('legal') : (status === 'banned' ? I18N.t('banned') : (status === 'restricted' ? I18N.t('restricted') : I18N.t('notLegal')));
    return `
      <div class="legality-item">
        <span class="legality-name">${fmt}</span>
        <span class="legality-status ${status}">${statusLabel}</span>
      </div>
    `;
  }).join('');

  const encodedCardName = encodeURIComponent(card.name);
  const storesList = card.game === 'pokemon' ? sites.filter(site => site.id === 'tcgplayer') : sites;
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

  const rarityClass = ['common', 'uncommon', 'rare', 'mythic', 'special', 'bonus'].includes(card.rarity) ? card.rarity : 'common';
  const rarityKey = `rarity${rarityClass.charAt(0).toUpperCase() + rarityClass.slice(1)}`;
  const rarityName = card.game === 'pokemon' ? escapeHTML(card.rarity || I18N.t('unavailable'))
    : I18N.dict.fr[rarityKey] ? I18N.t(rarityKey) : (rarityClass.charAt(0).toUpperCase() + rarityClass.slice(1));
  const setSvgUri = card.set_uri ? `https://svgs.scryfall.io/sets/${encodeURIComponent(card.set)}.svg` : '';

  container.innerHTML = `
    <div class="detail-grid">
      
      <div class="detail-left-col">
        <div class="detail-card-frame">
          <img src="${escapeHTML(imgUrl)}" alt="${escapeHTML(activeFace.name || card.name)}" decoding="async" class="detail-card-img" onerror="this.src='assets/images/IMG_6262.jpg'">
        </div>

        ${isDoubleFaced ? `
          <button class="detail-flip-btn" onclick="toggleCardFace()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            <span>${currentFaceIndex === 0 ? I18N.t('flipCardBack') : I18N.t('flipCardFront')}</span>
          </button>
        ` : ''}

        <button type="button" id="viewArtsButton" class="detail-flip-btn" onclick="openArtsGallery()" aria-haspopup="dialog">${I18N.t('viewAlternateArts')}</button>
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
            <span class="detail-type-line">${escapeHTML(typeLineDisplay)}</span>
            <span class="detail-rarity-chip ${rarityClass}">${rarityName}</span>
            <span class="detail-set-badge">
              ${setSvgUri ? `<img src="${setSvgUri}" alt="${escapeHTML(card.set_name)}" onerror="this.style.display='none'">` : ''}
              <span>${escapeHTML(card.set_name)} (#${escapeHTML(card.collector_number)})</span>
            </span>
          </div>
        </div>

        ${card.serialization?.isSerialized ? `<div class="detail-serial-box"><strong>${I18N.t('serializedCard')}</strong><p>${card.serialization.number != null ? `${I18N.t('serialNumber')} ${escapeHTML(card.serialization.number)}${card.serialization.total != null ? ` / ${escapeHTML(card.serialization.total)}` : ''}` : I18N.t('serialNumberUnavailable')}</p></div>` : ''}
        <section class="primary-price-panel">
          <span>${I18N.t('selectedPrinting')} · ${escapeHTML(card.set)} #${escapeHTML(card.collector_number)} · ${escapeHTML(card.lang || 'en')}</span>
          <strong>${CardPrices.format(mainPrice, I18N.current) || I18N.t('priceUnavailable')}</strong>
          <small>${I18N.t('normal')} · USD · ${escapeHTML(card.source)} / TCGplayer · ${mainPrice?.updatedAt ? `${I18N.t('updatedAt')}: ${escapeHTML(new Date(mainPrice.updatedAt).toLocaleString(I18N.current))}` : I18N.t('sourceUpdateUnknown')}</small>
          <small>${I18N.t('retrievedAt')}: ${card.fetchedAt ? escapeHTML(new Date(card.fetchedAt).toLocaleString(I18N.current)) : '—'}</small>
          <div class="variant-prices">${priceRecords.map(price => `<div><b>${CardPrices.format(price, I18N.current)}</b> · ${escapeHTML(price.variant)} · ${escapeHTML(price.market)}${price.updatedAt ? `<small>${I18N.t('updatedAt')}: ${escapeHTML(new Date(price.updatedAt).toLocaleString(I18N.current))}</small>` : ''}</div>`).join('')}</div>
        </section>
        ${card.game === 'pokemon' ? `<p class="sample-note">${I18N.t('pokemonPriceNotice')}</p>` : ''}
        <section class="printing-prices"><h2>${I18N.t(card.game === 'pokemon' ? 'relatedPokemon' : 'printingPrices')}</h2><div id="printingPrices" aria-live="polite"></div></section>
        <div class="detail-oracle-box">
          <div class="detail-section-title">${I18N.t('oracleTextTitle')}</div>
          
          <div class="detail-oracle-text">${oracleHtml || `<em>${I18N.t('noOracleText')}</em>`}</div>

          ${flavorText ? `
            <div class="detail-flavor-box">
              "${escapeHTML(flavorText)}"
            </div>
          ` : ''}

          ${statsHtml ? `
            <div class="detail-stats-bar">
              ${statsHtml}
            </div>
          ` : ''}
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
          ${I18N.t('illustrator')} <strong>${escapeHTML(activeFace.artist || card.artist || I18N.t('unknownArtist'))}</strong> · ${escapeHTML(card.source)} · ${card.game === 'pokemon' ? '© Pokémon / Nintendo / Creatures / GAME FREAK' : '© Wizards of the Coast'}
        </div>

      </div>

    </div>
  `;
}

window.addEventListener('languageChanged', () => {
  if (currentCardData) {
    renderCardDetailView(currentCardData);
    void loadFrenchDetails();
  }
  renderArtsGallery();
});

document.addEventListener('DOMContentLoaded', loadCardDetails);
