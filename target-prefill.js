// ===== TARGET PREFILL (pure mapping, DOM-agnostic) =====
// Turns a Brief target result (targets-loaded.js's fetchQepCaptureTargets*
// shape) into MARKERS for Signature's Full Evaluation form. Nothing here
// touches the DOM, Supabase, or Firestore - it only maps data the caller
// already fetched, so it is unit-testable with plain fixtures. The small
// HTML builders at the bottom are pure string functions (escaped here, so
// app.js only inserts them).
//
// A brief target is NEVER written into a slider's value. Sliders stay in
// their normal empty/default state and untouched (touched-fields.js:
// untouched saves as null); a target is only drawn as a "Target N" marker
// on the slider track, plus the stage's brief text shown as "Brief says:".
//
// EMOTION targets: Brief Lock writes real, attribute-keyed rows
// (tss_shared.targets: variable_key + intensity - qep-capture migrations
// 0010/0011), reverse-mapped through the crosswalk
// (tss_shared.signature_attribute_map / signature_key_alias, migrations
// 0025/0029) to a specific Signature stage+slider.
//
// SENSORY targets: Brief's sensory picks are free marketing-language labels
// with no variable_key (tss-re1 BriefState.sensory is `{ stageKey, label }[]`,
// joined "; " into tss_shared.version_stage_notes by lockBrief()). They
// reach a slider ONLY through the reviewed, hand-curated
// BRIEF_SENSORY_TO_QEP_ATTRIBUTE table (brief-sensory-crosswalk.js):
// brief label -> qep_attribute id -> (same crosswalk rows, kind 'sensory')
// -> Signature slider. A label with no reviewed row gets no marker - it
// stays visible as "Brief says:" text. Never guessed from label text.

// Brief Lock only ever writes intensity: 'high' for emotion targets today
// (tss-re1 lock-actions.ts step 4). 'low'/'medium' are included for
// forward-compatibility. The 2/5/8 mapping onto Signature's 0-10 slider
// scale is a judgement call, not derived from any documented conversion.
// It is now the MARKER position only - never a slider value.
// DECISION FOR DEREK: confirm or adjust this scale.
const TARGET_INTENSITY_SCALE = Object.freeze({ low: 2, medium: 5, high: 8 });

// Brief sensory picks carry no intensity at all (a label only). They are
// marked at the same value Brief Lock gives every emotion target ('high'),
// so a sensory marker and an emotion marker mean the same thing: "the brief
// wants this to come through clearly". No better-grounded value exists in
// the data today.
const SENSORY_TARGET_VALUE = TARGET_INTENSITY_SCALE.high;

// Mirrors app.js's internal stageIdPrefixMap (inside handleFormSubmit) -
// the Full Evaluation form-field id prefix per Signature stage id. Both
// sensory AND emotion slider ids in that form use this same prefix
// (confirmed against index.html). Duplicated here because the original is
// a local const inside an IIFE, not exported - keep the two in sync if
// either changes.
const STAGE_ID_TO_FORM_PREFIX = Object.freeze({
    appearance: 'appearance',
    aroma: 'aroma',
    frontMouth: 'front',
    midRearMouth: 'mid',
    texture: 'tex',
    aftertaste: 'after',
    overall: 'overall',
});

// The Full Evaluation form's `.form-stage[data-stage="N"]` section per
// Signature stage id (index.html: stage 1 is product info, 2-8 are the
// seven Journey-of-Taste stages in order).
const STAGE_ID_TO_FORM_STAGE_NUMBER = Object.freeze({
    appearance: 2,
    aroma: 3,
    frontMouth: 4,
    midRearMouth: 5,
    texture: 6,
    aftertaste: 7,
    overall: 8,
});

// Signature stage id -> Brief/qep stage key (same as targets-loaded.js's
// QEP_CAPTURE_STAGE_KEY_BY_SIGNATURE_ID). Used to build the
// BRIEF_SENSORY_TO_QEP_ATTRIBUTE lookup key.
const STAGE_ID_TO_BRIEF_STAGE_KEY = Object.freeze({
    appearance: 'ap',
    aroma: 'ar',
    frontMouth: 'fm',
    midRearMouth: 'mr',
    texture: 'tx',
    aftertaste: 'af',
    overall: 'overall',
});

const SIGNATURE_STAGE_IDS = Object.freeze([
    'appearance', 'aroma', 'frontMouth', 'midRearMouth', 'texture', 'aftertaste', 'overall',
]);

function defaultSensoryCrosswalk() {
    if (typeof window !== 'undefined' && window.BRIEF_SENSORY_TO_QEP_ATTRIBUTE) {
        return window.BRIEF_SENSORY_TO_QEP_ATTRIBUTE;
    }
    if (typeof require === 'function') {
        try {
            return require('./brief-sensory-crosswalk.js').BRIEF_SENSORY_TO_QEP_ATTRIBUTE;
        } catch (_) {
            return {};
        }
    }
    return {};
}

