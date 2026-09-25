// Logout must end the Clerk session too (follow-up to PR #47).
// PR #47's logout() called Clerk.signOut only if ClerkJS had ALREADY loaded
// when its 3 s wait ran out. A logout during the Clerk load window, or after
// a gate error, signed Firebase out and redirected to the portal home while
// the user stayed signed in to Clerk on qeptss.com.
//
// Now: logout waits (bounded) for the gate's own Clerk load - or loads
// ClerkJS itself just to sign out (bounded) when the gate failed - and calls
// Clerk.signOut. Only a confirmed Clerk sign-out (or a Clerk that has no
// session) goes to the portal home; anything else goes to the Portal's
// sign-out page (qeptss.com/dashboard, where the Portal's Sign out button
// lives - the Portal has no sign-out route) with an explanation, never a
// silent "you're signed out".
// Run: node --test test/logout-clerk-signout.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const { bootAuth, makeClerk, flushMany, deferred } = require('./helpers/auth-sandbox');

const PORTAL = 'https://qeptss.com';
const PORTAL_SIGN_OUT = 'https://qeptss.com/dashboard';
const FB_USER = { uid: 'user_1', email: 'derek@example.com', displayName: 'Derek' };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function fastLogout(am) {
    am.logoutClerkWaitMs = 20;
    am.logoutClerkLoadMs = 150;
    am.logoutClerkSignOutMs = 100;
}

test('logout during the Clerk load window: waits for the gate\'s load, then Clerk.signOut, then the portal', async () => {
    const events = [];
    const clerk = makeClerk({ events });
    const s = bootAuth({ clerk, events });
    s.am.initialize();
    s.auth.restore(FB_USER);
    await flushMany();
    fastLogout(s.am);
    const out = s.am.logout();
    await sleep(40); // past the 20 ms signal wait: Clerk.load() still pending
    assert.equal(clerk.signOutCalls.length, 0);
    clerk.loadD.resolve(); // the gate's load finishes inside the bound
    const res = await out;
    assert.equal(clerk.signOutCalls.length, 1, 'Clerk session ended');
    assert.equal(s.auth.signOutCalls, 1, 'Firebase signed out');
    assert.equal(res.clerkSignedOut, true);
    assert.deepEqual(s.location.hrefSets, [PORTAL]);
    assert.ok(events.indexOf('clerk:signOut') < events.indexOf('redirect:' + PORTAL));
    assert.equal(events.filter((e) => e === 'clerk:load:start').length, 1, 'reuses the gate\'s in-flight Clerk.load(), never a second one');
});

test('logout after the gate errored (Clerk.load() failed): retries the load just to sign out', async () => {
    const clerk = makeClerk();
    let loads = 0;
    clerk.load = async () => {
        loads++;
        if (loads === 1) throw new Error('clerk down');
        clerk.loaded = true;
        clerk.session = { getToken: async () => 'jwt' };
    };
    const s = bootAuth({ clerk });
    assert.equal(await s.am.initialize(), false);
    assert.equal(s.am.clerkReadyState.status, 'error');
    fastLogout(s.am);
    const res = await s.am.logout();
    assert.equal(loads, 2, 'loaded ClerkJS again for the sign-out');
    assert.equal(clerk.signOutCalls.length, 1);
    assert.equal(res.clerkSignedOut, true);
    assert.deepEqual(s.location.hrefSets, [PORTAL]);
});

test('logout after the ClerkJS script failed to load: injects it again and signs out', async () => {
    const s = bootAuth({ clerk: undefined });
    const init = s.am.initialize();
    await flushMany();
    await s.scripts[0]._fire('error');
    assert.equal(await init, false);
    fastLogout(s.am);
    const out = s.am.logout();
    await flushMany();
    assert.equal(s.scripts.length, 2, 'a fresh ClerkJS script is injected for the sign-out');
    const clerk = makeClerk();
    s.ctx.Clerk = clerk;
    await s.scripts[1]._fire('load');
    clerk.loadD.resolve();
    const res = await out;
    assert.equal(clerk.signOutCalls.length, 1);
    assert.equal(res.clerkSignedOut, true);
    assert.deepEqual(s.location.hrefSets, [PORTAL]);
});

