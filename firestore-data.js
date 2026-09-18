// ===== FIRESTORE DATA MANAGER =====
// Handles user-isolated data storage in Firebase Firestore

// The comparison/chunking logic lives in save-diff.js (pure, no Firestore
// dependency, unit-tested on its own) - loaded as window.SaveDiff in the
// browser (see index.html script order), required directly in Node tests.
const { diffKey: computeDiffKey, computeUpsertDiff: buildUpsertDiff, chunk: chunkArray } =
    (typeof module !== 'undefined' && module.exports) ? require('./save-diff.js') : window.SaveDiff;

// Legacy doc ids (pre-incremental-save) look like "exp_<timestamp>_<index>".
// New-scheme doc ids are String(experience.id) - a plain numeric string
// (Date.now(), optionally with a Math.random() fractional suffix for demo
// data) - which never starts with "exp_". This prefix is the only signal
// needed to tell the two schemes apart, no heuristics.
const LEGACY_DOC_ID_PREFIX = 'exp_';

// Rollout gate (incremental-save-config.js). `global` covers Node tests;
// `window` covers the browser. Default (missing/empty allowlist) is the
// OLD delete-all/reinsert-all behavior for every company - see
// MIGRATION_RUNBOOK.md for the intended rollout order.
function isIncrementalSaveEnabled(companyId) {
    const scope = typeof window !== 'undefined' ? window : global;
    const allowlist = (scope.INCREMENTAL_SAVE_CONFIG && scope.INCREMENTAL_SAVE_CONFIG.ALLOWLISTED_COMPANY_IDS) || [];
    return Array.isArray(allowlist) && allowlist.includes(companyId);
}

class FirestoreDataManager {
    constructor() {
        this.db = null;
        this.userId = null;
        this.companyId = null;
        this.isInitialized = false;
        // id (String(experience.id)) -> computeDiffKey(experience), as last known
        // persisted to Firestore. Empty until the first load/save; an
        // empty map is correct (nothing to diff against yet), not an error.
        this._lastSyncedById = new Map();
        this._migrationChecked = false;
    }

    /**
     * Commit a list of {type: 'set'|'update'|'delete', ref, data?}
     * operations, split into <=500-op batches (Firestore's hard limit),
     * committed sequentially. Batches are atomic individually, not as a
     * group - a crash between batches can leave a partial state, same
     * exposure the previous single-batch code already had once past 500
     * ops, just never reachable before.
     */
    async _commitInChunks(ops) {
        for (const opsChunk of chunkArray(ops)) {
            const batch = this.db.batch();
            for (const op of opsChunk) {
                if (op.type === 'set') batch.set(op.ref, op.data);
                else if (op.type === 'update') batch.update(op.ref, op.data);
                else batch.delete(op.ref);
            }
            await batch.commit();
        }
    }

    /**
     * Like _commitInChunks, but a stale update() (a doc deleted elsewhere
     * since this instance last knew about it - see saveExperiences())
     * must not take an entire batch of otherwise-unrelated edits down
     * with it. Batches commit as a whole first, same as _commitInChunks;
     * only a chunk that fails with 'not-found' is retried op-by-op, so
     * the exact doc(s) responsible for the failure can be identified and
     * skipped while everything else in that chunk still lands. Any error
     * OTHER than 'not-found' (permission-denied, network, etc.) still
     * propagates and fails the whole save, unchanged from before - only
     * "someone else deleted this specific doc" gets this softer handling.
     *
     * Returns { committedCount, orphanedIds } - orphanedIds are doc ids
     * that no longer exist; the caller drops them from its own baseline
     * and the app removes them from the in-memory array with a notice,
     * rather than ever re-attempting to resurrect them.
     */
    async _commitOpsResilient(ops) {
        const orphanedIds = [];
        let committedCount = 0;

        for (const opsChunk of chunkArray(ops)) {
            try {
                const batch = this.db.batch();
                for (const op of opsChunk) {
                    if (op.type === 'set') batch.set(op.ref, op.data);
                    else if (op.type === 'update') batch.update(op.ref, op.data);
                    else batch.delete(op.ref);
                }
                await batch.commit();
                committedCount += opsChunk.length;
            } catch (error) {
                if (error.code !== 'not-found') throw error;

                for (const op of opsChunk) {
                    try {
                        if (op.type === 'set') await op.ref.set(op.data);
                        else if (op.type === 'update') await op.ref.update(op.data);
                        else await op.ref.delete();
                        committedCount += 1;
                    } catch (singleError) {
                        if (singleError.code !== 'not-found') throw singleError;
                        orphanedIds.push(op.ref.id);
                    }
                }
            }
        }

        return { committedCount, orphanedIds };
    }

