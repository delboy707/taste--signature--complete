// ===== EMOTION INFERENCE ENGINE =====
// Auto-infers emotional profiles from sensory data using Taste Signature methodology
// Part of the automatic data processing pipeline

/**
 * Stage-specific emotion definitions
 * Based on the 5-stage consumption journey from Taste Signature Revealed
 */
const STAGE_EMOTIONS = {
    appearance: ['anticipation', 'desire', 'excitement', 'happiness', 'curiosity'],
    aroma: ['pleasure', 'comfort', 'nostalgia', 'happiness', 'energy', 'relaxation'],
    frontMouth: ['excitement', 'satisfaction', 'happiness', 'pleasure'],
    midRearMouth: ['indulgence', 'comfort', 'satisfaction', 'pleasure'],
    aftertaste: ['satisfaction', 'completeness', 'happiness']
};

/**
 * Sensory attribute to emotion mapping rules
 * Maps specific sensory attributes to emotions with weights
 */
const SENSORY_EMOTION_RULES = {
    // Appearance stage rules
    appearance: {
        visualAppeal: {
            anticipation: 0.9,
            desire: 0.85,
            excitement: 0.7,
            happiness: 0.6,
            curiosity: 0.5
        },
        colorIntensity: {
            anticipation: 0.7,
            excitement: 0.8,
            curiosity: 0.6,
            desire: 0.5,
            happiness: 0.4
        }
    },
    // Aroma stage rules
    aroma: {
        intensity: {
            pleasure: 0.8,
            energy: 0.6,
            happiness: 0.5,
            relaxation: 0.3,
            comfort: 0.4,
            nostalgia: 0.3
        },
        sweetness: {
            pleasure: 0.9,
            comfort: 0.8,
            happiness: 0.7,
            nostalgia: 0.6,
            relaxation: 0.5,
            energy: 0.3
        },
        complexity: {
            curiosity: 0.8,
            pleasure: 0.7,
            nostalgia: 0.5,
            energy: 0.4,
            happiness: 0.5,
            comfort: 0.3
        }
    },
    // Front mouth stage rules
    frontMouth: {
        sweetness: {
            happiness: 0.9,
            pleasure: 0.85,
            satisfaction: 0.7,
            excitement: 0.5
        },
        sourness: {
            excitement: 0.8,
            satisfaction: 0.5,
            pleasure: 0.4,
            happiness: 0.3
        },
        saltiness: {
            satisfaction: 0.7,
            pleasure: 0.6,
            happiness: 0.4,
            excitement: 0.3
        },
        texture: {
            satisfaction: 0.8,
            pleasure: 0.7,
            excitement: 0.6,
            happiness: 0.5
        }
    },
    // Mid/rear mouth stage rules
    midRearMouth: {
        bitterness: {
            indulgence: 0.8,
            satisfaction: 0.6,
            pleasure: 0.5,
            comfort: 0.4
        },
        umami: {
            satisfaction: 0.9,
            indulgence: 0.8,
            comfort: 0.7,
            pleasure: 0.6
        },
        richness: {
            indulgence: 0.95,
            satisfaction: 0.85,
            comfort: 0.8,
            pleasure: 0.7
        },
        creaminess: {
            comfort: 0.95,
            indulgence: 0.9,
            pleasure: 0.8,
            satisfaction: 0.7
        }
    },
    // Aftertaste stage rules
    aftertaste: {
        duration: {
            satisfaction: 0.8,
            completeness: 0.7,
            happiness: 0.5
        },
        pleasantness: {
            satisfaction: 0.95,
            happiness: 0.9,
            completeness: 0.8
        },
        cleanness: {
            completeness: 0.9,
            satisfaction: 0.7,
            happiness: 0.6
        }
    }
};

/**
 * Need state classification based on emotional profile
 */
const NEED_STATE_EMOTION_WEIGHTS = {
    reward: {
        indulgence: 0.9,
        excitement: 0.8,
        pleasure: 0.7,
        satisfaction: 0.6,
        desire: 0.7,
        anticipation: 0.5
    },
    escape: {
        comfort: 0.95,
        relaxation: 0.9,
        nostalgia: 0.8,
        happiness: 0.5,
        completeness: 0.4
    },
    rejuvenation: {
        energy: 0.95,
        excitement: 0.7,
        happiness: 0.6,
        pleasure: 0.5
    },
    sociability: {
        happiness: 0.9,
        excitement: 0.7,
        pleasure: 0.6,
        satisfaction: 0.5
    }
};

