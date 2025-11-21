// ===== TEAM COLLABORATION MODULE =====

/**
 * Team Collaboration System
 * Handles user roles, permissions, product sharing, and team management
 */

// User Roles
const UserRoles = {
    ADMIN: 'admin',           // Full access, manage team, all products
    ANALYST: 'analyst',       // Create/edit products, share with team
    VIEWER: 'viewer'          // View shared products only, no editing
};

// Permission levels
const Permissions = {
    VIEW: 'view',
    EDIT: 'edit',
    DELETE: 'delete',
    SHARE: 'share',
    MANAGE_TEAM: 'manage_team',
    APPROVE: 'approve'
};

// Role-based permissions mapping
const RolePermissions = {
    [UserRoles.ADMIN]: [
        Permissions.VIEW,
        Permissions.EDIT,
        Permissions.DELETE,
        Permissions.SHARE,
        Permissions.MANAGE_TEAM,
        Permissions.APPROVE
    ],
    [UserRoles.ANALYST]: [
        Permissions.VIEW,
        Permissions.EDIT,
        Permissions.SHARE,
        Permissions.APPROVE
    ],
    [UserRoles.VIEWER]: [
        Permissions.VIEW
    ]
};

// Storage keys
const TEAM_STORAGE_KEY = 'tasteSignature_team';
const SHARES_STORAGE_KEY = 'tasteSignature_shares';
const CURRENT_USER_KEY = 'tasteSignature_currentUser';

/**
 * Initialize team collaboration
 */
async function initTeamCollaboration() {
    // Ensure team data exists
    if (!localStorage.getItem(TEAM_STORAGE_KEY)) {
        const companyName = await getCurrentUserCompany();
        const defaultTeam = {
            id: Date.now(),
            name: companyName || 'My Team',
            members: [getCurrentUser()],
            createdAt: new Date().toISOString()
        };
        localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(defaultTeam));
    }

    // Ensure shares data exists
    if (!localStorage.getItem(SHARES_STORAGE_KEY)) {
        localStorage.setItem(SHARES_STORAGE_KEY, JSON.stringify([]));
    }
}

/**
 * Get current user from auth system
 */
function getCurrentUser() {
    // Try to get from Firebase Auth via authManager
    if (typeof window !== 'undefined' && window.authManager && window.authManager.currentUser) {
        const firebaseUser = window.authManager.currentUser;
        return {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
            email: firebaseUser.email,
            role: UserRoles.ADMIN, // Default role, should be fetched from Firestore user doc
            avatar: firebaseUser.photoURL || null,
            joinedAt: firebaseUser.metadata.creationTime
        };
    }

    // Fallback: check localStorage
    const userStr = localStorage.getItem(CURRENT_USER_KEY);
    if (userStr) {
        return JSON.parse(userStr);
    }

    // Default user if not authenticated (for offline/demo mode)
    return {
        id: 'user-' + Date.now(),
        name: 'Current User',
        email: 'user@example.com',
        role: UserRoles.ADMIN,
        avatar: null,
        joinedAt: new Date().toISOString()
    };
}

/**
 * Get current user's company name
 */
async function getCurrentUserCompany() {
    try {
        // Try to get from authManager's company data
        if (typeof window !== 'undefined' && window.authManager && window.authManager.getCompanyData) {
            const companyResult = await window.authManager.getCompanyData();
            if (companyResult.success && companyResult.company) {
                return companyResult.company.companyName || null;
            }
        }

        // Fallback to localStorage
        const authData = localStorage.getItem('tasteSignature_auth');
        if (authData) {
            const parsed = JSON.parse(authData);
            return parsed.companyName || null;
        }
    } catch (e) {
        console.error('Error getting company name:', e);
    }
    return null;
}

/**
 * Get team data
 */
function getTeam() {
    const teamStr = localStorage.getItem(TEAM_STORAGE_KEY);
    return teamStr ? JSON.parse(teamStr) : null;
}

/**
 * Save team data
 */
function saveTeam(team) {
    localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(team));
}

/**
 * Get all shares
 */
function getAllShares() {
    const sharesStr = localStorage.getItem(SHARES_STORAGE_KEY);
    return sharesStr ? JSON.parse(sharesStr) : [];
}

