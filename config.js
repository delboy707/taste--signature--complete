// ===== ANTHROPIC API CONFIGURATION =====
// All AI calls are proxied through the server-side /api/claude endpoint
// API keys are managed server-side via environment variables

const CONFIG = {
    // API Settings - all calls go through server proxy (no client-side key needed)
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

/**
 * Check if AI features are available (user is authenticated)
 */
function validateAPIKey() {
    // AI calls are proxied server-side; the user just needs to be authenticated
    if (window.authManager && window.authManager.isAuthenticated()) {
        return true;
    }
    console.warn('AI features require authentication. Please sign in.');
    return false;
}

/**
 * Prompt user to sign in for AI features
 */
function promptForAPIKey() {
    alert('Please sign in to use AI-powered insights. Your requests are securely proxied through the server.');
    return false;
}

/**
 * Check if AI is available
 */
function ensureAPIKey() {
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