/**
 * Emotional trigger inference rules
 */
const TRIGGER_RULES = {
    moreishness: {
        // High moreishness from: sweetness, richness, umami, pleasant aftertaste
        attributes: ['sweetness', 'richness', 'umami', 'pleasantness'],
        weights: [0.3, 0.3, 0.2, 0.2]
    },
    refreshment: {
        // High refreshment from: sourness, cleanness, low richness
        attributes: ['sourness', 'cleanness', 'colorIntensity'],
        weights: [0.4, 0.4, 0.2],
        inverseAttributes: ['richness', 'creaminess'],
        inverseWeights: [0.3, 0.2]
    },
    melt: {
        // High melt from: creaminess, richness, texture
        attributes: ['creaminess', 'richness', 'texture'],
        weights: [0.5, 0.3, 0.2]
    },
    crunch: {
        // High crunch from: texture (inversely proportional to creaminess/melt)
        attributes: ['texture'],
        weights: [0.7],
        inverseAttributes: ['creaminess'],
        inverseWeights: [0.3]
    }
};

/**
 * Main emotion inference class
 */
class EmotionInference {

    /**
     * Infer complete emotional profile from sensory data
     * @param {Object} sensoryData - Object containing sensory scores by stage
     * @returns {Object} - Complete emotional profile with confidence scores
     */
    static inferFromSensory(sensoryData) {
        const result = {
            stages: {},
            needState: null,
            emotionalTriggers: {},
            confidence: 0,
            warnings: []
        };

        // Normalize input - handle different data formats
        const normalizedData = this.normalizeSensoryData(sensoryData);

        // Infer emotions for each stage
        for (const stage of Object.keys(STAGE_EMOTIONS)) {
            const stageData = normalizedData[stage] || {};
            result.stages[stage] = this.inferStageEmotions(stage, stageData);
        }

        // Infer need state from overall emotional profile
        result.needState = this.inferNeedState(result.stages);

        // Infer emotional triggers
        result.emotionalTriggers = this.inferEmotionalTriggers(normalizedData);

        // Calculate overall confidence
        result.confidence = this.calculateConfidence(result, normalizedData);

        // Add warnings for low confidence areas
        result.warnings = this.generateWarnings(result, normalizedData);

        return result;
    }

    /**
     * Normalize sensory data to expected format
     */
    static normalizeSensoryData(data) {
        const normalized = {
            appearance: {},
            aroma: {},
            frontMouth: {},
            midRearMouth: {},
            aftertaste: {}
        };

        // Handle flat structure (e.g., from CSV import)
        if (data.visualAppeal !== undefined || data.appearance_visualAppeal !== undefined) {
            // Flat structure - map to nested
            normalized.appearance = {
                visualAppeal: this.getNumericValue(data.visualAppeal || data.appearance_visualAppeal || data.visual_appeal),
                colorIntensity: this.getNumericValue(data.colorIntensity || data.appearance_colorIntensity || data.color_intensity)
            };
            normalized.aroma = {
                intensity: this.getNumericValue(data.aromaIntensity || data.aroma_intensity),
                sweetness: this.getNumericValue(data.aromaSweetness || data.aroma_sweetness),
                complexity: this.getNumericValue(data.aromaComplexity || data.aroma_complexity)
            };
            normalized.frontMouth = {
                sweetness: this.getNumericValue(data.sweetness || data.taste_sweetness || data.front_sweetness),
                sourness: this.getNumericValue(data.sourness || data.taste_sourness || data.front_sourness),
                saltiness: this.getNumericValue(data.saltiness || data.taste_saltiness || data.front_saltiness),
                texture: this.getNumericValue(data.texture || data.front_texture)
            };
            normalized.midRearMouth = {
                bitterness: this.getNumericValue(data.bitterness || data.mid_bitterness),
                umami: this.getNumericValue(data.umami || data.mid_umami),
                richness: this.getNumericValue(data.richness || data.mid_richness),
                creaminess: this.getNumericValue(data.creaminess || data.mid_creaminess)
            };
            normalized.aftertaste = {
                duration: this.getNumericValue(data.aftertasteDuration || data.aftertaste_duration || data.duration),
                pleasantness: this.getNumericValue(data.aftertastePleasantness || data.aftertaste_pleasantness || data.pleasantness),
                cleanness: this.getNumericValue(data.aftertasteCleanness || data.aftertaste_cleanness || data.cleanness)
            };
        } else if (data.stages) {
            // Already nested in stages
            Object.assign(normalized, data.stages);
        } else if (data.appearance || data.aroma) {
            // Nested but not under stages
            Object.assign(normalized, data);
        }

        return normalized;
    }

