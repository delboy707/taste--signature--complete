// ===== RECIPE/FORMULATION TRACKER UI MODULE =====

/**
 * Render Recipe Tracker Dashboard
 */
function renderRecipeTrackerDashboard() {
    const container = document.getElementById('recipe-tracker-container');
    if (!container) return;

    let html = '<div class="recipe-tracker-dashboard">';

    // Overview Section
    html += renderRecipeTrackerOverview();

    // Product Formulations List
    html += renderProductFormulationsList();

    // Formulation Comparison
    if (formulations.length >= 2) {
        html += renderFormulationComparison();
    }

    html += '</div>';

    container.innerHTML = html;
}

/**
 * Render overview section
 */
function renderRecipeTrackerOverview() {
    const totalFormulations = formulations.length;
    const linkedProducts = new Set(formulations.map(f => f.productId)).size;
    const avgIngredientsPerFormulation = totalFormulations > 0
        ? (formulations.reduce((sum, f) => sum + f.ingredients.length, 0) / totalFormulations).toFixed(1)
        : 0;

    return `
        <div class="analytics-section">
            <h4>🧪 Recipe & Formulation Tracker</h4>
            <p class="section-description">Link sensory profiles to product formulations and track ingredient changes</p>

            <div class="stat-cards">
                <div class="stat-card">
                    <div class="stat-icon">📋</div>
                    <div class="stat-content">
                        <div class="stat-label">Total Formulations</div>
                        <div class="stat-value">${totalFormulations}</div>
                        <div class="stat-detail">${linkedProducts} products</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🥄</div>
                    <div class="stat-content">
                        <div class="stat-label">Avg Ingredients</div>
                        <div class="stat-value">${avgIngredientsPerFormulation}</div>
                        <div class="stat-detail">Per formulation</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🔄</div>
                    <div class="stat-content">
                        <div class="stat-label">Versions</div>
                        <div class="stat-value">${formulations.filter(f => f.version !== '1.0').length}</div>
                        <div class="stat-detail">Reformulations tracked</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render product formulations list
 */
function renderProductFormulationsList() {
    if (experiences.length === 0) {
        return `
            <div class="analytics-section">
                <h4>📦 Product Formulations</h4>
                <p class="empty-state">Log product experiences first to create formulations</p>
            </div>
        `;
    }

    return `
        <div class="analytics-section">
            <h4>📦 Product Formulations</h4>
            <p class="section-description">Create and manage formulations for your products</p>

            <div class="formulation-list">
                ${experiences.map(exp => {
                    const productFormulations = getFormulationsForProduct(exp.id);
                    return `
                        <div class="product-formulation-card">
                            <div class="product-formulation-header">
                                <h5>${exp.productInfo.name}</h5>
                                <span class="formulation-count">${productFormulations.length} formulation${productFormulations.length !== 1 ? 's' : ''}</span>
                            </div>

                            ${productFormulations.length > 0 ? `
                                <div class="formulations-list">
                                    ${productFormulations.map(form => `
                                        <div class="formulation-item">
                                            <div class="formulation-info">
                                                <strong>${form.name}</strong>
                                                <span class="formulation-version">v${form.version}</span>
                                                <span class="formulation-status status-${form.status}">${form.status}</span>
                                            </div>
                                            <div class="formulation-meta">
                                                <span>${form.ingredients.length} ingredients</span>
                                                <span>$${form.costAnalysis.totalCost.toFixed(2)}</span>
                                                <span>${new Date(form.createdDate).toLocaleDateString()}</span>
                                            </div>
                                            <div class="formulation-actions">
                                                <button class="btn-small btn-primary" onclick="viewFormulation(${form.id})">
                                                    👁️ View
                                                </button>
                                                <button class="btn-small btn-secondary" onclick="editFormulation(${form.id})">
                                                    ✏️ Edit
                                                </button>
                                                <button class="btn-small btn-secondary" onclick="cloneFormulationDialog(${form.id})">
                                                    📋 Clone
                                                </button>
                                                <button class="btn-small btn-danger" onclick="deleteFormulationDialog(${form.id})">
                                                    🗑️ Delete
                                                </button>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}

                            <button class="btn-secondary" onclick="createFormulationDialog(${exp.id})">
                                ➕ Create Formulation
                            </button>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

/**
 * Render formulation comparison
 */
function renderFormulationComparison() {
    return `
        <div class="analytics-section">
            <h4>🔄 Formulation Comparison</h4>
            <p class="section-description">Compare two formulations to see ingredient and cost changes</p>

            <div class="comparison-selectors">
                <div class="form-group">
                    <label>Formulation 1:</label>
                    <select id="comparison-formulation-1" class="form-control">
                        <option value="">Select formulation...</option>
                        ${formulations.map(f => `
                            <option value="${f.id}">${f.productName} - ${f.name} (v${f.version})</option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Formulation 2:</label>
                    <select id="comparison-formulation-2" class="form-control">
                        <option value="">Select formulation...</option>
                        ${formulations.map(f => `
                            <option value="${f.id}">${f.productName} - ${f.name} (v${f.version})</option>
                        `).join('')}
                    </select>
                </div>
                <button class="btn-primary" onclick="runFormulationComparison()">
                    Compare
                </button>
            </div>

            <div id="formulation-comparison-results"></div>
        </div>
    `;
}

// ===== FORMULATION DIALOGS =====

/**
 * Create formulation dialog
 */
function createFormulationDialog(productId) {
    const product = experiences.find(e => e.id === productId);
    if (!product) return;

    const existingFormulations = getFormulationsForProduct(productId);
    const suggestedVersion = existingFormulations.length === 0
        ? "1.0"
        : `${existingFormulations.length + 1}.0`;

    const name = prompt(`Enter formulation name for "${product.productInfo.name}":`, `Original Formula`);
    if (!name) return;

    const version = prompt('Enter version number:', suggestedVersion);
    if (!version) return;

    const formulation = createFormulation(productId, name, version);
    if (formulation) {
        alert(`Formulation "${name}" created successfully!`);
        renderRecipeTrackerDashboard();
    }
}

/**
 * View formulation
 */
function viewFormulation(formulationId) {
    const formulation = formulations.find(f => f.id === formulationId);
    if (!formulation) return;

    const modalHtml = `
        <div class="modal-overlay" onclick="closeFormulationModal()">
            <div class="modal-content formulation-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>${formulation.productName} - ${formulation.name} (v${formulation.version})</h3>
                    <button class="modal-close" onclick="closeFormulationModal()">✕</button>
                </div>

                <div class="modal-body">
                    <div class="formulation-details">
                        <div class="detail-section">
                            <h4>📋 Formulation Info</h4>
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <span class="detail-label">Status:</span>
                                    <span class="formulation-status status-${formulation.status}">${formulation.status}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Created:</span>
                                    <span>${new Date(formulation.createdDate).toLocaleDateString()}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Total Cost:</span>
                                    <span>$${formulation.costAnalysis.totalCost.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div class="detail-section">
                            <h4>🥄 Ingredients (${formulation.ingredients.length})</h4>
                            ${formulation.ingredients.length > 0 ? `
                                <table class="ingredients-table">
                                    <thead>
                                        <tr>
                                            <th>Ingredient</th>
                                            <th>Category</th>
                                            <th>Percentage</th>
                                            <th>Amount</th>
                                            <th>Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${formulation.ingredients.map(ing => `
                                            <tr>
                                                <td><strong>${ing.name}</strong></td>
                                                <td>${ing.category}</td>
                                                <td>${ing.percentage.toFixed(1)}%</td>
                                                <td>${ing.amount || '-'}</td>
                                                <td>$${ing.cost.toFixed(2)}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                                <div class="ingredient-total">
                                    <strong>Total:</strong> ${formulation.ingredients.reduce((sum, i) => sum + i.percentage, 0).toFixed(1)}%
                                </div>
                            ` : '<p class="empty-state">No ingredients added</p>'}
                        </div>

                        ${formulation.processingSteps.length > 0 ? `
                            <div class="detail-section">
                                <h4>⚙️ Processing Steps</h4>
                                <ol class="processing-steps">
                                    ${formulation.processingSteps.map(step => `
                                        <li>
                                            <strong>${step.description}</strong>
                                            ${step.duration ? `<br><small>Duration: ${step.duration}</small>` : ''}
                                            ${step.temperature ? `<br><small>Temperature: ${step.temperature}</small>` : ''}
                                            ${step.equipment ? `<br><small>Equipment: ${step.equipment}</small>` : ''}
                                        </li>
                                    `).join('')}
                                </ol>
                            </div>
                        ` : ''}

                        ${formulation.notes ? `
                            <div class="detail-section">
                                <h4>📝 Notes</h4>
                                <p>${formulation.notes}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn-primary" onclick="editFormulation(${formulationId}); closeFormulationModal();">
                        Edit Formulation
                    </button>
                    <button class="btn-secondary" onclick="closeFormulationModal()">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

/**
 * Edit formulation
 */
function editFormulation(formulationId) {
    const formulation = formulations.find(f => f.id === formulationId);
    if (!formulation) return;

    const modalHtml = `
        <div class="modal-overlay" onclick="closeFormulationModal()">
            <div class="modal-content formulation-edit-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>Edit: ${formulation.name}</h3>
                    <button class="modal-close" onclick="closeFormulationModal()">✕</button>
                </div>

                <div class="modal-body">
                    <div class="form-section">
                        <h4>Basic Information</h4>
                        <div class="form-group">
                            <label>Formulation Name:</label>
                            <input type="text" id="edit-formulation-name" class="form-control" value="${formulation.name}">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Version:</label>
                                <input type="text" id="edit-formulation-version" class="form-control" value="${formulation.version}">
                            </div>
                            <div class="form-group">
                                <label>Status:</label>
                                <select id="edit-formulation-status" class="form-control">
                                    <option value="development" ${formulation.status === 'development' ? 'selected' : ''}>Development</option>
                                    <option value="testing" ${formulation.status === 'testing' ? 'selected' : ''}>Testing</option>
                                    <option value="production" ${formulation.status === 'production' ? 'selected' : ''}>Production</option>
                                    <option value="discontinued" ${formulation.status === 'discontinued' ? 'selected' : ''}>Discontinued</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>Ingredients</h4>
                        <div id="ingredients-editor">
                            ${formulation.ingredients.map(ing => `
                                <div class="ingredient-editor-row" data-ingredient-id="${ing.id}">
                                    <input type="text" class="ingredient-name" value="${ing.name}" placeholder="Ingredient name">
                                    <select class="ingredient-category">
                                        ${ingredientCategories.map(cat => `
                                            <option value="${cat}" ${ing.category === cat ? 'selected' : ''}>${cat}</option>
                                        `).join('')}
                                    </select>
                                    <input type="number" class="ingredient-percentage" value="${ing.percentage}" min="0" max="100" step="0.1" placeholder="%">
                                    <input type="text" class="ingredient-amount" value="${ing.amount}" placeholder="Amount">
                                    <input type="number" class="ingredient-cost" value="${ing.cost}" min="0" step="0.01" placeholder="Cost">
                                    <button class="btn-small btn-danger" onclick="removeIngredientRow('${ing.id}')">🗑️</button>
                                </div>
                            `).join('')}
                        </div>
                        <button class="btn-secondary" onclick="addIngredientRow()">➕ Add Ingredient</button>
                    </div>

                    <div class="form-section">
                        <h4>Notes</h4>
                        <textarea id="edit-formulation-notes" class="form-control" rows="4">${formulation.notes || ''}</textarea>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn-primary" onclick="saveFormulationEdits(${formulationId})">
                        Save Changes
                    </button>
                    <button class="btn-secondary" onclick="closeFormulationModal()">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

/**
 * Add ingredient row
 */
function addIngredientRow() {
    const container = document.getElementById('ingredients-editor');
    const newId = 'new_' + Date.now();

    const html = `
        <div class="ingredient-editor-row" data-ingredient-id="${newId}">
            <input type="text" class="ingredient-name" placeholder="Ingredient name">
            <select class="ingredient-category">
                ${ingredientCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
            </select>
            <input type="number" class="ingredient-percentage" min="0" max="100" step="0.1" placeholder="%">
            <input type="text" class="ingredient-amount" placeholder="Amount">
            <input type="number" class="ingredient-cost" min="0" step="0.01" placeholder="Cost">
            <button class="btn-small btn-danger" onclick="removeIngredientRow('${newId}')">🗑️</button>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', html);
}

/**
 * Remove ingredient row
 */
function removeIngredientRow(ingredientId) {
    const row = document.querySelector(`[data-ingredient-id="${ingredientId}"]`);
    if (row) {
        row.remove();
    }
}

/**
 * Save formulation edits
 */
function saveFormulationEdits(formulationId) {
    const formulation = formulations.find(f => f.id === formulationId);
    if (!formulation) return;

    // Update basic info
    formulation.name = document.getElementById('edit-formulation-name').value;
    formulation.version = document.getElementById('edit-formulation-version').value;
    formulation.status = document.getElementById('edit-formulation-status').value;
    formulation.notes = document.getElementById('edit-formulation-notes').value;

    // Update ingredients
    formulation.ingredients = [];
    document.querySelectorAll('.ingredient-editor-row').forEach(row => {
        const name = row.querySelector('.ingredient-name').value;
        if (!name.trim()) return;

        const ingredient = {
            id: row.dataset.ingredientId.startsWith('new_') ? Date.now() + Math.random() : row.dataset.ingredientId,
            name: name,
            category: row.querySelector('.ingredient-category').value,
            percentage: parseFloat(row.querySelector('.ingredient-percentage').value) || 0,
            amount: row.querySelector('.ingredient-amount').value,
            cost: parseFloat(row.querySelector('.ingredient-cost').value) || 0,
            notes: ''
        };

        formulation.ingredients.push(ingredient);
    });

    updateFormulationCost(formulationId);
    saveFormulations();

    alert('Formulation updated successfully!');
    closeFormulationModal();
    renderRecipeTrackerDashboard();
}

/**
 * Clone formulation dialog
 */
function cloneFormulationDialog(formulationId) {
    const formulation = formulations.find(f => f.id === formulationId);
    if (!formulation) return;

    const name = prompt(`Enter name for cloned formulation:`, `${formulation.name} - Copy`);
    if (!name) return;

    const version = prompt('Enter version number:', formulation.version);
    if (!version) return;

    const cloned = cloneFormulation(formulationId, name, version);
    if (cloned) {
        alert(`Formulation cloned successfully as "${name}"!`);
        renderRecipeTrackerDashboard();
    }
}

/**
 * Delete formulation dialog
 */
function deleteFormulationDialog(formulationId) {
    const formulation = formulations.find(f => f.id === formulationId);
    if (!formulation) return;

    if (!confirm(`Delete formulation "${formulation.name}"? This cannot be undone.`)) {
        return;
    }

    deleteFormulation(formulationId);
    alert('Formulation deleted successfully!');
    renderRecipeTrackerDashboard();
}

/**
 * Close formulation modal
 */
function closeFormulationModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

/**
 * Run formulation comparison
 */
function runFormulationComparison() {
    const f1Id = parseFloat(document.getElementById('comparison-formulation-1').value);
    const f2Id = parseFloat(document.getElementById('comparison-formulation-2').value);

    if (!f1Id || !f2Id) {
        alert('Please select two formulations to compare');
        return;
    }

    if (f1Id === f2Id) {
        alert('Please select two different formulations');
        return;
    }

    const comparison = compareFormulations(f1Id, f2Id);
    if (!comparison) {
        alert('Error comparing formulations');
        return;
    }

    const resultsContainer = document.getElementById('formulation-comparison-results');

    let html = `
        <div class="comparison-results">
            <h5>Comparison Results</h5>

            <div class="comparison-summary">
                <div class="comparison-item">
                    <strong>${comparison.formulation1.name} (v${comparison.formulation1.version})</strong>
                    <span>${comparison.formulation1.ingredients.length} ingredients • $${comparison.formulation1.costAnalysis.totalCost.toFixed(2)}</span>
                </div>
                <div class="vs-text">vs</div>
                <div class="comparison-item">
                    <strong>${comparison.formulation2.name} (v${comparison.formulation2.version})</strong>
                    <span>${comparison.formulation2.ingredients.length} ingredients • $${comparison.formulation2.costAnalysis.totalCost.toFixed(2)}</span>
                </div>
            </div>

            <div class="cost-change">
                <strong>Cost Change:</strong>
                <span class="${comparison.costChange >= 0 ? 'cost-increase' : 'cost-decrease'}">
                    ${comparison.costChange >= 0 ? '+' : ''}$${comparison.costChange.toFixed(2)}
                    (${comparison.costChangePercent >= 0 ? '+' : ''}${comparison.costChangePercent.toFixed(1)}%)
                </span>
            </div>

            ${comparison.ingredientChanges.added.length > 0 ? `
                <div class="ingredient-changes">
                    <h6>✅ Added Ingredients (${comparison.ingredientChanges.added.length})</h6>
                    <ul>
                        ${comparison.ingredientChanges.added.map(ing => `
                            <li>${ing.name} - ${ing.percentage.toFixed(1)}%</li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}

            ${comparison.ingredientChanges.removed.length > 0 ? `
                <div class="ingredient-changes">
                    <h6>❌ Removed Ingredients (${comparison.ingredientChanges.removed.length})</h6>
                    <ul>
                        ${comparison.ingredientChanges.removed.map(ing => `
                            <li>${ing.name} - ${ing.percentage.toFixed(1)}%</li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}

            ${comparison.ingredientChanges.modified.length > 0 ? `
                <div class="ingredient-changes">
                    <h6>🔄 Modified Ingredients (${comparison.ingredientChanges.modified.length})</h6>
                    <table class="changes-table">
                        <thead>
                            <tr>
                                <th>Ingredient</th>
                                <th>Property</th>
                                <th>Before</th>
                                <th>After</th>
                                <th>Change</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${comparison.ingredientChanges.modified.flatMap(mod =>
                                Object.keys(mod.changes).map(prop => `
                                    <tr>
                                        <td>${mod.name}</td>
                                        <td>${prop}</td>
                                        <td>${mod.changes[prop].old}</td>
                                        <td>${mod.changes[prop].new}</td>
                                        <td class="${mod.changes[prop].change >= 0 ? 'positive-change' : 'negative-change'}">
                                            ${prop === 'percentage' || prop === 'cost'
                                                ? (mod.changes[prop].change >= 0 ? '+' : '') + mod.changes[prop].change.toFixed(2)
                                                : '-'}
                                        </td>
                                    </tr>
                                `)
                            ).join('')}
                        </tbody>
                    </table>
                </div>
            ` : ''}
        </div>
    `;

    resultsContainer.innerHTML = html;
}
