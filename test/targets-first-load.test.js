// Targets Loaded must load on the FIRST page load of an "Open in Signature"
// deep link (Brief -> https://signature.qeptss.com/?project=&version=).
// Derek (2026-09-26, brief "Soft Drink v1"): "the page needed several
// refreshes to load targets". What went wrong on origin/main (3a4dd20):
//  1. auth.js only handed the deep link over when authManager.whenClerkReady()
//     settled 'signed-in' within its 15 s waiter budget. A slower Clerk gate
//     (or a gate error) dropped it silently: Dashboard, no message, the
//     ?project=&version= still in the address bar - only a refresh retried.
//  2. Every qep-capture read was one-shot: a transient failure (network blip,
//     PostgREST 503, a Clerk session token not minted yet) was a dead-end
//     error, and the deep link was already consumed, so a refresh did NOT
//     bring it back either.
//  3. qep-capture-client.js failed the request on the first null/throwing
//     Clerk.session.getToken() even when Clerk said signed-in.
//  4. The service worker served a deep-link navigation (/?project=..) from
//     its cache (cache-first: the URL has no ".html"/".js" and is not "/"),
//     i.e. a stale index.html after a deploy.
// Run: node --test test/targets-first-load.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { bootAuth, makeClerk, flushMany } = require('./helpers/auth-sandbox');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

const FB_USER = { uid: 'user_1', email: 'derek@example.com', displayName: 'Derek' };
const P = '11111111-1111-1111-1111-111111111111';
const V = '22222222-2222-2222-2222-222222222222';
const STASH_KEY = 'qepCaptureDeepLinkPending';
const STASH = JSON.stringify({ project: P, version: V });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------------
// 1. auth.js hands the deep link over whatever the Clerk signal says
// ------------------------------------------------------------------

test('auth: a Clerk gate slower than the deep-link wait hands the deep link the timeout state instead of dropping it', async () => {
    const events = [];
    const clerk = makeClerk({ events }); // load() never resolves in this test
    const s = bootAuth({ clerk, events });
    const calls = [];
    s.ctx.handleQepCaptureDeepLink = (state) => { calls.push(state); };
    s.am.deepLinkClerkWaitMs = 30;
    s.am.initialize();
    s.auth.restore(FB_USER);
    await sleep(120);
    assert.equal(calls.length, 1, 'the deep link handler must be called (it shows a message / keeps waiting), not silently skipped');
    assert.equal(calls[0].status, 'error');
    assert.equal(calls[0].reason, 'timeout');
});

test('auth: a Clerk gate ERROR still hands the deep link its state (so it can say what happened)', async () => {
    const clerk = makeClerk();
    const s = bootAuth({ clerk });
    const calls = [];
    s.ctx.handleQepCaptureDeepLink = (state) => { calls.push(state); };
    const init = s.am.initialize();
    s.auth.restore(FB_USER);
    clerk.loadD.reject(new Error('clerk down'));
    await init;
    await flushMany();
    assert.equal(calls.length, 1);
    assert.equal(calls[0].status, 'error');
});

test('auth: Firebase restore with Clerk still loading shows the pending deep link straight away (UI only, before the signal)', async () => {
    const events = [];
    const clerk = makeClerk({ events });
    const s = bootAuth({ clerk, events });
    s.ctx.showQepCaptureDeepLinkPending = () => { events.push('deepLinkPending'); };
    s.am.initialize();
    s.auth.restore(FB_USER);
    await flushMany();
    assert.ok(events.includes('deepLinkPending'), events.join(','));
    assert.ok(!events.includes('deepLink'), 'no qep-capture work before the Clerk signal');
});

test('auth: Clerk signed out still does not call the deep link (it stays stashed for after sign-in)', async () => {
    const clerk = makeClerk({ signedIn: false });
    const s = bootAuth({ clerk });
    const calls = [];
    s.ctx.handleQepCaptureDeepLink = (state) => { calls.push(state); };
    const init = s.am.initialize();
    s.auth.restore(FB_USER);
    clerk.loadD.resolve();
    await init;
    await flushMany();
    assert.equal(calls.length, 0);
});

// ------------------------------------------------------------------
// 2. qep-capture-client.js waits for the session token itself
// ------------------------------------------------------------------

