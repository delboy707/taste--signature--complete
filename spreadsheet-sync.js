// ===== SPREADSHEET SYNC MODULE =====
// Live sync with Excel files and Google Sheets for automated data import

// Sync configuration state
let syncConfig = {
    enabled: false,
    source: null, // 'file' | 'google-sheets' | 'url'
    interval: 30000, // 30 seconds default
    lastSync: null,
    fileHandle: null,
    sheetId: null,
    sheetUrl: null,
    columnMapping: {},
    syncTimer: null,
    syncHistory: []
};

// Column mapping presets
const COLUMN_MAPPING_PRESETS = {
    'standard': {
        name: 'Standard Sensory Format',
        mapping: {
            productName: ['Product Name', 'Name', 'Product', 'Item'],
            brand: ['Brand', 'Manufacturer', 'Company'],
            category: ['Category', 'Type', 'Product Type'],
            variant: ['Variant', 'Flavor', 'SKU', 'Description'],
            appearance: ['Appearance', 'Visual', 'Visual Appeal'],
            aroma: ['Aroma', 'Smell', 'Nose', 'Fragrance'],
            sweetness: ['Sweetness', 'Sweet'],
            sourness: ['Sourness', 'Sour', 'Acidity', 'Acid'],
            saltiness: ['Saltiness', 'Salty', 'Salt'],
            bitterness: ['Bitterness', 'Bitter'],
            umami: ['Umami', 'Savory'],
            texture: ['Texture', 'Mouthfeel', 'Body'],
            aftertaste: ['Aftertaste', 'Finish', 'Lingering'],
            overall: ['Overall', 'Total', 'Score', 'Rating'],
            notes: ['Notes', 'Comments', 'Observations']
        }
    },
    'compusense': {
        name: 'Compusense Export',
        mapping: {
            productName: ['Sample', 'Sample Name', 'Product Code'],
            panelist: ['Panelist', 'Judge', 'Assessor'],
            attribute: ['Attribute', 'Descriptor'],
            score: ['Score', 'Value', 'Rating', 'Intensity']
        }
    },
    'consumer-panel': {
        name: 'Consumer Panel Format',
        mapping: {
            respondentId: ['Respondent', 'ID', 'Panelist ID'],
            productName: ['Product', 'Sample'],
            overallLiking: ['Overall Liking', 'Liking', 'Hedonic'],
            purchaseIntent: ['Purchase Intent', 'PI', 'Would Buy'],
            appearance: ['Appearance JAR', 'Appearance'],
            flavor: ['Flavor JAR', 'Flavor', 'Taste'],
            texture: ['Texture JAR', 'Texture']
        }
    }
};

/**
 * Initialize spreadsheet sync module
 */
function initSpreadsheetSync() {
    loadSyncConfig();
    if (syncConfig.enabled && syncConfig.source) {
        startSync();
    }
}

/**
 * Load sync configuration from localStorage
 */
function loadSyncConfig() {
    const stored = localStorage.getItem('spreadsheetSyncConfig');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            syncConfig = { ...syncConfig, ...parsed };
        } catch (e) {
            console.error('Error loading sync config:', e);
        }
    }
}

/**
 * Save sync configuration to localStorage
 */
function saveSyncConfig() {
    const toSave = {
        enabled: syncConfig.enabled,
        source: syncConfig.source,
        interval: syncConfig.interval,
        sheetId: syncConfig.sheetId,
        sheetUrl: syncConfig.sheetUrl,
        columnMapping: syncConfig.columnMapping,
        lastSync: syncConfig.lastSync
    };
    localStorage.setItem('spreadsheetSyncConfig', JSON.stringify(toSave));
}

/**
 * Render spreadsheet sync UI
 */
