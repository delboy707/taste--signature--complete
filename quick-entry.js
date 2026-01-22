// ===== QUICK ENTRY MODULE =====
// Streamlined data entry for rapid product evaluation (2-3 min vs 8-12 min)

// Category templates with sensible defaults based on product type
const CATEGORY_TEMPLATES = {
    'premium-chocolate': {
        name: 'Premium Chocolate',
        icon: '🍫',
        defaults: {
            appearance: { visualAppeal: 8, colorIntensity: 7 },
            aroma: { intensity: 7, complexity: 7 },
            taste: { sweetness: 6, bitterness: 5, richness: 8 },
            texture: 8,
            aftertaste: { duration: 7, pleasantness: 7 },
            suggestedNeedState: 'reward',
            suggestedEmotions: ['indulgence', 'comfort', 'pleasure']
        },
        guidance: 'Focus on cocoa intensity, melt quality, and lingering finish'
    },
    'milk-chocolate': {
        name: 'Milk Chocolate',
        icon: '🍫',
        defaults: {
            appearance: { visualAppeal: 7, colorIntensity: 5 },
            aroma: { intensity: 6, complexity: 5 },
            taste: { sweetness: 7, bitterness: 2, richness: 6 },
            texture: 7,
            aftertaste: { duration: 5, pleasantness: 7 },
            suggestedNeedState: 'reward',
            suggestedEmotions: ['comfort', 'happiness', 'nostalgia']
        },
        guidance: 'Assess creaminess, sweetness balance, and melt smoothness'
    },
    'craft-beer-ipa': {
        name: 'Craft Beer IPA',
        icon: '🍺',
        defaults: {
            appearance: { visualAppeal: 7, colorIntensity: 6 },
            aroma: { intensity: 8, complexity: 8 },
            taste: { sweetness: 3, bitterness: 7, richness: 5 },
            texture: 5,
            aftertaste: { duration: 7, pleasantness: 6 },
            suggestedNeedState: 'escape',
            suggestedEmotions: ['excitement', 'curiosity', 'energy']
        },
        guidance: 'Note hop character, bitterness balance, and aromatic complexity'
    },
    'craft-beer-stout': {
        name: 'Craft Beer Stout',
        icon: '🍺',
        defaults: {
            appearance: { visualAppeal: 7, colorIntensity: 9 },
            aroma: { intensity: 7, complexity: 7 },
            taste: { sweetness: 4, bitterness: 5, richness: 8 },
            texture: 7,
            aftertaste: { duration: 6, pleasantness: 7 },
            suggestedNeedState: 'reward',
            suggestedEmotions: ['indulgence', 'comfort', 'satisfaction']
        },
        guidance: 'Focus on roast character, body, and chocolate/coffee notes'
    },
    'soft-drink': {
        name: 'Soft Drink / Soda',
        icon: '🥤',
        defaults: {
            appearance: { visualAppeal: 6, colorIntensity: 5 },
            aroma: { intensity: 5, complexity: 4 },
            taste: { sweetness: 7, sourness: 3, richness: 3 },
            texture: 5,
            aftertaste: { duration: 4, pleasantness: 6 },
            suggestedNeedState: 'rejuvenation',
            suggestedEmotions: ['refreshment', 'energy', 'happiness']
        },
        guidance: 'Assess carbonation, sweetness level, and refreshing quality'
    },
    'energy-drink': {
        name: 'Energy Drink',
        icon: '⚡',
        defaults: {
            appearance: { visualAppeal: 5, colorIntensity: 6 },
            aroma: { intensity: 6, complexity: 4 },
            taste: { sweetness: 6, sourness: 4, richness: 2 },
            texture: 4,
            aftertaste: { duration: 5, pleasantness: 5 },
            suggestedNeedState: 'rejuvenation',
            suggestedEmotions: ['energy', 'excitement', 'alertness']
        },
        guidance: 'Note energy sensation, sweetness balance, and drinkability'
    },
    'artisan-coffee': {
        name: 'Artisan Coffee',
        icon: '☕',
        defaults: {
            appearance: { visualAppeal: 7, colorIntensity: 8 },
            aroma: { intensity: 8, complexity: 8 },
            taste: { sweetness: 3, bitterness: 6, richness: 7 },
            texture: 6,
            aftertaste: { duration: 7, pleasantness: 7 },
            suggestedNeedState: 'rejuvenation',
            suggestedEmotions: ['energy', 'comfort', 'pleasure']
        },
        guidance: 'Assess roast character, acidity, body, and flavor notes'
    },
    'premium-ice-cream': {
        name: 'Premium Ice Cream',
        icon: '🍦',
        defaults: {
            appearance: { visualAppeal: 8, colorIntensity: 6 },
            aroma: { intensity: 6, complexity: 5 },
            taste: { sweetness: 7, richness: 8 },
            texture: 9,
            aftertaste: { duration: 5, pleasantness: 8 },
            suggestedNeedState: 'reward',
            suggestedEmotions: ['indulgence', 'happiness', 'comfort']
        },
        guidance: 'Focus on creaminess, flavor intensity, and melt texture'
    },
    'savory-snack': {
        name: 'Savory Snack / Chips',
        icon: '🍿',
        defaults: {
            appearance: { visualAppeal: 6, colorIntensity: 5 },
            aroma: { intensity: 6, complexity: 5 },
            taste: { saltiness: 6, umami: 5, richness: 5 },
            texture: 7,
            aftertaste: { duration: 4, pleasantness: 6 },
            suggestedNeedState: 'escape',
            suggestedEmotions: ['satisfaction', 'moreishness', 'comfort']
        },
        guidance: 'Assess crunch, seasoning balance, and moreishness'
    },
    'sweet-snack': {
        name: 'Sweet Snack / Cookie',
        icon: '🍪',
        defaults: {
            appearance: { visualAppeal: 7, colorIntensity: 5 },
            aroma: { intensity: 6, complexity: 5 },
            taste: { sweetness: 7, richness: 6 },
            texture: 7,
            aftertaste: { duration: 5, pleasantness: 7 },
            suggestedNeedState: 'reward',
            suggestedEmotions: ['comfort', 'happiness', 'nostalgia']
        },
        guidance: 'Note sweetness level, texture (crispy/chewy), and satisfaction'
    },
    'yogurt': {
        name: 'Yogurt',
        icon: '🥛',
        defaults: {
            appearance: { visualAppeal: 6, colorIntensity: 4 },
            aroma: { intensity: 5, complexity: 4 },
            taste: { sweetness: 5, sourness: 4, richness: 5 },
            texture: 7,
            aftertaste: { duration: 4, pleasantness: 6 },
            suggestedNeedState: 'rejuvenation',
            suggestedEmotions: ['freshness', 'comfort', 'satisfaction']
        },
        guidance: 'Assess creaminess, tanginess, and overall freshness'
    },
    'juice-smoothie': {
        name: 'Juice / Smoothie',
        icon: '🧃',
        defaults: {
            appearance: { visualAppeal: 7, colorIntensity: 7 },
            aroma: { intensity: 7, complexity: 5 },
            taste: { sweetness: 6, sourness: 4, richness: 4 },
            texture: 5,
            aftertaste: { duration: 4, pleasantness: 7 },
            suggestedNeedState: 'rejuvenation',
            suggestedEmotions: ['freshness', 'energy', 'happiness']
        },
        guidance: 'Focus on fruit intensity, freshness, and natural sweetness'
    },
    'wine': {
        name: 'Wine',
        icon: '🍷',
        defaults: {
            appearance: { visualAppeal: 8, colorIntensity: 7 },
            aroma: { intensity: 8, complexity: 8 },
            taste: { sweetness: 3, sourness: 5, richness: 6 },
            texture: 6,
            aftertaste: { duration: 8, pleasantness: 7 },
            suggestedNeedState: 'escape',
            suggestedEmotions: ['pleasure', 'relaxation', 'sophistication']
        },
        guidance: 'Assess color, nose complexity, palate structure, and finish length'
    },
    'spirits': {
        name: 'Spirits / Whisky',
        icon: '🥃',
        defaults: {
            appearance: { visualAppeal: 7, colorIntensity: 6 },
            aroma: { intensity: 8, complexity: 8 },
            taste: { sweetness: 3, bitterness: 4, richness: 7 },
            texture: 6,
            aftertaste: { duration: 9, pleasantness: 7 },
            suggestedNeedState: 'reward',
            suggestedEmotions: ['indulgence', 'sophistication', 'warmth']
        },
        guidance: 'Note nose character, palate development, and finish complexity'
    },
    'cheese': {
        name: 'Cheese',
        icon: '🧀',
        defaults: {
            appearance: { visualAppeal: 7, colorIntensity: 5 },
            aroma: { intensity: 7, complexity: 7 },
            taste: { saltiness: 5, umami: 7, richness: 7 },
            texture: 7,
            aftertaste: { duration: 6, pleasantness: 7 },
            suggestedNeedState: 'reward',
            suggestedEmotions: ['indulgence', 'satisfaction', 'comfort']
        },
        guidance: 'Assess texture, flavor complexity, and savory depth'
    },
    'bread-bakery': {
        name: 'Bread / Bakery',
        icon: '🥖',
        defaults: {
            appearance: { visualAppeal: 7, colorIntensity: 5 },
            aroma: { intensity: 7, complexity: 5 },
            taste: { sweetness: 3, saltiness: 4, richness: 5 },
            texture: 8,
            aftertaste: { duration: 4, pleasantness: 6 },
            suggestedNeedState: 'escape',
            suggestedEmotions: ['comfort', 'nostalgia', 'satisfaction']
        },
        guidance: 'Focus on crust, crumb texture, and baked aroma'
    },
    'generic': {
        name: 'Other Product',
        icon: '🍽️',
        defaults: {
            appearance: { visualAppeal: 5, colorIntensity: 5 },
            aroma: { intensity: 5, complexity: 5 },
            taste: { sweetness: 5, sourness: 5, saltiness: 5, bitterness: 5, umami: 5, richness: 5 },
            texture: 5,
            aftertaste: { duration: 5, pleasantness: 5 },
            suggestedNeedState: null,
            suggestedEmotions: []
        },
        guidance: 'Adjust all attributes based on your product type'
    }
};

