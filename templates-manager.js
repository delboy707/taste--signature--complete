// ===== PRODUCT CATEGORY TEMPLATES MANAGER =====
// Leverages 30 years of sensory expertise with pre-built templates
// Provides expert guidance for different product categories

class TemplatesManager {
    constructor() {
        this.templates = [];
        this.availableTemplates = [
            {
                id: 'chocolate-premium',
                name: 'Premium Dark Chocolate',
                category: 'Chocolate',
                file: 'templates/chocolate-premium.json'
            },
            {
                id: 'coffee-specialty',
                name: 'Specialty Coffee',
                category: 'Coffee',
                file: 'templates/coffee-specialty.json'
            },
            {
                id: 'beer-ipa',
                name: 'Craft IPA Beer',
                category: 'Beer',
                file: 'templates/beer-ipa.json'
            }
        ];
        this.currentTemplate = null;
    }

    // Load a template by ID
    async loadTemplate(templateId) {
        try {
            const templateInfo = this.availableTemplates.find(t => t.id === templateId);
            if (!templateInfo) {
                console.error('Template not found:', templateId);
                return null;
            }

            const response = await fetch(templateInfo.file);
            if (!response.ok) {
                throw new Error(`Failed to load template: ${response.status}`);
            }

            const template = await response.json();
            this.currentTemplate = template;
            console.log('✅ Loaded template:', template.templateName);
            return template;
        } catch (error) {
            console.error('Error loading template:', error);
            return null;
        }
    }

    // Get list of available templates
    getAvailableTemplates() {
        return this.availableTemplates;
    }

    // Get templates by category
    getTemplatesByCategory(category) {
        return this.availableTemplates.filter(t =>
            t.category.toLowerCase() === category.toLowerCase()
        );
    }

    // Apply template guidance to form
    applyTemplateToForm(template) {
        if (!template) return;

        // Show expert notes banner
        this.showExpertNotesBanner(template);

        // Add guided prompts to each stage
        this.enhanceFormWithGuidance(template);

        // Pre-fill common need states and emotional triggers
        this.suggestEmotionalFramework(template);
    }

