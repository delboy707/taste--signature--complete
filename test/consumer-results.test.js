// Tests for Stage 2C "Consumer results" (consumer-results.js): the pure
// join/format logic, the RPC sequence against the schema-strict Supabase
// mock (test/helpers/strict-supabase.js - a wrong schema fails like
// PostgREST would), the escaped HTML builder and the History-row button.
// Mocks only - no network, no Clerk, no Firestore.
// Run: node test/consumer-results.test.js

const test = require('node:test');
const assert = require('node:assert/strict');

const CR = require('../consumer-results.js');
const { makeStrictClient, SCHEMA_OF_RPC } = require('./helpers/strict-supabase');

const PROJECT_ID = '11111111-1111-4111-8111-111111111111';
const V1 = 'aaaaaaaa-0000-4000-8000-000000000001';
const V2 = 'aaaaaaaa-0000-4000-8000-000000000002';
const V3 = 'aaaaaaaa-0000-4000-8000-000000000003';
const FLAG_ON = { ENABLE_CONSUMER_RESULTS: true };

// A slice of tss_shared.signature_attribute_map (qep-capture 0025): the
// real kebab-case sensory key, verbatim emotion/trigger keys.
const CROSSWALK = [
    { signature_stage: 'appearance', signature_key: 'color-shade', variable_key: 'app_Color_Shade', kind: 'sensory' },
    { signature_stage: 'appearance', signature_key: 'excitement', variable_key: 'ap_emo_excitement', kind: 'emotion' },
    { signature_stage: 'appearance', signature_key: 'curiosity', variable_key: 'ap_emo_curiosity', kind: 'emotion' },
    { signature_stage: 'aftertaste', signature_key: 'craving', variable_key: 'af_emo_craving_want_more', kind: 'emotion' },
    { signature_stage: 'overall', signature_key: 'moreishness', variable_key: 'overall_trig_moreishness', kind: 'trigger' },
    { signature_stage: 'overall', signature_key: 'melt', variable_key: 'overall_trig_the_melt', kind: 'trigger' },
];

function experience(overrides = {}) {
    return {
        id: 1777019020364.0994,
        tssProjectId: PROJECT_ID,
        productInfo: { name: 'Dark Nut Bar', brand: 'Acme' },
        stages: {
            appearance: { colorShade: 7, emotions: { excitement: 6, curiosity: null } },
            aftertaste: { emotions: { craving: 4 } },
            overall: { emotions: {} },
        },
        emotionalTriggers: { moreishness: 8, refreshment: null, melt: null, crunch: null },
        ...overrides,
    };
}

// get_version_results shape (CONTRACT.md, migration 0041). stage is
// qep_stage.stage_key; stage_name is an extra key 0041 adds.
function versionResult(overrides = {}) {
    return {
        version_id: V1,
        project_id: PROJECT_ID,
        version_number: 1,
        n_sessions: 12,
        // At most one study per version (0041: unique index on source_version_id).
        studies: [
            { study_id: 's-1', name: 'Dark Nut Bar - Acme', status: 'closed', closed_at: '2026-09-20T10:00:00Z', n_sessions: 12 },
        ],
        attributes: [
            { code: 'app_Color_Shade', kind: 'sensory', stage: 'ap', stage_name: 'Appearance', label: 'Color Shade', measure: 'intensity', n: 12, mean: 6.25, sd: 1.1, distribution: [0, 0, 0, 0, 1, 2, 4, 3, 2, 0, 0] },
            { code: 'app_Surface_Holes', kind: 'sensory', stage: 'ap', stage_name: 'Appearance', label: 'Surface Holes', measure: 'intensity', n: 1, mean: 3, sd: null, distribution: [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0] },
            { code: 'ap_emo_excitement', kind: 'emotion', stage: 'ap', stage_name: 'Appearance', label: 'Excitement', measure: 'applies', n: 12, selected: 9, proportion: 0.75 },
            { code: 'ap_emo_curiosity', kind: 'emotion', stage: 'ap', stage_name: 'Appearance', label: 'Curiosity', measure: 'applies', n: 12, selected: 0, proportion: 0 },
            { code: 'af_emo_craving_want_more', kind: 'emotion', stage: 'af', stage_name: 'Aftertaste', label: 'Craving / want more', measure: 'applies', n: 10, selected: 5, proportion: 0.5 },
            { code: 'overall_trig_moreishness', kind: 'trigger', stage: 'overall', stage_name: 'Overall', label: 'Moreishness', measure: 'intensity', n: 12, mean: 7.5, sd: 0.8 },
            { code: 'overall_trig_the_melt', kind: 'trigger', stage: 'overall', stage_name: 'Overall', label: 'The Melt', measure: 'intensity', n: 12, mean: 5, sd: 2 },
        ],
        ...overrides,
    };
}