// Emotion chips for quick selection
const QUICK_EMOTIONS = [
    { id: 'pleasure', label: 'Pleasure', icon: '😊' },
    { id: 'comfort', label: 'Comfort', icon: '🛋️' },
    { id: 'excitement', label: 'Excitement', icon: '✨' },
    { id: 'satisfaction', label: 'Satisfaction', icon: '👍' },
    { id: 'indulgence', label: 'Indulgence', icon: '💎' },
    { id: 'nostalgia', label: 'Nostalgia', icon: '🕰️' },
    { id: 'happiness', label: 'Happiness', icon: '😄' },
    { id: 'energy', label: 'Energy', icon: '⚡' },
    { id: 'relaxation', label: 'Relaxation', icon: '😌' },
    { id: 'refreshment', label: 'Refreshment', icon: '💧' },
    { id: 'curiosity', label: 'Curiosity', icon: '🔍' },
    { id: 'warmth', label: 'Warmth', icon: '🔥' }
];

// Quick Entry state
let quickEntryState = {
    selectedCategory: null,
    selectedEmotions: [],
    formData: {}
};

/**
 * Initialize Quick Entry module
 */
function initQuickEntry() {
    renderQuickEntryView();
    attachQuickEntryListeners();
}

/**
 * Render the Quick Entry view
 */
