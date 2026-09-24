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

// How long a qep-capture call waits for ClerkJS to finish loading before
// giving up. On a returning visit Firebase restores its own session and the
// app (Targets Loaded picker, ?project= deep link, dual-write) can run BEFORE
// auth.js's Clerk gate has loaded ClerkJS.
const CLERK_WAIT_MS = 15000;
const CLERK_POLL_MS = 100;

function _notSignedInError() {
    return new Error('Not signed in to QEP: no Clerk session, so qep-capture was not called. Please sign in again.');
}

/**
 * Resolve a Clerk session token for qep-capture requests. Waits (up to
 * CLERK_WAIT_MS) for ClerkJS to be on the page and loaded, then returns the
 * token. NEVER returns null: supabase-js treats a null token as "use the anon
 * key", and anon has no USAGE on tss_shared ("permission denied for schema
 * tss_shared", 2026-09-24). Throws a clear not-signed-in error instead.
 */
async function _getClerkTokenOrThrow() {
    const deadline = Date.now() + CLERK_WAIT_MS;
    while (!(window.Clerk && window.Clerk.loaded)) {
        if (Date.now() >= deadline) throw _notSignedInError();
        await new Promise(resolve => setTimeout(resolve, CLERK_POLL_MS));
    }
    if (!window.Clerk.session) throw _notSignedInError();
    const token = await window.Clerk.session.getToken();
    if (!token) throw _notSignedInError();
    return token;
}

function getQepCaptureClient() {
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
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getQepCaptureClient, CLERK_WAIT_MS };
}
