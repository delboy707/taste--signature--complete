// ===== STATISTICAL ANALYSIS LIBRARY =====

/**
 * Calculate mean (average) of an array
 */
function mean(values) {
    if (!values || values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate standard deviation
 */
function standardDeviation(values) {
    if (!values || values.length === 0) return 0;
    const avg = mean(values);
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = mean(squareDiffs);
    return Math.sqrt(avgSquareDiff);
}

/**
 * Calculate variance
 */
function variance(values) {
    if (!values || values.length === 0) return 0;
    const std = standardDeviation(values);
    return std * std;
}

/**
 * Calculate standard error of the mean
 */
function standardError(values) {
    if (!values || values.length === 0) return 0;
    return standardDeviation(values) / Math.sqrt(values.length);
}

/**
 * Calculate 95% confidence interval
 * Returns {lower, upper, margin}
 */
function confidenceInterval95(values) {
    if (!values || values.length === 0) return { lower: 0, upper: 0, margin: 0 };

    const avg = mean(values);
    const se = standardError(values);
    const tValue = 1.96; // For 95% confidence with large sample, or use t-distribution for small samples
    const margin = tValue * se;

    return {
        lower: avg - margin,
        upper: avg + margin,
        margin: margin
    };
}

/**
 * Perform independent samples t-test
 * Returns {t, df, p, significant, difference}
 */
function tTest(group1, group2, alpha = 0.05) {
    if (!group1 || !group2 || group1.length === 0 || group2.length === 0) {
        return { t: 0, df: 0, p: 1, significant: false, difference: 0 };
    }

    const mean1 = mean(group1);
    const mean2 = mean(group2);
    const n1 = group1.length;
    const n2 = group2.length;

    const var1 = variance(group1);
    const var2 = variance(group2);

    // Pooled standard deviation
    const pooledVariance = ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2);
    const pooledStd = Math.sqrt(pooledVariance);

    // T-statistic
    const tStat = (mean1 - mean2) / (pooledStd * Math.sqrt(1/n1 + 1/n2));

    // Degrees of freedom
    const df = n1 + n2 - 2;

    // Approximate p-value (using simplified approach)
    // For production, you'd use a proper t-distribution table
    const pValue = approximatePValue(Math.abs(tStat), df);

    return {
        t: tStat,
        df: df,
        p: pValue,
        significant: pValue < alpha,
        difference: mean1 - mean2,
        mean1: mean1,
        mean2: mean2,
        effectSize: Math.abs(mean1 - mean2) / pooledStd // Cohen's d
    };
}

/**
 * Approximate p-value from t-statistic
 * Uses approximation formula for large samples
 */
function approximatePValue(t, df) {
    // For large df, t-distribution approximates normal distribution
    // This is a simplified approximation
    if (df >= 30) {
        // Use normal distribution approximation
        return 2 * (1 - normalCDF(Math.abs(t)));
    }

    // For smaller samples, use conservative estimate
    // This is a rough approximation - in production you'd use proper t-table
    const x = df / (df + t * t);
    const p = incompleteBeta(x, df/2, 0.5);
    return p;
}

/**
 * Normal cumulative distribution function
 */
function normalCDF(x) {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - p : p;
}

/**
 * Incomplete beta function (simplified)
 * Used for p-value calculation
 */
function incompleteBeta(x, a, b) {
    // Simplified approximation
    // In production, use a proper statistical library
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    // Use normal approximation for large a,b
    if (a > 10 && b > 10) {
        const mu = a / (a + b);
        const sigma = Math.sqrt(a * b / ((a + b) * (a + b) * (a + b + 1)));
        return normalCDF((x - mu) / sigma);
    }

    // Fallback to 0.5 for edge cases
    return 0.5;
}

/**
 * Calculate correlation coefficient (Pearson's r)
 */
function correlation(x, y) {
    if (!x || !y || x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const meanX = mean(x);
    const meanY = mean(y);

    let numerator = 0;
    let sumSquaresX = 0;
    let sumSquaresY = 0;

    for (let i = 0; i < n; i++) {
        const dx = x[i] - meanX;
        const dy = y[i] - meanY;
        numerator += dx * dy;
        sumSquaresX += dx * dx;
        sumSquaresY += dy * dy;
    }

    const denominator = Math.sqrt(sumSquaresX * sumSquaresY);
    return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Simple linear regression
 * Returns {slope, intercept, r, r2}
 */
function linearRegression(x, y) {
    if (!x || !y || x.length !== y.length || x.length === 0) {
        return { slope: 0, intercept: 0, r: 0, r2: 0 };
    }

    const n = x.length;
    const meanX = mean(x);
    const meanY = mean(y);

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
        numerator += (x[i] - meanX) * (y[i] - meanY);
        denominator += (x[i] - meanX) * (x[i] - meanX);
    }

    const slope = denominator === 0 ? 0 : numerator / denominator;
    const intercept = meanY - slope * meanX;
    const r = correlation(x, y);

    return {
        slope: slope,
        intercept: intercept,
        r: r,
        r2: r * r,
        predict: (xVal) => slope * xVal + intercept
    };
}

/**
 * Calculate percentile (0-100)
 */
function percentile(values, p) {
    if (!values || values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (lower === upper) return sorted[lower];
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Calculate effect size (Cohen's d)
 */
function cohensd(group1, group2) {
    if (!group1 || !group2 || group1.length === 0 || group2.length === 0) return 0;

    const mean1 = mean(group1);
    const mean2 = mean(group2);
    const n1 = group1.length;
    const n2 = group2.length;

    const var1 = variance(group1);
    const var2 = variance(group2);

    const pooledVariance = ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2);
    const pooledStd = Math.sqrt(pooledVariance);

    return pooledStd === 0 ? 0 : (mean1 - mean2) / pooledStd;
}

/**
 * Interpret effect size magnitude
 */
function interpretEffectSize(d) {
    const absd = Math.abs(d);
    if (absd < 0.2) return 'Negligible';
    if (absd < 0.5) return 'Small';
    if (absd < 0.8) return 'Medium';
    return 'Large';
}

/**
 * Interpret p-value significance
 */
function interpretPValue(p) {
    if (p < 0.001) return 'Highly significant (p < 0.001)';
    if (p < 0.01) return 'Very significant (p < 0.01)';
    if (p < 0.05) return 'Significant (p < 0.05)';
    if (p < 0.1) return 'Marginally significant (p < 0.1)';
    return 'Not significant (p ≥ 0.1)';
}

/**
 * K-means clustering algorithm
 * Returns {clusters, centroids}
 */
function kMeansClustering(data, k, maxIterations = 100) {
    if (!data || data.length === 0 || k <= 0) {
        return { clusters: [], centroids: [] };
    }

    const n = data.length;
    const dims = data[0].length;

    // Initialize centroids randomly
    let centroids = [];
    const usedIndices = new Set();
    for (let i = 0; i < k; i++) {
        let randIndex;
        do {
            randIndex = Math.floor(Math.random() * n);
        } while (usedIndices.has(randIndex));
        usedIndices.add(randIndex);
        centroids.push([...data[randIndex]]);
    }

    let clusters = new Array(n).fill(0);
    let changed = true;
    let iterations = 0;

    while (changed && iterations < maxIterations) {
        changed = false;
        iterations++;

        // Assign points to nearest centroid
        for (let i = 0; i < n; i++) {
            let minDist = Infinity;
            let nearestCluster = 0;

            for (let j = 0; j < k; j++) {
                const dist = euclideanDistance(data[i], centroids[j]);
                if (dist < minDist) {
                    minDist = dist;
                    nearestCluster = j;
                }
            }

            if (clusters[i] !== nearestCluster) {
                changed = true;
                clusters[i] = nearestCluster;
            }
        }

        // Update centroids
        for (let j = 0; j < k; j++) {
            const clusterPoints = data.filter((_, i) => clusters[i] === j);
            if (clusterPoints.length > 0) {
                for (let d = 0; d < dims; d++) {
                    centroids[j][d] = mean(clusterPoints.map(p => p[d]));
                }
            }
        }
    }

    return { clusters, centroids };
}

/**
 * Calculate Euclidean distance between two points
 */
function euclideanDistance(point1, point2) {
    if (!point1 || !point2 || point1.length !== point2.length) return 0;

    let sum = 0;
    for (let i = 0; i < point1.length; i++) {
        sum += Math.pow(point1[i] - point2[i], 2);
    }
    return Math.sqrt(sum);
}