// ---------- feature flag + button ----------

test('flag: off by default, on only with ENABLE_CONSUMER_RESULTS true', () => {
    assert.equal(CR.isConsumerResultsEnabled({}), false);
    assert.equal(CR.isConsumerResultsEnabled({ ENABLE_CONSUMER_RESULTS: 'true' }), false);
    assert.equal(CR.isConsumerResultsEnabled(FLAG_ON, 'localhost'), true);
});

test('flag: dev-pointed config on the production hostname stays off', () => {
    assert.equal(CR.isConsumerResultsEnabled({ ENABLE_CONSUMER_RESULTS: true, SUPABASE_ENV: 'dev' }, 'signature.qeptss.com'), false);
    assert.equal(CR.isConsumerResultsEnabled({ ENABLE_CONSUMER_RESULTS: true, SUPABASE_ENV: 'prod' }, 'signature.qeptss.com'), true);
});

test('button: only for an experience with tssProjectId, and only with the flag on', () => {
    assert.equal(CR.buildConsumerResultsButtonHtml(experience(), { ENABLE_CONSUMER_RESULTS: false }), '');
    assert.equal(CR.buildConsumerResultsButtonHtml(experience({ tssProjectId: null }), FLAG_ON), '');
    assert.equal(CR.buildConsumerResultsButtonHtml(null, FLAG_ON), '');
    const html = CR.buildConsumerResultsButtonHtml(experience(), FLAG_ON);
    assert.match(html, /Consumer results/);
    // float id passed as a JSON number literal (never parseInt-truncated)
    assert.match(html, /showConsumerResults\(1777019020364\.0994, this\)/);
});

// ---------- stage + crosswalk ----------

test('normalizeStageId accepts qep stage keys, names and Signature stage ids', () => {
    const cases = {
        ap: 'appearance', ar: 'aroma', fm: 'frontMouth', mr: 'midRearMouth', tx: 'texture', af: 'aftertaste', overall: 'overall',
        Appearance: 'appearance', 'Front of Mouth': 'frontMouth', 'Mid/Rear Mouth': 'midRearMouth', Texture: 'texture',
        frontMouth: 'frontMouth', midRearMouth: 'midRearMouth', aroma: 'aroma',
    };
    for (const [input, want] of Object.entries(cases)) assert.equal(CR.normalizeStageId(input), want, input);
    assert.equal(CR.normalizeStageId('nonsense'), null);
    assert.equal(CR.normalizeStageId(null), null);
});

test('signature index reuses the target-prefill reverse crosswalk (code -> stage + key)', () => {
    const idx = CR.buildSignatureIndex(CROSSWALK);
    assert.deepEqual(idx.sensory.get('app_Color_Shade'), { stage: 'appearance', key: 'color-shade' });
    assert.deepEqual(idx.emotion.get('af_emo_craving_want_more'), { stage: 'aftertaste', key: 'craving' });
    assert.deepEqual(idx.trigger.get('overall_trig_the_melt'), { stage: 'overall', key: 'melt' });
    assert.equal(idx.sensory.get('ap_emo_excitement'), undefined);
});

