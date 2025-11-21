// ===== TEMPORAL ANALYSIS UI MODULE =====

/**
 * Render Temporal Analysis Dashboard
 */
function renderTemporalAnalysisDashboard() {
    const container = document.getElementById('temporal-analysis-container');
    if (!container) return;

    let html = '<div class="temporal-analysis-dashboard">';

    // Overview Section
    html += renderTemporalOverview();

    // Product Selection
    const temporalProducts = getProductsWithTemporalData();
    if (temporalProducts.length > 0) {
        html += renderProductTemporalSelector();
        html += '<div id="temporal-analysis-content"></div>';
    } else {
        html += `
            <div class="analytics-section">
                <p class="empty-state">No products with multiple evaluations yet. Log the same product multiple times to track changes over time.</p>
                <div class="temporal-info-box">
                    <h5>How to Use Temporal Analysis:</h5>
                    <ol>
                        <li>Evaluate a product (e.g., "Premium Chocolate")</li>
                        <li>Wait some time (days, weeks, months)</li>
                        <li>Evaluate the same product again</li>
                        <li>Temporal Analysis will automatically track changes</li>
                    </ol>
                    <p><strong>Use Cases:</strong></p>
                    <ul>
                        <li>Shelf life studies</li>
                        <li>Batch-to-batch variation</li>
                        <li>Product stability monitoring</li>
                        <li>Reformulation tracking over time</li>
                    </ul>
                </div>
            </div>
        `;
    }

    html += '</div>';

    container.innerHTML = html;
}

/**
 * Render temporal overview
 */
