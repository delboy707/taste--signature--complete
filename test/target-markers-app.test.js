// DOM-level tests for "Start Full Evaluation from this target" markers:
// loads the REAL app.js (+ sensory-attributes.js) in Node, same
// "with(scope){...}" pattern as test/helpers/load-app.js and
// test/target-prefill-app-integration.test.js, against a small fake DOM
// that records inserted/removed nodes. Prefills are built by the REAL
// target-prefill.js from coded targets (Stage 2A.5: variable_key = master
// code, range_min = range_max = target) plus a legacy emotion target.
// No browser, Firestore, or Supabase.
// Run: node test/target-markers-app.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const TargetPrefill = require('../target-prefill.js');

const APP_SRC = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const SENSORY_ATTRIBUTES_SRC = fs.readFileSync(path.join(__dirname, '..', 'sensory-attributes.js'), 'utf8');

// Absorbing stub for anything the fixture does not model explicitly.
function stub(name) {
    const store = { innerHTML: '', value: '', style: {}, dataset: {}, classList: { add() {}, remove() {}, contains: () => false } };
    return new Proxy(function () {}, {
        get(_, prop) {
            if (prop in store) return store[prop];
            if (prop === Symbol.toPrimitive) return () => '';
            if (prop === 'length') return 0;
            if (prop === 'then') return undefined;
            return stub(`${name}.${String(prop)}`);
        },
        set(_, prop, value) { store[prop] = value; return true; },
        apply() { return stub(`${name}()`); },
    });
}

// A minimal recording element. insertAdjacentElement/insertBefore record
// WHERE a node went; remove() flags it. querySelector only resolves the
// children the fixture registered.
function makeFakeDom() {
    const inserted = []; // { node, position, anchor }
    const byId = new Map();

    function el(tag, props = {}) {
        const attrs = { ...(props.attrs || {}) };
        const node = {
            tagName: tag.toUpperCase(),
            id: props.id || '',
            className: props.className || '',
            value: props.value !== undefined ? props.value : '',
            textContent: props.textContent || '',
            innerHTML: '',
            style: {},
            dataset: {},
            removed: false,
            children: props.children || {},
            classList: { add() {}, remove() {}, contains: () => false },
            onchange: null,
            getAttribute: (name) => (Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null),
            setAttribute: (name, value) => { attrs[name] = String(value); },
            attrs,
            insertAdjacentElement(position, child) { inserted.push({ node: child, position, anchor: node }); return child; },
            querySelector: (sel) => node.children[sel] || null,
            querySelectorAll: () => [],
            remove() { node.removed = true; },
            addEventListener() {},
        };
        if (node.id) byId.set(node.id, node);
        return node;
    }

    function live(className) {
        return inserted.filter((i) => !i.node.removed && i.node.className === className);
    }

    return { el, byId, inserted, live };
}

const SLIDERS = [
    // id, min, max
    ['appearance-excitement', '0', '10'],
    ['appearance-surface-shine', '0', '10'],
    ['tex-satisfied', '0', '20'],
    ['aroma-calm', '0', '10'],
];

