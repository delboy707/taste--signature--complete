// Loads the REAL auth.js (and optionally qep-capture-client.js) as classic
// browser scripts inside a node:vm context whose global object doubles as
// `window`, with controllable fakes for Firebase Auth, ClerkJS, fetch and
// the DOM. Lets tests drive the Clerk gate / Firebase restore ordering of a
// returning visit deterministically.

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..', '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));
async function flushMany(n = 10) { for (let i = 0; i < n; i++) await flush(); }

// A fake ClerkJS. Every async step is a deferred the test resolves, so the
// test decides exactly when load() and setActive() finish.
function makeClerk({ signedIn = true, provisioned = true, orgs = ['org_1'], userId = 'user_1', events = [] } = {}) {
    const loadD = deferred();
    const setActiveD = deferred();
    const clerk = {
        loaded: false,
        session: null,
        user: null,
        organization: null,
        loadD,
        setActiveD,
        getTokenCalls: [],
        signOutCalls: [],
        signOutImpl: null,
        async load() {
            events.push('clerk:load:start');
            await loadD.promise;
            clerk.loaded = true;
            if (signedIn) {
                clerk.user = {
                    id: userId,
                    publicMetadata: { provisioned },
                    organizationMemberships: orgs.map((id) => ({ organization: { id } })),
                };
                clerk.session = {
                    async getToken() {
                        const tok = clerk.organization ? 'jwt-with-' + clerk.organization.id : 'jwt-no-org';
                        clerk.getTokenCalls.push(tok);
                        events.push('clerk:getToken:' + tok);
                        return tok;
                    },
                };
            }
            events.push('clerk:load:done');
        },
        async setActive({ organization }) {
            events.push('clerk:setActive:start');
            await setActiveD.promise;
            clerk.organization = { id: organization };
            events.push('clerk:setActive:done');
        },
        async signOut(opts) {
            clerk.signOutCalls.push(opts);
            events.push('clerk:signOut');
            if (clerk.signOutImpl) return clerk.signOutImpl(opts);
        },
    };
    return clerk;
}

// A fake Firebase compat Auth: onAuthStateChanged registration, a
// controllable "restore" of a persisted user, signOut and custom-token sign-in.
function makeFirebaseAuth(events) {
    const listeners = [];
    const auth = {
        currentUser: null,
        signOutCalls: 0,
        customTokenCalls: [],
        onAuthStateChanged(cb) { listeners.push(cb); },
        _emit(user) { auth.currentUser = user; listeners.forEach((cb) => cb(user)); },
        restore(user) { events.push('firebase:restore'); auth._emit(user); },
        async signOut() {
            auth.signOutCalls++;
            events.push('firebase:signOut:start');
            await Promise.resolve();
            const had = auth.currentUser !== null;
            auth.currentUser = null;
            if (had) listeners.forEach((cb) => cb(null));
            events.push('firebase:signOut:done');
        },
        async signInWithCustomToken(token) {
            auth.customTokenCalls.push(token);
            events.push('firebase:signInWithCustomToken');
        },
    };
    return auth;
}

function makeElement(id, events) {
    const listeners = {};
    const style = {};
    return {
        id,
        style: new Proxy(style, {
            set(target, prop, value) {
                target[prop] = value;
                if (prop === 'display') events.push(id + ':display=' + value);
                return true;
            },
        }),
        dataset: {},
        textContent: '',
        innerHTML: '',
        addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
        _listeners: listeners,
        _fire(type, arg) { return Promise.all((listeners[type] || []).map((fn) => fn(arg || { preventDefault() {} }))); },
    };
}

/**
 * Build a sandbox and run auth.js in it.
 * opts.clerk        - fake Clerk to preinstall on window (undefined = script
 *                     must be "loaded" via the injected <script> element)
 * opts.demo         - set the demo-mode localStorage flag
 * opts.fetchImpl    - fake fetch for /api/firebase-token
 * opts.withCaptureClient - also run qep-capture-client.js in the sandbox
 */
function bootAuth({ clerk, demo = false, fetchImpl, withCaptureClient = false, events = [] } = {}) {
    const storage = new Map();
    if (demo) storage.set('taste_demo_mode_active', 'true');
    const elements = new Map();
    const scripts = [];
    const fetchCalls = [];
    const alerts = [];
    const warnings = [];
    const auth = makeFirebaseAuth(events);
    const document = {
        getElementById(id) {
            if (!elements.has(id)) elements.set(id, makeElement(id, events));
            return elements.get(id);
        },
        createElement(tag) {
            const el = makeElement(tag, events);
            el.tagName = tag.toUpperCase();
            return el;
        },
        head: { appendChild(el) { scripts.push(el); events.push('clerk:script-injected'); } },
    };
    const location = { _href: 'https://signature.qeptss.com/', hrefSets: [] };
    Object.defineProperty(location, 'href', {
        get() { return location._href; },
        set(v) { location._href = v; location.hrefSets.push(v); events.push('redirect:' + v); },
    });
    const ctx = {
        console: {
            log() {},
            info() {},
            error() {},
            warn(...args) { warnings.push(args.map(String).join(' ')); },
        },
        setTimeout,
        clearTimeout,
        Promise,
        Date,
        document,
        location,
        localStorage: {
            getItem: (k) => (storage.has(k) ? storage.get(k) : null),
            setItem: (k, v) => storage.set(k, String(v)),
            removeItem: (k) => storage.delete(k),
        },
        alert: (msg) => { alerts.push(msg); events.push('alert'); },
        fetch: async (url, init) => {
            fetchCalls.push({ url, init });
            events.push('fetch:' + url);
            if (fetchImpl) return fetchImpl(url, init);
            return { ok: true, status: 200, json: async () => ({ token: 'firebase-custom-token' }) };
        },
        firebase: {
            initializeApp: () => ({}),
            auth: () => auth,
            firestore: () => ({}),
        },
        FIREBASE_CONFIG: { apiKey: 'x' },
        initializeFirestore: () => { events.push('initializeFirestore'); },
        handleQepCaptureDeepLink: () => { events.push('deepLink'); },
    };
    if (clerk) ctx.Clerk = clerk;
    ctx.window = ctx;
    vm.createContext(ctx);
    vm.runInContext(read('auth.js'), ctx, { filename: 'auth.js' });
    if (withCaptureClient) {
        ctx.QEP_CAPTURE_CONFIG = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'anon' };
        ctx.captured = {};
        ctx.supabase = {
            createClient(url, key, opts) { ctx.captured.opts = opts; return { rpc() {} }; },
        };
        vm.runInContext(read('qep-capture-client.js'), ctx, { filename: 'qep-capture-client.js' });
    }
    const am = ctx.authManager;
    // Record the showApp/showAuthScreen calls without losing their behaviour.
    const origShowApp = am.showApp.bind(am);
    const origShowAuth = am.showAuthScreen.bind(am);
    am.showApp = () => { events.push('showApp'); origShowApp(); };
    am.showAuthScreen = () => { events.push('showAuthScreen'); origShowAuth(); };
    return { ctx, am, auth, events, scripts, fetchCalls, alerts, warnings, location, storage };
}

module.exports = { bootAuth, makeClerk, deferred, flush, flushMany, read, ROOT };
