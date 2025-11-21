// ===== APPROVAL WORKFLOW UI MODULE =====

/**
 * Render approvals dashboard
 */
function renderApprovalsDashboard() {
    const container = document.getElementById('approvals-container');
    if (!container) return;

    const stats = getApprovalStats();
    const pendingForMe = getPendingApprovalsForUser();
    const mySubmitted = getMySubmittedApprovals();

    let html = '<div class="approvals-dashboard">';

    // Stats Overview
    html += `
        <div class="approvals-overview">
            <h2>Approval Workflows</h2>
            <div class="approval-stats-grid">
                <div class="approval-stat-card pending">
                    <div class="stat-value">${stats.myPendingApprovals}</div>
                    <div class="stat-label">Pending My Approval</div>
                </div>
                <div class="approval-stat-card submitted">
                    <div class="stat-value">${stats.mySubmittedApprovals}</div>
                    <div class="stat-label">My Submitted Requests</div>
                </div>
                <div class="approval-stat-card approved">
                    <div class="stat-value">${stats.approved}</div>
                    <div class="stat-label">Total Approved</div>
                </div>
                <div class="approval-stat-card rate">
                    <div class="stat-value">${stats.approvalRate}%</div>
                    <div class="stat-label">Approval Rate</div>
                </div>
            </div>
        </div>
    `;

    // Pending Approvals (requiring my action)
    if (pendingForMe.length > 0) {
        html += `
            <div class="approvals-section card">
                <h3>⏳ Requires Your Approval (${pendingForMe.length})</h3>
                <div class="approvals-list">
        `;

        pendingForMe.forEach(approval => {
            html += renderApprovalCard(approval, 'pending-for-me');
        });

        html += '</div></div>';
    }

    // My Submitted Requests
    if (mySubmitted.length > 0) {
        html += `
            <div class="approvals-section card">
                <h3>📤 My Submitted Requests (${mySubmitted.length})</h3>
                <div class="approvals-list">
        `;

        mySubmitted.forEach(approval => {
            html += renderApprovalCard(approval, 'my-submitted');
        });

        html += '</div></div>';
    }

    // Empty states
    if (pendingForMe.length === 0 && mySubmitted.length === 0) {
        html += `
            <div class="empty-approvals card">
                <h3>No active approvals</h3>
                <p>When products need approval, they will appear here.</p>
            </div>
        `;
    }

    html += '</div>';
    container.innerHTML = html;
}

/**
 * Render approval card
 */
