// Tests for Stage 2D "Target vs measured" + "Amend" (target-vs-measured.js):
// gap classification (tolerance edges, the CATA emotion rule, legacy
// word-only targets), per-stage joining of Brief targets + Signature's own
// sliders + Capture consumer results, version choice, the Amend payload
// (full carried-over set + edits, removed targets absent, never the
// experience's own slider values, never a new experience), the RPC sequence
// against the schema-strict Supabase mock, the feature flag and demo mode.
// Mocks only - no network, no Clerk, no Firestore.
// Run: node --test test/target-vs-measured.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const TVM = require('../target-vs-measured.js');
const { makeStrictClient, SCHEMA_OF_RPC } = require('./helpers/strict-supabase');

const PROJECT_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_PROJECT_ID = '55555555-5555-4555-8555-555555555555';
const V1 = 'aaaaaaaa-0000-4000-8000-000000000001';
const V2 = 'aaaaaaaa-0000-4000-8000-000000000002';
const V3 = 'aaaaaaaa-0000-4000-8000-000000000003';
const V4 = 'aaaaaaaa-0000-4000-8000-000000000004';
const EXP_ID = 1777019020364.0994;
const FLAG_ON = { ENABLE_TARGET_VS_MEASURED: true };

// Slice of tss_shared.signature_attribute_map (canonical) + one alias row.
const CROSSWALK = [
    { signature_stage: 'appearance', signature_key: 'color-shade', variable_key: 'app_Color_Shade', kind: 'sensory' },
    { signature_stage: 'appearance', signature_key: 'visual-appeal', variable_key: 'app_Visual_Appeal', kind: 'sensory' },
    { signature_stage: 'frontMouth', signature_key: 'sweetness', variable_key: 'fom_Sweetness', kind: 'sensory' },
    { signature_stage: 'texture', signature_key: 'thickness-mechanical', variable_key: 'tex_Thickness-Oral', kind: 'sensory' },
    { signature_stage: 'appearance', signature_key: 'curiosity', variable_key: 'ap_emo_curiosity', kind: 'emotion' },
    { signature_stage: 'appearance', signature_key: 'excitement', variable_key: 'ap_emo_excitement', kind: 'emotion' },
    { signature_stage: 'aftertaste', signature_key: 'satisfaction', variable_key: 'af_emo_satisfaction', kind: 'emotion' },
    { signature_stage: 'overall', signature_key: 'moreishness', variable_key: 'overall_trig_moreishness', kind: 'trigger' },
    { signature_stage: 'overall', signature_key: 'melt', variable_key: 'overall_trig_the_melt', kind: 'trigger' },
    // a crosswalk row for ANOTHER stage than the code's own stage
    { signature_stage: 'aroma', signature_key: 'joy', variable_key: 'ap_emo_joy', kind: 'emotion' },
    // alias rows come after canonical rows
    { signature_stage: 'texture', signature_key: 'thickness-oral', variable_key: 'tex_Thickness-Oral', kind: 'sensory' },
];

function experience(overrides = {}) {
    return {
        id: EXP_ID,
        timestamp: '2026-09-24T10:00:00.000Z',
        tssProjectId: PROJECT_ID,
        sourceVersionId: V1,
        productInfo: { name: 'Dark Nut Bar', brand: 'Acme', type: 'confectionery' },
        stages: {
            appearance: { colorShade: 6, visualAppeal: 9, emotions: { curiosity: 7, excitement: null } },
            frontMouth: { sweetness: 4, emotions: {} },
            texture: { emotions: {} },
            aftertaste: { unknownThing: 5, emotions: { satisfaction: 8 } },
            overall: { emotions: {} },
        },
        emotionalTriggers: { moreishness: 9, melt: null },
        ...overrides,
    };
}

// tss_shared.targets rows for V1 joined with qep_attribute (label/stage/kind).
function v1Targets() {
    return [
        { variable_key: 'app_Color_Shade', role: 'primary', intensity: 'high', range_min: null, range_max: null },
        { variable_key: 'fom_Sweetness', role: 'primary', intensity: null, range_min: 3, range_max: 3 },
        { variable_key: 'tex_Thickness-Oral', role: 'secondary', intensity: null, range_min: 5, range_max: 7 },
        { variable_key: 'ap_emo_curiosity', role: 'primary', intensity: 'high', range_min: null, range_max: null },
        { variable_key: 'ap_emo_excitement', role: 'secondary', intensity: null, range_min: 8, range_max: 8 },
        { variable_key: 'af_emo_satisfaction', role: 'primary', intensity: null, range_min: 8, range_max: 8 },
        { variable_key: 'overall_trig_moreishness', role: 'primary', intensity: null, range_min: 8, range_max: 8 },
        { variable_key: 'ap_emo_joy', role: 'primary', intensity: null, range_min: 6, range_max: 6 },
        { variable_key: 'mr_Bitterness', role: 'primary', intensity: null, range_min: 4, range_max: 4 },
    ];
}

const ATTRS = {
    app_Color_Shade: { id: 'app_Color_Shade', label: 'Color Shade', stage_key: 'ap', kind: 'sensory' },
    app_Visual_Appeal: { id: 'app_Visual_Appeal', label: 'Visual Appeal', stage_key: 'ap', kind: 'sensory' },
    fom_Sweetness: { id: 'fom_Sweetness', label: 'Sweetness', stage_key: 'fm', kind: 'sensory' },
    'tex_Thickness-Oral': { id: 'tex_Thickness-Oral', label: 'Thickness (oral)', stage_key: 'tx', kind: 'sensory' },
    ap_emo_curiosity: { id: 'ap_emo_curiosity', label: 'Curiosity', stage_key: 'ap', kind: 'emotion' },
    ap_emo_excitement: { id: 'ap_emo_excitement', label: 'Excitement', stage_key: 'ap', kind: 'emotion' },
    ap_emo_joy: { id: 'ap_emo_joy', label: 'Joy', stage_key: 'ap', kind: 'emotion' },
    af_emo_satisfaction: { id: 'af_emo_satisfaction', label: 'Satisfaction', stage_key: 'af', kind: 'emotion' },
    overall_trig_moreishness: { id: 'overall_trig_moreishness', label: 'Moreishness', stage_key: 'overall', kind: 'trigger' },
    mr_Bitterness: { id: 'mr_Bitterness', label: 'Bitterness <b>', stage_key: 'mr', kind: 'sensory' },
};