function htmlEscape(str) {
    if (typeof escapeHtml === 'function') return escapeHtml(str);
    return require('./dom-utils.js').escapeHtml(str);
}

/**
 * Build a variable_key -> {stage, key} lookup from crosswalk rows of one
 * kind. Pass canonical rows (signature_attribute_map) BEFORE alias rows
 * (signature_key_alias) in `crosswalkRows` - the first row seen for a
 * given variable_key wins, mirroring qep-capture migration 0030's
 * "canonical wins over alias" rule.
 */
function buildCrosswalkIndex(crosswalkRows, kind) {
    const byVariableKey = new Map();
    for (const row of crosswalkRows || []) {
        if (!row || row.kind !== kind || !row.variable_key) continue;
        if (byVariableKey.has(row.variable_key)) continue; // first wins: canonical > alias
        byVariableKey.set(row.variable_key, { stage: row.signature_stage, key: row.signature_key });
    }
    return byVariableKey;
}

function buildEmotionCrosswalkIndex(crosswalkRows) {
    return buildCrosswalkIndex(crosswalkRows, 'emotion');
}

function buildSensoryCrosswalkIndex(crosswalkRows) {
    return buildCrosswalkIndex(crosswalkRows, 'sensory');
}

/** Split a stage's "; "-joined brief notes into trimmed, non-empty labels. */
function splitSensoryLabels(notes) {
    if (!notes) return [];
    return String(notes).split(';').map((s) => s.trim()).filter(Boolean);
}

function briefSensoryKey(stageId, label) {
    return `${STAGE_ID_TO_BRIEF_STAGE_KEY[stageId]}|${String(label).trim().toLowerCase()}`;
}

function describeBrief(targetResult) {
    const project = (targetResult && targetResult.project) || {};
    const version = (targetResult && targetResult.version) || {};
    const name = project.name ? String(project.name) : 'the brief';
    const hasVersion = version.versionNumber !== undefined && version.versionNumber !== null && version.versionNumber !== '';
    return hasVersion ? `${name} v${version.versionNumber}` : name;
}

/**
 * Pure: turn a targets-loaded result (see targets-loaded.js) into
 * Signature Full-Evaluation-form markers. Never throws; anything that
 * can't be safely mapped is reported in `unmapped`, never dropped.
 *
 * `targetResult`: { project: { name }, version: { versionNumber },
 *   stages: { <stageId>: { emotions: [{ label, role, variableKey,
 *   intensity }], notes: string } } }
 * `crosswalkRows`: [{ signature_stage, signature_key, variable_key, kind }]
 *   - canonical rows first.
 * `options.sensoryCrosswalk`: override for BRIEF_SENSORY_TO_QEP_ATTRIBUTE
 *   (tests inject one; production uses the real constant).
 *
 * Returns:
 *   {
 *     markers: [{ stageId, sliderKey, elementId, value, kind, label }],
 *     briefText: { <stageId>: string },   // only stages with notes
 *     banner: string,                     // one line, plain text
 *     markerTitle: string,                // tooltip for every marker
 *     unmapped: [{ stageId, kind, label, variableKey, reason }],
 *   }
 */
