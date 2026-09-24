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
function boot({ clerk, rpcRows = [] } = {}) {
    delete require.cache[CLIENT];
    delete require.cache[TARGETS];
    const captured = {};
    global.window = {
        Clerk: clerk,
        QEP_CAPTURE_CONFIG: { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'anon' },
        supabase: {
            createClient(url, key, opts) {
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
