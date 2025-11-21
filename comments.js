// ===== COMMENTS MODULE =====

/**
 * Comments and Discussion System
 * Handles threaded comments on products
 */

const COMMENTS_STORAGE_KEY = 'tasteSignature_comments';

/**
 * Initialize comments storage
 */
function initComments() {
    if (!localStorage.getItem(COMMENTS_STORAGE_KEY)) {
        localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify([]));
    }
}

/**
 * Get all comments
 */
function getAllComments() {
    const commentsStr = localStorage.getItem(COMMENTS_STORAGE_KEY);
    return commentsStr ? JSON.parse(commentsStr) : [];
}

/**
 * Save comments
 */
function saveComments(comments) {
    localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(comments));
}

/**
 * Add comment to product
 */
function addComment(productId, text, parentCommentId = null) {
    if (!text || text.trim().length === 0) {
        return { success: false, error: 'Comment text cannot be empty' };
    }

    const currentUser = getCurrentUser();
    const comments = getAllComments();

    const newComment = {
        id: 'comment-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        productId: productId,
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        text: text.trim(),
        parentId: parentCommentId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        edited: false,
        reactions: [],
        mentions: extractMentions(text)
    };

    comments.push(newComment);
    saveComments(comments);

    // Log activity
    logTeamActivity({
        type: 'comment_added',
        userId: currentUser.id,
        productId: productId,
        commentId: newComment.id,
        details: parentCommentId ? 'Replied to comment' : 'Added comment'
    });

    // Notify mentioned users
    if (newComment.mentions.length > 0) {
        notifyMentionedUsers(newComment);
    }

    return { success: true, comment: newComment };
}

/**
 * Edit comment
 */
function editComment(commentId, newText) {
    if (!newText || newText.trim().length === 0) {
        return { success: false, error: 'Comment text cannot be empty' };
    }

    const currentUser = getCurrentUser();
    const comments = getAllComments();
    const comment = comments.find(c => c.id === commentId);

    if (!comment) {
        return { success: false, error: 'Comment not found' };
    }

    // Only owner or admin can edit
    if (comment.userId !== currentUser.id &&
        !hasPermission(currentUser.role, Permissions.MANAGE_TEAM)) {
        return { success: false, error: 'Insufficient permissions' };
    }

    comment.text = newText.trim();
    comment.updatedAt = new Date().toISOString();
    comment.edited = true;
    comment.mentions = extractMentions(newText);

    saveComments(comments);

    // Log activity
    logTeamActivity({
        type: 'comment_edited',
        userId: currentUser.id,
        productId: comment.productId,
        commentId: commentId,
        details: 'Edited comment'
    });

    return { success: true, comment };
}

/**
 * Delete comment
 */
function deleteComment(commentId) {
    const currentUser = getCurrentUser();
    const comments = getAllComments();
    const commentIndex = comments.findIndex(c => c.id === commentId);

    if (commentIndex === -1) {
        return { success: false, error: 'Comment not found' };
    }

    const comment = comments[commentIndex];

    // Only owner or admin can delete
    if (comment.userId !== currentUser.id &&
        !hasPermission(currentUser.role, Permissions.MANAGE_TEAM)) {
        return { success: false, error: 'Insufficient permissions' };
    }

    // Delete comment and all replies
    const commentsToDelete = [commentId];
    const findReplies = (parentId) => {
        const replies = comments.filter(c => c.parentId === parentId);
        replies.forEach(reply => {
            commentsToDelete.push(reply.id);
            findReplies(reply.id);
        });
    };
    findReplies(commentId);

    // Remove all comments
    const updatedComments = comments.filter(c => !commentsToDelete.includes(c.id));
    saveComments(updatedComments);

    // Log activity
    logTeamActivity({
        type: 'comment_deleted',
        userId: currentUser.id,
        productId: comment.productId,
        commentId: commentId,
        details: `Deleted comment and ${commentsToDelete.length - 1} replies`
    });

    return { success: true, deletedCount: commentsToDelete.length };
}

/**
 * Get comments for a product
 */
function getProductComments(productId) {
    const comments = getAllComments();
    return comments.filter(c => c.productId === productId);
}

/**
 * Get threaded comments for a product
 */
