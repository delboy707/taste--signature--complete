// ===== SENSORY INFERENCE ENGINE =====
// Infers sensory attributes from consumer feedback/descriptions using Claude API
// Part of the automatic data processing pipeline

/**
 * System prompt for Claude to infer sensory attributes
 */
const SENSORY_INFERENCE_SYSTEM_PROMPT = `You are an expert sensory scientist specializing in food and beverage analysis. Your task is to infer sensory attributes from product information, consumer feedback, or descriptions.

You must return a JSON object with sensory scores on a 0-10 scale for each attribute. Use your expertise to make reasonable inferences based on:
- Product category and type
- Ingredient lists
- Consumer descriptions and comments
- Flavor profile keywords
- Texture descriptions

If information is insufficient for a confident inference, use moderate values (4-6) and note low confidence.

IMPORTANT: Return ONLY valid JSON, no additional text or explanation.`;

/**
 * Template for structured sensory inference
 */
const SENSORY_INFERENCE_TEMPLATE = {
    appearance: {
        visualAppeal: 5,
        colorIntensity: 5,
        carbonation: 5
    },
    aroma: {
        intensity: 5,
        sweetness: 5,
        complexity: 5,
        persistence: 5
    },
    frontMouth: {
        sweetness: 5,
        sourness: 3,
        saltiness: 3,
        texture: 5,
        acidity: 3,
        spiciness: 3
    },
    midRearMouth: {
        bitterness: 3,
        umami: 3,
        richness: 5,
        creaminess: 5,
        astringency: 3,
        mouthfeel: 5
    },
    aftertaste: {
        duration: 5,
        pleasantness: 5,
        cleanness: 5
    }
};

/**
 * Keyword-based inference rules (used as fallback when API unavailable)
 */
const KEYWORD_SENSORY_RULES = {
    // Sweetness indicators
    sweet: { 'frontMouth.sweetness': 8, 'aroma.sweetness': 7 },
    sugary: { 'frontMouth.sweetness': 9, 'aroma.sweetness': 6 },
    honey: { 'frontMouth.sweetness': 7, 'aroma.sweetness': 8, 'midRearMouth.richness': 6 },
    caramel: { 'frontMouth.sweetness': 8, 'midRearMouth.richness': 7, 'aroma.sweetness': 8 },

    // Sourness/acidity indicators
    sour: { 'frontMouth.sourness': 8 },
    tart: { 'frontMouth.sourness': 7, 'aftertaste.cleanness': 7 },
    tangy: { 'frontMouth.sourness': 6, 'aroma.intensity': 6 },
    acidic: { 'frontMouth.sourness': 8, 'aftertaste.cleanness': 6 },
    citrus: { 'frontMouth.sourness': 6, 'aroma.intensity': 8, 'aftertaste.cleanness': 7 },
    lemon: { 'frontMouth.sourness': 7, 'aroma.intensity': 8, 'aftertaste.cleanness': 8 },

    // Bitterness indicators
    bitter: { 'midRearMouth.bitterness': 8 },
    dark: { 'midRearMouth.bitterness': 6, 'midRearMouth.richness': 7 },
    coffee: { 'midRearMouth.bitterness': 7, 'aroma.intensity': 8, 'aroma.complexity': 7 },
    espresso: { 'midRearMouth.bitterness': 8, 'aroma.intensity': 9 },

    // Richness/creaminess indicators
    rich: { 'midRearMouth.richness': 8, 'midRearMouth.creaminess': 6 },
    creamy: { 'midRearMouth.creaminess': 9, 'midRearMouth.richness': 7, 'frontMouth.texture': 8 },
    smooth: { 'midRearMouth.creaminess': 7, 'frontMouth.texture': 8 },
    velvety: { 'midRearMouth.creaminess': 9, 'frontMouth.texture': 9 },
    buttery: { 'midRearMouth.richness': 8, 'midRearMouth.creaminess': 7 },

    // Texture indicators
    crunchy: { 'frontMouth.texture': 8 },
    crispy: { 'frontMouth.texture': 9 },
    chewy: { 'frontMouth.texture': 6, 'aftertaste.duration': 7 },
    soft: { 'frontMouth.texture': 4, 'midRearMouth.creaminess': 6 },

    // Savory/umami indicators
    savory: { 'midRearMouth.umami': 7, 'frontMouth.saltiness': 5 },
    umami: { 'midRearMouth.umami': 9 },
    meaty: { 'midRearMouth.umami': 8, 'midRearMouth.richness': 7 },
    salty: { 'frontMouth.saltiness': 8 },

    // Aroma indicators
    fragrant: { 'aroma.intensity': 8, 'aroma.complexity': 7 },
    aromatic: { 'aroma.intensity': 8, 'aroma.complexity': 8 },
    floral: { 'aroma.intensity': 7, 'aroma.complexity': 8, 'aroma.sweetness': 6 },
    herbal: { 'aroma.intensity': 7, 'aroma.complexity': 7, 'midRearMouth.bitterness': 4 },
    spicy: { 'aroma.intensity': 8, 'frontMouth.texture': 6 },

    // Quality indicators
    fresh: { 'aftertaste.cleanness': 8, 'appearance.visualAppeal': 7 },
    premium: { 'appearance.visualAppeal': 8, 'midRearMouth.richness': 7 },
    artisan: { 'aroma.complexity': 8, 'midRearMouth.richness': 7 },
    'high quality': { 'appearance.visualAppeal': 8, 'aroma.complexity': 7 },

    // Aftertaste indicators
    lingering: { 'aftertaste.duration': 8 },
    'long finish': { 'aftertaste.duration': 9, 'aftertaste.pleasantness': 7 },
    clean: { 'aftertaste.cleanness': 9, 'aftertaste.duration': 4 },
    'short finish': { 'aftertaste.duration': 3 },

    // Intensity indicators
    intense: { 'aroma.intensity': 8, 'frontMouth.texture': 7 },
    mild: { 'aroma.intensity': 4, 'frontMouth.sweetness': 4 },
    bold: { 'aroma.intensity': 9, 'midRearMouth.richness': 8 },
    subtle: { 'aroma.intensity': 4, 'aroma.complexity': 6 },
    delicate: { 'aroma.intensity': 4, 'aroma.complexity': 7, 'appearance.visualAppeal': 7 }
};

