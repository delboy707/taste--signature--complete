// ===== ANTHROPIC API CONFIGURATION (EXAMPLE) =====
// Mirror of config.js. All AI calls are proxied through the server-side
// /api/claude endpoint, so there is NO API key here and the browser never
// talks to the Anthropic API directly. The Anthropic key lives only in the
// ANTHROPIC_API_KEY environment variable on the server (Vercel).
//
// The proxy also owns model choice (server-side allowlist) and never
// forwards sampling parameters (temperature/top_p/top_k), so none are
// configured here.

const CONFIG = {
    // API Settings - all calls go through server proxy (no client-side key needed)
    ANTHROPIC_API_URL: '/api/claude',
    CLAUDE_MAX_TOKENS: 4096,

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

// Export for use in app
if (typeof window !== 'undefined') {
    window.AI_CONFIG = CONFIG;
    window.validateAPIKey = validateAPIKey;
}
