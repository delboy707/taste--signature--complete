// ===== AUTO-PROCESSOR MODULE =====
// Orchestrates automatic sensory and emotional evaluation of uploaded data
// Connects data import → inference engines → storage

/**
 * Data type detection rules
 */
const DATA_TYPE_INDICATORS = {
    sensory_scores: [
        'sweetness', 'sourness', 'bitterness', 'saltiness', 'umami',
        'visualAppeal', 'visual_appeal', 'visual-appeal',
        'colorIntensity', 'color_intensity', 'color-richness',
        'aromaIntensity', 'aroma_intensity', 'smell-strength',
        'richness', 'richness-fullness', 'creaminess',
        'texture', 'first-bite-texture',
        'sourness-tartness', 'bitterness-development', 'umami-savoury-depth',
        'aftertaste', 'duration', 'finish-length', 'pleasantness', 'finish-quality'
    ],
    consumer_feedback: [
        'feedback', 'comments', 'review', 'rating', 'overall_rating',
        'consumer_feedback', 'consumer_comments', 'opinion', 'description'
    ],
    product_info: [
        'name', 'product_name', 'productName', 'brand', 'category',
        'ingredients', 'flavor', 'type'
    ]
};

/**
 * Main auto-processor class
 */
class AutoProcessor {

    /**
     * Process uploaded data through the inference pipeline
     * @param {Array} rows - Array of data rows from import
     * @param {Object} options - Processing options
     * @returns {Object} - Processed results with experiences and metadata
     */
    static async processUploadedData(rows, options = {}) {
        const startTime = Date.now();

        const result = {
            experiences: [],
            summary: {
                total: rows.length,
                successful: 0,
                warnings: 0,
                errors: 0
            },
            metadata: {
                dataType: null,
                processingTimeMs: 0,
                averageConfidence: 0
            },
            errors: [],
            warnings: []
        };

        if (!rows || rows.length === 0) {
            result.errors.push({ message: 'No data provided' });
            return result;
        }

        // Step 1: Detect data type
        result.metadata.dataType = this.detectDataType(rows[0], rows);
        console.log(`📊 Detected data type: ${result.metadata.dataType}`);

        // Step 2: Process each row
        const processedRows = [];
        let totalConfidence = 0;

        for (let i = 0; i < rows.length; i++) {
            try {
                const processed = await this.processRow(rows[i], result.metadata.dataType, options);
                processedRows.push(processed);

                if (processed.success) {
                    result.summary.successful++;
                    totalConfidence += processed.confidence;
                } else {
                    result.summary.errors++;
                    result.errors.push({
                        row: i + 1,
                        message: processed.error
                    });
                }

                if (processed.warnings && processed.warnings.length > 0) {
                    result.summary.warnings += processed.warnings.length;
                    processed.warnings.forEach(w => {
                        result.warnings.push({
                            row: i + 1,
                            ...w
                        });
                    });
                }

                // Progress callback
                if (options.onProgress) {
                    options.onProgress({
                        current: i + 1,
                        total: rows.length,
                        percent: Math.round(((i + 1) / rows.length) * 100),
                        stage: 'processing'
                    });
                }

            } catch (error) {
                result.summary.errors++;
                result.errors.push({
                    row: i + 1,
                    message: error.message
                });
                processedRows.push({
                    success: false,
                    error: error.message,
                    originalData: rows[i]
                });
            }
        }

        // Step 3: Convert to experience objects
        result.experiences = processedRows
            .filter(p => p.success)
            .map(p => p.experience);

        // Step 4: Calculate metadata
        result.metadata.processingTimeMs = Date.now() - startTime;
        result.metadata.averageConfidence = result.summary.successful > 0
            ? Math.round((totalConfidence / result.summary.successful) * 100) / 100
            : 0;

        return result;
    }

