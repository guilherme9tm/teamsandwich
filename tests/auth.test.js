const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createServer } = require('../server');
const user = { id: '11111111-1111-4111-8111-111111111111', email: 'player@example.com', private: 'not-for-browser' };
const tokens = { user, access_token: 'private-access', refresh_token: 'private-refresh', expires_in: 3600 };
const origin = 'https://cards.example';
const auth = { url: 'https://project.supabase.co', key: 'sb_publishable_test', origin };
async function withServer(options, action) {
  const server = createServer({ auth, ...options });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(action, body, headers = {}, method = action === 'session' ? 'GET' : 'POST') {
    return fetch(`${base}/api/auth/${action}`, { method,
      headers: { Origin: origin, 'Content-Type': 'application/json', ...headers },
      ...(body ? { body: JSON.stringify(body) } : {}) });
  }
  try { await action(request); } finally { await new Promise(resolve => server.close(resolve)); }
}
test('Auth fails closed when unconfigured or configured with an administrative key', async () => {
  for (const config of [{ url: '', key: '', origin: '' }, { ...auth, key: 'sb_secret_forbidden' }, { ...auth, origin: 'http://public.example' }]) {
    await withServer({ auth: config, fetchImpl: () => assert.fail('must not contact provider') }, async request => {
      const result = await request('login', { email: user.email, password: 'teamsandwich' });
      assert.equal(result.status, 503); assert.deepEqual(await result.json(), { error: 'authNotConfigured' });
    });
  }
});
test('registration requests confirmation without exposing upstream identifiers or tokens', async () => {
  await withServer({ fetchImpl: async (url, options) => {
    assert.equal(url, `https://project.supabase.co/auth/v1/signup?redirect_to=${encodeURIComponent(`${origin}/login.html`)}`);
    assert.equal(options.headers.apikey, auth.key);
    assert.deepEqual(JSON.parse(options.body), { email: user.email, password: 'new-secret-123' });
    return Response.json(user);
  } }, async request => {
    const result = await request('signup', { email: ` ${user.email} `, password: 'new-secret-123' });
    assert.equal(result.status, 200); assert.deepEqual(await result.json(), { confirmationRequired: true });
    assert.equal(result.headers.get('set-cookie'), null);
  });
});
test('login stores tokens only in secure HttpOnly host cookies, validates session with provider and revokes logout', async () => {
  const calls = [];
  await withServer({ fetchImpl: async (url, options) => {
    calls.push(url);
    if (url.endsWith('token?grant_type=password')) return Response.json(tokens);
    assert.equal(options.headers.Authorization, 'Bearer private-access');
    if (url.endsWith('/user')) return Response.json(user);
    assert.ok(url.endsWith('/logout?scope=local')); return new Response(null, { status: 204 });
  } }, async request => {
    const login = await request('login', { email: user.email, password: 'secret-123' });
    assert.deepEqual(await login.json(), { user: { id: user.id, email: user.email } });
    assert.equal(login.headers.get('cache-control'), 'no-store');
    const setCookies = login.headers.getSetCookie(); assert.equal(setCookies.length, 2);
    for (const cookie of setCookies) {
      assert.match(cookie, /^__Host-ts_/); assert.match(cookie, /HttpOnly/); assert.match(cookie, /; Secure/);
      assert.match(cookie, /SameSite=Lax/); assert.match(cookie, /Path=\//); assert.ok(!cookie.includes('Domain='));
    }
    const Cookie = setCookies.map(cookie => cookie.split(';')[0]).join('; ');
    const session = await request('session', null, { Cookie }); assert.equal(session.status, 200);
    assert.deepEqual(await session.json(), { user: { id: user.id, email: user.email } });
    const logout = await request('logout', null, { Cookie }); assert.equal(logout.status, 200);
    assert.ok(logout.headers.getSetCookie().every(cookie => cookie.includes('Max-Age=0')));
    assert.equal(calls.length, 4);
  });
});
test('expired access refreshes with rotated cookies and never trusts a client supplied user', async () => {
  await withServer({ fetchImpl: async (url, options) => {
    if (url.endsWith('/user')) return Response.json({}, { status: 401 });
    assert.ok(url.endsWith('token?grant_type=refresh_token'));
    assert.deepEqual(JSON.parse(options.body), { refresh_token: 'old-refresh' });
    return Response.json(tokens);
  } }, async request => {
    const result = await request('session', null, { Cookie: '__Host-ts_access=expired; __Host-ts_refresh=old-refresh' });
    assert.equal(result.status, 200); assert.match(result.headers.get('set-cookie'), /private-refresh/);
    const anonymous = await request('session', null, { Cookie: 'teamSandwich.deckAccess.v1=granted; user=admin' });
    assert.equal(anonymous.status, 401); assert.equal((await anonymous.json()).error, 'authRequired');
  });
});
test('invalid refresh clears cookies; provider outage keeps cookies and exposes no upstream details', async () => {
  for (const upstreamStatus of [401, 500]) {
    await withServer({ fetchImpl: async () => Response.json({ message: 'internal secret provider detail' }, { status: upstreamStatus }) }, async request => {
      const result = await request('session', null, { Cookie: '__Host-ts_refresh=old-refresh' });
      assert.equal(result.status, upstreamStatus === 401 ? 401 : 503);
      const body = await result.json(); assert.ok(!JSON.stringify(body).includes('secret'));
      assert.equal(!!result.headers.get('set-cookie'), upstreamStatus === 401);
    });
  }
});
test('CSRF, unsupported methods, content type, invalid input and excessive bodies are rejected before provider calls', async () => {
  await withServer({ fetchImpl: () => assert.fail('no provider calls for invalid requests') }, async request => {
    const valid = { email: user.email, password: 'secret-123' };
    assert.equal((await request('login', valid, { Origin: 'https://attacker.example' })).status, 403);
    assert.equal((await request('logout', null, { Origin: '' })).status, 403);
    assert.equal((await request('login', null, {}, 'GET')).status, 405);
    assert.equal((await request('login', valid, { 'Content-Type': 'text/plain' })).status, 415);
    for (const body of [{ email: 'bad', password: '12345678' }, { email: user.email, password: 'short' }, { email: user.email, password: 'a'.repeat(129) }]) {
      assert.equal((await request('signup', body)).status, 400);
    }
    assert.equal((await request('login', { ...valid, extra: 'x'.repeat(9000) })).status, 413);
    assert.equal((await request('admin')).status, 404);
  });
});
test('invalid credentials, unconfirmed email and rate limits have actionable generic errors', async () => {
  for (const [status, upstream, error] of [[400, {}, 'authInvalidCredentials'], [400, { code: 'email_not_confirmed' }, 'authEmailUnconfirmed'], [400, { error_code: 'email_not_confirmed' }, 'authEmailUnconfirmed'], [429, {}, 'authRateLimited']]) {
    await withServer({ fetchImpl: async () => Response.json(upstream, { status }) }, async request => {
      const result = await request('login', { email: user.email, password: 'bad' });
      assert.equal((await result.json()).error, error);
    });
  }
  let calls = 0;
  await withServer({ fetchImpl: async () => { calls++; return Response.json({}, { status: 400 }); } }, async request => {
    for (let i = 0; i < 11; i++) {
      const result = await request('login', { email: user.email, password: 'bad' }, { 'X-Forwarded-For': `spoof-${i}` });
      assert.equal(result.status, i === 10 ? 429 : 401);
    }
    assert.equal(calls, 10);
  });
});
