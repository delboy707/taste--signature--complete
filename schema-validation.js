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
    'visual_appeal': 'visual-appeal',
    'Visual_Appeal': 'visual-appeal',
    'VisualAppeal': 'visual-appeal',
    'visualAppeal': 'visual-appeal',
    'appearance_visual': 'visual-appeal',
    'appearance_visual_appeal': 'visual-appeal',

    'color_intensity': 'color-richness',
    'Color_Intensity': 'color-richness',
    'ColorIntensity': 'color-richness',
    'colorIntensity': 'color-richness',
    'appearance_color': 'color-richness',
    'appearance_color_intensity': 'color-richness',

    'carbonation': 'bubble-activity',
    'Carbonation': 'bubble-activity',
    'fizz': 'bubble-activity',
    'Fizz': 'bubble-activity',
    'bubble_activity': 'bubble-activity',

    // Aroma stage
    'aroma_intensity': 'smell-strength',
    'Aroma_Intensity': 'smell-strength',
    'aromaIntensity': 'smell-strength',
    'AromaIntensity': 'smell-strength',
    'smell_intensity': 'smell-strength',

    'aroma_sweetness': 'caramel-toffee-notes',
    'Aroma_Sweetness': 'caramel-toffee-notes',
    'aromaSweetness': 'caramel-toffee-notes',
    'smell_sweetness': 'caramel-toffee-notes',

    'aroma_complexity': 'smell-complexity',
    'Aroma_Complexity': 'smell-complexity',
    'aromaComplexity': 'smell-complexity',

    'persistence': 'smell-duration',
    'Persistence': 'smell-duration',
    'aroma_persistence': 'smell-duration',
    'Aroma_Persistence': 'smell-duration',
    'linger': 'smell-duration',

    // Front mouth stage
    'taste_sweetness': 'sweetness',
    'Taste_Sweetness': 'sweetness',
    'front_sweetness': 'sweetness',
    'Front_Sweetness': 'sweetness',
    'Sweetness': 'sweetness',

    'taste_sourness': 'sourness-tartness',
    'Taste_Sourness': 'sourness-tartness',
    'front_sourness': 'sourness-tartness',
    'Front_Sourness': 'sourness-tartness',
    'Sourness': 'sourness-tartness',
    'acidity': 'sourness-tartness',
    'Acidity': 'sourness-tartness',
    'acid': 'sourness-tartness',
    'ph_response': 'sourness-tartness',

    'taste_saltiness': 'saltiness',
    'Taste_Saltiness': 'saltiness',
    'front_saltiness': 'saltiness',
    'Front_Saltiness': 'saltiness',
    'Saltiness': 'saltiness',

    'front_texture': 'first-bite-texture',
    'Front_Texture': 'first-bite-texture',
    'Texture': 'first-bite-texture',
    'mouthfeel': 'first-bite-texture',
    'Mouthfeel': 'first-bite-texture',

    'spiciness': 'spicy-heat',
    'Spiciness': 'spicy-heat',
    'heat': 'spicy-heat',
    'Heat': 'spicy-heat',
    'pungency': 'spicy-heat',
    'Pungency': 'spicy-heat',

    // Mid/rear mouth stage
    'mid_bitterness': 'bitterness-development',
    'Mid_Bitterness': 'bitterness-development',
    'Bitterness': 'bitterness-development',

    'mid_umami': 'umami-savoury-depth',
    'Mid_Umami': 'umami-savoury-depth',
    'Umami': 'umami-savoury-depth',
    'savory': 'umami-savoury-depth',
    'Savory': 'umami-savoury-depth',

    'mid_richness': 'richness-fullness',
    'Mid_Richness': 'richness-fullness',
    'Richness': 'richness-fullness',
    'body': 'richness-fullness',
    'Body': 'richness-fullness',

    'mid_mouthfeel': 'overall-mid-palate-intensity',
    'Mid_Mouthfeel': 'overall-mid-palate-intensity',
    'mouth_feel': 'overall-mid-palate-intensity',
    'Mouth_Feel': 'overall-mid-palate-intensity',
    'weight': 'overall-mid-palate-intensity',
    'Weight': 'overall-mid-palate-intensity',

    // Texture stage
    'mid_creaminess': 'creaminess',
    'Mid_Creaminess': 'creaminess',
    'Creaminess': 'creaminess',

    'astringency': 'astringency',
    'Astringency': 'astringency',
    'dryness': 'astringency',
    'Dryness': 'astringency',
    'tannin': 'astringency',
    'Tannin': 'astringency',

    // Aftertaste stage
    'aftertaste_duration': 'finish-length',
    'Aftertaste_Duration': 'finish-length',
    'aftertasteDuration': 'finish-length',
    'finish_length': 'finish-length',
    'Finish_Length': 'finish-length',
    'Duration': 'finish-length',

    'aftertaste_pleasantness': 'finish-quality',
    'Aftertaste_Pleasantness': 'finish-quality',
    'aftertastePleasantness': 'finish-quality',
    'Pleasantness': 'finish-quality',

    'aftertaste_cleanness': 'finish-cleanness',
    'Aftertaste_Cleanness': 'finish-cleanness',
    'aftertasteCleanness': 'finish-cleanness',
    'Cleanness': 'finish-cleanness',
    'clean_finish': 'finish-cleanness',
    'Clean_Finish': 'finish-cleanness',

    // Overall Assessment stage
    'overall_quality': 'overall-quality',
    'Overall_Quality': 'overall-quality',
    'satisfaction_overall': 'satisfaction-overall',
    'Satisfaction_Overall': 'satisfaction-overall'
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
    'Finish': 'aftertaste',

    'texture': 'texture',
    'Texture': 'texture',
    'mouthfeel_stage': 'texture',

    'overallAssessment': 'overallAssessment',
    'overall_assessment': 'overallAssessment',
    'Overall_Assessment': 'overallAssessment',
    'overall': 'overallAssessment'
};

