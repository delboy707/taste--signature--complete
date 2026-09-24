// ===== TARGET PREFILL (pure mapping, DOM-agnostic) =====
// Turns a Brief target result (targets-loaded.js's fetchQepCaptureTargets*
// shape) into slider values for Signature's Full Evaluation form. Nothing
// here touches the DOM, Supabase, or Firestore - it only maps data the
// caller already fetched, so it is unit-testable with plain fixtures.
//
// EMOTION targets only. Brief Lock writes real, attribute-keyed rows for
// emotion targets (tss_shared.targets: variable_key + intensity - see
// qep-capture migrations 0010/0011), so those can be safely reverse-mapped
// through the crosswalk (tss_shared.signature_attribute_map /
// signature_key_alias, migrations 0025/0029) to a specific Signature
// stage+slider.
//
// Brief's SENSORY picks are NOT attribute-keyed at the source: tss-re1's
// BriefState.sensory is `{ stageKey, label }[]` (see
// tss-re1/src/lib/translator/brief-state.ts) - free marketing-language
// labels from tss-re1's OWN curated sensory vocabulary, with no
// variable_key at all, joined "; " into tss_shared.version_stage_notes by
// lockBrief() (tss-re1/src/app/(app)/brief/lock-actions.ts, step 5).
// There is nothing to reverse-map through the qep-capture crosswalk (which
// is keyed on variable_key), and guessing one from label text would be
// exactly the fabrication CLAUDE.md forbids ("never invent... attribute
// codes... do not fabricate"). So sensory notes are carried through as
// read-only text per stage (`sensoryNotes` below) and are never written
// into a slider.
// DECISION FOR DEREK: confirm this split (emotion auto-filled, sensory
// shown as text only, never a slider) is the right call for now.

// Brief Lock only ever writes intensity: 'high' for emotion targets today
// (tss-re1 lock-actions.ts step 4, targets.intensity check constraint
// allows 'high'/'low'). 'low'/'medium' are included here for
// forward-compatibility, not because Capture currently produces them.
// The 2/5/8 mapping onto Signature's 0-10 slider scale is a judgement
// call, not derived from any documented conversion.
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

const SIGNATURE_STAGE_IDS = Object.freeze([
    'appearance', 'aroma', 'frontMouth', 'midRearMouth', 'texture', 'aftertaste', 'overall',
]);

/**
 * Build a variable_key -> {stage, key} lookup from crosswalk rows.
 * Pass canonical rows (signature_attribute_map) BEFORE alias rows
 * (signature_key_alias) in `crosswalkRows` - the first row seen for a
 * given variable_key wins, mirroring qep-capture migration 0030's
 * "canonical wins over alias" rule. Only kind === 'emotion' rows are used
 * (Brief Lock only ever writes emotion-kind target rows - see module
 * comment above); sensory/trigger crosswalk rows are ignored here.
 */
function buildEmotionCrosswalkIndex(crosswalkRows) {
    const byVariableKey = new Map();
    for (const row of crosswalkRows || []) {
        if (!row || row.kind !== 'emotion' || !row.variable_key) continue;
        if (byVariableKey.has(row.variable_key)) continue; // first wins: canonical > alias
        byVariableKey.set(row.variable_key, { stage: row.signature_stage, key: row.signature_key });
    }
    return byVariableKey;
}

/**
 * Pure: turn a targets-loaded result (see targets-loaded.js) into
 * Signature Full-Evaluation-form prefill data. Never throws; anything
 * that can't be safely mapped is reported, never dropped silently.
 *
 * `targetResult` is the shape fetchQepCaptureTargets()/
 * fetchQepCaptureTargetsByVersion() return on success:
 *   { project, version, stages: { <stageId>: { emotions: [{ label, role,
 *     variableKey, intensity }], notes: string } } }
 *
 * `crosswalkRows` is an array of { signature_stage, signature_key,
 * variable_key, kind } - canonical rows first (see
 * buildEmotionCrosswalkIndex above).
 *
 * Returns:
 *   {
 *     stages: { <stageId>: { emotions: { <signatureKey>: number } } },
 *     formValues: [ { elementId, valueSpanId, value, stageId, signatureKey } ],
 *     unmapped: [ { stageId, label, variableKey, reason } ],
 *     sensoryNotes: [ { stageId, notes } ],   // informational only, never
 *                                              // written into a slider
 *     intensityScale: TARGET_INTENSITY_SCALE,
 *   }
 */
function buildTargetPrefill(targetResult, crosswalkRows) {
    const emotionIndex = buildEmotionCrosswalkIndex(crosswalkRows);
    const stages = {};
    const formValues = [];
    const unmapped = [];
    const sensoryNotes = [];

    const sourceStages = (targetResult && targetResult.stages) || {};

    for (const stageId of SIGNATURE_STAGE_IDS) {
        const stageData = sourceStages[stageId] || { emotions: [], notes: '' };
        const prefix = STAGE_ID_TO_FORM_PREFIX[stageId];
        const emotions = {};

        for (const target of stageData.emotions || []) {
            if (!target) continue;
            const { label, variableKey, intensity } = target;

            if (!variableKey) {
                unmapped.push({ stageId, label, variableKey: null, reason: 'Target has no attribute id to map from.' });
                continue;
            }

            const match = emotionIndex.get(variableKey);
            if (!match) {
                unmapped.push({ stageId, label, variableKey, reason: 'Not found in the Signature attribute crosswalk.' });
                continue;
            }

            if (match.stage !== stageId) {
                // Never move an emotion across stages (CLAUDE.md). A mismatch
                // here means the crosswalk and the target's own stage
                // disagree - report it rather than guess which is right.
                unmapped.push({
                    stageId,
                    label,
                    variableKey,
                    reason: `Crosswalk maps this to the "${match.stage}" stage, not "${stageId}" - not applied.`,
                });
                continue;
            }

            const value = Object.prototype.hasOwnProperty.call(TARGET_INTENSITY_SCALE, intensity)
                ? TARGET_INTENSITY_SCALE[intensity]
                : TARGET_INTENSITY_SCALE.high;
            emotions[match.key] = value;

            const elementId = `${prefix}-${match.key}`;
            formValues.push({ elementId, valueSpanId: `${elementId}-val`, value, stageId, signatureKey: match.key });
        }

        if (Object.keys(emotions).length > 0) {
            stages[stageId] = { emotions };
        }

        if (stageData.notes) {
            sensoryNotes.push({ stageId, notes: stageData.notes });
        }
    }

    return { stages, formValues, unmapped, sensoryNotes, intensityScale: TARGET_INTENSITY_SCALE };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        buildTargetPrefill,
        buildEmotionCrosswalkIndex,
        TARGET_INTENSITY_SCALE,
        STAGE_ID_TO_FORM_PREFIX,
        SIGNATURE_STAGE_IDS,
    };
}
if (typeof window !== 'undefined') {
    window.TargetPrefill = {
        buildTargetPrefill,
        buildEmotionCrosswalkIndex,
        TARGET_INTENSITY_SCALE,
        STAGE_ID_TO_FORM_PREFIX,
        SIGNATURE_STAGE_IDS,
    };
}
