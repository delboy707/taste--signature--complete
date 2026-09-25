// Exactly one AuthManager (follow-up to PR #47's "found in passing").
// index.html's inline boot script used to run `const authManager = new
// AuthManager();`. A top-level const in a classic script is a global LEXICAL
// binding, and bare `authManager` lookups in every other script resolve to it
// before window.authManager - so export-controller.js and tutorial.js read a
// second instance that initialize() was never called on: currentUser always
// null, getUserId() always null, getCompanyData() always "No user logged in".
//
// These tests load the real auth.js, export-controller.js, tutorial.js and
// index.html's boot script, in page order, into ONE vm context (a vm context
// shares the global lexical scope across scripts the same way a page does).
// Run: node --test test/single-auth-manager.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { read, ROOT } = require('./helpers/auth-sandbox');

// The inline <script> right after app.js: index.html's auth/PWA boot script.
function extractBootScript() {
    const html = read('index.html');
    const anchor = html.indexOf('<script src="app.js"></script>');
    assert.ok(anchor > 0, 'app.js script tag found');
    const start = html.indexOf('<script>', anchor);
    assert.ok(start > anchor, 'boot script found after app.js');
    const end = html.indexOf('</script>', start);
    return html.slice(start + '<script>'.length, end);
}

function scriptOrder() {
    const html = read('index.html');
    const idx = (src) => html.indexOf(`<script src="${src}"></script>`);
    return { auth: idx('auth.js'), exportController: idx('export-controller.js'), tutorial: idx('tutorial.js'), app: idx('app.js') };
}

function bootPage() {
    const storage = new Map();
    const branding = [];
    const ctx = {
        console: { log() {}, info() {}, warn() {}, error() {} },
        setTimeout: () => 0,
        clearTimeout() {},
        Promise,
        Date,
        JSON,
        location: { href: 'https://signature.qeptss.com/' },
        localStorage: {
            getItem: (k) => (storage.has(k) ? storage.get(k) : null),
            setItem: (k, v) => storage.set(k, String(v)),
            removeItem: (k) => storage.delete(k),
        },
        document: {
            getElementById: () => null,
            addEventListener() {},
            querySelector: () => null,
            querySelectorAll: () => [],
            createElement: () => ({ style: {}, addEventListener() {}, appendChild() {} }),
            head: { appendChild() {} },
            body: { appendChild() {} },
        },
        navigator: {},
        PDFExporter: class { setCompanyBranding(b) { branding.push(b); } },
        ExcelImporter: class {},
    };
    ctx.window = ctx;
    vm.createContext(ctx);
    // Page order: auth.js, export-controller.js, tutorial.js, ..., boot script.
    vm.runInContext(read('auth.js'), ctx, { filename: 'auth.js' });
    vm.runInContext(read('export-controller.js'), ctx, { filename: 'export-controller.js' });
    vm.runInContext(read('tutorial.js'), ctx, { filename: 'tutorial.js' });
    vm.runInContext(extractBootScript(), ctx, { filename: 'index.html#boot' });
    return { ctx, storage, branding };
}

// Make auth.js's instance look initialised and signed in (what initialize()
// + onAuthStateChanged would do), with a Firestore fake for getCompanyData().
function signIn(ctx, uid = 'user_1') {
    const am = ctx.window.authManager;
    am.currentUser = { uid, email: 'derek@example.com' };
    am.db = {
        collection: (name) => ({
            doc: (id) => ({
                get: async () => {
                    if (name === 'users') return { exists: true, data: () => ({ companyId: 'co_1', role: 'owner' }) };
                    return { exists: true, data: () => ({ companyName: 'Acme Foods', industry: 'Snacks', companySize: '11-50', id }) };
                },
            }),
        }),
    };
    return am;
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

test('index.html loads auth.js before export-controller.js and tutorial.js, and the boot script after app.js', () => {
    const o = scriptOrder();
    assert.ok(o.auth > 0 && o.exportController > o.auth && o.tutorial > o.auth && o.app > o.tutorial);
});

test('only auth.js constructs an AuthManager - no second instance anywhere in the shipped page', () => {
    const offenders = [];
    for (const f of fs.readdirSync(ROOT)) {
        if (!/\.(js|html)$/.test(f)) continue; // skips *.bak / index.html.backup
        const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
        const n = (src.match(/new AuthManager\s*\(/g) || []).length;
        if (f === 'auth.js') {
            assert.equal(n, 1, 'auth.js creates exactly one');
        } else if (n > 0) {
            offenders.push(`${f} (${n})`);
        }
    }
    assert.deepEqual(offenders, [], 'no other file creates an AuthManager');
});

test('after the whole boot, bare `authManager` IS window.authManager (the instance auth.js initialises)', () => {
    const { ctx } = bootPage();
    assert.ok(ctx.window.authManager, 'auth.js created window.authManager');
    assert.equal(vm.runInContext('authManager === window.authManager', ctx), true,
        'no global lexical binding shadows window.authManager');
});

test('export-controller.js sees the initialised, signed-in instance: company branding loads', async () => {
    const { ctx, branding } = bootPage();
    signIn(ctx);
    vm.runInContext('initializeExporters()', ctx);
    await flush(); await flush(); await flush();
    assert.equal(branding.length, 1, 'getCompanyData() succeeded on the signed-in instance');
    assert.equal(branding[0].companyName, 'Acme Foods');
});

test('export-controller.js: signed out -> no branding call, no throw', async () => {
    const { ctx, branding } = bootPage();
    vm.runInContext('initializeExporters()', ctx);
    await flush();
    assert.equal(branding.length, 0);
});

test('tutorial.js sees the signed-in user id (per-user completion flag)', () => {
    const { ctx, storage } = bootPage();
    signIn(ctx, 'user_42');
    storage.set('tutorial_completed_user_42', 'true');
    assert.equal(ctx.window.tutorialManager.checkTutorialStatus(), true);
    ctx.window.tutorialManager.cleanup = () => {};
    ctx.window.tutorialManager.showCompletionMessage = () => {};
    storage.delete('tutorial_completed_user_42');
    ctx.window.tutorialManager.endTutorial(true);
    assert.equal(storage.get('tutorial_completed_user_42'), 'true', 'endTutorial writes the flag for the signed-in user');
});

test('tutorial.js: signed out -> not completed, no throw', () => {
    const { ctx } = bootPage();
    assert.equal(ctx.window.tutorialManager.checkTutorialStatus(), false);
});
