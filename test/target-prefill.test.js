// Pure unit tests for target-prefill.js - no DOM, no Supabase, no
// Firestore. Run: node test/target-prefill.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const {
    buildTargetPrefill, buildEmotionCrosswalkIndex, buildSensoryCrosswalkIndex, splitSensoryLabels,
    markerLeftCss, buildTargetMarkerHtml, buildBriefSaysHtml,
    TARGET_INTENSITY_SCALE, SENSORY_TARGET_VALUE, SIGNATURE_STAGE_IDS, STAGE_ID_TO_FORM_STAGE_NUMBER,
} = require('../target-prefill.js');
const { BRIEF_SENSORY_TO_QEP_ATTRIBUTE } = require('../brief-sensory-crosswalk.js');

function emptyStages() {
    const stages = {};
    for (const id of SIGNATURE_STAGE_IDS) stages[id] = { emotions: [], notes: '' };
    return stages;
}

function crosswalkRow(stage, key, variableKey, kind = 'emotion') {
    return { signature_stage: stage, signature_key: key, variable_key: variableKey, kind };
}

const NO_SENSORY = { sensoryCrosswalk: {} };

test('intensity scale is a single named constant with high/medium/low', () => {
    assert.deepEqual(TARGET_INTENSITY_SCALE, { low: 2, medium: 5, high: 8 });
});

test('sensory markers use the "high" scale value (Brief sensory picks carry no intensity)', () => {
    assert.equal(SENSORY_TARGET_VALUE, TARGET_INTENSITY_SCALE.high);
});

test('all 7 Signature stages are covered, each with a Full Evaluation form section', () => {
    assert.deepEqual(SIGNATURE_STAGE_IDS, [
        'appearance', 'aroma', 'frontMouth', 'midRearMouth', 'texture', 'aftertaste', 'overall',
    ]);
    assert.deepEqual(SIGNATURE_STAGE_IDS.map((id) => STAGE_ID_TO_FORM_STAGE_NUMBER[id]), [2, 3, 4, 5, 6, 7, 8]);
});

test('the real Brief sensory crosswalk ships EMPTY (owner fills it after review)', () => {
    assert.deepEqual(BRIEF_SENSORY_TO_QEP_ATTRIBUTE, {});
    assert.ok(Object.isFrozen(BRIEF_SENSORY_TO_QEP_ATTRIBUTE));
});

test('the returned shape has markers/briefText/banner/unmapped and NO formValues', () => {
    const result = buildTargetPrefill({ stages: emptyStages() }, [], NO_SENSORY);
    assert.ok(Array.isArray(result.markers));
    assert.deepEqual(result.briefText, {});
    assert.equal(typeof result.banner, 'string');
    assert.ok(Array.isArray(result.unmapped));
    assert.equal(result.formValues, undefined);
    assert.equal(result.stages, undefined);
});

test('each of the 7 stages turns a mapped emotion target into a marker with the right slider id and value', () => {
    const stagePrefixes = {
        appearance: 'appearance', aroma: 'aroma', frontMouth: 'front', midRearMouth: 'mid',
        texture: 'tex', aftertaste: 'after', overall: 'overall',
    };
    for (const stageId of SIGNATURE_STAGE_IDS) {
        const stages = emptyStages();
        stages[stageId].emotions.push({ label: 'Excitement', role: 'primary', variableKey: 'vk_1', intensity: 'high' });
        const crosswalk = [crosswalkRow(stageId, 'excitement', 'vk_1')];

        const result = buildTargetPrefill({ stages }, crosswalk, NO_SENSORY);

        assert.equal(result.unmapped.length, 0);
        assert.deepEqual(result.markers, [{
            stageId, sliderKey: 'excitement', elementId: `${stagePrefixes[stageId]}-excitement`,
            value: 8, kind: 'emotion', label: 'Excitement',
        }]);
    }
});

test('intensity low/medium/high resolve through the named scale constant (marker position)', () => {
    for (const [intensity, expected] of Object.entries(TARGET_INTENSITY_SCALE)) {
        const stages = emptyStages();
        stages.appearance.emotions.push({ label: 'Calm', role: 'primary', variableKey: 'vk_calm', intensity });
        const result = buildTargetPrefill({ stages }, [crosswalkRow('appearance', 'calm', 'vk_calm')], NO_SENSORY);
        assert.equal(result.markers[0].value, expected);
    }
});

test('an unrecognised intensity value falls back to "high", never crashes', () => {
    const stages = emptyStages();
    stages.appearance.emotions.push({ label: 'Calm', role: 'primary', variableKey: 'vk_calm', intensity: 'extreme' });
    const result = buildTargetPrefill({ stages }, [crosswalkRow('appearance', 'calm', 'vk_calm')], NO_SENSORY);
    assert.equal(result.markers[0].value, TARGET_INTENSITY_SCALE.high);
});

