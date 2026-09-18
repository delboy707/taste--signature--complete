// ===== TOUCHED-FIELD TRACKING (pure, DOM-agnostic) =====
// A slider's `.value` alone can't tell "the user rated this 0" apart from
// "the user never touched this slider" - both read back as the same string.
// This module tracks which field ids have actually received user input, so
// callers can save an untouched field as null instead of its HTML default
// (0 on the main form's sliders, 5 on Quick Entry's). Nothing here touches
// the DOM or Firestore - it only tracks ids and reads raw string values
// handed to it, so it can be unit-tested without a browser.

/** A fresh tracker - just a Set of touched field ids. */
function createTouchedTracker() {
  return new Set();
}

/** Record that a field has been interacted with. */
function markTouched(tracker, fieldId) {
  tracker.add(fieldId);
}

function isTouched(tracker, fieldId) {
  return tracker.has(fieldId);
}

/**
 * Resolve a slider's saved value: null if the field was never touched,
 * otherwise the parsed integer (or null if rawValue itself doesn't parse -
 * an empty/missing element should never be recorded as a fabricated 0).
 */
function touchedIntValue(tracker, fieldId, rawValue) {
  if (!isTouched(tracker, fieldId)) return null;
  if (rawValue === undefined || rawValue === null || rawValue === '') return null;
  const n = parseInt(rawValue, 10);
  return Number.isNaN(n) ? null : n;
}

/** Reset a tracker in place (e.g. between successive Quick Entry submissions). */
function resetTouchedTracker(tracker) {
  tracker.clear();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createTouchedTracker,
    markTouched,
    isTouched,
    touchedIntValue,
    resetTouchedTracker,
  };
}
if (typeof window !== 'undefined') {
  window.TouchedFields = {
    createTouchedTracker,
    markTouched,
    isTouched,
    touchedIntValue,
    resetTouchedTracker,
  };
}
