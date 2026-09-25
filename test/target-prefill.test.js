// Pure unit tests for target-prefill.js - no DOM, no Supabase, no
// Firestore. Run: node test/target-prefill.test.js
//
// Stage 2A.5 (shared dictionary): markers come straight from the locked
// version's coded tss_shared.targets rows (variable_key = master code,
// range_min = range_max = 0-10 target), reverse-mapped through the
// Signature attribute crosswalk. Stage notes are brief text only.

const test = require('node:test');
const assert = require('node:assert/strict');
const {
    buildTargetPrefill, buildCrosswalkIndex, targetMarkerPosition,
    markerLeftCss, buildTargetMarkerHtml, buildBriefSaysHtml,
    TARGET_INTENSITY_SCALE, SIGNATURE_STAGE_IDS, STAGE_ID_TO_FORM_STAGE_NUMBER,
    NOT_MEASURABLE_PREFIX,
} = require('../target-prefill.js');

function emptyStages() {
    const stages = {};
    for (const id of SIGNATURE_STAGE_IDS) stages[id] = { targets: [], notes: '' };
    return stages;
}

function crosswalkRow(stage, key, variableKey, kind = 'emotion') {
    return { signature_stage: stage, signature_key: key, variable_key: variableKey, kind };
}

// A coded Stage 2A.5 target: range_min = range_max = target.
function coded(label, variableKey, kind, value, extra = {}) {
    return { label, role: 'primary', variableKey, kind, intensity: null, rangeMin: value, rangeMax: value, ...extra };
}

// A legacy Brief emotion target (pre-2A.5): intensity 'high', no range.
function legacyEmotion(label, variableKey, extra = {}) {
    return { label, role: 'primary', variableKey, kind: 'emotion', intensity: 'high', rangeMin: null, rangeMax: null, ...extra };
}

test('intensity scale is a single named constant with high/medium/low (legacy targets only)', () => {
    assert.deepEqual(TARGET_INTENSITY_SCALE, { low: 2, medium: 5, high: 8 });
});

test('all 7 Signature stages are covered, each with a Full Evaluation form section', () => {
    assert.deepEqual(SIGNATURE_STAGE_IDS, [
        'appearance', 'aroma', 'frontMouth', 'midRearMouth', 'texture', 'aftertaste', 'overall',
    ]);
    assert.deepEqual(SIGNATURE_STAGE_IDS.map((id) => STAGE_ID_TO_FORM_STAGE_NUMBER[id]), [2, 3, 4, 5, 6, 7, 8]);
});

test('the returned shape has markers/briefText/banner/unmapped and NO formValues', () => {
    const result = buildTargetPrefill({ stages: emptyStages() }, []);
    assert.ok(Array.isArray(result.markers));
    assert.deepEqual(result.briefText, {});
    assert.equal(typeof result.banner, 'string');
    assert.ok(Array.isArray(result.unmapped));
    assert.equal(result.formValues, undefined);
    assert.equal(result.stages, undefined);
});

// ------------------------------------------------------------
// Coded targets -> markers
// ------------------------------------------------------------

test('coded SENSORY target -> marker at the target value on the mapped slider', () => {
    const stages = emptyStages();
    stages.texture.targets.push(coded('Creaminess', 'tex_Creaminess', 'sensory', 7));
    const result = buildTargetPrefill({ stages }, [crosswalkRow('texture', 'creaminess', 'tex_Creaminess', 'sensory')]);
    assert.deepEqual(result.unmapped, []);
    assert.deepEqual(result.markers, [{
        stageId: 'texture', sliderKey: 'creaminess', elementId: 'tex-creaminess',
        value: 7, valueLabel: '7', kind: 'sensory', label: 'Creaminess', variableKey: 'tex_Creaminess',
    }]);
});

test('coded EMOTION target -> marker at the target value (not the intensity scale)', () => {
    const stages = emptyStages();
    stages.appearance.targets.push(coded('Curiosity', 'ap_emo_curiosity', 'emotion', 6));
    const result = buildTargetPrefill({ stages }, [crosswalkRow('appearance', 'curiosity', 'ap_emo_curiosity', 'emotion')]);
    assert.equal(result.markers.length, 1);
    assert.equal(result.markers[0].elementId, 'appearance-curiosity');
    assert.equal(result.markers[0].value, 6);
    assert.equal(result.markers[0].valueLabel, '6');
    assert.equal(result.markers[0].kind, 'emotion');
});

