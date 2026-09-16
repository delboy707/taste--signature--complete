// ===== INCREMENTAL SAVE ROLLOUT GATE =====
// Controls which companies get the new saveExperiences()/migration logic
// (firestore-data.js) versus the original delete-all/reinsert-all
// behavior. No secrets here - just an allowlist, safe to commit.
//
// Default: EMPTY. An empty (or missing) allowlist means every company
// gets the OLD behavior, unchanged - this file shipping is not itself a
// rollout. Add a companyId here to opt that one company into the new
// logic; see MIGRATION_RUNBOOK.md for the intended rollout order
// (backup -> merge with this empty -> add one test company -> verify ->
// widen).

const INCREMENTAL_SAVE_CONFIG = {
    ALLOWLISTED_COMPANY_IDS: []
};

if (typeof window !== 'undefined') {
    window.INCREMENTAL_SAVE_CONFIG = INCREMENTAL_SAVE_CONFIG;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = INCREMENTAL_SAVE_CONFIG;
}
