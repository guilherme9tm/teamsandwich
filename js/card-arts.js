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
  const grid = document.getElementById('artsGrid');
  const status = document.getElementById('artsStatus');
  if (!grid || !status) return;
  grid.replaceChildren();
  alternateArts.forEach(card => {
    const figure = document.createElement('figure');
    const link = document.createElement('a');
    link.href = `card-detail.html?id=${encodeURIComponent(card.id)}&name=${encodeURIComponent(card.name)}`;
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