function loadApp() {
    const dom = makeFakeDom();
    const { el, byId } = dom;

    for (const [id, min, max] of SLIDERS) {
        el('input', { id, value: '0', attrs: { type: 'range', min, max } });
        el('span', { id: `${id}-val`, textContent: '0' });
    }
    for (const id of ['item-name', 'item-brand', 'item-type', 'item-variant', 'retest-selector']) el('input', { id });

    const formParent = el('div', { id: 'view-log-experience' });
    formParent.insertBefore = (child, ref) => { dom.inserted.push({ node: child, position: 'before', anchor: ref }); };
    const form = el('form', { id: 'taste-form' });
    form.parentNode = formParent;
    form.reset = () => {};

    // .form-stage sections 2-8; stage 8 (overall) has no .stage-description,
    // like index.html.
    const stages = {};
    for (let n = 2; n <= 8; n++) {
        const children = { h4: el('h4') };
        if (n !== 8) children['.stage-description'] = el('p', { className: 'stage-description' });
        stages[n] = el('div', { className: 'form-stage', attrs: { 'data-stage': String(n) }, children });
    }

    const document = {
        addEventListener() {},
        getElementById(id) {
            const created = dom.inserted.find((i) => i.node.id === id && !i.node.removed);
            if (created) return created.node;
            if (id === 'target-prefill-banner') return null;
            if (!byId.has(id)) byId.set(id, stub(id));
            return byId.get(id);
        },
        querySelector(sel) {
            const m = /^\.form-stage\[data-stage="(\d)"\]$/.exec(sel);
            if (m && stages[m[1]]) return stages[m[1]];
            return stub('querySelector');
        },
        querySelectorAll(sel) {
            if (sel === '.target-marker-track, .target-brief-says') {
                return dom.inserted
                    .filter((i) => !i.node.removed && (i.node.className === 'target-marker-track' || i.node.className === 'target-brief-says'))
                    .map((i) => i.node);
            }
            return [];
        },
        createElement: (tag) => el(tag),
        body: stub('body'),
    };

    const storage = new Map();
    const localStorage = {
        getItem: (k) => (storage.has(k) ? storage.get(k) : null),
        setItem: (k, v) => storage.set(k, String(v)),
        removeItem: (k) => storage.delete(k),
    };

    const consoleCalls = { warn: [], info: [] };
    const provided = {
        document,
        localStorage,
        console: {
            ...console,
            log() {},
            error() {},
            warn: (...args) => consoleCalls.warn.push(args),
            info: (...args) => consoleCalls.info.push(args),
        },
        window: { TouchedFields: require('../touched-fields.js'), TargetPrefill, DisplayFormat: require('../display-format.js') },
        TouchedFields: require('../touched-fields.js'),
        escapeHtml: require('../dom-utils.js').escapeHtml,
        RenderUtils: require('../render-utils.js'),
        alert() {},
    };
    const scope = new Proxy(provided, {
        has: () => true,
        get(target, prop) {
            if (prop === Symbol.unscopables) return undefined;
            if (prop in target) return target[prop];
            if (prop in globalThis) return globalThis[prop];
            return stub(String(prop));
        },
        set(target, prop, value) { target[prop] = value; return true; },
    });

    const factory = new Function('scope', `with (scope) { ${SENSORY_ATTRIBUTES_SRC}
${APP_SRC}
;return {
  applyTargetPrefillToForm, initRetestSelector, handleFormSubmit, clearTargetPrefillUi,
  getExperiences: () => experiences,
  setExperiences: (v) => { experiences = v; },
  getTouched: () => mainFormTouched,
}; }`);

    return { app: factory(scope), dom, form, stages, consoleCalls };
}

const HOSTILE = '<img src=x onerror=alert(1)>';

function fixturePrefill({ name = 'Zesty Cola', versionNumber = 3 } = {}) {
    const stages = {};
    for (const id of TargetPrefill.SIGNATURE_STAGE_IDS) stages[id] = { targets: [], notes: '' };
    // Legacy Brief emotion target: intensity 'high', no range -> today's "Target 8".
    stages.appearance.targets.push({ label: 'Excitement', role: 'primary', variableKey: 'vk_app_excitement', kind: 'emotion', intensity: 'high', rangeMin: null, rangeMax: null });
    // Coded targets (range_min = range_max = target).
    stages.texture.targets.push({ label: 'Satisfied', role: 'secondary', variableKey: 'vk_tex_satisfied', kind: 'emotion', intensity: null, rangeMin: 8, rangeMax: 8 });
    stages.appearance.targets.push({ label: 'Surface shine', role: 'primary', variableKey: 'app_Surface_Shine', kind: 'sensory', intensity: null, rangeMin: 8, rangeMax: 8 });
    // A coded target with no Signature slider: listed, never marked.
    stages.aroma.targets.push({ label: 'Calm', role: 'primary', variableKey: 'vk_not_in_crosswalk', kind: 'emotion', intensity: null, rangeMin: 6, rangeMax: 6 });
    stages.appearance.notes = 'Glossy sheen; Bright / vivid colour';
    stages.overall.notes = `Line one\nLine two ${HOSTILE}`;

    const crosswalkRows = [
        { signature_stage: 'appearance', signature_key: 'excitement', variable_key: 'vk_app_excitement', kind: 'emotion' },
        { signature_stage: 'texture', signature_key: 'satisfied', variable_key: 'vk_tex_satisfied', kind: 'emotion' },
        { signature_stage: 'appearance', signature_key: 'surface-shine', variable_key: 'app_Surface_Shine', kind: 'sensory' },
    ];
    return TargetPrefill.buildTargetPrefill(
        { project: { name }, version: { versionNumber }, stages },
        crosswalkRows
    );
}

