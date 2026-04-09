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
 * Suggest automatic column mapping based on header names.
 * Matches against active lexicon attribute IDs and labels, so it stays
 * in sync regardless of which lexicon is active.
 */
function suggestColumnMapping(headers) {
    const mapping = { productInfo: {}, attributes: {}, emotions: {} };

    const productMappings = {
        'product_name': 'name', 'productname': 'name', 'name': 'name', 'product': 'name',
        'brand': 'brand', 'manufacturer': 'brand', 'company': 'brand',
        'category': 'category', 'type': 'category', 'producttype': 'category',
        'variant': 'variant', 'flavor': 'variant', 'flavour': 'variant', 'sku': 'variant',
        'need_state': 'needState', 'needstate': 'needState', 'occasion': 'needState',
        'notes': 'notes', 'comments': 'notes', 'observations': 'notes'
    };

    // Build lookup map from active lexicon (id and label → stage.attrId path)
    const lexiconAttrMap = {};
    if (typeof getActiveLexicon === 'function') {
        const lexicon = getActiveLexicon();
        lexicon.stages.forEach(stage => {
            stage.attributes.forEach(attr => {
                const idKey = attr.id.toLowerCase().replace(/-/g, '');
                const labelKey = attr.label.toLowerCase().replace(/[^a-z0-9]/g, '');
                const path = `${stage.id}.${attr.id}`;
                lexiconAttrMap[idKey] = path;
                lexiconAttrMap[labelKey] = path;
                // Also map the dotted stage.attr format from the template
                const templateKey = `${stage.id.toLowerCase()}.${attr.id.replace(/-/g, '')}`;
                lexiconAttrMap[templateKey] = path;
            });
        });
    }

    headers.forEach(header => {
        const normalizedSimple = header.toLowerCase().replace(/[^a-z0-9]/g, '');

        // Handle stage.attrId format produced by downloadBatchImportTemplate
        if (header.includes('.')) {
            const [stagePart, attrPart] = header.split('.');
            const lookupKey = `${stagePart.toLowerCase()}.${attrPart.toLowerCase().replace(/-/g, '')}`;
            if (lexiconAttrMap[lookupKey]) {
                mapping.attributes[header] = lexiconAttrMap[lookupKey];
                return;
            }
        }

        // Product info
        if (productMappings[normalizedSimple]) {
            mapping.productInfo[header] = productMappings[normalizedSimple];
            return;
        }

        // Lexicon attribute (by id or label)
        if (lexiconAttrMap[normalizedSimple]) {
            mapping.attributes[header] = lexiconAttrMap[normalizedSimple];
            return;
        }

        // Emotion columns
        if (normalizedSimple.includes('emotion') || normalizedSimple.includes('feeling')) {
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
                } else if (numValue < 0 || numValue > 10) {
                    result.warnings.push(`${column}: ${numValue} is outside valid range (0-10)`);
                }
            }
        });

        validationResults.push(result);
    });

    return validationResults;
}

// ===== BATCH IMPORT EXECUTION =====

/**
 * Detect rows that would duplicate an existing experience (same name + brand)
 */
function detectDuplicates(rows, columnMapping) {
    if (typeof experiences === 'undefined') return [];
    const nameCol = Object.keys(columnMapping.productInfo).find(c => columnMapping.productInfo[c] === 'name');
    const brandCol = Object.keys(columnMapping.productInfo).find(c => columnMapping.productInfo[c] === 'brand');
    return rows.reduce((dupes, row, index) => {
        const name = (nameCol ? row[nameCol] : '').toString().toLowerCase().trim();
        const brand = (brandCol ? row[brandCol] : '').toString().toLowerCase().trim();
        if (name && experiences.some(e =>
            e.productInfo.name.toLowerCase().trim() === name &&
            (!brand || e.productInfo.brand.toLowerCase().trim() === brand)
        )) {
            dupes.push({ rowIndex: index, name: nameCol ? row[nameCol] : '', brand: brandCol ? row[brandCol] : '' });
        }
        return dupes;
    }, []);
}

/**
 * Undo the last batch import (removes all experiences added in that session)
 */
function undoLastBatchImport() {
    const lastIds = JSON.parse(localStorage.getItem('lastBatchImportIds') || '[]');
    if (lastIds.length === 0) { alert('No recent batch import to undo.'); return; }
    const idSet = new Set(lastIds.map(String));
    const before = experiences.length;
    experiences = experiences.filter(exp => !idSet.has(String(exp.id)));
    const removed = before - experiences.length;
    localStorage.removeItem('lastBatchImportIds');
    saveData();
    if (typeof updateDashboard === 'function') updateDashboard();
    if (typeof renderBatchImportDashboard === 'function') renderBatchImportDashboard();
    alert(`Undone: ${removed} imported product${removed !== 1 ? 's' : ''} removed.`);
}

/**
 * Import batch data and create experiences
 */
function executeBatchImport(rows, columnMapping) {
    const results = { success: 0, failed: 0, errors: [], importedIds: [], rowResults: [] };

    rows.forEach((row, index) => {
        try {
            const experience = createExperienceFromRow(row, columnMapping);
            if (experience) {
                experiences.push(experience);
                results.importedIds.push(experience.id);
                results.success++;
                results.rowResults.push({ row: index + 1, status: 'ok', name: experience.productInfo.name,
                    mappedCount: experience._importMeta?.mappedCount || 0,
                    totalAttributes: experience._importMeta?.totalAttributes || 0 });
            } else {
                results.failed++;
                results.errors.push({ row: index + 1, error: 'Missing product name' });
                results.rowResults.push({ row: index + 1, status: 'error', error: 'Missing product name' });
            }
        } catch (error) {
            results.failed++;
            results.errors.push({ row: index + 1, error: error.message });
            results.rowResults.push({ row: index + 1, status: 'error', error: error.message });
        }
    });

    if (results.success > 0) {
        saveData();
        // Store IDs so undo is possible
        localStorage.setItem('lastBatchImportIds', JSON.stringify(results.importedIds));
    }

    return results;
}