test('each of the 7 stages puts a coded target on the right form slider id', () => {
    const stagePrefixes = {
        appearance: 'appearance', aroma: 'aroma', frontMouth: 'front', midRearMouth: 'mid',
        texture: 'tex', aftertaste: 'after', overall: 'overall',
    };
    for (const stageId of SIGNATURE_STAGE_IDS) {
        const stages = emptyStages();
        stages[stageId].targets.push(coded('Excitement', 'vk_1', 'emotion', 5));
        const result = buildTargetPrefill({ stages }, [crosswalkRow(stageId, 'excitement', 'vk_1')]);
        assert.equal(result.unmapped.length, 0);
        assert.equal(result.markers.length, 1);
        assert.equal(result.markers[0].elementId, `${stagePrefixes[stageId]}-excitement`);
        assert.equal(result.markers[0].value, 5);
    }
});

test('a target value of 0 is a real target (marker at 0), never treated as missing', () => {
    const stages = emptyStages();
    stages.aroma.targets.push(coded('Burnt', 'aroma_Burnt', 'sensory', 0));
    const result = buildTargetPrefill({ stages }, [crosswalkRow('aroma', 'burnt', 'aroma_Burnt', 'sensory')]);
    assert.equal(result.markers[0].value, 0);
    assert.equal(result.markers[0].valueLabel, '0');
});

test('numeric strings from PostgREST (numeric columns) are accepted', () => {
    const stages = emptyStages();
    stages.aroma.targets.push(coded('Vanilla', 'aroma_Vanilla', 'sensory', '7.5'));
    const result = buildTargetPrefill({ stages }, [crosswalkRow('aroma', 'vanilla', 'aroma_Vanilla', 'sensory')]);
    assert.equal(result.markers[0].value, 7.5);
    assert.equal(result.markers[0].valueLabel, '7.5');
});

test('multi-key crosswalk: one code -> every same-stage Signature slider key (canonical first, then alias)', () => {
    const stages = emptyStages();
    stages.aftertaste.targets.push(coded('Craving / want more', 'af_emo_craving_want_more', 'emotion', 8));
    const rows = [
        crosswalkRow('aftertaste', 'craving', 'af_emo_craving_want_more', 'emotion'),          // canonical
        crosswalkRow('aftertaste', 'cravingWantMore', 'af_emo_craving_want_more', 'emotion'),  // alias
    ];
    const result = buildTargetPrefill({ stages }, rows);
    assert.deepEqual(result.markers.map((m) => m.elementId), ['after-craving', 'after-cravingWantMore']);
    assert.ok(result.markers.every((m) => m.value === 8 && m.variableKey === 'af_emo_craving_want_more'));
    assert.deepEqual(result.unmapped, []);
});

test('an ALIAS-only code (no canonical row) still gets its marker', () => {
    const stages = emptyStages();
    stages.appearance.targets.push(coded('Surface shine', 'app_Surface_Shine', 'sensory', 4));
    const result = buildTargetPrefill({ stages }, [crosswalkRow('appearance', 'shine', 'app_Surface_Shine', 'sensory')]);
    assert.equal(result.markers.length, 1);
    assert.equal(result.markers[0].elementId, 'appearance-shine');
});

test('an alias key whose form slider canonically belongs to ANOTHER code is never marked (real case: overall "satisfaction")', () => {
    // qep-capture 0029 aliases ('overall','satisfaction','sensory') -> oa_Satisfaction,
    // but overall-satisfaction in the form is the canonical EMOTION slider for
    // overall_emo_satisfaction (0025). The sensory target goes only on its own
    // canonical slider overall-overall-satisfaction.
    const rows = [
        crosswalkRow('overall', 'overall-satisfaction', 'oa_Satisfaction', 'sensory'),      // canonical
        crosswalkRow('overall', 'satisfaction', 'overall_emo_satisfaction', 'emotion'),     // canonical
        crosswalkRow('overall', 'satisfaction', 'oa_Satisfaction', 'sensory'),              // alias
    ];
    const stages = emptyStages();
    stages.overall.targets.push(coded('Satisfaction', 'oa_Satisfaction', 'sensory', 7));
    const result = buildTargetPrefill({ stages }, rows);
    assert.deepEqual(result.markers.map((m) => m.elementId), ['overall-overall-satisfaction']);

    // Only the colliding alias row (no canonical row of its own): listed, not marked.
    const only = buildTargetPrefill({ stages }, [rows[1], rows[2]]);
    assert.equal(only.markers.length, 0);
    assert.equal(only.unmapped.length, 1);
    assert.match(only.unmapped[0].reason, /belongs to another attribute/);

    // The emotion target still gets its own slider.
    const emo = emptyStages();
    emo.overall.targets.push(coded('Satisfaction', 'overall_emo_satisfaction', 'emotion', 9));
    assert.deepEqual(buildTargetPrefill({ stages: emo }, rows).markers.map((m) => m.elementId), ['overall-satisfaction']);
});

