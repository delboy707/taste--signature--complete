// Integration tests: does app.js's Full Evaluation form actually carry
// tssProjectId/sourceVersionId onto a submitted experience when started
// from a target, and does a re-test correctly NOT inherit them? Loads the
// REAL app.js in a vm-free Node sandbox (same "with(scope){...}" pattern
// as test/helpers/load-app.js) against a minimal stub DOM - no browser, no
// Firestore, no Supabase. Run: node test/target-prefill-app-integration.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const APP_SRC = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const SENSORY_ATTRIBUTES_SRC = fs.readFileSync(path.join(__dirname, '..', 'sensory-attributes.js'), 'utf8');

function stub(name) {
    const store = { innerHTML: '', value: '', style: {}, dataset: {}, classList: { add() {}, remove() {}, contains: () => false } };
    return new Proxy(function () {}, {
        get(_, prop) {
            if (prop in store) return store[prop];
            if (prop === Symbol.toPrimitive) return () => '';
            if (prop === 'length') return 0;
            if (prop === 'then') return undefined;
            return stub(`${name}.${String(prop)}`);
        },
        set(_, prop, value) { store[prop] = value; return true; },
        apply() { return stub(`${name}()`); },
    });
}

function realEl(id) {
    return { id, value: '', style: {}, dataset: {}, classList: { add() {}, remove() {}, contains: () => false }, onchange: null };
}

function loadAppForPrefillTests() {
    const elements = new Map();
    const storage = new Map();

    const retestSelector = realEl('retest-selector');
    elements.set('retest-selector', retestSelector);
    elements.set('item-name', realEl('item-name'));
    elements.set('item-brand', realEl('item-brand'));
    elements.set('item-type', realEl('item-type'));
    elements.set('item-variant', realEl('item-variant'));

    const document = {
        addEventListener() {},
        getElementById(id) {
            if (!elements.has(id)) elements.set(id, stub(id));
            return elements.get(id);
        },
        querySelector: () => stub('querySelector'),
        querySelectorAll: () => [],
        createElement: () => stub('createElement'),
        body: stub('body'),
    };
    const localStorage = {
        getItem: (k) => (storage.has(k) ? storage.get(k) : null),
        setItem: (k, v) => storage.set(k, String(v)),
        removeItem: (k) => storage.delete(k),
    };

    const provided = {
        document,
        localStorage,
        console: { ...console, log() {}, warn() {}, error() {} },
        window: { TouchedFields: require('../touched-fields.js'), TargetPrefill: require('../target-prefill.js') },
        escapeHtml: require('../dom-utils.js').escapeHtml,
        RenderUtils: require('../render-utils.js'),
        alert() {},
    };
    const scope = new Proxy(provided, {
        has: () => true,
        get(target, prop) {
            if (prop === Symbol.unscopables) return undefined;
            if (prop in target) return target[prop];
            if (prop in globalThis) return globalThis[prop];
            return stub(String(prop));
        },
        set(target, prop, value) { target[prop] = value; return true; },
    });

    const factory = new Function('scope', `with (scope) { ${SENSORY_ATTRIBUTES_SRC}
${APP_SRC}
;return {
  applyTargetPrefillToForm, initRetestSelector, handleFormSubmit,
  getExperiences: () => experiences,
  setExperiences: (v) => { experiences = v; },
}; }`);

    return { app: factory(scope), elements };
}

function fakeSubmitEvent() {
    return { preventDefault() {} };
}

test('a submission started from "Start Full Evaluation from this target" carries tssProjectId/sourceVersionId', () => {
    const { app } = loadAppForPrefillTests();

    app.applyTargetPrefillToForm(
        { markers: [], briefText: {}, banner: '', unmapped: [] },
        { projectId: 'proj-123', versionId: 'ver-456', projectName: 'Zesty Cola' }
    );
    app.handleFormSubmit(fakeSubmitEvent());

    const experiences = app.getExperiences();
    assert.equal(experiences.length, 1);
    assert.equal(experiences[0].tssProjectId, 'proj-123');
    assert.equal(experiences[0].sourceVersionId, 'ver-456');
    assert.equal(experiences[0].productInfo.name, 'Zesty Cola');
});

test('an ordinary submission (never target-prefilled) carries no tssProjectId/sourceVersionId', () => {
    const { app } = loadAppForPrefillTests();

    app.handleFormSubmit(fakeSubmitEvent());

    const experiences = app.getExperiences();
    assert.equal(experiences.length, 1);
    assert.equal(experiences[0].tssProjectId, null);
    assert.equal(experiences[0].sourceVersionId, null);
});

test('the ids are cleared after submit: a SECOND ordinary submission right after a target-prefilled one does not inherit them', () => {
    const { app } = loadAppForPrefillTests();

    app.applyTargetPrefillToForm({ markers: [], briefText: {}, banner: '', unmapped: [] }, { projectId: 'proj-123', versionId: 'ver-456' });
    app.handleFormSubmit(fakeSubmitEvent());
    app.handleFormSubmit(fakeSubmitEvent());

    const experiences = app.getExperiences();
    assert.equal(experiences.length, 2);
    assert.equal(experiences[0].tssProjectId, 'proj-123');
    assert.equal(experiences[1].tssProjectId, null);
    assert.equal(experiences[1].sourceVersionId, null);
});

test('re-test copies do NOT inherit a pending target link: selecting a re-test clears it before submit', () => {
    const { app, elements } = loadAppForPrefillTests();

    // Seed one prior experience to re-test against.
    app.setExperiences([{ id: 1, productInfo: { name: 'Original', brand: 'Acme', type: 'Snack', variant: 'N/A' } }]);

    // Start from a target (as if the user clicked "Start Full Evaluation
    // from this target" right before deciding to re-test an existing
    // product instead).
    app.applyTargetPrefillToForm({ markers: [], briefText: {}, banner: '', unmapped: [] }, { projectId: 'proj-123', versionId: 'ver-456' });

    // Now pick a re-test from the selector - this must clear the pending link.
    app.initRetestSelector();
    const selector = elements.get('retest-selector');
    selector.value = '1';
    selector.onchange();

    app.handleFormSubmit(fakeSubmitEvent());

    const experiences = app.getExperiences();
    const submitted = experiences[experiences.length - 1];
    assert.equal(submitted.tssProjectId, null);
    assert.equal(submitted.sourceVersionId, null);
    assert.equal(submitted.isRetest, true);
});

test('applyTargetPrefillToForm pre-fills productInfo.name from the project name only when the field is empty (editable, not overwritten)', () => {
    const { app, elements } = loadAppForPrefillTests();
    elements.get('item-name').value = 'Already typed by the user';

    app.applyTargetPrefillToForm({ markers: [], briefText: {}, banner: '', unmapped: [] }, { projectId: 'p', versionId: 'v', projectName: 'Should Not Overwrite' });

    assert.equal(elements.get('item-name').value, 'Already typed by the user');
});
