// ===== SCHEMA VALIDATION MODULE =====
// Provides consistent attribute naming and validation across all import paths
// Part of the Taste Signature data processing pipeline

/**
 * Canonical attribute name mappings
 * Maps various naming conventions to standardized camelCase names
 */
const ATTRIBUTE_ALIASES = {
    // Product info
    'product_name': 'name',
    'Product_Name': 'name',
    'ProductName': 'name',
    'product name': 'name',
    'Product Name': 'name',
    'flavor_name': 'name',
    'Flavor_Name': 'name',
    'item': 'name',
    'Item': 'name',
    'title': 'name',
    'Title': 'name',

    'brand_name': 'brand',
    'Brand_Name': 'brand',
    'Brand': 'brand',
    'manufacturer': 'brand',
    'Manufacturer': 'brand',

    'product_category': 'type',
    'Product_Category': 'type',
    'category': 'type',
    'Category': 'type',
    'Type': 'type',

    // Appearance stage
    'visual_appeal': 'visualAppeal',
    'Visual_Appeal': 'visualAppeal',
    'VisualAppeal': 'visualAppeal',
    'appearance_visual': 'visualAppeal',
    'appearance_visual_appeal': 'visualAppeal',

    'color_intensity': 'colorIntensity',
    'Color_Intensity': 'colorIntensity',
    'ColorIntensity': 'colorIntensity',
    'appearance_color': 'colorIntensity',
    'appearance_color_intensity': 'colorIntensity',

    'carbonation': 'carbonation',
    'Carbonation': 'carbonation',
    'fizz': 'carbonation',
    'Fizz': 'carbonation',

    // Aroma stage
    'aroma_intensity': 'intensity',
    'Aroma_Intensity': 'intensity',
    'aromaIntensity': 'intensity',
    'AromaIntensity': 'intensity',
    'smell_intensity': 'intensity',

    'aroma_sweetness': 'sweetness',
    'Aroma_Sweetness': 'sweetness',
    'aromaSweetness': 'sweetness',
    'smell_sweetness': 'sweetness',

    'aroma_complexity': 'complexity',
    'Aroma_Complexity': 'complexity',
    'aromaComplexity': 'complexity',

    'persistence': 'persistence',
    'Persistence': 'persistence',
    'aroma_persistence': 'persistence',
    'Aroma_Persistence': 'persistence',
    'linger': 'persistence',

    // Front mouth stage
    'taste_sweetness': 'sweetness',
    'Taste_Sweetness': 'sweetness',
    'front_sweetness': 'sweetness',
    'Front_Sweetness': 'sweetness',
    'Sweetness': 'sweetness',

    'taste_sourness': 'sourness',
    'Taste_Sourness': 'sourness',
    'front_sourness': 'sourness',
    'Front_Sourness': 'sourness',
    'Sourness': 'sourness',

    'taste_saltiness': 'saltiness',
    'Taste_Saltiness': 'saltiness',
    'front_saltiness': 'saltiness',
    'Front_Saltiness': 'saltiness',
    'Saltiness': 'saltiness',

    'front_texture': 'texture',
    'Front_Texture': 'texture',
    'Texture': 'texture',
    'mouthfeel': 'texture',
    'Mouthfeel': 'texture',

    'acidity': 'acidity',
    'Acidity': 'acidity',
    'acid': 'acidity',
    'ph_response': 'acidity',

    'spiciness': 'spiciness',
    'Spiciness': 'spiciness',
    'heat': 'spiciness',
    'Heat': 'spiciness',
    'pungency': 'spiciness',
    'Pungency': 'spiciness',

    // Mid/rear mouth stage
    'mid_bitterness': 'bitterness',
    'Mid_Bitterness': 'bitterness',
    'Bitterness': 'bitterness',

    'mid_umami': 'umami',
    'Mid_Umami': 'umami',
    'Umami': 'umami',
    'savory': 'umami',
    'Savory': 'umami',

    'mid_richness': 'richness',
    'Mid_Richness': 'richness',
    'Richness': 'richness',
    'body': 'richness',
    'Body': 'richness',

    'mid_creaminess': 'creaminess',
    'Mid_Creaminess': 'creaminess',
    'Creaminess': 'creaminess',

    'astringency': 'astringency',
    'Astringency': 'astringency',
    'dryness': 'astringency',
    'Dryness': 'astringency',
    'tannin': 'astringency',
    'Tannin': 'astringency',

    'mid_mouthfeel': 'mouthfeel',
    'Mid_Mouthfeel': 'mouthfeel',
    'mouth_feel': 'mouthfeel',
    'Mouth_Feel': 'mouthfeel',
    'weight': 'mouthfeel',
    'Weight': 'mouthfeel',

    // Aftertaste stage
    'aftertaste_duration': 'duration',
    'Aftertaste_Duration': 'duration',
    'aftertasteDuration': 'duration',
    'finish_length': 'duration',
    'Finish_Length': 'duration',
    'Duration': 'duration',

    'aftertaste_pleasantness': 'pleasantness',
    'Aftertaste_Pleasantness': 'pleasantness',
    'aftertastePleasantness': 'pleasantness',
    'Pleasantness': 'pleasantness',

    'aftertaste_cleanness': 'cleanness',
    'Aftertaste_Cleanness': 'cleanness',
    'aftertasteCleanness': 'cleanness',
    'Cleanness': 'cleanness',
    'clean_finish': 'cleanness',
    'Clean_Finish': 'cleanness'
};

