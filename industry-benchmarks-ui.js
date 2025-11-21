// ===== INDUSTRY BENCHMARKS UI MODULE =====

/**
 * Render Industry Benchmarks Dashboard
 */
function renderIndustryBenchmarksDashboard() {
    const container = document.getElementById('benchmarks-container');
    if (!container) return;

    let html = '<div class="benchmarks-dashboard">';

    // Overview Section
    html += renderBenchmarksOverview();

    // Available Benchmarks Library
    html += renderBenchmarksLibrary();

    // Product Comparison Tool
    html += renderProductBenchmarkComparison();

    // Competitive Positioning
    html += renderCompetitivePositioning();

    // Create Custom Benchmark
    html += renderCustomBenchmarkCreator();

    html += '</div>';

    container.innerHTML = html;

    // Attach event listeners
    setTimeout(() => {
        attachBenchmarkEventListeners();
    }, 100);
}

/**
 * Render benchmarks overview
 */
function renderBenchmarksOverview() {
    const categories = getBenchmarkCategories();
    const totalBenchmarks = industryBenchmarks.length;
    const customBenchmarks = industryBenchmarks.filter(b => b.isCustom).length;

    return `
        <div class="analytics-section">
            <h4>📊 Industry Benchmarks Overview</h4>
            <div class="stat-cards">
                <div class="stat-card">
                    <div class="stat-icon">📚</div>
                    <div class="stat-content">
                        <div class="stat-label">Available Benchmarks</div>
                        <div class="stat-value">${totalBenchmarks}</div>
                        <div class="stat-detail">${categories.length} categories</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🏭</div>
                    <div class="stat-content">
                        <div class="stat-label">Default Industry Norms</div>
                        <div class="stat-value">${totalBenchmarks - customBenchmarks}</div>
                        <div class="stat-detail">Pre-loaded standards</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">⚙️</div>
                    <div class="stat-content">
                        <div class="stat-label">Custom Benchmarks</div>
                        <div class="stat-value">${customBenchmarks}</div>
                        <div class="stat-detail">Created from your data</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render benchmarks library
 */
function renderBenchmarksLibrary() {
    const categories = getBenchmarkCategories();

    let html = `
        <div class="analytics-section">
            <h4>📖 Benchmark Library</h4>
            <p class="section-description">Industry standards and norms for various product categories</p>

            <div class="benchmarks-library">
    `;

    categories.forEach(category => {
        const categoryBenchmarks = getBenchmarksForCategory(category);

        html += `
            <div class="benchmark-category">
                <h5>${category}</h5>
                <div class="benchmark-items">
                    ${categoryBenchmarks.map(bench => `
                        <div class="benchmark-item">
                            <div class="benchmark-item-header">
                                <strong>${bench.subcategory || bench.category}</strong>
                                ${bench.isCustom ? '<span class="custom-badge">Custom</span>' : '<span class="default-badge">Industry</span>'}
                            </div>
                            <div class="benchmark-meta">
                                <span>📍 ${bench.region}</span>
                                <span>👥 ${bench.sampleSize} samples</span>
                            </div>
                            <div class="benchmark-source">
                                ${bench.dataSource}
                            </div>
                            <div class="benchmark-actions">
                                <button class="btn-small btn-secondary" onclick="viewBenchmarkDetails('${bench.id}')">
                                    👁️ View Details
                                </button>
                                <button class="btn-small btn-secondary" onclick="exportBenchmarkFile('${bench.id}')">
                                    📤 Export
                                </button>
                                ${bench.isCustom ? `
                                    <button class="btn-small btn-danger" onclick="confirmDeleteBenchmark('${bench.id}')">
                                        🗑️ Delete
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });

    html += `
            </div>
            <button class="btn-secondary" onclick="showImportBenchmarkDialog()">
                📥 Import Benchmark
            </button>
        </div>
    `;

    return html;
}

/**
 * Render product benchmark comparison
 */