function renderQuickEntryView() {
    const container = document.getElementById('quick-entry-container');
    if (!container) return;

    container.innerHTML = `
        <div class="quick-entry-dashboard">
            <!-- Mode Toggle -->
            <div class="entry-mode-toggle">
                <button class="mode-btn active" data-mode="quick">
                    ⚡ Quick Entry
                    <span class="mode-desc">2-3 min</span>
                </button>
                <button class="mode-btn" data-mode="full" onclick="navigateToView('log-experience')">
                    📋 Full Evaluation
                    <span class="mode-desc">8-12 min</span>
                </button>
            </div>

            <!-- Quick Actions -->
            <div class="quick-entry-actions-bar">
                <button type="button" class="photo-ai-btn" onclick="PhotoAI.openPhotoModal()">
                    <span class="photo-icon">📷</span>
                    <span class="photo-text">Photo AI</span>
                </button>
                <span class="action-hint">Snap a photo to auto-fill product details</span>
            </div>

            <!-- Category Selection -->
            <div class="quick-entry-section">
                <h4>Step 1: Select Product Category</h4>
                <p class="section-hint">Choose a category to pre-fill sensible defaults</p>
                <div class="category-grid" id="category-grid">
                    ${renderCategoryCards()}
                </div>
            </div>

            <!-- Quick Entry Form (hidden until category selected) -->
            <div id="quick-entry-form-section" class="quick-entry-section" style="display: none;">
                <div class="selected-category-banner" id="selected-category-banner"></div>

                <h4>Step 2: Product Details</h4>
                <div class="quick-form-row">
                    <div class="quick-form-group">
                        <label for="quick-product-name">Product Name *</label>
                        <input type="text" id="quick-product-name" required placeholder="e.g., Lindt Excellence 85%">
                    </div>
                    <div class="quick-form-group">
                        <label for="quick-brand">Brand</label>
                        <input type="text" id="quick-brand" placeholder="e.g., Lindt">
                    </div>
                </div>
                <div class="quick-form-row">
                    <div class="quick-form-group">
                        <label for="quick-variant">Variant/Flavor</label>
                        <input type="text" id="quick-variant" placeholder="e.g., Dark 85% Cocoa">
                    </div>
                    <div class="quick-form-group">
                        <label for="quick-occasion">Occasion</label>
                        <select id="quick-occasion">
                            <option value="">Select...</option>
                            <option value="breakfast">Breakfast</option>
                            <option value="snack">Snack</option>
                            <option value="dessert">Dessert</option>
                            <option value="social">Social</option>
                            <option value="relaxation">Relaxation</option>
                        </select>
                    </div>
                </div>

                <h4>Step 3: Core Sensory Ratings</h4>
                <p class="section-hint" id="category-guidance"></p>

                <div class="quick-sliders-grid">
                    <div class="quick-slider-group">
                        <label>
                            <span class="slider-label">Visual Appeal</span>
                            <span class="slider-value" id="quick-visual-val">5</span>
                        </label>
                        <div class="slider-with-buttons">
                            <button type="button" class="slider-btn minus" data-slider="quick-visual">−</button>
                            <input type="range" id="quick-visual" min="0" max="10" value="5">
                            <button type="button" class="slider-btn plus" data-slider="quick-visual">+</button>
                        </div>
                    </div>
                    <div class="quick-slider-group">
                        <label>
                            <span class="slider-label">Aroma Intensity</span>
                            <span class="slider-value" id="quick-aroma-val">5</span>
                        </label>
                        <div class="slider-with-buttons">
                            <button type="button" class="slider-btn minus" data-slider="quick-aroma">−</button>
                            <input type="range" id="quick-aroma" min="0" max="10" value="5">
                            <button type="button" class="slider-btn plus" data-slider="quick-aroma">+</button>
                        </div>
                    </div>
                    <div class="quick-slider-group">
                        <label>
                            <span class="slider-label">Sweetness</span>
                            <span class="slider-value" id="quick-sweetness-val">5</span>
                        </label>
                        <div class="slider-with-buttons">
                            <button type="button" class="slider-btn minus" data-slider="quick-sweetness">−</button>
                            <input type="range" id="quick-sweetness" min="0" max="10" value="5">
                            <button type="button" class="slider-btn plus" data-slider="quick-sweetness">+</button>
                        </div>
                    </div>
                    <div class="quick-slider-group">
                        <label>
                            <span class="slider-label">Sourness/Acidity</span>
                            <span class="slider-value" id="quick-sourness-val">5</span>
                        </label>
                        <div class="slider-with-buttons">
                            <button type="button" class="slider-btn minus" data-slider="quick-sourness">−</button>
                            <input type="range" id="quick-sourness" min="0" max="10" value="5">
                            <button type="button" class="slider-btn plus" data-slider="quick-sourness">+</button>
                        </div>
                    </div>
                    <div class="quick-slider-group">
                        <label>
                            <span class="slider-label">Bitterness</span>
                            <span class="slider-value" id="quick-bitterness-val">5</span>
                        </label>
                        <div class="slider-with-buttons">
                            <button type="button" class="slider-btn minus" data-slider="quick-bitterness">−</button>
                            <input type="range" id="quick-bitterness" min="0" max="10" value="5">
                            <button type="button" class="slider-btn plus" data-slider="quick-bitterness">+</button>
                        </div>
                    </div>
                    <div class="quick-slider-group">
                        <label>
                            <span class="slider-label">Saltiness/Umami</span>
                            <span class="slider-value" id="quick-salty-val">5</span>
                        </label>
                        <div class="slider-with-buttons">
                            <button type="button" class="slider-btn minus" data-slider="quick-salty">−</button>
                            <input type="range" id="quick-salty" min="0" max="10" value="5">
                            <button type="button" class="slider-btn plus" data-slider="quick-salty">+</button>
                        </div>
                    </div>
                    <div class="quick-slider-group">
                        <label>
                            <span class="slider-label">Texture Quality</span>
                            <span class="slider-value" id="quick-texture-val">5</span>
                        </label>
                        <div class="slider-with-buttons">
                            <button type="button" class="slider-btn minus" data-slider="quick-texture">−</button>
                            <input type="range" id="quick-texture" min="0" max="10" value="5">
                            <button type="button" class="slider-btn plus" data-slider="quick-texture">+</button>
                        </div>
                    </div>
                    <div class="quick-slider-group">
                        <label>
                            <span class="slider-label">Aftertaste</span>
                            <span class="slider-value" id="quick-aftertaste-val">5</span>
                        </label>
                        <div class="slider-with-buttons">
                            <button type="button" class="slider-btn minus" data-slider="quick-aftertaste">−</button>
                            <input type="range" id="quick-aftertaste" min="0" max="10" value="5">
                            <button type="button" class="slider-btn plus" data-slider="quick-aftertaste">+</button>
                        </div>
                    </div>
                </div>

                <h4>Step 4: Overall Assessment</h4>
                <div class="quick-sliders-grid" style="max-width: 500px;">
                    <div class="quick-slider-group highlight">
                        <label>
                            <span class="slider-label">Overall Satisfaction</span>
                            <span class="slider-value large" id="quick-satisfaction-val">5</span>
                        </label>
                        <div class="slider-with-buttons">
                            <button type="button" class="slider-btn minus" data-slider="quick-satisfaction">−</button>
                            <input type="range" id="quick-satisfaction" min="0" max="10" value="5">
                            <button type="button" class="slider-btn plus" data-slider="quick-satisfaction">+</button>
                        </div>
                    </div>
                    <div class="quick-slider-group highlight">
                        <label>
                            <span class="slider-label">Purchase Intent</span>
                            <span class="slider-value large" id="quick-purchase-val">3</span>
                        </label>
                        <div class="slider-with-buttons">
                            <button type="button" class="slider-btn minus" data-slider="quick-purchase">−</button>
                            <input type="range" id="quick-purchase" min="1" max="5" value="3">
                            <button type="button" class="slider-btn plus" data-slider="quick-purchase">+</button>
                        </div>
                        <div class="purchase-scale">
                            <span>Definitely Not</span>
                            <span>Definitely Would</span>
                        </div>
                    </div>
                </div>

                <h4>Step 5: Quick Emotions (tap to select)</h4>
                <p class="section-hint">Select all emotions this product evokes</p>
                <div class="emotion-chips" id="emotion-chips">
                    ${renderEmotionChips()}
                </div>

                <h4>Step 6: Need State</h4>
                <div class="need-state-quick" id="need-state-quick">
                    <button type="button" class="need-btn" data-need="reward">
                        <span class="need-icon">🎁</span>
                        <span class="need-label">Reward</span>
                        <span class="need-desc">Treat, indulgence</span>
                    </button>
                    <button type="button" class="need-btn" data-need="escape">
                        <span class="need-icon">🌴</span>
                        <span class="need-label">Escape</span>
                        <span class="need-desc">Break, relaxation</span>
                    </button>
                    <button type="button" class="need-btn" data-need="rejuvenation">
                        <span class="need-icon">⚡</span>
                        <span class="need-label">Rejuvenation</span>
                        <span class="need-desc">Energy, refresh</span>
                    </button>
                    <button type="button" class="need-btn" data-need="sociability">
                        <span class="need-icon">👥</span>
                        <span class="need-label">Sociability</span>
                        <span class="need-desc">Sharing, social</span>
                    </button>
                </div>

                <div class="quick-form-group" style="margin-top: 20px;">
                    <label for="quick-notes">Quick Notes (optional)</label>
                    <div class="input-with-voice">
                        <textarea id="quick-notes" rows="2" placeholder="Any additional observations..."></textarea>
                        <button type="button" class="voice-input-btn" data-target="quick-notes" onclick="VoiceInput.toggle('quick-notes')">
                            <span class="voice-icon">🎤</span>
                            <span class="voice-text">Voice</span>
                        </button>
                    </div>
                </div>

                <div class="quick-entry-actions">
                    <button type="button" class="btn-secondary" onclick="resetQuickEntry()">
                        🔄 Reset Form
                    </button>
                    <button type="button" class="btn-primary btn-large" onclick="submitQuickEntry()">
                        ✓ Save Experience
                    </button>
                </div>
            </div>
        </div>
    `;

    attachQuickEntryListeners();
}

