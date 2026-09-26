// Tests for three export bugs (2026-09-26):
//  1. export-reporting-ui.js showProductChartExport() called an undefined
//     renderExperienceDetail() (ReferenceError), and exportShapeOfTasteChart()
//     looked for a 'sensoryChart' canvas that does not exist.
//  2. pdf-export.js's jsPDF sensory table read legacy field names
//     (aroma.intensity, frontMouth.sourness, ...) and printed "undefined/10".
//  3. pdf-export.js's jsPDF triggers table printed "null/10" for an
//     untouched trigger.
// Plain browser scripts are loaded into a vm context with small stubs; the
// jsPDF document is a recording fake (no real PDF, nothing saved).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const F = require('./helpers/cata-fixture.js');
const CataEmotions = require('../cata-emotions.js');
const { escapeHtml, jsArgAttr } = require('../dom-utils.js');
const DemoMode = require('../demo-mode.js');

const ROOT = path.join(__dirname, '..');
const FLOAT_ID = 1777019020364.0994;

function loadScripts(files, extra = {}) {
    const ctx = {
        console, escapeHtml, jsArgAttr, experiences: [],
        document: { documentElement: {} },
        getComputedStyle: () => ({ getPropertyValue: () => '' }),
        window: { CataEmotions },
        ...extra,
    };
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'sensory-attributes.js'), 'utf8'), ctx, { filename: 'sensory-attributes.js' });
    for (const file of files) {
        vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
    }
    return ctx;
}

// ---------- Bug 1: product chart export ----------

function chartExportHarness(experiences) {
    const calls = [];
    const canvas = { id: 'shape-chart', style: { display: 'block' }, toDataURL: () => 'data:image/png;base64,AAAA' };
    const select = { id: 'shape-product-select', value: '' };
    const links = [];
    const navItem = { click() { calls.push(['nav', 'shape-of-taste']); } };
    const ctx = loadScripts(['export-reporting.js', 'export-reporting-ui.js'], {
        experiences,
        charts: { shape: { update(mode) { calls.push(['chartUpdate', mode]); } } },
        document: {
            documentElement: {},
            getElementById(id) {
                calls.push(['getElementById', id]);
                if (id === 'shape-chart') return canvas;
                if (id === 'shape-product-select') return select;
                return null;
            },
            querySelector(sel) {
                calls.push(['querySelector', sel]);
                return sel === '.nav-item[data-view="shape-of-taste"]' ? navItem : null;
            },
            createElement(tag) {
                const a = { tag, click() { calls.push(['download', a.download]); } };
                links.push(a);
                return a;
            },
        },
        renderShapeOfTaste(exp) { calls.push(['renderShapeOfTaste', exp.id]); },
        renderEmotionalJourney(exp) { calls.push(['renderEmotionalJourney', exp.id]); },
        updateShapeOfTasteView() { calls.push(['updateShapeOfTasteView']); },
        showExportNotification(msg, type) { calls.push(['notify', type, msg]); },
        confirm: () => true,
        setTimeout: (fn) => fn(),
        alert: (m) => calls.push(['alert', m]),
    });
    return { ctx, calls, canvas, select };
}

test('chart export: opens Shape of Taste, renders the product and downloads #shape-chart (float id)', () => {
    const exp = F.sliderExperience();
    const { ctx, calls, select } = chartExportHarness([exp]);
    assert.doesNotThrow(() => ctx.showProductChartExport(FLOAT_ID));
    assert.ok(calls.some(c => c[0] === 'nav' && c[1] === 'shape-of-taste'), 'navigates to the Shape of Taste view: ' + JSON.stringify(calls));
    assert.ok(calls.some(c => c[0] === 'renderShapeOfTaste' && c[1] === FLOAT_ID), 'renders the chart for this product');
    assert.equal(select.value, String(FLOAT_ID), 'product select shows the exported product');
    assert.ok(calls.some(c => c[0] === 'getElementById' && c[1] === 'shape-chart'), 'reads the real canvas id');
    assert.ok(!calls.some(c => c[0] === 'getElementById' && c[1] === 'sensoryChart'), 'no stale sensoryChart id');
    const dl = calls.find(c => c[0] === 'download');
    assert.ok(dl, 'a PNG download is triggered');
    assert.equal(dl[1], `shape_of_taste_${FLOAT_ID}.png`);
});

