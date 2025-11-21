// ===== CONSUMER PANEL UI MODULE =====

/**
 * Render Consumer Panel Dashboard
 */
function renderConsumerPanelDashboard() {
    const container = document.getElementById('consumer-panel-container');

    if (!container) return;

    let html = '<div class="consumer-panel-dashboard">';

    // Summary Section
    const summary = getConsumerPanelSummary();
    if (summary) {
        html += renderPanelSummaryCards(summary);
    }

    // Import Section
    html += renderPanelImportSection();

    // Panel Data List
    if (consumerPanelData.length > 0) {
        html += renderPanelDataList();
    }

    // Expert vs Consumer Comparison
    html += renderExpertVsConsumerSection();

    // Reformulation Analysis
    html += renderReformulationAnalysisSection();

    // Preference Map
    if (consumerPanelData.length >= 2) {
        html += renderPreferenceMapSection();
    }

    html += '</div>';

    container.innerHTML = html;

    // Attach event listeners
    setTimeout(() => {
        attachPanelEventListeners();
        if (consumerPanelData.length >= 2) {
            renderPreferenceMapChart();
        }
    }, 100);
}

/**
 * Render summary cards
 */
function renderPanelSummaryCards(summary) {
    return `
        <div class="analytics-section">
            <h4>📊 Consumer Panel Overview</h4>
            <div class="stat-cards">
                <div class="stat-card">
                    <div class="stat-icon">👥</div>
                    <div class="stat-content">
                        <div class="stat-label">Total Panels Conducted</div>
                        <div class="stat-value">${summary.totalPanels}</div>
                        <div class="stat-detail">${summary.totalRespondents} total respondents</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📈</div>
                    <div class="stat-content">
                        <div class="stat-label">Average Sample Size</div>
                        <div class="stat-value">${summary.avgSampleSize.toFixed(0)}</div>
                        <div class="stat-detail">respondents per panel</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">⭐</div>
                    <div class="stat-content">
                        <div class="stat-label">Portfolio Avg Liking</div>
                        <div class="stat-value">${summary.avgOverallLiking.toFixed(2)}</div>
                        <div class="stat-detail">out of 9 (hedonic scale)</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🔄</div>
                    <div class="stat-content">
                        <div class="stat-label">Reformulations Tested</div>
                        <div class="stat-value">${summary.reformulationCount}</div>
                        <div class="stat-detail">${summary.productsWithPanelData} products with data</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render import section
 */
function renderPanelImportSection() {
    return `
        <div class="analytics-section">
            <h4>📥 Import Consumer Panel Data</h4>
            <p class="section-description">
                Upload CSV files with consumer panel results. Expected format: RespondentID, ProductName, OverallLiking, Appearance, Aroma, Flavor, Texture, Aftertaste, PurchaseIntent, Age, Gender, Comments
            </p>

            <div class="import-panel-form">
                <div class="form-group">
                    <label for="panel-product-link">Link to Product:</label>
                    <select id="panel-product-link" class="form-control">
                        <option value="">Select a product...</option>
                        ${experiences.map(e => `
                            <option value="${e.id}">${e.productInfo.name} - ${e.productInfo.brand}</option>
                        `).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label for="panel-date">Panel Date:</label>
                    <input type="date" id="panel-date" class="form-control" value="${new Date().toISOString().split('T')[0]}">
                </div>

                <div class="form-group">
                    <label for="panel-csv-upload">Upload CSV File:</label>
                    <input type="file" id="panel-csv-upload" accept=".csv" class="form-control">
                </div>

                <button id="btn-import-panel" class="btn-primary">
                    📊 Import Panel Data
                </button>

                <button id="btn-download-panel-template" class="btn-secondary">
                    📄 Download CSV Template
                </button>
            </div>
        </div>
    `;
}

/**
 * Render panel data list
 */
function renderPanelDataList() {
    return `
        <div class="analytics-section">
            <h4>📋 Panel Data Records</h4>
            <div class="panel-list">
                ${consumerPanelData.map(panel => `
                    <div class="panel-card">
                        <div class="panel-header">
                            <h5>${panel.productName}</h5>
                            <span class="panel-badge">${panel.sampleSize} respondents</span>
                        </div>
                        <div class="panel-info">
                            <div class="panel-stat">
                                <span>Panel Date:</span>
                                <strong>${new Date(panel.panelDate).toLocaleDateString()}</strong>
                            </div>
                            <div class="panel-stat">
                                <span>Overall Liking:</span>
                                <strong>${panel.aggregateScores.overallLiking ? panel.aggregateScores.overallLiking.mean.toFixed(2) : 'N/A'}</strong>
                            </div>
                            <div class="panel-stat">
                                <span>Top 2 Box:</span>
                                <strong>${panel.aggregateScores.overallLiking ? panel.aggregateScores.overallLiking.top2Box.toFixed(1) : 'N/A'}%</strong>
                            </div>
                            <div class="panel-stat">
                                <span>Type:</span>
                                <strong>${panel.reformulationType}</strong>
                            </div>
                        </div>
                        <div class="panel-actions">
                            <button class="btn-small btn-secondary" onclick="viewPanelDetails(${panel.id})">
                                View Details
                            </button>
                            <button class="btn-small btn-secondary" onclick="deletePanelData(${panel.id})">
                                Delete
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * Render Expert vs Consumer comparison section
 */
function renderExpertVsConsumerSection() {
    // Find products that have both expert and consumer data
    const productsWithBoth = experiences.filter(e =>
        consumerPanelData.some(p => p.productId === e.id)
    );

    if (productsWithBoth.length === 0) {
        return `
            <div class="analytics-section">
                <h4>🔬 Expert vs Consumer Comparison</h4>
                <p class="empty-state">No products have both expert evaluation and consumer panel data yet.</p>
            </div>
        `;
    }

    return `
        <div class="analytics-section">
            <h4>🔬 Expert vs Consumer Comparison</h4>
            <p class="section-description">Compare expert sensory evaluations with consumer panel results</p>

            <div class="form-group">
                <label for="comparison-product-select">Select Product:</label>
                <select id="comparison-product-select" class="form-control" onchange="updateExpertVsConsumerComparison()">
                    <option value="">Choose a product...</option>
                    ${productsWithBoth.map(e => `
                        <option value="${e.id}">${e.productInfo.name}</option>
                    `).join('')}
                </select>
            </div>

            <div id="expert-vs-consumer-results"></div>
        </div>
    `;
}

/**
 * Update expert vs consumer comparison
 */
function updateExpertVsConsumerComparison() {
    const select = document.getElementById('comparison-product-select');
    const container = document.getElementById('expert-vs-consumer-results');

    if (!select || !container) return;

    const productId = parseInt(select.value);
    if (!productId) {
        container.innerHTML = '';
        return;
    }

    const comparison = compareExpertVsConsumer(productId);
    if (!comparison) {
        container.innerHTML = '<p class="empty-state">No comparison data available</p>';
        return;
    }

    let html = `
        <div class="comparison-results">
            <div class="comparison-header">
                <h5>${comparison.productName}</h5>
                <div class="correlation-badge correlation-${comparison.correlationStrength.toLowerCase().replace(' ', '-')}">
                    ${comparison.correlationStrength} Correlation (r = ${comparison.correlation.toFixed(3)})
                </div>
            </div>

            <table class="comparison-table">
                <thead>
                    <tr>
                        <th>Attribute</th>
                        <th>Expert Rating</th>
                        <th>Consumer Mean</th>
                        <th>Difference</th>
                        <th>Agreement</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.keys(comparison.comparison).map(attr => {
                        const comp = comparison.comparison[attr];
                        const diffClass = comp.difference > 0 ? 'positive-diff' : comp.difference < 0 ? 'negative-diff' : '';
                        return `
                            <tr>
                                <td class="attribute-name">${attr.charAt(0).toUpperCase() + attr.slice(1)}</td>
                                <td>${comp.expert.toFixed(2)}</td>
                                <td>${comp.consumer.toFixed(2)}</td>
                                <td class="${diffClass}">${comp.difference > 0 ? '+' : ''}${comp.difference.toFixed(2)}</td>
                                <td><span class="agreement-badge agreement-${comp.agreement.toLowerCase()}">${comp.agreement}</span></td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>

            <div class="comparison-notes">
                <p><strong>Sample Size:</strong> ${comparison.sampleSize} consumers</p>
                <p><strong>Panel Date:</strong> ${new Date(comparison.panelDate).toLocaleDateString()}</p>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

/**
 * Render reformulation analysis section
 */
function renderReformulationAnalysisSection() {
    const reformulations = consumerPanelData.filter(p => p.reformulationType === 'reformulation');

    if (reformulations.length === 0) {
        return `
            <div class="analytics-section">
                <h4>🔄 Reformulation Impact Analysis</h4>
                <p class="empty-state">No reformulation panels tracked yet. Link panels together to track reformulation impact.</p>
            </div>
        `;
    }

    return `
        <div class="analytics-section">
            <h4>🔄 Reformulation Impact Analysis</h4>
            <p class="section-description">Track before/after consumer response to reformulations</p>

            <div class="reformulation-list">
                ${reformulations.map(reform => {
                    const original = consumerPanelData.find(p => p.id === reform.linkedOriginalPanelId);
                    if (!original) return '';

                    const analysis = analyzeReformulationImpact(original.id, reform.id);
                    if (!analysis) return '';

                    return `
                        <div class="reformulation-card">
                            <h5>${analysis.productName}</h5>
                            <div class="reform-timeline">
                                <div class="timeline-point">
                                    <strong>Original</strong>
                                    <div>${new Date(analysis.originalPanelDate).toLocaleDateString()}</div>
                                    <div class="sample-size">${analysis.originalSampleSize} respondents</div>
                                </div>
                                <div class="timeline-arrow">→</div>
                                <div class="timeline-point">
                                    <strong>Reformulated</strong>
                                    <div>${new Date(analysis.reformulatedPanelDate).toLocaleDateString()}</div>
                                    <div class="sample-size">${analysis.reformulatedSampleSize} respondents</div>
                                </div>
                            </div>

                            <table class="comparison-table">
                                <thead>
                                    <tr>
                                        <th>Attribute</th>
                                        <th>Original</th>
                                        <th>Reformed</th>
                                        <th>Change</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${Object.keys(analysis.analysis).filter(k => k !== 'purchaseIntent').map(attr => {
                                        const data = analysis.analysis[attr];
                                        const changeClass = data.change > 0 ? 'positive-change' : data.change < 0 ? 'negative-change' : '';
                                        return `
                                            <tr>
                                                <td>${attr.charAt(0).toUpperCase() + attr.slice(1)}</td>
                                                <td>${data.original.toFixed(2)}</td>
                                                <td>${data.reformulated.toFixed(2)}</td>
                                                <td class="${changeClass}">${data.change > 0 ? '+' : ''}${data.change.toFixed(2)} (${data.percentChange.toFixed(1)}%)</td>
                                                <td>
                                                    ${data.significant ?
                                                        `<span class="sig-badge">${data.interpretation}</span>` :
                                                        `<span class="insig-badge">${data.interpretation}</span>`
                                                    }
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>

                            ${analysis.analysis.purchaseIntent ? `
                                <div class="purchase-intent-summary">
                                    <strong>Purchase Intent (Top 2 Box):</strong>
                                    ${analysis.analysis.purchaseIntent.original.toFixed(1)}% → ${analysis.analysis.purchaseIntent.reformulated.toFixed(1)}%
                                    <span class="pi-change ${analysis.analysis.purchaseIntent.change > 0 ? 'positive' : analysis.analysis.purchaseIntent.change < 0 ? 'negative' : ''}">
                                        (${analysis.analysis.purchaseIntent.change > 0 ? '+' : ''}${analysis.analysis.purchaseIntent.change.toFixed(1)}%)
                                    </span>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

/**
 * Render preference map section
 */
function renderPreferenceMapSection() {
    return `
        <div class="analytics-section">
            <h4>🗺️ Preference Map</h4>
            <p class="section-description">Product positioning based on consumer liking vs sensory intensity</p>
            <div id="preference-map-container">
                <canvas id="preference-map-chart" width="600" height="400"></canvas>
            </div>
        </div>
    `;
}

/**
 * Render preference map chart
 */
function renderPreferenceMapChart() {
    const ctx = document.getElementById('preference-map-chart');
    if (!ctx) return;

    const mapData = generatePreferenceMap();

    destroyChart('preferenceMapChart');

    window.chartInstances = window.chartInstances || {};
    window.chartInstances.preferenceMapChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Products',
                data: mapData.map(d => ({
                    x: d.intensity,
                    y: d.liking,
                    label: d.productName,
                    r: Math.sqrt(d.sampleSize) * 2 // Size by sample size
                })),
                backgroundColor: 'rgba(102, 126, 234, 0.6)',
                borderColor: '#667eea',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Consumer Preference Map: Liking vs Intensity',
                    font: { size: 16, weight: 'bold' }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const point = context.raw;
                            return [
                                `${point.label}`,
                                `Intensity: ${point.x.toFixed(2)}`,
                                `Liking: ${point.y.toFixed(2)}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Sensory Intensity (Expert)'
                    },
                    min: 0,
                    max: 10
                },
                y: {
                    title: {
                        display: true,
                        text: 'Consumer Liking (1-9 Hedonic Scale)'
                    },
                    min: 0,
                    max: 9
                }
            }
        }
    });
}

/**
 * Attach event listeners
 */
function attachPanelEventListeners() {
    // Import button
    const importBtn = document.getElementById('btn-import-panel');
    if (importBtn) {
        importBtn.onclick = handlePanelImport;
    }

    // Template download button
    const templateBtn = document.getElementById('btn-download-panel-template');
    if (templateBtn) {
        templateBtn.onclick = downloadPanelTemplate;
    }
}

/**
 * Handle panel data import
 */
function handlePanelImport() {
    const fileInput = document.getElementById('panel-csv-upload');
    const productSelect = document.getElementById('panel-product-link');
    const dateInput = document.getElementById('panel-date');

    if (!fileInput.files[0]) {
        alert('Please select a CSV file to upload');
        return;
    }

    if (!productSelect.value) {
        alert('Please link this panel to a product');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const csvText = e.target.result;
            const productId = parseInt(productSelect.value);
            const panelDate = dateInput.value;

            const panelData = importConsumerPanelCSV(csvText, productId, panelDate);

            alert(`Successfully imported panel data!\n${panelData.sampleSize} consumer responses loaded.`);

            // Refresh the dashboard
            renderConsumerPanelDashboard();

        } catch (error) {
            alert(`Error importing panel data: ${error.message}`);
            console.error(error);
        }
    };

    reader.readAsText(file);
}

/**
 * Download CSV template
 */
function downloadPanelTemplate() {
    const template = `RespondentID,ProductName,OverallLiking,Appearance,Aroma,Flavor,Texture,Aftertaste,PurchaseIntent,Age,Gender,Comments
R001,Sample Product,7,8,7,6,8,7,4,25-34,Female,Tastes great!
R002,Sample Product,6,7,6,7,7,6,3,35-44,Male,Good but could be sweeter
R003,Sample Product,8,8,8,8,9,8,5,25-34,Female,Would definitely buy this!`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'consumer_panel_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

/**
 * View panel details
 */
function viewPanelDetails(panelId) {
    const panel = consumerPanelData.find(p => p.id === panelId);
    if (!panel) return;

    alert(`Panel Details for ${panel.productName}\n\nSample Size: ${panel.sampleSize}\nDate: ${new Date(panel.panelDate).toLocaleDateString()}\n\nOverall Liking: ${panel.aggregateScores.overallLiking.mean.toFixed(2)} ± ${panel.aggregateScores.overallLiking.stdDev.toFixed(2)}\nTop 2 Box: ${panel.aggregateScores.overallLiking.top2Box.toFixed(1)}%\nBottom 2 Box: ${panel.aggregateScores.overallLiking.bottom2Box.toFixed(1)}%`);
}

/**
 * Delete panel data
 */
function deletePanelData(panelId) {
    if (!confirm('Are you sure you want to delete this panel data?')) {
        return;
    }

    const index = consumerPanelData.findIndex(p => p.id === panelId);
    if (index !== -1) {
        consumerPanelData.splice(index, 1);
        saveConsumerPanelData();
        renderConsumerPanelDashboard();
    }
}
