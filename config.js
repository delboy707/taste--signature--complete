// ===== ANTHROPIC API CONFIGURATION =====
// This file stores your Anthropic API key securely (client-side only)
// For production, consider using a backend proxy to hide the API key

const CONFIG = {
    // 🔑 API Key - User should provide their own key via Settings or browser prompt
    // For demo/testing, users can get a key from: https://console.anthropic.com/
    ANTHROPIC_API_KEY: localStorage.getItem('anthropic_api_key') || '',

    // API Settings - CORS proxy for browser compatibility
    ANTHROPIC_API_URL: '/api/claude', 
CLAUDE_MAX_TOKENS: 4096,
    
    
    CLAUDE_TEMPERATURE: 1.0,

    // Feature flags
    ENABLE_AI_INSIGHTS: true,
    ENABLE_NATURAL_LANGUAGE_QUERIES: true,

    // UI Settings
    AI_BUTTON_TEXT: '🤖 Get AI Insights',
    AI_QUERY_PLACEHOLDER: 'Ask Claude about your taste data... (e.g., "What makes my products unique?")'
};

// Validation
function validateAPIKey() {
    if (!CONFIG.ANTHROPIC_API_KEY || CONFIG.ANTHROPIC_API_KEY === 'YOUR_API_KEY_HERE') {
        console.warn('⚠️ Anthropic API key not configured. AI features will be disabled.');
        return false;
    }
    if (!CONFIG.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
        console.error('❌ Invalid API key format. Anthropic keys start with "sk-ant-"');
        return false;
    }
    return true;
}

/**
 * Prompt user to enter API key
 */
function promptForAPIKey() {
    const message = `🔑 Claude API Key Required

To use AI-powered insights, please enter your Anthropic API key.

Get your API key from: https://console.anthropic.com/

Your key will be stored securely in your browser.`;

    const apiKey = prompt(message);

    if (apiKey && apiKey.trim()) {
        const trimmedKey = apiKey.trim();

        // Validate format
        if (!trimmedKey.startsWith('sk-ant-')) {
            alert('❌ Invalid API key format. Anthropic keys start with "sk-ant-"');
            return false;
        }

        // Save to localStorage
        localStorage.setItem('anthropic_api_key', trimmedKey);

        // Update CONFIG
        CONFIG.ANTHROPIC_API_KEY = trimmedKey;

        alert('✅ API key saved successfully! AI features are now enabled.');

        // Reload to apply changes
        window.location.reload();
        return true;
    }

    return false;
}

/**
 * Check if API key is configured, prompt if not
 */
function ensureAPIKey() {
    // Reload API key from localStorage in case it was added
    const storedKey = localStorage.getItem('anthropic_api_key');
    if (storedKey) {
        CONFIG.ANTHROPIC_API_KEY = storedKey;
    }

    if (!validateAPIKey()) {
        return promptForAPIKey();
    }
    return true;
}

// Export for use in app
if (typeof window !== 'undefined') {
    window.AI_CONFIG = CONFIG;
    window.validateAPIKey = validateAPIKey;
    window.promptForAPIKey = promptForAPIKey;
    window.ensureAPIKey = ensureAPIKey;
}




