// Tests for Stage 2B "Send to Capture" (send-to-capture.js) and its app.js
// wiring. Mocks only: the Supabase client is the schema-strict mock from
// test/helpers/strict-supabase.js (a wrong schema fails like PostgREST
// would), windows/toasts are injected fakes, and app.js is loaded in a
// with(scope) sandbox like test/helpers/load-app.js. No network.
// Run: node test/send-to-capture.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const STC = require('../send-to-capture.js');
const RU = require('../render-utils.js');
const { makeStrictClient } = require('./helpers/strict-supabase');

const FLAG_ON = { ENABLE_SEND_TO_CAPTURE: true, CAPTURE_APP_URL: 'https://capture.example.test' };
const FLAG_OFF = { ENABLE_SEND_TO_CAPTURE: false, CAPTURE_APP_URL: 'https://capture.example.test' };
const PROJECT_ID = '11111111-1111-4111-8111-111111111111';
const VERSION_ID = '22222222-2222-4222-8222-222222222222';
const NEW_VERSION_ID = '33333333-3333-4333-8333-333333333333';
const STUDY_ID = '44444444-4444-4444-8444-444444444444';

function experience(overrides = {}) {
    return {
        id: 1777019020364.0994,
        timestamp: '2026-09-24T10:00:00.000Z',
        tssProjectId: null,
        sourceVersionId: null,
        productInfo: { name: 'Dark Nut Bar', brand: 'Acme', type: 'Chocolate', variant: 'N/A', occasion: 'Not specified', temperature: 'Not specified' },
        testNumber: 1,
        stages: {
            appearance: { visualAppeal: 7, glossiness: null, emotions: { curiosity: 6, bored: null } },
            aroma: { intensity: null, emotions: { comfort: 0, calm: null } },
            aftertaste: { emotions: { satisfaction: null } },
            overall: { emotions: { joy: null } },
        },
        emotionalTriggers: { moreishness: 8, refreshment: null, melt: null, crunch: null },
        notes: '',
        ...overrides,
    };
}

function untouchedExperience() {
    return experience({
        stages: {
            appearance: { visualAppeal: null, emotions: { curiosity: null } },
            overall: { emotions: { joy: null } },
        },
        emotionalTriggers: { moreishness: null, refreshment: null, melt: null, crunch: null },
    });
}

function okRpcImpl(calls, { version = {}, study = {} } = {}) {
    return (name, params) => {
        calls.push({ name, params });
        if (name === 'create_version_from_signature') {
            return {
                data: {
                    project_id: PROJECT_ID, version_id: NEW_VERSION_ID, version_number: 2,
                    created_project: false, targets_count: 4, skipped_unmeasured: 3,
                    unmapped_keys: [], study_name_hint: 'Dark Nut Bar - Acme - Chocolate', ...version,
                },
                error: null,
            };
        }
        if (name === 'create_study_from_version') {
            // supabase-js returns a setof/table result as an array of rows.
            return { data: [{ study: { id: STUDY_ID, name: 'Dark Nut Bar - Acme - Chocolate', ...study }, out_of_category_count: 0 }], error: null };
        }
        return { data: null, error: { message: `unexpected rpc ${name}` } };
    };
}

function fakeWindow() {
    return { closed: false, opener: {}, location: { href: '' }, closedByUs: false, close() { this.closed = true; this.closedByUs = true; } };
}

function fakeButton() {
    return { disabled: false, textContent: 'Send to Capture', dataset: {} };
}

// ---------- name builder ----------

test('buildCaptureStudyName: every blank/present combination is never blank', () => {
    const values = { name: 'Dark Nut Bar', brand: 'Acme', category: 'Chocolate' };
    const blanks = [undefined, null, '', '   ', 'N/A', 'Not specified'];
    for (let mask = 0; mask < 8; mask++) {
        for (const blank of blanks) {
            const input = {
                name: mask & 1 ? values.name : blank,
                brand: mask & 2 ? values.brand : blank,
                category: mask & 4 ? values.category : blank,
            };
            const expectedParts = ['name', 'brand', 'category'].filter((k, i) => mask & (1 << i)).map(k => values[k]);
            const out = STC.buildCaptureStudyName(input);
            assert.ok(out && out.trim().length > 0, `blank name for ${JSON.stringify(input)}`);
            assert.equal(out, expectedParts.length ? expectedParts.join(' - ') : 'Untitled product');
        }
    }
    assert.equal(STC.buildCaptureStudyName(), 'Untitled product');
    assert.equal(STC.buildCaptureStudyName({}), 'Untitled product');
});

