// ===== SIGNATURE -> SUPABASE DUAL WRITE (Option A) =====
// Fire-and-forget secondary write into qep-capture's
// tss_shared.signature_profiles (migration 0026/0027), alongside
// Firestore. Firestore remains the system of record - this call never
// blocks a save/delete and never surfaces an error to the user.
//
// Gated four ways, all of which fail closed (dual-write off) if
// anything is missing or looks wrong:
//   1. qep-capture-config.js's ENABLE_SUPABASE_DUAL_WRITE (default false).
//   2. qep-capture-config.js itself may simply be absent at runtime
//      (e.g. not deployed) - every call below tolerates
//      window.QEP_CAPTURE_CONFIG being undefined and treats that as
//      "disabled", never throwing at load or call time.
//   3. An environment guard: SUPABASE_ENV: 'dev' config running on the
//      production hostname (signature.qeptss.com) self-disables with a
//      console warning - dev Supabase data must never be written from
//      a session a real customer could be using.
//   4. Demo mode (no Clerk session, sample data only) - see
//      _blockedByDemoMode(); nothing is queued.

const SUPABASE_RETRY_QUEUE_KEY = 'signatureSupabaseRetryQueue';
const SUPABASE_RETRY_QUEUE_MAX = 50; // capped by distinct id - never grows unbounded
const PROD_HOSTNAME = 'signature.qeptss.com';

function _saveDiff() {
  if (typeof require !== 'undefined') return require('./save-diff.js');
  return (typeof window !== 'undefined') ? window.SaveDiff : null;
}

// In-memory only, per page load - same posture as firestore-data.js's
// own _lastSyncedById. Independent of Firestore's baseline: this one
// tracks what we've already offered to Supabase, regardless of which
// Firestore save path (legacy or incremental) produced it.
let _lastPushedSnapshot = new Map();
let _envGuardWarned = false;
let _demoModeLogged = false;

function _dualWriteConfig() {
    return (typeof window !== 'undefined' && window.QEP_CAPTURE_CONFIG) || null;
}

function _hostname() {
    return (typeof window !== 'undefined' && window.location && window.location.hostname) || '';
}

function _blockedByEnvGuard(config) {
    if (_hostname() !== PROD_HOSTNAME || config.SUPABASE_ENV !== 'dev') return false;
    if (!_envGuardWarned) {
        console.warn(
            `Supabase dual-write disabled: running on ${PROD_HOSTNAME} with SUPABASE_ENV=dev. ` +
            'Refusing to write production traffic into a dev Supabase project.'
        );
        _envGuardWarned = true;
    }
    return true;
}

// Demo mode: sample data only, no Clerk session. Dual-write is off - nothing
// is queued (a queued demo entry would otherwise be retried later under a
// real sign-in). Uses qep-capture-client.js's shared isQepDemoModeActive().
function _blockedByDemoMode() {
    const isDemo = typeof window !== 'undefined' && typeof window.isQepDemoModeActive === 'function'
        ? window.isQepDemoModeActive()
        : false;
    if (isDemo && !_demoModeLogged) {
        console.info('Supabase dual-write skipped: demo mode is active.');
        _demoModeLogged = true;
    }
    return isDemo;
}

function isSupabaseDualWriteEnabled() {
    const config = _dualWriteConfig();
    if (!config || !config.ENABLE_SUPABASE_DUAL_WRITE) return false;
    if (_blockedByEnvGuard(config)) return false;
    if (_blockedByDemoMode()) return false;
    return true;
}

function _storage() {
    return (typeof window !== 'undefined' && window.localStorage) || null;
}