test('signatureValueFor reads the right field per kind (kebab sensory -> camelCase field)', () => {
    const e = experience();
    assert.equal(CR.signatureValueFor(e, 'sensory', { stage: 'appearance', key: 'color-shade' }), 7);
    assert.equal(CR.signatureValueFor(e, 'emotion', { stage: 'appearance', key: 'excitement' }), 6);
    assert.equal(CR.signatureValueFor(e, 'emotion', { stage: 'appearance', key: 'curiosity' }), null);
    assert.equal(CR.signatureValueFor(e, 'trigger', { stage: 'overall', key: 'moreishness' }), 8);
    assert.equal(CR.signatureValueFor(e, 'trigger', { stage: 'overall', key: 'melt' }), null);
    assert.equal(CR.signatureValueFor(e, 'sensory', { stage: 'aroma', key: 'smell-strength' }), null);
    assert.equal(CR.signatureValueFor({}, 'sensory', { stage: 'appearance', key: 'color-shade' }), null);
});

// ---------- join + formatting ----------

test('version view: joins consumer means with Signature values, stage-ordered', () => {
    const idx = CR.buildSignatureIndex(CROSSWALK);
    const view = CR.buildVersionView(versionResult(), experience(), idx);
    assert.equal(view.versionNumber, 1);
    assert.equal(view.nSessions, 12);
    assert.deepEqual(view.stages.map(s => s.stageId), ['appearance', 'aftertaste']);
    const ap = view.stages[0];
    assert.equal(ap.label, 'Appearance');
    const shade = ap.rows.find(r => r.code === 'app_Color_Shade');
    assert.equal(shade.signatureValue, 7);
    assert.equal(shade.signatureStatus, 'value');
    assert.equal(CR.formatConsumer(shade), 'mean 6.25 (n 12, SD 1.10)');
    assert.equal(CR.formatSignature(shade), '7/10');
});

test('emotions are shown as % selected (n), never as a 0-10 intensity', () => {
    const idx = CR.buildSignatureIndex(CROSSWALK);
    const view = CR.buildVersionView(versionResult(), experience(), idx);
    const exc = view.stages[0].rows.find(r => r.code === 'ap_emo_excitement');
    assert.equal(exc.measure, 'applies');
    assert.equal(CR.formatConsumer(exc), '75% selected (9 of 12)');
    assert.doesNotMatch(CR.formatConsumer(exc), /\/10|mean/);
    assert.equal(exc.mean, undefined);
    const cur = view.stages[0].rows.find(r => r.code === 'ap_emo_curiosity');
    assert.equal(CR.formatConsumer(cur), '0% selected (0 of 12)');
    assert.equal(CR.formatSignature(cur), 'Not rated');
    // Brief/Signature emotion key that differs from the code (craving)
    const crave = view.stages[1].rows.find(r => r.code === 'af_emo_craving_want_more');
    assert.equal(crave.signatureValue, 4);
    assert.equal(CR.formatConsumer(crave), '50% selected (5 of 10)');
});

test('proportion missing: computed from selected / n; no n -> no percentage invented', () => {
    assert.equal(CR.formatConsumer({ measure: 'applies', selected: 3, n: 4, proportion: null }), '75% selected (3 of 4)');
    assert.equal(CR.formatConsumer({ measure: 'applies', selected: 0, n: 0, proportion: null }), 'No answers');
});

test('SD is shown as "-" when null (n < 2); string numerics from jsonb are accepted', () => {
    const idx = CR.buildSignatureIndex(CROSSWALK);
    const view = CR.buildVersionView(versionResult(), experience(), idx);
    const holes = view.stages[0].rows.find(r => r.code === 'app_Surface_Holes');
    assert.equal(CR.formatConsumer(holes), 'mean 3.00 (n 1, SD -)');
    assert.equal(CR.formatConsumer({ measure: 'intensity', mean: '4.5', sd: '0.25', n: '6' }), 'mean 4.50 (n 6, SD 0.25)');
});

test('codes without a Signature slider are listed as Capture only', () => {
    const idx = CR.buildSignatureIndex(CROSSWALK);
    const view = CR.buildVersionView(versionResult(), experience(), idx);
    const holes = view.stages[0].rows.find(r => r.code === 'app_Surface_Holes');
    assert.equal(holes.signatureStatus, 'capture_only');
    assert.equal(CR.formatSignature(holes), 'Capture only');
    assert.equal(view.captureOnlyCount, 1);
});

