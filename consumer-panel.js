// ===== CONSUMER PANEL INTEGRATION MODULE =====

// Storage for consumer panel data
let consumerPanelData = [];

/**
 * Consumer Panel Data Structure:
 * {
 *   id: timestamp,
 *   productId: linked experience ID,
 *   productName: string,
 *   panelDate: ISO date string,
 *   sampleSize: number,
 *   responses: [
 *     {
 *       respondentId: string,
 *       demographics: { age: string, gender: string, ... },
 *       ratings: {
 *         overallLiking: number (1-9 hedonic scale),
 *         appearance: number,
 *         aroma: number,
 *         flavor: number,
 *         texture: number,
 *         aftertaste: number
 *       },
 *       purchaseIntent: number (1-5),
 *       comments: string
 *     }
 *   ],
 *   aggregateScores: {
 *     overallLiking: { mean, median, stdDev },
 *     appearance: { mean, median, stdDev },
 *     ...
 *   },
 *   reformulationType: 'baseline' | 'reformulation' | 'line_extension',
 *   linkedOriginalPanelId: number (for reformulations)
 * }
 */

/**
 * Load consumer panel data from localStorage
 */
function loadConsumerPanelData() {
    const stored = localStorage.getItem('consumerPanelData');
    if (stored) {
        try {
            consumerPanelData = JSON.parse(stored);
        } catch (e) {
            console.error('Error loading consumer panel data:', e);
            consumerPanelData = [];
        }
    }
}

/**
 * Save consumer panel data to localStorage
 */
function saveConsumerPanelData() {
    localStorage.setItem('consumerPanelData', JSON.stringify(consumerPanelData));
}

/**
 * Import consumer panel data from CSV
 * Expected CSV format:
 * RespondentID,ProductName,OverallLiking,Appearance,Aroma,Flavor,Texture,Aftertaste,PurchaseIntent,Age,Gender,Comments
 */
function importConsumerPanelCSV(csvText, productId, panelDate) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
        throw new Error('CSV file must contain header row and at least one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const responses = [];

    // Parse each response
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length < headers.length) continue;

        const response = {
            respondentId: values[headers.indexOf('RespondentID')] || `R${i}`,
            demographics: {
                age: values[headers.indexOf('Age')] || 'Not specified',
                gender: values[headers.indexOf('Gender')] || 'Not specified'
            },
            ratings: {
                overallLiking: parseFloat(values[headers.indexOf('OverallLiking')]) || 0,
                appearance: parseFloat(values[headers.indexOf('Appearance')]) || 0,
                aroma: parseFloat(values[headers.indexOf('Aroma')]) || 0,
                flavor: parseFloat(values[headers.indexOf('Flavor')]) || 0,
                texture: parseFloat(values[headers.indexOf('Texture')]) || 0,
                aftertaste: parseFloat(values[headers.indexOf('Aftertaste')]) || 0
            },
            purchaseIntent: parseFloat(values[headers.indexOf('PurchaseIntent')]) || 0,
            comments: values[headers.indexOf('Comments')] || ''
        };

        responses.push(response);
    }

    // Calculate aggregate scores
    const aggregateScores = calculateAggregateScores(responses);

    // Find linked product
    const linkedProduct = experiences.find(e => e.id === productId);
    const productName = linkedProduct ? linkedProduct.productInfo.name : values[headers.indexOf('ProductName')] || 'Unknown Product';

    // Create panel data object
    const panelData = {
        id: Date.now(),
        productId: productId,
        productName: productName,
        panelDate: panelDate || new Date().toISOString(),
        sampleSize: responses.length,
        responses: responses,
        aggregateScores: aggregateScores,
        reformulationType: 'baseline',
        linkedOriginalPanelId: null
    };

    consumerPanelData.push(panelData);
    saveConsumerPanelData();

    return panelData;
}

/**
 * Parse CSV line handling quoted values
 */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

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
 * Calculate aggregate statistics from consumer responses
 */
