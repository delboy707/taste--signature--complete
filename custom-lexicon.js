// ===== CUSTOM SENSORY LEXICON MODULE =====

/**
 * Default Lexicon Structure
 * This is the baseline lexicon that ships with the app
 */
const defaultLexicon = {
    id: 'default',
    name: 'Default Sensory Lexicon',
    version: '1.1',
    category: 'General',
    description: 'Standard sensory evaluation framework for general food products',
    stages: [
        {
            id: 'appearance',
            name: 'Appearance',
            order: 1,
            attributes: [
                { id: 'color-shade', label: 'Color Shade', technicalTerm: 'Hue', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'The dominant wavelength of color perceived' },
                { id: 'color-richness', label: 'Color Richness', technicalTerm: 'Saturation/Chroma', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Depth and vibrancy of color' },
                { id: 'color-lightness', label: 'Color Lightness', technicalTerm: 'Value/Luminosity', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Brightness or darkness of color' },
                { id: 'color-strength', label: 'Color Strength', technicalTerm: 'Color Intensity', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Overall strength of color presence' },
                { id: 'color-evenness', label: 'Color Evenness', technicalTerm: 'Color Uniformity', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Consistency of color distribution' },
                { id: 'color-depth', label: 'Color Depth', technicalTerm: 'Color Gradient', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Layering and gradient of color' },
                { id: 'surface-shine', label: 'Surface Shine', technicalTerm: 'Gloss/Sheen', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Reflectiveness of the surface' },
                { id: 'surface-texture', label: 'Surface Texture', technicalTerm: 'Visual Roughness', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Perceived roughness of the surface' },
                { id: 'surface-oiliness', label: 'Surface Oiliness', technicalTerm: 'Visual Fat/Oil Presence', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Visible oil or fat on the surface' },
                { id: 'surface-moisture', label: 'Surface Moisture', technicalTerm: 'Wet/Dry Appearance', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Apparent moisture level on surface' },
                { id: 'see-through-quality', label: 'See-Through Quality', technicalTerm: 'Clarity/Transparency', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Degree of visual transparency' },
                { id: 'cloudiness', label: 'Cloudiness', technicalTerm: 'Turbidity/Haze', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Degree of haziness or turbidity' },
                { id: 'light-blocking', label: 'Light-Blocking', technicalTerm: 'Opacity', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Degree to which light is blocked' },
                { id: 'piece-size', label: 'Piece Size', technicalTerm: 'Dimensional Scale', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Perceived size of pieces or portions' },
                { id: 'shape-regularity', label: 'Shape Regularity', technicalTerm: 'Morphological Uniformity', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Consistency and regularity of shape' },
                { id: 'size-consistency', label: 'Size Consistency', technicalTerm: 'Structural Uniformity', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Uniformity of size across pieces' },
                { id: 'surface-holes', label: 'Surface Holes', technicalTerm: 'Visible Porosity', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Visible pores or holes on surface' },
                { id: 'perceived-thickness', label: 'Perceived Thickness', technicalTerm: 'Visual Viscosity/Body', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Apparent viscosity or body of liquid' },
                { id: 'flow-and-legs', label: 'Flow and Legs', technicalTerm: 'Visual Flow Behaviour', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'How liquid flows or creates legs on glass' },
                { id: 'bubble-size', label: 'Bubble Size', technicalTerm: 'Visual Bubble Diameter', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Size of visible bubbles' },
                { id: 'bubble-activity', label: 'Bubble Activity', technicalTerm: 'Effervescence Rate', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Rate and activity of bubble formation' },
                { id: 'foam-height', label: 'Foam Height', technicalTerm: 'Head Formation', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Height of foam or head formed' },
                { id: 'foam-persistence', label: 'Foam Persistence', technicalTerm: 'Visual Foam Stability', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'How long foam remains stable' },
                { id: 'visible-particles', label: 'Visible Particles', technicalTerm: 'Particulate Presence', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Presence of visible particles or inclusions' },
                { id: 'pattern-and-marbling', label: 'Pattern and Marbling', technicalTerm: 'Visual Heterogeneity', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Visible patterns, swirls or marbling' },
                { id: 'visual-complexity', label: 'Visual Complexity', technicalTerm: 'Visual Intricacy', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Overall visual intricacy and detail' },
                { id: 'visual-appeal', label: 'Visual Appeal', technicalTerm: 'Overall Visual Attractiveness', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Overall visual attractiveness' },
                { id: 'temperature-cue', label: 'Temperature Cue', technicalTerm: 'Visual Thermal Indicator', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Visual cues indicating temperature' }
            ],
            emotions: ['anticipation', 'curiosity', 'desire', 'eager', 'excitement', 'happiness', 'interest', 'pleased', 'surprise', 'attracted', 'disappointed', 'disgusted', 'indifferent', 'suspicious', 'worried', 'anxious', 'confused', 'bored']
        },
        {
            id: 'aroma',
            name: 'Aroma',
            order: 2,
            attributes: [
                { id: 'intensity', label: 'Intensity', type: 'slider', min: 1, max: 10, unit: '', description: 'Strength of aroma' },
                { id: 'sweetness', label: 'Sweet Notes', type: 'slider', min: 1, max: 10, unit: '', description: 'Sweet aromatic notes' },
                { id: 'complexity', label: 'Complexity', type: 'slider', min: 1, max: 10, unit: '', description: 'Number and harmony of notes' },
                { id: 'persistence', label: 'Persistence/Linger', type: 'slider', min: 1, max: 10, unit: '', description: 'How long aroma lingers' },
                { id: 'overallIntensity', label: 'Overall Intensity', type: 'slider', min: 1, max: 10, unit: '', description: 'Total aromatic impact' }
            ],
            emotions: ['pleasure', 'comfort', 'nostalgia', 'happiness', 'energy', 'relaxation', 'intrigue']
        },
        {
            id: 'frontMouth',
            name: 'Front of Mouth',
            order: 3,
            attributes: [
                { id: 'sweetness', label: 'Sweetness', type: 'slider', min: 1, max: 10, unit: '', description: 'Sweet taste intensity' },
                { id: 'sourness', label: 'Sourness', type: 'slider', min: 1, max: 10, unit: '', description: 'Sour/acidic taste' },
                { id: 'saltiness', label: 'Saltiness', type: 'slider', min: 1, max: 10, unit: '', description: 'Salty taste intensity' },
                { id: 'texture', label: 'Texture Impact', type: 'slider', min: 1, max: 10, unit: '', description: 'Initial mouthfeel' },
                { id: 'acidity', label: 'Acidity', type: 'slider', min: 1, max: 10, unit: '', description: 'Sharp acidic notes' },
                { id: 'spiciness', label: 'Spiciness/Heat', type: 'slider', min: 1, max: 10, unit: '', description: 'Heat and spice intensity' },
                { id: 'overallIntensity', label: 'Overall Intensity', type: 'slider', min: 1, max: 10, unit: '', description: 'Total front palate impact' }
            ],
            emotions: ['excitement', 'satisfaction', 'happiness', 'pleasure', 'disappointment']
        },
        {
            id: 'midRearMouth',
            name: 'Mid/Rear Mouth',
            order: 4,
            attributes: [
                { id: 'bitterness', label: 'Bitterness', type: 'slider', min: 1, max: 10, unit: '', description: 'Bitter taste intensity' },
                { id: 'umami', label: 'Umami', type: 'slider', min: 1, max: 10, unit: '', description: 'Savory taste depth' },
                { id: 'richness', label: 'Richness', type: 'slider', min: 1, max: 10, unit: '', description: 'Fullness and depth' },
                { id: 'creaminess', label: 'Creaminess', type: 'slider', min: 1, max: 10, unit: '', description: 'Creamy mouthfeel' },
                { id: 'astringency', label: 'Astringency/Dryness', type: 'slider', min: 1, max: 10, unit: '', description: 'Drying sensation' },
                { id: 'mouthfeel', label: 'Mouthfeel/Body', type: 'slider', min: 1, max: 10, unit: '', description: 'Weight and texture in mouth' },
                { id: 'overallIntensity', label: 'Overall Intensity', type: 'slider', min: 1, max: 10, unit: '', description: 'Total mid/rear palate impact' }
            ],
            emotions: ['indulgence', 'comfort', 'satisfaction', 'pleasure', 'sophistication']
        },
        {
            id: 'aftertaste',
            name: 'Aftertaste',
            order: 5,
            attributes: [
                { id: 'duration', label: 'Duration', type: 'slider', min: 1, max: 10, unit: 'seconds', description: 'How long flavors linger' },
                { id: 'pleasantness', label: 'Pleasantness', type: 'slider', min: 1, max: 10, unit: '', description: 'Quality of lingering taste' },
                { id: 'cleanness', label: 'Palate Cleanness', type: 'slider', min: 1, max: 10, unit: '', description: 'How clean palate feels' },
                { id: 'overallIntensity', label: 'Overall Intensity', type: 'slider', min: 1, max: 10, unit: '', description: 'Total aftertaste impact' }
            ],
            emotions: ['satisfaction', 'completeness', 'happiness', 'craving']
        }
    ],
    emotionalTriggers: [
        { id: 'moreishness', label: 'Moreishness', description: 'Desire to consume more' },
        { id: 'refreshment', label: 'Refreshment', description: 'Refreshing quality' },
        { id: 'melt', label: 'Melt-in-Mouth', description: 'Pleasant melting sensation' },
        { id: 'crunch', label: 'Crunch Factor', description: 'Satisfying crunch' }
    ]
};

// Storage for custom lexicons
let customLexicons = [];
let activeLexicon = null;

/**
 * Load custom lexicons from localStorage
 */
function loadCustomLexicons() {
    const stored = localStorage.getItem('customLexicons');
    if (stored) {
        try {
            customLexicons = JSON.parse(stored);
        } catch (e) {
            console.error('Error loading custom lexicons:', e);
            customLexicons = [];
        }
    }

    // Load active lexicon ID
    const activeId = localStorage.getItem('activeLexiconId');
    if (activeId === 'default') {
        activeLexicon = defaultLexicon;
    } else if (activeId) {
        activeLexicon = customLexicons.find(l => l.id === activeId) || defaultLexicon;
    } else {
        activeLexicon = defaultLexicon;
    }
}

/**
 * Save custom lexicons to localStorage
 */
function saveCustomLexicons() {
    localStorage.setItem('customLexicons', JSON.stringify(customLexicons));
}

/**
 * Set active lexicon
 */
function setActiveLexicon(lexiconId) {
    if (lexiconId === 'default') {
        activeLexicon = defaultLexicon;
    } else {
        activeLexicon = customLexicons.find(l => l.id === lexiconId) || defaultLexicon;
    }
    localStorage.setItem('activeLexiconId', lexiconId);

    // Trigger form regeneration if needed
    if (typeof regenerateTasteForm === 'function') {
        regenerateTasteForm();
    }
}

/**
 * Get active lexicon
 */
function getActiveLexicon() {
    return activeLexicon || defaultLexicon;
}

/**
 * Create new custom lexicon
 */
function createCustomLexicon(name, category, description) {
    const newLexicon = {
        id: `custom_${Date.now()}`,
        name: name,
        version: '1.0',
        category: category,
        description: description,
        stages: JSON.parse(JSON.stringify(defaultLexicon.stages)), // Deep copy
        emotionalTriggers: JSON.parse(JSON.stringify(defaultLexicon.emotionalTriggers)),
        isCustom: true,
        createdAt: new Date().toISOString()
    };

    customLexicons.push(newLexicon);
    saveCustomLexicons();
    return newLexicon;
}

/**
 * Update custom lexicon
 */
function updateCustomLexicon(lexiconId, updates) {
    const lexicon = customLexicons.find(l => l.id === lexiconId);
    if (!lexicon) return false;

    Object.assign(lexicon, updates);
    lexicon.modifiedAt = new Date().toISOString();
    saveCustomLexicons();

    // If this is the active lexicon, update it
    if (activeLexicon && activeLexicon.id === lexiconId) {
        activeLexicon = lexicon;
    }

    return true;
}

/**
 * Delete custom lexicon
 */
function deleteCustomLexicon(lexiconId) {
    const index = customLexicons.findIndex(l => l.id === lexiconId);
    if (index === -1) return false;

    customLexicons.splice(index, 1);
    saveCustomLexicons();

    // If this was the active lexicon, switch to default
    if (activeLexicon && activeLexicon.id === lexiconId) {
        setActiveLexicon('default');
    }

    return true;
}

/**
 * Add stage to lexicon
 */
function addStageToLexicon(lexiconId, stageName) {
    const lexicon = customLexicons.find(l => l.id === lexiconId);
    if (!lexicon) return false;

    const newStage = {
        id: `stage_${Date.now()}`,
        name: stageName,
        order: lexicon.stages.length + 1,
        attributes: [],
        emotions: []
    };

    lexicon.stages.push(newStage);
    saveCustomLexicons();
    return newStage;
}

/**
 * Add attribute to stage
 */
function addAttributeToStage(lexiconId, stageId, attribute) {
    const lexicon = customLexicons.find(l => l.id === lexiconId);
    if (!lexicon) return false;

    const stage = lexicon.stages.find(s => s.id === stageId);
    if (!stage) return false;

    const newAttribute = {
        id: `attr_${Date.now()}`,
        label: attribute.label,
        type: attribute.type || 'slider',
        min: attribute.min || 1,
        max: attribute.max || 10,
        unit: attribute.unit || '',
        description: attribute.description || ''
    };

    stage.attributes.push(newAttribute);
    saveCustomLexicons();
    return newAttribute;
}

/**
 * Remove attribute from stage
 */
function removeAttributeFromStage(lexiconId, stageId, attributeId) {
    const lexicon = customLexicons.find(l => l.id === lexiconId);
    if (!lexicon) return false;

    const stage = lexicon.stages.find(s => s.id === stageId);
    if (!stage) return false;

    const index = stage.attributes.findIndex(a => a.id === attributeId);
    if (index === -1) return false;

    stage.attributes.splice(index, 1);
    saveCustomLexicons();
    return true;
}

/**
 * Add emotion to stage
 */
function addEmotionToStage(lexiconId, stageId, emotionName) {
    const lexicon = customLexicons.find(l => l.id === lexiconId);
    if (!lexicon) return false;

    const stage = lexicon.stages.find(s => s.id === stageId);
    if (!stage) return false;

    if (!stage.emotions.includes(emotionName)) {
        stage.emotions.push(emotionName);
        saveCustomLexicons();
    }
    return true;
}

/**
 * Export lexicon to JSON
 */
function exportLexicon(lexiconId) {
    let lexicon;
    if (lexiconId === 'default') {
        lexicon = defaultLexicon;
    } else {
        lexicon = customLexicons.find(l => l.id === lexiconId);
    }

    if (!lexicon) return null;

    const exportData = {
        ...lexicon,
        exportedAt: new Date().toISOString(),
        exportedBy: 'Taste Signature App'
    };

    return JSON.stringify(exportData, null, 2);
}

/**
 * Import lexicon from JSON
 */
function importLexicon(jsonString) {
    try {
        const importedLexicon = JSON.parse(jsonString);

        // Validate structure
        if (!importedLexicon.name || !importedLexicon.stages) {
            throw new Error('Invalid lexicon format');
        }

        // Generate new ID to avoid conflicts
        importedLexicon.id = `imported_${Date.now()}`;
        importedLexicon.isCustom = true;
        importedLexicon.importedAt = new Date().toISOString();
        delete importedLexicon.exportedAt;
        delete importedLexicon.exportedBy;

        customLexicons.push(importedLexicon);
        saveCustomLexicons();

        return importedLexicon;
    } catch (e) {
        console.error('Error importing lexicon:', e);
        return null;
    }
}

/**
 * Get all lexicons (default + custom)
 */
function getAllLexicons() {
    return [defaultLexicon, ...customLexicons];
}

/**
 * Pre-built lexicon templates
 */
const lexiconTemplates = {
    beverage: {
        name: 'Beverage Lexicon',
        category: 'Beverage',
        description: 'Specialized lexicon for beverages including carbonation, temperature impact, and liquid mouthfeel',
        customStages: [
            {
                name: 'Appearance',
                attributes: [
                    { label: 'Color Intensity', description: 'Depth of color' },
                    { label: 'Clarity', description: 'Transparency vs cloudiness' },
                    { label: 'Carbonation Visual', description: 'Bubble activity (if applicable)' }
                ]
            },
            {
                name: 'Aroma',
                attributes: [
                    { label: 'Fruity Notes', description: 'Fruit aroma intensity' },
                    { label: 'Floral Notes', description: 'Floral aroma intensity' },
                    { label: 'Herbal/Green Notes', description: 'Herbal characteristics' }
                ]
            },
            {
                name: 'First Sip',
                attributes: [
                    { label: 'Sweetness', description: 'Sweet taste' },
                    { label: 'Acidity', description: 'Acidic/tart taste' },
                    { label: 'Carbonation Feel', description: 'Fizz sensation' },
                    { label: 'Temperature Impact', description: 'How temperature affects taste' }
                ]
            }
        ]
    },
    bakery: {
        name: 'Bakery Lexicon',
        category: 'Bakery',
        description: 'Optimized for baked goods with focus on texture, crumb, and crust characteristics',
        customStages: [
            {
                name: 'Appearance',
                attributes: [
                    { label: 'Crust Color', description: 'Browning level' },
                    { label: 'Shape & Form', description: 'Structural integrity' },
                    { label: 'Crumb Visibility', description: 'Interior texture appearance' }
                ]
            },
            {
                name: 'Texture',
                attributes: [
                    { label: 'Crust Crunch', description: 'External crispness' },
                    { label: 'Crumb Softness', description: 'Interior tenderness' },
                    { label: 'Chewiness', description: 'Resistance to chewing' },
                    { label: 'Moisture Level', description: 'Dry to moist spectrum' }
                ]
            }
        ]
    },
    dairy: {
        name: 'Dairy Lexicon',
        category: 'Dairy',
        description: 'Tailored for dairy products with emphasis on creaminess, fat content, and cultured notes',
        customStages: [
            {
                name: 'Appearance',
                attributes: [
                    { label: 'Color', description: 'White to cream spectrum' },
                    { label: 'Thickness Visual', description: 'Perceived viscosity' },
                    { label: 'Surface Characteristics', description: 'Smooth vs textured' }
                ]
            },
            {
                name: 'Texture',
                attributes: [
                    { label: 'Creaminess', description: 'Smooth, rich mouthfeel' },
                    { label: 'Viscosity', description: 'Thin to thick' },
                    { label: 'Fat Perception', description: 'Richness level' },
                    { label: 'Cultured Tang', description: 'Fermented taste (yogurt, sour cream)' }
                ]
            }
        ]
    }
};

/**
 * Create lexicon from template
 */
function createLexiconFromTemplate(templateKey) {
    const template = lexiconTemplates[templateKey];
    if (!template) return null;

    const newLexicon = createCustomLexicon(template.name, template.category, template.description);

    // Clear default stages and add template stages
    newLexicon.stages = template.customStages.map((stageTemplate, index) => ({
        id: `stage_${Date.now()}_${index}`,
        name: stageTemplate.name,
        order: index + 1,
        attributes: stageTemplate.attributes.map((attr, attrIndex) => ({
            id: `attr_${Date.now()}_${attrIndex}`,
            label: attr.label,
            type: 'slider',
            min: 1,
            max: 10,
            unit: '',
            description: attr.description
        })),
        emotions: []
    }));

    updateCustomLexicon(newLexicon.id, { stages: newLexicon.stages });
    return newLexicon;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    loadCustomLexicons();
});
