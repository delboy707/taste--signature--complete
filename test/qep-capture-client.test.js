// qep-capture-client.js must never let a tss_shared call go out as anon.
// Regression (2026-09-24): on a returning visit Firebase's saved session made
// the app (and the Targets Loaded picker / deep link) run before ClerkJS had
// loaded; accessToken() returned null, supabase-js fell back to the anon key,
// and PostgREST answered "permission denied for schema tss_shared".
// Run: node test/qep-capture-client.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { makeStrictClient } = require('./helpers/strict-supabase');

const CLIENT = path.join(__dirname, '..', 'qep-capture-client.js');
const TARGETS = path.join(__dirname, '..', 'targets-loaded.js');

// Loads the REAL qep-capture-client.js + targets-loaded.js against a fake
// supabase-js whose createClient() returns the strict mock wired to the
// accessToken callback the real client passes in.
function boot({ clerk, rpcRows = [], demo } = {}) {
    delete require.cache[CLIENT];
    delete require.cache[TARGETS];
    const captured = {};
    global.window = {
        Clerk: clerk,
        // demo-mode.js's public API; `demo` may be a boolean or a getter.
        demoMode: demo === undefined ? undefined : { isDemoActive: () => (typeof demo === 'function' ? demo() : demo) },
        QEP_CAPTURE_CONFIG: { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'anon' },
        supabase: {
            createClient(url, key, opts) {
                captured.createClientCalls = (captured.createClientCalls || 0) + 1;
                captured.opts = opts;
                const strict = makeStrictClient({
                    accessToken: opts && opts.accessToken,
                    rpcImpl: () => ({ data: rpcRows, error: null }),
                });
                captured.violations = strict.violations;
                return strict.client;
            },
        },
    };
    require(CLIENT);
    global.getQepCaptureClient = global.window.getQepCaptureClient;
    const targets = require(TARGETS);
    return { targets, captured };
}

function fakeClerk({ loaded = true, token = 'clerk-jwt', signedOut = false } = {}) {
    return { loaded, session: signedOut ? null : { getToken: async () => token } };
}

const ROWS = [{ project_id: '11111111-1111-1111-1111-111111111111', name: 'Cola', latest_locked_version_id: '22222222-2222-2222-2222-222222222222', version_number: 1, locked_at: null }];

test('signed in and Clerk loaded: list_locked_projects carries the Clerk token', async () => {
    const { targets, captured } = boot({ clerk: fakeClerk(), rpcRows: ROWS });
    const res = await targets.fetchLockedProjects();
    assert.deepEqual(res.projects, ROWS);
    assert.deepEqual(captured.violations, []);
});

test('Clerk still loading when the picker runs: the call WAITS for the session instead of going out as anon', async () => {
    const clerk = { loaded: false, session: null };
    const { targets, captured } = boot({ clerk, rpcRows: ROWS });
    setTimeout(() => { clerk.loaded = true; clerk.session = { getToken: async () => 'late-jwt' }; }, 150);
    const res = await targets.fetchLockedProjects();
    assert.equal(res.error, undefined, res.error);
    assert.deepEqual(res.projects, ROWS);
    assert.deepEqual(captured.violations, []);
});

test('ClerkJS not even on the page yet: waits for it rather than sending anon', async () => {
    const { targets, captured } = boot({ clerk: undefined, rpcRows: ROWS });
    setTimeout(() => { global.window.Clerk = fakeClerk({ token: 'jwt-after-script-load' }); }, 150);
    const res = await targets.fetchLockedProjects();
    assert.deepEqual(res.projects, ROWS);
    assert.deepEqual(captured.violations, []);
});

test('Clerk loaded but signed out: clear not-signed-in error, never an anon request', async () => {
    const { targets, captured } = boot({ clerk: fakeClerk({ signedOut: true }) });
    const res = await targets.fetchLockedProjects();
    assert.match(res.error, /not signed in/i);
    assert.doesNotMatch(res.error, /permission denied/);
    assert.deepEqual(captured.violations, []);
});

test('getToken() returns null: refuses rather than falling back to anon', async () => {
    const { targets, captured } = boot({ clerk: fakeClerk({ token: null }) });
    const res = await targets.fetchLockedProjects();
    assert.match(res.error, /not signed in/i);
    assert.deepEqual(captured.violations, []);
});

test('the real client is constructed with an accessToken callback', () => {
    const { captured } = boot({ clerk: fakeClerk() });
    global.window.getQepCaptureClient();
    assert.equal(typeof captured.opts.accessToken, 'function');
});

// ------------------------------------------------------------
// Demo mode: auth.js skips the Clerk gate, so ClerkJS never loads. Every
// qep-capture call must fail IMMEDIATELY with the demo message - no
// CLERK_WAIT_MS poll, and never a token-less (anon) request.
// ------------------------------------------------------------
const fs = require('node:fs');
const { mock } = require('node:test');
const DEMO_RE = /^Demo mode: QEP Capture features need a signed-in QEP account/;