    /**
     * Detect the type of data in the uploaded file
     */
    static detectDataType(sampleRow, allRows = []) {
        if (!sampleRow) return 'unknown';

        const columns = Object.keys(sampleRow).map(k => k.toLowerCase());
        const scores = {
            sensory_scores: 0,
            consumer_feedback: 0,
            product_info: 0
        };

        // Check which indicators are present
        for (const col of columns) {
            for (const [type, indicators] of Object.entries(DATA_TYPE_INDICATORS)) {
                for (const indicator of indicators) {
                    if (col.includes(indicator.toLowerCase())) {
                        scores[type]++;
                    }
                }
            }
        }

        // Also check if values look like numeric scores
        const sampleValues = Object.values(sampleRow);
        const numericValues = sampleValues.filter(v => {
            const num = parseFloat(v);
            return !isNaN(num) && num >= 0 && num <= 10;
        });

        if (numericValues.length > 5) {
            scores.sensory_scores += 3;
        }

        // Determine primary data type
        if (scores.sensory_scores > scores.consumer_feedback && scores.sensory_scores > 2) {
            return 'sensory_scores';
        } else if (scores.consumer_feedback > 0) {
            return 'consumer_feedback';
        } else if (scores.product_info > 0) {
            return 'product_info_only';
        }

        return 'mixed';
    }

    /**
     * Process a single row based on data type
     */
    static async processRow(row, dataType, options = {}) {
        const result = {
            success: false,
            confidence: 0,
            warnings: [],
            originalData: row,
            experience: null
        };

        try {
            // Normalize row data using SchemaValidation if available
            const normalizedRow = window.SchemaValidation
                ? window.SchemaValidation.normalizeRow(row)
                : row;

            let experience = this.createBaseExperience(normalizedRow);
            let sensoryData = null;
            let emotionalData = null;

            switch (dataType) {
                case 'sensory_scores':
                    // Has sensory data, needs emotions inferred
                    sensoryData = this.extractSensoryData(row);
                    emotionalData = window.EmotionInference
                        ? window.EmotionInference.inferFromSensory(sensoryData)
                        : this.fallbackEmotionInference(sensoryData);

                    experience = this.mergeSensoryIntoExperience(experience, sensoryData);
                    experience = this.mergeEmotionalIntoExperience(experience, emotionalData);
                    result.confidence = emotionalData.confidence;
                    result.warnings = emotionalData.warnings || [];
                    break;

                case 'consumer_feedback':
                    // Has feedback, needs both sensory and emotions inferred
                    if (window.SensoryInference) {
                        const sensoryInference = await window.SensoryInference.inferFromFeedback(row);
                        sensoryData = sensoryInference.sensoryProfile;
                        result.warnings.push(...(sensoryInference.warnings || []));

                        // Then infer emotions from the sensory data
                        emotionalData = window.EmotionInference
                            ? window.EmotionInference.inferFromSensory(sensoryData)
                            : this.fallbackEmotionInference(sensoryData);

                        experience = this.mergeSensoryIntoExperience(experience, sensoryData);
                        experience = this.mergeEmotionalIntoExperience(experience, emotionalData);

                        // Average confidence of both inferences
                        result.confidence = (sensoryInference.confidence + emotionalData.confidence) / 2;
                        result.warnings.push(...(emotionalData.warnings || []));
                    } else {
                        // Fallback: use category defaults
                        experience = this.applyDefaultProfile(experience, row);
                        result.confidence = 0.3;
                        result.warnings.push({
                            type: 'missing_inference',
                            message: 'SensoryInference not available, using defaults'
                        });
                    }
                    break;

                case 'product_info_only':
                    // Only product info, use category defaults
                    experience = this.applyDefaultProfile(experience, row);
                    result.confidence = 0.3;
                    result.warnings.push({
                        type: 'product_info_only',
                        message: 'Only product info provided, sensory data estimated from category'
                    });
                    break;

                default:
                    // Mixed or unknown - try best effort
                    sensoryData = this.extractSensoryData(row);
                    const hasSensory = this.hasValidSensoryData(sensoryData);

                    if (hasSensory) {
                        emotionalData = window.EmotionInference
                            ? window.EmotionInference.inferFromSensory(sensoryData)
                            : this.fallbackEmotionInference(sensoryData);

                        experience = this.mergeSensoryIntoExperience(experience, sensoryData);
                        experience = this.mergeEmotionalIntoExperience(experience, emotionalData);
                        result.confidence = emotionalData.confidence;
                        result.warnings = emotionalData.warnings || [];
                    } else {
                        experience = this.applyDefaultProfile(experience, row);
                        result.confidence = 0.3;
                        result.warnings.push({
                            type: 'mixed_data',
                            message: 'Could not determine data type, using defaults'
                        });
                    }
            }

            // Validate the experience
            const validation = this.validateExperience(experience);
            if (!validation.valid) {
                result.warnings.push(...validation.warnings);
            }

            result.experience = experience;
            result.success = true;

        } catch (error) {
            result.success = false;
            result.error = error.message;
        }

        return result;
    }

