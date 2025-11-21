// ===== CUSTOM LEXICON UI MODULE =====

/**
 * Render Custom Lexicon Dashboard
 */
function renderCustomLexiconDashboard() {
    const container = document.getElementById('lexicon-container');
    if (!container) return;

    let html = '<div class="lexicon-dashboard">';

    // Active Lexicon Display
    html += renderActiveLexiconCard();

    // Lexicon Selector
    html += renderLexiconSelector();

    // Lexicon Manager
    html += renderLexiconManager();

    // Template Gallery
    html += renderTemplateGallery();

    // Lexicon Editor (if editing)
    const editingLexiconId = sessionStorage.getItem('editingLexiconId');
    if (editingLexiconId) {
        html += renderLexiconEditor(editingLexiconId);
    }

    html += '</div>';
    container.innerHTML = html;

    // Attach event listeners
    setTimeout(() => {
        attachLexiconEventListeners();
    }, 100);
}

/**
 * Render active lexicon card
 */
function renderActiveLexiconCard() {
    const lexicon = getActiveLexicon();

    return `
        <div class="analytics-section">
            <h4>📚 Active Sensory Lexicon</h4>
            <div class="active-lexicon-card">
                <div class="lexicon-header">
                    <div>
                        <h3>${lexicon.name}</h3>
                        <p class="lexicon-meta">${lexicon.category} | Version ${lexicon.version}</p>
                        <p class="lexicon-description">${lexicon.description}</p>
                    </div>
                    ${lexicon.id !== 'default' ? `
                        <button class="btn-secondary" onclick="editLexicon('${lexicon.id}')">
                            ✏️ Edit Lexicon
                        </button>
                    ` : ''}
                </div>
                <div class="lexicon-stats">
                    <div class="lexicon-stat">
                        <span>${lexicon.stages.length}</span>
                        <label>Stages</label>
                    </div>
                    <div class="lexicon-stat">
                        <span>${lexicon.stages.reduce((sum, s) => sum + s.attributes.length, 0)}</span>
                        <label>Attributes</label>
                    </div>
                    <div class="lexicon-stat">
                        <span>${lexicon.emotionalTriggers ? lexicon.emotionalTriggers.length : 0}</span>
                        <label>Triggers</label>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render lexicon selector
 */
function renderLexiconSelector() {
    const allLexicons = getAllLexicons();
    const activeLexicon = getActiveLexicon();

    return `
        <div class="analytics-section">
            <h4>🔄 Switch Lexicon</h4>
            <p class="section-description">Change the active sensory lexicon (note: this will affect future evaluations)</p>

            <div class="lexicon-selector">
                <select id="lexicon-selector" class="form-control" onchange="handleLexiconChange(this.value)">
                    ${allLexicons.map(lex => `
                        <option value="${lex.id}" ${lex.id === activeLexicon.id ? 'selected' : ''}>
                            ${lex.name} ${lex.isCustom ? '(Custom)' : '(Default)'}
                        </option>
                    `).join('')}
                </select>
            </div>
        </div>
    `;
}

/**
 * Render lexicon manager
 */
function renderLexiconManager() {
    const customLexicons = getAllLexicons().filter(l => l.isCustom);

    return `
        <div class="analytics-section">
            <h4>📝 Manage Custom Lexicons</h4>

            <div class="lexicon-actions">
                <button class="btn-primary" onclick="showCreateLexiconDialog()">
                    ➕ Create New Lexicon
                </button>
                <button class="btn-secondary" onclick="showImportLexiconDialog()">
                    📥 Import Lexicon
                </button>
            </div>

            ${customLexicons.length > 0 ? `
                <div class="lexicon-list">
                    ${customLexicons.map(lex => `
                        <div class="lexicon-item">
                            <div class="lexicon-item-info">
                                <h5>${lex.name}</h5>
                                <p class="lexicon-item-meta">${lex.category} | ${lex.stages.length} stages, ${lex.stages.reduce((sum, s) => sum + s.attributes.length, 0)} attributes</p>
                                <p class="lexicon-item-desc">${lex.description}</p>
                            </div>
                            <div class="lexicon-item-actions">
                                <button class="btn-small btn-secondary" onclick="editLexicon('${lex.id}')">✏️ Edit</button>
                                <button class="btn-small btn-secondary" onclick="exportLexiconFile('${lex.id}')">📤 Export</button>
                                <button class="btn-small btn-danger" onclick="confirmDeleteLexicon('${lex.id}')">🗑️ Delete</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <p class="empty-state">No custom lexicons yet. Create one or use a template below.</p>
            `}
        </div>
    `;
}

/**
 * Render template gallery
 */
function renderTemplateGallery() {
    const templates = [
        { key: 'beverage', name: 'Beverage', icon: '🥤', description: 'Carbonation, liquid mouthfeel, temperature' },
        { key: 'bakery', name: 'Bakery', icon: '🍞', description: 'Crust, crumb, texture focus' },
        { key: 'dairy', name: 'Dairy', icon: '🥛', description: 'Creaminess, cultured notes, fat perception' }
    ];

    return `
        <div class="analytics-section">
            <h4>📦 Pre-Built Templates</h4>
            <p class="section-description">Start with industry-specific lexicon templates</p>

            <div class="template-gallery">
                ${templates.map(template => `
                    <div class="template-card">
                        <div class="template-icon">${template.icon}</div>
                        <h5>${template.name}</h5>
                        <p>${template.description}</p>
                        <button class="btn-secondary" onclick="useTemplate('${template.key}')">
                            Use Template
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * Render lexicon editor
 */
function renderLexiconEditor(lexiconId) {
    const lexicon = getAllLexicons().find(l => l.id === lexiconId);
    if (!lexicon) return '';

    return `
        <div class="analytics-section lexicon-editor">
            <div class="editor-header">
                <h4>✏️ Editing: ${lexicon.name}</h4>
                <button class="btn-secondary" onclick="closeLexiconEditor()">← Back to List</button>
            </div>

            <div class="editor-meta">
                <div class="form-group">
                    <label>Lexicon Name:</label>
                    <input type="text" id="edit-lexicon-name" class="form-control" value="${lexicon.name}">
                </div>
                <div class="form-group">
                    <label>Category:</label>
                    <input type="text" id="edit-lexicon-category" class="form-control" value="${lexicon.category}">
                </div>
                <div class="form-group">
                    <label>Description:</label>
                    <textarea id="edit-lexicon-description" class="form-control" rows="2">${lexicon.description}</textarea>
                </div>
                <button class="btn-primary" onclick="saveLexiconMetadata('${lexiconId}')">
                    💾 Save Metadata
                </button>
            </div>

            <div class="stages-editor">
                <h5>Stages & Attributes</h5>
                <button class="btn-secondary" onclick="addNewStage('${lexiconId}')">
                    ➕ Add Stage
                </button>

                <div class="stages-list">
                    ${lexicon.stages.map((stage, stageIndex) => `
                        <div class="stage-editor-card">
                            <div class="stage-editor-header">
                                <h6>${stage.name}</h6>
                                <button class="btn-small btn-danger" onclick="removeStage('${lexiconId}', '${stage.id}')">
                                    🗑️ Remove Stage
                                </button>
                            </div>

                            <div class="attributes-list">
                                ${stage.attributes.map((attr, attrIndex) => `
                                    <div class="attribute-editor-item">
                                        <div class="attribute-info">
                                            <strong>${attr.label}</strong>
                                            <span class="attribute-meta">${attr.type} | ${attr.min}-${attr.max} ${attr.unit}</span>
                                            <span class="attribute-desc">${attr.description}</span>
                                        </div>
                                        <button class="btn-small btn-danger" onclick="removeAttribute('${lexiconId}', '${stage.id}', '${attr.id}')">
                                            ✕
                                        </button>
                                    </div>
                                `).join('')}
                            </div>

                            <button class="btn-small btn-secondary" onclick="showAddAttributeDialog('${lexiconId}', '${stage.id}')">
                                ➕ Add Attribute
                            </button>

                            <div class="emotions-editor">
                                <strong>Emotions:</strong>
                                <div class="emotions-tags">
                                    ${stage.emotions.map(emotion => `
                                        <span class="emotion-tag">${emotion}</span>
                                    `).join('')}
                                </div>
                                <button class="btn-small btn-secondary" onclick="showAddEmotionDialog('${lexiconId}', '${stage.id}')">
                                    ➕ Add Emotion
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

/**
 * Event handlers and dialogs
 */

function handleLexiconChange(lexiconId) {
    if (confirm('Switching lexicons will affect future evaluations. Continue?')) {
        setActiveLexicon(lexiconId);
        renderCustomLexiconDashboard();
        alert('Active lexicon changed successfully!');
    } else {
        // Reset selector
        const selector = document.getElementById('lexicon-selector');
        if (selector) {
            selector.value = getActiveLexicon().id;
        }
    }
}

function showCreateLexiconDialog() {
    const name = prompt('Enter lexicon name:');
    if (!name) return;

    const category = prompt('Enter category (e.g., Beverage, Bakery, Confectionery):');
    if (!category) return;

    const description = prompt('Enter description:');
    if (!description) return;

    const newLexicon = createCustomLexicon(name, category, description);
    renderCustomLexiconDashboard();
    alert(`Lexicon "${name}" created successfully!`);
}

function editLexicon(lexiconId) {
    sessionStorage.setItem('editingLexiconId', lexiconId);
    renderCustomLexiconDashboard();
}

function closeLexiconEditor() {
    sessionStorage.removeItem('editingLexiconId');
    renderCustomLexiconDashboard();
}

function saveLexiconMetadata(lexiconId) {
    const name = document.getElementById('edit-lexicon-name').value;
    const category = document.getElementById('edit-lexicon-category').value;
    const description = document.getElementById('edit-lexicon-description').value;

    updateCustomLexicon(lexiconId, { name, category, description });
    alert('Lexicon metadata saved!');
    renderCustomLexiconDashboard();
}

function addNewStage(lexiconId) {
    const stageName = prompt('Enter stage name:');
    if (!stageName) return;

    addStageToLexicon(lexiconId, stageName);
    renderCustomLexiconDashboard();
}

function removeStage(lexiconId, stageId) {
    if (!confirm('Remove this stage? This cannot be undone.')) return;

    const lexicon = getAllLexicons().find(l => l.id === lexiconId);
    if (!lexicon) return;

    lexicon.stages = lexicon.stages.filter(s => s.id !== stageId);
    updateCustomLexicon(lexiconId, { stages: lexicon.stages });
    renderCustomLexiconDashboard();
}

function showAddAttributeDialog(lexiconId, stageId) {
    const label = prompt('Enter attribute label:');
    if (!label) return;

    const description = prompt('Enter attribute description:');

    const attribute = {
        label: label,
        type: 'slider',
        min: 1,
        max: 10,
        unit: '',
        description: description || ''
    };

    addAttributeToStage(lexiconId, stageId, attribute);
    renderCustomLexiconDashboard();
}

function removeAttribute(lexiconId, stageId, attributeId) {
    if (!confirm('Remove this attribute?')) return;

    removeAttributeFromStage(lexiconId, stageId, attributeId);
    renderCustomLexiconDashboard();
}

function showAddEmotionDialog(lexiconId, stageId) {
    const emotionName = prompt('Enter emotion name (e.g., happiness, excitement):');
    if (!emotionName) return;

    addEmotionToStage(lexiconId, stageId, emotionName);
    renderCustomLexiconDashboard();
}

function confirmDeleteLexicon(lexiconId) {
    const lexicon = getAllLexicons().find(l => l.id === lexiconId);
    if (!lexicon) return;

    if (!confirm(`Delete "${lexicon.name}"? This cannot be undone.`)) return;

    deleteCustomLexicon(lexiconId);
    renderCustomLexiconDashboard();
    alert('Lexicon deleted successfully!');
}

function exportLexiconFile(lexiconId) {
    const jsonData = exportLexicon(lexiconId);
    if (!jsonData) {
        alert('Error exporting lexicon');
        return;
    }

    const lexicon = getAllLexicons().find(l => l.id === lexiconId);
    const filename = `${lexicon.name.replace(/\s+/g, '_')}_lexicon.json`;

    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);

    alert('Lexicon exported successfully!');
}

function showImportLexiconDialog() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            const jsonString = event.target.result;
            const imported = importLexicon(jsonString);

            if (imported) {
                renderCustomLexiconDashboard();
                alert(`Lexicon "${imported.name}" imported successfully!`);
            } else {
                alert('Error importing lexicon. Please check the file format.');
            }
        };
        reader.readAsText(file);
    };

    input.click();
}

function useTemplate(templateKey) {
    const lexicon = createLexiconFromTemplate(templateKey);
    if (lexicon) {
        renderCustomLexiconDashboard();
        alert(`Template "${lexicon.name}" created successfully!`);
    } else {
        alert('Error creating lexicon from template');
    }
}

function attachLexiconEventListeners() {
    // Any additional event listeners can be attached here
}