    // Show expert notes banner
    showExpertNotesBanner(template) {
        // Remove existing banner if present
        const existingBanner = document.getElementById('template-expert-banner');
        if (existingBanner) {
            existingBanner.remove();
        }

        const banner = document.createElement('div');
        banner.id = 'template-expert-banner';
        banner.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        `;

        banner.innerHTML = `
            <div style="display: flex; align-items: start; gap: 15px;">
                <div style="font-size: 32px; line-height: 1;">🎓</div>
                <div style="flex: 1;">
                    <h3 style="margin: 0 0 10px 0; font-size: 18px;">Expert Template: ${template.templateName}</h3>
                    <p style="margin: 0; opacity: 0.9; font-size: 14px; line-height: 1.5;">
                        ${template.description}
                    </p>
                    <p style="margin: 10px 0 0 0; font-weight: bold; font-size: 13px;">
                        📋 Expert Notes: ${template.expertNotes}
                    </p>
                </div>
                <button onclick="window.templatesManager.clearTemplate()"
                        style="background: rgba(255,255,255,0.2); border: 1px solid white; color: white; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                    Clear Template
                </button>
            </div>
        `;

        // Insert at top of form stage 2 (after product details)
        const stage2 = document.getElementById('stage-2');
        if (stage2) {
            stage2.insertBefore(banner, stage2.firstChild);
        }
    }

    // Enhance form fields with expert guidance
    enhanceFormWithGuidance(template) {
        const stages = {
            'experience-appearance': template.guidedAttributes.appearance,
            'experience-aroma': template.guidedAttributes.aroma,
            'experience-front-mouth': template.guidedAttributes.frontMouth,
            'experience-mid-rear': template.guidedAttributes.midRearMouth,
            'experience-aftertaste': template.guidedAttributes.aftertaste,
            'experience-emotional': template.guidedAttributes.emotionalResponse
        };

        Object.keys(stages).forEach(fieldId => {
            const textarea = document.getElementById(fieldId);
            const guidance = stages[fieldId];

            if (textarea && guidance) {
                // Update placeholder with guided prompt
                textarea.placeholder = guidance.prompt;

                // Add helper text below field
                this.addGuidanceHelper(textarea, guidance);
            }
        });
    }

    // Add expert guidance helper below textarea
    addGuidanceHelper(textarea, guidance) {
        // Remove existing helper if present
        const existingHelper = textarea.parentElement.querySelector('.template-guidance');
        if (existingHelper) {
            existingHelper.remove();
        }

        const helper = document.createElement('div');
        helper.className = 'template-guidance';
        helper.style.cssText = `
            background: #f8f9ff;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin-top: 10px;
            border-radius: 6px;
            font-size: 13px;
        `;

        const attributesList = guidance.keyAttributes.map(attr => `<li>${attr}</li>`).join('');

        helper.innerHTML = `
            <div style="font-weight: bold; color: #667eea; margin-bottom: 8px;">
                🎯 Key Attributes to Evaluate:
            </div>
            <ul style="margin: 5px 0 10px 20px; line-height: 1.6;">
                ${attributesList}
            </ul>
            <div style="background: white; padding: 10px; border-radius: 4px; margin-top: 10px;">
                <strong style="color: #764ba2;">💡 Expert Tip:</strong>
                <span style="color: #555;">${guidance.expertTips}</span>
            </div>
        `;

        textarea.parentElement.insertBefore(helper, textarea.nextSibling);
    }

    // Suggest emotional framework from template
    suggestEmotionalFramework(template) {
        // Add helper to need state field
        const needStateField = document.getElementById('experience-need-state');
        if (needStateField && template.commonNeedStates) {
            const suggestionsDiv = document.createElement('div');
            suggestionsDiv.style.cssText = `
                margin-top: 8px;
                font-size: 12px;
                color: #667eea;
            `;
            suggestionsDiv.innerHTML = `
                <strong>💡 Common need states for this category:</strong>
                <div style="margin-top: 5px;">
                    ${template.commonNeedStates.map(ns =>
                        `<span style="display: inline-block; background: #f0f4ff; padding: 4px 10px; margin: 2px; border-radius: 12px; cursor: pointer;"
                               onclick="document.getElementById('experience-need-state').value='${ns}'">${ns}</span>`
                    ).join('')}
                </div>
            `;

            const existingSuggestions = needStateField.parentElement.querySelector('.need-state-suggestions');
            if (existingSuggestions) {
                existingSuggestions.remove();
            }
            suggestionsDiv.className = 'need-state-suggestions';
            needStateField.parentElement.appendChild(suggestionsDiv);
        }

        // Add helper to emotional triggers field
        const emotionalField = document.getElementById('experience-emotional-triggers');
        if (emotionalField && template.typicalEmotionalTriggers) {
            const suggestionsDiv = document.createElement('div');
            suggestionsDiv.style.cssText = `
                margin-top: 8px;
                font-size: 12px;
                color: #667eea;
            `;
            suggestionsDiv.innerHTML = `
                <strong>💡 Common emotional triggers for this category:</strong>
                <div style="margin-top: 5px;">
                    ${template.typicalEmotionalTriggers.map(trigger =>
                        `<span style="display: inline-block; background: #f0f4ff; padding: 4px 10px; margin: 2px; border-radius: 12px; cursor: pointer;"
                               onclick="document.getElementById('experience-emotional-triggers').value+=document.getElementById('experience-emotional-triggers').value ? ', ${trigger}' : '${trigger}'">${trigger}</span>`
                    ).join('')}
                </div>
            `;

            const existingSuggestions = emotionalField.parentElement.querySelector('.emotional-triggers-suggestions');
            if (existingSuggestions) {
                existingSuggestions.remove();
            }
            suggestionsDiv.className = 'emotional-triggers-suggestions';
            emotionalField.parentElement.appendChild(suggestionsDiv);
        }
    }

    // Show benchmark insights
    showBenchmarkInsights(template) {
        if (!template.benchmarkInsights) return;

        const insightsDiv = document.createElement('div');
        insightsDiv.style.cssText = `
            background: linear-gradient(135deg, #FFA500 0%, #FF6347 100%);
            color: white;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            font-size: 13px;
        `;
        insightsDiv.innerHTML = `
            <strong>📊 Benchmark Insights:</strong><br>
            ${template.benchmarkInsights}
        `;

        const stage7 = document.getElementById('stage-7');
        if (stage7) {
            stage7.appendChild(insightsDiv);
        }
    }

    // Clear current template and remove guidance
    clearTemplate() {
        this.currentTemplate = null;

        // Remove expert banner
        const banner = document.getElementById('template-expert-banner');
        if (banner) banner.remove();

        // Remove all guidance helpers
        document.querySelectorAll('.template-guidance').forEach(el => el.remove());

        // Remove suggestion helpers
        document.querySelectorAll('.need-state-suggestions, .emotional-triggers-suggestions').forEach(el => el.remove());

        console.log('✅ Template cleared');
    }

    // Show template selector modal
    showTemplateSelector() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';

        const templatesHTML = this.availableTemplates.map(t => `
            <div class="template-card" style="border: 2px solid #e0e7ff; border-radius: 12px; padding: 20px; margin-bottom: 15px; cursor: pointer; transition: all 0.3s;"
                 onmouseover="this.style.borderColor='#667eea'; this.style.background='#f8f9ff';"
                 onmouseout="this.style.borderColor='#e0e7ff'; this.style.background='white';"
                 onclick="window.templatesManager.selectAndApplyTemplate('${t.id}')">
                <h3 style="margin: 0 0 10px 0; color: #667eea;">${t.name}</h3>
                <p style="margin: 0; color: #666; font-size: 13px;">Category: ${t.category}</p>
                <p style="margin: 5px 0 0 0; font-size: 11px; color: #999;">Expert guidance with 30 years of sensory science</p>
            </div>
        `).join('');

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>🎓 Choose Expert Template</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: 20px; color: #666;">
                        Select a product category template to receive expert guidance throughout your sensory evaluation.
                    </p>
                    ${templatesHTML}
                    <button class="btn-secondary" style="width: 100%; margin-top: 15px;" onclick="this.closest('.modal').remove()">
                        Continue Without Template
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    // Select and apply template
    async selectAndApplyTemplate(templateId) {
        // Close modal
        const modal = document.querySelector('.modal');
        if (modal) modal.remove();

        // Load and apply template
        const template = await this.loadTemplate(templateId);
        if (template) {
            this.applyTemplateToForm(template);
            this.showBenchmarkInsights(template);

            // Show success message
            alert(`✅ ${template.templateName} template loaded! Expert guidance is now available for each stage.`);
        }
    }
}

// Initialize and make available globally
if (typeof window !== 'undefined') {
    window.TemplatesManager = TemplatesManager;
    window.templatesManager = new TemplatesManager();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TemplatesManager;
}