/**
 * Render category selection cards
 */
function renderCategoryCards() {
    return Object.entries(CATEGORY_TEMPLATES).map(([key, cat]) => `
        <div class="category-card" data-category="${key}">
            <div class="category-icon">${cat.icon}</div>
            <div class="category-name">${cat.name}</div>
        </div>
    `).join('');
}

/**
 * Render emotion chips
 */
function renderEmotionChips() {
    return QUICK_EMOTIONS.map(emotion => `
        <button type="button" class="emotion-chip" data-emotion="${emotion.id}">
            <span class="chip-icon">${emotion.icon}</span>
            <span class="chip-label">${emotion.label}</span>
        </button>
    `).join('');
}

/**
 * Attach event listeners for Quick Entry
 */
function attachQuickEntryListeners() {
    // Category selection
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => selectCategory(card.dataset.category));
    });

    // Slider value updates and +/- buttons
    document.querySelectorAll('#quick-entry-form-section input[type="range"]').forEach(slider => {
        slider.addEventListener('input', () => {
            const valSpan = document.getElementById(`${slider.id}-val`);
            if (valSpan) valSpan.textContent = slider.value;
        });
    });

    // +/- buttons for sliders
    document.querySelectorAll('.slider-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sliderId = btn.dataset.slider;
            const slider = document.getElementById(sliderId);
            if (!slider) return;

            const step = parseInt(slider.step) || 1;
            const min = parseInt(slider.min);
            const max = parseInt(slider.max);
            let newVal = parseInt(slider.value);

            if (btn.classList.contains('plus')) {
                newVal = Math.min(max, newVal + step);
            } else {
                newVal = Math.max(min, newVal - step);
            }

            slider.value = newVal;
            const valSpan = document.getElementById(`${sliderId}-val`);
            if (valSpan) valSpan.textContent = newVal;
        });
    });

    // Emotion chips
    document.querySelectorAll('.emotion-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            chip.classList.toggle('selected');
            const emotion = chip.dataset.emotion;
            if (chip.classList.contains('selected')) {
                if (!quickEntryState.selectedEmotions.includes(emotion)) {
                    quickEntryState.selectedEmotions.push(emotion);
                }
            } else {
                quickEntryState.selectedEmotions = quickEntryState.selectedEmotions.filter(e => e !== emotion);
            }
        });
    });

    // Need state buttons
    document.querySelectorAll('.need-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.need-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            quickEntryState.selectedNeedState = btn.dataset.need;
        });
    });
}