function calculateAggregateScores(responses) {
    const attributes = ['overallLiking', 'appearance', 'aroma', 'flavor', 'texture', 'aftertaste'];
    const aggregates = {};

    attributes.forEach(attr => {
        const values = responses.map(r => r.ratings[attr]).filter(v => v > 0);

        if (values.length > 0) {
            aggregates[attr] = {
                mean: mean(values),
                median: percentile(values, 50),
                stdDev: standardDeviation(values),
                min: Math.min(...values),
                max: Math.max(...values),
                top2Box: attr === 'overallLiking' ? calculateTop2Box(values) : null,
                bottom2Box: attr === 'overallLiking' ? calculateBottom2Box(values) : null
            };
        }
    });

    // Purchase intent analysis
    const purchaseIntentValues = responses.map(r => r.purchaseIntent).filter(v => v > 0);
    if (purchaseIntentValues.length > 0) {
        aggregates.purchaseIntent = {
            mean: mean(purchaseIntentValues),
            definitelyWouldBuy: purchaseIntentValues.filter(v => v >= 4).length / purchaseIntentValues.length * 100,
            top2Box: (purchaseIntentValues.filter(v => v >= 4).length / purchaseIntentValues.length * 100)
        };
    }

    return aggregates;
}

/**
 * Calculate Top 2 Box (% rating 8-9 on 9-point scale)
 */
function calculateTop2Box(values) {
    const top2 = values.filter(v => v >= 8).length;
    return (top2 / values.length) * 100;
}

/**
 * Calculate Bottom 2 Box (% rating 1-2 on 9-point scale)
 */
function calculateBottom2Box(values) {
    const bottom2 = values.filter(v => v <= 2).length;
    return (bottom2 / values.length) * 100;
}

/**
 * Link panel data to reformulation
 */
function linkReformulationPanel(newPanelId, originalPanelId) {
    const newPanel = consumerPanelData.find(p => p.id === newPanelId);
    if (newPanel) {
        newPanel.reformulationType = 'reformulation';
        newPanel.linkedOriginalPanelId = originalPanelId;
        saveConsumerPanelData();
    }
}

/**
 * Compare expert vs consumer ratings
 */
function compareExpertVsConsumer(productId) {
    // Find expert evaluation
    const expertEval = experiences.find(e => e.id === productId);
    if (!expertEval) {
        return null;
    }

    // Find consumer panel data
    const panelData = consumerPanelData.find(p => p.productId === productId);
    if (!panelData) {
        return null;
    }

    // Convert expert ratings to consumer scale (1-10 to 1-9)
    const expertScaled = {
        appearance: (expertEval.stages.appearance.visualAppeal / 10) * 9,
        aroma: (expertEval.stages.aroma.overallIntensity / 10) * 9,
        flavor: (expertEval.stages.frontMouth.overallIntensity / 10) * 9,
        texture: (expertEval.stages.frontMouth.texture / 10) * 9,
        aftertaste: (expertEval.stages.aftertaste.pleasantness / 10) * 9
    };

    // Compare each attribute
    const comparison = {};
    Object.keys(expertScaled).forEach(attr => {
        if (panelData.aggregateScores[attr]) {
            const consumerMean = panelData.aggregateScores[attr].mean;
            const expertScore = expertScaled[attr];
            const difference = consumerMean - expertScore;
            const percentDiff = (difference / consumerMean) * 100;

            comparison[attr] = {
                expert: expertScore,
                consumer: consumerMean,
                difference: difference,
                percentDifference: percentDiff,
                agreement: Math.abs(difference) < 1.5 ? 'High' : Math.abs(difference) < 2.5 ? 'Moderate' : 'Low'
            };
        }
    });

    // Calculate overall correlation
    const expertValues = Object.values(expertScaled);
    const consumerValues = Object.keys(expertScaled).map(attr =>
        panelData.aggregateScores[attr] ? panelData.aggregateScores[attr].mean : 0
    );
    const correlationCoef = correlation(expertValues, consumerValues);

    return {
        productName: expertEval.productInfo.name,
        comparison: comparison,
        correlation: correlationCoef,
        correlationStrength: interpretCorrelation(correlationCoef),
        sampleSize: panelData.sampleSize,
        panelDate: panelData.panelDate
    };
}

/**
 * Interpret correlation coefficient
 */
function interpretCorrelation(r) {
    const abs = Math.abs(r);
    if (abs >= 0.9) return 'Very Strong';
    if (abs >= 0.7) return 'Strong';
    if (abs >= 0.5) return 'Moderate';
    if (abs >= 0.3) return 'Weak';
    return 'Very Weak';
}

/**
 * Analyze reformulation impact
 */
