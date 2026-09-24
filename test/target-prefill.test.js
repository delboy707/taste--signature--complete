// Pure unit tests for target-prefill.js - no DOM, no Supabase, no
// Firestore. Run: node test/target-prefill.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildTargetPrefill, buildEmotionCrosswalkIndex, TARGET_INTENSITY_SCALE, SIGNATURE_STAGE_IDS } = require('../target-prefill.js');

function emptyStages() {
    const stages = {};
    for (const id of SIGNATURE_STAGE_IDS) stages[id] = { emotions: [], notes: '' };
    return stages;
}

function crosswalkRow(stage, key, variableKey, kind = 'emotion') {
    return { signature_stage: stage, signature_key: key, variable_key: variableKey, kind };
}

test('intensity scale is a single named constant with high/medium/low', () => {
    assert.deepEqual(TARGET_INTENSITY_SCALE, { low: 2, medium: 5, high: 8 });
});

test('all 7 Signature stages are covered', () => {
    assert.deepEqual(SIGNATURE_STAGE_IDS, [
        'appearance', 'aroma', 'frontMouth', 'midRearMouth', 'texture', 'aftertaste', 'overall',
    ]);
});

test('each of the 7 stages maps an emotion target to the right form field id and value', () => {
    const stagePrefixes = {
        appearance: 'appearance', aroma: 'aroma', frontMouth: 'front', midRearMouth: 'mid',
        texture: 'tex', aftertaste: 'after', overall: 'overall',
    };
    for (const stageId of SIGNATURE_STAGE_IDS) {
        const stages = emptyStages();
        stages[stageId].emotions.push({ label: 'Excitement', role: 'primary', variableKey: 'vk_1', intensity: 'high' });
        const crosswalk = [crosswalkRow(stageId, 'excitement', 'vk_1')];

        const result = buildTargetPrefill({ stages }, crosswalk);

        assert.equal(result.stages[stageId].emotions.excitement, 8);
        assert.equal(result.unmapped.length, 0);
        const fv = result.formValues.find((f) => f.stageId === stageId);
        assert.ok(fv, `expected a formValues entry for ${stageId}`);
        assert.equal(fv.elementId, `${stagePrefixes[stageId]}-excitement`);
        assert.equal(fv.valueSpanId, `${stagePrefixes[stageId]}-excitement-val`);
        assert.equal(fv.value, 8);
    }
});

test('intensity low/medium/high resolve through the named scale constant', () => {
    for (const [intensity, expected] of Object.entries(TARGET_INTENSITY_SCALE)) {
        const stages = emptyStages();
        stages.appearance.emotions.push({ label: 'Calm', role: 'primary', variableKey: 'vk_calm', intensity });
        const crosswalk = [crosswalkRow('appearance', 'calm', 'vk_calm')];
        const result = buildTargetPrefill({ stages }, crosswalk);
        assert.equal(result.stages.appearance.emotions.calm, expected);
    }
});

test('an unrecognised intensity value falls back to "high" (the only value Brief Lock writes today), never crashes', () => {
    const stages = emptyStages();
    stages.appearance.emotions.push({ label: 'Calm', role: 'primary', variableKey: 'vk_calm', intensity: 'extreme' });
    const crosswalk = [crosswalkRow('appearance', 'calm', 'vk_calm')];
    const result = buildTargetPrefill({ stages }, crosswalk);
    assert.equal(result.stages.appearance.emotions.calm, TARGET_INTENSITY_SCALE.high);
});

test('a target with no variableKey is reported as unmapped, never applied to a slider', () => {
    const stages = emptyStages();
    stages.aroma.emotions.push({ label: 'Mystery Emotion', role: 'primary', variableKey: null, intensity: 'high' });
    const result = buildTargetPrefill({ stages }, []);
    assert.equal(result.formValues.length, 0);
    assert.equal(result.unmapped.length, 1);
    assert.equal(result.unmapped[0].stageId, 'aroma');
    assert.match(result.unmapped[0].reason, /no attribute id/i);
});

test('a variableKey with no crosswalk row is reported as unmapped, never applied to a slider', () => {
    const stages = emptyStages();
    stages.aroma.emotions.push({ label: 'Obscure', role: 'primary', variableKey: 'vk_unknown', intensity: 'high' });
    const result = buildTargetPrefill({ stages }, []);
    assert.equal(result.formValues.length, 0);
    assert.equal(result.unmapped.length, 1);
    assert.match(result.unmapped[0].reason, /crosswalk/i);
});