/**
 * Select a category and apply defaults
 */
function selectCategory(categoryKey) {
    const category = CATEGORY_TEMPLATES[categoryKey];
    if (!category) return;

    quickEntryState.selectedCategory = categoryKey;

    // Update UI
    document.querySelectorAll('.category-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.category === categoryKey);
    });

    // Show form section
    document.getElementById('quick-entry-form-section').style.display = 'block';

    // Update banner
    document.getElementById('selected-category-banner').innerHTML = `
        <span class="banner-icon">${category.icon}</span>
        <span class="banner-text">${category.name}</span>
        <button type="button" class="banner-change" onclick="changeCategory()">Change</button>
    `;

    // Update guidance
    document.getElementById('category-guidance').textContent = category.guidance;

    // Apply defaults
    applyTemplateDefaults(category.defaults);

    // Pre-select suggested emotions
    quickEntryState.selectedEmotions = [...(category.defaults.suggestedEmotions || [])];
    document.querySelectorAll('.emotion-chip').forEach(chip => {
        chip.classList.toggle('selected', quickEntryState.selectedEmotions.includes(chip.dataset.emotion));
    });

    // Pre-select need state
    if (category.defaults.suggestedNeedState) {
        quickEntryState.selectedNeedState = category.defaults.suggestedNeedState;
        document.querySelectorAll('.need-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.need === category.defaults.suggestedNeedState);
        });
    }

    // Scroll to form
    document.getElementById('quick-entry-form-section').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Apply template defaults to sliders
 */