const LINK = { projectId: 'proj-123', versionId: 'ver-456', projectName: 'Zesty Cola' };

test('applying a prefill changes NO slider value or value label and marks nothing touched', () => {
    const { app, dom } = loadApp();
    app.applyTargetPrefillToForm(fixturePrefill(), LINK);

    for (const [id] of SLIDERS) {
        assert.equal(dom.byId.get(id).value, '0', `${id} value must be untouched`);
        assert.equal(dom.byId.get(`${id}-val`).textContent, '0', `${id}-val must be untouched`);
    }
    assert.equal(app.getTouched().size, 0);
});

test('markers exist for mapped emotion AND mapped sensory targets only, with text, title, class and position', () => {
    const { app, dom } = loadApp();
    app.applyTargetPrefillToForm(fixturePrefill(), LINK);

    const tracks = dom.live('target-marker-track');
    const byFor = Object.fromEntries(tracks.map((t) => [t.node.getAttribute('data-target-for'), t]));
    assert.deepEqual(Object.keys(byFor).sort(), ['appearance-excitement', 'appearance-surface-shine', 'tex-satisfied']);
    // Unmapped emotion (aroma-calm) gets no marker.
    assert.equal(byFor['aroma-calm'], undefined);

    for (const t of tracks) {
        // Inserted right after its own slider.
        assert.equal(t.position, 'afterend');
        assert.equal(t.anchor.id, t.node.getAttribute('data-target-for'));
        assert.match(t.node.innerHTML, /class="target-marker-tick"/);
        assert.match(t.node.innerHTML, /class="target-marker-label"[^>]*title="Target from Zesty Cola v3"[^>]*>Target 8<\/span>/);
    }
    assert.equal(byFor['appearance-excitement'].node.getAttribute('data-target-kind'), 'emotion');
    assert.equal(byFor['appearance-surface-shine'].node.getAttribute('data-target-kind'), 'sensory');
    // 8 on a 0..10 slider -> 80%; 8 on the 0..20 fixture slider -> 40%.
    assert.match(byFor['appearance-excitement'].node.innerHTML, /left:calc\(80% \+ -6px\)/);
    assert.match(byFor['tex-satisfied'].node.innerHTML, /left:calc\(40% \+ 2px\)/);
});

test('coded targets draw at their own value: "Target 7" at 70%, a range reads "Target 6-8" at its midpoint; no slider value changes', () => {
    const { app, dom } = loadApp();
    const prefill = TargetPrefill.buildTargetPrefill(
        { project: { name: 'Zesty Cola' }, version: { versionNumber: 3 }, stages: {
            appearance: { targets: [{ label: 'Surface shine', role: 'primary', variableKey: 'app_Surface_Shine', kind: 'sensory', intensity: null, rangeMin: 7, rangeMax: 7 }], notes: '' },
            aroma: { targets: [{ label: 'Calm', role: 'primary', variableKey: 'ar_emo_calm', kind: 'emotion', intensity: null, rangeMin: 6, rangeMax: 8 }], notes: '' },
        } },
        [
            { signature_stage: 'appearance', signature_key: 'surface-shine', variable_key: 'app_Surface_Shine', kind: 'sensory' },
            { signature_stage: 'aroma', signature_key: 'calm', variable_key: 'ar_emo_calm', kind: 'emotion' },
        ]
    );
    app.applyTargetPrefillToForm(prefill, LINK);

    const byFor = Object.fromEntries(dom.live('target-marker-track').map((t) => [t.node.getAttribute('data-target-for'), t.node]));
    assert.deepEqual(Object.keys(byFor).sort(), ['appearance-surface-shine', 'aroma-calm']);
    assert.match(byFor['appearance-surface-shine'].innerHTML, /left:calc\(70% \+ -4px\)/);
    assert.match(byFor['appearance-surface-shine'].innerHTML, />Target 7<\/span>/);
    assert.equal(byFor['appearance-surface-shine'].getAttribute('data-target-kind'), 'sensory');
    assert.match(byFor['aroma-calm'].innerHTML, /left:calc\(70% \+ -4px\)/);
    assert.match(byFor['aroma-calm'].innerHTML, />Target 6-8<\/span>/);

    for (const [id] of SLIDERS) {
        assert.equal(dom.byId.get(id).value, '0', `${id} value must be untouched`);
        assert.equal(dom.byId.get(`${id}-val`).textContent, '0', `${id}-val must be untouched`);
    }
    assert.equal(app.getTouched().size, 0);

    app.handleFormSubmit({ preventDefault() {} });
    const [exp] = app.getExperiences();
    assert.equal(exp.stages.appearance.surfaceShine, null);
    assert.equal(exp.stages.aroma.emotions.calm, null);
});