test('chart export: a float id passed as a string still finds the product (parseFloat, not parseInt)', () => {
    const other = F.sliderExperience({ id: 1777019020364.5 });
    const exp = F.sliderExperience();
    const { ctx, calls } = chartExportHarness([other, exp]);
    ctx.showProductChartExport(String(FLOAT_ID));
    assert.ok(calls.some(c => c[0] === 'renderShapeOfTaste' && c[1] === FLOAT_ID), JSON.stringify(calls));
    assert.ok(!calls.some(c => c[0] === 'renderShapeOfTaste' && c[1] === other.id), 'never the truncated/other id');
});

test('chart export: demo string ids work', () => {
    const demo = new DemoMode().generateSampleExperiences();
    const { ctx, calls } = chartExportHarness(demo);
    ctx.showProductChartExport('demo-002');
    assert.ok(calls.some(c => c[0] === 'renderShapeOfTaste' && c[1] === 'demo-002'), JSON.stringify(calls));
    assert.ok(calls.some(c => c[0] === 'download' && c[1] === 'shape_of_taste_demo-002.png'));
});

test('chart export: unknown product reports an error instead of throwing', () => {
    const { ctx, calls } = chartExportHarness([F.sliderExperience()]);
    assert.doesNotThrow(() => ctx.showProductChartExport(123));
    assert.ok(!calls.some(c => c[0] === 'download'));
    assert.ok(calls.some(c => c[0] === 'notify' && c[1] === 'error'), JSON.stringify(calls));
});

test('chart export: a qualitative-only product (hidden chart) is refused, no blank PNG', () => {
    const { ctx, calls, canvas } = chartExportHarness([F.sliderExperience()]);
    canvas.style.display = 'none';
    assert.equal(ctx.exportShapeOfTasteChart(FLOAT_ID), false);
    assert.ok(!calls.some(c => c[0] === 'download'));
    assert.ok(calls.some(c => c[0] === 'notify' && c[1] === 'error'));
});

test('chart export: the running chart animation is finished before the PNG is taken', () => {
    const { ctx, calls } = chartExportHarness([F.sliderExperience()]);
    ctx.exportShapeOfTasteChart(FLOAT_ID);
    const u = calls.findIndex(c => c[0] === 'chartUpdate' && c[1] === 'none');
    const d = calls.findIndex(c => c[0] === 'download');
    assert.ok(u >= 0 && d > u, JSON.stringify(calls));
});

