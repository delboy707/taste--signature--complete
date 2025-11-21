// ===== BATCH IMPORT UI MODULE =====

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
                        <strong>File Loaded:</strong> ${batchImportData.fileName || 'Unknown'}
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
                                    <option value="${h}">${h}</option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="mapping-field">
                            <label>Brand:</label>
                            <select class="column-select" data-category="productInfo" data-field="brand">
                                <option value="">-- Select Column --</option>
                                ${batchImportData.headers.map(h => `
                                    <option value="${h}">${h}</option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="mapping-field">
                            <label>Category:</label>
                            <select class="column-select" data-category="productInfo" data-field="category">
                                <option value="">-- Select Column --</option>
                                ${batchImportData.headers.map(h => `
                                    <option value="${h}">${h}</option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="mapping-field">
                            <label>Variant/Flavor:</label>
                            <select class="column-select" data-category="productInfo" data-field="variant">
                                <option value="">-- Select Column --</option>
                                ${batchImportData.headers.map(h => `
                                    <option value="${h}">${h}</option>
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
                    <option value="${h}">${h}</option>
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
                                    <td>${row[nameCol] || '-'}</td>
                                    <td>${row[brandCol] || '-'}</td>
                                    <td>${row[categoryCol] || '-'}</td>
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
                            ${result.errors.map(e => `<span class="error-text">❌ ${e}</span>`).join('')}
                            ${result.warnings.map(w => `<span class="warning-text">⚠️ ${w}</span>`).join('')}
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            <div class="import-actions">
                ${validRows > 0 ? `
                    <button class="btn-primary btn-large" onclick="executeImport()">
                        🚀 Import ${validRows} Product${validRows !== 1 ? 's' : ''}
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
        fileInput.addEventListener('change', handleFileSelect);
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
 * Handle file selection
 */
async function handleFileSelect(event) {
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

    let result;
    if (extension === 'csv') {
        const text = await file.text();
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

    renderBatchImportDashboard();
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

5. TIPS
   - Download the template for the correct format
   - Review the preview before importing
   - Fix any validation errors shown
   - Start with a small test file first

Need more help? Check the documentation or contact support.
    `;

    alert(helpText);
}
