// The single "Clerk ready" signal in auth.js (authManager.whenClerkReady())
// and everything that must await it. Audit A2 (2026-09-25) found 13 places
// where, on a returning visit, Firebase restored its session and the app ran
// BEFORE auth.js's Clerk gate had loaded ClerkJS / run setActive(org) / the
// provisioning check. These tests drive the real auth.js (and
// qep-capture-client.js / claude-api.js / config.js) against fakes where the
// test decides exactly when Clerk.load() and setActive() finish.
// Run: node --test test/clerk-ready-signal.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const { bootAuth, makeClerk, flushMany } = require('./helpers/auth-sandbox');

const PORTAL = 'https://qeptss.com';
const FB_USER = { uid: 'user_1', email: 'derek@example.com', displayName: 'Derek' };

// ------------------------------------------------------------------
// The signal itself
// ------------------------------------------------------------------

test('signal: signed-in resolves only AFTER Clerk.load() and the single-org setActive finished', async () => {
    const events = [];
    const clerk = makeClerk({ events });
    const s = bootAuth({ clerk, events });
    assert.equal(typeof s.am.whenClerkReady, 'function', 'authManager.whenClerkReady() exists');
    let state = null;
    s.am.whenClerkReady().then((v) => { state = v; events.push('ready'); });
    const init = s.am.initialize();
    await flushMany();
    assert.equal(state, null, 'not ready while Clerk.load() is pending');
    clerk.loadD.resolve();
    await flushMany();
    assert.ok(events.includes('clerk:setActive:start'));
    assert.equal(state, null, 'not ready while setActive is pending');
    clerk.setActiveD.resolve();
    await flushMany();
    assert.equal(state && state.status, 'signed-in');
    assert.equal(state.session, clerk.session);
    assert.ok(events.indexOf('clerk:setActive:done') < events.indexOf('ready'));
    assert.equal(await init, true);
    assert.deepEqual(s.am.clerkReadyState && s.am.clerkReadyState.status, 'signed-in');
});

test('signal: setActive failure is swallowed and the signal still resolves signed-in', async () => {
    const clerk = makeClerk();
    const s = bootAuth({ clerk });
    const init = s.am.initialize();
    clerk.loadD.resolve();
    await flushMany();
    clerk.setActiveD.reject(new Error('boom'));
    const state = await s.am.whenClerkReady(1000);
    assert.equal(state.status, 'signed-in');
    assert.equal(await init, true);
});

test('signal: no Clerk session resolves signed-out', async () => {
    const clerk = makeClerk({ signedIn: false });
    const s = bootAuth({ clerk });
    const init = s.am.initialize();
    clerk.loadD.resolve();
    const state = await s.am.whenClerkReady(1000);
    assert.equal(state.status, 'signed-out');
    assert.equal(state.session, null);
    assert.equal(await init, true);
});

test('signal: demo mode resolves demo immediately and never loads ClerkJS', async () => {
    const s = bootAuth({ clerk: undefined, demo: true });
    assert.equal(await s.am.initialize(), true);
    const started = Date.now();
    const state = await s.am.whenClerkReady();
    assert.ok(Date.now() - started < 100);
    assert.equal(state.status, 'demo');
    assert.equal(s.scripts.length, 0, 'no clerk.browser.js injected');
});

test('signal: Clerk.load() failing resolves error (never hangs)', async () => {
    const clerk = makeClerk();
    const s = bootAuth({ clerk });
    const init = s.am.initialize();
    clerk.loadD.reject(new Error('clerk down'));
    const state = await s.am.whenClerkReady(1000);
    assert.equal(state.status, 'error');
    assert.equal(await init, false, 'fresh visit: gate failure is still fatal');
});

test('signal: ClerkJS script failing to load resolves error', async () => {
    const s = bootAuth({ clerk: undefined });
    const init = s.am.initialize();
    await flushMany();
    assert.equal(s.scripts.length, 1);
    await s.scripts[0]._fire('error');
    const state = await s.am.whenClerkReady(1000);
    assert.equal(state.status, 'error');
    assert.equal(await init, false);
});

test('signal: a gate that never finishes still settles each waiter (timeout safety net)', async () => {
    const clerk = makeClerk(); // load() never resolves
    const s = bootAuth({ clerk });
    s.am.initialize();
    const started = Date.now();
    const state = await s.am.whenClerkReady(50);
    assert.ok(Date.now() - started < 1000);
    assert.equal(state.status, 'error');
    assert.equal(state.reason, 'timeout');
});

test('signal: waiting before initialize() was ever called still settles', async () => {
    const s = bootAuth({ clerk: makeClerk() });
    const state = await s.am.whenClerkReady(30);
    assert.equal(state.status, 'error');
    assert.equal(state.reason, 'timeout');
});

