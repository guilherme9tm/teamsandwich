let alternateArts = [];
let nextArtsPage = 1;
let artsLoading = false;
let artsError = null;
let artsController = null;

function getEditionKey(card) {
  const set = card.collection?.id;
  const number = card.number;
  // Translations have different card IDs but share a set and collector number.
  // Keep collector numbers intact so alternate arts and treatments remain distinct.
  return JSON.stringify([card.game, card.source,
    set && number != null ? [set.toLowerCase(), String(number)] : card.id]);
}

function openArtsGallery() {
  const dialog = document.getElementById('artsDialog');
  if (!currentCardData || dialog.open) return;
  dialog.showModal();
  renderArtsGallery();
  if (!alternateArts.length && nextArtsPage) void loadAlternateArts();
}

function closeArtsGallery() {
  document.getElementById('artsDialog').close();
}

async function loadAlternateArts() {
  if (artsLoading || !nextArtsPage) return;
  const controller = new AbortController();
  artsController = controller;
  artsLoading = true;
  artsError = null;
  renderArtsGallery();
  try {
    const page = await CardData.provider().arts(currentCardData, nextArtsPage, { signal: controller.signal });
    if (controller.signal.aborted) return;
    const known = new Set(alternateArts.map(getEditionKey));
    for (const card of page.cards) {
      const key = getEditionKey(card);
      if (known.has(key)) continue;
      known.add(key);
      alternateArts.push(card);
    }
    nextArtsPage = page.nextPage;
  } catch (error) {
    if (!CardData.isAbort(error)) artsError = error;
  } finally {
    if (artsController === controller) {
      artsLoading = false;
      renderArtsGallery();
    }
  }
}

function renderArtsGallery() {
  const prices = document.getElementById('printingPrices');
  if (prices) {
    prices.replaceChildren();
    for (const printing of alternateArts) {
      const row = document.createElement('a');
      row.className = 'printing-price-row';
      row.href = gameUrl('card-detail.html', { id: printing.id, name: printing.name });
      row.setAttribute('aria-current', String(printing.id === currentCardData?.id));
      const label = document.createElement('span');
      label.textContent = `${printing.collection.name || printing.collection.id} #${printing.number} · ${printing.metadata.lang || 'en'}`;
      const values = document.createElement('strong');
      values.textContent = CardPrices.entries(printing).map(price => `${CardPrices.format(price, I18N.current)} (${price.variant})`).join(' · ') || I18N.t('priceUnavailable');
      row.append(label, values);
      prices.append(row);
    }
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'btn-secondary';
    more.textContent = I18N.t(artsLoading ? 'loading' : artsError ? 'retry' : 'loadMoreArts');
    more.disabled = artsLoading;
    more.onclick = loadAlternateArts;
    if (nextArtsPage || artsError) prices.append(more);
    if (artsError) { const message = document.createElement('p'); message.textContent = I18N.t(artsError.code || 'sourceUnavailable'); prices.append(message); }
  }
  const grid = document.getElementById('artsGrid');
  const status = document.getElementById('artsStatus');
  if (!grid || !status) return;
  grid.replaceChildren();
  alternateArts.forEach(card => {
    const figure = document.createElement('figure');
    const link = document.createElement('a');
    link.href = gameUrl('card-detail.html', { id: card.id, name: card.name });
    const faces = card.metadata?.card_faces?.filter(face => face.image_uris) || [];
    const images = faces.length ? faces.map(face => ({ name: face.name, images: face.image_uris })) : [card];
    images.forEach(face => {
      const url = face.images.normal || face.images.small || face.images.large;
      if (!url) return;
      const image = document.createElement('img');
      image.src = url;
      image.alt = face.name;
      image.loading = 'lazy';
      image.decoding = 'async';
      link.appendChild(image);
    });
    const caption = document.createElement('figcaption');
    caption.textContent = `${card.collection.name || card.name} · #${card.number || '—'}${card.metadata?.lang ? ` · ${card.metadata.lang.toUpperCase()}` : ''}`;
    link.appendChild(caption);
    figure.appendChild(link);
    grid.appendChild(figure);
  });
  status.replaceChildren();
  const message = document.createElement('p');
  message.textContent = artsLoading ? I18N.t('loading') : artsError ? I18N.t(artsError.code || 'sourceUnavailable')
    : alternateArts.length ? `${alternateArts.length} ${I18N.t('artsLoaded')}` : I18N.t('noAlternateArts');
  status.appendChild(message);
  if (nextArtsPage) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn-primary';
    button.textContent = I18N.t(artsError ? 'retry' : 'loadMoreArts');
    button.disabled = artsLoading;
    button.onclick = loadAlternateArts;
    status.appendChild(button);
  }
}

document.getElementById('artsDialog').addEventListener('close', () => {
  artsController?.abort();
  artsController = null;
  artsLoading = false;
  document.getElementById('viewArtsButton')?.focus();
});