function buildTargetPrefill(targetResult, crosswalkRows, options) {
    const sensoryCrosswalk = (options && options.sensoryCrosswalk) || defaultSensoryCrosswalk();
    const emotionIndex = buildEmotionCrosswalkIndex(crosswalkRows);
    const sensoryIndex = buildSensoryCrosswalkIndex(crosswalkRows);
    const markers = [];
    const briefText = {};
    const unmapped = [];
    const seenElementIds = new Set();

    const sourceStages = (targetResult && targetResult.stages) || {};

    function addMarker(stageId, sliderKey, value, kind, label) {
        const elementId = `${STAGE_ID_TO_FORM_PREFIX[stageId]}-${sliderKey}`;
        if (seenElementIds.has(elementId)) return; // one marker per slider, first wins
        seenElementIds.add(elementId);
        markers.push({ stageId, sliderKey, elementId, value, kind, label });
    }

    for (const stageId of SIGNATURE_STAGE_IDS) {
        const stageData = sourceStages[stageId] || { emotions: [], notes: '' };

        for (const target of stageData.emotions || []) {
            if (!target) continue;
            const { label, variableKey, intensity } = target;

            if (!variableKey) {
                unmapped.push({ stageId, kind: 'emotion', label, variableKey: null, reason: 'Target has no attribute id to map from.' });
                continue;
            }
            const match = emotionIndex.get(variableKey);
            if (!match) {
                unmapped.push({ stageId, kind: 'emotion', label, variableKey, reason: 'Not found in the Signature attribute crosswalk.' });
                continue;
            }
            if (match.stage !== stageId) {
                // Never move an emotion across stages (CLAUDE.md).
                unmapped.push({
                    stageId, kind: 'emotion', label, variableKey,
                    reason: `Crosswalk maps this to the "${match.stage}" stage, not "${stageId}" - not applied.`,
                });
                continue;
            }
            const value = Object.prototype.hasOwnProperty.call(TARGET_INTENSITY_SCALE, intensity)
                ? TARGET_INTENSITY_SCALE[intensity]
                : TARGET_INTENSITY_SCALE.high;
            addMarker(stageId, match.key, value, 'emotion', label);
        }

        const notes = stageData.notes ? String(stageData.notes).trim() : '';
        if (!notes) continue;
        briefText[stageId] = notes;

        for (const label of splitSensoryLabels(notes)) {
            const key = briefSensoryKey(stageId, label);
            const variableKey = Object.prototype.hasOwnProperty.call(sensoryCrosswalk, key) ? sensoryCrosswalk[key] : null;
            if (!variableKey) {
                unmapped.push({ stageId, kind: 'sensory', label, variableKey: null, reason: 'No reviewed Brief sensory crosswalk row - shown as brief text only.' });
                continue;
            }
            const match = sensoryIndex.get(variableKey);
            if (!match) {
                unmapped.push({ stageId, kind: 'sensory', label, variableKey, reason: 'Not found in the Signature attribute crosswalk.' });
                continue;
            }
            if (match.stage !== stageId) {
                unmapped.push({
                    stageId, kind: 'sensory', label, variableKey,
                    reason: `Crosswalk maps this to the "${match.stage}" stage, not "${stageId}" - not applied.`,
                });
                continue;
            }
            addMarker(stageId, match.key, SENSORY_TARGET_VALUE, 'sensory', label);
        }
    }

    const brief = describeBrief(targetResult);
    return {
        markers,
        briefText,
        banner: `Targets from ${brief} shown as markers.`,
        markerTitle: `Target from ${brief}`,
        unmapped,
    };
}

/**
 * Left offset (CSS) of a target value along a range input, centred on
 * where the thumb sits at that value. A native range thumb travels from
 * thumbPx/2 to (width - thumbPx/2), so the position is
 * pct% + (0.5 - pct/100) * thumbPx. min/max come from the input's own
 * attributes (defaults 0/10); the value is clamped into range.
 */
function markerLeftCss(value, min, max, thumbPx) {
    const lo = Number.isFinite(Number(min)) && min !== '' && min !== null ? Number(min) : 0;
    const hi = Number.isFinite(Number(max)) && max !== '' && max !== null ? Number(max) : 10;
    const thumb = Number.isFinite(thumbPx) ? thumbPx : 20;
    const span = hi - lo;
    let pct = span > 0 ? ((Number(value) - lo) / span) * 100 : 0;
    if (!Number.isFinite(pct)) pct = 0;
    pct = Math.min(100, Math.max(0, pct));
    const offsetPx = Math.round((0.5 - pct / 100) * thumb * 100) / 100;
    const pctStr = Math.round(pct * 100) / 100;
    return `calc(${pctStr}% + ${offsetPx}px)`;
}

/** Inner HTML of one marker track (tick + "Target N" label). Escaped. */
function buildTargetMarkerHtml(marker, title, min, max) {
    const left = markerLeftCss(marker.value, min, max);
    const value = htmlEscape(marker.value);
    return `<span class="target-marker-tick" style="left:${left}"></span>`
        + `<span class="target-marker-label" style="left:${left}" title="${htmlEscape(title)}">Target ${value}</span>`;
}

/** Inner HTML of a stage's "Brief says:" block. Escaped. */
function buildBriefSaysHtml(text) {
    return `<strong>Brief says:</strong> ${htmlEscape(text)}`;
}

const TargetPrefillApi = {
    buildTargetPrefill,
    buildCrosswalkIndex,
    buildEmotionCrosswalkIndex,
    buildSensoryCrosswalkIndex,
    splitSensoryLabels,
    markerLeftCss,
    buildTargetMarkerHtml,
    buildBriefSaysHtml,
    TARGET_INTENSITY_SCALE,
    SENSORY_TARGET_VALUE,
    STAGE_ID_TO_FORM_PREFIX,
    STAGE_ID_TO_FORM_STAGE_NUMBER,
    STAGE_ID_TO_BRIEF_STAGE_KEY,
    SIGNATURE_STAGE_IDS,
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TargetPrefillApi;
}
if (typeof window !== 'undefined') {
    window.TargetPrefill = TargetPrefillApi;
}
