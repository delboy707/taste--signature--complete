// ===== DATA STORAGE =====
let experiences = [];
let charts = {};
let currentStage = 1;
const totalStages = 7;
let firestoreManager = null;
let isCloudSyncEnabled = false;

// Sample flavor concepts data
const SAMPLE_FLAVOR_CONCEPTS = [{"Concept_ID":"1","Flavor_Name":"Mango Chili Lime Burst","Primary_Ingredients":"Mango, Chili, Lime","Taste_Profile":"Sweet, spicy, citrus","Emotional_Resonance":"Excitement, Adventure","Target_Product_Category":"Snack","Market_Trend_Alignment":"Spicy tropical snacks trending"},{"Concept_ID":"2","Flavor_Name":"Gingered Peach Blossom","Primary_Ingredients":"Peach, Ginger, Floral Notes","Taste_Profile":"Sweet, spicy, floral","Emotional_Resonance":"Comfort, Joy","Target_Product_Category":"Beverage","Market_Trend_Alignment":"Botanical infusions rising"},{"Concept_ID":"3","Flavor_Name":"Vanilla Chai Almond","Primary_Ingredients":"Vanilla, Chai, Almond","Taste_Profile":"Creamy, spicy, nutty","Emotional_Resonance":"Warmth, Nostalgia","Target_Product_Category":"Snack","Market_Trend_Alignment":"Premium nutty snacks popular"},{"Concept_ID":"4","Flavor_Name":"Blueberry Lavender Dream","Primary_Ingredients":"Blueberry, Lavender, Cream","Taste_Profile":"Fruity, floral, creamy","Emotional_Resonance":"Relaxation, Indulgence","Target_Product_Category":"Confectionery","Market_Trend_Alignment":"Floral and fruity desserts gaining popularity"},{"Concept_ID":"5","Flavor_Name":"Smoked Paprika Honey","Primary_Ingredients":"Paprika, Honey, Smoked Notes","Taste_Profile":"Smoky, sweet, spicy","Emotional_Resonance":"Curiosity, Comfort","Target_Product_Category":"Snack","Market_Trend_Alignment":"Smoked savory-sweet combinations popular"},{"Concept_ID":"6","Flavor_Name":"Matcha Coconut Bliss","Primary_Ingredients":"Matcha, Coconut, Vanilla","Taste_Profile":"Earthy, creamy, sweet","Emotional_Resonance":"Calm, Indulgence","Target_Product_Category":"Beverage","Market_Trend_Alignment":"Growing matcha and coconut trends"},{"Concept_ID":"7","Flavor_Name":"Lemon Basil Sorbet","Primary_Ingredients":"Lemon, Basil, Sugar Syrup","Taste_Profile":"Citrusy, herbal, refreshing","Emotional_Resonance":"Refreshing, Energizing","Target_Product_Category":"Dessert","Market_Trend_Alignment":"Herbal-refreshing desserts trending"},{"Concept_ID":"8","Flavor_Name":"Dark Chocolate Orange Zest","Primary_Ingredients":"Dark Chocolate, Orange Peel","Taste_Profile":"Rich, citrusy, bitter-sweet","Emotional_Resonance":"Comfort, Luxury","Target_Product_Category":"Confectionery","Market_Trend_Alignment":"Dark chocolate indulgence increasing"},{"Concept_ID":"9","Flavor_Name":"Apple Cinnamon Maple Crunch","Primary_Ingredients":"Apple, Cinnamon, Maple Syrup","Taste_Profile":"Sweet, spicy, crunchy","Emotional_Resonance":"Comfort, Nostalgia","Target_Product_Category":"Cereal Snack","Market_Trend_Alignment":"Breakfast-inspired snacks rising"},{"Concept_ID":"10","Flavor_Name":"Yuzu Raspberry Spark","Primary_Ingredients":"Yuzu, Raspberry, Sparkling Essence","Taste_Profile":"Citrusy, tart, sparkling","Emotional_Resonance":"Excitement, Freshness","Target_Product_Category":"Beverage","Market_Trend_Alignment":"Citrus-flavored sparkling beverages popular"},{"Concept_ID":"11","Flavor_Name":"Rosemary Caramel Apple","Primary_Ingredients":"Rosemary, Caramel, Apple","Taste_Profile":"Herbal, sweet, fruity","Emotional_Resonance":"Comfort, Warmth","Target_Product_Category":"Dessert","Market_Trend_Alignment":"Savory-herbal sweet snacks emerging"},{"Concept_ID":"12","Flavor_Name":"Espresso Hazelnut Praline","Primary_Ingredients":"Espresso, Hazelnut, Chocolate","Taste_Profile":"Rich, nutty, robust","Emotional_Resonance":"Comfort, Energy","Target_Product_Category":"Snack","Market_Trend_Alignment":"Coffee-flavored indulgence rising"},{"Concept_ID":"13","Flavor_Name":"Watermelon Mint Refresh","Primary_Ingredients":"Watermelon, Mint, Lime","Taste_Profile":"Refreshing, sweet, herbal","Emotional_Resonance":"Freshness, Energizing","Target_Product_Category":"Beverage","Market_Trend_Alignment":"Mint-infused beverages popular"},{"Concept_ID":"14","Flavor_Name":"Cucumber Melon Cooler","Primary_Ingredients":"Cucumber, Melon, Lemon","Taste_Profile":"Cooling, refreshing, citrus","Emotional_Resonance":"Cooling, Refreshing","Target_Product_Category":"Beverage","Market_Trend_Alignment":"Light and hydrating beverages trending"},{"Concept_ID":"15","Flavor_Name":"Passionfruit Hibiscus Tango","Primary_Ingredients":"Passionfruit, Hibiscus, Citrus","Taste_Profile":"Tangy, floral, tropical","Emotional_Resonance":"Adventure, Excitement","Target_Product_Category":"Confectionery","Market_Trend_Alignment":"Tropical floral combinations trending"}];

// Pending import data
let pendingImportData = [];

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    initNavigation();
    initForm();
    initSliders();
    initImport();
    loadData();
    updateDashboard();
    restoreNavGroupStates();
    // Initialize Quick Entry if function exists
    if (typeof initQuickEntry === 'function') {
        initQuickEntry();
    }
});

// ===== NAVIGATION =====
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const viewTitles = {
        'overview': 'Dashboard Overview',
        'quick-entry': 'Quick Product Entry',
        'log-experience': 'Full Sensory Evaluation',
        'shape-of-taste': 'Shape of Taste Analysis',
        'emotional-map': 'Emotional Mapping & Correlation',
        'need-states': 'Need States & Triggers',
        'comparison': 'Product Comparison',
        'portfolio': 'Portfolio Emotional Map',
        'insights': 'Professional Insights',
        'ai-insights': 'AI-Powered Insights',
        'export-reports': 'Export & Reports',
        'batch-import': 'Batch Import Products',
        'recipe-tracker': 'Recipe & Formulation Tracker',
        'temporal-analysis': 'Temporal Analysis',
        'photo-gallery': 'Photo Gallery',
        'team-collaboration': 'Team Collaboration',
        'approvals': 'Approval Workflows',
        'history': 'Experience History',
        'import': 'Import Data',
        'integrations': 'Data Integrations',
        'consumer-panel': 'Consumer Panel',
        'custom-lexicon': 'Custom Lexicon',
        'industry-benchmarks': 'Industry Benchmarks'
    };

    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const viewName = this.dataset.view;

            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');

            // Update active view
            document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
            document.getElementById(`view-${viewName}`).classList.add('active');

            // Update page title
            document.getElementById('current-view-title').textContent = viewTitles[viewName];

            // Refresh view-specific content
            if (viewName === 'overview') updateDashboard();
            if (viewName === 'quick-entry') renderQuickEntryView();
            if (viewName === 'shape-of-taste') updateShapeOfTasteView();
            if (viewName === 'emotional-map') updateEmotionalMappingView();
            if (viewName === 'need-states') updateNeedStatesView();
            if (viewName === 'comparison') updateComparisonView();
            if (viewName === 'portfolio') updatePortfolioView();
            if (viewName === 'insights') renderAdvancedAnalytics();
            if (viewName === 'ai-insights') updateAIInsightsView();
            if (viewName === 'consumer-panel') renderConsumerPanelDashboard();
            if (viewName === 'custom-lexicon') renderCustomLexiconDashboard();
            if (viewName === 'industry-benchmarks') renderIndustryBenchmarksDashboard();
            if (viewName === 'export-reports') renderExportReportsDashboard();
            if (viewName === 'batch-import') renderBatchImportDashboard();
            if (viewName === 'recipe-tracker') renderRecipeTrackerDashboard();
            if (viewName === 'temporal-analysis') renderTemporalAnalysisDashboard();
            if (viewName === 'photo-gallery') renderPhotoGalleryDashboard();
            if (viewName === 'team-collaboration') renderTeamCollaborationDashboard();
            if (viewName === 'approvals') renderApprovalsDashboard();
            if (viewName === 'history') updateHistory();
            if (viewName === 'integrations') renderIntegrationsView();
        });
    });
}

// ===== INTEGRATIONS VIEW =====
function renderIntegrationsView() {
    // Render barcode scanner by default
    if (typeof renderBarcodeScannerUI === 'function') {
        renderBarcodeScannerUI('barcode-scanner-container');
    }
    if (typeof renderSpreadsheetSyncUI === 'function') {
        renderSpreadsheetSyncUI('spreadsheet-sync-container');
    }
    if (typeof renderWebhookIntegrationUI === 'function') {
        renderWebhookIntegrationUI('webhook-integration-container');
    }
}

function showIntegrationTab(tabName) {
    // Hide all sections
    document.querySelectorAll('.integration-section').forEach(section => {
        section.style.display = 'none';
    });

    // Show selected section
    const section = document.getElementById(`integration-${tabName}`);
    if (section) {
        section.style.display = 'block';
    }

    // Update button styles
    const buttons = document.querySelectorAll('.integration-tabs button');
    buttons.forEach(btn => {
        btn.className = 'btn-secondary';
    });

    // Find and highlight active button
    const activeBtn = Array.from(buttons).find(btn =>
        btn.textContent.toLowerCase().includes(tabName.substring(0, 4))
    );
    if (activeBtn) {
        activeBtn.className = 'btn-primary';
    }
}

// Make functions globally available
window.showIntegrationTab = showIntegrationTab;
window.renderIntegrationsView = renderIntegrationsView;

// ===== NAVIGATION GROUP TOGGLE =====
function toggleNavGroup(groupId) {
    const group = document.getElementById(`nav-group-${groupId}`);
    if (group) {
        group.classList.toggle('collapsed');
        // Save state to localStorage
        const collapsedGroups = JSON.parse(localStorage.getItem('collapsedNavGroups') || '[]');
        if (group.classList.contains('collapsed')) {
            if (!collapsedGroups.includes(groupId)) {
                collapsedGroups.push(groupId);
            }
        } else {
            const index = collapsedGroups.indexOf(groupId);
            if (index > -1) {
                collapsedGroups.splice(index, 1);
            }
        }
        localStorage.setItem('collapsedNavGroups', JSON.stringify(collapsedGroups));
    }
}

// Restore collapsed nav groups on load
function restoreNavGroupStates() {
    const collapsedGroups = JSON.parse(localStorage.getItem('collapsedNavGroups') || '[]');
    collapsedGroups.forEach(groupId => {
        const group = document.getElementById(`nav-group-${groupId}`);
        if (group) {
            group.classList.add('collapsed');
        }
    });
}

// Make toggleNavGroup available globally
window.toggleNavGroup = toggleNavGroup;

// ===== FORM MANAGEMENT =====
function initForm() {
    const form = document.getElementById('taste-form');
    const btnNext = document.getElementById('btn-next-stage');
    const btnPrev = document.getElementById('btn-prev-stage');
    const btnSubmit = document.getElementById('btn-submit');

    btnNext.addEventListener('click', () => navigateStage(1));
    btnPrev.addEventListener('click', () => navigateStage(-1));

    form.addEventListener('submit', handleFormSubmit);

    // Load draft if available
    loadFormDraft();

    // Autosave on input change
    form.addEventListener('input', debounce(autoSaveFormProgress, 1000));

    // Initialize re-test selector
    initRetestSelector();
}

function initRetestSelector() {
    const selector = document.getElementById('retest-selector');
    if (!selector) return;

    // Populate with existing products
    updateRetestOptions();

    // Auto-fill form when re-test selected
    selector.onchange = function() {
        if (!this.value) return;

        const originalExp = experiences.find(e => e.id == this.value);
        if (!originalExp) return;

        // Auto-fill product info
        document.getElementById('item-name').value = originalExp.productInfo.name;
        document.getElementById('item-brand').value = originalExp.productInfo.brand;
        document.getElementById('item-type').value = originalExp.productInfo.type;
        document.getElementById('item-variant').value = originalExp.productInfo.variant;

        // Show notification
        const notification = document.createElement('div');
        notification.style.cssText = 'position: fixed; top: 80px; right: 20px; background: var(--info-color); color: white; padding: 12px 20px; border-radius: 8px; z-index: 1000; box-shadow: var(--shadow-md);';
        notification.textContent = `Re-testing: ${originalExp.productInfo.name} - Form pre-filled`;
        document.body.appendChild(notification);

        setTimeout(() => notification.remove(), 3000);
    };
}

function updateRetestOptions() {
    const selector = document.getElementById('retest-selector');
    if (!selector) return;

    // Group products by name to show test history
    const productGroups = {};
    experiences.forEach(exp => {
        const key = `${exp.productInfo.name}-${exp.productInfo.brand}`;
        if (!productGroups[key]) {
            productGroups[key] = [];
        }
        productGroups[key].push(exp);
    });

    let options = '<option value="">No - This is a new product</option>';
    Object.entries(productGroups).forEach(([key, exps]) => {
        exps.forEach((exp, idx) => {
            const testNum = exp.testNumber || (idx + 1);
            const date = new Date(exp.timestamp).toLocaleDateString();
            options += `<option value="${exp.id}">${exp.productInfo.name} - Test #${testNum} (${date})</option>`;
        });
    });

    selector.innerHTML = options;
}

