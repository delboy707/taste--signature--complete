// ===== INTERACTIVE TUTORIAL & ONBOARDING SYSTEM =====
// Guides first-time users through the app features

class TutorialManager {
    constructor() {
        this.currentStep = 0;
        this.isActive = false;
        this.hasCompletedTutorial = false;
        this.tutorialSteps = [
            {
                target: '.sidebar-header',
                title: '👋 Welcome to Taste Signature!',
                content: 'This professional sensory analysis platform helps you map taste experiences to emotional outcomes. Let\'s take a quick tour!',
                position: 'right',
                highlight: true
            },
            {
                target: '[data-view="quick-entry"]',
                title: '⚡ Quick Entry - Start Here!',
                content: 'The fastest way to log products! Quick Entry takes just 2-3 minutes. Select a category, and smart defaults are pre-filled for you.',
                position: 'right',
                highlight: true,
                action: () => document.querySelector('[data-view="quick-entry"]')?.click()
            },
            {
                target: '.photo-ai-btn',
                title: '📷 Photo AI - Auto-Detect Products',
                content: 'Snap a photo of any product! AI will automatically detect the product name, category, and suggest sensory attributes. No typing needed!',
                position: 'bottom',
                highlight: true
            },
            {
                target: '[data-view="integrations"]',
                title: '📊 Import Data Automatically',
                content: 'Don\'t want to enter data manually? Use Integrations to: scan barcodes, import from spreadsheets, or connect webhooks from other tools.',
                position: 'right',
                highlight: true,
                action: () => document.querySelector('[data-view="integrations"]')?.click()
            },
            {
                target: '[data-view="log-experience"]',
                title: '📋 Full Evaluation (Detailed)',
                content: 'For comprehensive analysis, use Full Evaluation. Capture data across 7 stages with detailed sensory and emotional mapping.',
                position: 'right',
                highlight: true
            },
            {
                target: '.voice-input-btn',
                title: '🎤 Voice Input',
                content: 'See a microphone button? Click it to speak your notes instead of typing. Works on any text field!',
                position: 'left',
                highlight: true
            },
            {
                target: '[data-view="shape-of-taste"]',
                title: '📈 Shape of Taste',
                content: 'Visualize how sensory attributes evolve throughout the tasting experience. See intensity changes from first bite to aftertaste.',
                position: 'right',
                highlight: true
            },
            {
                target: '[data-view="emotional-map"]',
                title: '💫 Emotional Mapping',
                content: 'Discover which sensory attributes drive specific emotions. This reveals the formula behind emotional resonance.',
                position: 'right',
                highlight: true
            },
            {
                target: '[data-view="portfolio"]',
                title: '🎨 Portfolio Map',
                content: 'See your entire product portfolio mapped by emotional territories. Identify gaps, overlaps, and opportunities.',
                position: 'right',
                highlight: true
            },
            {
                target: '[data-view="ai-insights"]',
                title: '🤖 AI-Powered Analysis',
                content: 'Get strategic insights from Claude AI. Ask questions about your data, compare products, and discover improvement opportunities.',
                position: 'right',
                highlight: true
            },
            {
                target: '#export-data',
                title: '📥 Export & Import',
                content: 'Export your data to JSON for backup or analysis. Import existing datasets to get started quickly.',
                position: 'bottom',
                highlight: true
            },
            {
                target: '.user-profile',
                title: '🎉 You\'re All Set!',
                content: 'Your data is automatically saved to the cloud. Access it from any device by logging in. Ready to start analyzing taste experiences?',
                position: 'left',
                highlight: true
            }
        ];
    }

    /**
     * Check if user has completed tutorial
     */
    checkTutorialStatus() {
        const userId = authManager?.getUserId();
        if (!userId) return false;

        const storageKey = `tutorial_completed_${userId}`;
        this.hasCompletedTutorial = localStorage.getItem(storageKey) === 'true';
        return this.hasCompletedTutorial;
    }

    /**
     * Start tutorial for new users
     */
    async startTutorial() {
        this.isActive = true;
        this.currentStep = 0;
        this.createTutorialOverlay();
        this.showStep(0);
    }