function shapedTargets() {
    return TVM.shapeTargetRows(v1Targets(), ATTRS);
}

// get_version_results payload (0041 shape) for a results version.
function results(overrides = {}) {
    return {
        version_id: V2,
        project_id: PROJECT_ID,
        version_number: 2,
        n_sessions: 6,
        studies: [{ study_id: 's-1', name: 'Dark Nut Bar - Acme - v2', status: 'live', closed_at: null, n_sessions: 6 }],
        attributes: [
            { code: 'app_Color_Shade', kind: 'sensory', stage: 'ap', label: 'Color Shade', measure: 'intensity', n: 6, mean: 7, sd: 1.41 },
            { code: 'fom_Sweetness', kind: 'sensory', stage: 'fm', label: 'Sweetness', measure: 'intensity', n: 5, mean: 3.8, sd: 3.77 },
            { code: 'tex_Thickness-Oral', kind: 'sensory', stage: 'tx', label: 'Thickness (oral)', measure: 'intensity', n: 1, mean: 5, sd: null },
            { code: 'ap_emo_curiosity', kind: 'emotion', stage: 'ap', label: 'Curiosity', measure: 'applies', n: 6, selected: 4, proportion: 0.667 },
            { code: 'ap_emo_excitement', kind: 'emotion', stage: 'ap', label: 'Excitement', measure: 'applies', n: 6, selected: 1, proportion: 0.167 },
            { code: 'af_emo_satisfaction', kind: 'emotion', stage: 'af', label: 'Satisfaction', measure: 'applies', n: 6, selected: 0, proportion: 0 },
            { code: 'overall_trig_moreishness', kind: 'trigger', stage: 'overall', label: 'Moreishness', measure: 'intensity', n: 6, mean: 8, sd: 1.41 },
            { code: 'mr_Astringency', kind: 'sensory', stage: 'mr', label: 'Astringency', measure: 'intensity', n: 6, mean: 2, sd: 1 },
        ],
        ...overrides,
    };
}

function index() {
    return TVM.buildIndexes(CROSSWALK);
}

function comparison(opts = {}) {
    return TVM.buildComparison({
        targets: opts.targets || shapedTargets(),
        notes: opts.notes || {},
        results: opts.results === undefined ? results() : opts.results,
        experience: opts.experience || experience(),
        indexes: opts.indexes === undefined ? index() : opts.indexes,
        labels: opts.labels || { app_Visual_Appeal: 'Visual Appeal' },
        rules: opts.rules || TVM.resolveRules({}),
    });
}

function rowOf(cmp, code) {
    for (const s of cmp.stages) for (const r of s.rows) if (r.code === code) return { stage: s.stageId, row: r };
    return null;
}

// ---------- flag + button ----------

test('flag: off by default; on only with ENABLE_TARGET_VS_MEASURED === true', () => {
    assert.equal(TVM.isTargetVsMeasuredEnabled({}), false);
    assert.equal(TVM.isTargetVsMeasuredEnabled({ ENABLE_TARGET_VS_MEASURED: 'true' }), false);
    assert.equal(TVM.isTargetVsMeasuredEnabled(FLAG_ON, 'localhost'), true);
    assert.equal(TVM.isTargetVsMeasuredEnabled({ ...FLAG_ON, SUPABASE_ENV: 'dev' }, 'signature.qeptss.com'), false);
});

test('flag off hides everything: no button, no panel, no load', async () => {
    assert.equal(TVM.buildTargetVsMeasuredButtonHtml(experience(), {}), '');
    assert.equal(TVM.buildTargetVsMeasuredButtonHtml(experience({ tssProjectId: null }), FLAG_ON), '');
    const html = TVM.buildTargetVsMeasuredButtonHtml(experience(), FLAG_ON);
    assert.match(html, /Target vs measured/);
    assert.match(html, /showTargetVsMeasured\(1777019020364\.0994/);
    assert.equal(TVM.openTargetVsMeasuredPanel(experience(), { config: {} }), null);
    let called = false;
    const m = await TVM.loadTargetVsMeasured(experience(), { config: {}, getClient: () => { called = true; } });
    assert.equal(m.state, 'disabled');
    assert.equal(called, false);
});

test('both config files ship ENABLE_TARGET_VS_MEASURED: false', () => {
    for (const f of ['qep-capture-config.js', 'qep-capture-config.example.js']) {
        const src = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
        assert.match(src, /ENABLE_TARGET_VS_MEASURED: false,/, f);
    }
});

test('wiring: index.html loads the module after consumer-results.js; app.js renders the button', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const i = html.indexOf('<script src="target-vs-measured.js"></script>');
    assert.ok(i > html.indexOf('<script src="consumer-results.js"></script>'));
    assert.ok(i < html.indexOf('<script src="app.js"></script>'));
    const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
    assert.match(app, /buildTargetVsMeasuredButtonHtml\(e\)/);
    assert.match(app, /function showTargetVsMeasured\(id\)/);
});

// ---------- gap classification ----------

test('numeric gap: tolerance edges are inclusive; outside is under/over with the signed gap', () => {
    const t = { type: 'numeric', min: 7, max: 7 };
    assert.deepEqual(TVM.classifyNumeric(7, t, 1), { status: 'on_target', delta: 0 });
    assert.equal(TVM.classifyNumeric(6, t, 1).status, 'on_target');
    assert.equal(TVM.classifyNumeric(8, t, 1).status, 'on_target');
    assert.deepEqual(TVM.classifyNumeric(5.9, t, 1), { status: 'under', delta: -1.1 });
    assert.deepEqual(TVM.classifyNumeric(8.1, t, 1), { status: 'over', delta: 1.1 });
    // float noise at the edge does not flip the status
    assert.equal(TVM.classifyNumeric(7.3 - 0.3 - 1, t, 1).status, 'on_target');
    // tolerance 0: only the exact value
    assert.equal(TVM.classifyNumeric(7, t, 0).status, 'on_target');
    assert.equal(TVM.classifyNumeric(7.01, t, 0).status, 'over');
    assert.equal(TVM.classifyNumeric(null, t, 1).status, 'no_data');
});

