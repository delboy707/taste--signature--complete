// ===== BATCH IMPORT MODULE =====

/**
 * Batch Import System
 * Allows importing multiple products from CSV/Excel files
 */

// Import state
let batchImportData = {
    rawData: null,
    headers: [],
    rows: [],
    columnMapping: {},
    validationResults: [],
    importedCount: 0
};

// ===== CSV PARSING =====

/**
 * Sanitize CSV cell value to prevent formula injection
 * Strips leading =, +, -, @, \t, \r characters from cell values
 */
function sanitizeCsvValue(value) {
    if (typeof value !== 'string') return value;
    // Strip formula injection characters from the start of cell values
    return value.replace(/^[=+\-@\t\r]+/, '');
}

/**
 * Parse CSV file
 */
function parseCSVFile(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
        return { error: 'CSV file must have at least a header row and one data row' };
    }

    // Parse header
    const headers = parseCSVLine(lines[0]);

    // Parse data rows
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === headers.length) {
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index];
            });
            // Normalize row data using SchemaValidation if available
            const normalizedRow = window.SchemaValidation
                ? window.SchemaValidation.normalizeRow(row)
                : row;
            rows.push(normalizedRow);
        }
    }

    return { headers, rows };
}

/**
 * Parse a single CSV line (handles quoted values)
 */
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                i++; // Skip next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            values.push(sanitizeCsvValue(current.trim()));
            current = '';
        } else {
            current += char;
        }
    }

    values.push(sanitizeCsvValue(current.trim()));
    return values;
}

// ===== EXCEL PARSING =====

/**
 * Parse Excel file (using existing SheetJS if available, otherwise CSV fallback)
 */
async function parseExcelFile(file) {
    // Check if XLSX library is available
    if (typeof XLSX === 'undefined') {
        return { error: 'Excel parsing library not available. Please use CSV format instead.' };
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Get first sheet
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // Convert to JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (jsonData.length < 2) {
                    resolve({ error: 'Excel file must have at least a header row and one data row' });
                    return;
                }

                // Parse headers and rows
                const headers = jsonData[0].map(h => String(h).trim());
                const rows = [];

                for (let i = 1; i < jsonData.length; i++) {
                    const row = {};
                    headers.forEach((header, index) => {
                        row[header] = jsonData[i][index] !== undefined ? String(jsonData[i][index]).trim() : '';
                    });
                    rows.push(row);
                }

                resolve({ headers, rows });
            } catch (error) {
                resolve({ error: `Error parsing Excel file: ${error.message}` });
            }
        };

        reader.onerror = function() {
            resolve({ error: 'Failed to read file' });
        };

        reader.readAsArrayBuffer(file);
    });
}

// ===== COLUMN MAPPING =====

/**
 * Suggest automatic column mapping based on header names
 */
