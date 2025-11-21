// ===== EXPORT & REPORTING MODULE =====

/**
 * Export & Reporting System
 * Generates professional reports, exports data to Excel, and exports charts as images
 */

// ===== PDF REPORT GENERATION =====

/**
 * Generate comprehensive PDF report for a product
 */
async function generateProductPDFReport(productId) {
    const experience = experiences.find(e => e.id === productId);
    if (!experience) {
        console.error('Product not found');
        return null;
    }

    // For now, create a simplified HTML-based report that can be printed to PDF
    // This avoids external dependencies and works with browser print-to-PDF
    return generatePrintableReport(experience, 'product');
}

/**
 * Generate comparison PDF report
 */
async function generateComparisonPDFReport(productIds) {
    if (!productIds || productIds.length < 2) {
        console.error('Need at least 2 products for comparison');
        return null;
    }

    const products = productIds.map(id => experiences.find(e => e.id === id)).filter(Boolean);
    if (products.length < 2) {
        console.error('Products not found');
        return null;
    }

    return generatePrintableReport(products, 'comparison');
}

/**
 * Generate benchmark comparison PDF report
 */
async function generateBenchmarkPDFReport(productId, benchmarkId) {
    const comparison = compareAgainstBenchmark(productId, benchmarkId);
    if (!comparison) {
        console.error('Benchmark comparison failed');
        return null;
    }

    return generatePrintableReport({ productId, benchmarkId, comparison }, 'benchmark');
}

/**
 * Generate printable HTML report (works with browser print-to-PDF)
 */
function generatePrintableReport(data, reportType) {
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) {
        alert('Please allow popups to generate reports');
        return null;
    }

    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Taste Signature Report</title>
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

        .report-header .subtitle {
            color: #666;
            font-size: 14px;
        }

        .product-info {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }

        .product-info h2 {
            margin: 0 0 15px 0;
            color: #333;
        }

        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }

        .info-item {
            display: flex;
            flex-direction: column;
        }

        .info-label {
            font-weight: 600;
            color: #666;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 5px;
        }

        .info-value {
            color: #333;
            font-size: 16px;
        }

        .section {
            margin-bottom: 40px;
            page-break-inside: avoid;
        }

        .section h3 {
            color: #667eea;
            border-bottom: 2px solid #e3f2fd;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }

        .scores-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        .scores-table th {
            background: #667eea;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
        }

        .scores-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #e0e0e0;
        }

        .scores-table tr:nth-child(even) {
            background: #f8f9fa;
        }

        .score-bar {
            height: 20px;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            border-radius: 4px;
            position: relative;
        }

        .score-value {
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            color: white;
            font-weight: 600;
            font-size: 12px;
        }

        .emotions-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-top: 15px;
        }

        .emotion-chip {
            background: #e3f2fd;
            color: #667eea;
            padding: 8px 12px;
            border-radius: 20px;
            text-align: center;
            font-size: 14px;
            font-weight: 500;
        }

        .summary-box {
            background: #fff3e0;
            border-left: 4px solid #ff9800;
            padding: 20px;
            margin: 20px 0;
        }

        .summary-box h4 {
            margin: 0 0 10px 0;
            color: #ff9800;
        }

        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #e0e0e0;
            text-align: center;
            color: #999;
            font-size: 12px;
        }

        .benchmark-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 14px;
            margin: 5px 0;
        }

        .badge-exceptional {
            background: #d4edda;
            color: #155724;
        }

        .badge-above-average {
            background: #d1ecf1;
            color: #0c5460;
        }

        .badge-average {
            background: #fff3cd;
            color: #856404;
        }

        .badge-below-average {
            background: #f8d7da;
            color: #721c24;
        }

        .comparison-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin: 20px 0;
        }

        .comparison-card {
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            padding: 15px;
        }

        @media print {
            body {
                padding: 0;
            }

            .no-print {
                display: none;
            }

            .page-break {
                page-break-before: always;
            }
        }
    </style>
</head>
<body>
    `;

    // Generate content based on report type
    if (reportType === 'product') {
        html += generateProductReportContent(data);
    } else if (reportType === 'comparison') {
        html += generateComparisonReportContent(data);
    } else if (reportType === 'benchmark') {
        html += generateBenchmarkReportContent(data);
    }

    html += `
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

    return true;
}

/**
 * Generate product report content
 */