test('numeric gap: a range target is on target anywhere inside min..max plus the tolerance', () => {
    const r = { type: 'numeric', min: 5, max: 7 };
    assert.equal(TVM.classifyNumeric(4, r, 1).status, 'on_target');
    assert.equal(TVM.classifyNumeric(8, r, 1).status, 'on_target');
    assert.deepEqual(TVM.classifyNumeric(3.5, r, 1), { status: 'under', delta: -1.5 });
    assert.deepEqual(TVM.classifyNumeric(9, r, 1), { status: 'over', delta: 2 });
});

test('legacy word targets: "high" means >= 7 (never over), "low" means <= 3 (never under)', () => {
    const rules = TVM.resolveRules({});
    const high = { type: 'legacy', intensity: 'high' };
    const low = { type: 'legacy', intensity: 'low' };
    assert.equal(TVM.classifyValue(7, high, rules).status, 'on_target');
    assert.equal(TVM.classifyValue(10, high, rules).status, 'on_target');
    assert.equal(TVM.classifyValue(6.9, high, rules).status, 'under');
    assert.equal(TVM.classifyValue(3, low, rules).status, 'on_target');
    assert.equal(TVM.classifyValue(0, low, rules).status, 'on_target');
    assert.equal(TVM.classifyValue(3.5, low, rules).status, 'over');
    assert.equal(TVM.classifyValue(5, { type: 'legacy', intensity: 'medium' }, rules).status, 'no_numeric_target');
    assert.equal(TVM.classifyValue(5, null, rules).status, 'no_target');
    assert.equal(TVM.classifyValue(null, high, rules).status, 'no_data');
});

test('targetSpec: range_min/range_max win; word-only rows are legacy; nothing -> none', () => {
    assert.deepEqual(TVM.targetSpec({ range_min: 7, range_max: 7, intensity: null }), { type: 'numeric', min: 7, max: 7 });
    assert.deepEqual(TVM.targetSpec({ range_min: '5', range_max: '7', intensity: 'high' }), { type: 'numeric', min: 5, max: 7 });
    assert.deepEqual(TVM.targetSpec({ range_min: 6, range_max: null }), { type: 'numeric', min: 6, max: 6 });
    assert.deepEqual(TVM.targetSpec({ range_min: null, range_max: null, intensity: 'high' }), { type: 'legacy', intensity: 'high' });
    assert.deepEqual(TVM.targetSpec({ range_min: null, range_max: null, intensity: null }), { type: 'none' });
});

test('emotion CATA rule: high target expects >= X% selected; low target expects <= Y%; mid not compared', () => {
    const rules = TVM.resolveRules({});
    assert.equal(rules.emotionHighMinSelected, 0.5);
    const hi = { type: 'numeric', min: 8, max: 8 };
    assert.equal(TVM.classifyCata(0.5, 6, hi, rules).status, 'on_target');
    assert.equal(TVM.classifyCata(0.49, 6, hi, rules).status, 'under');
    assert.equal(TVM.classifyCata(0.9, 6, hi, rules).status, 'on_target', 'a high target is never "over" on CATA');
    const lo = { type: 'numeric', min: 2, max: 2 };
    assert.equal(TVM.classifyCata(0.2, 6, lo, rules).status, 'on_target');
    assert.equal(TVM.classifyCata(0.25, 6, lo, rules).status, 'over');
    assert.equal(TVM.classifyCata(0.4, 6, { type: 'numeric', min: 5, max: 5 }, rules).status, 'not_compared');
    assert.equal(TVM.classifyCata(0.6, 6, { type: 'legacy', intensity: 'high' }, rules).status, 'on_target');
    assert.equal(TVM.classifyCata(0.6, 0, hi, rules).status, 'no_data');
    // configurable
    const r30 = TVM.resolveRules({}, { emotionHighMinSelectedPct: 30 });
    assert.equal(TVM.classifyCata(0.35, 6, hi, r30).status, 'on_target');
    // a CATA proportion is never turned into a 0-10 value
    const res = TVM.classifyCata(0.667, 6, hi, rules);
    assert.equal(res.delta, undefined);
});

test('rules: config tolerance and view overrides are validated; bad values fall back to defaults', () => {
    assert.equal(TVM.resolveRules({}).tolerance, 1);
    assert.equal(TVM.resolveRules({ TARGET_VS_MEASURED_TOLERANCE: 0.5 }).tolerance, 0.5);
    assert.equal(TVM.resolveRules({ TARGET_VS_MEASURED_TOLERANCE: 'x' }).tolerance, 1);
    assert.equal(TVM.resolveRules({}, { tolerance: 2 }).tolerance, 2);
    assert.equal(TVM.resolveRules({}, { tolerance: -1 }).tolerance, 1);
    assert.equal(TVM.resolveRules({}, { tolerance: 99 }).tolerance, 1);
    assert.equal(TVM.resolveRules({}, { emotionHighMinSelectedPct: 150 }).emotionHighMinSelected, 0.5);
});

test('prefs: persisted per browser; a throwing or empty storage never breaks the view', () => {
    const mem = new Map();
    const storage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)) };
    assert.deepEqual(TVM.loadPrefs(storage), {});
    TVM.savePrefs(storage, { tolerance: 1.5, emotionHighMinSelectedPct: 40 });
    assert.deepEqual(TVM.loadPrefs(storage), { tolerance: 1.5, emotionHighMinSelectedPct: 40 });
    const broken = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('QuotaExceeded'); } };
    assert.deepEqual(TVM.loadPrefs(broken), {});
    assert.doesNotThrow(() => TVM.savePrefs(broken, { tolerance: 2 }));
    mem.set(TVM.PREFS_KEY, '{not json');
    assert.deepEqual(TVM.loadPrefs(storage), {});
    assert.deepEqual(TVM.loadPrefs(null), {});
});