test('Clerk cannot be loaded within the bound: never a silent portal-home redirect - Portal sign-out page + explanation', async () => {
    const clerk = makeClerk(); // load() never resolves
    const s = bootAuth({ clerk });
    s.am.initialize();
    s.auth.restore(FB_USER);
    await flushMany();
    fastLogout(s.am);
    const res = await s.am.logout();
    assert.equal(s.auth.signOutCalls, 1, 'Firebase still signed out');
    assert.equal(clerk.signOutCalls.length, 0);
    assert.equal(res.clerkSignedOut, false);
    assert.deepEqual(s.location.hrefSets, [PORTAL_SIGN_OUT]);
    assert.equal(s.alerts.length, 1);
    assert.match(s.alerts[0], /sign out/i);
});

test('Clerk.signOut throwing: Portal sign-out page, not the portal home', async () => {
    const clerk = makeClerk();
    clerk.signOutImpl = async () => { throw new Error('clerk signOut failed'); };
    const s = bootAuth({ clerk });
    const init = s.am.initialize();
    clerk.loadD.resolve();
    clerk.setActiveD.resolve();
    await init;
    fastLogout(s.am);
    const res = await s.am.logout();
    assert.equal(s.auth.signOutCalls, 1);
    assert.equal(res.clerkSignedOut, false);
    assert.deepEqual(s.location.hrefSets, [PORTAL_SIGN_OUT]);
});

test('Clerk.signOut hanging: bounded, then the Portal sign-out page', async () => {
    const clerk = makeClerk();
    clerk.signOutImpl = () => deferred().promise; // never settles
    const s = bootAuth({ clerk });
    const init = s.am.initialize();
    clerk.loadD.resolve();
    clerk.setActiveD.resolve();
    await init;
    fastLogout(s.am);
    const res = await s.am.logout();
    assert.equal(res.clerkSignedOut, false);
    assert.deepEqual(s.location.hrefSets, [PORTAL_SIGN_OUT]);
});

test('Clerk loaded with no session (already signed out on the portal): no signOut call, portal home', async () => {
    const clerk = makeClerk({ signedIn: false });
    const s = bootAuth({ clerk });
    const init = s.am.initialize();
    clerk.loadD.resolve();
    await init;
    fastLogout(s.am);
    const res = await s.am.logout();
    assert.equal(clerk.signOutCalls.length, 0);
    assert.equal(res.clerkSignedOut, true);
    assert.deepEqual(s.location.hrefSets, [PORTAL]);
    assert.equal(s.alerts.length, 0);
});

test('signed-in gate: Clerk.signOut to the portal, portal home, no alert', async () => {
    const clerk = makeClerk();
    const s = bootAuth({ clerk });
    const init = s.am.initialize();
    clerk.loadD.resolve();
    clerk.setActiveD.resolve();
    await init;
    const res = await s.am.logout();
    assert.deepEqual(JSON.parse(JSON.stringify(clerk.signOutCalls)), [{ redirectUrl: PORTAL }]);
    assert.equal(res.clerkSignedOut, true);
    assert.deepEqual(s.location.hrefSets, [PORTAL]);
    assert.equal(s.alerts.length, 0);
});

test('demo mode: ClerkJS is still never loaded; portal home', async () => {
    const s = bootAuth({ clerk: undefined, demo: true });
    await s.am.initialize();
    fastLogout(s.am);
    await s.am.logout();
    assert.equal(s.scripts.length, 0, 'no clerk.browser.js injected in demo mode');
    assert.deepEqual(s.location.hrefSets, [PORTAL]);
});

test('a logout still pending never lets the gate re-sign-in Firebase', async () => {
    const clerk = makeClerk();
    const s = bootAuth({ clerk });
    const init = s.am.initialize();
    s.auth.restore(FB_USER);
    await flushMany();
    fastLogout(s.am);
    const out = s.am.logout();
    await sleep(40);
    clerk.loadD.resolve();
    clerk.setActiveD.resolve();
    await out;
    await init;
    await flushMany();
    assert.deepEqual(s.auth.customTokenCalls, []);
    assert.equal(s.fetchCalls.length, 0);
});