function renderSpreadsheetSyncUI(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const lastSyncDisplay = syncConfig.lastSync ?
        new Date(syncConfig.lastSync).toLocaleString() : 'Never';

    container.innerHTML = `
        <div class="spreadsheet-sync-widget">
            <div class="sync-header">
                <h4>Spreadsheet Sync</h4>
                <div class="sync-status ${syncConfig.enabled ? 'active' : 'inactive'}">
                    <span class="status-dot"></span>
                    <span class="status-text">${syncConfig.enabled ? 'Syncing' : 'Inactive'}</span>
                </div>
            </div>

            <div class="sync-tabs">
                <button class="sync-tab active" data-tab="file">
                    <span class="tab-icon">📁</span>
                    <span>Local File</span>
                </button>
                <button class="sync-tab" data-tab="sheets">
                    <span class="tab-icon">📊</span>
                    <span>Google Sheets</span>
                </button>
                <button class="sync-tab" data-tab="url">
                    <span class="tab-icon">🔗</span>
                    <span>URL Import</span>
                </button>
            </div>

            <!-- Local File Tab -->
            <div class="sync-content" id="sync-tab-file">
                <div class="sync-info">
                    <p>Select an Excel or CSV file to watch for changes. New data will be imported automatically.</p>
                </div>

                <div class="file-drop-zone" id="sync-drop-zone">
                    <div class="drop-icon">📄</div>
                    <div class="drop-text">Drop Excel/CSV file here</div>
                    <div class="drop-hint">or click to browse</div>
                    <input type="file" id="sync-file-input" accept=".csv,.xlsx,.xls" style="display: none;">
                </div>

                <div id="selected-file-info" class="selected-file-info" style="display: none;">
                    <span class="file-icon">📄</span>
                    <span class="file-name" id="sync-file-name"></span>
                    <button class="btn-small" onclick="clearSyncFile()">✕</button>
                </div>

                ${'showOpenFilePicker' in window ? `
                <div class="file-watch-option">
                    <label class="checkbox-label">
                        <input type="checkbox" id="watch-file-changes">
                        <span>Watch file for changes (auto-reload when modified)</span>
                    </label>
                </div>
                ` : ''}
            </div>

            <!-- Google Sheets Tab -->
            <div class="sync-content" id="sync-tab-sheets" style="display: none;">
                <div class="sync-info">
                    <p>Connect to a Google Sheet for live data sync. Sheet must be publicly accessible or shared via link.</p>
                </div>

                <div class="form-group">
                    <label for="google-sheet-url">Google Sheet URL</label>
                    <input type="url" id="google-sheet-url" placeholder="https://docs.google.com/spreadsheets/d/..."
                           value="${syncConfig.sheetUrl || ''}">
                    <small>The sheet must be published to web or have link sharing enabled</small>
                </div>

                <div class="form-group">
                    <label for="sheet-name">Sheet/Tab Name (optional)</label>
                    <input type="text" id="sheet-name" placeholder="Sheet1" value="">
                    <small>Leave empty to use the first sheet</small>
                </div>

                <button class="btn-primary" onclick="connectGoogleSheet()">
                    🔗 Connect Sheet
                </button>
            </div>

            <!-- URL Import Tab -->
            <div class="sync-content" id="sync-tab-url" style="display: none;">
                <div class="sync-info">
                    <p>Import data from a URL endpoint (CSV/JSON). Useful for automated data pipelines.</p>
                </div>

                <div class="form-group">
                    <label for="import-url">Data URL</label>
                    <input type="url" id="import-url" placeholder="https://api.example.com/export.csv">
                </div>

                <div class="form-group">
                    <label for="url-format">Data Format</label>
                    <select id="url-format">
                        <option value="csv">CSV</option>
                        <option value="json">JSON</option>
                    </select>
                </div>

                <button class="btn-primary" onclick="importFromUrl()">
                    📥 Import from URL
                </button>
            </div>

            <!-- Column Mapping Section -->
            <div class="mapping-section" id="mapping-section" style="display: none;">
                <h5>Column Mapping</h5>

                <div class="mapping-preset">
                    <label>Use Preset:</label>
                    <select id="mapping-preset" onchange="applyMappingPreset(this.value)">
                        <option value="">Custom Mapping</option>
                        ${Object.entries(COLUMN_MAPPING_PRESETS).map(([key, preset]) =>
                            `<option value="${key}">${preset.name}</option>`
                        ).join('')}
                    </select>
                </div>

                <div class="mapping-grid" id="column-mapping-grid">
                    <!-- Column mappings will be rendered here -->
                </div>

                <div class="mapping-actions">
                    <button class="btn-secondary" onclick="autoDetectMapping()">
                        🔍 Auto-Detect
                    </button>
                    <button class="btn-primary" onclick="saveColumnMapping()">
                        💾 Save Mapping
                    </button>
                </div>
            </div>

            <!-- Sync Settings -->
            <div class="sync-settings">
                <h5>Sync Settings</h5>

                <div class="form-group">
                    <label for="sync-interval">Sync Interval</label>
                    <select id="sync-interval" onchange="updateSyncInterval(this.value)">
                        <option value="10000" ${syncConfig.interval === 10000 ? 'selected' : ''}>Every 10 seconds</option>
                        <option value="30000" ${syncConfig.interval === 30000 ? 'selected' : ''}>Every 30 seconds</option>
                        <option value="60000" ${syncConfig.interval === 60000 ? 'selected' : ''}>Every minute</option>
                        <option value="300000" ${syncConfig.interval === 300000 ? 'selected' : ''}>Every 5 minutes</option>
                        <option value="0">Manual only</option>
                    </select>
                </div>

                <div class="sync-controls">
                    <button class="btn-secondary" onclick="syncNow()">
                        🔄 Sync Now
                    </button>
                    <button class="btn-${syncConfig.enabled ? 'danger' : 'success'}"
                            onclick="toggleSync()" id="btn-toggle-sync">
                        ${syncConfig.enabled ? '⏹️ Stop Sync' : '▶️ Start Sync'}
                    </button>
                </div>

                <div class="last-sync-info">
                    Last synced: <span id="last-sync-time">${lastSyncDisplay}</span>
                </div>
            </div>

            <!-- Sync History -->
            <div class="sync-history">
                <h5>Recent Imports</h5>
                <div id="sync-history-list" class="history-list">
                    ${renderSyncHistory()}
                </div>
            </div>
        </div>
    `;

    attachSyncListeners();
}

