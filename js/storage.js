// Preferences and the existing demo account must not break the page when mobile
// browsers disable storage. No password or authentication token is stored here.
const AppStorage = (() => {
  const fallback = new Map();
  function storage(kind) {
    return {
      getItem(key) {
        if (fallback.has(`${kind}:${key}`)) return fallback.get(`${kind}:${key}`);
        try { return window[kind].getItem(key); }
        catch { return fallback.get(`${kind}:${key}`) ?? null; }
      },
      setItem(key, value) {
        try {
          window[kind].setItem(key, String(value));
          fallback.delete(`${kind}:${key}`);
          return true;
        } catch { fallback.set(`${kind}:${key}`, String(value)); return false; }
      },
      removeItem(key) {
        fallback.delete(`${kind}:${key}`);
        try { window[kind].removeItem(key); } catch { fallback.set(`${kind}:${key}`, null); }
      },
      readJSON(key, defaultValue) {
        try { return JSON.parse(this.getItem(key)) ?? defaultValue; } catch { return defaultValue; }
      }
    };
  }
  return { local: storage('localStorage'), session: storage('sessionStorage') };
})();

// Local demonstration gate only; shared deployments must authenticate on a server.
const DeckAccess = (() => {
  const key = 'teamSandwich.deckAccess.v1';
  return {
    allowed: () => AppStorage.session.getItem(key) === 'granted',
    login(password) {
      if (password !== 'teamsandwich') return false;
      const saved = AppStorage.session.setItem(key, 'granted');
      if (!saved) AppStorage.session.removeItem(key);
      return saved;
    },
    logout: () => AppStorage.session.removeItem(key)
  };
})();
