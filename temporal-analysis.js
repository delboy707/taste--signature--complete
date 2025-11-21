// ===== TEMPORAL ANALYSIS MODULE =====

/**
 * Temporal Analysis System
 * Track how products change over time - shelf life, batch variation, sensory drift
 */

// ===== PRODUCT TIME-SERIES GROUPING =====

/**
 * Group products by name for temporal analysis
 */
function groupProductsByName() {
    const groups = {};

    experiences.forEach(exp => {
        const productName = exp.productInfo.name.toLowerCase().trim();
        if (!groups[productName]) {
            groups[productName] = [];
        }
        groups[productName].push(exp);
    });

    // Sort each group by timestamp
    Object.keys(groups).forEach(name => {
        groups[name].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    });

    return groups;
}

/**
 * Get products with multiple evaluations (temporal data)
 */
function getProductsWithTemporalData() {
    const groups = groupProductsByName();
    const temporal = [];

    Object.keys(groups).forEach(name => {
        if (groups[name].length >= 2) {
            temporal.push({
                productName: name,
                displayName: groups[name][0].productInfo.name, // Original casing
                evaluations: groups[name],
                count: groups[name].length,
                firstDate: new Date(groups[name][0].timestamp),
                lastDate: new Date(groups[name][groups[name].length - 1].timestamp),
                timeSpanDays: Math.ceil((new Date(groups[name][groups[name].length - 1].timestamp) - new Date(groups[name][0].timestamp)) / (1000 * 60 * 60 * 24))
            });
        }
    });

    return temporal.sort((a, b) => b.count - a.count);
}

// ===== TIME-SERIES DATA EXTRACTION =====

/**
 * Extract time-series data for a specific attribute
 */
function getAttributeTimeSeries(productName, stageName, attributeLabel) {
    const groups = groupProductsByName();
    const productKey = productName.toLowerCase().trim();
    const evaluations = groups[productKey] || [];

    const timeSeries = [];

    evaluations.forEach(exp => {
        const stage = exp.stages.find(s => s.name === stageName);
        if (stage) {
            const attr = stage.attributes.find(a => a.label === attributeLabel);
            if (attr) {
                timeSeries.push({
                    date: new Date(exp.timestamp),
                    value: attr.value,
                    experienceId: exp.id
                });
            }
        }
    });

    return timeSeries;
}

/**
 * Get all attributes time-series for a product
 */
function getAllAttributesTimeSeries(productName) {
    const groups = groupProductsByName();
    const productKey = productName.toLowerCase().trim();
    const evaluations = groups[productKey] || [];

    if (evaluations.length === 0) return {};

    const series = {};

    // Initialize series for all attributes
    evaluations[0].stages.forEach(stage => {
        stage.attributes.forEach(attr => {
            const key = `${stage.name}.${attr.label}`;
            series[key] = {
                stageName: stage.name,
                attributeLabel: attr.label,
                data: []
            };
        });
    });

    // Populate series
    evaluations.forEach(exp => {
        exp.stages.forEach(stage => {
            stage.attributes.forEach(attr => {
                const key = `${stage.name}.${attr.label}`;
                if (series[key]) {
                    series[key].data.push({
                        date: new Date(exp.timestamp),
                        value: attr.value,
                        experienceId: exp.id
                    });
                }
            });
        });
    });

    return series;
}

// ===== TREND ANALYSIS =====

/**
 * Calculate trend for a time-series
 */
