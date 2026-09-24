// Per-user fixed-window rate limiter backed by Firestore (Admin SDK).
//
// One document per user in a SERVER-ONLY collection (`aiRateLimits/{userId}`).
// The Admin SDK bypasses security rules, and firestore.rules' catch-all
// (`match /{document=**} { allow read, write: if false; }`) denies every
// client access to this collection - do not add a client rule for it.
//
// Window: a fixed hourly bucket (floor(now / 1h)). The read-modify-write runs
// in a Firestore transaction so concurrent requests cannot both slip under the
// limit. Requests over the limit are NOT counted (no write), so a blocked
// client is not pushed further into the window.

const WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_LIMIT_PER_HOUR = 60;
const COLLECTION = 'aiRateLimits';

/**
 * Parse AI_RATE_LIMIT_PER_HOUR; anything that is not a positive integer
 * falls back to the default of 60.
 */
function resolveLimit(envValue) {
    const n = Number.parseInt(envValue, 10);
    return Number.isInteger(n) && n > 0 ? n : DEFAULT_LIMIT_PER_HOUR;
}

/**
 * @param {object} opts
 * @param {() => object} opts.getDb  returns a Firestore instance (lazy)
 * @param {number} [opts.limit]      requests per hour per user
 * @param {() => number} [opts.now]  ms clock (injectable for tests)
 * @returns {{ check(userId: string): Promise<{allowed: boolean, limit: number, remaining: number, retryAfterSeconds: number}> }}
 *   check() rejects if Firestore is unavailable - callers must fail closed.
 */
function createFirestoreRateLimiter({ getDb, limit = DEFAULT_LIMIT_PER_HOUR, now = Date.now }) {
    return {
        async check(userId) {
            if (typeof userId !== 'string' || !userId || userId.includes('/')) {
                throw new Error('Invalid rate-limit key');
            }

            const nowMs = now();
            const windowId = Math.floor(nowMs / WINDOW_MS);
            const retryAfterSeconds = Math.max(
                1,
                Math.ceil(((windowId + 1) * WINDOW_MS - nowMs) / 1000)
            );

            const db = getDb();
            const ref = db.collection(COLLECTION).doc(userId);

            return await db.runTransaction(async (tx) => {
                const snap = await tx.get(ref);
                const data = snap.exists ? snap.data() : null;
                const count = data && data.window === windowId ? (data.count || 0) : 0;

                if (count >= limit) {
                    return { allowed: false, limit, remaining: 0, retryAfterSeconds };
                }

                tx.set(ref, { window: windowId, count: count + 1, updatedAt: nowMs });
                return { allowed: true, limit, remaining: limit - (count + 1), retryAfterSeconds };
            });
        }
    };
}

module.exports = {
    WINDOW_MS,
    DEFAULT_LIMIT_PER_HOUR,
    COLLECTION,
    resolveLimit,
    createFirestoreRateLimiter
};
