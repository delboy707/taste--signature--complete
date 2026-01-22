// ===== PROGRESSIVE ONBOARDING MODULE =====
// First-time user onboarding flow

const OnboardingManager = {
    STORAGE_KEY: 'taste_signature_onboarding_completed',

    /**
     * Check if user has completed onboarding
     */
    hasCompletedOnboarding() {
        const userId = this.getCurrentUserId();
        if (!userId) return false;

        const completedUsers = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
        return completedUsers[userId] === true;
    },

    /**
     * Mark onboarding as completed for current user
     */
    markOnboardingComplete() {
        const userId = this.getCurrentUserId();
        if (!userId) return;

        const completedUsers = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
        completedUsers[userId] = true;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(completedUsers));
    },

    /**
     * Get current user ID
     */
    getCurrentUserId() {
        // Check for Firebase user
        if (window.authManager && window.authManager.currentUser) {
            return window.authManager.currentUser.uid;
        }
        // Check for demo mode
        if (window.isDemoMode) {
            return 'demo_user';
        }
        return null;
    },

    /**
     * Initialize onboarding - call this after app loads
     */
    init() {
        // Add onboarding modal to DOM if not present
        if (!document.getElementById('onboarding-modal')) {
            this.createOnboardingModal();
        }
    },

    /**
     * Show onboarding if user hasn't completed it
     */
    showIfNeeded() {
        if (!this.hasCompletedOnboarding()) {
            this.showOnboardingModal();
        }
    },

    /**
     * Create the onboarding modal HTML
     */
    createOnboardingModal() {
        const modal = document.createElement('div');
        modal.id = 'onboarding-modal';
        modal.className = 'onboarding-overlay';
        modal.innerHTML = `
            <div class="onboarding-modal">
                <div class="onboarding-header">
                    <div class="onboarding-logo">🎯</div>
                    <h1>Welcome to Taste Signature!</h1>
                    <p>Professional sensory analysis made simple</p>
                </div>

                <div class="onboarding-content" id="onboarding-step-1">
                    <h2>What brings you here today?</h2>
                    <p class="onboarding-subtitle">We'll customize your experience based on your goal</p>

                    <div class="onboarding-goals">
                        <button class="goal-card" data-goal="evaluate">
                            <div class="goal-icon">🍫</div>
                            <div class="goal-info">
                                <h3>Evaluate a Product</h3>
                                <p>Log a new sensory evaluation with our Quick Entry mode</p>
                            </div>
                            <div class="goal-arrow">→</div>
                        </button>

                        <button class="goal-card" data-goal="import">
                            <div class="goal-icon">📊</div>
                            <div class="goal-info">
                                <h3>Import Existing Data</h3>
                                <p>Sync from spreadsheets, scan barcodes, or connect integrations</p>
                            </div>
                            <div class="goal-arrow">→</div>
                        </button>

                        <button class="goal-card" data-goal="explore">
                            <div class="goal-icon">🔍</div>
                            <div class="goal-info">
                                <h3>Explore the Platform</h3>
                                <p>Take a guided tour of all features and capabilities</p>
                            </div>
                            <div class="goal-arrow">→</div>
                        </button>
                    </div>
                </div>

                <div class="onboarding-content hidden" id="onboarding-step-2-evaluate">
                    <h2>What type of product?</h2>
                    <p class="onboarding-subtitle">Select a category to pre-fill sensory defaults</p>

                    <div class="onboarding-categories">
                        <button class="category-chip" data-category="premium-chocolate">🍫 Chocolate</button>
                        <button class="category-chip" data-category="coffee">☕ Coffee</button>
                        <button class="category-chip" data-category="wine">🍷 Wine</button>
                        <button class="category-chip" data-category="beer">🍺 Beer</button>
                        <button class="category-chip" data-category="cheese">🧀 Cheese</button>
                        <button class="category-chip" data-category="snack">🥨 Snack</button>
                        <button class="category-chip" data-category="beverage">🥤 Beverage</button>
                        <button class="category-chip" data-category="sauce">🥫 Sauce</button>
                        <button class="category-chip" data-category="other">📦 Other</button>
                    </div>

                    <button class="onboarding-back" onclick="OnboardingManager.goBack()">← Back</button>
                </div>

                <div class="onboarding-content hidden" id="onboarding-step-2-import">
                    <h2>How would you like to import?</h2>
                    <p class="onboarding-subtitle">Choose your preferred data source</p>

                    <div class="onboarding-import-options">
                        <button class="import-option" data-import="barcode">
                            <div class="import-icon">📷</div>
                            <div class="import-info">
                                <h3>Barcode Scanner</h3>
                                <p>Scan product barcodes to auto-fill details</p>
                            </div>
                        </button>

                        <button class="import-option" data-import="spreadsheet">
                            <div class="import-icon">📑</div>
                            <div class="import-info">
                                <h3>Spreadsheet Sync</h3>
                                <p>Import from Excel or Google Sheets</p>
                            </div>
                        </button>

                        <button class="import-option" data-import="webhook">
                            <div class="import-icon">🔗</div>
                            <div class="import-info">
                                <h3>Webhooks & API</h3>
                                <p>Connect to Zapier, Slack, or custom integrations</p>
                            </div>
                        </button>
                    </div>

                    <button class="onboarding-back" onclick="OnboardingManager.goBack()">← Back</button>
                </div>

                <div class="onboarding-content hidden" id="onboarding-step-2-explore">
                    <h2>Platform Tour</h2>
                    <p class="onboarding-subtitle">Here's what you can do with Taste Signature</p>

                    <div class="onboarding-tour">
                        <div class="tour-item">
                            <div class="tour-icon">⚡</div>
                            <div class="tour-info">
                                <h4>Quick Entry Mode</h4>
                                <p>Log evaluations in 2-3 minutes with smart defaults</p>
                            </div>
                        </div>

                        <div class="tour-item">
                            <div class="tour-icon">📊</div>
                            <div class="tour-info">
                                <h4>Visual Analytics</h4>
                                <p>Shape of Taste diagrams, emotional maps, and trends</p>
                            </div>
                        </div>

                        <div class="tour-item">
                            <div class="tour-icon">🤖</div>
                            <div class="tour-info">
                                <h4>AI Insights</h4>
                                <p>Claude-powered recommendations and pattern detection</p>
                            </div>
                        </div>

                        <div class="tour-item">
                            <div class="tour-icon">👥</div>
                            <div class="tour-info">
                                <h4>Team Collaboration</h4>
                                <p>Share evaluations, comments, and approval workflows</p>
                            </div>
                        </div>
                    </div>

                    <div class="onboarding-actions">
                        <button class="onboarding-back" onclick="OnboardingManager.goBack()">← Back</button>
                        <button class="btn-primary onboarding-start" onclick="OnboardingManager.completeAndGoToDashboard()">
                            Go to Dashboard →
                        </button>
                    </div>
                </div>

                <div class="onboarding-footer">
                    <button class="onboarding-skip" onclick="OnboardingManager.skipOnboarding()">
                        Skip for now
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.attachEventListeners();
    },

    /**
     * Attach event listeners to onboarding elements
     */
    attachEventListeners() {
        // Goal cards
        document.querySelectorAll('.goal-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const goal = card.dataset.goal;
                this.handleGoalSelection(goal);
            });
        });

        // Category chips
        document.querySelectorAll('.category-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                const category = chip.dataset.category;
                this.handleCategorySelection(category);
            });
        });

        // Import options
        document.querySelectorAll('.import-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const importType = option.dataset.import;
                this.handleImportSelection(importType);
            });
        });
    },

    /**
     * Show the onboarding modal
     */
    showOnboardingModal() {
        const modal = document.getElementById('onboarding-modal');
        if (modal) {
            modal.classList.add('active');
            // Reset to step 1
            this.showStep('onboarding-step-1');
        }
    },

    /**
     * Hide the onboarding modal
     */
    hideOnboardingModal() {
        const modal = document.getElementById('onboarding-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    },

    /**
     * Show a specific step
     */
    showStep(stepId) {
        document.querySelectorAll('.onboarding-content').forEach(content => {
            content.classList.add('hidden');
        });
        const step = document.getElementById(stepId);
        if (step) {
            step.classList.remove('hidden');
        }
    },

    /**
     * Go back to step 1
     */
    goBack() {
        this.showStep('onboarding-step-1');
    },

    /**
     * Handle goal selection
     */
    handleGoalSelection(goal) {
        switch (goal) {
            case 'evaluate':
                this.showStep('onboarding-step-2-evaluate');
                break;
            case 'import':
                this.showStep('onboarding-step-2-import');
                break;
            case 'explore':
                this.showStep('onboarding-step-2-explore');
                break;
        }
    },

    /**
     * Handle category selection - go to Quick Entry with category
     */
    handleCategorySelection(category) {
        this.markOnboardingComplete();
        this.hideOnboardingModal();

        // Navigate to Quick Entry view
        const quickEntryNav = document.querySelector('[data-view="quick-entry"]');
        if (quickEntryNav) {
            quickEntryNav.click();

            // After a short delay, select the category
            setTimeout(() => {
                if (typeof selectCategory === 'function') {
                    selectCategory(category);
                }
            }, 100);
        }
    },

    /**
     * Handle import selection - go to integrations
     */
    handleImportSelection(importType) {
        this.markOnboardingComplete();
        this.hideOnboardingModal();

        // Navigate to Integrations view
        const integrationsNav = document.querySelector('[data-view="integrations"]');
        if (integrationsNav) {
            integrationsNav.click();

            // After a short delay, show the appropriate tab
            setTimeout(() => {
                switch (importType) {
                    case 'barcode':
                        if (typeof showIntegrationTab === 'function') {
                            showIntegrationTab('barcode');
                        }
                        break;
                    case 'spreadsheet':
                        if (typeof showIntegrationTab === 'function') {
                            showIntegrationTab('spreadsheet');
                        }
                        break;
                    case 'webhook':
                        if (typeof showIntegrationTab === 'function') {
                            showIntegrationTab('webhooks');
                        }
                        break;
                }
            }, 100);
        }
    },

    /**
     * Complete onboarding and go to dashboard
     */
    completeAndGoToDashboard() {
        this.markOnboardingComplete();
        this.hideOnboardingModal();

        // Navigate to Dashboard
        const dashboardNav = document.querySelector('[data-view="overview"]');
        if (dashboardNav) {
            dashboardNav.click();
        }
    },

    /**
     * Skip onboarding
     */
    skipOnboarding() {
        this.markOnboardingComplete();
        this.hideOnboardingModal();
    },

    /**
     * Reset onboarding for current user (for testing)
     */
    resetOnboarding() {
        const userId = this.getCurrentUserId();
        if (!userId) return;

        const completedUsers = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
        delete completedUsers[userId];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(completedUsers));
        console.log('Onboarding reset for user:', userId);
    }
};

// Initialize onboarding when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    OnboardingManager.init();
});

// Hook into auth state changes to show onboarding
if (typeof window !== 'undefined') {
    // Store original showApp function if AuthManager exists
    const originalShowApp = window.AuthManager && window.AuthManager.prototype ?
        window.AuthManager.prototype.showApp : null;

    // Override showApp to include onboarding check
    if (originalShowApp) {
        window.AuthManager.prototype.showApp = function() {
            originalShowApp.call(this);
            // Show onboarding after a brief delay to let app render
            setTimeout(() => {
                OnboardingManager.showIfNeeded();
            }, 500);
        };
    }
}

// Export for use in other modules
window.OnboardingManager = OnboardingManager;
