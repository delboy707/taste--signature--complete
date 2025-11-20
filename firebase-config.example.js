// ===== FIREBASE CONFIGURATION EXAMPLE =====
// Copy this file to firebase-config.js and add your actual credentials
// For production deployment, use environment variables instead

// Firebase configuration
const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.firebasestorage.app",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123def456"
};

// Export for use in app
if (typeof window !== 'undefined') {
    window.FIREBASE_CONFIG = firebaseConfig;
}
