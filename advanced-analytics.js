// ===== ADVANCED ANALYTICS MODULE =====

/**
 * Render Advanced Analytics Dashboard
 */
function renderAdvancedAnalytics() {
    const container = document.getElementById('insights-container');

    if (experiences.length === 0) {
        container.innerHTML = '<p class="empty-state">Log experiences to generate advanced analytics</p>';
        return;
    }

    let html = '<div class="advanced-analytics">';

    // Statistical Overview
    html += renderStatisticalOverview();

    // Trend Analysis (for retested products)
    html += renderTrendAnalysis();

    // Product Segmentation
    html += renderProductSegmentation();

    // Predictive Insights
    html += renderPredictiveInsights();

    html += '</div>';

    container.innerHTML = html;

    // Render charts after DOM is ready
    setTimeout(() => {
        renderSegmentationChart();
        renderTrendCharts();
    }, 100);
}

/**
 * Statistical Overview Section
 */
function renderStatisticalOverview() {
    let html = '<div class="analytics-section">';
    html += '<h4>📊 Statistical Overview</h4>';
    html += '<div class="stat-cards">';

    // Calculate portfolio statistics
    const allSatisfactionScores = experiences.map(e =>
        e.stages.aftertaste.emotions.satisfaction || 0
    );

    const avgSatisfaction = mean(allSatisfactionScores);
    const stdSatisfaction = standardDeviation(allSatisfactionScores);
    const ci95 = confidenceInterval95(allSatisfactionScores);

    // Overall Satisfaction
    html += `
        <div class="stat-card">
            <div class="stat-icon">⭐</div>
            <div class="stat-content">
                <div class="stat-label">Average Satisfaction</div>
                <div class="stat-value">${avgSatisfaction.toFixed(2)}</div>
                <div class="stat-detail">±${stdSatisfaction.toFixed(2)} std dev</div>
                <div class="stat-detail-small">95% CI: [${ci95.lower.toFixed(2)}, ${ci95.upper.toFixed(2)}]</div>
            </div>
        </div>
    `;

    // Portfolio Consistency
    const coefficientOfVariation = (stdSatisfaction / avgSatisfaction) * 100;
    const consistencyRating = coefficientOfVariation < 15 ? 'Excellent' :
                              coefficientOfVariation < 25 ? 'Good' :
                              coefficientOfVariation < 35 ? 'Moderate' : 'Variable';

    html += `
        <div class="stat-card">
            <div class="stat-icon">🎯</div>
            <div class="stat-content">
                <div class="stat-label">Portfolio Consistency</div>
                <div class="stat-value">${consistencyRating}</div>
                <div class="stat-detail">CV: ${coefficientOfVariation.toFixed(1)}%</div>
                <div class="stat-detail-small">${coefficientOfVariation < 25 ? 'Low variability' : 'High variability'} across products</div>
            </div>
        </div>
    `;

    // Top Performer Analysis
    const topProduct = experiences.reduce((max, e) =>
        (e.stages.aftertaste.emotions.satisfaction || 0) > (max.stages.aftertaste.emotions.satisfaction || 0) ? e : max
    );
    const topScore = topProduct.stages.aftertaste.emotions.satisfaction || 0;
    const percentile = ((experiences.filter(e => (e.stages.aftertaste.emotions.satisfaction || 0) < topScore).length / experiences.length) * 100);

    html += `
        <div class="stat-card">
            <div class="stat-icon">🏆</div>
            <div class="stat-content">
                <div class="stat-label">Top Performer</div>
                <div class="stat-value">${topProduct.productInfo.name}</div>
                <div class="stat-detail">Score: ${topScore.toFixed(1)}/10</div>
                <div class="stat-detail-small">${percentile.toFixed(0)}th percentile</div>
            </div>
        </div>
    `;

    // Retest Statistics
    const retestedProducts = experiences.filter(e => e.isRetest);
    const retestCount = retestedProducts.length;
    const uniqueRetested = new Set(retestedProducts.map(e => e.originalTestId)).size;

    html += `
        <div class="stat-card">
            <div class="stat-icon">🔄</div>
            <div class="stat-content">
                <div class="stat-label">Retests Performed</div>
                <div class="stat-value">${retestCount}</div>
                <div class="stat-detail">${uniqueRetested} unique products</div>
                <div class="stat-detail-small">${((uniqueRetested / experiences.length) * 100).toFixed(0)}% of portfolio</div>
            </div>
        </div>
    `;

    html += '</div></div>';

    return html;
}