test('chart export: no reference to the undefined renderExperienceDetail remains', () => {
    const src = fs.readFileSync(path.join(ROOT, 'export-reporting-ui.js'), 'utf8');
    assert.ok(!/renderExperienceDetail\s*\(/.test(src));
    assert.ok(!/showView\s*\(/.test(src));
});

// ---------- Bugs 2 and 3: jsPDF report ----------

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

function pdf() {
    const tables = [];
    const texts = [];
    const ctx = loadScripts(['pdf-export.js']);
    ctx.window.jspdf = { jsPDF: fakeJsPdf(tables, texts) };
    const exporter = new ctx.window.PDFExporter();
    return { exporter, tables, texts };
}

function tableByHead(tables, first) {
    return tables.find(t => t.head && t.head[0] && t.head[0][0] === first && t.head[0].length > 1);
}

function plain(v) { return JSON.parse(JSON.stringify(v)); }

// Table cells never hold undefined/null; no text line formats a missing
// value as "x/10".
function assertNoUndefinedOrNull(tables, texts) {
    const bodies = JSON.stringify(tables.map(t => t.body));
    assert.ok(!/undefined|null/.test(bodies), 'no undefined/null table cell: ' + bodies);
    const all = bodies + JSON.stringify(texts);
    assert.ok(!/(undefined|null|N\/A)\/10/.test(all), 'no "undefined/10", "null/10" or "N/A/10": ' + all);
}

test('jsPDF product report: sensory table reads the current field names (no "undefined/10")', async () => {
    const { exporter, tables, texts } = pdf();
    await exporter.generateProductReport(F.sliderExperience());
    const sensory = tableByHead(tables, 'Stage');
    assert.ok(sensory, 'sensory table present');
    const body = plain(sensory.body);
    assert.equal(body.length, 6);
    assert.deepEqual(body.map(r => r[0]), ['Appearance', 'Aroma', 'Front of Mouth', 'Mid/Rear Mouth', 'Texture', 'Aftertaste']);
    assert.deepEqual(body[0], ['Appearance', 'Visual Appeal: 8/10', '8/10']);
    assert.deepEqual(body[1], ['Aroma', 'Smell Strength: 6/10', '6/10']);
    assert.deepEqual(body[2], ['Front of Mouth', 'Overall Initial Impact: 7/10, Sweetness: 6/10', '7/10']);
    assert.deepEqual(body[3], ['Mid/Rear Mouth', 'Overall Mid-Palate Intensity: 5/10', '5/10']);
    assert.deepEqual(body[4], ['Texture', 'Overall Textural Complexity: 6/10', '6/10']);
    assert.deepEqual(body[5], ['Aftertaste', 'Finish Length: 5/10', '5/10']);
    assertNoUndefinedOrNull(tables, texts);
});

test('jsPDF product report: key attributes are the top 3 rated, labelled from the lexicon', async () => {
    const { exporter, tables } = pdf();
    const exp = F.sliderExperience();
    exp.stages.frontMouth = { sweetness: 4, sournessTartness: 9, saltiness: null, overallInitialImpact: 2, bitterness: 6, emotions: {} };
    await exporter.generateProductReport(exp);
    const row = plain(tableByHead(tables, 'Stage').body)[2];
    assert.deepEqual(row, ['Front of Mouth', 'Sourness/Tartness: 9/10, Bitterness: 6/10, Sweetness: 4/10', '2/10']);
});

test('jsPDF product report: untouched (null) and missing stages print "Not rated"', async () => {
    const { exporter, tables, texts } = pdf();
    const exp = F.sliderExperience();
    exp.stages.aroma = { smellStrength: null, emotions: { comfort: null } };
    delete exp.stages.texture;
    exp.stages.aftertaste = { finishLength: 0, emotions: {} };
    await exporter.generateProductReport(exp);
    const body = plain(tableByHead(tables, 'Stage').body);
    assert.deepEqual(body[1], ['Aroma', 'Not rated', 'Not rated']);
    assert.deepEqual(body[4], ['Texture', 'Not rated', 'Not rated']);
    assert.deepEqual(body[5], ['Aftertaste', 'Finish Length: 0/10', '0/10'], 'a rated 0 is a value, not "Not rated"');
    assertNoUndefinedOrNull(tables, texts);
});

test('jsPDF product report: triggers print "Not rated" for null/missing, x/10 otherwise', async () => {
    const { exporter, tables, texts } = pdf();
    const exp = F.sliderExperience({ emotionalTriggers: { moreishness: null, refreshment: 3, crunch: 0 } });
    await exporter.generateProductReport(exp);
    const trig = tableByHead(tables, 'Trigger');
    assert.deepEqual(plain(trig.body), [
        ['Moreishness', 'Not rated', '-'],
        ['Refreshment', '3/10', 'Low'],
        ['The Melt', 'Not rated', '-'],
        ['Texture/Crunch', '0/10', 'Very Low'],
    ]);
    assertNoUndefinedOrNull(tables, texts);
});

test('jsPDF product report: no emotionalTriggers object at all does not throw', async () => {
    const { exporter, tables } = pdf();
    const exp = F.sliderExperience();
    delete exp.emotionalTriggers;
    await exporter.generateProductReport(exp);
    const trig = tableByHead(tables, 'Trigger');
    assert.ok(plain(trig.body).every(r => r[1] === 'Not rated'));
});

test('jsPDF product report: a 266-column Capture CSV import has no undefined/null cells', async () => {
    const { exporter, tables, texts } = pdf();
    const e = await F.importWithProportions();
    await exporter.generateProductReport(e);
    const body = plain(tableByHead(tables, 'Stage').body);
    assert.equal(body[0][2], '7/10', 'app_Visual_Appeal 7 is the appearance intensity');
    assert.match(body[0][1], /Visual Appeal: 7\/10/);
    assert.match(body[0][1], /Color Shade: 6\/10/);
    assert.match(body[4][1], /Crunchiness: 8\/10/);
    const trig = plain(tableByHead(tables, 'Trigger').body);
    assert.deepEqual(trig[0].slice(0, 2), ['Moreishness', '7/10']);
    assert.deepEqual(trig[1].slice(0, 2), ['Refreshment', 'Not rated']);
    assertNoUndefinedOrNull(tables, texts);
});

test('jsPDF product report: demo products keep their values (legacy overallIntensity fallback)', async () => {
    const demo = new DemoMode().generateSampleExperiences();
    for (const exp of demo) {
        const { exporter, tables, texts } = pdf();
        await exporter.generateProductReport(exp);
        assertNoUndefinedOrNull(tables, texts);
    }
    const { exporter, tables } = pdf();
    await exporter.generateProductReport(demo[0]);
    const body = plain(tableByHead(tables, 'Stage').body);
    assert.equal(body[0][2], `${demo[0].stages.appearance.visualAppeal}/10`);
    assert.equal(body[1][2], `${demo[0].stages.aroma.overallIntensity}/10`, 'demo aroma has no smellStrength: overallIntensity is used');
});

test('jsPDF portfolio report: null satisfaction prints "Not rated", 0 prints "0/10" (no "N/A/10")', async () => {
    const { exporter, tables, texts } = pdf();
    const a = F.sliderExperience();
    const b = F.sliderExperience({ id: 2, productInfo: { name: 'Null Sat', brand: 'B' } });
    b.stages = { ...b.stages, aftertaste: { finishLength: 5, emotions: { satisfaction: null } } };
    const c = F.sliderExperience({ id: 3, productInfo: { name: 'Zero Sat', brand: 'C' } });
    c.stages = { ...c.stages, aftertaste: { finishLength: 5, emotions: { satisfaction: 0 } } };
    await exporter.generatePortfolioReport([a, b, c]);
    const summary = plain(tableByHead(tables, 'Product').body);
    assert.deepEqual(summary.map(r => r[3]), ['7/10', 'Not rated', '0/10']);
    assert.ok(texts.some(t => /Null Sat - Not rated/.test(t)), JSON.stringify(texts));
    assert.ok(texts.some(t => /Zero Sat - 0\/10/.test(t)), JSON.stringify(texts));
    assertNoUndefinedOrNull(tables, texts);
});

test('jsPDF comparison report: current field names, null -> "Not rated", no undefined', async () => {
    const { exporter, tables, texts } = pdf();
    const a = F.sliderExperience();
    const b = F.sliderExperience({ id: 2, emotionalTriggers: { moreishness: null } });
    b.stages = { ...b.stages, aroma: { smellStrength: null, emotions: {} } };
    await exporter.generateComparisonReport([a, b]);
    const sens = plain(tableByHead(tables, 'Attribute').body);
    const byLabel = Object.fromEntries(sens.map(r => [r[0], r.slice(1)]));
    assert.deepEqual(byLabel['Visual Appeal'], ['8/10', '8/10']);
    assert.deepEqual(byLabel['Aroma Intensity'], ['6/10', 'Not rated']);
    assert.deepEqual(byLabel['Sweetness'], ['6/10', '6/10']);
    assert.deepEqual(byLabel['Texture Complexity'], ['6/10', '6/10']);
    assert.deepEqual(byLabel['Aftertaste'], ['5/10', '5/10']);
    assert.deepEqual(byLabel['Satisfaction'], ['7/10', '7/10']);
    const trig = plain(tableByHead(tables, 'Trigger').body);
    assert.deepEqual(trig[0], ['Moreishness', '6/10', 'Not rated']);
    assertNoUndefinedOrNull(tables, texts);
});

test('jsPDF comparison report: demo products keep their legacy values', async () => {
    const demo = new DemoMode().generateSampleExperiences().slice(0, 2);
    const { exporter, tables, texts } = pdf();
    await exporter.generateComparisonReport(demo);
    const sens = plain(tableByHead(tables, 'Attribute').body);
    const byLabel = Object.fromEntries(sens.map(r => [r[0], r.slice(1)]));
    assert.deepEqual(byLabel['Aroma Intensity'], demo.map(e => `${e.stages.aroma.intensity}/10`));
    assertNoUndefinedOrNull(tables, texts);
});