test('buildCaptureStudyName: trims and collapses whitespace, keeps order', () => {
    assert.equal(STC.buildCaptureStudyName({ name: '  Nut  Bar ', brand: ' Acme ', category: 'Chocolate' }), 'Nut Bar - Acme - Chocolate');
    assert.equal(STC.buildCaptureStudyName({ name: 'Bar', category: 'Snack' }), 'Bar - Snack');
});

test('studyNameForExperience: uses productInfo name/brand/type and skips the N/A brand default', () => {
    assert.equal(STC.studyNameForExperience(experience()), 'Dark Nut Bar - Acme - Chocolate');
    assert.equal(STC.studyNameForExperience(experience({ productInfo: { name: 'Bar', brand: 'N/A', type: '' } })), 'Bar');
    assert.equal(STC.studyNameForExperience({}), 'Untitled product');
});

// ---------- payload prep ----------

test('buildSendToCapturePayload: same raw experience shape as the dual-write, nulls (untouched) preserved', () => {
    const exp = experience();
    const payload = STC.buildSendToCapturePayload(exp);
    assert.notEqual(payload, exp, 'must be a copy, not the live object');
    assert.deepEqual(payload, JSON.parse(JSON.stringify(exp)));
    assert.equal(payload.stages.appearance.glossiness, null);
    assert.equal(payload.stages.appearance.emotions.bored, null);
    assert.equal(payload.emotionalTriggers.refreshment, null);
    assert.equal(payload.stages.aroma.emotions.comfort, 0, 'a touched 0 is a real rating');
});

test('buildSendToCapturePayload: linked ids are carried unchanged', () => {
    const payload = STC.buildSendToCapturePayload(experience({ tssProjectId: PROJECT_ID, sourceVersionId: VERSION_ID }));
    assert.equal(payload.tssProjectId, PROJECT_ID);
    assert.equal(payload.sourceVersionId, VERSION_ID);
    assert.equal(STC.isLinkedExperience(payload), true);
    assert.equal(STC.isLinkedExperience(experience()), false);
});

test('buildSendToCapturePayload: rejects a missing experience or id', () => {
    assert.throws(() => STC.buildSendToCapturePayload(null), /experience not found/);
    assert.throws(() => STC.buildSendToCapturePayload({ stages: {} }), /no id/);
});

test('countMeasuredValues: counts numbers only (attributes, emotions, triggers), never nulls', () => {
    // visualAppeal 7, curiosity 6, comfort 0, moreishness 8
    assert.equal(STC.countMeasuredValues(experience()), 4);
    assert.equal(STC.countMeasuredValues(untouchedExperience()), 0);
    assert.equal(STC.countMeasuredValues(null), 0);
    assert.equal(STC.countMeasuredValues({ stages: { a: { x: '5', y: NaN } } }), 0);
});

// ---------- URL + result parsing ----------

test('buildCaptureStudyUrl: config base, trailing slash stripped, id encoded, default host', () => {
    assert.equal(STC.buildCaptureStudyUrl(STUDY_ID, FLAG_ON), `https://capture.example.test/studies/${STUDY_ID}`);
    assert.equal(STC.buildCaptureStudyUrl('a/b?c', { CAPTURE_APP_URL: 'http://localhost:3000/' }), 'http://localhost:3000/studies/a%2Fb%3Fc');
    assert.equal(STC.buildCaptureStudyUrl('x', {}), 'https://capture.qeptss.com/studies/x');
});

test('extractStudyResult: array of rows with nested study, or a bare row', () => {
    assert.deepEqual(STC.extractStudyResult([{ study: { id: 's1', name: 'n' }, out_of_category_count: 2 }]),
        { study: { id: 's1', name: 'n' }, outOfCategoryCount: 2 });
    assert.equal(STC.extractStudyResult({ study: { id: 's2' } }).study.id, 's2');
    assert.equal(STC.extractStudyResult([]), null);
    assert.equal(STC.extractStudyResult([{ study: null, out_of_category_count: 0 }]), null);
});

// ---------- error mapping ----------