/**
 * Category-based baseline sensory profiles
 */
const CATEGORY_BASELINES = {
    chocolate: {
        appearance: { visualAppeal: 7, colorIntensity: 7, carbonation: 0 },
        aroma: { intensity: 7, sweetness: 6, complexity: 6, persistence: 6 },
        frontMouth: { sweetness: 6, sourness: 2, saltiness: 2, texture: 6, acidity: 2, spiciness: 1 },
        midRearMouth: { bitterness: 5, umami: 2, richness: 7, creaminess: 6, astringency: 3, mouthfeel: 7 },
        aftertaste: { duration: 6, pleasantness: 7, cleanness: 5 }
    },
    beverage: {
        appearance: { visualAppeal: 6, colorIntensity: 5, carbonation: 5 },
        aroma: { intensity: 6, sweetness: 5, complexity: 5, persistence: 5 },
        frontMouth: { sweetness: 5, sourness: 4, saltiness: 2, texture: 4, acidity: 4, spiciness: 2 },
        midRearMouth: { bitterness: 3, umami: 2, richness: 4, creaminess: 3, astringency: 3, mouthfeel: 5 },
        aftertaste: { duration: 5, pleasantness: 6, cleanness: 7 }
    },
    snack: {
        appearance: { visualAppeal: 6, colorIntensity: 6, carbonation: 0 },
        aroma: { intensity: 5, sweetness: 4, complexity: 5, persistence: 4 },
        frontMouth: { sweetness: 4, sourness: 3, saltiness: 5, texture: 7, acidity: 3, spiciness: 4 },
        midRearMouth: { bitterness: 2, umami: 5, richness: 5, creaminess: 4, astringency: 2, mouthfeel: 6 },
        aftertaste: { duration: 4, pleasantness: 6, cleanness: 6 }
    },
    dairy: {
        appearance: { visualAppeal: 6, colorIntensity: 4, carbonation: 0 },
        aroma: { intensity: 5, sweetness: 5, complexity: 4, persistence: 4 },
        frontMouth: { sweetness: 5, sourness: 3, saltiness: 3, texture: 6, acidity: 3, spiciness: 1 },
        midRearMouth: { bitterness: 2, umami: 4, richness: 6, creaminess: 8, astringency: 1, mouthfeel: 7 },
        aftertaste: { duration: 5, pleasantness: 6, cleanness: 5 }
    },
    dessert: {
        appearance: { visualAppeal: 8, colorIntensity: 6, carbonation: 0 },
        aroma: { intensity: 7, sweetness: 8, complexity: 6, persistence: 6 },
        frontMouth: { sweetness: 8, sourness: 2, saltiness: 2, texture: 6, acidity: 2, spiciness: 1 },
        midRearMouth: { bitterness: 2, umami: 2, richness: 7, creaminess: 6, astringency: 2, mouthfeel: 6 },
        aftertaste: { duration: 6, pleasantness: 7, cleanness: 5 }
    },
    default: {
        appearance: { visualAppeal: 5, colorIntensity: 5, carbonation: 3 },
        aroma: { intensity: 5, sweetness: 5, complexity: 5, persistence: 5 },
        frontMouth: { sweetness: 5, sourness: 3, saltiness: 3, texture: 5, acidity: 3, spiciness: 3 },
        midRearMouth: { bitterness: 3, umami: 3, richness: 5, creaminess: 5, astringency: 3, mouthfeel: 5 },
        aftertaste: { duration: 5, pleasantness: 5, cleanness: 5 }
    }
};