function applyTemplateDefaults(defaults) {
    const mappings = {
        'quick-visual': defaults.appearance?.visualAppeal,
        'quick-aroma': defaults.aroma?.intensity,
        'quick-sweetness': defaults.taste?.sweetness,
        'quick-sourness': defaults.taste?.sourness || 5,
        'quick-bitterness': defaults.taste?.bitterness || 5,
        'quick-salty': defaults.taste?.saltiness || defaults.taste?.umami || 5,
        'quick-texture': defaults.texture,
        'quick-aftertaste': defaults.aftertaste?.pleasantness
    };

    Object.entries(mappings).forEach(([sliderId, value]) => {
        if (value !== undefined) {
            const slider = document.getElementById(sliderId);
            if (slider) {
                slider.value = value;
                const valSpan = document.getElementById(`${sliderId}-val`);
                if (valSpan) valSpan.textContent = value;
            }
        }
    });
}

/**
 * Change category (reset form)
 */
function changeCategory() {
    document.getElementById('quick-entry-form-section').style.display = 'none';
    document.querySelectorAll('.category-card').forEach(card => card.classList.remove('selected'));
    quickEntryState.selectedCategory = null;
}

/**
 * Reset Quick Entry form
 */
function resetQuickEntry() {
    quickEntryState = {
        selectedCategory: null,
        selectedEmotions: [],
        formData: {}
    };

    // Reset form fields
    document.getElementById('quick-product-name').value = '';
    document.getElementById('quick-brand').value = '';
    document.getElementById('quick-variant').value = '';
    document.getElementById('quick-occasion').value = '';
    document.getElementById('quick-notes').value = '';

    // Reset sliders to 5
    document.querySelectorAll('#quick-entry-form-section input[type="range"]').forEach(slider => {
        const defaultVal = slider.id === 'quick-purchase' ? 3 : 5;
        slider.value = defaultVal;
        const valSpan = document.getElementById(`${slider.id}-val`);
        if (valSpan) valSpan.textContent = defaultVal;
    });

    // Reset selections
    document.querySelectorAll('.emotion-chip, .need-btn, .category-card').forEach(el => {
        el.classList.remove('selected');
    });

    document.getElementById('quick-entry-form-section').style.display = 'none';
}

