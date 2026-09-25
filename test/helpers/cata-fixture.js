// Shared fixtures for the CATA emotion display tests.
//
// importCaptureExperience() runs a 266-column Capture export row (headers
// from test/fixtures/capture-export-266-headers.txt, the qep-capture
// contract) through the REAL batch-import.js parseQEPImportCSV +
// executeQEPBatchImport, so the experience has exactly the shape the app
// stores (emotion sliders null, selection in experience.cataEmotions).
// sliderExperience() is a hand-entered style experience with numeric
// emotion sliders and no cataEmotions.

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..', '..');
const HEADERS_266 = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'capture-export-266-headers.txt'), 'utf8')
    .split('\n').map(s => s.trim()).filter(Boolean);

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
    app_Visual_Appeal: '7',
    tex_Crunchiness: '8',
    overall_Trigger_Moreishness: '7',
};

async function importCaptureExperience(values) {
    if (HEADERS_266.length !== 266) throw new Error('fixture must have 266 headers');
    const window = {};
    const ctx = { window, console, experiences: [], saveData: () => {} };
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'batch-import.js'), 'utf8'), ctx, { filename: 'batch-import.js' });
    const parsed = ctx.window.BatchImport.parseQEPImportCSV(buildCsv(HEADERS_266, { ...BASE, ...values }));
    if (!parsed.success) throw new Error(JSON.stringify(parsed.errors));
    const out = await ctx.window.BatchImport.executeQEPBatchImport(parsed.products);
    if (out.success !== 1) throw new Error(JSON.stringify(out.errors));
    // plain copy: vm objects carry another realm's prototypes
    return JSON.parse(JSON.stringify(ctx.experiences[0]));
}

/** With proportions (appearance) and without (aftertaste, overall). */
function importWithProportions() {
    return importCaptureExperience({
        app_Emotions: 'excitement:0.62; curiosity',
        aft_Emotions: 'craving-want-more (40%)',
        oa_Emotions: 'satisfaction;joy',
    });
}

/** Selections only, no share on any token. */
function importWithoutProportions() {
    return importCaptureExperience({ app_Emotions: 'excitement;curiosity', aft_Emotions: 'craving-want-more' });
}

function sliderExperience(overrides = {}) {
    return {
        id: 1777019020364.0994,
        timestamp: '2026-09-20T10:00:00.000Z',
        productInfo: { name: 'Slider Bar', brand: 'B', type: 'confectionery', category: 'Chocolate' },
        needState: 'reward',
        emotionalTriggers: { moreishness: 6, refreshment: 3, melt: 7, crunch: 2 },
        notes: '',
        stages: {
            appearance: { visualAppeal: 8, emotions: { excitement: 8, curiosity: 3, desire: 0 } },
            aroma: { smellStrength: 6, emotions: { comfort: 5 } },
            frontMouth: { overallInitialImpact: 7, sweetness: 6, emotions: { pleasure: 7 } },
            midRearMouth: { overallMidPalateIntensity: 5, emotions: { indulgent: 4 } },
            texture: { overallTexturalComplexity: 6, emotions: { satisfied: 6 } },
            aftertaste: { finishLength: 5, emotions: { satisfaction: 7, craving: 6 } },
            overall: { emotions: { satisfaction: 8, joy: 5 } },
        },
        ...overrides,
    };
}

function withoutCata(exp) {
    const copy = JSON.parse(JSON.stringify(exp));
    delete copy.cataEmotions;
    return copy;
}

module.exports = {
    HEADERS_266, importCaptureExperience, importWithProportions, importWithoutProportions,
    sliderExperience, withoutCata,
};
