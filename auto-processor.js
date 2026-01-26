// ===== AUTO-PROCESSOR MODULE =====
// Orchestrates automatic sensory and emotional evaluation of uploaded data
// Connects data import → inference engines → storage

/**
 * Data type detection rules
 */
const DATA_TYPE_INDICATORS = {
    sensory_scores: [
        'sweetness', 'sourness', 'bitterness', 'saltiness', 'umami',
        'visualAppeal', 'visual_appeal', 'colorIntensity', 'color_intensity',
        'aromaIntensity', 'aroma_intensity', 'richness', 'creaminess',
        'texture', 'aftertaste', 'duration', 'pleasantness'
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
            let experience = this.createBaseExperience(row);
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
            stages: {
                appearance: { visualAppeal: 5, colorIntensity: 5, emotions: {} },
                aroma: { intensity: 5, sweetness: 5, complexity: 5, emotions: {} },
                frontMouth: { sweetness: 5, sourness: 3, saltiness: 3, texture: 5, emotions: {} },
                midRearMouth: { bitterness: 3, umami: 3, richness: 5, creaminess: 5, emotions: {} },
                aftertaste: { duration: 5, pleasantness: 5, cleanness: 5, emotions: {} }
            },
            needState: '',
            emotionalTriggers: { moreishness: 5, refreshment: 5, melt: 5, crunch: 5 },
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
            aftertaste: {}
        };

        // Map of column names to stage.attribute
        const columnMappings = {
            // Appearance
            'visualAppeal': 'appearance.visualAppeal',
            'visual_appeal': 'appearance.visualAppeal',
            'appearance_visual': 'appearance.visualAppeal',
            'colorIntensity': 'appearance.colorIntensity',
            'color_intensity': 'appearance.colorIntensity',
            'appearance_color': 'appearance.colorIntensity',

            // Aroma
            'aromaIntensity': 'aroma.intensity',
            'aroma_intensity': 'aroma.intensity',
            'aromaSweetness': 'aroma.sweetness',
            'aroma_sweetness': 'aroma.sweetness',
            'aromaComplexity': 'aroma.complexity',
            'aroma_complexity': 'aroma.complexity',

            // Front mouth
            'sweetness': 'frontMouth.sweetness',
            'taste_sweetness': 'frontMouth.sweetness',
            'front_sweetness': 'frontMouth.sweetness',
            'sourness': 'frontMouth.sourness',
            'taste_sourness': 'frontMouth.sourness',
            'acidity': 'frontMouth.sourness',
            'saltiness': 'frontMouth.saltiness',
            'taste_saltiness': 'frontMouth.saltiness',
            'texture': 'frontMouth.texture',
            'front_texture': 'frontMouth.texture',

            // Mid/rear mouth
            'bitterness': 'midRearMouth.bitterness',
            'mid_bitterness': 'midRearMouth.bitterness',
            'umami': 'midRearMouth.umami',
            'mid_umami': 'midRearMouth.umami',
            'savory': 'midRearMouth.umami',
            'richness': 'midRearMouth.richness',
            'mid_richness': 'midRearMouth.richness',
            'creaminess': 'midRearMouth.creaminess',
            'mid_creaminess': 'midRearMouth.creaminess',

            // Aftertaste
            'aftertasteDuration': 'aftertaste.duration',
            'aftertaste_duration': 'aftertaste.duration',
            'duration': 'aftertaste.duration',
            'finish_length': 'aftertaste.duration',
            'aftertastePleasantness': 'aftertaste.pleasantness',
            'aftertaste_pleasantness': 'aftertaste.pleasantness',
            'pleasantness': 'aftertaste.pleasantness',
            'aftertasteCleanness': 'aftertaste.cleanness',
            'aftertaste_cleanness': 'aftertaste.cleanness',
            'cleanness': 'aftertaste.cleanness'
        };

        // Extract values based on column mappings
        for (const [col, value] of Object.entries(row)) {
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
                if (value !== 5 && value !== undefined) { // 5 is default
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

        // Set emotional triggers
        if (emotionalData.emotionalTriggers) {
            experience.emotionalTriggers = emotionalData.emotionalTriggers;
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
            emotionalTriggers: { moreishness: 5, refreshment: 5, melt: 5, crunch: 5 },
            confidence: 0.4,
            warnings: [{ type: 'fallback', message: 'Using basic emotion inference' }]
        };

        // Simple mappings
        const sweetness = sensoryData.frontMouth?.sweetness || 5;
        const richness = sensoryData.midRearMouth?.richness || 5;
        const creaminess = sensoryData.midRearMouth?.creaminess || 5;

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
                    if (value === 5) defaultCount++;
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