    /**
     * Create base experience object from row data
     */
    static createBaseExperience(row) {
        return {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            productInfo: {
                name: row.name || row.Name || row.product_name || row.Product_Name ||
                      row.productName || row.ProductName || row['Product Name'] || 'Unknown Product',
                brand: row.brand || row.Brand || row.brand_name || row.Brand_Name || '',
                type: row.category || row.Category || row.type || row.Type || 'food',
                variant: row.variant || row.Variant || row.description || row.Description || ''
            },
            stages: (() => {
                const lexicon = (typeof getActiveLexicon !== 'undefined' ? getActiveLexicon() : null)
                    || (typeof window !== 'undefined' && window.getActiveLexicon ? window.getActiveLexicon() : null);
                if (lexicon && lexicon.stages) {
                    const s = {};
                    for (const stage of lexicon.stages) {
                        s[stage.id] = { emotions: {} };
                        for (const attr of stage.attributes) {
                            s[stage.id][attr.id] = attr.defaultValue ?? 0;
                        }
                    }
                    return s;
                }
                return {
                    appearance: { 'visual-appeal': 0, 'color-richness': 0, 'bubble-activity': 0, emotions: {} },
                    aroma: { 'smell-strength': 0, 'smell-complexity': 0, 'caramel-toffee-notes': 0, emotions: {} },
                    frontMouth: { sweetness: 0, 'sourness-tartness': 0, saltiness: 0, 'first-bite-texture': 0, 'spicy-heat': 0, emotions: {} },
                    midRearMouth: { 'bitterness-development': 0, 'umami-savoury-depth': 0, 'richness-fullness': 0, 'overall-mid-palate-intensity': 0, emotions: {} },
                    texture: { creaminess: 0, astringency: 0, smoothness: 0, emotions: {} },
                    aftertaste: { 'finish-length': 0, 'finish-quality': 0, 'finish-cleanness': 0, emotions: {} },
                    overallAssessment: { 'overall-quality': 0, 'satisfaction-overall': 0, emotions: {} }
                };
            })(),
            needState: '',
            notes: row.notes || row.comments || '',
            _autoProcessed: true
        };
    }

