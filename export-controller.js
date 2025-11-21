// ===== EXPORT CONTROLLER =====
// Handles PDF and Excel export functionality across all views

let pdfExporter = null;
let excelImporter = null;

/**
 * Initialize exporters
 */
function initializeExporters() {
    pdfExporter = new PDFExporter();
    excelImporter = new ExcelImporter();

    // Set company branding if available
    if (typeof authManager !== 'undefined' && authManager.currentUser) {
        loadCompanyBrandingForExport();
    }

    console.log('✅ Exporters initialized');
}

/**
 * Load company branding for exports
 */
async function loadCompanyBrandingForExport() {
    try {
        const companyData = await authManager.getCompanyData();
        if (companyData.success) {
            pdfExporter.setCompanyBranding({
                companyName: companyData.company.companyName,
                industry: companyData.company.industry,
                companySize: companyData.company.companySize
            });
        }
    } catch (error) {
        console.log('Could not load company branding:', error);
    }
}

/**
 * Export single product report
 */
async function exportProductReport(experienceId) {
    if (!pdfExporter) initializeExporters();

    const experience = experiences.find(exp => exp.id === experienceId);
    if (!experience) {
        alert('Product not found');
        return;
    }

    showExportNotification('Generating PDF report...');

    try {
        // Get AI insights if available (optional)
        let aiInsights = null;
        if (claudeAI && window.AI_CONFIG?.ANTHROPIC_API_KEY) {
            try {
                const claude = new ClaudeAI();
                aiInsights = await claude.analyzeProduct(experience);
            } catch (error) {
                console.log('Could not get AI insights:', error);
            }
        }

        const result = await pdfExporter.generateProductReport(experience, aiInsights);

        if (result.success) {
            showExportNotification(`✅ Report downloaded: ${result.filename}`, 'success');
        } else {
            showExportNotification('❌ Export failed', 'error');
        }
    } catch (error) {
        console.error('Export error:', error);
        showExportNotification('❌ Export failed', 'error');
    }
}

/**
 * Export portfolio report
 */
async function exportPortfolioReport() {
    if (!pdfExporter) initializeExporters();

    if (experiences.length === 0) {
        alert('No products to export. Add some taste experiences first.');
        return;
    }

    showExportNotification('Generating portfolio report...');

    try {
        // Get AI insights if available (optional)
        let aiInsights = null;
        if (claudeAI && window.AI_CONFIG?.ANTHROPIC_API_KEY) {
            try {
                const claude = new ClaudeAI();
                aiInsights = await claude.suggestImprovements(experiences);
            } catch (error) {
                console.log('Could not get AI insights:', error);
            }
        }

        const result = await pdfExporter.generatePortfolioReport(experiences, aiInsights);

        if (result.success) {
            showExportNotification(`✅ Portfolio report downloaded: ${result.filename}`, 'success');
        } else {
            showExportNotification('❌ Export failed', 'error');
        }
    } catch (error) {
        console.error('Export error:', error);
        showExportNotification('❌ Export failed', 'error');
    }
}

/**
 * Export comparison report for selected products
 */
async function exportComparisonReport(selectedIds) {
    if (!pdfExporter) initializeExporters();

    const selectedExperiences = experiences.filter(exp => selectedIds.includes(exp.id));

    if (selectedExperiences.length < 2) {
        alert('Please select at least 2 products to compare');
        return;
    }

    showExportNotification('Generating comparison report...');

    try {
        // Get AI comparison insights if available
        let aiInsights = null;
        if (claudeAI && window.AI_CONFIG?.ANTHROPIC_API_KEY) {
            try {
                const claude = new ClaudeAI();
                aiInsights = await claude.compareProducts(selectedExperiences);
            } catch (error) {
                console.log('Could not get AI insights:', error);
            }
        }

        const result = await pdfExporter.generateComparisonReport(selectedExperiences, aiInsights);

        if (result.success) {
            showExportNotification(`✅ Comparison report downloaded: ${result.filename}`, 'success');
        } else {
            showExportNotification('❌ Export failed', 'error');
        }
    } catch (error) {
        console.error('Export error:', error);
        showExportNotification('❌ Export failed', 'error');
    }
}

/**
 * Export to Excel
 */
function exportToExcel() {
    if (!excelImporter) initializeExporters();

    if (experiences.length === 0) {
        alert('No data to export. Add some taste experiences first.');
        return;
    }

    showExportNotification('Generating Excel file...');

    try {
        const exportData = {
            experiences: experiences,
            exportDate: new Date().toISOString(),
            companyName: 'Your Company' // Can be updated with actual company name
        };

        const result = excelImporter.exportToExcel(exportData, 'taste-signature-data.xlsx');

        if (result.success) {
            showExportNotification(`✅ Excel file downloaded: ${result.filename}`, 'success');
        } else {
            showExportNotification('❌ Export failed', 'error');
        }
    } catch (error) {
        console.error('Excel export error:', error);
        showExportNotification('❌ Excel export failed', 'error');
    }
}

/**
 * Export before/after comparison
 */
async function exportBeforeAfterReport() {
    if (!pdfExporter) initializeExporters();

    const beforeProducts = experiences.filter(exp => exp.reformulationStatus === 'before');
    const afterProducts = experiences.filter(exp => exp.reformulationStatus === 'after');

    if (beforeProducts.length === 0 || afterProducts.length === 0) {
        alert('No before/after products found. Tag products with reformulation status first.');
        return;
    }

    showExportNotification('Generating before/after report...');

    try {
        // For simplicity, compare first before with first after
        // In production, you'd let user select which to compare
        const selectedProducts = [beforeProducts[0], afterProducts[0]];

        // Get AI reformulation analysis
        let aiInsights = null;
        if (claudeAI && window.AI_CONFIG?.ANTHROPIC_API_KEY) {
            try {
                const claude = new ClaudeAI();
                aiInsights = await claude.analyzeReformulation(beforeProducts[0], afterProducts[0]);
            } catch (error) {
                console.log('Could not get AI insights:', error);
            }
        }

        const result = await pdfExporter.generateComparisonReport(selectedProducts, aiInsights);

        if (result.success) {
            showExportNotification(`✅ Before/After report downloaded: ${result.filename}`, 'success');
        } else {
            showExportNotification('❌ Export failed', 'error');
        }
    } catch (error) {
        console.error('Export error:', error);
        showExportNotification('❌ Export failed', 'error');
    }
}

/**
 * Show export notification
 */
function showExportNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#667eea'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
        font-weight: 500;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Initialize when page loads
if (typeof window !== 'undefined') {
    window.exportProductReport = exportProductReport;
    window.exportPortfolioReport = exportPortfolioReport;
    window.exportComparisonReport = exportComparisonReport;
    window.exportToExcel = exportToExcel;
    window.exportBeforeAfterReport = exportBeforeAfterReport;
}