/**
 * Valid sensory attributes per stage (canonical names)
 */
const STAGE_ATTRIBUTES = {
    appearance: ['visual-appeal', 'color-richness', 'bubble-activity'],
    aroma: ['smell-strength', 'smell-complexity', 'caramel-toffee-notes', 'smell-duration'],
    frontMouth: ['sweetness', 'sourness-tartness', 'saltiness', 'first-bite-texture', 'spicy-heat'],
    midRearMouth: ['bitterness-development', 'umami-savoury-depth', 'richness-fullness', 'overall-mid-palate-intensity'],
    texture: ['creaminess', 'astringency', 'smoothness', 'chewiness', 'crunchiness'],
    aftertaste: ['finish-length', 'finish-quality', 'finish-cleanness'],
    overallAssessment: ['overall-quality', 'satisfaction-overall', 'want-more-quality', 'refreshing-quality']
};

/**
 * Valid emotions per stage
 */
const VALIDATION_STAGE_EMOTIONS = {
    appearance: ['anticipation', 'desire', 'excitement', 'happiness', 'curiosity', 'surprise'],
    aroma: ['pleasure', 'comfort', 'nostalgia', 'happiness', 'energized', 'relaxed', 'intrigued'],
    frontMouth: ['excitement', 'satisfaction', 'happiness', 'pleasure', 'disappointment'],
    midRearMouth: ['indulgence', 'comfort', 'satisfaction', 'pleasure', 'sophistication'],
    texture: ['satisfied', 'pleased', 'comforted'],
    aftertaste: ['satisfaction', 'completeness', 'happiness', 'craving-want-more'],
    overallAssessment: ['satisfaction', 'happiness', 'pleasure']
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
    const requiredStages = ['appearance', 'aroma', 'frontMouth', 'midRearMouth', 'texture', 'aftertaste', 'overallAssessment'];

    for (const stageName of requiredStages) {
        const stage = experience.stages[stageName];

        if (!stage) {
            result.warnings.push({ field: `stages.${stageName}`, message: `${stageName} stage is missing` });
            continue;
        }

        // Check attribute values are in valid range
        for (const [attr, value] of Object.entries(stage)) {
            if (attr === 'emotions') continue;

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
                if (value === 0) defaultCount++;
            }
        }

        if (totalCount > 0 && defaultCount === totalCount) {
            result.warnings.push({
                field: `stages.${stageName}`,
                message: `All values are defaults - inference may be inaccurate`
            });
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
        appearance: { 'visual-appeal': 0, 'color-richness': 0, 'bubble-activity': 0, emotions: {} },
        aroma: { 'smell-strength': 0, 'smell-complexity': 0, 'caramel-toffee-notes': 0, 'smell-duration': 0, emotions: {} },
        frontMouth: { sweetness: 0, 'sourness-tartness': 0, saltiness: 0, 'first-bite-texture': 0, 'spicy-heat': 0, emotions: {} },
        midRearMouth: { 'bitterness-development': 0, 'umami-savoury-depth': 0, 'richness-fullness': 0, 'overall-mid-palate-intensity': 0, emotions: {} },
        texture: { creaminess: 0, astringency: 0, smoothness: 0, emotions: {} },
        aftertaste: { 'finish-length': 0, 'finish-quality': 0, 'finish-cleanness': 0, emotions: {} },
        overallAssessment: { 'overall-quality': 0, 'satisfaction-overall': 0, emotions: {} }
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
    return VALIDATION_STAGE_EMOTIONS[canonical] || [];
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ATTRIBUTE_ALIASES,
        STAGE_ALIASES,
        STAGE_ATTRIBUTES,
        VALIDATION_STAGE_EMOTIONS,
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
        VALIDATION_STAGE_EMOTIONS,
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