/**
 * Attach event listeners for sync UI
 */
function attachSyncListeners() {
    // Tab switching
    document.querySelectorAll('.sync-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;

            document.querySelectorAll('.sync-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            document.querySelectorAll('.sync-content').forEach(content => {
                content.style.display = 'none';
            });
            document.getElementById(`sync-tab-${tabName}`).style.display = 'block';
        });
    });

    // File drop zone
    const dropZone = document.getElementById('sync-drop-zone');
    const fileInput = document.getElementById('sync-file-input');

    if (dropZone && fileInput) {
        dropZone.addEventListener('click', () => fileInput.click());

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) handleSyncFile(file);
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleSyncFile(file);
        });
    }
}

/**
 * Handle selected sync file
 */
async function handleSyncFile(file) {
    const allowedTypes = [
        'text/csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
    ];

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(csv|xlsx|xls)$/i)) {
        alert('Please select a CSV or Excel file');
        return;
    }

    // Show selected file info
    document.getElementById('selected-file-info').style.display = 'flex';
    document.getElementById('sync-file-name').textContent = file.name;
    document.getElementById('sync-drop-zone').style.display = 'none';

    syncConfig.source = 'file';

    // Parse the file to detect columns
    const data = await parseSpreadsheetFile(file);
    if (data && data.headers) {
        showColumnMapping(data.headers);
        syncConfig.pendingData = data;
    }
}

/**
 * Parse spreadsheet file (CSV or Excel)
 */
