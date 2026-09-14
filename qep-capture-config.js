// QEP-Capture Supabase Configuration
// See qep-capture-config.example.js for what this is and why the anon
// key is safe to commit here (RLS-gated, no service-role key, same
// posture as firebase-config.js).
//
// DEV project (fmfjihpatkooldhrerui) only - checkpoint (c). Do not point
// this at production without an explicit decision to do so.

const QEP_CAPTURE_CONFIG = {
    SUPABASE_URL: 'https://fmfjihpatkooldhrerui.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtZmppaHBhdGtvb2xkaHJlcnVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNDc5MzIsImV4cCI6MjEwNDYyMzkzMn0.1c-Enjr2jD_RAjIINlnlK9lAtIDgthTwaU6qQDrNOrc',

    // Which Supabase project SUPABASE_URL above actually points at -
    // 'dev' here (fmfjihpatkooldhrerui). signature-supabase-sync.js
    // self-disables if this is 'dev' AND the app is running on the
    // production hostname (signature.qeptss.com), so a copy of this
    // file with a stale/wrong value can't write real customer data
    // into the dev database.
    SUPABASE_ENV: 'dev',

    // Dual-write gate - flip to false-by-default until explicitly rolled
    // out. Do not enable against production without an explicit decision.
    ENABLE_SUPABASE_DUAL_WRITE: false,

    // Dev-only feature flag - flip to false before any merge that could
    // reach production until this feature has been explicitly reviewed.
    ENABLE_TARGETS_LOADED: true
};

if (typeof window !== 'undefined') {
    window.QEP_CAPTURE_CONFIG = QEP_CAPTURE_CONFIG;
}
