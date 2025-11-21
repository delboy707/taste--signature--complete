// ===== AI CHAT ASSISTANT MODULE =====
// Conversational AI interface with memory and context

class AIChatAssistant {
    constructor(claudeAI) {
        this.claude = claudeAI;
        this.conversationHistory = [];
        this.maxHistoryLength = 10; // Keep last 10 exchanges
        this.currentContext = null; // Portfolio data context
    }

    /**
     * Set context for the conversation (portfolio data)
     */
    setContext(experiences) {
        this.currentContext = experiences;
    }

    /**
     * Send message and get response with conversation memory
     */
    async sendMessage(userMessage) {
        try {
            // Build conversation context
            const contextSummary = this.buildContextSummary();

            // Create system prompt with personality and context
            const systemPrompt = `You are a friendly, expert sensory scientist and product strategist assistant.

You help food & beverage companies understand their products through the Taste Signature framework, which maps sensory attributes to emotional outcomes.

Your personality:
- Warm, approachable, and enthusiastic
- Data-driven but explain concepts simply
- Proactive with follow-up suggestions
- Honest about limitations and unknowns

${contextSummary}

IMPORTANT: Remember previous conversation context. Build on earlier topics when relevant.`;

            // Build message with conversation history
            const conversationContext = this.buildConversationContext();
            const fullMessage = conversationContext + userMessage;

            // Get response from Claude
            const response = await this.claude.sendMessage(fullMessage, systemPrompt);

            // Store in conversation history
            this.conversationHistory.push({
                role: 'user',
                content: userMessage,
                timestamp: new Date().toISOString()
            });

            this.conversationHistory.push({
                role: 'assistant',
                content: response,
                timestamp: new Date().toISOString()
            });

            // Trim history if too long
            if (this.conversationHistory.length > this.maxHistoryLength * 2) {
                this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength * 2);
            }

            return {
                success: true,
                response: response,
                suggestions: this.generateFollowUpSuggestions(userMessage, response)
            };

        } catch (error) {
            console.error('AI Chat error:', error);
            return {
                success: false,
                error: error.message,
                response: "I'm sorry, I encountered an error. Please try again."
            };
        }
    }

    /**
     * Build context summary from portfolio data
     */
    buildContextSummary() {
        if (!this.currentContext || this.currentContext.length === 0) {
            return 'CONTEXT: No portfolio data currently loaded.';
        }

        const products = this.currentContext;
        const productNames = products.map(p => p.productInfo.name).join(', ');

        // Need state distribution
        const needStates = {};
        products.forEach(p => {
            needStates[p.needState] = (needStates[p.needState] || 0) + 1;
        });

        const needStateStr = Object.entries(needStates)
            .map(([state, count]) => `${state}: ${count}`)
            .join(', ');

        return `CURRENT PORTFOLIO CONTEXT:
- Total Products: ${products.length}
- Products: ${productNames}
- Need State Distribution: ${needStateStr}
- This data is available for you to analyze and reference in your responses.`;
    }

    /**
     * Build conversation context from history
     */
    buildConversationContext() {
        if (this.conversationHistory.length === 0) {
            return '';
        }

        // Summarize recent conversation
        const recentHistory = this.conversationHistory.slice(-6); // Last 3 exchanges

        let context = '\n===== CONVERSATION HISTORY =====\n';
        recentHistory.forEach(msg => {
            const role = msg.role === 'user' ? 'User' : 'Assistant';
            const snippet = msg.content.substring(0, 200); // Truncate long messages
            context += `${role}: ${snippet}${msg.content.length > 200 ? '...' : ''}\n\n`;
        });
        context += '===== END HISTORY =====\n\nUser\'s new message: ';

        return context;
    }

    /**
     * Generate follow-up question suggestions
     */
    generateFollowUpSuggestions(userMessage, response) {
        const suggestions = [];

        // Context-aware suggestions
        if (userMessage.toLowerCase().includes('reformulation') || userMessage.toLowerCase().includes('improve')) {
            suggestions.push('What are the cost implications?');
            suggestions.push('How long would this take to implement?');
            suggestions.push('What are the risks?');
        } else if (userMessage.toLowerCase().includes('emotion') || userMessage.toLowerCase().includes('feel')) {
            suggestions.push('Which demographics would this appeal to most?');
            suggestions.push('What occasions is this best suited for?');
            suggestions.push('How does this compare to competitors?');
        } else if (userMessage.toLowerCase().includes('compare') || userMessage.toLowerCase().includes('vs')) {
            suggestions.push('Which one should we prioritize?');
            suggestions.push('Can we combine strengths of both?');
            suggestions.push('What makes each unique?');
        } else if (userMessage.toLowerCase().includes('market') || userMessage.toLowerCase().includes('position')) {
            suggestions.push('What price point makes sense?');
            suggestions.push('Who is the target consumer?');
            suggestions.push('What are the competitive threats?');
        } else {
            // General suggestions
            suggestions.push('Tell me more about this');
            suggestions.push('What should I do next?');
            suggestions.push('Can you explain further?');
        }

        // Add portfolio-level suggestions if context available
        if (this.currentContext && this.currentContext.length > 0) {
            suggestions.push('What are my biggest opportunities?');
            suggestions.push('Where are my portfolio gaps?');
        }

        return suggestions.slice(0, 5); // Return top 5
    }

    /**
     * Get suggested starter questions
     */
    getSuggestedQuestions() {
        const questions = [];

        if (!this.currentContext || this.currentContext.length === 0) {
            return [
                "What is the Taste Signature framework?",
                "How do I get started?",
                "What can you help me with?",
                "What makes a great sensory profile?"
            ];
        }

        // Context-aware starter questions
        questions.push(`Analyze my portfolio of ${this.currentContext.length} products`);
        questions.push("What are my strongest products and why?");
        questions.push("Where are the white space opportunities?");
        questions.push("Which products should I reformulate first?");
        questions.push("How does my portfolio compare to category norms?");
        questions.push("What innovation directions should I explore?");
        questions.push("Which products have the highest emotional impact?");
        questions.push("What are the key differentiators in my portfolio?");

        return questions;
    }

    /**
     * Clear conversation history
     */
    clearHistory() {
        this.conversationHistory = [];
        return { success: true, message: 'Conversation history cleared' };
    }

    /**
     * Get conversation summary
     */
    getConversationSummary() {
        return {
            totalMessages: this.conversationHistory.length,
            exchanges: Math.floor(this.conversationHistory.length / 2),
            lastMessage: this.conversationHistory[this.conversationHistory.length - 1]?.timestamp || null,
            hasContext: this.currentContext && this.currentContext.length > 0
        };
    }

    /**
     * Export conversation history
     */
    exportConversation() {
        const exportData = {
            exportDate: new Date().toISOString(),
            conversationLength: this.conversationHistory.length,
            portfolioSize: this.currentContext?.length || 0,
            messages: this.conversationHistory.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp
            }))
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AI_Chat_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        return { success: true, filename: a.download };
    }

    /**
     * Quick analysis shortcuts
     */
    async quickAnalysis(analysisType, productId = null) {
        const shortcuts = {
            'portfolio-summary': 'Give me a comprehensive summary of my entire product portfolio, including strengths, weaknesses, and strategic recommendations.',
            'innovation-ideas': 'Based on my portfolio, what are the top 5 innovation opportunities I should explore? Be specific with concepts.',
            'reformulation-priorities': 'Which products in my portfolio need reformulation most urgently? Rank them and explain why.',
            'competitive-gaps': 'Where are the competitive gaps in my portfolio? What are competitors doing that I\'m not?',
            'emotional-white-space': 'What emotional territories am I not addressing in my portfolio? Where are the white space opportunities?',
            'top-performers': 'Which products are performing best emotionally and why? What can I learn from them?',
            'target-consumers': 'Who are the ideal target consumers for each of my products? Be specific about demographics and psychographics.'
        };

        const question = shortcuts[analysisType];
        if (!question) {
            return { success: false, error: 'Unknown analysis type' };
        }

        return await this.sendMessage(question);
    }
}

// Export
if (typeof window !== 'undefined') {
    window.AIChatAssistant = AIChatAssistant;
}