// ---------- joining ----------

test('join: targets + Signature + consumers per stage, in Journey-of-Taste order', () => {
    const cmp = comparison();
    assert.deepEqual(cmp.stages.map((s) => s.stageId), ['appearance', 'frontMouth', 'midRearMouth', 'texture', 'aftertaste', 'overall']);
    const cs = rowOf(cmp, 'app_Color_Shade');
    assert.equal(cs.stage, 'appearance');
    assert.deepEqual(cs.row.target, { type: 'legacy', intensity: 'high' });
    assert.equal(cs.row.signature.value, 6);
    assert.equal(cs.row.consumer.mean, 7);
    assert.equal(cs.row.sigGap.status, 'under');      // 6 < 7 (high)
    assert.equal(cs.row.conGap.status, 'on_target');  // 7 >= 7
    const sw = rowOf(cmp, 'fom_Sweetness').row;
    assert.equal(sw.sigGap.status, 'on_target');      // 4 vs 3 tol 1
    assert.equal(sw.conGap.status, 'on_target');      // 3.8 vs 3
    const th = rowOf(cmp, 'tex_Thickness-Oral').row;
    assert.equal(th.signature.status, 'not_rated');
    assert.equal(th.sigGap.status, 'no_data');
    assert.equal(th.conGap.status, 'on_target');      // 5 in 5-7
});

test('join: emotions use the CATA rule for consumers and the 0-10 rule for Signature', () => {
    const cmp = comparison();
    const cu = rowOf(cmp, 'ap_emo_curiosity').row;    // legacy high
    assert.equal(cu.signature.value, 7);
    assert.equal(cu.sigGap.status, 'on_target');
    assert.equal(cu.conGap.status, 'on_target');      // 66.7% >= 50%
    const ex = rowOf(cmp, 'ap_emo_excitement').row;   // target 8
    assert.equal(ex.signature.status, 'not_rated');
    assert.equal(ex.conGap.status, 'under');          // 16.7% < 50%
    const sa = rowOf(cmp, 'af_emo_satisfaction').row; // target 8, sig 8, 0% selected
    assert.equal(sa.sigGap.status, 'on_target');
    assert.equal(sa.conGap.status, 'under');
});

test('join: target-only, consumer-only and Signature-only rows are all listed', () => {
    const cmp = comparison();
    const bit = rowOf(cmp, 'mr_Bitterness');
    assert.equal(bit.stage, 'midRearMouth');
    assert.equal(bit.row.signature.status, 'no_slider');
    assert.equal(bit.row.consumer, null);
    assert.equal(bit.row.conGap.status, 'no_data');
    const ast = rowOf(cmp, 'mr_Astringency').row;
    assert.equal(ast.target, null);
    assert.equal(ast.conGap.status, 'no_target');
    const va = rowOf(cmp, 'app_Visual_Appeal');     // Signature slider with a code, no target, no consumer
    assert.equal(va.stage, 'appearance');
    assert.equal(va.row.label, 'Visual Appeal');
    assert.equal(va.row.signature.value, 9);
    assert.equal(va.row.sigGap.status, 'no_target');
    // a Signature slider without any master code is still listed, without a code
    const af = cmp.stages.find((s) => s.stageId === 'aftertaste').rows.find((r) => r.signature && r.signature.key === 'unknownThing');
    assert.ok(af);
    assert.equal(af.code, null);
    assert.equal(af.signature.value, 5);
});

test('join: a crosswalk row for another stage is never used (no cross-stage moves)', () => {
    const joy = rowOf(comparison(), 'ap_emo_joy');
    assert.equal(joy.stage, 'appearance');
    assert.equal(joy.row.signature.status, 'no_slider');
});

test('join: triggers sit in the Overall stage and use the numeric rule', () => {
    const cmp = comparison();
    const m = rowOf(cmp, 'overall_trig_moreishness');
    assert.equal(m.stage, 'overall');
    assert.equal(m.row.kind, 'trigger');
    assert.equal(m.row.signature.value, 9);
    assert.equal(m.row.sigGap.status, 'on_target');
    assert.equal(m.row.conGap.status, 'on_target');
});

test('join: no results version -> consumer column empty, targets and Signature still compared', () => {
    const cmp = comparison({ results: null });
    const cs = rowOf(cmp, 'app_Color_Shade').row;
    assert.equal(cs.consumer, null);
    assert.equal(cs.conGap.status, 'no_data');
    assert.equal(cs.sigGap.status, 'under');
    assert.equal(rowOf(cmp, 'mr_Astringency'), null);
});

test('join: tolerance changes the verdict; counts per status are reported', () => {
    const wide = comparison({ rules: TVM.resolveRules({}, { tolerance: 3 }) });
    assert.ok(wide.counts.signature.on_target >= 1);
    const tight = comparison({ rules: TVM.resolveRules({}, { tolerance: 0 }) });
    assert.equal(rowOf(tight, 'fom_Sweetness').row.sigGap.status, 'over'); // 4 vs 3 tol 0
});

test('join: never mutates the experience', () => {
    const exp = experience();
    const before = JSON.stringify(exp);
    comparison({ experience: exp });
    assert.equal(JSON.stringify(exp), before);
});

// ---------- version choice ----------

const VERSIONS = [
    { id: V1, version_number: 1, status: 'locked', source: 'brief' },
    { id: V2, version_number: 2, status: 'locked', source: 'signature' },
    { id: V3, version_number: 3, status: 'locked', source: 'brief' },
    { id: V4, version_number: 4, status: 'draft', source: 'brief' },
];