/**
 * Main sensory inference class
 */
class SensoryInference {

    /**
     * Infer sensory profile from product data using Claude API
     * @param {Object} productData - Product information and feedback
     * @returns {Object} - Inferred sensory profile with confidence
     */
    static async inferFromFeedback(productData) {
        const result = {
            sensoryProfile: JSON.parse(JSON.stringify(SENSORY_INFERENCE_TEMPLATE)),
            confidence: 0,
            inferenceMethod: 'unknown',
            warnings: []
        };

        try {
            // Try Claude API first if available
            if (this.isClaudeAvailable()) {
                const apiResult = await this.inferWithClaude(productData);
                if (apiResult.success) {
                    result.sensoryProfile = apiResult.profile;
                    result.confidence = apiResult.confidence;
                    result.inferenceMethod = 'claude_api';
                    result.warnings = apiResult.warnings || [];
                    return result;
                }
            }

            // Fallback to keyword-based inference
            console.log('Using keyword-based inference (Claude API unavailable)');
            const keywordResult = this.inferWithKeywords(productData);
            result.sensoryProfile = keywordResult.profile;
            result.confidence = keywordResult.confidence;
            result.inferenceMethod = 'keyword_rules';
            result.warnings = keywordResult.warnings || [];
            result.warnings.push({
                type: 'fallback',
                message: 'Used keyword-based inference (Claude API unavailable)'
            });

        } catch (error) {
            console.error('Sensory inference error:', error);
            result.warnings.push({
                type: 'error',
                message: error.message
            });

            // Use category baseline as last resort
            const category = this.detectCategory(productData);
            result.sensoryProfile = JSON.parse(JSON.stringify(
                CATEGORY_BASELINES[category] || CATEGORY_BASELINES.default
            ));
            result.confidence = 0.3;
            result.inferenceMethod = 'category_baseline';
        }

        return result;
    }

    /**
     * Check if Claude API is available
     */
    static isClaudeAvailable() {
        return typeof window !== 'undefined' &&
               window.claudeAI &&
               typeof window.claudeAI.sendMessage === 'function';
    }

