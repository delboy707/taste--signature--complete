// ===== USER TIER CONFIGURATION =====
// Defines quotas and limits for different user tiers
// Ready for future monetization!

const UserTiers = {
    FREE: {
        id: 'free',
        name: 'Free',
        price: 0,
        quotas: {
            aiInsightsPerDay: 5,          // Free users get 5 AI insights per day
            aiInsightsPerMonth: 100,       // Monthly cap
            maxProducts: 50,               // Max products in portfolio
            teamMembers: 1                 // Solo user only
        },
        features: {
            basicAnalysis: true,
            aiInsights: true,
            industryBenchmarks: true,
            teamCollaboration: false,
            prioritySupport: false,
            customBranding: false,
            apiAccess: false
        },
        description: 'Perfect for individuals getting started with taste signature analysis'
    },

    // 🎯 FUTURE PAID TIERS - Ready to activate!
    BASIC: {
        id: 'basic',
        name: 'Basic',
        price: 5,                          // $5/month
        quotas: {
            aiInsightsPerDay: 50,          // 10x more than free
            aiInsightsPerMonth: 1000,
            maxProducts: 200,
            teamMembers: 3
        },
        features: {
            basicAnalysis: true,
            aiInsights: true,
            industryBenchmarks: true,
            teamCollaboration: true,
            prioritySupport: false,
            customBranding: false,
            apiAccess: false
        },
        description: 'For small teams and growing portfolios'
    },

    PRO: {
        id: 'pro',
        name: 'Pro',
        price: 15,                         // $15/month
        quotas: {
            aiInsightsPerDay: -1,          // Unlimited (-1 means no limit)
            aiInsightsPerMonth: -1,
            maxProducts: 1000,
            teamMembers: 10
        },
        features: {
            basicAnalysis: true,
            aiInsights: true,
            industryBenchmarks: true,
            teamCollaboration: true,
            prioritySupport: true,
            customBranding: true,
            apiAccess: false
        },
        description: 'Unlimited AI insights for serious product developers'
    },

    ENTERPRISE: {
        id: 'enterprise',
        name: 'Enterprise',
        price: 'custom',
        quotas: {
            aiInsightsPerDay: -1,          // Unlimited
            aiInsightsPerMonth: -1,
            maxProducts: -1,
            teamMembers: -1
        },
        features: {
            basicAnalysis: true,
            aiInsights: true,
            industryBenchmarks: true,
            teamCollaboration: true,
            prioritySupport: true,
            customBranding: true,
            apiAccess: true,
            dedicatedSupport: true,
            sso: true,
            customIntegrations: true
        },
        description: 'Custom solutions for large organizations'
    }
};

// ===== USAGE TRACKING =====
class UsageTracker {
    constructor() {
        this.storageKey = 'tasteSignature_usage';
    }

    /**
     * Get user's current tier
     */
    getUserTier(userId = null) {
        // For now, all users are FREE tier
        // In future, check Firestore or localStorage for paid tier
        const userTierData = localStorage.getItem(`tasteSignature_userTier_${userId || 'current'}`);

        if (userTierData) {
            try {
                const data = JSON.parse(userTierData);
                return UserTiers[data.tier.toUpperCase()] || UserTiers.FREE;
            } catch (e) {
                return UserTiers.FREE;
            }
        }

        return UserTiers.FREE;
    }

