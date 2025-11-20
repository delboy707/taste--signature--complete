// ===== CLAUDE AI INTEGRATION MODULE =====
// Handles all interactions with Anthropic's Claude API

class ClaudeAI {
    constructor() {
        this.apiKey = window.AI_CONFIG?.ANTHROPIC_API_KEY;
        this.apiUrl = window.AI_CONFIG?.ANTHROPIC_API_URL;
        this.model = window.AI_CONFIG?.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
        this.isConfigured = window.validateAPIKey ? window.validateAPIKey() : false;
        this.usageTracker = new window.UsageTracker();

        console.log('ClaudeAI initialized with URL:', this.apiUrl);
    }

    /**
     * Get current user's Firebase auth token
     */
    async getAuthToken() {
        if (window.authManager && window.authManager.currentUser) {
            try {
                const token = await window.authManager.currentUser.getIdToken();
                return token;
            } catch (error) {
                console.error('Failed to get auth token:', error);
                return null;
            }
        }
        return null;
    }

    /**
     * Get current user ID
     */
    getUserId() {
        if (window.authManager && window.authManager.currentUser) {
            return window.authManager.currentUser.uid;
        }
        return 'anonymous';
    }

    /**
     * Check if user has their own API key configured
     */
    hasOwnApiKey() {
        return this.isConfigured && this.apiKey && this.apiKey.startsWith('sk-ant-');
    }

    /**
     * Send message to Claude API
     */
    async sendMessage(userMessage, systemPrompt = '') {
        const userId = this.getUserId();

        // Option 1: User has their own API key (no quotas)
        if (this.hasOwnApiKey()) {
            console.log('✅ Using user-provided API key (unlimited)');
            return await this.callAPI(userMessage, systemPrompt, this.apiKey, null);
        }

        // Option 2: Use server's API key (requires auth + quotas)
        console.log('🔑 Using server API key (quotas apply)');

        // Check if user is authenticated
        const authToken = await this.getAuthToken();
        if (!authToken) {
            // User not authenticated - offer to add their own key
            const addKey = confirm(
                '🔐 Sign In Required\n\n' +
                'To use AI features with our free tier (5 insights/day), please sign in.\n\n' +
                'Or, add your own Anthropic API key for unlimited use.\n\n' +
                'Click OK to add your own key, or Cancel to sign in first.'
            );

            if (addKey) {
                if (typeof window.ensureAPIKey === 'function') {
                    window.ensureAPIKey();
                }
            }

            throw new Error('Authentication required. Please sign in or add your own API key.');
        }

        // Check quotas
        const quotaCheck = this.usageTracker.canUseAI(userId);
        if (!quotaCheck.allowed) {
            // Quota exceeded - offer options
            const tier = this.usageTracker.getUserTier(userId);
            const addKey = confirm(
                `⚠️ ${quotaCheck.message}\n\n` +
                `You've used ${quotaCheck.used}/${quotaCheck.limit} AI insights on the ${tier.name} tier.\n\n` +
                `Options:\n` +
                `• Add your own API key for unlimited use (recommended)\n` +
                `• Wait until tomorrow for your quota to reset\n` +
                `• Upgrade to a paid tier (coming soon!)\n\n` +
                `Click OK to add your own API key, or Cancel to wait.`
            );

            if (addKey) {
                if (typeof window.ensureAPIKey === 'function') {
                    window.ensureAPIKey();
                }
            }

            throw new Error(quotaCheck.message);
        }

        // User is authenticated and within quota
        console.log(`✅ Quota check passed. Remaining today: ${quotaCheck.remaining.today}`);

        try {
            // Call API with server key
            const result = await this.callAPI(userMessage, systemPrompt, null, authToken);

            // Record usage
            const usage = this.usageTracker.recordAIUsage(userId);
            console.log(`📊 Usage recorded: ${usage.todayTotal} today, ${usage.monthTotal} this month`);

            // Show usage notification if getting close to limit
            const tier = this.usageTracker.getUserTier(userId);
            if (tier.quotas.aiInsightsPerDay !== -1) {
                const remaining = tier.quotas.aiInsightsPerDay - usage.todayTotal;
                if (remaining <= 2 && remaining > 0) {
                    setTimeout(() => {
                        alert(`ℹ️ Usage Alert\n\nYou have ${remaining} AI insights remaining today.\n\nTip: Add your own API key for unlimited use!`);
                    }, 1000);
                }
            }

            return result;

        } catch (error) {
            // Don't record usage if API call failed
            console.error('API call failed:', error);
            throw error;
        }
    }

