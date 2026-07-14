// Vercel Serverless Function - Clerk session -> Firebase custom token
// Verifies an inbound Clerk session token, gates on provisioning status,
// upserts the corresponding Firebase Auth user, and mints a Firebase
// custom token so the client can call signInWithCustomToken().
// Runtime: Node.js (>=22, required by firebase-admin@14 - see package.json)

const { verifyToken } = require('@clerk/backend');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

// Allowed origins - same pattern as api/claude.js
const ALLOWED_ORIGINS = [
    'https://taste-signature-ai-app.firebaseapp.com',
    'https://taste-signature-ai-app.web.app',
    process.env.ALLOWED_ORIGIN // Set in Vercel env vars for custom domains
].filter(Boolean);

// Clerk authorized parties - the frontend origins allowed to present a
// session token here. Distinct from ALLOWED_ORIGINS (that's CORS; this is
// the token's own azp claim check).
const CLERK_AUTHORIZED_PARTIES = [
    'https://signature.qeptss.com',
    'https://qeptss.com'
];

// Initialize Firebase Admin once per cold start (module scope singleton).
let firebaseApp;
if (getApps().length === 0) {
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
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
const firebaseAuth = getAuth(firebaseApp);

module.exports = async function handler(req, res) {
    // Set CORS headers - restrict to allowed origins
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get authentication header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: {
                    type: 'authentication_error',
                    message: 'Authentication required. Please sign in.'
                }
            });
        }

        const sessionToken = authHeader.replace('Bearer ', '');

        // Verify the Clerk session token
        const { data: claims, errors } = await verifyToken(sessionToken, {
            secretKey: process.env.CLERK_SECRET_KEY,
            authorizedParties: CLERK_AUTHORIZED_PARTIES
        });

        if (errors || !claims) {
            return res.status(401).json({
                error: {
                    type: 'authentication_error',
                    message: 'Invalid or expired session token. Please sign in again.'
                }
            });
        }

        // SECURITY GATE: require provisioning before minting a Firebase token.
        // Clerk session token template must include: "metadata": "{{user.public_metadata}}"
        const provisioned = claims.metadata && claims.metadata.provisioned === true;
        if (!provisioned) {
            return res.status(403).json({
                error: {
                    type: 'forbidden',
                    message: 'This account has not been provisioned yet.'
                }
            });
        }

        const uid = claims.sub;

        // email/name come from the extended Clerk session token template.
        const email = claims.email || undefined;
        const displayName = claims.name || undefined;

        // Upsert the Firebase Auth user so uid === Clerk sub.
        try {
            await firebaseAuth.getUser(uid);
            const updates = {};
            if (email) updates.email = email;
            if (displayName) updates.displayName = displayName;
            if (Object.keys(updates).length > 0) {
                await firebaseAuth.updateUser(uid, updates);
            }
        } catch (lookupError) {
            if (lookupError.code === 'auth/user-not-found') {
                await firebaseAuth.createUser({
                    uid,
                    email,
                    displayName,
                    emailVerified: true // Clerk already verified this identity
                });
            } else {
                throw lookupError;
            }
        }

        // Mint the Firebase custom token for client-side signInWithCustomToken().
        const customToken = await firebaseAuth.createCustomToken(uid);

        return res.status(200).json({ token: customToken });

    } catch (error) {
        console.error('firebase-token error:', error);
        return res.status(500).json({
            error: {
                type: 'server_error',
                message: 'Internal server error'
            }
        });
    }
};
