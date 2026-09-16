// ===== FIRESTORE DATA MANAGER =====
// Handles user-isolated data storage in Firebase Firestore

// The comparison/chunking logic lives in save-diff.js (pure, no Firestore
// dependency, unit-tested on its own) - loaded as window.SaveDiff in the
// browser (see index.html script order), required directly in Node tests.
const { diffKey, computeUpsertDiff, chunk: chunkArray } =
    (typeof module !== 'undefined' && module.exports) ? require('./save-diff.js') : window.SaveDiff;

// Legacy doc ids (pre-incremental-save) look like "exp_<timestamp>_<index>".
// New-scheme doc ids are String(experience.id) - a plain numeric string
// (Date.now(), optionally with a Math.random() fractional suffix for demo
// data) - which never starts with "exp_". This prefix is the only signal
// needed to tell the two schemes apart, no heuristics.
const LEGACY_DOC_ID_PREFIX = 'exp_';

class FirestoreDataManager {
    constructor() {
        this.db = null;
        this.userId = null;
        this.companyId = null;
        this.isInitialized = false;
        // id (String(experience.id)) -> diffKey(experience), as last known
        // persisted to Firestore. Empty until the first load/save; an
        // empty map is correct (nothing to diff against yet), not an error.
        this._lastSyncedById = new Map();
        this._migrationChecked = false;
    }

    /**
     * Commit a list of {type: 'set'|'delete', ref, data?} operations,
     * split into <=500-op batches (Firestore's hard limit), committed
     * sequentially. Batches are atomic individually, not as a group -
     * a crash between batches can leave a partial state, same exposure
     * the previous single-batch code already had once past 500 ops,
     * just never reachable before.
     */
    async _commitInChunks(ops) {
        for (const opsChunk of chunkArray(ops)) {
            const batch = this.db.batch();
            for (const op of opsChunk) {
                if (op.type === 'set') batch.set(op.ref, op.data);
                else batch.delete(op.ref);
            }
            await batch.commit();
        }
    }

    /**
     * One-time migration off the legacy "exp_<ts>_<index>" doc-id scheme.
     * Runs at most once per manager instance (this._migrationChecked) and
     * is a no-op for companies already on the new scheme (the common
     * case after the first migrated save). Before deleting anything, the
     * full current collection is copied to
     * companies/{companyId}/experiences_backup_{yyyy-mm-dd} - a plain
     * collection copy, not a Firestore export, so it is itself subject to
     * the same 500-op chunking.
     *
     * `experiences` is the caller's current in-memory array - used to
     * write the new-scheme docs so the migration and the save that
     * triggered it happen together, not as two separate round trips.
     */
    async _ensureMigrated(experiences) {
        if (this._migrationChecked) return;
        this._migrationChecked = true;

        const collection = this.getExperiencesCollection();
        const snapshot = await collection.get();
        const legacyDocs = snapshot.docs.filter(doc => doc.id.startsWith(LEGACY_DOC_ID_PREFIX));
        if (legacyDocs.length === 0) return;

        console.log(`🔄 Migrating ${legacyDocs.length} legacy-scheme experience doc(s) for company ${this.companyId}...`);

        // 1. Backup the FULL current collection (legacy docs and any
        // already-new-scheme docs alike) before touching anything.
        const today = new Date().toISOString().slice(0, 10);
        const backupCollection = this.db
            .collection('companies').doc(this.companyId)
            .collection(`experiences_backup_${today}`);
        const backupOps = snapshot.docs.map(doc => ({
            type: 'set',
            ref: backupCollection.doc(doc.id),
            data: doc.data(),
        }));
        await this._commitInChunks(backupOps);

        // 2. Delete every legacy-scheme doc.
        const deleteOps = legacyDocs.map(doc => ({ type: 'delete', ref: doc.ref }));
        await this._commitInChunks(deleteOps);

        // 3. Re-write the current experiences under the new deterministic
        // scheme. Any doc already on the new scheme (not in legacyDocs)
        // is left untouched here - it gets picked up by the normal diff
        // in saveExperiences() right after this returns.
        const rewriteOps = experiences.map(exp => ({
            type: 'set',
            ref: collection.doc(String(exp.id)),
            data: {
                ...exp,
                addedBy: this.userId,
                updatedBy: this.userId, // see saveExperiences() - satisfies rules' update branch too
                companyId: this.companyId,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            },
        }));
        await this._commitInChunks(rewriteOps);

        // These are now known-persisted under the new scheme; the
        // immediately-following saveExperiences() diff should not
        // re-write them again as if they were still dirty.
        for (const exp of experiences) {
            this._lastSyncedById.set(String(exp.id), diffKey(exp));
        }

        console.log(`✅ Migration complete: ${legacyDocs.length} legacy doc(s) backed up to experiences_backup_${today} and removed.`);
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
     */
    async saveExperiences(experiences) {
        try {
            await this._ensureMigrated(experiences);

            const collection = this.getExperiencesCollection();
            const { toUpsert, newSnapshot } = computeUpsertDiff(experiences, this._lastSyncedById);

            const ops = toUpsert.map(exp => ({
                type: 'set',
                ref: collection.doc(String(exp.id)),
                data: {
                    ...exp,
                    addedBy: this.userId,
                    // Also required by firestore.rules' `update` branch
                    // (experiences/{id} allow update: ... &&
                    // request.resource.data.updatedBy == auth.uid). The old
                    // delete-then-recreate-under-a-new-id code never
                    // actually triggered an "update" in the rules' sense
                    // (every write was a fresh doc, always evaluated as
                    // `create`), so this requirement was dormant - a
                    // deterministic doc id now hits it on every edit of an
                    // existing experience.
                    updatedBy: this.userId,
                    companyId: this.companyId,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                },
            }));

            if (ops.length > 0) {
                await this._commitInChunks(ops);
            }

            // Only adopt the new baseline after a successful commit - if
            // the commit above threw, _lastSyncedById is left as it was,
            // so a retry re-attempts the same (correct) diff rather than
            // silently thinking a failed write already landed.
            this._lastSyncedById = newSnapshot;

            console.log(`✅ Synced ${ops.length}/${experiences.length} changed experience(s) to Firestore`);
            return { success: true, count: ops.length };

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
            this._lastSyncedById = new Map(experiences.map(exp => [String(exp.id), diffKey(exp)]));

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