    /**
     * Get today's usage data
     */
    getTodayUsage(userId = null) {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const key = `${this.storageKey}_${userId || 'current'}_${today}`;
        const stored = localStorage.getItem(key);

        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                return this.createEmptyUsage();
            }
        }

        return this.createEmptyUsage();
    }

    /**
     * Get this month's usage data
     */
    getMonthUsage(userId = null) {
        const month = new Date().toISOString().substring(0, 7); // YYYY-MM
        const key = `${this.storageKey}_${userId || 'current'}_month_${month}`;
        const stored = localStorage.getItem(key);

        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                return this.createEmptyUsage();
            }
        }

        return this.createEmptyUsage();
    }

    /**
     * Create empty usage object
     */
    createEmptyUsage() {
        return {
            aiInsights: 0,
            lastReset: new Date().toISOString()
        };
    }

    /**
     * Check if user can make an AI request
     */
    canUseAI(userId = null) {
        const tier = this.getUserTier(userId);
        const todayUsage = this.getTodayUsage(userId);
        const monthUsage = this.getMonthUsage(userId);

        // Check daily quota
        if (tier.quotas.aiInsightsPerDay !== -1) {
            if (todayUsage.aiInsights >= tier.quotas.aiInsightsPerDay) {
                return {
                    allowed: false,
                    reason: 'daily_limit',
                    limit: tier.quotas.aiInsightsPerDay,
                    used: todayUsage.aiInsights,
                    message: `Daily limit reached (${tier.quotas.aiInsightsPerDay} AI insights per day on ${tier.name} tier)`
                };
            }
        }

        // Check monthly quota
        if (tier.quotas.aiInsightsPerMonth !== -1) {
            if (monthUsage.aiInsights >= tier.quotas.aiInsightsPerMonth) {
                return {
                    allowed: false,
                    reason: 'monthly_limit',
                    limit: tier.quotas.aiInsightsPerMonth,
                    used: monthUsage.aiInsights,
                    message: `Monthly limit reached (${tier.quotas.aiInsightsPerMonth} AI insights per month on ${tier.name} tier)`
                };
            }
        }

        return {
            allowed: true,
            remaining: {
                today: tier.quotas.aiInsightsPerDay === -1 ? 'unlimited' : tier.quotas.aiInsightsPerDay - todayUsage.aiInsights,
                month: tier.quotas.aiInsightsPerMonth === -1 ? 'unlimited' : tier.quotas.aiInsightsPerMonth - monthUsage.aiInsights
            }
        };
    }

    /**
     * Record an AI insight usage
     */
    recordAIUsage(userId = null) {
        const today = new Date().toISOString().split('T')[0];
        const month = new Date().toISOString().substring(0, 7);

        // Update daily usage
        const todayKey = `${this.storageKey}_${userId || 'current'}_${today}`;
        const todayUsage = this.getTodayUsage(userId);
        todayUsage.aiInsights++;
        todayUsage.lastUsed = new Date().toISOString();
        localStorage.setItem(todayKey, JSON.stringify(todayUsage));

        // Update monthly usage
        const monthKey = `${this.storageKey}_${userId || 'current'}_month_${month}`;
        const monthUsage = this.getMonthUsage(userId);
        monthUsage.aiInsights++;
        monthUsage.lastUsed = new Date().toISOString();
        localStorage.setItem(monthKey, JSON.stringify(monthUsage));

        return {
            todayTotal: todayUsage.aiInsights,
            monthTotal: monthUsage.aiInsights
        };
    }

    /**
     * Get usage summary for display
     */
    getUsageSummary(userId = null) {
        const tier = this.getUserTier(userId);
        const todayUsage = this.getTodayUsage(userId);
        const monthUsage = this.getMonthUsage(userId);

        return {
            tier: tier.name,
            today: {
                used: todayUsage.aiInsights,
                limit: tier.quotas.aiInsightsPerDay === -1 ? 'Unlimited' : tier.quotas.aiInsightsPerDay,
                remaining: tier.quotas.aiInsightsPerDay === -1 ? 'Unlimited' : tier.quotas.aiInsightsPerDay - todayUsage.aiInsights
            },
            month: {
                used: monthUsage.aiInsights,
                limit: tier.quotas.aiInsightsPerMonth === -1 ? 'Unlimited' : tier.quotas.aiInsightsPerMonth,
                remaining: tier.quotas.aiInsightsPerMonth === -1 ? 'Unlimited' : tier.quotas.aiInsightsPerMonth - monthUsage.aiInsights
            }
        };
    }

    /**
     * ADMIN: Upgrade user to paid tier (for future use)
     */
    upgradeTier(userId, newTier) {
        const tier = newTier.toUpperCase();
        if (!UserTiers[tier]) {
            throw new Error(`Invalid tier: ${newTier}`);
        }

        const data = {
            tier: tier,
            upgradedAt: new Date().toISOString(),
            expiresAt: null // Set to subscription end date in future
        };

        localStorage.setItem(`tasteSignature_userTier_${userId || 'current'}`, JSON.stringify(data));
        console.log(`✅ User upgraded to ${UserTiers[tier].name} tier`);

        return UserTiers[tier];
    }

    /**
     * Clean up old usage data (call periodically)
     */
    cleanupOldData() {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Remove daily usage data older than 30 days
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.storageKey) && !key.includes('month_')) {
                const parts = key.split('_');
                const date = parts[parts.length - 1];
                const usageDate = new Date(date);

                if (usageDate < thirtyDaysAgo) {
                    localStorage.removeItem(key);
                    console.log(`🗑️ Cleaned up old usage data: ${key}`);
                }
            }
        }
    }
}

// Export
if (typeof window !== 'undefined') {
    window.UserTiers = UserTiers;
    window.UsageTracker = UsageTracker;
}
