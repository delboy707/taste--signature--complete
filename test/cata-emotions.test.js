// Pure unit tests for cata-emotions.js: formatting of the consumer emotion
// selections (CATA) that the QEP CSV import stores in
// experience.cataEmotions = { <stageKey>: { <emotionKey>: proportion|null } }.
// A selection is never turned into a 0-10 value.
// Run: node test/cata-emotions.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const DemoMode = require('../demo-mode.js');
const F = require('./helpers/cata-fixture.js');

let CE = null;
try { CE = require('../cata-emotions.js'); } catch (_) { /* not written yet */ }
function mod() { assert.ok(CE, 'cata-emotions.js must exist and export its API'); return CE; }

const XSS = '<img src=x onerror=alert(1)>';

test('with proportions: stage order, labels and shares ("62%"); null share shows no %', async () => {
    const e = await F.importWithProportions();
    const sel = mod().getCataSelections(e);
    assert.deepEqual(sel.map(s => s.stage), ['appearance', 'aftertaste', 'overall']);
    assert.deepEqual(sel.map(s => s.stageLabel), ['Appearance', 'Aftertaste', 'Overall']);
    assert.deepEqual(sel[0].items.map(i => [i.key, i.label, i.proportion, i.share]), [
        ['excitement', 'Excitement', 0.62, '62%'],
        ['curiosity', 'Curiosity', null, ''],
    ]);
    assert.deepEqual(mod().buildCataStageLines(e), [
        'Appearance: Excitement (62%), Curiosity',
        'Aftertaste: Craving (40%)',
        'Overall: Satisfaction, Joy',
    ]);
});

test('without proportions: names only, never a % or a number', async () => {
    const e = await F.importWithoutProportions();
    assert.deepEqual(mod().buildCataStageLines(e), ['Appearance: Excitement, Curiosity', 'Aftertaste: Craving']);
    const html = mod().buildCataChipsHtml(e);
    assert.match(html, /Selected by consumers/);
    assert.match(html, /Excitement/);
    assert.ok(!/\d+%/.test(html.replace(/0-10/g, '')), 'no percentage invented: ' + html);
    assert.ok(!/\/10/.test(html), 'no /10 rating');
});

test('chips html: one row per stage, share shown, note says it is not a 0-10 rating', async () => {
    const html = mod().buildCataChipsHtml(await F.importWithProportions());
    assert.match(html, /Appearance/);
    assert.match(html, /Excitement[^<]*<[^>]*>62%/);
    assert.match(html, /not a 0-10 rating/);
    assert.match(mod().buildCataChipsHtml(await F.importWithProportions(), { note: 'Custom note' }), /Custom note/);
});

test('camelCase keys become spaced labels; unknown stage keys go last with their key as label', () => {
    const e = { cataEmotions: { zzStage: { a: null }, texture: { calmRelaxed: 0.5, pleasantlySurprised: null } } };
    assert.deepEqual(mod().buildCataStageLines(e), ['Texture: Calm Relaxed (50%), Pleasantly Surprised', 'zzStage: A']);
});

test('invalid shares are dropped to "selected" (never shown as a number); empty stages skipped', () => {
    const e = { cataEmotions: { appearance: { a: 7, b: -0.1, c: 'x', d: NaN, e: 1, f: 0 }, aroma: {} } };
    const sel = mod().getCataSelections(e);
    assert.equal(sel.length, 1);
    assert.deepEqual(sel[0].items.map(i => [i.key, i.proportion, i.share]), [
        ['a', null, ''], ['b', null, ''], ['c', null, ''], ['d', null, ''], ['e', 1, '100%'], ['f', 0, '0%'],
    ]);
});

test('no cataEmotions / malformed -> nothing (empty strings and arrays)', () => {
    for (const e of [undefined, null, {}, { cataEmotions: null }, { cataEmotions: [] }, { cataEmotions: 'x' },
        { cataEmotions: { appearance: null } }, { cataEmotions: { appearance: [] } }]) {
        assert.equal(mod().hasCataEmotions(e), false);
        assert.deepEqual(mod().getCataSelections(e), []);
        assert.equal(mod().buildCataChipsHtml(e), '');
        assert.equal(mod().buildCataHistoryHtml(e), '');
        assert.equal(mod().buildCataPromptText(e), '');
        assert.deepEqual(mod().buildCataTableRows(e), []);
        assert.deepEqual(mod().buildCataCsvRows(e), []);
    }
    assert.equal(mod().buildCataComparisonHtml([{ productInfo: { name: 'x' } }]), '');
    assert.equal(mod().buildCataComparisonHtml(null), '');
});

