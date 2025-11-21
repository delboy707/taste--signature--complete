// ===== FIREBASE CONFIGURATION =====
// Firebase configuration for Taste Signature App
//
// NOTE: Firebase client configuration values are designed to be public.
// Security is enforced through Firebase Security Rules, not by hiding these values.
// See: https://firebase.google.com/docs/projects/api-keys
//
// These values can be overridden via environment variables in production.

// Firebase configuration
const firebaseConfig = {
    apiKey: typeof VITE_FIREBASE_API_KEY !== 'undefined' ? VITE_FIREBASE_API_KEY : "AIzaSyCER_1dyyms2zzyrhlyHdSpz4TI-N36sIQ",
    authDomain: typeof VITE_FIREBASE_AUTH_DOMAIN !== 'undefined' ? VITE_FIREBASE_AUTH_DOMAIN : "taste-signature-ai-app.firebaseapp.com",
    projectId: typeof VITE_FIREBASE_PROJECT_ID !== 'undefined' ? VITE_FIREBASE_PROJECT_ID : "taste-signature-ai-app",
    storageBucket: typeof VITE_FIREBASE_STORAGE_BUCKET !== 'undefined' ? VITE_FIREBASE_STORAGE_BUCKET : "taste-signature-ai-app.firebasestorage.app",
    messagingSenderId: typeof VITE_FIREBASE_MESSAGING_SENDER_ID !== 'undefined' ? VITE_FIREBASE_MESSAGING_SENDER_ID : "821061381389",
    appId: typeof VITE_FIREBASE_APP_ID !== 'undefined' ? VITE_FIREBASE_APP_ID : "1:821061381389:web:d7e04fd6685c76c8645444"
};

// Export for use in app
if (typeof window !== 'undefined') {
    window.FIREBASE_CONFIG = firebaseConfig;
}