    /**
     * Extract sensory data from row
     */
    static extractSensoryData(row) {
        const sensory = {
            appearance: {},
            aroma: {},
            frontMouth: {},
            midRearMouth: {},
            texture: {},
            aftertaste: {},
            overallAssessment: {}
        };

        // Normalize row first if SchemaValidation available
        const normalizedRow = window.SchemaValidation
            ? window.SchemaValidation.normalizeRow(row)
            : row;

        // Map of column names to stage.attribute (supports both old and new key names)
        const columnMappings = {
            // Appearance
            'visualAppeal': 'appearance.visual-appeal',
            'visual_appeal': 'appearance.visual-appeal',
            'visual-appeal': 'appearance.visual-appeal',
            'appearance_visual': 'appearance.visual-appeal',
            'colorIntensity': 'appearance.color-richness',
            'color_intensity': 'appearance.color-richness',
            'color-richness': 'appearance.color-richness',
            'appearance_color': 'appearance.color-richness',
            'carbonation': 'appearance.bubble-activity',
            'bubble_activity': 'appearance.bubble-activity',
            'bubble-activity': 'appearance.bubble-activity',
            'fizz': 'appearance.bubble-activity',

            // Aroma
            'aromaIntensity': 'aroma.smell-strength',
            'aroma_intensity': 'aroma.smell-strength',
            'smell-strength': 'aroma.smell-strength',
            'aromaComplexity': 'aroma.smell-complexity',
            'aroma_complexity': 'aroma.smell-complexity',
            'smell-complexity': 'aroma.smell-complexity',
            'persistence': 'aroma.smell-duration',
            'aroma_persistence': 'aroma.smell-duration',
            'smell-duration': 'aroma.smell-duration',
            'linger': 'aroma.smell-duration',

            // Front mouth
            'sweetness': 'frontMouth.sweetness',
            'taste_sweetness': 'frontMouth.sweetness',
            'front_sweetness': 'frontMouth.sweetness',
            'sourness': 'frontMouth.sourness-tartness',
            'sourness-tartness': 'frontMouth.sourness-tartness',
            'taste_sourness': 'frontMouth.sourness-tartness',
            'acidity': 'frontMouth.sourness-tartness',
            'acid': 'frontMouth.sourness-tartness',
            'saltiness': 'frontMouth.saltiness',
            'taste_saltiness': 'frontMouth.saltiness',
            'texture': 'frontMouth.first-bite-texture',
            'first-bite-texture': 'frontMouth.first-bite-texture',
            'front_texture': 'frontMouth.first-bite-texture',
            'spiciness': 'frontMouth.spicy-heat',
            'spicy-heat': 'frontMouth.spicy-heat',
            'heat': 'frontMouth.spicy-heat',
            'pungency': 'frontMouth.spicy-heat',

            // Mid/rear mouth
            'bitterness': 'midRearMouth.bitterness-development',
            'bitterness-development': 'midRearMouth.bitterness-development',
            'mid_bitterness': 'midRearMouth.bitterness-development',
            'umami': 'midRearMouth.umami-savoury-depth',
            'umami-savoury-depth': 'midRearMouth.umami-savoury-depth',
            'mid_umami': 'midRearMouth.umami-savoury-depth',
            'savory': 'midRearMouth.umami-savoury-depth',
            'richness': 'midRearMouth.richness-fullness',
            'richness-fullness': 'midRearMouth.richness-fullness',
            'mid_richness': 'midRearMouth.richness-fullness',
            'mouthfeel': 'midRearMouth.overall-mid-palate-intensity',
            'overall-mid-palate-intensity': 'midRearMouth.overall-mid-palate-intensity',
            'mouth_feel': 'midRearMouth.overall-mid-palate-intensity',
            'weight': 'midRearMouth.overall-mid-palate-intensity',
            'body': 'midRearMouth.overall-mid-palate-intensity',

            // Texture
            'creaminess': 'texture.creaminess',
            'mid_creaminess': 'texture.creaminess',
            'astringency': 'texture.astringency',
            'dryness': 'texture.astringency',
            'tannin': 'texture.astringency',
            'smoothness': 'texture.smoothness',
            'chewiness': 'texture.chewiness',
            'crunchiness': 'texture.crunchiness',

            // Aftertaste
            'aftertasteDuration': 'aftertaste.finish-length',
            'aftertaste_duration': 'aftertaste.finish-length',
            'duration': 'aftertaste.finish-length',
            'finish_length': 'aftertaste.finish-length',
            'finish-length': 'aftertaste.finish-length',
            'aftertastePleasantness': 'aftertaste.finish-quality',
            'aftertaste_pleasantness': 'aftertaste.finish-quality',
            'pleasantness': 'aftertaste.finish-quality',
            'finish-quality': 'aftertaste.finish-quality',
            'aftertasteCleanness': 'aftertaste.finish-cleanness',
            'aftertaste_cleanness': 'aftertaste.finish-cleanness',
            'cleanness': 'aftertaste.finish-cleanness',
            'finish-cleanness': 'aftertaste.finish-cleanness',

            // Overall Assessment
            'overall-quality': 'overallAssessment.overall-quality',
            'overall_quality': 'overallAssessment.overall-quality',
            'satisfaction-overall': 'overallAssessment.satisfaction-overall',
            'overall_satisfaction': 'overallAssessment.satisfaction-overall'
        };

        // Extract values based on column mappings
        for (const [col, value] of Object.entries(normalizedRow)) {
            const mapping = columnMappings[col] || columnMappings[col.toLowerCase()];
            if (mapping) {
                const [stage, attr] = mapping.split('.');
                const numValue = parseFloat(value);
                if (!isNaN(numValue)) {
                    sensory[stage][attr] = Math.max(0, Math.min(10, numValue));
                }
            }
        }

        return sensory;
    }

    /**
     * Check if sensory data has valid values
     */
    static hasValidSensoryData(sensoryData) {
        let validCount = 0;
        for (const stage of Object.values(sensoryData)) {
            for (const value of Object.values(stage)) {
                if (value !== 0 && value !== undefined) { // 0 is default
                    validCount++;
                }
            }
        }
        return validCount >= 3;
    }

