// Send to Capture saves the Capture project link back onto the experience
// (follow-up to Stage 2B). After a successful send the in-memory experience
// gets tssProjectId = version.project_id (and sourceVersionId =
// version.version_id when it has none), then the normal save path (app.js
// saveData -> Firestore incremental save + dual-write) runs once, so later
// sends and the dual-write carry the link. An existing link is never
// overwritten - same rule as 0038's server-side profile link-back.
// Run: node --test test/send-to-capture-link.test.js

const test = require('node:test');
const assert = require('node:assert/strict');

const STC = require('../send-to-capture.js');
const { makeStrictClient } = require('./helpers/strict-supabase');

const FLAG_ON = { ENABLE_SEND_TO_CAPTURE: true, CAPTURE_APP_URL: 'https://capture.example.test' };
const PROJECT_ID = '11111111-1111-4111-8111-111111111111';
const BRIEF_VERSION_ID = '22222222-2222-4222-8222-222222222222';
const NEW_VERSION_ID = '33333333-3333-4333-8333-333333333333';
const STUDY_ID = '44444444-4444-4444-8444-444444444444';
const OTHER_PROJECT_ID = '55555555-5555-4555-8555-555555555555';
const EXP_ID = 1777019020364.0994;

function experience(overrides = {}) {
    return {
        id: EXP_ID,
        timestamp: '2026-09-24T10:00:00.000Z',
        tssProjectId: null,
        sourceVersionId: null,
        productInfo: { name: 'Dark Nut Bar', brand: 'Acme', type: 'Chocolate' },
        testNumber: 1,
        stages: { appearance: { visualAppeal: 7, emotions: { curiosity: 6 } }, overall: { emotions: { joy: null } } },
        emotionalTriggers: { moreishness: 8, refreshment: null, melt: null, crunch: null },
        notes: '',
        ...overrides,
    };
}

function rpcImpl(calls, version = {}) {
    return (name, params) => {
        calls.push({ name, params: JSON.parse(JSON.stringify(params)) });
        if (name === 'create_version_from_signature') {
            return {
                data: { project_id: PROJECT_ID, version_id: NEW_VERSION_ID, version_number: 1, created_project: true,
                    targets_count: 3, study_name_hint: 'Dark Nut Bar - Acme - Chocolate', profile_link: 'set', ...version },
                error: null,
            };
        }
        if (name === 'create_study_from_version') {
            return { data: [{ study: { id: STUDY_ID, name: 'Dark Nut Bar - Acme - Chocolate' }, out_of_category_count: 0 }], error: null };
        }
        return { data: null, error: { message: `unexpected rpc ${name}` } };
    };
}

function fakeWindow() {
    return { closed: false, opener: {}, location: { href: '' }, close() { this.closed = true; } };
}
const fakeButton = () => ({ disabled: false, textContent: 'Send to Capture', dataset: {} });

function controller({ calls = [], version, rpc, isDemo = () => false, saves = [], save, showCategoryPicker, tables } = {}) {
    const { client } = makeStrictClient({ accessToken: async () => 't', rpcImpl: rpc || rpcImpl(calls, version), tables });
    const notes = [];
    const ctl = STC.createSendToCaptureController({
        config: FLAG_ON,
        isDemo,
        getClient: () => client,
        openWindow: () => fakeWindow(),
        notify: (n) => notes.push(n),
        save: save || ((exp) => saves.push(exp)),
        showCategoryPicker,
    });
    return { ctl, calls, saves, notes };
}

// ---------- applyCaptureLink (pure) ----------

test('applyCaptureLink: an unlinked experience gets the project and the new version', () => {
    for (const profileLink of ['set', 'no_profile', undefined]) {
        const exp = experience();
        const changed = STC.applyCaptureLink(exp, { project_id: PROJECT_ID, version_id: NEW_VERSION_ID, profile_link: profileLink });
        assert.equal(changed, true, String(profileLink));
        assert.equal(exp.tssProjectId, PROJECT_ID);
        assert.equal(exp.sourceVersionId, NEW_VERSION_ID);
        assert.equal(exp.id, EXP_ID, 'float id untouched');
    }
});