// Debounce helper to prevent excessive saves
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function validateStage(stageNum) {
    const stage = document.querySelector(`.form-stage[data-stage="${stageNum}"]`);
    if (!stage) return true;

    const errors = [];

    // Check required text inputs
    const requiredInputs = stage.querySelectorAll('input[required], select[required]');
    for (let input of requiredInputs) {
        if (!input.value || input.value === '') {
            const label = stage.querySelector(`label[for="${input.id}"]`)?.textContent || 'Field';
            errors.push(`${label.replace(':', '')} is required`);
            input.classList.add('validation-error');
        } else {
            input.classList.remove('validation-error');
        }
    }

    // Check if radio buttons are required (need state)
    const radioGroups = stage.querySelectorAll('input[type="radio"][required]');
    if (radioGroups.length > 0) {
        const radioName = radioGroups[0].name;
        const checked = stage.querySelector(`input[name="${radioName}"]:checked`);
        if (!checked) {
            errors.push('Please select a Need State');
        }
    }

    // Show errors if any
    if (errors.length > 0) {
        showValidationErrors(errors, stage);
        return false;
    }

    // Clear any existing error displays
    clearValidationErrors(stage);
    return true;
}

function showValidationErrors(errors, stage) {
    // Remove existing error display
    clearValidationErrors(stage);

    // Create error message container
    const errorDiv = document.createElement('div');
    errorDiv.className = 'validation-errors';
    errorDiv.innerHTML = `
        <div class="validation-error-header">
            <span class="error-icon">⚠️</span>
            <strong>Please fix the following errors:</strong>
        </div>
        <ul>
            ${errors.map(err => `<li>${err}</li>`).join('')}
        </ul>
    `;

    // Insert at top of stage
    stage.insertBefore(errorDiv, stage.firstChild);

    // Scroll to errors
    errorDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function clearValidationErrors(stage) {
    const existingErrors = stage.querySelector('.validation-errors');
    if (existingErrors) {
        existingErrors.remove();
    }

    // Remove error classes from inputs
    stage.querySelectorAll('.validation-error').forEach(input => {
        input.classList.remove('validation-error');
    });
}

function navigateStage(direction) {
    const newStage = currentStage + direction;

    if (newStage < 1 || newStage > totalStages) return;

    // Validate current stage before moving forward
    if (direction > 0 && !validateStage(currentStage)) {
        alert('Please complete all required fields before proceeding.');
        return;
    }

    // Hide current stage
    document.querySelector(`.form-stage[data-stage="${currentStage}"]`).classList.remove('active');
    document.querySelector(`.stage-indicator[data-stage="${currentStage}"]`).classList.remove('active');
    document.querySelector(`.stage-indicator[data-stage="${currentStage}"]`).classList.add('completed');

    // Show new stage
    currentStage = newStage;
    document.querySelector(`.form-stage[data-stage="${currentStage}"]`).classList.add('active');
    document.querySelector(`.stage-indicator[data-stage="${currentStage}"]`).classList.add('active');

    // Update navigation buttons
    document.getElementById('btn-prev-stage').style.display = currentStage > 1 ? 'block' : 'none';
    document.getElementById('btn-next-stage').style.display = currentStage < totalStages ? 'block' : 'none';
    document.getElementById('btn-submit').style.display = currentStage === totalStages ? 'block' : 'none';
}

function initSliders() {
    const sliders = document.querySelectorAll('input[type="range"]');
    sliders.forEach(slider => {
        const valueSpan = document.getElementById(`${slider.id}-val`);
        if (valueSpan) {
            slider.addEventListener('input', (e) => {
                valueSpan.textContent = e.target.value;
            });
        }
    });
}

function autoSaveFormProgress() {
    const form = document.getElementById('taste-form');
    const formData = new FormData(form);
    const draftData = {
        stage: currentStage,
        timestamp: new Date().toISOString(),
        values: {}
    };

    // Collect all input values
    const inputs = form.querySelectorAll('input[type="text"], input[type="range"], select, textarea');
    inputs.forEach(input => {
        if (input.id) {
            draftData.values[input.id] = input.value;
        }
    });

    // Collect radio buttons
    const needState = document.querySelector('input[name="need-state"]:checked');
    if (needState) {
        draftData.values['need-state'] = needState.value;
    }

    localStorage.setItem('tasteForm_draft', JSON.stringify(draftData));

    // Show subtle indicator
    showAutoSaveIndicator();
}

function loadFormDraft() {
    const draft = localStorage.getItem('tasteForm_draft');
    if (!draft) return;

    const draftData = JSON.parse(draft);
    const draftAge = (Date.now() - new Date(draftData.timestamp).getTime()) / 1000 / 60; // minutes

    // Only prompt if draft is less than 24 hours old
    if (draftAge > 1440) {
        localStorage.removeItem('tasteForm_draft');
        return;
    }

    if (confirm(`Resume your in-progress entry from ${Math.round(draftAge)} minutes ago?`)) {
        // Restore all values
        Object.entries(draftData.values).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
                // Update range value displays
                const valueSpan = document.getElementById(`${id}-val`);
                if (valueSpan && element.type === 'range') {
                    valueSpan.textContent = value;
                }
            } else if (id === 'need-state') {
                const radio = document.querySelector(`input[name="need-state"][value="${value}"]`);
                if (radio) radio.checked = true;
            }
        });

        // Navigate to saved stage
        if (draftData.stage > 1) {
            for (let i = 1; i < draftData.stage; i++) {
                navigateStage(1);
            }
        }
    } else {
        localStorage.removeItem('tasteForm_draft');
    }
}

function showAutoSaveIndicator() {
    const topBar = document.querySelector('.top-bar');
    let indicator = document.getElementById('autosave-indicator');

    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'autosave-indicator';
        indicator.style.cssText = 'position: fixed; top: 20px; right: 20px; background: var(--success-color); color: white; padding: 8px 16px; border-radius: 6px; font-size: 0.85rem; z-index: 1000; opacity: 0; transition: opacity 0.3s;';
        indicator.textContent = 'Draft saved ✓';
        document.body.appendChild(indicator);
    }

    indicator.style.opacity = '1';
    setTimeout(() => {
        indicator.style.opacity = '0';
    }, 2000);
}

function handleFormSubmit(e) {
    e.preventDefault();

    // Final validation - ensure all required fields are filled
    for (let i = 1; i <= totalStages; i++) {
        if (!validateStage(i)) {
            // Navigate to first incomplete stage
            const targetStage = i;
            while (currentStage < targetStage) {
                currentStage++;
                document.querySelector(`.form-stage[data-stage="${currentStage}"]`).classList.add('active');
                document.querySelector(`.stage-indicator[data-stage="${currentStage}"]`).classList.add('active');
            }
            while (currentStage > targetStage) {
                currentStage--;
            }

            // Hide all other stages
            document.querySelectorAll('.form-stage').forEach(stage => {
                if (stage.getAttribute('data-stage') != targetStage) {
                    stage.classList.remove('active');
                }
            });

            // Re-run validation to show errors
            validateStage(targetStage);
            return;
        }
    }

    // Check if this is a re-test
    const retestSelector = document.getElementById('retest-selector');
    const originalTestId = retestSelector && retestSelector.value ? parseInt(retestSelector.value) : null;
    let testNumber = 1;

    if (originalTestId) {
        // Find all tests for this product
        const originalExp = experiences.find(e => e.id === originalTestId);
        if (originalExp) {
            const productKey = `${originalExp.productInfo.name}-${originalExp.productInfo.brand}`;
            const allTests = experiences.filter(e =>
                `${e.productInfo.name}-${e.productInfo.brand}` === productKey
            );
            testNumber = allTests.length + 1;
        }
    }

    const experience = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        productInfo: {
            name: document.getElementById('item-name').value,
            brand: document.getElementById('item-brand').value || 'N/A',
            type: document.getElementById('item-type').value,
            variant: document.getElementById('item-variant').value || 'N/A',
            occasion: document.getElementById('item-occasion').value || 'Not specified',
            temperature: document.getElementById('item-temperature').value || 'Not specified'
        },
        testNumber: testNumber,
        originalTestId: originalTestId,
        isRetest: originalTestId !== null,
        reformulationStatus: document.getElementById('reformulation-status')?.value || '',
        stages: {
            appearance: {
                visualAppeal: parseInt(document.getElementById('appearance-visual-appeal').value),
                colorIntensity: parseInt(document.getElementById('appearance-color-intensity').value),
                overallIntensity: parseInt(document.getElementById('appearance-overall-intensity').value),
                carbonation: parseInt(document.getElementById('appearance-carbonation')?.value || 5),
                emotions: {
                    anticipation: parseInt(document.getElementById('appearance-anticipation').value),
                    desire: parseInt(document.getElementById('appearance-desire').value),
                    excitement: parseInt(document.getElementById('appearance-excitement').value),
                    happiness: parseInt(document.getElementById('appearance-happiness').value),
                    curiosity: parseInt(document.getElementById('appearance-curiosity').value),
                    surprise: parseInt(document.getElementById('appearance-surprise')?.value || 5)
                }
            },
            aroma: {
                intensity: parseInt(document.getElementById('aroma-intensity').value),
                sweetness: parseInt(document.getElementById('aroma-sweetness').value),
                complexity: parseInt(document.getElementById('aroma-complexity').value),
                overallIntensity: parseInt(document.getElementById('aroma-overall-intensity').value),
                persistence: parseInt(document.getElementById('aroma-persistence')?.value || 5),
                emotions: {
                    pleasure: parseInt(document.getElementById('aroma-pleasure').value),
                    comfort: parseInt(document.getElementById('aroma-comfort').value),
                    nostalgia: parseInt(document.getElementById('aroma-nostalgia').value),
                    happiness: parseInt(document.getElementById('aroma-happiness').value),
                    energy: parseInt(document.getElementById('aroma-energy').value),
                    relaxation: parseInt(document.getElementById('aroma-relaxation').value),
                    intrigue: parseInt(document.getElementById('aroma-intrigue')?.value || 5)
                }
            },
            frontMouth: {
                sweetness: parseInt(document.getElementById('front-sweetness').value),
                sourness: parseInt(document.getElementById('front-sourness').value),
                saltiness: parseInt(document.getElementById('front-saltiness').value),
                texture: parseInt(document.getElementById('front-texture').value),
                acidity: parseInt(document.getElementById('front-acidity')?.value || 5),
                spiciness: parseInt(document.getElementById('front-spiciness')?.value || 3),
                overallIntensity: parseInt(document.getElementById('front-overall-intensity').value),
                emotions: {
                    excitement: parseInt(document.getElementById('front-excitement').value),
                    satisfaction: parseInt(document.getElementById('front-satisfaction').value),
                    happiness: parseInt(document.getElementById('front-happiness').value),
                    pleasure: parseInt(document.getElementById('front-pleasure').value),
                    disappointment: parseInt(document.getElementById('front-disappointment')?.value || 3)
                }
            },
            midRearMouth: {
                bitterness: parseInt(document.getElementById('mid-bitterness').value),
                umami: parseInt(document.getElementById('mid-umami').value),
                richness: parseInt(document.getElementById('mid-richness').value),
                creaminess: parseInt(document.getElementById('mid-creaminess').value),
                astringency: parseInt(document.getElementById('mid-astringency')?.value || 3),
                mouthfeel: parseInt(document.getElementById('mid-mouthfeel')?.value || 5),
                overallIntensity: parseInt(document.getElementById('mid-overall-intensity').value),
                emotions: {
                    indulgence: parseInt(document.getElementById('mid-indulgence').value),
                    comfort: parseInt(document.getElementById('mid-comfort').value),
                    satisfaction: parseInt(document.getElementById('mid-satisfaction').value),
                    pleasure: parseInt(document.getElementById('mid-pleasure').value),
                    sophistication: parseInt(document.getElementById('mid-sophistication')?.value || 5)
                }
            },
            aftertaste: {
                duration: parseInt(document.getElementById('after-duration').value),
                pleasantness: parseInt(document.getElementById('after-pleasantness').value),
                cleanness: parseInt(document.getElementById('after-cleanness').value),
                overallIntensity: parseInt(document.getElementById('after-overall-intensity').value),
                emotions: {
                    satisfaction: parseInt(document.getElementById('after-satisfaction').value),
                    completeness: parseInt(document.getElementById('after-completeness').value),
                    happiness: parseInt(document.getElementById('after-happiness').value),
                    craving: parseInt(document.getElementById('after-craving')?.value || 5)
                }
            }
        },
        needState: document.querySelector('input[name="need-state"]:checked').value,
        emotionalTriggers: {
            moreishness: parseInt(document.getElementById('trigger-moreishness').value),
            refreshment: parseInt(document.getElementById('trigger-refreshment').value),
            melt: parseInt(document.getElementById('trigger-melt').value),
            crunch: parseInt(document.getElementById('trigger-crunch').value)
        },
        notes: document.getElementById('notes').value
    };

    experiences.push(experience);
    saveData();

    // Clear draft
    localStorage.removeItem('tasteForm_draft');

    // Update retest options
    updateRetestOptions();

    // Reset form
    document.getElementById('taste-form').reset();
    currentStage = 1;
    document.querySelectorAll('.form-stage').forEach(stage => stage.classList.remove('active'));
    document.querySelectorAll('.stage-indicator').forEach(indicator => {
        indicator.classList.remove('active', 'completed');
    });
    document.querySelector('.form-stage[data-stage="1"]').classList.add('active');
    document.querySelector('.stage-indicator[data-stage="1"]').classList.add('active');
    document.getElementById('btn-prev-stage').style.display = 'none';
    document.getElementById('btn-next-stage').style.display = 'block';
    document.getElementById('btn-submit').style.display = 'none';

    // Reset sliders
    document.querySelectorAll('input[type="range"]').forEach(slider => {
        slider.value = 5;
        const valueSpan = document.getElementById(`${slider.id}-val`);
        if (valueSpan) valueSpan.textContent = '5';
    });

    alert('Experience logged successfully!');
    updateDashboard();
}

