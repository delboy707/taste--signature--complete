// ===== WEBHOOK INTEGRATION MODULE =====
// Enable external integrations via webhooks for data push/pull

// Webhook configuration
let webhookConfig = {
    inbound: {
        enabled: false,
        apiKey: null,
        allowedIPs: [],
        rateLimitPerMinute: 60
    },
    outbound: [],
    eventLog: []
};

// Timing-safe string comparison to prevent timing attacks
function timingSafeCompare(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

// Supported webhook events
const WEBHOOK_EVENTS = {
    'experience.created': 'New experience logged',
    'experience.updated': 'Experience updated',
    'experience.deleted': 'Experience deleted',
    'batch.imported': 'Batch import completed',
    'approval.requested': 'Approval requested',
    'approval.completed': 'Approval completed',
    'report.generated': 'Report generated'
};

// Zapier-compatible trigger schemas
const ZAPIER_SCHEMAS = {
    'experience.created': {
        type: 'object',
        properties: {
            id: { type: 'integer' },
            timestamp: { type: 'string', format: 'date-time' },
            productName: { type: 'string' },
            brand: { type: 'string' },
            category: { type: 'string' },
            overallSatisfaction: { type: 'number' },
            needState: { type: 'string' },
            notes: { type: 'string' }
        }
    }
};

/**
 * Initialize webhook integration
 */
function initWebhookIntegration() {
    loadWebhookConfig();
    setupMessageListener();
}

/**
 * Load webhook configuration from localStorage
 */
function loadWebhookConfig() {
    const stored = localStorage.getItem('webhookConfig');
    if (stored) {
        try {
            webhookConfig = { ...webhookConfig, ...JSON.parse(stored) };
        } catch (e) {
            console.error('Error loading webhook config:', e);
        }
    }
}

/**
 * Save webhook configuration
 */
function saveWebhookConfig() {
    localStorage.setItem('webhookConfig', JSON.stringify(webhookConfig));
}

/**
 * Setup message listener for inbound webhooks (via postMessage for same-origin)
 */
function setupMessageListener() {
    window.addEventListener('message', (event) => {
        // Verify origin if needed
        if (event.data && event.data.type === 'TASTE_SIGNATURE_WEBHOOK') {
            handleInboundWebhook(event.data.payload);
        }
    });
}

/**
 * Render webhook integration UI
 */
function renderWebhookIntegrationUI(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="webhook-integration-widget">
            <div class="webhook-header">
                <h4>Integrations & Webhooks</h4>
                <p class="webhook-hint">Connect Taste Signature to external tools and services</p>
            </div>

            <!-- Quick Integrations -->
            <div class="quick-integrations">
                <h5>Popular Integrations</h5>
                <div class="integration-grid">
                    <div class="integration-card" onclick="showZapierSetup()">
                        <div class="integration-logo">⚡</div>
                        <div class="integration-name">Zapier</div>
                        <div class="integration-desc">Connect to 5000+ apps</div>
                    </div>
                    <div class="integration-card" onclick="showMakeSetup()">
                        <div class="integration-logo">🔧</div>
                        <div class="integration-name">Make (Integromat)</div>
                        <div class="integration-desc">Visual automation</div>
                    </div>
                    <div class="integration-card" onclick="showSlackSetup()">
                        <div class="integration-logo">💬</div>
                        <div class="integration-name">Slack</div>
                        <div class="integration-desc">Team notifications</div>
                    </div>
                    <div class="integration-card" onclick="showAirtableSetup()">
                        <div class="integration-logo">📊</div>
                        <div class="integration-name">Airtable</div>
                        <div class="integration-desc">Database sync</div>
                    </div>
                    <div class="integration-card" onclick="showEmailSetup()">
                        <div class="integration-logo">📧</div>
                        <div class="integration-name">Email</div>
                        <div class="integration-desc">Email notifications</div>
                    </div>
                    <div class="integration-card" onclick="showCustomWebhook()">
                        <div class="integration-logo">🔗</div>
                        <div class="integration-name">Custom Webhook</div>
                        <div class="integration-desc">Any HTTP endpoint</div>
                    </div>
                </div>
            </div>

            <!-- Outbound Webhooks List -->
            <div class="outbound-webhooks">
                <div class="section-header">
                    <h5>Configured Webhooks</h5>
                    <button class="btn-small btn-primary" onclick="showCustomWebhook()">
                        + Add Webhook
                    </button>
                </div>
                <div id="webhooks-list" class="webhooks-list">
                    ${renderWebhooksList()}
                </div>
            </div>

            <!-- Inbound API -->
            <div class="inbound-api">
                <h5>Inbound API (Push Data)</h5>
                <p class="api-description">
                    Allow external systems to push sensory data to Taste Signature
                </p>

                <div class="api-key-section">
                    <label>API Key</label>
                    <div class="api-key-display">
                        <input type="password" id="api-key-display" readonly
                               value="${webhookConfig.inbound.apiKey || 'Not generated'}">
                        <button class="btn-small" onclick="toggleApiKeyVisibility()">👁️</button>
                        <button class="btn-small" onclick="copyApiKey()">📋</button>
                    </div>
                    <button class="btn-secondary" onclick="generateApiKey()">
                        🔑 Generate New Key
                    </button>
                </div>

                <div class="api-endpoint-section">
                    <label>API Endpoint</label>
                    <div class="endpoint-display">
                        <code id="api-endpoint">${window.location.origin}/api/webhook/inbound</code>
                        <button class="btn-small" onclick="copyEndpoint()">📋</button>
                    </div>
                </div>

                <div class="api-docs-link">
                    <button class="btn-secondary" onclick="showApiDocs()">
                        📖 View API Documentation
                    </button>
                </div>
            </div>

            <!-- Event Log -->
            <div class="event-log">
                <div class="section-header">
                    <h5>Recent Events</h5>
                    <button class="btn-small" onclick="clearEventLog()">Clear</button>
                </div>
                <div id="event-log-list" class="event-log-list">
                    ${renderEventLog()}
                </div>
            </div>
        </div>

        <!-- Webhook Setup Modal -->
        <div id="webhook-modal" class="webhook-modal" style="display: none;">
            <div class="modal-content">
                <div class="modal-header">
                    <h4 id="modal-title">Configure Webhook</h4>
                    <button class="modal-close" onclick="closeWebhookModal()">×</button>
                </div>
                <div id="modal-body" class="modal-body">
                    <!-- Dynamic content -->
                </div>
            </div>
        </div>
    `;

    attachWebhookListeners();
}

/**
 * Attach event listeners
 */
function attachWebhookListeners() {
    // Close modal on overlay click
    const modal = document.getElementById('webhook-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeWebhookModal();
            }
        });
    }
}

/**
 * Render webhooks list
 */
function renderWebhooksList() {
    if (webhookConfig.outbound.length === 0) {
        return '<div class="empty-list">No webhooks configured</div>';
    }

    return webhookConfig.outbound.map((webhook, index) => `
        <div class="webhook-item">
            <div class="webhook-info">
                <div class="webhook-name">${webhook.name || 'Unnamed Webhook'}</div>
                <div class="webhook-url">${webhook.url}</div>
                <div class="webhook-events">
                    ${webhook.events.map(e => `<span class="event-tag">${e}</span>`).join('')}
                </div>
            </div>
            <div class="webhook-status ${webhook.enabled ? 'active' : 'inactive'}">
                ${webhook.enabled ? 'Active' : 'Paused'}
            </div>
            <div class="webhook-actions">
                <button class="btn-small" onclick="toggleWebhook(${index})">
                    ${webhook.enabled ? '⏸️' : '▶️'}
                </button>
                <button class="btn-small" onclick="testWebhook(${index})">🧪</button>
                <button class="btn-small" onclick="editWebhook(${index})">✏️</button>
                <button class="btn-small btn-danger" onclick="deleteWebhook(${index})">🗑️</button>
            </div>
        </div>
    `).join('');
}

/**
 * Render event log
 */
function renderEventLog() {
    if (webhookConfig.eventLog.length === 0) {
        return '<div class="empty-log">No events yet</div>';
    }

    return webhookConfig.eventLog.slice(0, 20).map(event => `
        <div class="event-item ${event.success ? 'success' : 'error'}">
            <span class="event-time">${new Date(event.timestamp).toLocaleString()}</span>
            <span class="event-type">${event.event}</span>
            <span class="event-target">${event.webhookName || 'Inbound'}</span>
            <span class="event-status">${event.success ? '✓' : '✕'}</span>
        </div>
    `).join('');
}

/**
 * Show custom webhook setup
 */
function showCustomWebhook(editIndex = null) {
    const modal = document.getElementById('webhook-modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');

    const webhook = editIndex !== null ? webhookConfig.outbound[editIndex] : {
        name: '',
        url: '',
        events: [],
        headers: {},
        enabled: true
    };

    title.textContent = editIndex !== null ? 'Edit Webhook' : 'Add Custom Webhook';

    body.innerHTML = `
        <form id="webhook-form" onsubmit="saveWebhook(event, ${editIndex})">
            <div class="form-group">
                <label for="webhook-name">Webhook Name</label>
                <input type="text" id="webhook-name" value="${webhook.name}" placeholder="My Integration">
            </div>

            <div class="form-group">
                <label for="webhook-url">Webhook URL *</label>
                <input type="url" id="webhook-url" required value="${webhook.url}"
                       placeholder="https://hooks.zapier.com/...">
            </div>

            <div class="form-group">
                <label>Trigger Events *</label>
                <div class="events-checkboxes">
                    ${Object.entries(WEBHOOK_EVENTS).map(([event, desc]) => `
                        <label class="checkbox-label">
                            <input type="checkbox" name="events" value="${event}"
                                   ${webhook.events.includes(event) ? 'checked' : ''}>
                            <span>${desc}</span>
                        </label>
                    `).join('')}
                </div>
            </div>

            <div class="form-group">
                <label>Custom Headers (optional)</label>
                <div id="custom-headers">
                    ${Object.entries(webhook.headers || {}).map(([key, value], i) => `
                        <div class="header-row">
                            <input type="text" placeholder="Header name" value="${key}">
                            <input type="text" placeholder="Header value" value="${value}">
                            <button type="button" class="btn-small" onclick="removeHeaderRow(this)">×</button>
                        </div>
                    `).join('')}
                </div>
                <button type="button" class="btn-small btn-secondary" onclick="addHeaderRow()">
                    + Add Header
                </button>
            </div>

            <div class="form-group">
                <label class="checkbox-label">
                    <input type="checkbox" id="webhook-enabled" ${webhook.enabled ? 'checked' : ''}>
                    <span>Enable this webhook</span>
                </label>
            </div>

            <div class="modal-actions">
                <button type="button" class="btn-secondary" onclick="closeWebhookModal()">Cancel</button>
                <button type="submit" class="btn-primary">Save Webhook</button>
            </div>
        </form>
    `;

    modal.style.display = 'flex';
}

/**
 * Show Zapier setup
 */
function showZapierSetup() {
    const modal = document.getElementById('webhook-modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');

    title.textContent = 'Connect with Zapier';

    body.innerHTML = `
        <div class="integration-setup">
            <div class="setup-steps">
                <h5>Setup Steps:</h5>
                <ol>
                    <li>Go to <a href="https://zapier.com/apps/webhook/integrations" target="_blank">Zapier Webhooks</a></li>
                    <li>Create a new Zap with "Webhooks by Zapier" as the trigger</li>
                    <li>Select "Catch Hook" as the trigger event</li>
                    <li>Copy the webhook URL provided by Zapier</li>
                    <li>Paste it below and select your trigger events</li>
                </ol>
            </div>

            <form id="zapier-form" onsubmit="saveZapierWebhook(event)">
                <div class="form-group">
                    <label for="zapier-url">Zapier Webhook URL *</label>
                    <input type="url" id="zapier-url" required
                           placeholder="https://hooks.zapier.com/hooks/catch/...">
                </div>

                <div class="form-group">
                    <label>Trigger Events</label>
                    <div class="events-checkboxes">
                        <label class="checkbox-label">
                            <input type="checkbox" name="events" value="experience.created" checked>
                            <span>New experience logged</span>
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" name="events" value="batch.imported">
                            <span>Batch import completed</span>
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" name="events" value="approval.completed">
                            <span>Approval completed</span>
                        </label>
                    </div>
                </div>

                <div class="modal-actions">
                    <button type="button" class="btn-secondary" onclick="closeWebhookModal()">Cancel</button>
                    <button type="submit" class="btn-primary">Connect Zapier</button>
                </div>
            </form>
        </div>
    `;

    modal.style.display = 'flex';
}

/**
 * Show Slack setup
 */
function showSlackSetup() {
    const modal = document.getElementById('webhook-modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');

    title.textContent = 'Connect with Slack';

    body.innerHTML = `
        <div class="integration-setup">
            <div class="setup-steps">
                <h5>Setup Steps:</h5>
                <ol>
                    <li>Go to your <a href="https://api.slack.com/apps" target="_blank">Slack Apps</a></li>
                    <li>Create a new app or select existing one</li>
                    <li>Enable "Incoming Webhooks" feature</li>
                    <li>Add a new webhook to your workspace</li>
                    <li>Copy the webhook URL and paste below</li>
                </ol>
            </div>

            <form id="slack-form" onsubmit="saveSlackWebhook(event)">
                <div class="form-group">
                    <label for="slack-url">Slack Webhook URL *</label>
                    <input type="url" id="slack-url" required
                           placeholder="https://hooks.slack.com/services/...">
                </div>

                <div class="form-group">
                    <label for="slack-channel">Channel Name (optional)</label>
                    <input type="text" id="slack-channel" placeholder="#sensory-updates">
                </div>

                <div class="form-group">
                    <label>Notification Events</label>
                    <div class="events-checkboxes">
                        <label class="checkbox-label">
                            <input type="checkbox" name="events" value="experience.created" checked>
                            <span>New experience logged</span>
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" name="events" value="batch.imported" checked>
                            <span>Batch import completed</span>
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" name="events" value="approval.requested">
                            <span>Approval requested</span>
                        </label>
                    </div>
                </div>

                <div class="modal-actions">
                    <button type="button" class="btn-secondary" onclick="closeWebhookModal()">Cancel</button>
                    <button type="submit" class="btn-primary">Connect Slack</button>
                </div>
            </form>
        </div>
    `;

    modal.style.display = 'flex';
}

/**
 * Show Make (Integromat) setup
 */
function showMakeSetup() {
    showCustomWebhook();
    setTimeout(() => {
        document.getElementById('modal-title').textContent = 'Connect with Make (Integromat)';
    }, 0);
}

/**
 * Show Airtable setup
 */
function showAirtableSetup() {
    const modal = document.getElementById('webhook-modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');

    title.textContent = 'Connect with Airtable';

    body.innerHTML = `
        <div class="integration-setup">
            <div class="setup-steps">
                <h5>Setup via Airtable Automations:</h5>
                <ol>
                    <li>In Airtable, go to Automations</li>
                    <li>Create automation with "When webhook received" trigger</li>
                    <li>Copy the webhook URL</li>
                    <li>Paste below to send data to Airtable</li>
                </ol>
            </div>

            <form id="airtable-form" onsubmit="saveAirtableWebhook(event)">
                <div class="form-group">
                    <label for="airtable-url">Airtable Webhook URL *</label>
                    <input type="url" id="airtable-url" required
                           placeholder="https://hooks.airtable.com/workflows/...">
                </div>

                <div class="form-group">
                    <label>Sync Events</label>
                    <div class="events-checkboxes">
                        <label class="checkbox-label">
                            <input type="checkbox" name="events" value="experience.created" checked>
                            <span>New experience → New Record</span>
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" name="events" value="experience.updated">
                            <span>Updated experience → Update Record</span>
                        </label>
                    </div>
                </div>

                <div class="modal-actions">
                    <button type="button" class="btn-secondary" onclick="closeWebhookModal()">Cancel</button>
                    <button type="submit" class="btn-primary">Connect Airtable</button>
                </div>
            </form>
        </div>
    `;

    modal.style.display = 'flex';
}

/**
 * Show Email setup
 */
function showEmailSetup() {
    const modal = document.getElementById('webhook-modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');

    title.textContent = 'Email Notifications';

    body.innerHTML = `
        <div class="integration-setup">
            <div class="setup-info">
                <p>Set up email notifications via a webhook email service like:</p>
                <ul>
                    <li><a href="https://zapier.com" target="_blank">Zapier</a> (Webhooks → Gmail/Outlook)</li>
                    <li><a href="https://make.com" target="_blank">Make</a> (HTTP → Email)</li>
                    <li><a href="https://pipedream.com" target="_blank">Pipedream</a></li>
                </ul>
            </div>

            <p class="setup-hint">
                Configure your email service to accept webhooks, then add the webhook URL using
                "Custom Webhook" option.
            </p>

            <div class="modal-actions">
                <button type="button" class="btn-secondary" onclick="closeWebhookModal()">Cancel</button>
                <button type="button" class="btn-primary" onclick="showCustomWebhook()">Configure Custom Webhook</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

/**
 * Close webhook modal
 */
function closeWebhookModal() {
    document.getElementById('webhook-modal').style.display = 'none';
}

/**
 * Save webhook from form
 */
function saveWebhook(event, editIndex = null) {
    event.preventDefault();

    const name = document.getElementById('webhook-name').value.trim();
    const url = document.getElementById('webhook-url').value.trim();

    // Validate URL is HTTPS and not a private network address
    try {
        const parsedUrl = new URL(url);
        if (parsedUrl.protocol !== 'https:') {
            alert('Webhook URL must use HTTPS');
            return;
        }
        const hostname = parsedUrl.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) {
            alert('Webhook URL cannot point to private/local network addresses');
            return;
        }
    } catch (e) {
        alert('Invalid webhook URL');
        return;
    }

    const enabled = document.getElementById('webhook-enabled').checked;

    const events = Array.from(document.querySelectorAll('input[name="events"]:checked'))
        .map(cb => cb.value);

    if (events.length === 0) {
        alert('Please select at least one trigger event');
        return;
    }

    // Collect headers
    const headers = {};
    document.querySelectorAll('#custom-headers .header-row').forEach(row => {
        const inputs = row.querySelectorAll('input');
        const key = inputs[0].value.trim();
        const value = inputs[1].value.trim();
        if (key) headers[key] = value;
    });

    const webhook = { name: name || 'Custom Webhook', url, events, headers, enabled };

    if (editIndex !== null) {
        webhookConfig.outbound[editIndex] = webhook;
    } else {
        webhookConfig.outbound.push(webhook);
    }

    saveWebhookConfig();
    closeWebhookModal();
    document.getElementById('webhooks-list').innerHTML = renderWebhooksList();

    showWebhookNotification('Webhook saved successfully!');
}

/**
 * Save Zapier webhook
 */
function saveZapierWebhook(event) {
    event.preventDefault();

    const url = document.getElementById('zapier-url').value.trim();
    const events = Array.from(document.querySelectorAll('#zapier-form input[name="events"]:checked'))
        .map(cb => cb.value);

    webhookConfig.outbound.push({
        name: 'Zapier Integration',
        url,
        events,
        headers: {},
        enabled: true,
        type: 'zapier'
    });

    saveWebhookConfig();
    closeWebhookModal();
    document.getElementById('webhooks-list').innerHTML = renderWebhooksList();

    showWebhookNotification('Zapier connected successfully!');
}

/**
 * Save Slack webhook
 */
function saveSlackWebhook(event) {
    event.preventDefault();

    const url = document.getElementById('slack-url').value.trim();
    const channel = document.getElementById('slack-channel').value.trim();
    const events = Array.from(document.querySelectorAll('#slack-form input[name="events"]:checked'))
        .map(cb => cb.value);

    webhookConfig.outbound.push({
        name: 'Slack Notifications',
        url,
        events,
        headers: { 'Content-Type': 'application/json' },
        enabled: true,
        type: 'slack',
        config: { channel }
    });

    saveWebhookConfig();
    closeWebhookModal();
    document.getElementById('webhooks-list').innerHTML = renderWebhooksList();

    showWebhookNotification('Slack connected successfully!');
}

/**
 * Save Airtable webhook
 */
function saveAirtableWebhook(event) {
    event.preventDefault();

    const url = document.getElementById('airtable-url').value.trim();
    const events = Array.from(document.querySelectorAll('#airtable-form input[name="events"]:checked'))
        .map(cb => cb.value);

    webhookConfig.outbound.push({
        name: 'Airtable Sync',
        url,
        events,
        headers: { 'Content-Type': 'application/json' },
        enabled: true,
        type: 'airtable'
    });

    saveWebhookConfig();
    closeWebhookModal();
    document.getElementById('webhooks-list').innerHTML = renderWebhooksList();

    showWebhookNotification('Airtable connected successfully!');
}

/**
 * Add header row in form
 */
function addHeaderRow() {
    const container = document.getElementById('custom-headers');
    const row = document.createElement('div');
    row.className = 'header-row';
    row.innerHTML = `
        <input type="text" placeholder="Header name">
        <input type="text" placeholder="Header value">
        <button type="button" class="btn-small" onclick="removeHeaderRow(this)">×</button>
    `;
    container.appendChild(row);
}

/**
 * Remove header row
 */
function removeHeaderRow(btn) {
    btn.parentElement.remove();
}

/**
 * Toggle webhook enabled/disabled
 */
function toggleWebhook(index) {
    webhookConfig.outbound[index].enabled = !webhookConfig.outbound[index].enabled;
    saveWebhookConfig();
    document.getElementById('webhooks-list').innerHTML = renderWebhooksList();
}

/**
 * Test webhook
 */
async function testWebhook(index) {
    const webhook = webhookConfig.outbound[index];

    const testData = {
        event: 'test',
        timestamp: new Date().toISOString(),
        data: {
            message: 'Test webhook from Taste Signature',
            productName: 'Test Product',
            overallSatisfaction: 8
        }
    };

    try {
        await sendWebhook(webhook, testData);
        showWebhookNotification('Test webhook sent successfully!');
    } catch (error) {
        showWebhookNotification('Webhook test failed: ' + error.message, 'error');
    }
}

/**
 * Edit webhook
 */
function editWebhook(index) {
    showCustomWebhook(index);
}

/**
 * Delete webhook
 */
function deleteWebhook(index) {
    if (confirm('Are you sure you want to delete this webhook?')) {
        webhookConfig.outbound.splice(index, 1);
        saveWebhookConfig();
        document.getElementById('webhooks-list').innerHTML = renderWebhooksList();
        showWebhookNotification('Webhook deleted');
    }
}

/**
 * Send webhook
 */
async function sendWebhook(webhook, payload) {
    const headers = {
        'Content-Type': 'application/json',
        ...webhook.headers
    };

    // Format payload for Slack if needed
    let body = payload;
    if (webhook.type === 'slack') {
        body = formatSlackMessage(payload);
    }

    const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        mode: 'no-cors' // Many webhook services don't support CORS
    });

    // Log event
    logWebhookEvent(webhook.name, payload.event, true);

    return response;
}

