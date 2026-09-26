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
        { variable_key: 'fom_Sweetness', role: 'primary', intensity: null, range_min: 3, range_max: 3, direction: 'lower', importance: 'must', notes: 'less sugar than v0' },
        { variable_key: 'tex_Thickness-Oral', role: 'secondary', intensity: null, range_min: 5, range_max: 7, direction: null, importance: 'nice', notes: null },
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

test('score threshold: the default tolerance is +-1.0 and its edges are inclusive (Signature and consumer means)', () => {
    const rules = TVM.resolveRules({});
    assert.equal(rules.tolerance, 1);
    const t = { type: 'numeric', min: 6, max: 6 };
    assert.equal(TVM.classifyValue(5, t, rules).status, 'on_target');
    assert.equal(TVM.classifyValue(7, t, rules).status, 'on_target');
    assert.deepEqual(TVM.classifyValue(4.9, t, rules), { status: 'under', delta: -1.1 });
    assert.deepEqual(TVM.classifyValue(7.1, t, rules), { status: 'over', delta: 1.1 });
    assert.equal(TVM.classifyValue(3.8 + 1.2, t, rules).status, 'on_target', 'float noise at the edge');
});

test('emotion threshold: a numeric target t expects t x 10 % selected, on target within +-10pp (both sides)', () => {
    const rules = TVM.resolveRules({});
    assert.equal(rules.emotionTolerancePp, 10);
    const hi = { type: 'numeric', min: 8, max: 8 };
    assert.deepEqual(TVM.expectedSelected(hi), { min: 80, max: 80, oneSided: null });
    assert.equal(TVM.classifyCata(0.8, 6, hi, rules).status, 'on_target');
    assert.equal(TVM.classifyCata(0.7, 10, hi, rules).status, 'on_target', 'lower edge inclusive');
    assert.equal(TVM.classifyCata(0.9, 10, hi, rules).status, 'on_target', 'upper edge inclusive');
    const under = TVM.classifyCata(0.69, 100, hi, rules);
    assert.equal(under.status, 'under');
    assert.equal(under.deltaPp, -11);
    assert.match(under.detail, /69% selected, expected 80% \+\/- 10pp/);
    const over = TVM.classifyCata(0.91, 100, hi, rules);
    assert.equal(over.status, 'over');
    assert.equal(over.deltaPp, 11);
    // mid-scale targets are compared now (the old "4-6 not compared" rule is gone)
    const mid = { type: 'numeric', min: 5, max: 5 };
    assert.equal(TVM.classifyCata(0.4, 10, mid, rules).status, 'on_target');
    assert.equal(TVM.classifyCata(0.6, 10, mid, rules).status, 'on_target');
    assert.equal(TVM.classifyCata(0.39, 100, mid, rules).status, 'under');
    assert.equal(TVM.classifyCata(0.61, 100, mid, rules).status, 'over');
    // 0 expects 0%: at most 10% selected
    assert.equal(TVM.classifyCata(0.1, 10, { type: 'numeric', min: 0, max: 0 }, rules).status, 'on_target');
    assert.equal(TVM.classifyCata(0.11, 100, { type: 'numeric', min: 0, max: 0 }, rules).status, 'over');
    // a range target expects a band: 5-7 -> 50-70 %, +-10pp
    const range = { type: 'numeric', min: 5, max: 7 };
    assert.deepEqual(TVM.expectedSelected(range), { min: 50, max: 70, oneSided: null });
    assert.equal(TVM.classifyCata(0.4, 10, range, rules).status, 'on_target');
    assert.equal(TVM.classifyCata(0.8, 10, range, rules).status, 'on_target');
    assert.equal(TVM.classifyCata(0.39, 100, range, rules).status, 'under');
    assert.equal(TVM.classifyCata(0.81, 100, range, rules).status, 'over');
    // no data / no numeric target
    assert.equal(TVM.classifyCata(0.6, 0, hi, rules).status, 'no_data');
    assert.equal(TVM.classifyCata(null, 6, hi, rules).status, 'no_data');
    assert.equal(TVM.classifyCata(0.6, 6, { type: 'none' }, rules).status, 'no_numeric_target');
    assert.equal(TVM.classifyCata(0.6, 6, null, rules).status, 'no_target');
    // a CATA proportion is never turned into a 0-10 value
    assert.equal(TVM.classifyCata(0.667, 6, hi, rules).delta, undefined);
});

