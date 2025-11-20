// ===== FIREBASE CONFIGURATION =====
// Firebase configuration for Taste Signature App

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCER_1dyyms2zzyrhlyHdSpz4TI-N36sIQ",
    authDomain: "taste-signature-ai-app.firebaseapp.com",
    projectId: "taste-signature-ai-app",
    storageBucket: "taste-signature-ai-app.firebasestorage.app",
    messagingSenderId: "821061381389",
    appId: "1:821061381389:web:d7e04fd6685c76c8645444"
};

// Export for use in app
if (typeof window !== 'undefined') {
    window.FIREBASE_CONFIG = firebaseConfig;
}