test('applyCaptureLink: an existing Brief link is never overwritten', () => {
    const exp = experience({ tssProjectId: PROJECT_ID, sourceVersionId: BRIEF_VERSION_ID });
    const before = JSON.stringify(exp);
    assert.equal(STC.applyCaptureLink(exp, { project_id: PROJECT_ID, version_id: NEW_VERSION_ID, profile_link: 'already_linked' }), false);
    assert.equal(STC.applyCaptureLink(exp, { project_id: OTHER_PROJECT_ID, version_id: NEW_VERSION_ID }), false);
    assert.equal(JSON.stringify(exp), before);
});

test('applyCaptureLink: a project link without a version keeps its (null) version', () => {
    const exp = experience({ tssProjectId: PROJECT_ID, sourceVersionId: null });
    assert.equal(STC.applyCaptureLink(exp, { project_id: PROJECT_ID, version_id: NEW_VERSION_ID }), false);
    assert.equal(exp.sourceVersionId, null);
});

test('applyCaptureLink: server profile already linked -> project only, never re-point the stored version', () => {
    // 0038 found the project through the stored profile link and did not
    // touch it; sending our new version id would make the dual-write
    // (0036 coalesce) overwrite the stored source_version_id.
    const exp = experience();
    assert.equal(STC.applyCaptureLink(exp, { project_id: PROJECT_ID, version_id: NEW_VERSION_ID, profile_link: 'already_linked' }), true);
    assert.equal(exp.tssProjectId, PROJECT_ID);
    assert.equal(exp.sourceVersionId, null);
});

test('applyCaptureLink: profile linked elsewhere, or no project id -> nothing changes', () => {
    const a = experience();
    assert.equal(STC.applyCaptureLink(a, { project_id: PROJECT_ID, version_id: NEW_VERSION_ID, profile_link: 'linked_elsewhere' }), false);
    assert.equal(a.tssProjectId, null);
    const b = experience();
    assert.equal(STC.applyCaptureLink(b, { version_id: NEW_VERSION_ID }), false);
    assert.equal(STC.applyCaptureLink(b, null), false);
    assert.equal(STC.applyCaptureLink(null, { project_id: PROJECT_ID }), false);
    assert.equal(b.tssProjectId, null);
    assert.equal(b.sourceVersionId, null);
});

// ---------- controller ----------

test('successful send: the experience carries the link and the normal save runs exactly once', async () => {
    const { ctl, calls, saves, notes } = controller();
    const exp = experience();
    const out = await ctl.handleClick(exp, fakeButton());
    assert.equal(out.status, 'ok');
    assert.equal(exp.tssProjectId, PROJECT_ID);
    assert.equal(exp.sourceVersionId, NEW_VERSION_ID);
    assert.equal(saves.length, 1);
    assert.equal(saves[0], exp, 'saves the in-memory experience object');
    // Payload of THIS send is unchanged (the link is applied after the RPCs).
    const sent = calls.find(c => c.name === 'create_version_from_signature').params.payload;
    assert.equal(sent.tssProjectId, null);
    assert.equal(sent.sourceVersionId, null);
    assert.equal(notes[notes.length - 1].type, 'success');
});

test('a later send carries the saved link in the (unchanged-shape) payload', async () => {
    const { ctl, calls, saves } = controller();
    const exp = experience();
    await ctl.handleClick(exp, fakeButton());
    await ctl.handleClick(exp, fakeButton());
    const sends = calls.filter(c => c.name === 'create_version_from_signature');
    assert.equal(sends.length, 2);
    assert.equal(sends[1].params.payload.tssProjectId, PROJECT_ID);
    assert.equal(sends[1].params.payload.sourceVersionId, NEW_VERSION_ID);
    assert.deepEqual(Object.keys(sends[1].params.payload).sort(), Object.keys(sends[0].params.payload).sort());
    assert.equal(saves.length, 1, 'second send changes nothing, so no second save');
});

test('an existing Brief link: not overwritten and no save', async () => {
    const { ctl, saves } = controller({ version: { profile_link: 'already_linked' } });
    const exp = experience({ tssProjectId: PROJECT_ID, sourceVersionId: BRIEF_VERSION_ID });
    assert.equal((await ctl.handleClick(exp, fakeButton())).status, 'ok');
    assert.equal(exp.tssProjectId, PROJECT_ID);
    assert.equal(exp.sourceVersionId, BRIEF_VERSION_ID);
    assert.equal(saves.length, 0);
});