    /**
     * Get numeric value, defaulting to 5 (neutral) if missing
     */
    static getNumericValue(value, defaultValue = 5) {
        if (value === undefined || value === null || value === '') {
            return defaultValue;
        }
        const num = parseFloat(value);
        if (isNaN(num)) {
            return defaultValue;
        }
        // Clamp to 0-10 range
        return Math.max(0, Math.min(10, num));
    }

    /**
     * Infer emotions for a specific stage
     */
    static inferStageEmotions(stage, stageData) {
        const emotions = {};
        const stageEmotionList = STAGE_EMOTIONS[stage] || [];
        const rules = SENSORY_EMOTION_RULES[stage] || {};

        // Initialize all stage emotions to neutral
        for (const emotion of stageEmotionList) {
            emotions[emotion] = 5;
        }

        // Apply rules based on sensory attributes
        for (const [attribute, emotionWeights] of Object.entries(rules)) {
            const attributeValue = stageData[attribute];
            if (attributeValue !== undefined && attributeValue !== null) {
                for (const [emotion, weight] of Object.entries(emotionWeights)) {
                    if (emotions[emotion] !== undefined) {
                        // Weighted average: blend current value with inferred value
                        const inferredValue = attributeValue * weight;
                        emotions[emotion] = Math.min(10, Math.max(0,
                            emotions[emotion] * 0.3 + inferredValue * 0.7
                        ));
                    }
                }
            }
        }

        // Round all values
        for (const emotion of Object.keys(emotions)) {
            emotions[emotion] = Math.round(emotions[emotion] * 10) / 10;
        }

        return { emotions };
    }

    /**
     * Infer need state from emotional profile
     */
    static inferNeedState(stages) {
        const needStateScores = {
            reward: 0,
            escape: 0,
            rejuvenation: 0,
            sociability: 0
        };

        // Collect all emotions across stages
        const allEmotions = {};
        for (const stage of Object.values(stages)) {
            if (stage.emotions) {
                for (const [emotion, value] of Object.entries(stage.emotions)) {
                    if (!allEmotions[emotion]) {
                        allEmotions[emotion] = [];
                    }
                    allEmotions[emotion].push(value);
                }
            }
        }

        // Calculate average for each emotion
        const avgEmotions = {};
        for (const [emotion, values] of Object.entries(allEmotions)) {
            avgEmotions[emotion] = values.reduce((a, b) => a + b, 0) / values.length;
        }

        // Score each need state
        for (const [needState, emotionWeights] of Object.entries(NEED_STATE_EMOTION_WEIGHTS)) {
            let score = 0;
            let totalWeight = 0;
            for (const [emotion, weight] of Object.entries(emotionWeights)) {
                if (avgEmotions[emotion] !== undefined) {
                    score += avgEmotions[emotion] * weight;
                    totalWeight += weight;
                }
            }
            if (totalWeight > 0) {
                needStateScores[needState] = score / totalWeight;
            }
        }

        // Return the highest scoring need state
        let maxScore = 0;
        let maxNeedState = 'reward';
        for (const [needState, score] of Object.entries(needStateScores)) {
            if (score > maxScore) {
                maxScore = score;
                maxNeedState = needState;
            }
        }

        return maxNeedState;
    }

    /**
     * Infer emotional triggers from sensory data
     */
    static inferEmotionalTriggers(normalizedData) {
        const triggers = {
            moreishness: 5,
            refreshment: 5,
            melt: 5,
            crunch: 5
        };

        // Flatten all sensory values for easy access
        const flatData = {};
        for (const [stage, attributes] of Object.entries(normalizedData)) {
            for (const [attr, value] of Object.entries(attributes || {})) {
                flatData[attr] = value;
            }
        }

        // Calculate each trigger
        for (const [trigger, rule] of Object.entries(TRIGGER_RULES)) {
            let score = 0;
            let totalWeight = 0;

            // Positive contributions
            for (let i = 0; i < rule.attributes.length; i++) {
                const attr = rule.attributes[i];
                const weight = rule.weights[i];
                if (flatData[attr] !== undefined) {
                    score += flatData[attr] * weight;
                    totalWeight += weight;
                }
            }

            // Inverse contributions (subtract)
            if (rule.inverseAttributes) {
                for (let i = 0; i < rule.inverseAttributes.length; i++) {
                    const attr = rule.inverseAttributes[i];
                    const weight = rule.inverseWeights[i];
                    if (flatData[attr] !== undefined) {
                        // Inverse: high value = lower score
                        score += (10 - flatData[attr]) * weight;
                        totalWeight += weight;
                    }
                }
            }

            if (totalWeight > 0) {
                triggers[trigger] = Math.round((score / totalWeight) * 10) / 10;
            }
        }

        // Clamp all values to 0-10
        for (const key of Object.keys(triggers)) {
            triggers[key] = Math.max(0, Math.min(10, triggers[key]));
        }

        return triggers;
    }