test('demo mode: the Targets Loaded picker fails in well under 1 s with the demo message, no anon request', async () => {
    const { targets, captured } = boot({ clerk: undefined, demo: true, rpcRows: ROWS });
    const started = Date.now();
    const res = await targets.fetchLockedProjects();
    const elapsed = Date.now() - started;
    assert.ok(elapsed < 1000, `took ${elapsed} ms`);
    assert.match(res.error, DEMO_RE);
    assert.equal(res.projects, undefined);
    assert.equal(captured.createClientCalls, undefined, 'no Supabase client is even built in demo mode');
});

test('demo mode: deep-link and manual-entry fetches also fail fast with the demo message', async () => {
    const { targets } = boot({ clerk: undefined, demo: true });
    const started = Date.now();
    const byVersion = await targets.fetchQepCaptureTargetsByVersion(ROWS[0].project_id, ROWS[0].latest_locked_version_id);
    const manual = await targets.fetchQepCaptureTargets(ROWS[0].project_id);
    assert.ok(Date.now() - started < 1000);
    assert.match(byVersion.error, DEMO_RE);
    assert.match(manual.error, DEMO_RE);
});

test('demo mode: getQepCaptureClient() throws a coded demo error', () => {
    boot({ clerk: fakeClerk(), demo: true });
    assert.throws(() => global.window.getQepCaptureClient(), (err) => err.code === 'QEP_DEMO_MODE' && DEMO_RE.test(err.message));
});

test('demo mode entered after the client was cached: accessToken() rejects fast and never yields a token', async () => {
    let demo = false;
    const { captured } = boot({ clerk: fakeClerk({ token: 'real-jwt' }), demo: () => demo });
    global.window.getQepCaptureClient(); // cached while NOT in demo mode
    demo = true;
    const started = Date.now();
    await assert.rejects(captured.opts.accessToken(), (err) => err.code === 'QEP_DEMO_MODE');
    assert.ok(Date.now() - started < 1000);
    // And a cached client is not handed out either.
    assert.throws(() => global.window.getQepCaptureClient(), /Demo mode/);
});

test('demo mode, demo-mode.js not loaded: falls back to auth.js DEMO_MODE_KEY in localStorage', async () => {
    const { targets } = boot({ clerk: undefined, rpcRows: ROWS });
    global.DEMO_MODE_KEY = 'taste_demo_mode_active'; // auth.js top-level const (classic-script global)
    global.window.localStorage = { getItem: (k) => (k === 'taste_demo_mode_active' ? 'true' : null) };
    try {
        const started = Date.now();
        const res = await targets.fetchLockedProjects();
        assert.ok(Date.now() - started < 1000);
        assert.match(res.error, DEMO_RE);
    } finally {
        delete global.DEMO_MODE_KEY;
    }
});

test('auth.js and demo-mode.js agree on the demo-mode localStorage key', () => {
    const authKey = /const DEMO_MODE_KEY = '([^']+)'/.exec(fs.readFileSync(path.join(__dirname, '..', 'auth.js'), 'utf8'));
    const demoKey = /this\.demoDataKey = '([^']+)'/.exec(fs.readFileSync(path.join(__dirname, '..', 'demo-mode.js'), 'utf8'));
    assert.ok(authKey && demoKey);
    assert.equal(authKey[1], demoKey[1]);
});

test('not demo mode (demoMode present, inactive): still waits for a late Clerk and sends the token', async () => {
    const clerk = { loaded: false, session: null };
    const { targets, captured } = boot({ clerk, demo: false, rpcRows: ROWS });
    setTimeout(() => { clerk.loaded = true; clerk.session = { getToken: async () => 'late-jwt' }; }, 150);
    const res = await targets.fetchLockedProjects();
    assert.deepEqual(res.projects, ROWS);
    assert.deepEqual(captured.violations, []);
});

test('not demo mode, ClerkJS never loads: waits the full CLERK_WAIT_MS, then not-signed-in (unchanged)', async () => {
    const { captured } = boot({ clerk: undefined, demo: false });
    const { CLERK_WAIT_MS } = require(CLIENT);
    global.window.getQepCaptureClient();
    mock.timers.enable({ apis: ['setTimeout', 'Date'] });
    try {
        let settled = null;
        captured.opts.accessToken().then(
            (token) => { settled = { token }; },
            (err) => { settled = { err }; }
        );
        const flush = () => new Promise((resolve) => setImmediate(resolve));
        // Walk the mocked clock forward one poll step at a time.
        const advance = async (ms) => {
            for (let t = 0; t < ms; t += 100) { mock.timers.tick(100); await flush(); }
        };
        await flush();
        await advance(CLERK_WAIT_MS - 200);
        assert.equal(settled, null, 'must still be waiting just before CLERK_WAIT_MS');
        await advance(400);
        assert.ok(settled && settled.err, 'rejects rather than resolving a (null) token');
        assert.match(settled.err.message, /not signed in/i);
    } finally {
        mock.timers.reset();
    }
});
