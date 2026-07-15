// ===== CLERK + FIREBASE AUTHENTICATION MODULE =====
// Clerk gates the app; its hosted sign-in/sign-up UI lives at qeptss.com.
// This module verifies the Clerk session client-side, exchanges it for a
// Firebase custom token via /api/firebase-token, and keeps the existing
// Firebase Auth / Firestore plumbing (currentUser, onAuthStateChanged,
// showApp/showAuthScreen, getCompanyData, db) unchanged so dependents keep
// working: index.html, export-controller.js, onboarding.js, config.js,
// claude-api.js, team-collaboration.js, app.js, tutorial.js.

const CLERK_FRONTEND_API = 'clerk.qeptss.com';
const CLERK_PUBLISHABLE_KEY = 'pk_live_Y2xlcmsucWVwdHNzLmNvbSQ';
const CLERK_PORTAL_URL = 'https://qeptss.com';
const DEMO_MODE_KEY = 'taste_demo_mode_active';

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.auth = null;
        this.db = null;
        this.onAuthChangeCallbacks = [];
    }

    /**
     * Load the ClerkJS SDK from the production Frontend API CDN.
     * Idempotent - safe to call more than once; resolves immediately if
     * the SDK (or a prior in-flight load) already exists.
     */
    loadClerkScript() {
        if (window.Clerk) {
            return Promise.resolve();
        }
        if (this._clerkScriptPromise) {
            return this._clerkScriptPromise;
        }

        this._clerkScriptPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.defer = true;
            script.crossOrigin = 'anonymous';
            script.dataset.clerkPublishableKey = CLERK_PUBLISHABLE_KEY;
            script.src = 'https://' + CLERK_FRONTEND_API + '/npm/@clerk/clerk-js@5/dist/clerk.browser.js';
            script.addEventListener('load', () => resolve());
            script.addEventListener('error', () => {
                reject(new Error('Failed to load ClerkJS from ' + CLERK_FRONTEND_API));
            });
            document.head.appendChild(script);
        });

        return this._clerkScriptPromise;
    }

    /**
     * Initialize Firebase, then gate the app behind Clerk unless demo mode
     * is active. Demo mode is checked before any Clerk call and never
     * redirects - it stays pre-auth, as it does today.
     */
    async initialize() {
        try {
            // Check if Firebase SDK is loaded
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK not loaded. Please refresh the page.');
            }

            // Check if Firebase config is available
            if (!window.FIREBASE_CONFIG) {
                throw new Error('Firebase configuration not found. Please refresh the page.');
            }

            // Initialize Firebase
            this.app = firebase.initializeApp(window.FIREBASE_CONFIG);
            this.auth = firebase.auth();
            this.db = firebase.firestore();

            console.log('Firebase initialized successfully');

            // Listen for auth state changes - unchanged downstream behavior.
            this.auth.onAuthStateChanged((user) => {
                this.currentUser = user;
                this.onAuthChangeCallbacks.forEach(callback => callback(user));

                if (user) {
                    console.log('User authenticated');
                    this.showApp();

                    // Initialize Firestore for user data
                    if (typeof initializeFirestore === 'function') {
                        initializeFirestore(user);
                    }
                } else {
                    console.log('User logged out');
                    this.showAuthScreen();
                }
            });

            // Demo mode stays pre-auth - never redirect to Clerk for it.
            const demoActive = window.localStorage.getItem(DEMO_MODE_KEY) === 'true';
            if (demoActive) {
                console.log('Demo mode active - skipping Clerk gate');
                return true;
            }

            return await this.runClerkGate();
        } catch (error) {
            console.error('Firebase initialization error:', error);

            // Show user-friendly error message
            const errorMessage = 'Unable to initialize authentication. Please try:\n' +
                               '1. Refreshing the page (Ctrl+R or Cmd+R)\n' +
                               '2. Clearing your browser cache completely\n' +
                               '3. Using an incognito/private window\n\n' +
                               'Error: ' + error.message;

            alert(errorMessage);
            return false;
        }
    }

    /**
     * Clerk-in-front gate: require a Clerk session, require provisioning,
     * then exchange the session for a Firebase custom token. Page-load-only
     * check by design - the resulting Firebase session self-refreshes via
     * its own refresh token, so this never needs to poll Clerk again until
     * a hard sign-out.
     */
    async runClerkGate() {
        await this.loadClerkScript();
        await window.Clerk.load();

        if (!window.Clerk.session) {
            this.showAuthScreen();
            return true;
        }

        const publicMetadata = window.Clerk.user ? window.Clerk.user.publicMetadata : null;
        if (!publicMetadata || publicMetadata.provisioned !== true) {
            window.location.href = CLERK_PORTAL_URL;
            return false;
        }

        const sessionToken = await window.Clerk.session.getToken();
        if (!sessionToken) {
            throw new Error('Unable to read Clerk session token.');
        }

        const response = await fetch('/api/firebase-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + sessionToken
            }
        });

        if (!response.ok) {
            throw new Error('Unable to obtain Firebase session (status ' + response.status + '). Please sign in again.');
        }

        const data = await response.json();
        if (!data || !data.token) {
            throw new Error('Firebase token response was empty.');
        }

        // Yields a normal Firebase session (own refresh token), so the
        // onAuthStateChanged listener above fires and the rest of the app
        // boots exactly as before.
        await this.auth.signInWithCustomToken(data.token);

        return true;
    }

    // ----- Neutered: auth UI now lives on the Clerk-hosted portal. -----
    // Kept as no-ops (not deleted) because index.html still wires the old
    // login/signup/reset forms to these calls; that markup is dead but
    // harmless as long as these resolve instead of throwing.

    async signup() {
        return {
            success: false,
            message: 'Account creation is handled by the sign-in portal.'
        };
    }

    async login() {
        return {
            success: false,
            message: 'Sign-in is handled by the sign-in portal.'
        };
    }

    async resetPassword() {
        return {
            success: false,
            message: 'Password reset is handled by the sign-in portal.'
        };
    }

    async resendVerification() {
        return {
            success: false,
            message: 'Email verification is handled by the sign-in portal.'
        };
    }

    validatePassword() {
        return {
            valid: true,
            message: 'Password rules are handled by the sign-in portal.',
            requirements: {}
        };
    }

    updatePasswordRequirements(password, elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = '';
        }
    }

    getErrorMessage(error) {
        return (error && error.message) || 'An error occurred. Please try again.';
    }

    /**
     * Logout current user. Signs out of Firebase and Clerk, then redirects
     * to the portal - a Firebase-only signOut would leave a live Clerk
     * session that would just re-mint a new Firebase token on next load.
     */
    async logout() {
        try {
            if (this.auth) {
                await this.auth.signOut();
            }
            if (window.Clerk && typeof window.Clerk.signOut === 'function') {
                await window.Clerk.signOut({ redirectUrl: CLERK_PORTAL_URL });
            } else {
                window.location.href = CLERK_PORTAL_URL;
            }
            return { success: true, message: 'Logged out successfully' };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, message: 'Error logging out' };
        }
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.currentUser !== null;
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Get current user ID
     */
    getUserId() {
        return this.currentUser ? this.currentUser.uid : null;
    }

    /**
     * Get user's company data
     */
    async getCompanyData() {
        try {
            if (!this.currentUser) {
                throw new Error('No user logged in');
            }

            // Get user document to find companyId
            const userDoc = await this.db.collection('users').doc(this.currentUser.uid).get();

            if (!userDoc.exists) {
                throw new Error('User document not found');
            }

            const userData = userDoc.data();
            const companyId = userData.companyId;

            if (!companyId) {
                throw new Error('No company associated with user');
            }

            // Get company document
            const companyDoc = await this.db.collection('companies').doc(companyId).get();

            if (!companyDoc.exists) {
                throw new Error('Company not found');
            }

            return {
                success: true,
                companyId: companyId,
                company: companyDoc.data(),
                userRole: userData.role
            };

        } catch (error) {
            console.error('Get company data error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Register callback for auth state changes
     */
    onAuthChange(callback) {
        this.onAuthChangeCallbacks.push(callback);
    }

    /**
     * Show authentication screen
     */
    showAuthScreen() {
        document.getElementById('auth-container').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
    }

    /**
     * Show main app
     */
    showApp() {
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';

        // Update user display in sidebar
        if (this.currentUser) {
            const displayName = document.getElementById('user-display-name');
            const displayEmail = document.getElementById('user-display-email');
            const avatarLetter = document.getElementById('user-avatar-letter');

            if (displayName) {
                displayName.textContent = this.currentUser.displayName || 'User';
            }
            if (displayEmail) {
                displayEmail.textContent = this.currentUser.email;
            }
            if (avatarLetter) {
                const firstLetter = (this.currentUser.displayName || this.currentUser.email).charAt(0).toUpperCase();
                avatarLetter.textContent = firstLetter;
            }
        }

        // Show onboarding for first-time users
        setTimeout(() => {
            if (window.OnboardingManager && typeof window.OnboardingManager.showIfNeeded === 'function') {
                window.OnboardingManager.showIfNeeded();
            }
        }, 500);
    }
}

// Initialize and export - only create once
if (typeof window !== 'undefined' && typeof window.authManager === 'undefined') {
    window.authManager = new AuthManager();
    console.log('AuthManager initialized');
}
