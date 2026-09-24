// UI-level tests for the Targets Loaded picker + deep link handling.
// targets-loaded-ui.js is a browser script, evaluated in a vm context with
// a small DOM stub (same pattern as test/chat-ui.test.js) - no real
// browser, no Supabase, no Firestore. window.fetch* functions are mocked
// directly so this never touches targets-loaded.js's real Supabase calls.
// Run: node test/targets-loaded-ui.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

// A generic option-tag parser for our own `<option value="..."
// data-version-id="...">label</option>` markup - good enough for a select
// element populated only by our own code.
function parseOptions(html) {
    const re = /<option value="([^"]*)"(?:\s+data-version-id="([^"]*)")?[^>]*>([^<]*)<\/option>/g;
    const options = [];
    let m;
    while ((m = re.exec(html))) {
        options.push({ value: m[1], dataset: { versionId: m[2] || '' }, textContent: m[3] });
    }
    return options;
}

function makeEl(id) {
    const store = {
        id, children: [], style: {}, className: '', textContent: '', _innerHTML: '',
        classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
        dataset: {}, value: '', selectedIndex: 0, disabled: false, open: false,
        options: [],
    };
    const listeners = {};
    const el = {
        get innerHTML() { return store._innerHTML; },
        set innerHTML(html) {
            store._innerHTML = html;
            if (id === 'qep-capture-project-select') {
                store.options = parseOptions(html);
                el.options = store.options;
            }
        },
        get value() { return store.value; },
        set value(v) {
            store.value = v;
            if (id === 'qep-capture-project-select') {
                const idx = store.options.findIndex((o) => o.value === v);
                store.selectedIndex = idx >= 0 ? idx : 0;
                el.selectedIndex = store.selectedIndex;
            }
        },
        get selectedIndex() { return store.selectedIndex; },
        set selectedIndex(v) { store.selectedIndex = v; },
        get options() { return store.options; },
        set options(v) { store.options = v; },
        style: store.style, className: store.className, dataset: store.dataset,
        classList: store.classList, children: store.children,
        disabled: false, open: false, textContent: '',
        onchange: null,
        appendChild(c) { store.children.push(c); return c; },
        addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
        _fire(type, evt) { (listeners[type] || []).forEach((fn) => fn(evt)); },
        setAttribute() {}, removeAttribute() {}, remove() {}, focus() {}, click() {},
        querySelector() { return makeEl('nested'); },
        querySelectorAll() { return []; },
        insertBefore() {},
    };
    return el;
}

function fakeSessionStorage(initial) {
    const store = new Map(Object.entries(initial || {}));
    return {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, v),
        removeItem: (k) => store.delete(k),
        _dump: () => Object.fromEntries(store),
    };
}

function loadTargetsLoadedUI({ locationSearch = '', sessionStorageInitial = {}, config = { ENABLE_TARGETS_LOADED: true } } = {}) {
    const byId = {};
    const historyReplaceCalls = [];
    const document = {
        getElementById(id) { return (byId[id] = byId[id] || makeEl(id)); },
        createElement: (tag) => makeEl(`created-${tag}`),
        addEventListener() {},
        querySelector: () => makeEl('nav-item-log-experience'),
        querySelectorAll: () => [],
        body: makeEl('body'),
    };
    const sessionStorage = fakeSessionStorage(sessionStorageInitial);
    const windowObj = {
        location: { href: `https://signature.qeptss.com/${locationSearch}`, search: locationSearch, hostname: 'signature.qeptss.com' },
        sessionStorage,
        history: { replaceState: (...args) => historyReplaceCalls.push(args) },
        QEP_CAPTURE_CONFIG: config,
        SENSORY_STAGES: [
            { id: 'appearance', label: 'Appearance', position: 1 },
            { id: 'aroma', label: 'Aroma', position: 2 },
            { id: 'frontMouth', label: 'Front of Mouth', position: 3 },
            { id: 'midRearMouth', label: 'Mid/Rear Mouth', position: 4 },
            { id: 'texture', label: 'Texture', position: 5 },
            { id: 'aftertaste', label: 'Aftertaste', position: 6 },
            { id: 'overall', label: 'Overall Assessment', position: 7 },
        ],
        QEP_CAPTURE_CONFIG_URL: undefined,
        fetchLockedProjects: async () => ({ projects: [] }),
        fetchQepCaptureTargetsByVersion: async () => ({ error: 'not mocked' }),
        fetchSignatureAttributeCrosswalk: async () => ({ rows: [] }),
        TargetPrefill: { buildTargetPrefill: () => ({ markers: [], briefText: {}, banner: '', unmapped: [] }) },
        applyTargetPrefillToForm: () => {},
    };
    const ctx = {
        window: windowObj, document, console: { ...console, log() {}, warn() {}, error() {}, info() {} },
        setTimeout, URL, URLSearchParams, history: windowObj.history, alert: () => {},
    };
    vm.createContext(ctx);
    vm.runInContext(read('dom-utils.js'), ctx);
    vm.runInContext(read('targets-loaded-ui.js'), ctx);

    return {
        window: windowObj,
        byId,
        historyReplaceCalls,
        api: {
            renderTargetsLoadedDashboard: ctx.renderTargetsLoadedDashboard,
            handleQepCaptureDeepLink: ctx.handleQepCaptureDeepLink,
            consumeQepCaptureDeepLinkTarget: ctx.consumeQepCaptureDeepLinkTarget,
        },
    };
}

