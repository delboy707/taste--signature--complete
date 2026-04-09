// ===== EMOTION INFERENCE ENGINE =====
// Auto-infers emotional profiles from sensory data using Taste Signature methodology
// Part of the automatic data processing pipeline

/**
 * Stage-specific emotion definitions
 * Based on the 5-stage consumption journey from Taste Signature Revealed
 * Includes new emotions: surprise, intrigue, disappointment, sophistication, craving
 */
const STAGE_EMOTIONS = {
    appearance: ['anticipation', 'curiosity', 'desire', 'excitement', 'happiness', 'interest', 'pleased', 'surprise', 'disappointed', 'disgusted'],
    aroma: ['pleasure', 'comfort', 'nostalgia', 'happiness', 'energized', 'relaxed', 'intrigued', 'refreshed', 'desire', 'warm', 'soothed', 'surprised', 'interested', 'disappointed'],
    frontMouth: ['excitement', 'surprise', 'happiness', 'pleasure', 'interest', 'satisfaction', 'energized', 'delighted', 'disappointed', 'disgusted'],
    midRearMouth: ['satisfaction', 'pleasure', 'indulgence', 'comfort', 'calm', 'warmth', 'joy', 'adventurous', 'energized', 'nostalgic', 'disappointed', 'dissatisfied'],
    texture: ['satisfied', 'pleased', 'comforted', 'indulged', 'excited', 'energized', 'delighted', 'refreshed', 'interested', 'playful', 'disappointed', 'frustrated'],
    aftertaste: ['satisfaction', 'completeness', 'happiness', 'craving-want-more', 'calm', 'comforted', 'pleased', 'refreshed', 'nostalgic', 'disappointed', 'dissatisfied'],
    overallAssessment: ['satisfaction', 'happiness', 'pleasure', 'enjoyment', 'comfort', 'calm', 'warmth', 'joy', 'nostalgia', 'energized', 'adventurous', 'indulgent', 'interested', 'desire', 'disappointed', 'dissatisfied']
};

/**
 * Sensory attribute to emotion mapping rules
 * Maps specific sensory attributes to emotions with weights
 * Includes new attributes: carbonation, persistence, acidity, spiciness, astringency, mouthfeel
 * Includes new emotions: surprise, intrigue, disappointment, sophistication, craving
 */
