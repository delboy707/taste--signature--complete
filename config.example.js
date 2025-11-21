// ===== CONFIGURATION EXAMPLE =====
// Copy this file to config.js and add your actual keys
// For production deployment, use environment variables instead

const CONFIG = {
    // 🔑 ADD YOUR ANTHROPIC API KEY HERE 👇
    ANTHROPIC_API_KEY: 'YOUR_API_KEY_HERE',

    // API Settings
    ANTHROPIC_API_URL: 'https://api.anthropic.com/v1/messages',
    CLAUDE_MODEL: 'claude-sonnet-4-20250514', // Latest Claude Sonnet 4.5
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

// Export for use in app
if (typeof window !== 'undefined') {
    window.AI_CONFIG = CONFIG;
    window.validateAPIKey = validateAPIKey;
}
