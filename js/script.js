// ===========================
// STORE DEFINITIONS
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
    logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAT4AAACfCAMAAABX0UX9AAAA0lBMVEX///8AAABTAdL//v8AAANTANT29vZTAdCsrKz///3Nzc367f1TBsdRBM8hCFFDAK7/+f85ALOenp6Li4vYyeikgsXV1dVfMrBDQ0Pn5+dGAMYzC326urrc3Nzs3voyMjJmQqRiYmKWlpZXV1cZGRmlpaVKSkr///js7OzGxsZ1dXX/9f9tbW05OTkpKSmJZ761tbXo4O4nAHdKAKl8XLIWC1JMCLwxAJzXwOYDABpBCpn13vsoCWcKAyhKD7GAgIBrQ64XBULAp9kAABM7DY5PGKtxYIZ6VLNcMaHEsNqXdr6LarpPF5mQqJVIK0WADUeA0xcOaE+OUqumXFzAAAK3ElEQVR4nO2dC1vcNhaGhYXGmMH1ONxdZshwM2QSQnYoUJoGQsoSQtst6e42u5u9/P9fsbrYMJZ8kYw9Y3jOGx6GysYzX498dHR0ZBACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgObi0C8HYezg1GP8oPjp0eI4VFxIvzlpIBw6VP6jVhhZykGqOtEuvjWV1u7qKLtR66rEm14mbWbftC7cCFpnW1MJVkX7+pTEnzzP8xVYmzc87NG7tKEKV2Uhz0T7TLJ1euq7I2IR9pXEcuk31z0+aWg3xYqp9sWBliz8+1OLWJnYZPhDMxWibVnJnmifl9vfzmXrsyzXDl7jcLJS0lFMtSnau8kuOj3147s8gRaxibcwWSkZnMkKu6J9UzGhm9NHaS+1bPe8M1ktqXRlIWeifU9uf/+O5Cu0beJfNPBGVEzVEu37UvOHn2zi5nZTqtG9bPOQYLKSkiim2hbtivv55sgqVmgFi8hpWOwmmyprpPhwSjQU2u6w5zQr/H4mK4lGCsX9/HlIiF2s0HavUNikwEYxVR/xj6e4n/3Oa7dAn1BI/JNG3YcvZCVZI8Wa0/PsfF8a2dD92GmQwCVZSDRSrMntOwg7i0dFCgX+Z+Q0ZC6M0Y6sRIwUWHY/1LROOLi0iV0s0LaP22yK0Ygo/EAWciDaN1TTshHg2tewIO2oc5+QmCZPVh2lJU0Kp14JN7MrC2SmZR3vY6GvYbGbZXkLDVGomGpWtCvuhwUBLM+0cKxhRHqvBledRgQ2yrz3pWhX3A8PArhNbgKLTX9zBbLD/nU4eX0I9WUlPDmjzofjIIDeij0v0OPndjh5I+6ezSeJ3ExXbt8Q7SyNiC4W9fjl1wbEbhmhVUqzaGIKtfsebnDaLQtHOJsoL4r4P/GCEi/8fg3FSY8LahKe+WUfHhfB8+OPzYYIxXbDohPyV/7v/hs/hPnqxp0FMe/fTHX9ksu8g/Q73ICG3Y8n/sOxeJ7WrDF7LeXTtn5dMKbHI4C6M42ryoxIg03pIswWf/lNzevn4w2XT+p3PUqkosWuch3HGSy7LDeqNZOyrCjt713UfR8qUbYWG8q9y1zMiecSl811dbAJDcaJS44XSvkBfZQMvQ5bLfVCrKsdBqQoKaWE4y6Nxp0a03BKlK3FQcbVep6hQKbRv651kOyXEbiTcTEHLQYak/1RaEclXwdxTFQDs6VMuJSlMGxfUldjpNB1SXBLnU1Yk0JlQqTDi6yrsTmGZ25E67gd4nJxRyEzxXJSUEeKWCFGnXPLTCJ1TSS4QTWZUEn7avEs+4J0ZDvxuGWMZBJvoaY+qmToddjKuSCLul8HVlGSX1HoPu/U0keVDL0We3kKafDWO7ZJ/oppikT/upbYrV9GoByQygoRWvSNFdrk53YNK/3KAqEW3bzuxDLaePCVKjSTaFv+ouncS4NSI8VZ7iV50p6lwLlCWxtrzhr22PykUpXKAuF04iWDlIBUxumcszmGCcS2gkOWDalymiFGimkTpu5WunMJ0YKXV0CUBqEjxknFFYwvWCFMvr1UXulcWaTAjWzIJAbLnQoTjbj0SKHzEXDYpiOGCfRs1/YvUHUzDEddINShrxU8svzw56M5c04HVfVSOlF589235vz+V57AL7w8/Rr87Rtj3n//d4PkeS7sjr4JXHfO0ss3sJQDwz0f6PlzXC4e3K+sl7K0bW/oUodONB2C8HeE3il6l+8aemnup6f2qlvTYJ3t1icFC34KrvW1rWNDjDaNvfQUiwedimb6ItM8+EKDR22FkccLFjWiRzxSsWFixC5b2KhKISsxO/Hpbag/jWMllDbxeho7C1r7LDKaNjTjPP1QlZaDO/gqMJzGuZYb/MEHjPwPosSDOqQlKB+oEPU8yyy4Imwid8IsmCtQrdjQYaZqgSy2+mSY+qMKXXe5w+e5OVd+WUbgSuUCUYid9qVhfppOAWz/M/vlHIXl1kGyEpQPgJcX+Ga5TeJSdzNs53fSlTICX1YvkBfsdpbZ1EzfobK1FDv4hMMcT6MUjGmRmaB8CCyyoSOGbepuyPFCTictu5RVA2xUbKGrwLZMcyrueSdr2MfllrKm6hDIIxvs9I5NQzcapfrXmTYst5S1VotCoRL9cmSYb2Dp7OV21hX7ZQRmLWU9XB8LA9uXpnciWyxaFEVBCuUSlDWMFPeEzoXPFrj0RbJhnwx/CFPnwq/KCMxcyqoEJxycB2zawAoMxBbCuxeiNolmiwSvUzN/FS9lVQIdMtpffJeN5tpZI3ojEu8kJTott5Q1W6tANu6Hg9vloWfKPzAK5TFDKSEuZv+sXgvGxYSdtjkYK65mt2VMzfLuNEbPBbhvivaaR/4y8eJE+9IfYRVlBEsGOffVkiMvoz+LSstJf9ZSsOJJR2jJPy19QGw+Uc9LffyDTCOq7s1pyL6k+mCl2G/++fxfjOfZ0GP0hMORsOZsJcn+rujlfal9Pa8MYDzQ7rfo0ziuKM1Pv44uULyQoaQu5sXVlL1uNeRjTGHR+FdWqVQ48yf2aduJEosZe92QMh+uNcrWguV7aTRuzelE4sEnJIoKFVNFuUElc1pvlK0FG+qczrk1p5WG83ohj79lIZl73eqO0XRg95WzcKxVtmW7V2zwVPe6LQmFSqCaUzA2Lng0hkJ0E+jtCuUpcMVUWXvd1icrbpSwN9QyIiHLA0dNckeP6VHcz+RHihjaxW4DnV5qW/6tWoUb5QYV97NZc8m6EWHnUqPW13YJGfZWpOXQrRYXomZOVyetagS+e1lDoUWsuY9yGVX2rujmwOcN58UFhuxWtb33SYlR1KJmTscy3dWELxIveDx7UyjR/elDQkgUtfRlgTNNugsRn2DcBLZWFeXR29EV7ShqUdyPVsHY+GDbH1B7yFbTihWSyx9HlERRi5I5rTmlZgrmm9E++1oF22Tu7b2Q9Ae68YKxRuFwhYMvOrUMxLXf/TsWsi/uNTVz2qSRAkUPs+TLixqRDbGJ+218H2Y90G1+soIyoLfiYcAKI4tCVDoX/g9/blv6A90oW81yozFOGA7+8ANW/JY727dcEpyKESPjMT37DeujMWxU7FxcfVzW4L//W19f34/64uzW+ig7200a65NgtqMMd3TAI3VSzeySaUQPlRXPCcgERY8RNt6sPnnE+oSDCxLEbLOT2AP6WBcyAAAAAAAAAGCs4JSfan+rWtmbSTDyzJndbd6yLU3N12bSyCjw3U49OcoptqI36CZO3q54CVxZgb5fV4gX/qQcZ/q+04wK39Rz4/eIc3EzyZOrLWhP2Zx0lxDLUJj+TLCMhyykK5zPVVjpEnHq7qtY4lNQmLF1Z+3pKMx4ehIofOoKK/Cl41c4K4qR4zR8vsKocjn+3aXcSubopA2cVvY8RoXRGBsvSecrRMmj3dSjMbkfevwK9WyIkkcflcL6bLi+M8pKpGGMCvsvOf3aFEo03Jei5NEKFB4kT36CCvsbnDiEfIIKJUAhKJyIwlf9UTYj54n7DVGYnlUwUpj6+DOcEcXXofCgy4n370oKZ7pLo+yWUJj5odMkjj+mybfwwxSi/tTWHfUrzIhLa1SI0cikY3KRd602LH2yHqAQFD4ehdGYHiuMYv18hdL/nfwPrZfGNjpZj/hvdrRw4j/jv7o9u5T2Vzt2pd/NfQd+ytKsXlWi0ckAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABPif8DzIQgct667rkAAAAASUVORK5CYII='
  },
  {
    id: 'chezgeeks',
    nome: 'Chez Geeks',
    link: n => `https://www.chezgeeks.com/products/search?q=${n}`,
    logo: 'https://cc-client-assets.nyc3.cdn.digitaloceanspaces.com/photo/chezgeeks/file/30f1d741378c4f31909b23ade89a46ae/Chez%20Geeks%20LOGO%20scaled.png'
  }
];

