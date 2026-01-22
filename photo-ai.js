// ===== PHOTO AI MODULE =====
// AI-powered product image analysis using Claude Vision
// Automatically extracts sensory attributes from product photos

const PhotoAI = {
    maxImageSize: 5 * 1024 * 1024, // 5MB max
    supportedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    isAnalyzing: false,

    /**
     * Initialize Photo AI
     */
    init() {
        console.log('✅ Photo AI initialized');
    },

    /**
     * Analyze a product image and extract sensory attributes
     */
    async analyzeImage(imageFile, options = {}) {
        if (this.isAnalyzing) {
            throw new Error('Analysis already in progress');
        }

        // Validate file
        this.validateImage(imageFile);

        this.isAnalyzing = true;
        this.showAnalyzingState(true);

        try {
            // Convert image to base64
            const base64Data = await this.fileToBase64(imageFile);
            const mediaType = imageFile.type;

            // Build the analysis prompt
            const analysisType = options.analysisType || 'full';
            const category = options.category || null;
            const prompt = this.buildAnalysisPrompt(analysisType, category);

            // Call Claude Vision API
            const result = await this.callVisionAPI(base64Data, mediaType, prompt);

            // Parse the response
            const analysis = this.parseAnalysisResponse(result);

            this.isAnalyzing = false;
            this.showAnalyzingState(false);

            return analysis;

        } catch (error) {
            this.isAnalyzing = false;
            this.showAnalyzingState(false);
            console.error('Photo AI analysis failed:', error);
            throw error;
        }
    },

    /**
     * Validate image file
     */
    validateImage(file) {
        if (!file) {
            throw new Error('No image file provided');
        }

        if (!this.supportedTypes.includes(file.type)) {
            throw new Error(`Unsupported image type: ${file.type}. Use JPEG, PNG, GIF, or WebP.`);
        }

        if (file.size > this.maxImageSize) {
            throw new Error(`Image too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum size is 5MB.`);
        }
    },

    /**
     * Convert file to base64
     */
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // Remove data URL prefix to get just the base64 data
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = () => reject(new Error('Failed to read image file'));
            reader.readAsDataURL(file);
        });
    },

    /**
     * Build analysis prompt based on type
     */
    buildAnalysisPrompt(analysisType, category) {
        const basePrompt = `You are a professional sensory analyst examining a food/beverage product image.

Analyze this product image and extract sensory attributes. Respond ONLY with valid JSON in this exact format:

{
    "productName": "detected product name or 'Unknown Product'",
    "category": "detected category (chocolate, coffee, wine, beer, cheese, snack, beverage, sauce, or other)",
    "appearance": {
        "color": "primary color description",
        "colorIntensity": 7,
        "texture": "visual texture description",
        "visualAppeal": 8,
        "packaging": "packaging description if visible"
    },
    "estimatedAttributes": {
        "aroma": "likely aroma profile based on product type",
        "aromaIntensity": 6,
        "taste": "likely taste profile",
        "sweetness": 5,
        "richness": 7
    },
    "suggestedEmotions": ["emotion1", "emotion2", "emotion3"],
    "suggestedNeedState": "most likely need state",
    "confidence": 0.85,
    "notes": "additional observations about the product"
}`;

        if (category) {
            return basePrompt + `\n\nNote: This product is categorized as "${category}". Use this context for more accurate analysis.`;
        }

        return basePrompt;
    },

    /**
     * Call Claude Vision API
     */
    async callVisionAPI(base64Data, mediaType, prompt) {
        // Check if ClaudeAI is available
        if (!window.claudeAI) {
            throw new Error('Claude AI not initialized. Please configure your API key.');
        }

        // Get API configuration
        const apiUrl = window.AI_CONFIG?.ANTHROPIC_API_URL;
        const apiKey = window.AI_CONFIG?.ANTHROPIC_API_KEY;
        const model = window.AI_CONFIG?.CLAUDE_MODEL || 'claude-sonnet-4-20250514';

        if (!apiUrl) {
            throw new Error('API URL not configured');
        }

        // Build headers
        const headers = {
            'Content-Type': 'application/json'
        };

        // Get auth token or use API key
        let authToken = null;
        if (window.claudeAI.hasOwnApiKey()) {
            headers['x-api-key'] = apiKey;
        } else if (window.authManager && window.authManager.currentUser) {
            authToken = await window.authManager.currentUser.getIdToken();
            headers['Authorization'] = `Bearer ${authToken}`;
            headers['X-User-Id'] = window.authManager.currentUser.uid;
        } else {
            throw new Error('Please sign in or add your own API key to use Photo AI');
        }

        // Build request with image
        const requestBody = {
            model: model,
            max_tokens: 1024,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: mediaType,
                                data: base64Data
                            }
                        },
                        {
                            type: 'text',
                            text: prompt
                        }
                    ]
                }
            ]
        };

        console.log('📸 Sending image to Claude Vision API...');

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMsg = errorData.error?.message || response.statusText;
            throw new Error(`Vision API Error: ${errorMsg}`);
        }

        const data = await response.json();
        return data.content[0].text;
    },

    /**
     * Parse the AI analysis response
     */
    parseAnalysisResponse(responseText) {
        try {
            // Try to extract JSON from the response
            let jsonStr = responseText;

            // Handle markdown code blocks
            const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1].trim();
            }

            const analysis = JSON.parse(jsonStr);

            // Validate required fields
            if (!analysis.productName) {
                analysis.productName = 'Unknown Product';
            }
            if (!analysis.category) {
                analysis.category = 'other';
            }
            if (!analysis.appearance) {
                analysis.appearance = {};
            }

            return analysis;

        } catch (error) {
            console.error('Failed to parse AI response:', error);
            console.log('Raw response:', responseText);

            // Return a basic structure if parsing fails
            return {
                productName: 'Unknown Product',
                category: 'other',
                appearance: {
                    color: 'Unable to analyze',
                    visualAppeal: 5
                },
                confidence: 0,
                notes: 'Analysis parsing failed. Please try again.',
                rawResponse: responseText
            };
        }
    },

    /**
     * Show/hide analyzing state
     */
    showAnalyzingState(isAnalyzing) {
        const overlay = document.getElementById('photo-ai-overlay');
        if (overlay) {
            overlay.style.display = isAnalyzing ? 'flex' : 'none';
        }

        // Update all analyze buttons
        document.querySelectorAll('.photo-ai-btn').forEach(btn => {
            if (isAnalyzing) {
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner"></span> Analyzing...';
            } else {
                btn.disabled = false;
                btn.innerHTML = '<span class="photo-icon">📷</span><span class="photo-text">Photo AI</span>';
            }
        });
    },

    /**
     * Create the Photo AI upload UI
     */
    createUploadUI(containerId, onAnalysisComplete) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="photo-ai-upload">
                <div class="photo-ai-dropzone" id="photo-ai-dropzone">
                    <div class="dropzone-icon">📷</div>
                    <div class="dropzone-text">
                        <strong>Drop product photo here</strong>
                        <span>or click to browse</span>
                    </div>
                    <input type="file" id="photo-ai-input" accept="image/*" capture="environment" hidden>
                </div>
                <div class="photo-ai-preview" id="photo-ai-preview" style="display: none;">
                    <img id="photo-ai-image" src="" alt="Product preview">
                    <div class="preview-actions">
                        <button type="button" class="btn-secondary" onclick="PhotoAI.clearPreview()">Clear</button>
                        <button type="button" class="btn-primary photo-ai-analyze" onclick="PhotoAI.triggerAnalysis()">
                            <span class="photo-icon">✨</span> Analyze with AI
                        </button>
                    </div>
                </div>
                <div class="photo-ai-results" id="photo-ai-results" style="display: none;"></div>
            </div>
        `;

        // Store callback
        this.onAnalysisComplete = onAnalysisComplete;

        // Setup event listeners
        this.setupDropzone();
    },

    /**
     * Setup dropzone events
     */
    setupDropzone() {
        const dropzone = document.getElementById('photo-ai-dropzone');
        const input = document.getElementById('photo-ai-input');

        if (!dropzone || !input) return;

        // Click to browse
        dropzone.addEventListener('click', () => input.click());

        // File selected
        input.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFile(e.target.files[0]);
            }
        });

        // Drag and drop
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');

            if (e.dataTransfer.files.length > 0) {
                this.handleFile(e.dataTransfer.files[0]);
            }
        });
    },

    /**
     * Handle selected file
     */
    handleFile(file) {
        try {
            this.validateImage(file);
            this.currentFile = file;

            // Show preview
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('photo-ai-preview');
                const image = document.getElementById('photo-ai-image');
                const dropzone = document.getElementById('photo-ai-dropzone');

                if (preview && image && dropzone) {
                    image.src = e.target.result;
                    dropzone.style.display = 'none';
                    preview.style.display = 'block';
                }
            };
            reader.readAsDataURL(file);

        } catch (error) {
            alert(error.message);
        }
    },

    /**
     * Clear preview and reset
     */
    clearPreview() {
        const preview = document.getElementById('photo-ai-preview');
        const dropzone = document.getElementById('photo-ai-dropzone');
        const results = document.getElementById('photo-ai-results');
        const input = document.getElementById('photo-ai-input');

        if (preview) preview.style.display = 'none';
        if (dropzone) dropzone.style.display = 'flex';
        if (results) results.style.display = 'none';
        if (input) input.value = '';

        this.currentFile = null;
    },

    /**
     * Trigger analysis from UI
     */
    async triggerAnalysis() {
        if (!this.currentFile) {
            alert('Please select an image first');
            return;
        }

        try {
            const analysis = await this.analyzeImage(this.currentFile);
            this.showResults(analysis);

            if (this.onAnalysisComplete) {
                this.onAnalysisComplete(analysis);
            }

        } catch (error) {
            alert('Analysis failed: ' + error.message);
        }
    },

    /**
     * Show analysis results
     */
    showResults(analysis) {
        const results = document.getElementById('photo-ai-results');
        if (!results) return;

        const confidencePercent = Math.round((analysis.confidence || 0) * 100);
        const confidenceClass = confidencePercent >= 70 ? 'high' : confidencePercent >= 40 ? 'medium' : 'low';

        results.innerHTML = `
            <div class="ai-results-card">
                <div class="results-header">
                    <h4>✨ AI Analysis Results</h4>
                    <span class="confidence-badge ${confidenceClass}">${confidencePercent}% confidence</span>
                </div>

                <div class="results-grid">
                    <div class="result-item">
                        <label>Product</label>
                        <span>${analysis.productName}</span>
                    </div>
                    <div class="result-item">
                        <label>Category</label>
                        <span>${analysis.category}</span>
                    </div>
                </div>

                ${analysis.appearance ? `
                <div class="results-section">
                    <h5>Appearance</h5>
                    <div class="results-grid">
                        <div class="result-item">
                            <label>Color</label>
                            <span>${analysis.appearance.color || 'N/A'}</span>
                        </div>
                        <div class="result-item">
                            <label>Texture</label>
                            <span>${analysis.appearance.texture || 'N/A'}</span>
                        </div>
                        <div class="result-item">
                            <label>Visual Appeal</label>
                            <span>${analysis.appearance.visualAppeal || 'N/A'}/10</span>
                        </div>
                    </div>
                </div>
                ` : ''}

                ${analysis.estimatedAttributes ? `
                <div class="results-section">
                    <h5>Estimated Attributes</h5>
                    <div class="results-grid">
                        <div class="result-item">
                            <label>Aroma</label>
                            <span>${analysis.estimatedAttributes.aroma || 'N/A'}</span>
                        </div>
                        <div class="result-item">
                            <label>Taste</label>
                            <span>${analysis.estimatedAttributes.taste || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                ` : ''}

                ${analysis.suggestedEmotions && analysis.suggestedEmotions.length > 0 ? `
                <div class="results-section">
                    <h5>Suggested Emotions</h5>
                    <div class="emotion-chips">
                        ${analysis.suggestedEmotions.map(e => `<span class="emotion-chip">${e}</span>`).join('')}
                    </div>
                </div>
                ` : ''}

                ${analysis.suggestedNeedState ? `
                <div class="results-section">
                    <h5>Suggested Need State</h5>
                    <span class="need-state-badge">${analysis.suggestedNeedState}</span>
                </div>
                ` : ''}

                ${analysis.notes ? `
                <div class="results-section">
                    <h5>Notes</h5>
                    <p class="analysis-notes">${analysis.notes}</p>
                </div>
                ` : ''}

                <div class="results-actions">
                    <button type="button" class="btn-secondary" onclick="PhotoAI.clearPreview()">
                        Analyze Another
                    </button>
                    <button type="button" class="btn-primary" onclick="PhotoAI.applyResults()">
                        Apply to Form
                    </button>
                </div>
            </div>
        `;

        results.style.display = 'block';
        this.lastAnalysis = analysis;
    },

    /**
     * Apply results to form fields
     */
    applyResults() {
        if (!this.lastAnalysis) return;

        const analysis = this.lastAnalysis;

        // Apply product name
        const productNameField = document.getElementById('productName') || document.getElementById('quick-product-name');
        if (productNameField && analysis.productName && analysis.productName !== 'Unknown Product') {
            productNameField.value = analysis.productName;
            productNameField.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Apply category selection in Quick Entry
        if (analysis.category && typeof selectCategory === 'function') {
            // Map to category template names
            const categoryMap = {
                'chocolate': 'premium-chocolate',
                'coffee': 'coffee',
                'wine': 'wine',
                'beer': 'craft-beer',
                'cheese': 'cheese',
                'snack': 'snack',
                'beverage': 'beverage',
                'sauce': 'sauce'
            };
            const templateCategory = categoryMap[analysis.category.toLowerCase()] || analysis.category;
            selectCategory(templateCategory);
        }

        // Apply appearance notes
        if (analysis.appearance) {
            const appearanceField = document.getElementById('appearance');
            if (appearanceField) {
                const notes = [];
                if (analysis.appearance.color) notes.push(`Color: ${analysis.appearance.color}`);
                if (analysis.appearance.texture) notes.push(`Texture: ${analysis.appearance.texture}`);
                if (analysis.appearance.packaging) notes.push(`Packaging: ${analysis.appearance.packaging}`);
                appearanceField.value = notes.join('. ');
                appearanceField.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }

        // Notify user
        this.showAppliedNotification();
    },

    /**
     * Show notification that results were applied
     */
    showAppliedNotification() {
        const notification = document.createElement('div');
        notification.className = 'photo-ai-notification';
        notification.innerHTML = '✓ AI analysis applied to form';
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    },

    /**
     * Add Photo AI button to a form section
     */
    addPhotoButton(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Check if button already exists
        if (container.querySelector('.photo-ai-btn')) return;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'photo-ai-btn';
        btn.innerHTML = '<span class="photo-icon">📷</span><span class="photo-text">Photo AI</span>';
        btn.title = 'Analyze product photo with AI';
        btn.onclick = () => this.openPhotoModal();

        container.appendChild(btn);
    },

    /**
     * Open photo analysis modal
     */
    openPhotoModal() {
        // Create modal if it doesn't exist
        let modal = document.getElementById('photo-ai-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'photo-ai-modal';
            modal.className = 'photo-ai-modal-overlay';
            modal.innerHTML = `
                <div class="photo-ai-modal">
                    <div class="modal-header">
                        <h3>📷 Photo AI Analysis</h3>
                        <button class="modal-close" onclick="PhotoAI.closePhotoModal()">&times;</button>
                    </div>
                    <div class="modal-body" id="photo-ai-modal-content"></div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // Create upload UI in modal
        this.createUploadUI('photo-ai-modal-content', (analysis) => {
            // Analysis complete callback
            console.log('Analysis complete:', analysis);
        });

        modal.classList.add('active');
    },

    /**
     * Close photo modal
     */
    closePhotoModal() {
        const modal = document.getElementById('photo-ai-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    PhotoAI.init();
});

// Export for global use
window.PhotoAI = PhotoAI;
