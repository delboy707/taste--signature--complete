// ===== ANTHROPIC API CONFIGURATION =====
// All AI calls are proxied through the server-side /api/claude endpoint
// API keys are managed server-side via environment variables

const CONFIG = {
    // API Settings - all calls go through server proxy (no client-side key needed)
    ANTHROPIC_API_URL: '/api/claude',
    // Note: no temperature here on purpose. The proxy never forwards sampling
    // parameters (Sonnet 5 / Opus 5.5 reject them) and enforces a model allowlist.
    CLAUDE_MAX_TOKENS: 16000,

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
 * Single gate for optional/AI-enhanced code paths (PDF report insights,
 * comparison AI button, ...). AI is provided by the platform through the
 * /api/claude proxy, so there is no client-side key to test for: the proxy is
 * usable when a Claude client exists (or can be constructed) AND the user is
 * signed in. Quiet (no console warning) so it can be called freely.
 * "Signed in" means Firebase AND, once auth.js's Clerk gate has settled
 * (authManager.clerkReadyState), a Clerk session - the proxy only accepts a
 * Clerk token, so a stale Firebase session with Clerk signed out, errored or
 * in demo is NOT available (audit A2 #6). While the gate is still running
 * this is Firebase-only; the AI call itself awaits the gate
 * (claude-api.js getAuthToken).
 */
function isAIAvailable() {
    if (typeof window === 'undefined') return false;
    const signedIn = !!(window.authManager &&
        typeof window.authManager.isAuthenticated === 'function' &&
        window.authManager.isAuthenticated());
    if (!signedIn) return false;
    const clerkState = window.authManager.clerkReadyState;
    if (clerkState && clerkState.status !== 'signed-in') return false;
    return !!window.claudeAI || typeof ClaudeAI === 'function';
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
    window.isAIAvailable = isAIAvailable;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { isAIAvailable, validateAPIKey };
}