test('mapSendToCaptureError: known RPC raise texts become clear messages', () => {
    const cases = [
        [`experience.tssProjectId ${PROJECT_ID} is not a project in your organisation`, /not in your organisation/],
        ['no organisation for caller', /not linked to an organisation/],
        ['signature_profiles: no resolvable org for caller', /not linked to an organisation/],
        ['profile was deleted', /deleted from the shared QEP database/],
        [`experience.sourceVersionId ${VERSION_ID} is not a version of project ${PROJECT_ID}`, /link to its Brief version is inconsistent/],
        ['Project version must be locked before it can be sent to Capture', /not locked/],
        ['Project version not found or not accessible', /could not find the new version/],
        ['Not signed in to QEP: no Clerk session, so qep-capture was not called. Please sign in again.', /Sign in to your QEP account/],
        ['Error: Not signed in to QEP: no Clerk session', /Sign in to your QEP account/],
        ['Could not find the function tss_shared.create_version_from_signature(payload) in the schema cache', /not available on this QEP database yet/],
        ['permission denied for schema tss_shared', /permission denied/],
        ['TypeError: Failed to fetch', /Could not reach QEP/],
        ['QEP-Capture client: @supabase/supabase-js not loaded.', /not configured on this page/],
        ['nothing measured', /Rate at least one attribute/],
        ['no measured values to send to Capture', /Rate at least one attribute/],
        ['experience.tssProjectId must be a UUID string', /link to its Brief version is inconsistent/],
        ['experience.sourceVersionId is not a valid UUID: "x"', /link to its Brief version is inconsistent/],
        ['Unknown Signature stage "foo"', /stage Capture does not recognise/],
        ['create_version_from_signature: not authenticated', /Sign in to your QEP account/],
        ['more than one organisation for caller - select an active organisation first', /more than one organisation/],
        ['experience value out of range 0-10 at appearance:gloss', /outside the 0-10 scale/],
        ['experience.tssCategoryId zzz is not a known category', /category chosen for Capture is not recognised/],
    ];
    for (const [raw, re] of cases) {
        assert.match(STC.mapSendToCaptureError({ message: raw }), re, raw);
        assert.match(STC.mapSendToCaptureError(new Error(raw)), re, raw);
    }
    assert.equal(STC.mapSendToCaptureError({ message: 'weird thing' }), 'Send to Capture failed: weird thing');
    assert.equal(STC.mapSendToCaptureError(null), 'Send to Capture failed. Please try again.');
});

// ---------- RPC sequence ----------

test('sendExperienceToCapture: calls tss_shared.create_version_from_signature then public.create_study_from_version', async () => {
    const calls = [];
    const { client, violations } = makeStrictClient({ rpcImpl: okRpcImpl(calls), accessToken: async () => 'clerk-token' });
    const exp = experience({ tssProjectId: PROJECT_ID, sourceVersionId: VERSION_ID });
    const result = await STC.sendExperienceToCapture(exp, { getClient: () => client, config: FLAG_ON });

    assert.deepEqual(violations, []);
    assert.deepEqual(calls.map(c => c.name), ['create_version_from_signature', 'create_study_from_version']);
    assert.deepEqual(Object.keys(calls[0].params), ['payload']);
    assert.deepEqual(calls[0].params.payload, JSON.parse(JSON.stringify(exp)));
    assert.equal(calls[0].params.payload.tssProjectId, PROJECT_ID);
    assert.deepEqual(calls[1].params, { p_version_id: NEW_VERSION_ID });
    assert.equal(result.url, `https://capture.example.test/studies/${STUDY_ID}`);
    assert.equal(result.studyName, 'Dark Nut Bar - Acme - Chocolate');
    assert.equal(result.version.version_id, NEW_VERSION_ID);
});

test('sendExperienceToCapture: version creation error stops before any study call', async () => {
    const calls = [];
    const { client } = makeStrictClient({
        accessToken: async () => 't',
        rpcImpl: (name, params) => {
            calls.push({ name, params });
            return { data: null, error: { message: 'profile was deleted' } };
        },
    });
    await assert.rejects(
        STC.sendExperienceToCapture(experience(), { getClient: () => client, config: FLAG_ON }),
        (err) => /deleted from the shared QEP database/.test(err.userMessage)
    );
    assert.deepEqual(calls.map(c => c.name), ['create_version_from_signature']);
});

test('sendExperienceToCapture: study creation error is reported', async () => {
    const calls = [];
    const base = okRpcImpl(calls);
    const { client } = makeStrictClient({
        accessToken: async () => 't',
        rpcImpl: (name, params) => name === 'create_study_from_version'
            ? (calls.push({ name, params }), { data: null, error: { message: 'Project version must be locked before it can be sent to Capture' } })
            : base(name, params),
    });
    await assert.rejects(
        STC.sendExperienceToCapture(experience(), { getClient: () => client, config: FLAG_ON }),
        (err) => /not locked/.test(err.userMessage)
    );
    assert.deepEqual(calls.map(c => c.name), ['create_version_from_signature', 'create_study_from_version']);
});

