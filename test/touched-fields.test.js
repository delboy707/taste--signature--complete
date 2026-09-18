// Pure unit tests for touched-fields.js - no DOM, no browser.
// Run: node test/touched-fields.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createTouchedTracker,
  markTouched,
  isTouched,
  touchedIntValue,
  resetTouchedTracker,
} = require('../touched-fields.js');

test('a fresh tracker treats every field as untouched', () => {
  const tracker = createTouchedTracker();
  assert.equal(isTouched(tracker, 'quick-visual'), false);
});

test('markTouched flips a single field to touched, others stay untouched', () => {
  const tracker = createTouchedTracker();
  markTouched(tracker, 'appearance-color-shade');
  assert.equal(isTouched(tracker, 'appearance-color-shade'), true);
  assert.equal(isTouched(tracker, 'appearance-color-depth'), false);
});

test('touchedIntValue returns null for an untouched field regardless of its raw value', () => {
  const tracker = createTouchedTracker();
  // Untouched sliders still carry their HTML default in the DOM (0 on the
  // main form, 5 on Quick Entry) - that raw value must never leak through.
  assert.equal(touchedIntValue(tracker, 'quick-visual', '5'), null);
  assert.equal(touchedIntValue(tracker, 'appearance-color-shade', '0'), null);
});

test('touchedIntValue returns the parsed rating once a field is touched', () => {
  const tracker = createTouchedTracker();
  markTouched(tracker, 'quick-visual');
  assert.equal(touchedIntValue(tracker, 'quick-visual', '7'), 7);
});

test('touchedIntValue returns null for a touched field with an unparseable value, never NaN', () => {
  const tracker = createTouchedTracker();
  markTouched(tracker, 'quick-visual');
  assert.equal(touchedIntValue(tracker, 'quick-visual', ''), null);
  assert.equal(touchedIntValue(tracker, 'quick-visual', undefined), null);
  assert.equal(touchedIntValue(tracker, 'quick-visual', 'not-a-number'), null);
});

test('a genuine 0 rating on a touched field is preserved, not treated as untouched', () => {
  const tracker = createTouchedTracker();
  markTouched(tracker, 'appearance-bubble-size');
  assert.equal(touchedIntValue(tracker, 'appearance-bubble-size', '0'), 0);
});

test('resetTouchedTracker clears all touched state in place (same object reference)', () => {
  const tracker = createTouchedTracker();
  markTouched(tracker, 'quick-visual');
  markTouched(tracker, 'quick-aroma');

  resetTouchedTracker(tracker);

  assert.equal(isTouched(tracker, 'quick-visual'), false);
  assert.equal(isTouched(tracker, 'quick-aroma'), false);
  assert.equal(touchedIntValue(tracker, 'quick-visual', '5'), null);
});

test('one shared slider driving multiple derived fields (Quick Entry fan-out) nulls all of them when untouched', () => {
  // e.g. quick-visual feeds visualAppeal, colorIntensity, and overallIntensity.
  const tracker = createTouchedTracker();
  const derived = {
    visualAppeal: touchedIntValue(tracker, 'quick-visual', '5'),
    colorIntensity: touchedIntValue(tracker, 'quick-visual', '5'),
    overallIntensity: touchedIntValue(tracker, 'quick-visual', '5'),
  };
  assert.deepEqual(derived, { visualAppeal: null, colorIntensity: null, overallIntensity: null });

  markTouched(tracker, 'quick-visual');
  const derivedAfterTouch = {
    visualAppeal: touchedIntValue(tracker, 'quick-visual', '8'),
    colorIntensity: touchedIntValue(tracker, 'quick-visual', '8'),
    overallIntensity: touchedIntValue(tracker, 'quick-visual', '8'),
  };
  assert.deepEqual(derivedAfterTouch, { visualAppeal: 8, colorIntensity: 8, overallIntensity: 8 });
});
