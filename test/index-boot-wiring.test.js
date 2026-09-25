// index.html's inline boot script (the DOMContentLoaded handler that calls
// authManager.initialize()). Audit A2 findings #7/#11/#13: initAuthUI(),
// initLogoutButton() and registerServiceWorker() used to run only AFTER the
// Clerk gate resolved, so on a returning visit the Firebase-restored app was
// visible with a dead logout button and no SW registration - forever, if the
// gate failed. They must be wired before the gate is awaited.
// Run: node --test test/index-boot-wiring.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { read, flushMany } = require('./helpers/auth-sandbox');

// The inline <script> right after app.js (index.html's auth/PWA boot script).
function extractBootScript() {
    const html = read('index.html');
    const anchor = html.indexOf('<script src="app.js"></script>');
    assert.ok(anchor > 0, 'app.js script tag found');
    const start = html.indexOf('<script>', anchor);
    assert.ok(start > anchor, 'boot script found after app.js');
    const end = html.indexOf('</script>', start);
    return html.slice(start + '<script>'.length, end);
}

function bootIndex({ initialize, confirmAnswer = true, firebaseLoaded = true } = {}) {
    const elements = new Map();
    const domListeners = {};
    const calls = { swRegister: 0, logout: 0, initialize: 0 };
    function el(id) {
        if (!elements.has(id)) {
            const listeners = {};
            elements.set(id, {
                id,
                style: {},
                textContent: '',
                className: '',
                addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
                _listeners: listeners,
                _fire(type) { return Promise.all((listeners[type] || []).map((fn) => fn({ preventDefault() {} }))); },
            });
        }
        return elements.get(id);
    }
    const location = { href: 'https://signature.qeptss.com/' };
    const ctx = {
        console: { log() {}, info() {}, warn() {}, error() {} },
        setTimeout: () => 0,
        setInterval: () => 0,
        clearTimeout() {},
        Promise,
        Date,
        location,
        sessionStorage: { getItem: () => null, setItem() {} },
        confirm: () => confirmAnswer,
        alert() {},
        navigator: {
            serviceWorker: {
                getRegistrations: async () => [],
                register: async () => { calls.swRegister++; return { scope: '/', addEventListener() {}, update: async () => {} }; },
            },
        },
        document: {
            getElementById: el,
            addEventListener(type, fn) { (domListeners[type] = domListeners[type] || []).push(fn); },
            querySelectorAll: () => [],
            createElement: () => el('created'),
            body: { appendChild() {} },
        },
        AuthManager: class {},
    };
    if (firebaseLoaded) ctx.firebase = {};
    ctx.window = ctx;
    // The real auth.js instance, faked: initialize() is controlled by the test.
    const am = {
        initialize: () => { calls.initialize++; return initialize ? initialize() : new Promise(() => {}); },
        logout: async () => { calls.logout++; return { success: true }; },
    };
    vm.createContext(ctx);
    vm.runInContext(extractBootScript(), ctx, { filename: 'index.html#boot' });
    // The boot script reads window.authManager (auth.js's single instance).
    ctx.authManager = am;
    const fireDomReady = () => Promise.all((domListeners.DOMContentLoaded || []).map((fn) => fn()));
    return { ctx, el, calls, location, fireDomReady };
}

test('#13: logout button and service worker are wired while the Clerk gate is still pending', async () => {
    const b = bootIndex(); // initialize() never resolves
    b.fireDomReady();
    await flushMany();
    assert.equal(b.calls.initialize, 1);
    assert.equal((b.el('btn-logout')._listeners.click || []).length, 1, 'logout wired before the gate resolves');
    assert.equal(b.calls.swRegister, 1, 'service worker registered before the gate resolves');
    assert.equal((b.el('btn-try-demo')._listeners.click || []).length, 1, 'demo button wired before the gate resolves');
});

test('#7/#13: clicking logout while the gate is pending calls authManager.logout()', async () => {
    const b = bootIndex();
    b.fireDomReady();
    await flushMany();
    await b.el('btn-logout')._fire('click');
    assert.equal(b.calls.logout, 1);
});

test('#11/#13: initialize() resolving false still leaves logout and the SW wired, exactly once', async () => {
    const b = bootIndex({ initialize: async () => false });
    await b.fireDomReady();
    await flushMany();
    assert.equal((b.el('btn-logout')._listeners.click || []).length, 1);
    assert.equal(b.calls.swRegister, 1);
});

test('#13: a successful initialize() does not double-wire logout or the SW', async () => {
    const b = bootIndex({ initialize: async () => true });
    await b.fireDomReady();
    await flushMany();
    assert.equal((b.el('btn-logout')._listeners.click || []).length, 1);
    assert.equal((b.el('btn-try-demo')._listeners.click || []).length, 1);
    assert.equal(b.calls.swRegister, 1);
});

test('#7: logout button with no authManager at all still redirects to the portal', async () => {
    const b = bootIndex();
    b.fireDomReady();
    await flushMany();
    b.ctx.authManager = undefined;
    await b.el('btn-logout')._fire('click');
    assert.equal(b.location.href, 'https://qeptss.com');
});