async function signedInCaptureClient(getTokenImpl) {
    const clerk = makeClerk();
    const s = bootAuth({ clerk, withCaptureClient: true });
    const init = s.am.initialize();
    clerk.loadD.resolve();
    clerk.setActiveD.resolve();
    await init;
    clerk.session.getToken = getTokenImpl;
    s.ctx.getQepCaptureClient();
    return s.ctx.captured.opts.accessToken;
}

test('client: Clerk signed-in but the first getToken() is null -> waits and returns the real token', async () => {
    let n = 0;
    const accessToken = await signedInCaptureClient(async () => (++n === 1 ? null : 'jwt-late'));
    assert.equal(await accessToken(), 'jwt-late');
});

test('client: a getToken() network error is retried before giving up', async () => {
    let n = 0;
    const accessToken = await signedInCaptureClient(async () => {
        n += 1;
        if (n === 1) throw new TypeError('Failed to fetch');
        return 'jwt-after-blip';
    });
    assert.equal(await accessToken(), 'jwt-after-blip');
});

test('client: getToken() stays null -> bounded wait, then a "token was not ready" not-signed-in error (never anon)', async () => {
    let n = 0;
    const accessToken = await signedInCaptureClient(async () => { n += 1; return null; });
    const started = Date.now();
    await assert.rejects(accessToken(), (err) => /not signed in/i.test(err.message) && /token was not ready/i.test(err.message));
    assert.ok(n >= 2 && n <= 6, `bounded number of getToken() calls, got ${n}`);
    assert.ok(Date.now() - started < 5000);
});

// ------------------------------------------------------------------
// 3. targets-loaded.js marks transient failures
// ------------------------------------------------------------------

function freshTargetsLoaded(client) {
    delete require.cache[require.resolve('../targets-loaded.js')];
    const factory = () => client;
    global.window = { getQepCaptureClient: factory };
    global.getQepCaptureClient = factory;
    return require('../targets-loaded.js');
}

function rpcClient(result) {
    return { schema: () => ({ rpc: async () => result }) };
}

test('targets-loaded: a network failure of list_locked_projects is marked transient', async () => {
    const t = freshTargetsLoaded(rpcClient({ data: null, error: { message: 'TypeError: Failed to fetch', code: '' }, status: 0 }));
    const r = await t.fetchLockedProjects();
    assert.ok(r.error);
    assert.equal(r.transient, true);
});

test('targets-loaded: PostgREST 503 (schema cache reload) is marked transient', async () => {
    const t = freshTargetsLoaded(rpcClient({ data: null, error: { message: 'Could not query the database for the schema cache. Retrying.', code: 'PGRST002' }, status: 503 }));
    const r = await t.fetchLockedProjects();
    assert.equal(r.transient, true);
});

test('targets-loaded: a Clerk token that was not ready yet is marked transient', async () => {
    const t = freshTargetsLoaded(rpcClient({ data: null, error: { message: 'Error: Not signed in to QEP yet: the Clerk session token was not ready. Try again in a moment.', code: '' }, status: 0 }));
    const r = await t.fetchLockedProjects();
    assert.equal(r.transient, true);
});

test('targets-loaded: signed out, demo mode, missing RPC and RLS denials are NOT transient', async () => {
    const cases = [
        { data: null, error: { message: 'Error: Not signed in to QEP: no Clerk session, so qep-capture was not called. Please sign in again.', code: '' }, status: 0 },
        { data: null, error: { message: 'Could not find the function tss_shared.list_locked_projects', code: 'PGRST202' }, status: 404 },
        { data: null, error: { message: 'permission denied for schema tss_shared', code: '42501' }, status: 401 },
    ];
    for (const c of cases) {
        const t = freshTargetsLoaded(rpcClient(c));
        const r = await t.fetchLockedProjects();
        assert.ok(r.error);
        assert.ok(!r.transient, c.error.message);
    }
    assert.equal(typeof require('../targets-loaded.js').isTransientQepCaptureError, 'function');
});

test('targets-loaded: a network failure loading the project row (by version) is marked transient', async () => {
    const failing = { data: null, error: { message: 'TypeError: Failed to fetch', code: '' }, status: 0 };
    const builder = { select: () => builder, eq: () => builder, maybeSingle: async () => failing };
    const t = freshTargetsLoaded({ schema: () => ({ from: () => builder }), from: () => builder });
    const r = await t.fetchQepCaptureTargetsByVersion(P, V);
    assert.match(r.error, /Could not load project/);
    assert.equal(r.transient, true);
});