    /**
     * Calculate overall confidence score
     */
    static calculateConfidence(result, normalizedData) {
        let dataPoints = 0;
        let providedPoints = 0;

        // Count how many sensory data points were actually provided vs defaulted
        for (const stage of Object.values(normalizedData)) {
            for (const value of Object.values(stage || {})) {
                dataPoints++;
                if (value !== 5) { // 5 is our default, so non-5 values were likely provided
                    providedPoints++;
                }
            }
        }

        if (dataPoints === 0) {
            return 0.1; // Very low confidence if no data
        }

        // Base confidence on data completeness
        const dataCompleteness = providedPoints / dataPoints;

        // Confidence is higher with more data points
        return Math.round(Math.min(0.95, dataCompleteness * 0.8 + 0.2) * 100) / 100;
    }

    /**
     * Generate warnings for low confidence areas
     */
    static generateWarnings(result, normalizedData) {
        const warnings = [];

        // Check for missing stages
        const stageNames = {
            appearance: 'Appearance',
            aroma: 'Aroma',
            frontMouth: 'Front Mouth',
            midRearMouth: 'Mid/Rear Mouth',
            aftertaste: 'Aftertaste'
        };

        for (const [stage, name] of Object.entries(stageNames)) {
            const stageData = normalizedData[stage] || {};
            const values = Object.values(stageData);
            const nonDefaultValues = values.filter(v => v !== 5);

            if (values.length === 0 || nonDefaultValues.length === 0) {
                warnings.push({
                    type: 'missing_data',
                    stage: stage,
                    message: `${name} stage has no sensory data - emotions inferred from defaults`
                });
            }
        }

        // Low overall confidence warning
        if (result.confidence < 0.5) {
            warnings.push({
                type: 'low_confidence',
                message: 'Low confidence inference - consider reviewing manually'
            });
        }

        return warnings;
    }

    /**
     * Merge inferred emotions into an existing experience object
     */
    static mergeIntoExperience(experience, inferredEmotions) {
        // Create a copy to avoid mutation
        const merged = JSON.parse(JSON.stringify(experience));

        // Merge stage emotions
        for (const [stage, data] of Object.entries(inferredEmotions.stages)) {
            if (!merged.stages) merged.stages = {};
            if (!merged.stages[stage]) merged.stages[stage] = {};

            // Only merge emotions, keep existing sensory data
            merged.stages[stage].emotions = data.emotions;
        }

        // Set need state if not already set
        if (!merged.needState || merged.needState === '') {
            merged.needState = inferredEmotions.needState;
        }

        // Set emotional triggers if not already set
        if (!merged.emotionalTriggers || Object.keys(merged.emotionalTriggers).length === 0) {
            merged.emotionalTriggers = inferredEmotions.emotionalTriggers;
        }

        // Add inference metadata
        merged._inferenceMetadata = {
            inferred: true,
            confidence: inferredEmotions.confidence,
            warnings: inferredEmotions.warnings,
            inferredAt: new Date().toISOString()
        };

        return merged;
    }

    /**
     * Batch process multiple rows of sensory data
     */
    static batchInfer(rows) {
        return rows.map((row, index) => {
            try {
                const inferred = this.inferFromSensory(row);
                return {
                    index,
                    success: true,
                    data: inferred,
                    confidence: inferred.confidence,
                    warnings: inferred.warnings
                };
            } catch (error) {
                return {
                    index,
                    success: false,
                    error: error.message,
                    confidence: 0,
                    warnings: [{ type: 'error', message: error.message }]
                };
            }
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EmotionInference, STAGE_EMOTIONS, SENSORY_EMOTION_RULES };
}

// Make available globally in browser
if (typeof window !== 'undefined') {
    window.EmotionInference = EmotionInference;
}