test('sendExperienceToCapture: targets_count 0 from the server blocks the study call', async () => {
    const calls = [];
    const { client } = makeStrictClient({ accessToken: async () => 't', rpcImpl: okRpcImpl(calls, { version: { targets_count: 0 } }) });
    await assert.rejects(
        STC.sendExperienceToCapture(experience(), { getClient: () => client, config: FLAG_ON }),
        (err) => err.userMessage === STC.NOTHING_MEASURED_MESSAGE
    );
    assert.deepEqual(calls.map(c => c.name), ['create_version_from_signature']);
});

test('sendExperienceToCapture: nothing measured client-side -> no RPC at all', async () => {
    let clientRequested = false;
    await assert.rejects(
        STC.sendExperienceToCapture(untouchedExperience(), { getClient: () => { clientRequested = true; return {}; }, config: FLAG_ON }),
        (err) => err.userMessage === 'Rate at least one attribute before sending to Capture.'
    );
    assert.equal(clientRequested, false);
});

test('sendExperienceToCapture: no Clerk session surfaces a sign-in message and sends nothing as anon', async () => {
    const calls = [];
    const { client, violations } = makeStrictClient({
        rpcImpl: okRpcImpl(calls),
        accessToken: async () => { throw new Error('Not signed in to QEP: no Clerk session, so qep-capture was not called. Please sign in again.'); },
    });
    await assert.rejects(
        STC.sendExperienceToCapture(experience(), { getClient: () => client, config: FLAG_ON }),
        (err) => /Sign in to your QEP account/.test(err.userMessage)
    );
    assert.deepEqual(calls, []);
    assert.deepEqual(violations, []);
});

test('sendExperienceToCapture: a getQepCaptureClient throw is surfaced, not swallowed', async () => {
    await assert.rejects(
        STC.sendExperienceToCapture(experience(), {
            getClient: () => { throw new Error('QEP-Capture client: @supabase/supabase-js not loaded.'); },
            config: FLAG_ON,
        }),
        (err) => /not configured on this page/.test(err.userMessage)
    );
});

test('sendExperienceToCapture: a thrown (not returned) rpc error is mapped too', async () => {
    const client = { schema: () => ({ rpc: async () => { throw new Error('TypeError: Failed to fetch'); } }), rpc: async () => ({}) };
    await assert.rejects(
        STC.sendExperienceToCapture(experience(), { getClient: () => client, config: FLAG_ON }),
        (err) => /Could not reach QEP/.test(err.userMessage)
    );
});

test('sendExperienceToCapture: falls back to the hint / local name when the study has no name', async () => {
    const calls = [];
    const { client } = makeStrictClient({ accessToken: async () => 't', rpcImpl: okRpcImpl(calls, { study: { name: '' }, version: { study_name_hint: '' } }) });
    const result = await STC.sendExperienceToCapture(experience({ productInfo: { name: '', brand: 'N/A', type: '' } }), { getClient: () => client, config: FLAG_ON });
    assert.equal(result.studyName, 'Untitled product');
});

// ---------- controller (click handling) ----------

function controller({ config = FLAG_ON, isDemo = () => false, client, openWindow, notes = [] } = {}) {
    return STC.createSendToCaptureController({
        config,
        isDemo,
        getClient: () => client,
        openWindow: openWindow || (() => fakeWindow()),
        notify: (n) => notes.push(n),
    });
}

test('flag off: no button HTML, click does nothing', async () => {
    assert.equal(STC.buildSendToCaptureButtonHtml(experience(), FLAG_OFF), '');
    assert.equal(STC.buildSendToCaptureButtonHtml(experience(), {}), '');
    assert.equal(STC.isSendToCaptureEnabled({ ENABLE_SEND_TO_CAPTURE: 'true' }), false, 'only a real boolean true enables it');
    let opened = 0;
    const notes = [];
    const ctl = controller({ config: FLAG_OFF, client: {}, openWindow: () => { opened++; return fakeWindow(); }, notes });
    assert.deepEqual(await ctl.handleClick(experience(), fakeButton()), { status: 'disabled' });
    assert.equal(opened, 0);
    assert.deepEqual(notes, []);
});

