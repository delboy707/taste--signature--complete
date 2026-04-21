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

        // Texture
        'texture': 'texture.overallTexturalComplexity',
        'crunchiness': 'texture.crunchiness',
        'smoothness': 'texture.smoothness',
        'chewiness': 'texture.chewiness',
        'creaminess_texture': 'texture.creaminess',
        'hardness': 'texture.hardnessFirmness',
        'melt_rate': 'texture.meltRate',
        'mouth_coating': 'texture.mouthCoating',

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
        'texture': 'Texture',
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
                name: 'Texture',
                attributes: [
                    { label: 'Overall Textural Complexity', value: 5 },
                    { label: 'Smoothness', value: 5 },
                    { label: 'Crunchiness', value: 5 },
                    { label: 'Chewiness', value: 5 },
                    { label: 'Creaminess', value: 5 },
                    { label: 'Hardness/Firmness', value: 5 },
                    { label: 'Melt/Dissolution Rate', value: 5 },
                    { label: 'Mouth Coating', value: 5 }
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
        // Texture
        'smoothness_texture',
        'crunchiness',
        'chewiness',
        'mouthCoating',
        'meltRate',
        'overallTexturalComplexity',
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

// === QEP_IMPORT_V2_START ===

/**
 * QEP Taste Signature CSV Import - v2 (robust parser)
 *
 * Stage prefixes: app, aroma, fom, mrm, tex, aft, oa
 * Expected columns: 6 metadata + 242 attributes + 14 emotion/notes = 262 total
 */

var QEP_STAGES = {
  app: {
    label: "APPEARANCE",
    attributes: [
      "Color_Shade","Color_Richness","Color_Lightness","Color_Strength","Color_Evenness",
      "Color_Depth","Surface_Shine","Surface_Texture","Surface_Oiliness","Surface_Moisture",
      "See-Through_Quality","Cloudiness","Light-Blocking","Piece_Size","Shape_Regularity",
      "Size_Consistency","Surface_Holes","Perceived_Thickness","Flow_and_Legs","Bubble_Size",
      "Bubble_Activity","Foam_Height","Foam_Persistence","Visible_Particles",
      "Pattern_and_Marbling","Visual_Complexity","Visual_Appeal","Temperature_Cue"
    ],
    emotions: ["anticipation","curiosity","desire","eager","excitement","happiness","interest",
               "pleased","surprise","attracted","disappointed","disgusted","indifferent",
               "suspicious","worried","anxious","confused","bored"]
  },
  aroma: {
    label: "AROMA",
    attributes: [
      "Smell_Strength","First_Impression","Pungent_Sting","Fruity_Notes","Flower-Like_Notes",
      "Plant-Like_Green_Notes","Warm_Spice_Notes","Toasted_Roasted_Notes",
      "Caramel_Toffee_Notes","Fermented_Notes","Dairy_Creamy_Notes","Earth-Like_Notes",
      "Ocean_Sea_Notes","Nut-Like_Notes","Wood-Like_Notes","Savoury_Meaty_Notes",
      "Smoky_Notes","Chemical_Solvent_Notes","Sulphur-Like_Notes","Smell_Duration",
      "Smell_Development","Smell_Lift","Smell_Complexity","Smell_Balance",
      "Freshness_vs_Staleness"
    ],
    emotions: ["pleasure","comfort","nostalgia","happiness","energized","relaxed","intrigued",
               "refreshed","desire","warm","soothed","surprised","interested","calm",
               "disgusted","irritated","worried","disappointed","indifferent","anxious","repulsed"]
  },
  fom: {
    label: "FRONT_OF_MOUTH",
    attributes: [
      "Sweetness","Sourness_Tartness","Saltiness","Bitterness","Savouriness","Spicy_Heat",
      "Cooling_Sensation","Carbonation_Bite","Tingling_Numbing","First_Hit_Speed",
      "Initial_Impact_Strength","Flavour_Burst","First-Bite_Texture","Temperature_Sensation",
      "Initial_Mouth-Watering","Overall_Initial_Impact","Taste_Dominance_at_Entry"
    ],
    emotions: ["excitement","surprise","happiness","pleasure","interest","satisfaction",
               "energized","delighted","amused","disappointed","disgusted","bored",
               "confused","overwhelmed","upset","worried"]
  },
  mrm: {
    label: "MID_REAR_MOUTH",
    attributes: [
      "Sweetness_Development","Sourness_Acidity_Development","Saltiness_Development",
      "Bitterness_Development","Umami_Savoury_Depth","Richness_Fullness","Fat_Taste",
      "Metallic_Sensation","Starchy_Cereal_Quality","Mineral_Quality",
      "In-Mouth_Aroma_Strength","In-Mouth_Aroma_Complexity","In-Mouth_Aroma_Character",
      "Flavour_Peak","Time_to_Peak","Peak_Duration","Flavour_Dominance_Sequence",
      "Taste_Balance","Taste_Suppression","Taste_Enhancement","Flavour_Complexity",
      "Flavour_Harmony","Flavour_Cleanness","Flavour_Depth","Overall_Mid-Palate_Intensity"
    ],
    emotions: ["satisfaction","pleasure","indulgence","comfort","calm","warmth","joy",
               "loving","adventurous","energized","secure","nostalgic","guilty","bored",
               "disgusted","disappointed","aggressive","overwhelmed","dissatisfied","sad"]
  },
  tex: {
    label: "TEXTURE",
    attributes: [
      "Hardness_Firmness","Softness","Thickness-Oral","Cohesiveness","Springiness_Bounce",
      "Stickiness","Bounce-Back","Snap_Shatter","Crunchiness","Crispness","Crackiness",
      "Chewiness","Gumminess","Toughness","Tenderness","Crumbliness","Mushiness",
      "Rubberiness","Mouldability","Thinness","Thickness-High","Runniness","Syrupiness",
      "Body_Fullness","Heaviness","Sliminess","Fluidity","Consistency","Graininess",
      "Grittiness","Sandiness","Chalkiness","Powderiness","Pulpiness","Seediness",
      "Mealiness_Flouriness","Coarseness","Particle_Uniformity","Fibrousness","Cellularity",
      "Crystallinity","Flakiness","Layered_Structure","Porosity_Aeration","Sponginess",
      "Denseness_Compactness","Lightness_Airiness","Evenness","Lumpiness","Smoothness",
      "Roughness","Slipperiness_Slickness","Mouth-Coating","Film-Forming","Waxiness",
      "Astringency","Dryness","Moistness","Wetness","Wateriness","Juiciness","Succulence",
      "Oiliness","Greasiness","Fattiness","Creaminess","Butteriness","Richness_Unctuousness",
      "Fat_Slickness","Cooling_Effect","Warming_Effect","Temperature_Contrast","Melt_Rate",
      "Effervescence","Carbonation_Bite-Oral","Bubble_Size-Oral",
      "Prickling_Tingling_from_Carbonation","Foam_Density","Foam_Stability",
      "Mousse-Like_Quality","Fizziness","Tingling","Numbing","Burning_Heat",
      "Nasal_Pungency-Oral","Metallic_Mouthfeel","Electric_Buzzing_Sensation",
      "Breakdown_Rate","Melt_Dissolution_Rate","Bolus_Formation_Ease","Chew-Down_Change",
      "Moisture_Release_Rate","Creaminess_Development","Ease_of_Swallow","Residual_Mouthfeel",
      "Pastiness_Doughiness","Starchiness","Gel-Like_Quality","Doughy_Quality",
      "Compactness","Overall_Textural_Complexity"
    ],
    emotions: ["satisfied","pleased","comforted","indulged","calm-relaxed","nostalgic",
               "secure","excited","energized","delighted","refreshed","interested","playful",
               "pleasantly-surprised","disgusted","disappointed","frustrated",
               "annoyed-irritated","bored","uncomfortable","anxious-uneasy",
               "unpleasantly-surprised","put-off","tired-fatigued","overwhelmed"]
  },
  aft: {
    label: "AFTERTASTE",
    attributes: [
      "Finish_Length","Flavour_Linger","Fade_Pattern","Sweet_Linger","Bitter_Linger",
      "Sour_Linger","Salt_Linger","Umami_Linger","Astringent_Linger","Metallic_Linger",
      "Heat_Linger","After-Smell_Strength","After-Smell_Variety","After-Smell_Character",
      "After-Smell_Development","Mouth_Coating","Palate_Cleansing","After-Dryness",
      "After-Salivation","Finish_Evolution","Finish_Quality","Finish_Cleanness",
      "Finish_Complexity","Warming_Persistence","Cooling_Persistence"
    ],
    emotions: ["satisfaction","completeness","happiness","craving-want-more","calm",
               "comforted","pleased","refreshed","nostalgic","surprised","disappointed",
               "disgusted","guilty","worried","dissatisfied","bored","regret"]
  },
  oa: {
    label: "OVERALL_ASSESSMENT",
    attributes: [
      "Overall_Quality","Balance","Harmony","True-to-Type_Character","Craftsmanship",
      "Flavour_Complexity","Flavour_Depth","Flavour_Coherence","Flavour_Richness",
      "Overall_Strength","Flavour_Impact","Memorability","Want-More_Quality",
      "Satisfaction","Refreshing_Quality","Palatability","Craveability",
      "Filling_Quality","Thirst-Quenching_Quality","Sensory_Journey",
      "Flavour_Fatigue_Resistance"
    ],
    emotions: ["satisfaction","happiness","pleasure","enjoyment","comfort","calm","warmth",
               "joy","nostalgia","energized","loving","gratitude","proud","adventurous",
               "indulgent","interested","relaxed","secure","desire","surprised",
               "disappointed","disgusted","bored","guilty","worried","dissatisfied",
               "sad","regret","angry","anxious","confused"]
  }
};

var QEP_METADATA_COLS = ["Product_Name","Brand","Category","Variant","Panel_Size","Test_Date"];

var QEP_STAGE_NAME_MAP = {
  app: "Appearance",
  aroma: "Aroma",
  fom: "Front of Mouth",
  mrm: "Mid/Rear Mouth",
  tex: "Texture",
  aft: "Aftertaste",
  oa: "Overall"
};

/**
 * generateQEPImportTemplate()
 *
 * Builds the 262-column QEP CSV template in memory and triggers download.
 * Row 1 = headers, Row 2 = instructions, Row 3 = sample data, Row 4 = blank starter.
 */
function generateQEPImportTemplate() {
  var headers = QEP_METADATA_COLS.slice();
  var instructions = [
    "[required]","[required]","[required e.g. chocolate/beverage/snack]",
    "[required e.g. Original/Light]","[number of panellists]","[YYYY-MM-DD]"
  ];
  var sample = [
    "Dark Chocolate Bar","QEP Sample Brand","confectionery","70% Cocoa Original","12","2026-04-18"
  ];

  Object.keys(QEP_STAGES).forEach(function(prefix) {
    var stage = QEP_STAGES[prefix];
    stage.attributes.forEach(function(attr) {
      headers.push(prefix + "_" + attr);
      instructions.push("[0-10 or leave blank if not assessed]");
      sample.push("");
    });
    headers.push(prefix + "_Emotions");
    headers.push(prefix + "_Notes");
    instructions.push("[Select from: " + stage.emotions.join(";") + "] - separate with semicolons");
    instructions.push("[optional free text]");
    sample.push("");
    sample.push("");
  });

  var csvEscape = function(v) { return '"' + String(v).replace(/"/g, '""') + '"'; };

  var csv = headers.join(",") + "\r\n";
  csv += instructions.map(csvEscape).join(",") + "\r\n";
  csv += sample.map(csvEscape).join(",") + "\r\n";
  csv += new Array(headers.length).fill("").join(",") + "\r\n";

  var blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  var url = window.URL.createObjectURL(blob);
  var link = document.createElement("a");
  link.href = url;
  link.download = "QEP_Taste_Signature_Import_Template.csv";
  link.click();
  window.URL.revokeObjectURL(url);
}

/**
 * generateQEPImportTemplateXLSX()
 *
 * Builds the same 262-column QEP template as an Excel (.xlsx) workbook.
 * Requires SheetJS (global XLSX) to be loaded.
 * Row 1 = headers, Row 2 = instructions, Row 3 = sample data, Row 4 = blank starter.
 */
function generateQEPImportTemplateXLSX() {
  if (typeof XLSX === "undefined") {
    alert("Excel library (SheetJS) is not loaded. Please refresh the page or use the CSV template.");
    return;
  }

  var headers = QEP_METADATA_COLS.slice();
  var instructions = [
    "[required]","[required]","[required e.g. chocolate/beverage/snack]",
    "[required e.g. Original/Light]","[number of panellists]","[YYYY-MM-DD]"
  ];
  var sample = [
    "Dark Chocolate Bar","QEP Sample Brand","confectionery","70% Cocoa Original","12","2026-04-18"
  ];

  Object.keys(QEP_STAGES).forEach(function(prefix) {
    var stage = QEP_STAGES[prefix];
    stage.attributes.forEach(function(attr) {
      headers.push(prefix + "_" + attr);
      instructions.push("[0-10 or leave blank if not assessed]");
      sample.push("");
    });
    headers.push(prefix + "_Emotions");
    headers.push(prefix + "_Notes");
    instructions.push("[Select from: " + stage.emotions.join(";") + "] - separate with semicolons");
    instructions.push("[optional free text]");
    sample.push("");
    sample.push("");
  });

  var blank = new Array(headers.length).fill("");
  var aoa = [headers, instructions, sample, blank];

  var ws = XLSX.utils.aoa_to_sheet(aoa);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "QEP_Template");
  XLSX.writeFile(wb, "QEP_Taste_Signature_Import_Template.xlsx");
}

/**
 * parseCSVFileV2(csvText)
 *
 * Robust state-machine CSV parser. Handles:
 *   - UTF-8 BOM (strips it)
 *   - CRLF, LF, and mixed line endings
 *   - Quoted fields with embedded commas
 *   - Escaped quotes ("")
 *   - Newlines inside quoted fields
 *   - Trailing whitespace in headers
 *   - Rows with mismatched column counts (pads or trims with warning)
 *
 * Returns: { headers, rows (array of arrays), rowObjects (array of objects),
 *            warnings, errors, meta }
 */
function parseCSVFileV2(csvText) {
  var warnings = [];
  var errors = [];

  if (typeof csvText !== "string" || csvText.length === 0) {
    errors.push("CSV file is empty or unreadable.");
    return { headers: [], rows: [], rowObjects: [], warnings: warnings, errors: errors, meta: {} };
  }

  // Strip UTF-8 BOM if present
  if (csvText.charCodeAt(0) === 0xFEFF) {
    csvText = csvText.slice(1);
  }

  // Normalise line endings
  csvText = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // State-machine parse
  var allRows = [];
  var currentRow = [];
  var currentField = "";
  var inQuotes = false;
  var fieldHadContent = false;

  for (var i = 0; i < csvText.length; i++) {
    var ch = csvText.charAt(i);
    var nx = csvText.charAt(i + 1);

    if (inQuotes) {
      if (ch === '"' && nx === '"') {
        currentField += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"' && !fieldHadContent) {
        inQuotes = true;
      } else if (ch === ",") {
        currentRow.push(currentField);
        currentField = "";
        fieldHadContent = false;
      } else if (ch === "\n") {
        currentRow.push(currentField);
        allRows.push(currentRow);
        currentRow = [];
        currentField = "";
        fieldHadContent = false;
      } else {
        currentField += ch;
        if (ch !== " " && ch !== "\t") fieldHadContent = true;
      }
    }
  }

  // Flush trailing field/row
  if (currentField !== "" || currentRow.length > 0) {
    currentRow.push(currentField);
    allRows.push(currentRow);
  }

  if (inQuotes) {
    warnings.push("CSV ended inside a quoted field - last field may be incomplete.");
  }

  // Drop fully empty rows
  var nonEmpty = allRows.filter(function(r) {
    return r.some(function(c) { return c && String(c).trim() !== ""; });
  });

  if (nonEmpty.length < 2) {
    errors.push("CSV must contain a header row and at least one data row.");
    return { headers: [], rows: [], rowObjects: [], warnings: warnings, errors: errors, meta: {} };
  }

  // Parse headers
  var headers = nonEmpty[0].map(function(h) { return String(h || "").trim(); });
  var expectedCols = headers.length;

  // Warn on blank or duplicate headers (do not abort)
  var seen = {};
  headers.forEach(function(h, idx) {
    if (h === "") {
      warnings.push("Column " + (idx + 1) + " has a blank header.");
    } else if (seen.hasOwnProperty(h)) {
      warnings.push("Duplicate header \"" + h + "\" at columns " + (seen[h] + 1) + " and " + (idx + 1) + ".");
    } else {
      seen[h] = idx;
    }
  });

  // Process data rows with column-count tolerance
  var dataRows = [];
  var rowObjects = [];
  for (var r = 1; r < nonEmpty.length; r++) {
    var row = nonEmpty[r].slice();
    var csvLineNum = r + 1;

    if (row.length < expectedCols) {
      warnings.push("Row " + csvLineNum + ": has " + row.length + " cells, expected " +
                    expectedCols + ". Padded missing cells as blank.");
      while (row.length < expectedCols) row.push("");
    } else if (row.length > expectedCols) {
      warnings.push("Row " + csvLineNum + ": has " + row.length + " cells, expected " +
                    expectedCols + ". Extra cells ignored.");
      row.length = expectedCols;
    }

    dataRows.push(row);
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      obj[headers[c]] = row[c];
    }
    rowObjects.push(obj);
  }

  return {
    headers: headers,
    rows: dataRows,
    rowObjects: rowObjects,
    warnings: warnings,
    errors: errors,
    meta: {
      totalLines: nonEmpty.length,
      dataRows: dataRows.length,
      expectedColumns: expectedCols
    }
  };
}

/**
 * buildQEPColumnMap(headers)
 *
 * Builds a position-based map of which column index holds which QEP field.
 * Uses case-insensitive matching so minor capitalisation issues will not break import.
 * Unmatched columns are simply ignored.
 */
function buildQEPColumnMap(headers) {
  var map = {
    metadata: {},
    stages: {},
    unmatched: [],
    foundAttributesPerStage: {},
    expectedAttributesPerStage: {}
  };

  Object.keys(QEP_STAGES).forEach(function(prefix) {
    map.stages[prefix] = { attributes: {}, emotions: -1, notes: -1 };
    map.foundAttributesPerStage[prefix] = 0;
    map.expectedAttributesPerStage[prefix] = QEP_STAGES[prefix].attributes.length;
  });

  var metaLower = {};
  QEP_METADATA_COLS.forEach(function(m) { metaLower[m.toLowerCase()] = m; });

  headers.forEach(function(rawHeader, idx) {
    var header = String(rawHeader || "").trim();
    if (!header) return;

    var hLower = header.toLowerCase();

    // Metadata column?
    if (metaLower.hasOwnProperty(hLower)) {
      map.metadata[metaLower[hLower]] = idx;
      return;
    }

    // Stage_ prefixed column?
    var us = header.indexOf("_");
    if (us === -1) {
      map.unmatched.push(header);
      return;
    }

    var prefix = header.substring(0, us).toLowerCase();
    var suffix = header.substring(us + 1);

    if (!map.stages.hasOwnProperty(prefix)) {
      map.unmatched.push(header);
      return;
    }

    if (suffix.toLowerCase() === "emotions") {
      map.stages[prefix].emotions = idx;
      return;
    }
    if (suffix.toLowerCase() === "notes") {
      map.stages[prefix].notes = idx;
      return;
    }

    // Attribute column - case-insensitive match
    var expected = QEP_STAGES[prefix].attributes;
    var match = null;
    for (var k = 0; k < expected.length; k++) {
      if (expected[k].toLowerCase() === suffix.toLowerCase()) {
        match = expected[k];
        break;
      }
    }
    if (match) {
      map.stages[prefix].attributes[match] = idx;
      map.foundAttributesPerStage[prefix]++;
    } else {
      map.unmatched.push(header);
    }
  });

  return map;
}

/**
 * isQEPInstructionsRow(row)
 *
 * Detects whether a row looks like a template instructions row (bracketed placeholders).
 */
function isQEPInstructionsRow(row) {
  var nonEmpty = row.filter(function(c) { return c && String(c).trim() !== ""; });
  if (nonEmpty.length === 0) return false;
  var bracketed = nonEmpty.filter(function(c) {
    return /^\s*\[.+\]\s*$/.test(String(c).trim());
  });
  return bracketed.length > (nonEmpty.length / 2);
}

/**
 * parseQEPImportCSV(csvText)
 *
 * Parses a filled-in QEP template into an array of structured product objects.
 * Automatically skips the instructions row and the sample row ("Dark Chocolate Bar").
 * Tolerates missing attribute columns (columns user deleted).
 *
 * Returns: {
 *   success: boolean,
 *   products: [...],
 *   warnings: [...],
 *   errors: [...],
 *   stats: { totalRows, productsImported, columnsFound, attributesPerStage, ... }
 * }
 */
function parseQEPImportCSV(csvText) {
  var result = {
    success: false,
    products: [],
    warnings: [],
    errors: [],
    stats: null
  };

  var parsed = parseCSVFileV2(csvText);

  if (parsed.errors.length > 0) {
    result.errors = parsed.errors.slice();
    return result;
  }

  // Forward any parser warnings
  parsed.warnings.forEach(function(w) { result.warnings.push(w); });

  var headers = parsed.headers;
  var rows = parsed.rows;

  var colMap = buildQEPColumnMap(headers);

  // Validate that Product_Name column exists
  if (colMap.metadata.Product_Name === undefined) {
    result.errors.push("Missing required column \"Product_Name\". This file does not appear to be a QEP template. Please re-download the template.");
    return result;
  }

  // Warn about missing attribute columns (tolerated, not blocked)
  var totalFoundAttrs = 0;
  var totalExpectedAttrs = 0;
  Object.keys(QEP_STAGES).forEach(function(prefix) {
    var found = colMap.foundAttributesPerStage[prefix];
    var expected = colMap.expectedAttributesPerStage[prefix];
    totalFoundAttrs += found;
    totalExpectedAttrs += expected;
    if (found < expected) {
      result.warnings.push("Stage \"" + QEP_STAGES[prefix].label +
                           "\": found " + found + " of " + expected + " expected attribute columns. Missing attributes will be treated as not assessed.");
    }
  });

  if (colMap.unmatched.length > 0) {
    result.warnings.push(colMap.unmatched.length + " column(s) did not match any QEP attribute and were ignored: " +
                         colMap.unmatched.slice(0, 5).join(", ") +
                         (colMap.unmatched.length > 5 ? " ..." : ""));
  }

  // Identify rows to skip
  var nameIdx = colMap.metadata.Product_Name;
  var startIdx = 0;

  // Skip instructions row if present as first data row
  if (rows.length > 0 && isQEPInstructionsRow(rows[0])) {
    startIdx = 1;
  }

  // Skip sample row if present
  if (rows.length > startIdx && rows[startIdx][nameIdx] &&
      String(rows[startIdx][nameIdx]).trim() === "Dark Chocolate Bar") {
    startIdx++;
  }

  // Parse each data row
  for (var r = startIdx; r < rows.length; r++) {
    var row = rows[r];
    var csvRowNum = r + 2; // header is row 1, data starts row 2

    var name = row[nameIdx];
    if (!name || String(name).trim() === "") continue;

    var product = buildQEPProductFromRow(row, colMap, csvRowNum, result.warnings);
    if (product) result.products.push(product);
  }

  result.success = result.products.length > 0;
  result.stats = {
    totalCsvRows: rows.length,
    productsImported: result.products.length,
    skippedRows: startIdx,
    columnsFound: headers.length,
    attributesFound: totalFoundAttrs,
    attributesExpected: totalExpectedAttrs,
    attributesPerStage: colMap.foundAttributesPerStage,
    expectedPerStage: colMap.expectedAttributesPerStage
  };

  if (result.products.length === 0 && result.errors.length === 0) {
    result.errors.push("No product rows found. After the header, instructions, and sample rows are skipped, no data remained.");
  }

  return result;
}

/**
 * buildQEPProductFromRow(row, colMap, csvRowNum, warnings)
 *
 * Converts a parsed CSV row into a structured product object using the column map.
 */
function buildQEPProductFromRow(row, colMap, csvRowNum, warnings) {
  var meta = colMap.metadata;
  var get = function(key, fallback) {
    if (meta[key] === undefined) return fallback;
    var v = row[meta[key]];
    return (v === undefined || v === null) ? fallback : String(v).trim();
  };

  var product = {
    productInfo: {
      name: get("Product_Name", ""),
      brand: get("Brand", "Unknown") || "Unknown",
      category: get("Category", "food") || "food",
      variant: get("Variant", ""),
      panelSize: get("Panel_Size", ""),
      testDate: get("Test_Date", "")
    },
    stages: {},
    _csvRow: csvRowNum
  };

  Object.keys(QEP_STAGES).forEach(function(prefix) {
    var stageMap = colMap.stages[prefix];
    var stageData = { scores: {}, emotions: [], notes: "" };

    Object.keys(stageMap.attributes).forEach(function(attrName) {
      var idx = stageMap.attributes[attrName];
      var raw = row[idx];
      if (raw === undefined || raw === null) return;
      var str = String(raw).trim();
      if (str === "") return;

      var num = parseFloat(str);
      if (isNaN(num)) {
        warnings.push("Row " + csvRowNum + ", column " + prefix + "_" + attrName +
                      ": \"" + str + "\" is not a number, cell skipped.");
        return;
      }
      stageData.scores[attrName] = Math.max(0, Math.min(10, num));
    });

    if (stageMap.emotions !== -1) {
      var eRaw = row[stageMap.emotions];
      if (eRaw) {
        stageData.emotions = String(eRaw).split(/[;,]/)
          .map(function(s) { return s.trim(); })
          .filter(function(s) { return s; });
      }
    }

    if (stageMap.notes !== -1) {
      stageData.notes = String(row[stageMap.notes] || "").trim();
    }

    product.stages[prefix] = stageData;
  });

  return product;
}

/**
 * executeQEPBatchImport(products, onProgress)
 *
 * Converts parsed QEP products into the app\u0027s experience format and pushes them
 * into the global experiences array, then calls saveData().
 *
 * Returns: { success, failed, errors, warnings }
 */
var QEP_PREFIX_TO_MANUAL_KEY = {
  app: "appearance",
  aroma: "aroma",
  fom: "frontMouth",
  mrm: "midRearMouth",
  tex: "texture",
  aft: "aftertaste",
  oa: "overall"
};

function qepAttrToCamel(attrName) {
  var parts = String(attrName).split(/[_]/);
  var out = "";
  for (var i = 0; i < parts.length; i++) {
    var part = parts[i];
    if (!part) continue;
    if (out === "") {
      out = part.charAt(0).toLowerCase() + part.slice(1);
    } else {
      out += part.charAt(0).toUpperCase() + part.slice(1);
    }
  }
  return qepHyphenToCamel(out);
}

function qepHyphenToCamel(str) {
  var segs = String(str).split("-");
  var out = "";
  for (var i = 0; i < segs.length; i++) {
    var seg = segs[i];
    if (!seg) continue;
    if (out === "") {
      out = seg.charAt(0).toLowerCase() + seg.slice(1);
    } else {
      out += seg.charAt(0).toUpperCase() + seg.slice(1);
    }
  }
  return out;
}

function qepEmotionToCamel(emoName) {
  return qepHyphenToCamel(String(emoName));
}

async function executeQEPBatchImport(products, onProgress) {
  var results = { success: 0, failed: 0, errors: [], warnings: [] };

  for (var i = 0; i < products.length; i++) {
    var p = products[i];
    try {
      var stages = {};
      Object.keys(QEP_STAGES).forEach(function(prefix) {
        var manualKey = QEP_PREFIX_TO_MANUAL_KEY[prefix];
        if (!manualKey) return;
        var stageData = p.stages[prefix] || { scores: {}, emotions: [], notes: "" };
        var stageObj = {};

        QEP_STAGES[prefix].attributes.forEach(function(attrName) {
          var v = stageData.scores ? stageData.scores[attrName] : undefined;
          if (typeof v === "number" && !isNaN(v)) {
            stageObj[qepAttrToCamel(attrName)] = v;
          }
        });

        var emotionsObj = {};
        QEP_STAGES[prefix].emotions.forEach(function(emoName) {
          emotionsObj[qepEmotionToCamel(emoName)] = 0;
        });
        var selectedEmotions = Array.isArray(stageData.emotions) ? stageData.emotions : [];
        selectedEmotions.forEach(function(emoName) {
          emotionsObj[qepEmotionToCamel(emoName)] = 7;
        });
        stageObj.emotions = emotionsObj;

        if (stageData.notes && String(stageData.notes).trim() !== "") {
          stageObj._notes = String(stageData.notes);
        }

        stages[manualKey] = stageObj;
      });

      var experience = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        productInfo: p.productInfo,
        stages: stages,
        needState: "",
        emotionalTriggers: { moreishness: 5, refreshment: 5, melt: 5, crunch: 5 },
        notes: "",
        importSource: "QEP_CSV",
        importedAt: new Date().toISOString()
      };

      if (typeof window !== "undefined" && window.EmotionInference &&
          typeof window.EmotionInference.inferFromSensory === "function") {
        try {
          var inferred = window.EmotionInference.inferFromSensory(stages);
          if (inferred && inferred.needState) {
            experience.needState = inferred.needState;
          }
          if (inferred && inferred.emotionalTriggers) {
            experience.emotionalTriggers = inferred.emotionalTriggers;
          }
          if (inferred && inferred.stages) {
            Object.keys(inferred.stages).forEach(function(stageKey) {
              var infStage = inferred.stages[stageKey];
              var inferredStageEmotions = infStage ? infStage.emotions : null;
              if (!inferredStageEmotions) return;
              if (!experience.stages[stageKey]) return;
              if (!experience.stages[stageKey].emotions) {
                experience.stages[stageKey].emotions = {};
              }
              Object.keys(inferredStageEmotions).forEach(function(emoKey) {
                var existing = experience.stages[stageKey].emotions[emoKey];
                if (existing === undefined || existing === 0) {
                  experience.stages[stageKey].emotions[emoKey] = inferredStageEmotions[emoKey];
                }
              });
            });
          }
        } catch (infErr) {
          results.warnings.push("Inference failed for " +
            (p.productInfo && p.productInfo.name) + ": " + infErr.message);
        }
      }

      if (typeof experiences !== "undefined" && Array.isArray(experiences)) {
        experiences.push(experience);
      } else {
        throw new Error("Global experiences array is not available.");
      }

      results.success++;
    } catch (err) {
      results.failed++;
      results.errors.push({
        row: p._csvRow,
        product: p.productInfo ? p.productInfo.name : "",
        error: err.message
      });
    }

    if (typeof onProgress === "function") {
      try {
        onProgress({
          current: i + 1,
          total: products.length,
          percent: Math.round(((i + 1) / products.length) * 100)
        });
      } catch (e) { /* ignore progress callback errors */ }
    }
  }

  if (results.success > 0 && typeof saveData ===