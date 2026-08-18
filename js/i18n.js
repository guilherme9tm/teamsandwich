
const I18N = {
  current: localStorage.getItem('lang') || 'fr',

  dict: {
    fr: {
      
      formats: 'Formats de jeu',
      all: 'Toutes',
      importTitle: 'Importer un fichier',
      processFile: 'Traiter le fichier',
      stores: 'Magasins',
      collections: 'Collections',
      viewAllCollections: 'Voir toutes les collections',
      allCollections: 'Toutes les Collections',
      searchCollections: 'Rechercher une collection...',
      sortNewest: 'Plus récentes',
      sortOldest: 'Plus anciennes',
      sortAZ: 'A → Z',
      sortZA: 'Z → A',
      noCollectionsFound: 'Aucune collection trouvée',

      searchPlaceholder: 'Rechercher une carte, collection, numéro...',

      login: 'Connexion',
      signup: "S'inscrire",
      modalLoginTitle: 'Connexion à votre compte',
      modalSignupTitle: 'Créer un compte',
      emailPlaceholder: 'Adresse e-mail',
      passwordPlaceholder: 'Mot de passe',
      usernamePlaceholder: "Nom d'utilisateur",
      modalLoginBtn: 'Se connecter',
      modalSignupBtn: "S'inscrire",
      orLoginWith: 'Ou connectez-vous avec',
      dontHaveAccount: "Pas encore de compte ? S'inscrire",
      alreadyHaveAccount: 'Vous avez déjà un compte ? Se connecter',

      heroTagline: 'Recherche de cartes MTG, Événements & Communauté',
      heroSubtitle: 'Comparez les prix entre les meilleures boutiques de Magic, explorez les collections et suivez les tournois locaux.',
      searchCardCta: 'Rechercher une carte',
      importDeckCta: 'Importer un deck (.txt)',
      browseSetsCta: 'Explorer les collections',
      popularFormats: 'Formats Populaires',
      allFormatsDesc: 'Choisissez un format pour voir les événements et détails',
      featuredEvents: 'Prochains Événements',
      communityRanking: 'Classement des Joueurs',
      partnerStores: 'Boutiques Partenaires',
      popularSetsTitle: 'Dernières Collections',
      eventsPhotos: 'Événements & Photos',
      noEvents: 'Aucun événement pour le moment',
      selectFormatPrompt: 'Sélectionnez un format',
      selectFormatDetail: 'Choisissez un format ci-dessous ou dans le menu de gauche pour afficher ses événements.',
      eventsSublabel: 'Les photos des événements apparaîtront ici',
      calendar: 'Calendrier',
      nextEvent: 'Prochain Événement',
      toConfirm: 'À déterminer',
      formatConfirm: 'Format & lieu à confirmer',
      ranking: 'Ranking',
      viewAllEvents: 'Voir tous les événements',
      backToHome: 'Retour à l\'accueil',

      searchTitle: 'Résultats',
      prices: 'Prix',
      buyAt: 'Acheter chez',
      loading: 'Chargement…',
      noResults: 'Aucun résultat',
      loggedInAs: 'Connecté en tant que',
      logout: 'Déconnexion',
      filePrompt: 'Veuillez choisir un fichier TXT',
      enterName: 'Entrez un nom',
      clear: 'Effacer',

      filters: 'Filtres',
      clearFilters: 'Effacer les filtres',
      sortByPrice: 'Trier par prix',
      priceHighToLow: 'Plus cher → Moins cher',
      priceLowToHigh: 'Moins cher → Plus cher',
      filterByRarity: 'Rarité',
      filterByColor: 'Couleur',
      filterByType: 'Type',
      rarityCommon: 'Common',
      rarityUncommon: 'Uncommon',
      rarityRare: 'Rare',
      rarityMythic: 'Mythic Rare',
      colorWhite: 'Blanc',
      colorBlue: 'Bleu',
      colorBlack: 'Noir',
      colorRed: 'Rouge',
      colorGreen: 'Vert',
      colorColorless: 'Incolore',
      colorMulticolor: 'Multicolore',
      noFilterResults: 'Aucune carte ne correspond aux filtres sélectionnés.',
      activeFilters: 'filtres actifs',

      layoutGrid: 'Grille',
      layoutList: 'Liste',
      cardsPerPage: 'Cartes par page :',
    },
    en: {
      
      formats: 'Game Formats',
      all: 'All',
      importTitle: 'Import a file',
      processFile: 'Process file',
      stores: 'Stores',
      collections: 'Collections',
      viewAllCollections: 'View all collections',
      allCollections: 'All Collections',
      searchCollections: 'Search for a collection...',
      sortNewest: 'Newest',
      sortOldest: 'Oldest',
      sortAZ: 'A → Z',
      sortZA: 'Z → A',
      noCollectionsFound: 'No collections found',

      searchPlaceholder: 'Search for a card, collection, number...',

      login: 'Login',
      signup: 'Sign up',
      modalLoginTitle: 'Log in to your account',
      modalSignupTitle: 'Create an account',
      emailPlaceholder: 'Email address',
      passwordPlaceholder: 'Password',
      usernamePlaceholder: 'Username',
      modalLoginBtn: 'Log in',
      modalSignupBtn: 'Sign up',
      orLoginWith: 'Or log in with',
      dontHaveAccount: "Don't have an account? Sign up",
      alreadyHaveAccount: 'Already have an account? Log in',

      heroTagline: 'MTG Card Search, Events & Community Hub',
      heroSubtitle: 'Compare card prices across top Canadian & international stores, explore sets and follow local tournaments.',
      searchCardCta: 'Search Cards',
      importDeckCta: 'Import Deck (.txt)',
      browseSetsCta: 'Browse Sets',
      popularFormats: 'Popular Formats',
      allFormatsDesc: 'Select a format to view upcoming tournaments and details',
      featuredEvents: 'Upcoming Events',
      communityRanking: 'Player Rankings',
      partnerStores: 'Partner Stores',
      popularSetsTitle: 'Latest Collections',
      eventsPhotos: 'Events & Photos',
      noEvents: 'No events at this time',
      selectFormatPrompt: 'Select a format',
      selectFormatDetail: 'Choose a format below or in the left menu to display its events.',
      eventsSublabel: 'Event photos will appear here',
      calendar: 'Calendar',
      nextEvent: 'Next Event',
      toConfirm: 'To be determined',
      formatConfirm: 'Format & location TBD',
      ranking: 'Ranking',
      viewAllEvents: 'View all events',
      backToHome: 'Back to Home',

      searchTitle: 'Results',
      prices: 'Prices',
      buyAt: 'Buy at',
      loading: 'Loading…',
      noResults: 'No results',
      loggedInAs: 'Logged in as',
      logout: 'Log out',
      filePrompt: 'Please select a TXT file',
      enterName: 'Enter a name',
      clear: 'Clear',

      filters: 'Filters',
      clearFilters: 'Clear filters',
      sortByPrice: 'Sort by price',
      priceHighToLow: 'Highest → Lowest',
      priceLowToHigh: 'Lowest → Highest',
      filterByRarity: 'Rarity',
      filterByColor: 'Color',
      filterByType: 'Type',
      rarityCommon: 'Common',
      rarityUncommon: 'Uncommon',
      rarityRare: 'Rare',
      rarityMythic: 'Mythic Rare',
      colorWhite: 'White',
      colorBlue: 'Blue',
      colorBlack: 'Black',
      colorRed: 'Red',
      colorGreen: 'Green',
      colorColorless: 'Colorless',
      colorMulticolor: 'Multicolor',
      noFilterResults: 'No cards match the selected filters.',
      activeFilters: 'active filters',

      layoutGrid: 'Grid',
      layoutList: 'List',
      cardsPerPage: 'Cards per page:',
    }
  },

  t(key) {
    return (this.dict[this.current] && this.dict[this.current][key]) || key;
  },

  setLang(lang) {
    this.current = lang;
    localStorage.setItem('lang', lang);
    this.updateDOM();
  },

  updateDOM() {
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translated = this.t(key);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = translated;
      } else {
        el.textContent = translated;
      }
    });

    document.documentElement.lang = this.current;

    const selector = document.querySelector('.lang-selector-select');
    if (selector) selector.value = this.current;

    const sidebarSelector = document.querySelector('.sidebar-lang-select');
    if (sidebarSelector) sidebarSelector.value = this.current;
  }
};