test('signal: the default safety net reuses the 15 s budget', () => {
    const s = bootAuth({ clerk: makeClerk() });
    assert.equal(require('node:vm').runInContext('CLERK_READY_TIMEOUT_MS', s.ctx), 15000);
});

test('signal: not provisioned -> redirect to the portal, signal signed-out, no token exchange', async () => {
    const clerk = makeClerk({ provisioned: false, orgs: [] });
    const s = bootAuth({ clerk });
    const init = s.am.initialize();
    clerk.loadD.resolve();
    const state = await s.am.whenClerkReady(1000);
    assert.equal(state.status, 'signed-out');
    assert.equal(state.reason, 'not-provisioned');
    assert.equal(await init, false);
    assert.deepEqual(s.location.hrefSets, [PORTAL]);
    assert.equal(s.fetchCalls.length, 0);
});

// ------------------------------------------------------------------
// Returning visit: Firebase restores its user BEFORE Clerk is ready
// ------------------------------------------------------------------

test('returning visit (#3): the deep link runs only after the signal, not on Firebase restore', async () => {
    const events = [];
    const clerk = makeClerk({ events });
    const s = bootAuth({ clerk, events });
    const init = s.am.initialize();
    s.auth.restore(FB_USER);
    await flushMany();
    assert.ok(events.includes('showApp'), 'app still shows from the Firebase session');
    assert.ok(!events.includes('deepLink'), 'deep link must wait for Clerk');
    clerk.loadD.resolve();
    clerk.setActiveD.resolve();
    await init;
    await flushMany();
    assert.ok(events.includes('deepLink'));
    assert.ok(events.indexOf('clerk:setActive:done') < events.indexOf('deepLink'));
});

test('returning visit, Clerk signed out (#8): Firebase is signed out BEFORE the auth screen is shown', async () => {
    const events = [];
    const clerk = makeClerk({ signedIn: false, events });
    const s = bootAuth({ clerk, events });
    const init = s.am.initialize();
    s.auth.restore(FB_USER);
    await flushMany();
    clerk.loadD.resolve();
    assert.equal(await init, true);
    assert.equal(s.auth.signOutCalls, 1, 'Firebase signOut was awaited');
    assert.equal(s.auth.currentUser, null);
    assert.equal(s.am.currentUser, null);
    const lastAuthScreen = events.lastIndexOf('showAuthScreen');
    assert.ok(events.indexOf('firebase:signOut:done') < lastAuthScreen);
    assert.ok(!events.includes('deepLink'), 'no deep link for a signed-out Clerk');
});

test('returning visit, token exchange fails (#11): non-fatal - warns, no alert, initialize() resolves true', async () => {
    const clerk = makeClerk();
    const s = bootAuth({ clerk, fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({}) }) });
    const init = s.am.initialize();
    s.auth.restore(FB_USER); // same uid as the Clerk user (uid === Clerk sub)
    clerk.loadD.resolve();
    clerk.setActiveD.resolve();
    assert.equal(await init, true);
    assert.deepEqual(s.alerts, []);
    assert.ok(s.warnings.some((w) => /token exchange/i.test(w)), s.warnings.join('\n'));
    assert.equal((await s.am.whenClerkReady()).status, 'signed-in');
});

test('fresh visit, token exchange fails: still fatal (alert, initialize() false)', async () => {
    const clerk = makeClerk();
    const s = bootAuth({ clerk, fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({}) }) });
    const init = s.am.initialize();
    s.auth.restore(null);
    clerk.loadD.resolve();
    clerk.setActiveD.resolve();
    assert.equal(await init, false);
    assert.equal(s.alerts.length, 1);
});

test('returning visit, exchange fails and the Firebase user is a DIFFERENT identity: still fatal', async () => {
    const clerk = makeClerk({ userId: 'user_2' });
    const s = bootAuth({ clerk, fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }) });
    const init = s.am.initialize();
    s.auth.restore(FB_USER);
    clerk.loadD.resolve();
    clerk.setActiveD.resolve();
    assert.equal(await init, false);
    assert.equal(s.alerts.length, 1);
});

// ------------------------------------------------------------------
// Dual-write / qep-capture token (#1, #2, #4, #9)
// ------------------------------------------------------------------

