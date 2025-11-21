// ===== EXCEL IMPORT MODULE =====
// Handles Excel file import for consumer panels, product data, and sensory tests

class ExcelImporter {
    constructor() {
        this.currentWorkbook = null;
        this.currentData = null;
    }

    /**
     * Read Excel file from file input
     */
    async readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });

                    this.currentWorkbook = workbook;
                    console.log('✅ Excel file loaded:', workbook.SheetNames);

                    resolve({
                        success: true,
                        workbook: workbook,
                        sheetNames: workbook.SheetNames
                    });
                } catch (error) {
                    console.error('Excel read error:', error);
                    reject({
                        success: false,
                        error: error.message
                    });
                }
            };

            reader.onerror = (error) => {
                reject({
                    success: false,
                    error: 'Failed to read file'
                });
            };

            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Get sheet data as JSON
     */
    getSheetData(sheetName) {
        if (!this.currentWorkbook) {
            throw new Error('No workbook loaded');
        }

        const sheet = this.currentWorkbook.Sheets[sheetName];
        if (!sheet) {
            throw new Error(`Sheet ${sheetName} not found`);
        }

        // Convert to JSON with header row
        const jsonData = XLSX.utils.sheet_to_json(sheet, { raw: false });

        return {
            success: true,
            data: jsonData,
            rowCount: jsonData.length
        };
    }

    /**
     * Detect data format type
     */
    detectDataFormat(data) {
        if (!data || data.length === 0) {
            return { type: 'unknown', confidence: 0 };
        }

        const firstRow = data[0];
        const headers = Object.keys(firstRow).map(h => h.toLowerCase());

        // Check for consumer panel format
        if (this.hasHeaders(headers, ['respondent', 'product', 'attribute', 'rating']) ||
            this.hasHeaders(headers, ['panelist', 'sample', 'question', 'score'])) {
            return { type: 'consumerPanel', confidence: 0.9 };
        }

        // Check for product master data
        if (this.hasHeaders(headers, ['product', 'brand', 'type', 'sku']) ||
            this.hasHeaders(headers, ['name', 'category', 'description'])) {
            return { type: 'productMaster', confidence: 0.8 };
        }

        // Check for sensory test results
        if (this.hasHeaders(headers, ['appearance', 'aroma', 'taste']) ||
            this.hasHeaders(headers, ['sweet', 'sour', 'bitter', 'salt'])) {
            return { type: 'sensoryTest', confidence: 0.85 };
        }

        // Check for taste signature format (existing)
        if (this.hasHeaders(headers, ['timestamp', 'stages', 'emotions'])) {
            return { type: 'tasteSignature', confidence: 0.95 };
        }

        return { type: 'unknown', confidence: 0 };
    }

    /**
     * Helper: check if array contains headers
     */
    hasHeaders(headers, required) {
        const matchCount = required.filter(r =>
            headers.some(h => h.includes(r))
        ).length;

        return matchCount >= required.length - 1; // Allow 1 missing
    }

    /**
     * Import consumer panel data
     * Expected format: Respondent | Product | Attribute | Rating | [Demographics]
     */
    importConsumerPanel(data) {
        try {
            const panelData = {
                respondents: new Set(),
                products: new Set(),
                attributes: new Set(),
                responses: []
            };

            // Normalize headers
            data.forEach(row => {
                const normalized = this.normalizeRow(row);

                panelData.respondents.add(normalized.respondent || normalized.panelist);
                panelData.products.add(normalized.product || normalized.sample);
                panelData.attributes.add(normalized.attribute || normalized.question);

                panelData.responses.push({
                    respondent: normalized.respondent || normalized.panelist,
                    product: normalized.product || normalized.sample,
                    attribute: normalized.attribute || normalized.question,
                    rating: parseFloat(normalized.rating || normalized.score || 0),
                    demographics: {
                        age: normalized.age,
                        gender: normalized.gender,
                        region: normalized.region
                    }
                });
            });

            return {
                success: true,
                panelData: {
                    totalRespondents: panelData.respondents.size,
                    totalProducts: panelData.products.size,
                    totalAttributes: panelData.attributes.size,
                    totalResponses: panelData.responses.length,
                    respondents: Array.from(panelData.respondents),
                    products: Array.from(panelData.products),
                    attributes: Array.from(panelData.attributes),
                    responses: panelData.responses
                }
            };

        } catch (error) {
            console.error('Consumer panel import error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Import product master data
     * Expected format: Product | Brand | Type | Category | Description | SKU
     */
    importProductMaster(data) {
        try {
            const products = data.map(row => {
                const normalized = this.normalizeRow(row);

                return {
                    id: Date.now() + Math.random(),
                    name: normalized.product || normalized.name || 'Unnamed Product',
                    brand: normalized.brand || '',
                    type: normalized.type || normalized.category || '',
                    sku: normalized.sku || normalized.code || '',
                    description: normalized.description || '',
                    variant: normalized.variant || '',
                    importedAt: new Date().toISOString()
                };
            });

            return {
                success: true,
                products: products,
                count: products.length
            };

        } catch (error) {
            console.error('Product master import error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Import sensory test results
     * Expected format: Product | Appearance_X | Aroma_Y | Taste_Z | ...
     */
    importSensoryTest(data) {
        try {
            const experiences = data.map(row => {
                const normalized = this.normalizeRow(row);

                // Extract product info
                const productInfo = {
                    name: normalized.product || normalized.sample || 'Unknown',
                    brand: normalized.brand || '',
                    type: normalized.type || 'snack'
                };

                // Map sensory attributes to stages
                const stages = {
                    appearance: this.extractStageData(normalized, 'appearance'),
                    aroma: this.extractStageData(normalized, 'aroma'),
                    frontMouth: this.extractStageData(normalized, 'taste', 'front'),
                    midRearMouth: this.extractStageData(normalized, 'taste', 'mid'),
                    aftertaste: this.extractStageData(normalized, 'aftertaste')
                };

                return {
                    id: Date.now() + Math.random(),
                    timestamp: new Date().toISOString(),
                    productInfo: productInfo,
                    stages: stages,
                    importedFrom: 'Excel',
                    originalRow: row
                };
            });

            return {
                success: true,
                experiences: experiences,
                count: experiences.length
            };

        } catch (error) {
            console.error('Sensory test import error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Helper: normalize row headers to lowercase
     */
    normalizeRow(row) {
        const normalized = {};
        for (const key in row) {
            const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
            normalized[normalizedKey] = row[key];
        }
        return normalized;
    }

    /**
     * Helper: extract stage data from row
     */
    extractStageData(row, stageName, subStage = null) {
        const stageData = {
            overallIntensity: 5,
            emotions: {}
        };

        // Extract attributes for this stage
        for (const key in row) {
            if (key.includes(stageName)) {
                const value = parseFloat(row[key]) || 0;

                // Map to intensity or emotion
                if (key.includes('intensity')) {
                    stageData.overallIntensity = value;
                } else {
                    // Extract emotion name
                    const emotionMatch = key.match(/\w+$/);
                    if (emotionMatch) {
                        stageData.emotions[emotionMatch[0]] = value;
                    }
                }
            }
        }

        return stageData;
    }

    /**
     * Calculate statistics for consumer panel data
     */
    calculateStatistics(panelData) {
        const stats = {
            byProduct: {},
            byAttribute: {}
        };

        // Group by product and attribute
        panelData.responses.forEach(response => {
            const product = response.product;
            const attribute = response.attribute;

            // Initialize structures
            if (!stats.byProduct[product]) {
                stats.byProduct[product] = {};
            }
            if (!stats.byProduct[product][attribute]) {
                stats.byProduct[product][attribute] = [];
            }

            stats.byProduct[product][attribute].push(response.rating);
        });

        // Calculate mean, SD, CI for each product-attribute combination
        for (const product in stats.byProduct) {
            for (const attribute in stats.byProduct[product]) {
                const ratings = stats.byProduct[product][attribute];
                const n = ratings.length;
                const mean = ratings.reduce((a, b) => a + b, 0) / n;
                const variance = ratings.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
                const sd = Math.sqrt(variance);
                const se = sd / Math.sqrt(n);
                const ci95 = 1.96 * se; // 95% confidence interval

                stats.byProduct[product][attribute] = {
                    n: n,
                    mean: mean.toFixed(2),
                    sd: sd.toFixed(2),
                    se: se.toFixed(2),
                    ci95: `${(mean - ci95).toFixed(2)} - ${(mean + ci95).toFixed(2)}`,
                    min: Math.min(...ratings).toFixed(2),
                    max: Math.max(...ratings).toFixed(2)
                };
            }
        }

        return stats;
    }

    /**
     * Export current data to Excel
     */
    exportToExcel(data, filename = 'taste-signature-export.xlsx') {
        try {
            const workbook = XLSX.utils.book_new();

            // Create different sheets for different data types
            if (data.experiences && data.experiences.length > 0) {
                const expSheet = this.createExperiencesSheet(data.experiences);
                XLSX.utils.book_append_sheet(workbook, expSheet, 'Experiences');
            }

            if (data.panelData) {
                const panelSheet = this.createPanelDataSheet(data.panelData);
                XLSX.utils.book_append_sheet(workbook, panelSheet, 'Consumer Panel');
            }

            if (data.statistics) {
                const statsSheet = this.createStatisticsSheet(data.statistics);
                XLSX.utils.book_append_sheet(workbook, statsSheet, 'Statistics');
            }

            // Write file
            XLSX.writeFile(workbook, filename);

            return {
                success: true,
                filename: filename
            };

        } catch (error) {
            console.error('Excel export error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Create experiences sheet
     */
    createExperiencesSheet(experiences) {
        const flatData = experiences.map(exp => ({
            'Product': exp.productInfo?.name || '',
            'Brand': exp.productInfo?.brand || '',
            'Type': exp.productInfo?.type || '',
            'Timestamp': exp.timestamp || '',
            'Visual Appeal': exp.stages?.appearance?.visualAppeal || '',
            'Aroma Intensity': exp.stages?.aroma?.intensity || '',
            'Sweetness': exp.stages?.frontMouth?.sweetness || '',
            'Overall Satisfaction': exp.stages?.aftertaste?.satisfaction || ''
            // Add more columns as needed
        }));

        return XLSX.utils.json_to_sheet(flatData);
    }

    /**
     * Create panel data sheet
     */
    createPanelDataSheet(panelData) {
        return XLSX.utils.json_to_sheet(panelData.responses || []);
    }

    /**
     * Create statistics sheet
     */
    createStatisticsSheet(stats) {
        const flatStats = [];

        for (const product in stats.byProduct) {
            for (const attribute in stats.byProduct[product]) {
                const stat = stats.byProduct[product][attribute];
                flatStats.push({
                    Product: product,
                    Attribute: attribute,
                    N: stat.n,
                    Mean: stat.mean,
                    SD: stat.sd,
                    'CI 95%': stat.ci95,
                    Min: stat.min,
                    Max: stat.max
                });
            }
        }

        return XLSX.utils.json_to_sheet(flatStats);
    }
}

// Export
if (typeof window !== 'undefined') {
    window.ExcelImporter = ExcelImporter;
}
