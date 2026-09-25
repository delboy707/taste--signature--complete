// Tests for the QEP CSV import fallback (batch-import.js parseQEPImportCSV /
// executeQEPBatchImport) against Capture's 266-column export and the
// 262-column Brief/template layout. batch-import.js is a plain browser
// script (window.BatchImport), so it is loaded into a vm context here.
// Headers come from qep-capture's lib/export/qep-export-contract.ts
// (test/fixtures/capture-export-266-headers.txt, 266 lines).
// Run: node test/qep-csv-import.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const HEADERS_266 = fs.readFileSync(path.join(__dirname, 'fixtures', 'capture-export-266-headers.txt'), 'utf8')
    .split('\n').map(s => s.trim()).filter(Boolean);
const TRIGGER_HEADERS = HEADERS_266.filter(h => /^overall_Trigger_/.test(h));
const HEADERS_262 = HEADERS_266.filter(h => !/^overall_Trigger_/.test(h));

function loadBatchImport({ inference } = {}) {
    const window = {};
    if (inference) window.EmotionInference = { inferFromSensory: inference };
    const ctx = { window, console, experiences: [], saveData: () => {} };
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'batch-import.js'), 'utf8'), ctx, { filename: 'batch-import.js' });
    return { BI: ctx.window.BatchImport, ctx };
}

// vm-context objects have another realm's prototypes; compare plain copies.
function plain(x) { return JSON.parse(JSON.stringify(x)); }

