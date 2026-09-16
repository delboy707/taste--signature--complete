// ===== SAVE DIFF (pure, Firestore-agnostic) =====
// The comparison/chunking logic behind saveExperiences()'s incremental
// upsert, split out so it can be unit-tested without a Firestore
// connection (emulated or real). Nothing in this file talks to Firestore,
// makes network calls, or knows what a "batch" is - it only computes
// which experiences changed and how to slice a list of operations into
// <=500-sized groups. Deletion is deliberately not a concept this module
// has any notion of: it cannot infer one by construction, only the
// explicit delete/clear paths in firestore-data.js can remove a doc.

const MAX_BATCH_OPS = 500; // Firestore's hard per-batch limit

/**
 * Normalize an experience for comparison: strips the bookkeeping fields
 * firestore-data.js itself injects on write (addedBy/updatedBy/companyId/
 * timestamps), so a round-tripped (loaded then re-saved, unedited)
 * experience compares equal to its in-memory form. Never mutates input.
 */
function diffKey(experience) {
  const { addedBy, updatedBy, companyId, updatedAt, createdAt, ...rest } = experience;
  return JSON.stringify(rest);
}

/**
 * Given the current in-memory experiences and a Map of
 * id (String) -> diffKey(experience) as last known persisted, return:
 *   - toUpsert: the experiences whose diffKey changed (or is new)
 *   - newSnapshot: the Map to adopt as the new baseline IF the caller's
 *     write of `toUpsert` succeeds (the caller decides when to commit
 *     this - a failed write should not advance the baseline)
 * Order of `experiences` is preserved in `toUpsert`.
 */
function computeUpsertDiff(experiences, lastSyncedById) {
  const toUpsert = [];
  const newSnapshot = new Map();

  for (const exp of experiences) {
    const id = String(exp.id);
    const key = diffKey(exp);
    newSnapshot.set(id, key);
    if (lastSyncedById.get(id) !== key) {
      toUpsert.push(exp);
    }
  }

  return { toUpsert, newSnapshot };
}

/** Pure chunking: split `items` into arrays of at most `size` (default 500). */
function chunk(items, size = MAX_BATCH_OPS) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { diffKey, computeUpsertDiff, chunk, MAX_BATCH_OPS };
}
if (typeof window !== 'undefined') {
  window.SaveDiff = { diffKey, computeUpsertDiff, chunk, MAX_BATCH_OPS };
}