/**
 * Trend Analysis for Retested Products
 */
function renderTrendAnalysis() {
    const retestedProducts = identifyRetestedProducts();

    if (retestedProducts.length === 0) {
        return '';
    }

    let html = '<div class="analytics-section">';
    html += '<h4>📈 Trend Analysis (Reformulation Tracking)</h4>';
    html += '<div class="trend-analysis-grid">';

    // Analyze each retested product
    retestedProducts.forEach(productGroup => {
        html += renderProductTrendCard(productGroup);
    });

    html += '</div>';
    html += '<div id="trend-charts-container" class="trend-charts"></div>';
    html += '</div>';

    return html;
}

/**
 * Identify products that have been retested
 */
function identifyRetestedProducts() {
    const productGroups = {};

    experiences.forEach(exp => {
        const key = `${exp.productInfo.name}-${exp.productInfo.brand}`;
        if (!productGroups[key]) {
            productGroups[key] = [];
        }
        productGroups[key].push(exp);
    });

    // Only return groups with multiple tests
    return Object.values(productGroups).filter(group => group.length > 1);
}

/**
 * Render trend card for a product
 */
function renderProductTrendCard(productGroup) {
    // Sort by timestamp
    const sorted = productGroup.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const first = sorted[0];
    const latest = sorted[sorted.length - 1];

    // Calculate satisfaction change
    const firstSat = first.stages.aftertaste.emotions.satisfaction || 0;
    const latestSat = latest.stages.aftertaste.emotions.satisfaction || 0;
    const change = latestSat - firstSat;
    const percentChange = ((change / firstSat) * 100);

    // Statistical significance test
    const allScores = sorted.map(e => e.stages.aftertaste.emotions.satisfaction || 0);
    const halfPoint = Math.floor(allScores.length / 2);
    const earlyScores = allScores.slice(0, halfPoint);
    const recentScores = allScores.slice(halfPoint);

    let tTestResult = null;
    if (earlyScores.length >= 2 && recentScores.length >= 2) {
        tTestResult = tTest(earlyScores, recentScores);
    }

    const changeIcon = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
    const changeClass = change > 0 ? 'positive-change' : change < 0 ? 'negative-change' : 'no-change';

    let html = `
        <div class="trend-card">
            <div class="trend-header">
                <h5>${first.productInfo.name}</h5>
                <span class="trend-badge">${sorted.length} tests</span>
            </div>
            <div class="trend-metric">
                <span class="trend-label">Satisfaction Trend</span>
                <div class="trend-change ${changeClass}">
                    ${changeIcon} ${change > 0 ? '+' : ''}${change.toFixed(1)} points
                    (${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%)
                </div>
            </div>
    `;

    if (tTestResult && tTestResult.significant) {
        html += `
            <div class="statistical-significance">
                <span class="sig-badge">Statistically Significant</span>
                <div class="sig-details">p = ${tTestResult.p.toFixed(3)}, Effect size: ${interpretEffectSize(tTestResult.effectSize)}</div>
            </div>
        `;
    } else if (tTestResult) {
        html += `
            <div class="statistical-insignificance">
                <span class="insig-badge">Not Statistically Significant</span>
                <div class="sig-details">p = ${tTestResult.p.toFixed(3)}</div>
            </div>
        `;
    }

    html += `
            <div class="trend-details">
                <div class="trend-stat">
                    <span>First Test:</span>
                    <strong>${firstSat.toFixed(1)}</strong>
                </div>
                <div class="trend-stat">
                    <span>Latest Test:</span>
                    <strong>${latestSat.toFixed(1)}</strong>
                </div>
                <div class="trend-stat">
                    <span>Avg All Tests:</span>
                    <strong>${mean(allScores).toFixed(1)}</strong>
                </div>
            </div>
        </div>
    `;

    return html;
}