function renderProductBenchmarkComparison() {
    if (experiences.length === 0) {
        return `
            <div class="analytics-section">
                <h4>🎯 Product Benchmark Comparison</h4>
                <p class="empty-state">Log product experiences to compare against industry benchmarks</p>
            </div>
        `;
    }

    return `
        <div class="analytics-section">
            <h4>🎯 Product Benchmark Comparison</h4>
            <p class="section-description">Compare your products against industry standards and see percentile rankings</p>

            <div class="comparison-selectors">
                <div class="form-group">
                    <label>Select Product:</label>
                    <select id="benchmark-product-select" class="form-control">
                        <option value="">Choose a product...</option>
                        ${experiences.map(e => `
                            <option value="${e.id}">${e.productInfo.name} - ${e.productInfo.brand}</option>
                        `).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label>Select Benchmark:</label>
                    <select id="benchmark-select" class="form-control">
                        <option value="">Choose a benchmark...</option>
                        ${industryBenchmarks.map(b => `
                            <option value="${b.id}">${b.category} ${b.subcategory ? `- ${b.subcategory}` : ''}</option>
                        `).join('')}
                    </select>
                </div>

                <button class="btn-primary" onclick="runBenchmarkComparison()">
                    Compare
                </button>
            </div>

            <div id="benchmark-comparison-results"></div>
        </div>
    `;
}

/**
 * Run benchmark comparison
 */
function runBenchmarkComparison() {
    const productId = parseInt(document.getElementById('benchmark-product-select').value);
    const benchmarkId = document.getElementById('benchmark-select').value;
    const resultsContainer = document.getElementById('benchmark-comparison-results');

    if (!productId || !benchmarkId) {
        alert('Please select both a product and a benchmark');
        return;
    }

    const comparison = compareAgainstBenchmark(productId, benchmarkId);
    if (!comparison) {
        resultsContainer.innerHTML = '<p class="empty-state">Error performing comparison</p>';
        return;
    }

    let html = `
        <div class="comparison-results-card">
            <div class="results-header">
                <h5>${comparison.productName}</h5>
                <span class="vs-text">vs</span>
                <h5>${comparison.benchmarkName}</h5>
            </div>

            ${comparison.overallSatisfaction ? `
                <div class="overall-performance">
                    <div class="performance-badge performance-${getPerformanceClass(comparison.overallSatisfaction.percentile)}">
                        ${comparison.overallSatisfaction.performance}
                    </div>
                    <div class="percentile-display">
                        <div class="percentile-value">${comparison.overallSatisfaction.percentile.toFixed(1)}<sup>th</sup></div>
                        <div class="percentile-label">Percentile</div>
                    </div>
                    <div class="score-comparison">
                        <span class="your-score">Your Score: ${comparison.overallSatisfaction.productValue.toFixed(1)}</span>
                        <span class="benchmark-score">Industry Avg: ${comparison.overallSatisfaction.benchmarkMean.toFixed(1)}</span>
                        <span class="diff ${comparison.overallSatisfaction.difference >= 0 ? 'positive' : 'negative'}">
                            ${comparison.overallSatisfaction.difference >= 0 ? '+' : ''}${comparison.overallSatisfaction.difference.toFixed(2)}
                        </span>
                    </div>
                </div>
            ` : ''}

            <h6>Attribute-by-Attribute Comparison</h6>
            <table class="benchmark-table">
                <thead>
                    <tr>
                        <th>Attribute</th>
                        <th>Your Score</th>
                        <th>Industry Avg</th>
                        <th>Difference</th>
                        <th>Percentile</th>
                        <th>Performance</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.values(comparison.attributes).map(attr => `
                        <tr>
                            <td class="attribute-name">${formatAttributeName(attr.label)}</td>
                            <td>${attr.productValue.toFixed(1)}</td>
                            <td>${attr.benchmarkMean.toFixed(1)}</td>
                            <td class="${attr.difference >= 0 ? 'positive-diff' : 'negative-diff'}">
                                ${attr.difference >= 0 ? '+' : ''}${attr.difference.toFixed(2)}
                            </td>
                            <td>
                                <div class="percentile-bar-container">
                                    <div class="percentile-bar" style="width: ${attr.percentile}%;"></div>
                                    <span class="percentile-text">${attr.percentile.toFixed(0)}%</span>
                                </div>
                            </td>
                            <td>
                                <span class="performance-badge-small performance-${getPerformanceClass(attr.percentile)}">
                                    ${attr.performance.split('(')[0].trim()}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    resultsContainer.innerHTML = html;
}