// ===== DATA PERSISTENCE =====
// Initialize Firestore when user logs in
async function initializeFirestore(user) {
    if (!user) {
        console.log('No user logged in');
        isCloudSyncEnabled = false;
        return;
    }

    // Check if authManager and db are initialized
    if (!window.authManager || !window.authManager.db) {
        console.error('❌ AuthManager or Firestore DB not initialized');
        isCloudSyncEnabled = false;
        return;
    }

    firestoreManager = new FirestoreDataManager();
    const initResult = await firestoreManager.initialize(window.authManager.db, user.uid);

    if (initResult.success) {
        isCloudSyncEnabled = true;
        console.log('✅ Company context loaded:', initResult.companyId);

        // Load data from Firestore
        await loadDataFromCloud();
    } else {
        console.error('❌ Failed to initialize Firestore:', initResult.error);
        isCloudSyncEnabled = false;

        // Show error message to user
        if (initResult.error === 'No company associated with user') {
            alert('Error: Your account is not associated with a company. Please contact support or create a new account.');
        }
    }
}

async function loadData() {
    // Check if demo mode is active
    if (window.demoMode && window.demoMode.isDemoActive()) {
        console.log('🎭 Demo mode active - loading sample data');
        experiences = window.demoMode.getDemoExperiences();
        updateDashboard();
        return;
    }

    if (isCloudSyncEnabled && firestoreManager) {
        // Load from Firestore
        await loadDataFromCloud();
    } else {
        // Fallback to localStorage (for logged-out state or migration)
        const stored = localStorage.getItem('tasteSignatureData');
        if (stored) {
            experiences = JSON.parse(stored);
        }
    }
}

// Helper function to load demo data (called from button click)
window.loadDemoExperiences = function() {
    if (window.demoMode) {
        experiences = window.demoMode.getDemoExperiences();
        updateDashboard();
        console.log('✅ Loaded', experiences.length, 'demo experiences');
    }
};

async function loadDataFromCloud() {
    try {
        const result = await firestoreManager.loadExperiences();
        if (result.success) {
            experiences = result.experiences;
            console.log(`✅ Loaded ${experiences.length} experiences from cloud`);

            // Migrate local data if Firestore is empty
            if (experiences.length === 0) {
                const localData = localStorage.getItem('tasteSignatureData');
                if (localData) {
                    const localExperiences = JSON.parse(localData);
                    if (localExperiences.length > 0) {
                        console.log('🔄 Migrating local data to Firestore...');
                        const migrationResult = await firestoreManager.syncLocalToFirestore(localExperiences);
                        if (migrationResult.success && migrationResult.migrated) {
                            experiences = localExperiences;
                            alert(`✅ Your ${localExperiences.length} local experiences have been migrated to the cloud!`);
                        }
                    }
                }
            }

            updateDashboard();
        }
    } catch (error) {
        console.error('Error loading from cloud:', error);
        alert('Failed to load data from cloud. Please try again.');
    }
}

async function saveData() {
    // Don't save in demo mode
    if (window.demoMode && window.demoMode.isDemoActive()) {
        console.log('🎭 Demo mode - data not saved');
        return;
    }

    if (isCloudSyncEnabled && firestoreManager) {
        // Save to Firestore
        try {
            const result = await firestoreManager.saveExperiences(experiences);
            if (result.success) {
                console.log('✅ Data saved to cloud');
            } else {
                console.error('Failed to save to cloud:', result.error);
                // Fallback to localStorage
                localStorage.setItem('tasteSignatureData', JSON.stringify(experiences));
            }
        } catch (error) {
            console.error('Save error:', error);
            localStorage.setItem('tasteSignatureData', JSON.stringify(experiences));
        }
    } else {
        // Save to localStorage
        localStorage.setItem('tasteSignatureData', JSON.stringify(experiences));
    }
}

// ===== DASHBOARD =====
function updateDashboard() {
    if (experiences.length === 0) {
        document.getElementById('stat-total').textContent = '0';
        document.getElementById('stat-products').textContent = '0';
        document.getElementById('stat-satisfaction').textContent = '-';
        document.getElementById('stat-need-state').textContent = '-';
        document.getElementById('recent-activity').innerHTML = '<p class="empty-state">No activity yet</p>';
        document.getElementById('quick-insights').innerHTML = '<p class="empty-state">No insights yet</p>';
        return;
    }

    // Update stats
    document.getElementById('stat-total').textContent = experiences.length;

    const uniqueProducts = new Set(experiences.map(e => e.productInfo.name)).size;
    document.getElementById('stat-products').textContent = uniqueProducts;

    const avgSatisfaction = experiences.reduce((sum, e) =>
        sum + e.stages.aftertaste.emotions.satisfaction, 0) / experiences.length;
    document.getElementById('stat-satisfaction').textContent = avgSatisfaction.toFixed(1);

    const needStateCounts = {};
    experiences.forEach(e => {
        needStateCounts[e.needState] = (needStateCounts[e.needState] || 0) + 1;
    });
    const topNeedState = Object.keys(needStateCounts).reduce((a, b) =>
        needStateCounts[a] > needStateCounts[b] ? a : b);
    document.getElementById('stat-need-state').textContent =
        topNeedState.charAt(0).toUpperCase() + topNeedState.slice(1);

    // Recent activity
    const recentHTML = experiences
        .slice(-5)
        .reverse()
        .map(e => `
            <div style="padding: 10px; border-bottom: 1px solid var(--border-color);">
                <strong>${e.productInfo.name}</strong> - ${e.productInfo.brand}<br>
                <small style="color: var(--text-light);">${new Date(e.timestamp).toLocaleDateString()}</small>
            </div>
        `).join('');
    document.getElementById('recent-activity').innerHTML = recentHTML;

    // Quick insights
    const insights = generateQuickInsights();
    document.getElementById('quick-insights').innerHTML = insights.map(i => `
        <div style="padding: 10px; border-bottom: 1px solid var(--border-color);">
            <strong style="color: var(--primary-color);">${i.title}</strong><br>
            <small>${i.text}</small>
        </div>
    `).join('');
}

function generateQuickInsights() {
    if (experiences.length === 0) return [];

    const insights = [];

    // Highest rated product
    const highest = experiences.reduce((max, e) =>
        e.stages.aftertaste.emotions.satisfaction > max.stages.aftertaste.emotions.satisfaction ? e : max);
    insights.push({
        title: 'Top Rated',
        text: `${highest.productInfo.name} (${highest.stages.aftertaste.emotions.satisfaction}/10)`
    });

    // Most common need state
    const needStateCounts = {};
    experiences.forEach(e => {
        needStateCounts[e.needState] = (needStateCounts[e.needState] || 0) + 1;
    });
    const topNeed = Object.keys(needStateCounts).reduce((a, b) =>
        needStateCounts[a] > needStateCounts[b] ? a : b);
    insights.push({
        title: 'Dominant Need',
        text: `${topNeed.charAt(0).toUpperCase() + topNeed.slice(1)} (${needStateCounts[topNeed]} products)`
    });

    return insights;
}

// ===== SHAPE OF TASTE =====
function updateShapeOfTasteView() {
    const select = document.getElementById('shape-product-select');
    select.innerHTML = '<option value="">Choose a product...</option>' +
        experiences.map(e => `<option value="${e.id}">${e.productInfo.name} - ${e.productInfo.brand}</option>`).join('');

    select.onchange = function() {
        const exp = experiences.find(e => e.id == this.value);
        if (exp) {
            renderShapeOfTaste(exp);
            renderEmotionalJourney(exp);
        }
    };
}

function destroyChart(chartKey) {
    if (charts[chartKey]) {
        const canvas = charts[chartKey].canvas;
        const ctx = canvas.getContext('2d');
        charts[chartKey].destroy();
        charts[chartKey] = null;
        // Clear canvas completely
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

function renderShapeOfTaste(exp) {
    const ctx = document.getElementById('shape-chart').getContext('2d');

    destroyChart('shape');

    const stages = ['Appearance', 'Aroma', 'Front', 'Mid/Rear', 'Aftertaste'];
    const intensities = [
        exp.stages.appearance.overallIntensity,
        exp.stages.aroma.overallIntensity,
        exp.stages.frontMouth.overallIntensity,
        exp.stages.midRearMouth.overallIntensity,
        exp.stages.aftertaste.overallIntensity
    ];

    charts.shape = new Chart(ctx, {
        type: 'line',
        data: {
            labels: stages,
            datasets: [{
                label: 'Intensity Journey',
                data: intensities,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointBackgroundColor: '#667eea',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    title: {
                        display: true,
                        text: 'Intensity (0-10)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Consumption Stage'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: `${exp.productInfo.name} - Shape of Taste`,
                    font: { size: 16 }
                },
                legend: {
                    display: false
                }
            }
        }
    });
}

function renderEmotionalJourney(exp) {
    const ctx = document.getElementById('emotional-journey-chart').getContext('2d');

    destroyChart('emotionalJourney');

    const stages = ['Appearance', 'Aroma', 'Front', 'Mid/Rear', 'Aftertaste'];

    // Get average emotional response per stage
    const emotionalData = [
        (exp.stages.appearance.emotions.anticipation + exp.stages.appearance.emotions.desire) / 2,
        (exp.stages.aroma.emotions.pleasure + exp.stages.aroma.emotions.comfort) / 2,
        (exp.stages.frontMouth.emotions.excitement + exp.stages.frontMouth.emotions.satisfaction) / 2,
        (exp.stages.midRearMouth.emotions.indulgence + exp.stages.midRearMouth.emotions.comfort) / 2,
        (exp.stages.aftertaste.emotions.satisfaction + exp.stages.aftertaste.emotions.completeness) / 2
    ];

    charts.emotionalJourney = new Chart(ctx, {
        type: 'line',
        data: {
            labels: stages,
            datasets: [{
                label: 'Emotional Response',
                data: emotionalData,
                borderColor: '#764ba2',
                backgroundColor: 'rgba(118, 75, 162, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointBackgroundColor: '#764ba2',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    title: {
                        display: true,
                        text: 'Emotional Intensity (0-10)'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Emotional Journey',
                    font: { size: 16 }
                }
            }
        }
    });
}

// ===== NEED STATES =====
function updateNeedStatesView() {
    if (experiences.length === 0) {
        document.getElementById('trigger-insights').innerHTML = '<p class="empty-state">No data yet</p>';
        return;
    }

    renderNeedStateChart();
    renderTriggersChart();
    renderTriggerInsights();
}

function renderNeedStateChart() {
    const ctx = document.getElementById('need-state-chart').getContext('2d');

    destroyChart('needState');

    const needStateCounts = { reward: 0, escape: 0, rejuvenation: 0, sociability: 0 };
    experiences.forEach(e => {
        needStateCounts[e.needState]++;
    });

    charts.needState = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Reward', 'Escape', 'Rejuvenation', 'Sociability'],
            datasets: [{
                data: Object.values(needStateCounts),
                backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#4facfe']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Need State Distribution',
                    font: { size: 16 }
                }
            }
        }
    });
}