test('buildCrosswalkIndex keeps every row per code in input order (canonical rows are passed first)', () => {
    const index = buildCrosswalkIndex([
        crosswalkRow('appearance', 'canonicalKey', 'vk_shared'),
        crosswalkRow('appearance', 'aliasKey', 'vk_shared'),
        crosswalkRow('appearance', 'canonicalKey', 'vk_shared'), // exact duplicate row ignored
    ]);
    assert.deepEqual(index.get('vk_shared').map((r) => r.key), ['canonicalKey', 'aliasKey']);
});

test('a crosswalk row of a different KIND than the target is not used', () => {
    const stages = emptyStages();
    stages.appearance.targets.push(coded('Calm', 'vk_x', 'sensory', 5));
    const result = buildTargetPrefill({ stages }, [crosswalkRow('appearance', 'calm', 'vk_x', 'emotion')]);
    assert.equal(result.markers.length, 0);
    assert.equal(result.unmapped.length, 1);
});

test('RANGE target (min != max): marker sits at the midpoint and its label shows the range', () => {
    const stages = emptyStages();
    stages.frontMouth.targets.push(coded('Sweetness', 'fm_Sweetness', 'sensory', null, { rangeMin: 6, rangeMax: 8 }));
    const result = buildTargetPrefill({ stages }, [crosswalkRow('frontMouth', 'sweetness', 'fm_Sweetness', 'sensory')]);
    assert.equal(result.markers[0].value, 7);
    assert.equal(result.markers[0].valueLabel, '6-8');
});

test('targetMarkerPosition: point, range, reversed range, one-sided range, legacy intensity', () => {
    assert.deepEqual(targetMarkerPosition({ rangeMin: 7, rangeMax: 7 }), { value: 7, valueLabel: '7' });
    assert.deepEqual(targetMarkerPosition({ rangeMin: 3, rangeMax: 6 }), { value: 4.5, valueLabel: '3-6' });
    assert.deepEqual(targetMarkerPosition({ rangeMin: 8, rangeMax: 6 }), { value: 7, valueLabel: '6-8' });
    assert.deepEqual(targetMarkerPosition({ rangeMin: 4, rangeMax: null }), { value: 4, valueLabel: '4' });
    assert.deepEqual(targetMarkerPosition({ rangeMin: null, rangeMax: 9 }), { value: 9, valueLabel: '9' });
    assert.deepEqual(targetMarkerPosition({ rangeMin: null, rangeMax: null, intensity: 'high' }), { value: 8, valueLabel: '8' });
    assert.deepEqual(targetMarkerPosition({ intensity: 'low' }), { value: 2, valueLabel: '2' });
    assert.deepEqual(targetMarkerPosition({ intensity: 'extreme' }), { value: 8, valueLabel: '8' });
    assert.deepEqual(targetMarkerPosition({ rangeMin: '', rangeMax: 'abc', intensity: 'high' }), { value: 8, valueLabel: '8' });
});

test('LEGACY emotion target (intensity high, null range) keeps today\'s marker: "Target 8" at the high end', () => {
    const stages = emptyStages();
    stages.appearance.targets.push(legacyEmotion('Excitement', 'ap_emo_excitement'));
    const result = buildTargetPrefill({ stages }, [crosswalkRow('appearance', 'excitement', 'ap_emo_excitement')]);
    assert.deepEqual(result.markers, [{
        stageId: 'appearance', sliderKey: 'excitement', elementId: 'appearance-excitement',
        value: TARGET_INTENSITY_SCALE.high, valueLabel: '8', kind: 'emotion', label: 'Excitement', variableKey: 'ap_emo_excitement',
    }]);
});

test('legacy targets with no kind field (pre-2A.5 loader shape) still map through emotion/sensory rows', () => {
    const stages = emptyStages();
    stages.appearance.targets.push({ label: 'Calm', role: 'primary', variableKey: 'vk_calm', intensity: 'low' });
    const result = buildTargetPrefill({ stages }, [crosswalkRow('appearance', 'calm', 'vk_calm')]);
    assert.equal(result.markers[0].value, 2);
    assert.equal(result.markers[0].kind, 'emotion');
});

// ------------------------------------------------------------
// Not measurable in this form - listed, never dropped
// ------------------------------------------------------------

