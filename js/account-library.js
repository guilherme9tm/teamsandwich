const AccountLibrary = (() => {
  const copy = value => JSON.parse(JSON.stringify(value));
  const instances = new Map();
  const tabKey = 'teamSandwich.libraryTab.v1';
  const tabId = AppStorage.session.getItem(tabKey) || crypto.randomUUID();
  AppStorage.session.setItem(tabKey, tabId);
  const errors = new Set(['libraryConflict', 'libraryNotConfigured', 'libraryTooLarge', 'libraryInvalidData', 'authRequired', 'authNotConfigured', 'authAccountChanged', 'authRateLimited']);
  async function open(kind) {
    await DeckAccess.ready;
    const owner = DeckAccess.user()?.id;
    if (!owner) throw new Error('authRequired');
    const draftPrefix = `teamSandwich.cloudDraft.v1:${owner}:${kind}:`;
    const draftKey = `${draftPrefix}${tabId}`;
    let sourceKey = draftKey, sourceRaw = null;
    let items = [], revision = 0, dirty = false, failure = null, running = null, generation = 0;
    const subscribers = new Set();
    function assertOwner() { if (DeckAccess.user()?.id !== owner) throw new Error('authAccountChanged'); }
    async function request(method, body) {
      assertOwner();
      let response;
      try {
        response = await fetch(`/api/library/${kind}`, {
          method, credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(20000),
          headers: { 'Content-Type': 'application/json', 'X-Account-ID': owner }, ...(body ? { body: JSON.stringify(body) } : {})
        });
      } catch { throw new Error('libraryUnavailable'); }
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(errors.has(result.error) ? result.error : 'libraryUnavailable');
      assertOwner();
      LibraryData.validate(kind, result.items);
      if (!Number.isSafeInteger(result.revision) || result.revision < 0) throw new Error('libraryUnavailable');
      return result;
    }
    function notify(replaced = false) { for (const callback of subscribers) callback({ error: failure, pending: dirty, busy: !!running, replaced }); }
    function draft() { return AppStorage.local.setItem(draftKey, JSON.stringify({ revision, items, updatedAt: Date.now() })); }
    function clearDraft() {
      AppStorage.local.removeItem(draftKey);
      if (sourceKey !== draftKey && AppStorage.local.getItem(sourceKey) === sourceRaw) AppStorage.local.removeItem(sourceKey);
      sourceRaw = null;
    }
    async function flush() {
      if (running) return running;
      if (!dirty || failure === 'libraryConflict' || failure === 'authAccountChanged') return;
      running = (async () => {
        while (dirty) {
          const version = generation, snapshot = copy(items);
          try {
            const result = await request('PUT', { revision, items: snapshot });
            revision = result.revision; failure = null;
            if (version === generation) { dirty = false; clearDraft(); }
            else draft();
          } catch (error) { failure = errors.has(error.message) ? error.message : 'libraryUnavailable'; draft(); break; }
        }
      })().finally(() => { running = null; notify(); });
      notify(); return running;
    }
    const initial = await request('GET'); items = initial.items; revision = initial.revision;
    if (!AppStorage.local.getItem(draftKey)) {
      const candidates = AppStorage.local.keys().filter(key => key.startsWith(draftPrefix) && !key.endsWith(':backup'));
      candidates.sort((a, b) => (AppStorage.local.readJSON(b, {}).updatedAt || 0) - (AppStorage.local.readJSON(a, {}).updatedAt || 0));
      sourceKey = candidates[0] || draftKey;
    }
    const rawDraft = AppStorage.local.getItem(sourceKey); sourceRaw = rawDraft;
    if (rawDraft) {
      try {
        const saved = JSON.parse(rawDraft); LibraryData.validate(kind, saved.items);
        if (!Number.isSafeInteger(saved.revision) || saved.revision < 0) throw new Error();
        items = saved.items; dirty = true;
        if (saved.revision !== revision) failure = 'libraryConflict';
        revision = saved.revision;
      } catch { failure = 'libraryInvalidDraft'; AppStorage.local.setItem(`${sourceKey}:backup`, rawDraft); }
    }
    const api = {
      get items() { return items; },
      get revision() { return revision; },
      draftKey,
      pending: () => dirty,
      error: () => failure,
      flush,
      subscribe(callback) { subscribers.add(callback); callback({ error: failure, pending: dirty, busy: !!running }); },
      save(next) {
        assertOwner(); LibraryData.validate(kind, next);
        items = copy(next); generation++; dirty = true;
        const saved = draft();
        if (!saved) failure = 'libraryDraftUnavailable';
        notify(); void flush();
      },
      retry() { if (!['libraryConflict', 'authAccountChanged', 'libraryInvalidDraft'].includes(failure)) { failure = null; void flush(); } },
      async reload() {
        assertOwner();
        if (running) await running;
        const started = generation;
        const next = await request('GET');
        if (generation !== started) throw new Error('libraryConflict');
        // Preserve a recoverable copy before explicitly discarding local changes.
        if (dirty) AppStorage.local.setItem(`${draftKey}:backup`, JSON.stringify({ revision, items }));
        items = next.items; revision = next.revision; dirty = false; failure = null;
        clearDraft(); generation++; notify(true);
      }
    };
    window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
    window.addEventListener('online', () => api.retry());
    if (dirty && !failure) void flush();
    return api;
  }
  function bindStatus(library, status, replaced) {
    library.subscribe(state => {
      I18N.bind(status, state.error || (state.pending ? 'librarySaving' : 'librarySaved'));
      status.classList.toggle('deck-error', !!state.error);
      if (state.replaced) replaced();
    });
  }
  async function shared(kind) {
    await DeckAccess.ready;
    const owner = DeckAccess.user()?.id;
    const key = `${owner}:${kind}`;
    if (!instances.has(key)) {
      const pending = open(kind).catch(error => { instances.delete(key); throw error; });
      instances.set(key, pending);
    }
    return instances.get(key);
  }
  return { open: shared, bindStatus };
})();