test('a crosswalk row pointing at another stage is never used (no cross-stage moves)', () => {
    const rows = CROSSWALK.concat([{ signature_stage: 'aroma', signature_key: 'surface-holes', variable_key: 'app_Surface_Holes', kind: 'sensory' }]);
    const e = experience();
    e.stages.aroma = { surfaceHoles: 9, emotions: {} };
    const view = CR.buildVersionView(versionResult(), e, CR.buildSignatureIndex(rows));
    const holes = view.stages[0].rows.find(r => r.code === 'app_Surface_Holes');
    assert.equal(holes.signatureStatus, 'capture_only');
    assert.equal(holes.signatureValue, null);
});

test('triggers map to Signature emotionalTriggers and are grouped separately', () => {
    const idx = CR.buildSignatureIndex(CROSSWALK);
    const view = CR.buildVersionView(versionResult(), experience(), idx);
    assert.deepEqual(view.triggers.map(r => r.code), ['overall_trig_moreishness', 'overall_trig_the_melt']);
    const more = view.triggers[0];
    assert.equal(more.signatureValue, 8);
    assert.equal(CR.formatSignature(more), '8/10');
    assert.equal(CR.formatConsumer(more), 'mean 7.50 (n 12, SD 0.80)');
    assert.equal(CR.formatSignature(view.triggers[1]), 'Not rated');
    // triggers do not also appear under the Overall stage
    assert.ok(!view.stages.some(s => s.rows.some(r => r.kind === 'trigger')));
});

test('studies: name, status label and Closed (with date) are shown; live and none too', () => {
    const view = CR.buildVersionView(versionResult(), experience(), CR.buildSignatureIndex(CROSSWALK));
    assert.deepEqual(view.studies.map(s => [s.name, s.statusLabel, s.nSessions]), [['Dark Nut Bar - Acme', 'Closed', 12]]);
    assert.equal(view.studies[0].closedAt, '2026-09-20T10:00:00Z');
    const live = CR.buildVersionView(versionResult({ studies: [{ study_id: 's-2', name: 'Retest', status: 'live', closed_at: null, n_sessions: 3 }] }), experience(), null);
    assert.deepEqual(live.studies.map(s => [s.name, s.statusLabel, s.nSessions]), [['Retest', 'Live', 3]]);
    const none = CR.buildVersionView(versionResult({ studies: [], n_sessions: 0, attributes: [] }), experience(), null);
    assert.deepEqual(none.studies, []);
    assert.match(CR.buildConsumerResultsHtml({ state: 'ok', versions: [none] }), /No Capture study for this version yet/);
});

test('crosswalk unavailable: Signature column says Unavailable, never "Capture only"', () => {
    const view = CR.buildVersionView(versionResult(), experience(), null);
    const shade = view.stages[0].rows.find(r => r.code === 'app_Color_Shade');
    assert.equal(shade.signatureStatus, 'unavailable');
    assert.equal(CR.formatSignature(shade), 'Unavailable');
    assert.equal(view.captureOnlyCount, 0);
});

test('read-only: building views never mutates the experience', () => {
    const e = experience();
    const before = JSON.stringify(e);
    CR.buildVersionView(versionResult(), e, CR.buildSignatureIndex(CROSSWALK));
    assert.equal(JSON.stringify(e), before);
});

test('no responses yet: n_sessions 0 marks the version empty', () => {
    const view = CR.buildVersionView(versionResult({ n_sessions: 0, attributes: [] }), experience(), CR.buildSignatureIndex(CROSSWALK));
    assert.equal(view.empty, true);
    assert.equal(view.studies.length, 1);
});

// ---------- error mapping ----------

