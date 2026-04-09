// ===== PDF EXPORT MODULE =====
// Generates professional branded PDF reports for stakeholders

class PDFExporter {
    constructor() {
        this.jsPDF = window.jspdf?.jsPDF;
        this.companyData = null;
        this.brandColor = '#667eea'; // Default brand color
        this.logoDataUrl = null;
    }

    /**
     * Set company branding information
     */
    setCompanyBranding(companyData, logoDataUrl = null) {
        this.companyData = companyData;
        this.logoDataUrl = logoDataUrl;

        // Could customize brand color based on industry
        const industryColors = {
            'chocolate': '#8B4513',
            'beverages': '#4299E1',
            'snacks': '#F6AD55',
            'dairy': '#90CDF4'
        };

        this.brandColor = industryColors[companyData?.industry] || '#667eea';
    }

    /**
     * Generate Product Insight Report
     */
    async generateProductReport(experience, aiInsights = null) {
        const doc = new this.jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        let yPos = 20;

        // Header with branding
        yPos = this.addHeader(doc, pageWidth, yPos, 'Product Insight Report');

        // Product Information Section
        yPos = this.addSection(doc, yPos, 'Product Information', () => {
            let y = yPos;
            doc.setFontSize(11);
            doc.text(`Product: ${experience.productInfo.name}`, 20, y);
            y += 7;
            doc.text(`Brand: ${experience.productInfo.brand}`, 20, y);
            y += 7;
            doc.text(`Category: ${experience.productInfo.type}`, 20, y);
            y += 7;
            doc.text(`Need State: ${experience.needState}`, 20, y);
            y += 7;
            doc.text(`Test Date: ${new Date(experience.timestamp).toLocaleDateString()}`, 20, y);
            return y + 10;
        });

        // Sensory Profile Section
        yPos = this.addSection(doc, yPos, 'Sensory Profile', () => {
            let y = yPos;

            // Create sensory attributes table
            // Build sensory table dynamically from stored stage data
            const stageRows = Object.entries(experience.stages || {}).map(([stageId, stageData]) => {
                const attrs = Object.entries(stageData)
                    .filter(([k, v]) => k !== 'emotions' && typeof v === 'number')
                    .slice(0, 3);
                const keyAttrs = attrs.map(([k, v]) => `${k.replace(/-/g, ' ')}: ${v}/10`).join(', ') || '—';
                const intensity = attrs.length ? Math.round(attrs.reduce((s, [, v]) => s + v, 0) / attrs.length) : 0;
                return [stageId.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()), keyAttrs, `${intensity}/10`];
            });
            const sensoryData = [['Stage', 'Key Attributes', 'Avg Intensity'], ...stageRows];

            doc.autoTable({
                startY: y,
                head: [sensoryData[0]],
                body: sensoryData.slice(1),
                theme: 'grid',
                headStyles: { fillColor: this.hexToRgb(this.brandColor) },
                margin: { left: 20, right: 20 }
            });

            return doc.lastAutoTable.finalY + 10;
        });

        // Emotional Profile Section
        yPos = this.addSection(doc, yPos, 'Emotional Profile', () => {
            let y = yPos;

            // Get top 5 emotions across all stages
            const allEmotions = this.extractTopEmotions(experience, 5);

            const emotionData = [
                ['Emotion', 'Stage', 'Intensity'],
                ...allEmotions.map(e => [e.emotion.charAt(0).toUpperCase() + e.emotion.slice(1), e.stage, `${e.value}/10`])
            ];

            doc.autoTable({
                startY: y,
                head: [emotionData[0]],
                body: emotionData.slice(1),
                theme: 'striped',
                headStyles: { fillColor: this.hexToRgb(this.brandColor) },
                margin: { left: 20, right: 20 }
            });

            return doc.lastAutoTable.finalY + 10;
        });