/**
 * Format Slack message
 */
function formatSlackMessage(payload) {
    let text = '';
    const event = payload.event;

    if (event === 'experience.created') {
        text = `🎯 *New Sensory Experience Logged*\n` +
               `Product: ${payload.data.productName}\n` +
               `Brand: ${payload.data.brand || 'N/A'}\n` +
               `Overall: ${payload.data.overallSatisfaction}/10`;
    } else if (event === 'batch.imported') {
        text = `📥 *Batch Import Completed*\n` +
               `Products imported: ${payload.data.count}`;
    } else {
        text = `Taste Signature: ${event}`;
    }

    return {
        text,
        attachments: [{
            color: '#667eea',
            footer: 'Taste Signature',
            ts: Math.floor(Date.now() / 1000)
        }]
    };
}

/**
 * Trigger webhooks for an event
 */
function triggerWebhooks(eventType, data) {
    webhookConfig.outbound
        .filter(w => w.enabled && w.events.includes(eventType))
        .forEach(webhook => {
            sendWebhook(webhook, {
                event: eventType,
                timestamp: new Date().toISOString(),
                data
            }).catch(error => {
                console.error('Webhook error:', error);
                logWebhookEvent(webhook.name, eventType, false, error.message);
            });
        });
}

/**
 * Handle inbound webhook data
 */
