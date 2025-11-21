// ===== PUSH NOTIFICATIONS FOR PWA =====
// Optional push notification system for user engagement

class PushNotificationManager {
    constructor() {
        this.isSupported = 'Notification' in window && 'serviceWorker' in navigator;
        this.permission = this.isSupported ? Notification.permission : 'denied';
        this.subscription = null;
    }

    /**
     * Check if notifications are supported
     */
    isNotificationSupported() {
        return this.isSupported;
    }

    /**
     * Check current permission status
     */
    getPermission() {
        return this.permission;
    }

    /**
     * Request notification permission
     */
    async requestPermission() {
        if (!this.isSupported) {
            throw new Error('Notifications not supported on this device');
        }

        try {
            this.permission = await Notification.requestPermission();

            if (this.permission === 'granted') {
                console.log('✅ Notification permission granted');
                this.savePreference(true);
                return true;
            } else if (this.permission === 'denied') {
                console.log('❌ Notification permission denied');
                this.savePreference(false);
                return false;
            } else {
                console.log('⚠️ Notification permission dismissed');
                return false;
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return false;
        }
    }

    /**
     * Show a local notification
     */
    async showNotification(title, options = {}) {
        if (!this.isSupported || this.permission !== 'granted') {
            console.warn('Cannot show notification - permission not granted');
            return false;
        }

        const defaultOptions = {
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            vibrate: [200, 100, 200],
            requireInteraction: false,
            ...options
        };

        try {
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.ready;
                await registration.showNotification(title, defaultOptions);
            } else {
                new Notification(title, defaultOptions);
            }

            console.log('✅ Notification shown:', title);
            return true;
        } catch (error) {
            console.error('Error showing notification:', error);
            return false;
        }
    }

    /**
     * Subscribe to push notifications (for future server-side notifications)
     */
    async subscribeToPush() {
        if (!this.isSupported || this.permission !== 'granted') {
            return false;
        }

        try {
            const registration = await navigator.serviceWorker.ready;

            // Note: You'll need to add your VAPID public key here for production
            // Get it from your push notification service (Firebase, OneSignal, etc.)
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: null // Add VAPID key here when ready
            });

            this.subscription = subscription;
            console.log('✅ Subscribed to push notifications');

            // TODO: Send subscription to your server
            // await this.sendSubscriptionToServer(subscription);

            return subscription;
        } catch (error) {
            console.error('Failed to subscribe to push:', error);
            return null;
        }
    }

    /**
     * Unsubscribe from push notifications
     */
    async unsubscribe() {
        if (!this.subscription) {
            console.log('No active subscription');
            return true;
        }

        try {
            await this.subscription.unsubscribe();
            this.subscription = null;
            this.savePreference(false);
            console.log('✅ Unsubscribed from push notifications');
            return true;
        } catch (error) {
            console.error('Failed to unsubscribe:', error);
            return false;
        }
    }

    /**
     * Save notification preference to localStorage
     */
    savePreference(enabled) {
        localStorage.setItem('notifications_enabled', enabled.toString());
    }

    /**
     * Get saved notification preference
     */
    getPreference() {
        const saved = localStorage.getItem('notifications_enabled');
        return saved === 'true';
    }

    /**
     * Schedule a notification for later
     */
    scheduleNotification(title, options, delayMs) {
        setTimeout(async () => {
            await this.showNotification(title, options);
        }, delayMs);
    }
}

// ===== NOTIFICATION TEMPLATES =====

const NotificationTemplates = {
    // Welcome notification
    welcome: {
        title: '🎉 Welcome to Taste Signature!',
        body: 'Start logging your first taste experience to unlock insights.',
        icon: '/icon-192.png',
        tag: 'welcome'
    },

    // Reminder to log experience
    logReminder: {
        title: '📝 Time to Log a Taste Experience',
        body: 'Document your latest product testing session.',
        icon: '/icon-192.png',
        tag: 'reminder',
        actions: [
            { action: 'log', title: 'Log Now' },
            { action: 'dismiss', title: 'Later' }
        ]
    },

    // AI insights ready
    insightsReady: {
        title: '💡 AI Insights Ready!',
        body: 'Your product analysis is complete. Check out the insights.',
        icon: '/icon-192.png',
        tag: 'insights'
    },

    // Team collaboration
    teamUpdate: {
        title: '👥 Team Update',
        body: 'New comment on your product analysis.',
        icon: '/icon-192.png',
        tag: 'team'
    },

    // Quota warning
    quotaWarning: {
        title: '⚠️ AI Quota Running Low',
        body: 'You have 2 AI insights remaining today.',
        icon: '/icon-192.png',
        tag: 'quota'
    }
};

// ===== NOTIFICATION UI PROMPT =====

/**
 * Show friendly notification opt-in prompt
 */