test('emotion threshold: word-only targets expect the marker value x 10 (high 80%, low 20%), one-sided +-10pp', () => {
    const rules = TVM.resolveRules({});
    const high = { type: 'legacy', intensity: 'high' };
    const low = { type: 'legacy', intensity: 'low' };
    assert.deepEqual(TVM.expectedSelected(high), { min: 80, max: 80, oneSided: 'at_least' });
    assert.deepEqual(TVM.expectedSelected(low), { min: 20, max: 20, oneSided: 'at_most' });
    assert.equal(TVM.classifyCata(0.7, 10, high, rules).status, 'on_target');
    assert.equal(TVM.classifyCata(1, 10, high, rules).status, 'on_target', 'high is never "over"');
    assert.equal(TVM.classifyCata(0.69, 100, high, rules).status, 'under');
    assert.equal(TVM.classifyCata(0.3, 10, low, rules).status, 'on_target');
    assert.equal(TVM.classifyCata(0, 10, low, rules).status, 'on_target', 'low is never "under"');
    assert.equal(TVM.classifyCata(0.31, 100, low, rules).status, 'over');
    assert.equal(TVM.expectedSelected({ type: 'legacy', intensity: 'medium' }), null);
    assert.equal(TVM.classifyCata(0.5, 10, { type: 'legacy', intensity: 'medium' }, rules).status, 'no_numeric_target');
});

test('emotion threshold: +-pp is configurable (config and view); invalid values fall back to 10', () => {
    const hi = { type: 'numeric', min: 8, max: 8 };
    const r5 = TVM.resolveRules({}, { emotionTolerancePp: 5 });
    assert.equal(r5.emotionTolerancePp, 5);
    assert.equal(TVM.classifyCata(0.75, 4, hi, r5).status, 'on_target');
    assert.equal(TVM.classifyCata(0.74, 100, hi, r5).status, 'under');
    assert.equal(TVM.resolveRules({ TARGET_VS_MEASURED_EMOTION_TOLERANCE_PP: 15 }).emotionTolerancePp, 15);
    assert.equal(TVM.resolveRules({ TARGET_VS_MEASURED_EMOTION_TOLERANCE_PP: 15 }, { emotionTolerancePp: 20 }).emotionTolerancePp, 20);
    assert.equal(TVM.resolveRules({ TARGET_VS_MEASURED_EMOTION_TOLERANCE_PP: 'x' }).emotionTolerancePp, 10);
    assert.equal(TVM.resolveRules({}, { emotionTolerancePp: -1 }).emotionTolerancePp, 10);
    assert.equal(TVM.resolveRules({}, { emotionTolerancePp: 101 }).emotionTolerancePp, 10);
    // the old >=50% / <=20% rule is gone
    assert.equal(TVM.DEFAULT_RULES.emotionHighMinSelected, undefined);
    assert.equal(TVM.DEFAULT_RULES.emotionLowMaxSelected, undefined);
});

test('rules: config tolerance and view overrides are validated; bad values fall back to defaults', () => {
    assert.equal(TVM.resolveRules({}).tolerance, 1);
    assert.equal(TVM.resolveRules({ TARGET_VS_MEASURED_TOLERANCE: 0.5 }).tolerance, 0.5);
    assert.equal(TVM.resolveRules({ TARGET_VS_MEASURED_TOLERANCE: 'x' }).tolerance, 1);
    assert.equal(TVM.resolveRules({}, { tolerance: 2 }).tolerance, 2);
    assert.equal(TVM.resolveRules({}, { tolerance: -1 }).tolerance, 1);
    assert.equal(TVM.resolveRules({}, { tolerance: 99 }).tolerance, 1);
});

