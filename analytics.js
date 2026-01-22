// ===== SIMPLE ANALYTICS =====
// Local usage tracking (no external services)

const Analytics = {
    STORAGE_KEY: 'taste_analytics',

    /**
     * Get analytics data
     */
    getData() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        return stored ? JSON.parse(stored) : {
            sessions: 0,
            pageViews: {},
            features: {},
            lastVisit: null,
            firstVisit: null
        };
    },

    /**
     * Save analytics data
     */
    save(data) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    },

    /**
     * Track session start
     */
    trackSession() {
        const data = this.getData();
        const now = new Date().toISOString();

        if (!data.firstVisit) data.firstVisit = now;
        data.lastVisit = now;
        data.sessions++;

        this.save(data);
    },

    /**
     * Track page/view
     */
    trackView(viewName) {
        const data = this.getData();
        data.pageViews[viewName] = (data.pageViews[viewName] || 0) + 1;
        this.save(data);
    },

    /**
     * Track feature usage
     */
    trackFeature(featureName) {
        const data = this.getData();
        data.features[featureName] = (data.features[featureName] || 0) + 1;
        this.save(data);
    },

    /**
     * Get usage summary
     */
    getSummary() {
        const data = this.getData();
        const topViews = Object.entries(data.pageViews)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        const topFeatures = Object.entries(data.features)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        return {
            totalSessions: data.sessions,
            topViews,
            topFeatures,
            daysSinceFirst: data.firstVisit ?
                Math.floor((Date.now() - new Date(data.firstVisit)) / (1000 * 60 * 60 * 24)) : 0
        };
    },

    /**
     * Reset analytics
     */
    reset() {
        localStorage.removeItem(this.STORAGE_KEY);
    }
};

// Track session on load
Analytics.trackSession();

// Auto-track view changes
if (typeof window !== 'undefined') {
    const originalNavigate = window.navigateToView;
    if (typeof originalNavigate === 'function') {
        window.navigateToView = function(viewName) {
            Analytics.trackView(viewName);
            return originalNavigate.apply(this, arguments);
        };
    }
}

window.Analytics = Analytics;