    /**
     * Infer sensory profile using Claude API
     */
    static async inferWithClaude(productData) {
        const prompt = this.buildClaudePrompt(productData);

        try {
            const response = await window.claudeAI.sendMessage(prompt, SENSORY_INFERENCE_SYSTEM_PROMPT);

            // Parse JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in Claude response');
            }

            const parsed = JSON.parse(jsonMatch[0]);

            // Validate and normalize the response
            const profile = this.normalizeProfile(parsed);
            const confidence = parsed.confidence || 0.7;

            return {
                success: true,
                profile,
                confidence: Math.min(0.95, confidence),
                warnings: parsed.warnings || []
            };

        } catch (error) {
            console.error('Claude inference failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Build prompt for Claude API
     */
    static buildClaudePrompt(productData) {
        let prompt = `Analyze this product and infer sensory attributes:\n\n`;

        if (productData.name || productData.productName) {
            prompt += `**Product Name:** ${productData.name || productData.productName}\n`;
        }

        if (productData.brand) {
            prompt += `**Brand:** ${productData.brand}\n`;
        }

        if (productData.category || productData.type) {
            prompt += `**Category:** ${productData.category || productData.type}\n`;
        }

        if (productData.description) {
            prompt += `**Description:** ${productData.description}\n`;
        }

        if (productData.ingredients) {
            prompt += `**Ingredients:** ${productData.ingredients}\n`;
        }

        if (productData.feedback || productData.comments || productData.consumerFeedback) {
            prompt += `**Consumer Feedback:** ${productData.feedback || productData.comments || productData.consumerFeedback}\n`;
        }

        if (productData.rating || productData.overallRating) {
            prompt += `**Overall Rating:** ${productData.rating || productData.overallRating}/10\n`;
        }

        if (productData.flavorProfile || productData.tasteProfile) {
            prompt += `**Flavor Profile:** ${productData.flavorProfile || productData.tasteProfile}\n`;
        }

        prompt += `\nReturn a JSON object with this exact structure:
{
  "appearance": { "visualAppeal": 0-10, "colorIntensity": 0-10 },
  "aroma": { "intensity": 0-10, "sweetness": 0-10, "complexity": 0-10 },
  "frontMouth": { "sweetness": 0-10, "sourness": 0-10, "saltiness": 0-10, "texture": 0-10 },
  "midRearMouth": { "bitterness": 0-10, "umami": 0-10, "richness": 0-10, "creaminess": 0-10 },
  "aftertaste": { "duration": 0-10, "pleasantness": 0-10, "cleanness": 0-10 },
  "confidence": 0-1,
  "inferenceNotes": "Brief explanation of key inferences"
}`;

        return prompt;
    }

    /**
     * Infer sensory profile using keyword rules (fallback method)
     */
    static inferWithKeywords(productData) {
        // Start with category baseline
        const category = this.detectCategory(productData);
        const profile = JSON.parse(JSON.stringify(
            CATEGORY_BASELINES[category] || CATEGORY_BASELINES.default
        ));

        // Combine all text for keyword matching
        const allText = [
            productData.name || '',
            productData.productName || '',
            productData.description || '',
            productData.feedback || '',
            productData.comments || '',
            productData.consumerFeedback || '',
            productData.flavorProfile || '',
            productData.tasteProfile || '',
            productData.ingredients || ''
        ].join(' ').toLowerCase();

        let matchedKeywords = 0;

        // Apply keyword rules
        for (const [keyword, rules] of Object.entries(KEYWORD_SENSORY_RULES)) {
            if (allText.includes(keyword)) {
                matchedKeywords++;
                for (const [path, value] of Object.entries(rules)) {
                    this.setNestedValue(profile, path, value);
                }
            }
        }

        // Calculate confidence based on matched keywords
        const confidence = Math.min(0.7, 0.3 + (matchedKeywords * 0.05));

        const warnings = [];
        if (matchedKeywords < 3) {
            warnings.push({
                type: 'low_keyword_match',
                message: `Only ${matchedKeywords} keywords matched - inference may be inaccurate`
            });
        }

        return { profile, confidence, warnings };
    }

    /**
     * Detect product category from data
     */
    static detectCategory(productData) {
        const text = [
            productData.category || '',
            productData.type || '',
            productData.name || '',
            productData.productName || '',
            productData.description || ''
        ].join(' ').toLowerCase();

        if (text.includes('chocolate') || text.includes('cocoa')) return 'chocolate';
        if (text.includes('drink') || text.includes('beverage') || text.includes('juice') || text.includes('soda')) return 'beverage';
        if (text.includes('snack') || text.includes('chip') || text.includes('crisp')) return 'snack';
        if (text.includes('milk') || text.includes('cheese') || text.includes('yogurt') || text.includes('dairy')) return 'dairy';
        if (text.includes('dessert') || text.includes('cake') || text.includes('ice cream') || text.includes('sweet')) return 'dessert';

        return 'default';
    }

    /**
     * Set nested value in object using dot notation path
     */
    static setNestedValue(obj, path, value) {
        const parts = path.split('.');
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) current[parts[i]] = {};
            current = current[parts[i]];
        }
        // Use max to not override higher values
        const lastPart = parts[parts.length - 1];
        current[lastPart] = Math.max(current[lastPart] || 0, value);
    }

