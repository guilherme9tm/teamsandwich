'use strict';
const { validate } = require('../js/library-data');
const MAX_BYTES = 4 * 1024 * 1024;
function createLibrary({ configured, origin, url, key, session, fetchImpl }) {
  async function data(endpoint, token, body) {
    let result;
    try {
      result = await fetchImpl(`${url}/rest/v1/${endpoint}`, {
        method: body ? 'POST' : 'GET', headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000), redirect: 'error'
      });
    } catch { throw Object.assign(new Error('libraryUnavailable'), { status: 503 }); }
    if (!result.ok) {
      const details = await result.json().catch(() => ({}));
      let error = 'libraryUnavailable', status = 503;
      if (details.code === 'PT409') { error = 'libraryConflict'; status = 409; }
      else if (['42P01', 'PGRST202', 'PGRST205'].includes(details.code)) { error = 'libraryNotConfigured'; }
      else if (result.status === 401) { error = 'authRequired'; status = 401; }
      else if (result.status === 429) { error = 'authRateLimited'; status = 429; }
      throw Object.assign(new Error(error), { status });
    }
    return result.json();
  }
  return async (request, response, pathname, json) => {
    const match = pathname.match(/^\/api\/library\/(decks|wishlist)$/);
    if (!match) return json(response, 404, { error: 'notFound' });
    if (!['GET', 'PUT'].includes(request.method)) return json(response, 405, { error: 'methodNotAllowed' });
    if (!configured) return json(response, 503, { error: 'authNotConfigured' });
    if (request.method === 'PUT' && request.headers.origin !== origin) return json(response, 403, { error: 'authForbidden' });
    try {
      const current = await session(request, response);
      if (request.headers['x-account-id'] !== current.user.id) return json(response, 409, { error: 'authAccountChanged' });
      const kind = match[1];
      let result;
      if (request.method === 'GET') {
        const rows = await data(`user_libraries?user_id=eq.${current.user.id}&kind=eq.${kind}&select=items,revision&limit=1`, current.token);
        if (!Array.isArray(rows) || rows.length > 1) throw new Error();
        result = rows[0] || { items: [], revision: 0 };
      } else {
        if (!/^application\/json(?:\s*;|$)/i.test(request.headers['content-type'] || '')) return json(response, 415, { error: 'libraryInvalidData' });
        let size = 0; const chunks = [];
        for await (const chunk of request) {
          size += chunk.length;
          if (size > MAX_BYTES) return json(response, 413, { error: 'libraryTooLarge' });
          chunks.push(chunk);
        }
        let input;
        try {
          input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          if (!input || !Number.isSafeInteger(input.revision) || input.revision < 0 || Object.keys(input).some(field => !['items', 'revision'].includes(field))) throw new Error();
          validate(kind, input.items);
        } catch { return json(response, 400, { error: 'libraryInvalidData' }); }
        // Ownership is derived by auth.uid() in SQL, never from a client field.
        result = await data('rpc/save_user_library', current.token, { p_kind: kind, p_items: input.items, p_expected_revision: input.revision });
      }
      validate(kind, result.items);
      if (!Number.isSafeInteger(result.revision) || result.revision < 0) throw new Error();
      return json(response, 200, { items: result.items, revision: result.revision });
    } catch (error) {
      return json(response, error.status || 503, { error: error.status ? error.message : 'libraryUnavailable' });
    }
  };
}
module.exports = { createLibrary };