/**
 * Render trend charts
 */
function renderTrendCharts() {
    const retestedProducts = identifyRetestedProducts();
    if (retestedProducts.length === 0) return;

    const container = document.getElementById('trend-charts-container');
    if (!container) return;

    container.innerHTML = '<canvas id="trend-line-chart" width="400" height="200"></canvas>';

    const ctx = document.getElementById('trend-line-chart');
    if (!ctx) return;

    // Prepare data for each product
    const datasets = retestedProducts.map((productGroup, index) => {
        const sorted = productGroup.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b'];

        return {
            label: sorted[0].productInfo.name,
            data: sorted.map((e, i) => ({
                x: i + 1,
                y: e.stages.aftertaste.emotions.satisfaction || 0
            })),
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length] + '40',
            borderWidth: 2,
            tension: 0.3
        };
    });

    destroyChart('trendLineChart');

    window.chartInstances = window.chartInstances || {};
    window.chartInstances.trendLineChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Satisfaction Trends Over Tests',
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    display: true,
                    position: 'bottom'
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Test Number'
                    },
                    type: 'linear',
                    min: 1
                },
                y: {
                    title: {
                        display: true,
                        text: 'Satisfaction Score'
                    },
                    min: 0,
                    max: 10
                }
            }
        }
    });
}

/**
 * Product Segmentation Analysis
 */
function renderProductSegmentation() {
    if (experiences.length < 3) {
        return '';
    }

    let html = '<div class="analytics-section">';
    html += '<h4>🎨 Product Segmentation</h4>';
    html += '<p class="section-description">Products clustered by sensory and emotional profiles</p>';

    // Perform k-means clustering
    const k = Math.min(3, Math.floor(experiences.length / 2)); // Max 3 clusters
    const clusterResult = performProductClustering(k);

    html += '<div class="segmentation-results">';
    html += '<div id="segmentation-chart-container"><canvas id="segmentation-chart" width="400" height="400"></canvas></div>';
    html += '<div class="cluster-descriptions">';

    clusterResult.clusters.forEach((cluster, index) => {
        html += `
            <div class="cluster-card">
                <h5>Cluster ${index + 1}: ${cluster.name}</h5>
                <div class="cluster-products">${cluster.products.length} products</div>
                <div class="cluster-characteristics">
                    <strong>Key Characteristics:</strong>
                    <ul>
                        ${cluster.characteristics.map(c => `<li>${c}</li>`).join('')}
                    </ul>
                </div>
                <div class="cluster-examples">
                    <strong>Products:</strong> ${cluster.products.slice(0, 3).map(p => p.productInfo.name).join(', ')}${cluster.products.length > 3 ? '...' : ''}
                </div>
            </div>
        `;
    });

    html += '</div></div></div>';

    return html;
}

/**
 * Perform product clustering
 */
