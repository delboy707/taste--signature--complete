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
// Stage 2A.5 (shared dictionary): markers come straight from the locked
// version's tss_shared.targets rows. Each row carries a master code
// (variable_key = public.qep_attribute.id) and, for coded rows written by
// Brief Lock from an approved tss_shared.vocab_mapping, range_min =
// range_max = the 0-10 target. The code is reverse-mapped to Signature
// slider key(s) through the crosswalk (tss_shared.signature_attribute_map
// + signature_key_alias, qep-capture migrations 0025/0029, fetched by
// qep-capture-crosswalk.js). One code can land on several sliders (a
// canonical key plus alias keys) - each gets a marker, EXCEPT a slider
// whose form id already belongs to a different code (first row wins, and
// canonical rows come first). Real case: the 0029 alias ('overall',
// 'satisfaction', sensory) -> oa_Satisfaction resolves to the form id
// overall-satisfaction, which is the canonical EMOTION slider of
// overall_emo_satisfaction - it is never marked for the sensory code.
//
// Marker position:
//   - range_min = range_max        -> that value ("Target 7")
//   - range_min != range_max       -> the midpoint; the label shows the
//                                     range ("Target 6-8"). The marker UI
//                                     draws a single tick, not a band.
//   - only one end set             -> that end
//   - no numeric range (legacy Brief emotion targets written before 2A.5:
//     intensity 'high', null range) -> TARGET_INTENSITY_SCALE, unchanged
//     from Stage 2A ("Target 8").
//
// A code with no Signature slider (no crosswalk row of its kind, crosswalk
// only on another stage, a trigger, or no code at all) is never dropped:
// it is listed on its stage's brief text as "Not measurable in this form:
// ..." and counted in the one-line banner. Stage notes (Brief picks with
// no approved mapping) are shown as brief text only - never parsed into
// markers.

// Legacy targets only (no numeric range). Brief Lock wrote intensity:
// 'high' for every emotion target before Stage 2A.5 (tss-re1
// lock-actions.ts step 4). 'low'/'medium' are included for
// forward-compatibility. The 2/5/8 mapping onto Signature's 0-10 slider
// scale is a judgement call, not derived from any documented conversion.
// It is the MARKER position only - never a slider value.
// DECISION FOR DEREK: confirm or adjust this scale.
const TARGET_INTENSITY_SCALE = Object.freeze({ low: 2, medium: 5, high: 8 });

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

const SIGNATURE_STAGE_IDS = Object.freeze([
    'appearance', 'aroma', 'frontMouth', 'midRearMouth', 'texture', 'aftertaste', 'overall',
]);

// Kinds that have a marker-able slider in the Full Evaluation form. Trigger
// sliders (trigger-*) sit outside the per-stage id scheme and are not marked.
const MARKABLE_KINDS = Object.freeze(['sensory', 'emotion']);

const NOT_MEASURABLE_PREFIX = 'Not measurable in this form:';

function htmlEscape(str) {
    if (typeof escapeHtml === 'function') return escapeHtml(str);
    return require('./dom-utils.js').escapeHtml(str);
}