/**
 * Stage name aliases for normalization
 */
const STAGE_ALIASES = {
    'appearance': 'appearance',
    'Appearance': 'appearance',
    'visual': 'appearance',
    'Visual': 'appearance',
    'look': 'appearance',

    'aroma': 'aroma',
    'Aroma': 'aroma',
    'smell': 'aroma',
    'Smell': 'aroma',
    'nose': 'aroma',
    'Nose': 'aroma',

    'frontMouth': 'frontMouth',
    'front_mouth': 'frontMouth',
    'Front_Mouth': 'frontMouth',
    'FrontMouth': 'frontMouth',
    'front_of_mouth': 'frontMouth',
    'initial_taste': 'frontMouth',
    'Initial_Taste': 'frontMouth',
    'first_taste': 'frontMouth',

    'midRearMouth': 'midRearMouth',
    'mid_rear_mouth': 'midRearMouth',
    'Mid_Rear_Mouth': 'midRearMouth',
    'MidRearMouth': 'midRearMouth',
    'mid_mouth': 'midRearMouth',
    'Mid_Mouth': 'midRearMouth',
    'middle_taste': 'midRearMouth',

    'aftertaste': 'aftertaste',
    'Aftertaste': 'aftertaste',
    'after_taste': 'aftertaste',
    'After_Taste': 'aftertaste',
    'finish': 'aftertaste',
    'Finish': 'aftertaste'
};

/**
 * Valid sensory attributes per stage (canonical names)
 */
const STAGE_ATTRIBUTES = {
    appearance: ['visualAppeal', 'colorIntensity', 'carbonation', 'overallIntensity'],
    aroma: ['intensity', 'sweetness', 'complexity', 'persistence', 'overallIntensity'],
    frontMouth: ['sweetness', 'sourness', 'saltiness', 'texture', 'acidity', 'spiciness', 'overallIntensity'],
    midRearMouth: ['bitterness', 'umami', 'richness', 'creaminess', 'astringency', 'mouthfeel', 'overallIntensity'],
    aftertaste: ['duration', 'pleasantness', 'cleanness', 'overallIntensity']
};

/**
 * Valid emotions per stage
 */
const STAGE_EMOTIONS = {
    appearance: ['anticipation', 'desire', 'excitement', 'happiness', 'curiosity', 'surprise'],
    aroma: ['pleasure', 'comfort', 'nostalgia', 'happiness', 'energy', 'relaxation', 'intrigue'],
    frontMouth: ['excitement', 'satisfaction', 'happiness', 'pleasure', 'disappointment'],
    midRearMouth: ['indulgence', 'comfort', 'satisfaction', 'pleasure', 'sophistication'],
    aftertaste: ['satisfaction', 'completeness', 'happiness', 'craving']
};

/**
 * Normalize an attribute name to its canonical form
 * @param {string} attributeName - The attribute name to normalize
 * @returns {string} - The canonical attribute name
 */
function normalizeAttributeName(attributeName) {
    if (!attributeName) return attributeName;

    // Check direct alias match
    if (ATTRIBUTE_ALIASES[attributeName]) {
        return ATTRIBUTE_ALIASES[attributeName];
    }

    // Check case-insensitive match
    const lowerName = attributeName.toLowerCase();
    for (const [alias, canonical] of Object.entries(ATTRIBUTE_ALIASES)) {
        if (alias.toLowerCase() === lowerName) {
            return canonical;
        }
    }

    // Already canonical or unknown - return as-is
    return attributeName;
}

