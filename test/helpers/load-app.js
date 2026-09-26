// Loads the REAL app.js in Node against a permissive stub DOM, so tests can
// drive its top-level functions (loadDataFromCloud, updateDashboard, ...)
// against the Firestore emulator without a browser.
//
// The stub is deliberately dumb: every element is a Proxy that records the
// properties set on it (e.g. innerHTML) and absorbs any method call. Any
// global app.js references that isn't provided here resolves to another
// absorbing stub, so an unrelated missing global cannot crash the load.

const fs = require('node:fs');
const path = require('node:path');

const APP_SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'app.js'), 'utf8');

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

function loadApp({ localStorageData = null } = {}) {
  const elements = new Map();
  const storage = new Map();
  if (localStorageData !== null) storage.set('tasteSignatureData', JSON.stringify(localStorageData));

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
    console,
    window: { TouchedFields: require('../../touched-fields.js'), DisplayFormat: require('../../display-format.js') },
    escapeHtml: require('../../dom-utils.js').escapeHtml,
    RenderUtils: require('../../render-utils.js'),
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

  // app.js's top-level `let` bindings are only reachable from inside the
  // same scope, so the accessors are appended to its source.
  const factory = new Function('scope', `with (scope) { ${APP_SRC}
;return {
  loadData, loadDataFromCloud, updateDashboard, updateRetestOptions,
  getExperiences: () => experiences,
  setExperiences: (v) => { experiences = v; },
  useCloud: (manager) => { firestoreManager = manager; isCloudSyncEnabled = true; },
}; }`);

  return { app: factory(scope), elements, storage };
}

module.exports = { loadApp };