function toFiniteNumberOrNull(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function formatNumber(n) {
    return String(Math.round(n * 100) / 100);
}

/**
 * Build a variable_key -> [{ stage, key, kind }] lookup from crosswalk rows,
 * keeping EVERY row for a code, in input order. Pass canonical rows
 * (signature_attribute_map) BEFORE alias rows (signature_key_alias) - the
 * order is kept, so canonical markers come first. Exact duplicate rows are
 * ignored.
 */
function buildCrosswalkIndex(crosswalkRows) {
    const byVariableKey = new Map();
    for (const row of crosswalkRows || []) {
        if (!row || !row.variable_key || !row.signature_stage || !row.signature_key) continue;
        const list = byVariableKey.get(row.variable_key) || [];
        if (list.some((r) => r.stage === row.signature_stage && r.key === row.signature_key && r.kind === row.kind)) continue;
        list.push({ stage: row.signature_stage, key: row.signature_key, kind: row.kind });
        byVariableKey.set(row.variable_key, list);
    }
    return byVariableKey;
}

/**
 * Form element id -> the code that owns it: the FIRST crosswalk row (in
 * input order, canonical rows first) whose stage/key produces that id.
 * Only sensory/emotion rows on a known stage count.
 */
function buildElementOwnerIndex(crosswalkRows) {
    const owner = new Map();
    for (const row of crosswalkRows || []) {
        if (!row || !row.variable_key || !MARKABLE_KINDS.includes(row.kind)) continue;
        const prefix = STAGE_ID_TO_FORM_PREFIX[row.signature_stage];
        if (!prefix || !row.signature_key) continue;
        const elementId = `${prefix}-${row.signature_key}`;
        if (!owner.has(elementId)) owner.set(elementId, row.variable_key);
    }
    return owner;
}

/**
 * Pure: where a target's marker sits and what its label says.
 * Returns { value, valueLabel }. See the header for the rules.
 */
function targetMarkerPosition(target) {
    const t = target || {};
    const lo = toFiniteNumberOrNull(t.rangeMin);
    const hi = toFiniteNumberOrNull(t.rangeMax);
    if (lo !== null && hi !== null) {
        const a = Math.min(lo, hi);
        const b = Math.max(lo, hi);
        if (a === b) return { value: a, valueLabel: formatNumber(a) };
        return { value: (a + b) / 2, valueLabel: `${formatNumber(a)}-${formatNumber(b)}` };
    }
    if (lo !== null || hi !== null) {
        const v = lo !== null ? lo : hi;
        return { value: v, valueLabel: formatNumber(v) };
    }
    const value = Object.prototype.hasOwnProperty.call(TARGET_INTENSITY_SCALE, t.intensity)
        ? TARGET_INTENSITY_SCALE[t.intensity]
        : TARGET_INTENSITY_SCALE.high;
    return { value, valueLabel: formatNumber(value) };
}

/** "Label (7)" / "Label (6-8)" for a coded target; just "Label" for a legacy one. */
function describeTarget(target) {
    const t = target || {};
    const name = t.label ? String(t.label) : (t.variableKey ? String(t.variableKey) : 'Unnamed target');
    const hasRange = toFiniteNumberOrNull(t.rangeMin) !== null || toFiniteNumberOrNull(t.rangeMax) !== null;
    return hasRange ? `${name} (${targetMarkerPosition(t).valueLabel})` : name;
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
 * can't be marked is reported in `unmapped` and listed for the evaluator
 * (stage brief text / banner), never dropped.
 *
 * `targetResult`: { project: { name }, version: { versionNumber },
 *   stages: { <stageId>: { targets: [{ label, role, variableKey, kind,
 *   intensity, rangeMin, rangeMax }], notes: string } },
 *   unplacedTargets: [{ variableKey, label?, rangeMin, rangeMax, reason }] }
 * `crosswalkRows`: [{ signature_stage, signature_key, variable_key, kind }]
 *   - canonical rows first.
 *
 * Returns:
 *   {
 *     markers: [{ stageId, sliderKey, elementId, value, valueLabel, kind, label, variableKey }],
 *     briefText: { <stageId>: string },   // stages with notes and/or unmeasurable targets
 *     banner: string,                     // one line, plain text
 *     markerTitle: string,                // tooltip for every marker
 *     unmapped: [{ stageId, kind, label, variableKey, reason }],
 *   }
 */
function buildTargetPrefill(targetResult, crosswalkRows) {
    const index = buildCrosswalkIndex(crosswalkRows);
    const elementOwner = buildElementOwnerIndex(crosswalkRows);
    const markers = [];
    const briefText = {};
    const unmapped = [];
    const seenElementIds = new Set();

    const sourceStages = (targetResult && targetResult.stages) || {};

    function addMarker(stageId, sliderKey, position, kind, label, variableKey) {
        const elementId = `${STAGE_ID_TO_FORM_PREFIX[stageId]}-${sliderKey}`;
        if (seenElementIds.has(elementId)) return; // one marker per slider, first wins
        seenElementIds.add(elementId);
        markers.push({ stageId, sliderKey, elementId, value: position.value, valueLabel: position.valueLabel, kind, label, variableKey });
    }

    for (const stageId of SIGNATURE_STAGE_IDS) {
        const stageData = sourceStages[stageId] || {};
        const notMeasurable = [];

        function skip(target, kind, reason) {
            unmapped.push({ stageId, kind, label: target.label, variableKey: target.variableKey || null, reason });
            notMeasurable.push(describeTarget(target));
        }

        for (const target of stageData.targets || []) {
            if (!target) continue;
            const { label, variableKey } = target;
            const kind = target.kind || null;

            if (!variableKey) {
                skip(target, kind, 'Target has no attribute id to map from.');
                continue;
            }
            if (kind && !MARKABLE_KINDS.includes(kind)) {
                skip(target, kind, `No marker for ${kind} targets in this form.`);
                continue;
            }
            const rows = (index.get(variableKey) || []).filter((r) => (kind ? r.kind === kind : MARKABLE_KINDS.includes(r.kind)));
            if (rows.length === 0) {
                skip(target, kind, 'Not found in the Signature attribute crosswalk.');
                continue;
            }
            const sameStage = rows.filter((r) => r.stage === stageId);
            if (sameStage.length === 0) {
                // Never move a target across stages (CLAUDE.md).
                skip(target, kind, `Crosswalk maps this to the "${rows[0].stage}" stage, not "${stageId}" - not applied.`);
                continue;
            }
            const owned = sameStage.filter(
                (r) => elementOwner.get(`${STAGE_ID_TO_FORM_PREFIX[stageId]}-${r.key}`) === variableKey
            );
            if (owned.length === 0) {
                skip(target, kind, 'Its Signature slider key belongs to another attribute in this form - not applied.');
                continue;
            }
            const position = targetMarkerPosition(target);
            for (const row of owned) {
                addMarker(stageId, row.key, position, kind || row.kind, label, variableKey);
            }
        }

        const notes = stageData.notes ? String(stageData.notes).trim() : '';
        const lines = [];
        if (notes) lines.push(notes);
        if (notMeasurable.length) lines.push(`${NOT_MEASURABLE_PREFIX} ${notMeasurable.join(', ')}`);
        if (lines.length) briefText[stageId] = lines.join('\n');
    }

    const stageBoundCount = unmapped.length;
    const unplaced = [];
    for (const target of (targetResult && targetResult.unplacedTargets) || []) {
        if (!target) continue;
        unmapped.push({
            stageId: null, kind: target.kind || null, label: target.label || null,
            variableKey: target.variableKey || null, reason: target.reason || 'Could not be placed on a stage.',
        });
        unplaced.push(describeTarget({ ...target, label: target.variableKey || target.label }));
    }

    const brief = describeBrief(targetResult);
    let banner = `Targets from ${brief} shown as markers.`;
    if (stageBoundCount > 0) {
        banner += stageBoundCount === 1
            ? ' 1 target not measurable in this form (listed in its stage).'
            : ` ${stageBoundCount} targets not measurable in this form (listed in their stages).`;
    }
    if (unplaced.length > 0) {
        banner += ` ${NOT_MEASURABLE_PREFIX} ${unplaced.join(', ')}.`;
    }

    return {
        markers,
        briefText,
        banner,
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
    const shown = marker.valueLabel !== undefined && marker.valueLabel !== null && marker.valueLabel !== ''
        ? marker.valueLabel
        : marker.value;
    const value = htmlEscape(shown);
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
    targetMarkerPosition,
    markerLeftCss,
    buildTargetMarkerHtml,
    buildBriefSaysHtml,
    TARGET_INTENSITY_SCALE,
    NOT_MEASURABLE_PREFIX,
    STAGE_ID_TO_FORM_PREFIX,
    STAGE_ID_TO_FORM_STAGE_NUMBER,
    SIGNATURE_STAGE_IDS,
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TargetPrefillApi;
}
if (typeof window !== 'undefined') {
    window.TargetPrefill = TargetPrefillApi;
}