/**
 * Save shares
 */
function saveShares(shares) {
    localStorage.setItem(SHARES_STORAGE_KEY, JSON.stringify(shares));
}

/**
 * Add team member
 */
function addTeamMember(memberData) {
    const team = getTeam();

    // Check if user already exists
    const exists = team.members.some(m => m.email === memberData.email);
    if (exists) {
        return { success: false, error: 'User already exists in team' };
    }

    const newMember = {
        id: 'member-' + Date.now(),
        name: memberData.name,
        email: memberData.email,
        role: memberData.role || UserRoles.VIEWER,
        avatar: memberData.avatar || null,
        joinedAt: new Date().toISOString(),
        invitedBy: getCurrentUser().id
    };

    team.members.push(newMember);
    saveTeam(team);

    // Log activity
    logTeamActivity({
        type: 'member_added',
        userId: getCurrentUser().id,
        targetUserId: newMember.id,
        details: `Added ${newMember.name} as ${newMember.role}`
    });

    return { success: true, member: newMember };
}

/**
 * Remove team member
 */
function removeTeamMember(memberId) {
    const currentUser = getCurrentUser();
    if (!hasPermission(currentUser.role, Permissions.MANAGE_TEAM)) {
        return { success: false, error: 'Insufficient permissions' };
    }

    const team = getTeam();
    const memberIndex = team.members.findIndex(m => m.id === memberId);

    if (memberIndex === -1) {
        return { success: false, error: 'Member not found' };
    }

    const removedMember = team.members[memberIndex];
    team.members.splice(memberIndex, 1);
    saveTeam(team);

    // Remove all shares for this user
    const shares = getAllShares();
    const updatedShares = shares.filter(s => s.userId !== memberId);
    saveShares(updatedShares);

    // Log activity
    logTeamActivity({
        type: 'member_removed',
        userId: currentUser.id,
        targetUserId: memberId,
        details: `Removed ${removedMember.name} from team`
    });

    return { success: true };
}

/**
 * Update team member role
 */
function updateMemberRole(memberId, newRole) {
    const currentUser = getCurrentUser();
    if (!hasPermission(currentUser.role, Permissions.MANAGE_TEAM)) {
        return { success: false, error: 'Insufficient permissions' };
    }

    if (!Object.values(UserRoles).includes(newRole)) {
        return { success: false, error: 'Invalid role' };
    }

    const team = getTeam();
    const member = team.members.find(m => m.id === memberId);

    if (!member) {
        return { success: false, error: 'Member not found' };
    }

    const oldRole = member.role;
    member.role = newRole;
    saveTeam(team);

    // Log activity
    logTeamActivity({
        type: 'role_updated',
        userId: currentUser.id,
        targetUserId: memberId,
        details: `Changed ${member.name}'s role from ${oldRole} to ${newRole}`
    });

    return { success: true, member };
}

/**
 * Share product with user(s)
 */
function shareProduct(productId, userIds, permissionLevel = Permissions.VIEW) {
    const currentUser = getCurrentUser();
    if (!hasPermission(currentUser.role, Permissions.SHARE)) {
        return { success: false, error: 'Insufficient permissions to share' };
    }

    const shares = getAllShares();
    const timestamp = new Date().toISOString();

    userIds.forEach(userId => {
        // Check if already shared
        const existingShare = shares.find(s =>
            s.productId === productId && s.userId === userId
        );

        if (existingShare) {
            // Update permission level
            existingShare.permission = permissionLevel;
            existingShare.updatedAt = timestamp;
        } else {
            // Create new share
            shares.push({
                id: 'share-' + Date.now() + '-' + Math.random(),
                productId: productId,
                userId: userId,
                sharedBy: currentUser.id,
                permission: permissionLevel,
                sharedAt: timestamp,
                updatedAt: timestamp
            });
        }

        // Log activity
        logTeamActivity({
            type: 'product_shared',
            userId: currentUser.id,
            productId: productId,
            targetUserId: userId,
            details: `Shared product with ${permissionLevel} access`
        });
    });

    saveShares(shares);
    return { success: true, sharedWith: userIds.length };
}

