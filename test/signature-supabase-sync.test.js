// Pure unit tests for signature-supabase-sync.js - no Firestore, no
// emulator, no real Supabase project. getQepCaptureClient is mocked via
// a fake `window`. Run: node test/signature-supabase-sync.test.js

const test = require('node:test');
const assert = require('node:assert/strict');

function fakeLocalStorage() {
    const store = new Map();
    return {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, v),
        removeItem: (k) => store.delete(k),
    };
}

function fakeExperience(id, overrides = {}) {
    return { id, productInfo: { name: `Product ${id}` }, stages: {}, ...overrides };
}

// Fresh module instance per test - the sync module keeps in-memory
// state (the last-pushed diff snapshot) at module scope, so tests must
// not share it. `rpcImpl(fnName, params)` lets each test script exactly
// what upsert/delete calls should do.
function freshSync({ enabled = true, hostname = 'localhost', supabaseEnv = 'dev', rpcImpl } = {}) {
    delete require.cache[require.resolve('../signature-supabase-sync.js')];
    delete require.cache[require.resolve('../save-diff.js')];
    global.window = {
        QEP_CAPTURE_CONFIG: enabled === null ? undefined : { ENABLE_SUPABASE_DUAL_WRITE: enabled, SUPABASE_ENV: supabaseEnv },
        location: { hostname },
        localStorage: fakeLocalStorage(),
        getQepCaptureClient: () => ({
            schema: () => ({
                rpc: (name, params) => rpcImpl(name, params),
            }),
        }),
    };
    return require('../signature-supabase-sync.js');
}

test('disabled by default: sync and delete are no-ops, nothing queued, no RPC calls', async () => {
    let calls = 0;
    const sync = freshSync({ enabled: false, rpcImpl: () => { calls++; return { error: null }; } });
    await sync.syncSignatureExperiences([fakeExperience('1')]);
    await sync.deleteSignatureProfile('1', []);
    assert.equal(calls, 0);
    assert.equal(sync.readRetryQueue().length, 0);
});

test('config file missing at runtime (window.QEP_CAPTURE_CONFIG undefined): no throw, dual-write off', async () => {
    let calls = 0;
    const sync = freshSync({ enabled: null, rpcImpl: () => { calls++; return { error: null }; } });
    await assert.doesNotReject(sync.syncSignatureExperiences([fakeExperience('1')]));
    await assert.doesNotReject(sync.deleteSignatureProfile('1', []));
    assert.equal(sync.isSupabaseDualWriteEnabled(), false);
    assert.equal(calls, 0);
});

test('env guard: SUPABASE_ENV=dev on the production hostname disables dual-write', async () => {
    let calls = 0;
    const sync = freshSync({
        enabled: true,
        hostname: 'signature.qeptss.com',
        supabaseEnv: 'dev',
        rpcImpl: () => { calls++; return { error: null }; },
    });
    assert.equal(sync.PROD_HOSTNAME, 'signature.qeptss.com');
    assert.equal(sync.isSupabaseDualWriteEnabled(), false);
    await sync.syncSignatureExperiences([fakeExperience('1')]);
    assert.equal(calls, 0);
});

test('env guard: SUPABASE_ENV=dev on any OTHER hostname is unaffected', async () => {
    const sync = freshSync({ enabled: true, hostname: 'localhost', supabaseEnv: 'dev', rpcImpl: () => ({ error: null }) });
    assert.equal(sync.isSupabaseDualWriteEnabled(), true);
});

test('env guard: SUPABASE_ENV=prod on the production hostname is unaffected', async () => {
    const sync = freshSync({ enabled: true, hostname: 'signature.qeptss.com', supabaseEnv: 'prod', rpcImpl: () => ({ error: null }) });
    assert.equal(sync.isSupabaseDualWriteEnabled(), true);
});

test('diff-based push: 59 unchanged + 1 edited -> exactly 1 upsert RPC call', async () => {
    const upsertCalls = [];
    const sync = freshSync({
        enabled: true,
        rpcImpl: (name, params) => {
            if (name === 'upsert_signature_profile') upsertCalls.push(params.experience.id);
            return { error: null };
        },
    });

    const baseline = Array.from({ length: 60 }, (_, i) => fakeExperience(String(i)));
    await sync.syncSignatureExperiences(baseline); // seeds the last-pushed snapshot (60 calls, not under test)
    upsertCalls.length = 0;

    const edited = baseline.map(e => (e.id === '5' ? fakeExperience('5', { stages: { appearance: { visualAppeal: 9 } } }) : e));
    await sync.syncSignatureExperiences(edited);

    assert.deepEqual(upsertCalls, ['5']);
});