// ===========================
// HAMBURGER MENU
// ===========================
function toggleMenu() {
  const menu = document.getElementById('slideMenu');
  const overlay = document.getElementById('menuOverlay');
  const btn = document.getElementById('hamburgerBtn');

  menu.classList.toggle('open');
  overlay.classList.toggle('open');
  btn.classList.toggle('active');

  // Prevent body scroll when menu is open
  document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : '';
}

// ===========================
// FILTER CHIPS
// ===========================
function applyFilter(filter) {
  const chips = document.querySelectorAll('.chip');
  chips.forEach(chip => {
    chip.classList.toggle('active', chip.dataset.filter === filter);
  });
  // Placeholder: future filter logic can be added here
}

// ===========================
// STORE INITIALIZATION
// ===========================
function initStores() {
  const saved = JSON.parse(localStorage.getItem("stores") || "[]");
  const container = document.getElementById("storeList");

  sites.forEach(site => {
    const checked = saved.length ? saved.includes(site.id) : true;

    const div = document.createElement("div");
    div.className = "store-item";
    div.innerHTML = `
      <input type="checkbox" value="${site.id}" ${checked ? "checked" : ""}>
      <img src="${site.logo}">
      ${site.nome}
    `;
    container.appendChild(div);
  });
}

function getSelected() {
  const boxes = document.querySelectorAll("#storeList input");
  const selected = [];
  boxes.forEach(b => {
    if (b.checked) selected.push(b.value);
  });
  localStorage.setItem("stores", JSON.stringify(selected));
  return selected;
}