function csvCell(v) {
    const s = v === undefined || v === null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildCsv(headers, values) {
    const row = headers.map(h => (Object.prototype.hasOwnProperty.call(values, h) ? values[h] : ''));
    return headers.map(csvCell).join(',') + '\n' + row.map(csvCell).join(',') + '\n';
}

const BASE = {
    Product_Name: 'Dark Nut Bar',
    Brand: 'Acme',
    Category: 'Chocolate Bar',
    Panel_Size: '12',
    Test_Date: '2026-09-25',
    app_Color_Shade: '6',
    tex_Crunchiness: '8',
};

test('fixture: the contract header list has 266 columns incl. 4 trigger columns', () => {
    assert.equal(HEADERS_266.length, 266);
    assert.deepEqual(TRIGGER_HEADERS, [
        'overall_Trigger_Moreishness', 'overall_Trigger_Refreshment',
        'overall_Trigger_The_Melt', 'overall_Trigger_Texture_Crunch',
    ]);
});

test('266-column Capture export: trigger columns are kept (no "unmatched" warning)', () => {
    const { BI } = loadBatchImport();
    const csv = buildCsv(HEADERS_266, {
        ...BASE,
        overall_Trigger_Moreishness: '7', overall_Trigger_Refreshment: '3',
        overall_Trigger_The_Melt: '', overall_Trigger_Texture_Crunch: '9',
    });
    const res = BI.parseQEPImportCSV(csv);
    assert.equal(res.success, true, JSON.stringify(res.errors));
    assert.ok(!res.warnings.some(w => /did not match/.test(w)), res.warnings.join(' | '));
    assert.deepEqual(plain(res.products[0].triggers), { moreishness: 7, refreshment: 3, melt: null, crunch: 9 });
});

test('266 import: experience.emotionalTriggers come from the trigger columns, not flat 5 or inference', async () => {
    const inference = () => ({
        needState: 'reward',
        emotionalTriggers: { moreishness: 1, refreshment: 1, melt: 1, crunch: 1 },
        stages: { appearance: { emotions: { excitement: 9, curiosity: 9 } } },
    });
    const { BI, ctx } = loadBatchImport({ inference });
    const csv = buildCsv(HEADERS_266, {
        ...BASE,
        app_Emotions: 'excitement',
        overall_Trigger_Moreishness: '7', overall_Trigger_Refreshment: '3',
        overall_Trigger_The_Melt: '', overall_Trigger_Texture_Crunch: '9',
    });
    const parsed = BI.parseQEPImportCSV(csv);
    const out = await BI.executeQEPBatchImport(parsed.products);
    assert.equal(out.success, 1);
    const e = ctx.experiences[0];
    assert.deepEqual({ ...e.emotionalTriggers }, { moreishness: 7, refreshment: 3, melt: null, crunch: 9 });
    assert.equal(e.needState, 'reward', 'need-state inference still runs');
    // inference never overwrites a stage whose emotions came from the file
    assert.equal(e.stages.appearance.emotions.excitement, null);
    assert.equal(e.stages.appearance.emotions.curiosity, null);
});

test('emotions are recorded as selected (CATA), never flattened to 7', async () => {
    const { BI, ctx } = loadBatchImport();
    const csv = buildCsv(HEADERS_266, { ...BASE, app_Emotions: 'excitement;curiosity', aft_Emotions: 'craving-want-more' });
    const out = await BI.executeQEPBatchImport(BI.parseQEPImportCSV(csv).products);
    assert.equal(out.success, 1);
    const e = ctx.experiences[0];
    const values = [];
    for (const st of Object.values(e.stages)) for (const v of Object.values(st.emotions || {})) values.push(v);
    assert.ok(!values.includes(7), 'no emotion slider set to 7');
    assert.ok(values.every(v => v === null), 'every emotion slider in a CATA stage is null (not measured)');
    assert.deepEqual(JSON.parse(JSON.stringify(e.cataEmotions)), {
        appearance: { excitement: null, curiosity: null },
        aftertaste: { craving: null },
    });
    // Signature's aftertaste slider key is "craving" (qep-capture 0025), not cravingWantMore
    assert.ok(Object.prototype.hasOwnProperty.call(e.stages.aftertaste.emotions, 'craving'));
    assert.ok(!Object.prototype.hasOwnProperty.call(e.stages.aftertaste.emotions, 'cravingWantMore'));
});

test('both separators and any case: "; " (measured) and ", " labels (Brief)', () => {
    const { BI } = loadBatchImport();
    const csv = buildCsv(HEADERS_266, {
        ...BASE,
        app_Emotions: 'excitement;curiosity',
        aroma_Emotions: 'Comfort, Nostalgia, Happiness',
        tex_Emotions: 'Calm Relaxed; PLEASANTLY-SURPRISED',
    });
    const p = BI.parseQEPImportCSV(csv).products[0];
    assert.deepEqual(plain(p.stages.app.cata), { excitement: null, curiosity: null });
    assert.deepEqual(plain(p.stages.aroma.cata), { comfort: null, nostalgia: null, happiness: null });
    assert.deepEqual(plain(p.stages.tex.cata), { calmRelaxed: null, pleasantlySurprised: null });
});

test('proportion suffixes are kept: "x:0.62", "x (62%)", "x=62%"', () => {
    const { BI } = loadBatchImport();
    const csv = buildCsv(HEADERS_266, {
        ...BASE,
        app_Emotions: 'excitement:0.62; curiosity (25%); desire=50%',
    });
    const p = BI.parseQEPImportCSV(csv).products[0];
    assert.deepEqual(plain(p.stages.app.cata), { excitement: 0.62, curiosity: 0.25, desire: 0.5 });
});

test('unknown emotion tokens are warned about and skipped, never invented', () => {
    const { BI } = loadBatchImport();
    const csv = buildCsv(HEADERS_266, { ...BASE, app_Emotions: 'excitement; zzzfeeling' });
    const res = BI.parseQEPImportCSV(csv);
    assert.deepEqual(plain(res.products[0].stages.app.cata), { excitement: null });
    assert.ok(res.warnings.some(w => /zzzfeeling/.test(w)), res.warnings.join(' | '));
});

test('262-column Brief/template file still imports (no triggers, emotions still CATA)', async () => {
    const { BI, ctx } = loadBatchImport();
    assert.equal(HEADERS_262.length, 262);
    const csv = buildCsv(HEADERS_262, { ...BASE, app_Emotions: 'Excitement, Curiosity' });
    const res = BI.parseQEPImportCSV(csv);
    assert.equal(res.success, true, JSON.stringify(res.errors));
    assert.ok(!res.warnings.some(w => /did not match/.test(w)));
    assert.equal(res.products[0].triggers, null);
    const out = await BI.executeQEPBatchImport(res.products);
    assert.equal(out.success, 1);
    const e = ctx.experiences[0];
    assert.equal(e.stages.appearance.colorShade, 6);
    assert.equal(e.stages.texture.crunchiness, 8);
    assert.deepEqual(JSON.parse(JSON.stringify(e.cataEmotions)), { appearance: { excitement: null, curiosity: null } });
    // no trigger columns -> the pre-existing default behaviour is unchanged
    assert.deepEqual({ ...e.emotionalTriggers }, { moreishness: 5, refreshment: 5, melt: 5, crunch: 5 });
});

test('a stage with an empty emotions cell is still CATA (nothing selected), not flattened', async () => {
    const { BI, ctx } = loadBatchImport();
    const csv = buildCsv(HEADERS_266, { ...BASE });
    await BI.executeQEPBatchImport(BI.parseQEPImportCSV(csv).products);
    const e = ctx.experiences[0];
    assert.equal(e.stages.appearance.emotions.excitement, null);
    assert.equal(e.cataEmotions, undefined, 'no selections -> no cataEmotions field');
});
