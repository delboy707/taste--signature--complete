// Shared Firebase Admin initialisation for the Vercel API routes.
// Lazy, memoised singleton: nothing is initialised (and no env vars are read)
// until a getter is first called, so modules that import this file can be
// loaded in unit tests without credentials.

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

let firebaseApp;

function getAdminApp() {
    if (firebaseApp) return firebaseApp;
    if (getApps().length === 0) {
        let privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').trim();
        // Strip accidental surrounding quotes from env var paste
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
            privateKey = privateKey.slice(1, -1);
        }
        // Convert escaped newlines only if the value has no real newlines
        if (!privateKey.includes('\n')) {
            privateKey = privateKey.replace(/\\n/g, '\n');
        }
        firebaseApp = initializeApp({
            credential: cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey
            })
        });
    } else {
        firebaseApp = getApps()[0];
    }
    return firebaseApp;
}

function getAdminAuth() {
    return getAuth(getAdminApp());
}

function getAdminFirestore() {
    return getFirestore(getAdminApp());
}

module.exports = { getAdminApp, getAdminAuth, getAdminFirestore };