function renderTriggersChart() {
    const ctx = document.getElementById('triggers-chart').getContext('2d');

    destroyChart('triggers');

    const avgTriggers = {
        moreishness: 0,
        refreshment: 0,
        melt: 0,
        crunch: 0
    };

    experiences.forEach(e => {
        avgTriggers.moreishness += e.emotionalTriggers.moreishness;
        avgTriggers.refreshment += e.emotionalTriggers.refreshment;
        avgTriggers.melt += e.emotionalTriggers.melt;
        avgTriggers.crunch += e.emotionalTriggers.crunch;
    });

    Object.keys(avgTriggers).forEach(key => {
        avgTriggers[key] /= experiences.length;
    });

    charts.triggers = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Moreishness', 'Refreshment', 'The Melt', 'Texture/Crunch'],
            datasets: [{
                label: 'Average Intensity',
                data: Object.values(avgTriggers),
                backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#4facfe']
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function renderTriggerInsights() {
    const avgTriggers = {
        moreishness: 0,
        refreshment: 0,
        melt: 0,
        crunch: 0
    };

    experiences.forEach(e => {
        avgTriggers.moreishness += e.emotionalTriggers.moreishness;
        avgTriggers.refreshment += e.emotionalTriggers.refreshment;
        avgTriggers.melt += e.emotionalTriggers.melt;
        avgTriggers.crunch += e.emotionalTriggers.crunch;
    });

    Object.keys(avgTriggers).forEach(key => {
        avgTriggers[key] /= experiences.length;
    });

    const topTrigger = Object.keys(avgTriggers).reduce((a, b) =>
        avgTriggers[a] > avgTriggers[b] ? a : b);

    const html = `
        <div class="insight-item">
            <strong>Dominant Trigger</strong>
            <p>${topTrigger.charAt(0).toUpperCase() + topTrigger.slice(1)} scores highest across your products (${avgTriggers[topTrigger].toFixed(1)}/10)</p>
        </div>
        <div class="insight-item">
            <strong>Trigger Profile</strong>
            <p>Moreishness: ${avgTriggers.moreishness.toFixed(1)}/10<br>
            Refreshment: ${avgTriggers.refreshment.toFixed(1)}/10<br>
            The Melt: ${avgTriggers.melt.toFixed(1)}/10<br>
            Texture/Crunch: ${avgTriggers.crunch.toFixed(1)}/10</p>
        </div>
    `;

    document.getElementById('trigger-insights').innerHTML = html;
}

// ===== COMPARISON =====
// Store currently compared products for AI analysis
let currentComparedProducts = [];

function updateComparisonView() {
    const container = document.getElementById('comparison-product-list');

    if (experiences.length === 0) {
        container.innerHTML = '<p class="empty-state">No products to compare</p>';
        return;
    }

    container.innerHTML = experiences.map(e => `
        <div class="comparison-checkbox">
            <input type="checkbox" id="compare-${e.id}" value="${e.id}">
            <label for="compare-${e.id}">${e.productInfo.name}</label>
        </div>
    `).join('');

    document.getElementById('btn-run-comparison').onclick = runComparison;
    document.getElementById('btn-ai-compare').onclick = getAIComparisonInsights;
}

function runComparison() {
    const selected = Array.from(document.querySelectorAll('#comparison-product-list input:checked'))
        .map(cb => experiences.find(e => e.id == cb.value));

    if (selected.length < 2) {
        alert('Please select at least 2 products to compare');
        return;
    }

    if (selected.length > 4) {
        alert('Please select no more than 4 products');
        return;
    }

    // Store selected products for AI analysis
    currentComparedProducts = selected;

    document.getElementById('comparison-results').style.display = 'block';

    // Show AI button if API key is configured
    if (window.AI_CONFIG && window.AI_CONFIG.ANTHROPIC_API_KEY && window.AI_CONFIG.ANTHROPIC_API_KEY !== 'YOUR_API_KEY_HERE') {
        document.getElementById('btn-ai-compare').style.display = 'inline-block';
    }

    // Render all comparison components
    renderComparisonSummaryCards(selected);
    renderComparisonAttributeMatrix(selected);
    renderComparisonEmotionRadar(selected);
    renderComparisonShapeChart(selected);
    renderComparisonEmotionHeatmap(selected);
    renderComparisonNeedState(selected);
    renderComparisonTriggers(selected);

    // Scroll to results
    document.getElementById('comparison-results').scrollIntoView({ behavior: 'smooth' });
}

// ===== AI COMPARISON INSIGHTS =====
async function getAIComparisonInsights() {
    if (currentComparedProducts.length < 2) {
        alert('Please run a comparison first');
        return;
    }

    const container = document.getElementById('ai-comparison-insights');
    const content = document.getElementById('ai-comparison-content');

    container.style.display = 'block';
    content.innerHTML = '<div class="loading-spinner">🤖 Claude is analyzing your products...</div>';

    // Scroll to AI insights
    container.scrollIntoView({ behavior: 'smooth' });

    try {
        // Check if Claude AI is available
        if (!window.claudeAI) {
            window.claudeAI = new ClaudeAI();
        }

        // Use the compareProducts method from claude-api.js
        const response = await window.claudeAI.compareProducts(currentComparedProducts);

        // Display the response
        content.innerHTML = `<div class="ai-response-content">${formatAIResponse(response)}</div>`;

    } catch (error) {
        console.error('AI Comparison Error:', error);
        content.innerHTML = `
            <div class="error-message">
                <strong>❌ Error:</strong> ${error.message}
                <p style="margin-top: 10px; font-size: 0.9rem;">
                    Make sure your Anthropic API key is configured correctly in config.js
                </p>
            </div>
        `;
    }
}

// Helper function to format AI response (converts markdown-like formatting to HTML)
function formatAIResponse(text) {
    if (!text) return '';

    // Convert **bold** to <strong>
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Convert line breaks to <br>
    text = text.replace(/\n/g, '<br>');

    // Convert bullet points
    text = text.replace(/^- (.*?)$/gm, '<li>$1</li>');
    text = text.replace(/(<li>.*?<\/li>)/s, '<ul>$1</ul>');

    return text;
}

function renderComparisonShapeChart(products) {
    const ctx = document.getElementById('comparison-shape-chart').getContext('2d');

    destroyChart('comparisonShape');

    const stages = ['Appearance', 'Aroma', 'Front', 'Mid/Rear', 'Aftertaste'];
    const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe'];

    const datasets = products.map((exp, idx) => ({
        label: exp.productInfo.name,
        data: [
            exp.stages.appearance.overallIntensity,
            exp.stages.aroma.overallIntensity,
            exp.stages.frontMouth.overallIntensity,
            exp.stages.midRearMouth.overallIntensity,
            exp.stages.aftertaste.overallIntensity
        ],
        borderColor: colors[idx],
        backgroundColor: colors[idx] + '20',
        borderWidth: 3,
        tension: 0.4,
        pointRadius: 5
    }));

    charts.comparisonShape = new Chart(ctx, {
        type: 'line',
        data: { labels: stages, datasets },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, max: 10 }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Shape of Taste Comparison',
                    font: { size: 16 }
                }
            }
        }
    });
}

function renderComparisonNeedState(products) {
    const html = products.map(p => `
        <div style="padding: 15px; border: 2px solid var(--border-color); border-radius: 8px; margin-bottom: 10px;">
            <strong>${p.productInfo.name}</strong><br>
            <span style="display: inline-block; padding: 5px 10px; background: var(--primary-color); color: white; border-radius: 5px; margin-top: 5px;">
                ${p.needState.charAt(0).toUpperCase() + p.needState.slice(1)}
            </span>
        </div>
    `).join('');

    document.getElementById('comparison-need-state').innerHTML = html;
}

function renderComparisonTriggers(products) {
    const ctx = document.getElementById('comparison-triggers-chart').getContext('2d');

    destroyChart('comparisonTriggers');

    const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe'];

    const datasets = products.map((p, idx) => ({
        label: p.productInfo.name,
        data: [
            p.emotionalTriggers.moreishness,
            p.emotionalTriggers.refreshment,
            p.emotionalTriggers.melt,
            p.emotionalTriggers.crunch
        ],
        backgroundColor: colors[idx]
    }));

    charts.comparisonTriggers = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Moreishness', 'Refreshment', 'The Melt', 'Crunch'],
            datasets
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, max: 10 }
            }
        }
    });
}

// ===== NEW: COMPARISON SUMMARY CARDS =====
function renderComparisonSummaryCards(products) {
    const container = document.getElementById('comparison-summary-cards');

    // Calculate statistics
    const averages = products.map(p => {
        const allValues = [];
        // Collect all sensory values
        Object.values(p.stages).forEach(stage => {
            Object.entries(stage).forEach(([key, value]) => {
                if (typeof value === 'number' && key !== 'overallIntensity') {
                    allValues.push(value);
                }
            });
        });
        const avg = allValues.reduce((sum, v) => sum + v, 0) / allValues.length;
        return { product: p, avg: avg, allValues: allValues };
    });

    // Find highest rated
    const highest = averages.reduce((max, curr) => curr.avg > max.avg ? curr : max);

    // Find most consistent (lowest standard deviation)
    const withStdDev = averages.map(item => {
        const mean = item.avg;
        const variance = item.allValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / item.allValues.length;
        const stdDev = Math.sqrt(variance);
        return { ...item, stdDev };
    });
    const mostConsistent = withStdDev.reduce((min, curr) => curr.stdDev < min.stdDev ? curr : min);

    // Find strongest emotional impact
    const withEmotionSum = products.map(p => {
        let emotionSum = 0;
        Object.values(p.stages).forEach(stage => {
            if (stage.emotions) {
                Object.values(stage.emotions).forEach(val => emotionSum += val);
            }
        });
        return { product: p, emotionSum };
    });
    const strongestEmotion = withEmotionSum.reduce((max, curr) => curr.emotionSum > max.emotionSum ? curr : max);

    const html = `
        <div class="summary-card">
            <h4>🏆 Highest Rated</h4>
            <div class="value">${highest.product.productInfo.name}</div>
            <div class="label">Average: ${highest.avg.toFixed(1)}/10</div>
        </div>
        <div class="summary-card">
            <h4>📊 Most Consistent</h4>
            <div class="value">${mostConsistent.product.productInfo.name}</div>
            <div class="label">Std Dev: ${mostConsistent.stdDev.toFixed(2)}</div>
        </div>
        <div class="summary-card">
            <h4>💫 Strongest Emotions</h4>
            <div class="value">${strongestEmotion.product.productInfo.name}</div>
            <div class="label">Total Impact: ${strongestEmotion.emotionSum.toFixed(0)}</div>
        </div>
    `;

    container.innerHTML = html;
}

// ===== NEW: DETAILED ATTRIBUTE COMPARISON MATRIX =====
function renderComparisonAttributeMatrix(products) {
    const container = document.getElementById('comparison-attribute-matrix');

    // Define all attributes by stage
    const attributeStructure = [
        {
            stage: 'Appearance',
            attributes: [
                { key: 'visualAppeal', label: 'Visual Appeal' },
                { key: 'colorIntensity', label: 'Color Intensity' },
                { key: 'overallIntensity', label: 'Overall Intensity' }
            ],
            stageKey: 'appearance'
        },
        {
            stage: 'Aroma',
            attributes: [
                { key: 'intensity', label: 'Intensity' },
                { key: 'sweetness', label: 'Sweet Notes' },
                { key: 'complexity', label: 'Complexity' },
                { key: 'overallIntensity', label: 'Overall Intensity' }
            ],
            stageKey: 'aroma'
        },
        {
            stage: 'Front of Mouth',
            attributes: [
                { key: 'sweetness', label: 'Sweetness' },
                { key: 'sourness', label: 'Sourness' },
                { key: 'saltiness', label: 'Saltiness' },
                { key: 'texture', label: 'Texture Impact' },
                { key: 'overallIntensity', label: 'Overall Intensity' }
            ],
            stageKey: 'frontMouth'
        },
        {
            stage: 'Mid/Rear Mouth',
            attributes: [
                { key: 'bitterness', label: 'Bitterness' },
                { key: 'umami', label: 'Umami' },
                { key: 'richness', label: 'Richness' },
                { key: 'creaminess', label: 'Creaminess' },
                { key: 'overallIntensity', label: 'Overall Intensity' }
            ],
            stageKey: 'midRearMouth'
        },
        {
            stage: 'Aftertaste',
            attributes: [
                { key: 'duration', label: 'Duration' },
                { key: 'pleasantness', label: 'Pleasantness' },
                { key: 'cleanness', label: 'Palate Cleanness' },
                { key: 'overallIntensity', label: 'Overall Intensity' }
            ],
            stageKey: 'aftertaste'
        }
    ];

    // Build table header
    let tableHTML = '<table class="comparison-table"><thead><tr>';
    tableHTML += '<th style="min-width: 200px;">Attribute</th>';
    products.forEach(p => {
        tableHTML += `<th class="product-col">${p.productInfo.name}</th>`;
    });
    tableHTML += '<th class="delta-col">Δ Range</th>';
    tableHTML += '</tr></thead><tbody>';

    // Build table rows
    attributeStructure.forEach(section => {
        // Stage header
        tableHTML += `<tr class="stage-header"><td colspan="${products.length + 2}">${section.stage}</td></tr>`;

        // Attributes
        section.attributes.forEach(attr => {
            tableHTML += '<tr>';
            tableHTML += `<td class="attribute-name">${attr.label}</td>`;

            // Get values for all products
            const values = products.map(p => p.stages[section.stageKey][attr.key] || 0);
            const max = Math.max(...values);
            const min = Math.min(...values);
            const range = max - min;
            const isSignificant = range >= 1.5;

            // Product value cells
            values.forEach(value => {
                const roundedValue = Math.round(value);
                tableHTML += `<td class="value-cell" data-value="${roundedValue}">${value.toFixed(1)}</td>`;
            });

            // Delta cell
            const deltaClass = isSignificant ? 'delta-significant' : '';
            const arrow = range > 0 ? (max === values[0] ? '⬆' : '⬇') : '–';
            tableHTML += `<td class="delta-cell ${deltaClass}">`;
            if (range > 0) {
                tableHTML += `<span class="delta-arrow">${arrow}</span>${range.toFixed(1)}`;
            } else {
                tableHTML += '–';
            }
            tableHTML += '</td>';

            tableHTML += '</tr>';
        });
    });

    tableHTML += '</tbody></table>';
    container.innerHTML = tableHTML;
}

// ===== NEW: EMOTIONAL RADAR OVERLAY =====
function renderComparisonEmotionRadar(products) {
    const ctx = document.getElementById('comparison-emotion-radar').getContext('2d');

    destroyChart('comparisonEmotionRadar');

    // Collect all unique emotions across all products
    const emotionSet = new Set();
    products.forEach(p => {
        Object.values(p.stages).forEach(stage => {
            if (stage.emotions) {
                Object.keys(stage.emotions).forEach(emotion => emotionSet.add(emotion));
            }
        });
    });

    // Convert to array and sort
    const emotions = Array.from(emotionSet).sort();

    // Define colors for each product (matching other charts)
    const colors = [
        { border: '#667eea', bg: 'rgba(102, 126, 234, 0.2)' },
        { border: '#764ba2', bg: 'rgba(118, 75, 162, 0.2)' },
        { border: '#f093fb', bg: 'rgba(240, 147, 251, 0.2)' },
        { border: '#4facfe', bg: 'rgba(79, 172, 254, 0.2)' }
    ];

    // Create datasets - one per product
    const datasets = products.map((product, idx) => {
        // For each emotion, find the highest value across all stages
        const emotionValues = emotions.map(emotion => {
            let maxValue = 0;
            Object.values(product.stages).forEach(stage => {
                if (stage.emotions && stage.emotions[emotion]) {
                    maxValue = Math.max(maxValue, stage.emotions[emotion]);
                }
            });
            return maxValue;
        });

        return {
            label: product.productInfo.name,
            data: emotionValues,
            borderColor: colors[idx].border,
            backgroundColor: colors[idx].bg,
            borderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: colors[idx].border,
            pointBorderColor: '#fff',
            pointBorderWidth: 2
        };
    });

    charts.comparisonEmotionRadar = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: emotions,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 10,
                    ticks: {
                        stepSize: 2,
                        font: {
                            size: 11
                        }
                    },
                    pointLabels: {
                        font: {
                            size: 12,
                            weight: '600'
                        },
                        color: '#2c3e50'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 13,
                            weight: '500'
                        },
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.r.toFixed(1) + '/10';
                        }
                    }
                }
            }
        }
    });
}

