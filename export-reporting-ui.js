// ===== EXPORT & REPORTING UI MODULE =====

/**
 * Render Export & Reports Dashboard
 */
function renderExportReportsDashboard() {
    const container = document.getElementById('export-reports-container');
    if (!container) return;

    let html = '<div class="export-reports-dashboard">';

    // Overview Section
    html += renderExportOverview();

    // Quick Export Actions
    html += renderQuickExportActions();

    // Product Reports Section
    html += renderProductReportsSection();

    // Comparison Reports Section
    html += renderComparisonReportsSection();

    // Benchmark Reports Section
    html += renderBenchmarkReportsSection();

    // Portfolio Export Section
    html += renderPortfolioExportSection();

    html += '</div>';

    container.innerHTML = html;
}

/**
 * Render export overview
 */
function renderExportOverview() {
    return `
        <div class="analytics-section">
            <h4>📊 Export & Reports</h4>
            <p class="section-description">Generate professional reports and export your data in multiple formats</p>

            <div class="stat-cards">
                <div class="stat-card">
                    <div class="stat-icon">📄</div>
                    <div class="stat-content">
                        <div class="stat-label">PDF Reports</div>
                        <div class="stat-value">Professional</div>
                        <div class="stat-detail">Print-ready analysis</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📊</div>
                    <div class="stat-content">
                        <div class="stat-label">Excel Export</div>
                        <div class="stat-value">CSV Format</div>
                        <div class="stat-detail">Data for analysis</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📈</div>
                    <div class="stat-content">
                        <div class="stat-label">Chart Images</div>
                        <div class="stat-value">PNG Format</div>
                        <div class="stat-detail">High-quality graphics</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render quick export actions
 */
function renderQuickExportActions() {
    if (experiences.length === 0) {
        return `
            <div class="analytics-section">
                <h4>⚡ Quick Export</h4>
                <p class="empty-state">Log product experiences to enable exports</p>
            </div>
        `;
    }

    return `
        <div class="analytics-section">
            <h4>⚡ Quick Export</h4>
            <p class="section-description">One-click exports for your entire portfolio</p>

            <div class="export-actions-grid">
                <button class="export-action-card" onclick="exportAllProductsToExcel()">
                    <div class="export-icon">📊</div>
                    <div class="export-title">Portfolio Data (CSV)</div>
                    <div class="export-description">All products with full sensory data</div>
                </button>

                <button class="export-action-card" onclick="exportPortfolioChart()">
                    <div class="export-icon">📈</div>
                    <div class="export-title">Emotional Map (PNG)</div>
                    <div class="export-description">Portfolio positioning chart</div>
                </button>

                <button class="export-action-card" onclick="showBulkReportGenerator()">
                    <div class="export-icon">📚</div>
                    <div class="export-title">Bulk PDF Reports</div>
                    <div class="export-description">Generate reports for all products</div>
                </button>
            </div>
        </div>
    `;
}

/**
 * Render product reports section
 */
function renderProductReportsSection() {
    if (experiences.length === 0) {
        return '';
    }

    return `
        <div class="analytics-section">
            <h4>📄 Individual Product Reports</h4>
            <p class="section-description">Generate detailed sensory analysis reports for specific products</p>

            <div class="product-export-list">
                ${experiences.map(exp => `
                    <div class="product-export-item">
                        <div class="product-export-info">
                            <strong>${exp.productInfo.name}</strong>
                            <span class="product-meta">${exp.productInfo.brand} • ${exp.productInfo.category}</span>
                        </div>
                        <div class="product-export-actions">
                            <button class="btn-small btn-primary" onclick="generateProductPDFReport(${exp.id})">
                                📄 PDF Report
                            </button>
                            <button class="btn-small btn-secondary" onclick="exportProductToExcel(${exp.id})">
                                📊 Excel Export
                            </button>
                            <button class="btn-small btn-secondary" onclick="showProductChartExport(${exp.id})">
                                📈 Charts
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * Render comparison reports section
 */
function renderComparisonReportsSection() {
    if (experiences.length < 2) {
        return '';
    }

    return `
        <div class="analytics-section">
            <h4>⚖️ Comparison Reports</h4>
            <p class="section-description">Generate side-by-side comparison reports</p>

            <div class="comparison-export-form">
                <div class="form-group">
                    <label>Select Products to Compare:</label>
                    <div class="product-checkbox-list">
                        ${experiences.map(exp => `
                            <label class="checkbox-item">
                                <input type="checkbox" value="${exp.id}" class="comparison-product-checkbox">
                                ${exp.productInfo.name} - ${exp.productInfo.brand}
                            </label>
                        `).join('')}
                    </div>
                </div>

                <div class="export-actions-grid">
                    <button class="export-action-card" onclick="generateComparisonPDF()">
                        <div class="export-icon">📄</div>
                        <div class="export-title">PDF Comparison Report</div>
                        <div class="export-description">Professional comparison document</div>
                    </button>

                    <button class="export-action-card" onclick="exportComparisonExcel()">
                        <div class="export-icon">📊</div>
                        <div class="export-title">Excel Comparison Data</div>
                        <div class="export-description">Side-by-side data table</div>
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render benchmark reports section
 */
function renderBenchmarkReportsSection() {
    if (experiences.length === 0 || !window.industryBenchmarks || industryBenchmarks.length === 0) {
        return '';
    }

    return `
        <div class="analytics-section">
            <h4>🏆 Benchmark Reports</h4>
            <p class="section-description">Generate competitive positioning reports with industry benchmarks</p>

            <div class="benchmark-export-form">
                <div class="form-group">
                    <label>Select Product:</label>
                    <select id="benchmark-export-product" class="form-control">
                        <option value="">Choose a product...</option>
                        ${experiences.map(exp => `
                            <option value="${exp.id}">${exp.productInfo.name}</option>
                        `).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label>Select Benchmark:</label>
                    <select id="benchmark-export-benchmark" class="form-control">
                        <option value="">Choose a benchmark...</option>
                        ${industryBenchmarks.map(bench => `
                            <option value="${bench.id}">${bench.category} ${bench.subcategory ? `- ${bench.subcategory}` : ''}</option>
                        `).join('')}
                    </select>
                </div>

                <button class="btn-primary" onclick="generateBenchmarkReportFromUI()">
                    📄 Generate Benchmark Report
                </button>
            </div>
        </div>
    `;
}

/**
 * Render portfolio export section
 */
function renderPortfolioExportSection() {
    if (experiences.length === 0) {
        return '';
    }

    return `
        <div class="analytics-section">
            <h4>📁 Portfolio Export</h4>
            <p class="section-description">Export your complete product portfolio in various formats</p>

            <div class="export-actions-grid">
                <button class="export-action-card" onclick="exportAllProductsToExcel()">
                    <div class="export-icon">📊</div>
                    <div class="export-title">Complete Data Export</div>
                    <div class="export-description">${experiences.length} products • CSV format</div>
                </button>

                <button class="export-action-card" onclick="generatePortfolioSummaryReport()">
                    <div class="export-icon">📄</div>
                    <div class="export-title">Portfolio Summary PDF</div>
                    <div class="export-description">Executive overview of all products</div>
                </button>

                <button class="export-action-card" onclick="exportPortfolioChart()">
                    <div class="export-icon">📈</div>
                    <div class="export-title">Emotional Map Image</div>
                    <div class="export-description">Portfolio positioning visualization</div>
                </button>
            </div>
        </div>
    `;
}

// ===== EVENT HANDLERS =====

/**
 * Generate comparison PDF
 */
function generateComparisonPDF() {
    const checkboxes = document.querySelectorAll('.comparison-product-checkbox:checked');
    const productIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

    if (productIds.length < 2) {
        alert('Please select at least 2 products to compare');
        return;
    }

    generateComparisonPDFReport(productIds);
}

/**
 * Export comparison to Excel
 */
function exportComparisonExcel() {
    const checkboxes = document.querySelectorAll('.comparison-product-checkbox:checked');
    const productIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

    if (productIds.length < 2) {
        alert('Please select at least 2 products to compare');
        return;
    }

    exportComparisonToExcel(productIds);
}

/**
 * Generate benchmark report from UI
 */
function generateBenchmarkReportFromUI() {
    const productId = parseInt(document.getElementById('benchmark-export-product').value);
    const benchmarkId = document.getElementById('benchmark-export-benchmark').value;

    if (!productId || !benchmarkId) {
        alert('Please select both a product and a benchmark');
        return;
    }

    generateBenchmarkPDFReport(productId, benchmarkId);
}

/**
 * Show product chart export options
 */
function showProductChartExport(productId) {
    const experience = experiences.find(e => e.id === productId);
    if (!experience) return;

    // First navigate to the product detail to render charts
    showView('detail');
    currentExperience = experience;
    renderExperienceDetail(experience);

    // Wait for charts to render, then show export dialog
    setTimeout(() => {
        if (confirm(`Export Shape of Taste chart for "${experience.productInfo.name}"?`)) {
            exportShapeOfTasteChart(productId);
        }
    }, 500);
}

/**
 * Show bulk report generator
 */
function showBulkReportGenerator() {
    if (!confirm(`Generate PDF reports for all ${experiences.length} products? This will open ${experiences.length} new windows.`)) {
        return;
    }

    let generated = 0;
    experiences.forEach((exp, index) => {
        setTimeout(() => {
            generateProductPDFReport(exp.id);
            generated++;
        }, index * 1000); // Stagger by 1 second to avoid overwhelming browser
    });

    alert(`Generating ${experiences.length} reports. Please allow popups.`);
}

/**
 * Generate portfolio summary report
 */
function generatePortfolioSummaryReport() {
    if (experiences.length === 0) {
        alert('No products to include in portfolio report');
        return;
    }

    const reportWindow = window.open('', '_blank');
    if (!reportWindow) {
        alert('Please allow popups to generate reports');
        return;
    }

    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Portfolio Summary Report</title>
    <style>
        @page {
            size: A4;
            margin: 2cm;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }

        .report-header {
            text-align: center;
            border-bottom: 3px solid #667eea;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }

        .report-header h1 {
            color: #667eea;
            margin: 0 0 10px 0;
            font-size: 28px;
        }

        .stat-cards {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin: 30px 0;
        }

        .stat-card {
            background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }

        .stat-value {
            font-size: 32px;
            font-weight: 700;
            color: #667eea;
            margin: 10px 0;
        }

        .stat-label {
            font-size: 14px;
            color: #666;
            text-transform: uppercase;
        }

        .product-summary-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }

        .product-summary-table th {
            background: #667eea;
            color: white;
            padding: 12px;
            text-align: left;
        }

        .product-summary-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #e0e0e0;
        }

        .product-summary-table tr:nth-child(even) {
            background: #f8f9fa;
        }

        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #e0e0e0;
            text-align: center;
            color: #999;
            font-size: 12px;
        }

        @media print {
            .no-print {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="report-header">
        <h1>Product Portfolio Summary</h1>
        <div class="subtitle">Taste Signature Analysis Overview</div>
    </div>

    <div class="stat-cards">
        <div class="stat-card">
            <div class="stat-label">Total Products</div>
            <div class="stat-value">${experiences.length}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Categories</div>
            <div class="stat-value">${new Set(experiences.map(e => e.productInfo.category)).size}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Avg Overall Score</div>
            <div class="stat-value">${(experiences.reduce((sum, e) => sum + calculateOverallScore(e), 0) / experiences.length).toFixed(1)}</div>
        </div>
    </div>

    <h3>Product Summary</h3>
    <table class="product-summary-table">
        <thead>
            <tr>
                <th>Product Name</th>
                <th>Brand</th>
                <th>Category</th>
                <th>Overall Score</th>
                <th>Date Evaluated</th>
            </tr>
        </thead>
        <tbody>
            ${experiences.map(exp => `
                <tr>
                    <td><strong>${exp.productInfo.name}</strong></td>
                    <td>${exp.productInfo.brand}</td>
                    <td>${exp.productInfo.category}</td>
                    <td style="font-weight: 600; color: #667eea;">${calculateOverallScore(exp).toFixed(1)}</td>
                    <td>${new Date(exp.timestamp).toLocaleDateString()}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="footer">
        <p>Generated by Taste Signature on ${new Date().toLocaleDateString()}</p>
        <p>Professional Sensory Analysis Platform</p>
    </div>

    <div class="no-print" style="position: fixed; top: 20px; right: 20px;">
        <button onclick="window.print()" style="padding: 12px 24px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 600;">
            Print / Save as PDF
        </button>
        <button onclick="window.close()" style="padding: 12px 24px; background: #999; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 600; margin-left: 10px;">
            Close
        </button>
    </div>
</body>
</html>
    `;

    reportWindow.document.write(html);
    reportWindow.document.close();
}

// ===== ADD EXPORT BUTTONS TO EXISTING VIEWS =====

/**
 * Create export button for product detail view
 */
function createProductExportButton(productId) {
    return `
        <div class="export-actions">
            <button class="btn-secondary" onclick="showProductExportMenu(${productId})">
                📤 Export / Report
            </button>
        </div>
    `;
}

/**
 * Show product export menu
 */
function showProductExportMenu(productId) {
    const experience = experiences.find(e => e.id === productId);
    if (!experience) return;

    const options = [
        '1. PDF Report (Professional analysis)',
        '2. Excel Export (CSV data)',
        '3. Chart Image (PNG)',
        '4. Cancel'
    ];

    const choice = prompt(`Export options for "${experience.productInfo.name}":\n\n${options.join('\n')}\n\nEnter your choice (1-4):`);

    switch (choice) {
        case '1':
            generateProductPDFReport(productId);
            break;
        case '2':
            exportProductToExcel(productId);
            break;
        case '3':
            exportShapeOfTasteChart(productId);
            break;
    }
}
