// ===== DATA STORAGE =====
let experiences = [];
let charts = {};
let currentStage = 1;
const totalStages = 8;
let firestoreManager = null;
let isCloudSyncEnabled = false;
// Which main-form slider ids the user has actually interacted with this
// session - lets an untouched slider save as null instead of its HTML
// default. See touched-fields.js.
let mainFormTouched = window.TouchedFields.createTouchedTracker();
// Set by "Start Full Evaluation from this target" (targets-loaded-ui.js /
// target-prefill.js) just before switching to this view - carried onto the
// NEXT submitted experience's tssProjectId/sourceVersionId, then cleared.
// A re-test (initRetestSelector below) explicitly clears this too, so a
// re-test copy never inherits a stale target link from an earlier prefill.
let pendingTargetLink = null;

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    initNavigation();
    initForm();
    initSliders();
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
        'ai-insights': 'AI-Powered Insights',
        'export-reports': 'Export & Reports',
        'batch-import': 'Batch Import Products',
        'recipe-tracker': 'Recipe & Formulation Tracker',
        'temporal-analysis': 'Temporal Analysis',
        'team-collaboration': 'Team Collaboration',
        'approvals': 'Approval Workflows',
        'history': 'Experience History',
        'consumer-panel': 'Consumer Panel',
        'custom-lexicon': 'Custom Lexicon',
        'industry-benchmarks': 'Industry Benchmarks',
        'targets-loaded': 'Targets Loaded (QEP-Capture)'
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
            if (viewName === 'ai-insights') updateAIInsightsView();
            if (viewName === 'consumer-panel') renderConsumerPanelDashboard();
            if (viewName === 'custom-lexicon') renderCustomLexiconDashboard();
            if (viewName === 'industry-benchmarks') renderIndustryBenchmarksDashboard();
            if (viewName === 'export-reports') renderExportReportsDashboard();
            if (viewName === 'batch-import') renderBatchImportDashboard();
            if (viewName === 'recipe-tracker') renderRecipeTrackerDashboard();
            if (viewName === 'temporal-analysis') renderTemporalAnalysisDashboard();
            if (viewName === 'team-collaboration') renderTeamCollaborationDashboard();
            if (viewName === 'approvals') renderApprovalsDashboard();
            if (viewName === 'history') updateHistory();
            if (viewName === 'targets-loaded') renderTargetsLoadedDashboard();
        });
    });
}

// ===== INTEGRATIONS VIEW =====
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
    // A reset form is a blank, non-target evaluation: drop any target
    // markers / "Brief says" text / banner with it.
    form.addEventListener('reset', clearTargetPrefillUi);

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

        // A re-test is never a target-prefilled evaluation, even if one was
        // pending from an earlier "Start Full Evaluation from this target".
        pendingTargetLink = null;
        clearTargetPrefillUi();

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

    // Malformed entries are skipped (updateDashboard() also tolerates them,
    // and now calls this). Product names are escaped in the builder.
    const options = RenderUtils.buildRetestOptionsHtml(experiences);

    // Keep an in-progress re-test choice if this refresh happens mid-form
    // (setting a value with no matching option leaves it unselected).
    const previous = selector.value;
    selector.innerHTML = options;
    if (previous) selector.value = previous;
}

// ===== TARGET PREFILL (Full Evaluation, "Start Full Evaluation from this
// target" - see target-prefill.js / targets-loaded-ui.js) =====
//
// A brief TARGET is never written into a slider's .value and never marked
// touched (touched-fields.js) - the slider stays in its normal default
// state and saves as null unless the user actually moves it. Targets are
// only DRAWN: a "Target N" marker on each mapped slider's track, the
// stage's brief text as "Brief says:", and a one-line banner. All three
// are removed by clearTargetPrefillUi().
const TARGET_PREFILL_UI_SELECTOR = '.target-marker-track, .target-brief-says';

function clearTargetPrefillUi() {
    document.querySelectorAll(TARGET_PREFILL_UI_SELECTOR).forEach((el) => el.remove());
    const banner = document.getElementById('target-prefill-banner');
    if (banner) banner.remove();
}

function renderTargetMarkers(prefill) {
    const TP = window.TargetPrefill;
    const title = (prefill && prefill.markerTitle) || '';
    ((prefill && prefill.markers) || []).forEach((marker) => {
        const slider = document.getElementById(marker.elementId);
        if (!slider || typeof slider.insertAdjacentElement !== 'function') return;
        const track = document.createElement('div');
        track.className = 'target-marker-track';
        track.setAttribute('data-target-for', marker.elementId);
        track.setAttribute('data-target-kind', marker.kind);
        track.innerHTML = TP.buildTargetMarkerHtml(marker, title, slider.getAttribute('min'), slider.getAttribute('max'));
        slider.insertAdjacentElement('afterend', track);
    });
}

function renderTargetBriefText(prefill) {
    const TP = window.TargetPrefill;
    const briefText = (prefill && prefill.briefText) || {};
    Object.keys(briefText).forEach((stageId) => {
        const text = briefText[stageId];
        const stageNumber = TP.STAGE_ID_TO_FORM_STAGE_NUMBER[stageId];
        if (!text || !stageNumber) return;
        const stageEl = document.querySelector(`.form-stage[data-stage="${stageNumber}"]`);
        if (!stageEl || typeof stageEl.insertAdjacentElement !== 'function') return;
        const block = document.createElement('div');
        block.className = 'target-brief-says';
        block.setAttribute('data-target-stage', stageId);
        block.innerHTML = TP.buildBriefSaysHtml(text);
        const anchor = stageEl.querySelector('.stage-description') || stageEl.querySelector('h4');
        if (anchor && typeof anchor.insertAdjacentElement === 'function') {
            anchor.insertAdjacentElement('afterend', block);
        } else {
            stageEl.insertAdjacentElement('afterbegin', block);
        }
    });
}

function applyTargetPrefillToForm(prefill, linkInfo) {
    clearTargetPrefillUi();
    if (linkInfo) {
        pendingTargetLink = {
            tssProjectId: linkInfo.projectId || null,
            sourceVersionId: linkInfo.versionId || null,
        };
        const nameField = document.getElementById('item-name');
        if (nameField && linkInfo.projectName && !nameField.value) {
            nameField.value = linkInfo.projectName;
        }
    }

    renderTargetMarkers(prefill);
    renderTargetBriefText(prefill);
    showTargetPrefillBanner(prefill);
}

function showTargetPrefillBanner(prefill) {
    const form = document.getElementById('taste-form');
    if (!form || !form.parentNode) return;

    const banner = document.createElement('div');
    banner.id = 'target-prefill-banner';
    banner.className = 'target-prefill-banner';
    // textContent, never innerHTML: the brief name is untrusted.
    banner.textContent = (prefill && prefill.banner) || '';
    form.parentNode.insertBefore(banner, form);
}