// ===== NEW: EMOTIONAL INTENSITY HEATMAP =====
function renderComparisonEmotionHeatmap(products) {
    const container = document.getElementById('comparison-emotion-heatmap');

    // Collect all unique emotions across all products
    const emotionSet = new Set();
    products.forEach(p => {
        Object.values(p.stages).forEach(stage => {
            if (stage.emotions) {
                Object.keys(stage.emotions).forEach(emotion => emotionSet.add(emotion));
            }
        });
    });

    // Convert to array and sort
    const emotions = Array.from(emotionSet).sort();

    // Build table header
    let tableHTML = '<table class="heatmap-table"><thead><tr>';
    tableHTML += '<th class="product-header">Product</th>';
    emotions.forEach(emotion => {
        tableHTML += `<th>${emotion}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';

    // Build rows - one per product
    products.forEach(product => {
        tableHTML += '<tr>';
        tableHTML += `<td class="product-name">${product.productInfo.name}</td>`;

        // For each emotion, find the highest value across all stages
        emotions.forEach(emotion => {
            let maxValue = 0;
            Object.values(product.stages).forEach(stage => {
                if (stage.emotions && stage.emotions[emotion]) {
                    maxValue = Math.max(maxValue, stage.emotions[emotion]);
                }
            });

            const intensity = Math.round(maxValue);
            tableHTML += `<td class="heatmap-cell" data-intensity="${intensity}">${maxValue.toFixed(1)}</td>`;
        });

        tableHTML += '</tr>';
    });

    tableHTML += '</tbody></table>';

    // Add legend
    tableHTML += `
        <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <strong style="display: block; margin-bottom: 10px;">Intensity Scale:</strong>
            <div style="display: flex; align-items: center; gap: 5px; flex-wrap: wrap;">
                <span style="padding: 8px 12px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; font-size: 0.85rem;">0-1 Low</span>
                <span style="padding: 8px 12px; background: #bbdefb; color: #1565c0; border-radius: 4px; font-size: 0.85rem;">2-4 Moderate</span>
                <span style="padding: 8px 12px; background: #64b5f6; color: #0d47a1; border-radius: 4px; font-size: 0.85rem;">5-7 Strong</span>
                <span style="padding: 8px 12px; background: #2196f3; color: white; border-radius: 4px; font-size: 0.85rem; font-weight: bold;">8-10 Very Strong</span>
            </div>
            <p style="margin-top: 10px; font-size: 0.85rem; color: var(--text-light);">
                Hover over cells to see exact values. Darker blue indicates stronger emotional intensity.
            </p>
        </div>
    `;

    container.innerHTML = tableHTML;
}

// ===== INSIGHTS =====
function updateInsights() {
    const container = document.getElementById('insights-container');

    if (experiences.length === 0) {
        container.innerHTML = '<p class="empty-state">Log experiences to generate insights</p>';
        return;
    }

    const insights = generateProfessionalInsights();
    container.innerHTML = insights.map(i => `
        <div class="insight-item">
            <strong>${i.title}</strong>
            <p>${i.description}</p>
        </div>
    `).join('');
}

function generateProfessionalInsights() {
    const insights = [];

    // Portfolio Overview
    insights.push({
        title: 'Portfolio Overview',
        description: `You have analyzed ${experiences.length} product experience${experiences.length !== 1 ? 's' : ''} across ${new Set(experiences.map(e => e.productInfo.type)).size} categories.`
    });

    // Need State Analysis
    const needStateCounts = {};
    experiences.forEach(e => {
        needStateCounts[e.needState] = (needStateCounts[e.needState] || 0) + 1;
    });
    const dominantNeed = Object.keys(needStateCounts).reduce((a, b) =>
        needStateCounts[a] > needStateCounts[b] ? a : b);
    insights.push({
        title: 'Need State Focus',
        description: `Your product portfolio primarily serves <strong>${dominantNeed}</strong> occasions (${((needStateCounts[dominantNeed] / experiences.length) * 100).toFixed(0)}% of products).`
    });

    // Emotional Trigger Analysis
    const avgTriggers = {
        moreishness: experiences.reduce((sum, e) => sum + e.emotionalTriggers.moreishness, 0) / experiences.length,
        refreshment: experiences.reduce((sum, e) => sum + e.emotionalTriggers.refreshment, 0) / experiences.length,
        melt: experiences.reduce((sum, e) => sum + e.emotionalTriggers.melt, 0) / experiences.length,
        crunch: experiences.reduce((sum, e) => sum + e.emotionalTriggers.crunch, 0) / experiences.length
    };
    const topTrigger = Object.keys(avgTriggers).reduce((a, b) =>
        avgTriggers[a] > avgTriggers[b] ? a : b);
    insights.push({
        title: 'Emotional Driver',
        description: `<strong>${topTrigger.charAt(0).toUpperCase() + topTrigger.slice(1)}</strong> is your strongest emotional trigger (avg: ${avgTriggers[topTrigger].toFixed(1)}/10).`
    });

    // Journey Pattern
    const avgJourney = {
        appearance: experiences.reduce((sum, e) => sum + e.stages.appearance.overallIntensity, 0) / experiences.length,
        aroma: experiences.reduce((sum, e) => sum + e.stages.aroma.overallIntensity, 0) / experiences.length,
        front: experiences.reduce((sum, e) => sum + e.stages.frontMouth.overallIntensity, 0) / experiences.length,
        mid: experiences.reduce((sum, e) => sum + e.stages.midRearMouth.overallIntensity, 0) / experiences.length,
        after: experiences.reduce((sum, e) => sum + e.stages.aftertaste.overallIntensity, 0) / experiences.length
    };
    const peakStage = Object.keys(avgJourney).reduce((a, b) =>
        avgJourney[a] > avgJourney[b] ? a : b);
    const stageNames = {
        appearance: 'Appearance',
        aroma: 'Aroma',
        front: 'Front of Mouth',
        mid: 'Mid/Rear Mouth',
        after: 'Aftertaste'
    };
    insights.push({
        title: 'Journey Peak',
        description: `Products typically peak in intensity at <strong>${stageNames[peakStage]}</strong> stage (avg: ${avgJourney[peakStage].toFixed(1)}/10).`
    });

    // Top Performer
    const topProduct = experiences.reduce((max, e) =>
        e.stages.aftertaste.emotions.satisfaction > max.stages.aftertaste.emotions.satisfaction ? e : max);
    insights.push({
        title: 'Top Performer',
        description: `<strong>${topProduct.productInfo.name}</strong> by ${topProduct.productInfo.brand} achieves the highest satisfaction (${topProduct.stages.aftertaste.emotions.satisfaction}/10).`
    });

    return insights;
}

// ===== HISTORY =====
function updateHistory() {
    const container = document.getElementById('history-list');

    if (experiences.length === 0) {
        container.innerHTML = '<p class="empty-state">No experiences logged yet</p>';
        return;
    }

    container.innerHTML = experiences
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .map(e => `
            <div class="history-item">
                <div class="history-item-header">
                    <div>
                        <span class="history-item-title">${e.productInfo.name}</span>
                        <span class="history-item-brand">${e.productInfo.brand}</span>
                        <span class="history-item-type">${e.productInfo.type}</span>
                    </div>
                    <div>
                        <span class="history-item-date">${new Date(e.timestamp).toLocaleDateString()}</span>
                        <button class="delete-btn" onclick="deleteExperience(${e.id})">Delete</button>
                    </div>
                </div>
                <div style="margin-top: 10px; font-size: 0.9rem;">
                    <strong>Need State:</strong> ${e.needState.charAt(0).toUpperCase() + e.needState.slice(1)}<br>
                    <strong>Satisfaction:</strong> ${e.stages.aftertaste.emotions.satisfaction}/10
                    ${e.productInfo.occasion && e.productInfo.occasion !== 'Not specified' ? `<br><strong>Occasion:</strong> ${e.productInfo.occasion.replace('-', ' ')}` : ''}
                    ${e.productInfo.temperature && e.productInfo.temperature !== 'Not specified' ? `<br><strong>Temperature:</strong> ${e.productInfo.temperature.replace('-', ' ')}` : ''}
                </div>
                ${e.notes ? `<div class="history-item-notes">${e.notes}</div>` : ''}
            </div>
        `).join('');
}

function deleteExperience(id) {
    if (confirm('Are you sure you want to delete this experience?')) {
        experiences = experiences.filter(e => e.id !== id);
        saveData();
        updateHistory();
        updateDashboard();
    }
}

// ===== DATA EXPORT =====
const exportDataBtn = document.getElementById('export-data');
if (exportDataBtn) {
    exportDataBtn.addEventListener('click', () => {
        const dataStr = JSON.stringify(experiences, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `taste-signature-export-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    });
}

// ===== CLEAR DATA =====
document.getElementById('clear-data').addEventListener('click', () => {
    if (confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
        experiences = [];
        saveData();
        updateHistory();
        updateDashboard();
        Object.values(charts).forEach(chart => chart && chart.destroy());
        charts = {};
    }
});

// ===== IMPORT FUNCTIONALITY =====
function initImport() {
    const fileInput = document.getElementById('file-input');
    const uploadArea = document.getElementById('file-upload-area');
    const btnLoadSample = document.getElementById('btn-load-sample-data');
    const btnConfirmImport = document.getElementById('btn-confirm-import');
    const btnCancelImport = document.getElementById('btn-cancel-import');

    // File input change - with null check
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }

    // Drag and drop - with null check
    if (uploadArea) {
        uploadArea.addEventListener('click', () => fileInput && fileInput.click());
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFiles(files);
            }
        });
    }

    // Load sample data - with null check
    if (btnLoadSample) {
        btnLoadSample.addEventListener('click', () => {
            if (confirm(`This will load ${SAMPLE_FLAVOR_CONCEPTS.length} sample flavor concepts. Continue?`)) {
                const mappedExperiences = SAMPLE_FLAVOR_CONCEPTS.map(concept =>
                    mapFlavorConceptToExperience(concept)
                );
                experiences.push(...mappedExperiences);
                saveData();
                updateDashboard();

                const statusDiv = document.getElementById('import-status');
                if (statusDiv) {
                    statusDiv.innerHTML = `<div class="success">Successfully imported ${mappedExperiences.length} flavor concepts!</div>`;
                    setTimeout(() => {
                        statusDiv.innerHTML = '';
                    }, 5000);
                }
            }
        });
    }

    // Confirm import - with null check
    if (btnConfirmImport) {
        btnConfirmImport.addEventListener('click', () => {
            if (pendingImportData.length > 0) {
                experiences.push(...pendingImportData);
                saveData();
                updateDashboard();

                const statusDiv = document.getElementById('import-status');
                if (statusDiv) {
                    statusDiv.innerHTML = `<div class="success">Successfully imported ${pendingImportData.length} experiences!</div>`;
                    setTimeout(() => {
                        statusDiv.innerHTML = '';
                    }, 5000);
                }

                // Reset
                pendingImportData = [];
                const previewDiv = document.getElementById('import-preview');
                if (previewDiv) previewDiv.style.display = 'none';
            }
        });
    }

    // Cancel import - with null check
    if (btnCancelImport) {
        btnCancelImport.addEventListener('click', () => {
            pendingImportData = [];
            const previewDiv = document.getElementById('import-preview');
            if (previewDiv) previewDiv.style.display = 'none';
        });
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        handleFiles(files);
    }
}

function handleFiles(files) {
    const file = files[0]; // Handle first file
    const statusDiv = document.getElementById('import-status');

    if (file.name.endsWith('.json')) {
        handleFileImport(file, processImportedData);
    } else if (file.name.endsWith('.csv')) {
        handleFileImport(file, processImportedData);
    } else {
        statusDiv.innerHTML = '<div class="error">Unsupported file format. Please use CSV or JSON files.</div>';
    }
}

function processImportedData(importedExperiences) {
    if (!importedExperiences || importedExperiences.length === 0) {
        const statusDiv = document.getElementById('import-status');
        statusDiv.innerHTML = '<div class="error">No valid data found in file.</div>';
        return;
    }

    pendingImportData = importedExperiences;

    // Show preview
    const previewDiv = document.getElementById('import-preview');
    const previewContent = document.getElementById('import-preview-content');
    const importCount = document.getElementById('import-count');

    previewContent.innerHTML = importedExperiences.slice(0, 5).map((exp, idx) => `
        <div class="preview-item">
            <div class="preview-item-number">${idx + 1}</div>
            <div class="preview-item-details">
                <strong>${exp.productInfo.name}</strong>
                <small>Type: ${exp.productInfo.type} | Need State: ${exp.needState}</small>
                <small>Triggers: Moreishness ${exp.emotionalTriggers.moreishness}/10, Refreshment ${exp.emotionalTriggers.refreshment}/10</small>
            </div>
        </div>
    `).join('');

    if (importedExperiences.length > 5) {
        previewContent.innerHTML += `<p style="text-align: center; color: var(--text-light); margin-top: 15px;">...and ${importedExperiences.length - 5} more</p>`;
    }

    importCount.textContent = importedExperiences.length;
    previewDiv.style.display = 'block';
}