// ===========================
// SET (COLLECTION) LOADING
// ===========================
async function loadSets() {
  const res = await fetch("https://api.scryfall.com/sets");
  const data = await res.json();

  const container = document.getElementById("setList");

  // Sort from newest to oldest
  const sets = data.data.sort((a, b) =>
    new Date(b.released_at) - new Date(a.released_at)
  );

  sets.forEach(set => {
    if (!set.icon_svg_uri) return;

    const div = document.createElement("div");
    div.className = "store-item";

    div.innerHTML = `
      <img src="${set.icon_svg_uri}" width="24">
      <span>${set.code.toUpperCase()} - ${set.name}</span>
    `;

    div.style.cursor = "pointer";
    div.onclick = () => carregarColecao(set.code);

    container.appendChild(div);
  });
}

function carregarColecao(code) {
  window.location.href = `card.html?set=${encodeURIComponent(code)}`;
}

// ===========================
// FILE PROCESSING
// ===========================
async function processarArquivo() {
  const arquivoInput = document.getElementById('arquivoInput');
  if (!arquivoInput.files.length) return alert('Veuillez choisir un fichier TXT');

  const texto = await arquivoInput.files[0].text();
  const linhas = texto.split(/\r?\n/);
  const cartas = [];

  linhas.forEach(linha => {
    const l = linha.trim();
    if (!l) return;

    const match = l.match(/^(\d+)\s+(.+)$/);
    if (match) {
      const qtd = parseInt(match[1], 10);
      const nome = match[2];
      for (let i = 0; i < qtd; i++) cartas.push(nome);
    } else {
      cartas.push(l);
    }
  });

  // Store card list and redirect
  sessionStorage.setItem("fileCards", JSON.stringify(cartas));
  window.location.href = "card.html?source=file";
}

// ===========================
// CARD SEARCH — REDIRECTS
// ===========================
function buscarCartaManuellement() {
  const nome = document.getElementById("pesquisaInput").value.trim();
  if (!nome) return alert("Entrez un nom");
  window.location.href = `card.html?name=${encodeURIComponent(nome)}`;
}

function limparResultado() {
  // No-op on index page (results are on card.html)
}

// ===========================
// INITIALIZATION
// ===========================
initStores();
loadSets();