// ------------------------------------------------------------------
// 4. targets-loaded-ui.js: wait for the prerequisites, retry, Retry button
// ------------------------------------------------------------------

function makeEl(id) {
    const listeners = {};
    const el = {
        id, innerHTML: '', textContent: '', value: '', style: {}, dataset: {}, disabled: false, open: false,
        classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
        options: [], selectedIndex: 0, onchange: null,
        addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
        _fire(type, evt) { return Promise.all((listeners[type] || []).map((fn) => fn(evt || { preventDefault() {} }))); },
        _listeners: listeners,
        setAttribute() {}, removeAttribute() {}, remove() {}, focus() {}, click() {},
        querySelector: () => null, querySelectorAll: () => [],
    };
    return el;
}

function fakeSessionStorage(initial) {
    const store = new Map(Object.entries(initial || {}));
    return {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, v),
        removeItem: (k) => store.delete(k),
    };
}

const STAGES = ['appearance', 'aroma', 'frontMouth', 'midRearMouth', 'texture', 'aftertaste', 'overall'];
function targetResult() {
    const stages = {};
    for (const id of STAGES) stages[id] = { targets: [], notes: '' };
    stages.frontMouth.targets.push({ label: 'Sweetness', role: 'primary', variableKey: 'fm_sweetness', kind: 'sensory', intensity: null, rangeMin: 7, rangeMax: 7 });
    return {
        project: { id: P, name: 'Soft Drink', categoryName: 'Soft drinks' },
        version: { id: V, versionNumber: 1, status: 'locked', lockedAt: '2026-09-26T09:00:00Z' },
        stages,
        unplacedTargets: [],
    };
}
const LOCKED = [{ project_id: P, name: 'Soft Drink', latest_locked_version_id: V, version_number: 1, locked_at: '2026-09-26T09:00:00Z' }];
const NET_FAIL = { error: 'Could not load locked projects: TypeError: Failed to fetch', transient: true };

function loadUI({ stash = STASH, authManager, config = { ENABLE_TARGETS_LOADED: true } } = {}) {
    const byId = {};
    const alerts = [];
    const reloads = [];
    const navClicks = [];
    const document = {
        getElementById(id) { return (byId[id] = byId[id] || makeEl(id)); },
        createElement: (tag) => makeEl('created-' + tag),
        addEventListener() {},
        querySelector: (sel) => { const el = makeEl(sel); el.click = () => navClicks.push(sel); return el; },
        querySelectorAll: () => [],
        body: makeEl('body'),
    };
    const initial = {};
    if (stash) initial[STASH_KEY] = stash;
    const sessionStorage = fakeSessionStorage(initial);
    const calls = { locked: 0, byVersion: 0, crosswalk: 0, applied: 0 };
    const windowObj = {
        location: { href: 'https://signature.qeptss.com/', search: '', reload: () => reloads.push(1) },
        sessionStorage,
        history: { replaceState() {} },
        QEP_CAPTURE_CONFIG: config,
        SENSORY_STAGES: STAGES.map((id, i) => ({ id, label: id, position: i + 1 })),
        authManager,
        fetchLockedProjects: async () => { calls.locked += 1; return { projects: LOCKED }; },
        fetchQepCaptureTargetsByVersion: async () => { calls.byVersion += 1; return targetResult(); },
        fetchSignatureAttributeCrosswalk: async () => { calls.crosswalk += 1; return { rows: [] }; },
        TargetPrefill: { buildTargetPrefill: () => ({ markers: [], briefText: {}, banner: '', unmapped: [] }) },
        applyTargetPrefillToForm: () => { calls.applied += 1; },
    };
    const fastTimeout = (fn) => setImmediate(fn); // retries/backoff run instantly in tests
    const ctx = {
        window: windowObj, document, console: { ...console, log() {}, warn() {}, error() {}, info() {} },
        setTimeout: fastTimeout, clearTimeout() {}, URL, URLSearchParams, history: windowObj.history,
        alert: (m) => alerts.push(m),
    };
    vm.createContext(ctx);
    vm.runInContext(read('dom-utils.js'), ctx);
    vm.runInContext(read('targets-loaded-ui.js'), ctx);
    const results = () => byId['targets-loaded-results'] ? byId['targets-loaded-results'].innerHTML : '';
    const content = () => byId['targets-loaded-content'] ? byId['targets-loaded-content'].innerHTML : '';
    return { ctx, window: windowObj, byId, calls, alerts, reloads, navClicks, results, content, sessionStorage };
}