function suggestColumnMapping(headers) {
    const mapping = {
        productInfo: {},
        attributes: {},
        emotions: {}
    };

    // Product info mappings
    const productMappings = {
        'product_name': 'name',
        'productname': 'name',
        'name': 'name',
        'product': 'name',
        'brand': 'brand',
        'manufacturer': 'brand',
        'category': 'category',
        'type': 'category',
        'variant': 'variant',
        'flavor': 'variant',
        'flavour': 'variant',
        'price': 'price',
        'origin': 'origin',
        'country': 'origin'
    };

    // Attribute mappings (sensory attributes)
    const attributeMappings = {
        // Appearance
        'visual_appeal': 'appearance.visualAppeal',
        'visualappeal': 'appearance.visualAppeal',
        'appearance': 'appearance.visualAppeal',
        'color': 'appearance.color',
        'colour': 'appearance.color',
        'clarity': 'appearance.clarity',
        'gloss': 'appearance.gloss',
        'shine': 'appearance.gloss',

        // Aroma
        'aroma_intensity': 'aroma.aromaIntensity',
        'aromaintensity': 'aroma.aromaIntensity',
        'aroma': 'aroma.aromaIntensity',
        'smell': 'aroma.aromaIntensity',
        'complexity': 'aroma.complexity',
        'pleasantness': 'aroma.pleasantness',

        // Front of Mouth
        'initial_taste': 'frontMouth.initialTaste',
        'initialtaste': 'frontMouth.initialTaste',
        'first_impression': 'frontMouth.initialTaste',
        'sweetness': 'frontMouth.sweetness',
        'sourness': 'frontMouth.sourness',
        'saltiness': 'frontMouth.saltiness',
        'bitterness': 'frontMouth.bitterness',
        'umami': 'frontMouth.umami',

        // Mid/Rear Mouth
        'flavor_development': 'midMouth.flavorDevelopment',
        'flavordevelopment': 'midMouth.flavorDevelopment',
        'flavor': 'midMouth.flavorDevelopment',
        'flavour': 'midMouth.flavorDevelopment',
        'texture': 'midMouth.texture',
        'mouthfeel': 'midMouth.texture',
        'richness': 'midMouth.richness',

        // Aftertaste
        'aftertaste': 'aftertaste.aftertasteQuality',
        'finish': 'aftertaste.aftertasteQuality',
        'aftertaste_length': 'aftertaste.aftertasteLength',
        'aftertastelength': 'aftertaste.aftertasteLength',
        'persistence': 'aftertaste.aftertasteLength',

        // Overall
        'overall_satisfaction': 'overall.overallSatisfaction',
        'overallsatisfaction': 'overall.overallSatisfaction',
        'overall': 'overall.overallSatisfaction',
        'rating': 'overall.overallSatisfaction',
        'score': 'overall.overallSatisfaction',
        'purchase_intent': 'overall.purchaseIntent',
        'purchaseintent': 'overall.purchaseIntent',
        'uniqueness': 'overall.uniqueness'
    };

    headers.forEach(header => {
        const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '');

        // Check product info mappings
        if (productMappings[normalized]) {
            mapping.productInfo[header] = productMappings[normalized];
        }

        // Check attribute mappings
        if (attributeMappings[normalized]) {
            mapping.attributes[header] = attributeMappings[normalized];
        }

        // Check for emotion columns (columns containing 'emotion' or 'feeling')
        if (normalized.includes('emotion') || normalized.includes('feeling')) {
            mapping.emotions[header] = 'emotions';
        }
    });

    return mapping;
}

/**
 * Get attribute path from mapping (e.g., "appearance.visualAppeal")
 */
function parseAttributePath(path) {
    const parts = path.split('.');
    if (parts.length !== 2) return null;

    const stageMap = {
        'appearance': 'Appearance',
        'aroma': 'Aroma',
        'frontMouth': 'Front of Mouth',
        'midMouth': 'Mid/Rear Mouth',
        'aftertaste': 'Aftertaste',
        'overall': 'Overall'
    };

    return {
        stageName: stageMap[parts[0]],
        attributeId: parts[1]
    };
}

// ===== DATA VALIDATION =====

/**
 * Validate imported data before creating experiences
 */
function validateBatchData(rows, columnMapping) {
    const validationResults = [];

    rows.forEach((row, index) => {
        const result = {
            rowIndex: index,
            isValid: true,
            errors: [],
            warnings: []
        };

        // Validate product name (required)
        const nameColumn = Object.keys(columnMapping.productInfo).find(
            col => columnMapping.productInfo[col] === 'name'
        );

        if (!nameColumn || !row[nameColumn] || row[nameColumn].trim() === '') {
            result.isValid = false;
            result.errors.push('Product name is required');
        }

        // Validate numeric attributes (should be numbers between 1-10)
        Object.keys(columnMapping.attributes).forEach(column => {
            const value = row[column];
            if (value !== undefined && value !== '') {
                const numValue = parseFloat(value);
                if (isNaN(numValue)) {
                    result.warnings.push(`${column}: "${value}" is not a valid number`);
                } else if (numValue < 1 || numValue > 10) {
                    result.warnings.push(`${column}: ${numValue} is outside valid range (1-10)`);
                }
            }
        });

        validationResults.push(result);
    });

    return validationResults;
}

// ===== BATCH IMPORT EXECUTION =====

/**
 * Import batch data and create experiences
 */
function executeBatchImport(rows, columnMapping) {
    const results = {
        success: 0,
        failed: 0,
        errors: []
    };

    rows.forEach((row, index) => {
        try {
            const experience = createExperienceFromRow(row, columnMapping);
            if (experience) {
                experiences.push(experience);
                results.success++;
            } else {
                results.failed++;
                results.errors.push({ row: index + 1, error: 'Failed to create experience' });
            }
        } catch (error) {
            results.failed++;
            results.errors.push({ row: index + 1, error: error.message });
        }
    });

    // Save data after batch import
    if (results.success > 0) {
        saveData();
    }

    return results;
}

/**
 * Create experience object from row data
 */