test('flag on: history row gets the button; without opts the history HTML is unchanged', () => {
    const exp = experience();
    const plain = RU.buildHistoryHtml([exp]);
    assert.ok(!plain.includes('Send to Capture'));
    assert.equal(RU.buildHistoryHtml([exp], {}), plain);

    const html = RU.buildHistoryHtml([exp], { extraActionsHtml: (e) => STC.buildSendToCaptureButtonHtml(e, FLAG_ON) });
    assert.match(html, /sendExperienceToCapture\(1777019020364\.0994, this\)/);
    assert.ok(html.indexOf('Send to Capture') < html.indexOf('>Delete<'), 'placed before Delete');
    assert.match(STC.buildSendToCaptureButtonHtml(experience({ tssProjectId: PROJECT_ID }), FLAG_ON), /new version of the linked Brief project/);
    assert.match(STC.buildSendToCaptureButtonHtml(exp, FLAG_ON), /new project from this experience/);
});

test('button HTML: a hostile id cannot break out of the onclick attribute', () => {
    const html = STC.buildSendToCaptureButtonHtml(experience({ id: '1)"><img src=x onerror=alert(1)>' }), FLAG_ON);
    assert.ok(!html.includes('<img'));
    assert.ok(!/onclick="[^"]*"[^>]*onerror/.test(html));
});

test('click success: opens the pre-opened tab at /studies/<id>, success toast with escaped-by-construction name and link', async () => {
    const calls = [];
    const { client } = makeStrictClient({ accessToken: async () => 't', rpcImpl: okRpcImpl(calls, { study: { name: '<b>Bar</b>' } }) });
    const win = fakeWindow();
    const notes = [];
    const button = fakeButton();
    const ctl = controller({ client, openWindow: () => win, notes });
    const out = await ctl.handleClick(experience(), button);
    assert.equal(out.status, 'ok');
    assert.equal(out.opened, true);
    assert.equal(win.opener, null, 'blank tab is detached from the opener');
    assert.equal(win.location.href, `https://capture.example.test/studies/${STUDY_ID}`);
    assert.equal(notes.length, 1);
    assert.equal(notes[0].type, 'success');
    assert.match(notes[0].message, /Capture study created: <b>Bar<\/b>\./, 'raw text - the toast uses textContent');
    assert.equal(notes[0].linkUrl, win.location.href);
    assert.equal(button.disabled, false);
    assert.equal(button.textContent, 'Send to Capture');
});

test('click with popup blocked: toast carries the study link', async () => {
    const calls = [];
    const { client } = makeStrictClient({ accessToken: async () => 't', rpcImpl: okRpcImpl(calls) });
    const notes = [];
    const ctl = controller({ client, openWindow: () => null, notes });
    const out = await ctl.handleClick(experience(), fakeButton());
    assert.equal(out.status, 'ok');
    assert.equal(out.opened, false);
    assert.match(notes[0].message, /blocked the new tab/);
    assert.equal(notes[0].linkUrl, `https://capture.example.test/studies/${STUDY_ID}`);
});

test('click error: closes the blank tab and shows the mapped message', async () => {
    const { client } = makeStrictClient({ accessToken: async () => 't', rpcImpl: () => ({ data: null, error: { message: 'no organisation for caller' } }) });
    const win = fakeWindow();
    const notes = [];
    const button = fakeButton();
    const out = await controller({ client, openWindow: () => win, notes }).handleClick(experience(), button);
    assert.equal(out.status, 'error');
    assert.equal(win.closedByUs, true);
    assert.equal(notes[0].type, 'error');
    assert.match(notes[0].message, /not linked to an organisation/);
    assert.equal(button.disabled, false, 'button re-enabled after failure');
});

test('double click: only one RPC sequence runs while a send is in flight; button disabled meanwhile', async () => {
    const calls = [];
    let release;
    const gate = new Promise((r) => { release = r; });
    const base = okRpcImpl(calls);
    const client = {
        schema: (s) => ({ rpc: async (name, params) => { await gate; assert.equal(s, 'tss_shared'); return base(name, params); } }),
        rpc: async (name, params) => base(name, params),
    };
    let opened = 0;
    const button = fakeButton();
    const ctl = controller({ client, openWindow: () => { opened++; return fakeWindow(); } });
    const first = ctl.handleClick(experience(), button);
    assert.equal(button.disabled, true);
    assert.equal(button.textContent, 'Sending to Capture...');
    const second = await ctl.handleClick(experience(), button);
    assert.deepEqual(second, { status: 'busy' });
    release();
    assert.equal((await first).status, 'ok');
    assert.equal(opened, 1);
    assert.deepEqual(calls.map(c => c.name), ['create_version_from_signature', 'create_study_from_version']);
    // a later click (after completion) is allowed again
    assert.equal((await ctl.handleClick(experience(), button)).status, 'ok');
});