if (typeof window !== 'undefined') {
    window.applyTargetPrefillToForm = applyTargetPrefillToForm;
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
        // Mark touched regardless of whether this slider has a value-display
        // span - the untouched/touched distinction must never depend on that.
        slider.addEventListener('input', (e) => {
            TouchedFields.markTouched(mainFormTouched, e.target.id);
        });

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
                // A resumed draft's sliders were set programmatically, not via
                // the 'input' event initSliders() listens on - mark them
                // touched explicitly so resuming a draft never silently nulls
                // out a rating the user already made before autosaving.
                if (element.type === 'range') {
                    TouchedFields.markTouched(mainFormTouched, id);
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
    const originalTestId = retestSelector && retestSelector.value ? parseFloat(retestSelector.value) : null;
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
        // Only set when this submission started from "Start Full Evaluation
        // from this target" (see target-prefill.js) - null otherwise,
        // including for re-tests (initRetestSelector clears
        // pendingTargetLink on selection). Read by
        // signature-supabase-sync.js's dual-write payload unchanged - see
        // save-diff.js's diffKey, which only strips addedBy/updatedBy/
        // companyId/updatedAt/createdAt, never these.
        tssProjectId: pendingTargetLink ? pendingTargetLink.tssProjectId : null,
        sourceVersionId: pendingTargetLink ? pendingTargetLink.sourceVersionId : null,
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
        stages: (function() {
            // Build stages data dynamically from sensory attributes
            const stageIdPrefixMap = {
                appearance: 'appearance',
                aroma: 'aroma',
                frontMouth: 'front',
                midRearMouth: 'mid',
                texture: 'tex',
                aftertaste: 'after',
                overall: 'overall'
            };

            const stages = {};
            Object.entries(SENSORY_ATTRIBUTES_BY_STAGE).forEach(([stageId, attrs]) => {
                const prefix = stageIdPrefixMap[stageId];
                const stageData = {};
                attrs.forEach(attr => {
                    const elemId = `${prefix}-${attr.id}`;
                    const elem = document.getElementById(elemId);
                    stageData[attrIdToKey(attr.id)] = TouchedFields.touchedIntValue(mainFormTouched, elemId, elem?.value);
                });
                stages[stageId] = stageData;
            });

            // Add emotions for each stage (collected separately from emotion sliders)
            stages.appearance.emotions = {
                anticipation: TouchedFields.touchedIntValue(mainFormTouched, 'appearance-anticipation', document.getElementById('appearance-anticipation')?.value),
                curiosity: TouchedFields.touchedIntValue(mainFormTouched, 'appearance-curiosity', document.getElementById('appearance-curiosity')?.value),
                desire: TouchedFields.touchedIntValue(mainFormTouched, 'appearance-desire', document.getElementById('appearance-desire')?.value),
                eager: TouchedFields.touchedIntValue(mainFormTouched, 'appearance-eager', document.getElementById('appearance-eager')?.value),
                excitement: TouchedFields.touchedIntValue(mainFormTouched, 'appearance-excitement', document.getElementById('appearance-excitement')?.value),
                happiness: TouchedFields.touchedIntValue(mainFormTouched, 'appearance-happiness', document.getElementById('appearance-happiness')?.value),
                interest: TouchedFields.touchedIntValue(mainFormTouched, 'appearance-interest', document.getElementById('appearance-interest')?.value),
                pleased: TouchedFields.touchedIntValue(mainFormTouched, 'appearance-pleased', document.getElementById('appearance-pleased')?.value),
                surprise: TouchedFields.touchedIntValue(mainFormTouched, 'appearance-surprise', document.getElementById('appearance-surprise')?.value),
                attracted: TouchedFields.touchedIntValue(mainFormTouched, 'appearance-attracted', document.getElementById('appearance-attracted')?.value),
                disappointed: TouchedFields.touchedIntValue(mainFormTouched, 'appearance-disappointed', document.getElementById('appearance-disappointed')?.value),
                disgusted: TouchedFields.touchedIntValue(mainFormTouched, 'appearance-disgusted', document.getElementById('appearance-disgusted')?.value),
                indifferent: TouchedFields.touchedIntValue(mainFormTouched, 'appearance-indifferent', document.getElementById('appearance-indifferent')?.value),
                suspicious: TouchedFields.touchedIntValue(mainFormTouched, 'appearance-suspicious', document.getElementById('appearance-suspicious')?.value),
                worried: TouchedFields.touchedIntValue(mainFormTouched, 'appearance-worried', document.getElementById('appearance-worried')?.value),
                anxious: TouchedFields.touchedIntValue(mainFormTouched, 'appearance-anxious', document.getElementById('appearance-anxious')?.value),
                confused: TouchedFields.touchedIntValue(mainFormTouched, 'appearance-confused', document.getElementById('appearance-confused')?.value),
                bored: TouchedFields.touchedIntValue(mainFormTouched, 'appearance-bored', document.getElementById('appearance-bored')?.value)
            };

            stages.aroma.emotions = {
                pleasure: TouchedFields.touchedIntValue(mainFormTouched, 'aroma-pleasure', document.getElementById('aroma-pleasure')?.value),
                comfort: TouchedFields.touchedIntValue(mainFormTouched, 'aroma-comfort', document.getElementById('aroma-comfort')?.value),
                nostalgia: TouchedFields.touchedIntValue(mainFormTouched, 'aroma-nostalgia', document.getElementById('aroma-nostalgia')?.value),
                happiness: TouchedFields.touchedIntValue(mainFormTouched, 'aroma-happiness', document.getElementById('aroma-happiness')?.value),
                energized: TouchedFields.touchedIntValue(mainFormTouched, 'aroma-energized', document.getElementById('aroma-energized')?.value),
                relaxed: TouchedFields.touchedIntValue(mainFormTouched, 'aroma-relaxed', document.getElementById('aroma-relaxed')?.value),
                intrigued: TouchedFields.touchedIntValue(mainFormTouched, 'aroma-intrigued', document.getElementById('aroma-intrigued')?.value),
                refreshed: TouchedFields.touchedIntValue(mainFormTouched, 'aroma-refreshed', document.getElementById('aroma-refreshed')?.value),
                desire: TouchedFields.touchedIntValue(mainFormTouched, 'aroma-desire', document.getElementById('aroma-desire')?.value),
                warm: TouchedFields.touchedIntValue(mainFormTouched, 'aroma-warm', document.getElementById('aroma-warm')?.value),
                soothed: TouchedFields.touchedIntValue(mainFormTouched, 'aroma-soothed', document.getElementById('aroma-soothed')?.value),
                surprised: TouchedFields.touchedIntValue(mainFormTouched, 'aroma-surprised', document.getElementById('aroma-surprised')?.value),
                interested: TouchedFields.touchedIntValue(mainFormTouched, 'aroma-interested', document.getElementById('aroma-interested')?.value),
                calm: TouchedFields.touchedIntValue(mainFormTouched, 'aroma-calm', document.getElementById('aroma-calm')?.value),
                disgusted: TouchedFields.touchedIntValue(mainFormTouched, 'aroma-disgusted', document.getElementById('aroma-disgusted')?.value),
                irritated: TouchedFields.touchedIntValue(mainFormTouched, 'aroma-irritated', document.getElementById('aroma-irritated')?.value),
                worried: TouchedFields.touchedIntValue(mainFormTouched, 'aroma-worried', document.getElementById('aroma-worried')?.value),
                disappointed: TouchedFields.touchedIntValue(mainFormTouched, 'aroma-disappointed', document.getElementById('aroma-disappointed')?.value),
                indifferent: TouchedFields.touchedIntValue(mainFormTouched, 'aroma-indifferent', document.getElementById('aroma-indifferent')?.value),
                anxious: TouchedFields.touchedIntValue(mainFormTouched, 'aroma-anxious', document.getElementById('aroma-anxious')?.value),
                repulsed: TouchedFields.touchedIntValue(mainFormTouched, 'aroma-repulsed', document.getElementById('aroma-repulsed')?.value)
            };

            stages.frontMouth.emotions = {
                excitement: TouchedFields.touchedIntValue(mainFormTouched, 'front-excitement', document.getElementById('front-excitement')?.value),
                surprise: TouchedFields.touchedIntValue(mainFormTouched, 'front-surprise', document.getElementById('front-surprise')?.value),
                happiness: TouchedFields.touchedIntValue(mainFormTouched, 'front-happiness', document.getElementById('front-happiness')?.value),
                pleasure: TouchedFields.touchedIntValue(mainFormTouched, 'front-pleasure', document.getElementById('front-pleasure')?.value),
                interest: TouchedFields.touchedIntValue(mainFormTouched, 'front-interest', document.getElementById('front-interest')?.value),
                satisfaction: TouchedFields.touchedIntValue(mainFormTouched, 'front-satisfaction', document.getElementById('front-satisfaction')?.value),
                energized: TouchedFields.touchedIntValue(mainFormTouched, 'front-energized', document.getElementById('front-energized')?.value),
                delighted: TouchedFields.touchedIntValue(mainFormTouched, 'front-delighted', document.getElementById('front-delighted')?.value),
                amused: TouchedFields.touchedIntValue(mainFormTouched, 'front-amused', document.getElementById('front-amused')?.value),
                disappointed: TouchedFields.touchedIntValue(mainFormTouched, 'front-disappointed', document.getElementById('front-disappointed')?.value),
                disgusted: TouchedFields.touchedIntValue(mainFormTouched, 'front-disgusted', document.getElementById('front-disgusted')?.value),
                bored: TouchedFields.touchedIntValue(mainFormTouched, 'front-bored', document.getElementById('front-bored')?.value),
                confused: TouchedFields.touchedIntValue(mainFormTouched, 'front-confused', document.getElementById('front-confused')?.value),
                overwhelmed: TouchedFields.touchedIntValue(mainFormTouched, 'front-overwhelmed', document.getElementById('front-overwhelmed')?.value),
                upset: TouchedFields.touchedIntValue(mainFormTouched, 'front-upset', document.getElementById('front-upset')?.value),
                worried: TouchedFields.touchedIntValue(mainFormTouched, 'front-worried', document.getElementById('front-worried')?.value)
            };

            stages.midRearMouth.emotions = {
                satisfaction: TouchedFields.touchedIntValue(mainFormTouched, 'mid-satisfaction', document.getElementById('mid-satisfaction')?.value),
                pleasure: TouchedFields.touchedIntValue(mainFormTouched, 'mid-pleasure', document.getElementById('mid-pleasure')?.value),
                indulgence: TouchedFields.touchedIntValue(mainFormTouched, 'mid-indulgence', document.getElementById('mid-indulgence')?.value),
                comfort: TouchedFields.touchedIntValue(mainFormTouched, 'mid-comfort', document.getElementById('mid-comfort')?.value),
                calm: TouchedFields.touchedIntValue(mainFormTouched, 'mid-calm', document.getElementById('mid-calm')?.value),
                warmth: TouchedFields.touchedIntValue(mainFormTouched, 'mid-warmth', document.getElementById('mid-warmth')?.value),
                joy: TouchedFields.touchedIntValue(mainFormTouched, 'mid-joy', document.getElementById('mid-joy')?.value),
                loving: TouchedFields.touchedIntValue(mainFormTouched, 'mid-loving', document.getElementById('mid-loving')?.value),
                adventurous: TouchedFields.touchedIntValue(mainFormTouched, 'mid-adventurous', document.getElementById('mid-adventurous')?.value),
                energized: TouchedFields.touchedIntValue(mainFormTouched, 'mid-energized', document.getElementById('mid-energized')?.value),
                secure: TouchedFields.touchedIntValue(mainFormTouched, 'mid-secure', document.getElementById('mid-secure')?.value),
                nostalgic: TouchedFields.touchedIntValue(mainFormTouched, 'mid-nostalgic', document.getElementById('mid-nostalgic')?.value),
                guilty: TouchedFields.touchedIntValue(mainFormTouched, 'mid-guilty', document.getElementById('mid-guilty')?.value),
                bored: TouchedFields.touchedIntValue(mainFormTouched, 'mid-bored', document.getElementById('mid-bored')?.value),
                disgusted: TouchedFields.touchedIntValue(mainFormTouched, 'mid-disgusted', document.getElementById('mid-disgusted')?.value),
                disappointed: TouchedFields.touchedIntValue(mainFormTouched, 'mid-disappointed', document.getElementById('mid-disappointed')?.value),
                aggressive: TouchedFields.touchedIntValue(mainFormTouched, 'mid-aggressive', document.getElementById('mid-aggressive')?.value),
                overwhelmed: TouchedFields.touchedIntValue(mainFormTouched, 'mid-overwhelmed', document.getElementById('mid-overwhelmed')?.value),
                dissatisfied: TouchedFields.touchedIntValue(mainFormTouched, 'mid-dissatisfied', document.getElementById('mid-dissatisfied')?.value),
                sad: TouchedFields.touchedIntValue(mainFormTouched, 'mid-sad', document.getElementById('mid-sad')?.value)
            };

            // Texture stage emotions (25-term expanded list)
            stages.texture.emotions = {
                satisfied: TouchedFields.touchedIntValue(mainFormTouched, 'tex-satisfied', document.getElementById('tex-satisfied')?.value),
                pleased: TouchedFields.touchedIntValue(mainFormTouched, 'tex-pleased', document.getElementById('tex-pleased')?.value),
                comforted: TouchedFields.touchedIntValue(mainFormTouched, 'tex-comforted', document.getElementById('tex-comforted')?.value),
                indulged: TouchedFields.touchedIntValue(mainFormTouched, 'tex-indulged', document.getElementById('tex-indulged')?.value),
                calmRelaxed: TouchedFields.touchedIntValue(mainFormTouched, 'tex-calmRelaxed', document.getElementById('tex-calmRelaxed')?.value),
                nostalgic: TouchedFields.touchedIntValue(mainFormTouched, 'tex-nostalgic', document.getElementById('tex-nostalgic')?.value),
                secure: TouchedFields.touchedIntValue(mainFormTouched, 'tex-secure', document.getElementById('tex-secure')?.value),
                excited: TouchedFields.touchedIntValue(mainFormTouched, 'tex-excited', document.getElementById('tex-excited')?.value),
                energized: TouchedFields.touchedIntValue(mainFormTouched, 'tex-energized', document.getElementById('tex-energized')?.value),
                delighted: TouchedFields.touchedIntValue(mainFormTouched, 'tex-delighted', document.getElementById('tex-delighted')?.value),
                refreshed: TouchedFields.touchedIntValue(mainFormTouched, 'tex-refreshed', document.getElementById('tex-refreshed')?.value),
                interested: TouchedFields.touchedIntValue(mainFormTouched, 'tex-interested', document.getElementById('tex-interested')?.value),
                playful: TouchedFields.touchedIntValue(mainFormTouched, 'tex-playful', document.getElementById('tex-playful')?.value),
                pleasantlySurprised: TouchedFields.touchedIntValue(mainFormTouched, 'tex-pleasantlySurprised', document.getElementById('tex-pleasantlySurprised')?.value),
                disgusted: TouchedFields.touchedIntValue(mainFormTouched, 'tex-disgusted', document.getElementById('tex-disgusted')?.value),
                disappointed: TouchedFields.touchedIntValue(mainFormTouched, 'tex-disappointed', document.getElementById('tex-disappointed')?.value),
                frustrated: TouchedFields.touchedIntValue(mainFormTouched, 'tex-frustrated', document.getElementById('tex-frustrated')?.value),
                annoyedIrritated: TouchedFields.touchedIntValue(mainFormTouched, 'tex-annoyedIrritated', document.getElementById('tex-annoyedIrritated')?.value),
                bored: TouchedFields.touchedIntValue(mainFormTouched, 'tex-bored', document.getElementById('tex-bored')?.value),
                uncomfortable: TouchedFields.touchedIntValue(mainFormTouched, 'tex-uncomfortable', document.getElementById('tex-uncomfortable')?.value),
                anxiousUneasy: TouchedFields.touchedIntValue(mainFormTouched, 'tex-anxiousUneasy', document.getElementById('tex-anxiousUneasy')?.value),
                unpleasantlySurprised: TouchedFields.touchedIntValue(mainFormTouched, 'tex-unpleasantlySurprised', document.getElementById('tex-unpleasantlySurprised')?.value),
                putOff: TouchedFields.touchedIntValue(mainFormTouched, 'tex-putOff', document.getElementById('tex-putOff')?.value),
                tiredFatigued: TouchedFields.touchedIntValue(mainFormTouched, 'tex-tiredFatigued', document.getElementById('tex-tiredFatigued')?.value),
                overwhelmed: TouchedFields.touchedIntValue(mainFormTouched, 'tex-overwhelmed', document.getElementById('tex-overwhelmed')?.value)
            };

            stages.aftertaste.emotions = {
                satisfaction: TouchedFields.touchedIntValue(mainFormTouched, 'after-satisfaction', document.getElementById('after-satisfaction')?.value),
                completeness: TouchedFields.touchedIntValue(mainFormTouched, 'after-completeness', document.getElementById('after-completeness')?.value),
                happiness: TouchedFields.touchedIntValue(mainFormTouched, 'after-happiness', document.getElementById('after-happiness')?.value),
                craving: TouchedFields.touchedIntValue(mainFormTouched, 'after-craving', document.getElementById('after-craving')?.value),
                calm: TouchedFields.touchedIntValue(mainFormTouched, 'after-calm', document.getElementById('after-calm')?.value),
                comforted: TouchedFields.touchedIntValue(mainFormTouched, 'after-comforted', document.getElementById('after-comforted')?.value),
                pleased: TouchedFields.touchedIntValue(mainFormTouched, 'after-pleased', document.getElementById('after-pleased')?.value),
                refreshed: TouchedFields.touchedIntValue(mainFormTouched, 'after-refreshed', document.getElementById('after-refreshed')?.value),
                nostalgic: TouchedFields.touchedIntValue(mainFormTouched, 'after-nostalgic', document.getElementById('after-nostalgic')?.value),
                surprised: TouchedFields.touchedIntValue(mainFormTouched, 'after-surprised', document.getElementById('after-surprised')?.value),
                disappointed: TouchedFields.touchedIntValue(mainFormTouched, 'after-disappointed', document.getElementById('after-disappointed')?.value),
                disgusted: TouchedFields.touchedIntValue(mainFormTouched, 'after-disgusted', document.getElementById('after-disgusted')?.value),
                guilty: TouchedFields.touchedIntValue(mainFormTouched, 'after-guilty', document.getElementById('after-guilty')?.value),
                worried: TouchedFields.touchedIntValue(mainFormTouched, 'after-worried', document.getElementById('after-worried')?.value),
                dissatisfied: TouchedFields.touchedIntValue(mainFormTouched, 'after-dissatisfied', document.getElementById('after-dissatisfied')?.value),
                bored: TouchedFields.touchedIntValue(mainFormTouched, 'after-bored', document.getElementById('after-bored')?.value),
                regret: TouchedFields.touchedIntValue(mainFormTouched, 'after-regret', document.getElementById('after-regret')?.value)
            };

            stages.overall.emotions = {
                satisfaction: TouchedFields.touchedIntValue(mainFormTouched, 'overall-satisfaction', document.getElementById('overall-satisfaction')?.value),
                happiness: TouchedFields.touchedIntValue(mainFormTouched, 'overall-happiness', document.getElementById('overall-happiness')?.value),
                pleasure: TouchedFields.touchedIntValue(mainFormTouched, 'overall-pleasure', document.getElementById('overall-pleasure')?.value),
                enjoyment: TouchedFields.touchedIntValue(mainFormTouched, 'overall-enjoyment', document.getElementById('overall-enjoyment')?.value),
                comfort: TouchedFields.touchedIntValue(mainFormTouched, 'overall-comfort', document.getElementById('overall-comfort')?.value),
                calm: TouchedFields.touchedIntValue(mainFormTouched, 'overall-calm', document.getElementById('overall-calm')?.value),
                warmth: TouchedFields.touchedIntValue(mainFormTouched, 'overall-warmth', document.getElementById('overall-warmth')?.value),
                joy: TouchedFields.touchedIntValue(mainFormTouched, 'overall-joy', document.getElementById('overall-joy')?.value),
                nostalgia: TouchedFields.touchedIntValue(mainFormTouched, 'overall-nostalgia', document.getElementById('overall-nostalgia')?.value),
                energized: TouchedFields.touchedIntValue(mainFormTouched, 'overall-energized', document.getElementById('overall-energized')?.value),
                loving: TouchedFields.touchedIntValue(mainFormTouched, 'overall-loving', document.getElementById('overall-loving')?.value),
                gratitude: TouchedFields.touchedIntValue(mainFormTouched, 'overall-gratitude', document.getElementById('overall-gratitude')?.value),
                proud: TouchedFields.touchedIntValue(mainFormTouched, 'overall-proud', document.getElementById('overall-proud')?.value),
                adventurous: TouchedFields.touchedIntValue(mainFormTouched, 'overall-adventurous', document.getElementById('overall-adventurous')?.value),
                indulgent: TouchedFields.touchedIntValue(mainFormTouched, 'overall-indulgent', document.getElementById('overall-indulgent')?.value),
                interested: TouchedFields.touchedIntValue(mainFormTouched, 'overall-interested', document.getElementById('overall-interested')?.value),
                relaxed: TouchedFields.touchedIntValue(mainFormTouched, 'overall-relaxed', document.getElementById('overall-relaxed')?.value),
                secure: TouchedFields.touchedIntValue(mainFormTouched, 'overall-secure', document.getElementById('overall-secure')?.value),
                desire: TouchedFields.touchedIntValue(mainFormTouched, 'overall-desire', document.getElementById('overall-desire')?.value),
                surprised: TouchedFields.touchedIntValue(mainFormTouched, 'overall-surprised', document.getElementById('overall-surprised')?.value),
                disappointed: TouchedFields.touchedIntValue(mainFormTouched, 'overall-disappointed', document.getElementById('overall-disappointed')?.value),
                disgusted: TouchedFields.touchedIntValue(mainFormTouched, 'overall-disgusted', document.getElementById('overall-disgusted')?.value),
                bored: TouchedFields.touchedIntValue(mainFormTouched, 'overall-bored', document.getElementById('overall-bored')?.value),
                guilty: TouchedFields.touchedIntValue(mainFormTouched, 'overall-guilty', document.getElementById('overall-guilty')?.value),
                worried: TouchedFields.touchedIntValue(mainFormTouched, 'overall-worried', document.getElementById('overall-worried')?.value),
                dissatisfied: TouchedFields.touchedIntValue(mainFormTouched, 'overall-dissatisfied', document.getElementById('overall-dissatisfied')?.value),
                sad: TouchedFields.touchedIntValue(mainFormTouched, 'overall-sad', document.getElementById('overall-sad')?.value),
                regret: TouchedFields.touchedIntValue(mainFormTouched, 'overall-regret', document.getElementById('overall-regret')?.value),
                angry: TouchedFields.touchedIntValue(mainFormTouched, 'overall-angry', document.getElementById('overall-angry')?.value),
                anxious: TouchedFields.touchedIntValue(mainFormTouched, 'overall-anxious', document.getElementById('overall-anxious')?.value),
                confused: TouchedFields.touchedIntValue(mainFormTouched, 'overall-confused', document.getElementById('overall-confused')?.value)
            };

            return stages;
        })(),
        needState: document.querySelector('input[name="need-state"]:checked').value,
        emotionalTriggers: {
            moreishness: TouchedFields.touchedIntValue(mainFormTouched, 'trigger-moreishness', document.getElementById('trigger-moreishness').value),
            refreshment: TouchedFields.touchedIntValue(mainFormTouched, 'trigger-refreshment', document.getElementById('trigger-refreshment').value),
            melt: TouchedFields.touchedIntValue(mainFormTouched, 'trigger-melt', document.getElementById('trigger-melt').value),
            crunch: TouchedFields.touchedIntValue(mainFormTouched, 'trigger-crunch', document.getElementById('trigger-crunch').value)
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
    TouchedFields.resetTouchedTracker(mainFormTouched);
    pendingTargetLink = null;
    clearTargetPrefillUi();
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
                // Supabase dual-write (Option A) - fire-and-forget, never
                // awaited here: it must never delay or fail this save.
                // Diffs against its own last-pushed snapshot internally,
                // so only new/changed experiences are actually sent.
                // No-op unless ENABLE_SUPABASE_DUAL_WRITE is true.
                if (window.SignatureSupabaseSync) {
                    window.SignatureSupabaseSync.syncSignatureExperiences(experiences);
                }
                // A doc in `orphanedIds` was deleted by someone else (another
                // tab/teammate) between when we last knew about it and this
                // save - saveExperiences() already skipped writing it rather
                // than resurrecting it. Drop it locally too and say so; this
                // is a normal, non-blocking event, not a save failure - every
                // OTHER change in this save still landed.
                if (result.orphanedIds && result.orphanedIds.length > 0) {
                    const orphanedIdSet = new Set(result.orphanedIds);
                    experiences = experiences.filter(e => !orphanedIdSet.has(String(e.id)));
                    if (window.UI && window.UI.toast) {
                        const message = result.orphanedIds.length === 1
                            ? 'This test was deleted by a teammate.'
                            : `${result.orphanedIds.length} tests were deleted by a teammate.`;
                        UI.toast.warning(message);
                    }
                    updateHistory();
                    updateDashboard();
                }
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
    // updateDashboard() runs after every load and every change to
    // `experiences`, which is exactly when the re-test selector (the only way
    // to add a test to an existing product) must be rebuilt. It used to be
    // rebuilt only after submitting a NEW entry, so products loaded from
    // Firestore/localStorage never appeared in it.
    updateRetestOptions();

    if (experiences.length === 0) {
        document.getElementById('stat-total').textContent = '0';
        document.getElementById('stat-products').textContent = '0';
        document.getElementById('stat-satisfaction').textContent = '-';
        document.getElementById('stat-need-state').textContent = '-';
        document.getElementById('recent-activity').innerHTML = '<p class="empty-state">No activity yet</p>';
        document.getElementById('quick-insights').innerHTML = '<p class="empty-state">No insights yet</p>';
        return;
    }

    // Filter out malformed experiences for safe processing
    const validExperiences = experiences.filter(e => e && e.productInfo && e.stages);

    // Update stats
    document.getElementById('stat-total').textContent = experiences.length;

    const uniqueProducts = new Set(validExperiences.map(e => e?.productInfo?.name).filter(Boolean)).size;
    document.getElementById('stat-products').textContent = uniqueProducts;

    if (validExperiences.length > 0) {
        const avgSatisfaction = validExperiences.reduce((sum, e) =>
            sum + (e?.stages?.aftertaste?.emotions?.satisfaction || 0), 0) / validExperiences.length;
        document.getElementById('stat-satisfaction').textContent = avgSatisfaction.toFixed(1);
    } else {
        document.getElementById('stat-satisfaction').textContent = '-';
    }

    const needStateCounts = {};
    validExperiences.forEach(e => {
        const ns = e?.needState || 'unknown';
        needStateCounts[ns] = (needStateCounts[ns] || 0) + 1;
    });
    const needStateKeys = Object.keys(needStateCounts);
    if (needStateKeys.length > 0) {
        const topNeedState = needStateKeys.reduce((a, b) =>
            needStateCounts[a] > needStateCounts[b] ? a : b);
        document.getElementById('stat-need-state').textContent =
            topNeedState.charAt(0).toUpperCase() + topNeedState.slice(1);
    } else {
        document.getElementById('stat-need-state').textContent = '-';
    }

    // Recent activity
    const recentHTML = RenderUtils.buildRecentActivityHtml(validExperiences.slice(-5).reverse());
    document.getElementById('recent-activity').innerHTML = recentHTML || '<p class="empty-state">No activity yet</p>';

    // Quick insights
    const insights = generateQuickInsights();
    const insightsHTML = RenderUtils.buildQuickInsightsHtml(insights);
    document.getElementById('quick-insights').innerHTML = insightsHTML || '<p class="empty-state">No insights yet</p>';
}

function generateQuickInsights() {
    const validExperiences = experiences.filter(e => e && e.productInfo && e.stages);
    if (validExperiences.length === 0) return [];

    const insights = [];

    // Highest rated product
    const highest = validExperiences.reduce((max, e) => {
        const eSat = e?.stages?.aftertaste?.emotions?.satisfaction || 0;
        const maxSat = max?.stages?.aftertaste?.emotions?.satisfaction || 0;
        return eSat > maxSat ? e : max;
    });
    const highestSat = highest?.stages?.aftertaste?.emotions?.satisfaction || 0;
    insights.push({
        title: 'Top Rated',
        text: `${highest?.productInfo?.name || 'Unknown'} (${highestSat}/10)`
    });

    // Most common need state
    const needStateCounts = {};
    validExperiences.forEach(e => {
        const ns = e?.needState || 'unknown';
        needStateCounts[ns] = (needStateCounts[ns] || 0) + 1;
    });
    const needStateKeys = Object.keys(needStateCounts);
    if (needStateKeys.length > 0) {
        const topNeed = needStateKeys.reduce((a, b) =>
            needStateCounts[a] > needStateCounts[b] ? a : b);
        insights.push({
            title: 'Dominant Need',
            text: `${topNeed.charAt(0).toUpperCase() + topNeed.slice(1)} (${needStateCounts[topNeed]} products)`
        });
    }

    return insights;
}

// ===== SHAPE OF TASTE =====
function updateShapeOfTasteView() {
    const select = document.getElementById('shape-product-select');
    select.innerHTML = RenderUtils.buildProductOptionsHtml(experiences);

    select.onchange = function() {
        const exp = experiences.find(e => e && e.id == this.value);
        if (exp && exp.productInfo) {
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

function isQualitativeTargetOnly(exp) {
    if (!exp || !exp.stages) return false;
    const sensoryStageKeys = ['appearance', 'aroma', 'frontMouth', 'midRearMouth', 'texture', 'aftertaste'];
    return sensoryStageKeys.every(function(key) {
        const stage = exp.stages[key];
        if (!stage) return true;
        return Object.keys(stage).every(function(k) {
            return k === 'emotions' || k === '_notes' || typeof stage[k] !== 'number';
        });
    });
}

function renderQualitativeTargetOverlay(exp) {
    const overlay = document.getElementById('shape-chart-qualitative-overlay');
    if (!overlay) return;
    overlay.innerHTML = '';

    const stageLabels = [
        ['appearance', 'Appearance'], ['aroma', 'Aroma'], ['frontMouth', 'Front of Mouth'],
        ['midRearMouth', 'Mid/Rear Mouth'], ['texture', 'Texture'], ['aftertaste', 'Aftertaste']
    ];

    const container = document.createElement('div');
    container.style.cssText = 'padding:16px;background:var(--qep-cream-2);border-radius:14px;';

    const heading = document.createElement('div');
    heading.style.cssText = 'font-weight:600;color:var(--qep-gold-deep);margin-bottom:8px;';
    heading.textContent = 'Qualitative Target Taste Signature (Brief Translator export — not numerically measured)';
    container.appendChild(heading);

    stageLabels.forEach(function(pair) {
        const key = pair[0];
        const label = pair[1];
        const stage = (exp.stages && exp.stages[key]) || {};
        const notesText = (stage._notes && String(stage._notes).trim()) ? String(stage._notes) : 'Not specified';

        const row = document.createElement('div');
        row.style.cssText = 'padding:10px 0;border-bottom:1px solid var(--qep-line);';

        const strong = document.createElement('strong');
        strong.style.color = 'var(--qep-ink)';
        strong.textContent = label + ': ';
        row.appendChild(strong);

        const span = document.createElement('span');
        span.style.color = 'var(--qep-ink-2)';
        span.textContent = notesText;
        row.appendChild(span);

        container.appendChild(row);
    });

    overlay.appendChild(container);
}

function renderShapeOfTaste(exp) {
    if (!exp || !exp.stages) return;

    const canvas = document.getElementById('shape-chart');
    const overlay = document.getElementById('shape-chart-qualitative-overlay');

    if (isQualitativeTargetOnly(exp)) {
        destroyChart('shape');
        if (canvas) canvas.style.display = 'none';
        if (overlay) overlay.style.display = 'block';
        renderQualitativeTargetOverlay(exp);
        return;
    }

    if (canvas) canvas.style.display = 'block';
    if (overlay) overlay.style.display = 'none';

    const ctx = canvas.getContext('2d');

    destroyChart('shape');

    const stages = ['Appearance', 'Aroma', 'Front', 'Mid/Rear', 'Texture', 'Aftertaste'];
    const intensities = [
        exp.stages.appearance?.visualAppeal ?? 0,
        exp.stages.aroma?.smellStrength ?? 0,
        exp.stages.frontMouth?.overallInitialImpact ?? 0,
        exp.stages.midRearMouth?.overallMidPalateIntensity ?? 0,
        exp.stages.texture?.overallTexturalComplexity ?? 0,
        exp.stages.aftertaste?.finishLength ?? 0
    ];

    charts.shape = new Chart(ctx, {
        type: 'line',
        data: {
            labels: stages,
            datasets: [{
                label: 'Intensity Journey',
                data: intensities,
                borderColor: '#C2871B',
                backgroundColor: 'rgba(194, 135, 27, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointBackgroundColor: '#C2871B',
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
                    text: `${exp.productInfo?.name ?? 'Unknown'} - Shape of Taste`,
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
    if (!exp || !exp.stages) return;

    const ctx = document.getElementById('emotional-journey-chart').getContext('2d');

    destroyChart('emotionalJourney');

    const stages = ['Appearance', 'Aroma', 'Front', 'Mid/Rear', 'Texture', 'Aftertaste', 'Overall'];

    // Helper to calculate average of all positive emotion values in a stage
    function avgPositiveEmotions(emotions) {
        if (!emotions) return 0;
        const vals = Object.values(emotions).filter(v => typeof v === 'number' && v > 0);
        return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    }

    // Get average emotional response per stage
    const emotionalData = [
        avgPositiveEmotions(exp.stages.appearance?.emotions),
        avgPositiveEmotions(exp.stages.aroma?.emotions),
        avgPositiveEmotions(exp.stages.frontMouth?.emotions),
        avgPositiveEmotions(exp.stages.midRearMouth?.emotions),
        avgPositiveEmotions(exp.stages.texture?.emotions),
        avgPositiveEmotions(exp.stages.aftertaste?.emotions),
        avgPositiveEmotions(exp.stages.overall?.emotions)
    ];

    charts.emotionalJourney = new Chart(ctx, {
        type: 'line',
        data: {
            labels: stages,
            datasets: [{
                label: 'Emotional Response',
                data: emotionalData,
                borderColor: '#8A5E12',
                backgroundColor: 'rgba(138, 94, 18, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointBackgroundColor: '#8A5E12',
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
        const state = e?.needState;
        if (state && needStateCounts.hasOwnProperty(state)) {
            needStateCounts[state]++;
        }
    });

    charts.needState = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Reward', 'Escape', 'Rejuvenation', 'Sociability'],
            datasets: [{
                data: Object.values(needStateCounts),
                backgroundColor: window.QEP_CHART_PALETTE.slice(0, 4)
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
        avgTriggers.moreishness += e?.emotionalTriggers?.moreishness || 0;
        avgTriggers.refreshment += e?.emotionalTriggers?.refreshment || 0;
        avgTriggers.melt += e?.emotionalTriggers?.melt || 0;
        avgTriggers.crunch += e?.emotionalTriggers?.crunch || 0;
    });

    const count = experiences.length || 1;
    Object.keys(avgTriggers).forEach(key => {
        avgTriggers[key] /= count;
    });

    charts.triggers = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Moreishness', 'Refreshment', 'The Melt', 'Texture/Crunch'],
            datasets: [{
                label: 'Average Intensity',
                data: Object.values(avgTriggers),
                backgroundColor: window.QEP_CHART_PALETTE.slice(0, 4)
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
        avgTriggers.moreishness += e?.emotionalTriggers?.moreishness || 0;
        avgTriggers.refreshment += e?.emotionalTriggers?.refreshment || 0;
        avgTriggers.melt += e?.emotionalTriggers?.melt || 0;
        avgTriggers.crunch += e?.emotionalTriggers?.crunch || 0;
    });

    const count = experiences.length || 1;
    Object.keys(avgTriggers).forEach(key => {
        avgTriggers[key] /= count;
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

    container.innerHTML = RenderUtils.buildComparisonListHtml(experiences);

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

    // Show AI button when the platform AI proxy is usable (signed in)
    if (isAIAvailable()) {
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
                <strong>❌ Error:</strong> ${escapeHtml(error.message)}
                <p style="margin-top: 10px; font-size: 0.9rem;">
                    AI insights are provided by the platform. Make sure you are signed in, then try again.
                </p>
            </div>
        `;
    }
}

// Format AI response for display. AI output is untrusted: RenderUtils escapes
// it before adding the fixed set of formatting tags.
function formatAIResponse(text) {
    return RenderUtils.formatAIResponse(text);
}

function renderComparisonShapeChart(products) {
    const ctx = document.getElementById('comparison-shape-chart').getContext('2d');

    destroyChart('comparisonShape');

    const stages = ['Appearance', 'Aroma', 'Front', 'Mid/Rear', 'Texture', 'Aftertaste'];
    const colors = window.QEP_CHART_PALETTE.slice(0, 4);

    const datasets = products.map((exp, idx) => ({
        label: exp.productInfo.name,
        data: [
            exp.stages.appearance?.visualAppeal ?? 0,
            exp.stages.aroma?.smellStrength ?? 0,
            exp.stages.frontMouth?.overallInitialImpact ?? 0,
            exp.stages.midRearMouth?.overallMidPalateIntensity ?? 0,
            exp.stages.texture?.overallTexturalComplexity ?? 0,
            exp.stages.aftertaste?.finishLength ?? 0
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
    const html = RenderUtils.buildComparisonNeedStateHtml(products);

    document.getElementById('comparison-need-state').innerHTML = html;
}

function renderComparisonTriggers(products) {
    const ctx = document.getElementById('comparison-triggers-chart').getContext('2d');

    destroyChart('comparisonTriggers');

    const colors = window.QEP_CHART_PALETTE.slice(0, 4);

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

    const html = RenderUtils.buildComparisonSummaryCardsHtml(
        { name: highest.product.productInfo.name, label: highest.avg.toFixed(1) },
        { name: mostConsistent.product.productInfo.name, label: mostConsistent.stdDev.toFixed(2) },
        { name: strongestEmotion.product.productInfo.name, label: strongestEmotion.emotionSum.toFixed(0) }
    );

    container.innerHTML = html;
}

// ===== NEW: DETAILED ATTRIBUTE COMPARISON MATRIX =====
function renderComparisonAttributeMatrix(products) {
    const container = document.getElementById('comparison-attribute-matrix');

    // Define all attributes by stage (mapped to actual data shape)
    const attributeStructure = [
        {
            stage: 'Appearance',
            attributes: [
                { key: 'visualAppeal', label: 'Visual Appeal' },
                { key: 'colorRichness', label: 'Color Richness' },
                { key: 'surfaceShine', label: 'Surface Shine' }
            ],
            stageKey: 'appearance'
        },
        {
            stage: 'Aroma',
            attributes: [
                { key: 'smellStrength', label: 'Smell Strength' },
                { key: 'smellComplexity', label: 'Smell Complexity' },
                { key: 'smellBalance', label: 'Smell Balance' },
                { key: 'fruityNotes', label: 'Fruity Notes' }
            ],
            stageKey: 'aroma'
        },
        {
            stage: 'Front of Mouth',
            attributes: [
                { key: 'overallInitialImpact', label: 'Overall Initial Impact' },
                { key: 'sweetness', label: 'Sweetness' },
                { key: 'sournessTartness', label: 'Sourness/Tartness' },
                { key: 'saltiness', label: 'Saltiness' }
            ],
            stageKey: 'frontMouth'
        },
        {
            stage: 'Mid/Rear Mouth',
            attributes: [
                { key: 'overallMidPalateIntensity', label: 'Overall Mid-Palate Intensity' },
                { key: 'flavourDepth', label: 'Flavour Depth' },
                { key: 'tasteBalance', label: 'Taste Balance' },
                { key: 'richnessFullness', label: 'Richness/Fullness' }
            ],
            stageKey: 'midRearMouth'
        },
        {
            stage: 'Aftertaste',
            attributes: [
                { key: 'finishLength', label: 'Finish Length' },
                { key: 'finishQuality', label: 'Finish Quality' },
                { key: 'palateCleansing', label: 'Palate Cleansing' },
                { key: 'flavourLinger', label: 'Flavour Linger' }
            ],
            stageKey: 'aftertaste'
        }
    ];

    // Build table header
    let tableHTML = '<table class="comparison-table"><thead><tr>';
    tableHTML += '<th style="min-width: 200px;">Attribute</th>';
    products.forEach(p => {
        tableHTML += `<th class="product-col">${escapeHtml(p.productInfo.name)}</th>`;
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
        { border: '#E3A93B', bg: 'rgba(227, 169, 59, 0.2)' },
        { border: '#C67C24', bg: 'rgba(198, 124, 36, 0.2)' },
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
                        color: '#221E18'
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
        tableHTML += `<th>${escapeHtml(emotion)}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';

    // Build rows - one per product
    products.forEach(product => {
        tableHTML += '<tr>';
        tableHTML += `<td class="product-name">${escapeHtml(product.productInfo.name)}</td>`;

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
                <span style="padding: 8px 12px; background: #F1E4C8; color: #8A5E12; border-radius: 4px; font-size: 0.85rem;">2-4 Moderate</span>
                <span style="padding: 8px 12px; background: #E3A93B; color: #5A4410; border-radius: 4px; font-size: 0.85rem;">5-7 Strong</span>
                <span style="padding: 8px 12px; background: #8A5E12; color: white; border-radius: 4px; font-size: 0.85rem; font-weight: bold;">8-10 Very Strong</span>
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
            <strong>${escapeHtml(i.title)}</strong>
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
        description: `Your product portfolio primarily serves <strong>${escapeHtml(dominantNeed)}</strong> occasions (${((needStateCounts[dominantNeed] / experiences.length) * 100).toFixed(0)}% of products).`
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
        description: `<strong>${escapeHtml(topProduct.productInfo.name)}</strong> by ${escapeHtml(topProduct.productInfo.brand)} achieves the highest satisfaction (${topProduct.stages.aftertaste.emotions.satisfaction}/10).`
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

    // "Send to Capture" button (send-to-capture.js) - renders nothing unless
    // ENABLE_SEND_TO_CAPTURE is on in qep-capture-config.js.
    const sendToCapture = window.SendToCapture;
    container.innerHTML = RenderUtils.buildHistoryHtml(
        experiences.sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
        sendToCapture ? { extraActionsHtml: (e) => sendToCapture.buildSendToCaptureButtonHtml(e) } : undefined
    );
}

// Called from the history row's "Send to Capture" button. Ids are floats -
// the button passes the id as a JSON number literal (jsArgAttr), so strict
// equality matches like deleteExperience() does.
function sendExperienceToCapture(id, buttonEl) {
    if (!window.SendToCapture) return;
    const experience = experiences.find(e => e.id === id);
    window.SendToCapture.handleClick(experience, buttonEl);
}

async function deleteExperience(id) {
    if (confirm('Are you sure you want to delete this experience?')) {
        experiences = experiences.filter(e => e.id !== id);
        // Explicit delete - saveExperiences() never infers a deletion from
        // an id's absence, so the removal itself must be told to Firestore
        // directly, not left for the next save to "notice".
        if (isCloudSyncEnabled && firestoreManager) {
            const result = await firestoreManager.deleteExperience(id);
            if (!result.success) {
                console.error('Failed to delete from cloud:', result.error);
            }
        }
        // Explicit delete only - same fire-and-forget contract as the push
        // in saveData(). No-op unless ENABLE_SUPABASE_DUAL_WRITE is true.
        if (window.SignatureSupabaseSync) {
            window.SignatureSupabaseSync.deleteSignatureProfile(id, experiences);
        }
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
document.getElementById('clear-data').addEventListener('click', async () => {
    if (confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
        const idsBeingCleared = experiences.map(e => e.id);
        experiences = [];
        // Explicit bulk delete - same reasoning as deleteExperience(): a
        // save with an empty array must not be what clears Firestore.
        if (isCloudSyncEnabled && firestoreManager) {
            const result = await firestoreManager.clearAllData();
            if (!result.success) {
                console.error('Failed to clear cloud data:', result.error);
            }
        }
        // Explicit bulk delete only - same fire-and-forget contract as the
        // push in saveData(). No-op unless ENABLE_SUPABASE_DUAL_WRITE is true.
        if (window.SignatureSupabaseSync) {
            idsBeingCleared.forEach(id => {
                window.SignatureSupabaseSync.deleteSignatureProfile(id, experiences);
            });
        }
        saveData();
        updateHistory();
        updateDashboard();
        Object.values(charts).forEach(chart => chart && chart.destroy());
        charts = {};
    }
});

// ===== EMOTIONAL MAPPING & CORRELATION =====
function updateEmotionalMappingView() {
    const select = document.getElementById('emotional-product-select');
    select.innerHTML = RenderUtils.buildProductOptionsHtml(experiences);

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
        'Appearance': exp.stages.appearance?.emotions || {},
        'Aroma': exp.stages.aroma?.emotions || {},
        'Front': exp.stages.frontMouth?.emotions || {},
        'Mid/Rear': exp.stages.midRearMouth?.emotions || {},
        'Aftertaste': exp.stages.aftertaste?.emotions || {},
        'Overall': exp.stages.overall?.emotions || {}
    };

    // Get all unique emotion types, filter to only those with values > 0 in at least one stage
    const emotionTypes = new Set();
    Object.values(emotionsByStage).forEach(emotions => {
        Object.entries(emotions).forEach(([emotion, value]) => {
            if (value > 0) emotionTypes.add(emotion);
        });
    });

    // Extended color palette for larger emotion sets
    const colors = window.QEP_CHART_PALETTE;

    // Create datasets for each emotion type
    const datasets = Array.from(emotionTypes).map((emotion, idx) => {
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
        'Appearance': calculateAvgEmotions(exp.stages.appearance?.emotions || {}),
        'Aroma': calculateAvgEmotions(exp.stages.aroma?.emotions || {}),
        'Front': calculateAvgEmotions(exp.stages.frontMouth?.emotions || {}),
        'Mid/Rear': calculateAvgEmotions(exp.stages.midRearMouth?.emotions || {}),
        'Aftertaste': calculateAvgEmotions(exp.stages.aftertaste?.emotions || {}),
        'Overall': calculateAvgEmotions(exp.stages.overall?.emotions || {})
    };

    charts.shapeEmotion = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Object.keys(avgByStage),
            datasets: [{
                label: 'Average Emotional Intensity',
                data: Object.values(avgByStage),
                borderColor: '#8A5E12',
                backgroundColor: 'rgba(138, 94, 18, 0.2)',
                borderWidth: 4,
                fill: true,
                tension: 0.4,
                pointRadius: 8,
                pointBackgroundColor: '#8A5E12',
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

    // Aggregate all emotions across all stages. Same typeof guard used
    // throughout export-reporting.js/temporal-analysis.js - excludes null
    // (untouched/unrated) values instead of letting them coerce to 0 and
    // silently drag the average down.
    const allEmotions = {};
    Object.values(exp.stages).forEach(stage => {
        if (stage.emotions) {
            Object.entries(stage.emotions).forEach(([emotion, value]) => {
                if (typeof value !== 'number') return;
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
                backgroundColor: 'rgba(138, 94, 18, 0.2)',
                borderColor: '#8A5E12',
                borderWidth: 2,
                pointBackgroundColor: '#8A5E12',
                pointBorderColor: '#fff',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 10,
                    pointLabels: {
                        font: {
                            size: Object.keys(emotionAverages).length > 20 ? 8 : 10
                        }
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

function renderCorrelationHeatmap(exp) {
    const container = document.getElementById('correlation-heatmap');

    // Get all sensory attributes (including new ones)
    // Build sensory attributes dynamically from all stages
    const sensoryAttributes = {};
    const stageIdPrefixMap = {
        appearance: 'Appearance',
        aroma: 'Aroma',
        frontMouth: 'Front',
        midRearMouth: 'Mid/Rear',
        texture: 'Texture',
        aftertaste: 'Aftertaste',
        overall: 'Overall'
    };
    Object.entries(exp.stages).forEach(([stageId, stageData]) => {
        if (!stageData) return;
        const stageLabel = stageIdPrefixMap[stageId] || stageId;
        Object.entries(stageData).forEach(([key, value]) => {
            if (key !== 'emotions' && typeof value === 'number') {
                const label = `${stageLabel}: ${key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim()}`;
                sensoryAttributes[label] = value;
            }
        });
    });

    // Get all emotional outcomes
    const emotions = {};
    Object.values(exp.stages).forEach(stage => {
        if (stage && stage.emotions) {
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
        html += `<th>${escapeHtml(emotion.charAt(0).toUpperCase() + emotion.slice(1))}</th>`;
    });
    html += '</tr></thead><tbody>';

    Object.entries(sensoryAttributes).forEach(([sensory, sensoryValue]) => {
        html += `<tr><td>${escapeHtml(sensory)}</td>`;
        Object.entries(emotions).forEach(([emotion, emotionValue]) => {
            // Calculate normalized correlation strength (0-1 scale)
            // Formula: (sensory/10) * (emotion/10) - represents combined intensity
            const correlation = (sensoryValue * emotionValue) / 100;
            const correlationClass = getCorrelationClass(correlation);
            html += `<td><div class="heatmap-cell ${correlationClass}" title="${escapeHtml(sensory)} × ${escapeHtml(emotion)}: ${correlation.toFixed(2)}">${correlation.toFixed(2)}</div></td>`;
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
                <h4>#${idx + 1} ${escapeHtml(item.emotion.charAt(0).toUpperCase() + item.emotion.slice(1))}</h4>
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

    // Build sensory attributes dynamically from all stages
    const sensoryAttributes = {};
    const stageLabels = {
        appearance: 'Appearance',
        aroma: 'Aroma',
        frontMouth: 'Front',
        midRearMouth: 'Mid/Rear',
        texture: 'Texture',
        aftertaste: 'Aftertaste',
        overall: 'Overall'
    };
    Object.entries(exp.stages).forEach(([stageId, stageData]) => {
        if (!stageData) return;
        const stageLabel = stageLabels[stageId] || stageId;
        Object.entries(stageData).forEach(([key, value]) => {
            if (key !== 'emotions' && typeof value === 'number') {
                const label = `${stageLabel}: ${key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim()}`;
                sensoryAttributes[label] = value;
            }
        });
    });

    // Get all emotional outcomes
    const emotions = {};
    Object.values(exp.stages).forEach(stage => {
        if (stage && stage.emotions) {
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
                    <span><strong>${escapeHtml(corr.sensory)}</strong> drives <strong>${escapeHtml(corr.emotion)}</strong>
                    <span class="insight-strength ${strengthClass}">${corr.strength.toFixed(2)}</span></span>
                </li>
            `;
        });

        // Add strategic recommendation
        const topCorr = correlations[0];
        html += '</ul>';
        html += `<div style="margin-top: 15px; padding: 12px; background: rgba(76, 175, 80, 0.1); border-radius: 6px;">
            <strong>💡 Formulation Tip:</strong> ${escapeHtml(getActionableInsight(topCorr.sensory, topCorr.emotion, topCorr.category))}
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
    const needStateColors = window.QEP_NEED_STATE_COLORS;

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
                    `${escapeHtml(state.charAt(0).toUpperCase() + state.slice(1))}: ${count}`
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
            text: overlaps.map(o => `${escapeHtml(o.product1)} and ${escapeHtml(o.product2)} are emotionally similar (may compete for same consumer)`).join('<br>')
        });
    }

    // Find unique positioning
    const unique = findUniqueProducts();
    if (unique.length > 0) {
        insights.push({
            icon: '🎯',
            title: 'Unique Positioning',
            text: unique.map(p => `${escapeHtml(p.name)} occupies distinct emotional territory`).join('<br>')
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
                        <strong>Sign In Required</strong>
                        <p style="margin: 5px 0 0 0;">AI features are provided by the platform. Please sign in to use them - no API key is needed.</p>
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
                        <p style="margin: 5px 0 0 0;">Using model: ${escapeHtml(claudeAI.model)}</p>
                    </div>
                </div>
            `;
        }
    }

    // Populate product selector
    const productSelect = document.getElementById('ai-product-select');
    productSelect.innerHTML = RenderUtils.buildProductOptionsHtml(experiences);

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

    // AI output and title (may contain a product name) are escaped inside
    // RenderUtils before the fixed formatting tags are applied.
    container.innerHTML = RenderUtils.buildAIResponseCardHtml(content, title);

    container.scrollIntoView({ behavior: 'smooth' });
}

function showAIError(message) {
    document.getElementById('ai-loading').style.display = 'none';
    const container = document.getElementById('ai-response-container');
    container.style.display = 'block';

    container.innerHTML = RenderUtils.buildAIErrorHtml(message, `
                <strong>Common issues:</strong><br>
                • Not signed in, or your session expired (sign in again)<br>
                • Hourly AI request limit reached (try again later)<br>
                • Network connection issues<br>
                • Daily AI insight quota reached
            `);
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

    function randEmoVal(base) { return Math.min(10, Math.max(0, base + Math.floor(Math.random() * 3) - 1)); }

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
                emotions: {
                    anticipation: randEmoVal(7), curiosity: randEmoVal(6), desire: randEmoVal(6), eager: randEmoVal(5),
                    excitement: randEmoVal(6), happiness: randEmoVal(6), interest: randEmoVal(6), pleased: randEmoVal(5),
                    surprise: randEmoVal(4), attracted: randEmoVal(6),
                    disappointed: 0, disgusted: 0, indifferent: 0, suspicious: 0, worried: 0, anxious: 0, confused: 0, bored: 0
                }
            },
            aroma: {
                intensity: 6 + Math.floor(Math.random() * 3),
                pleasantness: 7 + Math.floor(Math.random() * 3),
                complexity: 6 + Math.floor(Math.random() * 3),
                emotions: {
                    pleasure: randEmoVal(7), comfort: randEmoVal(6), nostalgia: randEmoVal(5), happiness: randEmoVal(6),
                    energized: randEmoVal(5), relaxed: randEmoVal(5), intrigued: randEmoVal(5), refreshed: randEmoVal(5),
                    desire: randEmoVal(5), warm: randEmoVal(5), soothed: randEmoVal(4), surprised: randEmoVal(4),
                    interested: randEmoVal(5), calm: randEmoVal(5),
                    disgusted: 0, irritated: 0, worried: 0, disappointed: 0, indifferent: 0, anxious: 0, repulsed: 0
                }
            },
            frontMouth: {
                sweetness: config.profile.sweet || 5,
                sourness: config.profile.sourness || 3,
                bitterness: config.profile.bitter || 2,
                saltiness: config.profile.saltiness || 3,
                umami: config.profile.umami || 2,
                spiciness: config.profile.spiciness || 1,
                emotions: {
                    excitement: randEmoVal(6), surprise: randEmoVal(4), happiness: randEmoVal(6), pleasure: randEmoVal(7),
                    interest: randEmoVal(5), satisfaction: randEmoVal(7), energized: randEmoVal(5), delighted: randEmoVal(6),
                    amused: randEmoVal(4),
                    disappointed: 0, disgusted: 0, bored: 0, confused: 0, overwhelmed: 0, upset: 0, worried: 0
                }
            },
            midRearMouth: {
                richness: config.profile.richness || 5,
                creaminess: config.profile.creaminess || 5,
                mouthCoating: 5 + Math.floor(Math.random() * 3),
                textureAppeal: 6 + Math.floor(Math.random() * 3),
                emotions: {
                    satisfaction: randEmoVal(7), pleasure: randEmoVal(7), indulgence: randEmoVal(6), comfort: randEmoVal(6),
                    calm: randEmoVal(5), warmth: randEmoVal(5), joy: randEmoVal(6), loving: randEmoVal(4),
                    adventurous: randEmoVal(4), energized: randEmoVal(5), secure: randEmoVal(4), nostalgic: randEmoVal(4),
                    guilty: 0, bored: 0, disgusted: 0, disappointed: 0, aggressive: 0, overwhelmed: 0, dissatisfied: 0, sad: 0
                }
            },
            aftertaste: {
                duration: 6 + Math.floor(Math.random() * 3),
                pleasantness: 7 + Math.floor(Math.random() * 3),
                lingering: 6 + Math.floor(Math.random() * 3),
                emotions: {
                    satisfaction: randEmoVal(7), completeness: randEmoVal(6), happiness: randEmoVal(6), craving: randEmoVal(5),
                    calm: randEmoVal(5), comforted: randEmoVal(5), pleased: randEmoVal(6), refreshed: randEmoVal(5),
                    nostalgic: randEmoVal(4), surprised: randEmoVal(3),
                    disappointed: 0, disgusted: 0, guilty: 0, worried: 0, dissatisfied: 0, bored: 0, regret: 0
                }
            },
            overall: {
                emotions: {
                    satisfaction: randEmoVal(7), happiness: randEmoVal(7), pleasure: randEmoVal(7), enjoyment: randEmoVal(7),
                    comfort: randEmoVal(6), calm: randEmoVal(5), warmth: randEmoVal(5), joy: randEmoVal(6),
                    nostalgia: randEmoVal(4), energized: randEmoVal(5), loving: randEmoVal(4), gratitude: randEmoVal(4),
                    proud: randEmoVal(3), adventurous: randEmoVal(4), indulgent: randEmoVal(5), interested: randEmoVal(5),
                    relaxed: randEmoVal(5), secure: randEmoVal(4), desire: randEmoVal(5), surprised: randEmoVal(3),
                    disappointed: 0, disgusted: 0, bored: 0, guilty: 0, worried: 0, dissatisfied: 0, sad: 0, regret: 0, angry: 0, anxious: 0, confused: 0
                }
            }
        },
        emotionalTriggers: {
            moreishness: 6 + Math.floor(Math.random() * 4),
            refreshment: config.needState === 'Refreshment' ? 8 + Math.floor(Math.random() * 2) : 4,
            melt: config.profile.creaminess || 5,
            crunch: config.type === 'Snack' ? 7 + Math.floor(Math.random() * 3) : 2
        },
        notes: `Sample product demonstrating ${config.needState} need state.`
    };

    // Boost specific emotions based on config
    config.emotions.forEach(emotion => {
        const val = emotionMap[emotion] || 7;
        // Apply to relevant stages
        Object.values(experience.stages).forEach(stage => {
            if (stage.emotions && emotion in stage.emotions) {
                stage.emotions[emotion] = val;
            }
        });
    });

    return experience;
}

// Initialize tutorial on page load
setTimeout(() => {
    initTutorial();
}, 1500);