// ------------------------------------------------------------
// Picker states
// ------------------------------------------------------------

test('picker: shows a loading message while fetchLockedProjects is in flight', async () => {
    let resolveFetch;
    const { window, byId, api } = loadTargetsLoadedUI();
    window.fetchLockedProjects = () => new Promise((resolve) => { resolveFetch = resolve; });

    const pending = api.renderTargetsLoadedDashboard();
    assert.match(byId['qep-capture-picker-status'].innerHTML, /Loading your locked briefs/);

    resolveFetch({ projects: [] });
    await pending;
});

test('picker: empty list shows the "lock a brief" message and reveals the manual fallback', async () => {
    const { window, byId, api } = loadTargetsLoadedUI();
    window.fetchLockedProjects = async () => ({ projects: [] });

    await api.renderTargetsLoadedDashboard();

    assert.match(byId['qep-capture-picker-status'].innerHTML, /No locked briefs yet/);
    assert.equal(byId['qep-capture-manual-fallback'].style.display, 'block');
    assert.equal(byId['qep-capture-picker-wrap'].style.display, 'none');
});

test('picker: a generic error shows the message and opens the manual fallback', async () => {
    const { window, byId, api } = loadTargetsLoadedUI();
    window.fetchLockedProjects = async () => ({ error: 'network unreachable' });

    await api.renderTargetsLoadedDashboard();

    assert.match(byId['qep-capture-picker-status'].innerHTML, /network unreachable/);
    assert.equal(byId['qep-capture-manual-fallback'].style.display, 'block');
    assert.equal(byId['qep-capture-manual-fallback'].open, true);
});

test('picker: RPC-missing error shows a distinct, clear message and opens the manual fallback', async () => {
    const { window, byId, api } = loadTargetsLoadedUI();
    window.fetchLockedProjects = async () => ({ error: "isn't available from qep-capture yet.", rpcMissing: true });

    await api.renderTargetsLoadedDashboard();

    assert.match(byId['qep-capture-picker-status'].innerHTML, /available from qep-capture yet/);
    assert.equal(byId['qep-capture-manual-fallback'].style.display, 'block');
});