function createExperienceFromRow(row, columnMapping) {
    // Extract product info
    const productInfo = {};
    Object.keys(columnMapping.productInfo).forEach(column => {
        const field = columnMapping.productInfo[column];
        productInfo[field] = row[column] || '';
    });

    // Ensure required fields
    if (!productInfo.name) return null;
    if (!productInfo.brand) productInfo.brand = 'Unknown';
    if (!productInfo.category) productInfo.category = 'food';

    // Create experience object
    const experience = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        productInfo: productInfo,
        stages: [
            {
                name: 'Appearance',
                attributes: [
                    { label: 'Visual Appeal', value: 5 },
                    { label: 'Color', value: 5 },
                    { label: 'Clarity', value: 5 },
                    { label: 'Gloss', value: 5 }
                ],
                emotions: []
            },
            {
                name: 'Aroma',
                attributes: [
                    { label: 'Aroma Intensity', value: 5 },
                    { label: 'Complexity', value: 5 },
                    { label: 'Pleasantness', value: 5 }
                ],
                emotions: []
            },
            {
                name: 'Front of Mouth',
                attributes: [
                    { label: 'Initial Taste', value: 5 },
                    { label: 'Sweetness', value: 5 },
                    { label: 'Sourness', value: 5 },
                    { label: 'Saltiness', value: 5 },
                    { label: 'Bitterness', value: 5 },
                    { label: 'Umami', value: 5 }
                ],
                emotions: []
            },
            {
                name: 'Mid/Rear Mouth',
                attributes: [
                    { label: 'Flavor Development', value: 5 },
                    { label: 'Texture', value: 5 },
                    { label: 'Richness', value: 5 }
                ],
                emotions: []
            },
            {
                name: 'Aftertaste',
                attributes: [
                    { label: 'Aftertaste Quality', value: 5 },
                    { label: 'Aftertaste Length', value: 5 }
                ],
                emotions: []
            },
            {
                name: 'Overall',
                attributes: [
                    { label: 'Overall Satisfaction', value: 5 },
                    { label: 'Purchase Intent', value: 5 },
                    { label: 'Uniqueness', value: 5 }
                ],
                emotions: []
            }
        ],
        notes: ''
    };

    // Map attribute values from row data
    Object.keys(columnMapping.attributes).forEach(column => {
        const path = columnMapping.attributes[column];
        const parsedPath = parseAttributePath(path);

        if (parsedPath) {
            const stage = experience.stages.find(s => s.name === parsedPath.stageName);
            if (stage) {
                // Find attribute by ID (convert label to camelCase for matching)
                const attr = stage.attributes.find(a => {
                    const attrId = a.label.replace(/\s+/g, '');
                    return attrId.toLowerCase() === parsedPath.attributeId.toLowerCase();
                });

                if (attr) {
                    const value = parseFloat(row[column]);
                    if (!isNaN(value)) {
                        attr.value = Math.max(1, Math.min(10, value)); // Clamp to 1-10
                    }
                }
            }
        }
    });

    // Map emotions if available
    Object.keys(columnMapping.emotions).forEach(column => {
        const emotionsText = row[column];
        if (emotionsText) {
            // Split by comma and distribute across stages
            const emotions = emotionsText.split(',').map(e => e.trim()).filter(e => e);
            if (emotions.length > 0) {
                // Add to overall stage by default
                const overallStage = experience.stages.find(s => s.name === 'Overall');
                if (overallStage) {
                    overallStage.emotions = emotions;
                }
            }
        }
    });

    return experience;
}

// ===== HELPER FUNCTIONS =====

/**
 * Get sample template for batch import
 * Includes all sensory attributes including new ones (acidity, spiciness, astringency, mouthfeel, persistence, carbonation)
 */
function generateBatchImportTemplate() {
    const headers = [
        'Product_Name',
        'Brand',
        'Category',
        'Variant',
        // Appearance
        'visualAppeal',
        'colorIntensity',
        'carbonation',
        // Aroma
        'aromaIntensity',
        'aromaSweetness',
        'aromaComplexity',
        'persistence',
        // Front Mouth
        'sweetness',
        'sourness',
        'saltiness',
        'texture',
        'acidity',
        'spiciness',
        // Mid/Rear Mouth
        'bitterness',
        'umami',
        'richness',
        'creaminess',
        'astringency',
        'mouthfeel',
        // Aftertaste
        'duration',
        'pleasantness',
        'cleanness'
    ];

    const sampleRow = [
        'Sample Product',
        'Sample Brand',
        'food',
        'Original',
        // Appearance
        '8',
        '7',
        '5',
        // Aroma
        '7',
        '6',
        '8',
        '6',
        // Front Mouth
        '6',
        '4',
        '3',
        '7',
        '3',
        '2',
        // Mid/Rear Mouth
        '3',
        '4',
        '7',
        '6',
        '2',
        '6',
        // Aftertaste
        '6',
        '8',
        '7'
    ];

    let csv = headers.join(',') + '\n';
    csv += sampleRow.join(',') + '\n';

    return csv;
}