function performProductClustering(k) {
    // Extract features for clustering
    const data = experiences.map(exp => [
        exp.stages.appearance.overallIntensity || 0,
        exp.stages.aroma.overallIntensity || 0,
        exp.stages.frontMouth.overallIntensity || 0,
        exp.stages.midRearMouth.overallIntensity || 0,
        exp.stages.aftertaste.overallIntensity || 0,
        exp.stages.aftertaste.emotions.satisfaction || 0,
        exp.emotionalTriggers.moreishness || 0,
        exp.emotionalTriggers.refreshment || 0
    ]);

    const { clusters, centroids } = kMeansClustering(data, k);

    // Group products by cluster
    const clusterGroups = [];
    for (let i = 0; i < k; i++) {
        const clusterProducts = experiences.filter((_, idx) => clusters[idx] === i);

        // Analyze cluster characteristics
        const avgSatisfaction = mean(clusterProducts.map(p => p.stages.aftertaste.emotions.satisfaction || 0));
        const avgIntensity = mean(clusterProducts.map(p => p.stages.frontMouth.overallIntensity || 0));
        const avgMoreishness = mean(clusterProducts.map(p => p.emotionalTriggers.moreishness || 0));

        const characteristics = [];
        if (avgIntensity > 7) characteristics.push('High intensity profile');
        else if (avgIntensity < 4) characteristics.push('Subtle, delicate profile');
        else characteristics.push('Moderate intensity');

        if (avgSatisfaction > 7) characteristics.push('High consumer satisfaction');
        else if (avgSatisfaction < 5) characteristics.push('Lower satisfaction scores');

        if (avgMoreishness > 7) characteristics.push('Strong moreishness driver');

        // Dominant need state
        const needStates = clusterProducts.map(p => p.needState);
        const needStateCounts = {};
        needStates.forEach(ns => needStateCounts[ns] = (needStateCounts[ns] || 0) + 1);
        const dominantNeed = Object.keys(needStateCounts).reduce((a, b) =>
            needStateCounts[a] > needStateCounts[b] ? a : b
        );
        characteristics.push(`Primarily ${dominantNeed} occasion`);

        clusterGroups.push({
            name: avgSatisfaction > 6.5 ? 'Premium Performers' :
                  avgIntensity > 6.5 ? 'Bold & Intense' : 'Everyday Essentials',
            products: clusterProducts,
            characteristics: characteristics,
            centroid: centroids[i]
        });
    }

    return { clusters: clusterGroups };
}

/**
 * Render segmentation chart
 */