    /**
     * Create tutorial overlay and tooltip elements
     */
    createTutorialOverlay() {
        // Remove existing tutorial elements
        this.cleanup();

        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'tutorial-overlay';
        overlay.className = 'tutorial-overlay';
        document.body.appendChild(overlay);

        // Create tooltip container
        const tooltip = document.createElement('div');
        tooltip.id = 'tutorial-tooltip';
        tooltip.className = 'tutorial-tooltip';
        tooltip.innerHTML = `
            <div class="tutorial-tooltip-header">
                <h3 id="tutorial-title"></h3>
                <button id="tutorial-close" class="tutorial-close" aria-label="Close tutorial">×</button>
            </div>
            <div id="tutorial-content" class="tutorial-tooltip-content"></div>
            <div class="tutorial-tooltip-footer">
                <div class="tutorial-progress">
                    <span id="tutorial-progress-text">Step 1 of ${this.tutorialSteps.length}</span>
                    <div class="tutorial-progress-bar">
                        <div id="tutorial-progress-fill" class="tutorial-progress-fill"></div>
                    </div>
                </div>
                <div class="tutorial-buttons">
                    <button id="tutorial-skip" class="btn-secondary btn-tutorial">Skip Tutorial</button>
                    <button id="tutorial-prev" class="btn-secondary btn-tutorial" style="display: none;">Previous</button>
                    <button id="tutorial-next" class="btn-primary btn-tutorial">Next</button>
                </div>
            </div>
        `;
        document.body.appendChild(tooltip);

        // Event listeners
        document.getElementById('tutorial-close').onclick = () => this.endTutorial();
        document.getElementById('tutorial-skip').onclick = () => this.skipTutorial();
        document.getElementById('tutorial-next').onclick = () => this.nextStep();
        document.getElementById('tutorial-prev').onclick = () => this.prevStep();
    }

    /**
     * Show specific tutorial step
     */
    showStep(stepIndex) {
        if (stepIndex < 0 || stepIndex >= this.tutorialSteps.length) {
            this.endTutorial();
            return;
        }

        this.currentStep = stepIndex;
        const step = this.tutorialSteps[stepIndex];

        // Update content
        document.getElementById('tutorial-title').textContent = step.title;
        document.getElementById('tutorial-content').textContent = step.content;
        document.getElementById('tutorial-progress-text').textContent =
            `Step ${stepIndex + 1} of ${this.tutorialSteps.length}`;

        // Update progress bar
        const progress = ((stepIndex + 1) / this.tutorialSteps.length) * 100;
        document.getElementById('tutorial-progress-fill').style.width = `${progress}%`;

        // Update buttons
        const prevBtn = document.getElementById('tutorial-prev');
        const nextBtn = document.getElementById('tutorial-next');

        prevBtn.style.display = stepIndex > 0 ? 'inline-block' : 'none';
        nextBtn.textContent = stepIndex === this.tutorialSteps.length - 1 ? 'Finish' : 'Next';

        // Position tooltip
        this.positionTooltip(step);

        // Highlight target element
        if (step.highlight) {
            this.highlightElement(step.target);
        }

        // Execute step action
        if (step.action) {
            setTimeout(() => step.action(), 300);
        }
    }

    /**
     * Position tooltip relative to target
     */
    positionTooltip(step) {
        const tooltip = document.getElementById('tutorial-tooltip');
        const target = document.querySelector(step.target);

        if (!target) {
            console.warn('Tutorial target not found:', step.target);
            return;
        }

        const targetRect = target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        let top, left;

        switch (step.position) {
            case 'right':
                top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
                left = targetRect.right + 20;
                break;
            case 'left':
                top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
                left = targetRect.left - tooltipRect.width - 20;
                break;
            case 'top':
                top = targetRect.top - tooltipRect.height - 20;
                left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
                break;
            case 'bottom':
                top = targetRect.bottom + 20;
                left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
                break;
            default:
                top = window.innerHeight / 2 - tooltipRect.height / 2;
                left = window.innerWidth / 2 - tooltipRect.width / 2;
        }

        // Keep tooltip within viewport
        top = Math.max(20, Math.min(top, window.innerHeight - tooltipRect.height - 20));
        left = Math.max(20, Math.min(left, window.innerWidth - tooltipRect.width - 20));

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
        tooltip.style.opacity = '1';
    }