// ------------------------------------------------------------
// Retry queue: one entry per id - {id, action, queuedAt}. No payload -
// a retry reads whatever the caller's CURRENT in-memory experiences
// array says at the time it runs, never a stale copy from when the
// failure happened. Writing a new entry for an id already queued
// overwrites it outright, so the latest action always wins (a delete
// queued after a push for the same id discards the push entirely -
// there is nothing left to resurrect).
// ------------------------------------------------------------
function _readQueue() {
    const storage = _storage();
    if (!storage) return [];
    try {
        const raw = storage.getItem(SUPABASE_RETRY_QUEUE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function _writeQueue(entries) {
    const storage = _storage();
    if (!storage) return;
    try {
        const capped = entries.length <= SUPABASE_RETRY_QUEUE_MAX
            ? entries
            : entries.slice().sort((a, b) => a.queuedAt - b.queuedAt).slice(-SUPABASE_RETRY_QUEUE_MAX);
        storage.setItem(SUPABASE_RETRY_QUEUE_KEY, JSON.stringify(capped));
    } catch {
        // localStorage full/unavailable - nothing more we can safely do
        // here without risking a user-visible failure from a fire-and-
        // forget path.
    }
}

function _upsertQueueEntry(id, action) {
    const entries = _readQueue().filter(e => e.id !== id);
    entries.push({ id, action, queuedAt: Date.now() });
    _writeQueue(entries);
}

function _removeQueueEntryIfUnchanged(id, expected) {
    const entries = _readQueue();
    const current = entries.find(e => e.id === id);
    if (current && current.action === expected.action && current.queuedAt === expected.queuedAt) {
        _writeQueue(entries.filter(e => e.id !== id));
    }
}

function _client() {
    if (typeof window !== 'undefined' && typeof window.getQepCaptureClient === 'function') {
        return window.getQepCaptureClient();
    }
    if (typeof getQepCaptureClient === 'function') {
        return getQepCaptureClient();
    }
    throw new Error('signature-supabase-sync: getQepCaptureClient is not available.');
}

async function _runOp(action, id, experience) {
    const client = _client();
    if (action === 'push') {
        const { error } = await client.schema('tss_shared').rpc('upsert_signature_profile', { experience });
        if (error) throw new Error(error.message);
    } else {
        const { error } = await client.schema('tss_shared').rpc('soft_delete_signature_profile', { p_signature_experience_id: id });
        if (error) throw new Error(error.message);
    }
}

// Processes whatever is CURRENTLY in the queue, one entry at a time.
// Re-reads each entry immediately before acting on it, so an id
// overwritten by a newer call while an earlier entry's RPC was in
// flight is never sent using the stale action.
async function flushSignatureSupabaseQueue(experiences) {
    const byId = new Map((experiences || []).map(exp => [String(exp.id), exp]));
    const queueSnapshot = _readQueue();

    for (const queued of queueSnapshot) {
        const current = _readQueue().find(e => e.id === queued.id);
        if (!current) continue; // already resolved/removed since the snapshot was taken

        if (current.action === 'push') {
            const exp = byId.get(current.id);
            if (!exp) continue; // skip - experience no longer exists locally, leave queued
            try {
                await _runOp('push', current.id, exp);
                _removeQueueEntryIfUnchanged(current.id, current);
            } catch (err) {
                console.warn('Supabase dual-write (upsert) failed, left queued:', err.message);
            }
        } else if (current.action === 'delete') {
            try {
                await _runOp('delete', current.id, null);
                _removeQueueEntryIfUnchanged(current.id, current);
            } catch (err) {
                console.warn('Supabase dual-write (delete) failed, left queued:', err.message);
            }
        }
    }
}

// Called after a successful Firestore save (either save path - legacy
// full-rewrite or incremental). Diffs against our OWN last-pushed
// snapshot (independent of Firestore's), so only genuinely new/changed
// experiences are queued and sent - a legacy save that rewrites every
// doc every time does not turn into a full-payload push every time.
async function syncSignatureExperiences(experiences) {
    if (!isSupabaseDualWriteEnabled() || !_saveDiff()) return;

    const { toUpsert, newSnapshot } = _saveDiff().computeUpsertDiff(experiences, _lastPushedSnapshot);
    for (const exp of toUpsert) {
        _upsertQueueEntry(String(exp.id), 'push');
    }
    // Adopted regardless of delivery outcome - the retry queue above is
    // what guarantees eventual delivery; this snapshot only decides
    // whether the NEXT save considers something worth queuing again.
    _lastPushedSnapshot = newSnapshot;

    await flushSignatureSupabaseQueue(experiences);
}

// Called only from an explicit user delete action, never inferred.
// `experiences` should be the caller's current array (post-removal) -
// used only to resolve any OTHER still-queued push entries, not this
// delete itself.
async function deleteSignatureProfile(signatureExperienceId, experiences) {
    if (!isSupabaseDualWriteEnabled()) return;
    _upsertQueueEntry(String(signatureExperienceId), 'delete');
    await flushSignatureSupabaseQueue(experiences || []);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isSupabaseDualWriteEnabled,
        readRetryQueue: _readQueue,
        flushSignatureSupabaseQueue,
        syncSignatureExperiences,
        deleteSignatureProfile,
        SUPABASE_RETRY_QUEUE_KEY,
        SUPABASE_RETRY_QUEUE_MAX,
        PROD_HOSTNAME,
        _resetForTests: () => { _lastPushedSnapshot = new Map(); _envGuardWarned = false; _demoModeLogged = false; },
    };
}
if (typeof window !== 'undefined') {
    window.SignatureSupabaseSync = {
        isSupabaseDualWriteEnabled,
        syncSignatureExperiences,
        deleteSignatureProfile,
        flushSignatureSupabaseQueue,
    };
}