const SENSORY_EMOTION_RULES = {
    // Appearance stage rules
    appearance: {
        'visual-appeal': {
            anticipation: 0.9,
            desire: 0.85,
            excitement: 0.7,
            happiness: 0.6,
            pleased: 0.7,
            curiosity: 0.5,
            surprise: 0.3,
            disappointed: -0.4
        },
        'color-richness': {
            anticipation: 0.7,
            excitement: 0.8,
            curiosity: 0.6,
            desire: 0.5,
            happiness: 0.4,
            surprise: 0.5
        },
        'bubble-activity': {
            excitement: 0.8,
            anticipation: 0.7,
            surprise: 0.6,
            curiosity: 0.5,
            happiness: 0.4
        },
        'visual-complexity': {
            curiosity: 0.8,
            interest: 0.8,
            surprise: 0.5,
            excitement: 0.4,
            pleased: 0.3
        }
    },
    // Aroma stage rules
    aroma: {
        'smell-strength': {
            pleasure: 0.8,
            energized: 0.6,
            happiness: 0.5,
            relaxed: 0.3,
            comfort: 0.4,
            nostalgia: 0.3,
            intrigued: 0.5
        },
        'caramel-toffee-notes': {
            pleasure: 0.9,
            comfort: 0.8,
            happiness: 0.7,
            nostalgia: 0.6,
            relaxed: 0.5,
            warm: 0.6,
            soothed: 0.4
        },
        'fruity-notes': {
            pleasure: 0.85,
            energized: 0.7,
            happiness: 0.7,
            refreshed: 0.6,
            desire: 0.5,
            intrigued: 0.4
        },
        'flower-like-notes': {
            pleasure: 0.8,
            happiness: 0.7,
            soothed: 0.6,
            relaxed: 0.6,
            intrigued: 0.5,
            desire: 0.4
        },
        'toasted-roasted-notes': {
            comfort: 0.8,
            nostalgia: 0.7,
            warm: 0.8,
            soothed: 0.5,
            pleasure: 0.6
        },
        'smell-complexity': {
            intrigued: 0.9,
            interested: 0.8,
            pleasure: 0.7,
            nostalgia: 0.5,
            energized: 0.4,
            happiness: 0.5,
            comfort: 0.3
        },
        'smell-duration': {
            pleasure: 0.7,
            intrigued: 0.8,
            nostalgia: 0.6,
            comfort: 0.5,
            happiness: 0.4,
            relaxed: 0.4
        }
    },
    // Front mouth stage rules
    frontMouth: {
        sweetness: {
            happiness: 0.9,
            pleasure: 0.85,
            satisfaction: 0.7,
            excitement: 0.5,
            delighted: 0.6,
            disappointed: -0.3
        },
        'sourness-tartness': {
            excitement: 0.8,
            energized: 0.7,
            satisfaction: 0.5,
            pleasure: 0.4,
            happiness: 0.3,
            surprised: 0.5,
            disappointed: 0.2
        },
        saltiness: {
            satisfaction: 0.7,
            pleasure: 0.6,
            happiness: 0.4,
            excitement: 0.3,
            disappointed: 0.1
        },
        'first-bite-texture': {
            satisfaction: 0.8,
            pleasure: 0.7,
            excitement: 0.6,
            happiness: 0.5,
            delighted: 0.5,
            disappointed: -0.4
        },
        'spicy-heat': {
            excitement: 0.9,
            energized: 0.7,
            satisfaction: 0.5,
            pleasure: 0.4,
            happiness: 0.3,
            surprised: 0.6,
            disappointed: 0.4
        },
        'carbonation-bite': {
            excitement: 0.8,
            energized: 0.7,
            surprised: 0.5,
            happiness: 0.4,
            pleasure: 0.4
        },
        'overall-initial-impact': {
            excitement: 0.85,
            pleasure: 0.7,
            delighted: 0.6,
            happiness: 0.6,
            satisfaction: 0.5
        }
    },
    // Mid/rear mouth stage rules
    midRearMouth: {
        'bitterness-development': {
            indulgence: 0.8,
            satisfaction: 0.6,
            pleasure: 0.5,
            comfort: 0.4,
            adventurous: 0.6
        },
        'umami-savoury-depth': {
            satisfaction: 0.9,
            indulgence: 0.8,
            comfort: 0.7,
            pleasure: 0.6,
            warmth: 0.5
        },
        'richness-fullness': {
            indulgence: 0.95,
            satisfaction: 0.85,
            comfort: 0.8,
            pleasure: 0.7,
            warmth: 0.6,
            joy: 0.5
        },
        'flavour-complexity': {
            indulgence: 0.7,
            satisfaction: 0.8,
            adventurous: 0.7,
            pleasure: 0.75,
            energized: 0.4
        },
        'flavour-harmony': {
            satisfaction: 0.9,
            comfort: 0.8,
            pleasure: 0.85,
            calm: 0.6,
            warmth: 0.5,
            joy: 0.6
        },
        'flavour-depth': {
            indulgence: 0.85,
            satisfaction: 0.75,
            pleasure: 0.7,
            nostalgic: 0.5,
            adventurous: 0.6
        },
        'overall-mid-palate-intensity': {
            satisfaction: 0.8,
            indulgence: 0.7,
            comfort: 0.75,
            pleasure: 0.65,
            energized: 0.4
        },
        'taste-balance': {
            satisfaction: 0.85,
            pleasure: 0.7,
            comfort: 0.65,
            calm: 0.5,
            joy: 0.4
        }
    },
    // Texture stage rules
    texture: {
        smoothness: {
            satisfied: 0.8,
            pleased: 0.75,
            comforted: 0.7,
            indulged: 0.6
        },
        creaminess: {
            comforted: 0.9,
            indulged: 0.9,
            pleased: 0.8,
            satisfied: 0.7,
            excited: 0.3
        },
        crunchiness: {
            excited: 0.85,
            delighted: 0.7,
            satisfied: 0.7,
            energized: 0.65,
            playful: 0.6,
            interested: 0.5
        },
        'melt-rate': {
            indulged: 0.85,
            comforted: 0.8,
            pleased: 0.75,
            satisfied: 0.6
        },
        softness: {
            comforted: 0.85,
            pleased: 0.7,
            satisfied: 0.65,
            indulged: 0.5
        },
        'overall-textural-complexity': {
            interested: 0.8,
            excited: 0.65,
            delighted: 0.6,
            playful: 0.55,
            satisfied: 0.5
        },
        astringency: {
            disappointed: 0.4,
            frustrated: 0.3,
            interested: 0.3
        },
        'mouth-coating': {
            indulged: 0.8,
            comforted: 0.75,
            satisfied: 0.65,
            pleased: 0.6
        }
    },
    // Aftertaste stage rules
    aftertaste: {
        'finish-length': {
            satisfaction: 0.8,
            completeness: 0.7,
            happiness: 0.5,
            'craving-want-more': 0.7
        },
        'finish-quality': {
            satisfaction: 0.95,
            happiness: 0.9,
            completeness: 0.8,
            'craving-want-more': 0.85,
            pleased: 0.8,
            comforted: 0.6
        },
        'finish-cleanness': {
            completeness: 0.9,
            satisfaction: 0.7,
            happiness: 0.6,
            refreshed: 0.7,
            'craving-want-more': 0.5
        },
        'flavour-linger': {
            satisfaction: 0.75,
            completeness: 0.65,
            nostalgic: 0.55,
            'craving-want-more': 0.75,
            pleased: 0.6
        }
    },
    // Overall Assessment stage rules
    overallAssessment: {
        'overall-quality': {
            satisfaction: 0.95,
            happiness: 0.9,
            pleasure: 0.85,
            enjoyment: 0.9,
            comfort: 0.6,
            disappointed: -0.5
        },
        balance: {
            satisfaction: 0.85,
            comfort: 0.8,
            calm: 0.7,
            pleasure: 0.75,
            joy: 0.5
        },
        harmony: {
            joy: 0.85,
            warmth: 0.8,
            pleasure: 0.8,
            satisfaction: 0.75,
            calm: 0.65
        },
        craveability: {
            desire: 0.9,
            adventurous: 0.7,
            indulgent: 0.75,
            happiness: 0.6,
            satisfaction: 0.5
        },
        'satisfaction-overall': {
            satisfaction: 0.95,
            happiness: 0.9,
            enjoyment: 0.85,
            comfort: 0.65,
            pleasure: 0.7
        },
        'want-more-quality': {
            desire: 0.9,
            adventurous: 0.65,
            indulgent: 0.7,
            satisfaction: 0.55
        },
        memorability: {
            nostalgia: 0.7,
            adventurous: 0.65,
            interested: 0.6,
            joy: 0.5
        },
        'flavour-richness': {
            indulgent: 0.85,
            warmth: 0.7,
            comfort: 0.65,
            pleasure: 0.75,
            satisfaction: 0.7
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
 * Updated formulas using new sensory attributes
 */
const TRIGGER_RULES = {
    moreishness: {
        // High moreishness from: sweetness, richness-fullness, umami-savoury-depth, saltiness, finish-quality
        attributes: ['sweetness', 'richness-fullness', 'umami-savoury-depth', 'saltiness', 'finish-quality'],
        weights: [0.25, 0.25, 0.2, 0.15, 0.15]
    },
    refreshment: {
        // High refreshment from: sourness-tartness, finish-cleanness, bubble-activity
        // Low refreshment from: richness-fullness, creaminess
        attributes: ['sourness-tartness', 'finish-cleanness', 'bubble-activity'],
        weights: [0.3, 0.35, 0.2],
        inverseAttributes: ['richness-fullness', 'creaminess'],
        inverseWeights: [0.15, 0.1]
    },
    melt: {
        // High melt from: creaminess, richness-fullness, overall-mid-palate-intensity
        // Low melt from: astringency
        attributes: ['creaminess', 'richness-fullness', 'overall-mid-palate-intensity'],
        weights: [0.35, 0.3, 0.2],
        inverseAttributes: ['astringency'],
        inverseWeights: [0.15]
    },
    crunch: {
        // High crunch from: first-bite-texture, crunchiness; low crunch from: creaminess
        attributes: ['first-bite-texture', 'crunchiness'],
        weights: [0.4, 0.5],
        inverseAttributes: ['creaminess', 'overall-mid-palate-intensity'],
        inverseWeights: [0.25, 0.15]
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
     * Includes new attributes: carbonation, persistence, acidity, spiciness, astringency, mouthfeel
     */
    static normalizeSensoryData(data) {
        const normalized = {
            appearance: {},
            aroma: {},
            frontMouth: {},
            midRearMouth: {},
            texture: {},
            aftertaste: {},
            overallAssessment: {}
        };

        // Handle flat structure (e.g., from CSV import)
        if (data['visual-appeal'] !== undefined || data.visualAppeal !== undefined || data.sweetness !== undefined) {
            // Flat structure - map to nested using new kebab-case IDs
            normalized.appearance = {
                'visual-appeal': this.getNumericValue(data['visual-appeal'] || data.visualAppeal || data.visual_appeal),
                'color-richness': this.getNumericValue(data['color-richness'] || data.colorIntensity || data.color_intensity),
                'bubble-activity': this.getNumericValue(data['bubble-activity'] || data.carbonation || data.fizz)
            };
            normalized.aroma = {
                'smell-strength': this.getNumericValue(data['smell-strength'] || data.aromaIntensity || data.aroma_intensity),
                'caramel-toffee-notes': this.getNumericValue(data['caramel-toffee-notes'] || data.aromaSweetness || data.aroma_sweetness),
                'smell-complexity': this.getNumericValue(data['smell-complexity'] || data.aromaComplexity || data.aroma_complexity),
                'smell-duration': this.getNumericValue(data['smell-duration'] || data.persistence || data.aroma_persistence || data.linger)
            };
            normalized.frontMouth = {
                sweetness: this.getNumericValue(data.sweetness || data.taste_sweetness || data.front_sweetness),
                'sourness-tartness': this.getNumericValue(data['sourness-tartness'] || data.sourness || data.acidity || data.taste_sourness),
                saltiness: this.getNumericValue(data.saltiness || data.taste_saltiness || data.front_saltiness),
                'first-bite-texture': this.getNumericValue(data['first-bite-texture'] || data.texture || data.front_texture),
                'spicy-heat': this.getNumericValue(data['spicy-heat'] || data.spiciness || data.heat || data.pungency),
                'carbonation-bite': this.getNumericValue(data['carbonation-bite'] || data.carbonation_bite)
            };
            normalized.midRearMouth = {
                'bitterness-development': this.getNumericValue(data['bitterness-development'] || data.bitterness || data.mid_bitterness),
                'umami-savoury-depth': this.getNumericValue(data['umami-savoury-depth'] || data.umami || data.mid_umami),
                'richness-fullness': this.getNumericValue(data['richness-fullness'] || data.richness || data.mid_richness),
                'overall-mid-palate-intensity': this.getNumericValue(data['overall-mid-palate-intensity'] || data.mouthfeel || data.body),
                'flavour-harmony': this.getNumericValue(data['flavour-harmony'] || data.flavourHarmony),
                'taste-balance': this.getNumericValue(data['taste-balance'] || data.tasteBalance)
            };
            normalized.texture = {
                creaminess: this.getNumericValue(data.creaminess || data.mid_creaminess),
                smoothness: this.getNumericValue(data.smoothness),
                crunchiness: this.getNumericValue(data.crunchiness || data.crunch),
                astringency: this.getNumericValue(data.astringency || data.dryness || data.tannin),
                'melt-rate': this.getNumericValue(data['melt-rate'] || data.melt)
            };
            normalized.aftertaste = {
                'finish-length': this.getNumericValue(data['finish-length'] || data.aftertasteDuration || data.duration),
                'finish-quality': this.getNumericValue(data['finish-quality'] || data.aftertastePleasantness || data.pleasantness),
                'finish-cleanness': this.getNumericValue(data['finish-cleanness'] || data.aftertasteCleanness || data.cleanness),
                'flavour-linger': this.getNumericValue(data['flavour-linger'] || data.linger)
            };
            normalized.overallAssessment = {
                'overall-quality': this.getNumericValue(data['overall-quality'] || data.overallQuality || data.quality),
                'satisfaction-overall': this.getNumericValue(data['satisfaction-overall'] || data.satisfaction),
                craveability: this.getNumericValue(data.craveability || data.moreishness),
                balance: this.getNumericValue(data.balance)
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
     * Get numeric value, defaulting to 0 if missing
     */
    static getNumericValue(value, defaultValue = 0) {
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

        // Initialize all stage emotions to 0
        for (const emotion of stageEmotionList) {
            emotions[emotion] = 0;
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
                if (value !== 0) { // 0 is our default, so non-0 values were likely provided
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
            texture: 'Texture',
            aftertaste: 'Aftertaste',
            overallAssessment: 'Overall Assessment'
        };

        for (const [stage, name] of Object.entries(stageNames)) {
            const stageData = normalizedData[stage] || {};
            const values = Object.values(stageData);
            const nonDefaultValues = values.filter(v => v !== 0);

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

/**
 * Calculate emotional triggers from an experience object
 * This function can be called independently to auto-calculate triggers
 * @param {Object} experience - Experience object with stages data
 * @returns {Object} - Calculated emotional triggers
 */
function calculateEmotionalTriggers(experience) {
    if (!experience || !experience.stages) {
        return { moreishness: 5, refreshment: 5, melt: 5, crunch: 5 };
    }

    const stages = experience.stages;

    // Extract sensory values from stages
    const getSensoryValue = (stage, attr, defaultVal = 0) => {
        return stages[stage]?.[attr] ?? defaultVal;
    };

    // Moreishness = f(sweetness, richness-fullness, umami-savoury-depth, saltiness, finish-quality)
    const moreishness = (
        getSensoryValue('frontMouth', 'sweetness') * 0.25 +
        getSensoryValue('midRearMouth', 'richness-fullness') * 0.25 +
        getSensoryValue('midRearMouth', 'umami-savoury-depth') * 0.2 +
        getSensoryValue('frontMouth', 'saltiness') * 0.15 +
        getSensoryValue('aftertaste', 'finish-quality') * 0.15
    );

    // Refreshment = f(sourness-tartness, finish-cleanness, bubble-activity) - f(richness-fullness, creaminess)
    const refreshmentPositive = (
        getSensoryValue('frontMouth', 'sourness-tartness') * 0.3 +
        getSensoryValue('aftertaste', 'finish-cleanness') * 0.35 +
        getSensoryValue('appearance', 'bubble-activity') * 0.2
    );
    const refreshmentNegative = (
        (10 - getSensoryValue('midRearMouth', 'richness-fullness')) * 0.15 +
        (10 - getSensoryValue('texture', 'creaminess')) * 0.1
    );
    const refreshment = Math.min(10, refreshmentPositive + refreshmentNegative * 0.5);

    // Melt = f(creaminess, richness-fullness, overall-mid-palate-intensity) - f(astringency)
    const meltPositive = (
        getSensoryValue('texture', 'creaminess') * 0.35 +
        getSensoryValue('midRearMouth', 'richness-fullness') * 0.3 +
        getSensoryValue('midRearMouth', 'overall-mid-palate-intensity') * 0.2
    );
    const meltNegative = (10 - getSensoryValue('texture', 'astringency')) * 0.15;
    const melt = Math.min(10, meltPositive + meltNegative);

    // Crunch = f(first-bite-texture, crunchiness) - f(creaminess, overall-mid-palate-intensity)
    const crunchPositive = (
        getSensoryValue('frontMouth', 'first-bite-texture') * 0.4 +
        getSensoryValue('texture', 'crunchiness') * 0.5
    );
    const crunchNegative = (
        (10 - getSensoryValue('texture', 'creaminess')) * 0.25 +
        (10 - getSensoryValue('midRearMouth', 'overall-mid-palate-intensity')) * 0.15
    );
    const crunch = Math.min(10, crunchPositive + crunchNegative);

    return {
        moreishness: Math.round(Math.max(0, Math.min(10, moreishness)) * 10) / 10,
        refreshment: Math.round(Math.max(0, Math.min(10, refreshment)) * 10) / 10,
        melt: Math.round(Math.max(0, Math.min(10, melt)) * 10) / 10,
        crunch: Math.round(Math.max(0, Math.min(10, crunch)) * 10) / 10
    };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EmotionInference, STAGE_EMOTIONS, SENSORY_EMOTION_RULES, calculateEmotionalTriggers };
}

// Make available globally in browser
if (typeof window !== 'undefined') {
    window.EmotionInference = EmotionInference;
    window.calculateEmotionalTriggers = calculateEmotionalTriggers;
}
