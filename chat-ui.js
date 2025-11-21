// ===== AI CHAT UI CONTROLLER =====
// Handles chat interface interactions and message display

let chatAssistant = null;

// Initialize claudeAI globally to avoid duplicate declarations
if (typeof window.claudeAI === 'undefined') {
    window.claudeAI = null;
}

/**
 * Initialize chat interface
 */
function initializeChatUI() {
    // Initialize AI instances
    window.claudeAI = new ClaudeAI();
    chatAssistant = new AIChatAssistant(window.claudeAI);

    // Set portfolio context
    chatAssistant.setContext(experiences);

    // Initialize suggested questions
    updateSuggestedQuestions();

    // Wire up event listeners
    setupChatEventListeners();

    // Update usage indicator
    updateUsageIndicator();

    console.log('✅ Chat UI initialized');
}

/**
 * Update the AI usage indicator
 */
function updateUsageIndicator() {
    const indicator = document.getElementById('usage-text');
    if (!indicator || !window.claudeAI) return;

    try {
        const summary = window.claudeAI.getUsageSummary();

        // Check if user has their own API key
        if (window.claudeAI.hasOwnApiKey()) {
            indicator.innerHTML = '✅ <strong>Unlimited</strong> (using your API key)';
            indicator.style.color = '#28a745';
            return;
        }

        // Show quota for server key users
        const todayUsed = summary.today.used;
        const todayLimit = summary.today.limit;
        const todayRemaining = summary.today.remaining;

        if (todayLimit === 'Unlimited') {
            indicator.innerHTML = `✨ <strong>${summary.tier} Tier</strong> - Unlimited AI insights`;
            indicator.style.color = '#28a745';
        } else {
            const percentage = (todayUsed / todayLimit) * 100;
            let color = '#28a745'; // Green

            if (percentage >= 80) {
                color = '#dc3545'; // Red
            } else if (percentage >= 60) {
                color = '#ffc107'; // Yellow
            }

            indicator.innerHTML = `📊 <strong>${summary.tier} Tier</strong>: ${todayRemaining}/${todayLimit} AI insights remaining today`;
            indicator.style.color = color;
        }
    } catch (error) {
        console.error('Failed to update usage indicator:', error);
        indicator.innerHTML = '💡 <a href="#" onclick="if(window.ensureAPIKey) window.ensureAPIKey(); return false;" style="color: #007bff;">Add API key</a> for unlimited AI insights';
    }
}

/**
 * Setup all event listeners
 */
function setupChatEventListeners() {
    // Send button
    document.getElementById('btn-send-chat')?.addEventListener('click', () => {
        sendChatMessage();
    });

    // Enter key to send (Shift+Enter for new line)
    document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });

    // Quick analysis buttons
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const analysisType = btn.dataset.analysis;
            await handleQuickAnalysis(analysisType);
        });
    });

    // Export chat
    document.getElementById('btn-export-chat')?.addEventListener('click', () => {
        if (chatAssistant) {
            const result = chatAssistant.exportConversation();
            if (result.success) {
                showNotification(`Chat exported: ${result.filename}`, 'success');
            }
        }
    });

    // Clear chat
    document.getElementById('btn-clear-chat')?.addEventListener('click', () => {
        if (confirm('Clear entire conversation history?')) {
            clearChatHistory();
        }
    });
}

/**
 * Send user message
 */
async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();

    if (!message) return;

    // Add user message to UI
    addMessageToChat('user', message);

    // Clear input
    input.value = '';
    input.style.height = 'auto';

    // Show typing indicator
    showTypingIndicator();

    try {
        // Send to AI assistant
        const result = await chatAssistant.sendMessage(message);

        // Hide typing indicator
        hideTypingIndicator();

        if (result.success) {
            // Add AI response to chat
            addMessageToChat('assistant', result.response);

            // Update suggested questions
            if (result.suggestions && result.suggestions.length > 0) {
                updateSuggestedQuestions(result.suggestions);
            }

            // Update usage indicator
            updateUsageIndicator();

            // Auto-scroll to bottom
            scrollChatToBottom();
        } else {
            addMessageToChat('assistant', `Sorry, I encountered an error: ${result.error}`);
        }

    } catch (error) {
        hideTypingIndicator();
        addMessageToChat('assistant', 'Sorry, something went wrong. Please try again.');
        console.error('Chat error:', error);
    }

    // Always update usage indicator after attempt
    updateUsageIndicator();
}