test('an emotion target with no variableKey gets no marker and is reported unmapped', () => {
    const stages = emptyStages();
    stages.aroma.emotions.push({ label: 'Mystery Emotion', role: 'primary', variableKey: null, intensity: 'high' });
    const result = buildTargetPrefill({ stages }, [], NO_SENSORY);
    assert.equal(result.markers.length, 0);
    assert.equal(result.unmapped.length, 1);
    assert.equal(result.unmapped[0].stageId, 'aroma');
    assert.equal(result.unmapped[0].kind, 'emotion');
    assert.match(result.unmapped[0].reason, /no attribute id/i);
});

test('an emotion variableKey with no crosswalk row gets no marker and is reported unmapped', () => {
    const stages = emptyStages();
    stages.aroma.emotions.push({ label: 'Obscure', role: 'primary', variableKey: 'vk_unknown', intensity: 'high' });
    const result = buildTargetPrefill({ stages }, [], NO_SENSORY);
    assert.equal(result.markers.length, 0);
    assert.equal(result.unmapped.length, 1);
    assert.match(result.unmapped[0].reason, /crosswalk/i);
});

test('a crosswalk row pointing at a DIFFERENT stage never produces a marker (no cross-stage moves)', () => {
    const stages = emptyStages();
    stages.aroma.emotions.push({ label: 'Nostalgia', role: 'primary', variableKey: 'vk_nostalgia', intensity: 'high' });
    const result = buildTargetPrefill({ stages }, [crosswalkRow('appearance', 'nostalgia', 'vk_nostalgia')], NO_SENSORY);
    assert.equal(result.markers.length, 0);
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

test('the emotion index ignores sensory/trigger rows; the sensory index ignores emotion/trigger rows', () => {
    const rows = [
        crosswalkRow('appearance', 'color-shade', 'vk_sensory', 'sensory'),
        crosswalkRow('overall', 'crunch', 'vk_trigger', 'trigger'),
        crosswalkRow('appearance', 'calm', 'vk_emotion', 'emotion'),
    ];
    assert.deepEqual([...buildEmotionCrosswalkIndex(rows).keys()], ['vk_emotion']);
    assert.deepEqual([...buildSensoryCrosswalkIndex(rows).keys()], ['vk_sensory']);
});

test('splitSensoryLabels splits on ";", trims, and drops empties', () => {
    assert.deepEqual(splitSensoryLabels(' Rich mouthcoating ;; Smooth melt;  '), ['Rich mouthcoating', 'Smooth melt']);
    assert.deepEqual(splitSensoryLabels(''), []);
    assert.deepEqual(splitSensoryLabels(null), []);
});

test('SENSORY labels in an injected crosswalk become markers via the same crosswalk rows; others do not', () => {
    const stages = emptyStages();
    stages.appearance.notes = 'Glossy sheen; Bright / vivid colour';
    stages.texture.notes = 'Smooth melt';
    const sensoryCrosswalk = {
        'ap|glossy sheen': 'app_Surface_Shine',   // mapped + in crosswalk rows -> marker
        'tx|smooth melt': 'tex_Not_In_Rows',      // mapped but no crosswalk row -> unmapped
    };
    const rows = [crosswalkRow('appearance', 'surface-shine', 'app_Surface_Shine', 'sensory')];

    const result = buildTargetPrefill({ stages }, rows, { sensoryCrosswalk });

    assert.deepEqual(result.markers, [{
        stageId: 'appearance', sliderKey: 'surface-shine', elementId: 'appearance-surface-shine',
        value: SENSORY_TARGET_VALUE, kind: 'sensory', label: 'Glossy sheen',
    }]);
    const unmappedLabels = result.unmapped.map((u) => `${u.kind}:${u.label}`).sort();
    assert.deepEqual(unmappedLabels, ['sensory:Bright / vivid colour', 'sensory:Smooth melt']);
    // The whole notes text is still shown as brief text - nothing dropped or duplicated.
    assert.equal(result.briefText.appearance, 'Glossy sheen; Bright / vivid colour');
    assert.equal(result.briefText.texture, 'Smooth melt');
});

test('sensory crosswalk keys are matched case-insensitively on the label and scoped by Brief stage key', () => {
    const stages = emptyStages();
    stages.appearance.notes = '  GLOSSY Sheen ';
    stages.aroma.notes = 'Glossy sheen'; // same label, wrong stage key -> no marker
    const result = buildTargetPrefill(
        { stages },
        [crosswalkRow('appearance', 'surface-shine', 'app_Surface_Shine', 'sensory')],
        { sensoryCrosswalk: { 'ap|glossy sheen': 'app_Surface_Shine' } }
    );
    assert.equal(result.markers.length, 1);
    assert.equal(result.markers[0].stageId, 'appearance');
});

test('a sensory crosswalk entry pointing at an EMOTION row, or at another stage, never produces a marker', () => {
    const stages = emptyStages();
    stages.appearance.notes = 'Label A; Label B';
    const result = buildTargetPrefill(
        { stages },
        [
            crosswalkRow('appearance', 'calm', 'vk_emotion', 'emotion'),
            crosswalkRow('aroma', 'aroma-intensity', 'vk_other_stage', 'sensory'),
        ],
        { sensoryCrosswalk: { 'ap|label a': 'vk_emotion', 'ap|label b': 'vk_other_stage' } }
    );
    assert.equal(result.markers.length, 0);
    assert.equal(result.unmapped.length, 2);
});

test('with the real (empty) Brief sensory crosswalk, no sensory label ever becomes a marker', () => {
    const stages = emptyStages();
    stages.appearance.notes = 'Glossy sheen';
    const result = buildTargetPrefill({ stages }, [crosswalkRow('appearance', 'surface-shine', 'app_Surface_Shine', 'sensory')]);
    assert.equal(result.markers.length, 0);
    assert.equal(result.briefText.appearance, 'Glossy sheen');
});

test('one marker per slider: a duplicate mapping to the same slider keeps the first', () => {
    const stages = emptyStages();
    stages.appearance.notes = 'Glossy sheen; Shiny look';
    const result = buildTargetPrefill(
        { stages },
        [crosswalkRow('appearance', 'surface-shine', 'app_Surface_Shine', 'sensory')],
        { sensoryCrosswalk: { 'ap|glossy sheen': 'app_Surface_Shine', 'ap|shiny look': 'app_Surface_Shine' } }
    );
    assert.equal(result.markers.length, 1);
    assert.equal(result.markers[0].label, 'Glossy sheen');
});

test('briefText has an entry only for stages with (non-blank) notes', () => {
    const stages = emptyStages();
    stages.texture.notes = 'Rich mouthcoating; Smooth melt';
    stages.aroma.notes = '   ';
    const result = buildTargetPrefill({ stages }, [], NO_SENSORY);
    assert.deepEqual(result.briefText, { texture: 'Rich mouthcoating; Smooth melt' });
});

test('banner is exactly the one-line string, and the marker title names the brief and version', () => {
    const result = buildTargetPrefill(
        { project: { name: 'Zesty Cola' }, version: { versionNumber: 3 }, stages: emptyStages() }, [], NO_SENSORY
    );
    assert.equal(result.banner, 'Targets from Zesty Cola v3 shown as markers.');
    assert.equal(result.markerTitle, 'Target from Zesty Cola v3');
});

test('hostile label/notes/name text is passed through untouched by the pure mapping (escaping is the HTML builders\' job)', () => {
    const stages = emptyStages();
    const hostile = '<img src=x onerror=alert(1)>';
    stages.appearance.emotions.push({ label: hostile, role: 'primary', variableKey: 'vk_x', intensity: 'high' });
    stages.appearance.notes = hostile;
    const result = buildTargetPrefill(
        { project: { name: hostile }, version: { versionNumber: 1 }, stages },
        [crosswalkRow('appearance', 'safeKey', 'vk_x')], NO_SENSORY
    );
    assert.equal(result.markers[0].sliderKey, 'safeKey');
    assert.equal(result.briefText.appearance, hostile);
    assert.equal(result.banner, `Targets from ${hostile} v1 shown as markers.`);
});

test('an empty/missing target result produces empty output, never throws', () => {
    const result = buildTargetPrefill({}, []);
    assert.equal(result.markers.length, 0);
    assert.equal(result.unmapped.length, 0);
    assert.deepEqual(result.briefText, {});
    assert.equal(result.banner, 'Targets from the brief shown as markers.');
});

// ------------------------------------------------------------
// Pure HTML builders
// ------------------------------------------------------------

test('markerLeftCss centres on the thumb position for the value, honouring min/max', () => {
    assert.equal(markerLeftCss(0, '0', '10'), 'calc(0% + 10px)');
    assert.equal(markerLeftCss(5, '0', '10'), 'calc(50% + 0px)');
    assert.equal(markerLeftCss(8, '0', '10'), 'calc(80% + -6px)');
    assert.equal(markerLeftCss(10, '0', '10'), 'calc(100% + -10px)');
    // Non-default range: 8 on a 0..20 slider sits at 40%.
    assert.equal(markerLeftCss(8, '0', '20'), 'calc(40% + 2px)');
    // Missing attributes default to 0..10; out-of-range values are clamped.
    assert.equal(markerLeftCss(8, null, null), 'calc(80% + -6px)');
    assert.equal(markerLeftCss(15, '0', '10'), 'calc(100% + -10px)');
});

test('buildTargetMarkerHtml renders a tick + "Target N" label with an escaped title', () => {
    const html = buildTargetMarkerHtml({ value: 8 }, 'Target from <b>"x"</b> v1', '0', '10');
    assert.match(html, /class="target-marker-tick" style="left:calc\(80% \+ -6px\)"/);
    assert.match(html, /class="target-marker-label"[^>]*>Target 8<\/span>/);
    assert.match(html, /title="Target from &lt;b&gt;&quot;x&quot;&lt;\/b&gt; v1"/);
    assert.doesNotMatch(html, /<b>/);
});

test('buildBriefSaysHtml escapes hostile text', () => {
    const html = buildBriefSaysHtml('<img src=x onerror=alert(1)>; Smooth');
    assert.equal(html, '<strong>Brief says:</strong> &lt;img src=x onerror=alert(1)&gt;; Smooth');
});