test('qep-capture (#2/#9): Clerk loaded but setActive pending - token is minted only after setActive, with the org claim', async () => {
    const events = [];
    const clerk = makeClerk({ events });
    const s = bootAuth({ clerk, events, withCaptureClient: true });
    const init = s.am.initialize();
    s.auth.restore(FB_USER);
    clerk.loadD.resolve();
    await flushMany();
    assert.equal(clerk.loaded, true, 'Clerk.loaded is already true here (the old poll would stop now)');
    s.ctx.getQepCaptureClient();
    let token = null;
    s.ctx.captured.opts.accessToken().then((t) => { token = t; });
    await flushMany();
    assert.equal(token, null);
    assert.deepEqual(clerk.getTokenCalls, [], 'no token minted before setActive');
    clerk.setActiveD.resolve();
    await init;
    await flushMany();
    assert.equal(token, 'jwt-with-org_1');
    assert.ok(!clerk.getTokenCalls.includes('jwt-no-org'), clerk.getTokenCalls.join(','));
});

test('qep-capture (#1): signal signed-out -> fast not-signed-in error, never a null token', async () => {
    const clerk = makeClerk({ signedIn: false });
    const s = bootAuth({ clerk, withCaptureClient: true });
    const init = s.am.initialize();
    clerk.loadD.resolve();
    await init;
    s.ctx.getQepCaptureClient();
    const started = Date.now();
    await assert.rejects(s.ctx.captured.opts.accessToken(), /not signed in/i);
    assert.ok(Date.now() - started < 1000);
});

test('qep-capture (#1): signal error -> not-signed-in error, never a null token', async () => {
    const clerk = makeClerk();
    const s = bootAuth({ clerk, withCaptureClient: true });
    const init = s.am.initialize();
    clerk.loadD.reject(new Error('clerk down'));
    await init;
    s.ctx.getQepCaptureClient();
    await assert.rejects(s.ctx.captured.opts.accessToken(), /not signed in/i);
});

test('qep-capture: demo mode still fails fast with the demo message (PR #45 preserved)', async () => {
    const s = bootAuth({ clerk: undefined, demo: true, withCaptureClient: true });
    await s.am.initialize();
    assert.throws(() => s.ctx.getQepCaptureClient(), (err) => err.code === 'QEP_DEMO_MODE');
});

// ------------------------------------------------------------------
// AI availability (#5, #6)
// ------------------------------------------------------------------

function loadClaudeApi(windowObj) {
    const p = require.resolve('../claude-api.js');
    delete require.cache[p];
    global.window = Object.assign({
        AI_CONFIG: { ANTHROPIC_API_URL: '/api/claude', CLAUDE_MAX_TOKENS: 16000, CLAUDE_MODEL: 'claude-sonnet-5' },
        UsageTracker: class { canUseAI() { return { allowed: true }; } },
    }, windowObj);
    return require(p).ClaudeAI;
}

test('claude-api getAuthToken (#5): waits for the Clerk signal before reading the session', async () => {
    let release;
    const ready = new Promise((r) => { release = r; });
    const calls = [];
    const clerk = { session: { getToken: async () => { calls.push('getToken'); return 'clerk-token'; } } };
    const ClaudeAI = loadClaudeApi({ Clerk: clerk, authManager: { currentUser: { uid: 'u1' }, whenClerkReady: () => ready } });
    const ai = new ClaudeAI();
    let token;
    const p = ai.getAuthToken().then((t) => { token = t; });
    await flushMany();
    assert.deepEqual(calls, [], 'no getToken before the signal');
    release({ status: 'signed-in', session: clerk.session });
    await p;
    assert.equal(token, 'clerk-token');
});

test('claude-api getAuthToken (#5): signal signed-out -> null, sendMessage says not signed in', async () => {
    const clerk = { session: { getToken: async () => 'stale-token' } };
    const ClaudeAI = loadClaudeApi({ Clerk: clerk, authManager: { currentUser: { uid: 'u1' }, whenClerkReady: async () => ({ status: 'signed-out', session: null }) } });
    const ai = new ClaudeAI();
    assert.equal(await ai.getAuthToken(), null);
    await assert.rejects(ai.sendMessage('hi'), /not signed in/i);
});

test('claude-api getAuthToken: demo signal -> null (clear not-signed-in message)', async () => {
    const ClaudeAI = loadClaudeApi({ Clerk: undefined, authManager: { currentUser: null, whenClerkReady: async () => ({ status: 'demo', session: null }) } });
    assert.equal(await new ClaudeAI().getAuthToken(), null);
});

function isAIAvailableWith(windowObj) {
    const p = require.resolve('../config.js');
    delete require.cache[p];
    const saved = global.window;
    global.window = windowObj;
    try {
        const { isAIAvailable } = require(p);
        return isAIAvailable();
    } finally {
        global.window = saved;
    }
}