// ===== EMOTIONAL MAPPING & CORRELATION =====
function updateEmotionalMappingView() {
    const select = document.getElementById('emotional-product-select');
    select.innerHTML = '<option value="">Choose a product...</option>' +
        experiences.map(e => `<option value="${e.id}">${e.productInfo.name} - ${e.productInfo.brand}</option>`).join('');

    select.onchange = function() {
        const exp = experiences.find(e => e.id == this.value);
        if (exp) {
            renderEmotionalMap(exp);
            renderShapeOfEmotion(exp);
            renderEmotionalProfileRadar(exp);
            renderCorrelationHeatmap(exp);
            renderCorrelationInsights(exp);
            renderEmotionalDriversInsights(exp);
        }
    };

    // If no product selected, show aggregate analysis
    if (experiences.length > 0) {
        renderAggregateCorrelationHeatmap();
    }

    // Initialize tour button
    initEmotionalMappingTour();
}

function initEmotionalMappingTour() {
    const tourBtn = document.getElementById('btn-start-tour');
    if (!tourBtn) return;

    tourBtn.onclick = function() {
        const steps = document.querySelectorAll('.help-tooltip');
        let currentStep = 0;

        function showStep(index) {
            // Remove previous highlights
            document.querySelectorAll('.tour-highlight').forEach(el => {
                el.classList.remove('tour-highlight');
            });

            if (index >= steps.length) {
                alert('Tour complete! Hover over the ? icons anytime for help.');
                return;
            }

            const step = steps[index];
            const card = step.closest('.card');
            if (card) {
                card.classList.add('tour-highlight');
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Show tooltip
                const tooltipText = step.querySelector('.tooltip-text');
                tooltipText.style.visibility = 'visible';
                tooltipText.style.opacity = '1';

                // Auto-advance after 4 seconds
                setTimeout(() => {
                    tooltipText.style.visibility = 'hidden';
                    tooltipText.style.opacity = '0';
                    card.classList.remove('tour-highlight');
                    showStep(index + 1);
                }, 4000);
            }
        }

        showStep(0);
    };
}

function renderEmotionalMap(exp) {
    const ctx = document.getElementById('emotional-map-chart').getContext('2d');
    destroyChart('emotionalMap');

    // Collect all unique emotions from the experience
    const emotionsByStage = {
        'Appearance': exp.stages.appearance.emotions,
        'Aroma': exp.stages.aroma.emotions,
        'Front': exp.stages.frontMouth.emotions,
        'Mid/Rear': exp.stages.midRearMouth.emotions,
        'Aftertaste': exp.stages.aftertaste.emotions
    };

    // Get all unique emotion types
    const emotionTypes = new Set();
    Object.values(emotionsByStage).forEach(emotions => {
        Object.keys(emotions).forEach(emotion => emotionTypes.add(emotion));
    });

    // Create datasets for each emotion type
    const datasets = Array.from(emotionTypes).map((emotion, idx) => {
        const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe', '#43e97b'];
        return {
            label: emotion.charAt(0).toUpperCase() + emotion.slice(1),
            data: Object.keys(emotionsByStage).map(stage =>
                emotionsByStage[stage][emotion] || 0
            ),
            borderColor: colors[idx % colors.length],
            backgroundColor: colors[idx % colors.length] + '20',
            borderWidth: 2,
            fill: false,
            tension: 0.4
        };
    });

    charts.emotionalMap = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Object.keys(emotionsByStage),
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    title: {
                        display: true,
                        text: 'Emotional Intensity (0-10)'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'All Emotions Across Journey',
                    font: { size: 16 }
                }
            }
        }
    });
}