test('ui: deep link - list_locked_projects fails transiently once, is retried, and the targets load first time', async () => {
    const u = loadUI();
    let n = 0;
    u.window.fetchLockedProjects = async () => { n += 1; return n === 1 ? NET_FAIL : { projects: LOCKED }; };
    await u.ctx.handleQepCaptureDeepLink();
    assert.equal(n, 2);
    assert.match(u.results(), /Soft Drink/);
    assert.match(u.results(), /Sweetness 7/);
    assert.equal(u.sessionStorage.getItem(STASH_KEY), null, 'consumed once loaded');
});

test('ui: deep link - the targets fetch fails transiently once, is retried, and loads', async () => {
    const u = loadUI();
    let n = 0;
    u.window.fetchQepCaptureTargetsByVersion = async () => {
        n += 1;
        return n === 1 ? { error: 'Could not load project: TypeError: Failed to fetch', transient: true } : targetResult();
    };
    await u.ctx.handleQepCaptureDeepLink();
    assert.equal(n, 2);
    assert.match(u.results(), /Sweetness 7/);
});

test('ui: deep link - transient failures that persist: bounded attempts, a clear message with Retry, link kept; Retry loads it', async () => {
    const u = loadUI();
    let n = 0;
    let down = true;
    u.window.fetchLockedProjects = async () => { n += 1; return down ? NET_FAIL : { projects: LOCKED }; };
    await u.ctx.handleQepCaptureDeepLink();
    assert.equal(n, 3, 'three attempts, then stop');
    const status = u.byId['qep-capture-picker-status'].innerHTML;
    assert.match(status, /Failed to fetch/);
    assert.match(status, /id="qep-capture-retry-btn"/);
    assert.notEqual(u.sessionStorage.getItem(STASH_KEY), null, 'kept so Retry (or a reload) reopens it');

    down = false;
    await u.byId['qep-capture-retry-btn']._fire('click');
    await flushMany();
    assert.match(u.results(), /Sweetness 7/);
    assert.equal(u.sessionStorage.getItem(STASH_KEY), null);
});

test('ui: deep link - a permanent error is not retried and the link is consumed', async () => {
    const u = loadUI();
    u.window.fetchLockedProjects = async () => { u.calls.locked += 1; return { error: 'Not signed in to QEP: no Clerk session.' }; };
    await u.ctx.handleQepCaptureDeepLink();
    assert.equal(u.calls.locked, 1);
    assert.equal(u.sessionStorage.getItem(STASH_KEY), null);
});

test('ui: deep link handed a Clerk TIMEOUT waits for sign-in (no qep-capture call before it) and then loads', async () => {
    let resolveReady;
    const authManager = {
        clerkReadyState: null,
        whenClerkReady: () => new Promise((r) => { resolveReady = r; }),
    };
    const u = loadUI({ authManager });
    const run = u.ctx.handleQepCaptureDeepLink({ status: 'error', reason: 'timeout', session: null });
    await flushMany();
    assert.equal(u.calls.locked, 0, 'nothing fetched while sign-in is still pending');
    assert.match(u.content(), /waiting for QEP sign-in/i);
    authManager.clerkReadyState = { status: 'signed-in', session: {} };
    resolveReady(authManager.clerkReadyState);
    await run;
    assert.match(u.results(), /Sweetness 7/);
});

test('ui: deep link handed a Clerk gate ERROR says so, offers Reload, keeps the link and fetches nothing', async () => {
    const state = { status: 'error', session: null, error: new Error('Failed to load ClerkJS from clerk.qeptss.com') };
    const u = loadUI({ authManager: { clerkReadyState: state, whenClerkReady: async () => state } });
    await u.ctx.handleQepCaptureDeepLink(state);
    assert.equal(u.calls.locked, 0);
    assert.match(u.content(), /sign(ing)? in to QEP/i);
    assert.match(u.content(), /id="qep-capture-reload-btn"/);
    assert.notEqual(u.sessionStorage.getItem(STASH_KEY), null);
    await u.byId['qep-capture-reload-btn']._fire('click');
    assert.equal(u.reloads.length, 1);
});