test('history line, prompt text, table rows and CSV rows', async () => {
    const e = await F.importWithProportions();
    const h = mod().buildCataHistoryHtml(e);
    assert.match(h, /Selected by consumers/);
    assert.match(h, /Appearance: Excitement \(62%\), Curiosity/);
    const p = mod().buildCataPromptText(e);
    assert.match(p, /Selected by consumers/);
    assert.match(p, /not a 0-10 rating/);
    assert.match(p, /Appearance: Excitement \(62%\), Curiosity/);
    assert.deepEqual(mod().buildCataTableRows(e), [
        ['Excitement', 'Appearance', '62%'],
        ['Curiosity', 'Appearance', 'Selected'],
        ['Craving', 'Aftertaste', '40%'],
        ['Satisfaction', 'Overall', 'Selected'],
        ['Joy', 'Overall', 'Selected'],
    ]);
    assert.deepEqual(mod().buildCataCsvRows(e), [
        'Appearance,"Excitement (62%), Curiosity"',
        'Aftertaste,"Craving (40%)"',
        'Overall,"Satisfaction, Joy"',
    ]);
});

test('comparison html lists only products with selections, names escaped', async () => {
    const a = await F.importWithProportions();
    a.productInfo.name = XSS;
    const html = mod().buildCataComparisonHtml([a, F.sliderExperience()]);
    assert.match(html, /Selected by consumers/);
    assert.match(html, /62%/);
    assert.ok(!html.includes('<img'), html);
    assert.ok(!html.includes('Slider Bar'), 'a product without selections is not listed');
});

test('every text builder escapes keys and stage names', () => {
    const e = { productInfo: { name: XSS }, cataEmotions: { [XSS]: { [XSS]: 0.5 }, appearance: { ['"><script>x</script>']: null } } };
    for (const html of [mod().buildCataChipsHtml(e), mod().buildCataHistoryHtml(e), mod().buildCataComparisonHtml([e])]) {
        assert.ok(html.length > 0);
        assert.ok(!html.includes('<img'), html);
        assert.ok(!html.includes('<script'), html);
    }
    // CSV: a double quote inside a value is doubled
    const csv = mod().buildCataCsvRows({ cataEmotions: { appearance: { 'a"b': null } } });
    assert.deepEqual(csv, ['Appearance,"A""b"']);
});

test('slider experience (no cataEmotions): every builder returns nothing', () => {
    const e = F.sliderExperience();
    assert.equal(mod().hasCataEmotions(e), false);
    assert.equal(mod().buildCataChipsHtml(e), '');
    assert.equal(mod().buildCataHistoryHtml(e), '');
    assert.equal(mod().buildCataPromptText(e), '');
});

test('demo data is unaffected: no demo experience has cataEmotions, builders return nothing', () => {
    const demo = new DemoMode().generateSampleExperiences();
    assert.ok(demo.length > 0);
    for (const e of demo) {
        assert.equal(e.cataEmotions, undefined);
        assert.equal(mod().buildCataChipsHtml(e), '');
        assert.equal(mod().buildCataHistoryHtml(e), '');
    }
    assert.equal(mod().buildCataComparisonHtml(demo), '');
});

test('read-only: builders never change the experience', async () => {
    const e = await F.importWithProportions();
    const before = JSON.stringify(e);
    const m = mod();
    m.getCataSelections(e); m.buildCataChipsHtml(e); m.buildCataHistoryHtml(e); m.buildCataPromptText(e);
    m.buildCataTableRows(e); m.buildCataCsvRows(e); m.buildCataComparisonHtml([e]); m.buildCataStageLines(e);
    assert.equal(JSON.stringify(e), before);
});
