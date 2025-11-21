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
            rows.push(row);
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
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    values.push(current.trim());
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
 */
function generateBatchImportTemplate() {
    const headers = [
        'Product_Name',
        'Brand',
        'Category',
        'Variant',
        'Price',
        'Origin',
        'Visual_Appeal',
        'Color',
        'Aroma_Intensity',
        'Complexity',
        'Initial_Taste',
        'Sweetness',
        'Sourness',
        'Saltiness',
        'Bitterness',
        'Flavor_Development',
        'Texture',
        'Richness',
        'Aftertaste',
        'Overall_Satisfaction',
        'Purchase_Intent',
        'Uniqueness',
        'Emotions'
    ];

    const sampleRow = [
        'Sample Product',
        'Sample Brand',
        'food',
        'Original',
        '5.99',
        'USA',
        '8.0',
        '7.5',
        '7.0',
        '8.0',
        '7.5',
        '6.0',
        '5.0',
        '4.0',
        '3.0',
        '8.0',
        '7.5',
        '8.0',
        '7.0',
        '8.0',
        '7.5',
        '8.5',
        'Excitement, Joy, Comfort'
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
