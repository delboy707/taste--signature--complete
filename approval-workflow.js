// ===== APPROVAL WORKFLOW MODULE =====

/**
 * Approval Workflow System
 * Handles product and formulation approval processes
 */

const APPROVALS_STORAGE_KEY = 'tasteSignature_approvals';

// Approval statuses
const ApprovalStatus = {
    DRAFT: 'draft',
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    NEEDS_CHANGES: 'needs_changes'
};

/**
 * Initialize approvals storage
 */
function initApprovals() {
    if (!localStorage.getItem(APPROVALS_STORAGE_KEY)) {
        localStorage.setItem(APPROVALS_STORAGE_KEY, JSON.stringify([]));
    }
}

/**
 * Get all approvals
 */
function getAllApprovals() {
    const approvalsStr = localStorage.getItem(APPROVALS_STORAGE_KEY);
    return approvalsStr ? JSON.parse(approvalsStr) : [];
}

/**
 * Save approvals
 */
function saveApprovals(approvals) {
    localStorage.setItem(APPROVALS_STORAGE_KEY, JSON.stringify(approvals));
}

/**
 * Submit product for approval
 */
function submitForApproval(productId, approverIds, notes = '') {
    const currentUser = getCurrentUser();

    if (!approverIds || approverIds.length === 0) {
        return { success: false, error: 'At least one approver is required' };
    }

    // Verify approvers have permission
    const team = getTeam();
    const invalidApprovers = approverIds.filter(id => {
        const user = team.members.find(m => m.id === id);
        return !user || !hasPermission(user.role, Permissions.APPROVE);
    });

    if (invalidApprovers.length > 0) {
        return { success: false, error: 'Some selected users cannot approve' };
    }

    const approvals = getAllApprovals();

    // Check if already has pending approval
    const existing = approvals.find(a =>
        a.productId === productId &&
        a.status === ApprovalStatus.PENDING
    );

    if (existing) {
        return { success: false, error: 'Product already has pending approval' };
    }

    const newApproval = {
        id: 'approval-' + Date.now(),
        productId: productId,
        submittedBy: currentUser.id,
        submitterName: currentUser.name,
        approvers: approverIds.map(id => {
            const user = team.members.find(m => m.id === id);
            return {
                userId: id,
                userName: user.name,
                status: ApprovalStatus.PENDING,
                respondedAt: null,
                comments: ''
            };
        }),
        status: ApprovalStatus.PENDING,
        notes: notes,
        submittedAt: new Date().toISOString(),
        resolvedAt: null,
        finalDecision: null,
        finalComments: ''
    };

    approvals.push(newApproval);
    saveApprovals(approvals);

    // Notify approvers
    approverIds.forEach(approverId => {
        addNotification({
            userId: approverId,
            type: 'approval_request',
            fromUserId: currentUser.id,
            fromUserName: currentUser.name,
            productId: productId,
            approvalId: newApproval.id,
            message: `${currentUser.name} requested your approval`
        });
    });

    // Log activity
    logTeamActivity({
        type: 'approval_submitted',
        userId: currentUser.id,
        productId: productId,
        approvalId: newApproval.id,
        details: `Submitted for approval to ${approverIds.length} approvers`
    });

    return { success: true, approval: newApproval };
}

/**
 * Respond to approval request
 */
function respondToApproval(approvalId, decision, comments = '') {
    const currentUser = getCurrentUser();
    const approvals = getAllApprovals();
    const approval = approvals.find(a => a.id === approvalId);

    if (!approval) {
        return { success: false, error: 'Approval not found' };
    }

    if (approval.status !== ApprovalStatus.PENDING) {
        return { success: false, error: 'Approval is no longer pending' };
    }

    // Find approver entry
    const approver = approval.approvers.find(a => a.userId === currentUser.id);

    if (!approver) {
        return { success: false, error: 'You are not an approver for this request' };
    }

    if (approver.status !== ApprovalStatus.PENDING) {
        return { success: false, error: 'You have already responded to this approval' };
    }

    // Validate decision
    if (![ApprovalStatus.APPROVED, ApprovalStatus.REJECTED, ApprovalStatus.NEEDS_CHANGES].includes(decision)) {
        return { success: false, error: 'Invalid decision' };
    }

    // Update approver status
    approver.status = decision;
    approver.respondedAt = new Date().toISOString();
    approver.comments = comments;

    // Check if all approvers have responded
    const allResponded = approval.approvers.every(a =>
        a.status !== ApprovalStatus.PENDING
    );

    if (allResponded) {
        // Determine final decision
        const hasRejection = approval.approvers.some(a =>
            a.status === ApprovalStatus.REJECTED
        );
        const needsChanges = approval.approvers.some(a =>
            a.status === ApprovalStatus.NEEDS_CHANGES
        );
        const allApproved = approval.approvers.every(a =>
            a.status === ApprovalStatus.APPROVED
        );

        if (hasRejection) {
            approval.status = ApprovalStatus.REJECTED;
            approval.finalDecision = 'rejected';
        } else if (needsChanges) {
            approval.status = ApprovalStatus.NEEDS_CHANGES;
            approval.finalDecision = 'needs_changes';
        } else if (allApproved) {
            approval.status = ApprovalStatus.APPROVED;
            approval.finalDecision = 'approved';
        }

        approval.resolvedAt = new Date().toISOString();

        // Notify submitter
        addNotification({
            userId: approval.submittedBy,
            type: 'approval_completed',
            fromUserId: currentUser.id,
            fromUserName: currentUser.name,
            productId: approval.productId,
            approvalId: approval.id,
            message: `Your approval request was ${approval.finalDecision.replace('_', ' ')}`
        });
    }

    saveApprovals(approvals);

    // Log activity
    logTeamActivity({
        type: 'approval_responded',
        userId: currentUser.id,
        productId: approval.productId,
        approvalId: approval.id,
        details: `${decision} approval request`
    });

    return { success: true, approval: approval };
}