function showNotificationPrompt() {
    const manager = new PushNotificationManager();

    // Don't show if already decided
    if (manager.getPermission() !== 'default') {
        return;
    }

    // Don't show if user has already dismissed
    const dismissed = localStorage.getItem('notification_prompt_dismissed');
    if (dismissed === 'true') {
        return;
    }

    // Create prompt banner
    const banner = document.createElement('div');
    banner.className = 'notification-prompt';
    banner.innerHTML = `
        <div class="notification-prompt-content">
            <div class="notification-prompt-icon">🔔</div>
            <div class="notification-prompt-text">
                <strong>Stay Updated</strong>
                <p>Get notified about AI insights, team updates, and reminders.</p>
            </div>
            <div class="notification-prompt-actions">
                <button class="btn btn-primary btn-sm" id="btn-enable-notifications">
                    Enable
                </button>
                <button class="btn btn-secondary btn-sm" id="btn-dismiss-notifications">
                    Not Now
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(banner);

    // Enable notifications
    document.getElementById('btn-enable-notifications').addEventListener('click', async () => {
        const granted = await manager.requestPermission();
        banner.remove();

        if (granted) {
            // Show welcome notification
            setTimeout(() => {
                manager.showNotification(
                    NotificationTemplates.welcome.title,
                    NotificationTemplates.welcome
                );
            }, 1000);
        }
    });

    // Dismiss prompt
    document.getElementById('btn-dismiss-notifications').addEventListener('click', () => {
        localStorage.setItem('notification_prompt_dismissed', 'true');
        banner.remove();
    });

    // Auto-hide after 15 seconds
    setTimeout(() => {
        if (banner.parentElement) {
            banner.style.opacity = '0';
            setTimeout(() => banner.remove(), 300);
        }
    }, 15000);
}

// ===== ADD TO SETTINGS UI =====

/**
 * Render notification toggle in settings
 */
function renderNotificationSettings(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const manager = new PushNotificationManager();

    const section = document.createElement('div');
    section.className = 'settings-section';
    section.innerHTML = `
        <h3>🔔 Notifications</h3>
        <div class="setting-item">
            <div class="setting-info">
                <strong>Push Notifications</strong>
                <p>Get notified about insights, updates, and reminders</p>
            </div>
            <label class="toggle-switch">
                <input type="checkbox" id="notifications-toggle" ${manager.getPermission() === 'granted' ? 'checked' : ''}>
                <span class="toggle-slider"></span>
            </label>
        </div>
        ${manager.getPermission() === 'denied' ? '<p class="setting-note">⚠️ Notifications are blocked. Enable them in your browser settings.</p>' : ''}
    `;

    container.appendChild(section);

    // Handle toggle
    const toggle = document.getElementById('notifications-toggle');
    toggle.addEventListener('change', async (e) => {
        if (e.target.checked) {
            const granted = await manager.requestPermission();
            if (!granted) {
                e.target.checked = false;
                alert('Please allow notifications in your browser settings.');
            }
        } else {
            await manager.unsubscribe();
        }
    });
}

// Export to global
if (typeof window !== 'undefined') {
    window.PushNotificationManager = PushNotificationManager;
    window.NotificationTemplates = NotificationTemplates;
    window.showNotificationPrompt = showNotificationPrompt;
    window.renderNotificationSettings = renderNotificationSettings;

    // Create global instance
    window.notificationManager = new PushNotificationManager();
}

// Add CSS for notification prompt
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .notification-prompt {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        padding: 20px;
        max-width: 500px;
        width: calc(100% - 40px);
        animation: slideUp 0.3s ease-out;
        opacity: 1;
        transition: opacity 0.3s;
    }

    .notification-prompt-content {
        display: flex;
        gap: 15px;
        align-items: center;
    }

    .notification-prompt-icon {
        font-size: 2.5rem;
        flex-shrink: 0;
    }

    .notification-prompt-text {
        flex: 1;
    }

    .notification-prompt-text strong {
        display: block;
        margin-bottom: 5px;
        color: #2c3e50;
    }

    .notification-prompt-text p {
        margin: 0;
        color: #7f8c8d;
        font-size: 0.9rem;
    }

    .notification-prompt-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .notification-prompt-actions .btn {
        white-space: nowrap;
    }

    @media screen and (max-width: 768px) {
        .notification-prompt {
            bottom: 80px; /* Above mobile nav */
        }

        .notification-prompt-content {
            flex-wrap: wrap;
        }

        .notification-prompt-actions {
            width: 100%;
            flex-direction: row;
        }

        .notification-prompt-actions .btn {
            flex: 1;
        }
    }

    @keyframes slideUp {
        from {
            transform: translateX(-50%) translateY(100px);
            opacity: 0;
        }
        to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
    }

    /* Toggle switch for settings */
    .toggle-switch {
        position: relative;
        display: inline-block;
        width: 50px;
        height: 26px;
    }

    .toggle-switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }

    .toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #ccc;
        transition: 0.3s;
        border-radius: 26px;
    }

    .toggle-slider:before {
        position: absolute;
        content: "";
        height: 20px;
        width: 20px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: 0.3s;
        border-radius: 50%;
    }

    .toggle-switch input:checked + .toggle-slider {
        background-color: var(--primary-color);
    }

    .toggle-switch input:checked + .toggle-slider:before {
        transform: translateX(24px);
    }

    .setting-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 8px;
        margin-bottom: 10px;
    }

    .setting-info strong {
        display: block;
        margin-bottom: 5px;
        color: #2c3e50;
    }

    .setting-info p {
        margin: 0;
        font-size: 0.9rem;
        color: #7f8c8d;
    }

    .setting-note {
        font-size: 0.85rem;
        color: #e67e22;
        padding: 10px;
        background: #fef5e7;
        border-radius: 6px;
        margin-top: 10px;
    }
`;
document.head.appendChild(notificationStyles);
