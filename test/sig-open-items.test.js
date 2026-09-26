// Tests for three Signature open items (2026-09-26):
//  1. AI prompts and insight strings sent/showed "undefined/10" and
//     "null/10": claude-api.js formatProductData read legacy field names
//     (aroma.intensity, frontMouth.sourness, ...), untouched triggers and a
//     null satisfaction were interpolated as-is, sensory-inference.js used
//     `rating || overallRating` (a rated 0 was dropped), and app.js insight
//     strings printed "(null/10)" / "NaN/10".
//  2. CSV imports (generic batch import and the QEP 266-column import in
//     batch-import.js) wrote productInfo.category only, while the History
//     row, the jsPDF report and the AI prompt read productInfo.type
//     ("Category: undefined"); the HTML report / CSV exports read
//     productInfo.category only, so hand-entered products showed nothing.
//  3. "Chart Images (PNG)": each chart view exports its drawn charts, one
//     PNG each; the Export & Reports card exports the last chart view.
// Plain browser scripts are loaded into vm contexts with small stubs. The
// AI is never called: only the prompt builders run.
// Run: node test/sig-open-items.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const F = require('./helpers/cata-fixture.js');
const CataEmotions = require('../cata-emotions.js');
const { escapeHtml, jsArgAttr } = require('../dom-utils.js');
const RenderUtils = require('../render-utils.js');
const DemoMode = require('../demo-mode.js');

let DisplayFormat = null;
try { DisplayFormat = require('../display-format.js'); } catch (_) { /* added by the fix */ }

const ROOT = path.join(__dirname, '..');
const NO_BAD_RATING = /(undefined|null|NaN|N\/A)\/10/;

function plain(v) { return JSON.parse(JSON.stringify(v)); }

// ---------- loaders ----------

function claudeAI() {
    global.window = global.window || {};
    global.window.CataEmotions = CataEmotions;
    if (DisplayFormat) global.window.DisplayFormat = DisplayFormat;
    const { ClaudeAI } = require('../claude-api.js');
    return Object.create(ClaudeAI.prototype);
}

function loadScripts(files, extra = {}) {
    const ctx = {
        console, escapeHtml, jsArgAttr, experiences: [],
        document: { documentElement: {} },
        getComputedStyle: () => ({ getPropertyValue: () => '' }),
        window: { CataEmotions, DisplayFormat },
        ...extra,
    };
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'sensory-attributes.js'), 'utf8'), ctx, { filename: 'sensory-attributes.js' });
    for (const file of files) {
        vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
    }
    return ctx;
}

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