test('brief text is rendered per stage with notes ("Brief says: ..."), none for empty stages, hostile text escaped', () => {
    const { app, dom, stages } = loadApp();
    app.applyTargetPrefillToForm(fixturePrefill(), LINK);

    const blocks = dom.live('target-brief-says');
    const byStage = Object.fromEntries(blocks.map((b) => [b.node.getAttribute('data-target-stage'), b]));
    assert.deepEqual(Object.keys(byStage).sort(), ['appearance', 'aroma', 'overall']);
    // A coded target with no Signature slider is listed in its stage, not dropped.
    assert.equal(byStage.aroma.node.innerHTML, '<strong>Brief says:</strong> Not measurable in this form: Calm (6)');

    const app2 = byStage.appearance;
    assert.equal(app2.node.innerHTML, '<strong>Brief says:</strong> Glossy sheen; Bright / vivid colour');
    // Placed at the top of the right section: after its description (stage 2)...
    assert.equal(app2.anchor, stages[2].children['.stage-description']);
    assert.equal(app2.position, 'afterend');
    // ...or after the h4 when there is no description (overall, stage 8).
    assert.equal(byStage.overall.anchor, stages[8].children.h4);

    const overallHtml = byStage.overall.node.innerHTML;
    assert.ok(!overallHtml.includes('<img'), 'hostile markup must be escaped');
    assert.ok(overallHtml.includes('&lt;img src=x onerror=alert(1)&gt;'));
    assert.ok(overallHtml.includes('Line one\nLine two'), 'line breaks are kept (rendered via white-space: pre-line)');
});

test('the banner is exactly the one-line string, set as text (never HTML), placed before the form', () => {
    const { app, dom, form } = loadApp();
    app.applyTargetPrefillToForm(fixturePrefill({ name: HOSTILE, versionNumber: 2 }), LINK);

    const banners = dom.inserted.filter((i) => i.node.id === 'target-prefill-banner' && !i.node.removed);
    assert.equal(banners.length, 1);
    assert.equal(banners[0].node.textContent, `Targets from ${HOSTILE} v2 shown as markers. 1 target not measurable in this form (listed in its stage).`);
    assert.equal(banners[0].node.innerHTML, '');
    assert.equal(banners[0].position, 'before');
    assert.equal(banners[0].anchor, form);

    // Marker tooltips escape the same hostile name.
    const track = dom.live('target-marker-track')[0];
    assert.ok(!track.node.innerHTML.includes('<img'));
    assert.ok(track.node.innerHTML.includes('title="Target from &lt;img src=x onerror=alert(1)&gt; v2"'));
});

test('the prefill path never calls console.warn or console.info', () => {
    const { app, consoleCalls } = loadApp();
    app.applyTargetPrefillToForm(fixturePrefill(), LINK);
    assert.equal(consoleCalls.warn.length, 0);
    assert.equal(consoleCalls.info.length, 0);
});

test('re-applying a prefill replaces (never duplicates) markers, brief text and banner', () => {
    const { app, dom } = loadApp();
    app.applyTargetPrefillToForm(fixturePrefill(), LINK);
    app.applyTargetPrefillToForm(fixturePrefill(), LINK);
    assert.equal(dom.live('target-marker-track').length, 3);
    assert.equal(dom.live('target-brief-says').length, 3);
    assert.equal(dom.inserted.filter((i) => i.node.id === 'target-prefill-banner' && !i.node.removed).length, 1);
});

