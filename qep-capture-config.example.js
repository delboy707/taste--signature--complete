// QEP-Capture Supabase Configuration - EXAMPLE FILE
// Copy this file to qep-capture-config.js and fill in your project values.
//
// This is a bridge into qep-capture's tss_shared schema, shared by two
// features: signature-supabase-sync.js, which dual-writes Signature
// experiences into tss_shared.signature_profiles (migration 0026)
// alongside Firestore (Firestore remains the system of record; this is
// a secondary write for cross-app comparison - Brief targets vs
// Signature profiles vs Capture results), and the READ-ONLY "Targets
// loaded" feature (TSS Phase 1, checkpoint c). The anon key is safe to
// ship client-side by design - RLS is the sole access gate, same
// posture as qep-capture's own app. There is no service-role key here
// and none should ever be added to this file.
//
// Auth is bridged via the Clerk session already established by auth.js
// (window.Clerk.session.getToken()) - the same shared Clerk instance
// (clerk.qeptss.com) that Brief and Capture already trust via Supabase
// Third-Party Auth. No separate sign-in step.

const QEP_CAPTURE_CONFIG = {
    SUPABASE_URL: 'https://YOUR_PROJECT_REF.supabase.co',
    SUPABASE_ANON_KEY: 'YOUR_ANON_KEY',

    // 'dev' or 'prod' - must match which Supabase project SUPABASE_URL
    // actually points at. signature-supabase-sync.js self-disables if
    // this is 'dev' while running on signature.qeptss.com.
    SUPABASE_ENV: 'dev',

    // Dual-write gate - keep false until explicitly rolled out. Dev
    // Supabase project only (fmfjihpatkooldhrerui); do not point this at
    // production without an explicit decision to do so.
    ENABLE_SUPABASE_DUAL_WRITE: false,

    // Feature flag - keep false until this feature is reviewed for
    // production. Dev-only for TSS Phase 1 checkpoint (c).
    ENABLE_TARGETS_LOADED: false,

    // Stage 2B "Send to Capture" (send-to-capture.js): history-row button
    // that turns an experience into a new TSS project version
    // (tss_shared.create_version_from_signature, qep-capture migration 0038)
    // and a Capture study (public.create_study_from_version, 0032). Keep
    // false until 0038 is applied in the environment this points at.
    ENABLE_SEND_TO_CAPTURE: false,

    // Stage 2C "Consumer results" (consumer-results.js): read-only
    // history-row panel on a linked experience (tssProjectId) showing
    // Capture's consumer results per locked version via
    // public.get_version_results (qep-capture migration 0041). OFF until
    // 0041 is applied to the project SUPABASE_URL points at.
    ENABLE_CONSUMER_RESULTS: false,

    // Stage 2D "Target vs measured" + "Amend" (target-vs-measured.js): needs
    // 0041 and 0043 on the project SUPABASE_URL points at. Keep false until
    // reviewed. Optional: TARGET_VS_MEASURED_TOLERANCE (0-5, default +/- 1.0
    // on 0-10 scores) and TARGET_VS_MEASURED_EMOTION_TOLERANCE_PP (0-100,
    // default +/- 10 percentage points on emotion % selected).
    ENABLE_TARGET_VS_MEASURED: false,

    // qep-capture's own app (not its Supabase project) - base URL for the
    // "Test in Capture" handoff link on a locked version
    // (?version=<project_version id>). Point at http://localhost:3000 to
    // test against a qep-capture dev server running locally.
    CAPTURE_APP_URL: 'https://capture.qeptss.com'
};

if (typeof window !== 'undefined') {
    window.QEP_CAPTURE_CONFIG = QEP_CAPTURE_CONFIG;
}
