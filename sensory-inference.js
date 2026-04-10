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
        'visual-appeal': 0,
        'color-richness': 0,
        'bubble-activity': 0
    },
    aroma: {
        'smell-strength': 0,
        'smell-complexity': 0,
        'caramel-toffee-notes': 0,
        'smell-duration': 0
    },
    frontMouth: {
        sweetness: 0,
        'sourness-tartness': 0,
        saltiness: 0,
        'first-bite-texture': 0,
        'spicy-heat': 0
    },
    midRearMouth: {
        'bitterness-development': 0,
        'umami-savoury-depth': 0,
        'richness-fullness': 0,
        'overall-mid-palate-intensity': 0
    },
    texture: {
        creaminess: 0,
        astringency: 0,
        smoothness: 0
    },
    aftertaste: {
        'finish-length': 0,
        'finish-quality': 0,
        'finish-cleanness': 0
    },
    overallAssessment: {
        'overall-quality': 0,
        'satisfaction-overall': 0
    }
};

/**
 * Keyword-based inference rules (used as fallback when API unavailable)
 */
const KEYWORD_SENSORY_RULES = {
    // Sweetness indicators
    sweet: { 'frontMouth.sweetness': 8, 'aroma.caramel-toffee-notes': 7 },
    sugary: { 'frontMouth.sweetness': 9, 'aroma.caramel-toffee-notes': 6 },
    honey: { 'frontMouth.sweetness': 7, 'aroma.caramel-toffee-notes': 8, 'midRearMouth.richness-fullness': 6 },
    caramel: { 'frontMouth.sweetness': 8, 'midRearMouth.richness-fullness': 7, 'aroma.caramel-toffee-notes': 8 },

    // Sourness/acidity indicators
    sour: { 'frontMouth.sourness-tartness': 8 },
    tart: { 'frontMouth.sourness-tartness': 7, 'aftertaste.finish-cleanness': 7 },
    tangy: { 'frontMouth.sourness-tartness': 6, 'aroma.smell-strength': 6 },
    acidic: { 'frontMouth.sourness-tartness': 8, 'aftertaste.finish-cleanness': 6 },
    citrus: { 'frontMouth.sourness-tartness': 6, 'aroma.smell-strength': 8, 'aftertaste.finish-cleanness': 7 },
    lemon: { 'frontMouth.sourness-tartness': 7, 'aroma.smell-strength': 8, 'aftertaste.finish-cleanness': 8 },

    // Bitterness indicators
    bitter: { 'midRearMouth.bitterness-development': 8 },
    dark: { 'midRearMouth.bitterness-development': 6, 'midRearMouth.richness-fullness': 7 },
    coffee: { 'midRearMouth.bitterness-development': 7, 'aroma.smell-strength': 8, 'aroma.smell-complexity': 7 },
    espresso: { 'midRearMouth.bitterness-development': 8, 'aroma.smell-strength': 9 },

    // Richness/creaminess indicators
    rich: { 'midRearMouth.richness-fullness': 8, 'texture.creaminess': 6 },
    creamy: { 'texture.creaminess': 9, 'midRearMouth.richness-fullness': 7, 'frontMouth.first-bite-texture': 8 },
    smooth: { 'texture.creaminess': 7, 'texture.smoothness': 8, 'frontMouth.first-bite-texture': 7 },
    velvety: { 'texture.creaminess': 9, 'texture.smoothness': 9, 'frontMouth.first-bite-texture': 8 },
    buttery: { 'midRearMouth.richness-fullness': 8, 'texture.creaminess': 7 },

    // Texture indicators
    crunchy: { 'frontMouth.first-bite-texture': 8, 'texture.crunchiness': 8 },
    crispy: { 'frontMouth.first-bite-texture': 9, 'texture.crunchiness': 9 },
    chewy: { 'frontMouth.first-bite-texture': 6, 'texture.chewiness': 8, 'aftertaste.finish-length': 7 },
    soft: { 'frontMouth.first-bite-texture': 3, 'texture.creaminess': 6 },

    // Savory/umami indicators
    savory: { 'midRearMouth.umami-savoury-depth': 7, 'frontMouth.saltiness': 5 },
    umami: { 'midRearMouth.umami-savoury-depth': 9 },
    meaty: { 'midRearMouth.umami-savoury-depth': 8, 'midRearMouth.richness-fullness': 7 },
    salty: { 'frontMouth.saltiness': 8 },

    // Aroma indicators
    fragrant: { 'aroma.smell-strength': 8, 'aroma.smell-complexity': 7 },
    aromatic: { 'aroma.smell-strength': 8, 'aroma.smell-complexity': 8 },
    floral: { 'aroma.smell-strength': 7, 'aroma.smell-complexity': 8 },
    herbal: { 'aroma.smell-strength': 7, 'aroma.smell-complexity': 7, 'midRearMouth.bitterness-development': 4 },
    spicy: { 'aroma.smell-strength': 8, 'frontMouth.spicy-heat': 6 },

    // Quality indicators
    fresh: { 'aftertaste.finish-cleanness': 8, 'appearance.visual-appeal': 7 },
    premium: { 'appearance.visual-appeal': 8, 'midRearMouth.richness-fullness': 7 },
    artisan: { 'aroma.smell-complexity': 8, 'midRearMouth.richness-fullness': 7 },
    'high quality': { 'appearance.visual-appeal': 8, 'aroma.smell-complexity': 7 },

    // Aftertaste indicators
    lingering: { 'aftertaste.finish-length': 8 },
    'long finish': { 'aftertaste.finish-length': 9, 'aftertaste.finish-quality': 7 },
    clean: { 'aftertaste.finish-cleanness': 9, 'aftertaste.finish-length': 4 },
    'short finish': { 'aftertaste.finish-length': 3 },

    // Intensity indicators
    intense: { 'aroma.smell-strength': 8, 'frontMouth.first-bite-texture': 7 },
    mild: { 'aroma.smell-strength': 4, 'frontMouth.sweetness': 4 },
    bold: { 'aroma.smell-strength': 9, 'midRearMouth.richness-fullness': 8 },
    subtle: { 'aroma.smell-strength': 4, 'aroma.smell-complexity': 6 },
    delicate: { 'aroma.smell-strength': 4, 'aroma.smell-complexity': 7, 'appearance.visual-appeal': 7 }
};

