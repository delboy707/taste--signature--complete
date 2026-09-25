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

// "Clerk ready" signal (audit A2, 2026-09-25). On a returning visit Firebase
// restores its own session and onAuthStateChanged(user) -> showApp() runs
// BEFORE the Clerk gate below has loaded ClerkJS, run Clerk.load(), activated
// the org (setActive) and checked provisioning. Anything that needs a Clerk
// token (qep-capture dual-write, /api/claude, logout, the deep link) awaits
// authManager.whenClerkReady() instead of polling Clerk or assuming it.
// Each waiter gives up after this long (the same 15 s budget
// qep-capture-client.js used for its Clerk poll) - it never hangs.
const CLERK_READY_TIMEOUT_MS = 15000;
// logout() waits at most this long for a still-running gate before it
// signs out of Clerk (if loaded) and hard-redirects to the portal anyway.
const LOGOUT_CLERK_WAIT_MS = 3000;
// Bound on Clerk.signOut() itself, so a stuck call can't block the redirect.
const LOGOUT_CLERK_SIGNOUT_MS = 5000;
// How long the gate waits for Firebase's first auth-state callback (the
// IndexedDB restore) before deciding whether a persisted Firebase user exists.
const FIREBASE_RESTORE_WAIT_MS = 2000;

// Resolve with `promise`'s value, or undefined after `ms` - whichever comes
// first. Clears its timer either way; rejections pass through.
function _withTimeout(promise, ms) {
    let timer;
    const timeout = new Promise(resolve => { timer = setTimeout(resolve, ms); });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.auth = null;
        this.db = null;
        this.onAuthChangeCallbacks = [];

        // Settled once, by the Clerk gate (or demo mode). null until then.
        // Shape: { status: 'signed-in' | 'signed-out' | 'demo' | 'error',
        //          session, reason?, error? }
        this.clerkReadyState = null;
        this._clerkReadyPromise = new Promise(resolve => { this._resolveClerkReady = resolve; });
        this._firstAuthStatePromise = new Promise(resolve => { this._resolveFirstAuthState = resolve; });
        this._loggingOut = false;
        this.logoutClerkWaitMs = LOGOUT_CLERK_WAIT_MS;
    }

    /**
     * Settle the Clerk-ready signal. Idempotent: the first call wins.
     */
    _settleClerkReady(status, extra) {
        if (this.clerkReadyState) return this.clerkReadyState;
        const session = (status === 'signed-in' && window.Clerk) ? (window.Clerk.session || null) : null;
        this.clerkReadyState = Object.assign({ status, session }, extra || {});
        this._resolveClerkReady(this.clerkReadyState);
        return this.clerkReadyState;
    }

    /**
     * Resolves once ClerkJS is loaded, Clerk.load() has finished, the
     * single-org setActive attempt is done and provisioning has passed - with
     * { status: 'signed-in', session }. Otherwise 'signed-out' (no session, or
     * reason 'not-provisioned'), 'demo' (ClerkJS is never loaded) or 'error'
     * (the gate failed, or reason 'timeout' when this waiter gave up after
     * timeoutMs, default CLERK_READY_TIMEOUT_MS). Always settles; never rejects.
     */
    whenClerkReady(timeoutMs) {
        if (this.clerkReadyState) return Promise.resolve(this.clerkReadyState);
        const ms = (typeof timeoutMs === 'number' && timeoutMs >= 0) ? timeoutMs : CLERK_READY_TIMEOUT_MS;
        return new Promise(resolve => {
            const timer = setTimeout(() => resolve({ status: 'error', reason: 'timeout', session: null }), ms);
            this._clerkReadyPromise.then(state => {
                clearTimeout(timer);
                resolve(state);
            });
        });
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
                this._resolveFirstAuthState(user);
                this.onAuthChangeCallbacks.forEach(callback => callback(user));

                if (user) {
                    // A logout in progress must not re-show the app.
                    if (this._loggingOut) return;
                    console.log('User authenticated');
                    this.showApp();

                    // Initialize Firestore for user data
                    if (typeof initializeFirestore === 'function') {
                        initializeFirestore(user);
                    }

                    // Consume any ?project=&version= deep link stashed before
                    // the Clerk gate ran (see targets-loaded-ui.js) - only
                    // once the Clerk-ready signal says the session (and org)
                    // is usable. On a returning visit this callback fires
                    // before the gate finishes. No-op if nothing was stashed
                    // or Targets Loaded is disabled; left stashed otherwise.
                    this.whenClerkReady().then(state => {
                        if (this._loggingOut) return;
                        if (state.status !== 'signed-in' && state.status !== 'demo') return;
                        if (typeof window.handleQepCaptureDeepLink === 'function') {
                            window.handleQepCaptureDeepLink();
                        }
                    });
                } else {
                    console.log('User logged out');
                    this.showAuthScreen();
                }
            });

            // Demo mode stays pre-auth - never redirect to Clerk for it.
            const demoActive = window.localStorage.getItem(DEMO_MODE_KEY) === 'true';
            if (demoActive) {
                console.log('Demo mode active - skipping Clerk gate');
                this._settleClerkReady('demo');
                return true;
            }

            return await this.runClerkGate();
        } catch (error) {
            // Whatever failed, anything awaiting the signal gets an answer
            // (no-op if the gate already settled it, e.g. a later exchange).
            this._settleClerkReady('error', { error });
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
        try {
            await this.loadClerkScript();
            await window.Clerk.load();
        } catch (error) {
            this._settleClerkReady('error', { error });
            throw error;
        }

        if (!window.Clerk.session) {
            this._settleClerkReady('signed-out');
            // A Firebase session restored from IndexedDB must not outlive
            // the Clerk session (e.g. signed out on the portal): sign it out
            // first, or the app re-shows on every load with live Firestore
            // listeners under a Clerk-revoked identity (audit A2 #8).
            try {
                await _withTimeout(this._firstAuthStatePromise, FIREBASE_RESTORE_WAIT_MS);
                if (this.auth) {
                    await this.auth.signOut();
                }
            } catch (error) {
                console.warn('Clerk gate: Firebase sign-out for a signed-out Clerk session failed:', error);
            }
            this.showAuthScreen();
            return true;
        }

        // Stage 3a: activate the user's org so the session token carries the
        // 'o' claim (see tss-re1/qep-capture migrations). Only when exactly
        // one membership exists - zero is left to the memberships-table
        // fallback, and more than one is never guessed at. Must never block
        // sign-in, so any failure here is swallowed and logged only.
        try {
            const memberships = window.Clerk.user ? window.Clerk.user.organizationMemberships : null;
            if (memberships && memberships.length === 1) {
                const org = memberships[0].organization;
                if (!window.Clerk.organization || window.Clerk.organization.id !== org.id) {
                    await window.Clerk.setActive({ organization: org.id });
                }
            } else if (memberships && memberships.length > 1) {
                console.warn('Clerk gate: user belongs to more than one organization, not activating any automatically:', memberships.map(m => m.organization.id));
            }
        } catch (error) {
            console.warn('Clerk gate: failed to activate organization:', error);
        }

        const publicMetadata = window.Clerk.user ? window.Clerk.user.publicMetadata : null;
        if (!publicMetadata || publicMetadata.provisioned !== true) {
            this._settleClerkReady('signed-out', { reason: 'not-provisioned' });
            window.location.href = CLERK_PORTAL_URL;
            return false;
        }

        // Clerk is loaded, the org is activated (or deliberately not) and the
        // account is provisioned: tokens minted from here on carry the org
        // claim. Settled BEFORE the Firebase exchange, which is Firebase's
        // concern, not Clerk's.
        this._settleClerkReady('signed-in');

        // A logout started while the gate was loading: never re-sign-in.
        if (this._loggingOut) return true;

        try {
            await this._exchangeClerkSessionForFirebase();
        } catch (error) {
            // Returning visit: Firebase already restored the SAME identity
            // (uid === Clerk sub, see api/firebase-token.js), so the app is
            // already usable - the exchange was only a refresh. Non-fatal
            // (audit A2 #11). Fresh sign-in or a different identity: fatal.
            if (await this._hasMatchingFirebaseUser()) {
                console.warn('Clerk gate: Firebase token exchange failed on a returning visit; keeping the restored Firebase session:', error);
                return true;
            }
            throw error;
        }
        return true;
    }

    /**
     * True when Firebase has (or restores within FIREBASE_RESTORE_WAIT_MS) a
     * user whose uid is the signed-in Clerk user's id.
     */
    async _hasMatchingFirebaseUser() {
        await _withTimeout(this._firstAuthStatePromise, FIREBASE_RESTORE_WAIT_MS);
        const fbUser = this.auth ? this.auth.currentUser : null;
        const clerkUser = window.Clerk ? window.Clerk.user : null;
        return !!(fbUser && clerkUser && fbUser.uid === clerkUser.id);
    }

    /**
     * Exchange the Clerk session token for a Firebase custom token via
     * /api/firebase-token and sign in to Firebase with it.
     */
    async _exchangeClerkSessionForFirebase() {
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
        // boots exactly as before. Skipped if logout() started meanwhile.
        if (this._loggingOut) return;
        await this.auth.signInWithCustomToken(data.token);
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
     *
     * Safe to call before the Clerk gate has finished (audit A2 #7): it marks
     * logout in progress (so a pending gate can't signInWithCustomToken
     * again), signs Firebase out, waits at most logoutClerkWaitMs for the
     * Clerk-ready signal, signs out of Clerk only if ClerkJS actually loaded
     * (bounded), and ALWAYS finishes with a hard redirect to the portal -
     * whatever failed along the way.
     */
    async logout() {
        this._loggingOut = true;
        try {
            if (this.auth) {
                await this.auth.signOut();
            }
        } catch (error) {
            console.error('Logout: Firebase sign-out failed:', error);
        }
        try {
            await this.whenClerkReady(this.logoutClerkWaitMs);
            const clerk = window.Clerk;
            if (clerk && clerk.loaded && clerk.session && typeof clerk.signOut === 'function') {
                await _withTimeout(clerk.signOut({ redirectUrl: CLERK_PORTAL_URL }), LOGOUT_CLERK_SIGNOUT_MS);
            }
        } catch (error) {
            console.error('Logout: Clerk sign-out failed:', error);
        }
        window.location.href = CLERK_PORTAL_URL;
        return { success: true, message: 'Logged out successfully' };
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
