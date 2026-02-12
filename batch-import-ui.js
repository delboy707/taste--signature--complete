// ===== BATCH IMPORT UI MODULE =====

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Render Batch Import Dashboard
 */
function renderBatchImportDashboard() {
    const container = document.getElementById('batch-import-container');
    if (!container) return;

    let html = '<div class="batch-import-dashboard">';

    // Overview Section
    html += renderBatchImportOverview();

    // Step 1: File Upload
    html += renderFileUploadSection();

    // Step 2: Column Mapping (shown after upload)
    if (batchImportData.headers.length > 0) {
        html += renderColumnMappingSection();
    }

    // Step 3: Preview & Validation (shown after mapping)
    if (Object.keys(batchImportData.columnMapping.productInfo || {}).length > 0) {
        html += renderPreviewSection();
    }

    html += '</div>';

    container.innerHTML = html;

    // Attach event listeners
    setTimeout(() => {
        attachBatchImportEventListeners();
    }, 100);
}

/**
 * Render overview section
 */
function renderBatchImportOverview() {
    return `
        <div class="analytics-section">
            <h4>📥 Batch Import Products</h4>
            <p class="section-description">Import multiple products at once from CSV or Excel files</p>

            <div class="stat-cards">
                <div class="stat-card">
                    <div class="stat-icon">📄</div>
                    <div class="stat-content">
                        <div class="stat-label">Supported Formats</div>
                        <div class="stat-value">CSV, Excel</div>
                        <div class="stat-detail">.csv, .xlsx files</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🎯</div>
                    <div class="stat-content">
                        <div class="stat-label">Auto-Mapping</div>
                        <div class="stat-value">Smart</div>
                        <div class="stat-detail">Automatic column detection</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">✅</div>
                    <div class="stat-content">
                        <div class="stat-label">Validation</div>
                        <div class="stat-value">Built-in</div>
                        <div class="stat-detail">Preview before import</div>
                    </div>
                </div>
            </div>

            <div class="batch-import-actions">
                <button class="btn-secondary" onclick="downloadBatchImportTemplate()">
                    📥 Download Template
                </button>
                <button class="btn-secondary" onclick="showBatchImportHelp()">
                    ❓ Import Guide
                </button>
            </div>

            ${renderAutoEvalToggle()}
        </div>
    `;
}

/**
 * Render file upload section
 */