    /**
     * Merge sensory data into experience
     */
    static mergeSensoryIntoExperience(experience, sensoryData) {
        for (const [stage, attributes] of Object.entries(sensoryData)) {
            if (!experience.stages[stage]) experience.stages[stage] = {};
            for (const [attr, value] of Object.entries(attributes)) {
                if (value !== undefined) {
                    experience.stages[stage][attr] = value;
                }
            }
        }
        return experience;
    }

    /**
     * Merge emotional data into experience
     */
    static mergeEmotionalIntoExperience(experience, emotionalData) {
        // Merge stage emotions
        if (emotionalData.stages) {
            for (const [stage, data] of Object.entries(emotionalData.stages)) {
                if (!experience.stages[stage]) experience.stages[stage] = {};
                if (data.emotions) {
                    experience.stages[stage].emotions = data.emotions;
                }
            }
        }

        // Set need state
        if (emotionalData.needState) {
            experience.needState = emotionalData.needState;
        }

        return experience;
    }

    /**
     * Apply default sensory profile based on category
     */
    static applyDefaultProfile(experience, row) {
        const category = (row.category || row.type || 'food').toLowerCase();

        // Use category templates if available
        if (window.CATEGORY_TEMPLATES && window.CATEGORY_TEMPLATES[category]) {
            const template = window.CATEGORY_TEMPLATES[category];
            // Apply template defaults
            // ... (simplified for now)
        }

        return experience;
    }

    /**
     * Fallback emotion inference when EmotionInference module not loaded
     */
    static fallbackEmotionInference(sensoryData) {
        // Basic emotion inference based on key sensory attributes
        const emotions = {
            stages: {},
            needState: 'reward',
            confidence: 0.4,
            warnings: [{ type: 'fallback', message: 'Using basic emotion inference' }]
        };

        // Simple mappings using new attribute keys
        const sweetness = sensoryData.frontMouth?.sweetness || 0;
        const richness = sensoryData.midRearMouth?.['richness-fullness'] || 0;
        const creaminess = sensoryData.texture?.creaminess || 0;

        emotions.stages = {
            appearance: { emotions: { anticipation: 6, desire: 5, excitement: 5 } },
            aroma: { emotions: { pleasure: 6, comfort: 5 } },
            frontMouth: { emotions: { happiness: sweetness * 0.8, satisfaction: 6 } },
            midRearMouth: { emotions: { indulgence: richness * 0.8, comfort: creaminess * 0.7 } },
            aftertaste: { emotions: { satisfaction: 6, completeness: 5 } }
        };

        // Determine need state
        if (richness > 7 || creaminess > 7) {
            emotions.needState = 'escape';
        } else if (sweetness > 7) {
            emotions.needState = 'reward';
        }

        return emotions;
    }

    /**
     * Validate experience object
     */
    static validateExperience(experience) {
        // Use SchemaValidation if available for comprehensive validation
        if (window.SchemaValidation) {
            const validation = window.SchemaValidation.validateExperience(experience);
            return {
                valid: validation.valid,
                warnings: validation.warnings.map(w => ({
                    type: w.field || 'validation',
                    message: w.message
                }))
            };
        }

        // Fallback validation
        const warnings = [];
        let valid = true;

        // Check required fields
        if (!experience.productInfo?.name || experience.productInfo.name === 'Unknown Product') {
            warnings.push({ type: 'missing_name', message: 'Product name is missing' });
        }

        // Check if all values are defaults
        let defaultCount = 0;
        let totalCount = 0;
        for (const stage of Object.values(experience.stages || {})) {
            for (const [key, value] of Object.entries(stage)) {
                if (key !== 'emotions' && typeof value === 'number') {
                    totalCount++;
                    if (value === 0) defaultCount++;
                }
            }
        }

        if (totalCount > 0 && defaultCount / totalCount > 0.8) {
            warnings.push({
                type: 'mostly_defaults',
                message: 'Most values are defaults - inference may be inaccurate'
            });
        }

        return { valid, warnings };
    }

    /**
     * Get processing statistics
     */
    static getStats(results) {
        return {
            total: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            avgConfidence: results.filter(r => r.success)
                .reduce((sum, r) => sum + r.confidence, 0) / results.filter(r => r.success).length || 0,
            warningCount: results.reduce((sum, r) => sum + (r.warnings?.length || 0), 0)
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AutoProcessor };
}

// Make available globally in browser
if (typeof window !== 'undefined') {
    window.AutoProcessor = AutoProcessor;
}