test('demo mode: clear message, no tab, no client', async () => {
    let requested = false;
    let opened = 0;
    const notes = [];
    const ctl = STC.createSendToCaptureController({
        config: FLAG_ON,
        isDemo: () => true,
        getClient: () => { requested = true; return {}; },
        openWindow: () => { opened++; return fakeWindow(); },
        notify: (n) => notes.push(n),
    });
    const out = await ctl.handleClick(experience(), fakeButton());
    assert.equal(out.status, 'error');
    assert.equal(out.message, STC.DEMO_MODE_MESSAGE);
    assert.match(notes[0].message, /not available in demo mode/);
    assert.equal(requested, false);
    assert.equal(opened, 0);
});

test('nothing measured: blocked before any tab or RPC', async () => {
    let opened = 0;
    const notes = [];
    const out = await controller({ client: {}, openWindow: () => { opened++; return fakeWindow(); }, notes })
        .handleClick(untouchedExperience(), fakeButton());
    assert.equal(out.message, 'Rate at least one attribute before sending to Capture.');
    assert.equal(opened, 0);
    assert.equal(notes[0].type, 'error');
});

test('missing experience: error toast, no crash', async () => {
    const notes = [];
    const out = await controller({ client: {}, notes }).handleClick(undefined, fakeButton());
    assert.equal(out.status, 'error');
    assert.match(notes[0].message, /experience not found/);
});

// ---------- app.js wiring ----------

function loadAppWith(windowObj) {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
    function stub() {
        const store = { innerHTML: '', value: '', style: {}, dataset: {}, classList: { add() {}, remove() {}, contains: () => false } };
        return new Proxy(function () {}, {
            get(_, p) {
                if (p in store) return store[p];
                if (p === Symbol.toPrimitive) return () => '';
                if (p === 'length') return 0;
                if (p === 'then') return undefined;
                return stub();
            },
            set(_, p, v) { store[p] = v; return true; },
            apply() { return stub(); },
        });
    }
    const elements = new Map();
    const provided = {
        document: {
            addEventListener() {},
            getElementById(id) { if (!elements.has(id)) elements.set(id, stub()); return elements.get(id); },
            querySelector: () => stub(), querySelectorAll: () => [], createElement: () => stub(), body: stub(),
        },
        localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
        console,
        window: { TouchedFields: require('../touched-fields.js'), ...windowObj },
        escapeHtml: require('../dom-utils.js').escapeHtml,
        RenderUtils: RU,
    };
    const scope = new Proxy(provided, {
        has: () => true,
        get(t, p) {
            if (p === Symbol.unscopables) return undefined;
            if (p in t) return t[p];
            if (p in globalThis) return globalThis[p];
            return stub();
        },
        set(t, p, v) { t[p] = v; return true; },
    });
    const factory = new Function('scope', `with (scope) { ${src}
;return { updateHistory, sendExperienceToCapture, setExperiences: (v) => { experiences = v; } }; }`);
    return { app: factory(scope), elements };
}

test('app.js: history renders the button only with the flag on, and the click finds the float id', async () => {
    const clicked = [];
    const flagOn = { ...STC, isSendToCaptureEnabled: () => true, buildSendToCaptureButtonHtml: (e) => STC.buildSendToCaptureButtonHtml(e, FLAG_ON), handleClick: (exp, btn) => clicked.push({ exp, btn }) };
    const exp = experience();
    const other = experience({ id: 1777019020364.5, timestamp: '2026-09-23T10:00:00.000Z' });

    const on = loadAppWith({ SendToCapture: flagOn });
    on.app.setExperiences([exp, other]);
    on.app.updateHistory();
    assert.match(on.elements.get('history-list').innerHTML, /sendExperienceToCapture\(1777019020364\.0994, this\)/);
    const btn = fakeButton();
    on.app.sendExperienceToCapture(1777019020364.0994, btn);
    assert.equal(clicked.length, 1);
    assert.equal(clicked[0].exp, exp);
    assert.equal(clicked[0].btn, btn);

    const off = loadAppWith({ SendToCapture: { ...STC, buildSendToCaptureButtonHtml: (e) => STC.buildSendToCaptureButtonHtml(e, FLAG_OFF) } });
    off.app.setExperiences([exp]);
    off.app.updateHistory();
    assert.ok(!off.elements.get('history-list').innerHTML.includes('Send to Capture'));

    const absent = loadAppWith({});
    absent.app.setExperiences([exp]);
    absent.app.updateHistory();
    assert.ok(!absent.elements.get('history-list').innerHTML.includes('Send to Capture'));
    absent.app.sendExperienceToCapture(exp.id, btn); // no-op, no throw
});