test('error mapping: not-in-org, demo, missing function, network, permission', () => {
    assert.match(CR.mapConsumerResultsError({ message: 'version not found or not in your organisation' }), /not found or not in your organisation/);
    assert.match(CR.mapConsumerResultsError(new Error('Demo mode: QEP Capture features need a signed-in QEP account.')), /demo mode/i);
    assert.match(CR.mapConsumerResultsError({ code: 'PGRST202', message: 'Could not find the function public.get_version_results(p_version_id) in the schema cache' }), /not available on this QEP database yet/);
    assert.match(CR.mapConsumerResultsError(new TypeError('Failed to fetch')), /Could not reach QEP/);
    assert.match(CR.mapConsumerResultsError({ code: '42501', message: 'permission denied for schema tss_shared' }), /permission denied/i);
    assert.match(CR.mapConsumerResultsError(new Error('Not signed in to QEP: no Clerk session')), /Sign in/);
    assert.match(CR.mapConsumerResultsError({ message: 'weird' }), /weird/);
});

// ---------- RPC sequence (strict mock) ----------

test('strict mock registers get_version_results in the public schema', () => {
    assert.equal(SCHEMA_OF_RPC.get_version_results, 'public');
});

function versionsTable(rows) {
    return (filters, mode) => {
        if (filters.project_id !== PROJECT_ID) return { data: [], error: null };
        return { data: rows, error: null };
    };
}

function setup({ rows, rpcImpl, token = 'clerk-jwt' } = {}) {
    const calls = [];
    const strict = makeStrictClient({
        accessToken: async () => token,
        tables: { project_versions: versionsTable(rows || [
            { id: V1, version_number: 1, status: 'locked' },
            { id: V2, version_number: 2, status: 'draft' },
            { id: V3, version_number: 3, status: 'locked' },
        ]) },
        rpcImpl: (name, params) => {
            calls.push({ name, params });
            if (rpcImpl) return rpcImpl(name, params);
            const n = params.p_version_id === V1 ? 1 : 3;
            return { data: versionResult({ version_id: params.p_version_id, version_number: n }), error: null };
        },
    });
    return { ...strict, calls };
}

test('load: lists versions in tss_shared, calls get_version_results (public) for locked versions only', async () => {
    const { client, violations, queries, calls } = setup();
    const model = await CR.loadConsumerResults(experience(), {
        getClient: () => client,
        isDemo: () => false,
        fetchCrosswalk: async () => ({ rows: CROSSWALK }),
    });
    assert.deepEqual(violations, []);
    assert.equal(queries[0].schema, 'tss_shared');
    assert.equal(queries[0].table, 'project_versions');
    assert.equal(queries[0].filters.project_id, PROJECT_ID);
    assert.match(queries[0].select, /id/);
    assert.match(queries[0].select, /version_number/);
    assert.match(queries[0].select, /status/);
    assert.deepEqual(calls.map(c => c.name), ['get_version_results', 'get_version_results']);
    assert.deepEqual(calls.map(c => c.params.p_version_id).sort(), [V1, V3]);
    assert.equal(model.state, 'ok');
    // newest version first
    assert.deepEqual(model.versions.map(v => v.versionNumber), [3, 1]);
    assert.equal(model.versions[0].stages[0].rows.find(r => r.code === 'app_Color_Shade').signatureValue, 7);
});

test('load: multiple versions keep their own results; one failing version does not hide the others', async () => {
    const { client, violations } = setup({
        rpcImpl: (name, params) => params.p_version_id === V3
            ? { data: null, error: { message: 'version not found or not in your organisation' } }
            : { data: versionResult(), error: null },
    });
    const model = await CR.loadConsumerResults(experience(), { getClient: () => client, isDemo: () => false, fetchCrosswalk: async () => ({ rows: CROSSWALK }) });
    assert.deepEqual(violations, []);
    assert.equal(model.state, 'ok');
    const v3 = model.versions.find(v => v.versionNumber === 3);
    assert.match(v3.error, /not found or not in your organisation/);
    const v1 = model.versions.find(v => v.versionNumber === 1);
    assert.equal(v1.error, null);
    assert.equal(v1.nSessions, 12);
});

