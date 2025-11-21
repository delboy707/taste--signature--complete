// ===== ACTIVITY FEED UI MODULE =====

/**
 * Render activity feed
 */
function renderActivityFeed(limit = 20) {
    const activities = getTeamActivities(limit);
    const team = getTeam();

    let html = `
        <div class="activity-feed">
            <div class="activity-feed-header">
                <h3>📋 Recent Activity</h3>
                <button class="btn-secondary btn-sm" onclick="refreshActivityFeed()">Refresh</button>
            </div>
    `;

    if (activities.length === 0) {
        html += `
            <div class="empty-activity">
                <p>No recent activity</p>
            </div>
        `;
    } else {
        html += '<div class="activity-list">';

        activities.forEach(activity => {
            const user = team.members.find(m => m.id === activity.userId);
            const userName = user ? user.name : 'Unknown User';
            const timeAgo = getTimeAgo(activity.timestamp);

            html += `
                <div class="activity-item activity-${activity.type}">
                    <div class="activity-icon">${getActivityIcon(activity.type)}</div>
                    <div class="activity-content">
                        <div class="activity-text">
                            <strong>${userName}</strong> ${getActivityText(activity)}
                        </div>
                        <div class="activity-time">${timeAgo}</div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
    }

    html += '</div>';
    return html;
}

/**
 * Get activity icon based on type
 */
function getActivityIcon(type) {
    const icons = {
        member_added: '👤',
        member_removed: '🚫',
        role_updated: '🔑',
        product_shared: '📤',
        product_unshared: '🔒',
        comment_added: '💬',
        comment_edited: '✏️',
        comment_deleted: '🗑️',
        approval_submitted: '📝',
        approval_responded: '✅',
        approval_cancelled: '❌',
        product_created: '➕',
        product_updated: '📝',
        product_deleted: '🗑️'
    };

    return icons[type] || '📌';
}

/**
 * Get activity text description
 */
function getActivityText(activity) {
    switch (activity.type) {
        case 'member_added':
            return activity.details;
        case 'member_removed':
            return activity.details;
        case 'role_updated':
            return activity.details;
        case 'product_shared':
            return activity.details;
        case 'product_unshared':
            return activity.details;
        case 'comment_added':
            return activity.details;
        case 'comment_edited':
            return activity.details;
        case 'comment_deleted':
            return activity.details;
        case 'approval_submitted':
            return activity.details;
        case 'approval_responded':
            return activity.details;
        case 'approval_cancelled':
            return activity.details;
        default:
            return activity.details || 'performed an action';
    }
}

/**
 * Refresh activity feed
 */
function refreshActivityFeed() {
    const container = document.querySelector('.activity-feed');
    if (container) {
        container.outerHTML = renderActivityFeed();
    }
}

/**
 * Render compact activity widget (for dashboard)
 */
function renderActivityWidget(limit = 5) {
    const activities = getTeamActivities(limit);

    let html = `
        <div class="activity-widget">
            <h4>Recent Team Activity</h4>
    `;

    if (activities.length === 0) {
        html += '<p class="empty-message">No recent activity</p>';
    } else {
        html += '<div class="activity-widget-list">';

        activities.forEach(activity => {
            const team = getTeam();
            const user = team.members.find(m => m.id === activity.userId);
            const userName = user ? user.name : 'Unknown';

            html += `
                <div class="activity-widget-item">
                    <span class="activity-widget-icon">${getActivityIcon(activity.type)}</span>
                    <span class="activity-widget-text">
                        <strong>${userName}</strong> ${getActivityText(activity)}
                    </span>
                </div>
            `;
        });

        html += '</div>';
        html += '<a href="#" class="activity-widget-link" onclick="navigateToActivityFeed(); return false;">View all activity →</a>';
    }

    html += '</div>';
    return html;
}

/**
 * Navigate to activity feed view
 */
function navigateToActivityFeed() {
    // Navigate to team collaboration view with activity tab
    document.querySelector('[data-view="team-collaboration"]').click();
}