async function parseSpreadsheetFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                let headers = [];
                let rows = [];

                if (file.name.endsWith('.csv')) {
                    // Parse CSV
                    const text = e.target.result;
                    const lines = text.split('\n').filter(line => line.trim());
                    headers = parseCSVRow(lines[0]);
                    rows = lines.slice(1).map(line => parseCSVRow(line));
                } else {
                    // Parse Excel using SheetJS (XLSX)
                    if (typeof XLSX === 'undefined') {
                        alert('Excel parsing library not loaded. Please use CSV format.');
                        resolve(null);
                        return;
                    }

                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

                    headers = jsonData[0] || [];
                    rows = jsonData.slice(1);
                }

                resolve({ headers, rows, fileName: file.name });
            } catch (error) {
                console.error('Parse error:', error);
                reject(error);
            }
        };

        if (file.name.endsWith('.csv')) {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file);
        }
    });
}

/**
 * Parse CSV row handling quoted values
 */
function parseCSVRow(row) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

/**
 * Show column mapping UI
 */
function showColumnMapping(headers) {
    const section = document.getElementById('mapping-section');
    const grid = document.getElementById('column-mapping-grid');

    if (!section || !grid) return;

    section.style.display = 'block';

    const targetFields = [
        { id: 'productName', label: 'Product Name', required: true },
        { id: 'brand', label: 'Brand' },
        { id: 'category', label: 'Category' },
        { id: 'variant', label: 'Variant/Flavor' },
        { id: 'appearance', label: 'Appearance (1-10)' },
        { id: 'aroma', label: 'Aroma (1-10)' },
        { id: 'sweetness', label: 'Sweetness (1-10)' },
        { id: 'sourness', label: 'Sourness (1-10)' },
        { id: 'bitterness', label: 'Bitterness (1-10)' },
        { id: 'saltiness', label: 'Saltiness (1-10)' },
        { id: 'texture', label: 'Texture (1-10)' },
        { id: 'aftertaste', label: 'Aftertaste (1-10)' },
        { id: 'overall', label: 'Overall Score (1-10)' },
        { id: 'notes', label: 'Notes' }
    ];

    grid.innerHTML = targetFields.map(field => `
        <div class="mapping-row">
            <label>${field.label}${field.required ? ' *' : ''}</label>
            <select data-field="${field.id}" class="column-select">
                <option value="">-- Select Column --</option>
                ${headers.map((h, i) => `<option value="${i}">${h}</option>`).join('')}
            </select>
        </div>
    `).join('');

    // Auto-detect mapping
    autoDetectMapping();
}

/**
 * Auto-detect column mapping based on header names
 */
function autoDetectMapping() {
    if (!syncConfig.pendingData) return;

    const headers = syncConfig.pendingData.headers.map(h => h.toLowerCase());
    const preset = COLUMN_MAPPING_PRESETS.standard.mapping;

    document.querySelectorAll('.column-select').forEach(select => {
        const fieldId = select.dataset.field;
        const possibleNames = preset[fieldId] || [];

        for (let i = 0; i < headers.length; i++) {
            const header = headers[i];
            if (possibleNames.some(name => header.includes(name.toLowerCase()))) {
                select.value = i;
                break;
            }
        }
    });
}

/**
 * Apply mapping preset
 */
function applyMappingPreset(presetKey) {
    if (!presetKey || !syncConfig.pendingData) return;

    const preset = COLUMN_MAPPING_PRESETS[presetKey];
    if (!preset) return;

    const headers = syncConfig.pendingData.headers.map(h => h.toLowerCase());

    document.querySelectorAll('.column-select').forEach(select => {
        const fieldId = select.dataset.field;
        const possibleNames = preset.mapping[fieldId] || [];

        select.value = '';
        for (let i = 0; i < headers.length; i++) {
            const header = headers[i];
            if (possibleNames.some(name => header.includes(name.toLowerCase()))) {
                select.value = i;
                break;
            }
        }
    });
}