test('live config ships Send to Capture ON against prod (0038 is live there); example stays OFF', () => {
    const live = fs.readFileSync(path.join(__dirname, '..', 'qep-capture-config.js'), 'utf8');
    assert.match(live, /ENABLE_SEND_TO_CAPTURE: true,/);
    assert.match(live, /SUPABASE_ENV: 'prod',/, 'the flag is only on because the config points at prod, where 0038 is applied');
    assert.match(live, /CAPTURE_APP_URL: 'https:\/\/capture\.qeptss\.com'/);
    const example = fs.readFileSync(path.join(__dirname, '..', 'qep-capture-config.example.js'), 'utf8');
    assert.match(example, /ENABLE_SEND_TO_CAPTURE: false,/);
});

test('index.html loads send-to-capture.js after dom-utils.js and before app.js', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const at = (s) => html.indexOf(`<script src="${s}"></script>`);
    assert.ok(at('send-to-capture.js') > 0);
    assert.ok(at('dom-utils.js') < at('send-to-capture.js'));
    assert.ok(at('qep-capture-client.js') < at('send-to-capture.js'));
    assert.ok(at('send-to-capture.js') < at('app.js'));
});

test('successNotes: reused version and out-of-category targets are called out; no default-category note', () => {
    assert.equal(STC.successNotes({ version: {}, outOfCategoryCount: 0 }), '');
    const s = STC.successNotes({ version: { reused_existing_version: true, category_fallback: true }, outOfCategoryCount: 2 });
    assert.match(s, /existing version was reused/);
    assert.doesNotMatch(s, /default category/, 'Capture never defaults a category any more');
    assert.match(s, /2 target\(s\) fall outside/);
});

// ---------- category required (0038: no default category) ----------

const CATEGORY_REQUIRED = 'category required: product type "beverage" has no confident Capture category - choose one (experience.tssCategoryId)';
const CATEGORY_ROWS = [{ id: 'choc', name: 'Chocolate Bar' }, { id: 'soft', name: 'Soft Drink' }, { id: 'water', name: 'Still Water' }];

function categoryRequiredRpc(calls) {
    const ok = okRpcImpl(calls);
    return (name, params) => {
        if (name === 'create_version_from_signature' && !(params.payload && params.payload.tssCategoryId)) {
            calls.push({ name, params });
            return { data: null, error: { message: CATEGORY_REQUIRED } };
        }
        return ok(name, params);
    };
}

test('mapSendToCaptureError: category required asks the user to choose a category', () => {
    assert.match(STC.mapSendToCaptureError({ message: CATEGORY_REQUIRED }), /choose a Capture category/i);
});

test('sendExperienceToCapture: category required is a coded error and no study is created', async () => {
    const calls = [];
    const { client } = makeStrictClient({ accessToken: async () => 't', rpcImpl: categoryRequiredRpc(calls) });
    await assert.rejects(STC.sendExperienceToCapture(experience(), { getClient: () => client, config: FLAG_ON }),
        (e) => e.code === 'CATEGORY_REQUIRED');
    assert.deepEqual(calls.map(c => c.name), ['create_version_from_signature']);
});

test('sendExperienceToCapture: a chosen category is sent as tssCategoryId', async () => {
    const calls = [];
    const { client } = makeStrictClient({ accessToken: async () => 't', rpcImpl: categoryRequiredRpc(calls) });
    const out = await STC.sendExperienceToCapture(experience(), { getClient: () => client, config: FLAG_ON, categoryId: 'soft' });
    assert.equal(calls[0].params.payload.tssCategoryId, 'soft');
    assert.equal(out.study.id, STUDY_ID);
});

test('fetchCaptureCategories: reads public.categories (id, name) in position order', async () => {
    const { client, violations } = makeStrictClient({ accessToken: async () => 't', tables: { categories: () => ({ data: CATEGORY_ROWS, error: null }) } });
    const rows = await STC.fetchCaptureCategories(client);
    assert.deepEqual(rows, CATEGORY_ROWS);
    assert.deepEqual(violations, []);
});

