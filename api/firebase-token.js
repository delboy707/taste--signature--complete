// Vercel Serverless Function - Clerk session -> Firebase custom token
// Verifies an inbound Clerk session token, gates on provisioning status,
// auto-provisions the Firestore company/user docs on first sign-in,
// upserts the corresponding Firebase Auth user, and mints a Firebase
// custom token so the client can call signInWithCustomToken().
// Runtime: Node.js (>=22, required by firebase-admin@14 - see package.json)

const { verifyToken } = require('@clerk/backend');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// Allowed origins - same pattern as api/claude.js
const ALLOWED_ORIGINS = [
    'https://taste-signature-ai-app.firebaseapp.com',
    'https://taste-signature-ai-app.web.app',
    'https://qeptss.com',
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
const firebaseAuth = getAuth(firebaseApp);
const firestoreDb = getFirestore(firebaseApp);

// Auto-provision Firestore company/user docs on first sign-in.
// Idempotent: uses a transaction so a create-if-missing race between two
// concurrent first requests for the same uid cannot produce two companies.
//
// orgId (Stage 3b): when present, users who share a Clerk org share one
// Firestore company via the orgCompanyMap/{orgId} -> companyId lookup,
// instead of each getting their own company. orgId absent is today's
// per-user behavior, unchanged.
async function ensureFirestoreProvisioned(uid, email, displayName, orgId) {
    const userRef = firestoreDb.collection('users').doc(uid);

    await firestoreDb.runTransaction(async (tx) => {
        const userSnap = await tx.get(userRef);
        if (userSnap.exists) {
            // Already provisioned - nothing to do.
            return;
        }

        if (orgId) {
            const orgCompanyRef = firestoreDb.collection('orgCompanyMap').doc(orgId);
            const orgCompanySnap = await tx.get(orgCompanyRef);

            if (orgCompanySnap.exists) {
                // Org already has a company - join it as a member, create no company.
                tx.set(userRef, {
                    role: 'member',
                    companyId: orgCompanySnap.data().companyId,
                    email: email || null,
                    createdAt: FieldValue.serverTimestamp()
                });
                return;
            }

            // First member of this org - create the company as usual, and
            // record the org -> company mapping for the next member.
            const companyRef = firestoreDb.collection('companies').doc();
            tx.set(companyRef, {
                companyName: displayName || email || 'New Company',
                industry: null,
                companySize: null,
                ownerId: uid,
                createdAt: FieldValue.serverTimestamp()
            });

            tx.set(orgCompanyRef, {
                companyId: companyRef.id,
                createdAt: FieldValue.serverTimestamp()
            });

            tx.set(userRef, {
                role: 'owner',
                companyId: companyRef.id,
                email: email || null,
                createdAt: FieldValue.serverTimestamp()
            });
            return;
        }

        // No org claim - today's behavior, unchanged.
        const companyRef = firestoreDb.collection('companies').doc();
        tx.set(companyRef, {
            companyName: displayName || email || 'New Company',
            industry: null,
            companySize: null,
            ownerId: uid,
            createdAt: FieldValue.serverTimestamp()
        });

        tx.set(userRef, {
            role: 'owner',
            companyId: companyRef.id,
            email: email || null,
            createdAt: FieldValue.serverTimestamp()
        });
    });
}

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
        let claims = null;
        try {
            const result = await verifyToken(sessionToken, {
                secretKey: process.env.CLERK_SECRET_KEY,
                authorizedParties: CLERK_AUTHORIZED_PARTIES
            });
            claims = result && result.data ? result.data : result;
        } catch (verifyError) {
            claims = null;
        }

        if (!claims || !claims.sub) {
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

        // Nested claims.o.id is the active-organization claim Clerk sets when
        // setActive({ organization }) ran client-side (see auth.js Stage 3a);
        // claims.org_id is a flat fallback for older/differently-configured
        // token templates. Absent for users with no active org.
        const orgId = (claims.o && claims.o.id) || claims.org_id || null;

        // Auto-provision Firestore company/user docs on first sign-in.
        // Safe to call every request - it is a no-op once users/{uid} exists.
        await ensureFirestoreProvisioned(uid, email, displayName, orgId);

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

// Exposed only so emulator tests can call it directly; the handler above
// remains the module's export for Vercel.
module.exports.ensureFirestoreProvisioned = ensureFirestoreProvisioned;