/**
 * Unshare product from user
 */
function unshareProduct(productId, userId) {
    const currentUser = getCurrentUser();
    const shares = getAllShares();

    const shareIndex = shares.findIndex(s =>
        s.productId === productId && s.userId === userId
    );

    if (shareIndex === -1) {
        return { success: false, error: 'Share not found' };
    }

    const share = shares[shareIndex];

    // Only the sharer or admin can unshare
    if (share.sharedBy !== currentUser.id &&
        !hasPermission(currentUser.role, Permissions.MANAGE_TEAM)) {
        return { success: false, error: 'Insufficient permissions' };
    }

    shares.splice(shareIndex, 1);
    saveShares(shares);

    // Log activity
    logTeamActivity({
        type: 'product_unshared',
        userId: currentUser.id,
        productId: productId,
        targetUserId: userId,
        details: 'Removed product access'
    });

    return { success: true };
}

/**
 * Get products shared with current user
 */
function getSharedWithMeProducts() {
    const currentUser = getCurrentUser();
    const shares = getAllShares();

    return shares.filter(s => s.userId === currentUser.id);
}

/**
 * Get products shared by current user
 */
function getProductsSharedByMe() {
    const currentUser = getCurrentUser();
    const shares = getAllShares();

    return shares.filter(s => s.sharedBy === currentUser.id);
}

/**
 * Get users a product is shared with
 */
function getProductShares(productId) {
    const shares = getAllShares();
    const team = getTeam();

    const productShares = shares.filter(s => s.productId === productId);

    return productShares.map(share => {
        const user = team.members.find(m => m.id === share.userId);
        return {
            ...share,
            user: user
        };
    });
}

/**
 * Check if user has permission
 */
function hasPermission(userRole, permission) {
    const permissions = RolePermissions[userRole] || [];
    return permissions.includes(permission);
}

/**
 * Check if user can access product
 */
function canAccessProduct(userId, productId) {
    const user = getTeam().members.find(m => m.id === userId);

    if (!user) return false;

    // Admins and Analysts can access all products
    if (user.role === UserRoles.ADMIN || user.role === UserRoles.ANALYST) {
        return true;
    }

    // Viewers can only access shared products
    const shares = getAllShares();
    return shares.some(s => s.productId === productId && s.userId === userId);
}

/**
 * Check if user can edit product
 */
function canEditProduct(userId, productId) {
    const user = getTeam().members.find(m => m.id === userId);

    if (!user) return false;

    // Only admins and analysts can edit
    if (!hasPermission(user.role, Permissions.EDIT)) {
        return false;
    }

    // Check if they have edit permission on the share
    const shares = getAllShares();
    const share = shares.find(s => s.productId === productId && s.userId === userId);

    if (share && share.permission === Permissions.VIEW) {
        return false;
    }

    return true;
}

/**
 * Log team activity
 */
function logTeamActivity(activity) {
    const activities = getTeamActivities();

    const newActivity = {
        id: 'activity-' + Date.now(),
        timestamp: new Date().toISOString(),
        ...activity
    };

    activities.unshift(newActivity);

    // Keep only last 500 activities
    if (activities.length > 500) {
        activities.length = 500;
    }

    localStorage.setItem('tasteSignature_activities', JSON.stringify(activities));
}

/**
 * Get team activities
 */
function getTeamActivities(limit = 50) {
    const activitiesStr = localStorage.getItem('tasteSignature_activities');
    const activities = activitiesStr ? JSON.parse(activitiesStr) : [];

    return activities.slice(0, limit);
}

/**
 * Get team statistics
 */
function getTeamStats() {
    const team = getTeam();
    const shares = getAllShares();
    const activities = getTeamActivities();

    return {
        totalMembers: team.members.length,
        admins: team.members.filter(m => m.role === UserRoles.ADMIN).length,
        analysts: team.members.filter(m => m.role === UserRoles.ANALYST).length,
        viewers: team.members.filter(m => m.role === UserRoles.VIEWER).length,
        totalShares: shares.length,
        recentActivities: activities.length
    };
}

// Initialize on load
initTeamCollaboration();