test('prefs: persisted per browser; a throwing or empty storage never breaks the view', () => {
    const mem = new Map();
    const storage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)) };
    assert.deepEqual(TVM.loadPrefs(storage), {});
    TVM.savePrefs(storage, { tolerance: 1.5, emotionTolerancePp: 5 });
    assert.deepEqual(TVM.loadPrefs(storage), { tolerance: 1.5, emotionTolerancePp: 5 });
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
    const cu = rowOf(cmp, 'ap_emo_curiosity').row;    // word-only high: expects 80%, at least 70%
    assert.equal(cu.signature.value, 7);
    assert.equal(cu.sigGap.status, 'on_target');
    assert.equal(cu.conGap.status, 'under');          // 66.7% < 70%
    assert.match(cu.conGap.detail, /67% selected, expected at least 70% \(high = 80%/);
    const ex = rowOf(cmp, 'ap_emo_excitement').row;   // target 8: expects 80% +-10pp
    assert.equal(ex.signature.status, 'not_rated');
    assert.equal(ex.conGap.status, 'under');          // 16.7% < 70%
    const sa = rowOf(cmp, 'af_emo_satisfaction').row; // target 8, sig 8, 0% selected
    assert.equal(sa.sigGap.status, 'on_target');
    assert.equal(sa.conGap.status, 'under');
    // a target of 5 is compared (50% +-10pp), not skipped
    const five = comparison({ targets: TVM.shapeTargetRows([{ variable_key: 'ap_emo_curiosity', role: 'primary', range_min: 6, range_max: 6 }], ATTRS) });
    assert.equal(rowOf(five, 'ap_emo_curiosity').row.conGap.status, 'on_target'); // 66.7% vs 60% +-10pp
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

// ---------- Amend: draft + payload (create_version_from_targets, qep-capture 0043) ----------

// version_stage_notes rows of V1, raw qep_stage keys.
function v1Notes() {
    return [{ stage_key: 'ap', notes: 'glossy; deep brown' }, { stage_key: 'af', notes: 'clean finish' }];
}

// The exact p_targets element for a tss_shared.targets row (contract shape).
function element(row) {
    return {
        variable_key: row.variable_key,
        role: row.role,
        range_min: row.range_min === undefined ? null : row.range_min,
        range_max: row.range_max === undefined ? null : row.range_max,
        intensity: row.intensity || null,
        direction: row.direction === undefined ? null : row.direction,
        importance: row.importance === undefined ? null : row.importance,
        notes: row.notes === undefined ? null : row.notes,
    };
}

function amendPlan(mutate, opts = {}) {
    const targets = opts.targets || shapedTargets();
    const draft = TVM.createDraft(targets, opts.notes || v1Notes());
    if (mutate) mutate(draft);
    return TVM.buildAmendPlan({
        draft,
        experience: opts.experience || experience(),
        projectId: PROJECT_ID,
        baseVersion: { id: V1, versionNumber: 1 },
    });
}

test('amend payload: exactly the five 0043 parameters, attributed to this experience', () => {
    const plan = amendPlan((d) => TVM.setDraftValue(d, 'fom_Sweetness', 5));
    assert.equal(plan.blocking, null);
    const p = plan.payload;
    assert.deepEqual(Object.keys(p).sort(), ['p_base_version_id', 'p_project_id', 'p_source_experience_id', 'p_stage_notes', 'p_targets']);
    assert.equal(p.p_project_id, PROJECT_ID);
    assert.equal(p.p_base_version_id, V1);
    assert.equal(p.p_source_experience_id, '1777019020364.0994', 'float id as text, never truncated');
});

test('amend payload: an unedited plan carries the base version EXACTLY (roles, ranges, words, direction/importance/notes, codes with no slider, stage notes)', () => {
    const plan = amendPlan(null);
    assert.deepEqual(plan.payload.p_targets, v1Targets().map(element));
    assert.deepEqual(plan.payload.p_stage_notes, v1Notes());
    const byCode = Object.fromEntries(plan.payload.p_targets.map((t) => [t.variable_key, t]));
    assert.equal(byCode['tex_Thickness-Oral'].role, 'secondary');
    assert.equal(byCode['tex_Thickness-Oral'].range_min, 5);
    assert.equal(byCode['tex_Thickness-Oral'].range_max, 7);
    assert.equal(byCode['app_Color_Shade'].intensity, 'high');
    assert.equal(byCode['app_Color_Shade'].range_min, null);
    assert.equal(byCode['fom_Sweetness'].direction, 'lower');
    assert.equal(byCode['fom_Sweetness'].importance, 'must');
    assert.equal(byCode['fom_Sweetness'].notes, 'less sugar than v0');
    assert.ok(byCode['mr_Bitterness'], 'a code with no Signature slider is carried');
    assert.ok(byCode['ap_emo_joy'], 'a code whose crosswalk row is for another stage is carried');
    assert.deepEqual(plan.changes, { edited: 0, added: 0, removed: 0, notes: 0 });
    assert.equal(plan.changeCount, 0);
    // nothing is dropped or converted any more, so there is nothing to confirm
    assert.equal(plan.dropped, undefined);
    assert.equal(plan.needsConfirm, undefined);
});

test('amend payload: edits applied (point -> min = max, range -> min/max), additions appended, removals absent', () => {
    const plan = amendPlan((d) => {
        TVM.setDraftValue(d, 'fom_Sweetness', 5);                  // point
        TVM.setDraftRange(d, 'tex_Thickness-Oral', 'min', 4);      // range
        TVM.setDraftRange(d, 'tex_Thickness-Oral', 'max', '6.5');
        TVM.setDraftValue(d, 'af_emo_satisfaction', 0);            // emotion 0 is a real target now
        TVM.removeDraftTarget(d, 'ap_emo_excitement');
        TVM.addDraftTarget(d, { code: 'app_Visual_Appeal', kind: 'sensory', stageId: 'appearance', label: 'Visual Appeal' }, 8);
    });
    assert.equal(plan.blocking, null);
    assert.deepEqual(plan.changes, { edited: 3, added: 1, removed: 1, notes: 0 });
    const t = plan.payload.p_targets;
    const byCode = Object.fromEntries(t.map((x) => [x.variable_key, x]));
    assert.deepEqual(byCode.fom_Sweetness, { variable_key: 'fom_Sweetness', role: 'primary', range_min: 5, range_max: 5, intensity: null, direction: 'lower', importance: 'must', notes: 'less sugar than v0' });
    assert.deepEqual(byCode['tex_Thickness-Oral'], { variable_key: 'tex_Thickness-Oral', role: 'secondary', range_min: 4, range_max: 6.5, intensity: null, direction: null, importance: 'nice', notes: null });
    assert.equal(byCode.af_emo_satisfaction.range_min, 0);
    assert.equal(byCode.af_emo_satisfaction.range_max, 0);
    assert.equal(byCode.ap_emo_excitement, undefined);
    assert.deepEqual(t[t.length - 1], { variable_key: 'app_Visual_Appeal', role: 'primary', range_min: 8, range_max: 8, intensity: null, direction: null, importance: null, notes: null });
    assert.equal(t.length, 9);
    // untouched rows are carried unchanged
    assert.deepEqual(byCode.mr_Bitterness, element(v1Targets().find((r) => r.variable_key === 'mr_Bitterness')));
});

test('amend payload: word-only targets keep their word; a number replaces it; the word can be switched', () => {
    const kept = amendPlan(null).payload.p_targets.find((x) => x.variable_key === 'ap_emo_curiosity');
    assert.deepEqual([kept.intensity, kept.range_min, kept.range_max], ['high', null, null]);
    const plan = amendPlan((d) => {
        TVM.setDraftValue(d, 'app_Color_Shade', 7);
        TVM.setDraftIntensity(d, 'ap_emo_curiosity', 'low');
    });
    const byCode = Object.fromEntries(plan.payload.p_targets.map((x) => [x.variable_key, x]));
    assert.deepEqual([byCode.app_Color_Shade.intensity, byCode.app_Color_Shade.range_min, byCode.app_Color_Shade.range_max], [null, 7, 7]);
    assert.deepEqual([byCode.ap_emo_curiosity.intensity, byCode.ap_emo_curiosity.range_min], ['low', null]);
    assert.equal(plan.changes.edited, 2);
    // clearing the number on a word-only target restores the word
    const back = amendPlan((d) => { TVM.setDraftValue(d, 'app_Color_Shade', 7); TVM.setDraftValue(d, 'app_Color_Shade', ''); });
    assert.equal(back.changeCount, 0);
    assert.equal(back.payload.p_targets.find((x) => x.variable_key === 'app_Color_Shade').intensity, 'high');
});

test('amend payload: stage notes can be edited, added and cleared (blank = absent)', () => {
    const plan = amendPlan((d) => {
        TVM.setDraftNotes(d, 'ap', 'glossy, darker brown');
        TVM.setDraftNotes(d, 'af', '   ');
        TVM.setDraftNotes(d, 'fm', 'sweet first');
    });
    assert.deepEqual(plan.payload.p_stage_notes, [{ stage_key: 'ap', notes: 'glossy, darker brown' }, { stage_key: 'fm', notes: 'sweet first' }]);
    assert.equal(plan.changes.notes, 3);
    assert.equal(plan.changeCount, 3);
    assert.equal(TVM.stageKeyOf('frontMouth'), 'fm');
    assert.equal(TVM.stageKeyOf('overall'), 'overall');
});

test('amend payload: never carries the experience\'s own slider values, never mutates the experience', () => {
    const exp = experience();
    const before = JSON.stringify(exp);
    const plan = amendPlan(null, { experience: exp });
    assert.equal(JSON.stringify(exp), before);
    const codes = plan.payload.p_targets.map((t) => t.variable_key);
    assert.ok(!codes.includes('app_Visual_Appeal'), 'Signature rated visualAppeal 9 but it is not a target');
    assert.equal(plan.payload.p_targets.find((t) => t.variable_key === 'overall_trig_moreishness').range_min, 8, 'target 8, not the slider 9');
    assert.ok(!JSON.stringify(plan.payload).includes('unknownThing'));
});

test('amend: invalid values block; min > max blocks; an empty number blocks; nothing left blocks', () => {
    assert.match(amendPlan((d) => TVM.setDraftValue(d, 'fom_Sweetness', 11)).blocking, /0-10/);
    assert.match(amendPlan((d) => TVM.setDraftValue(d, 'fom_Sweetness', 'abc')).blocking, /0-10/);
    assert.match(amendPlan((d) => TVM.setDraftValue(d, 'fom_Sweetness', '')).blocking, /Sweetness/);
    assert.match(amendPlan((d) => TVM.setDraftRange(d, 'tex_Thickness-Oral', 'min', 8)).blocking, /min.*max|range/i);
    const none = amendPlan((d) => { for (const c of Object.keys(d.entries)) TVM.removeDraftTarget(d, c); });
    assert.match(none.blocking, /at least one target/i);
    assert.equal(none.payload, null);
    const dec = amendPlan((d) => TVM.setDraftValue(d, 'fom_Sweetness', '6.25'));
    assert.equal(dec.payload.p_targets.find((t) => t.variable_key === 'fom_Sweetness').range_min, 6.25);
});

test('amend: re-adding a removed target restores it; editing back to the base value is not a change', () => {
    const plan = amendPlan((d) => {
        TVM.removeDraftTarget(d, 'fom_Sweetness');
        TVM.addDraftTarget(d, { code: 'fom_Sweetness' });
        TVM.setDraftValue(d, 'overall_trig_moreishness', 9);
        TVM.setDraftValue(d, 'overall_trig_moreishness', 8);
        TVM.setDraftNotes(d, 'ap', 'x');
        TVM.setDraftNotes(d, 'ap', 'glossy; deep brown');
    });
    assert.deepEqual(plan.changes, { edited: 0, added: 0, removed: 0, notes: 0 });
    assert.deepEqual(plan.payload.p_targets, v1Targets().map(element));
});

// ---------- RPC sequences (strict mock) ----------

test('strict mock registers every RPC the view uses in the right schema', () => {
    assert.equal(SCHEMA_OF_RPC.get_version_results, 'public');
    assert.equal(SCHEMA_OF_RPC.create_version_from_targets, 'tss_shared');
});

test('the old 0038-based Amend path and its "can\'t carry" confirmation are gone', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'target-vs-measured.js'), 'utf8');
    assert.ok(!/rpc\('create_version_from_signature'/.test(src));
    assert.ok(!/I understand the points above/.test(src));
    assert.ok(!/confirm-drops/.test(src));
    assert.match(src, /rpc\('create_version_from_targets'/);
});