/**
 * Submit Quick Entry form
 */
function submitQuickEntry() {
    const productName = document.getElementById('quick-product-name').value.trim();
    if (!productName) {
        alert('Please enter a product name');
        document.getElementById('quick-product-name').focus();
        return;
    }

    if (!quickEntryState.selectedNeedState) {
        alert('Please select a Need State');
        return;
    }

    // Build experience object compatible with main app format
    const experience = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        entryMode: 'quick',
        categoryTemplate: quickEntryState.selectedCategory,
        productInfo: {
            name: productName,
            brand: document.getElementById('quick-brand').value.trim(),
            type: getCategoryType(quickEntryState.selectedCategory),
            variant: document.getElementById('quick-variant').value.trim(),
            occasion: document.getElementById('quick-occasion').value,
            temperature: ''
        },
        stages: {
            appearance: {
                visualAppeal: parseInt(document.getElementById('quick-visual').value),
                colorIntensity: parseInt(document.getElementById('quick-visual').value),
                overallIntensity: parseInt(document.getElementById('quick-visual').value),
                emotions: buildEmotionObject(['anticipation', 'desire', 'excitement'])
            },
            aroma: {
                intensity: parseInt(document.getElementById('quick-aroma').value),
                sweetness: parseInt(document.getElementById('quick-sweetness').value),
                complexity: parseInt(document.getElementById('quick-aroma').value),
                overallIntensity: parseInt(document.getElementById('quick-aroma').value),
                emotions: buildEmotionObject(['pleasure', 'comfort', 'nostalgia'])
            },
            frontMouth: {
                sweetness: parseInt(document.getElementById('quick-sweetness').value),
                sourness: parseInt(document.getElementById('quick-sourness').value),
                saltiness: parseInt(document.getElementById('quick-salty').value),
                texture: parseInt(document.getElementById('quick-texture').value),
                overallIntensity: 5,
                emotions: buildEmotionObject(['excitement', 'satisfaction'])
            },
            midRearMouth: {
                bitterness: parseInt(document.getElementById('quick-bitterness').value),
                umami: parseInt(document.getElementById('quick-salty').value),
                richness: parseInt(document.getElementById('quick-texture').value),
                creaminess: parseInt(document.getElementById('quick-texture').value),
                overallIntensity: 5,
                emotions: buildEmotionObject(['indulgence', 'comfort', 'satisfaction'])
            },
            aftertaste: {
                duration: parseInt(document.getElementById('quick-aftertaste').value),
                pleasantness: parseInt(document.getElementById('quick-aftertaste').value),
                cleanness: 5,
                overallIntensity: parseInt(document.getElementById('quick-aftertaste').value),
                emotions: buildEmotionObject(['satisfaction', 'completeness'])
            }
        },
        needState: quickEntryState.selectedNeedState,
        emotionalTriggers: {
            moreishness: quickEntryState.selectedEmotions.includes('moreishness') ? 7 : 5,
            refreshment: quickEntryState.selectedEmotions.includes('refreshment') ? 7 : 5,
            melt: 5,
            crunch: 5
        },
        quickEmotions: quickEntryState.selectedEmotions,
        overallSatisfaction: parseInt(document.getElementById('quick-satisfaction').value),
        purchaseIntent: parseInt(document.getElementById('quick-purchase').value),
        notes: document.getElementById('quick-notes').value.trim()
    };

    // Add to main experiences array (from app.js)
    if (typeof experiences !== 'undefined') {
        experiences.push(experience);
        saveData();
        updateDashboard();
    }

    // Show success message
    showQuickEntrySuccess(experience);

    // Reset form for next entry
    resetQuickEntry();
}