    /**
     * Normalize and validate sensory profile
     */
    static normalizeProfile(rawProfile) {
        const normalized = JSON.parse(JSON.stringify(SENSORY_INFERENCE_TEMPLATE));

        // Map common variations
        const stageMapping = {
            appearance: ['appearance', 'visual', 'looks'],
            aroma: ['aroma', 'smell', 'nose', 'scent'],
            frontMouth: ['frontMouth', 'front_mouth', 'taste', 'initial_taste', 'first_taste'],
            midRearMouth: ['midRearMouth', 'mid_rear_mouth', 'midmouth', 'mid_mouth', 'body', 'mouthfeel'],
            aftertaste: ['aftertaste', 'after_taste', 'finish', 'ending']
        };

        for (const [targetStage, sourceNames] of Object.entries(stageMapping)) {
            for (const sourceName of sourceNames) {
                if (rawProfile[sourceName]) {
                    for (const [attr, value] of Object.entries(rawProfile[sourceName])) {
                        if (normalized[targetStage] && normalized[targetStage][attr] !== undefined) {
                            normalized[targetStage][attr] = this.clampValue(value);
                        }
                    }
                    break;
                }
            }
        }

        return normalized;
    }

    /**
     * Clamp value to 0-10 range
     */
    static clampValue(value) {
        const num = parseFloat(value);
        if (isNaN(num)) return 5;
        return Math.max(0, Math.min(10, Math.round(num * 10) / 10));
    }

    /**
     * Batch process multiple product rows
     */
    static async batchInfer(rows, options = {}) {
        const results = [];
        const batchSize = options.batchSize || 5;
        const delayMs = options.delayMs || 500;

        for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);

            // Process batch in parallel
            const batchResults = await Promise.all(
                batch.map(async (row, idx) => {
                    try {
                        const result = await this.inferFromFeedback(row);
                        return {
                            index: i + idx,
                            success: true,
                            ...result
                        };
                    } catch (error) {
                        return {
                            index: i + idx,
                            success: false,
                            error: error.message,
                            confidence: 0
                        };
                    }
                })
            );

            results.push(...batchResults);

            // Delay between batches to avoid rate limiting
            if (i + batchSize < rows.length && delayMs > 0) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }

            // Progress callback if provided
            if (options.onProgress) {
                options.onProgress({
                    processed: Math.min(i + batchSize, rows.length),
                    total: rows.length,
                    percent: Math.round((Math.min(i + batchSize, rows.length) / rows.length) * 100)
                });
            }
        }

        return results;
    }

    /**
     * Merge inferred sensory data into experience object
     */
    static mergeIntoExperience(experience, inferredSensory) {
        const merged = JSON.parse(JSON.stringify(experience));

        if (!merged.stages) merged.stages = {};

        // Merge each stage
        for (const [stage, attributes] of Object.entries(inferredSensory.sensoryProfile)) {
            if (!merged.stages[stage]) merged.stages[stage] = {};

            for (const [attr, value] of Object.entries(attributes)) {
                // Only set if not already present or is default value
                if (merged.stages[stage][attr] === undefined || merged.stages[stage][attr] === 5) {
                    merged.stages[stage][attr] = value;
                }
            }
        }

        // Add inference metadata
        if (!merged._inferenceMetadata) merged._inferenceMetadata = {};
        merged._inferenceMetadata.sensoryInference = {
            method: inferredSensory.inferenceMethod,
            confidence: inferredSensory.confidence,
            warnings: inferredSensory.warnings,
            inferredAt: new Date().toISOString()
        };

        return merged;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SensoryInference, KEYWORD_SENSORY_RULES, CATEGORY_BASELINES };
}

// Make available globally in browser
if (typeof window !== 'undefined') {
    window.SensoryInference = SensoryInference;
}
