// ===== FIREBASE AUTHENTICATION MODULE =====
// Handles user authentication, signup, login, password reset

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.auth = null;
        this.db = null;
        this.onAuthChangeCallbacks = [];
    }

    /**
     * Initialize Firebase
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

            console.log('✅ Firebase initialized successfully');

            // Listen for auth state changes
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
                    console.log('❌ User logged out');
                    this.showAuthScreen();
                }
            });

            return true;
        } catch (error) {
            console.error('❌ Firebase initialization error:', error);

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
     * Register new user and create company
     */
    async signup(email, password, displayName, companyData) {
        try {
            // Validate password requirements
            const validation = this.validatePassword(password);
            if (!validation.valid) {
                throw new Error(validation.message);
            }

            // Create user
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Update profile with display name
            await user.updateProfile({
                displayName: displayName
            });

            // Send verification email
            await user.sendEmailVerification();

            // Create company document
            const companyRef = await this.db.collection('companies').add({
                companyName: companyData.companyName,
                industry: companyData.industry,
                companySize: companyData.companySize,
                ownerId: user.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                settings: {
                    enabledEmotions: [], // Empty = all emotions enabled by default
                    customAttributes: [],
                    lexicon: {}
                },
                subscription: {
                    plan: 'trial',
                    startDate: firebase.firestore.FieldValue.serverTimestamp(),
                    trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days trial
                }
            });

            // Create user document with company reference
            await this.db.collection('users').doc(user.uid).set({
                email: email,
                displayName: displayName,
                companyId: companyRef.id,
                role: 'owner',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                emailVerified: false
            });

            console.log('✅ Company created:', companyRef.id);

            return {
                success: true,
                message: 'Company account created! Please check your email to verify your account.',
                user: user,
                companyId: companyRef.id
            };

        } catch (error) {
            console.error('Signup error:', error);
            return {
                success: false,
                message: this.getErrorMessage(error)
            };
        }
    }

    /**
     * Login existing user
     */
    async login(email, password) {
        try {
            // Check if auth is initialized
            if (!this.auth) {
                throw new Error('Authentication service not initialized. Please refresh the page.');
            }

            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            console.log('User authenticated');

            // Check if email is verified
            if (!user.emailVerified) {
                return {
                    success: false,
                    requiresVerification: true,
                    user: user,
                    warning: 'Please verify your email address. Check your inbox for the verification link.'
                };
            }

            return {
                success: true,
                message: 'Logged in successfully!',
                user: user
            };

        } catch (error) {
            console.error('❌ Login error:', error);

            // Add specific handling for auth state errors
            if (error.message && error.message.includes('not initialized')) {
                return {
                    success: false,
                    message: 'Authentication service is not ready. Please refresh the page and try again.'
                };
            }

            return {
                success: false,
                message: this.getErrorMessage(error)
            };
        }
    }

    /**
     * Logout current user
     */
    async logout() {
        try {
            await this.auth.signOut();
            return { success: true, message: 'Logged out successfully' };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, message: 'Error logging out' };
        }
    }

    /**
     * Send password reset email
     */
    async resetPassword(email) {
        try {
            await this.auth.sendPasswordResetEmail(email);
            return {
                success: true,
                message: 'Password reset email sent! Check your inbox.'
            };
        } catch (error) {
            console.error('Password reset error:', error);
            return {
                success: false,
                message: this.getErrorMessage(error)
            };
        }
    }

    /**
     * Resend email verification
     */
    async resendVerification() {
        try {
            const user = this.auth.currentUser;
            if (!user) {
                throw new Error('No user logged in');
            }

            await user.sendEmailVerification();
            return {
                success: true,
                message: 'Verification email sent! Check your inbox.'
            };
        } catch (error) {
            console.error('Resend verification error:', error);
            return {
                success: false,
                message: this.getErrorMessage(error)
            };
        }
    }

    /**
     * Validate password requirements
     */
    validatePassword(password) {
        const requirements = {
            minLength: password.length >= 8,
            hasUpperCase: /[A-Z]/.test(password),
            hasLowerCase: /[a-z]/.test(password),
            hasNumber: /[0-9]/.test(password),
            hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        const allValid = Object.values(requirements).every(req => req === true);

        if (!allValid) {
            let message = 'Password must contain:\n';
            if (!requirements.minLength) message += '• At least 8 characters\n';
            if (!requirements.hasUpperCase) message += '• One uppercase letter\n';
            if (!requirements.hasLowerCase) message += '• One lowercase letter\n';
            if (!requirements.hasNumber) message += '• One number\n';
            if (!requirements.hasSpecial) message += '• One special character\n';

            return { valid: false, message: message, requirements: requirements };
        }

        return { valid: true, message: 'Password is strong', requirements: requirements };
    }

    /**
     * Get user-friendly error messages
     */
    getErrorMessage(error) {
        const errorMessages = {
            'auth/email-already-in-use': 'This email is already registered. Please login instead.',
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/operation-not-allowed': 'Email/password accounts are not enabled.',
            'auth/weak-password': 'Password is too weak. Please use a stronger password.',
            'auth/user-disabled': 'This account has been disabled.',
            'auth/user-not-found': 'No account found with this email.',
            'auth/wrong-password': 'Incorrect password. Please try again.',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
            'auth/network-request-failed': 'Network error. Please check your connection.'
        };

        return errorMessages[error.code] || error.message || 'An error occurred. Please try again.';
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

    /**
     * Show password requirements UI
     */
    updatePasswordRequirements(password, elementId) {
        const validation = this.validatePassword(password);
        const element = document.getElementById(elementId);

        if (!element) return;

        const req = validation.requirements;
        element.innerHTML = `
            <div class="password-requirement ${req.minLength ? 'valid' : ''}">
                ${req.minLength ? '✓' : '○'} At least 8 characters
            </div>
            <div class="password-requirement ${req.hasUpperCase ? 'valid' : ''}">
                ${req.hasUpperCase ? '✓' : '○'} One uppercase letter
            </div>
            <div class="password-requirement ${req.hasLowerCase ? 'valid' : ''}">
                ${req.hasLowerCase ? '✓' : '○'} One lowercase letter
            </div>
            <div class="password-requirement ${req.hasNumber ? 'valid' : ''}">
                ${req.hasNumber ? '✓' : '○'} One number
            </div>
            <div class="password-requirement ${req.hasSpecial ? 'valid' : ''}">
                ${req.hasSpecial ? '✓' : '○'} One special character (!@#$%^&*)
            </div>
        `;
    }
}

// Initialize and export - only create once
if (typeof window !== 'undefined' && typeof window.authManager === 'undefined') {
    window.authManager = new AuthManager();
    console.log('✅ AuthManager initialized');
}