/**
 * Save column mapping and import data
 */
function saveColumnMapping() {
    const mapping = {};
    let hasProductName = false;

    document.querySelectorAll('.column-select').forEach(select => {
        if (select.value !== '') {
            mapping[select.dataset.field] = parseInt(select.value);
            if (select.dataset.field === 'productName') {
                hasProductName = true;
            }
        }
    });

    if (!hasProductName) {
        alert('Product Name mapping is required');
        return;
    }

    syncConfig.columnMapping = mapping;
    saveSyncConfig();

    // Import the data
    if (syncConfig.pendingData) {
        importMappedData(syncConfig.pendingData.rows, mapping);
    }
}

/**
 * Import mapped data as experiences
 */
function importMappedData(rows, mapping) {
    const imported = [];
    const errors = [];

    rows.forEach((row, index) => {
        try {
            const productName = row[mapping.productName];
            if (!productName || productName.trim() === '') {
                return; // Skip empty rows
            }

            const experience = {
                id: Date.now() + index,
                timestamp: new Date().toISOString(),
                entryMode: 'spreadsheet-sync',
                productInfo: {
                    name: productName,
                    brand: mapping.brand !== undefined ? row[mapping.brand] || '' : '',
                    type: mapping.category !== undefined ? row[mapping.category] || 'food' : 'food',
                    variant: mapping.variant !== undefined ? row[mapping.variant] || '' : ''
                },
                stages: {
                    appearance: {
                        visualAppeal: parseScore(row[mapping.appearance]) || 5,
                        colorIntensity: 5,
                        overallIntensity: parseScore(row[mapping.appearance]) || 5,
                        emotions: {}
                    },
                    aroma: {
                        intensity: parseScore(row[mapping.aroma]) || 5,
                        sweetness: parseScore(row[mapping.sweetness]) || 5,
                        complexity: 5,
                        overallIntensity: parseScore(row[mapping.aroma]) || 5,
                        emotions: {}
                    },
                    frontMouth: {
                        sweetness: parseScore(row[mapping.sweetness]) || 5,
                        sourness: parseScore(row[mapping.sourness]) || 5,
                        saltiness: parseScore(row[mapping.saltiness]) || 5,
                        texture: parseScore(row[mapping.texture]) || 5,
                        overallIntensity: 5,
                        emotions: {}
                    },
                    midRearMouth: {
                        bitterness: parseScore(row[mapping.bitterness]) || 5,
                        umami: 5,
                        richness: 5,
                        creaminess: 5,
                        overallIntensity: 5,
                        emotions: {}
                    },
                    aftertaste: {
                        duration: parseScore(row[mapping.aftertaste]) || 5,
                        pleasantness: parseScore(row[mapping.aftertaste]) || 5,
                        cleanness: 5,
                        overallIntensity: parseScore(row[mapping.aftertaste]) || 5,
                        emotions: {}
                    }
                },
                needState: 'reward',
                emotionalTriggers: { moreishness: 5, refreshment: 5, melt: 5, crunch: 5 },
                overallSatisfaction: parseScore(row[mapping.overall]) || 5,
                notes: mapping.notes !== undefined ? row[mapping.notes] || '' : ''
            };

            imported.push(experience);
        } catch (error) {
            errors.push({ row: index + 2, error: error.message });
        }
    });

    // Add to main experiences array
    if (typeof experiences !== 'undefined' && imported.length > 0) {
        experiences.push(...imported);
        saveData();
        updateDashboard();
    }

    // Record in sync history
    syncConfig.syncHistory.unshift({
        timestamp: new Date().toISOString(),
        source: syncConfig.source,
        imported: imported.length,
        errors: errors.length
    });

    // Keep only last 10 entries
    syncConfig.syncHistory = syncConfig.syncHistory.slice(0, 10);
    syncConfig.lastSync = new Date().toISOString();
    saveSyncConfig();

    // Update UI
    document.getElementById('last-sync-time').textContent = new Date().toLocaleString();
    document.getElementById('sync-history-list').innerHTML = renderSyncHistory();

    // Show notification
    showSyncNotification(`Imported ${imported.length} products${errors.length > 0 ? ` (${errors.length} errors)` : ''}`);

    return { imported: imported.length, errors };
}