function generateProductReportContent(experience) {
    const overall = calculateOverallScore(experience);

    let html = `
    <div class="report-header">
        <h1>Product Sensory Analysis Report</h1>
        <div class="subtitle">Comprehensive Taste Signature Evaluation</div>
    </div>

    <div class="product-info">
        <h2>${experience.productInfo.name}</h2>
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">Brand</span>
                <span class="info-value">${experience.productInfo.brand}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Category</span>
                <span class="info-value">${experience.productInfo.category}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Evaluation Date</span>
                <span class="info-value">${new Date(experience.timestamp).toLocaleDateString()}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Overall Score</span>
                <span class="info-value">${overall.toFixed(1)} / 10</span>
            </div>
        </div>
    </div>

    <div class="summary-box">
        <h4>Executive Summary</h4>
        <p>${generateExecutiveSummary(experience)}</p>
    </div>
    `;

    // Sensory Attributes Section
    html += `
    <div class="section">
        <h3>Sensory Attributes Analysis</h3>
        <table class="scores-table">
            <thead>
                <tr>
                    <th>Stage</th>
                    <th>Attribute</th>
                    <th style="width: 200px;">Score</th>
                </tr>
            </thead>
            <tbody>
    `;

    experience.stages.forEach(stage => {
        const stageRowspan = stage.attributes.length;
        stage.attributes.forEach((attr, idx) => {
            html += `<tr>`;
            if (idx === 0) {
                html += `<td rowspan="${stageRowspan}" style="font-weight: 600; background: #f0f0f0;">${stage.name}</td>`;
            }
            html += `
                <td>${attr.label}</td>
                <td>
                    <div class="score-bar" style="width: ${attr.value * 10}%;">
                        <span class="score-value">${attr.value.toFixed(1)}</span>
                    </div>
                </td>
            </tr>
            `;
        });
    });

    html += `
            </tbody>
        </table>
    </div>
    `;

    // Emotional Mapping Section
    html += `
    <div class="section">
        <h3>Emotional Response Mapping</h3>
    `;

    experience.stages.forEach(stage => {
        if (stage.emotions && stage.emotions.length > 0) {
            html += `
                <h4>${stage.name}</h4>
                <div class="emotions-grid">
                    ${stage.emotions.map(em => `<div class="emotion-chip">${em}</div>`).join('')}
                </div>
            `;
        }
    });

    html += `</div>`;

    // Notes Section
    if (experience.notes) {
        html += `
        <div class="section">
            <h3>Taster Notes</h3>
            <p style="background: #f8f9fa; padding: 15px; border-radius: 6px; white-space: pre-wrap;">${experience.notes}</p>
        </div>
        `;
    }

    return html;
}

/**
 * Generate comparison report content
 */