function renderFileUploadSection() {
    return `
        <div class="analytics-section">
            <h4>Step 1: Upload File</h4>
            <p class="section-description">Select a CSV or Excel file containing your product data</p>

            <div class="file-upload-zone" id="file-upload-zone">
                <div class="upload-icon">📁</div>
                <h5>Drag & Drop File Here</h5>
                <p>or click to browse</p>
                <input type="file" id="batch-file-input" accept=".csv,.xlsx" style="display: none;">
                <button class="btn-primary" onclick="document.getElementById('batch-file-input').click()">
                    Choose File
                </button>
                <div class="upload-formats">
                    Supported: CSV (.csv), Excel (.xlsx)
                </div>
            </div>

            ${batchImportData.headers.length > 0 ? `
                <div class="file-info">
                    <div class="file-info-item">
                        <strong>File Loaded:</strong> ${escapeHtml(batchImportData.fileName || 'Unknown')}
                    </div>
                    <div class="file-info-item">
                        <strong>Columns:</strong> ${batchImportData.headers.length}
                    </div>
                    <div class="file-info-item">
                        <strong>Rows:</strong> ${batchImportData.rows.length}
                    </div>
                    <button class="btn-small btn-secondary" onclick="resetBatchImport()">
                        Clear & Upload New File
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Render column mapping section
 */
function renderColumnMappingSection() {
    const suggestedMapping = suggestColumnMapping(batchImportData.headers);

    return `
        <div class="analytics-section">
            <h4>Step 2: Map Columns</h4>
            <p class="section-description">Map your file columns to Taste Signature fields</p>

            <div class="mapping-controls">
                <button class="btn-secondary" onclick="applyAutomaticMapping()">
                    ⚡ Auto-Map Columns
                </button>
                <button class="btn-secondary" onclick="clearColumnMapping()">
                    🔄 Reset Mapping
                </button>
            </div>

            <div class="column-mapping-grid">
                <div class="mapping-category">
                    <h5>📋 Product Information</h5>
                    <div class="mapping-fields">
                        <div class="mapping-field">
                            <label>Product Name (Required):</label>
                            <select class="column-select" data-category="productInfo" data-field="name">
                                <option value="">-- Select Column --</option>
                                ${batchImportData.headers.map(h => `
                                    <option value="${escapeHtml(h)}">${escapeHtml(h)}</option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="mapping-field">
                            <label>Brand:</label>
                            <select class="column-select" data-category="productInfo" data-field="brand">
                                <option value="">-- Select Column --</option>
                                ${batchImportData.headers.map(h => `
                                    <option value="${escapeHtml(h)}">${escapeHtml(h)}</option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="mapping-field">
                            <label>Category:</label>
                            <select class="column-select" data-category="productInfo" data-field="category">
                                <option value="">-- Select Column --</option>
                                ${batchImportData.headers.map(h => `
                                    <option value="${escapeHtml(h)}">${escapeHtml(h)}</option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="mapping-field">
                            <label>Variant/Flavor:</label>
                            <select class="column-select" data-category="productInfo" data-field="variant">
                                <option value="">-- Select Column --</option>
                                ${batchImportData.headers.map(h => `
                                    <option value="${escapeHtml(h)}">${escapeHtml(h)}</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                </div>

                <div class="mapping-category">
                    <h5>👁️ Appearance Attributes</h5>
                    <div class="mapping-fields">
                        ${renderAttributeMappingFields('appearance', [
                            { id: 'visualAppeal', label: 'Visual Appeal' },
                            { id: 'color', label: 'Color' },
                            { id: 'clarity', label: 'Clarity' },
                            { id: 'gloss', label: 'Gloss' }
                        ])}
                    </div>
                </div>

                <div class="mapping-category">
                    <h5>👃 Aroma Attributes</h5>
                    <div class="mapping-fields">
                        ${renderAttributeMappingFields('aroma', [
                            { id: 'aromaIntensity', label: 'Aroma Intensity' },
                            { id: 'complexity', label: 'Complexity' },
                            { id: 'pleasantness', label: 'Pleasantness' }
                        ])}
                    </div>
                </div>

                <div class="mapping-category">
                    <h5>👅 Taste Attributes</h5>
                    <div class="mapping-fields">
                        ${renderAttributeMappingFields('frontMouth', [
                            { id: 'initialTaste', label: 'Initial Taste' },
                            { id: 'sweetness', label: 'Sweetness' },
                            { id: 'sourness', label: 'Sourness' },
                            { id: 'saltiness', label: 'Saltiness' },
                            { id: 'bitterness', label: 'Bitterness' }
                        ])}
                        ${renderAttributeMappingFields('midMouth', [
                            { id: 'flavorDevelopment', label: 'Flavor Development' },
                            { id: 'texture', label: 'Texture' },
                            { id: 'richness', label: 'Richness' }
                        ])}
                    </div>
                </div>

                <div class="mapping-category">
                    <h5>🎯 Overall Attributes</h5>
                    <div class="mapping-fields">
                        ${renderAttributeMappingFields('overall', [
                            { id: 'overallSatisfaction', label: 'Overall Satisfaction' },
                            { id: 'purchaseIntent', label: 'Purchase Intent' },
                            { id: 'uniqueness', label: 'Uniqueness' }
                        ])}
                    </div>
                </div>
            </div>

            <button class="btn-primary btn-large" onclick="proceedToPreview()">
                Continue to Preview →
            </button>
        </div>
    `;
}

/**
 * Render attribute mapping fields helper
 */
function renderAttributeMappingFields(stage, attributes) {
    return attributes.map(attr => `
        <div class="mapping-field">
            <label>${attr.label}:</label>
            <select class="column-select" data-category="attributes" data-field="${stage}.${attr.id}">
                <option value="">-- Select Column --</option>
                ${batchImportData.headers.map(h => `
                    <option value="${escapeHtml(h)}">${escapeHtml(h)}</option>
                `).join('')}
            </select>
        </div>
    `).join('');
}

/**
 * Render preview section
 */
function renderPreviewSection() {
    const validationResults = validateBatchData(batchImportData.rows, batchImportData.columnMapping);
    const validRows = validationResults.filter(r => r.isValid).length;
    const invalidRows = validationResults.filter(r => !r.isValid).length;
    const warningRows = validationResults.filter(r => r.warnings.length > 0).length;

    return `
        <div class="analytics-section">
            <h4>Step 3: Preview & Validate</h4>
            <p class="section-description">Review your data before importing</p>

            ${autoEvalState.enabled && autoEvalState.preview ? renderAutoEvalPreviewSection() : ''}

            <div class="validation-summary">
                <div class="validation-stat valid">
                    <div class="validation-icon">✅</div>
                    <div class="validation-count">${validRows}</div>
                    <div class="validation-label">Valid Rows</div>
                </div>
                <div class="validation-stat invalid">
                    <div class="validation-icon">❌</div>
                    <div class="validation-count">${invalidRows}</div>
                    <div class="validation-label">Invalid Rows</div>
                </div>
                <div class="validation-stat warning">
                    <div class="validation-icon">⚠️</div>
                    <div class="validation-count">${warningRows}</div>
                    <div class="validation-label">Warnings</div>
                </div>
            </div>

            <div class="preview-table-container">
                <h5>Data Preview (First 10 Rows)</h5>
                <table class="preview-table">
                    <thead>
                        <tr>
                            <th>Status</th>
                            <th>Product Name</th>
                            <th>Brand</th>
                            <th>Category</th>
                            <th>Attributes Mapped</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${validationResults.slice(0, 10).map(result => {
                            const row = batchImportData.rows[result.rowIndex];
                            const nameCol = Object.keys(batchImportData.columnMapping.productInfo).find(
                                col => batchImportData.columnMapping.productInfo[col] === 'name'
                            );
                            const brandCol = Object.keys(batchImportData.columnMapping.productInfo).find(
                                col => batchImportData.columnMapping.productInfo[col] === 'brand'
                            );
                            const categoryCol = Object.keys(batchImportData.columnMapping.productInfo).find(
                                col => batchImportData.columnMapping.productInfo[col] === 'category'
                            );

                            const attributeCount = Object.keys(batchImportData.columnMapping.attributes || {}).length;

                            return `
                                <tr class="${result.isValid ? 'valid-row' : 'invalid-row'}">
                                    <td>
                                        ${result.isValid
                                            ? (result.warnings.length > 0 ? '⚠️' : '✅')
                                            : '❌'}
                                    </td>
                                    <td>${escapeHtml(row[nameCol] || '-')}</td>
                                    <td>${escapeHtml(row[brandCol] || '-')}</td>
                                    <td>${escapeHtml(row[categoryCol] || '-')}</td>
                                    <td>${attributeCount} mapped</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                ${validationResults.length > 10 ? `
                    <p class="preview-note">Showing 10 of ${validationResults.length} rows</p>
                ` : ''}
            </div>

            ${invalidRows > 0 || warningRows > 0 ? `
                <div class="validation-issues">
                    <h5>⚠️ Issues Found</h5>
                    ${validationResults.filter(r => !r.isValid || r.warnings.length > 0).slice(0, 20).map(result => `
                        <div class="issue-item">
                            <strong>Row ${result.rowIndex + 2}:</strong>
                            ${result.errors.map(e => `<span class="error-text">❌ ${escapeHtml(e)}</span>`).join('')}
                            ${result.warnings.map(w => `<span class="warning-text">⚠️ ${escapeHtml(w)}</span>`).join('')}
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            <div class="import-actions">
                ${validRows > 0 ? `
                    <button class="btn-primary btn-large" onclick="${autoEvalState.enabled ? 'executeImportWithAutoEval()' : 'executeImport()'}">
                        🚀 ${autoEvalState.enabled ? 'Import with Auto-Eval' : 'Import'} ${validRows} Product${validRows !== 1 ? 's' : ''}
                    </button>
                ` : ''}
                <button class="btn-secondary" onclick="goBackToMapping()">
                    ← Back to Mapping
                </button>
            </div>
        </div>
    `;
}

// ===== EVENT HANDLERS =====

/**
 * Attach event listeners
 */
function attachBatchImportEventListeners() {
    const fileInput = document.getElementById('batch-file-input');
    const uploadZone = document.getElementById('file-upload-zone');

    if (fileInput) {
        fileInput.addEventListener('change', handleBatchFileSelect);
    }

    if (uploadZone) {
        uploadZone.addEventListener('dragover', handleDragOver);
        uploadZone.addEventListener('drop', handleFileDrop);
    }

    // Column select change handlers
    document.querySelectorAll('.column-select').forEach(select => {
        select.addEventListener('change', handleColumnMappingChange);
    });
}

/**
 * Handle file selection for Batch Import
 */
async function handleBatchFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    await processUploadedFile(file);
}

/**
 * Handle drag over
 */
function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.add('drag-over');
}

/**
 * Handle file drop
 */
async function handleFileDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('drag-over');

    const file = event.dataTransfer.files[0];
    if (!file) return;

    await processUploadedFile(file);
}

/**
 * Process uploaded file
 */
async function processUploadedFile(file) {
    const extension = file.name.split('.').pop().toLowerCase();

    try {
        let result;
        if (extension === 'csv') {
            // Use FileReader for better browser compatibility
            const text = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsText(file);
            });
            result = parseCSVFile(text);
        } else if (extension === 'xlsx') {
            result = await parseExcelFile(file);
        } else {
            alert('Unsupported file format. Please upload CSV or Excel (.xlsx) files.');
            return;
        }

        if (result.error) {
            alert('Error parsing file: ' + result.error);
            return;
        }

        batchImportData.fileName = file.name;
        batchImportData.headers = result.headers;
        batchImportData.rows = result.rows;
        batchImportData.columnMapping = { productInfo: {}, attributes: {}, emotions: {} };

        renderBatchImportDashboard();
    } catch (error) {
        console.error('File processing error:', error);
        alert('Error processing file: ' + error.message);
    }
}

/**
 * Handle column mapping changes
 */
function handleColumnMappingChange(event) {
    const select = event.target;
    const category = select.dataset.category;
    const field = select.dataset.field;
    const column = select.value;

    if (!batchImportData.columnMapping[category]) {
        batchImportData.columnMapping[category] = {};
    }

    if (column) {
        // Remove this column from other mappings
        Object.keys(batchImportData.columnMapping).forEach(cat => {
            Object.keys(batchImportData.columnMapping[cat]).forEach(key => {
                if (batchImportData.columnMapping[cat][key] === column && key !== field) {
                    delete batchImportData.columnMapping[cat][key];
                }
            });
        });

        // Update mapping - store column as key, field as value
        Object.keys(batchImportData.columnMapping[category]).forEach(key => {
            if (batchImportData.columnMapping[category][key] === field) {
                delete batchImportData.columnMapping[category][key];
            }
        });
        batchImportData.columnMapping[category][column] = field;
    }
}

/**
 * Apply automatic mapping
 */
function applyAutomaticMapping() {
    const suggestedMapping = suggestColumnMapping(batchImportData.headers);
    batchImportData.columnMapping = suggestedMapping;

    // Update select elements
    document.querySelectorAll('.column-select').forEach(select => {
        const category = select.dataset.category;
        const field = select.dataset.field;

        // Find column that maps to this field
        const column = Object.keys(suggestedMapping[category] || {}).find(
            col => suggestedMapping[category][col] === field
        );

        if (column) {
            select.value = column;
        }
    });

    alert('Automatic column mapping applied! Review the mappings and adjust if needed.');
}

/**
 * Clear column mapping
 */
function clearColumnMapping() {
    batchImportData.columnMapping = { productInfo: {}, attributes: {}, emotions: {} };
    document.querySelectorAll('.column-select').forEach(select => {
        select.value = '';
    });
}

/**
 * Proceed to preview
 */
function proceedToPreview() {
    // Validate that at least product name is mapped
    const hasName = Object.values(batchImportData.columnMapping.productInfo || {}).includes('name');

    if (!hasName) {
        alert('Please map at least the Product Name field before continuing.');
        return;
    }

    // Trigger auto-eval preview if enabled
    if (autoEvalState.enabled && typeof runAutoEvalPreview === 'function') {
        runAutoEvalPreview();
    } else {
        renderBatchImportDashboard();
    }
}

/**
 * Go back to mapping
 */
function goBackToMapping() {
    renderBatchImportDashboard();
}

/**
 * Execute import
 */
function executeImport() {
    if (!confirm(`Import ${batchImportData.rows.length} products? This will add them to your portfolio.`)) {
        return;
    }

    const results = executeBatchImport(batchImportData.rows, batchImportData.columnMapping);

    let message = `Import completed!\n\n`;
    message += `✅ Successfully imported: ${results.success}\n`;
    message += `❌ Failed: ${results.failed}\n`;

    if (results.errors.length > 0) {
        message += `\nErrors:\n`;
        results.errors.slice(0, 5).forEach(err => {
            message += `Row ${err.row}: ${err.error}\n`;
        });
        if (results.errors.length > 5) {
            message += `... and ${results.errors.length - 5} more errors\n`;
        }
    }

    alert(message);

    if (results.success > 0) {
        // Reset and refresh dashboard
        resetBatchImport();
        updateDashboard();
    }
}

/**
 * Reset batch import
 */
function resetBatchImport() {
    batchImportData = {
        rawData: null,
        fileName: '',
        headers: [],
        rows: [],
        columnMapping: {},
        validationResults: [],
        importedCount: 0
    };
    renderBatchImportDashboard();
}

/**
 * Show batch import help
 */
function showBatchImportHelp() {
    const helpText = `
BATCH IMPORT GUIDE

1. PREPARE YOUR FILE
   - Use CSV (.csv) or Excel (.xlsx) format
   - First row must be column headers
   - Each subsequent row is one product

2. REQUIRED FIELDS
   - Product Name (required)
   - Other fields are optional

3. ATTRIBUTE VALUES
   - Use numbers between 1-10
   - Decimal values are supported (e.g., 7.5)
   - Leave blank for default value (5.0)

4. COLUMN NAMING
   - Use clear, descriptive column names
   - Auto-mapping works best with standard names like:
     * Product_Name, Brand, Category
     * Visual_Appeal, Aroma_Intensity
     * Overall_Satisfaction, etc.

5. AUTO-EVALUATION
   - Emotions are automatically inferred from sensory data
   - Consumer feedback can be converted to sensory profiles
   - Confidence scores show inference reliability

6. TIPS
   - Download the template for the correct format
   - Review the preview before importing
   - Fix any validation errors shown
   - Start with a small test file first

Need more help? Check the documentation or contact support.
    `;

    alert(helpText);
}

// ===== AUTO-EVALUATION UI =====

/**
 * State for auto-evaluation
 */
let autoEvalState = {
    enabled: true,
    preview: null,
    processing: false,
    filterLowConfidence: false
};

/**
 * Render auto-evaluation toggle in overview
 */
function renderAutoEvalToggle() {
    return `
        <div class="auto-eval-toggle" style="margin-top: 16px; padding: 16px; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 12px; border: 1px solid #93c5fd;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <label class="toggle-switch">
                    <input type="checkbox" id="auto-eval-toggle" ${autoEvalState.enabled ? 'checked' : ''} onchange="toggleAutoEval(this.checked)">
                    <span class="toggle-slider"></span>
                </label>
                <div>
                    <strong style="color: #1e40af;">🤖 Auto-Evaluation</strong>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: #3b82f6;">
                        Automatically infer emotions from sensory data
                    </p>
                </div>
            </div>
        </div>
    `;
}

/**
 * Toggle auto-evaluation
 */
function toggleAutoEval(enabled) {
    autoEvalState.enabled = enabled;
    console.log('Auto-evaluation:', enabled ? 'enabled' : 'disabled');
}

/**
 * Toggle low confidence filter in preview
 */
function toggleLowConfidenceFilter() {
    autoEvalState.filterLowConfidence = !autoEvalState.filterLowConfidence;
    renderBatchImportDashboard();
}

/**
 * Render auto-evaluation preview section
 */
function renderAutoEvalPreviewSection() {
    if (!autoEvalState.preview || !autoEvalState.enabled) return '';

    const preview = autoEvalState.preview;

    return `
        <div class="analytics-section" style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #86efac;">
            <h4>🤖 Auto-Evaluation Preview</h4>
            <p class="section-description">AI will automatically infer emotional profiles from your data</p>

            <div class="auto-eval-stats" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;">
                <div class="stat-box" style="background: white; padding: 16px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: #059669;">${preview.summary.total}</div>
                    <div style="font-size: 12px; color: #6b7280;">Total Rows</div>
                </div>
                <div class="stat-box" style="background: white; padding: 16px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: #10b981;">${preview.summary.highConfidence}</div>
                    <div style="font-size: 12px; color: #6b7280;">High Confidence</div>
                </div>
                <div class="stat-box" style="background: white; padding: 16px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${preview.summary.mediumConfidence}</div>
                    <div style="font-size: 12px; color: #6b7280;">Medium Confidence</div>
                </div>
                <div class="stat-box" style="background: white; padding: 16px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: #ef4444;">${preview.summary.lowConfidence}</div>
                    <div style="font-size: 12px; color: #6b7280;">Low Confidence</div>
                </div>
            </div>

            <div class="data-type-badge" style="display: inline-block; padding: 8px 16px; background: #1e40af; color: white; border-radius: 20px; font-size: 13px; margin-bottom: 16px;">
                📊 Data Type: <strong>${formatDataType(preview.dataType)}</strong>
            </div>

            <div class="preview-table-container">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h5 style="margin: 0;">Inference Preview ${autoEvalState.filterLowConfidence ? '(Low Confidence Only)' : '(First 10 Rows)'}</h5>
                    ${preview.summary.lowConfidence > 0 ? `
                        <button class="btn-secondary" style="font-size: 13px; padding: 6px 12px;" onclick="toggleLowConfidenceFilter()">
                            ${autoEvalState.filterLowConfidence ? '📋 Show All' : '⚠️ Show Low Confidence Only ('+preview.summary.lowConfidence+')'}
                        </button>
                    ` : ''}
                </div>
                <table class="preview-table" style="width: 100%;">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Inferred Need State</th>
                            <th>Top Emotions</th>
                            <th>Confidence</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(autoEvalState.filterLowConfidence ? preview.rows.filter(r => r.confidence < 0.4) : preview.rows).map(row => {
                            const confidence = getConfidenceLabel(row.confidence);
                            const needState = row.processed?.needState || 'unknown';
                            const topEmotions = getTopEmotions(row.processed);

                            return `
                                <tr>
                                    <td>${escapeHtml(row.original.name || row.original.product_name || row.original.productName || row.original.Name || row.original.Product_Name || '-')}</td>
                                    <td><span class="need-state-badge ${needState}">${formatNeedState(needState)}</span></td>
                                    <td>${topEmotions}</td>
                                    <td>
                                        <span class="confidence-badge" style="background: ${confidence.color}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                                            ${confidence.label} (${Math.round(row.confidence * 100)}%)
                                        </span>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            ${preview.rows.some(r => r.warnings && r.warnings.length > 0) ? `
                <div class="auto-eval-warnings" style="margin-top: 16px; padding: 12px; background: #fef3c7; border-radius: 8px;">
                    <strong>⚠️ Warnings:</strong>
                    <ul style="margin: 8px 0 0 20px; font-size: 13px;">
                        ${preview.rows.flatMap(r => r.warnings || []).slice(0, 5).map(w => `
                            <li>${escapeHtml(w.message)}</li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Get confidence label with color
 */
function getConfidenceLabel(confidence) {
    if (confidence >= 0.7) return { label: 'High', color: '#10b981' };
    if (confidence >= 0.4) return { label: 'Medium', color: '#f59e0b' };
    return { label: 'Low', color: '#ef4444' };
}

/**
 * Format data type for display
 */
function formatDataType(dataType) {
    const types = {
        'sensory_scores': 'Sensory Panel Data',
        'consumer_feedback': 'Consumer Feedback',
        'product_info_only': 'Product Info Only',
        'mixed': 'Mixed Data'
    };
    return types[dataType] || dataType;
}

/**
 * Format need state for display
 */
function formatNeedState(needState) {
    const states = {
        'reward': '🎁 Reward',
        'escape': '🌅 Escape',
        'rejuvenation': '⚡ Rejuvenation',
        'sociability': '👥 Sociability'
    };
    return states[needState] || needState;
}

/**
 * Get top emotions from processed experience
 */
function getTopEmotions(processed) {
    if (!processed || !processed.stages) return '-';

    const allEmotions = {};
    Object.values(processed.stages).forEach(stage => {
        if (stage.emotions) {
            Object.entries(stage.emotions).forEach(([emotion, value]) => {
                if (!allEmotions[emotion] || value > allEmotions[emotion]) {
                    allEmotions[emotion] = value;
                }
            });
        }
    });

    const top3 = Object.entries(allEmotions)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([emotion]) => emotion);

    return top3.length > 0 ? top3.join(', ') : '-';
}

/**
 * Run auto-evaluation preview
 */
async function runAutoEvalPreview() {
    if (!autoEvalState.enabled || typeof window.BatchImport === 'undefined') {
        return;
    }

    autoEvalState.processing = true;
    showAutoEvalLoading();

    try {
        autoEvalState.preview = await window.BatchImport.previewAutoEvaluation(
            batchImportData.rows,
            {
                onProgress: (progress) => {
                    showAutoEvalLoading(progress);
                }
            }
        );
        renderBatchImportDashboard();
    } catch (error) {
        console.error('Auto-eval preview failed:', error);
        autoEvalState.preview = { available: false, error: error.message };
    }

    autoEvalState.processing = false;
}

/**
 * Show loading state during auto-evaluation with optional progress
 */
function showAutoEvalLoading(progress = null) {
    const container = document.getElementById('batch-import-dashboard');
    if (!container) return;

    let progressHTML = '';
    if (progress) {
        progressHTML = `
            <div style="width: 100%; max-width: 300px; margin: 20px auto;">
                <div style="background: #e5e7eb; border-radius: 4px; overflow: hidden;">
                    <div style="width: ${progress.percent}%; background: #10b981; height: 8px; transition: width 0.3s;"></div>
                </div>
                <p style="margin-top: 10px; color: #374151;">Processing ${progress.current} of ${progress.total} rows...</p>
            </div>
        `;
    }

    container.innerHTML = `
        <div style="text-align: center; padding: 60px;">
            <div class="loading-spinner"></div>
            <p style="margin-top: 20px; color: #6b7280;">Analyzing data and inferring emotions...</p>
            ${progressHTML}
        </div>
    `;
}

/**
 * Execute import with auto-evaluation
 */
async function executeImportWithAutoEval() {
    if (!autoEvalState.enabled) {
        executeImport();
        return;
    }

    const rowCount = batchImportData.rows.length;
    if (!confirm(`Import ${rowCount} products with auto-evaluation?\n\nEmotions will be automatically inferred from your sensory data.`)) {
        return;
    }

    // Show progress
    const progressContainer = document.createElement('div');
    progressContainer.id = 'import-progress';
    progressContainer.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;">
            <div style="background: white; padding: 32px; border-radius: 16px; text-align: center; min-width: 300px;">
                <h3 style="margin: 0 0 16px 0;">🤖 Auto-Evaluating Products</h3>
                <div class="progress-bar" style="height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden;">
                    <div id="progress-fill" style="height: 100%; background: #10b981; width: 0%; transition: width 0.3s;"></div>
                </div>
                <p id="progress-text" style="margin: 12px 0 0 0; color: #6b7280;">Processing...</p>
            </div>
        </div>
    `;
    document.body.appendChild(progressContainer);

    try {
        const results = await window.BatchImport.executeBatchImportWithAutoEval(
            batchImportData.rows,
            batchImportData.columnMapping,
            {
                onProgress: (progress) => {
                    document.getElementById('progress-fill').style.width = `${progress.percent}%`;
                    document.getElementById('progress-text').textContent =
                        `Processing ${progress.current} of ${progress.total} products...`;
                }
            }
        );

        progressContainer.remove();

        // Show enhanced summary modal
        showImportSummaryModal(results);

        if (results.success > 0) {
            resetBatchImport();
            updateDashboard();
        }

    } catch (error) {
        progressContainer.remove();
        console.error('Auto-eval import failed:', error);
        alert('Import failed: ' + error.message);
    }
}

/**
 * Show enhanced import summary modal
 */
function showImportSummaryModal(results) {
    const modal = document.createElement('div');
    modal.id = 'import-summary-modal';
    modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;" onclick="closeImportSummaryModal()">
            <div style="background: white; padding: 32px; border-radius: 16px; text-align: center; min-width: 400px; max-width: 500px;" onclick="event.stopPropagation()">
                <h2 style="margin: 0 0 24px 0; color: #059669;">✅ Import Complete</h2>

                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px;">
                    <div style="background: #f0fdf4; padding: 16px; border-radius: 12px;">
                        <div style="font-size: 32px; font-weight: bold; color: #10b981;">${results.success}</div>
                        <div style="font-size: 14px; color: #6b7280;">Imported</div>
                    </div>
                    <div style="background: ${results.failed > 0 ? '#fef2f2' : '#f3f4f6'}; padding: 16px; border-radius: 12px;">
                        <div style="font-size: 32px; font-weight: bold; color: ${results.failed > 0 ? '#ef4444' : '#9ca3af'};">${results.failed}</div>
                        <div style="font-size: 14px; color: #6b7280;">Failed</div>
                    </div>
                    <div style="background: #eff6ff; padding: 16px; border-radius: 12px;">
                        <div style="font-size: 32px; font-weight: bold; color: #3b82f6;">${Math.round(results.autoEvalStats.averageConfidence * 100)}%</div>
                        <div style="font-size: 14px; color: #6b7280;">Avg Confidence</div>
                    </div>
                    <div style="background: ${results.autoEvalStats.warningCount > 0 ? '#fef3c7' : '#f3f4f6'}; padding: 16px; border-radius: 12px;">
                        <div style="font-size: 32px; font-weight: bold; color: ${results.autoEvalStats.warningCount > 0 ? '#f59e0b' : '#9ca3af'};">${results.autoEvalStats.warningCount}</div>
                        <div style="font-size: 14px; color: #6b7280;">Warnings</div>
                    </div>
                </div>

                <div style="background: #f3f4f6; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px;">
                    <span style="color: #6b7280;">Data Type:</span>
                    <strong style="color: #1f2937;">${formatDataType(results.autoEvalStats.dataType)}</strong>
                </div>

                <button class="btn-primary" style="width: 100%; padding: 12px; font-size: 16px;" onclick="closeImportSummaryModal()">
                    Done
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

/**
 * Close import summary modal
 */
function closeImportSummaryModal() {
    const modal = document.getElementById('import-summary-modal');
    if (modal) {
        modal.remove();
    }
}