test('version choice: target = the version the experience was measured against, else latest locked', () => {
    const locked = TVM.lockedVersions(VERSIONS);
    assert.deepEqual(locked.map((v) => v.versionNumber), [3, 2, 1]);
    assert.deepEqual(TVM.chooseTargetVersion(locked, experience()), { id: V1, reason: 'source_version' });
    assert.deepEqual(TVM.chooseTargetVersion(locked, experience({ sourceVersionId: null })), { id: V3, reason: 'latest_locked' });
    assert.deepEqual(TVM.chooseTargetVersion(locked, experience({ sourceVersionId: V4 })), { id: V3, reason: 'latest_locked' }, 'a draft is never a target');
    assert.deepEqual(TVM.chooseTargetVersion(locked, experience(), V2), { id: V2, reason: 'selected' });
    assert.deepEqual(TVM.chooseTargetVersion(locked, experience(), 'nope'), { id: V1, reason: 'source_version' });
});

test('version choice: consumers = latest locked version with responses, else with a study, else none', () => {
    const locked = TVM.lockedVersions(VERSIONS);
    const byId = {
        [V1]: { n_sessions: 6, studies: [{ study_id: 's1' }] },
        [V2]: { n_sessions: 0, studies: [{ study_id: 's2' }] },
        [V3]: { n_sessions: 0, studies: [] },
    };
    assert.deepEqual(TVM.chooseResultsVersion(locked, byId), { id: V1, reason: 'latest_with_responses' });
    assert.deepEqual(TVM.chooseResultsVersion(locked, { ...byId, [V1]: { n_sessions: 0, studies: [] } }), { id: V2, reason: 'latest_with_study' });
    assert.deepEqual(TVM.chooseResultsVersion(locked, {}), { id: null, reason: 'none' });
    assert.deepEqual(TVM.chooseResultsVersion(locked, byId, V3), { id: V3, reason: 'selected' });
    assert.deepEqual(TVM.chooseResultsVersion(locked, byId, ''), { id: null, reason: 'selected_none' });
});

// ---------- Amend: draft + payload ----------

function amendPlan(mutate, opts = {}) {
    const targets = opts.targets || shapedTargets();
    const draft = TVM.createDraft(targets);
    if (mutate) mutate(draft);
    return TVM.buildAmendPlan({
        draft,
        experience: opts.experience || experience(),
        projectId: PROJECT_ID,
        baseVersion: { id: V1, versionNumber: 1 },
        notes: opts.notes || {},
        indexes: index(),
    });
}

test('draft: numeric targets carried as their value, ranges collapsed, legacy words converted', () => {
    const d = TVM.createDraft(shapedTargets());
    assert.equal(d.entries['fom_Sweetness'].value, 3);
    assert.equal(d.entries['fom_Sweetness'].origin, 'carried');
    assert.equal(d.entries['tex_Thickness-Oral'].value, 6);
    assert.equal(d.entries['tex_Thickness-Oral'].origin, 'range');
    assert.equal(d.entries['app_Color_Shade'].value, 8, 'high -> TARGET_INTENSITY_SCALE.high, same as the markers');
    assert.equal(d.entries['app_Color_Shade'].origin, 'legacy');
});

test('amend payload: the FULL carried-over set + edits + additions; removed targets absent', () => {
    const plan = amendPlan((d) => {
        TVM.setDraftValue(d, 'fom_Sweetness', 5);          // edit
        TVM.setDraftValue(d, 'overall_trig_moreishness', 7); // edit
        TVM.removeDraftTarget(d, 'ap_emo_excitement');     // remove
        TVM.addDraftTarget(d, { code: 'app_Visual_Appeal', kind: 'sensory', stageId: 'appearance', label: 'Visual Appeal' }, 8); // add
    });
    assert.equal(plan.blocking, null);
    assert.deepEqual(plan.changes, { edited: 2, added: 1, removed: 1 });
    const p = plan.payload;
    assert.equal(p.id, EXP_ID, 'the version is attributed to this experience');
    assert.equal(p.tssProjectId, PROJECT_ID);
    assert.equal(p.sourceVersionId, V1);
    assert.deepEqual(p.productInfo, { name: 'Dark Nut Bar', brand: 'Acme', type: 'confectionery' });
    assert.deepEqual(p.stages, {
        appearance: { colorShade: 8, visualAppeal: 8, emotions: { curiosity: 8 } },
        frontMouth: { sweetness: 5 },
        texture: { thicknessMechanical: 6 },
        aftertaste: { emotions: { satisfaction: 8 } },
    });
    assert.deepEqual(p.emotionalTriggers, { moreishness: 7 });
    assert.equal(plan.carried.length, 7);
    assert.ok(!JSON.stringify(p).includes('excitement'));
});

test('amend payload: never carries the experience\'s own slider values, never mutates the experience', () => {
    const exp = experience();
    const before = JSON.stringify(exp);
    const plan = amendPlan(null, { experience: exp });
    assert.equal(JSON.stringify(exp), before);
    // Signature rated visualAppeal 9 and moreishness 9 - neither is a target value
    assert.equal(plan.payload.stages.appearance.visualAppeal, undefined);
    assert.equal(plan.payload.emotionalTriggers.moreishness, 8);
    assert.equal(plan.payload.stages.aftertaste.unknownThing, undefined);
    assert.equal(Object.keys(plan.payload).sort().join(','), 'emotionalTriggers,id,productInfo,sourceVersionId,stages,tssProjectId');
});

test('amend: what cannot be carried is listed before creating (no slider, other stage, emotion 0, notes, roles, words, ranges)', () => {
    const plan = amendPlan((d) => {
        TVM.setDraftValue(d, 'af_emo_satisfaction', 0);
    }, { notes: { appearance: 'glossy; deep brown' } });
    const dropped = Object.fromEntries(plan.dropped.map((x) => [x.code, x.reason]));
    assert.match(dropped.mr_Bitterness, /no Signature slider/i);
    assert.match(dropped.ap_emo_joy, /another stage|no Signature slider/i);
    assert.match(dropped.af_emo_satisfaction, /emotion target of 0/i);
    const w = plan.warnings.join('\n');
    assert.match(w, /Brief says/i);
    assert.match(w, /secondary/i);
    assert.match(w, /high/i);
    assert.match(w, /5-7/);
    assert.equal(plan.needsConfirm, true);
});