    /**
     * One-time migration off the legacy "exp_<ts>_<index>" doc-id scheme.
     * Runs at most once per manager instance (this._migrationChecked) and
     * is a no-op for companies already on the new scheme (the common
     * case after the first migrated save).
     *
     * No client-side backup write here (see firestore.rules - live is on
     * the Spark plan, no managed export, and the migration is designed to
     * ship with ZERO rules changes; a backup subcollection would need a
     * new rule, which is exactly what this design avoids). The backup is
     * a firebase-admin export script run once by Derek before rollout -
     * see MIGRATION_RUNBOOK.md.
     *
     * addedBy preservation: live's `experiences` create rule requires
     * request.resource.data.addedBy == request.auth.uid, so a doc
     * originally created by a different user (e.g. migrated by user B,
     * added by user A) cannot be freshly CREATED at the new doc id with
     * addedBy left as A - that create would be rejected outright. Fix:
     * create the new doc with addedBy = self (satisfies create), then
     * immediately correct it with a separate UPDATE call restoring the
     * true original addedBy - live's update rule has no field
     * restrictions at all, so this is allowed. The create and the
     * correcting update MUST be separate Firestore calls, not ops in the
     * same batch: rules evaluate every operation in a batch against the
     * state before the whole batch started, so a same-batch create+update
     * of the same brand-new doc would both be evaluated as `create`.
     */
    async _ensureMigrated(experiences) {
        if (this._migrationChecked) return;
        this._migrationChecked = true;

        const collection = this.getExperiencesCollection();
        const snapshot = await collection.get();
        const legacyDocs = snapshot.docs.filter(doc => doc.id.startsWith(LEGACY_DOC_ID_PREFIX));
        if (legacyDocs.length === 0) return;

        console.log(`🔄 Migrating ${legacyDocs.length} legacy-scheme experience doc(s) for company ${this.companyId}...`);

        // 1. Create every new-scheme doc, addedBy = self (satisfies the
        // create rule). Uses the CURRENT in-memory content for each id if
        // present (the user may have edited before this save), falling
        // back to the legacy doc's own stored content otherwise.
        const currentById = new Map(experiences.map(exp => [String(exp.id), exp]));

        const createOps = legacyDocs.map(doc => {
            const legacyData = doc.data();
            const content = currentById.get(String(legacyData.id)) || legacyData;
            return {
                type: 'set',
                ref: collection.doc(String(legacyData.id)),
                data: {
                    ...content,
                    addedBy: this.userId,
                    updatedBy: this.userId,
                    companyId: this.companyId,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                },
            };
        });
        await this._commitInChunks(createOps);

        // 2. Correct addedBy back to the true original creator, wherever
        // it differs from whoever happened to run this migration. A
        // plain UPDATE - no field restrictions to satisfy.
        const correctionOps = legacyDocs
            .map(doc => ({ doc, originalAddedBy: doc.data().addedBy }))
            .filter(({ originalAddedBy }) => originalAddedBy && originalAddedBy !== this.userId)
            .map(({ doc, originalAddedBy }) => ({
                type: 'update',
                ref: collection.doc(String(doc.data().id)),
                data: { addedBy: originalAddedBy },
            }));
        if (correctionOps.length > 0) {
            await this._commitInChunks(correctionOps);
        }

        // 3. Only now delete the legacy docs - the new-scheme copies are
        // already fully written and corrected.
        const deleteOps = legacyDocs.map(doc => ({ type: 'delete', ref: doc.ref }));
        await this._commitInChunks(deleteOps);

        // These are now known-persisted under the new scheme; the
        // immediately-following saveExperiences() diff should not
        // re-write them again as if they were still dirty, and should
        // treat them as "already existing" (update, not set) from here on.
        for (const doc of legacyDocs) {
            const legacyData = doc.data();
            const id = String(legacyData.id);
            const content = currentById.get(id) || legacyData;
            this._lastSyncedById.set(id, computeDiffKey(content));
        }

        console.log(`✅ Migration complete: ${legacyDocs.length} legacy doc(s) moved to the new scheme and removed.`);
    }