function renderApprovalCard(approval, context) {
    const statusColors = {
        pending: '#ff9800',
        approved: '#4caf50',
        rejected: '#e74c3c',
        needs_changes: '#2196f3'
    };

    const statusIcons = {
        pending: '⏳',
        approved: '✅',
        rejected: '❌',
        needs_changes: '🔄'
    };

    const statusColor = statusColors[approval.status] || '#999';
    const statusIcon = statusIcons[approval.status] || '📌';

    const currentUser = getCurrentUser();
    const myApprover = approval.approvers.find(a => a.userId === currentUser.id);

    let html = `
        <div class="approval-card">
            <div class="approval-header">
                <div class="approval-status" style="background-color: ${statusColor}20; color: ${statusColor};">
                    ${statusIcon} ${approval.status.toUpperCase().replace('_', ' ')}
                </div>
                <div class="approval-date">
                    ${new Date(approval.submittedAt).toLocaleDateString()}
                </div>
            </div>

            <div class="approval-body">
                <div class="approval-product">
                    <strong>Product ID:</strong> ${approval.productId}
                </div>
                <div class="approval-submitter">
                    <strong>Submitted by:</strong> ${approval.submitterName}
                </div>
                ${approval.notes ? `
                    <div class="approval-notes">
                        <strong>Notes:</strong> ${approval.notes}
                    </div>
                ` : ''}
            </div>

            <div class="approval-approvers">
                <strong>Approvers:</strong>
                <div class="approvers-list">
                    ${approval.approvers.map(approver => {
                        const approverStatusColor = statusColors[approver.status] || '#999';
                        const approverStatusIcon = statusIcons[approver.status] || '⏳';

                        return `
                            <div class="approver-item">
                                <span class="approver-name">${approver.userName}</span>
                                <span class="approver-status" style="color: ${approverStatusColor};">
                                    ${approverStatusIcon} ${approver.status.replace('_', ' ')}
                                </span>
                                ${approver.comments ? `
                                    <div class="approver-comments">"${approver.comments}"</div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <div class="approval-actions">
                ${context === 'pending-for-me' && myApprover && myApprover.status === ApprovalStatus.PENDING ? `
                    <button class="btn-success btn-sm" onclick="respondToApprovalDialog('${approval.id}', '${ApprovalStatus.APPROVED}')">
                        ✅ Approve
                    </button>
                    <button class="btn-warning btn-sm" onclick="respondToApprovalDialog('${approval.id}', '${ApprovalStatus.NEEDS_CHANGES}')">
                        🔄 Request Changes
                    </button>
                    <button class="btn-danger btn-sm" onclick="respondToApprovalDialog('${approval.id}', '${ApprovalStatus.REJECTED}')">
                        ❌ Reject
                    </button>
                ` : ''}
                ${context === 'my-submitted' && approval.status === ApprovalStatus.PENDING ? `
                    <button class="btn-secondary btn-sm" onclick="cancelApprovalDialog('${approval.id}')">
                        Cancel Request
                    </button>
                ` : ''}
                <button class="btn-secondary btn-sm" onclick="viewApprovalDetails('${approval.id}')">
                    View Details
                </button>
            </div>
        </div>
    `;

    return html;
}

/**
 * Show submit for approval dialog
 */
function showSubmitForApprovalDialog(productId) {
    const team = getTeam();
    const currentUser = getCurrentUser();

    // Get users who can approve
    const approvers = team.members.filter(m =>
        m.id !== currentUser.id &&
        hasPermission(m.role, Permissions.APPROVE)
    );

    if (approvers.length === 0) {
        alert('No team members with approval permissions available');
        return;
    }

    const html = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>Submit for Approval</h3>
                    <button class="modal-close" onclick="closeModal()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Select Approvers *</label>
                        <p class="help-text">Choose team members who need to approve this product</p>
                        <div class="approvers-checklist">
                            ${approvers.map(user => `
                                <label class="approver-checkbox">
                                    <input type="checkbox" name="approver" value="${user.id}">
                                    <div class="approver-checkbox-content">
                                        <div class="member-avatar-small">
                                            ${user.avatar ? `<img src="${user.avatar}" alt="${user.name}">` :
                                              `<div class="avatar-placeholder-small">${user.name.charAt(0)}</div>`}
                                        </div>
                                        <div>
                                            <div class="approver-name">${user.name}</div>
                                            <div class="approver-role">${user.role}</div>
                                        </div>
                                    </div>
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="approval-notes">Notes (optional)</label>
                        <textarea
                            id="approval-notes"
                            class="form-control"
                            rows="4"
                            placeholder="Add any context or specific areas to review..."
                        ></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeModal()">Cancel</button>
                    <button class="btn-primary" onclick="submitForApprovalRequest('${productId}')">
                        Submit for Approval
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
}

/**
 * Submit for approval request
 */
function submitForApprovalRequest(productId) {
    const checkboxes = document.querySelectorAll('input[name="approver"]:checked');
    const approverIds = Array.from(checkboxes).map(cb => cb.value);

    if (approverIds.length === 0) {
        alert('Please select at least one approver');
        return;
    }

    const notes = document.getElementById('approval-notes').value.trim();

    const result = submitForApproval(productId, approverIds, notes);

    if (result.success) {
        alert(`✅ Submitted for approval to ${approverIds.length} approver(s)`);
        closeModal();
        renderApprovalsDashboard();
    } else {
        alert('❌ ' + result.error);
    }
}

/**
 * Respond to approval dialog
 */
function respondToApprovalDialog(approvalId, decision) {
    const decisionLabels = {
        [ApprovalStatus.APPROVED]: 'Approve',
        [ApprovalStatus.REJECTED]: 'Reject',
        [ApprovalStatus.NEEDS_CHANGES]: 'Request Changes'
    };

    const html = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>${decisionLabels[decision]}</h3>
                    <button class="modal-close" onclick="closeModal()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="approval-response-comments">
                            Comments ${decision !== ApprovalStatus.APPROVED ? '*' : '(optional)'}
                        </label>
                        <textarea
                            id="approval-response-comments"
                            class="form-control"
                            rows="4"
                            placeholder="Add your feedback..."
                            ${decision !== ApprovalStatus.APPROVED ? 'required' : ''}
                        ></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeModal()">Cancel</button>
                    <button
                        class="btn-primary"
                        onclick="submitApprovalResponse('${approvalId}', '${decision}')"
                    >
                        ${decisionLabels[decision]}
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
}

/**
 * Submit approval response
 */
function submitApprovalResponse(approvalId, decision) {
    const comments = document.getElementById('approval-response-comments').value.trim();

    if (!comments && decision !== ApprovalStatus.APPROVED) {
        alert('Please provide comments for your decision');
        return;
    }

    const result = respondToApproval(approvalId, decision, comments);

    if (result.success) {
        alert('✅ Response submitted');
        closeModal();
        renderApprovalsDashboard();
    } else {
        alert('❌ ' + result.error);
    }
}

/**
 * Cancel approval dialog
 */
function cancelApprovalDialog(approvalId) {
    if (confirm('Cancel this approval request?')) {
        const result = cancelApproval(approvalId);

        if (result.success) {
            alert('✅ Approval request cancelled');
            renderApprovalsDashboard();
        } else {
            alert('❌ ' + result.error);
        }
    }
}

/**
 * View approval details
 */
function viewApprovalDetails(approvalId) {
    const details = getApprovalDetails(approvalId);

    if (!details) {
        alert('Approval not found');
        return;
    }

    const html = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content modal-large" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>Approval Details</h3>
                    <button class="modal-close" onclick="closeModal()">✕</button>
                </div>
                <div class="modal-body">
                    ${renderApprovalCard(details, 'details')}
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeModal()">Close</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
}