test('isAIAvailable (#6): false once Clerk is known signed-out, even with a stale Firebase session', () => {
    const am = { isAuthenticated: () => true, clerkReadyState: { status: 'signed-out', session: null } };
    assert.equal(isAIAvailableWith({ authManager: am, claudeAI: {} }), false);
});

test('isAIAvailable (#6): false when the Clerk gate errored or in demo', () => {
    for (const status of ['error', 'demo']) {
        const am = { isAuthenticated: () => true, clerkReadyState: { status, session: null } };
        assert.equal(isAIAvailableWith({ authManager: am, claudeAI: {} }), false, status);
    }
});

test('isAIAvailable (#6): true when Clerk is signed-in, and (Firebase-only) while Clerk is still loading', () => {
    const signedIn = { isAuthenticated: () => true, clerkReadyState: { status: 'signed-in', session: {} } };
    assert.equal(isAIAvailableWith({ authManager: signedIn, claudeAI: {} }), true);
    const loading = { isAuthenticated: () => true, clerkReadyState: null };
    assert.equal(isAIAvailableWith({ authManager: loading, claudeAI: {} }), true);
});

// ------------------------------------------------------------------
// Logout (#7)
// ------------------------------------------------------------------

test('logout (#7) before Clerk has loaded: signs Firebase out and still hard-redirects (to the Portal sign-out page when Clerk never loads)', async () => {
    const clerk = makeClerk(); // load() pending for the whole test
    const s = bootAuth({ clerk });
    s.am.initialize();
    s.auth.restore(FB_USER);
    await flushMany();
    s.am.logoutClerkWaitMs = 50;
    s.am.logoutClerkLoadMs = 50; // follow-up: logout now also waits (bounded) for Clerk to load
    const res = await s.am.logout();
    assert.equal(res.success, true);
    assert.equal(s.auth.signOutCalls, 1);
    // Clerk session state unknown -> never the portal home (see logout-clerk-signout.test.js).
    assert.deepEqual(s.location.hrefSets, [PORTAL + '/dashboard']);
});

test('logout (#7): a gate still pending at logout can NOT re-sign-in Firebase afterwards', async () => {
    const clerk = makeClerk();
    const s = bootAuth({ clerk });
    const init = s.am.initialize();
    s.auth.restore(FB_USER);
    await flushMany();
    s.am.logoutClerkWaitMs = 50;
    await s.am.logout();
    clerk.loadD.resolve();
    clerk.setActiveD.resolve();
    await init;
    await flushMany();
    assert.deepEqual(s.auth.customTokenCalls, [], 'no signInWithCustomToken after logout');
    assert.equal(s.fetchCalls.length, 0, 'no token exchange after logout');
});

test('logout (#7) after the gate: waits for the signal, Clerk.signOut to the portal, then hard redirect', async () => {
    const events = [];
    const clerk = makeClerk({ events });
    const s = bootAuth({ clerk, events });
    const init = s.am.initialize();
    clerk.loadD.resolve();
    clerk.setActiveD.resolve();
    await init;
    const res = await s.am.logout();
    assert.equal(res.success, true);
    assert.deepEqual(JSON.parse(JSON.stringify(clerk.signOutCalls)), [{ redirectUrl: PORTAL }]); // cross-realm (vm) objects
    assert.equal(s.location.href, PORTAL);
    assert.ok(events.indexOf('clerk:signOut') < events.lastIndexOf('redirect:' + PORTAL));
});

test('logout (#7): Clerk.signOut throwing still signs Firebase out and redirects', async () => {
    const clerk = makeClerk();
    clerk.signOutImpl = async () => { throw new Error('clerk signOut failed'); };
    const s = bootAuth({ clerk });
    const init = s.am.initialize();
    clerk.loadD.resolve();
    clerk.setActiveD.resolve();
    await init;
    const res = await s.am.logout();
    assert.equal(res.success, true);
    assert.equal(s.auth.signOutCalls, 1);
    // Follow-up: a failed Clerk sign-out goes to the Portal sign-out page, not the home.
    assert.equal(s.location.href, PORTAL + '/dashboard');
});

test('logout (#7): Firebase signOut throwing still redirects to the portal', async () => {
    const clerk = makeClerk();
    const s = bootAuth({ clerk });
    const init = s.am.initialize();
    clerk.loadD.resolve();
    clerk.setActiveD.resolve();
    await init;
    s.auth.signOut = async () => { throw new Error('firebase offline'); };
    await s.am.logout();
    assert.equal(s.location.href, PORTAL);
});

test('logout in demo mode: no Clerk, still redirects to the portal', async () => {
    const s = bootAuth({ clerk: undefined, demo: true });
    await s.am.initialize();
    await s.am.logout();
    assert.equal(s.location.href, PORTAL);
});