/**
 * Download template file
 */
function downloadBatchImportTemplate() {
    const csv = generateBatchImportTemplate();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'taste_signature_import_template.csv';
    link.click();
    window.URL.revokeObjectURL(url);
}

// ===== AUTO-EVALUATION INTEGRATION =====

/**
 * Execute batch import with automatic sensory/emotional evaluation
 * @param {Array} rows - Array of data rows
 * @param {Object} columnMapping - Column mapping configuration
 * @param {Object} options - Processing options
 * @returns {Object} - Import results with auto-evaluated experiences
 */
async function executeBatchImportWithAutoEval(rows, columnMapping, options = {}) {
    const results = {
        success: 0,
        failed: 0,
        errors: [],
        experiences: [],
        autoEvalStats: {
            dataType: null,
            averageConfidence: 0,
            warningCount: 0
        }
    };

    // Check if AutoProcessor is available
    if (typeof window.AutoProcessor === 'undefined') {
        console.warn('AutoProcessor not available, falling back to standard import');
        return executeBatchImport(rows, columnMapping);
    }

    try {
        // Process with auto-evaluation
        const processResult = await window.AutoProcessor.processUploadedData(rows, {
            onProgress: options.onProgress
        });

        results.autoEvalStats.dataType = processResult.metadata.dataType;
        results.autoEvalStats.averageConfidence = processResult.metadata.averageConfidence;
        results.autoEvalStats.warningCount = processResult.summary.warnings;

        // Convert processed experiences and add to global experiences array
        processResult.experiences.forEach(exp => {
            // Convert to the app's experience format if needed
            const formattedExp = formatExperienceForApp(exp);
            if (formattedExp) {
                experiences.push(formattedExp);
                results.experiences.push(formattedExp);
                results.success++;
            }
        });

        results.failed = processResult.summary.errors;
        results.errors = processResult.errors;

        // Save data after batch import
        if (results.success > 0) {
            saveData();
        }

    } catch (error) {
        console.error('Auto-eval batch import failed:', error);
        results.errors.push({ message: error.message });
        // Fallback to standard import
        return executeBatchImport(rows, columnMapping);
    }

    return results;
}

/**
 * Format experience from auto-processor to app's expected format
 */
function formatExperienceForApp(autoProcessedExp) {
    if (!autoProcessedExp || !autoProcessedExp.productInfo) return null;

    // The auto-processor already creates experiences in the correct format
    // This function can add any additional formatting needed
    return {
        ...autoProcessedExp,
        id: autoProcessedExp.id || Date.now() + Math.random(),
        timestamp: autoProcessedExp.timestamp || new Date().toISOString()
    };
}

/**
 * Preview auto-evaluation results before final import
 * @param {Array} rows - Array of data rows
 * @param {Object} options - Options including onProgress callback
 * @returns {Object} - Preview results with inferred values and confidence
 */
async function previewAutoEvaluation(rows, options = {}) {
    if (typeof window.AutoProcessor === 'undefined') {
        return {
            available: false,
            message: 'Auto-evaluation not available'
        };
    }

    const preview = {
        available: true,
        dataType: null,
        rows: [],
        summary: {
            total: rows.length,
            highConfidence: 0,
            mediumConfidence: 0,
            lowConfidence: 0
        }
    };

    // Detect data type
    preview.dataType = window.AutoProcessor.detectDataType(rows[0], rows);

    // Process first 10 rows for preview
    const previewRows = rows.slice(0, 10);
    const total = previewRows.length;

    for (let i = 0; i < previewRows.length; i++) {
        const row = previewRows[i];

        // Report progress
        if (options.onProgress) {
            options.onProgress({
                current: i + 1,
                total: total,
                percent: Math.round(((i + 1) / total) * 100)
            });
        }

        try {
            const processed = await window.AutoProcessor.processRow(
                row,
                preview.dataType,
                {}
            );

            preview.rows.push({
                original: row,
                processed: processed.experience,
                confidence: processed.confidence,
                warnings: processed.warnings,
                success: processed.success
            });

            // Categorize by confidence
            if (processed.confidence >= 0.7) {
                preview.summary.highConfidence++;
            } else if (processed.confidence >= 0.4) {
                preview.summary.mediumConfidence++;
            } else {
                preview.summary.lowConfidence++;
            }

        } catch (error) {
            preview.rows.push({
                original: row,
                error: error.message,
                confidence: 0,
                success: false
            });
            preview.summary.lowConfidence++;
        }
    }

    return preview;
}