function analyzeReformulationImpact(originalPanelId, reformulatedPanelId) {
    const originalPanel = consumerPanelData.find(p => p.id === originalPanelId);
    const reformPanel = consumerPanelData.find(p => p.id === reformulatedPanelId);

    if (!originalPanel || !reformPanel) {
        return null;
    }

    const attributes = ['overallLiking', 'appearance', 'aroma', 'flavor', 'texture', 'aftertaste'];
    const analysis = {};

    attributes.forEach(attr => {
        if (originalPanel.aggregateScores[attr] && reformPanel.aggregateScores[attr]) {
            const originalMean = originalPanel.aggregateScores[attr].mean;
            const reformMean = reformPanel.aggregateScores[attr].mean;
            const change = reformMean - originalMean;
            const percentChange = (change / originalMean) * 100;

            // Perform t-test if we have raw data
            const originalValues = originalPanel.responses.map(r => r.ratings[attr]);
            const reformValues = reformPanel.responses.map(r => r.ratings[attr]);
            const tTestResult = tTest(originalValues, reformValues);

            analysis[attr] = {
                original: originalMean,
                reformulated: reformMean,
                change: change,
                percentChange: percentChange,
                significant: tTestResult.significant,
                pValue: tTestResult.p,
                effectSize: tTestResult.effectSize,
                interpretation: interpretReformulationChange(change, tTestResult.significant)
            };
        }
    });

    // Purchase intent comparison
    if (originalPanel.aggregateScores.purchaseIntent && reformPanel.aggregateScores.purchaseIntent) {
        const originalPI = originalPanel.aggregateScores.purchaseIntent.top2Box;
        const reformPI = reformPanel.aggregateScores.purchaseIntent.top2Box;

        analysis.purchaseIntent = {
            original: originalPI,
            reformulated: reformPI,
            change: reformPI - originalPI,
            interpretation: reformPI > originalPI ? 'Improved' : reformPI < originalPI ? 'Declined' : 'No Change'
        };
    }

    return {
        productName: originalPanel.productName,
        originalPanelDate: originalPanel.panelDate,
        reformulatedPanelDate: reformPanel.panelDate,
        originalSampleSize: originalPanel.sampleSize,
        reformulatedSampleSize: reformPanel.sampleSize,
        analysis: analysis
    };
}

/**
 * Interpret reformulation change
 */
function interpretReformulationChange(change, isSignificant) {
    if (!isSignificant) {
        return 'No significant change';
    }

    if (change > 0.5) return 'Significant improvement';
    if (change < -0.5) return 'Significant decline';
    return 'Minimal change';
}

/**
 * Generate preference map data
 * Maps products on Liking vs Intensity dimensions
 */
function generatePreferenceMap() {
    const mapData = consumerPanelData.map(panel => {
        const linkedProduct = experiences.find(e => e.id === panel.productId);

        // Calculate average intensity from expert evaluation
        let avgIntensity = 5;
        if (linkedProduct) {
            const stages = linkedProduct.stages;
            avgIntensity = mean([
                stages.appearance.overallIntensity || 0,
                stages.aroma.overallIntensity || 0,
                stages.frontMouth.overallIntensity || 0,
                stages.midRearMouth.overallIntensity || 0
            ]);
        }

        return {
            productName: panel.productName,
            liking: panel.aggregateScores.overallLiking ? panel.aggregateScores.overallLiking.mean : 0,
            intensity: avgIntensity,
            sampleSize: panel.sampleSize,
            top2Box: panel.aggregateScores.overallLiking ? panel.aggregateScores.overallLiking.top2Box : 0,
            purchaseIntent: panel.aggregateScores.purchaseIntent ? panel.aggregateScores.purchaseIntent.top2Box : 0
        };
    });

    return mapData;
}

/**
 * Get panel data summary
 */
function getConsumerPanelSummary() {
    if (consumerPanelData.length === 0) {
        return null;
    }

    const totalRespondents = consumerPanelData.reduce((sum, p) => sum + p.sampleSize, 0);
    const avgSampleSize = totalRespondents / consumerPanelData.length;

    const avgOverallLiking = mean(
        consumerPanelData
            .filter(p => p.aggregateScores.overallLiking)
            .map(p => p.aggregateScores.overallLiking.mean)
    );

    const reformulations = consumerPanelData.filter(p => p.reformulationType === 'reformulation').length;

    return {
        totalPanels: consumerPanelData.length,
        totalRespondents: totalRespondents,
        avgSampleSize: avgSampleSize,
        avgOverallLiking: avgOverallLiking,
        reformulationCount: reformulations,
        productsWithPanelData: new Set(consumerPanelData.map(p => p.productId)).size
    };
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    loadConsumerPanelData();
});
