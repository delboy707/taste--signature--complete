// ===== VOICE INPUT MODULE =====
// Speech-to-text for hands-free sensory note entry
// Uses Web Speech API (free, no external service needed)

const VoiceInput = {
    recognition: null,
    isListening: false,
    currentTarget: null,
    supportedLanguages: ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'zh-CN'],
    currentLanguage: 'en-US',

    /**
     * Check if Web Speech API is supported
     */
    isSupported() {
        return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    },

    /**
     * Initialize the speech recognition engine
     */
    init() {
        if (!this.isSupported()) {
            console.warn('⚠️ Web Speech API not supported in this browser');
            return false;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();

        // Configuration
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = this.currentLanguage;

        // Event handlers
        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateButtonState(true);
            console.log('🎤 Voice input started');
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.updateButtonState(false);
            console.log('🎤 Voice input ended');
        };

        this.recognition.onresult = (event) => {
            this.handleResult(event);
        };

        this.recognition.onerror = (event) => {
            console.error('🎤 Voice input error:', event.error);
            this.isListening = false;
            this.updateButtonState(false);

            if (event.error === 'not-allowed') {
                this.showPermissionError();
            }
        };

        console.log('✅ Voice input initialized');
        return true;
    },

    /**
     * Handle speech recognition result
     */
    handleResult(event) {
        if (!this.currentTarget) return;

        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }

        // Update the target input/textarea
        const target = document.getElementById(this.currentTarget);
        if (target) {
            if (finalTranscript) {
                // Append final transcript with proper spacing
                const currentValue = target.value;
                const needsSpace = currentValue && !currentValue.endsWith(' ') && !currentValue.endsWith('\n');
                target.value = currentValue + (needsSpace ? ' ' : '') + finalTranscript;

                // Trigger input event for any listeners
                target.dispatchEvent(new Event('input', { bubbles: true }));
            }

            // Show interim results in a preview
            this.showInterimPreview(target, interimTranscript);
        }
    },

    /**
     * Show interim (in-progress) transcription
     */
    showInterimPreview(target, text) {
        let preview = target.parentElement.querySelector('.voice-interim-preview');

        if (text) {
            if (!preview) {
                preview = document.createElement('div');
                preview.className = 'voice-interim-preview';
                target.parentElement.appendChild(preview);
            }
            preview.textContent = text;
            preview.style.display = 'block';
        } else if (preview) {
            preview.style.display = 'none';
        }
    },

    /**
     * Start listening for a specific input field
     */
    startListening(targetId) {
        if (!this.recognition) {
            if (!this.init()) {
                alert('Voice input is not supported in your browser. Try Chrome, Edge, or Safari.');
                return;
            }
        }

        if (this.isListening) {
            this.stopListening();
            return;
        }

        this.currentTarget = targetId;

        try {
            this.recognition.start();
        } catch (error) {
            console.error('Failed to start voice recognition:', error);
        }
    },

    /**
     * Stop listening
     */
    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.currentTarget = null;
        }
    },

    /**
     * Toggle listening state
     */
    toggle(targetId) {
        if (this.isListening && this.currentTarget === targetId) {
            this.stopListening();
        } else {
            this.startListening(targetId);
        }
    },

    /**
     * Update button visual state
     */
    updateButtonState(isActive) {
        // Update all voice buttons
        document.querySelectorAll('.voice-input-btn').forEach(btn => {
            if (isActive && btn.dataset.target === this.currentTarget) {
                btn.classList.add('recording');
                btn.innerHTML = '<span class="voice-icon">🔴</span><span class="voice-text">Stop</span>';
            } else {
                btn.classList.remove('recording');
                btn.innerHTML = '<span class="voice-icon">🎤</span><span class="voice-text">Voice</span>';
            }
        });

        // Update the specific button
        const activeBtn = document.querySelector(`[data-target="${this.currentTarget}"]`);
        if (activeBtn) {
            if (isActive) {
                activeBtn.classList.add('recording');
            } else {
                activeBtn.classList.remove('recording');
            }
        }
    },

    /**
     * Show permission error message
     */
    showPermissionError() {
        alert(
            '🎤 Microphone Access Required\n\n' +
            'Please allow microphone access to use voice input:\n\n' +
            '1. Click the lock/info icon in your browser\'s address bar\n' +
            '2. Find "Microphone" in the permissions\n' +
            '3. Set it to "Allow"\n' +
            '4. Refresh the page and try again'
        );
    },

    /**
     * Change recognition language
     */
    setLanguage(langCode) {
        if (this.supportedLanguages.includes(langCode)) {
            this.currentLanguage = langCode;
            if (this.recognition) {
                this.recognition.lang = langCode;
            }
            console.log('🌐 Voice language set to:', langCode);
        }
    },

    /**
     * Add voice button to an input field
     */
    addVoiceButton(inputId, container = null) {
        const input = document.getElementById(inputId);
        if (!input || !this.isSupported()) return;

        // Check if button already exists
        const existingBtn = document.querySelector(`[data-target="${inputId}"]`);
        if (existingBtn) return;

        // Create voice button
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'voice-input-btn';
        btn.dataset.target = inputId;
        btn.innerHTML = '<span class="voice-icon">🎤</span><span class="voice-text">Voice</span>';
        btn.title = 'Click to speak your notes';
        btn.onclick = (e) => {
            e.preventDefault();
            this.toggle(inputId);
        };

        // Add to container or input's parent
        const targetContainer = container || input.parentElement;

        // Wrap input and button if needed
        if (!targetContainer.classList.contains('voice-input-wrapper')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'voice-input-wrapper';
            input.parentNode.insertBefore(wrapper, input);
            wrapper.appendChild(input);
            wrapper.appendChild(btn);
        } else {
            targetContainer.appendChild(btn);
        }
    },

    /**
     * Auto-add voice buttons to all text areas and specific inputs
     */
    autoAddVoiceButtons() {
        if (!this.isSupported()) return;

        // Add to all textareas
        document.querySelectorAll('textarea').forEach(textarea => {
            if (textarea.id) {
                this.addVoiceButton(textarea.id);
            }
        });

        // Add to specific text inputs (notes, descriptions)
        const textInputSelectors = [
            'input[type="text"][id*="note"]',
            'input[type="text"][id*="description"]',
            'input[type="text"][id*="comment"]',
            'input[type="text"][id*="Name"]',
            '#productName',
            '#consumptionOccasion'
        ];

        textInputSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(input => {
                if (input.id) {
                    this.addVoiceButton(input.id);
                }
            });
        });
    }
};

// Sensory vocabulary for better recognition hints
VoiceInput.sensoryVocabulary = {
    tastes: ['sweet', 'sour', 'salty', 'bitter', 'umami', 'spicy', 'tangy', 'savory'],
    textures: ['smooth', 'creamy', 'crunchy', 'crispy', 'chewy', 'grainy', 'velvety', 'silky'],
    aromas: ['floral', 'fruity', 'earthy', 'nutty', 'woody', 'herbal', 'smoky', 'citrus'],
    emotions: ['refreshing', 'comforting', 'indulgent', 'nostalgic', 'exciting', 'sophisticated', 'playful'],
    intensities: ['subtle', 'mild', 'moderate', 'strong', 'intense', 'overwhelming', 'balanced']
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    VoiceInput.init();
});

// Export for global use
window.VoiceInput = VoiceInput;