test('ui: deep link called twice while the first run is in flight loads once', async () => {
    const u = loadUI();
    await Promise.all([u.ctx.handleQepCaptureDeepLink(), u.ctx.handleQepCaptureDeepLink()]);
    assert.equal(u.calls.locked, 1);
    assert.equal(u.calls.byVersion, 1);
});

test('ui: showQepCaptureDeepLinkPending shows the Targets Loaded view with a waiting message, fetches nothing, keeps the link', () => {
    const u = loadUI();
    assert.equal(typeof u.ctx.showQepCaptureDeepLinkPending, 'function');
    u.ctx.showQepCaptureDeepLinkPending();
    assert.match(u.content(), /waiting for QEP sign-in/i);
    assert.equal(u.calls.locked, 0);
    assert.notEqual(u.sessionStorage.getItem(STASH_KEY), null);
});

test('ui: picker (nav click) - a transient failure that persists shows a Retry button', async () => {
    const u = loadUI({ stash: null });
    u.window.fetchLockedProjects = async () => { u.calls.locked += 1; return NET_FAIL; };
    await u.ctx.renderTargetsLoadedDashboard();
    assert.equal(u.calls.locked, 3);
    assert.match(u.byId['qep-capture-picker-status'].innerHTML, /id="qep-capture-retry-btn"/);
});

test('ui: "Start Full Evaluation" retries a transient crosswalk failure instead of alerting', async () => {
    const u = loadUI();
    await u.ctx.handleQepCaptureDeepLink();
    let n = 0;
    u.window.fetchSignatureAttributeCrosswalk = async () => { n += 1; return n === 1 ? { error: 'TypeError: Failed to fetch', transient: true } : { rows: [] }; };
    await u.byId['qep-capture-start-evaluation-btn']._fire('click');
    await flushMany();
    assert.deepEqual(u.alerts, []);
    assert.equal(u.calls.applied, 1);
});

// ------------------------------------------------------------------
// 5. service worker: a deep-link navigation is network-first
// ------------------------------------------------------------------

function loadServiceWorker({ online = true } = {}) {
    const handlers = {};
    const fetched = [];
    const cache = new Map([['https://signature.qeptss.com/?project=' + P + '&version=' + V, 'STALE index.html from an older deploy']]);
    class FakeResponse {
        constructor(body, init) { this.body = body; this.status = (init && init.status) || 200; this.type = 'basic'; }
        clone() { return this; }
    }
    const ctx = {
        console: { log() {}, warn() {}, error() {} },
        location: new URL('https://signature.qeptss.com/service-worker.js'),
        URL,
        Response: FakeResponse,
        caches: {
            match: async (req) => { const k = typeof req === 'string' ? req : req.url; return cache.has(k) ? new FakeResponse(cache.get(k)) : undefined; },
            open: async () => ({ put: async (req, res) => cache.set(req.url, res.body), addAll: async () => {} }),
            keys: async () => [],
            delete: async () => true,
        },
        fetch: async (req) => {
            fetched.push(req.url);
            if (!online) throw new TypeError('Failed to fetch');
            return new FakeResponse('FRESH index.html');
        },
        clients: { claim: async () => {} },
    };
    ctx.self = { addEventListener: (type, fn) => { handlers[type] = fn; }, skipWaiting: () => {}, registration: {} };
    vm.createContext(ctx);
    vm.runInContext(read('service-worker.js'), ctx);
    async function navigate(url) {
        let responded = null;
        handlers.fetch({ request: { url, method: 'GET', mode: 'navigate' }, respondWith: (p) => { responded = p; } });
        assert.ok(responded, 'the SW must answer the navigation');
        return (await responded).body;
    }
    return { navigate, fetched };
}

test('sw: the "Open in Signature" navigation (/?project=&version=) goes to the network, not a stale cached page', async () => {
    const sw = loadServiceWorker();
    const body = await sw.navigate('https://signature.qeptss.com/?project=' + P + '&version=' + V);
    assert.equal(body, 'FRESH index.html');
    assert.equal(sw.fetched.length, 1);
});

test('sw: offline, the deep-link navigation still falls back to the cached copy', async () => {
    const sw = loadServiceWorker({ online: false });
    const body = await sw.navigate('https://signature.qeptss.com/?project=' + P + '&version=' + V);
    assert.equal(body, 'STALE index.html from an older deploy');
});