    /**
     * Highlight target element
     */
    highlightElement(selector) {
        // Remove previous highlight
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
        });

        // Add new highlight
        const target = document.querySelector(selector);
        if (target) {
            target.classList.add('tutorial-highlight');
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    /**
     * Navigate to next step
     */
    nextStep() {
        if (this.currentStep < this.tutorialSteps.length - 1) {
            this.showStep(this.currentStep + 1);
        } else {
            this.endTutorial();
        }
    }

    /**
     * Navigate to previous step
     */
    prevStep() {
        if (this.currentStep > 0) {
            this.showStep(this.currentStep - 1);
        }
    }

    /**
     * Skip tutorial
     */
    skipTutorial() {
        if (confirm('Are you sure you want to skip the tutorial? You can restart it anytime from the Help menu.')) {
            this.endTutorial(true);
        }
    }

    /**
     * End tutorial
     */
    endTutorial(skipped = false) {
        this.isActive = false;
        this.cleanup();

        // Mark as completed
        const userId = authManager?.getUserId();
        if (userId) {
            localStorage.setItem(`tutorial_completed_${userId}`, 'true');
            this.hasCompletedTutorial = true;
        }

        if (!skipped) {
            // Show completion message
            this.showCompletionMessage();
        }
    }

    /**
     * Show tutorial completion message
     */
    showCompletionMessage() {
        const message = document.createElement('div');
        message.className = 'tutorial-completion-message';
        message.innerHTML = `
            <div class="tutorial-completion-content">
                <h2>🎉 Tutorial Complete!</h2>
                <p>You're ready to start analyzing taste experiences.</p>
                <p>Need help later? Click the <strong>❓ Help</strong> button in any section.</p>
                <button id="tutorial-completion-ok" class="btn-primary">Get Started</button>
            </div>
        `;
        document.body.appendChild(message);

        document.getElementById('tutorial-completion-ok').onclick = () => {
            message.remove();
        };

        setTimeout(() => {
            if (message.parentElement) {
                message.remove();
            }
        }, 5000);
    }

    /**
     * Cleanup tutorial elements
     */
    cleanup() {
        const overlay = document.getElementById('tutorial-overlay');
        const tooltip = document.getElementById('tutorial-tooltip');

        if (overlay) overlay.remove();
        if (tooltip) tooltip.remove();

        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
        });
    }

    /**
     * Restart tutorial
     */
    restartTutorial() {
        const userId = authManager?.getUserId();
        if (userId) {
            localStorage.removeItem(`tutorial_completed_${userId}`);
        }
        this.hasCompletedTutorial = false;
        this.startTutorial();
    }

    /**
     * Show help for specific section
     */
    showSectionHelp(sectionName) {
        const helpContent = {
            'log-experience': {
                title: '➕ How to Log an Experience',
                content: `
                    <h4>Recording a Taste Experience:</h4>
                    <ol>
                        <li><strong>Product Info:</strong> Enter product name, brand, category, and occasion</li>
                        <li><strong>Need State:</strong> Select the consumer need (Indulgence, Energy, Comfort, etc.)</li>
                        <li><strong>7 Stages:</strong> Rate sensory attributes and emotions at each stage:
                            <ul>
                                <li>Appearance - Visual appeal and anticipation</li>
                                <li>Aroma - Smell intensity and character</li>
                                <li>Front Mouth - Initial taste (sweet, sour, bitter, salty)</li>
                                <li>Mid/Rear Mouth - Texture and mouthfeel</li>
                                <li>Aftertaste - Lingering flavors and satisfaction</li>
                                <li>Emotional Triggers - Moreishness, refreshment, melt, crunch</li>
                                <li>Overall - Final ratings and notes</li>
                            </ul>
                        </li>
                        <li><strong>Emotions:</strong> Select all emotions triggered (multiple selections allowed)</li>
                        <li><strong>Save:</strong> Click "Save Experience" to store in the cloud</li>
                    </ol>
                    <p><strong>Tip:</strong> Use the "Re-test Existing Product" dropdown to compare new formulations against previous versions.</p>
                `
            },
            'shape-of-taste': {
                title: '📈 Understanding Shape of Taste',
                content: `
                    <h4>Visualizing Sensory Progression:</h4>
                    <p>The Shape of Taste chart shows how sensory attributes change throughout the tasting experience.</p>
                    <ul>
                        <li><strong>X-axis:</strong> Stages (Appearance → Aftertaste)</li>
                        <li><strong>Y-axis:</strong> Intensity (1-10 scale)</li>
                        <li><strong>Lines:</strong> Each line represents a sensory attribute</li>
                    </ul>
                    <h4>What to Look For:</h4>
                    <ul>
                        <li><strong>Peaks:</strong> Where flavors are strongest</li>
                        <li><strong>Valleys:</strong> Weak points that may need improvement</li>
                        <li><strong>Flat lines:</strong> Consistent attributes (good for stability)</li>
                        <li><strong>Sharp drops:</strong> Flavors that fade too quickly</li>
                    </ul>
                    <p><strong>Use Case:</strong> Compare your product's shape against competitors to identify differentiation opportunities.</p>
                `
            },
            'emotional-map': {
                title: '💫 Emotional Mapping',
                content: `
                    <h4>Discovering Emotional Drivers:</h4>
                    <p>This analysis reveals which sensory attributes trigger specific emotions.</p>
                    <h4>How to Interpret:</h4>
                    <ul>
                        <li><strong>Correlation Strength:</strong> Higher bars = stronger emotional driver</li>
                        <li><strong>Positive correlation:</strong> Increasing attribute increases emotion</li>
                        <li><strong>Top drivers:</strong> Focus formulation efforts here</li>
                    </ul>
                    <h4>Strategic Applications:</h4>
                    <ul>
                        <li><strong>Formulation:</strong> Enhance attributes that drive desired emotions</li>
                        <li><strong>Marketing:</strong> Highlight sensory-emotional connections in messaging</li>
                        <li><strong>Innovation:</strong> Identify untapped emotional territories</li>
                    </ul>
                `
            },
            'portfolio': {
                title: '🎨 Portfolio Mapping',
                content: `
                    <h4>Strategic Portfolio Analysis:</h4>
                    <p>View all products mapped by emotional territories to identify gaps and opportunities.</p>
                    <h4>Key Insights:</h4>
                    <ul>
                        <li><strong>Clusters:</strong> Multiple products in same space = cannibalization risk</li>
                        <li><strong>White space:</strong> Empty areas = innovation opportunities</li>
                        <li><strong>Outliers:</strong> Unique emotional positions = differentiation</li>
                    </ul>
                    <h4>Strategic Actions:</h4>
                    <ul>
                        <li>Discontinue products in oversaturated spaces</li>
                        <li>Develop new products for white space</li>
                        <li>Reposition products to reduce overlap</li>
                    </ul>
                `
            },
            'ai-insights': {
                title: '🤖 AI-Powered Insights',
                content: `
                    <h4>Using Claude AI:</h4>
                    <p>Ask natural language questions about your taste data and get strategic recommendations.</p>
                    <h4>Example Questions:</h4>
                    <ul>
                        <li>"What makes my top products successful?"</li>
                        <li>"Which product should I reformulate?"</li>
                        <li>"What emotional territories am I missing?"</li>
                        <li>"How does [Product A] compare to [Product B]?"</li>
                        <li>"What consumer occasions are underserved?"</li>
                    </ul>
                    <h4>Quick Actions:</h4>
                    <ul>
                        <li><strong>Analyze Product:</strong> Deep dive into single product</li>
                        <li><strong>Portfolio Improvements:</strong> Strategic recommendations</li>
                        <li><strong>Compare Products:</strong> Side-by-side analysis</li>
                        <li><strong>Find Gaps:</strong> Identify opportunities</li>
                    </ul>
                `
            }
        };

        const help = helpContent[sectionName] || {
            title: 'Help',
            content: '<p>Help content for this section will be available soon.</p>'
        };

        this.showHelpModal(help.title, help.content);
    }

    /**
     * Show help modal
     */
    showHelpModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'help-modal-overlay';
        modal.innerHTML = `
            <div class="help-modal">
                <div class="help-modal-header">
                    <h2>${title}</h2>
                    <button class="help-modal-close" aria-label="Close help">×</button>
                </div>
                <div class="help-modal-content">
                    ${content}
                </div>
                <div class="help-modal-footer">
                    <button class="btn-secondary help-modal-restart">Restart Tutorial</button>
                    <button class="btn-primary help-modal-ok">Got It</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('.help-modal-close').onclick = () => modal.remove();
        modal.querySelector('.help-modal-ok').onclick = () => modal.remove();
        modal.querySelector('.help-modal-restart').onclick = () => {
            modal.remove();
            this.restartTutorial();
        };
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
    }
}

// Initialize tutorial manager
let tutorialManager;
if (typeof window !== 'undefined') {
    tutorialManager = new TutorialManager();
    window.tutorialManager = tutorialManager;
}