    /**
     * Call the API (internal method)
     */
    async callAPI(userMessage, systemPrompt, userApiKey, authToken) {
        try {
            console.log('Calling Claude API at:', this.apiUrl);

            const headers = {
                'Content-Type': 'application/json'
            };

            // Add auth headers based on which mode we're using
            if (userApiKey) {
                // User's own key
                headers['x-api-key'] = userApiKey;
            } else if (authToken) {
                // Server key (requires auth)
                headers['Authorization'] = `Bearer ${authToken}`;
                headers['X-User-Id'] = this.getUserId();
            } else {
                throw new Error('No authentication method available');
            }

            // Call Anthropic API via CORS proxy
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    model: this.model,
                    max_tokens: window.AI_CONFIG.CLAUDE_MAX_TOKENS,
                    temperature: window.AI_CONFIG.CLAUDE_TEMPERATURE,
                    system: systemPrompt,
                    messages: [
                        {
                            role: 'user',
                            content: userMessage
                        }
                    ]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                const errorMsg = errorData.error?.message || response.statusText;

                // Handle specific error types
                if (response.status === 401) {
                    throw new Error('Authentication failed. Please sign in again.');
                } else if (response.status === 429) {
                    throw new Error('Rate limit exceeded. Please try again later.');
                } else {
                    throw new Error(`API Error: ${errorMsg}`);
                }
            }

            const data = await response.json();
            return data.content[0].text;

        } catch (error) {
            console.error('Claude API Error:', error);
            throw error;
        }
    }

    /**
     * Get usage summary for current user
     */
    getUsageSummary() {
        return this.usageTracker.getUsageSummary(this.getUserId());
    }

    /**
     * Analyze product taste data and provide insights
     */
    async analyzeProduct(experience) {
        const systemPrompt = `You are an expert sensory scientist and product strategist specializing in the Taste Signature framework.
You analyze food and beverage products by mapping sensory attributes to emotional outcomes.

Your analysis should:
1. Identify key sensory-emotional correlations
2. Suggest formulation optimizations
3. Provide marketing positioning recommendations
4. Highlight unique differentiators
5. Recommend target occasions and consumers

Be specific, actionable, and strategic. Use data-driven insights.`;

        const productData = this.formatProductData(experience);

        const userMessage = `Analyze this taste experience and provide strategic insights:

${productData}

Provide:
1. **Emotional Profile Summary** - What emotions does this product trigger?
2. **Sensory Drivers** - Which sensory attributes create the strongest emotional impact?
3. **Formulation Recommendations** - How to optimize for emotional outcomes?
4. **Marketing Strategy** - Positioning, messaging, target audience
5. **Competitive Advantage** - What makes this unique?`;

        return await this.sendMessage(userMessage, systemPrompt);
    }

    /**
     * Answer natural language queries about portfolio data
     */
    async answerQuery(query, experiences) {
        const systemPrompt = `You are a sensory data analyst assistant. You help product developers understand their taste testing data.

You have access to the user's complete product portfolio data. Answer their questions with:
- Specific data references
- Actionable insights
- Strategic recommendations
- Comparative analysis when relevant

Be concise but thorough. Use markdown formatting for readability.`;

        const portfolioSummary = this.formatPortfolioData(experiences);

        const userMessage = `Portfolio Data:
${portfolioSummary}

User Question: ${query}

Provide a detailed, data-driven answer.`;

        return await this.sendMessage(userMessage, systemPrompt);
    }

    /**
     * Suggest correlations and improvement opportunities
     */
    async suggestImprovements(experiences) {
        const systemPrompt = `You are a product innovation strategist. Analyze the portfolio and suggest:
1. Underexploited emotional territories
2. Potential reformulation opportunities
3. White space gaps for new products
4. Cross-product patterns and insights`;

        const portfolioData = this.formatPortfolioData(experiences);

        const userMessage = `Analyze this product portfolio and suggest strategic improvements:

${portfolioData}

Focus on:
- Emotional white space opportunities
- Products that could be reformulated for stronger emotional impact
- Portfolio gaps and innovation directions
- Cannibalization risks`;

        return await this.sendMessage(userMessage, systemPrompt);
    }

    /**
     * Compare multiple products
     */
    async compareProducts(experiences) {
        const systemPrompt = `You are a competitive analysis expert. Compare products based on their sensory and emotional profiles.`;

        const comparisonData = experiences.map(exp => this.formatProductData(exp)).join('\n\n---\n\n');

        const userMessage = `Compare these products:

${comparisonData}

Provide:
1. Key differences in emotional profiles
2. Sensory attribute variations
3. Positioning recommendations
4. Which product is best for which occasion/consumer`;

        return await this.sendMessage(userMessage, systemPrompt);
    }

    /**
     * NEW: Provide specific reformulation recommendations
     */
    async suggestReformulation(experience, targetEmotion = null) {
        const systemPrompt = `You are a food technologist and sensory scientist specializing in reformulation strategies.
Provide SPECIFIC, ACTIONABLE recommendations for ingredient changes, processing modifications, and formulation adjustments.
Base your recommendations on sensory-emotional correlations and food science principles.`;

        const target = targetEmotion ? `Target Emotion to Enhance: ${targetEmotion}` : 'Optimize overall emotional impact';

        const userMessage = `${this.formatProductData(experience)}

${target}

Provide SPECIFIC reformulation recommendations:

1. **Ingredient Modifications**
   - What to add/remove/adjust (with percentages/quantities)
   - Why these changes will enhance emotional impact

2. **Processing Changes**
   - Temperature, timing, technique adjustments
   - Texture modification strategies

3. **Sensory Targets**
   - Specific sensory attributes to increase/decrease
   - Target ranges (e.g., "increase sweetness from 6/10 to 7.5/10")

4. **Expected Emotional Outcome**
   - Predicted emotional profile after changes
   - Consumer acceptance probability

5. **Risk Assessment**
   - Cost implications
   - Technical feasibility
   - Consumer acceptance risks`;

        return await this.sendMessage(userMessage, systemPrompt);
    }

    /**
     * NEW: Predict consumer reactions
     */
    async predictConsumerReaction(experience, targetAudience = 'general') {
        const systemPrompt = `You are a consumer insights expert with deep knowledge of sensory preferences across demographics.
Predict how different consumer segments will react to products based on their sensory-emotional profiles.
Use market research principles and consumer psychology.`;

        const userMessage = `${this.formatProductData(experience)}

Target Audience: ${targetAudience}

Predict consumer reactions:

1. **Overall Acceptance**
   - Purchase intent probability (%)
   - Repeat purchase likelihood
   - Price sensitivity

2. **Segment Analysis**
   - Gen Z reactions (18-25)
   - Millennials (26-40)
   - Gen X (41-56)
   - Boomers (57+)

3. **Occasion Fit**
   - Best consumption occasions
   - Worst-fit occasions
   - Ritualization potential

4. **Competitive Performance**
   - Vs category leaders
   - Unique positioning opportunities
   - Cannibalization risks

5. **Marketing Messages**
   - Key emotional triggers to emphasize
   - Messaging do's and don'ts
   - Packaging cues to highlight`;

        return await this.sendMessage(userMessage, systemPrompt);
    }

    /**
     * NEW: Before/After reformulation analysis
     */
    async analyzeReformulation(beforeExp, afterExp) {
        const systemPrompt = `You are a reformulation analysis expert. Compare "before" and "after" formulations to assess:
- Emotional impact changes
- Sensory attribute shifts
- Consumer acceptance implications
- Strategic positioning changes`;

        const userMessage = `BEFORE Formulation:
${this.formatProductData(beforeExp)}

AFTER Formulation:
${this.formatProductData(afterExp)}

Provide reformulation analysis:

1. **Emotional Impact Changes**
   - Which emotions increased/decreased?
   - Overall emotional profile shift
   - Net emotional improvement score

2. **Sensory Attribute Analysis**
   - Key sensory differences
   - Consumer-noticeable changes
   - Attribute optimization assessment

3. **Consumer Acceptance Prediction**
   - Will consumers prefer the new version?
   - Acceptance risk level (low/medium/high)
   - Recommendations for market testing

4. **Strategic Implications**
   - Positioning changes
   - Pricing implications
   - Communication strategy

5. **Go/No-Go Recommendation**
   - Final recommendation with rationale
   - Risk mitigation strategies`;

        return await this.sendMessage(userMessage, systemPrompt);
    }

    /**
     * NEW: Innovation opportunity finder
     */
    async identifyInnovationOpportunities(experiences) {
        const systemPrompt = `You are a product innovation strategist and food trend analyst.
Identify white space opportunities, emerging emotional territories, and innovation directions based on portfolio gaps.
Use trend forecasting and consumer psychology principles.`;

        const portfolioData = this.formatPortfolioData(experiences);

        const userMessage = `${portfolioData}

Identify innovation opportunities:

1. **Emotional White Space**
   - Underserved emotional territories
   - Emerging emotional needs (2025-2026 trends)
   - High-potential emotion combinations

2. **Sensory Innovation Directions**
   - Novel texture opportunities
   - Flavor profile gaps
   - Unique sensory combinations

3. **Consumer Trend Alignment**
   - Health & wellness opportunities
   - Sustainability/clean label directions
   - Functional benefits integration

4. **Concept Springboards**
   - 3-5 specific new product concepts
   - Target emotions and sensory profiles
   - Market positioning and rationale

5. **Priority Ranking**
   - Which opportunities to pursue first
   - Resource requirements
   - Time-to-market estimates`;

        return await this.sendMessage(userMessage, systemPrompt);
    }

    /**
     * NEW: Occasion-based optimization
     */
    async optimizeForOccasion(experience, occasion) {
        const systemPrompt = `You are a contextual consumption expert. You understand how sensory-emotional profiles must be optimized for specific consumption occasions and contexts.`;

        const userMessage = `${this.formatProductData(experience)}

Target Occasion: ${occasion}

Optimize for this occasion:

1. **Current Occasion Fit**
   - Emotional alignment score (1-10)
   - Sensory appropriateness
   - Key mismatches

2. **Optimization Strategy**
   - Sensory attributes to adjust
   - Emotional targets to enhance
   - Specific formulation changes

3. **Competitive Benchmarks**
   - Best-in-class products for this occasion
   - Your product's positioning gaps
   - Differentiation opportunities

4. **Consumption Context**
   - Time of day optimization
   - Social vs solo consumption
   - Portion size recommendations

5. **Marketing Angle**
   - How to position for this occasion
   - Key messaging themes
   - Packaging considerations`;

        return await this.sendMessage(userMessage, systemPrompt);
    }

    /**
     * NEW: Competitive intelligence analysis
     */
    async analyzeCompetitivePosition(experience, category = null) {
        const systemPrompt = `You are a competitive intelligence analyst for the food & beverage industry.
Provide strategic positioning analysis relative to category norms and competitive products.
Use market intelligence and sensory benchmarking principles.`;

        const categoryInfo = category ? `Category: ${category}` : 'Category: Auto-detected from product type';

        const userMessage = `${this.formatProductData(experience)}

${categoryInfo}

Analyze competitive position:

1. **Category Benchmarking**
   - How does this compare to category norms?
   - Above/below average attributes
   - Unique differentiators

2. **Competitive Advantages**
   - Top 3 emotional strengths vs competitors
   - Sensory unique selling points
   - Defensible positioning territory

3. **Vulnerability Assessment**
   - Competitive threats
   - Areas of weakness vs category leaders
   - Potential competitive responses

4. **Strategic Positioning**
   - Optimal market position
   - Price tier recommendations
   - Target consumer segments

5. **Action Plan**
   - Immediate improvements to prioritize
   - Long-term strategic moves
   - Partnership/acquisition opportunities`;

        return await this.sendMessage(userMessage, systemPrompt);
    }

    /**
     * Format product data for Claude
     */
    formatProductData(experience) {
        const emotions = [];
        Object.entries(experience.stages).forEach(([stageName, stage]) => {
            if (stage.emotions) {
                Object.entries(stage.emotions).forEach(([emotion, value]) => {
                    emotions.push({ stage: stageName, emotion, value });
                });
            }
        });

        const topEmotions = emotions
            .sort((a, b) => b.value - a.value)
            .slice(0, 5)
            .map(e => `${e.emotion} (${e.value}/10) at ${e.stage}`)
            .join(', ');

        return `**Product**: ${experience.productInfo.name} - ${experience.productInfo.brand}
**Category**: ${experience.productInfo.type}
**Need State**: ${experience.needState}
**Occasion**: ${experience.productInfo.occasion || 'Not specified'}

**Sensory Profile**:
- Appearance: Visual Appeal ${experience.stages.appearance.visualAppeal}/10
- Aroma: Intensity ${experience.stages.aroma.intensity}/10
- Taste: Sweet ${experience.stages.frontMouth.sweetness}/10, Sour ${experience.stages.frontMouth.sourness}/10
- Mouthfeel: Richness ${experience.stages.midRearMouth.richness}/10, Creaminess ${experience.stages.midRearMouth.creaminess}/10
- Aftertaste: Duration ${experience.stages.aftertaste.duration}/10, Pleasantness ${experience.stages.aftertaste.pleasantness}/10

**Top Emotions**: ${topEmotions}

**Emotional Triggers**:
- Moreishness: ${experience.emotionalTriggers.moreishness}/10
- Refreshment: ${experience.emotionalTriggers.refreshment}/10
- The Melt: ${experience.emotionalTriggers.melt}/10
- Texture/Crunch: ${experience.emotionalTriggers.crunch}/10`;
    }

    /**
     * Format portfolio data for Claude
     */
    formatPortfolioData(experiences) {
        const summary = `**Portfolio Size**: ${experiences.length} products

**Need State Distribution**:
${this.getNeedStateDistribution(experiences)}

**Top Products by Satisfaction**:
${this.getTopProducts(experiences, 5)}

**Emotional Diversity**: ${this.calculateDiversity(experiences)}

**Products**:
${experiences.map((exp, idx) => `${idx + 1}. ${exp.productInfo.name} (${exp.productInfo.brand}) - ${exp.needState}, Satisfaction: ${exp.stages.aftertaste.emotions.satisfaction}/10`).join('\n')}`;

        return summary;
    }

    getNeedStateDistribution(experiences) {
        const counts = {};
        experiences.forEach(e => {
            counts[e.needState] = (counts[e.needState] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([state, count]) => `- ${state}: ${count} (${Math.round(count/experiences.length*100)}%)`)
            .join('\n');
    }

    getTopProducts(experiences, limit) {
        return experiences
            .sort((a, b) => b.stages.aftertaste.emotions.satisfaction - a.stages.aftertaste.emotions.satisfaction)
            .slice(0, limit)
            .map((exp, idx) => `${idx + 1}. ${exp.productInfo.name} - ${exp.stages.aftertaste.emotions.satisfaction}/10`)
            .join('\n');
    }

    calculateDiversity(experiences) {
        const needStateCounts = {};
        experiences.forEach(e => {
            needStateCounts[e.needState] = (needStateCounts[e.needState] || 0) + 1;
        });

        let diversity = 0;
        const total = experiences.length;
        Object.values(needStateCounts).forEach(count => {
            const proportion = count / total;
            if (proportion > 0) {
                diversity -= proportion * Math.log(proportion);
            }
        });

        const diversityScore = Math.round((diversity / 1.39) * 100);
        return `${diversityScore}/100`;
    }
}

// Export
if (typeof window !== 'undefined') {
    window.ClaudeAI = ClaudeAI;
}
