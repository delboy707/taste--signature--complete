// ===== TEAM COLLABORATION UI MODULE =====

/**
 * Render Team Collaboration Dashboard
 */
function renderTeamCollaborationDashboard() {
    const container = document.getElementById('team-collaboration-container');
    if (!container) return;

    const team = getTeam();
    const stats = getTeamStats();
    const currentUser = getCurrentUser();
    const canManage = hasPermission(currentUser.role, Permissions.MANAGE_TEAM);

    let html = '<div class="team-collaboration-dashboard">';

    // Team Overview
    html += `
        <div class="team-overview-section">
            <div class="team-header">
                <div>
                    <h2>${team.name}</h2>
                    <p class="team-subtitle">${stats.totalMembers} team members · ${stats.totalShares} shared products</p>
                </div>
                ${canManage ? `
                    <button class="btn-primary" onclick="showAddMemberDialog()">
                        ➕ Add Team Member
                    </button>
                ` : ''}
            </div>

            <div class="team-stats-grid">
                <div class="team-stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">👥</div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.totalMembers}</div>
                        <div class="stat-label">Total Members</div>
                    </div>
                </div>
                <div class="team-stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">🔑</div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.admins}</div>
                        <div class="stat-label">Admins</div>
                    </div>
                </div>
                <div class="team-stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">🔬</div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.analysts}</div>
                        <div class="stat-label">Analysts</div>
                    </div>
                </div>
                <div class="team-stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">👁️</div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.viewers}</div>
                        <div class="stat-label">Viewers</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Team Members List
    html += '<div class="team-members-section card">';
    html += '<h3>Team Members</h3>';
    html += '<div class="team-members-list">';

    team.members.forEach(member => {
        const isCurrentUser = member.id === currentUser.id;
        const roleColor = {
            admin: '#667eea',
            analyst: '#4facfe',
            viewer: '#43e97b'
        }[member.role] || '#999';

        html += `
            <div class="team-member-card ${isCurrentUser ? 'current-user' : ''}">
                <div class="member-avatar">
                    ${member.avatar ? `<img src="${member.avatar}" alt="${member.name}">` :
                      `<div class="avatar-placeholder">${member.name.charAt(0).toUpperCase()}</div>`}
                    ${isCurrentUser ? '<span class="current-user-badge">You</span>' : ''}
                </div>
                <div class="member-info">
                    <div class="member-name">${member.name}</div>
                    <div class="member-email">${member.email}</div>
                    <div class="member-meta">
                        <span class="member-role" style="background-color: ${roleColor}20; color: ${roleColor};">
                            ${member.role.toUpperCase()}
                        </span>
                        <span class="member-joined">Joined ${formatDate(member.joinedAt)}</span>
                    </div>
                </div>
                ${canManage && !isCurrentUser ? `
                    <div class="member-actions">
                        <select class="role-selector" onchange="changeMemberRole('${member.id}', this.value)">
                            <option value="">Change Role...</option>
                            <option value="${UserRoles.ADMIN}" ${member.role === UserRoles.ADMIN ? 'selected' : ''}>Admin</option>
                            <option value="${UserRoles.ANALYST}" ${member.role === UserRoles.ANALYST ? 'selected' : ''}>Analyst</option>
                            <option value="${UserRoles.VIEWER}" ${member.role === UserRoles.VIEWER ? 'selected' : ''}>Viewer</option>
                        </select>
                        <button class="btn-icon btn-danger" onclick="removeMemberDialog('${member.id}', '${member.name}')" title="Remove member">
                            🗑️
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    });

    html += '</div></div>';

    // Role Permissions Guide
    html += `
        <div class="role-permissions-section card">
            <h3>Role Permissions</h3>
            <div class="permissions-grid">
                <div class="permission-card">
                    <h4 style="color: #667eea;">👑 Admin</h4>
                    <ul>
                        <li>✅ View all products</li>
                        <li>✅ Create & edit products</li>
                        <li>✅ Delete products</li>
                        <li>✅ Share products</li>
                        <li>✅ Manage team members</li>
                        <li>✅ Approve requests</li>
                    </ul>
                </div>
                <div class="permission-card">
                    <h4 style="color: #4facfe;">🔬 Analyst</h4>
                    <ul>
                        <li>✅ View all products</li>
                        <li>✅ Create & edit products</li>
                        <li>❌ Delete products</li>
                        <li>✅ Share products</li>
                        <li>❌ Manage team</li>
                        <li>✅ Approve requests</li>
                    </ul>
                </div>
                <div class="permission-card">
                    <h4 style="color: #43e97b;">👁️ Viewer</h4>
                    <ul>
                        <li>✅ View shared products only</li>
                        <li>❌ Create or edit</li>
                        <li>❌ Delete products</li>
                        <li>❌ Share products</li>
                        <li>❌ Manage team</li>
                        <li>❌ Approve requests</li>
                    </ul>
                </div>
            </div>
        </div>
    `;

    html += '</div>';
    container.innerHTML = html;
}

/**
 * Show add member dialog
 */
function showAddMemberDialog() {
    const html = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>Add Team Member</h3>
                    <button class="modal-close" onclick="closeModal()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="new-member-name">Full Name *</label>
                        <input type="text" id="new-member-name" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="new-member-email">Email *</label>
                        <input type="email" id="new-member-email" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="new-member-role">Role *</label>
                        <select id="new-member-role" class="form-control">
                            <option value="${UserRoles.VIEWER}">Viewer - Can view shared products only</option>
                            <option value="${UserRoles.ANALYST}">Analyst - Can create and edit products</option>
                            <option value="${UserRoles.ADMIN}">Admin - Full access including team management</option>
                        </select>
                    </div>
                    <p class="help-text">
                        ℹ️ Team members will receive an email invitation to join your team.
                    </p>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeModal()">Cancel</button>
                    <button class="btn-primary" onclick="submitAddMember()">Add Member</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
}

/**
 * Submit add member
 */
function submitAddMember() {
    const name = document.getElementById('new-member-name').value.trim();
    const email = document.getElementById('new-member-email').value.trim();
    const role = document.getElementById('new-member-role').value;

    if (!name || !email) {
        alert('Please fill in all required fields');
        return;
    }

    const result = addTeamMember({ name, email, role });

    if (result.success) {
        alert(`✅ ${name} has been added to your team!`);
        closeModal();
        renderTeamCollaborationDashboard();
    } else {
        alert('❌ ' + result.error);
    }
}

/**
 * Change member role
 */
function changeMemberRole(memberId, newRole) {
    if (!newRole) return;

    const result = updateMemberRole(memberId, newRole);

    if (result.success) {
        alert('✅ Role updated successfully');
        renderTeamCollaborationDashboard();
    } else {
        alert('❌ ' + result.error);
    }
}

/**
 * Show remove member dialog
 */
function removeMemberDialog(memberId, memberName) {
    if (confirm(`Remove ${memberName} from the team?\n\nThis will revoke their access to all shared products.`)) {
        const result = removeTeamMember(memberId);

        if (result.success) {
            alert('✅ Team member removed');
            renderTeamCollaborationDashboard();
        } else {
            alert('❌ ' + result.error);
        }
    }
}

/**
 * Show share product dialog
 */
function showShareProductDialog(productId) {
    const team = getTeam();
    const currentUser = getCurrentUser();
    const existingShares = getProductShares(productId);
    const sharedUserIds = existingShares.map(s => s.userId);

    // Get available users to share with
    const availableUsers = team.members.filter(m =>
        m.id !== currentUser.id && !sharedUserIds.includes(m.id)
    );

    let html = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>Share Product</h3>
                    <button class="modal-close" onclick="closeModal()">✕</button>
                </div>
                <div class="modal-body">
    `;

    // Currently shared with
    if (existingShares.length > 0) {
        html += '<div class="shared-users-section">';
        html += '<h4>Currently Shared With:</h4>';
        existingShares.forEach(share => {
            html += `
                <div class="shared-user-item">
                    <div class="member-avatar-small">
                        ${share.user.avatar ? `<img src="${share.user.avatar}" alt="${share.user.name}">` :
                          `<div class="avatar-placeholder-small">${share.user.name.charAt(0)}</div>`}
                    </div>
                    <div class="shared-user-info">
                        <div class="shared-user-name">${share.user.name}</div>
                        <div class="shared-user-meta">${share.permission} access</div>
                    </div>
                    <button class="btn-icon btn-danger-outline" onclick="unshareProductConfirm('${productId}', '${share.userId}', '${share.user.name}')">
                        Remove
                    </button>
                </div>
            `;
        });
        html += '</div>';
    }

    // Add new users
    if (availableUsers.length > 0) {
        html += '<div class="add-share-section">';
        html += '<h4>Share With:</h4>';
        html += '<div class="form-group">';
        html += '<label>Select team members</label>';
        html += '<div class="user-checklist">';

        availableUsers.forEach(user => {
            html += `
                <label class="user-checkbox-item">
                    <input type="checkbox" name="share-user" value="${user.id}">
                    <div class="user-checkbox-content">
                        <div class="member-avatar-small">
                            ${user.avatar ? `<img src="${user.avatar}" alt="${user.name}">` :
                              `<div class="avatar-placeholder-small">${user.name.charAt(0)}</div>`}
                        </div>
                        <div>
                            <div class="user-checkbox-name">${user.name}</div>
                            <div class="user-checkbox-role">${user.role}</div>
                        </div>
                    </div>
                </label>
            `;
        });

        html += '</div></div>';

        html += `
            <div class="form-group">
                <label>Permission Level</label>
                <select id="share-permission" class="form-control">
                    <option value="${Permissions.VIEW}">View Only - Can view but not edit</option>
                    <option value="${Permissions.EDIT}">Edit - Can view and edit</option>
                </select>
            </div>
        `;
        html += '</div>';
    } else {
        html += '<p class="empty-message">All team members already have access to this product.</p>';
    }

    html += `
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeModal()">Cancel</button>
                    ${availableUsers.length > 0 ? `
                        <button class="btn-primary" onclick="submitShareProduct('${productId}')">Share</button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
}

/**
 * Submit share product
 */
function submitShareProduct(productId) {
    const checkboxes = document.querySelectorAll('input[name="share-user"]:checked');
    const userIds = Array.from(checkboxes).map(cb => cb.value);

    if (userIds.length === 0) {
        alert('Please select at least one team member');
        return;
    }

    const permission = document.getElementById('share-permission').value;

    const result = shareProduct(productId, userIds, permission);

    if (result.success) {
        alert(`✅ Product shared with ${result.sharedWith} team member(s)`);
        closeModal();
    } else {
        alert('❌ ' + result.error);
    }
}

/**
 * Unshare product confirm
 */
function unshareProductConfirm(productId, userId, userName) {
    if (confirm(`Remove ${userName}'s access to this product?`)) {
        const result = unshareProduct(productId, userId);

        if (result.success) {
            alert('✅ Access removed');
            closeModal();
            showShareProductDialog(productId);
        } else {
            alert('❌ ' + result.error);
        }
    }
}

/**
 * Close modal
 */
function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

/**
 * Format date helper
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;

    return date.toLocaleDateString();
}