test('UNMAPPED code: no marker, listed in unmapped AND in the stage brief text AND counted in the banner', () => {
    const stages = emptyStages();
    stages.aroma.targets.push(coded('Smoky', 'aroma_Smoky', 'sensory', 6));
    stages.aroma.notes = 'Warm, toasty';
    const result = buildTargetPrefill({ project: { name: 'Zesty Cola' }, version: { versionNumber: 3 }, stages }, []);
    assert.equal(result.markers.length, 0);
    assert.equal(result.unmapped.length, 1);
    assert.equal(result.unmapped[0].variableKey, 'aroma_Smoky');
    assert.equal(result.unmapped[0].stageId, 'aroma');
    assert.match(result.unmapped[0].reason, /crosswalk/i);
    assert.equal(result.briefText.aroma, `Warm, toasty\n${NOT_MEASURABLE_PREFIX} Smoky (6)`);
    assert.equal(result.banner, 'Targets from Zesty Cola v3 shown as markers. 1 target not measurable in this form (listed in its stage).');
    assert.ok(!result.banner.includes('\n'));
});

test('unmapped codes in a stage with NO notes still get a brief-text line; several are joined', () => {
    const stages = emptyStages();
    stages.overall.targets.push(coded('Satisfaction', 'overall_x', 'sensory', 7));
    stages.overall.targets.push(legacyEmotion('Joy', 'overall_emo_joy'));
    const result = buildTargetPrefill({ stages }, []);
    assert.equal(result.briefText.overall, `${NOT_MEASURABLE_PREFIX} Satisfaction (7), Joy`);
    assert.match(result.banner, /2 targets not measurable in this form \(listed in their stages\)\.$/);
});

test('a code whose crosswalk rows are all on ANOTHER stage never produces a marker (no cross-stage moves), and is listed', () => {
    const stages = emptyStages();
    stages.aroma.targets.push(coded('Nostalgia', 'vk_nostalgia', 'emotion', 7));
    const result = buildTargetPrefill({ stages }, [crosswalkRow('appearance', 'nostalgia', 'vk_nostalgia')]);
    assert.equal(result.markers.length, 0);
    assert.equal(result.unmapped.length, 1);
    assert.match(result.unmapped[0].reason, /"appearance" stage, not "aroma"/);
    assert.match(result.briefText.aroma, /Nostalgia \(7\)/);
});

test('a TRIGGER code is listed as not measurable (trigger sliders are not marked)', () => {
    const stages = emptyStages();
    stages.overall.targets.push(coded('Moreishness', 'overall_trig_moreishness', 'trigger', 9));
    const result = buildTargetPrefill({ stages }, [crosswalkRow('overall', 'moreishness', 'overall_trig_moreishness', 'trigger')]);
    assert.equal(result.markers.length, 0);
    assert.equal(result.unmapped.length, 1);
    assert.match(result.briefText.overall, /Moreishness \(9\)/);
});

test('a target with no variableKey is listed, never dropped', () => {
    const stages = emptyStages();
    stages.aroma.targets.push({ label: 'Mystery', role: 'primary', variableKey: null, intensity: 'high' });
    const result = buildTargetPrefill({ stages }, []);
    assert.equal(result.markers.length, 0);
    assert.match(result.unmapped[0].reason, /no attribute id/i);
    assert.match(result.briefText.aroma, /Mystery/);
});

test('targets the loader could not place on a stage (unplacedTargets) are named in the banner', () => {
    const result = buildTargetPrefill({
        project: { name: 'Zesty Cola' }, version: { versionNumber: 3 }, stages: emptyStages(),
        unplacedTargets: [{ variableKey: 'mystery_code', rangeMin: 5, rangeMax: 5, reason: 'Unknown attribute code.' }],
    }, []);
    assert.equal(result.unmapped.length, 1);
    assert.equal(result.unmapped[0].stageId, null);
    assert.equal(result.banner, 'Targets from Zesty Cola v3 shown as markers. Not measurable in this form: mystery_code (5).');
});

// ------------------------------------------------------------
// Stage notes, one-marker-per-slider, banner
// ------------------------------------------------------------

test('stage NOTES become brief text only: never parsed into markers, even if they name a slider', () => {
    const stages = emptyStages();
    stages.appearance.notes = 'Glossy sheen; Surface shine';
    stages.texture.notes = 'Rich mouthcoating; Smooth melt';
    stages.aroma.notes = '   ';
    const result = buildTargetPrefill({ stages }, [crosswalkRow('appearance', 'surface-shine', 'app_Surface_Shine', 'sensory')]);
    assert.equal(result.markers.length, 0);
    assert.deepEqual(result.unmapped, []);
    assert.deepEqual(result.briefText, { appearance: 'Glossy sheen; Surface shine', texture: 'Rich mouthcoating; Smooth melt' });
});