function renderShapeOfEmotion(exp) {
    const ctx = document.getElementById('shape-emotion-chart').getContext('2d');
    destroyChart('shapeEmotion');

    // Calculate average emotional intensity per stage
    const avgByStage = {
        'Appearance': calculateAvgEmotions(exp.stages.appearance.emotions),
        'Aroma': calculateAvgEmotions(exp.stages.aroma.emotions),
        'Front': calculateAvgEmotions(exp.stages.frontMouth.emotions),
        'Mid/Rear': calculateAvgEmotions(exp.stages.midRearMouth.emotions),
        'Aftertaste': calculateAvgEmotions(exp.stages.aftertaste.emotions)
    };

    charts.shapeEmotion = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Object.keys(avgByStage),
            datasets: [{
                label: 'Average Emotional Intensity',
                data: Object.values(avgByStage),
                borderColor: '#764ba2',
                backgroundColor: 'rgba(118, 75, 162, 0.2)',
                borderWidth: 4,
                fill: true,
                tension: 0.4,
                pointRadius: 8,
                pointBackgroundColor: '#764ba2',
                pointBorderColor: '#fff',
                pointBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    title: {
                        display: true,
                        text: 'Emotional Intensity'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function calculateAvgEmotions(emotions) {
    const values = Object.values(emotions);
    return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function renderEmotionalProfileRadar(exp) {
    const ctx = document.getElementById('emotional-profile-radar').getContext('2d');
    destroyChart('emotionalRadar');

    // Aggregate all emotions across all stages
    const allEmotions = {};
    Object.values(exp.stages).forEach(stage => {
        if (stage.emotions) {
            Object.entries(stage.emotions).forEach(([emotion, value]) => {
                if (!allEmotions[emotion]) allEmotions[emotion] = [];
                allEmotions[emotion].push(value);
            });
        }
    });

    // Calculate averages
    const emotionAverages = {};
    Object.entries(allEmotions).forEach(([emotion, values]) => {
        emotionAverages[emotion] = values.reduce((sum, val) => sum + val, 0) / values.length;
    });

    charts.emotionalRadar = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: Object.keys(emotionAverages).map(e =>
                e.charAt(0).toUpperCase() + e.slice(1)
            ),
            datasets: [{
                label: 'Emotional Profile',
                data: Object.values(emotionAverages),
                backgroundColor: 'rgba(118, 75, 162, 0.2)',
                borderColor: '#764ba2',
                borderWidth: 2,
                pointBackgroundColor: '#764ba2',
                pointBorderColor: '#fff',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 10
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function renderCorrelationHeatmap(exp) {
    const container = document.getElementById('correlation-heatmap');

    // Get all sensory attributes
    const sensoryAttributes = {
        'Visual Appeal': exp.stages.appearance.visualAppeal,
        'Color Intensity': exp.stages.appearance.colorIntensity,
        'Aroma Intensity': exp.stages.aroma.intensity,
        'Sweetness': exp.stages.frontMouth.sweetness,
        'Sourness': exp.stages.frontMouth.sourness,
        'Saltiness': exp.stages.frontMouth.saltiness,
        'Bitterness': exp.stages.midRearMouth.bitterness,
        'Umami': exp.stages.midRearMouth.umami,
        'Richness': exp.stages.midRearMouth.richness,
        'Texture': exp.stages.frontMouth.texture
    };

    // Get all emotional outcomes
    const emotions = {};
    Object.values(exp.stages).forEach(stage => {
        if (stage.emotions) {
            Object.entries(stage.emotions).forEach(([emotion, value]) => {
                if (!emotions[emotion]) {
                    emotions[emotion] = value;
                } else {
                    emotions[emotion] = Math.max(emotions[emotion], value); // Take max
                }
            });
        }
    });

    // Build HTML table
    let html = `
        <div class="correlation-disclaimer">
            <strong>Note:</strong> Correlation strength is calculated as a normalized product of sensory and emotional intensities.
            For statistical Pearson correlation, multiple product tastings are required. This view shows directional relationships within a single tasting.
        </div>
        <table class="heatmap-table"><thead><tr><th>Sensory → Emotional</th>`;

    Object.keys(emotions).forEach(emotion => {
        html += `<th>${emotion.charAt(0).toUpperCase() + emotion.slice(1)}</th>`;
    });
    html += '</tr></thead><tbody>';

    Object.entries(sensoryAttributes).forEach(([sensory, sensoryValue]) => {
        html += `<tr><td>${sensory}</td>`;
        Object.entries(emotions).forEach(([emotion, emotionValue]) => {
            // Calculate normalized correlation strength (0-1 scale)
            // Formula: (sensory/10) * (emotion/10) - represents combined intensity
            const correlation = (sensoryValue * emotionValue) / 100;
            const correlationClass = getCorrelationClass(correlation);
            html += `<td><div class="heatmap-cell ${correlationClass}" title="${sensory} × ${emotion}: ${correlation.toFixed(2)}">${correlation.toFixed(2)}</div></td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table>';

    // Add legend
    html += `
        <div class="correlation-legend">
            <div class="legend-item">
                <div class="legend-color correlation-strong-positive"></div>
                <span>Strong (&gt;0.7) - Both attributes highly present</span>
            </div>
            <div class="legend-item">
                <div class="legend-color correlation-moderate-positive"></div>
                <span>Moderate (0.4-0.7) - Notable relationship</span>
            </div>
            <div class="legend-item">
                <div class="legend-color correlation-weak-positive"></div>
                <span>Weak (0.2-0.4) - Minor connection</span>
            </div>
            <div class="legend-item">
                <div class="legend-color correlation-neutral"></div>
                <span>Neutral (0-0.2) - Little to no relationship</span>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function getCorrelationClass(value) {
    if (value >= 0.7) return 'correlation-strong-positive';
    if (value >= 0.4) return 'correlation-moderate-positive';
    if (value >= 0.2) return 'correlation-weak-positive';
    return 'correlation-neutral';
}

function renderEmotionalDriversInsights(exp) {
    const container = document.getElementById('emotional-drivers-insights');

    // Aggregate all emotions
    const allEmotions = {};
    Object.values(exp.stages).forEach(stage => {
        if (stage.emotions) {
            Object.entries(stage.emotions).forEach(([emotion, value]) => {
                if (!allEmotions[emotion]) allEmotions[emotion] = [];
                allEmotions[emotion].push(value);
            });
        }
    });

    // Calculate averages and sort
    const emotionAverages = Object.entries(allEmotions)
        .map(([emotion, values]) => ({
            emotion,
            average: values.reduce((sum, val) => sum + val, 0) / values.length,
            peak: Math.max(...values),
            stages: values.length
        }))
        .sort((a, b) => b.average - a.average);

    let html = '';
    emotionAverages.slice(0, 5).forEach((item, idx) => {
        html += `
            <div class="driver-item">
                <h4>#${idx + 1} ${item.emotion.charAt(0).toUpperCase() + item.emotion.slice(1)}</h4>
                <div class="driver-strength">
                    <span>Average:</span>
                    <div class="strength-bar">
                        <div class="strength-fill" style="width: ${(item.average / 10) * 100}%"></div>
                    </div>
                    <span class="strength-value">${item.average.toFixed(1)}/10</span>
                </div>
                <p>Peak: ${item.peak}/10 | Present in ${item.stages} stages</p>
            </div>
        `;
    });

    container.innerHTML = html;
}

function renderCorrelationInsights(exp) {
    const container = document.getElementById('correlation-insights');
    if (!container) return;

    // Get all sensory attributes
    const sensoryAttributes = {
        'Visual Appeal': exp.stages.appearance.visualAppeal,
        'Color Intensity': exp.stages.appearance.colorIntensity,
        'Aroma Intensity': exp.stages.aroma.intensity,
        'Sweetness': exp.stages.frontMouth.sweetness,
        'Sourness': exp.stages.frontMouth.sourness,
        'Saltiness': exp.stages.frontMouth.saltiness,
        'Bitterness': exp.stages.midRearMouth.bitterness,
        'Umami': exp.stages.midRearMouth.umami,
        'Richness': exp.stages.midRearMouth.richness,
        'Texture': exp.stages.frontMouth.texture
    };

    // Get all emotional outcomes
    const emotions = {};
    Object.values(exp.stages).forEach(stage => {
        if (stage.emotions) {
            Object.entries(stage.emotions).forEach(([emotion, value]) => {
                if (!emotions[emotion]) {
                    emotions[emotion] = value;
                } else {
                    emotions[emotion] = Math.max(emotions[emotion], value);
                }
            });
        }
    });

    // Find top correlations
    const correlations = [];
    Object.entries(sensoryAttributes).forEach(([sensory, sensoryValue]) => {
        Object.entries(emotions).forEach(([emotion, emotionValue]) => {
            const strength = (sensoryValue * emotionValue) / 100;
            if (strength >= 0.4) { // Only show moderate or higher
                correlations.push({
                    sensory,
                    emotion,
                    strength,
                    category: strength >= 0.7 ? 'strong' : 'moderate'
                });
            }
        });
    });

    // Sort by strength
    correlations.sort((a, b) => b.strength - a.strength);

    // Generate insights HTML
    let html = '<h4>🎯 Key Insights</h4><ul>';

    if (correlations.length === 0) {
        html += '<li>No strong correlations detected. Product shows balanced, subtle sensory-emotional relationships.</li>';
    } else {
        correlations.slice(0, 5).forEach(corr => {
            const icon = corr.category === 'strong' ? '🔥' : '⭐';
            const strengthClass = corr.category === 'strong' ? 'strong' : 'moderate';
            const actionText = getActionableInsight(corr.sensory, corr.emotion, corr.category);

            html += `
                <li>
                    <span class="insight-icon">${icon}</span>
                    <span><strong>${corr.sensory}</strong> drives <strong>${corr.emotion}</strong>
                    <span class="insight-strength ${strengthClass}">${corr.strength.toFixed(2)}</span></span>
                </li>
            `;
        });

        // Add strategic recommendation
        const topCorr = correlations[0];
        html += '</ul>';
        html += `<div style="margin-top: 15px; padding: 12px; background: rgba(76, 175, 80, 0.1); border-radius: 6px;">
            <strong>💡 Formulation Tip:</strong> ${getActionableInsight(topCorr.sensory, topCorr.emotion, topCorr.category)}
        </div>`;
    }

    container.innerHTML = html;
}

function getActionableInsight(sensory, emotion, category) {
    const insights = {
        'Sweetness-happiness': 'Maintain sweetness levels to preserve positive mood impact',
        'Sweetness-pleasure': 'Sugar level is critical for enjoyment - test threshold carefully',
        'Bitterness-indulgence': 'Bitterness creates premium perception - leverage for positioning',
        'Richness-satisfaction': 'Rich mouthfeel drives contentment - key differentiator',
        'Richness-indulgence': 'Enhance richness for luxury positioning',
        'Sourness-excitement': 'Tartness creates energy - great for morning/active occasions',
        'Texture-excitement': 'Textural contrast drives engagement - maintain crunch/melt',
        'Aroma Intensity-anticipation': 'Strong aroma builds desire - optimize packaging to preserve',
        'Visual Appeal-desire': 'Appearance drives purchase intent - prioritize presentation'
    };

    const key = `${sensory}-${emotion}`;
    return insights[key] || `Strong ${sensory.toLowerCase()} drives ${emotion} - optimize this attribute for emotional impact.`;
}

function renderAggregateCorrelationHeatmap() {
    // Simplified aggregate version when no product selected
    const container = document.getElementById('correlation-heatmap');
    container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 40px;">Select a product to see detailed sensory-emotional correlations</p>';

    const insightsContainer = document.getElementById('correlation-insights');
    if (insightsContainer) {
        insightsContainer.innerHTML = '';
    }
}

// ===== PORTFOLIO CLUSTERING =====
function updatePortfolioView() {
    if (experiences.length < 2) {
        document.getElementById('white-space-analysis').innerHTML = '<p class="empty-state">Log at least 2 products to see portfolio clustering</p>';
        document.getElementById('diversity-score').innerHTML = '<p class="empty-state">Insufficient data</p>';
        document.getElementById('cluster-insights').innerHTML = '<p class="empty-state">Insufficient data</p>';
        return;
    }

    // Initialize axis controls
    const xAxis = document.getElementById('cluster-x-axis');
    const yAxis = document.getElementById('cluster-y-axis');

    xAxis.onchange = () => renderPortfolioCluster();
    yAxis.onchange = () => renderPortfolioCluster();

    renderPortfolioCluster();
    renderWhiteSpaceAnalysis();
    renderDiversityScore();
    renderClusterInsights();
}

function renderPortfolioCluster() {
    const ctx = document.getElementById('portfolio-cluster-chart').getContext('2d');
    destroyChart('portfolioCluster');

    const xAxisEmotion = document.getElementById('cluster-x-axis').value;
    const yAxisEmotion = document.getElementById('cluster-y-axis').value;

    // Calculate emotion scores for each product
    const productPoints = experiences.map(exp => {
        const emotionScores = calculateEmotionScores(exp);
        return {
            x: emotionScores[xAxisEmotion] || 5,
            y: emotionScores[yAxisEmotion] || 5,
            label: exp.productInfo.name,
            needState: exp.needState
        };
    });

    // Color by need state
    const needStateColors = {
        'reward': '#667eea',
        'escape': '#764ba2',
        'rejuvenation': '#4facfe',
        'sociability': '#f093fb'
    };

    const datasets = Object.keys(needStateColors).map(needState => {
        const points = productPoints.filter(p => p.needState === needState);
        return {
            label: needState.charAt(0).toUpperCase() + needState.slice(1),
            data: points,
            backgroundColor: needStateColors[needState],
            borderColor: needStateColors[needState],
            borderWidth: 2,
            pointRadius: 8,
            pointHoverRadius: 12
        };
    });

    charts.portfolioCluster = new Chart(ctx, {
        type: 'scatter',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: xAxisEmotion.charAt(0).toUpperCase() + xAxisEmotion.slice(1) + ' Intensity',
                        font: { size: 14, weight: 'bold' }
                    },
                    min: 0,
                    max: 10,
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: yAxisEmotion.charAt(0).toUpperCase() + yAxisEmotion.slice(1) + ' Intensity',
                        font: { size: 14, weight: 'bold' }
                    },
                    min: 0,
                    max: 10,
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const point = context.raw;
                            return `${point.label}: (${point.x.toFixed(1)}, ${point.y.toFixed(1)})`;
                        }
                    }
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });
}

function calculateEmotionScores(exp) {
    const allEmotions = {};

    Object.values(exp.stages).forEach(stage => {
        if (stage.emotions) {
            Object.entries(stage.emotions).forEach(([emotion, value]) => {
                if (!allEmotions[emotion]) {
                    allEmotions[emotion] = [];
                }
                allEmotions[emotion].push(value);
            });
        }
    });

    // Calculate averages
    const emotionScores = {};
    Object.entries(allEmotions).forEach(([emotion, values]) => {
        emotionScores[emotion] = values.reduce((sum, val) => sum + val, 0) / values.length;
    });

    return emotionScores;
}

function renderWhiteSpaceAnalysis() {
    const container = document.getElementById('white-space-analysis');

    // Define 2x2 quadrants
    const quadrants = {
        'High Indulgence / High Excitement': { count: 0, products: [] },
        'High Indulgence / Low Excitement': { count: 0, products: [] },
        'Low Indulgence / High Excitement': { count: 0, products: [] },
        'Low Indulgence / Low Excitement': { count: 0, products: [] }
    };

    experiences.forEach(exp => {
        const scores = calculateEmotionScores(exp);
        const indulgence = scores.indulgence || 5;
        const excitement = scores.excitement || 5;

        const highIndulgence = indulgence >= 6;
        const highExcitement = excitement >= 6;

        let quadrant;
        if (highIndulgence && highExcitement) {
            quadrant = 'High Indulgence / High Excitement';
        } else if (highIndulgence && !highExcitement) {
            quadrant = 'High Indulgence / Low Excitement';
        } else if (!highIndulgence && highExcitement) {
            quadrant = 'Low Indulgence / High Excitement';
        } else {
            quadrant = 'Low Indulgence / Low Excitement';
        }

        quadrants[quadrant].count++;
        quadrants[quadrant].products.push(exp.productInfo.name);
    });

    let html = '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">';

    Object.entries(quadrants).forEach(([quadrant, data]) => {
        const isEmpty = data.count === 0;
        const bgColor = isEmpty ? 'rgba(76, 175, 80, 0.1)' : 'rgba(200, 200, 200, 0.1)';
        const borderColor = isEmpty ? 'var(--success-color)' : 'var(--border-color)';

        html += `
            <div style="padding: 15px; border: 2px solid ${borderColor}; border-radius: 8px; background: ${bgColor};">
                <strong style="color: ${isEmpty ? 'var(--success-color)' : 'var(--text-dark)'};">
                    ${isEmpty ? '✨ ' : ''}${quadrant}
                </strong>
                <div style="margin-top: 8px; font-size: 0.9rem;">
                    ${isEmpty ?
                        '<span style="color: var(--success-color); font-weight: 600;">WHITE SPACE OPPORTUNITY</span>' :
                        `<span>${data.count} product${data.count !== 1 ? 's' : ''}</span>`
                    }
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

function renderDiversityScore() {
    const container = document.getElementById('diversity-score');

    // Calculate diversity based on need state distribution
    const needStateCounts = {};
    experiences.forEach(e => {
        needStateCounts[e.needState] = (needStateCounts[e.needState] || 0) + 1;
    });

    const totalProducts = experiences.length;
    const uniqueNeedStates = Object.keys(needStateCounts).length;

    // Calculate Shannon diversity index
    let diversity = 0;
    Object.values(needStateCounts).forEach(count => {
        const proportion = count / totalProducts;
        if (proportion > 0) {
            diversity -= proportion * Math.log(proportion);
        }
    });

    // Normalize to 0-100 scale (max diversity = ln(4) ≈ 1.39)
    const diversityScore = Math.round((diversity / 1.39) * 100);

    let assessment, color, recommendation;
    if (diversityScore >= 75) {
        assessment = 'Excellent';
        color = 'var(--success-color)';
        recommendation = 'Portfolio shows strong emotional diversity. Continue balanced innovation.';
    } else if (diversityScore >= 50) {
        assessment = 'Good';
        color = 'var(--info-color)';
        recommendation = 'Solid diversity. Consider expanding into underrepresented emotional territories.';
    } else if (diversityScore >= 25) {
        assessment = 'Moderate';
        color = 'var(--warning-color)';
        recommendation = 'Portfolio is somewhat concentrated. Explore new emotional spaces to reduce risk.';
    } else {
        assessment = 'Low';
        color = 'var(--danger-color)';
        recommendation = 'Portfolio lacks diversity. High risk of category cannibalization. Diversify urgently.';
    }

    const html = `
        <div style="text-align: center;">
            <div style="font-size: 4rem; font-weight: 700; color: ${color}; margin: 20px 0;">
                ${diversityScore}
            </div>
            <div style="font-size: 1.3rem; color: ${color}; font-weight: 600; margin-bottom: 15px;">
                ${assessment} Diversity
            </div>
            <div style="background: ${color}20; padding: 15px; border-radius: 8px; border-left: 4px solid ${color};">
                <p style="margin: 0; line-height: 1.6;">${recommendation}</p>
            </div>
            <div style="margin-top: 20px; font-size: 0.9rem; color: var(--text-light);">
                <strong>Need State Distribution:</strong><br>
                ${Object.entries(needStateCounts).map(([state, count]) =>
                    `${state.charAt(0).toUpperCase() + state.slice(1)}: ${count}`
                ).join(' • ')}
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function renderClusterInsights() {
    const container = document.getElementById('cluster-insights');

    const insights = [];

    // Find overlapping products (close in emotional space)
    const overlaps = findOverlaps();
    if (overlaps.length > 0) {
        insights.push({
            icon: '⚠️',
            title: 'Potential Cannibalization',
            text: overlaps.map(o => `${o.product1} and ${o.product2} are emotionally similar (may compete for same consumer)`).join('<br>')
        });
    }

    // Find unique positioning
    const unique = findUniqueProducts();
    if (unique.length > 0) {
        insights.push({
            icon: '🎯',
            title: 'Unique Positioning',
            text: unique.map(p => `${p.name} occupies distinct emotional territory`).join('<br>')
        });
    }

    // Portfolio recommendations
    insights.push({
        icon: '💡',
        title: 'Strategic Recommendations',
        text: getPortfolioRecommendations()
    });

    const html = insights.map(i => `
        <div class="insight-item">
            <span class="insight-icon" style="font-size: 1.5rem;">${i.icon}</span>
            <div style="flex: 1;">
                <strong style="color: var(--primary-color); display: block; margin-bottom: 5px;">${i.title}</strong>
                <p style="margin: 0; line-height: 1.6;">${i.text}</p>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

function findOverlaps() {
    const overlaps = [];
    const threshold = 2.0; // Euclidean distance threshold

    for (let i = 0; i < experiences.length; i++) {
        for (let j = i + 1; j < experiences.length; j++) {
            const scores1 = calculateEmotionScores(experiences[i]);
            const scores2 = calculateEmotionScores(experiences[j]);

            // Calculate Euclidean distance
            let distance = 0;
            ['indulgence', 'excitement', 'comfort', 'refreshment'].forEach(emotion => {
                const diff = (scores1[emotion] || 5) - (scores2[emotion] || 5);
                distance += diff * diff;
            });
            distance = Math.sqrt(distance);

            if (distance < threshold) {
                overlaps.push({
                    product1: experiences[i].productInfo.name,
                    product2: experiences[j].productInfo.name,
                    distance: distance.toFixed(2)
                });
            }
        }
    }

    return overlaps;
}

function findUniqueProducts() {
    const unique = [];
    const threshold = 3.5; // Minimum distance to be considered unique

    experiences.forEach((exp, idx) => {
        const scores1 = calculateEmotionScores(exp);
        let minDistance = Infinity;

        experiences.forEach((other, otherIdx) => {
            if (idx === otherIdx) return;

            const scores2 = calculateEmotionScores(other);
            let distance = 0;
            ['indulgence', 'excitement', 'comfort', 'refreshment'].forEach(emotion => {
                const diff = (scores1[emotion] || 5) - (scores2[emotion] || 5);
                distance += diff * diff;
            });
            distance = Math.sqrt(distance);

            if (distance < minDistance) {
                minDistance = distance;
            }
        });

        if (minDistance > threshold) {
            unique.push({
                name: exp.productInfo.name,
                distance: minDistance.toFixed(2)
            });
        }
    });

    return unique;
}

function getPortfolioRecommendations() {
    const needStateCounts = {};
    experiences.forEach(e => {
        needStateCounts[e.needState] = (needStateCounts[e.needState] || 0) + 1;
    });

    const underserved = [];
    const needStates = ['reward', 'escape', 'rejuvenation', 'sociability'];

    needStates.forEach(state => {
        if (!needStateCounts[state] || needStateCounts[state] < 2) {
            underserved.push(state);
        }
    });

    if (underserved.length > 0) {
        return `Consider developing products for underserved need states: ${underserved.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}. This will increase portfolio resilience and market coverage.`;
    } else {
        return 'Portfolio covers all major need states. Focus on differentiating within categories and exploring emotional white spaces identified above.';
    }
}

// ===== AI INSIGHTS WITH CLAUDE =====
// Note: claudeAI is declared and initialized in chat-ui.js

function updateAIInsightsView() {
    // Initialize Claude AI if not already done (declared in chat-ui.js)
    if (!window.claudeAI) {
        window.claudeAI = new ClaudeAI();
    }
    const claudeAI = window.claudeAI;

    // Check API configuration status
    const statusContainer = document.getElementById('ai-config-status');
    if (statusContainer) {
        if (!claudeAI.isConfigured) {
            statusContainer.innerHTML = `
                <div class="ai-config-warning">
                    <span class="warning-icon">⚠️</span>
                    <div>
                        <strong>API Key Required</strong>
                        <p style="margin: 5px 0 0 0;">Please add your Anthropic API key to <code>config.js</code> to enable AI features.</p>
                        <p style="margin: 5px 0 0 0; font-size: 0.85rem;">Open <code>config.js</code> and replace <code>YOUR_API_KEY_HERE</code> with your actual API key (starts with <code>sk-ant-</code>)</p>
                    </div>
                </div>
            `;
            // Disable buttons
            document.querySelectorAll('.ai-action-btn, #btn-ask-claude').forEach(btn => {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            });
        } else {
            statusContainer.innerHTML = `
                <div class="ai-config-success">
                    <span class="success-icon">✅</span>
                    <div>
                        <strong>Claude AI Connected</strong>
                        <p style="margin: 5px 0 0 0;">Using model: ${claudeAI.model}</p>
                    </div>
                </div>
            `;
        }
    }

    // Populate product selector
    const productSelect = document.getElementById('ai-product-select');
    productSelect.innerHTML = '<option value="">Choose a product...</option>' +
        experiences.map(e => `<option value="${e.id}">${e.productInfo.name} - ${e.productInfo.brand}</option>`).join('');

    // Set up event listeners
    initAIEventListeners();
}

function initAIEventListeners() {
    // Natural language query
    const askButton = document.getElementById('btn-ask-claude');
    const queryInput = document.getElementById('ai-query-input');

    askButton.onclick = async () => {
        const query = queryInput.value.trim();
        if (!query) {
            alert('Please enter a question');
            return;
        }

        await executeAIQuery(query);
    };

    // Quick action buttons
    document.querySelectorAll('.ai-action-btn').forEach(btn => {
        btn.onclick = async () => {
            const action = btn.dataset.action;
            await handleQuickAction(action);
        };
    });

    // Product selector change
    const productSelect = document.getElementById('ai-product-select');
    productSelect.onchange = function() {
        if (this.value) {
            const exp = experiences.find(e => e.id == this.value);
            if (exp) {
                analyzeProduct(exp);
            }
        }
    };
}

async function handleQuickAction(action) {
    const productSelectorSection = document.getElementById('ai-product-selector-section');

    switch(action) {
        case 'analyze-product':
            if (experiences.length === 0) {
                showAIError('No products available. Please log at least one product first.');
                return;
            }
            // Show product selector
            productSelectorSection.style.display = 'block';
            productSelectorSection.scrollIntoView({ behavior: 'smooth' });
            break;

        case 'portfolio-improvements':
            if (experiences.length < 2) {
                showAIError('Need at least 2 products for portfolio analysis.');
                return;
            }
            productSelectorSection.style.display = 'none';
            await suggestPortfolioImprovements();
            break;

        case 'compare-products':
            if (experiences.length < 2) {
                showAIError('Need at least 2 products to compare.');
                return;
            }
            productSelectorSection.style.display = 'none';
            await compareProducts();
            break;

        case 'emotional-gaps':
            if (experiences.length < 2) {
                showAIError('Need at least 2 products to identify emotional gaps.');
                return;
            }
            productSelectorSection.style.display = 'none';
            await findEmotionalGaps();
            break;
    }
}

async function analyzeProduct(experience) {
    showAILoading();

    try {
        const response = await claudeAI.analyzeProduct(experience);
        showAIResponse(response, `Analysis: ${experience.productInfo.name}`);
    } catch (error) {
        showAIError(error.message);
    }
}

async function suggestPortfolioImprovements() {
    showAILoading();

    try {
        const response = await claudeAI.suggestImprovements(experiences);
        showAIResponse(response, 'Portfolio Improvement Suggestions');
    } catch (error) {
        showAIError(error.message);
    }
}

async function compareProducts() {
    showAILoading();

    try {
        // Compare top 3 products by satisfaction
        const topProducts = experiences
            .sort((a, b) => b.stages.aftertaste.emotions.satisfaction - a.stages.aftertaste.emotions.satisfaction)
            .slice(0, 3);

        const response = await claudeAI.compareProducts(topProducts);
        showAIResponse(response, 'Product Comparison');
    } catch (error) {
        showAIError(error.message);
    }
}

async function findEmotionalGaps() {
    showAILoading();

    try {
        const query = `Based on my portfolio data, identify emotional territories that are underexploited or missing.
        What emotions are my products NOT delivering effectively?
        Suggest specific emotional targets for new product development.`;

        const response = await claudeAI.answerQuery(query, experiences);
        showAIResponse(response, 'Emotional Gap Analysis');
    } catch (error) {
        showAIError(error.message);
    }
}

async function executeAIQuery(query) {
    showAILoading();

    try {
        const response = await claudeAI.answerQuery(query, experiences);
        showAIResponse(response, 'Claude\'s Answer');
    } catch (error) {
        showAIError(error.message);
    }
}

function showAILoading() {
    document.getElementById('ai-loading').style.display = 'block';
    document.getElementById('ai-response-container').style.display = 'none';
}

function showAIResponse(content, title) {
    document.getElementById('ai-loading').style.display = 'none';
    const container = document.getElementById('ai-response-container');
    container.style.display = 'block';

    // Convert markdown-style formatting to HTML
    let formattedContent = content
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code>$1</code>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/^\- (.+)$/gm, '<li>$1</li>')
        .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    container.innerHTML = `
        <div class="ai-response-content">
            <h2 style="color: var(--primary-color); margin-top: 0;">${title}</h2>
            <div style="margin-top: 20px;">
                <p>${formattedContent}</p>
            </div>
        </div>
    `;

    container.scrollIntoView({ behavior: 'smooth' });
}

function showAIError(message) {
    document.getElementById('ai-loading').style.display = 'none';
    const container = document.getElementById('ai-response-container');
    container.style.display = 'block';

    container.innerHTML = `
        <div class="ai-error">
            <h3>⚠️ Error</h3>
            <p>${message}</p>
            <p style="margin-top: 15px; font-size: 0.9rem;">
                <strong>Common issues:</strong><br>
                • API key not configured in config.js<br>
                • Invalid API key format (must start with sk-ant-)<br>
                • Network connection issues<br>
                • API quota exceeded
            </p>
        </div>
    `;
}

// ===== TUTORIAL & ONBOARDING INTEGRATION =====

/**
 * Initialize tutorial system
 */
function initTutorial() {
    // Check if user is new (0 experiences) and hasn't completed tutorial
    if (typeof tutorialManager !== 'undefined') {
        const hasCompletedTutorial = tutorialManager.checkTutorialStatus();

        if (experiences.length === 0 && !hasCompletedTutorial) {
            // Show welcome section for new users
            showWelcomeSection();
        }
    }

    // Initialize tutorial buttons
    const restartTutorialBtn = document.getElementById('restart-tutorial');
    if (restartTutorialBtn) {
        restartTutorialBtn.onclick = () => {
            if (typeof tutorialManager !== 'undefined') {
                tutorialManager.restartTutorial();
            }
        };
    }

    // Initialize help button
    const helpBtn = document.getElementById('help-button');
    if (helpBtn) {
        helpBtn.onclick = () => {
            const currentView = document.querySelector('.nav-item.active')?.dataset.view;
            if (currentView && typeof tutorialManager !== 'undefined') {
                tutorialManager.showSectionHelp(currentView);
            }
        };
    }

    // Welcome section buttons
    const startTutorialBtn = document.getElementById('btn-start-tutorial');
    if (startTutorialBtn) {
        startTutorialBtn.onclick = () => {
            hideWelcomeSection();
            if (typeof tutorialManager !== 'undefined') {
                tutorialManager.startTutorial();
            }
        };
    }

    const loadSampleBtn = document.getElementById('btn-load-sample');
    if (loadSampleBtn) {
        loadSampleBtn.onclick = () => {
            loadSampleDataForTutorial();
        };
    }

    const skipWelcomeBtn = document.getElementById('btn-skip-welcome');
    if (skipWelcomeBtn) {
        skipWelcomeBtn.onclick = () => {
            hideWelcomeSection();
        };
    }
}

/**
 * Show welcome section for new users
 */
function showWelcomeSection() {
    const welcomeSection = document.getElementById('welcome-section');
    if (welcomeSection) {
        welcomeSection.style.display = 'block';
    }
}

/**
 * Hide welcome section
 */
function hideWelcomeSection() {
    const welcomeSection = document.getElementById('welcome-section');
    if (welcomeSection) {
        welcomeSection.style.display = 'none';
    }
}

/**
 * Load sample data for tutorial/demo
 */
function loadSampleDataForTutorial() {
    if (confirm('Load 5 sample products to explore the app features?\n\n(Your data is safe - this just adds examples you can delete later)')) {
        // Create 5 diverse sample experiences
        const sampleExperiences = [
            createSampleExperience({
                name: 'Dark Chocolate Orange Bar',
                brand: 'Artisan Chocolates',
                type: 'Confectionery',
                occasion: 'Evening Treat',
                needState: 'Indulgence',
                profile: { sweet: 6, bitter: 7, richness: 9, creaminess: 5 },
                emotions: ['satisfied', 'comforted', 'indulged']
            }),
            createSampleExperience({
                name: 'Watermelon Mint Sparkling Water',
                brand: 'Fresh Springs',
                type: 'Beverage',
                occasion: 'Afternoon Refreshment',
                needState: 'Refreshment',
                profile: { sweet: 5, sourness: 3, richness: 2, creaminess: 1 },
                emotions: ['refreshed', 'energized', 'happy']
            }),
            createSampleExperience({
                name: 'Vanilla Chai Latte',
                brand: 'Cozy Cafe',
                type: 'Beverage',
                occasion: 'Morning Ritual',
                needState: 'Comfort',
                profile: { sweet: 7, bitter: 3, richness: 6, creaminess: 8 },
                emotions: ['comforted', 'calm', 'nostalgic']
            }),
            createSampleExperience({
                name: 'Mango Chili Lime Chips',
                brand: 'Spicy Snacks Co',
                type: 'Snack',
                occasion: 'Social Gathering',
                needState: 'Stimulation',
                profile: { sweet: 5, sourness: 6, saltiness: 7, spiciness: 8 },
                emotions: ['excited', 'energized', 'adventurous']
            }),
            createSampleExperience({
                name: 'Matcha Green Tea Ice Cream',
                brand: 'Zen Desserts',
                type: 'Dessert',
                occasion: 'After Dinner',
                needState: 'Indulgence',
                profile: { sweet: 6, bitter: 4, richness: 7, creaminess: 9 },
                emotions: ['calm', 'satisfied', 'indulged']
            })
        ];

        experiences.push(...sampleExperiences);
        saveData();
        updateDashboard();
        hideWelcomeSection();

        alert('✅ 5 sample products loaded! Explore different views to see the analysis.');

        // Offer to start tutorial
        if (confirm('Start the interactive tutorial to learn how to use each feature?')) {
            if (typeof tutorialManager !== 'undefined') {
                tutorialManager.startTutorial();
            }
        }
    }
}

/**
 * Create a sample experience with realistic data
 */
function createSampleExperience(config) {
    const emotionMap = {
        'satisfied': 8, 'comforted': 7, 'indulged': 8, 'refreshed': 9,
        'energized': 8, 'happy': 7, 'calm': 7, 'nostalgic': 6,
        'excited': 8, 'adventurous': 7
    };

    const experience = {
        id: Date.now() + Math.random(),
        timestamp: Date.now(),
        productInfo: {
            name: config.name,
            brand: config.brand,
            type: config.type,
            occasion: config.occasion
        },
        needState: config.needState,
        stages: {
            appearance: {
                visualAppeal: 7 + Math.floor(Math.random() * 3),
                colorAppeal: 7 + Math.floor(Math.random() * 3),
                anticipation: 7 + Math.floor(Math.random() * 3),
                emotions: {}
            },
            aroma: {
                intensity: 6 + Math.floor(Math.random() * 3),
                pleasantness: 7 + Math.floor(Math.random() * 3),
                complexity: 6 + Math.floor(Math.random() * 3),
                emotions: {}
            },
            frontMouth: {
                sweetness: config.profile.sweet || 5,
                sourness: config.profile.sourness || 3,
                bitterness: config.profile.bitter || 2,
                saltiness: config.profile.saltiness || 3,
                umami: config.profile.umami || 2,
                spiciness: config.profile.spiciness || 1,
                emotions: {}
            },
            midRearMouth: {
                richness: config.profile.richness || 5,
                creaminess: config.profile.creaminess || 5,
                mouthCoating: 5 + Math.floor(Math.random() * 3),
                textureAppeal: 6 + Math.floor(Math.random() * 3),
                emotions: {}
            },
            aftertaste: {
                duration: 6 + Math.floor(Math.random() * 3),
                pleasantness: 7 + Math.floor(Math.random() * 3),
                lingering: 6 + Math.floor(Math.random() * 3),
                emotions: {
                    satisfaction: 7 + Math.floor(Math.random() * 3)
                }
            }
        },
        emotionalTriggers: {
            moreishness: 6 + Math.floor(Math.random() * 4),
            refreshment: config.needState === 'Refreshment' ? 8 + Math.floor(Math.random() * 2) : 4,
            melt: config.profile.creaminess || 5,
            crunch: config.type === 'Snack' ? 7 + Math.floor(Math.random() * 3) : 2
        },
        overall: {
            overallLiking: 7 + Math.floor(Math.random() * 3),
            purchaseIntent: 7 + Math.floor(Math.random() * 3),
            uniqueness: 6 + Math.floor(Math.random() * 3),
            qualityPerception: 7 + Math.floor(Math.random() * 3)
        },
        notes: `Sample product demonstrating ${config.needState} need state.`
    };

    // Add emotions to stages
    config.emotions.forEach(emotion => {
        experience.stages.aftertaste.emotions[emotion] = emotionMap[emotion] || 7;
    });

    return experience;
}

// Initialize tutorial on page load
setTimeout(() => {
    initTutorial();
}, 1500);
