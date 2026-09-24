// Integration test: does picking a Quick Entry category template - which
// pre-fills sliders to values the panelist never actually set - end up
// saving those fields as null unless the panelist moves the slider
// themselves? Runs the REAL quick-entry.js (required as-is, no DOM
// library) against a minimal fake DOM built for exactly the calls this
// file makes. Run: node test/quick-entry-touched.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

function makeClassList() {
  return { add() {}, remove() {}, toggle() {}, contains() { return false; } };
}

function makeElement(id, overrides = {}) {
  const listeners = {};
  return {
    id,
    value: '',
    textContent: '',
    innerHTML: '',
    style: {},
    dataset: {},
    classList: makeClassList(),
    addEventListener(type, handler) {
      (listeners[type] = listeners[type] || []).push(handler);
    },
    _fire(type) {
      (listeners[type] || []).forEach((h) => h({ target: this }));
    },
    appendChild() {},
    scrollIntoView() {},
    remove() {},
    ...overrides,
  };
}

// Real HTML defaults from index.html: every quick-* slider starts at 5,
// except quick-purchase which starts at 3.
const SLIDER_IDS = [
  'quick-visual', 'quick-aroma', 'quick-sweetness', 'quick-sourness',
  'quick-bitterness', 'quick-salty', 'quick-texture', 'quick-aftertaste',
  'quick-satisfaction', 'quick-purchase',
];
const SLIDER_DEFAULTS = { 'quick-purchase': '3' };

function buildFakeDocument() {
  const registry = new Map();
  const sliderElements = SLIDER_IDS.map((id) =>
    makeElement(id, { value: SLIDER_DEFAULTS[id] || '5' }));
  sliderElements.forEach((el) => registry.set(el.id, el));

  ['quick-product-name', 'quick-brand', 'quick-variant', 'quick-occasion', 'quick-notes'].forEach((id) => {
    registry.set(id, makeElement(id, { value: '' }));
  });
  registry.set('selected-category-banner', makeElement('selected-category-banner'));
  registry.set('category-guidance', makeElement('category-guidance'));
  registry.set('quick-entry-form-section', makeElement('quick-entry-form-section'));

  return {
    getElementById(id) {
      // renderQuickEntryView() bails out early (`if (!container) return`)
      // when this is absent - deliberately not stubbing its full HTML
      // body, which this test has no need to exercise.
      if (id === 'quick-entry-container') return null;
      if (!registry.has(id)) registry.set(id, makeElement(id));
      return registry.get(id);
    },
    querySelectorAll(selector) {
      if (selector === '#quick-entry-form-section input[type="range"]') return sliderElements;
      return [];
    },
    querySelector() { return null; },
    createElement() { return makeElement(null); },
    body: { appendChild() {} },
  };
}

function setUp() {
  const touchedFields = require(path.join('..', 'touched-fields.js'));
  global.TouchedFields = touchedFields;
  global.window = { TouchedFields: touchedFields };
  global.escapeHtml = require(path.join('..', 'dom-utils.js')).escapeHtml;
  global.document = buildFakeDocument();
  global.alert = () => {};
  global.experiences = [];
  global.saveData = () => {};
  global.updateDashboard = () => {};
  delete require.cache[require.resolve('../quick-entry.js')];
  require('../quick-entry.js');
}

test('an untouched category-template slider saves as null, not the template guess', () => {
  setUp();

  // Picking "Premium Chocolate" pre-fills quick-visual=8, quick-aroma=7,
  // quick-sweetness=6, quick-texture=8, quick-aftertaste=7 via
  // applyTemplateDefaults(), which sets slider.value directly - no
  // 'input' event, so touched-fields.js never sees these as touched.
  window.selectCategory('premium-chocolate');

  assert.equal(document.getElementById('quick-visual').value, 8, 'template really did set a non-default value');

  document.getElementById('quick-product-name').value = 'Test Bar';
  window.submitQuickEntry();

  assert.equal(global.experiences.length, 1, 'submit should have produced one experience');
  const exp = global.experiences[0];

  assert.equal(exp.stages.appearance.visualAppeal, null, 'untouched quick-visual (template set it to 8) must save as null');
  assert.equal(exp.stages.aroma.intensity, null, 'untouched quick-aroma must save as null');
  assert.equal(exp.stages.frontMouth.sweetness, null, 'untouched quick-sweetness must save as null');
  assert.equal(exp.stages.frontMouth.texture, null, 'untouched quick-texture must save as null');
  assert.equal(exp.stages.aftertaste.duration, null, 'untouched quick-aftertaste must save as null');
  assert.equal(exp.overallSatisfaction, null, 'quick-satisfaction was never touched (not even by the template) and must save as null');
  assert.equal(exp.purchaseIntent, null, 'quick-purchase was never touched (not even by the template) and must save as null');
});

test('actually moving a template-prefilled slider makes it save as the real value, not null', () => {
  setUp();

  // initQuickEntry() wires the real 'input' listener (attachQuickEntryListeners)
  // onto every slider returned by the fake querySelectorAll.
  window.initQuickEntry();
  window.selectCategory('premium-chocolate');

  const slider = document.getElementById('quick-visual');
  slider.value = 9;
  slider._fire('input'); // the real listener calls TouchedFields.markTouched(...)

  document.getElementById('quick-product-name').value = 'Test Bar';
  window.submitQuickEntry();

  const exp = global.experiences[0];
  assert.equal(exp.stages.appearance.visualAppeal, 9, 'touched quick-visual must save as the real, moved-to value');
  // A sibling slider the panelist never touched must still be null -
  // touching one field must not mark others touched.
  assert.equal(exp.stages.aroma.intensity, null);
});
