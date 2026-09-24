// Unit tests for api/claude.js - mocks only, no network, no Firebase, no Clerk.
// Run: node test/api-claude.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHandler, resolveModel, DEFAULT_MODEL } = require('../api/claude.js');
const { createFirestoreRateLimiter, resolveLimit } = require('../api/_lib/rate-limit.js');
const { extractBearerToken, verifyClerkSessionToken, isProvisioned } = require('../api/_lib/clerk-auth.js');

const GOOD_CLAIMS = { sub: 'user_123', metadata: { provisioned: true } };
const OK_LIMIT = { allowed: true, limit: 60, remaining: 59, retryAfterSeconds: 1800 };

function mockRes() {
  const res = {
    statusCode: null, body: undefined, headers: {},
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
    end() { return this; },
  };
  return res;
}

function mockReq(overrides = {}) {
  return {
    method: 'POST',
    headers: { authorization: 'Bearer good-token' },
    body: { messages: [{ role: 'user', content: 'hi' }] },
    ...overrides,
  };
}

function anthropicOk(data = { content: [{ text: 'hello' }] }) {
  return async () => ({ ok: true, status: 200, json: async () => data });
}

function build(extra = {}) {
  const calls = [];
  const fetchImpl = extra.fetchImpl || (async (url, opts) => {
    calls.push({ url, opts, body: JSON.parse(opts.body) });
    return { ok: true, status: 200, json: async () => ({ content: [{ text: 'hello' }] }) };
  });
  const handler = createHandler({
    verifyClerkToken: extra.verifyClerkToken || (async (t) => (t === 'good-token' ? GOOD_CLAIMS : null)),
    rateLimiter: extra.rateLimiter || { check: async () => OK_LIMIT },
    fetchImpl,
  });
  return { handler, calls };
}