/**
 * Normalize a stage name to its canonical form
 * @param {string} stageName - The stage name to normalize
 * @returns {string} - The canonical stage name
 */
function normalizeStageName(stageName) {
    if (!stageName) return stageName;

    if (STAGE_ALIASES[stageName]) {
        return STAGE_ALIASES[stageName];
    }

    // Check case-insensitive
    const lowerName = stageName.toLowerCase();
    for (const [alias, canonical] of Object.entries(STAGE_ALIASES)) {
        if (alias.toLowerCase() === lowerName) {
            return canonical;
        }
    }

    return stageName;
}

/**
 * Normalize all attribute names in a data row
 * @param {Object} row - Data row with potentially non-standard names
 * @returns {Object} - Row with normalized attribute names
 */
function normalizeRow(row) {
    if (!row || typeof row !== 'object') return row;

    const normalized = {};

    for (const [key, value] of Object.entries(row)) {
        const normalizedKey = normalizeAttributeName(key);
        normalized[normalizedKey] = value;
    }

    return normalized;
}

/**
 * Normalize an entire experience object
 * @param {Object} experience - Experience object to normalize
 * @returns {Object} - Normalized experience
 */
function normalizeExperience(experience) {
    if (!experience) return experience;

    const normalized = { ...experience };

    // Normalize stages
    if (normalized.stages) {
        const normalizedStages = {};

        for (const [stageName, stageData] of Object.entries(normalized.stages)) {
            const canonicalStage = normalizeStageName(stageName);
            const normalizedStageData = {};

            for (const [attrName, value] of Object.entries(stageData || {})) {
                if (attrName === 'emotions') {
                    // Keep emotions as-is but normalize emotion names if needed
                    normalizedStageData.emotions = value;
                } else {
                    const canonicalAttr = normalizeAttributeName(attrName);
                    normalizedStageData[canonicalAttr] = value;
                }
            }

            normalizedStages[canonicalStage] = normalizedStageData;
        }

        normalized.stages = normalizedStages;
    }

    return normalized;
}

/**
 * Validate an experience object
 * @param {Object} experience - Experience to validate
 * @returns {Object} - { valid: boolean, errors: [], warnings: [] }
 */
function validateExperience(experience) {
    const result = {
        valid: true,
        errors: [],
        warnings: []
    };

    if (!experience) {
        result.valid = false;
        result.errors.push({ field: 'experience', message: 'Experience is null or undefined' });
        return result;
    }

    // Check required product info
    if (!experience.productInfo) {
        result.valid = false;
        result.errors.push({ field: 'productInfo', message: 'Product info is missing' });
    } else {
        if (!experience.productInfo.name || experience.productInfo.name === 'Unknown Product') {
            result.warnings.push({ field: 'productInfo.name', message: 'Product name is missing or unknown' });
        }
    }

    // Check stages exist
    if (!experience.stages) {
        result.valid = false;
        result.errors.push({ field: 'stages', message: 'Stages data is missing' });
        return result;
    }

    // Validate each stage
    const requiredStages = ['appearance', 'aroma', 'frontMouth', 'midRearMouth', 'aftertaste'];

    for (const stageName of requiredStages) {
        const stage = experience.stages[stageName];

        if (!stage) {
            result.warnings.push({ field: `stages.${stageName}`, message: `${stageName} stage is missing` });
            continue;
        }

        // Check attribute values are in valid range
        const validAttrs = STAGE_ATTRIBUTES[stageName] || [];
        for (const [attr, value] of Object.entries(stage)) {
            if (attr === 'emotions' || attr === 'overallIntensity') continue;

            if (typeof value === 'number') {
                if (value < 0 || value > 10) {
                    result.warnings.push({
                        field: `stages.${stageName}.${attr}`,
                        message: `Value ${value} out of range (0-10)`,
                        correctedValue: Math.max(0, Math.min(10, value))
                    });
                }
            }
        }

        // Check if stage has mostly default values
        let defaultCount = 0;
        let totalCount = 0;
        for (const [attr, value] of Object.entries(stage)) {
            if (attr !== 'emotions' && typeof value === 'number') {
                totalCount++;
                if (value === 5) defaultCount++;
            }
        }

        if (totalCount > 0 && defaultCount === totalCount) {
            result.warnings.push({
                field: `stages.${stageName}`,
                message: `All values are defaults - inference may be inaccurate`
            });
        }
    }

    // Check emotional triggers
    if (!experience.emotionalTriggers) {
        result.warnings.push({ field: 'emotionalTriggers', message: 'Emotional triggers missing' });
    } else {
        const triggers = ['moreishness', 'refreshment', 'melt', 'crunch'];
        for (const trigger of triggers) {
            const value = experience.emotionalTriggers[trigger];
            if (value === undefined) {
                result.warnings.push({ field: `emotionalTriggers.${trigger}`, message: `${trigger} trigger missing` });
            } else if (value < 0 || value > 10) {
                result.warnings.push({
                    field: `emotionalTriggers.${trigger}`,
                    message: `Value ${value} out of range (0-10)`
                });
            }
        }
    }

    // Check need state
    const validNeedStates = ['reward', 'escape', 'rejuvenation', 'sociability'];
    if (!experience.needState) {
        result.warnings.push({ field: 'needState', message: 'Need state not set' });
    } else if (!validNeedStates.includes(experience.needState)) {
        result.warnings.push({ field: 'needState', message: `Invalid need state: ${experience.needState}` });
    }

    return result;
}