function renderTemporalOverview() {
    const temporalProducts = getProductsWithTemporalData();
    const totalProducts = temporalProducts.length;
    const totalEvaluations = temporalProducts.reduce((sum, p) => sum + p.count, 0);
    const avgEvaluationsPerProduct = totalProducts > 0 ? (totalEvaluations / totalProducts).toFixed(1) : 0;

    return `
        <div class="analytics-section">
            <h4>📈 Temporal Analysis</h4>
            <p class="section-description">Track how products change over time - shelf life, batch variation, and sensory drift</p>

            <div class="stat-cards">
                <div class="stat-card">
                    <div class="stat-icon">📦</div>
                    <div class="stat-content">
                        <div class="stat-label">Products Tracked</div>
                        <div class="stat-value">${totalProducts}</div>
                        <div class="stat-detail">With multiple evaluations</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📊</div>
                    <div class="stat-content">
                        <div class="stat-label">Total Evaluations</div>
                        <div class="stat-value">${totalEvaluations}</div>
                        <div class="stat-detail">Time-series data points</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">⏱️</div>
                    <div class="stat-content">
                        <div class="stat-label">Avg Evaluations</div>
                        <div class="stat-value">${avgEvaluationsPerProduct}</div>
                        <div class="stat-detail">Per product</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render product temporal selector
 */
function renderProductTemporalSelector() {
    const temporalProducts = getProductsWithTemporalData();

    return `
        <div class="analytics-section">
            <h4>📦 Select Product to Analyze</h4>
            <p class="section-description">View time-series analysis for products with multiple evaluations</p>

            <div class="temporal-product-grid">
                ${temporalProducts.map(product => `
                    <div class="temporal-product-card" onclick="showTemporalAnalysis('${product.productName}')">
                        <div class="product-name">${product.displayName}</div>
                        <div class="product-temporal-stats">
                            <span class="eval-count">${product.count} evaluations</span>
                            <span class="time-span">${product.timeSpanDays} days</span>
                        </div>
                        <div class="product-date-range">
                            ${product.firstDate.toLocaleDateString()} → ${product.lastDate.toLocaleDateString()}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * Show temporal analysis for a product
 */
function showTemporalAnalysis(productName) {
    const container = document.getElementById('temporal-analysis-content');
    if (!container) return;

    let html = `
        <div class="temporal-analysis-results">
            <div class="results-header">
                <h4>Temporal Analysis: ${productName}</h4>
                <button class="btn-secondary" onclick="renderTemporalAnalysisDashboard()">← Back to Overview</button>
            </div>
    `;

    // Time-Series Charts
    html += renderTimeSeriesSection(productName);

    // Shelf Life Analysis
    html += renderShelfLifeAnalysis(productName);

    // Batch Variation
    html += renderBatchVariationAnalysis(productName);

    // Fresh vs Aged Comparison
    html += renderFreshVsAgedComparison(productName);

    // Significant Changes
    html += renderSignificantChanges(productName);

    html += '</div>';

    container.innerHTML = html;

    // Render charts after DOM update
    setTimeout(() => {
        renderTimeSeriesCharts(productName);
    }, 100);
}

/**
 * Render time-series section
 */
function renderTimeSeriesSection(productName) {
    const dates = getEvaluationDates(productName);

    return `
        <div class="analytics-section">
            <h5>📈 Time-Series Analysis</h5>
            <p class="section-description">Track sensory attributes over ${dates.length} evaluations</p>

            <div class="chart-selector">
                <label>Select Attributes to Display:</label>
                <select id="time-series-stage-select" class="form-control" onchange="updateTimeSeriesCharts('${productName}')">
                    <option value="all">All Attributes</option>
                    <option value="Appearance">Appearance</option>
                    <option value="Aroma">Aroma</option>
                    <option value="Front of Mouth">Front of Mouth</option>
                    <option value="Mid/Rear Mouth">Mid/Rear Mouth</option>
                    <option value="Aftertaste">Aftertaste</option>
                    <option value="Overall">Overall</option>
                </select>
            </div>

            <div id="time-series-charts-container" class="charts-container"></div>
        </div>
    `;
}

/**
 * Render time-series charts
 */
function renderTimeSeriesCharts(productName) {
    const stageSelect = document.getElementById('time-series-stage-select');
    const selectedStage = stageSelect ? stageSelect.value : 'all';

    updateTimeSeriesCharts(productName, selectedStage);
}

/**
 * Update time-series charts
 */
function updateTimeSeriesCharts(productName, selectedStage) {
    const container = document.getElementById('time-series-charts-container');
    if (!container) return;

    const allSeries = getAllAttributesTimeSeries(productName);

    // Filter by stage if not "all"
    const filteredSeries = {};
    Object.keys(allSeries).forEach(key => {
        const series = allSeries[key];
        if (selectedStage === 'all' || series.stageName === selectedStage) {
            filteredSeries[key] = series;
        }
    });

    if (Object.keys(filteredSeries).length === 0) {
        container.innerHTML = '<p class="empty-state">No data for selected stage</p>';
        return;
    }

    // Group by stage for display
    const stages = {};
    Object.keys(filteredSeries).forEach(key => {
        const series = filteredSeries[key];
        if (!stages[series.stageName]) {
            stages[series.stageName] = [];
        }
        stages[series.stageName].push({ key, ...series });
    });

    let html = '';
    Object.keys(stages).forEach(stageName => {
        html += `<div class="chart-group"><h6>${stageName}</h6>`;

        stages[stageName].forEach(series => {
            const chartId = `chart-${series.key.replace(/[^a-z0-9]/gi, '-')}`;
            const trend = calculateTrend(series.data);

            html += `
                <div class="chart-wrapper">
                    <div class="chart-header">
                        <span class="chart-title">${series.attributeLabel}</span>
                        <span class="chart-trend trend-${trend.trend}">
                            ${trend.trend === 'increasing' ? '↗️' : trend.trend === 'decreasing' ? '↘️' : '→'}
                            ${trend.change >= 0 ? '+' : ''}${trend.change.toFixed(2)}
                        </span>
                    </div>
                    <canvas id="${chartId}" class="time-series-chart"></canvas>
                </div>
            `;
        });

        html += '</div>';
    });

    container.innerHTML = html;

    // Render charts
    Object.keys(stages).forEach(stageName => {
        stages[stageName].forEach(series => {
            const chartId = `chart-${series.key.replace(/[^a-z0-9]/gi, '-')}`;
            renderSingleTimeSeriesChart(chartId, series);
        });
    });
}

/**
 * Render single time-series chart
 */
function renderSingleTimeSeriesChart(chartId, series) {
    const canvas = document.getElementById(chartId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Destroy existing chart if exists
    if (canvas.chart) {
        canvas.chart.destroy();
    }

    const data = series.data.map(d => ({
        x: d.date,
        y: d.value
    }));

    canvas.chart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: series.attributeLabel,
                data: data,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: '#667eea',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: {
                            day: 'MMM d'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    min: 0,
                    max: 10,
                    title: {
                        display: true,
                        text: 'Score'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Score: ${context.parsed.y.toFixed(1)}`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Render shelf life analysis
 */
function renderShelfLifeAnalysis(productName) {
    const shelfLife = estimateShelfLife(productName);

    if (shelfLife.status === 'insufficient_data') {
        return `
            <div class="analytics-section">
                <h5>🕐 Shelf Life Analysis</h5>
                <p class="empty-state">${shelfLife.message}</p>
            </div>
        `;
    }

    if (shelfLife.status === 'stable') {
        return `
            <div class="analytics-section">
                <h5>🕐 Shelf Life Analysis</h5>
                <div class="shelf-life-stable">
                    <div class="status-icon">✅</div>
                    <div class="status-message">
                        <strong>Product Stable</strong>
                        <p>${shelfLife.message} over ${shelfLife.timeSpanDays} days</p>
                    </div>
                </div>
            </div>
        `;
    }

    return `
        <div class="analytics-section">
            <h5>🕐 Shelf Life Analysis</h5>
            <p class="section-description">Estimated shelf life based on sensory degradation</p>

            <div class="shelf-life-warning">
                <div class="warning-header">
                    <span class="warning-icon">⚠️</span>
                    <strong>Degradation Detected</strong>
                </div>
                <div class="shelf-life-details">
                    <div class="detail-item">
                        <span class="detail-label">Limiting Attribute:</span>
                        <span class="detail-value">${shelfLife.limitingAttribute}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Current Value:</span>
                        <span class="detail-value">${shelfLife.currentValue.toFixed(1)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Acceptable Threshold:</span>
                        <span class="detail-value">${shelfLife.acceptableThreshold.toFixed(1)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Estimated Shelf Life:</span>
                        <span class="detail-value highlight">${shelfLife.estimatedShelfLifeDays} days</span>
                    </div>
                </div>

                ${shelfLife.allDegradingAttributes.length > 1 ? `
                    <div class="other-degrading">
                        <strong>Other Degrading Attributes:</strong>
                        <ul>
                            ${shelfLife.allDegradingAttributes.slice(1, 5).map(attr => `
                                <li>${attr.attribute}: ${attr.projectedDays.toFixed(0)} days</li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Render batch variation analysis
 */
function renderBatchVariationAnalysis(productName) {
    const variation = analyzeBatchVariation(productName);

    if (variation.status === 'insufficient_data') {
        return '';
    }

    return `
        <div class="analytics-section">
            <h5>📊 Batch Variation Analysis</h5>
            <p class="section-description">Consistency across evaluations</p>

            <div class="variation-summary">
                <div class="consistency-badge consistency-${variation.overallConsistency}">
                    Overall Consistency: ${variation.overallConsistency.toUpperCase()}
                </div>
            </div>

            <table class="variation-table">
                <thead>
                    <tr>
                        <th>Attribute</th>
                        <th>Mean</th>
                        <th>Std Dev</th>
                        <th>CV %</th>
                        <th>Range</th>
                        <th>Consistency</th>
                    </tr>
                </thead>
                <tbody>
                    ${variation.results.slice(0, 10).map(result => `
                        <tr>
                            <td><strong>${result.stage} - ${result.attribute}</strong></td>
                            <td>${result.mean.toFixed(2)}</td>
                            <td>${result.stdDev.toFixed(2)}</td>
                            <td>${result.cv.toFixed(1)}%</td>
                            <td>${result.min.toFixed(1)} - ${result.max.toFixed(1)}</td>
                            <td>
                                <span class="consistency-badge consistency-${result.consistency}">
                                    ${result.consistency}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ${variation.results.length > 10 ? `
                <p class="table-note">Showing top 10 most variable attributes</p>
            ` : ''}
        </div>
    `;
}

/**
 * Render fresh vs aged comparison
 */
function renderFreshVsAgedComparison(productName) {
    const comparison = compareFreshVsAged(productName);
    if (!comparison) return '';

    const significantChanges = comparison.attributeChanges
        .filter(c => Math.abs(c.change) >= 0.5)
        .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
        .slice(0, 10);

    return `
        <div class="analytics-section">
            <h5>🆚 Fresh vs Aged Comparison</h5>
            <p class="section-description">Changes over ${comparison.timeSpanDays} days</p>

            <div class="comparison-timeline">
                <div class="timeline-point">
                    <div class="timeline-label">Fresh</div>
                    <div class="timeline-date">${comparison.fresh.date.toLocaleDateString()}</div>
                </div>
                <div class="timeline-arrow">→</div>
                <div class="timeline-point">
                    <div class="timeline-label">Aged</div>
                    <div class="timeline-date">${comparison.aged.date.toLocaleDateString()}</div>
                </div>
            </div>

            ${significantChanges.length > 0 ? `
                <h6>Significant Changes (top 10):</h6>
                <table class="changes-table">
                    <thead>
                        <tr>
                            <th>Attribute</th>
                            <th>Fresh</th>
                            <th>Aged</th>
                            <th>Change</th>
                            <th>% Change</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${significantChanges.map(change => `
                            <tr>
                                <td><strong>${change.stage} - ${change.attribute}</strong></td>
                                <td>${change.freshValue.toFixed(1)}</td>
                                <td>${change.agedValue.toFixed(1)}</td>
                                <td class="${change.change >= 0 ? 'positive-change' : 'negative-change'}">
                                    ${change.change >= 0 ? '+' : ''}${change.change.toFixed(2)}
                                </td>
                                <td class="${change.changePercent >= 0 ? 'positive-change' : 'negative-change'}">
                                    ${change.changePercent >= 0 ? '+' : ''}${change.changePercent.toFixed(1)}%
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : '<p class="empty-state">No significant changes detected</p>'}
        </div>
    `;
}

/**
 * Render significant changes
 */
function renderSignificantChanges(productName) {
    const changes = detectSignificantChanges(productName, 1.0);

    if (changes.length === 0) {
        return '';
    }

    return `
        <div class="analytics-section">
            <h5>⚡ Significant Changes Detected</h5>
            <p class="section-description">Attributes with changes ≥ 1.0 points</p>

            <div class="significant-changes-grid">
                ${changes.slice(0, 6).map(change => `
                    <div class="change-card severity-${change.severity}">
                        <div class="change-icon">
                            ${change.trend === 'increasing' ? '↗️' : '↘️'}
                        </div>
                        <div class="change-info">
                            <strong>${change.stage}</strong>
                            <div>${change.attribute}</div>
                        </div>
                        <div class="change-value ${change.change >= 0 ? 'positive' : 'negative'}">
                            ${change.change >= 0 ? '+' : ''}${change.change.toFixed(2)}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}