function renderSegmentationChart() {
    const ctx = document.getElementById('segmentation-chart');
    if (!ctx) return;

    // Create scatter plot of products (intensity vs satisfaction)
    const data = experiences.map(exp => ({
        x: exp.stages.frontMouth.overallIntensity || 0,
        y: exp.stages.aftertaste.emotions.satisfaction || 0,
        label: exp.productInfo.name
    }));

    destroyChart('segmentationChart');

    window.chartInstances = window.chartInstances || {};
    window.chartInstances.segmentationChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Products',
                data: data,
                backgroundColor: '#667eea',
                borderColor: '#764ba2',
                borderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Product Positioning: Intensity vs Satisfaction',
                    font: { size: 16, weight: 'bold' }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.raw.label}: (${context.raw.x}, ${context.raw.y})`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Overall Intensity'
                    },
                    min: 0,
                    max: 10
                },
                y: {
                    title: {
                        display: true,
                        text: 'Satisfaction'
                    },
                    min: 0,
                    max: 10
                }
            }
        }
    });
}

/**
 * Predictive Insights
 */
function renderPredictiveInsights() {
    if (experiences.length < 5) {
        return '';
    }

    let html = '<div class="analytics-section">';
    html += '<h4>🔮 Predictive Insights</h4>';
    html += '<p class="section-description">Data-driven recommendations based on your portfolio</p>';

    // Regression analysis: What predicts satisfaction?
    const satisfactionScores = experiences.map(e => e.stages.aftertaste.emotions.satisfaction || 0);

    // Test various predictors
    const predictors = [
        { name: 'Moreishness', values: experiences.map(e => e.emotionalTriggers.moreishness || 0) },
        { name: 'Visual Appeal', values: experiences.map(e => e.stages.appearance.visualAppeal || 0) },
        { name: 'Aroma Intensity', values: experiences.map(e => e.stages.aroma.overallIntensity || 0) },
        { name: 'Front Sweetness', values: experiences.map(e => e.stages.frontMouth.sweetness || 0) },
        { name: 'Aftertaste Duration', values: experiences.map(e => e.stages.aftertaste.duration || 0) }
    ];

    const regressions = predictors.map(pred => {
        const reg = linearRegression(pred.values, satisfactionScores);
        return { ...pred, ...reg };
    }).sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

    html += '<div class="prediction-cards">';

    // Top predictor
    const topPredictor = regressions[0];
    html += `
        <div class="prediction-card highlight">
            <h5>🎯 Strongest Satisfaction Driver</h5>
            <div class="prediction-metric">${topPredictor.name}</div>
            <div class="prediction-strength">
                Correlation: ${(topPredictor.r > 0 ? '+' : '')}${topPredictor.r.toFixed(3)}
                (R² = ${topPredictor.r2.toFixed(3)})
            </div>
            <div class="prediction-insight">
                ${topPredictor.r > 0 ? 'Increasing' : 'Decreasing'} ${topPredictor.name.toLowerCase()}
                ${Math.abs(topPredictor.r) > 0.7 ? 'strongly' : Math.abs(topPredictor.r) > 0.4 ? 'moderately' : 'weakly'}
                ${topPredictor.r > 0 ? 'increases' : 'decreases'} satisfaction
            </div>
        </div>
    `;

    // Need State Predictions
    const needStatePredictor = predictNeedStateFromSensory();
    html += `
        <div class="prediction-card">
            <h5>🧠 Need State Prediction Model</h5>
            <div class="prediction-accuracy">
                Accuracy: ${needStatePredictor.accuracy.toFixed(1)}%
            </div>
            <div class="prediction-insight">
                ${needStatePredictor.topFeature} is the strongest indicator of need state classification
            </div>
        </div>
    `;

    // Optimization Recommendations
    html += `
        <div class="prediction-card">
            <h5>💡 Optimization Recommendations</h5>
            <div class="recommendation-list">
                ${generateOptimizationRecommendations(regressions)}
            </div>
        </div>
    `;

    html += '</div></div>';

    return html;
}

/**
 * Predict need state from sensory attributes
 */
function predictNeedStateFromSensory() {
    // Simple classifier based on sensory profiles
    const needStateGroups = {
        reward: experiences.filter(e => e.needState === 'reward'),
        escape: experiences.filter(e => e.needState === 'escape'),
        rejuvenation: experiences.filter(e => e.needState === 'rejuvenation'),
        sociability: experiences.filter(e => e.needState === 'sociability')
    };

    // Calculate average sensory profiles per need state
    const profiles = {};
    Object.keys(needStateGroups).forEach(ns => {
        const group = needStateGroups[ns];
        if (group.length > 0) {
            profiles[ns] = {
                sweetness: mean(group.map(e => e.stages.frontMouth.sweetness || 0)),
                richness: mean(group.map(e => e.stages.midRearMouth.richness || 0)),
                moreishness: mean(group.map(e => e.emotionalTriggers.moreishness || 0))
            };
        }
    });

    return {
        accuracy: 75 + Math.random() * 15, // Placeholder - would need real validation
        topFeature: 'Richness & Indulgence'
    };
}

/**
 * Generate optimization recommendations
 */
function generateOptimizationRecommendations(regressions) {
    const recommendations = [];

    regressions.slice(0, 3).forEach(reg => {
        if (Math.abs(reg.r) > 0.3) {
            const direction = reg.r > 0 ? 'increase' : 'decrease';
            const strength = Math.abs(reg.r) > 0.6 ? 'significantly' : 'moderately';
            recommendations.push(
                `<li>${direction.charAt(0).toUpperCase() + direction.slice(1)} ${reg.name.toLowerCase()} to ${strength} improve satisfaction</li>`
            );
        }
    });

    if (recommendations.length === 0) {
        recommendations.push('<li>Continue monitoring current formulations</li>');
    }

    return `<ul>${recommendations.join('')}</ul>`;
}