/**
 * Auto-correct common data issues
 * @param {Object} experience - Experience to correct
 * @returns {Object} - Corrected experience
 */
function autoCorrectExperience(experience) {
    if (!experience) return experience;

    const corrected = JSON.parse(JSON.stringify(experience));

    // Ensure stages exist
    if (!corrected.stages) {
        corrected.stages = {};
    }

    // Ensure all required stages exist with defaults
    const defaultStages = {
        appearance: { visualAppeal: 5, colorIntensity: 5, carbonation: 5, emotions: {} },
        aroma: { intensity: 5, sweetness: 5, complexity: 5, persistence: 5, emotions: {} },
        frontMouth: { sweetness: 5, sourness: 5, saltiness: 5, texture: 5, acidity: 5, spiciness: 5, emotions: {} },
        midRearMouth: { bitterness: 5, umami: 5, richness: 5, creaminess: 5, astringency: 5, mouthfeel: 5, emotions: {} },
        aftertaste: { duration: 5, pleasantness: 5, cleanness: 5, emotions: {} }
    };

    for (const [stageName, defaults] of Object.entries(defaultStages)) {
        if (!corrected.stages[stageName]) {
            corrected.stages[stageName] = { ...defaults };
        } else {
            // Fill in missing attributes with defaults
            for (const [attr, defaultValue] of Object.entries(defaults)) {
                if (corrected.stages[stageName][attr] === undefined) {
                    corrected.stages[stageName][attr] = defaultValue;
                }
            }
        }

        // Clamp values to 0-10 range
        for (const [attr, value] of Object.entries(corrected.stages[stageName])) {
            if (attr !== 'emotions' && typeof value === 'number') {
                corrected.stages[stageName][attr] = Math.max(0, Math.min(10, value));
            }
        }
    }

    // Ensure emotional triggers exist
    if (!corrected.emotionalTriggers) {
        corrected.emotionalTriggers = { moreishness: 5, refreshment: 5, melt: 5, crunch: 5 };
    }

    // Ensure need state
    if (!corrected.needState) {
        corrected.needState = 'reward';
    }

    return corrected;
}

/**
 * Get the list of all valid attribute names for a stage
 * @param {string} stageName - The stage name
 * @returns {Array} - List of valid attribute names
 */
function getStageAttributes(stageName) {
    const canonical = normalizeStageName(stageName);
    return STAGE_ATTRIBUTES[canonical] || [];
}

/**
 * Get the list of all valid emotions for a stage
 * @param {string} stageName - The stage name
 * @returns {Array} - List of valid emotion names
 */
function getStageEmotions(stageName) {
    const canonical = normalizeStageName(stageName);
    return STAGE_EMOTIONS[canonical] || [];
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ATTRIBUTE_ALIASES,
        STAGE_ALIASES,
        STAGE_ATTRIBUTES,
        STAGE_EMOTIONS,
        normalizeAttributeName,
        normalizeStageName,
        normalizeRow,
        normalizeExperience,
        validateExperience,
        autoCorrectExperience,
        getStageAttributes,
        getStageEmotions
    };
}

// Make available globally in browser
if (typeof window !== 'undefined') {
    window.SchemaValidation = {
        ATTRIBUTE_ALIASES,
        STAGE_ALIASES,
        STAGE_ATTRIBUTES,
        STAGE_EMOTIONS,
        normalizeAttributeName,
        normalizeStageName,
        normalizeRow,
        normalizeExperience,
        validateExperience,
        autoCorrectExperience,
        getStageAttributes,
        getStageEmotions
    };
}