function handleInboundWebhook(payload) {
    // Validate API key if configured
    if (webhookConfig.inbound.apiKey && !timingSafeCompare(payload.apiKey, webhookConfig.inbound.apiKey)) {
        console.error('Invalid API key');
        return { success: false, error: 'Invalid API key' };
    }

    try {
        if (payload.action === 'create' && payload.experience) {
            // Create new experience
            const experience = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                entryMode: 'webhook',
                ...payload.experience
            };

            if (typeof experiences !== 'undefined') {
                experiences.push(experience);
                saveData();
                updateDashboard();
            }

            logWebhookEvent('Inbound', 'experience.created', true);
            return { success: true, id: experience.id };
        }

        return { success: false, error: 'Unknown action' };
    } catch (error) {
        logWebhookEvent('Inbound', payload.action, false, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Log webhook event
 */
function logWebhookEvent(webhookName, event, success, error = null) {
    webhookConfig.eventLog.unshift({
        timestamp: new Date().toISOString(),
        webhookName,
        event,
        success,
        error
    });

    // Keep only last 50 events
    webhookConfig.eventLog = webhookConfig.eventLog.slice(0, 50);
    saveWebhookConfig();

    // Update UI if visible
    const logList = document.getElementById('event-log-list');
    if (logList) {
        logList.innerHTML = renderEventLog();
    }
}

/**
 * Generate new API key
 */
function generateApiKey() {
    const key = 'ts_' + Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    webhookConfig.inbound.apiKey = key;
    webhookConfig.inbound.enabled = true;
    saveWebhookConfig();

    document.getElementById('api-key-display').value = key;
    showWebhookNotification('New API key generated!');
}

/**
 * Toggle API key visibility
 */
function toggleApiKeyVisibility() {
    const input = document.getElementById('api-key-display');
    input.type = input.type === 'password' ? 'text' : 'password';
}

/**
 * Copy API key to clipboard
 */
function copyApiKey() {
    const key = webhookConfig.inbound.apiKey;
    if (key) {
        navigator.clipboard.writeText(key);
        showWebhookNotification('API key copied to clipboard');
    }
}

/**
 * Copy endpoint to clipboard
 */
function copyEndpoint() {
    const endpoint = document.getElementById('api-endpoint').textContent;
    navigator.clipboard.writeText(endpoint);
    showWebhookNotification('Endpoint copied to clipboard');
}

/**
 * Clear event log
 */
function clearEventLog() {
    webhookConfig.eventLog = [];
    saveWebhookConfig();
    document.getElementById('event-log-list').innerHTML = renderEventLog();
}

/**
 * Show API documentation
 */
function showApiDocs() {
    const modal = document.getElementById('webhook-modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');

    title.textContent = 'API Documentation';

    body.innerHTML = `
        <div class="api-docs">
            <h5>Create Experience</h5>
            <pre><code>POST /api/webhook/inbound
Content-Type: application/json
X-API-Key: your_api_key

{
  "action": "create",
  "experience": {
    "productInfo": {
      "name": "Product Name",
      "brand": "Brand",
      "type": "beverage",
      "variant": "Original"
    },
    "stages": {
      "appearance": { "visualAppeal": 7 },
      "aroma": { "intensity": 6 },
      "frontMouth": { "sweetness": 5 },
      "midRearMouth": { "bitterness": 4 },
      "aftertaste": { "pleasantness": 6 }
    },
    "needState": "reward",
    "overallSatisfaction": 7,
    "notes": "Optional notes"
  }
}</code></pre>

            <h5>Response</h5>
            <pre><code>{
  "success": true,
  "id": 1234567890
}</code></pre>

            <div class="modal-actions">
                <button type="button" class="btn-primary" onclick="closeWebhookModal()">Close</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

/**
 * Show webhook notification
 */
function showWebhookNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `webhook-notification ${type}`;
    const iconSpan = document.createElement('span');
    iconSpan.className = 'notification-icon';
    iconSpan.textContent = type === 'success' ? '✓' : '✕';
    const msgSpan = document.createElement('span');
    msgSpan.className = 'notification-message';
    msgSpan.textContent = message;
    notification.appendChild(iconSpan);
    notification.appendChild(msgSpan);
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Export functions globally
window.initWebhookIntegration = initWebhookIntegration;
window.renderWebhookIntegrationUI = renderWebhookIntegrationUI;
window.triggerWebhooks = triggerWebhooks;
window.handleInboundWebhook = handleInboundWebhook;
window.showCustomWebhook = showCustomWebhook;
window.showZapierSetup = showZapierSetup;
window.showSlackSetup = showSlackSetup;
window.showMakeSetup = showMakeSetup;
window.showAirtableSetup = showAirtableSetup;
window.showEmailSetup = showEmailSetup;
window.closeWebhookModal = closeWebhookModal;
window.saveWebhook = saveWebhook;
window.saveZapierWebhook = saveZapierWebhook;
window.saveSlackWebhook = saveSlackWebhook;
window.saveAirtableWebhook = saveAirtableWebhook;
window.addHeaderRow = addHeaderRow;
window.removeHeaderRow = removeHeaderRow;
window.toggleWebhook = toggleWebhook;
window.testWebhook = testWebhook;
window.editWebhook = editWebhook;
window.deleteWebhook = deleteWebhook;
window.generateApiKey = generateApiKey;
window.toggleApiKeyVisibility = toggleApiKeyVisibility;
window.copyApiKey = copyApiKey;
window.copyEndpoint = copyEndpoint;
window.clearEventLog = clearEventLog;
window.showApiDocs = showApiDocs;
