// QEP-Capture Supabase Configuration
// See qep-capture-config.example.js for what this is and why the anon
// key is safe to commit here (RLS-gated, no service-role key, same
// posture as firebase-config.js).
//
// PROD project (xrkjkhehiwxaesignvty). Dual-write go-live: this now
// points at production, matching SUPABASE_ENV below. Reverting either
// value alone (without the other) is exactly what the env guard in
// signature-supabase-sync.js exists to catch - see its comment.

const QEP_CAPTURE_CONFIG = {
    SUPABASE_URL: 'https://xrkjkhehiwxaesignvty.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhya2praGVoaXd4YWVzaWdudnR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyOTA5OTMsImV4cCI6MjA5Nzg2Njk5M30.cBLGPsFpUx1CIATMl7KsAsb4yygYJZnqrj9mZD7lNkU',

    // Which Supabase project SUPABASE_URL above actually points at -
    // 'prod' here (xrkjkhehiwxaesignvty). signature-supabase-sync.js
    // self-disables if this is 'dev' AND the app is running on the
    // production hostname (signature.qeptss.com), so a copy of this
    // file with a stale/wrong value can't write real customer data
    // into the dev database. With SUPABASE_ENV='prod' that guard no
    // longer applies - dual-write is live against the real database.
    SUPABASE_ENV: 'prod',

    // Dual-write gate - live. Do not flip back to false without an
    // explicit decision to pause the rollout.
    ENABLE_SUPABASE_DUAL_WRITE: true,

    // Stage 2A: the picker/deep link/prefill work uses qep-capture RPC/columns
    // from migrations 0036/0037, which are applied to production (and dev).
    ENABLE_TARGETS_LOADED: true,

    // Stage 2B "Send to Capture" (send-to-capture.js): history-row button
    // that turns an experience into a new TSS project version
    // (tss_shared.create_version_from_signature, qep-capture migration 0038)
    // and a Capture study (public.create_study_from_version, 0032). On:
    // 0038 was applied to production (and dev) on 2026-09-25.
    ENABLE_SEND_TO_CAPTURE: true,

    // Stage 2C "Consumer results" (consumer-results.js): read-only
    // history-row panel on a linked experience (tssProjectId) showing
    // Capture's consumer results per locked version via
    // public.get_version_results (qep-capture migration 0041). On: 0041 was
    // applied to production (and dev) on 2026-09-25.
    ENABLE_CONSUMER_RESULTS: true,

    // qep-capture's own app (not its Supabase project) - base URL for the
    // "Test in Capture" handoff link. Defaults to production; set to
    // http://localhost:3000 locally to test against a qep-capture dev
    // server instead.
    CAPTURE_APP_URL: 'https://capture.qeptss.com'
};

if (typeof window !== 'undefined') {
    window.QEP_CAPTURE_CONFIG = QEP_CAPTURE_CONFIG;
}