test('amend: an edited word-only or range target is no longer reported as a conversion', () => {
    const plan = amendPlan((d) => {
        TVM.setDraftValue(d, 'app_Color_Shade', 7);
        TVM.setDraftValue(d, 'tex_Thickness-Oral', 7);
    });
    const w = plan.warnings.join('\n');
    assert.ok(!/Color Shade \(high/.test(w), w);
    assert.match(w, /Curiosity \(high -> 8\)/);
    assert.ok(!/range 5-7/.test(w), w);
    assert.equal(plan.changes.edited, 2);
});

test('amend: invalid values block; nothing left blocks; alias-only codes use the crosswalk key', () => {
    const bad = amendPlan((d) => TVM.setDraftValue(d, 'fom_Sweetness', 11));
    assert.match(bad.blocking, /0-10/);
    const nan = amendPlan((d) => TVM.setDraftValue(d, 'fom_Sweetness', 'abc'));
    assert.match(nan.blocking, /0-10/);
    const none = amendPlan((d) => { for (const c of Object.keys(d.entries)) TVM.removeDraftTarget(d, c); });
    assert.match(none.blocking, /at least one target/i);
    // decimals are kept to one decimal place
    const dec = amendPlan((d) => TVM.setDraftValue(d, 'fom_Sweetness', '6.25'));
    assert.equal(dec.payload.stages.frontMouth.sweetness, 6.3);
});

test('amend: re-adding a removed target restores it; editing back to the base value is not a change', () => {
    const plan = amendPlan((d) => {
        TVM.removeDraftTarget(d, 'fom_Sweetness');
        TVM.addDraftTarget(d, { code: 'fom_Sweetness' }, 3);
        TVM.setDraftValue(d, 'overall_trig_moreishness', 9);
        TVM.setDraftValue(d, 'overall_trig_moreishness', 8);
    });
    assert.deepEqual(plan.changes, { edited: 0, added: 0, removed: 0 });
    assert.equal(plan.payload.stages.frontMouth.sweetness, 3);
});

// ---------- RPC sequences (strict mock) ----------

test('strict mock registers every RPC the view uses in the right schema', () => {
    assert.equal(SCHEMA_OF_RPC.get_version_results, 'public');
    assert.equal(SCHEMA_OF_RPC.create_version_from_signature, 'tss_shared');
});

function mockClient({ versions = VERSIONS, resultsById = null, rpcCalls = [], createResult = null, createError = null, versionsError = null } = {}) {
    const byId = resultsById || { [V1]: results({ version_id: V1, version_number: 1 }), [V2]: results({ n_sessions: 0, studies: [], attributes: [] }), [V3]: results({ version_id: V3, version_number: 3, n_sessions: 0, studies: [], attributes: [] }) };
    return makeStrictClient({
        tables: {
            project_versions: (f) => (versionsError ? { data: null, error: versionsError } : { data: f.project_id === PROJECT_ID ? versions : [], error: null }),
            targets: (f) => ({ data: f.version_id === V1 ? v1Targets() : [], error: null }),
            version_stage_notes: (f) => ({ data: f.version_id === V1 ? [{ stage_key: 'ap', notes: 'glossy' }] : [], error: null }),
            qep_attribute: (f) => ({ data: (f.id.in || []).map((id) => ATTRS[id]).filter(Boolean), error: null }),
        },
        rpcImpl: (name, params) => {
            rpcCalls.push({ name, params });
            if (name === 'get_version_results') return { data: byId[params.p_version_id] || null, error: byId[params.p_version_id] ? null : { message: 'version not found or not in your organisation' } };
            if (name === 'create_version_from_signature') {
                if (createError) return { data: null, error: createError };
                return { data: createResult || { project_id: PROJECT_ID, version_id: V4, version_number: 4, targets_count: 7, reused_existing_version: false, profile_link: 'already_linked', unmapped_keys: [], skipped_zero_emotions: 0 }, error: null };
            }
            return { data: null, error: { message: `unexpected rpc ${name}` } };
        },
    });
}

function deps(mock, extra = {}) {
    return { config: FLAG_ON, getClient: () => mock.client, isDemo: () => false, fetchCrosswalk: async () => ({ rows: CROSSWALK }), ...extra };
}

test('load: versions (tss_shared) -> crosswalk -> get_version_results per locked version -> targets + notes + labels', async () => {
    const rpcCalls = [];
    const mock = mockClient({ rpcCalls });
    const m = await TVM.loadTargetVsMeasured(experience(), deps(mock));
    assert.equal(m.state, 'ok');
    assert.deepEqual(mock.violations, []);
    assert.deepEqual(rpcCalls.map((c) => c.params.p_version_id).sort(), [V1, V2, V3].sort(), 'drafts are never queried');
    assert.equal(m.targetVersionId, V1);
    assert.equal(m.targetChoice, 'source_version');
    assert.equal(m.resultsVersionId, V1);
    assert.equal(m.notes.appearance, 'glossy');
    assert.equal(m.targets.length, 9);
    const tables = mock.queries.map((q) => `${q.schema}.${q.table}`);
    assert.ok(tables.includes('tss_shared.project_versions'));
    assert.ok(tables.includes('tss_shared.targets'));
    assert.ok(tables.includes('tss_shared.version_stage_notes'));
    assert.ok(tables.includes('public.qep_attribute'));
    const labelsQuery = mock.queries.find((q) => q.table === 'qep_attribute');
    assert.ok(labelsQuery.filters.id.in.includes('app_Visual_Appeal'), 'Signature-only codes get their labels too');
    const cmp = TVM.buildComparison({ ...m, experience: experience(), rules: TVM.resolveRules({}) });
    assert.equal(rowOf(cmp, 'app_Visual_Appeal').row.label, 'Visual Appeal');
});

test('load: another org\'s project is not visible -> refused with a clear message, no RPC', async () => {
    const rpcCalls = [];
    const mock = mockClient({ rpcCalls });
    const m = await TVM.loadTargetVsMeasured(experience({ tssProjectId: OTHER_PROJECT_ID }), deps(mock));
    assert.equal(m.state, 'error');
    assert.match(m.message, /not in your organisation/);
    assert.equal(rpcCalls.length, 0);
});

test('load: no locked versions; crosswalk failure (warning, Amend disabled); unlinked; network error', async () => {
    const none = await TVM.loadTargetVsMeasured(experience(), deps(mockClient({ versions: [{ id: V4, version_number: 4, status: 'draft' }] })));
    assert.equal(none.state, 'no_locked_versions');
    const noXw = await TVM.loadTargetVsMeasured(experience(), deps(mockClient(), { fetchCrosswalk: async () => ({ error: 'boom' }) }));
    assert.equal(noXw.state, 'ok');
    assert.match(noXw.warning, /crosswalk/i);
    assert.equal(noXw.amendAvailable, false);
    const unlinked = await TVM.loadTargetVsMeasured(experience({ tssProjectId: null }), deps(mockClient()));
    assert.equal(unlinked.state, 'not_linked');
    const net = await TVM.loadTargetVsMeasured(experience(), deps(mockClient({ versionsError: { message: 'Failed to fetch' } })));
    assert.equal(net.state, 'error');
    assert.match(net.message, /Could not reach QEP/);
});

test('load: switching the target version reloads only that version\'s targets', async () => {
    const rpcCalls = [];
    const mock = mockClient({ rpcCalls });
    const m = await TVM.loadTargetVsMeasured(experience(), deps(mock));
    const before = rpcCalls.length;
    const m2 = await TVM.switchTargetVersion(m, V3, deps(mock));
    assert.equal(rpcCalls.length, before, 'no RPC for a target switch');
    assert.equal(m2.targetVersionId, V3);
    assert.equal(m2.targetChoice, 'selected');
    assert.equal(m2.targets.length, 0);
    assert.deepEqual(mock.violations, []);
});

test('demo mode fails fast: no client, no query, no RPC (load and amend)', async () => {
    let touched = false;
    const d = { config: FLAG_ON, isDemo: () => true, getClient: () => { touched = true; throw new Error('should not be called'); } };
    const m = await TVM.loadTargetVsMeasured(experience(), d);
    assert.equal(m.state, 'error');
    assert.match(m.message, /demo mode/i);
    const plan = amendPlan((dr) => TVM.setDraftValue(dr, 'fom_Sweetness', 5));
    const r = await TVM.runAmend(experience(), plan, d);
    assert.equal(r.status, 'error');
    assert.match(r.message, /demo mode/i);
    assert.equal(touched, false);
});

test('amend RPC: exactly one create_version_from_signature (tss_shared), no study, no new experience', async () => {
    const rpcCalls = [];
    const mock = mockClient({ rpcCalls });
    const exp = experience();
    const experiences = [exp];
    const saves = [];
    const plan = amendPlan((d) => TVM.setDraftValue(d, 'fom_Sweetness', 5), { experience: exp });
    const r = await TVM.runAmend(exp, plan, deps(mock, { save: (e) => saves.push(e) }));
    assert.equal(r.status, 'ok');
    assert.equal(r.version.version_number, 4);
    assert.equal(r.reused, false);
    assert.deepEqual(rpcCalls.map((c) => c.name), ['create_version_from_signature']);
    assert.deepEqual(rpcCalls[0].params, { payload: plan.payload });
    assert.deepEqual(mock.violations, []);
    // Firestore side: the linked experience keeps its link (applyCaptureLink
    // never overwrites), nothing is saved, nothing is added.
    assert.equal(experiences.length, 1);
    assert.equal(experiences[0], exp);
    assert.equal(exp.tssProjectId, PROJECT_ID);
    assert.equal(exp.sourceVersionId, V1);
    assert.equal(saves.length, 0);
    assert.equal(r.linkChanged, false);
});

test('amend RPC: reused version is reported as "no change"; a mismatching project is refused', async () => {
    const reused = mockClient({ createResult: { project_id: PROJECT_ID, version_id: V4, version_number: 4, targets_count: 7, reused_existing_version: true } });
    const plan = amendPlan((d) => TVM.setDraftValue(d, 'fom_Sweetness', 5));
    const r = await TVM.runAmend(experience(), plan, deps(reused));
    assert.equal(r.status, 'ok');
    assert.equal(r.reused, true);
    assert.match(TVM.amendSuccessMessage(r), /already has exactly these targets/);
    const wrong = mockClient({ createResult: { project_id: OTHER_PROJECT_ID, version_id: V4, version_number: 1 } });
    const w = await TVM.runAmend(experience(), plan, deps(wrong));
    assert.equal(w.status, 'error');
    assert.match(w.message, /different project/);
});

test('amend RPC: blocking plan and a payload for another project never reach the RPC', async () => {
    const rpcCalls = [];
    const mock = mockClient({ rpcCalls });
    const bad = amendPlan((d) => TVM.setDraftValue(d, 'fom_Sweetness', 12));
    assert.equal((await TVM.runAmend(experience(), bad, deps(mock))).status, 'error');
    const plan = amendPlan((d) => TVM.setDraftValue(d, 'fom_Sweetness', 5));
    const r = await TVM.runAmend(experience({ tssProjectId: OTHER_PROJECT_ID }), plan, deps(mock));
    assert.equal(r.status, 'error');
    assert.equal(rpcCalls.length, 0);
});

test('amend RPC: an unlinked-profile result goes through applyCaptureLink rules and saves at most once', async () => {
    // A linked experience never changes; the rules are SendToCapture's.
    const mock = mockClient({ createResult: { project_id: PROJECT_ID, version_id: V4, version_number: 4, targets_count: 7, profile_link: 'set' } });
    const exp = experience({ sourceVersionId: null });
    const saves = [];
    const plan = amendPlan((d) => TVM.setDraftValue(d, 'fom_Sweetness', 5), { experience: exp });
    const r = await TVM.runAmend(exp, plan, deps(mock, { save: (e) => saves.push(e) }));
    assert.equal(r.status, 'ok');
    assert.equal(exp.sourceVersionId, null, 'applyCaptureLink never touches an experience that already has tssProjectId');
    assert.equal(saves.length, 0);
});

test('amend errors map to clear messages', () => {
    assert.match(TVM.mapAmendError({ message: 'experience.tssProjectId 1 is not a project in your organisation' }), /not in your organisation/);
    assert.match(TVM.mapAmendError({ message: 'profile was deleted' }), /deleted/);
    assert.match(TVM.mapAmendError({ message: 'no measured values to send to Capture' }), /at least one/i);
    assert.match(TVM.mapAmendError({ message: 'Failed to fetch' }), /Could not reach QEP/);
    assert.match(TVM.mapAmendError({ code: 'QEP_DEMO_MODE', message: 'x' }), /demo mode/i);
    assert.match(TVM.mapAmendError({ message: 'weird' }), /weird/);
});

test('amend controller: a double click sends once', async () => {
    let resolveRpc;
    const calls = [];
    const client = {
        schema: () => ({ rpc: (name, params) => { calls.push(name); return new Promise((res) => { resolveRpc = res; }); } }),
    };
    const ctl = TVM.createAmendController({ config: FLAG_ON, getClient: () => client, isDemo: () => false });
    const plan = amendPlan((d) => TVM.setDraftValue(d, 'fom_Sweetness', 5));
    const p1 = ctl.submit(experience(), plan);
    const p2 = await ctl.submit(experience(), plan);
    assert.equal(p2.status, 'busy');
    resolveRpc({ data: { project_id: PROJECT_ID, version_id: V4, version_number: 4 }, error: null });
    assert.equal((await p1).status, 'ok');
    assert.equal(calls.length, 1);
});

// ---------- HTML ----------

test('html: escapes labels and notes; statuses are text, not colour only', async () => {
    const mock = mockClient();
    const m = await TVM.loadTargetVsMeasured(experience(), deps(mock));
    m.notes.appearance = '<img src=x onerror=alert(1)>';
    const html = TVM.buildTargetVsMeasuredHtml(m, { experience: experience(), rules: TVM.resolveRules({}) });
    assert.ok(!html.includes('<img src=x'));
    assert.match(html, /&lt;img src=x/);
    assert.match(html, /Bitterness &lt;b&gt;/);
    assert.match(html, />On target</);
    assert.match(html, />Under</);
    assert.match(html, /No numeric target|high \(no number\)/);
    assert.match(html, /67% selected \(4 of 6\)/);
    assert.ok(!/Curiosity[^<]*<\/td>\s*<td[^>]*>[^<]*6\.7/.test(html), 'a CATA share is never shown as 0-10');
    assert.match(html, /Appearance[\s\S]*Front of Mouth[\s\S]*Mid\/Rear Mouth[\s\S]*Texture[\s\S]*Aftertaste[\s\S]*Overall/);
    assert.match(html, /Tolerance/);
    assert.match(html, /data-tvm-action="toggle-amend"/);
});

test('html: amend mode shows inputs, the plan warnings and a Create next version button', async () => {
    const mock = mockClient();
    const m = await TVM.loadTargetVsMeasured(experience(), deps(mock));
    const draft = TVM.createDraft(m.targets);
    TVM.setDraftValue(draft, 'fom_Sweetness', 5);
    const plan = TVM.buildAmendPlan({ draft, experience: experience(), projectId: PROJECT_ID, baseVersion: { id: V1, versionNumber: 1 }, notes: m.notes, indexes: m.indexes });
    const html = TVM.buildTargetVsMeasuredHtml(m, { experience: experience(), rules: TVM.resolveRules({}), editing: true, draft, plan });
    assert.match(html, /data-tvm-action="set-value"/);
    assert.match(html, /data-tvm-action="remove"/);
    assert.match(html, /data-tvm-action="add"/);
    assert.match(html, /Create next version/);
    assert.match(html, /will not be in the new version/i);
    assert.match(html, /data-tvm-action="confirm-drops"/);
});

test('rows: targets first, then consumer-only, then Signature-only; kinds grouped inside each', () => {
    const cmp = comparison();
    const ap = cmp.stages.find((s) => s.stageId === 'appearance').rows.map((r) => r.code);
    assert.deepEqual(ap, ['app_Color_Shade', 'ap_emo_curiosity', 'ap_emo_excitement', 'ap_emo_joy', 'app_Visual_Appeal']);
    const ov = cmp.stages.find((s) => s.stageId === 'overall').rows.map((r) => r.code);
    assert.equal(ov[0], 'overall_trig_moreishness');
});

test('html: a code missing from the results says "No answers"; the Signature-only filter is optional and off by default', async () => {
    const m = await TVM.loadTargetVsMeasured(experience(), deps(mockClient()));
    const all = TVM.buildTargetVsMeasuredHtml(m, { experience: experience(), rules: TVM.resolveRules({}) });
    assert.match(all, /No answers/);
    assert.ok(!/Not asked/.test(all));
    assert.match(all, /Visual Appeal/);
    assert.match(all, /data-tvm-action="hide-signature-only"/);
    const hidden = TVM.buildTargetVsMeasuredHtml(m, { experience: experience(), rules: TVM.resolveRules({}), hideSignatureOnly: true });
    assert.ok(!/Visual Appeal/.test(hidden));
    assert.match(hidden, /row\(s\) with only a Signature score hidden/);
    assert.match(hidden, /Color Shade/);
});

test('html: loading, not linked, no locked versions, error states', () => {
    assert.match(TVM.buildTargetVsMeasuredHtml({ state: 'loading' }), /Loading/);
    assert.match(TVM.buildTargetVsMeasuredHtml({ state: 'not_linked' }), /not linked/);
    assert.match(TVM.buildTargetVsMeasuredHtml({ state: 'no_locked_versions' }), /no locked versions/);
    assert.match(TVM.buildTargetVsMeasuredHtml({ state: 'error', message: '<b>x</b>' }), /&lt;b&gt;x/);
});