/**
 * Cancel approval request
 */
function cancelApproval(approvalId) {
    const currentUser = getCurrentUser();
    const approvals = getAllApprovals();
    const approval = approvals.find(a => a.id === approvalId);

    if (!approval) {
        return { success: false, error: 'Approval not found' };
    }

    // Only submitter or admin can cancel
    if (approval.submittedBy !== currentUser.id &&
        !hasPermission(currentUser.role, Permissions.MANAGE_TEAM)) {
        return { success: false, error: 'Insufficient permissions' };
    }

    if (approval.status !== ApprovalStatus.PENDING) {
        return { success: false, error: 'Only pending approvals can be cancelled' };
    }

    const approvalIndex = approvals.indexOf(approval);
    approvals.splice(approvalIndex, 1);
    saveApprovals(approvals);

    // Log activity
    logTeamActivity({
        type: 'approval_cancelled',
        userId: currentUser.id,
        productId: approval.productId,
        approvalId: approval.id,
        details: 'Cancelled approval request'
    });

    return { success: true };
}

/**
 * Get product approval status
 */
function getProductApprovalStatus(productId) {
    const approvals = getAllApprovals();
    const productApprovals = approvals.filter(a => a.productId === productId);

    if (productApprovals.length === 0) {
        return {
            status: ApprovalStatus.DRAFT,
            latestApproval: null
        };
    }

    // Get most recent approval
    const latest = productApprovals.sort((a, b) =>
        new Date(b.submittedAt) - new Date(a.submittedAt)
    )[0];

    return {
        status: latest.status,
        latestApproval: latest,
        approvalHistory: productApprovals
    };
}

/**
 * Get approvals pending for current user
 */
function getPendingApprovalsForUser() {
    const currentUser = getCurrentUser();
    const approvals = getAllApprovals();

    return approvals.filter(a => {
        if (a.status !== ApprovalStatus.PENDING) return false;

        const approver = a.approvers.find(ap => ap.userId === currentUser.id);
        return approver && approver.status === ApprovalStatus.PENDING;
    });
}

/**
 * Get approvals submitted by current user
 */
function getMySubmittedApprovals() {
    const currentUser = getCurrentUser();
    const approvals = getAllApprovals();

    return approvals.filter(a => a.submittedBy === currentUser.id);
}

/**
 * Get approval statistics
 */
function getApprovalStats() {
    const approvals = getAllApprovals();
    const currentUser = getCurrentUser();

    const pending = approvals.filter(a => a.status === ApprovalStatus.PENDING);
    const approved = approvals.filter(a => a.status === ApprovalStatus.APPROVED);
    const rejected = approvals.filter(a => a.status === ApprovalStatus.REJECTED);
    const needsChanges = approvals.filter(a => a.status === ApprovalStatus.NEEDS_CHANGES);

    const myPending = getPendingApprovalsForUser();
    const mySubmitted = getMySubmittedApprovals();

    return {
        total: approvals.length,
        pending: pending.length,
        approved: approved.length,
        rejected: rejected.length,
        needsChanges: needsChanges.length,
        myPendingApprovals: myPending.length,
        mySubmittedApprovals: mySubmitted.length,
        approvalRate: approvals.length > 0 ?
            (approved.length / approvals.length * 100).toFixed(1) : 0
    };
}

/**
 * Get approval details with full context
 */
function getApprovalDetails(approvalId) {
    const approvals = getAllApprovals();
    const approval = approvals.find(a => a.id === approvalId);

    if (!approval) {
        return null;
    }

    // Get product details
    const experiences = JSON.parse(localStorage.getItem('tasteSignature_data') || '[]');
    const product = experiences.find(e => e.id === approval.productId);

    // Get submitter details
    const team = getTeam();
    const submitter = team.members.find(m => m.id === approval.submittedBy);

    return {
        ...approval,
        product: product,
        submitter: submitter
    };
}

// Initialize on load
initApprovals();