        // Emotional Triggers
        yPos = this.addSection(doc, yPos, 'Emotional Triggers', () => {
            let y = yPos;

            // Build emotion summary from all stages
            const allEmotions = {};
            Object.values(experience.stages || {}).forEach(stageData => {
                Object.entries(stageData.emotions || {}).forEach(([k, v]) => {
                    if (typeof v === 'number') allEmotions[k] = Math.max(allEmotions[k] || 0, v);
                });
            });
            const topEmotions = Object.entries(allEmotions)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 4);
            const triggerData = [
                ['Emotion', 'Rating', 'Impact'],
                ...(topEmotions.length ? topEmotions.map(([k, v]) => [
                    k.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                    `${v}/10`,
                    this.getRatingLevel(v)
                ]) : [['No emotion data', '—', '—']])
            ];

            doc.autoTable({
                startY: y,
                head: [triggerData[0]],
                body: triggerData.slice(1),
                theme: 'plain',
                headStyles: { fillColor: this.hexToRgb(this.brandColor) },
                margin: { left: 20, right: 20 }
            });

            return doc.lastAutoTable.finalY + 10;
        });

        // AI Insights Section (if provided)
        if (aiInsights) {
            // Check if new page needed
            if (yPos > pageHeight - 60) {
                doc.addPage();
                yPos = 20;
                yPos = this.addHeader(doc, pageWidth, yPos, 'AI Strategic Insights');
            }

            yPos = this.addSection(doc, yPos, 'AI Strategic Insights', () => {
                let y = yPos;
                doc.setFontSize(10);
                const insights = aiInsights.substring(0, 2000); // Limit length
                const splitText = doc.splitTextToSize(insights, pageWidth - 40);
                doc.text(splitText, 20, y);
                return y + (splitText.length * 5) + 10;
            });
        }

        // Footer
        this.addFooter(doc, pageWidth, pageHeight);

        // Save
        const filename = `${experience.productInfo.name.replace(/\s+/g, '_')}_Report_${Date.now()}.pdf`;
        doc.save(filename);

        return { success: true, filename: filename };
    }

    /**
     * Generate Portfolio Analysis Report
     */
    async generatePortfolioReport(experiences, portfolioInsights = null) {
        const doc = new this.jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        let yPos = 20;

        // Header
        yPos = this.addHeader(doc, pageWidth, yPos, 'Portfolio Analysis Report');

        // Overview Section
        yPos = this.addSection(doc, yPos, 'Portfolio Overview', () => {
            let y = yPos;
            doc.setFontSize(11);
            doc.text(`Total Products Analyzed: ${experiences.length}`, 20, y);
            y += 7;
            doc.text(`Report Generated: ${new Date().toLocaleDateString()}`, 20, y);
            y += 7;

            // Need state distribution
            const needStates = {};
            experiences.forEach(exp => {
                needStates[exp.needState] = (needStates[exp.needState] || 0) + 1;
            });

            doc.text('Need State Distribution:', 20, y);
            y += 7;
            Object.entries(needStates).forEach(([state, count]) => {
                doc.text(`  ${state}: ${count} (${Math.round(count/experiences.length*100)}%)`, 25, y);
                y += 6;
            });

            return y + 10;
        });

        // Product Summary Table
        yPos = this.addSection(doc, yPos, 'Product Summary', () => {
            let y = yPos;

            const productData = [
                ['Product', 'Brand', 'Need State', 'Satisfaction'],
                ...experiences.slice(0, 20).map(exp => [
                    exp.productInfo.name.substring(0, 30),
                    exp.productInfo.brand.substring(0, 20),
                    exp.needState,
                    `${exp.stages?.aftertaste?.emotions?.satisfaction || 'N/A'}/10`
                ])
            ];

            doc.autoTable({
                startY: y,
                head: [productData[0]],
                body: productData.slice(1),
                theme: 'grid',
                headStyles: { fillColor: this.hexToRgb(this.brandColor) },
                margin: { left: 20, right: 20 },
                styles: { fontSize: 8 }
            });

            return doc.lastAutoTable.finalY + 10;
        });

        // Top Performers
        const topProducts = experiences
            .sort((a, b) => (b.stages?.aftertaste?.emotions?.satisfaction || 0) - (a.stages?.aftertaste?.emotions?.satisfaction || 0))
            .slice(0, 5);

        yPos = this.addSection(doc, yPos, 'Top 5 Products by Satisfaction', () => {
            let y = yPos;

            topProducts.forEach((exp, idx) => {
                doc.setFontSize(10);
                doc.text(`${idx + 1}. ${exp.productInfo.name} - ${exp.stages?.aftertaste?.emotions?.satisfaction || 'N/A'}/10`, 20, y);
                y += 7;
            });

            return y + 10;
        });

        // Portfolio Insights (if provided)
        if (portfolioInsights) {
            if (yPos > pageHeight - 60) {
                doc.addPage();
                yPos = 20;
                yPos = this.addHeader(doc, pageWidth, yPos, 'Strategic Insights');
            }

            yPos = this.addSection(doc, yPos, 'AI Portfolio Insights', () => {
                let y = yPos;
                doc.setFontSize(10);
                const insights = portfolioInsights.substring(0, 2500);
                const splitText = doc.splitTextToSize(insights, pageWidth - 40);
                doc.text(splitText, 20, y);
                return y + (splitText.length * 5) + 10;
            });
        }

        // Footer
        this.addFooter(doc, pageWidth, pageHeight);

        // Save
        const filename = `Portfolio_Analysis_${Date.now()}.pdf`;
        doc.save(filename);

        return { success: true, filename: filename };
    }

    /**
     * Generate Product Comparison Report
     */
    async generateComparisonReport(experiences, comparisonInsights = null) {
        const doc = new this.jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        let yPos = 20;

        // Header
        yPos = this.addHeader(doc, pageWidth, yPos, 'Product Comparison Report');

        // Products Being Compared
        yPos = this.addSection(doc, yPos, 'Products Under Comparison', () => {
            let y = yPos;
            experiences.forEach((exp, idx) => {
                doc.setFontSize(11);
                doc.text(`${idx + 1}. ${exp.productInfo.name} (${exp.productInfo.brand})`, 20, y);
                y += 7;
            });
            return y + 10;
        });

        // Sensory Comparison Table
        yPos = this.addSection(doc, yPos, 'Sensory Comparison', () => {
            let y = yPos;

            const lexicon = typeof getActiveLexicon === 'function' ? getActiveLexicon() : null;
            const stageIds = lexicon ? lexicon.stages.map(s => s.id) : Object.keys(experiences[0]?.stages || {});
            const comparisonData = [
                ['Stage', ...experiences.map((exp, idx) => `Product ${idx + 1}`)],
                ...stageIds.map(stageId => [
                    stageId.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()),
                    ...experiences.map(exp => {
                        const stageData = exp.stages?.[stageId] || {};
                        const nums = Object.entries(stageData)
                            .filter(([k, v]) => k !== 'emotions' && typeof v === 'number')
                            .map(([, v]) => v);
                        const avg = nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : '—';
                        return nums.length ? `${avg}/10` : '—';
                    })
                ])
            ];

            doc.autoTable({
                startY: y,
                head: [comparisonData[0]],
                body: comparisonData.slice(1),
                theme: 'grid',
                headStyles: { fillColor: this.hexToRgb(this.brandColor) },
                margin: { left: 20, right: 20 },
                styles: { fontSize: 9, halign: 'center' }
            });

            return doc.lastAutoTable.finalY + 10;
        });

        // Top Emotions Comparison
        yPos = this.addSection(doc, yPos, 'Top Emotions Comparison', () => {
            let y = yPos;

            // Collect union of all emotion keys across all products
            const emotionKeySet = new Set();
            experiences.forEach(exp => {
                Object.values(exp.stages || {}).forEach(stageData => {
                    Object.keys(stageData.emotions || {}).forEach(k => emotionKeySet.add(k));
                });
            });
            const emotionKeys = [...emotionKeySet].slice(0, 4);
            const getMaxEmotion = (exp, key) => {
                let max = 0;
                Object.values(exp.stages || {}).forEach(stageData => {
                    const v = stageData.emotions?.[key];
                    if (typeof v === 'number' && v > max) max = v;
                });
                return max;
            };
            const triggerData = [
                ['Emotion', ...experiences.map((exp, idx) => `Product ${idx + 1}`)],
                ...(emotionKeys.length ? emotionKeys.map(k => [
                    k.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                    ...experiences.map(exp => `${getMaxEmotion(exp, k)}/10`)
                ]) : [['No emotion data', ...experiences.map(() => '—')]])
            ];

            doc.autoTable({
                startY: y,
                head: [triggerData[0]],
                body: triggerData.slice(1),
                theme: 'striped',
                headStyles: { fillColor: this.hexToRgb(this.brandColor) },
                margin: { left: 20, right: 20 },
                styles: { fontSize: 9, halign: 'center' }
            });

            return doc.lastAutoTable.finalY + 10;
        });

        // AI Comparison Insights
        if (comparisonInsights) {
            if (yPos > pageHeight - 60) {
                doc.addPage();
                yPos = 20;
                yPos = this.addHeader(doc, pageWidth, yPos, 'Comparison Insights');
            }

            yPos = this.addSection(doc, yPos, 'AI Comparison Analysis', () => {
                let y = yPos;
                doc.setFontSize(10);
                const insights = comparisonInsights.substring(0, 2500);
                const splitText = doc.splitTextToSize(insights, pageWidth - 40);
                doc.text(splitText, 20, y);
                return y + (splitText.length * 5) + 10;
            });
        }

        // Footer
        this.addFooter(doc, pageWidth, pageHeight);

        // Save
        const filename = `Product_Comparison_${Date.now()}.pdf`;
        doc.save(filename);

        return { success: true, filename: filename };
    }

    /**
     * Helper: Add header to PDF
     */
    addHeader(doc, pageWidth, yPos, title) {
        // Company logo (if available)
        if (this.logoDataUrl) {
            try {
                doc.addImage(this.logoDataUrl, 'PNG', 20, yPos - 5, 30, 30);
            } catch (error) {
                console.log('Logo not added:', error);
            }
        }

        // Title
        doc.setFontSize(18);
        doc.setTextColor(this.hexToRgb(this.brandColor)[0], this.hexToRgb(this.brandColor)[1], this.hexToRgb(this.brandColor)[2]);
        doc.text(title, pageWidth / 2, yPos + 10, { align: 'center' });

        // Company name
        if (this.companyData?.companyName) {
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(this.companyData.companyName, pageWidth / 2, yPos + 18, { align: 'center' });
        }

        // Line
        doc.setDrawColor(this.hexToRgb(this.brandColor)[0], this.hexToRgb(this.brandColor)[1], this.hexToRgb(this.brandColor)[2]);
        doc.setLineWidth(0.5);
        doc.line(20, yPos + 25, pageWidth - 20, yPos + 25);

        doc.setTextColor(0, 0, 0); // Reset to black

        return yPos + 35;
    }

    /**
     * Helper: Add section heading
     */
    addSection(doc, yPos, title, contentCallback) {
        doc.setFontSize(14);
        doc.setTextColor(this.hexToRgb(this.brandColor)[0], this.hexToRgb(this.brandColor)[1], this.hexToRgb(this.brandColor)[2]);
        doc.text(title, 20, yPos);
        doc.setTextColor(0, 0, 0);

        yPos += 8;

        return contentCallback ? contentCallback() : yPos;
    }

    /**
     * Helper: Add footer
     */
    addFooter(doc, pageWidth, pageHeight) {
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Generated by Taste Signature Professional Platform', pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text(`${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, pageWidth / 2, pageHeight - 6, { align: 'center' });
    }

    /**
     * Helper: Extract top emotions from experience
     */
    extractTopEmotions(experience, limit = 5) {
        const emotions = [];
        Object.entries(experience.stages).forEach(([stageName, stage]) => {
            if (stage.emotions) {
                Object.entries(stage.emotions).forEach(([emotion, value]) => {
                    emotions.push({ stage: stageName, emotion, value });
                });
            }
        });

        return emotions
            .sort((a, b) => b.value - a.value)
            .slice(0, limit);
    }

    /**
     * Helper: Get rating level description
     */
    getRatingLevel(value) {
        if (value >= 8) return 'Very High';
        if (value >= 6) return 'High';
        if (value >= 4) return 'Moderate';
        if (value >= 2) return 'Low';
        return 'Very Low';
    }

    /**
     * Helper: Convert hex color to RGB array
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : [102, 126, 234];
    }
}

// Export
if (typeof window !== 'undefined') {
    window.PDFExporter = PDFExporter;
}