/**
 * Category-based baseline sensory profiles
 */
const CATEGORY_BASELINES = {
    chocolate: {
        appearance: { 'visual-appeal': 7, 'color-richness': 7, 'bubble-activity': 0 },
        aroma: { 'smell-strength': 7, 'smell-complexity': 6, 'caramel-toffee-notes': 6, 'smell-duration': 6 },
        frontMouth: { sweetness: 6, 'sourness-tartness': 2, saltiness: 2, 'first-bite-texture': 6, 'spicy-heat': 1 },
        midRearMouth: { 'bitterness-development': 5, 'umami-savoury-depth': 2, 'richness-fullness': 7, 'overall-mid-palate-intensity': 7 },
        texture: { creaminess: 6, astringency: 3, smoothness: 6 },
        aftertaste: { 'finish-length': 6, 'finish-quality': 7, 'finish-cleanness': 5 },
        overallAssessment: { 'overall-quality': 7, 'satisfaction-overall': 7 }
    },
    beverage: {
        appearance: { 'visual-appeal': 6, 'color-richness': 5, 'bubble-activity': 5 },
        aroma: { 'smell-strength': 6, 'smell-complexity': 5, 'caramel-toffee-notes': 3, 'smell-duration': 5 },
        frontMouth: { sweetness: 5, 'sourness-tartness': 4, saltiness: 2, 'first-bite-texture': 4, 'spicy-heat': 2 },
        midRearMouth: { 'bitterness-development': 3, 'umami-savoury-depth': 2, 'richness-fullness': 4, 'overall-mid-palate-intensity': 5 },
        texture: { creaminess: 3, astringency: 3, smoothness: 5 },
        aftertaste: { 'finish-length': 5, 'finish-quality': 6, 'finish-cleanness': 7 },
        overallAssessment: { 'overall-quality': 6, 'satisfaction-overall': 6 }
    },
    snack: {
        appearance: { 'visual-appeal': 6, 'color-richness': 6, 'bubble-activity': 0 },
        aroma: { 'smell-strength': 5, 'smell-complexity': 5, 'caramel-toffee-notes': 3, 'smell-duration': 4 },
        frontMouth: { sweetness: 4, 'sourness-tartness': 3, saltiness: 5, 'first-bite-texture': 7, 'spicy-heat': 4 },
        midRearMouth: { 'bitterness-development': 2, 'umami-savoury-depth': 5, 'richness-fullness': 5, 'overall-mid-palate-intensity': 6 },
        texture: { creaminess: 4, astringency: 2, smoothness: 4 },
        aftertaste: { 'finish-length': 4, 'finish-quality': 6, 'finish-cleanness': 6 },
        overallAssessment: { 'overall-quality': 6, 'satisfaction-overall': 6 }
    },
    dairy: {
        appearance: { 'visual-appeal': 6, 'color-richness': 4, 'bubble-activity': 0 },
        aroma: { 'smell-strength': 5, 'smell-complexity': 4, 'caramel-toffee-notes': 4, 'smell-duration': 4 },
        frontMouth: { sweetness: 5, 'sourness-tartness': 3, saltiness: 3, 'first-bite-texture': 6, 'spicy-heat': 1 },
        midRearMouth: { 'bitterness-development': 2, 'umami-savoury-depth': 4, 'richness-fullness': 6, 'overall-mid-palate-intensity': 7 },
        texture: { creaminess: 8, astringency: 1, smoothness: 7 },
        aftertaste: { 'finish-length': 5, 'finish-quality': 6, 'finish-cleanness': 5 },
        overallAssessment: { 'overall-quality': 6, 'satisfaction-overall': 6 }
    },
    dessert: {
        appearance: { 'visual-appeal': 8, 'color-richness': 6, 'bubble-activity': 0 },
        aroma: { 'smell-strength': 7, 'smell-complexity': 6, 'caramel-toffee-notes': 8, 'smell-duration': 6 },
        frontMouth: { sweetness: 8, 'sourness-tartness': 2, saltiness: 2, 'first-bite-texture': 6, 'spicy-heat': 1 },
        midRearMouth: { 'bitterness-development': 2, 'umami-savoury-depth': 2, 'richness-fullness': 7, 'overall-mid-palate-intensity': 7 },
        texture: { creaminess: 6, astringency: 2, smoothness: 6 },
        aftertaste: { 'finish-length': 6, 'finish-quality': 7, 'finish-cleanness': 5 },
        overallAssessment: { 'overall-quality': 7, 'satisfaction-overall': 7 }
    },
    default: {
        appearance: { 'visual-appeal': 5, 'color-richness': 5, 'bubble-activity': 0 },
        aroma: { 'smell-strength': 5, 'smell-complexity': 5, 'caramel-toffee-notes': 3, 'smell-duration': 5 },
        frontMouth: { sweetness: 5, 'sourness-tartness': 3, saltiness: 3, 'first-bite-texture': 5, 'spicy-heat': 3 },
        midRearMouth: { 'bitterness-development': 3, 'umami-savoury-depth': 3, 'richness-fullness': 5, 'overall-mid-palate-intensity': 5 },
        texture: { creaminess: 5, astringency: 3, smoothness: 5 },
        aftertaste: { 'finish-length': 5, 'finish-quality': 5, 'finish-cleanness': 5 },
        overallAssessment: { 'overall-quality': 5, 'satisfaction-overall': 5 }
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
  "appearance": { "visual-appeal": 0-10, "color-richness": 0-10, "bubble-activity": 0-10 },
  "aroma": { "smell-strength": 0-10, "smell-complexity": 0-10, "caramel-toffee-notes": 0-10 },
  "frontMouth": { "sweetness": 0-10, "sourness-tartness": 0-10, "saltiness": 0-10, "first-bite-texture": 0-10, "spicy-heat": 0-10 },
  "midRearMouth": { "bitterness-development": 0-10, "umami-savoury-depth": 0-10, "richness-fullness": 0-10, "overall-mid-palate-intensity": 0-10 },
  "texture": { "creaminess": 0-10, "astringency": 0-10, "smoothness": 0-10 },
  "aftertaste": { "finish-length": 0-10, "finish-quality": 0-10, "finish-cleanness": 0-10 },
  "overallAssessment": { "overall-quality": 0-10, "satisfaction-overall": 0-10 },
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
        const dangerous = ['__proto__', 'constructor', 'prototype'];
        if (parts.some(part => dangerous.includes(part))) return;
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
            midRearMouth: ['midRearMouth', 'mid_rear_mouth', 'midmouth', 'mid_mouth'],
            texture: ['texture', 'mouthfeel', 'body'],
            aftertaste: ['aftertaste', 'after_taste', 'finish', 'ending'],
            overallAssessment: ['overallAssessment', 'overall', 'overall_assessment']
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
                if (merged.stages[stage][attr] === undefined || merged.stages[stage][attr] === 0) {
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