test('a failed send changes nothing and never saves', async () => {
    const calls = [];
    const rpc = (name, params) => {
        calls.push({ name, params });
        return { data: null, error: { message: 'permission denied for function create_version_from_signature' } };
    };
    const { ctl, saves } = controller({ rpc });
    const exp = experience();
    const out = await ctl.handleClick(exp, fakeButton());
    assert.equal(out.status, 'error');
    assert.equal(exp.tssProjectId, null);
    assert.equal(exp.sourceVersionId, null);
    assert.equal(saves.length, 0);
});

test('study creation failing after the version was created: nothing changes, no save', async () => {
    const calls = [];
    const ok = rpcImpl(calls);
    const rpc = (name, params) => (name === 'create_study_from_version'
        ? { data: null, error: { message: 'project version not found' } }
        : ok(name, params));
    const { ctl, saves } = controller({ rpc });
    const exp = experience();
    assert.equal((await ctl.handleClick(exp, fakeButton())).status, 'error');
    assert.equal(exp.tssProjectId, null);
    assert.equal(saves.length, 0);
});

test('needs_category changes nothing; the re-send after a pick saves once', async () => {
    const calls = [];
    const ok = rpcImpl(calls);
    const rpc = (name, params) => {
        if (name === 'create_version_from_signature' && !params.payload.tssCategoryId) {
            calls.push({ name, params });
            return { data: null, error: { message: 'category required: product type "beverage" has no confident Capture category' } };
        }
        return ok(name, params);
    };
    let picker = null;
    const { ctl, saves } = controller({ rpc, showCategoryPicker: (opts) => { picker = opts; },
        tables: { categories: () => ({ data: [{ id: 'soft', name: 'Soft Drink' }], error: null }) } });
    const exp = experience({ productInfo: { name: 'Fizz', brand: 'Acme', type: 'beverage' } });
    assert.equal((await ctl.handleClick(exp, fakeButton())).status, 'needs_category');
    assert.equal(exp.tssProjectId, null);
    assert.equal(exp.sourceVersionId, null);
    assert.equal(saves.length, 0);
    assert.equal((await picker.onPick('soft')).status, 'ok');
    assert.equal(exp.tssProjectId, PROJECT_ID);
    assert.equal(exp.tssCategoryId, undefined, 'the chosen category is not written onto the experience');
    assert.equal(saves.length, 1);
});

test('demo mode never saves (and never sends)', async () => {
    const { ctl, calls, saves } = controller({ isDemo: () => true });
    const exp = experience();
    assert.equal((await ctl.handleClick(exp, fakeButton())).status, 'error');
    assert.equal(calls.length, 0);
    assert.equal(saves.length, 0);
    assert.equal(exp.tssProjectId, null);
});

test('a save that throws or rejects never turns a successful send into an error', async () => {
    for (const save of [() => { throw new Error('boom'); }, () => Promise.reject(new Error('offline'))]) {
        const { ctl, notes } = controller({ save });
        const exp = experience();
        const out = await ctl.handleClick(exp, fakeButton());
        assert.equal(out.status, 'ok');
        assert.equal(exp.tssProjectId, PROJECT_ID);
        assert.equal(notes[notes.length - 1].type, 'success');
    }
});

test('default save: calls app.js saveData() once; never in demo mode', async () => {
    const hadWindow = Object.prototype.hasOwnProperty.call(globalThis, 'window');
    const prev = globalThis.window;
    try {
        let saved = 0;
        let demo = false;
        globalThis.window = { saveData: () => { saved++; return Promise.resolve(); }, demoMode: { isDemoActive: () => demo } };
        const calls = [];
        const { client } = makeStrictClient({ accessToken: async () => 't', rpcImpl: rpcImpl(calls) });
        const ctl = STC.createSendToCaptureController({ config: FLAG_ON, isDemo: () => false, getClient: () => client,
            openWindow: () => fakeWindow(), notify: () => {} });
        await ctl.handleClick(experience(), fakeButton());
        assert.equal(saved, 1);

        demo = true; // demo switched on after the send started: the save still refuses
        const ctl2 = STC.createSendToCaptureController({ config: FLAG_ON, isDemo: () => false, getClient: () => client,
            openWindow: () => fakeWindow(), notify: () => {} });
        await ctl2.handleClick(experience(), fakeButton());
        assert.equal(saved, 1, 'no save in demo mode');
    } finally {
        if (hadWindow) globalThis.window = prev; else delete globalThis.window;
    }
});