test('click, category required: closes the blank tab, shows the picker, no error toast', async () => {
    const calls = [];
    const { client } = makeStrictClient({ accessToken: async () => 't', rpcImpl: categoryRequiredRpc(calls),
        tables: { categories: () => ({ data: CATEGORY_ROWS, error: null }) } });
    const win = fakeWindow();
    const notes = [];
    const picks = [];
    const ctl = STC.createSendToCaptureController({ config: FLAG_ON, isDemo: () => false, getClient: () => client,
        openWindow: () => win, notify: (n) => notes.push(n), showCategoryPicker: (opts) => picks.push(opts) });
    const button = fakeButton();
    const out = await ctl.handleClick(experience(), button);
    assert.equal(out.status, 'needs_category');
    assert.equal(win.closedByUs, true, 'blank tab closed while the user chooses');
    assert.equal(notes.filter(n => n.type === 'error').length, 0);
    assert.equal(picks.length, 1);
    assert.deepEqual(picks[0].categories, CATEGORY_ROWS);
    assert.equal(button.disabled, false);
    assert.equal(calls.filter(c => c.name === 'create_study_from_version').length, 0);
});

test('click, category picked: re-sends with tssCategoryId, opens a new tab at the study', async () => {
    const calls = [];
    const { client } = makeStrictClient({ accessToken: async () => 't', rpcImpl: categoryRequiredRpc(calls),
        tables: { categories: () => ({ data: CATEGORY_ROWS, error: null }) } });
    const wins = [];
    const notes = [];
    let picker = null;
    const ctl = STC.createSendToCaptureController({ config: FLAG_ON, isDemo: () => false, getClient: () => client,
        openWindow: () => { const w = fakeWindow(); wins.push(w); return w; }, notify: (n) => notes.push(n),
        showCategoryPicker: (opts) => { picker = opts; } });
    await ctl.handleClick(experience(), fakeButton());
    const out = await picker.onPick('soft');
    assert.equal(out.status, 'ok');
    assert.equal(wins.length, 2, 'a fresh tab is opened inside the pick click');
    assert.equal(wins[1].location.href, `https://capture.example.test/studies/${STUDY_ID}`);
    const sent = calls.filter(c => c.name === 'create_version_from_signature');
    assert.equal(sent.length, 2);
    assert.equal(sent[1].params.payload.tssCategoryId, 'soft');
    assert.equal(notes[notes.length - 1].type, 'success');
});

test('click, category picker cancelled: nothing else is sent', async () => {
    const calls = [];
    const { client } = makeStrictClient({ accessToken: async () => 't', rpcImpl: categoryRequiredRpc(calls),
        tables: { categories: () => ({ data: CATEGORY_ROWS, error: null }) } });
    let picker = null;
    const ctl = STC.createSendToCaptureController({ config: FLAG_ON, isDemo: () => false, getClient: () => client,
        openWindow: () => fakeWindow(), notify: () => {}, showCategoryPicker: (opts) => { picker = opts; } });
    await ctl.handleClick(experience(), fakeButton());
    picker.onCancel();
    assert.equal(calls.length, 1);
});

test('click, category list cannot be loaded: clear error toast, no picker', async () => {
    const calls = [];
    const { client } = makeStrictClient({ accessToken: async () => 't', rpcImpl: categoryRequiredRpc(calls),
        tables: { categories: () => ({ data: null, error: { message: 'permission denied for table categories' } }) } });
    const notes = [];
    const picks = [];
    const ctl = STC.createSendToCaptureController({ config: FLAG_ON, isDemo: () => false, getClient: () => client,
        openWindow: () => fakeWindow(), notify: (n) => notes.push(n), showCategoryPicker: (o) => picks.push(o) });
    const out = await ctl.handleClick(experience(), fakeButton());
    assert.equal(out.status, 'error');
    assert.equal(picks.length, 0);
    assert.match(notes[0].message, /categor/i);
});

test('env guard: a dev-pointed config on signature.qeptss.com keeps Send to Capture off', () => {
    const devCfg = { ENABLE_SEND_TO_CAPTURE: true, SUPABASE_ENV: 'dev' };
    assert.equal(STC.isSendToCaptureEnabled(devCfg, 'signature.qeptss.com'), false);
    assert.equal(STC.isSendToCaptureEnabled(devCfg, 'localhost'), true);
    assert.equal(STC.isSendToCaptureEnabled({ ENABLE_SEND_TO_CAPTURE: true, SUPABASE_ENV: 'prod' }, 'signature.qeptss.com'), true);
});
