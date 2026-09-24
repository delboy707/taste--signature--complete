// ===== BRIEF SENSORY -> QEP ATTRIBUTE CROSSWALK (reviewed, hand-curated) =====
// Maps a Brief (tss-re1) sensory pick to one qep_attribute id so
// target-prefill.js can draw a "Target N" marker on the matching Signature
// slider. Brief stores its sensory picks as free marketing-language labels
// joined "; " into tss_shared.version_stage_notes - there is no attribute id
// at the source, so every row here is a human decision, never a guess.
//
// THIS OBJECT IS INTENTIONALLY EMPTY. A review found 0 exact label matches
// out of 41 Brief sensory labels, so nothing can be filled automatically.
// The owner fills it from ~/QEP-TSS/sensory-crosswalk.csv (columns:
// brief_label, stage, proposed_attribute_code, proposed_attribute_label,
// match_type) once each proposed_attribute_code has been reviewed.
//
// HOW TO ADD A ROW
//   Key:   `${stage}|${brief label, trimmed and lowercased}`
//          stage is the Brief/qep stage key: ap, ar, fm, mr, tx, af
//          (the csv's `stage` column; `overall` is accepted too).
//   Value: the qep_attribute id (the csv's proposed_attribute_code), which
//          MUST already exist in public.qep_attribute AND have a 'sensory'
//          row in tss_shared.signature_attribute_map for the SAME stage -
//          otherwise target-prefill.js reports it as unmapped and draws no
//          marker. Never invent a code.
//   Shape of a row (placeholders, not a mapping):
//     'ap|<brief label in lowercase>': '<qep_attribute id>',
//
// A label with no row here is still shown to the evaluator as the stage's
// "Brief says:" text - nothing is dropped.
const BRIEF_SENSORY_TO_QEP_ATTRIBUTE = Object.freeze({
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BRIEF_SENSORY_TO_QEP_ATTRIBUTE };
}
if (typeof window !== 'undefined') {
    window.BRIEF_SENSORY_TO_QEP_ATTRIBUTE = BRIEF_SENSORY_TO_QEP_ATTRIBUTE;
}