// Real app.js with a recording DOM; returns a few internal functions.
function loadApp(extra = {}) {
    const APP_SRC = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    const els = new Map();
    function el(id) {
        if (!els.has(id)) {
            els.set(id, { id, innerHTML: '', textContent: '', style: {}, value: '', getContext: () => ({ clearRect() {} }),
                addEventListener() {}, classList: { add() {}, remove() {}, contains: () => false } });
        }
        return els.get(id);
    }
    const provided = {
        document: {
            addEventListener() {}, getElementById: el, querySelector: () => stub('qs'), querySelectorAll: () => [],
            createElement: () => stub('createElement'), body: stub('body'),
        },
        localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
        console,
        window: { TouchedFields: require('../touched-fields.js'), CataEmotions, DisplayFormat },
        escapeHtml,
        jsArgAttr,
        RenderUtils,
        ...extra,
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
;return { generateQuickInsights, generateProfessionalInsights, renderTriggerInsights,
  renderEmotionalDriversInsights, initNavigation, setExperiences: (v) => { experiences = v; } }; }`);
    return { app: factory(scope), el };
}

// ---------- fixtures ----------

// A hand-entered experience with current (lexicon) field names, every value rated.
function modernExperience(overrides = {}) {
    return {
        id: 1777019020364.0994,
        timestamp: '2026-09-20T10:00:00.000Z',
        productInfo: { name: 'Modern Bar', brand: 'B', type: 'confectionery' },
        needState: 'reward',
        emotionalTriggers: { moreishness: 6, refreshment: 3, melt: 7, crunch: 2 },
        notes: '',
        stages: {
            appearance: { visualAppeal: 8, emotions: { excitement: 8, curiosity: 3 } },
            aroma: { smellStrength: 6, emotions: { comfort: 5 } },
            frontMouth: { overallInitialImpact: 7, sweetness: 6, sournessTartness: 2, emotions: { pleasure: 7 } },
            midRearMouth: { overallMidPalateIntensity: 5, richnessFullness: 4, emotions: { indulgent: 4 } },
            texture: { overallTexturalComplexity: 6, creaminess: 5, emotions: { satisfied: 6 } },
            aftertaste: { finishLength: 5, emotions: { satisfaction: 7, craving: 6 } },
            overall: { emotions: { satisfaction: 8, joy: 5 } },
        },
        ...overrides,
    };
}

// The same product with the legacy field names (what old code expected), all rated.
function legacyExperience(overrides = {}) {
    return {
        id: 1777019020364.5,
        timestamp: '2026-09-20T10:00:00.000Z',
        productInfo: { name: 'Legacy Bar', brand: 'L', type: 'snack', occasion: 'Afternoon' },
        needState: 'escape',
        emotionalTriggers: { moreishness: 8, refreshment: 0, melt: 4, crunch: 9 },
        stages: {
            appearance: { visualAppeal: 7, emotions: { excitement: 6 } },
            aroma: { intensity: 5, emotions: { comfort: 4 } },
            frontMouth: { sweetness: 6, sourness: 1, emotions: { pleasure: 5 } },
            midRearMouth: { richness: 7, creaminess: 6, emotions: { indulgent: 7 } },
            texture: { crunchiness: 9, overallComplexity: 5, emotions: {} },
            aftertaste: { duration: 4, pleasantness: 8, emotions: { satisfaction: 9 } },
            overall: { emotions: { joy: 7 } },
        },
        ...overrides,
    };
}

// ---------- the pre-fix prompt builders, verbatim (guard reference) ----------

const Legacy = {
    formatProductData(experience) {
        const emotions = [];
        Object.entries(experience.stages).forEach(([stageName, stage]) => {
            if (stage.emotions) {
                Object.entries(stage.emotions).forEach(([emotion, value]) => {
                    if (typeof value !== 'number') return;
                    emotions.push({ stage: stageName, emotion, value });
                });
            }
        });
        const cataText = CataEmotions.buildCataPromptText(experience);
        const topEmotions = emotions
            .sort((a, b) => b.value - a.value)
            .slice(0, 5)
            .map(e => `${e.emotion} (${e.value}/10) at ${e.stage}`)
            .join(', ');
        let textureSummary = 'N/A';
        if (experience.stages.texture) {
            const tex = experience.stages.texture;
            const textureEntries = Object.entries(tex).filter(([k, v]) => k !== 'emotions' && typeof v === 'number');
            if (textureEntries.length > 0) {
                textureSummary = textureEntries
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([k, v]) => `${k}: ${v}/10`)
                    .join(', ');
            }
        }
        return `**Product**: ${experience.productInfo.name} - ${experience.productInfo.brand}
**Category**: ${experience.productInfo.type}
**Need State**: ${experience.needState}
**Occasion**: ${experience.productInfo.occasion || 'Not specified'}

**Sensory Profile**:
- Appearance: Visual Appeal ${experience.stages.appearance.visualAppeal}/10
- Aroma: Intensity ${experience.stages.aroma.intensity}/10
- Taste: Sweet ${experience.stages.frontMouth.sweetness}/10, Sour ${experience.stages.frontMouth.sourness}/10
- Mouthfeel: Richness ${experience.stages.midRearMouth.richness}/10, Creaminess ${experience.stages.midRearMouth.creaminess}/10
- Texture: ${textureSummary}
- Aftertaste: Duration ${experience.stages.aftertaste.duration}/10, Pleasantness ${experience.stages.aftertaste.pleasantness}/10

**Top Emotions**: ${topEmotions || 'None rated'}
${cataText ? `\n${cataText}\n` : ''}
**Emotional Triggers**:
- Moreishness: ${experience.emotionalTriggers.moreishness}/10
- Refreshment: ${experience.emotionalTriggers.refreshment}/10
- The Melt: ${experience.emotionalTriggers.melt}/10
- Texture/Crunch: ${experience.emotionalTriggers.crunch}/10`;
    },
    formatPortfolioData(experiences, ai) {
        // The old code sorted the caller's array in place; the reference gets a copy.
        return `**Portfolio Size**: ${experiences.length} products

**Need State Distribution**:
${ai.getNeedStateDistribution(experiences)}

**Top Products by Satisfaction**:
${Legacy.getTopProducts(experiences, 5)}

**Emotional Diversity**: ${ai.calculateDiversity(experiences)}

**Products**:
${experiences.map((exp, idx) => `${idx + 1}. ${exp.productInfo.name} (${exp.productInfo.brand}) - ${exp.needState}, Satisfaction: ${exp.stages.aftertaste.emotions.satisfaction}/10`).join('\n')}`;
    },
    getTopProducts(experiences, limit) {
        return experiences
            .sort((a, b) => b.stages.aftertaste.emotions.satisfaction - a.stages.aftertaste.emotions.satisfaction)
            .slice(0, limit)
            .map((exp, idx) => `${idx + 1}. ${exp.productInfo.name} - ${exp.stages.aftertaste.emotions.satisfaction}/10`)
            .join('\n');
    },
};

// =====================================================================
// Bug 1: AI prompts / insight strings
// =====================================================================

test('AI product prompt: current field names, no "undefined/10" (modern slider experience)', () => {
    const text = claudeAI().formatProductData(modernExperience());
    assert.ok(!NO_BAD_RATING.test(text), text);
    assert.match(text, /- Aroma: Intensity 6\/10\n/);
    assert.match(text, /- Taste: Sweet 6\/10, Sour 2\/10\n/);
    assert.match(text, /- Mouthfeel: Richness 4\/10, Creaminess Not rated\n/);
    assert.match(text, /- Aftertaste: Duration 5\/10, Pleasantness Not rated\n/);
});

test('AI product prompt: untouched triggers are "Not rated", a rated 0 is "0/10"', () => {
    const exp = modernExperience({ emotionalTriggers: { moreishness: null, refreshment: 0, melt: undefined, crunch: 4 } });
    const text = claudeAI().formatProductData(exp);
    assert.match(text, /- Moreishness: Not rated\n- Refreshment: 0\/10\n- The Melt: Not rated\n- Texture\/Crunch: 4\/10$/);
    assert.ok(!NO_BAD_RATING.test(text), text);
});

test('AI product prompt: missing triggers object and missing stages do not throw', () => {
    const exp = modernExperience();
    delete exp.emotionalTriggers;
    delete exp.stages.aroma;
    delete exp.stages.aftertaste;
    let text;
    assert.doesNotThrow(() => { text = claudeAI().formatProductData(exp); });
    assert.match(text, /- Aroma: Intensity Not rated\n/);
    assert.match(text, /- Aftertaste: Duration Not rated, Pleasantness Not rated\n/);
    assert.match(text, /- Moreishness: Not rated\n/);
});

test('AI product prompt: a real 266-column Capture import has no "undefined/10"/"null/10"', async () => {
    const text = claudeAI().formatProductData(await F.importWithProportions());
    assert.ok(!NO_BAD_RATING.test(text), text);
    assert.match(text, /- Appearance: Visual Appeal 7\/10\n/);
    assert.match(text, /- Moreishness: 7\/10\n- Refreshment: Not rated\n/);
});

test('AI product prompt GUARD: all 8 demo products are byte-identical to the pre-fix prompt', () => {
    const ai = claudeAI();
    const demo = new DemoMode().generateSampleExperiences();
    assert.equal(demo.length, 8);
    for (const exp of demo) {
        const before = Legacy.formatProductData(plain(exp));
        assert.ok(!NO_BAD_RATING.test(before), 'demo reference is already correct');
        assert.equal(ai.formatProductData(plain(exp)), before, exp.id);
    }
});

test('AI product prompt GUARD: a fully rated legacy-shaped slider experience is byte-identical', () => {
    const exp = legacyExperience();
    assert.equal(claudeAI().formatProductData(plain(exp)), Legacy.formatProductData(plain(exp)));
});

test('AI product prompt GUARD: modern experience - every line that was already correct is unchanged', () => {
    const before = Legacy.formatProductData(modernExperience()).split('\n');
    const after = claudeAI().formatProductData(modernExperience()).split('\n');
    assert.equal(after.length, before.length);
    before.forEach((line, i) => {
        if (!/undefined|null/.test(line)) assert.equal(after[i], line, `line ${i}`);
    });
});

test('AI product prompt: CATA section is unchanged', async () => {
    const exp = await F.importWithProportions();
    const text = claudeAI().formatProductData(exp);
    assert.ok(text.includes(CataEmotions.buildCataPromptText(exp)));
});

test('AI portfolio prompt: null satisfaction is "Not rated", 0 is "0/10", top list only rated', () => {
    const exps = [
        modernExperience({ id: 1, productInfo: { name: 'Null Sat', brand: 'A', type: 'food' },
            stages: { ...modernExperience().stages, aftertaste: { finishLength: 3, emotions: { satisfaction: null } } } }),
        modernExperience({ id: 2, productInfo: { name: 'Zero Sat', brand: 'B', type: 'food' },
            stages: { ...modernExperience().stages, aftertaste: { finishLength: 3, emotions: { satisfaction: 0 } } } }),
        modernExperience({ id: 3, productInfo: { name: 'Seven Sat', brand: 'C', type: 'food' } }),
    ];
    const text = claudeAI().formatPortfolioData(exps);
    assert.ok(!NO_BAD_RATING.test(text), text);
    assert.match(text, /Null Sat \(A\) - reward, Satisfaction: Not rated/);
    assert.match(text, /Zero Sat \(B\) - reward, Satisfaction: 0\/10/);
    const top = text.split('**Top Products by Satisfaction**:\n')[1].split('\n\n')[0];
    assert.equal(top, '1. Seven Sat - 7/10\n2. Zero Sat - 0/10');
});

test('AI portfolio prompt: the caller\'s experiences array is not reordered', () => {
    const exps = [legacyExperience({ id: 1 }), modernExperience({ id: 2 })];
    const ids = exps.map(e => e.id);
    claudeAI().formatPortfolioData(exps);
    assert.deepEqual(exps.map(e => e.id), ids);
});

test('AI portfolio prompt GUARD: fully rated portfolio is byte-identical to the pre-fix prompt', () => {
    const ai = claudeAI();
    const demo = new DemoMode().generateSampleExperiences();
    const expected = Legacy.formatPortfolioData(plain(demo), ai);
    assert.equal(ai.formatPortfolioData(plain(demo)), expected);
});

test('sensory-inference prompt: a rated 0 is "0/10"; a numeric string is kept; nothing rated omits the line', () => {
    const { SensoryInference } = require('../sensory-inference.js');
    assert.match(SensoryInference.buildClaudePrompt({ name: 'X', rating: 0 }), /\*\*Overall Rating:\*\* 0\/10\n/);
    assert.match(SensoryInference.buildClaudePrompt({ name: 'X', overallRating: '7' }), /\*\*Overall Rating:\*\* 7\/10\n/);
    assert.match(SensoryInference.buildClaudePrompt({ name: 'X', rating: null, overallRating: 6 }), /\*\*Overall Rating:\*\* 6\/10\n/);
    const none = SensoryInference.buildClaudePrompt({ name: 'X', rating: '' });
    assert.ok(!/Overall Rating/.test(none), none);
    assert.ok(!NO_BAD_RATING.test(none));
});

test('Dashboard quick insight: nothing rated is not shown as "0/10"; highest rated wins', () => {
    const { app } = loadApp();
    const nullSat = modernExperience({ id: 1, productInfo: { name: 'Unrated', brand: 'A', type: 'food' },
        stages: { ...modernExperience().stages, aftertaste: { emotions: { satisfaction: null } } } });
    app.setExperiences([nullSat]);
    const top = app.generateQuickInsights().find(i => i.title === 'Top Rated');
    assert.ok(top && !/\/10/.test(top.text), JSON.stringify(top));
    app.setExperiences([nullSat, modernExperience({ id: 2 })]);
    assert.equal(app.generateQuickInsights().find(i => i.title === 'Top Rated').text, 'Modern Bar (7/10)');
});

test('Dashboard quick insight GUARD: fully rated demo portfolio text unchanged', () => {
    const { app } = loadApp();
    const demo = new DemoMode().generateSampleExperiences();
    app.setExperiences(demo);
    const best = demo.reduce((m, e) => (e.stages.aftertaste.emotions.satisfaction > m.stages.aftertaste.emotions.satisfaction ? e : m));
    assert.equal(app.generateQuickInsights().find(i => i.title === 'Top Rated').text,
        `${best.productInfo.name} (${best.stages.aftertaste.emotions.satisfaction}/10)`);
});

test('Professional insights: null satisfaction and modern stages never print "null/10"/"NaN/10"', () => {
    const { app } = loadApp();
    const nullSat = modernExperience({ id: 1, stages: { ...modernExperience().stages, aftertaste: { finishLength: 5, emotions: { satisfaction: null } } } });
    app.setExperiences([nullSat]);
    let insights;
    assert.doesNotThrow(() => { insights = app.generateProfessionalInsights(); });
    const all = insights.map(i => i.description).join('\n');
    assert.ok(!NO_BAD_RATING.test(all), all);
    app.setExperiences([nullSat, modernExperience({ id: 2, productInfo: { name: 'Rated', brand: 'R', type: 'food' } })]);
    const top = app.generateProfessionalInsights().find(i => i.title === 'Top Performer');
    assert.match(top.description, /Rated<\/strong> by R achieves the highest satisfaction \(7\/10\)/);
});

test('Trigger insights: null triggers are left out of the average; all-null is "Not rated"', () => {
    const { app, el } = loadApp();
    app.setExperiences([
        modernExperience({ id: 1, emotionalTriggers: { moreishness: 8, refreshment: null, melt: 4, crunch: null } }),
        modernExperience({ id: 2, emotionalTriggers: { moreishness: null, refreshment: null, melt: 6, crunch: null } }),
    ]);
    app.renderTriggerInsights();
    const html = el('trigger-insights').innerHTML;
    assert.ok(!NO_BAD_RATING.test(html), html);
    assert.match(html, /Moreishness: 8\.0\/10/);
    assert.match(html, /The Melt: 5\.0\/10/);
    assert.match(html, /Refreshment: Not rated/);
    assert.match(html, /Texture\/Crunch: Not rated/);
    assert.match(html, /Moreishness scores highest across your products \(8\.0\/10\)/);
});

test('Trigger insights GUARD: fully rated demo portfolio HTML unchanged', () => {
    const { app, el } = loadApp();
    const demo = new DemoMode().generateSampleExperiences();
    app.setExperiences(demo);
    app.renderTriggerInsights();
    const avg = (k) => (demo.reduce((s, e) => s + e.emotionalTriggers[k], 0) / demo.length).toFixed(1);
    const html = el('trigger-insights').innerHTML;
    assert.match(html, new RegExp(`Moreishness: ${avg('moreishness')}/10<br>\\s*Refreshment: ${avg('refreshment')}/10<br>\\s*The Melt: ${avg('melt')}/10<br>\\s*Texture/Crunch: ${avg('crunch')}/10</p>`));
});

test('Emotional drivers: unrated (null) emotions are not shown as "0/10"', async () => {
    const { app, el } = loadApp();
    const exp = await F.importWithProportions();
    app.renderEmotionalDriversInsights(exp);
    const html = el('emotional-drivers-insights').innerHTML;
    assert.ok(!NO_BAD_RATING.test(html), html);
    assert.ok(!/Peak: 0\/10/.test(html), 'a never-rated emotion is not "Peak: 0/10": ' + html);
});

// =====================================================================
// Bug 2: CSV import category
// =====================================================================

test('QEP 266-column import writes productInfo.type (and keeps category)', async () => {
    const exp = await F.importCaptureExperience({});
    assert.equal(exp.productInfo.type, 'Chocolate Bar');
    assert.equal(exp.productInfo.category, 'Chocolate Bar');
});

test('QEP import without a Category value: type and category default to food', async () => {
    const exp = await F.importCaptureExperience({ Category: '' });
    assert.equal(exp.productInfo.type, 'food');
    assert.equal(exp.productInfo.category, 'food');
});

test('generic batch import writes productInfo.type (and keeps category)', () => {
    const ctx = { window: {}, console, experiences: [], saveData: () => {} };
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'batch-import.js'), 'utf8'), ctx, { filename: 'batch-import.js' });
    const mapping = vm.runInContext('suggestColumnMapping(["Product_Name", "Brand", "Category"])', ctx);
    ctx.__row = { Product_Name: 'Crisps', Brand: 'Z', Category: 'Savoury Snack' };
    ctx.__map = mapping;
    const exp = vm.runInContext('createExperienceFromRow(__row, __map)', ctx);
    assert.equal(exp.productInfo.type, 'Savoury Snack');
    assert.equal(exp.productInfo.category, 'Savoury Snack');
    ctx.__row = { Product_Name: 'Plain', Brand: 'Z', Category: '' };
    assert.equal(vm.runInContext('createExperienceFromRow(__row, __map)', ctx).productInfo.type, 'food');
});

// Records already in Firestore from earlier imports: category only, no type.
function categoryOnly() { return modernExperience({ productInfo: { name: 'Old Import', brand: 'Acme', category: 'Chocolate Bar' } }); }
function noCategory() { return modernExperience({ productInfo: { name: 'No Cat', brand: 'Acme' } }); }
function typeOnly() { return modernExperience({ productInfo: { name: 'Manual', brand: 'Acme', type: 'dessert' } }); }

function fakeJsPdf(texts) {
    return function FakeDoc() {
        const doc = {
            internal: { pageSize: { width: 210, height: 297 } },
            lastAutoTable: { finalY: 0 },
            autoTable(opts) { doc.lastAutoTable = { finalY: (opts.startY || 0) + 10 }; },
            text(t) { texts.push(Array.isArray(t) ? t.join(' ') : String(t)); },
            splitTextToSize: (t) => [String(t)],
            save() {},
        };
        return new Proxy(doc, { get: (t, p) => (p in t ? t[p] : () => {}) });
    };
}

async function pdfCategoryLine(exp) {
    const texts = [];
    const ctx = loadScripts(['pdf-export.js']);
    ctx.window.jspdf = { jsPDF: fakeJsPdf(texts) };
    await new ctx.window.PDFExporter().generateProductReport(exp);
    return texts.find(t => t.startsWith('Category:'));
}

test('jsPDF product report: Category falls back to productInfo.category, else "Not specified"', async () => {
    assert.equal(await pdfCategoryLine(categoryOnly()), 'Category: Chocolate Bar');
    assert.equal(await pdfCategoryLine(await F.importCaptureExperience({})), 'Category: Chocolate Bar');
    assert.equal(await pdfCategoryLine(noCategory()), 'Category: Not specified');
    assert.equal(await pdfCategoryLine(typeOnly()), 'Category: dessert');
});

test('HTML/print product report: Category shows type or category, else "Not specified"', () => {
    const ctx = loadScripts(['export-reporting.js']);
    const cat = (exp) => {
        const html = ctx.generateProductReportContent(exp);
        return html.match(/<span class="info-label">Category<\/span>\s*<span class="info-value">([^<]*)<\/span>/)[1];
    };
    assert.equal(cat(categoryOnly()), 'Chocolate Bar');
    assert.equal(cat(typeOnly()), 'dessert');
    assert.equal(cat(noCategory()), 'Not specified');
});

test('HTML comparison report: Category line never "undefined", reads type too', () => {
    const ctx = loadScripts(['export-reporting.js']);
    const html = ctx.generateComparisonReportContent([typeOnly(), categoryOnly(), noCategory()]);
    assert.ok(!/Category:<\/strong>\s*(undefined|null)?</.test(html), html);
    assert.match(html, /Category:<\/strong> dessert</);
    assert.match(html, /Category:<\/strong> Chocolate Bar</);
    assert.match(html, /Category:<\/strong> Not specified</);
});

test('CSV exports: Category column uses type or category, blank (never "undefined") when missing', () => {
    const downloads = [];
    const ctx = loadScripts(['export-reporting.js'], {
        Blob: class { constructor(parts) { this.text = parts.join(''); } },
        document: { documentElement: {}, createElement: () => ({ click() {} }) },
    });
    ctx.window.URL = { createObjectURL: (b) => { downloads.push(b.text); return 'blob:x'; }, revokeObjectURL() {} };
    const exps = [typeOnly(), categoryOnly(), noCategory()];
    exps.forEach((e, i) => { e.id = i + 1; });
    ctx.experiences = exps;
    vm.runInContext('experiences = this.experiences', ctx);
    ctx.exportProductToExcel(1);
    ctx.exportProductToExcel(2);
    ctx.exportProductToExcel(3);
    ctx.exportAllProductsToExcel();
    assert.match(downloads[0], /\nCategory,dessert\n/);
    assert.match(downloads[1], /\nCategory,Chocolate Bar\n/);
    assert.match(downloads[2], /\nCategory,\n/);
    const portfolio = downloads[3];
    assert.ok(!/undefined/.test(portfolio), portfolio);
    assert.match(portfolio, /"Manual","Acme","dessert",/);
    assert.match(portfolio, /"Old Import","Acme","Chocolate Bar",/);
    assert.match(portfolio, /"No Cat","Acme","",/);
});

test('Export & Reports list and portfolio summary: category from type or category', () => {
    const ctx = loadScripts(['export-reporting.js', 'export-reporting-ui.js']);
    const exps = [typeOnly(), categoryOnly(), noCategory()];
    vm.runInContext('experiences = this.__e', Object.assign(ctx, { __e: exps }));
    const list = ctx.renderProductReportsSection();
    assert.match(list, /Acme \u2022 dessert</);
    assert.match(list, /Acme \u2022 Chocolate Bar</);
    assert.match(list, /Acme \u2022 Not specified</);
    const summary = ctx.buildPortfolioSummaryHtml(exps);
    assert.match(summary, /<td>dessert<\/td>/);
    assert.match(summary, /<td>Chocolate Bar<\/td>/);
    assert.match(summary, /<td>Not specified<\/td>/);
    assert.match(summary, /Categories<\/div>\s*<div class="stat-value">2</, 'a missing category is not counted as a category');
});

test('AI product prompt: Category falls back to productInfo.category, else "Not specified"', async () => {
    const ai = claudeAI();
    assert.match(ai.formatProductData(categoryOnly()), /\*\*Category\*\*: Chocolate Bar\n/);
    assert.match(ai.formatProductData(await F.importCaptureExperience({})), /\*\*Category\*\*: Chocolate Bar\n/);
    assert.match(ai.formatProductData(noCategory()), /\*\*Category\*\*: Not specified\n/);
    assert.ok(!/undefined/.test(ai.formatProductData(noCategory())));
});

test('History row: category badge falls back to productInfo.category, never blank/"undefined"', () => {
    const badge = (exp) => RenderUtils.buildHistoryHtml([exp]).match(/<span class="history-item-type">([^<]*)<\/span>/)[1];
    assert.equal(badge(categoryOnly()), 'Chocolate Bar');
    assert.equal(badge(typeOnly()), 'dessert');
    assert.equal(badge(noCategory()), 'Not specified');
});

test('Excel data export: Type column falls back to productInfo.category', () => {
    const ctx = loadScripts(['excel-import.js'], { XLSX: { utils: { json_to_sheet: (rows) => ({ rows }) } } });
    const importer = new ctx.window.ExcelImporter();
    const sheet = importer.createExperiencesSheet([typeOnly(), categoryOnly(), noCategory()]);
    assert.deepEqual(plain(sheet.rows.map(r => r.Type)), ['dessert', 'Chocolate Bar', '']);
});

// =====================================================================
// Bug 3: Chart Images (PNG)
// =====================================================================

// A fake view: canvases with an optional live chart; parents for hidden cards.
function chartHarness(views) {
    const calls = [];
    const byId = new Map();
    const liveCharts = new Map();
    for (const [viewName, canvases] of Object.entries(views)) {
        const viewEl = { id: `view-${viewName}`, style: {}, parentElement: null, hidden: false, canvases: [] };
        viewEl.querySelectorAll = (sel) => (sel === 'canvas' ? viewEl.canvases : []);
        byId.set(viewEl.id, viewEl);
        for (const c of canvases) {
            const card = { style: { display: c.cardDisplay || '' }, hidden: false, parentElement: viewEl };
            const canvas = { id: c.id, style: { display: c.display || '' }, hidden: false, parentElement: card,
                toDataURL: () => `data:image/png;base64,${c.id}` };
            viewEl.canvases.push(canvas);
            byId.set(c.id, canvas);
            if (c.chart !== false) {
                liveCharts.set(canvas, {
                    canvas,
                    data: { datasets: c.datasets || [{ data: [1, 2, 3] }] },
                    update(mode) { calls.push(['update', c.id, mode]); },
                });
            }
        }
    }
    const ctx = loadScripts(['export-reporting.js'], {
        document: {
            documentElement: {},
            getElementById: (id) => byId.get(id) || null,
            createElement: () => { const a = { click() { calls.push(['download', a.download, a.href]); } }; return a; },
        },
        Chart: { getChart: (canvas) => liveCharts.get(canvas) },
        showExportNotification: (msg, type) => calls.push(['notify', type, msg]),
    });
    return { ctx, calls, downloads: () => calls.filter(c => c[0] === 'download').map(c => c[1]) };
}

const DAY = new Date(2026, 8, 26, 15, 30);

test('Chart Images: exports every drawn chart on the view, one PNG each, named <view>_<canvas>_<date>.png', () => {
    const { ctx, calls, downloads } = chartHarness({ 'need-states': [{ id: 'need-state-chart' }, { id: 'triggers-chart' }] });
    assert.equal(typeof ctx.exportViewCharts, 'function');
    ctx.exportViewCharts('need-states', DAY);
    assert.deepEqual(downloads(), ['need-states_need-state-chart_2026-09-26.png', 'need-states_triggers-chart_2026-09-26.png']);
    // each chart is brought to its final frame before its PNG is taken
    const u = calls.findIndex(c => c[0] === 'update' && c[1] === 'triggers-chart' && c[2] === 'none');
    const d = calls.findIndex(c => c[0] === 'download' && c[1].includes('triggers-chart'));
    assert.ok(u >= 0 && d > u, JSON.stringify(calls));
    assert.ok(calls.some(c => c[0] === 'notify' && c[1] === 'success'));
});

test('Chart Images: hidden canvases, hidden cards, empty and undrawn charts are skipped', () => {
    const { ctx, downloads } = chartHarness({
        'shape-of-taste': [
            { id: 'shape-chart', display: 'none' },
            { id: 'emotional-journey-chart' },
        ],
        comparison: [
            { id: 'comparison-emotion-radar', datasets: [] },
            { id: 'comparison-shape-chart', datasets: [{ data: [] }] },
            { id: 'comparison-triggers-chart', cardDisplay: 'none' },
            { id: 'undrawn', chart: false },
        ],
    });
    ctx.exportViewCharts('shape-of-taste', DAY);
    assert.deepEqual(downloads(), ['shape-of-taste_emotional-journey-chart_2026-09-26.png']);
    ctx.exportViewCharts('comparison', DAY);
    assert.deepEqual(downloads(), ['shape-of-taste_emotional-journey-chart_2026-09-26.png']);
});

test('Chart Images: a view with no drawn charts shows an info notification and downloads nothing', () => {
    const { ctx, calls, downloads } = chartHarness({ portfolio: [{ id: 'portfolio-cluster-chart', chart: false }] });
    const out = ctx.exportViewCharts('portfolio', DAY);
    assert.equal(out.length, 0);
    assert.deepEqual(downloads(), []);
    assert.ok(calls.some(c => c[0] === 'notify' && c[1] === 'info'), JSON.stringify(calls));
});

test('Chart Images card: with no chart view visited it tells the user where to go', () => {
    const { ctx, calls, downloads } = chartHarness({ 'need-states': [{ id: 'need-state-chart' }] });
    ctx.exportLastChartViewCharts();
    assert.deepEqual(downloads(), []);
    const n = calls.find(c => c[0] === 'notify');
    assert.ok(n && n[1] === 'info' && /Chart Images/.test(n[2]), JSON.stringify(calls));
});

test('Chart Images card: exports the charts of the most recently visited chart view', () => {
    const { ctx, downloads } = chartHarness({
        'need-states': [{ id: 'need-state-chart' }],
        'emotional-map': [{ id: 'emotional-map-chart' }, { id: 'emotional-profile-radar' }],
    });
    ctx.recordChartView('need-states');
    ctx.recordChartView('emotional-map');
    ctx.recordChartView('export-reports'); // not a chart view: ignored
    ctx.exportLastChartViewCharts(DAY);
    assert.deepEqual(downloads(), ['emotional-map_emotional-map-chart_2026-09-26.png', 'emotional-map_emotional-profile-radar_2026-09-26.png']);
});

test('Chart Images: falls back to the app chart registry when Chart.getChart is unavailable', () => {
    const { ctx, downloads } = chartHarness({ 'need-states': [{ id: 'need-state-chart', chart: false }] });
    const canvas = ctx.document.getElementById('need-state-chart');
    ctx.Chart = undefined;
    ctx.charts = { needState: { canvas, data: { datasets: [{ data: [3] }] }, update() {} } };
    ctx.exportViewCharts('need-states', DAY);
    assert.deepEqual(downloads(), ['need-states_need-state-chart_2026-09-26.png']);
});

test('Chart Images card in Export & Reports is clickable and wired to the last chart view', () => {
    const ctx = loadScripts(['export-reporting.js', 'export-reporting-ui.js']);
    const html = ctx.renderExportOverview();
    const card = html.split('<div class="stat-card').find(s => s.includes('Chart Images'));
    assert.ok(card, html);
    assert.match(card, /onclick="exportLastChartViewCharts\(\)"/);
    assert.match(card, /role="button"/);
});

test('Chart Images button on every chart view in index.html', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    for (const view of ['shape-of-taste', 'emotional-map', 'need-states', 'comparison', 'portfolio']) {
        const start = html.indexOf(`<div id="view-${view}" class="view">`);
        assert.ok(start >= 0, view);
        const end = html.indexOf('<div id="view-', start + 10);
        const section = html.slice(start, end);
        assert.ok(/<canvas /.test(section), `${view} has canvases`);
        assert.ok(section.includes(`onclick="exportViewCharts('${view}')"`), `${view} has a Chart Images button`);
        assert.ok(/Chart Images \(PNG\)/.test(section), `${view} button label`);
    }
});

test('Navigation records the chart view it opens (for the Export & Reports card)', () => {
    const recorded = [];
    const handlers = [];
    const navItem = (view) => ({ dataset: { view }, classList: { add() {}, remove() {} },
        addEventListener: (ev, fn) => handlers.push({ view, fn }) });
    const items = [navItem('need-states'), navItem('history')];
    const { app } = loadApp({
        recordChartView: (v) => recorded.push(v),
        document: {
            addEventListener() {}, getElementById: () => stub('el'), querySelector: () => stub('qs'),
            querySelectorAll: (sel) => (sel === '.nav-item' ? items : []), createElement: () => stub('ce'), body: stub('body'),
        },
    });
    app.initNavigation();
    for (const h of handlers) h.fn.call(items.find(i => i.dataset.view === h.view), { preventDefault() {} });
    assert.deepEqual(recorded, ['need-states', 'history']);
});
