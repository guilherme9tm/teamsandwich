// Preferences must not break the page when browsers disable storage.
// Passwords and authentication tokens are never stored here.
const AppStorage = (() => {
  const fallback = new Map();
  function storage(kind) {
    return {
      keys() {
        const keys = new Set([...fallback.keys()].filter(key => key.startsWith(`${kind}:`)).map(key => key.slice(kind.length + 1)));
        try { for (let index = 0; index < window[kind].length; index++) keys.add(window[kind].key(index)); } catch { /* Storage may be blocked. */ }
        return [...keys].filter(key => typeof key === 'string');
      },
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

// Identity comes exclusively from the server's HttpOnly session cookies.
const DeckAccess = (() => {
  let user = null, error = null, pending, revision = 0;
  const broadcastKey = 'teamSandwich.authChanged.v1';
  function update(next) { user = next || null; window.dispatchEvent(new Event('authChanged')); }
  async function request(action, body) {
    let response;
    try {
      response = await fetch(`/api/auth/${action}`, {
        method: action === 'session' ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(15000)
      });
    } catch { throw new Error('authUnavailable'); }
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'authUnavailable');
    return result;
  }
  function broadcast() { AppStorage.local.setItem(broadcastKey, `${Date.now()}:${Math.random()}`); }
  async function refresh() {
    if (!pending) {
      const started = revision;
      pending = (async () => {
        try { const result = await request('session'); if (started === revision) { error = null; update(result.user); } }
        catch (cause) { if (started === revision) { error = cause.message; update(null); } }
      })().finally(() => { pending = null; });
    }
    return pending;
  }
  const api = {
    allowed: () => !!user,
    user: () => user && { ...user },
    error: () => error,
    refresh,
    async login(email, password) {
      if (pending) await pending;
      const result = await request('login', { email, password });
      revision++; error = null; update(result.user); broadcast(); return result;
    },
    async signup(email, password) {
      if (pending) await pending;
      const result = await request('signup', { email, password });
      if (result.user) { revision++; error = null; update(result.user); broadcast(); }
      return result;
    },
    async logout() { if (pending) await pending; await request('logout'); revision++; error = null; update(null); broadcast(); }
  };
  api.ready = refresh();
  window.addEventListener('storage', event => { if (event.key === broadcastKey || event.key === null) void refresh(); });
  window.addEventListener('pageshow', event => { if (event.persisted) void refresh(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void refresh(); });
  window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 300000);
  return api;
})();
