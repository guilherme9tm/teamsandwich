'use strict';

// Supabase owns credentials and persistent users. Render only proxies Auth and
// keeps tokens in HttpOnly cookies; no service-role key or local user database.
function createAuth({ url = process.env.SUPABASE_URL, key = process.env.SUPABASE_PUBLISHABLE_KEY,
  origin = process.env.APP_ORIGIN, fetchImpl = fetch } = {}) {
  let configured = false;
  let secure = false;
  try {
    const provider = new URL(url);
    const site = new URL(origin);
    const local = site.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(site.hostname);
    let adminKey = key?.startsWith('sb_secret_');
    if (key?.split('.').length === 3) {
      try { adminKey ||= JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role !== 'anon'; } catch { adminKey = true; }
    }
    configured = provider.protocol === 'https:' && !provider.username && !provider.password
      && provider.pathname === '/' && !provider.search && !provider.hash && !!key && !adminKey
      && (site.protocol === 'https:' || local) && site.href === `${site.origin}/`;
    url = provider.origin; origin = site.origin; secure = site.protocol === 'https:';
  } catch { /* Missing configuration leaves Auth disabled, never a demo fallback. */ }
  const prefix = secure ? '__Host-ts_' : 'ts_';
  const names = { access: `${prefix}access`, refresh: `${prefix}refresh` };
  const refreshes = new Map();
  const attempts = new Map();
  const fail = (error, status) => Object.assign(new Error(error), { status });
  const publicUser = user => {
    if (!user || !/^[a-f0-9-]{36}$/i.test(user.id) || typeof user.email !== 'string') throw fail('authUnavailable', 502);
    return { id: user.id, email: user.email };
  };
  function cookies(request) {
    const result = {};
    for (const part of (request.headers.cookie || '').split(';')) {
      const index = part.indexOf('=');
      if (index < 0) continue;
      try { result[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1)); } catch { /* Invalid cookie. */ }
    }
    return result;
  }
  function setCookies(response, session) {
    const values = session ? [session.access_token, session.refresh_token] : ['', ''];
    if (session && values.some(value => typeof value !== 'string' || !value || encodeURIComponent(value).length > 3800)) throw fail('authUnavailable', 502);
    response.setHeader('Set-Cookie', Object.values(names).map((name, index) => `${name}=${encodeURIComponent(values[index])}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${session ? (index ? 2592000 : Math.min(Number(session.expires_in) || 3600, 86400)) : 0}${secure ? '; Secure' : ''}`));
  }
  async function upstream(endpoint, { method = 'POST', body, token } = {}) {
    let response;
    try {
      response = await fetchImpl(`${url}/auth/v1/${endpoint}`, {
        method, headers: { apikey: key, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000), redirect: 'error'
      });
    } catch { throw fail('authUnavailable', 503); }
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      if (response.status === 429) throw fail('authRateLimited', 429);
      if ((data.code || data.error_code) === 'email_not_confirmed') throw fail('authEmailUnconfirmed', 403);
      if (response.status >= 500) throw fail('authUnavailable', 503);
      if (endpoint.startsWith('token?grant_type=password')) throw fail('authInvalidCredentials', 401);
      if (endpoint.startsWith('token?') || endpoint === 'user' || endpoint.startsWith('logout')) throw fail('authRequired', 401);
      throw fail('authSignupFailed', 400);
    }
    if (response.status === 204) return {};
    try { return await response.json(); } catch { throw fail('authUnavailable', 502); }
  }
  async function session(request, response) {
    const stored = cookies(request);
    if (stored[names.access]) {
      try { return { user: publicUser(await upstream('user', { method: 'GET', token: stored[names.access] })), token: stored[names.access] }; }
      catch (error) { if (error.message !== 'authRequired') throw error; }
    }
    const refresh = stored[names.refresh];
    if (!refresh) { setCookies(response, null); throw fail('authRequired', 401); }
    if (!refreshes.has(refresh)) {
      if (refreshes.size >= 200) throw fail('authUnavailable', 503);
      const task = upstream('token?grant_type=refresh_token', { body: { refresh_token: refresh } });
      refreshes.set(refresh, task);
      task.finally(() => refreshes.delete(refresh)).catch(() => {});
    }
    let next;
    try { next = await refreshes.get(refresh); }
    catch (error) { if (error.message === 'authRequired') setCookies(response, null); throw error; }
    const user = publicUser(next.user);
    setCookies(response, next);
    return { user, token: next.access_token };
  }
  function limit(request, email) {
    const now = Date.now();
    for (const [id, value] of attempts) if (value.until <= now) attempts.delete(id);
    // Do not trust a caller-supplied X-Forwarded-For header. Supabase also applies
    // project limits. Per-address limits keep shared Render proxy IPs usable.
    for (const [id, max] of [[`ip:${request.socket.remoteAddress}`, 100], [`email:${email.toLowerCase()}`, 10]]) {
      const value = attempts.get(id) || { count: 0, until: now + 600000 };
      if (++value.count > max) throw fail('authRateLimited', 429);
      if (attempts.size >= 4096 && !attempts.has(id)) throw fail('authRateLimited', 429);
      attempts.set(id, value);
    }
  }
  async function body(request) {
    if (!/^application\/json(?:\s*;|$)/i.test(request.headers['content-type'] || '')) throw fail('authInvalidInput', 415);
    let size = 0; const chunks = [];
    for await (const chunk of request) {
      size += chunk.length;
      if (size > 8192) throw fail('authInvalidInput', 413);
      chunks.push(chunk);
    }
    try {
      const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error();
      return result;
    } catch { throw fail('authInvalidInput', 400); }
  }
  return async (request, response, pathname, json) => {
    const action = pathname.slice('/api/auth/'.length);
    if (!['session', 'signup', 'login', 'logout'].includes(action)) return json(response, 404, { error: 'notFound' });
    if (request.method !== (action === 'session' ? 'GET' : 'POST')) return json(response, 405, { error: 'methodNotAllowed' });
    if (!configured) return json(response, 503, { error: 'authNotConfigured' });
    // Exact configured origin, JSON requests and SameSite cookies prevent CSRF.
    if (request.method === 'POST' && request.headers.origin !== origin) return json(response, 403, { error: 'authForbidden' });
    try {
      if (action === 'session') return json(response, 200, { user: (await session(request, response)).user });
      if (action === 'logout') {
        try { const current = await session(request, response); await upstream('logout?scope=local', { token: current.token }); }
        catch (error) { if (error.message !== 'authRequired') throw error; }
        setCookies(response, null);
        return json(response, 200, { user: null });
      }
      const input = await body(request);
      const email = typeof input.email === 'string' ? input.email.trim() : '';
      const password = input.password;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || typeof password !== 'string'
        || password.length > 128 || password.length < (action === 'signup' ? 8 : 1)) throw fail('authInvalidInput', 400);
      limit(request, email);
      const result = await upstream(action === 'signup' ? `signup?redirect_to=${encodeURIComponent(`${origin}/login.html`)}` : 'token?grant_type=password', { body: { email, password } });
      if (action === 'signup' && !result.access_token) return json(response, 200, { confirmationRequired: true });
      const user = publicUser(result.user);
      setCookies(response, result);
      return json(response, 200, { user });
    } catch (error) {
      return json(response, error.status || 503, { error: error.status ? error.message : 'authUnavailable' });
    }
  };
}
module.exports = { createAuth };