/**
 * Get performance class for styling
 */
function getPerformanceClass(percentile) {
    if (percentile >= 90) return 'exceptional';
    if (percentile >= 75) return 'above-average';
    if (percentile >= 50) return 'average';
    if (percentile >= 25) return 'below-average';
    return 'needs-improvement';
}

/**
 * Format attribute name
 */
function formatAttributeName(label) {
    return label.replace('.', ' - ').replace(/([A-Z])/g, ' $1').trim();
}

/**
 * Render competitive positioning
 */
function renderCompetitivePositioning() {
    if (experiences.length === 0) {
        return '';
    }

    return `
        <div class="analytics-section">
            <h4>🏆 Competitive Positioning</h4>
            <p class="section-description">See how your product ranks across multiple industry benchmarks</p>

            <div class="form-group">
                <label>Select Product:</label>
                <select id="positioning-product-select" class="form-control" onchange="updateCompetitivePositioning()">
                    <option value="">Choose a product...</option>
                    ${experiences.map(e => `
                        <option value="${e.id}">${e.productInfo.name}</option>
                    `).join('')}
                </select>
            </div>

            <div id="positioning-results"></div>
        </div>
    `;
}

/**
 * Update competitive positioning
 */
function updateCompetitivePositioning() {
    const select = document.getElementById('positioning-product-select');
    const container = document.getElementById('positioning-results');

    const productId = parseInt(select.value);
    if (!productId) {
        container.innerHTML = '';
        return;
    }

    const positioning = getCompetitivePositioning(productId);
    if (!positioning || positioning.rankings.length === 0) {
        container.innerHTML = '<p class="empty-state">No benchmark data available</p>';
        return;
    }

    let html = `
        <div class="positioning-card">
            <h5>${positioning.productName} - Competitive Rankings</h5>

            <div class="rankings-list">
                ${positioning.rankings.map((rank, index) => `
                    <div class="ranking-item">
                        <div class="ranking-number">#${index + 1}</div>
                        <div class="ranking-info">
                            <strong>${rank.benchmark.category} ${rank.benchmark.subcategory ? `- ${rank.benchmark.subcategory}` : ''}</strong>
                            <div class="ranking-meta">${rank.benchmark.region} | ${rank.benchmark.sampleSize} samples</div>
                        </div>
                        <div class="ranking-score">
                            <div class="percentile-display-small">
                                ${rank.avgPercentile.toFixed(0)}<sup>th</sup>
                            </div>
                            <div class="performance-badge-small performance-${getPerformanceClass(rank.avgPercentile)}">
                                ${rank.performance.split('(')[0].trim()}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    container.innerHTML = html;
}

/**
 * Render custom benchmark creator
 */
function renderCustomBenchmarkCreator() {
    if (experiences.length < 3) {
        return `
            <div class="analytics-section">
                <h4>⚙️ Create Custom Benchmark</h4>
                <p class="empty-state">Log at least 3 products to create a custom benchmark from your data</p>
            </div>
        `;
    }

    return `
        <div class="analytics-section">
            <h4>⚙️ Create Custom Benchmark</h4>
            <p class="section-description">Create benchmark norms from your own product portfolio</p>

            <div class="custom-benchmark-form">
                <div class="form-group">
                    <label>Benchmark Name:</label>
                    <input type="text" id="custom-benchmark-name" class="form-control" placeholder="e.g., Premium Dark Chocolate">
                </div>

                <div class="form-group">
                    <label>Category:</label>
                    <input type="text" id="custom-benchmark-category" class="form-control" placeholder="e.g., Chocolate">
                </div>

                <div class="form-group">
                    <label>Select Products to Include:</label>
                    <div class="product-checkbox-list">
                        ${experiences.map(e => `
                            <label class="checkbox-item">
                                <input type="checkbox" value="${e.id}" class="custom-benchmark-product">
                                ${e.productInfo.name} - ${e.productInfo.brand}
                            </label>
                        `).join('')}
                    </div>
                </div>

                <button class="btn-primary" onclick="createCustomBenchmark()">
                    Create Benchmark
                </button>
            </div>
        </div>
    `;
}