/**
 * Get confidence level label
 */
function getConfidenceLabel(confidence) {
    if (confidence >= 0.7) return { label: 'High', color: '#10b981' };
    if (confidence >= 0.4) return { label: 'Medium', color: '#f59e0b' };
    return { label: 'Low', color: '#ef4444' };
}


// ===== QEP TASTE SIGNATURE IMPORT =====

/**
 * Stage definitions - all 7 stages with consumer-friendly attribute labels
 * and approved emotion vocabularies.
 */
const QEP_STAGES = {
  app: {
    label: 'APPEARANCE',
    attributes: [
      'Color_Shade','Color_Richness','Color_Lightness','Color_Strength','Color_Evenness',
      'Color_Depth','Surface_Shine','Surface_Texture','Surface_Oiliness','Surface_Moisture',
      'See-Through_Quality','Cloudiness','Light-Blocking','Piece_Size','Shape_Regularity',
      'Size_Consistency','Surface_Holes','Perceived_Thickness','Flow_and_Legs','Bubble_Size',
      'Bubble_Activity','Foam_Height','Foam_Persistence','Visible_Particles',
      'Pattern_and_Marbling','Visual_Complexity','Visual_Appeal','Temperature_Cue'
    ],
    emotions: ['anticipation','curiosity','desire','eager','excitement','happiness','interest',
               'pleased','surprise','attracted','disappointed','disgusted','indifferent',
               'suspicious','worried','anxious','confused','bored']
  },
  aroma: {
    label: 'AROMA',
    attributes: [
      'Smell_Strength','First_Impression','Pungent_Sting','Fruity_Notes','Flower-Like_Notes',
      'Plant-Like_Green_Notes','Warm_Spice_Notes','Toasted_Roasted_Notes',
      'Caramel_Toffee_Notes','Fermented_Notes','Dairy_Creamy_Notes','Earth-Like_Notes',
      'Ocean_Sea_Notes','Nut-Like_Notes','Wood-Like_Notes','Savoury_Meaty_Notes',
      'Smoky_Notes','Chemical_Solvent_Notes','Sulphur-Like_Notes','Smell_Duration',
      'Smell_Development','Smell_Lift','Smell_Complexity','Smell_Balance',
      'Freshness_vs_Staleness'
    ],
    emotions: ['pleasure','comfort','nostalgia','happiness','energized','relaxed','intrigued',
               'refreshed','desire','warm','soothed','surprised','interested','calm',
               'disgusted','irritated','worried','disappointed','indifferent','anxious','repulsed']
  },
  fom: {
    label: 'FRONT_OF_MOUTH',
    attributes: [
      'Sweetness','Sourness_Tartness','Saltiness','Bitterness','Savouriness','Spicy_Heat',
      'Cooling_Sensation','Carbonation_Bite','Tingling_Numbing','First_Hit_Speed',
      'Initial_Impact_Strength','Flavour_Burst','First-Bite_Texture','Temperature_Sensation',
      'Initial_Mouth-Watering','Overall_Initial_Impact','Taste_Dominance_at_Entry'
    ],
    emotions: ['excitement','surprise','happiness','pleasure','interest','satisfaction',
               'energized','delighted','amused','disappointed','disgusted','bored',
               'confused','overwhelmed','upset','worried']
  },
  mrm: {
    label: 'MID_REAR_MOUTH',
    attributes: [
      'Sweetness_Development','Sourness_Acidity_Development','Saltiness_Development',
      'Bitterness_Development','Umami_Savoury_Depth','Richness_Fullness','Fat_Taste',
      'Metallic_Sensation','Starchy_Cereal_Quality','Mineral_Quality',
      'In-Mouth_Aroma_Strength','In-Mouth_Aroma_Complexity','In-Mouth_Aroma_Character',
      'Flavour_Peak','Time_to_Peak','Peak_Duration','Flavour_Dominance_Sequence',
      'Taste_Balance','Taste_Suppression','Taste_Enhancement','Flavour_Complexity',
      'Flavour_Harmony','Flavour_Cleanness','Flavour_Depth','Overall_Mid-Palate_Intensity'
    ],
    emotions: ['satisfaction','pleasure','indulgence','comfort','calm','warmth','joy',
               'loving','adventurous','energized','secure','nostalgic','guilty','bored',
               'disgusted','disappointed','aggressive','overwhelmed','dissatisfied','sad']
  },
  tex: {
    label: 'TEXTURE',
    attributes: [
      'Hardness_Firmness','Softness','Thickness-Oral','Cohesiveness','Springiness_Bounce',
      'Stickiness','Bounce-Back','Snap_Shatter','Crunchiness','Crispness','Crackiness',
      'Chewiness','Gumminess','Toughness','Tenderness','Crumbliness','Mushiness',
      'Rubberiness','Mouldability','Thinness','Thickness-High','Runniness','Syrupiness',
      'Body_Fullness','Heaviness','Sliminess','Fluidity','Consistency','Graininess',
      'Grittiness','Sandiness','Chalkiness','Powderiness','Pulpiness','Seediness',
      'Mealiness_Flouriness','Coarseness','Particle_Uniformity','Fibrousness','Cellularity',
      'Crystallinity','Flakiness','Layered_Structure','Porosity_Aeration','Sponginess',
      'Denseness_Compactness','Lightness_Airiness','Evenness','Lumpiness','Smoothness',
      'Roughness','Slipperiness_Slickness','Mouth-Coating','Film-Forming','Waxiness',
      'Astringency','Dryness','Moistness','Wetness','Wateriness','Juiciness','Succulence',
      'Oiliness','Greasiness','Fattiness','Creaminess','Butteriness','Richness_Unctuousness',
      'Fat_Slickness','Cooling_Effect','Warming_Effect','Temperature_Contrast','Melt_Rate',
      'Effervescence','Carbonation_Bite-Oral','Bubble_Size-Oral',
      'Prickling_Tingling_from_Carbonation','Foam_Density','Foam_Stability',
      'Mousse-Like_Quality','Fizziness','Tingling','Numbing','Burning_Heat',
      'Nasal_Pungency-Oral','Metallic_Mouthfeel','Electric_Buzzing_Sensation',
      'Breakdown_Rate','Melt_Dissolution_Rate','Bolus_Formation_Ease','Chew-Down_Change',
      'Moisture_Release_Rate','Creaminess_Development','Ease_of_Swallow','Residual_Mouthfeel',
      'Pastiness_Doughiness','Starchiness','Gel-Like_Quality','Doughy_Quality',
      'Compactness','Overall_Textural_Complexity'
    ],
    emotions: ['satisfied','pleased','comforted','indulged','calm-relaxed','nostalgic',
               'secure','excited','energized','delighted','refreshed','interested','playful',
               'pleasantly-surprised','disgusted','disappointed','frustrated',
               'annoyed-irritated','bored','uncomfortable','anxious-uneasy',
               'unpleasantly-surprised','put-off','tired-fatigued','overwhelmed']
  },
  aft: {
    label: 'AFTERTASTE',
    attributes: [
      'Finish_Length','Flavour_Linger','Fade_Pattern','Sweet_Linger','Bitter_Linger',
      'Sour_Linger','Salt_Linger','Umami_Linger','Astringent_Linger','Metallic_Linger',
      'Heat_Linger','After-Smell_Strength','After-Smell_Variety','After-Smell_Character',
      'After-Smell_Development','Mouth_Coating','Palate_Cleansing','After-Dryness',
      'After-Salivation','Finish_Evolution','Finish_Quality','Finish_Cleanness',
      'Finish_Complexity','Warming_Persistence','Cooling_Persistence'
    ],
    emotions: ['satisfaction','completeness','happiness','craving-want-more','calm',
               'comforted','pleased','refreshed','nostalgic','surprised','disappointed',
               'disgusted','guilty','worried','dissatisfied','bored','regret']
  },
  oa: {
    label: 'OVERALL_ASSESSMENT',
    attributes: [
      'Overall_Quality','Balance','Harmony','True-to-Type_Character','Craftsmanship',
      'Flavour_Complexity','Flavour_Depth','Flavour_Coherence','Flavour_Richness',
      'Overall_Strength','Flavour_Impact','Memorability','Want-More_Quality',
      'Satisfaction','Refreshing_Quality','Palatability','Craveability',
      'Filling_Quality','Thirst-Quenching_Quality','Sensory_Journey',
      'Flavour_Fatigue_Resistance'
    ],
    emotions: ['satisfaction','happiness','pleasure','enjoyment','comfort','calm','warmth',
               'joy','nostalgia','energized','loving','gratitude','proud','adventurous',
               'indulgent','interested','relaxed','secure','desire','surprised',
               'disappointed','disgusted','bored','guilty','worried','dissatisfied',
               'sad','regret','angry','anxious','confused']
  }
};

