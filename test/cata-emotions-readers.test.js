// Reader tests for CSV-imported Capture emotion selections (CATA,
// experience.cataEmotions). Each reader that shows an experience's
// emotions must show the selections - without ever turning one into a
// 0-10 value - and must be unchanged for an experience with slider
// emotions. Experiences come from the REAL batch-import.js fed a
// 266-column Capture export row (test/helpers/cata-fixture.js).
// Readers loaded for real: render-utils.js (History row), app.js (Shape of
// Taste / Emotional Mapping / Comparison charts), export-reporting.js
// (HTML PDF report + product CSV), pdf-export.js (jsPDF report),
// claude-api.js (AI product prompt).
// Run: node test/cata-emotions-readers.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const F = require('./helpers/cata-fixture.js');

const ROOT = path.join(__dirname, '..');
let CataEmotions = null;
try { CataEmotions = require('../cata-emotions.js'); } catch (_) { /* not written yet */ }
const { escapeHtml, jsArgAttr } = require('../dom-utils.js');
const RenderUtils = require('../render-utils.js');
const PALETTE = ['#111111', '#222222', '#333333', '#444444', '#555555', '#666666', '#777777', '#888888'];

// ---------- app.js loader (charts recorded, DOM elements recorded) ----------
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

function loadApp() {
    const APP_SRC = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    const els = new Map();
    const recorded = [];
    function el(id) {
        if (!els.has(id)) {
            els.set(id, { id, innerHTML: '', style: {}, value: '', getContext: () => ({ clearRect() {} }),
                addEventListener() {}, classList: { add() {}, remove() {}, contains: () => false } });
        }
        return els.get(id);
    }
    class Chart {
        constructor(ctx, config) {
            this.config = config;
            this.canvas = { width: 1, height: 1, getContext: () => ({ clearRect() {} }) };
            recorded.push(config);
        }
        destroy() {}
    }
    const provided = {
        document: {
            addEventListener() {}, getElementById: el, querySelector: () => stub('qs'), querySelectorAll: () => [],
            createElement: () => stub('createElement'), body: stub('body'),
        },
        localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
        console,
        window: { TouchedFields: require('../touched-fields.js'), QEP_CHART_PALETTE: PALETTE, CataEmotions },
        Chart,
        escapeHtml,
        jsArgAttr,
        RenderUtils,
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
    const factory = new Function('scope', `with (scope) { ${APP_SRC}
;return { renderShapeOfTaste, renderEmotionalJourney, renderEmotionalMap, renderShapeOfEmotion,
  renderEmotionalProfileRadar, renderComparisonEmotionRadar, renderComparisonEmotionHeatmap,
  renderComparisonShapeChart, setExperiences: (v) => { experiences = v; }, updateHistory }; }`);
    return { app: factory(scope), el, recorded };
}

function chartData(configs) {
    return configs.map(c => (c.data.datasets || []).map(d => ({ label: d.label, data: d.data })));
}

// ---------- vm loader for plain browser scripts ----------
function loadScript(file, extra = {}) {
    const ctx = {
        console, escapeHtml, experiences: [],
        document: { documentElement: {} },
        getComputedStyle: () => ({ getPropertyValue: () => '' }),
        window: { CataEmotions, DisplayFormat: require('../display-format.js') },
        ...extra,
    };
    vm.createContext(ctx);
    // real stage labels / attribute lookups (window.SENSORY_STAGES, keyToAttrId, ...)
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'sensory-attributes.js'), 'utf8'), ctx, { filename: 'sensory-attributes.js' });
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
    return ctx;
}

// ---------- History row (render-utils.js) ----------
test('History row: shows "Selected by consumers" with shares; satisfaction not rated (not "/10")', async () => {
    const e = await F.importWithProportions();
    const html = RenderUtils.buildHistoryHtml([e]);
    assert.match(html, /Selected by consumers/);
    assert.match(html, /Appearance: Excitement \(62%\), Curiosity/);
    assert.match(html, /Aftertaste: Craving \(40%\)/);
    assert.ok(!/Satisfaction:<\/strong>\s*\/10/.test(html), 'null satisfaction must not render as "/10"');
    assert.match(html, /Satisfaction:<\/strong> Not rated/);
});

