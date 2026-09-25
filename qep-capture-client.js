// ===== QEP-CAPTURE SUPABASE CLIENT =====
// Shared bridge into qep-capture's tss_shared schema. Two consumers:
// signature-supabase-sync.js (Supabase dual-write, migration 0026's
// upsert_signature_profile/soft_delete_signature_profile RPCs) and
// targets-loaded.js (read-only "Targets loaded" feature, TSS Phase 1
// checkpoint c). Mirrors tss-re1's src/lib/qep-capture/server.ts
// pattern: anon key only, no service-role key, RLS is the sole access
// gate. The one difference is this app has no server-side runtime to
// hide the client construction behind - everything here is
// client-side, which is fine because the anon key isn't a secret.
//
// Auth reuses the Clerk session auth.js already established
// (window.Clerk.session.getToken(), same call auth.js makes for the
// Firebase token exchange) - same shared Clerk instance
// (clerk.qeptss.com) that qep-capture's own Supabase project already
// trusts via Third-Party Auth. No separate sign-in step for the user.

let _qepCaptureClient = null;

// How long a qep-capture call waits for auth.js's Clerk-ready signal (or,
// without auth.js, for ClerkJS to finish loading) before giving up. On a
// returning visit Firebase restores its own session and the app (Targets
// Loaded picker, ?project= deep link, dual-write) can run BEFORE auth.js's
// Clerk gate has loaded ClerkJS and activated the org.
const CLERK_WAIT_MS = 15000;
const CLERK_POLL_MS = 100;

// Demo mode (localStorage flag owned by demo-mode.js, read by auth.js as
// DEMO_MODE_KEY) skips auth.js's Clerk gate, so ClerkJS is never loaded and a
// Clerk token can never arrive. Every qep-capture call fails immediately in
// demo mode instead of polling CLERK_WAIT_MS for a Clerk that will never load.
const DEMO_MODE_MESSAGE = 'Demo mode: QEP Capture features need a signed-in QEP account. Exit demo mode and sign in to use them.';

/**
 * True when the app is in demo mode. Delegates to demo-mode.js
 * (window.demoMode.isDemoActive()); if that has not loaded, reads the same
 * localStorage key auth.js uses (its DEMO_MODE_KEY). Never throws - blocked
 * storage counts as not-demo, which still takes the Clerk path below and so
 * still never falls back to anon.
 */
function isQepDemoModeActive() {
    if (typeof window === 'undefined') return false;
    try {
        if (window.demoMode && typeof window.demoMode.isDemoActive === 'function') {
            return window.demoMode.isDemoActive() === true;
        }
        if (typeof DEMO_MODE_KEY === 'string' && window.localStorage) {
            return window.localStorage.getItem(DEMO_MODE_KEY) === 'true';
        }
    } catch (err) {
        // Storage unavailable - treat as not demo.
    }
    return false;
}

function _demoModeError() {
    const err = new Error(DEMO_MODE_MESSAGE);
    err.code = 'QEP_DEMO_MODE';
    return err;
}

function _notSignedInError() {
    return new Error('Not signed in to QEP: no Clerk session, so qep-capture was not called. Please sign in again.');
}

/**
 * Resolve a Clerk session token for qep-capture requests. Awaits auth.js's
 * Clerk-ready signal (authManager.whenClerkReady(), up to CLERK_WAIT_MS),
 * which settles only after Clerk.load() AND the gate's single-org setActive,
 * so the token carries the org claim that tss_shared.auth_user_org_ids()
 * reads (audit A2 #2/#9). Without auth.js on the page it falls back to
 * polling for Clerk.loaded, as before.
 * NEVER returns null: supabase-js treats a null token as "use the anon
 * key", and anon has no USAGE on tss_shared ("permission denied for schema
 * tss_shared", 2026-09-24). Throws a clear not-signed-in error instead.
 */
async function _getClerkTokenOrThrow() {
    if (isQepDemoModeActive()) throw _demoModeError();
    const authManager = window.authManager;
    if (authManager && typeof authManager.whenClerkReady === 'function') {
        const state = await authManager.whenClerkReady(CLERK_WAIT_MS);
        if (isQepDemoModeActive() || (state && state.status === 'demo')) throw _demoModeError();
        if (!state || state.status !== 'signed-in') throw _notSignedInError();
    } else {
        const deadline = Date.now() + CLERK_WAIT_MS;
        while (!(window.Clerk && window.Clerk.loaded)) {
            if (Date.now() >= deadline) throw _notSignedInError();
            await new Promise(resolve => setTimeout(resolve, CLERK_POLL_MS));
        }
    }
    if (!(window.Clerk && window.Clerk.session)) throw _notSignedInError();
    const token = await window.Clerk.session.getToken();
    if (!token) throw _notSignedInError();
    return token;
}

function getQepCaptureClient() {
    // Checked before the cache so callers get the clear demo message from
    // their own try/catch, not a wrapped fetch error from inside supabase-js.
    if (isQepDemoModeActive()) {
        throw _demoModeError();
    }
    if (_qepCaptureClient) {
        return _qepCaptureClient;
    }
    if (typeof window === 'undefined' || !window.supabase || !window.supabase.createClient) {
        throw new Error('QEP-Capture client: @supabase/supabase-js not loaded.');
    }
    if (!window.QEP_CAPTURE_CONFIG || !window.QEP_CAPTURE_CONFIG.SUPABASE_URL) {
        throw new Error('QEP-Capture client: qep-capture-config.js not loaded or incomplete.');
    }

    _qepCaptureClient = window.supabase.createClient(
        window.QEP_CAPTURE_CONFIG.SUPABASE_URL,
        window.QEP_CAPTURE_CONFIG.SUPABASE_ANON_KEY,
        {
            accessToken: _getClerkTokenOrThrow,
        }
    );
    return _qepCaptureClient;
}

if (typeof window !== 'undefined') {
    window.getQepCaptureClient = getQepCaptureClient;
    window.isQepDemoModeActive = isQepDemoModeActive;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getQepCaptureClient, isQepDemoModeActive, CLERK_WAIT_MS, DEMO_MODE_MESSAGE };
}