    /**
     * Initialize Firestore connection with company context
     */
    async initialize(db, userId) {
        this.db = db;
        this.userId = userId;

        try {
            // Get user document to find companyId
            const userDoc = await this.db.collection('users').doc(userId).get();

            if (userDoc.exists) {
                const userData = userDoc.data();
                this.companyId = userData.companyId;
            } else {
                // Provisioning now happens server-side (see
                // ensureFirestoreProvisioned in api/firebase-token.js).
                // A missing user doc here means that step failed or was
                // skipped - surface it loudly instead of silently
                // creating a wrong-shaped company doc.
                console.warn('users/' + userId + ' missing - expected server-side provisioning via /api/firebase-token');
                return { success: false, error: 'User document not found - expected server-side provisioning' };
            }

            if (this.companyId) {
                this.isInitialized = true;
                console.log('✅ Firestore initialized for company:', this.companyId);
                return { success: true, companyId: this.companyId };
            } else {
                console.error('⚠️ User has no company associated');
                return { success: false, error: 'No company associated with user' };
            }
        } catch (error) {
            console.error('Firestore initialization error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get company's experiences collection reference
     */
    getExperiencesCollection() {
        if (!this.isInitialized || !this.companyId) {
            throw new Error('Firestore not initialized. User must be logged in with company.');
        }
        return this.db.collection('companies').doc(this.companyId).collection('experiences');
    }

    /**
     * Get company document reference
     */
    getCompanyRef() {
        if (!this.companyId) {
            throw new Error('No company ID available');
        }
        return this.db.collection('companies').doc(this.companyId);
    }

    /**
     * Upsert experiences to Firestore - incremental, not delete-all/
     * reinsert-all. Doc id is String(experience.id), deterministic across
     * saves, so an unedited experience keeps the same doc and an edited
     * one overwrites it in place. Only experiences whose content changed
     * since the last known-persisted state are written; nothing is ever
     * deleted here - deletion only ever happens via the explicit
     * deleteExperience()/clearAllData() calls the user's own delete
     * actions make. An experience absent from `experiences` because
     * another tab hasn't loaded it yet, or because of a stale local
     * array, is therefore never mistaken for "the user deleted it."
     *
     * CREATE vs UPDATE matters here, not just for rules: an id this
     * instance already believes exists (present in _lastSyncedById
     * before this call) is written with .update(), never .set(). Two
     * reasons:
     *   1. addedBy must only ever be set on genuine creation - writing it
     *      on every save would silently overwrite the true original
     *      author whenever a different company member edits and saves.
     *   2. If another tab deleted this doc since we last knew about it,
     *      .update() on a missing doc throws instead of silently
     *      recreating it - turning a silent resurrection into a loud,
     *      catchable failure, isolated to that one doc (see
     *      _commitOpsResilient) so it can't take unrelated edits in the
     *      same save down with it. The caller (app.js) is expected to
     *      drop `orphanedIds` from its own array and tell the user.
     *
     * Gated by incremental-save-config.js's ALLOWLISTED_COMPANY_IDS: a
     * company not on the allowlist gets _saveExperiencesLegacy() instead
     * (the original, unmodified delete-all/reinsert-all behavior) -
     * unaffected by anything in this file until explicitly opted in.
     */
    async saveExperiences(experiences) {
        if (!isIncrementalSaveEnabled(this.companyId)) {
            return this._saveExperiencesLegacy(experiences);
        }
        try {
            await this._ensureMigrated(experiences);

            const collection = this.getExperiencesCollection();
            const { toUpsert, newSnapshot } = buildUpsertDiff(experiences, this._lastSyncedById);

            const ops = toUpsert.map(exp => {
                const id = String(exp.id);
                const isNew = !this._lastSyncedById.has(id);
                const data = {
                    ...exp,
                    // Descriptive audit field only - NOT required by
                    // firestore.rules (live's update rule has no field
                    // checks at all). Safe to include on every write.
                    updatedBy: this.userId,
                    companyId: this.companyId,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                };
                if (isNew) data.addedBy = this.userId; // only on genuine creation
                return { type: isNew ? 'set' : 'update', ref: collection.doc(id), data };
            });

            let orphanedIds = [];
            if (ops.length > 0) {
                const result = await this._commitOpsResilient(ops);
                orphanedIds = result.orphanedIds;
            }

            // Orphaned ids don't exist in Firestore - drop them from the
            // baseline entirely so a future save neither treats them as
            // "already known" (update) nor as unchanged.
            for (const id of orphanedIds) newSnapshot.delete(id);

            // Only adopt the new baseline after the commit - if it threw
            // (a non-not-found error), _lastSyncedById is left as it was,
            // so a retry re-attempts the same (correct) diff rather than
            // silently thinking a failed write already landed.
            this._lastSyncedById = newSnapshot;

            const writtenCount = ops.length - orphanedIds.length;
            console.log(
                `✅ Synced ${writtenCount}/${experiences.length} changed experience(s) to Firestore` +
                (orphanedIds.length > 0 ? `, ${orphanedIds.length} skipped (deleted elsewhere)` : '')
            );
            return { success: true, count: writtenCount, orphanedIds };

        } catch (error) {
            console.error('Firestore save error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Original save behavior, unmodified: delete every existing doc,
     * recreate all of them under fresh random ids. Used for any company
     * NOT on the incremental-save allowlist - see saveExperiences().
     */
    async _saveExperiencesLegacy(experiences) {
        try {
            const batch = this.db.batch();
            const collection = this.getExperiencesCollection();

            const existing = await collection.get();
            existing.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            experiences.forEach((exp, index) => {
                const docRef = collection.doc(`exp_${Date.now()}_${index}`);
                batch.set(docRef, {
                    ...exp,
                    addedBy: this.userId,
                    companyId: this.companyId,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            await batch.commit();
            console.log(`✅ Saved ${experiences.length} experiences to Firestore (legacy path - company not in incremental-save allowlist)`);
            return { success: true, count: experiences.length };

        } catch (error) {
            console.error('Firestore save error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Load all experiences from Firestore
     */
    async loadExperiences() {
        try {
            const collection = this.getExperiencesCollection();
            const snapshot = await collection.orderBy('updatedAt', 'desc').limit(500).get();

            const experiences = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                // Remove Firestore timestamps before returning
                delete data.updatedAt;
                delete data.companyId; // Internal tracking only
                experiences.push(data);
            });

            // Seed the diff baseline from what's actually in Firestore right
            // now, so the very next saveExperiences() call - even with zero
            // edits - writes nothing instead of treating every loaded
            // experience as new.
            this._lastSyncedById = new Map(experiences.map(exp => [String(exp.id), computeDiffKey(exp)]));

            console.log(`✅ Loaded ${experiences.length} experiences from Firestore`);
            return { success: true, experiences: experiences };

        } catch (error) {
            console.error('Firestore load error:', error);
            return { success: false, error: error.message, experiences: [] };
        }
    }

    /**
     * Add single experience to Firestore
     */
    async addExperience(experience) {
        try {
            const collection = this.getExperiencesCollection();
            const docRef = await collection.add({
                ...experience,
                addedBy: this.userId,
                companyId: this.companyId,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log('✅ Added experience to Firestore:', docRef.id);
            return { success: true, id: docRef.id };

        } catch (error) {
            console.error('Firestore add error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update existing experience
     */
    async updateExperience(experienceId, experienceData) {
        try {
            const collection = this.getExperiencesCollection();
            const docRef = collection.doc(experienceId);

            await docRef.update({
                ...experienceData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log('✅ Updated experience:', experienceId);
            return { success: true };

        } catch (error) {
            console.error('Firestore update error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete one experience - the ONLY path that removes a document.
     * saveExperiences() never infers a delete from an id's absence; this
     * is the explicit call the user's own delete action must make.
     */
    async deleteExperience(experienceId) {
        try {
            const id = String(experienceId);
            const collection = this.getExperiencesCollection();
            await collection.doc(id).delete();
            this._lastSyncedById.delete(id);

            console.log('✅ Deleted experience:', id);
            return { success: true };

        } catch (error) {
            console.error('Firestore delete error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Sync local storage to Firestore (migration helper)
     */
    async syncLocalToFirestore(localExperiences) {
        try {
            console.log('🔄 Migrating local data to Firestore...');

            // Check if user already has data in Firestore
            const existing = await this.loadExperiences();

            if (existing.experiences.length > 0) {
                console.log('⚠️ User already has Firestore data. Skipping migration.');
                return {
                    success: true,
                    message: 'Data already exists in cloud',
                    migrated: false
                };
            }

            // Save local experiences to Firestore
            const result = await this.saveExperiences(localExperiences);

            if (result.success) {
                console.log('✅ Migration complete. Local data synced to Firestore.');
                return {
                    success: true,
                    message: `Migrated ${result.count} experiences to cloud`,
                    migrated: true
                };
            }

            return result;

        } catch (error) {
            console.error('Migration error:', error);
            return {
                success: false,
                error: error.message,
                migrated: false
            };
        }
    }

    /**
     * Clear all company data (explicit "Clear Data" user action - a bulk
     * delete, but still an explicit one, never inferred from a save).
     */
    async clearAllData() {
        try {
            const collection = this.getExperiencesCollection();
            const snapshot = await collection.get();

            const ops = snapshot.docs.map(doc => ({ type: 'delete', ref: doc.ref }));
            await this._commitInChunks(ops);
            this._lastSyncedById = new Map();

            console.log('✅ Cleared all company data from Firestore');
            return { success: true };

        } catch (error) {
            console.error('Firestore clear error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get company statistics
     */
    async getCompanyStats() {
        try {
            const collection = this.getExperiencesCollection();
            const snapshot = await collection.get();

            return {
                success: true,
                totalExperiences: snapshot.size,
                lastUpdated: snapshot.docs[0]?.data()?.updatedAt?.toDate() || null
            };

        } catch (error) {
            console.error('Stats error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update company settings
     */
    async updateCompanySettings(settings) {
        try {
            const companyRef = this.getCompanyRef();
            await companyRef.update({
                settings: settings,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log('✅ Updated company settings');
            return { success: true };

        } catch (error) {
            console.error('Update settings error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get company settings
     */
    async getCompanySettings() {
        try {
            const companyRef = this.getCompanyRef();
            const companyDoc = await companyRef.get();

            if (!companyDoc.exists) {
                throw new Error('Company not found');
            }

            const data = companyDoc.data();
            return {
                success: true,
                settings: data.settings || {},
                company: {
                    name: data.companyName,
                    industry: data.industry,
                    size: data.companySize
                }
            };

        } catch (error) {
            console.error('Get settings error:', error);
            return { success: false, error: error.message };
        }
    }
}

// Export
if (typeof window !== 'undefined') {
    window.FirestoreDataManager = FirestoreDataManager;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirestoreDataManager;
}