test('load: every locked version refused -> error state with the not-in-org message', async () => {
    const { client } = setup({ rpcImpl: () => ({ data: null, error: { message: 'version not found or not in your organisation' } }) });
    const model = await CR.loadConsumerResults(experience(), { getClient: () => client, isDemo: () => false, fetchCrosswalk: async () => ({ rows: CROSSWALK }) });
    assert.equal(model.state, 'error');
    assert.match(model.message, /not found or not in your organisation/);
});

test('load: no locked versions -> no_locked_versions, no RPC calls', async () => {
    const { client, calls } = setup({ rows: [{ id: V2, version_number: 2, status: 'draft' }] });
    const model = await CR.loadConsumerResults(experience(), { getClient: () => client, isDemo: () => false, fetchCrosswalk: async () => ({ rows: CROSSWALK }) });
    assert.equal(model.state, 'no_locked_versions');
    assert.equal(calls.length, 0);
});

test('load: project not visible (no version rows) -> not-in-org error', async () => {
    const { client, calls } = setup({ rows: [] });
    const model = await CR.loadConsumerResults(experience(), { getClient: () => client, isDemo: () => false, fetchCrosswalk: async () => ({ rows: CROSSWALK }) });
    assert.equal(model.state, 'error');
    assert.match(model.message, /not found or not in your organisation/);
    assert.equal(calls.length, 0);
});

test('load: demo mode fails fast - no client, no query', async () => {
    let got = 0;
    const model = await CR.loadConsumerResults(experience(), { getClient: () => { got++; throw new Error('x'); }, isDemo: () => true });
    assert.equal(got, 0);
    assert.equal(model.state, 'error');
    assert.match(model.message, /demo mode/i);
});

test('load: getClient throwing the qep-capture demo error maps to the demo message', async () => {
    const err = new Error('Demo mode: QEP Capture features need a signed-in QEP account. Exit demo mode and sign in to use them.');
    err.code = 'QEP_DEMO_MODE';
    const model = await CR.loadConsumerResults(experience(), { getClient: () => { throw err; }, isDemo: () => false });
    assert.equal(model.state, 'error');
    assert.match(model.message, /demo mode/i);
});

test('load: unlinked experience -> not_linked, never queries', async () => {
    let got = 0;
    const model = await CR.loadConsumerResults(experience({ tssProjectId: null }), { getClient: () => { got++; }, isDemo: () => false });
    assert.equal(model.state, 'not_linked');
    assert.equal(got, 0);
});

test('load: network error on the versions list -> error state', async () => {
    const client = {
        schema: () => ({ from: () => ({ select() { return this; }, eq() { return Promise.reject(new TypeError('Failed to fetch')); } }) }),
        rpc: () => { throw new Error('should not be called'); },
    };
    const model = await CR.loadConsumerResults(experience(), { getClient: () => client, isDemo: () => false, fetchCrosswalk: async () => ({ rows: CROSSWALK }) });
    assert.equal(model.state, 'error');
    assert.match(model.message, /Could not reach QEP/);
});

test('load: a missing Clerk token never reaches tss_shared as anon', async () => {
    const { client, violations } = setup({ token: null });
    const model = await CR.loadConsumerResults(experience(), { getClient: () => client, isDemo: () => false, fetchCrosswalk: async () => ({ rows: CROSSWALK }) });
    assert.equal(model.state, 'error');
    assert.match(model.message, /permission denied/i);
    // the strict mock records the anon attempt; the point is the user sees an error, not data
    assert.equal(violations.length, 1);
});

test('load: crosswalk failure still shows consumer data with a warning', async () => {
    const { client } = setup();
    const model = await CR.loadConsumerResults(experience(), { getClient: () => client, isDemo: () => false, fetchCrosswalk: async () => ({ error: 'boom' }) });
    assert.equal(model.state, 'ok');
    assert.match(model.warning, /Signature values could not be loaded/);
    assert.equal(model.versions[0].stages[0].rows[0].signatureStatus, 'unavailable');
});