test('History row: selections without proportions show names only', async () => {
    const html = RenderUtils.buildHistoryHtml([await F.importWithoutProportions()]);
    assert.match(html, /Appearance: Excitement, Curiosity/);
    assert.match(html, /Aftertaste: Craving(?! \()/);
});

test('History row: slider experience unchanged (satisfaction x/10, no selections line)', () => {
    const html = RenderUtils.buildHistoryHtml([F.sliderExperience()]);
    assert.match(html, /<strong>Satisfaction:<\/strong> 7\/10/);
    assert.ok(!/Selected by consumers/.test(html));
});

// ---------- app.js: Shape of Taste / Emotional Mapping / Comparison ----------
test('Shape of Taste: Emotional Journey lists the selections beside the chart', async () => {
    const { app, el } = loadApp();
    app.renderEmotionalJourney(await F.importWithProportions());
    const box = el('emotional-journey-cata');
    assert.match(box.innerHTML, /Selected by consumers/);
    assert.match(box.innerHTML, /62%/);
    assert.match(box.innerHTML, /Curiosity/);
    assert.match(box.innerHTML, /not plotted/i);
    assert.equal(box.style.display, 'block');
});

test('Emotional Mapping: the emotional map lists the selections beside the chart', async () => {
    const { app, el } = loadApp();
    app.renderEmotionalMap(await F.importWithoutProportions());
    const box = el('emotional-map-cata');
    assert.match(box.innerHTML, /Selected by consumers/);
    assert.match(box.innerHTML, /Excitement/);
    assert.match(box.innerHTML, /Craving/);
    assert.equal(box.style.display, 'block');
});

test('Shape of Taste / Emotional Mapping: slider experience shows no selections box', () => {
    const { app, el } = loadApp();
    app.renderEmotionalJourney(F.sliderExperience());
    app.renderEmotionalMap(F.sliderExperience());
    for (const id of ['emotional-journey-cata', 'emotional-map-cata']) {
        assert.equal(el(id).innerHTML, '');
        assert.equal(el(id).style.display, 'none');
    }
});

test('Comparison: heatmap card lists the selections of each compared product', async () => {
    const { app, el } = loadApp();
    const cata = await F.importWithProportions();
    app.renderComparisonEmotionHeatmap([cata, F.sliderExperience()]);
    const html = el('comparison-emotion-heatmap').innerHTML;
    assert.match(html, /Selected by consumers/);
    assert.match(html, /Dark Nut Bar/);
    assert.match(html, /Excitement \(62%\)|Excitement[^<]*<[^>]*>62%/);
});

test('Comparison: two slider experiences -> heatmap has no selections section', () => {
    const { app, el } = loadApp();
    app.renderComparisonEmotionHeatmap([F.sliderExperience(), F.sliderExperience({ id: 2 })]);
    assert.ok(!/Selected by consumers/.test(el('comparison-emotion-heatmap').innerHTML));
});

test('no chart or series gets a numeric value from cataEmotions (same data with or without it)', async () => {
    for (const make of [F.importWithProportions, F.importWithoutProportions]) {
        const cata = await make();
        const plainExp = F.withoutCata(cata);
        const slider = F.sliderExperience();
        const run = (exp) => {
            const { app, el, recorded } = loadApp();
            app.renderShapeOfTaste(exp);
            app.renderEmotionalJourney(exp);
            app.renderEmotionalMap(exp);
            app.renderShapeOfEmotion(exp);
            app.renderEmotionalProfileRadar(exp);
            app.renderComparisonEmotionRadar([exp, slider]);
            app.renderComparisonShapeChart([exp, slider]);
            app.renderComparisonEmotionHeatmap([exp, slider]);
            const table = el('comparison-emotion-heatmap').innerHTML.match(/<table[\s\S]*<\/table>/)[0];
            return { data: chartData(recorded), table };
        };
        const a = run(cata);
        const b = run(plainExp);
        assert.deepEqual(a.data, b.data, 'chart datasets must not change because of cataEmotions');
        assert.equal(a.table, b.table, 'heatmap cells must not change because of cataEmotions');
        // The emotional journey of a CATA-only profile plots nothing (all 0), never 6.2 or 62.
        const flat = JSON.stringify(a.data);
        assert.ok(!/(^|[^\d.])(62|6\.2|0\.62|40|0\.4)([^\d]|$)/.test(flat), flat);
    }
});

// ---------- export-reporting.js: HTML PDF report + product CSV ----------
test('PDF report (HTML): Emotional Response Mapping shows "Selected by consumers" chips', async () => {
    const ctx = loadScript('export-reporting.js');
    const html = ctx.generateProductReportContent(await F.importWithProportions());
    assert.match(html, /Selected by consumers/);
    assert.match(html, /Excitement/);
    assert.match(html, /62%/);
    assert.ok(!/\bnull\b/.test(html), 'no "null" text in the report');
});

test('PDF report (HTML): slider experience unchanged (numeric chips, no selections block)', () => {
    const ctx = loadScript('export-reporting.js');
    const html = ctx.generateProductReportContent(F.sliderExperience());
    assert.match(html, /<div class="emotion-chip">excitement \(8\)<\/div>/);
    assert.ok(!/Selected by consumers/.test(html));
});

test('Product CSV export: adds a "Selected by consumers" section, share only when known', async () => {
    const e = await F.importWithProportions();
    let captured = null;
    const ctx = loadScript('export-reporting.js');
    ctx.experiences = [e];
    ctx.downloadCSV = (csv) => { captured = csv; };
    assert.equal(ctx.exportProductToExcel(e.id), true);
    assert.match(captured, /Selected by consumers/);
    assert.match(captured, /\nAppearance,"Excitement \(62%\), Curiosity"\n/);
    assert.match(captured, /\nOverall,"Satisfaction, Joy"\n/);
});

test('Product CSV export: slider experience has no selections section', () => {
    const e = F.sliderExperience();
    let captured = null;
    const ctx = loadScript('export-reporting.js');
    ctx.experiences = [e];
    ctx.downloadCSV = (csv) => { captured = csv; };
    ctx.exportProductToExcel(e.id);
    assert.ok(!/Selected by consumers/.test(captured));
    assert.match(captured, /Appearance,"excitement \(8\), curiosity \(3\)"/);
});

// ---------- pdf-export.js (jsPDF) ----------
function fakeJsPdf(tables, texts) {
    return function FakeDoc() {
        const doc = {
            internal: { pageSize: { width: 210, height: 297 } },
            lastAutoTable: { finalY: 0 },
            autoTable(opts) { tables.push(opts); doc.lastAutoTable = { finalY: (opts.startY || 0) + 10 }; },
            text(t) { texts.push(Array.isArray(t) ? t.join(' ') : String(t)); },
            splitTextToSize: (t) => [String(t)],
            save() {},
        };
        return new Proxy(doc, { get: (t, p) => (p in t ? t[p] : () => {}) });
    };
}

async function pdfTables(exp) {
    const tables = [];
    const texts = [];
    const ctx = loadScript('pdf-export.js');
    ctx.window.jspdf = { jsPDF: fakeJsPdf(tables, texts) };
    const exporter = new ctx.window.PDFExporter();
    await exporter.generateProductReport(exp);
    return { tables, texts };
}

test('jsPDF report: a "Selected by consumers" table with shares, no "null/10" rows', async () => {
    const { tables, texts } = await pdfTables(await F.importWithProportions());
    const cata = tables.find(t => JSON.stringify(t.head) === JSON.stringify([['Emotion', 'Stage', 'Selected by consumers']]));
    assert.ok(cata, 'CATA table present: ' + JSON.stringify(tables.map(t => t.head)));
    assert.deepEqual(JSON.parse(JSON.stringify(cata.body.slice(0, 2))), [['Excitement', 'Appearance', '62%'], ['Curiosity', 'Appearance', 'Selected']]);
    assert.ok(texts.some(t => /not a 0-10 rating/.test(t)), 'explains the column');
    const emo = tables.find(t => JSON.stringify(t.head) === JSON.stringify([['Emotion', 'Stage', 'Intensity']]));
    if (emo) assert.ok(!JSON.stringify(emo.body).includes('null'), 'no null/10 emotion rows: ' + JSON.stringify(emo.body));
});

test('jsPDF report: slider experience unchanged (top emotions x/10, no CATA table)', async () => {
    const { tables } = await pdfTables(F.sliderExperience());
    const emo = tables.find(t => JSON.stringify(t.head) === JSON.stringify([['Emotion', 'Stage', 'Intensity']]));
    assert.deepEqual(JSON.parse(JSON.stringify(emo.body[0])), ['Excitement', 'appearance', '8/10']);
    assert.ok(!tables.some(t => JSON.stringify(t.head).includes('Selected by consumers')));
});

// ---------- claude-api.js: AI product prompt ----------
function claudeAI() {
    global.window = global.window || {};
    const saved = global.window.CataEmotions;
    global.window.CataEmotions = CataEmotions;
    const { ClaudeAI } = require('../claude-api.js');
    return { ai: Object.create(ClaudeAI.prototype), restore: () => { global.window.CataEmotions = saved; } };
}

test('AI prompt: product data lists consumer selections as selections, not ratings', async () => {
    const { ai, restore } = claudeAI();
    try {
        const text = ai.formatProductData(await F.importWithProportions());
        assert.match(text, /Selected by consumers/);
        assert.match(text, /Appearance: Excitement \(62%\), Curiosity/);
        assert.match(text, /not a 0-10 rating/);
        const top = text.split('\n').find(l => l.startsWith('**Top Emotions**'));
        assert.ok(!/null/.test(top), 'Top Emotions must not list null/10: ' + top);
    } finally { restore(); }
});

test('AI prompt: slider experience unchanged', () => {
    const { ai, restore } = claudeAI();
    try {
        const text = ai.formatProductData(F.sliderExperience());
        assert.ok(!/Selected by consumers/.test(text));
        assert.match(text, /\*\*Top Emotions\*\*: excitement \(8\/10\) at appearance, /);
    } finally { restore(); }
});