/**
 * Handle quick analysis shortcuts
 */
async function handleQuickAnalysis(analysisType) {
    if (!chatAssistant) return;

    // Show typing indicator
    showTypingIndicator();

    try {
        const result = await chatAssistant.quickAnalysis(analysisType);

        hideTypingIndicator();

        if (result.success) {
            // The quick analysis already calls sendMessage internally
            // So the message and response are already added
            scrollChatToBottom();
        } else {
            addMessageToChat('assistant', `Sorry, couldn't perform ${analysisType} analysis.`);
        }

    } catch (error) {
        hideTypingIndicator();
        addMessageToChat('assistant', 'Sorry, analysis failed. Please try again.');
        console.error('Quick analysis error:', error);
    }
}

/**
 * Add message to chat UI
 */
function addMessageToChat(role, content) {
    const messagesContainer = document.getElementById('chat-messages');

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}-message`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'user' ? '👤' : '🤖';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';

    // Convert markdown-style formatting to HTML
    const formattedContent = formatMessageContent(content);
    textDiv.innerHTML = formattedContent;

    contentDiv.appendChild(textDiv);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);

    messagesContainer.appendChild(messageDiv);

    // Auto-scroll to bottom
    scrollChatToBottom();
}

/**
 * Format message content (basic markdown support)
 */
function formatMessageContent(content) {
    // Convert markdown-style formatting
    let formatted = content
        // Bold: **text** or __text__
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.*?)__/g, '<strong>$1</strong>')
        // Italic: *text* or _text_
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/_(.*?)_/g, '<em>$1</em>')
        // Line breaks
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

    // Wrap in paragraphs
    if (!formatted.includes('<p>')) {
        formatted = '<p>' + formatted + '</p>';
    }

    return formatted;
}

/**
 * Update suggested questions
 */
function updateSuggestedQuestions(customSuggestions = null) {
    const container = document.getElementById('suggestions-container');
    if (!container) return;

    container.innerHTML = '';

    const suggestions = customSuggestions || (chatAssistant ? chatAssistant.getSuggestedQuestions() : []);

    suggestions.slice(0, 5).forEach(question => {
        const chip = document.createElement('div');
        chip.className = 'suggestion-chip';
        chip.textContent = question;
        chip.addEventListener('click', () => {
            document.getElementById('chat-input').value = question;
            sendChatMessage();
        });
        container.appendChild(chip);
    });
}

/**
 * Show typing indicator
 */
function showTypingIndicator() {
    const indicator = document.getElementById('chat-typing');
    if (indicator) {
        indicator.style.display = 'flex';
    }
}

/**
 * Hide typing indicator
 */
function hideTypingIndicator() {
    const indicator = document.getElementById('chat-typing');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

/**
 * Scroll chat to bottom
 */
function scrollChatToBottom() {
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
    }
}

/**
 * Clear chat history
 */
function clearChatHistory() {
    // Clear from assistant
    if (chatAssistant) {
        chatAssistant.clearHistory();
    }

    // Clear UI (keep welcome message)
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
        // Remove all messages except the first (welcome message)
        const messages = messagesContainer.querySelectorAll('.chat-message');
        messages.forEach((msg, index) => {
            if (index > 0) { // Keep first message (welcome)
                msg.remove();
            }
        });
    }

    // Reset suggested questions
    updateSuggestedQuestions();

    showNotification('Chat history cleared', 'success');
}

/**
 * Update chat context when data changes
 */
function updateChatContext() {
    if (chatAssistant) {
        chatAssistant.setContext(experiences);
        updateSuggestedQuestions();
    }
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? 'var(--success-color)' : 'var(--info-color)'};
        color: white;
        border-radius: 8px;
        box-shadow: var(--shadow-md);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize when view is shown
document.addEventListener('DOMContentLoaded', () => {
    // Initialize when AI Insights view is first shown
    const navItems = document.querySelectorAll('[data-view="ai-insights"]');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Delay initialization to ensure view is loaded
            setTimeout(() => {
                if (!chatAssistant) {
                    initializeChatUI();
                }
            }, 100);
        });
    });
});

// Update context when experiences change
if (typeof window !== 'undefined') {
    window.updateChatContext = updateChatContext;
}