function mockClient({ versions = VERSIONS, resultsById = null, rpcCalls = [], createResult = null, createError = null, versionsError = null } = {}) {
    const byId = resultsById || { [V1]: results({ version_id: V1, version_number: 1 }), [V2]: results({ n_sessions: 0, studies: [], attributes: [] }), [V3]: results({ version_id: V3, version_number: 3, n_sessions: 0, studies: [], attributes: [] }) };
    return makeStrictClient({
        tables: {
            project_versions: (f) => (versionsError ? { data: null, error: versionsError } : { data: f.project_id === PROJECT_ID ? versions : [], error: null }),
            targets: (f) => ({ data: f.version_id === V1 ? v1Targets() : [], error: null }),
            version_stage_notes: (f) => ({ data: f.version_id === V1 ? v1Notes() : [], error: null }),
            qep_attribute: (f) => ({ data: (f.id.in || []).map((id) => ATTRS[id]).filter(Boolean), error: null }),
        },
        rpcImpl: (name, params) => {
            rpcCalls.push({ name, params });
            if (name === 'get_version_results') return { data: byId[params.p_version_id] || null, error: byId[params.p_version_id] ? null : { message: 'version not found or not in your organisation' } };
            if (name === 'create_version_from_targets') {
                if (createError) return { data: null, error: createError };
                return { data: createResult || { project_id: PROJECT_ID, version_id: V4, version_number: 4, base_version_id: V1, reused_existing_version: false, targets_count: 9, stage_notes_count: 2 }, error: null };
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
    assert.equal(m.notes.appearance, 'glossy; deep brown');
    assert.deepEqual(m.stageNotes, v1Notes(), 'raw stage notes kept for Amend');
    assert.equal(m.targets.length, 9);
    const tq = mock.queries.find((q) => q.table === 'targets');
    for (const col of ['variable_key', 'role', 'intensity', 'range_min', 'range_max', 'direction', 'importance', 'notes']) {
        assert.ok(tq.select.includes(col), `targets select has ${col}`);
    }
    const sw = m.targets.find((t) => t.code === 'fom_Sweetness');
    assert.deepEqual([sw.direction, sw.importance, sw.notes], ['lower', 'must', 'less sugar than v0']);
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

test('load: no locked versions; crosswalk failure (warning, Amend still available); unlinked; network error', async () => {
    const none = await TVM.loadTargetVsMeasured(experience(), deps(mockClient({ versions: [{ id: V4, version_number: 4, status: 'draft' }] })));
    assert.equal(none.state, 'no_locked_versions');
    const noXw = await TVM.loadTargetVsMeasured(experience(), deps(mockClient(), { fetchCrosswalk: async () => ({ error: 'boom' }) }));
    assert.equal(noXw.state, 'ok');
    assert.match(noXw.warning, /crosswalk/i);
    assert.equal(noXw.amendAvailable, true, 'the 0043 payload carries master codes, so Amend does not need the crosswalk');
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

test('amend RPC: exactly one create_version_from_targets (tss_shared), no study, no new experience', async () => {
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
    assert.deepEqual(rpcCalls.map((c) => c.name), ['create_version_from_targets']);
    assert.deepEqual(rpcCalls[0].params, plan.payload);
    assert.equal(rpcCalls[0].params.p_targets.length, 9);
    assert.deepEqual(rpcCalls[0].params.p_stage_notes, v1Notes());
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
    const reused = mockClient({ createResult: { project_id: PROJECT_ID, version_id: V4, version_number: 4, base_version_id: V1, targets_count: 9, stage_notes_count: 2, reused_existing_version: true } });
    const plan = amendPlan((d) => TVM.setDraftValue(d, 'fom_Sweetness', 5));
    const r = await TVM.runAmend(experience(), plan, deps(reused));
    assert.equal(r.status, 'ok');
    assert.equal(r.reused, true);
    assert.match(TVM.amendSuccessMessage(r), /already has exactly these targets and notes/);
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
    const mock = mockClient({ createResult: { project_id: PROJECT_ID, version_id: V4, version_number: 4, base_version_id: V1, targets_count: 9, stage_notes_count: 2 } });
    const exp = experience({ sourceVersionId: null });
    const saves = [];
    const plan = amendPlan((d) => TVM.setDraftValue(d, 'fom_Sweetness', 5), { experience: exp });
    const r = await TVM.runAmend(exp, plan, deps(mock, { save: (e) => saves.push(e) }));
    assert.equal(r.status, 'ok');
    assert.equal(exp.sourceVersionId, null, 'applyCaptureLink never touches an experience that already has tssProjectId');
    assert.equal(saves.length, 0);
});

test('amend RPC: missing 0043 function -> "Amend is not available on this QEP database yet", nothing created or saved', async () => {
    for (const createError of [
        { code: 'PGRST202', message: 'Could not find the function tss_shared.create_version_from_targets(p_base_version_id, p_project_id, p_source_experience_id, p_stage_notes, p_targets) in the schema cache' },
        { code: 'PGRST202', message: 'x' },
        { message: 'Could not find the function tss_shared.create_version_from_targets' },
    ]) {
        const rpcCalls = [];
        const saves = [];
        const exp = experience();
        const before = JSON.stringify(exp);
        const plan = amendPlan((d) => TVM.setDraftValue(d, 'fom_Sweetness', 5), { experience: exp });
        const r = await TVM.runAmend(exp, plan, deps(mockClient({ rpcCalls, createError }), { save: (e) => saves.push(e) }));
        assert.equal(r.status, 'error');
        assert.match(r.message, /^Amend is not available on this QEP database yet/);
        assert.deepEqual(rpcCalls.map((c) => c.name), ['create_version_from_targets'], 'one attempt, no fallback to another RPC');
        assert.equal(saves.length, 0);
        assert.equal(JSON.stringify(exp), before);
    }
});

test('amend errors map to clear messages', () => {
    assert.match(TVM.mapAmendError({ message: 'not a project in your organisation' }), /not in your organisation/);
    assert.match(TVM.mapAmendError({ message: 'base version is not a locked version of this project' }), /locked version/);
    assert.match(TVM.mapAmendError({ message: 'range_min must be <= range_max' }), /0 to 10|range/i);
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
    // the expected % of an emotion target is shown, so the comparison is transparent
    assert.match(html, /8 \(expects 80% selected\)/);
    assert.match(html, /high \(expects 80% selected, at least 70%\)/);
    assert.match(html, /data-tvm-action="emotion-pp"/);
    assert.match(html, /\+\/- 10 percentage points/);
    assert.ok(!/at least 50%/.test(html) && !/not compared/.test(html), 'the old emotion rule text is gone');
});

test('html: amend mode shows inputs, the plan warnings and a Create next version button', async () => {
    const mock = mockClient();
    const m = await TVM.loadTargetVsMeasured(experience(), deps(mock));
    const draft = TVM.createDraft(m.targets, m.stageNotes);
    TVM.setDraftValue(draft, 'fom_Sweetness', 5);
    const plan = TVM.buildAmendPlan({ draft, experience: experience(), projectId: PROJECT_ID, baseVersion: { id: V1, versionNumber: 1 } });
    const html = TVM.buildTargetVsMeasuredHtml(m, { experience: experience(), rules: TVM.resolveRules({}), editing: true, draft, plan });
    assert.match(html, /data-tvm-action="set-value"/);
    assert.match(html, /data-tvm-action="set-min"/);
    assert.match(html, /data-tvm-action="set-max"/);
    assert.match(html, /data-tvm-action="set-intensity"/);
    assert.match(html, /data-tvm-action="set-notes" data-stage="ap"/);
    assert.match(html, /data-tvm-action="remove"/);
    assert.match(html, /data-tvm-action="add"/);
    assert.match(html, /Create next version/);
    assert.match(html, /1 edited, 0 added, 0 removed/);
    assert.match(html, /9 target\(s\) and 2 stage note/);
    assert.ok(!/will not be in the new version/i.test(html));
    assert.ok(!/confirm-drops/.test(html));
    // the Create button is enabled (no tick needed)
    assert.ok(!/data-tvm-action="create-version" disabled/.test(html));
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
