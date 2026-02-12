// ===== FIRESTORE DATA MANAGER =====
// Handles user-isolated data storage in Firebase Firestore

class FirestoreDataManager {
    constructor() {
        this.db = null;
        this.userId = null;
        this.companyId = null;
        this.isInitialized = false;
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
                // Auto-create user document for new users
                console.log('📝 Creating user document for new user...');
                const newCompanyRef = this.db.collection('companies').doc();
                const newCompanyId = newCompanyRef.id;
                await this.db.collection('users').doc(userId).set({
                    companyId: newCompanyId,
                    createdAt: new Date().toISOString(),
                    tier: 'free'
                });
                this.companyId = newCompanyId;

                // Also create the company document
                await newCompanyRef.set({
                    name: 'My Company',
                    ownerId: userId,
                    createdAt: new Date().toISOString()
                });
                console.log('✅ User and company documents created');
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
     * Save all experiences to Firestore
     */
    async saveExperiences(experiences) {
        try {
            const batch = this.db.batch();
            const collection = this.getExperiencesCollection();

            // Delete existing documents
            const existing = await collection.get();
            existing.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            // Add new experiences
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
            console.log(`✅ Saved ${experiences.length} experiences to Firestore`);
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
     * Delete experience
     */
    async deleteExperience(experienceId) {
        try {
            const collection = this.getExperiencesCollection();
            await collection.doc(experienceId).delete();

            console.log('✅ Deleted experience:', experienceId);
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
     * Clear all company data (for account deletion)
     */
    async clearAllData() {
        try {
            const collection = this.getExperiencesCollection();
            const snapshot = await collection.get();

            const batch = this.db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
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