/**
 * Build emotion object based on selected emotions
 */
function buildEmotionObject(relevantEmotions) {
    const emotionObj = {};
    relevantEmotions.forEach(emotion => {
        emotionObj[emotion] = quickEntryState.selectedEmotions.includes(emotion) ? 7 : 5;
    });
    return emotionObj;
}

/**
 * Get category type for product info
 */
function getCategoryType(categoryKey) {
    const typeMap = {
        'premium-chocolate': 'confectionery',
        'milk-chocolate': 'confectionery',
        'craft-beer-ipa': 'beverage',
        'craft-beer-stout': 'beverage',
        'soft-drink': 'beverage',
        'energy-drink': 'beverage',
        'artisan-coffee': 'beverage',
        'premium-ice-cream': 'dessert',
        'savory-snack': 'snack',
        'sweet-snack': 'snack',
        'yogurt': 'food',
        'juice-smoothie': 'beverage',
        'wine': 'beverage',
        'spirits': 'beverage',
        'cheese': 'food',
        'bread-bakery': 'food',
        'generic': 'food'
    };
    return typeMap[categoryKey] || 'food';
}

/**
 * Show success message
 */
function showQuickEntrySuccess(experience) {
    const notification = document.createElement('div');
    notification.className = 'quick-entry-success';
    notification.innerHTML = `
        <div class="success-icon">✓</div>
        <div class="success-content">
            <strong>${experience.productInfo.name}</strong> saved successfully!
            <span class="success-hint">Ready for next product</span>
        </div>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 2500);
}

/**
 * Navigate to a view (helper)
 */
function navigateToView(viewName) {
    const navItem = document.querySelector(`.nav-item[data-view="${viewName}"]`);
    if (navItem) navItem.click();
}

// Export for global access
window.initQuickEntry = initQuickEntry;
window.renderQuickEntryView = renderQuickEntryView;
window.resetQuickEntry = resetQuickEntry;
window.submitQuickEntry = submitQuickEntry;
window.changeCategory = changeCategory;
window.CATEGORY_TEMPLATES = CATEGORY_TEMPLATES;
