// Firebase Configuration - EXAMPLE FILE
// Copy this file to firebase-config.js and fill in your Firebase project values
// Get these from: https://console.firebase.google.com/ > Project Settings > General

const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Export for use in app
if (typeof window !== 'undefined') {
    window.FIREBASE_CONFIG = firebaseConfig;
}