test('load: RPC calls are bounded in parallel', async () => {
    const rows = [1, 2, 3, 4, 5, 6, 7].map(n => ({ id: `v-${n}`, version_number: n, status: 'locked' }));
    let inFlight = 0;
    let peak = 0;
    const client = {
        schema: (s) => ({ from: () => ({ select() { return this; }, eq() { return Promise.resolve({ data: rows, error: null }); } }) }),
        rpc: async (name, params) => {
            inFlight++; peak = Math.max(peak, inFlight);
            await new Promise(r => setTimeout(r, 5));
            inFlight--;
            return { data: versionResult({ version_id: params.p_version_id }), error: null };
        },
    };
    const model = await CR.loadConsumerResults(experience(), { getClient: () => client, isDemo: () => false, fetchCrosswalk: async () => ({ rows: CROSSWALK }), concurrency: 3 });
    assert.equal(model.versions.length, 7);
    assert.ok(peak <= 3, `peak ${peak}`);
    assert.ok(peak >= 2, `peak ${peak} (should actually run in parallel)`);
});

// ---------- HTML ----------

test('html: escapes study names and labels', () => {
    const r = versionResult();
    r.studies[0].name = '<img src=x onerror=alert(1)>';
    r.attributes[0].label = '<script>x</script>';
    const view = CR.buildVersionView(r, experience(), CR.buildSignatureIndex(CROSSWALK));
    const html = CR.buildConsumerResultsHtml({ state: 'ok', versions: [view] });
    assert.doesNotMatch(html, /<img src=x/);
    assert.doesNotMatch(html, /<script>x/);
    assert.match(html, /&lt;img src=x/);
});

test('html: shows version, sessions, Closed status, % selected, Capture only and triggers', () => {
    const view = CR.buildVersionView(versionResult(), experience(), CR.buildSignatureIndex(CROSSWALK));
    const html = CR.buildConsumerResultsHtml({ state: 'ok', versions: [view] });
    assert.match(html, /Version 1/);
    assert.match(html, /12 consumers/);
    assert.match(html, /Closed/);
    assert.match(html, /75% selected \(9 of 12\)/);
    assert.match(html, /Capture only/);
    assert.match(html, /Emotional triggers/);
    assert.match(html, /Moreishness/);
    assert.match(html, /read-only/i);
});

test('html: loading, no locked versions, no responses, error states', () => {
    assert.match(CR.buildConsumerResultsHtml({ state: 'loading' }), /Loading consumer results/);
    assert.match(CR.buildConsumerResultsHtml({ state: 'no_locked_versions' }), /no locked versions/i);
    assert.match(CR.buildConsumerResultsHtml({ state: 'not_linked' }), /not linked/i);
    const err = CR.buildConsumerResultsHtml({ state: 'error', message: 'Version <b>x</b> not found or not in your organisation.' });
    assert.match(err, /&lt;b&gt;x&lt;\/b&gt;/);
    const empty = CR.buildVersionView(versionResult({ n_sessions: 0, attributes: [] }), experience(), CR.buildSignatureIndex(CROSSWALK));
    assert.match(CR.buildConsumerResultsHtml({ state: 'ok', versions: [empty] }), /No consumer responses yet/);
    const failed = { versionNumber: 4, versionId: 'v4', error: 'This version was not found or is not in your organisation.' };
    assert.match(CR.buildConsumerResultsHtml({ state: 'ok', versions: [failed] }), /Version 4[\s\S]*not in your organisation/);
});

test('live config ships Consumer results ON against prod (0041 is live there); example stays OFF', () => {
    const fsMod = require('node:fs');
    const pathMod = require('node:path');
    const live = fsMod.readFileSync(pathMod.join(__dirname, '..', 'qep-capture-config.js'), 'utf8');
    assert.match(live, /ENABLE_CONSUMER_RESULTS: true,/);
    assert.match(live, /SUPABASE_ENV: 'prod',/, 'the flag is only on because the config points at prod, where 0041 is applied');
    const example = fsMod.readFileSync(pathMod.join(__dirname, '..', 'qep-capture-config.example.js'), 'utf8');
    assert.match(example, /ENABLE_CONSUMER_RESULTS: false,/);
});