function generateComparisonReportContent(products) {
    let html = `
    <div class="report-header">
        <h1>Product Comparison Report</h1>
        <div class="subtitle">Side-by-Side Sensory Analysis</div>
    </div>
    `;

    // Product Overview
    html += `
    <div class="section">
        <h3>Products Being Compared</h3>
        <div class="comparison-grid">
    `;

    products.forEach(product => {
        const overall = calculateOverallScore(product);
        html += `
            <div class="comparison-card">
                <h4 style="margin: 0 0 10px 0; color: #667eea;">${product.productInfo.name}</h4>
                <p style="margin: 5px 0; color: #666;"><strong>Brand:</strong> ${product.productInfo.brand}</p>
                <p style="margin: 5px 0; color: #666;"><strong>Category:</strong> ${product.productInfo.category}</p>
                <p style="margin: 5px 0;"><strong>Overall Score:</strong> ${overall.toFixed(1)} / 10</p>
            </div>
        `;
    });

    html += `
        </div>
    </div>
    `;

    // Attribute Comparison
    html += `
    <div class="section page-break">
        <h3>Attribute Comparison</h3>
        <table class="scores-table">
            <thead>
                <tr>
                    <th>Stage</th>
                    <th>Attribute</th>
                    ${products.map(p => `<th>${p.productInfo.name}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
    `;

    // Get all unique attributes across products
    const allAttributes = new Map();
    products[0].stages.forEach(stage => {
        stage.attributes.forEach(attr => {
            const key = `${stage.name}::${attr.label}`;
            if (!allAttributes.has(key)) {
                allAttributes.set(key, { stage: stage.name, label: attr.label });
            }
        });
    });

    allAttributes.forEach((attrInfo, key) => {
        html += `<tr>`;
        html += `<td style="font-weight: 600;">${attrInfo.stage}</td>`;
        html += `<td>${attrInfo.label}</td>`;

        products.forEach(product => {
            const stage = product.stages.find(s => s.name === attrInfo.stage);
            const attr = stage ? stage.attributes.find(a => a.label === attrInfo.label) : null;
            const value = attr ? attr.value : 0;

            html += `
                <td>
                    <div class="score-bar" style="width: ${value * 10}%;">
                        <span class="score-value">${value.toFixed(1)}</span>
                    </div>
                </td>
            `;
        });

        html += `</tr>`;
    });

    html += `
            </tbody>
        </table>
    </div>
    `;

    return html;
}

/**
 * Generate benchmark report content
 */
function generateBenchmarkReportContent(data) {
    const { comparison } = data;
    const experience = experiences.find(e => e.id === data.productId);

    let html = `
    <div class="report-header">
        <h1>Industry Benchmark Comparison Report</h1>
        <div class="subtitle">Competitive Positioning Analysis</div>
    </div>

    <div class="product-info">
        <h2>${comparison.productName}</h2>
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">Benchmark Category</span>
                <span class="info-value">${comparison.benchmarkName}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Overall Percentile</span>
                <span class="info-value">${comparison.overallSatisfaction.percentile.toFixed(1)}th</span>
            </div>
            <div class="info-item">
                <span class="info-label">Performance Rating</span>
                <span class="info-value">${comparison.overallSatisfaction.performance}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Evaluation Date</span>
                <span class="info-value">${new Date(experience.timestamp).toLocaleDateString()}</span>
            </div>
        </div>
    </div>

    <div class="summary-box">
        <h4>Performance Summary</h4>
        <p>Your product scores at the <strong>${comparison.overallSatisfaction.percentile.toFixed(1)}th percentile</strong>
        compared to industry standards, with an overall score of <strong>${comparison.overallSatisfaction.productValue.toFixed(1)}</strong>
        versus the industry average of <strong>${comparison.overallSatisfaction.benchmarkMean.toFixed(1)}</strong>.</p>
        <div class="benchmark-badge badge-${getPerformanceClass(comparison.overallSatisfaction.percentile)}">
            ${comparison.overallSatisfaction.performance}
        </div>
    </div>

    <div class="section">
        <h3>Detailed Attribute Benchmarking</h3>
        <table class="scores-table">
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
    `;

    Object.values(comparison.attributes).forEach(attr => {
        const perfClass = getPerformanceClass(attr.percentile);
        html += `
            <tr>
                <td style="font-weight: 600;">${attr.label.replace('.', ' - ')}</td>
                <td>${attr.productValue.toFixed(1)}</td>
                <td>${attr.benchmarkMean.toFixed(1)}</td>
                <td style="color: ${attr.difference >= 0 ? '#27ae60' : '#e74c3c'}; font-weight: 600;">
                    ${attr.difference >= 0 ? '+' : ''}${attr.difference.toFixed(2)}
                </td>
                <td>${attr.percentile.toFixed(0)}th</td>
                <td>
                    <span class="benchmark-badge badge-${perfClass}">
                        ${attr.performance.split('(')[0].trim()}
                    </span>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    </div>
    `;

    return html;
}

/**
 * Generate executive summary
 */
function generateExecutiveSummary(experience) {
    const overall = calculateOverallScore(experience);
    const topAttributes = experience.stages.flatMap(s => s.attributes)
        .sort((a, b) => b.value - a.value)
        .slice(0, 3);

    const topEmotions = experience.stages.flatMap(s => s.emotions || [])
        .slice(0, 5);

    let summary = `This product achieved an overall sensory score of ${overall.toFixed(1)} out of 10. `;
    summary += `Key strengths include ${topAttributes.map(a => a.label.toLowerCase()).join(', ')}. `;

    if (topEmotions.length > 0) {
        summary += `The product evokes emotional responses such as ${topEmotions.join(', ')}.`;
    }

    return summary;
}

// ===== EXCEL EXPORT =====

/**
 * Export product data to Excel (CSV format for simplicity)
 */
function exportProductToExcel(productId) {
    const experience = experiences.find(e => e.id === productId);
    if (!experience) return null;

    let csv = 'Taste Signature - Product Export\n\n';
    csv += `Product Name,${experience.productInfo.name}\n`;
    csv += `Brand,${experience.productInfo.brand}\n`;
    csv += `Category,${experience.productInfo.category}\n`;
    csv += `Date,${new Date(experience.timestamp).toLocaleDateString()}\n\n`;

    csv += 'Sensory Attributes\n';
    csv += 'Stage,Attribute,Score (1-10)\n';

    experience.stages.forEach(stage => {
        stage.attributes.forEach(attr => {
            csv += `${stage.name},${attr.label},${attr.value}\n`;
        });
    });

    csv += '\nEmotional Responses\n';
    csv += 'Stage,Emotions\n';
    experience.stages.forEach(stage => {
        if (stage.emotions && stage.emotions.length > 0) {
            csv += `${stage.name},"${stage.emotions.join(', ')}"\n`;
        }
    });

    if (experience.notes) {
        csv += '\nNotes\n';
        csv += `"${experience.notes}"\n`;
    }

    downloadCSV(csv, `${experience.productInfo.name}_sensory_data.csv`);
    return true;
}

/**
 * Export all products to Excel
 */
function exportAllProductsToExcel() {
    if (experiences.length === 0) return null;

    let csv = 'Taste Signature - Complete Portfolio Export\n\n';
    csv += 'Product Name,Brand,Category,Date,Overall Score,';

    // Get all unique attributes
    const allAttributes = new Set();
    experiences.forEach(exp => {
        exp.stages.forEach(stage => {
            stage.attributes.forEach(attr => {
                allAttributes.add(`${stage.name} - ${attr.label}`);
            });
        });
    });

    csv += Array.from(allAttributes).join(',') + '\n';

    // Add data rows
    experiences.forEach(exp => {
        const overall = calculateOverallScore(exp);
        csv += `"${exp.productInfo.name}",`;
        csv += `"${exp.productInfo.brand}",`;
        csv += `"${exp.productInfo.category}",`;
        csv += `${new Date(exp.timestamp).toLocaleDateString()},`;
        csv += `${overall.toFixed(2)},`;

        // Add attribute values
        allAttributes.forEach(attrKey => {
            const [stageName, attrLabel] = attrKey.split(' - ');
            const stage = exp.stages.find(s => s.name === stageName);
            const attr = stage ? stage.attributes.find(a => a.label === attrLabel) : null;
            csv += attr ? `${attr.value.toFixed(2)},` : ',';
        });

        csv += '\n';
    });

    downloadCSV(csv, `taste_signature_portfolio_${Date.now()}.csv`);
    return true;
}

/**
 * Export comparison matrix to Excel
 */
function exportComparisonToExcel(productIds) {
    if (!productIds || productIds.length < 2) return null;

    const products = productIds.map(id => experiences.find(e => e.id === id)).filter(Boolean);
    if (products.length < 2) return null;

    let csv = 'Taste Signature - Product Comparison Export\n\n';
    csv += 'Attribute,' + products.map(p => p.productInfo.name).join(',') + '\n';

    // Get all attributes from first product
    products[0].stages.forEach(stage => {
        stage.attributes.forEach(attr => {
            csv += `${stage.name} - ${attr.label},`;

            products.forEach(product => {
                const productStage = product.stages.find(s => s.name === stage.name);
                const productAttr = productStage ? productStage.attributes.find(a => a.label === attr.label) : null;
                csv += productAttr ? `${productAttr.value.toFixed(2)},` : ',';
            });

            csv += '\n';
        });
    });

    csv += '\nOverall Score,';
    products.forEach(product => {
        csv += `${calculateOverallScore(product).toFixed(2)},`;
    });
    csv += '\n';

    downloadCSV(csv, `product_comparison_${Date.now()}.csv`);
    return true;
}

/**
 * Download CSV helper
 */
function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
}

// ===== CHART IMAGE EXPORT =====

/**
 * Export any Chart.js chart to PNG
 */
function exportChartAsImage(chartId, filename) {
    const canvas = document.getElementById(chartId);
    if (!canvas) {
        console.error('Chart canvas not found');
        return false;
    }

    // Get the canvas as a data URL
    const url = canvas.toDataURL('image/png');

    // Create download link
    const link = document.createElement('a');
    link.download = filename || `chart_${Date.now()}.png`;
    link.href = url;
    link.click();

    return true;
}

/**
 * Export current portfolio chart
 */
function exportPortfolioChart() {
    return exportChartAsImage('emotionalMappingChart', 'portfolio_emotional_mapping.png');
}

/**
 * Export shape of taste chart
 */
function exportShapeOfTasteChart(productId) {
    // This assumes the chart is currently displayed
    return exportChartAsImage('sensoryChart', `shape_of_taste_${productId}.png`);
}

// ===== HELPER FUNCTIONS =====

/**
 * Calculate overall score from experience
 */
function calculateOverallScore(experience) {
    let total = 0;
    let count = 0;

    experience.stages.forEach(stage => {
        stage.attributes.forEach(attr => {
            total += attr.value;
            count++;
        });
    });

    return count > 0 ? total / count : 0;
}