test('picker: selecting a project loads its targets via fetchQepCaptureTargetsByVersion with the right ids', async () => {
    const { window, byId, api } = loadTargetsLoadedUI();
    window.fetchLockedProjects = async () => ({
        projects: [{ project_id: 'p-1', name: 'Zesty Cola', latest_locked_version_id: 'v-1', version_number: 3, locked_at: '2026-01-01T00:00:00Z' }],
    });
    let calledWith = null;
    window.fetchQepCaptureTargetsByVersion = async (projectId, versionId) => {
        calledWith = [projectId, versionId];
        return {
            project: { id: 'p-1', name: 'Zesty Cola', categoryName: 'Beverages' },
            version: { id: 'v-1', versionNumber: 3, status: 'locked', lockedAt: '2026-01-01T00:00:00Z' },
            stages: { appearance: { emotions: [], notes: '' }, aroma: { emotions: [], notes: '' }, frontMouth: { emotions: [], notes: '' }, midRearMouth: { emotions: [], notes: '' }, texture: { emotions: [], notes: '' }, aftertaste: { emotions: [], notes: '' }, overall: { emotions: [], notes: '' } },
        };
    };

    await api.renderTargetsLoadedDashboard();
    const select = byId['qep-capture-project-select'];
    select.value = 'p-1';
    await select.onchange();

    assert.deepEqual(calledWith, ['p-1', 'v-1']);
    assert.match(byId['targets-loaded-results'].innerHTML, /Zesty Cola/);
    assert.match(byId['targets-loaded-results'].innerHTML, /Start Full Evaluation from this target/);
});

test('picker: escapes a hostile project name both in the option list and the loaded result', async () => {
    const hostileName = '<img src=x onerror=alert(1)>Evil Co';
    const { window, byId, api } = loadTargetsLoadedUI();
    window.fetchLockedProjects = async () => ({
        projects: [{ project_id: 'p-1', name: hostileName, latest_locked_version_id: 'v-1', version_number: 1, locked_at: null }],
    });
    window.fetchQepCaptureTargetsByVersion = async () => ({
        project: { id: 'p-1', name: hostileName, categoryName: 'Snacks' },
        version: { id: 'v-1', versionNumber: 1, status: 'locked', lockedAt: null },
        stages: { appearance: { emotions: [], notes: '' }, aroma: { emotions: [], notes: '' }, frontMouth: { emotions: [], notes: '' }, midRearMouth: { emotions: [], notes: '' }, texture: { emotions: [], notes: '' }, aftertaste: { emotions: [], notes: '' }, overall: { emotions: [], notes: '' } },
    });

    await api.renderTargetsLoadedDashboard();
    assert.ok(!byId['qep-capture-project-select'].innerHTML.includes('<img'));
    assert.ok(byId['qep-capture-project-select'].innerHTML.includes('&lt;img'));

    const select = byId['qep-capture-project-select'];
    select.value = 'p-1';
    await select.onchange();
    assert.ok(!byId['targets-loaded-results'].innerHTML.includes('<img src=x'));
    assert.ok(byId['targets-loaded-results'].innerHTML.includes('&lt;img'));
});

// ------------------------------------------------------------
// Deep links
// ------------------------------------------------------------

test('deep link: a valid project id with no version consumes the stash, honours it, and cleans up the URL', async () => {
    const { window, byId, historyReplaceCalls, api } = loadTargetsLoadedUI({
        locationSearch: '?project=11111111-1111-1111-1111-111111111111&foo=bar',
        sessionStorageInitial: { qepCaptureDeepLinkPending: JSON.stringify({ project: '11111111-1111-1111-1111-111111111111', version: null }) },
    });
    window.fetchLockedProjects = async () => ({
        projects: [{ project_id: '11111111-1111-1111-1111-111111111111', name: 'Latest Target', latest_locked_version_id: '22222222-2222-2222-2222-222222222222', version_number: 5, locked_at: null }],
    });
    let calledWith = null;
    window.fetchQepCaptureTargetsByVersion = async (projectId, versionId) => {
        calledWith = [projectId, versionId];
        return {
            project: { id: projectId, name: 'Latest Target', categoryName: 'Beverages' },
            version: { id: versionId, versionNumber: 5, status: 'locked', lockedAt: null },
            stages: { appearance: { emotions: [], notes: '' }, aroma: { emotions: [], notes: '' }, frontMouth: { emotions: [], notes: '' }, midRearMouth: { emotions: [], notes: '' }, texture: { emotions: [], notes: '' }, aftertaste: { emotions: [], notes: '' }, overall: { emotions: [], notes: '' } },
        };
    };

    await api.handleQepCaptureDeepLink();

    // Missing version -> the project's latest locked version was used.
    assert.deepEqual(calledWith, ['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222']);
    assert.match(byId['targets-loaded-results'].innerHTML, /Latest Target/);
    assert.equal(window.sessionStorage.getItem('qepCaptureDeepLinkPending'), null);
    assert.equal(historyReplaceCalls.length, 1);
    const cleanedUrl = historyReplaceCalls[0][2];
    assert.ok(!cleanedUrl.includes('project='));
    assert.ok(!cleanedUrl.includes('version='));
});