let savedKey;
test.beforeEach(() => { savedKey = process.env.ANTHROPIC_API_KEY; process.env.ANTHROPIC_API_KEY = 'test-server-key'; });
test.afterEach(() => {
  if (savedKey === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = savedKey;
});

test('no Authorization header -> 401, nothing forwarded', async () => {
  const { handler, calls } = build();
  const res = mockRes();
  await handler(mockReq({ headers: {} }), res);
  assert.equal(res.statusCode, 401);
  assert.equal(calls.length, 0);
});

test('non-Bearer / empty bearer -> 401', async () => {
  const { handler } = build();
  for (const authorization of ['Basic abc', 'Bearer ', 'Bearer    ']) {
    const res = mockRes();
    await handler(mockReq({ headers: { authorization } }), res);
    assert.equal(res.statusCode, 401, authorization);
  }
});

test('invalid token -> 401, nothing forwarded', async () => {
  const { handler, calls } = build();
  const res = mockRes();
  await handler(mockReq({ headers: { authorization: 'Bearer forged' } }), res);
  assert.equal(res.statusCode, 401);
  assert.equal(calls.length, 0);
});

test('an old-style Firebase ID token is not accepted (verifier decides, returns null)', async () => {
  const { handler } = build();
  const res = mockRes();
  await handler(mockReq({ headers: { authorization: 'Bearer eyJhbGciOiJSUzI1NiJ9.e30.sig' } }), res);
  assert.equal(res.statusCode, 401);
});

test('valid Clerk token but unprovisioned account -> 403', async () => {
  const { handler, calls } = build({ verifyClerkToken: async () => ({ sub: 'user_9', metadata: {} }) });
  const res = mockRes();
  await handler(mockReq(), res);
  assert.equal(res.statusCode, 403);
  assert.equal(calls.length, 0);
});

test('disallowed model -> forwarded with claude-sonnet-5 (no error)', async () => {
  const { handler, calls } = build();
  for (const model of ['gpt-4', 'claude-3-opus-20240229', 'claude-opus-4-8', '', null, 42, undefined, { a: 1 }]) {
    calls.length = 0;
    const res = mockRes();
    await handler(mockReq({ body: { model, messages: [{ role: 'user', content: 'hi' }] } }), res);
    assert.equal(res.statusCode, 200, String(model));
    assert.equal(calls[0].body.model, 'claude-sonnet-5', String(model));
  }
});

test('allowed models pass through; haiku alias maps to the dated id', async () => {
  const { handler, calls } = build();
  const cases = [
    ['claude-sonnet-5', 'claude-sonnet-5'],
    ['claude-haiku-4-5-20251001', 'claude-haiku-4-5-20251001'],
    ['claude-haiku-4-5', 'claude-haiku-4-5-20251001'],
    ['claude-opus-5-5', 'claude-opus-5-5'],
  ];
  for (const [input, expected] of cases) {
    calls.length = 0;
    const res = mockRes();
    await handler(mockReq({ body: { model: input, messages: [{ role: 'user', content: 'hi' }] } }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(calls[0].body.model, expected);
  }
  assert.equal(resolveModel(undefined), DEFAULT_MODEL);
});

test('temperature / top_p / top_k are never forwarded; no thinking or tool_choice either', async () => {
  const { handler, calls } = build();
  const res = mockRes();
  await handler(mockReq({
    body: {
      model: 'claude-opus-5-5', temperature: 1.0, top_p: 0.9, top_k: 40,
      thinking: { type: 'disabled' }, tool_choice: { type: 'any' }, budget_tokens: 100,
      messages: [{ role: 'user', content: 'hi' }],
    },
  }), res);
  assert.equal(res.statusCode, 200);
  const sent = calls[0].body;
  for (const k of ['temperature', 'top_p', 'top_k', 'thinking', 'tool_choice', 'budget_tokens']) {
    assert.ok(!(k in sent), `${k} must not be forwarded`);
  }
  assert.deepEqual(Object.keys(sent).sort(), ['max_tokens', 'messages', 'model']);
});

test('max_tokens is capped at 16000', async () => {
  const { handler, calls } = build();
  await handler(mockReq({ body: { max_tokens: 999999, messages: [{ role: 'user', content: 'hi' }] } }), mockRes());
  assert.equal(calls[0].body.max_tokens, 16000);
});

test('input caps: oversized message and system prompt -> 400', async () => {
  const { handler, calls } = build();
  let res = mockRes();
  await handler(mockReq({ body: { messages: [{ role: 'user', content: 'x'.repeat(5001) }] } }), res);
  assert.equal(res.statusCode, 400);
  res = mockRes();
  await handler(mockReq({ body: { system: 'x'.repeat(5001), messages: [{ role: 'user', content: 'hi' }] } }), res);
  assert.equal(res.statusCode, 400);
  res = mockRes();
  await handler(mockReq({ body: { messages: [] } }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(calls.length, 0);
});

test('over the rate limit -> 429 with retry-after, nothing forwarded', async () => {
  const { handler, calls } = build({
    rateLimiter: { check: async () => ({ allowed: false, limit: 60, remaining: 0, retryAfterSeconds: 1234 }) },
  });
  const res = mockRes();
  await handler(mockReq(), res);
  assert.equal(res.statusCode, 429);
  assert.equal(res.headers['retry-after'], '1234');
  assert.match(res.body.error.message, /limit/i);
  assert.equal(calls.length, 0);
});

test('Firestore / limiter error -> 503 (fail closed), nothing forwarded', async () => {
  const origError = console.error; console.error = () => {};
  try {
    const { handler, calls } = build({ rateLimiter: { check: async () => { throw new Error('firestore down'); } } });
    const res = mockRes();
    await handler(mockReq(), res);
    assert.equal(res.statusCode, 503);
    assert.equal(calls.length, 0);
  } finally { console.error = origError; }
});

test('rate limiter is keyed by the verified Clerk user id, not client input', async () => {
  const seen = [];
  const { handler } = build({ rateLimiter: { check: async (id) => { seen.push(id); return OK_LIMIT; } } });
  await handler(mockReq({ headers: { authorization: 'Bearer good-token', 'x-user-id': 'someone-else' } }), mockRes());
  assert.deepEqual(seen, ['user_123']);
});

test('happy path -> 200; Anthropic key comes only from process.env.ANTHROPIC_API_KEY', async () => {
  const { handler, calls } = build();
  const res = mockRes();
  await handler(mockReq({
    headers: { authorization: 'Bearer good-token', 'x-api-key': 'client-key', 'anthropic-api-key': 'client-key2' },
    body: { apiKey: 'client-key3', messages: [{ role: 'user', content: 'hi' }] },
  }), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { content: [{ text: 'hello' }] });
  assert.equal(calls[0].url, 'https://api.anthropic.com/v1/messages');
  assert.equal(calls[0].opts.headers['x-api-key'], 'test-server-key');
  assert.ok(!calls[0].opts.body.includes('client-key'));
});

test('missing ANTHROPIC_API_KEY -> 503', async () => {
  delete process.env.ANTHROPIC_API_KEY;
  const origError = console.error; console.error = () => {};
  try {
    const { handler, calls } = build();
    const res = mockRes();
    await handler(mockReq(), res);
    assert.equal(res.statusCode, 503);
    assert.equal(calls.length, 0);
  } finally { console.error = origError; }
});

test('Anthropic 404 (model not available) -> clear 404 error, no fallback call', async () => {
  const origError = console.error; console.error = () => {};
  try {
    let n = 0;
    const { handler } = build({
      fetchImpl: async () => { n++; return { ok: false, status: 404, json: async () => ({ error: { type: 'not_found_error', message: 'model: claude-opus-5-5' } }) }; },
    });
    const res = mockRes();
    await handler(mockReq({ body: { model: 'claude-opus-5-5', messages: [{ role: 'user', content: 'hi' }] } }), res);
    assert.equal(res.statusCode, 404);
    assert.equal(res.body.error.type, 'model_not_found');
    assert.match(res.body.error.message, /claude-opus-5-5/);
    assert.equal(n, 1);
  } finally { console.error = origError; }
});

test('Anthropic 401 from our own key is not surfaced as a user 401', async () => {
  const origError = console.error; console.error = () => {};
  try {
    const { handler } = build({ fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({ error: { type: 'authentication_error' } }) }) });
    const res = mockRes();
    await handler(mockReq(), res);
    assert.equal(res.statusCode, 502);
  } finally { console.error = origError; }
});

test('CORS: allow-listed origin is echoed, others are not; OPTIONS -> 200; GET -> 405', async () => {
  const { handler } = build();
  let res = mockRes();
  await handler(mockReq({ method: 'OPTIONS', headers: { origin: 'https://taste-signature-ai-app.web.app' } }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['access-control-allow-origin'], 'https://taste-signature-ai-app.web.app');
  res = mockRes();
  await handler(mockReq({ method: 'OPTIONS', headers: { origin: 'https://evil.example' } }), res);
  assert.equal(res.headers['access-control-allow-origin'], undefined);
  res = mockRes();
  await handler(mockReq({ method: 'GET' }), res);
  assert.equal(res.statusCode, 405);
});

// ---- shared helpers ----

test('extractBearerToken', () => {
  assert.equal(extractBearerToken('Bearer abc'), 'abc');
  assert.equal(extractBearerToken('bearer abc'), null);
  assert.equal(extractBearerToken(undefined), null);
  assert.equal(extractBearerToken('Bearer '), null);
});

test('verifyClerkSessionToken: returns claims, or null on any failure', async () => {
  assert.deepEqual(await verifyClerkSessionToken('t', async () => ({ data: { sub: 'u1' } })), { sub: 'u1' });
  assert.deepEqual(await verifyClerkSessionToken('t', async () => ({ sub: 'u2' })), { sub: 'u2' });
  assert.equal(await verifyClerkSessionToken('t', async () => ({ data: undefined, errors: [{}] })), null);
  assert.equal(await verifyClerkSessionToken('t', async () => ({ data: {} })), null);
  assert.equal(await verifyClerkSessionToken('t', async () => { throw new Error('bad'); }), null);
});

test('verifyClerkSessionToken passes the authorized parties to Clerk', async () => {
  let opts;
  await verifyClerkSessionToken('t', async (_t, o) => { opts = o; return { sub: 'u' }; });
  assert.deepEqual(opts.authorizedParties, ['https://signature.qeptss.com', 'https://qeptss.com']);
});

test('isProvisioned', () => {
  assert.equal(isProvisioned({ metadata: { provisioned: true } }), true);
  assert.equal(isProvisioned({ metadata: { provisioned: 'true' } }), false);
  assert.equal(isProvisioned({}), false);
  assert.equal(isProvisioned(null), false);
});

// ---- Firestore rate limiter (in-memory fake db with serialised transactions) ----

function fakeDb() {
  const store = new Map();
  const db = {
    store,
    collection(name) { return { doc(id) { return { path: `${name}/${id}` }; } }; },
    async runTransaction(fn) {
      const tx = {
        async get(ref) { const v = store.get(ref.path); return { exists: v !== undefined, data: () => v }; },
        set(ref, v) { store.set(ref.path, v); },
      };
      return fn(tx);
    },
  };
  return db;
}

test('rate limiter: allows up to the limit within one window, then blocks with retry-after', async () => {
  const db = fakeDb();
  let now = Date.UTC(2026, 0, 1, 10, 15, 0); // 10:15:00 -> 45 min left in the window
  const rl = createFirestoreRateLimiter({ getDb: () => db, limit: 3, now: () => now });
  for (let i = 0; i < 3; i++) assert.equal((await rl.check('user_1')).allowed, true);
  const blocked = await rl.check('user_1');
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds, 45 * 60);
  // Another user is unaffected.
  assert.equal((await rl.check('user_2')).allowed, true);
  // Blocked calls do not increment the counter.
  assert.equal(db.store.get('aiRateLimits/user_1').count, 3);
});

test('rate limiter: a new hourly window resets the count', async () => {
  const db = fakeDb();
  let now = Date.UTC(2026, 0, 1, 10, 59, 59);
  const rl = createFirestoreRateLimiter({ getDb: () => db, limit: 1, now: () => now });
  assert.equal((await rl.check('u')).allowed, true);
  assert.equal((await rl.check('u')).allowed, false);
  now = Date.UTC(2026, 0, 1, 11, 0, 0);
  assert.equal((await rl.check('u')).allowed, true);
});

test('rate limiter: propagates Firestore errors (caller fails closed) and rejects bad keys', async () => {
  const rl = createFirestoreRateLimiter({ getDb: () => { throw new Error('no db'); } });
  await assert.rejects(() => rl.check('u'), /no db/);
  await assert.rejects(() => rl.check('a/b'), /Invalid/);
  await assert.rejects(() => rl.check(''), /Invalid/);
});

test('resolveLimit: default 60, positive integers only', () => {
  assert.equal(resolveLimit(undefined), 60);
  assert.equal(resolveLimit('abc'), 60);
  assert.equal(resolveLimit('0'), 60);
  assert.equal(resolveLimit('-5'), 60);
  assert.equal(resolveLimit('120'), 120);
});

test('proxy passes a thinking-first response through unchanged (client extracts the text block)', async () => {
  const body = { content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: 'answer' }], stop_reason: 'end_turn' };
  const { handler } = build({ fetchImpl: anthropicOk(body) });
  const res = mockRes();
  await handler(mockReq(), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, body);
});

test('proxy logs a warning (metadata only) when Anthropic returns 200 without a text block', async () => {
  const warnings = [];
  const origWarn = console.warn;
  console.warn = (...a) => warnings.push(a.join(' '));
  try {
    const { handler } = build({ fetchImpl: anthropicOk({ content: [{ type: 'thinking', thinking: 'SECRET' }], stop_reason: 'max_tokens' }) });
    const res = mockRes();
    await handler(mockReq(), res);
    assert.equal(res.statusCode, 200);
  } finally {
    console.warn = origWarn;
  }
  const line = warnings.find(w => w.includes('NO text block'));
  assert.ok(line, 'expected a no-text-block warning');
  assert.match(line, /max_tokens/);
  assert.match(line, /thinking/);
  assert.ok(!line.includes('SECRET'), 'must not log content');
});

test('max_tokens: values up to the cap pass through unchanged; thinking is not overridden', async () => {
  const { handler, calls } = build();
  await handler(mockReq({ body: { max_tokens: 16000, messages: [{ role: 'user', content: 'hi' }] } }), mockRes());
  await handler(mockReq({ body: { max_tokens: 5000, messages: [{ role: 'user', content: 'hi' }] } }), mockRes());
  assert.equal(calls[0].body.max_tokens, 16000);
  assert.equal(calls[1].body.max_tokens, 5000);
  // Thinking stays at the API default: the proxy never sends a thinking param.
  assert.ok(!('thinking' in calls[0].body));
});

test('client default (config.js CLAUDE_MAX_TOKENS) is 16000 and is not above the proxy cap', () => {
  const vm = require('node:vm');
  const fs = require('node:fs');
  const path = require('node:path');
  const { MAX_TOKENS } = require('../api/claude.js');
  const ctx = { window: {}, console };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8'), ctx);
  const clientDefault = ctx.window.AI_CONFIG.CLAUDE_MAX_TOKENS;
  assert.equal(clientDefault, 16000);
  assert.equal(MAX_TOKENS, 16000);
  assert.ok(clientDefault <= MAX_TOKENS, 'client would be silently capped by the proxy');
});

test('timeouts: upstream REQUEST_TIMEOUT is exactly 5s below vercel.json maxDuration for api/claude.js', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const { REQUEST_TIMEOUT } = require('../api/claude.js');
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8'));
  const maxDuration = cfg.functions['api/claude.js'].maxDuration;
  assert.equal(maxDuration, 300);
  assert.equal(REQUEST_TIMEOUT, (maxDuration - 5) * 1000);
});