/**
 * Create experience object from a row using the active lexicon structure.
 * All attributes default to 0; only mapped columns overwrite with real values.
 */
function createExperienceFromRow(row, columnMapping) {
    // Extract product info
    const productInfo = {};
    let needState = 'reward';

    Object.keys(columnMapping.productInfo).forEach(column => {
        const field = columnMapping.productInfo[column];
        if (field === 'needState') {
            needState = (row[column] || 'reward').toLowerCase();
        } else {
            productInfo[field] = row[column] || '';
        }
    });

    if (!productInfo.name) return null;
    if (!productInfo.brand) productInfo.brand = 'Unknown';
    if (!productInfo.category) productInfo.category = 'food';

    // Build stages from active lexicon (all attributes initialised to 0)
    const stages = {};
    const lexicon = typeof getActiveLexicon === 'function' ? getActiveLexicon() : null;

    if (lexicon) {
        lexicon.stages.forEach(stage => {
            stages[stage.id] = { emotions: {} };
            stage.attributes.forEach(attr => {
                stages[stage.id][attr.id] = attr.defaultValue ?? 0;
            });
            stage.emotions.forEach(emotion => {
                stages[stage.id].emotions[emotion] = 0;
            });
        });
    } else {
        // Minimal fallback when lexicon is unavailable
        ['appearance', 'aroma', 'frontMouth', 'midRearMouth', 'texture', 'aftertaste', 'overallAssessment']
            .forEach(stageId => { stages[stageId] = { emotions: {} }; });
    }

    // Apply mapped attribute values
    const mappedAttributes = [];
    Object.keys(columnMapping.attributes).forEach(column => {
        const path = columnMapping.attributes[column]; // e.g. "frontMouth.sweetness"
        const dotIdx = path.indexOf('.');
        if (dotIdx === -1) return;
        const stageId = path.substring(0, dotIdx);
        const attrId = path.substring(dotIdx + 1);
        if (stages[stageId] === undefined) return;
        const raw = row[column];
        if (raw !== undefined && raw !== '') {
            const value = parseFloat(raw);
            if (!isNaN(value)) {
                stages[stageId][attrId] = Math.max(0, Math.min(10, value));
                mappedAttributes.push(path);
            }
        }
    });

    const totalAttrs = lexicon
        ? lexicon.stages.reduce((sum, s) => sum + s.attributes.length, 0)
        : 0;

    return {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        productInfo,
        stages,
        needState,
        notes: columnMapping.productInfo.notes
            ? (row[Object.keys(columnMapping.productInfo).find(c => columnMapping.productInfo[c] === 'notes')] || '')
            : '',
        _importMeta: {
            importedAt: new Date().toISOString(),
            mappedAttributes,
            mappedCount: mappedAttributes.length,
            totalAttributes: totalAttrs
        }
    };
}

// ===== HELPER FUNCTIONS =====

/**
 * Generate import template from the active lexicon.
 * Headers use stage.attrId format so auto-mapping works perfectly on re-import.
 * Includes one representative attribute per sub-category to keep the file manageable.
 */
function generateBatchImportTemplate() {
    const productHeaders = ['Product_Name', 'Brand', 'Category', 'Variant', 'Need_State'];
    const attributeHeaders = [];

    const lexicon = typeof getActiveLexicon === 'function' ? getActiveLexicon() : null;

    if (lexicon) {
        lexicon.stages.forEach(stage => {
            // Include up to 6 attributes per stage (first + key ones by position)
            const attrs = stage.attributes.length <= 6
                ? stage.attributes
                : [stage.attributes[0], ...stage.attributes.slice(-5)];
            attrs.forEach(attr => {
                attributeHeaders.push(`${stage.id}.${attr.id}`);
            });
        });
    } else {
        // Fallback using current lexicon attribute IDs
        [
            'appearance.visual-appeal', 'appearance.color-richness',
            'aroma.smell-strength', 'aroma.smell-complexity',
            'frontMouth.sweetness', 'frontMouth.sourness-tartness', 'frontMouth.saltiness', 'frontMouth.overall-initial-impact',
            'midRearMouth.richness-fullness', 'midRearMouth.umami-savoury-depth', 'midRearMouth.overall-mid-palate-intensity',
            'texture.smoothness', 'texture.creaminess', 'texture.crunchiness', 'texture.overall-textural-complexity',
            'aftertaste.finish-length', 'aftertaste.finish-quality', 'aftertaste.finish-cleanness',
            'overallAssessment.overall-quality', 'overallAssessment.satisfaction-overall'
        ].forEach(h => attributeHeaders.push(h));
    }

    const headers = [...productHeaders, ...attributeHeaders];
    const sampleRow = ['Sample Product', 'Sample Brand', 'food', 'Original', 'reward',
        ...attributeHeaders.map(() => '0')];

    return headers.join(',') + '\n' + sampleRow.join(',') + '\n';
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

// Export functions for use in UI
if (typeof window !== 'undefined') {
    window.BatchImport = {
        parseCSVFile,
        parseExcelFile,
        suggestColumnMapping,
        validateBatchData,
        executeBatchImport,
        executeBatchImportWithAutoEval,
        previewAutoEvaluation,
        generateBatchImportTemplate,
        downloadBatchImportTemplate,
        detectDuplicates,
        undoLastBatchImport,
        getConfidenceLabel
    };
    window.undoLastBatchImport = undoLastBatchImport;
}
