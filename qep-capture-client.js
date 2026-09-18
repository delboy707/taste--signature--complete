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
            accessToken: async () => {
                if (!window.Clerk || !window.Clerk.session) {
                    return null;
                }
                return window.Clerk.session.getToken();
            },
        }
    );
    return _qepCaptureClient;
}

if (typeof window !== 'undefined') {
    window.getQepCaptureClient = getQepCaptureClient;
}