test('submitting clears markers/brief text/banner; untouched marked sliders save as null; ids land on the experience', () => {
    const { app, dom } = loadApp();
    app.applyTargetPrefillToForm(fixturePrefill(), LINK);
    app.handleFormSubmit({ preventDefault() {} });

    assert.equal(dom.live('target-marker-track').length, 0);
    assert.equal(dom.live('target-brief-says').length, 0);
    assert.equal(dom.inserted.filter((i) => i.node.id === 'target-prefill-banner' && !i.node.removed).length, 0);

    const [exp] = app.getExperiences();
    assert.equal(exp.tssProjectId, 'proj-123');
    assert.equal(exp.sourceVersionId, 'ver-456');
    assert.equal(exp.stages.appearance.emotions.excitement, null);
    assert.equal(exp.stages.appearance.surfaceShine, null);
    assert.equal(exp.stages.texture.emotions.satisfied, null);
});

test('selecting a re-test (a non-target evaluation) clears markers/brief text/banner and the pending link', () => {
    const { app, dom } = loadApp();
    app.setExperiences([{ id: 1, productInfo: { name: 'Original', brand: 'Acme', type: 'Snack', variant: 'N/A' } }]);
    app.applyTargetPrefillToForm(fixturePrefill(), LINK);

    app.initRetestSelector();
    const selector = dom.byId.get('retest-selector');
    selector.value = '1';
    selector.onchange();

    assert.equal(dom.live('target-marker-track').length, 0);
    assert.equal(dom.live('target-brief-says').length, 0);
    assert.equal(dom.inserted.filter((i) => i.node.id === 'target-prefill-banner' && !i.node.removed).length, 0);

    app.handleFormSubmit({ preventDefault() {} });
    const submitted = app.getExperiences()[app.getExperiences().length - 1];
    assert.equal(submitted.tssProjectId, null);
    assert.equal(submitted.sourceVersionId, null);
});

test('end to end: a marker-prefilled submission carries tssProjectId/sourceVersionId into the dual-write RPC payload; a re-test copy does not', async () => {
    const { app, dom } = loadApp();
    app.applyTargetPrefillToForm(fixturePrefill(), LINK);
    app.handleFormSubmit({ preventDefault() {} });
    const original = app.getExperiences()[0];

    // Re-test of that same product (no target link).
    app.initRetestSelector();
    const selector = dom.byId.get('retest-selector');
    selector.value = String(original.id);
    selector.onchange();
    // Experience ids are Date.now(): make sure the re-test gets its own.
    const t0 = Date.now();
    while (Date.now() === t0) { /* spin ~1ms */ }
    app.handleFormSubmit({ preventDefault() {} });
    const retest = app.getExperiences()[1];
    assert.equal(retest.isRetest, true);

    // Push both through the real dual-write module with a mocked client.
    delete require.cache[require.resolve('../signature-supabase-sync.js')];
    delete require.cache[require.resolve('../save-diff.js')];
    const store = new Map();
    const pushed = [];
    const previousWindow = global.window;
    global.window = {
        QEP_CAPTURE_CONFIG: { ENABLE_SUPABASE_DUAL_WRITE: true, SUPABASE_ENV: 'dev' },
        location: { hostname: 'localhost' },
        localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) },
        getQepCaptureClient: () => require('./helpers/strict-supabase').makeStrictClient({
            rpcImpl: (name, params) => {
                if (name === 'upsert_signature_profile') pushed.push(params.experience);
                return { error: null };
            },
        }).client,
    };
    try {
        const sync = require('../signature-supabase-sync.js');
        await sync.syncSignatureExperiences([original, retest]);
    } finally {
        global.window = previousWindow;
    }

    const byId = Object.fromEntries(pushed.map((e) => [String(e.id), e]));
    assert.equal(byId[String(original.id)].tssProjectId, 'proj-123');
    assert.equal(byId[String(original.id)].sourceVersionId, 'ver-456');
    assert.equal(byId[String(retest.id)].tssProjectId, null);
    assert.equal(byId[String(retest.id)].sourceVersionId, null);
});
