// ===========================
// i18n — TRANSLATION ENGINE
// ===========================
const I18N = {
  current: localStorage.getItem('lang') || 'fr',

  dict: {
    fr: {
      // Sidebar
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

      // Header search
      searchPlaceholder: 'Rechercher une carte, collection, numéro...',

      // Auth
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

      // Home panels
      eventsPhotos: '🎉 Events & Photos',
      noEvents: 'Aucun événement pour le moment',
      selectFormatPrompt: 'Sélectionnez un format',
      selectFormatDetail: 'Choisissez un format dans le menu de gauche pour afficher ses événements.',
      eventsSublabel: 'Les photos des événements apparaîtront ici',
      calendar: '📅 Calendrier',
      nextEvent: '⏩ Prochain Événement',
      toConfirm: 'À déterminer',
      formatConfirm: 'Format & lieu à confirmer',
      ranking: '🏆 Ranking',

      // Card page
      searchTitle: 'Résultats',
      prices: 'Prix',
      buyAt: 'Acheter chez',
      loading: 'Chargement…',
      noResults: 'Aucun résultat',
      loggedInAs: 'Connecté en tant que',
      logout: 'Déconnexion',
      filePrompt: 'Veuillez choisir un fichier TXT',
      enterName: 'Entrez un nom',
    },
    en: {
      // Sidebar
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

      // Header search
      searchPlaceholder: 'Search for a card, collection, number...',

      // Auth
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

      // Home panels
      eventsPhotos: '🎉 Events & Photos',
      noEvents: 'No events at this time',
      selectFormatPrompt: 'Select a format',
      selectFormatDetail: 'Choose a format in the left menu to display its events.',
      eventsSublabel: 'Event photos will appear here',
      calendar: '📅 Calendar',
      nextEvent: '⏩ Next Event',
      toConfirm: 'To be determined',
      formatConfirm: 'Format & location TBD',
      ranking: '🏆 Ranking',

      // Card page
      searchTitle: 'Results',
      prices: 'Prices',
      buyAt: 'Buy at',
      loading: 'Loading…',
      noResults: 'No results',
      loggedInAs: 'Logged in as',
      logout: 'Log out',
      filePrompt: 'Please select a TXT file',
      enterName: 'Enter a name',
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
    // Text content
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translated = this.t(key);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = translated;
      } else {
        el.textContent = translated;
      }
    });

    // Update lang attribute
    document.documentElement.lang = this.current;

    // Sync dropdown
    const selector = document.querySelector('.lang-selector-select');
    if (selector) selector.value = this.current;
  }
};