/**
 * generateQEPImportTemplate()
 *
 * Builds the full 262-column QEP CSV template in memory and triggers download.
 * Replaces the old generateBatchImportTemplate() for QEP-structured imports.
 */
function generateQEPImportTemplate() {
  const metadata = ['Product_Name','Brand','Category','Variant','Panel_Size','Test_Date'];
  const headers = [...metadata];
  const instructions = [
    '[required]','[required]','[required e.g. chocolate/beverage/snack]',
    '[required e.g. Original/Light]','[number of panellists]','[YYYY-MM-DD]'
  ];
  const sample = [
    'Dark Chocolate Bar','QEP Sample Brand','confectionery','70% Cocoa Original','12','2026-04-14'
  ];

  Object.entries(QEP_STAGES).forEach(function(entry) {
    var prefix = entry[0];
    var stage  = entry[1];
    stage.attributes.forEach(function(attr) {
      headers.push(prefix + '_' + attr);
      instructions.push('[0-10 or leave blank if not assessed]');
      sample.push('');
    });
    headers.push(prefix + '_Emotions');
    headers.push(prefix + '_Notes');
    instructions.push('[Select from: ' + stage.emotions.join(';') + '] - separate with semicolons');
    instructions.push('[optional free text]');
    sample.push('');
    sample.push('');
  });

  var csv = headers.join(',') + '\n';
  csv += instructions.map(function(c) { return '"' + c.replace(/"/g, '""') + '"'; }).join(',') + '\n';
  csv += sample.join(',') + '\n';
  csv += new Array(headers.length).fill('').join(',') + '\n';

  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var url  = window.URL.createObjectURL(blob);
  var link = document.createElement('a');
  link.href     = url;
  link.download = 'QEP_Taste_Signature_Import_Template.csv';
  link.click();
  window.URL.revokeObjectURL(url);
}

/**
 * parseQEPImportCSV(csvText)
 *
 * Reads a completed QEP template and returns an array of structured product objects.
 * Row 0 = headers, Row 1 = instructions (always skipped), Row 2+ = data.
 *
 * Returns: { products: Array, warnings: Array }
 */
function parseQEPImportCSV(csvText) {
  var warnings = [];
  var products = [];

  // Build prefix -> stageKey lookup
  var prefixMap = {};
  Object.keys(QEP_STAGES).forEach(function(prefix) {
    prefixMap[prefix] = prefix;
  });

  var METADATA_KEYS = ['Product_Name','Brand','Category','Variant','Panel_Size','Test_Date'];

  function classifyColumn(header) {
    var idx = header.indexOf('_');
    if (idx === -1) return null;
    var prefix = header.slice(0, idx);
    var rest   = header.slice(idx + 1);
    if (!prefixMap[prefix]) return null;
    if (rest === 'Emotions') return { prefix: prefix, type: 'emotions' };
    if (rest === 'Notes')    return { prefix: prefix, type: 'notes' };
    return { prefix: prefix, type: 'score', attr: rest };
  }

  var rows = parseCSVFile(csvText); // reuse existing parser
  if (!rows || !rows.headers || rows.headers.length === 0) {
    return { products: products, warnings: ['Could not parse CSV structure.'] };
  }

  var headers  = rows.headers;
  var dataRows = rows.rows.slice(1); // skip instructions row

  var colMap = headers.map(function(h) {
    return {
      header: h,
      meta:   METADATA_KEYS.includes(h) ? h : null,
      stage:  classifyColumn(h)
    };
  });

  dataRows.forEach(function(row, rowIdx) {
    var vals = Object.values(row);
    if (vals.every(function(v) { return !v || v.trim() === ''; })) return;

    var product = {
      metadata: { productName:'', brand:'', category:'', variant:'', panelSize:'', testDate:'' },
      stages: {}
    };
    Object.keys(QEP_STAGES).forEach(function(p) {
      product.stages[p] = { scores: {}, emotions: [], notes: '' };
    });

    colMap.forEach(function(col, i) {
      var raw = (vals[i] || '').trim();
      if (col.meta) {
        var key = col.meta
          .replace(/_([a-z])/gi, function(_, c) { return c.toUpperCase(); })
          .replace(/^[A-Z]/, function(c) { return c.toLowerCase(); });
        product.metadata[key] = raw;
        return;
      }
      if (!col.stage) return;
      var s = col.stage;
      if (s.type === 'emotions') {
        product.stages[s.prefix].emotions = raw ? raw.split(';').map(function(e) { return e.trim(); }).filter(Boolean) : [];
        return;
      }
      if (s.type === 'notes') {
        product.stages[s.prefix].notes = raw;
        return;
      }
      if (raw === '') return;
      var n = parseFloat(raw);
      if (isNaN(n)) {
        warnings.push('Row ' + (rowIdx + 3) + ', "' + col.header + '": not a number - skipped.');
        return;
      }
      product.stages[s.prefix].scores[s.attr] = n;
    });

    products.push(product);
  });

  return { products: products, warnings: warnings };
}

/**
 * executeQEPBatchImport(products)
 *
 * Writes QEP-parsed products to Firestore under the company's experiences collection.
 * Uses window.firestoreManager.getExperiencesCollection() - the same path all other
 * experience writes use: companies/{companyId}/experiences/
 *
 * @param {Array}    products  Output of parseQEPImportCSV().products
 * @param {Function} onProgress  Optional callback({ current, total })
 * @returns {Promise<{ success: number, failed: number, errors: Array }>}
 */
async function executeQEPBatchImport(products, onProgress) {
  var results = { success: 0, failed: 0, errors: [] };

  if (!window.firestoreManager) {
    results.errors.push('Firestore manager not initialised. Please ensure you are logged in.');
    results.failed = products.length;
    return results;
  }

  var collection = window.firestoreManager.getExperiencesCollection();
  var total = products.length;

  for (var i = 0; i < total; i++) {
    var product = products[i];
    try {
      // Validate required metadata
      if (!product.metadata.productName || !product.metadata.brand) {
        throw new Error('Missing required fields: productName or brand.');
      }

      // Build experience document matching app schema
      var doc = {
        importedAt:  firebase.firestore.FieldValue.serverTimestamp(),
        importType:  'qep_csv',
        productInfo: {
          name:      product.metadata.productName,
          brand:     product.metadata.brand,
          type:      (product.metadata.category || 'food').toLowerCase(),
          variant:   product.metadata.variant || '',
          panelSize: parseInt(product.metadata.panelSize, 10) || null,
          testDate:  product.metadata.testDate  || null
        },
        stages: buildFirestoreStages(product.stages),
        notes: product.stages.oa && product.stages.oa.notes ? product.stages.oa.notes : ''
      };

      await collection.add(doc);
      results.success++;
    } catch (err) {
      results.failed++;
      results.errors.push({ row: i + 1, product: product.metadata.productName || 'Unknown', error: err.message });
    }

    if (typeof onProgress === 'function') {
      onProgress({ current: i + 1, total: total, percent: Math.round(((i + 1) / total) * 100) });
    }
  }

  return results;
}

/**
 * buildFirestoreStages(stages)
 * Converts the parsed stage objects into the format the app stores in Firestore.
 * Scores become a flat key->value map per stage; emotions stay as an array.
 */
function buildFirestoreStages(stages) {
  var out = {};
  Object.keys(QEP_STAGES).forEach(function(prefix) {
    var s = stages[prefix] || {};
    out[prefix] = {
      scores:   s.scores   || {},
      emotions: s.emotions || [],
      notes:    s.notes    || ''
    };
  });
  return out;
}

// Export functions for use in UI
if (typeof window !== 'undefined') {
    window.BatchImport = {
        generateQEPImportTemplate,
        parseQEPImportCSV,
        executeQEPBatchImport,
        parseCSVFile,
        parseExcelFile,
        suggestColumnMapping,
        validateBatchData,
        executeBatchImport,
        executeBatchImportWithAutoEval,
        previewAutoEvaluation,
        generateBatchImportTemplate,
        downloadBatchImportTemplate,
        getConfidenceLabel
    };
}