/**
 * Parse score value (1-10)
 */
function parseScore(value) {
    if (value === undefined || value === null || value === '') return null;
    const num = parseFloat(value);
    if (isNaN(num)) return null;
    return Math.max(0, Math.min(10, num));
}

/**
 * Connect to Google Sheets
 */
async function connectGoogleSheet() {
    const urlInput = document.getElementById('google-sheet-url');
    const sheetNameInput = document.getElementById('sheet-name');

    const url = urlInput.value.trim();
    if (!url) {
        alert('Please enter a Google Sheet URL');
        return;
    }

    // Extract sheet ID from URL
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
        alert('Invalid Google Sheets URL. Please use the full URL from your browser.');
        return;
    }

    const sheetId = match[1];
    const sheetName = sheetNameInput.value.trim() || 'Sheet1';

    try {
        // Try to fetch the sheet as CSV (requires sheet to be published)
        const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;

        const response = await fetch(csvUrl);
        if (!response.ok) {
            throw new Error('Unable to access sheet. Make sure it is published to the web.');
        }

        const csvText = await response.text();
        const lines = csvText.split('\n').filter(line => line.trim());
        const headers = parseCSVRow(lines[0]);
        const rows = lines.slice(1).map(line => parseCSVRow(line));

        syncConfig.source = 'google-sheets';
        syncConfig.sheetId = sheetId;
        syncConfig.sheetUrl = url;
        syncConfig.pendingData = { headers, rows, fileName: `Google Sheet: ${sheetName}` };
        saveSyncConfig();

        showColumnMapping(headers);
        showSyncNotification('Google Sheet connected successfully!');

    } catch (error) {
        console.error('Google Sheets error:', error);
        alert(`Error connecting to Google Sheet: ${error.message}\n\nMake sure the sheet is published to web:\n1. File → Share → Publish to web\n2. Select the sheet and click Publish`);
    }
}

/**
 * Import from URL
 */
async function importFromUrl() {
    const urlInput = document.getElementById('import-url');
    const formatSelect = document.getElementById('url-format');

    const url = urlInput.value.trim();
    const format = formatSelect.value;

    if (!url) {
        alert('Please enter a URL');
        return;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        let headers, rows;

        if (format === 'csv') {
            const text = await response.text();
            const lines = text.split('\n').filter(line => line.trim());
            headers = parseCSVRow(lines[0]);
            rows = lines.slice(1).map(line => parseCSVRow(line));
        } else {
            const json = await response.json();
            if (Array.isArray(json) && json.length > 0) {
                headers = Object.keys(json[0]);
                rows = json.map(item => headers.map(h => item[h]));
            } else {
                throw new Error('Invalid JSON format. Expected array of objects.');
            }
        }

        syncConfig.source = 'url';
        syncConfig.pendingData = { headers, rows, fileName: url };

        showColumnMapping(headers);
        showSyncNotification('Data loaded from URL!');

    } catch (error) {
        console.error('URL import error:', error);
        alert(`Error importing from URL: ${error.message}`);
    }
}

/**
 * Clear sync file
 */
function clearSyncFile() {
    document.getElementById('selected-file-info').style.display = 'none';
    document.getElementById('sync-drop-zone').style.display = 'block';
    document.getElementById('mapping-section').style.display = 'none';
    syncConfig.pendingData = null;
    syncConfig.source = null;
}

/**
 * Start automatic sync
 */
function startSync() {
    if (syncConfig.interval === 0) return;

    syncConfig.enabled = true;
    saveSyncConfig();

    syncConfig.syncTimer = setInterval(() => {
        syncNow();
    }, syncConfig.interval);

    updateSyncStatusUI();
}