/**
 * Event handlers
 */

function createCustomBenchmark() {
    const name = document.getElementById('custom-benchmark-name').value;
    const category = document.getElementById('custom-benchmark-category').value;
    const selectedProducts = Array.from(document.querySelectorAll('.custom-benchmark-product:checked'))
        .map(cb => parseInt(cb.value));

    if (!name || !category) {
        alert('Please enter both name and category');
        return;
    }

    if (selectedProducts.length < 2) {
        alert('Please select at least 2 products');
        return;
    }

    const benchmark = createBenchmarkFromProducts(name, category, selectedProducts);
    if (benchmark) {
        alert(`Custom benchmark "${name}" created successfully with ${selectedProducts.length} products!`);
        renderIndustryBenchmarksDashboard();
    } else {
        alert('Error creating benchmark');
    }
}

function viewBenchmarkDetails(benchmarkId) {
    const benchmark = industryBenchmarks.find(b => b.id === benchmarkId);
    if (!benchmark) return;

    const details = `
Benchmark: ${benchmark.category} ${benchmark.subcategory ? `- ${benchmark.subcategory}` : ''}
Region: ${benchmark.region}
Sample Size: ${benchmark.sampleSize}
Source: ${benchmark.dataSource}

Overall Satisfaction: ${benchmark.overallSatisfaction ? benchmark.overallSatisfaction.mean.toFixed(2) : 'N/A'}

Attribute Norms:
${Object.keys(benchmark.attributeBenchmarks).map(stage =>
    `\n${stage}:\n` + Object.keys(benchmark.attributeBenchmarks[stage]).map(attr =>
        `  - ${attr}: ${benchmark.attributeBenchmarks[stage][attr].mean.toFixed(2)}`
    ).join('\n')
).join('\n')}
    `;

    alert(details);
}

function exportBenchmarkFile(benchmarkId) {
    const jsonData = exportBenchmark(benchmarkId);
    if (!jsonData) {
        alert('Error exporting benchmark');
        return;
    }

    const benchmark = industryBenchmarks.find(b => b.id === benchmarkId);
    const filename = `${benchmark.category.replace(/\s+/g, '_')}_benchmark.json`;

    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);

    alert('Benchmark exported successfully!');
}

function showImportBenchmarkDialog() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            const jsonString = event.target.result;
            const imported = importBenchmark(jsonString);

            if (imported) {
                renderIndustryBenchmarksDashboard();
                alert(`Benchmark "${imported.category}" imported successfully!`);
            } else {
                alert('Error importing benchmark. Please check the file format.');
            }
        };
        reader.readAsText(file);
    };

    input.click();
}

function confirmDeleteBenchmark(benchmarkId) {
    const benchmark = industryBenchmarks.find(b => b.id === benchmarkId);
    if (!benchmark) return;

    if (!confirm(`Delete benchmark "${benchmark.category} ${benchmark.subcategory || ''}"? This cannot be undone.`)) {
        return;
    }

    if (deleteBenchmark(benchmarkId)) {
        renderIndustryBenchmarksDashboard();
        alert('Benchmark deleted successfully!');
    } else {
        alert('Cannot delete default industry benchmarks');
    }
}

function attachBenchmarkEventListeners() {
    // Additional event listeners if needed
}
