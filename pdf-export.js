// ===== PDF EXPORT MODULE =====
// Generates professional branded PDF reports for stakeholders

class PDFExporter {
    constructor() {
        this.jsPDF = window.jspdf?.jsPDF;
        this.companyData = null;
        this.brandColor = '#C2871B'; // QEP gold
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

        this.brandColor = '#C2871B'; // QEP gold - single brand colour, industry theming removed
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
        yPos = this.addSection(doc, yPos, 'Product Information', (sectionY) => {
            let y = sectionY;
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
        yPos = this.addSection(doc, yPos, 'Sensory Profile', (sectionY) => {
            let y = sectionY;

            // One row per sensory stage, read from the current stage fields
            // (attrIdToKey keys): the top 3 rated attributes, and the stage
            // intensity the Shape of Taste chart plots. Null = "Not rated".
            const stages = experience.stages || {};
            const sensoryData = [
                ['Stage', 'Key Attributes', 'Intensity'],
                ...PDFExporter.SENSORY_STAGE_ROWS.map(([stageKey, label]) => [
                    label,
                    this.formatKeyAttributes(stages[stageKey], 3),
                    this.formatRating(this.stageIntensity(stageKey, stages[stageKey]))
                ])
            ];

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
        yPos = this.addSection(doc, yPos, 'Emotional Profile', (sectionY) => {
            let y = sectionY;

            // Get top 5 emotions across all stages
            const allEmotions = this.extractTopEmotions(experience, 5);

            const emotionData = [
                ['Emotion', 'Stage', 'Intensity'],
                ...allEmotions.map(e => [e.emotion.charAt(0).toUpperCase() + e.emotion.slice(1), e.stage, `${e.value}/10`])
            ];

            // Consumer selections (CATA) from a QEP CSV import: never a 0-10 value.
            const cataRows = window.CataEmotions ? window.CataEmotions.buildCataTableRows(experience) : [];

            if (allEmotions.length > 0 || cataRows.length === 0) {
                doc.autoTable({
                    startY: y,
                    head: [emotionData[0]],
                    body: emotionData.slice(1),
                    theme: 'striped',
                    headStyles: { fillColor: this.hexToRgb(this.brandColor) },
                    margin: { left: 20, right: 20 }
                });
                y = doc.lastAutoTable.finalY + 10;
            }

            if (cataRows.length > 0) {
                doc.setFontSize(9);
                doc.text('Selected by consumers (check-all-that-apply): a % is the share of consumers; not a 0-10 rating.', 20, y);
                doc.autoTable({
                    startY: y + 4,
                    head: [['Emotion', 'Stage', 'Selected by consumers']],
                    body: cataRows,
                    theme: 'striped',
                    headStyles: { fillColor: this.hexToRgb(this.brandColor) },
                    margin: { left: 20, right: 20 }
                });
                y = doc.lastAutoTable.finalY + 10;
            }

            return y;
        });

        // Emotional Triggers
        yPos = this.addSection(doc, yPos, 'Emotional Triggers', (sectionY) => {
            let y = sectionY;

            // An untouched trigger is null: "Not rated", never "null/10".
            const triggers = experience.emotionalTriggers || {};
            const triggerData = [
                ['Trigger', 'Rating', 'Impact'],
                ...PDFExporter.TRIGGER_ROWS.map(([key, label]) => [
                    label,
                    this.formatRating(triggers[key]),
                    this.isRated(triggers[key]) ? this.getRatingLevel(triggers[key]) : '-'
                ])
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
        yPos = this.addSection(doc, yPos, 'Portfolio Overview', (sectionY) => {
            let y = sectionY;
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
        yPos = this.addSection(doc, yPos, 'Product Summary', (sectionY) => {
            let y = sectionY;

            const productData = [
                ['Product', 'Brand', 'Need State', 'Satisfaction'],
                ...experiences.slice(0, 20).map(exp => [
                    exp.productInfo.name.substring(0, 30),
                    exp.productInfo.brand.substring(0, 20),
                    exp.needState,
                    this.formatRating(exp.stages?.aftertaste?.emotions?.satisfaction)
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

        yPos = this.addSection(doc, yPos, 'Top 5 Products by Satisfaction', (sectionY) => {
            let y = sectionY;

            topProducts.forEach((exp, idx) => {
                doc.setFontSize(10);
                doc.text(`${idx + 1}. ${exp.productInfo.name} - ${this.formatRating(exp.stages?.aftertaste?.emotions?.satisfaction)}`, 20, y);
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
        yPos = this.addSection(doc, yPos, 'Products Under Comparison', (sectionY) => {
            let y = sectionY;
            experiences.forEach((exp, idx) => {
                doc.setFontSize(11);
                doc.text(`${idx + 1}. ${exp.productInfo.name} (${exp.productInfo.brand})`, 20, y);
                y += 7;
            });
            return y + 10;
        });

        // Sensory Comparison Table
        yPos = this.addSection(doc, yPos, 'Sensory Comparison', (sectionY) => {
            let y = sectionY;

            const comparisonData = [
                ['Attribute', ...experiences.map((exp, idx) => `Product ${idx + 1}`)],
                // Current field first, then the legacy name (demo data still uses it).
                ...PDFExporter.COMPARISON_ROWS.map(([label, stageKey, keys]) => [
                    label,
                    ...experiences.map(exp => this.formatRating(this.firstRating(exp.stages?.[stageKey], keys)))
                ]),
                ['Satisfaction', ...experiences.map(exp => this.formatRating(exp.stages?.aftertaste?.emotions?.satisfaction))]
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

        // Emotional Trigger Comparison
        yPos = this.addSection(doc, yPos, 'Emotional Triggers Comparison', (sectionY) => {
            let y = sectionY;

            const triggerData = [
                ['Trigger', ...experiences.map((exp, idx) => `Product ${idx + 1}`)],
                ...PDFExporter.TRIGGER_ROWS.map(([key, label]) => [
                    key === 'crunch' ? 'Crunch' : label,
                    ...experiences.map(exp => this.formatRating(exp.emotionalTriggers?.[key]))
                ])
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

        return contentCallback ? contentCallback(yPos) : yPos;
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
                    // null = not rated (untouched slider or a CATA stage): no "null/10" row
                    if (typeof value !== 'number') return;
                    emotions.push({ stage: stageName, emotion, value });
                });
            }
        });

        return emotions
            .sort((a, b) => b.value - a.value)
            .slice(0, limit);
    }

    /**
     * Helper: a 0-10 rating is a finite number. null/undefined (an untouched
     * slider, a CATA stage, a field this experience does not have) is not.
     */
    isRated(value) {
        return typeof value === 'number' && Number.isFinite(value);
    }

    /**
     * Helper: "7/10", or "Not rated" - never "undefined/10" / "null/10".
     */
    formatRating(value) {
        return this.isRated(value) ? `${value}/10` : 'Not rated';
    }

    /**
     * Helper: the first rated value among keys on a stage object.
     */
    firstRating(stage, keys) {
        if (!stage) return null;
        for (const key of keys) {
            if (this.isRated(stage[key])) return stage[key];
        }
        return null;
    }

    /**
     * Helper: a stage's intensity - the attribute the Shape of Taste chart
     * plots for it (app.js renderShapeOfTaste), else the legacy
     * overallIntensity field (demo data).
     */
    stageIntensity(stageKey, stage) {
        const headline = PDFExporter.STAGE_INTENSITY_KEYS[stageKey];
        return this.firstRating(stage, headline ? [headline, 'overallIntensity'] : ['overallIntensity']);
    }

    /**
     * Helper: attribute field key -> lexicon label ('visualAppeal' ->
     * 'Visual Appeal'); a key not in the lexicon is split into words.
     */
    attributeLabel(key) {
        const w = (typeof window !== 'undefined') ? window : {};
        const attrId = w.keyToAttrId ? w.keyToAttrId(key) : key;
        const attr = w.getAttributeById ? w.getAttributeById(attrId) : null;
        if (attr && attr.label) return attr.label;
        const words = String(key).replace(/([A-Z])/g, ' $1').trim();
        return words.charAt(0).toUpperCase() + words.slice(1);
    }

    /**
     * Helper: the top rated numeric attributes of a stage, "Label: x/10, ...",
     * or "Not rated" when the stage has none.
     */
    formatKeyAttributes(stage, limit = 3) {
        const entries = Object.entries(stage || {})
            .filter(([k, v]) => k !== 'emotions' && k !== 'overallIntensity' && this.isRated(v))
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit);
        if (entries.length === 0) return 'Not rated';
        return entries.map(([k, v]) => `${this.attributeLabel(k)}: ${this.formatRating(v)}`).join(', ');
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

// The six sensory stages of the report, in Journey-of-Taste order.
PDFExporter.SENSORY_STAGE_ROWS = [
    ['appearance', 'Appearance'],
    ['aroma', 'Aroma'],
    ['frontMouth', 'Front of Mouth'],
    ['midRearMouth', 'Mid/Rear Mouth'],
    ['texture', 'Texture'],
    ['aftertaste', 'Aftertaste']
];

// Per-stage intensity field, the same one the Shape of Taste chart plots.
PDFExporter.STAGE_INTENSITY_KEYS = {
    appearance: 'visualAppeal',
    aroma: 'smellStrength',
    frontMouth: 'overallInitialImpact',
    midRearMouth: 'overallMidPalateIntensity',
    texture: 'overallTexturalComplexity',
    aftertaste: 'finishLength'
};

PDFExporter.TRIGGER_ROWS = [
    ['moreishness', 'Moreishness'],
    ['refreshment', 'Refreshment'],
    ['melt', 'The Melt'],
    ['crunch', 'Texture/Crunch']
];

// Comparison rows: [label, stage, [current field, legacy field]].
PDFExporter.COMPARISON_ROWS = [
    ['Visual Appeal', 'appearance', ['visualAppeal']],
    ['Aroma Intensity', 'aroma', ['smellStrength', 'intensity']],
    ['Sweetness', 'frontMouth', ['sweetness']],
    ['Richness', 'midRearMouth', ['richnessFullness', 'richness']],
    ['Texture Complexity', 'texture', ['overallTexturalComplexity', 'overallComplexity']],
    ['Aftertaste', 'aftertaste', ['finishLength', 'duration']]
];

// Export
if (typeof window !== 'undefined') {
    window.PDFExporter = PDFExporter;
}