test('a crosswalk row pointing at a DIFFERENT stage is never applied and never moves the emotion across stages', () => {
    const stages = emptyStages();
    stages.aroma.emotions.push({ label: 'Nostalgia', role: 'primary', variableKey: 'vk_nostalgia', intensity: 'high' });
    // Crosswalk (wrongly, for this test) says this variable belongs to appearance.
    const crosswalk = [crosswalkRow('appearance', 'nostalgia', 'vk_nostalgia')];
    const result = buildTargetPrefill({ stages }, crosswalk);
    assert.equal(result.formValues.length, 0);
    assert.equal(Object.keys(result.stages).length, 0);
    assert.equal(result.unmapped.length, 1);
    assert.equal(result.unmapped[0].stageId, 'aroma');
    assert.match(result.unmapped[0].reason, /"appearance" stage, not "aroma"/);
});

test('canonical crosswalk rows win over alias rows for the same variable_key (order-dependent, canonical first)', () => {
    const index = buildEmotionCrosswalkIndex([
        crosswalkRow('appearance', 'canonicalKey', 'vk_shared'),
        crosswalkRow('appearance', 'aliasKey', 'vk_shared'),
    ]);
    assert.equal(index.get('vk_shared').key, 'canonicalKey');
});

test('sensory/trigger crosswalk rows are ignored when building the emotion index', () => {
    const index = buildEmotionCrosswalkIndex([
        crosswalkRow('appearance', 'color-shade', 'vk_sensory', 'sensory'),
        crosswalkRow('overall', 'crunch', 'vk_trigger', 'trigger'),
    ]);
    assert.equal(index.size, 0);
});

test('sensory stage notes are carried through as informational text only, never written into a slider or the stages output', () => {
    const stages = emptyStages();
    stages.texture.notes = 'Rich mouthcoating; Smooth melt';
    const result = buildTargetPrefill({ stages }, []);
    assert.equal(result.sensoryNotes.length, 1);
    assert.deepEqual(result.sensoryNotes[0], { stageId: 'texture', notes: 'Rich mouthcoating; Smooth melt' });
    assert.equal(result.stages.texture, undefined);
    assert.equal(result.formValues.length, 0);
});

test('nothing is silently dropped: unmapped + sensoryNotes together account for everything not turned into a formValue', () => {
    const stages = emptyStages();
    stages.overall.emotions.push(
        { label: 'Mapped', role: 'primary', variableKey: 'vk_mapped', intensity: 'high' },
        { label: 'Unmapped', role: 'secondary', variableKey: 'vk_missing', intensity: 'high' }
    );
    stages.overall.notes = 'craveability';
    const crosswalk = [crosswalkRow('overall', 'satisfaction', 'vk_mapped')];
    const result = buildTargetPrefill({ stages }, crosswalk);

    assert.equal(result.formValues.length, 1);
    assert.equal(result.unmapped.length, 1);
    assert.equal(result.unmapped[0].label, 'Unmapped');
    assert.equal(result.sensoryNotes.length, 1);
    assert.equal(result.sensoryNotes[0].notes, 'craveability');
});

test('hostile label/notes text is passed through untouched by the pure module (escaping is the render layer\'s job)', () => {
    const stages = emptyStages();
    const hostile = '<img src=x onerror=alert(1)>';
    stages.appearance.emotions.push({ label: hostile, role: 'primary', variableKey: 'vk_x', intensity: 'high' });
    stages.appearance.notes = hostile;
    const crosswalk = [crosswalkRow('appearance', 'safeKey', 'vk_x')];
    const result = buildTargetPrefill({ stages }, crosswalk);
    assert.equal(result.formValues[0].signatureKey, 'safeKey');
    assert.equal(result.sensoryNotes[0].notes, hostile);
    // Confirms the module does no escaping itself - a caller rendering this
    // into innerHTML MUST run it through escapeHtml() first (see
    // targets-loaded-ui.js, which does).
});

test('an empty/missing target result produces empty output for every stage, never throws', () => {
    const result = buildTargetPrefill({}, []);
    assert.equal(result.formValues.length, 0);
    assert.equal(result.unmapped.length, 0);
    assert.equal(result.sensoryNotes.length, 0);
    assert.equal(Object.keys(result.stages).length, 0);
});
