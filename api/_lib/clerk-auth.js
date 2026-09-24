// Shared Clerk session-token verification for the Vercel API routes.
// Files under api/_lib/ are prefixed with an underscore, so Vercel does not
// expose them as routes. Used by api/firebase-token.js and api/claude.js.

const { verifyToken } = require('@clerk/backend');

// Clerk authorized parties - the frontend origins allowed to present a
// session token. Distinct from each route's CORS allow-list (that is CORS;
// this is the token's own azp claim check).
const CLERK_AUTHORIZED_PARTIES = [
    'https://signature.qeptss.com',
    'https://qeptss.com'
];

/**
 * Pull the token out of an `Authorization: Bearer <token>` header.
 * Returns null when the header is missing, malformed or the token is empty.
 */
function extractBearerToken(authHeader) {
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    const token = authHeader.slice('Bearer '.length).trim();
    return token || null;
}

/**
 * Verify a Clerk session token server-side (signature, expiry, azp).
 * Returns the verified claims (always including `sub`), or null if the
 * token is invalid for any reason. Never throws.
 *
 * `verify` is injectable so unit tests can run without Clerk.
 */
async function verifyClerkSessionToken(token, verify = verifyToken) {
    try {
        const result = await verify(token, {
            secretKey: process.env.CLERK_SECRET_KEY,
            authorizedParties: CLERK_AUTHORIZED_PARTIES
        });
        const claims = result && result.data ? result.data : result;
        if (!claims || !claims.sub) return null;
        return claims;
    } catch (verifyError) {
        return null;
    }
}

/**
 * Provisioning gate. The Clerk session token template must include:
 * "metadata": "{{user.public_metadata}}"
 */
function isProvisioned(claims) {
    return !!(claims && claims.metadata && claims.metadata.provisioned === true);
}

module.exports = {
    CLERK_AUTHORIZED_PARTIES,
    extractBearerToken,
    verifyClerkSessionToken,
    isProvisioned
};