test('deep link: a malformed project uuid is rejected and never navigates', async () => {
    const { window, api } = loadTargetsLoadedUI({
        locationSearch: '?project=not-a-uuid',
        sessionStorageInitial: { qepCaptureDeepLinkPending: JSON.stringify({ project: 'not-a-uuid', version: null }) },
    });
    let rendered = false;
    window.fetchLockedProjects = async () => { rendered = true; return { projects: [] }; };

    await api.handleQepCaptureDeepLink();
    assert.equal(rendered, false);
});

test('deep link: a project id not present in the picker list shows a clear "not found" message', async () => {
    const { byId, window, api } = loadTargetsLoadedUI({
        locationSearch: '?project=33333333-3333-3333-3333-333333333333',
        sessionStorageInitial: { qepCaptureDeepLinkPending: JSON.stringify({ project: '33333333-3333-3333-3333-333333333333', version: null }) },
    });
    window.fetchLockedProjects = async () => ({
        projects: [{ project_id: '44444444-4444-4444-4444-444444444444', name: 'Someone Else\'s Brief', latest_locked_version_id: 'v-9', version_number: 1, locked_at: null }],
    });

    await api.handleQepCaptureDeepLink();
    assert.match(byId['targets-loaded-results'].innerHTML, /not found in your organisation/);
});

test('deep link: a version id that does not match the project\'s latest locked version also shows "not found"', async () => {
    const { byId, window, api } = loadTargetsLoadedUI({
        locationSearch: '?project=11111111-1111-1111-1111-111111111111&version=99999999-9999-9999-9999-999999999999',
        sessionStorageInitial: {
            qepCaptureDeepLinkPending: JSON.stringify({ project: '11111111-1111-1111-1111-111111111111', version: '99999999-9999-9999-9999-999999999999' }),
        },
    });
    window.fetchLockedProjects = async () => ({
        projects: [{ project_id: '11111111-1111-1111-1111-111111111111', name: 'Some Brief', latest_locked_version_id: '22222222-2222-2222-2222-222222222222', version_number: 2, locked_at: null }],
    });

    await api.handleQepCaptureDeepLink();
    assert.match(byId['targets-loaded-results'].innerHTML, /not found in your organisation/);
});

test('deep link: nothing stashed -> consumeQepCaptureDeepLinkTarget returns null and handleQepCaptureDeepLink is a no-op', async () => {
    const { window, api } = loadTargetsLoadedUI({ sessionStorageInitial: {} });
    let called = false;
    window.fetchLockedProjects = async () => { called = true; return { projects: [] }; };

    assert.equal(api.consumeQepCaptureDeepLinkTarget(), null);
    await api.handleQepCaptureDeepLink();
    assert.equal(called, false);
});

test('deep link: disabled when ENABLE_TARGETS_LOADED is off, even with a valid stash', async () => {
    const { window, api } = loadTargetsLoadedUI({
        locationSearch: '?project=11111111-1111-1111-1111-111111111111',
        sessionStorageInitial: { qepCaptureDeepLinkPending: JSON.stringify({ project: '11111111-1111-1111-1111-111111111111', version: null }) },
        config: { ENABLE_TARGETS_LOADED: false },
    });
    let called = false;
    window.fetchLockedProjects = async () => { called = true; return { projects: [] }; };

    await api.handleQepCaptureDeepLink();
    assert.equal(called, false);
    // Still consumed/cleaned up even though disabled - a refresh must not re-fire it later if re-enabled mid-session.
    assert.equal(window.sessionStorage.getItem('qepCaptureDeepLinkPending'), null);
});