function getThreadedComments(productId) {
    const comments = getProductComments(productId);

    // Separate top-level comments and replies
    const topLevel = comments.filter(c => !c.parentId);
    const replies = comments.filter(c => c.parentId);

    // Build thread structure
    const buildThread = (comment) => {
        const children = replies.filter(r => r.parentId === comment.id);
        return {
            ...comment,
            replies: children.map(buildThread).sort((a, b) =>
                new Date(a.createdAt) - new Date(b.createdAt)
            )
        };
    };

    // Sort top-level by newest first
    return topLevel
        .map(buildThread)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Add reaction to comment
 */
function addReaction(commentId, emoji) {
    const currentUser = getCurrentUser();
    const comments = getAllComments();
    const comment = comments.find(c => c.id === commentId);

    if (!comment) {
        return { success: false, error: 'Comment not found' };
    }

    if (!comment.reactions) {
        comment.reactions = [];
    }

    // Check if user already reacted with this emoji
    const existingReaction = comment.reactions.find(r =>
        r.userId === currentUser.id && r.emoji === emoji
    );

    if (existingReaction) {
        // Remove reaction (toggle off)
        comment.reactions = comment.reactions.filter(r =>
            !(r.userId === currentUser.id && r.emoji === emoji)
        );
    } else {
        // Add reaction
        comment.reactions.push({
            userId: currentUser.id,
            userName: currentUser.name,
            emoji: emoji,
            timestamp: new Date().toISOString()
        });
    }

    saveComments(comments);
    return { success: true, comment };
}

/**
 * Get comment statistics
 */
function getCommentStats(productId) {
    const comments = getProductComments(productId);

    const uniqueUsers = new Set(comments.map(c => c.userId));
    const totalReactions = comments.reduce((sum, c) =>
        sum + (c.reactions?.length || 0), 0
    );

    return {
        totalComments: comments.length,
        topLevelComments: comments.filter(c => !c.parentId).length,
        replies: comments.filter(c => c.parentId).length,
        participants: uniqueUsers.size,
        totalReactions: totalReactions,
        latestComment: comments.length > 0 ?
            comments.reduce((latest, c) =>
                new Date(c.createdAt) > new Date(latest.createdAt) ? c : latest
            ) : null
    };
}

/**
 * Extract @mentions from text
 */
function extractMentions(text) {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
        mentions.push(match[1]);
    }

    return mentions;
}

/**
 * Notify mentioned users
 */
function notifyMentionedUsers(comment) {
    const team = getTeam();

    comment.mentions.forEach(mentionName => {
        const user = team.members.find(m =>
            m.name.toLowerCase().includes(mentionName.toLowerCase())
        );

        if (user && user.id !== comment.userId) {
            // Store notification
            addNotification({
                userId: user.id,
                type: 'mention',
                fromUserId: comment.userId,
                fromUserName: comment.userName,
                productId: comment.productId,
                commentId: comment.id,
                message: `${comment.userName} mentioned you in a comment`
            });
        }
    });
}

/**
 * Add notification
 */
function addNotification(notification) {
    const notifications = getNotifications();

    const newNotification = {
        id: 'notif-' + Date.now(),
        timestamp: new Date().toISOString(),
        read: false,
        ...notification
    };

    notifications.unshift(newNotification);

    // Keep only last 100 notifications per user
    const userNotifications = notifications.filter(n => n.userId === notification.userId);
    if (userNotifications.length > 100) {
        // Remove oldest notifications
        const toRemove = userNotifications.slice(100);
        const updatedNotifications = notifications.filter(n =>
            !toRemove.find(r => r.id === n.id)
        );
        localStorage.setItem('tasteSignature_notifications', JSON.stringify(updatedNotifications));
    } else {
        localStorage.setItem('tasteSignature_notifications', JSON.stringify(notifications));
    }
}

/**
 * Get notifications for current user
 */
function getNotifications(userId = null) {
    const user = userId || getCurrentUser().id;
    const notificationsStr = localStorage.getItem('tasteSignature_notifications');
    const allNotifications = notificationsStr ? JSON.parse(notificationsStr) : [];

    if (userId) {
        return allNotifications.filter(n => n.userId === userId);
    }

    return allNotifications;
}

/**
 * Mark notification as read
 */
function markNotificationRead(notificationId) {
    const notifications = getNotifications();
    const notification = notifications.find(n => n.id === notificationId);

    if (notification) {
        notification.read = true;
        localStorage.setItem('tasteSignature_notifications', JSON.stringify(notifications));
        return { success: true };
    }

    return { success: false, error: 'Notification not found' };
}

/**
 * Get unread notification count
 */
function getUnreadCount() {
    const currentUser = getCurrentUser();
    const notifications = getNotifications();

    return notifications.filter(n =>
        n.userId === currentUser.id && !n.read
    ).length;
}

/**
 * Search comments
 */
function searchComments(query, productId = null) {
    let comments = getAllComments();

    if (productId) {
        comments = comments.filter(c => c.productId === productId);
    }

    const lowerQuery = query.toLowerCase();

    return comments.filter(c =>
        c.text.toLowerCase().includes(lowerQuery) ||
        c.userName.toLowerCase().includes(lowerQuery)
    );
}

// Initialize on load
initComments();
