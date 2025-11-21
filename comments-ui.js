// ===== COMMENTS UI MODULE =====

/**
 * Render comments section for a product
 */
function renderCommentsSection(productId) {
    const comments = getThreadedComments(productId);
    const stats = getCommentStats(productId);

    let html = `
        <div class="comments-section">
            <div class="comments-header">
                <h3>💬 Discussion (${stats.totalComments})</h3>
                <button class="btn-secondary btn-sm" onclick="toggleCommentsExpanded('${productId}')">
                    ${stats.totalComments > 0 ? 'Collapse' : 'Expand'}
                </button>
            </div>
    `;

    // Add comment form
    html += renderAddCommentForm(productId);

    // Render comment threads
    if (comments.length > 0) {
        html += '<div class="comments-list">';
        comments.forEach(comment => {
            html += renderCommentThread(comment, productId);
        });
        html += '</div>';
    } else {
        html += `
            <div class="empty-comments">
                <p>💬 No comments yet. Start the discussion!</p>
            </div>
        `;
    }

    html += '</div>';
    return html;
}

/**
 * Render add comment form
 */
function renderAddCommentForm(productId, parentId = null) {
    const formId = parentId ? `reply-form-${parentId}` : `comment-form-${productId}`;
    const placeholder = parentId ? 'Write a reply...' : 'Share your thoughts...';

    return `
        <div class="add-comment-form" id="${formId}">
            <textarea
                class="comment-input"
                id="comment-text-${formId}"
                placeholder="${placeholder}"
                rows="2"
            ></textarea>
            <div class="comment-form-actions">
                <div class="comment-form-hints">
                    <small>💡 Use @name to mention teammates</small>
                </div>
                <div class="comment-form-buttons">
                    ${parentId ? `
                        <button class="btn-secondary btn-sm" onclick="cancelReply('${parentId}')">Cancel</button>
                    ` : ''}
                    <button
                        class="btn-primary btn-sm"
                        onclick="submitComment('${productId}', '${formId}', ${parentId ? `'${parentId}'` : 'null'})"
                    >
                        ${parentId ? 'Reply' : 'Comment'}
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render comment thread (comment + replies)
 */
function renderCommentThread(comment, productId, depth = 0) {
    const currentUser = getCurrentUser();
    const isOwner = comment.userId === currentUser.id;
    const canDelete = isOwner || hasPermission(currentUser.role, Permissions.MANAGE_TEAM);
    const timeAgo = getTimeAgo(comment.createdAt);

    let html = `
        <div class="comment-thread" data-comment-id="${comment.id}" style="margin-left: ${depth * 30}px;">
            <div class="comment-card">
                <div class="comment-avatar">
                    ${comment.userAvatar ?
                        `<img src="${comment.userAvatar}" alt="${comment.userName}">` :
                        `<div class="avatar-placeholder-small">${comment.userName.charAt(0)}</div>`
                    }
                </div>
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-author">${comment.userName}</span>
                        <span class="comment-time">${timeAgo}${comment.edited ? ' (edited)' : ''}</span>
                    </div>
                    <div class="comment-text" id="comment-text-${comment.id}">
                        ${formatCommentText(comment.text)}
                    </div>

                    <!-- Reactions -->
                    <div class="comment-reactions">
                        ${renderReactions(comment)}
                        <button class="reaction-btn" onclick="showReactionPicker('${comment.id}')">
                            😊 React
                        </button>
                    </div>

                    <!-- Actions -->
                    <div class="comment-actions">
                        <button class="comment-action-btn" onclick="showReplyForm('${productId}', '${comment.id}')">
                            💬 Reply
                        </button>
                        ${isOwner ? `
                            <button class="comment-action-btn" onclick="editCommentDialog('${comment.id}')">
                                ✏️ Edit
                            </button>
                        ` : ''}
                        ${canDelete ? `
                            <button class="comment-action-btn text-danger" onclick="deleteCommentDialog('${comment.id}')">
                                🗑️ Delete
                            </button>
                        ` : ''}
                    </div>

                    <!-- Reply form placeholder -->
                    <div id="reply-container-${comment.id}" class="reply-container"></div>
                </div>
            </div>
    `;

    // Render replies
    if (comment.replies && comment.replies.length > 0) {
        comment.replies.forEach(reply => {
            html += renderCommentThread(reply, productId, depth + 1);
        });
    }

    html += '</div>';
    return html;
}

/**
 * Render reactions
 */
function renderReactions(comment) {
    if (!comment.reactions || comment.reactions.length === 0) {
        return '';
    }

    // Group reactions by emoji
    const grouped = {};
    comment.reactions.forEach(r => {
        if (!grouped[r.emoji]) {
            grouped[r.emoji] = [];
        }
        grouped[r.emoji].push(r);
    });

    let html = '';
    Object.entries(grouped).forEach(([emoji, reactions]) => {
        const currentUser = getCurrentUser();
        const userReacted = reactions.some(r => r.userId === currentUser.id);
        const users = reactions.map(r => r.userName).join(', ');

        html += `
            <span
                class="reaction-bubble ${userReacted ? 'user-reacted' : ''}"
                onclick="toggleReaction('${comment.id}', '${emoji}')"
                title="${users}"
            >
                ${emoji} ${reactions.length}
            </span>
        `;
    });

    return html;
}

/**
 * Format comment text (linkify mentions, links)
 */
function formatCommentText(text) {
    // Escape HTML
    let formatted = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Highlight @mentions
    formatted = formatted.replace(/@(\w+)/g, '<span class="mention">@$1</span>');

    // Convert URLs to links
    formatted = formatted.replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank" rel="noopener">$1</a>'
    );

    // Preserve line breaks
    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
}

/**
 * Submit comment
 */
function submitComment(productId, formId, parentId) {
    const textarea = document.getElementById(`comment-text-${formId}`);
    const text = textarea.value.trim();

    if (!text) {
        alert('Please enter a comment');
        return;
    }

    const result = addComment(productId, text, parentId);

    if (result.success) {
        textarea.value = '';

        // Refresh comments section
        const section = document.querySelector('.comments-section');
        if (section) {
            section.outerHTML = renderCommentsSection(productId);
        }

        if (parentId) {
            cancelReply(parentId);
        }
    } else {
        alert('❌ ' + result.error);
    }
}

/**
 * Show reply form
 */
function showReplyForm(productId, parentId) {
    const container = document.getElementById(`reply-container-${parentId}`);
    if (!container) return;

    // Check if already showing
    if (container.innerHTML.trim()) {
        return;
    }

    container.innerHTML = renderAddCommentForm(productId, parentId);

    // Focus textarea
    const textarea = container.querySelector('textarea');
    if (textarea) {
        textarea.focus();
    }
}

/**
 * Cancel reply
 */
function cancelReply(parentId) {
    const container = document.getElementById(`reply-container-${parentId}`);
    if (container) {
        container.innerHTML = '';
    }
}

/**
 * Edit comment dialog
 */
function editCommentDialog(commentId) {
    const comments = getAllComments();
    const comment = comments.find(c => c.id === commentId);

    if (!comment) return;

    const html = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>Edit Comment</h3>
                    <button class="modal-close" onclick="closeModal()">✕</button>
                </div>
                <div class="modal-body">
                    <textarea
                        id="edit-comment-text"
                        class="form-control"
                        rows="5"
                        style="width: 100%;"
                    >${comment.text}</textarea>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeModal()">Cancel</button>
                    <button class="btn-primary" onclick="submitEditComment('${commentId}')">Save Changes</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
}

/**
 * Submit edit comment
 */
function submitEditComment(commentId) {
    const textarea = document.getElementById('edit-comment-text');
    const newText = textarea.value.trim();

    if (!newText) {
        alert('Comment cannot be empty');
        return;
    }

    const result = editComment(commentId, newText);

    if (result.success) {
        closeModal();

        // Update comment text in place
        const textElement = document.getElementById(`comment-text-${commentId}`);
        if (textElement) {
            textElement.innerHTML = formatCommentText(newText);
        }

        // Refresh to show (edited) label
        const comments = getAllComments();
        const comment = comments.find(c => c.id === commentId);
        if (comment) {
            const section = document.querySelector('.comments-section');
            if (section) {
                section.outerHTML = renderCommentsSection(comment.productId);
            }
        }
    } else {
        alert('❌ ' + result.error);
    }
}

/**
 * Delete comment dialog
 */
function deleteCommentDialog(commentId) {
    if (confirm('Delete this comment and all replies?\n\nThis cannot be undone.')) {
        const result = deleteComment(commentId);

        if (result.success) {
            alert(`✅ Deleted comment${result.deletedCount > 1 ? ` and ${result.deletedCount - 1} replies` : ''}`);

            // Remove from DOM
            const thread = document.querySelector(`[data-comment-id="${commentId}"]`);
            if (thread) {
                const productId = thread.closest('.comments-section').dataset.productId;
                const section = document.querySelector('.comments-section');
                if (section) {
                    section.outerHTML = renderCommentsSection(productId);
                }
            }
        } else {
            alert('❌ ' + result.error);
        }
    }
}

/**
 * Show reaction picker
 */
function showReactionPicker(commentId) {
    const reactions = ['👍', '❤️', '😂', '🎉', '👏', '🔥', '💡', '✅'];

    const html = `
        <div class="reaction-picker-overlay" onclick="closeReactionPicker()">
            <div class="reaction-picker" onclick="event.stopPropagation()">
                ${reactions.map(emoji => `
                    <button class="reaction-emoji" onclick="toggleReaction('${commentId}', '${emoji}'); closeReactionPicker();">
                        ${emoji}
                    </button>
                `).join('')}
            </div>
        </div>
    `;

    // Remove existing picker
    const existing = document.querySelector('.reaction-picker-overlay');
    if (existing) existing.remove();

    document.body.insertAdjacentHTML('beforeend', html);
}

/**
 * Close reaction picker
 */
function closeReactionPicker() {
    const picker = document.querySelector('.reaction-picker-overlay');
    if (picker) picker.remove();
}

/**
 * Toggle reaction
 */
function toggleReaction(commentId, emoji) {
    const result = addReaction(commentId, emoji);

    if (result.success) {
        // Refresh comment to show updated reactions
        const comments = getAllComments();
        const comment = comments.find(c => c.id === commentId);
        if (comment) {
            const section = document.querySelector('.comments-section');
            if (section) {
                section.outerHTML = renderCommentsSection(comment.productId);
            }
        }
    }
}

/**
 * Get time ago string
 */
function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return date.toLocaleDateString();
}

/**
 * Toggle comments expanded
 */
function toggleCommentsExpanded(productId) {
    const section = document.querySelector('.comments-section');
    if (section) {
        section.classList.toggle('collapsed');
    }
}