/**
 * Stop automatic sync
 */
function stopSync() {
    syncConfig.enabled = false;
    saveSyncConfig();

    if (syncConfig.syncTimer) {
        clearInterval(syncConfig.syncTimer);
        syncConfig.syncTimer = null;
    }

    updateSyncStatusUI();
}

/**
 * Toggle sync on/off
 */
function toggleSync() {
    if (syncConfig.enabled) {
        stopSync();
    } else {
        startSync();
    }
}

/**
 * Sync now (manual trigger)
 */
async function syncNow() {
    if (!syncConfig.source || !syncConfig.sheetId) {
        showSyncNotification('No sync source configured', 'warning');
        return;
    }

    if (syncConfig.source === 'google-sheets' && syncConfig.sheetId) {
        try {
            const csvUrl = `https://docs.google.com/spreadsheets/d/${syncConfig.sheetId}/gviz/tq?tqx=out:csv`;
            const response = await fetch(csvUrl);
            const csvText = await response.text();
            const lines = csvText.split('\n').filter(line => line.trim());
            const rows = lines.slice(1).map(line => parseCSVRow(line));

            if (Object.keys(syncConfig.columnMapping).length > 0) {
                importMappedData(rows, syncConfig.columnMapping);
            }
        } catch (error) {
            console.error('Sync error:', error);
            showSyncNotification('Sync failed: ' + error.message, 'error');
        }
    }
}

/**
 * Update sync interval
 */
function updateSyncInterval(value) {
    syncConfig.interval = parseInt(value);
    saveSyncConfig();

    if (syncConfig.enabled) {
        stopSync();
        if (syncConfig.interval > 0) {
            startSync();
        }
    }
}

/**
 * Update sync status UI
 */
function updateSyncStatusUI() {
    const statusEl = document.querySelector('.sync-status');
    const toggleBtn = document.getElementById('btn-toggle-sync');

    if (statusEl) {
        statusEl.className = `sync-status ${syncConfig.enabled ? 'active' : 'inactive'}`;
        statusEl.querySelector('.status-text').textContent = syncConfig.enabled ? 'Syncing' : 'Inactive';
    }

    if (toggleBtn) {
        toggleBtn.className = `btn-${syncConfig.enabled ? 'danger' : 'success'}`;
        toggleBtn.innerHTML = syncConfig.enabled ? '⏹️ Stop Sync' : '▶️ Start Sync';
    }
}

/**
 * Render sync history
 */
function renderSyncHistory() {
    if (syncConfig.syncHistory.length === 0) {
        return '<div class="history-empty">No imports yet</div>';
    }

    return syncConfig.syncHistory.map(entry => `
        <div class="history-item">
            <span class="history-time">${new Date(entry.timestamp).toLocaleString()}</span>
            <span class="history-source">${entry.source}</span>
            <span class="history-count">${entry.imported} imported</span>
            ${entry.errors > 0 ? `<span class="history-errors">${entry.errors} errors</span>` : ''}
        </div>
    `).join('');
}

/**
 * Show sync notification
 */
function showSyncNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `sync-notification ${type}`;
    notification.innerHTML = `
        <span class="notification-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : '⚠️'}</span>
        <span class="notification-message">${message}</span>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Export functions globally
window.initSpreadsheetSync = initSpreadsheetSync;
window.renderSpreadsheetSyncUI = renderSpreadsheetSyncUI;
window.handleSyncFile = handleSyncFile;
window.connectGoogleSheet = connectGoogleSheet;
window.importFromUrl = importFromUrl;
window.clearSyncFile = clearSyncFile;
window.syncNow = syncNow;
window.toggleSync = toggleSync;
window.updateSyncInterval = updateSyncInterval;
window.autoDetectMapping = autoDetectMapping;
window.applyMappingPreset = applyMappingPreset;
window.saveColumnMapping = saveColumnMapping;