test('one marker per slider: two codes landing on the same slider keep the first', () => {
    const stages = emptyStages();
    stages.appearance.targets.push(coded('First', 'vk_a', 'sensory', 3));
    stages.appearance.targets.push(coded('Second', 'vk_b', 'sensory', 9));
    const result = buildTargetPrefill({ stages }, [
        crosswalkRow('appearance', 'shine', 'vk_a', 'sensory'),
        crosswalkRow('appearance', 'shine', 'vk_b', 'sensory'),
    ]);
    assert.equal(result.markers.length, 1);
    assert.equal(result.markers[0].label, 'First');
});

test('banner is exactly the one-line string when everything is measurable; marker title names the brief and version', () => {
    const stages = emptyStages();
    stages.aroma.targets.push(coded('Vanilla', 'aroma_Vanilla', 'sensory', 7));
    const result = buildTargetPrefill(
        { project: { name: 'Zesty Cola' }, version: { versionNumber: 3 }, stages },
        [crosswalkRow('aroma', 'vanilla', 'aroma_Vanilla', 'sensory')]
    );
    assert.equal(result.banner, 'Targets from Zesty Cola v3 shown as markers.');
    assert.equal(result.markerTitle, 'Target from Zesty Cola v3');
});

test('hostile label/notes/name text is passed through untouched by the pure mapping (escaping is the HTML builders\' job)', () => {
    const stages = emptyStages();
    const hostile = '<img src=x onerror=alert(1)>';
    stages.appearance.targets.push(coded(hostile, 'vk_x', 'emotion', 5));
    stages.appearance.notes = hostile;
    const result = buildTargetPrefill(
        { project: { name: hostile }, version: { versionNumber: 1 }, stages },
        [crosswalkRow('appearance', 'safeKey', 'vk_x')]
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
    assert.doesNotThrow(() => buildTargetPrefill(null, null));
});

test('the old Brief sensory-label API is gone from the module', () => {
    const api = require('../target-prefill.js');
    for (const gone of ['splitSensoryLabels', 'buildSensoryCrosswalkIndex', 'buildEmotionCrosswalkIndex', 'SENSORY_TARGET_VALUE', 'STAGE_ID_TO_BRIEF_STAGE_KEY']) {
        assert.equal(api[gone], undefined, `${gone} should be removed`);
    }
});

// ------------------------------------------------------------
// Pure HTML builders
// ------------------------------------------------------------

test('markerLeftCss centres on the thumb position for the value, honouring min/max', () => {
    assert.equal(markerLeftCss(0, '0', '10'), 'calc(0% + 10px)');
    assert.equal(markerLeftCss(5, '0', '10'), 'calc(50% + 0px)');
    assert.equal(markerLeftCss(8, '0', '10'), 'calc(80% + -6px)');
    assert.equal(markerLeftCss(10, '0', '10'), 'calc(100% + -10px)');
    assert.equal(markerLeftCss(8, '0', '20'), 'calc(40% + 2px)');
    assert.equal(markerLeftCss(8, null, null), 'calc(80% + -6px)');
    assert.equal(markerLeftCss(15, '0', '10'), 'calc(100% + -10px)');
});

test('buildTargetMarkerHtml renders a tick + "Target N" label with an escaped title', () => {
    const html = buildTargetMarkerHtml({ value: 8, valueLabel: '8' }, 'Target from <b>"x"</b> v1', '0', '10');
    assert.match(html, /class="target-marker-tick" style="left:calc\(80% \+ -6px\)"/);
    assert.match(html, /class="target-marker-label"[^>]*>Target 8<\/span>/);
    assert.match(html, /title="Target from &lt;b&gt;&quot;x&quot;&lt;\/b&gt; v1"/);
    assert.doesNotMatch(html, /<b>/);
});

test('buildTargetMarkerHtml: a range marker sits at the midpoint and reads "Target 6-8"; no valueLabel falls back to value', () => {
    const range = buildTargetMarkerHtml({ value: 7, valueLabel: '6-8' }, 't', '0', '10');
    assert.match(range, /left:calc\(70% \+ -4px\)/);
    assert.match(range, />Target 6-8<\/span>/);
    assert.match(buildTargetMarkerHtml({ value: 8 }, 't', '0', '10'), />Target 8<\/span>/);
});

test('buildBriefSaysHtml escapes hostile text', () => {
    const html = buildBriefSaysHtml('<img src=x onerror=alert(1)>; Smooth');
    assert.equal(html, '<strong>Brief says:</strong> &lt;img src=x onerror=alert(1)&gt;; Smooth');
});