function calculateTrend(timeSeries) {
    if (timeSeries.length < 2) {
        return { trend: 'insufficient_data', slope: 0, change: 0 };
    }

    // Simple linear regression
    const n = timeSeries.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    timeSeries.forEach((point, index) => {
        const x = index; // Use index as x-value
        const y = point.value;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate total change
    const firstValue = timeSeries[0].value;
    const lastValue = timeSeries[timeSeries.length - 1].value;
    const change = lastValue - firstValue;
    const changePercent = firstValue !== 0 ? (change / firstValue) * 100 : 0;

    // Determine trend direction
    let trend;
    if (Math.abs(slope) < 0.01) {
        trend = 'stable';
    } else if (slope > 0) {
        trend = 'increasing';
    } else {
        trend = 'decreasing';
    }

    return {
        trend: trend,
        slope: slope,
        intercept: intercept,
        change: change,
        changePercent: changePercent,
        firstValue: firstValue,
        lastValue: lastValue
    };
}

/**
 * Detect significant changes (degradation/improvement)
 */
function detectSignificantChanges(productName, threshold = 1.0) {
    const allSeries = getAllAttributesTimeSeries(productName);
    const significantChanges = [];

    Object.keys(allSeries).forEach(key => {
        const series = allSeries[key];
        if (series.data.length < 2) return;

        const trend = calculateTrend(series.data);

        if (Math.abs(trend.change) >= threshold) {
            significantChanges.push({
                stage: series.stageName,
                attribute: series.attributeLabel,
                trend: trend.trend,
                change: trend.change,
                changePercent: trend.changePercent,
                severity: Math.abs(trend.change) >= 2.0 ? 'high' : 'moderate'
            });
        }
    });

    // Sort by absolute change (largest first)
    significantChanges.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

    return significantChanges;
}

// ===== SHELF LIFE ANALYSIS =====

/**
 * Estimate shelf life based on degradation rate
 */
function estimateShelfLife(productName, acceptableThreshold = 6.0) {
    const allSeries = getAllAttributesTimeSeries(productName);
    const groups = groupProductsByName();
    const productKey = productName.toLowerCase().trim();
    const evaluations = groups[productKey] || [];

    if (evaluations.length < 2) {
        return { status: 'insufficient_data', message: 'Need at least 2 evaluations to estimate shelf life' };
    }

    // Calculate time span in days
    const firstDate = new Date(evaluations[0].timestamp);
    const lastDate = new Date(evaluations[evaluations.length - 1].timestamp);
    const timeSpanDays = (lastDate - firstDate) / (1000 * 60 * 60 * 24);

    // Find attributes that are degrading most rapidly
    const degradingAttributes = [];

    Object.keys(allSeries).forEach(key => {
        const series = allSeries[key];
        if (series.data.length < 2) return;

        const trend = calculateTrend(series.data);

        // Only consider decreasing trends (degradation)
        if (trend.trend === 'decreasing' && trend.lastValue < acceptableThreshold) {
            const daysPerUnit = timeSpanDays / Math.abs(trend.change);
            const daysUntilUnacceptable = (trend.lastValue - acceptableThreshold) * daysPerUnit;

            degradingAttributes.push({
                attribute: `${series.stageName} - ${series.attributeLabel}`,
                currentValue: trend.lastValue,
                projectedDays: Math.max(0, daysUntilUnacceptable),
                degradationRate: trend.slope
            });
        }
    });

    if (degradingAttributes.length === 0) {
        return {
            status: 'stable',
            message: 'No significant degradation detected',
            timeSpanDays: timeSpanDays
        };
    }

    // Find the limiting attribute (shortest time to unacceptable)
    const limitingAttribute = degradingAttributes.reduce((min, attr) =>
        attr.projectedDays < min.projectedDays ? attr : min
    );

    return {
        status: 'degrading',
        limitingAttribute: limitingAttribute.attribute,
        estimatedShelfLifeDays: Math.round(limitingAttribute.projectedDays),
        currentValue: limitingAttribute.currentValue,
        acceptableThreshold: acceptableThreshold,
        degradationRate: limitingAttribute.degradationRate,
        allDegradingAttributes: degradingAttributes
    };
}

// ===== BATCH VARIATION ANALYSIS =====

/**
 * Analyze variation between batches
 */
function analyzeBatchVariation(productName) {
    const groups = groupProductsByName();
    const productKey = productName.toLowerCase().trim();
    const evaluations = groups[productKey] || [];

    if (evaluations.length < 2) {
        return { status: 'insufficient_data' };
    }

    const allSeries = getAllAttributesTimeSeries(productName);
    const variationResults = [];

    Object.keys(allSeries).forEach(key => {
        const series = allSeries[key];
        if (series.data.length < 2) return;

        const values = series.data.map(d => d.value);
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        const cv = mean !== 0 ? (stdDev / mean) * 100 : 0; // Coefficient of variation

        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min;

        variationResults.push({
            stage: series.stageName,
            attribute: series.attributeLabel,
            mean: mean,
            stdDev: stdDev,
            cv: cv,
            min: min,
            max: max,
            range: range,
            consistency: cv < 10 ? 'high' : cv < 20 ? 'moderate' : 'low'
        });
    });

    // Sort by coefficient of variation (highest first = most variable)
    variationResults.sort((a, b) => b.cv - a.cv);

    return {
        status: 'success',
        results: variationResults,
        overallConsistency: variationResults.length > 0
            ? (variationResults.filter(r => r.consistency === 'high').length / variationResults.length) >= 0.7
                ? 'high'
                : (variationResults.filter(r => r.consistency === 'low').length / variationResults.length) >= 0.3
                    ? 'low'
                    : 'moderate'
            : 'unknown'
    };
}

// ===== COMPARISON HELPERS =====

/**
 * Compare fresh vs aged product
 */
function compareFreshVsAged(productName) {
    const groups = groupProductsByName();
    const productKey = productName.toLowerCase().trim();
    const evaluations = groups[productKey] || [];

    if (evaluations.length < 2) {
        return null;
    }

    const fresh = evaluations[0];
    const aged = evaluations[evaluations.length - 1];

    const comparison = {
        fresh: {
            date: new Date(fresh.timestamp),
            experienceId: fresh.id
        },
        aged: {
            date: new Date(aged.timestamp),
            experienceId: aged.id
        },
        timeSpanDays: Math.ceil((new Date(aged.timestamp) - new Date(fresh.timestamp)) / (1000 * 60 * 60 * 24)),
        attributeChanges: []
    };

    fresh.stages.forEach(freshStage => {
        const agedStage = aged.stages.find(s => s.name === freshStage.name);
        if (agedStage) {
            freshStage.attributes.forEach(freshAttr => {
                const agedAttr = agedStage.attributes.find(a => a.label === freshAttr.label);
                if (agedAttr) {
                    const change = agedAttr.value - freshAttr.value;
                    const changePercent = freshAttr.value !== 0 ? (change / freshAttr.value) * 100 : 0;

                    comparison.attributeChanges.push({
                        stage: freshStage.name,
                        attribute: freshAttr.label,
                        freshValue: freshAttr.value,
                        agedValue: agedAttr.value,
                        change: change,
                        changePercent: changePercent
                    });
                }
            });
        }
    });

    return comparison;
}

/**
 * Get evaluation dates for a product
 */
function getEvaluationDates(productName) {
    const groups = groupProductsByName();
    const productKey = productName.toLowerCase().trim();
    const evaluations = groups[productKey] || [];

    return evaluations.map(exp => ({
        date: new Date(exp.timestamp),
        id: exp.id,
        formattedDate: new Date(exp.timestamp).toLocaleDateString()
    }));
}