test('a save with nothing changed sends zero RPC calls', async () => {
    let calls = 0;
    const sync = freshSync({ enabled: true, rpcImpl: () => { calls++; return { error: null }; } });
    const baseline = [fakeExperience('1'), fakeExperience('2')];
    await sync.syncSignatureExperiences(baseline);
    calls = 0;
    await sync.syncSignatureExperiences(baseline.slice()); // same content, new array reference
    assert.equal(calls, 0);
});

test('a failed push stays queued and is retried on the next sync call', async () => {
    let shouldFail = true;
    const upsertCalls = [];
    const sync = freshSync({
        enabled: true,
        rpcImpl: (name, params) => {
            if (name === 'upsert_signature_profile') {
                upsertCalls.push(params.experience.id);
                return shouldFail ? { error: { message: 'down' } } : { error: null };
            }
            return { error: null };
        },
    });

    await sync.syncSignatureExperiences([fakeExperience('1')]);
    assert.equal(sync.readRetryQueue().length, 1);

    shouldFail = false;
    await sync.syncSignatureExperiences([fakeExperience('1'), fakeExperience('2')]); // '2' is new, '1' is the stale retry
    assert.equal(sync.readRetryQueue().length, 0);
    assert.deepEqual(upsertCalls, ['1', '1', '2']);
});

test('retry skips an id no longer present in the live experiences array, leaves it queued', async () => {
    const sync = freshSync({ enabled: true, rpcImpl: () => ({ error: { message: 'down' } }) });
    await sync.syncSignatureExperiences([fakeExperience('gone')]);
    assert.equal(sync.readRetryQueue().length, 1);

    // 'gone' is no longer in the live array at all (not deleted, just absent)
    await sync.flushSignatureSupabaseQueue([fakeExperience('other')]);
    const queue = sync.readRetryQueue();
    assert.equal(queue.length, 1);
    assert.equal(queue[0].id, 'gone');
});

test('ordering: push queued then delete for the same id -> only delete is ever (re)sent', async () => {
    const upsertCalls = [];
    const deleteCalls = [];
    let upsertShouldFail = true;
    const sync = freshSync({
        enabled: true,
        rpcImpl: (name, params) => {
            if (name === 'upsert_signature_profile') {
                upsertCalls.push(params.experience.id);
                return upsertShouldFail ? { error: { message: 'down' } } : { error: null };
            }
            deleteCalls.push(params.p_signature_experience_id);
            return { error: null };
        },
    });

    const exp = fakeExperience('exp-1');
    await sync.syncSignatureExperiences([exp]); // push attempted, fails, stays queued as 'push'
    assert.equal(sync.readRetryQueue().length, 1);
    assert.equal(sync.readRetryQueue()[0].action, 'push');

    upsertShouldFail = false; // if the stale push were ever retried, it would now succeed - it must not be attempted again
    await sync.deleteSignatureProfile('exp-1', []); // overwrites the queue entry to 'delete'

    assert.deepEqual(upsertCalls, ['exp-1'], 'the push must never be retried once superseded by a delete for the same id');
    assert.deepEqual(deleteCalls, ['exp-1']);
    assert.equal(sync.readRetryQueue().length, 0);
});

test('one entry per id: repeated pushes for the same id before any flush only leave the latest', async () => {
    const sync = freshSync({ enabled: true, rpcImpl: () => ({ error: { message: 'down' } }) });
    await sync.syncSignatureExperiences([fakeExperience('1')]);
    await sync.syncSignatureExperiences([fakeExperience('1', { productInfo: { name: 'renamed' } })]);
    const queue = sync.readRetryQueue();
    assert.equal(queue.length, 1);
    assert.equal(queue[0].id, '1');
});

test('queue is capped at SUPABASE_RETRY_QUEUE_MAX distinct ids, oldest dropped first', async () => {
    const sync = freshSync({ enabled: true, rpcImpl: () => ({ error: { message: 'always fails' } }) });
    const experiences = Array.from({ length: sync.SUPABASE_RETRY_QUEUE_MAX + 10 }, (_, i) => fakeExperience(String(i)));
    await sync.syncSignatureExperiences(experiences);
    const queue = sync.readRetryQueue();
    assert.equal(queue.length, sync.SUPABASE_RETRY_QUEUE_MAX);
});
