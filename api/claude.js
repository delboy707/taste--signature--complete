// Vercel Serverless Function - Proxy for Anthropic API
// This solves CORS issues when calling Claude from the browser
// Uses YOUR API key (stored securely in Vercel env vars: ANTHROPIC_API_KEY)
//
// Security model:
//   1. Requires `Authorization: Bearer <Clerk session token>`, verified
//      server-side (shared with api/firebase-token.js via api/_lib/clerk-auth.js)
//      and gated on the account being provisioned.
//   2. Server-side model allowlist; any other client-supplied model is ignored
//      and the default is used.
//   3. Per-user rate limit (default 60/hour, env AI_RATE_LIMIT_PER_HOUR) in a
//      server-only Firestore collection. Fails CLOSED (503) if Firestore is
//      unavailable.
//   4. Sampling parameters (temperature/top_p/top_k) are never forwarded:
//      Sonnet 5 / Opus 5.5 reject them with HTTP 400.
//
// The handler is built by createHandler(deps) so tests can inject the token
// verifier, rate limiter and fetch. The module's default export (what Vercel
// invokes) is a handler wired to the real dependencies.
// Runtime: Node.js

const {
    extractBearerToken,
    verifyClerkSessionToken,
    isProvisioned
} = require('./_lib/clerk-auth');
const {
    resolveLimit,
    createFirestoreRateLimiter
} = require('./_lib/rate-limit');

// Configuration
const MAX_MESSAGE_LENGTH = 5000;      // Limit message size to prevent abuse
const MAX_TOKENS = 16000;             // Maximum tokens per request (thinking tokens count toward it)
// Upstream timeout. Must stay 5s below api/claude.js maxDuration in vercel.json
// (300s: Pro plan, capped) so the proxy can return its own 408 before Vercel
// kills the function. Enforced by test/api-claude.test.js.
const REQUEST_TIMEOUT = 295000;       // 295 second timeout
const MAX_REQUEST_BODY_SIZE = 50000;  // Max total request body size in chars

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

// Model allowlist. Anything else falls back to DEFAULT_MODEL (no error).
const DEFAULT_MODEL = 'claude-sonnet-5';
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const OPUS_MODEL = 'claude-opus-5-5';
const ALLOWED_MODELS = new Set([DEFAULT_MODEL, HAIKU_MODEL, OPUS_MODEL]);
const MODEL_ALIASES = { 'claude-haiku-4-5': HAIKU_MODEL };

// Allowed origins - update with your actual domain(s)
const ALLOWED_ORIGINS = [
    'https://taste-signature-ai-app.firebaseapp.com',
    'https://taste-signature-ai-app.web.app',
    process.env.ALLOWED_ORIGIN // Set in Vercel env vars for custom domains
].filter(Boolean);

/**
 * Resolve the model to call. Unknown / missing / non-string -> default.
 */
function resolveModel(requested) {
    if (typeof requested !== 'string') return DEFAULT_MODEL;
    const model = MODEL_ALIASES[requested] || requested;
    return ALLOWED_MODELS.has(model) ? model : DEFAULT_MODEL;
}

function errorBody(type, message) {
    return { error: { type, message } };
}

/**
 * Build the request handler.
 * @param {object} [deps]
 * @param {(token: string) => Promise<object|null>} [deps.verifyClerkToken]
 * @param {{check(userId: string): Promise<object>}} [deps.rateLimiter]
 * @param {typeof fetch} [deps.fetchImpl]
 */
function createHandler(deps = {}) {
    const verifyClerkToken = deps.verifyClerkToken || verifyClerkSessionToken;
    const fetchImpl = deps.fetchImpl || ((...args) => fetch(...args));

    // Default limiter is created lazily so importing this module never
    // touches Firebase credentials (and unit tests need none).
    let defaultLimiter = null;
    function getRateLimiter() {
        if (deps.rateLimiter) return deps.rateLimiter;
        if (!defaultLimiter) {
            const { getAdminFirestore } = require('./_lib/firebase-admin');
            defaultLimiter = createFirestoreRateLimiter({
                getDb: getAdminFirestore,
                limit: resolveLimit(process.env.AI_RATE_LIMIT_PER_HOUR)
            });
        }
        return defaultLimiter;
    }

    return async function handler(req, res) {
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
            // 1. Authentication: verified Clerk session token
            const sessionToken = extractBearerToken(req.headers.authorization);
            if (!sessionToken) {
                return res.status(401).json(errorBody(
                    'authentication_error',
                    'Authentication required. Please sign in to use AI features.'
                ));
            }

            const claims = await verifyClerkToken(sessionToken);
            if (!claims || !claims.sub) {
                return res.status(401).json(errorBody(
                    'authentication_error',
                    'Invalid or expired authentication token. Please sign in again.'
                ));
            }

            if (!isProvisioned(claims)) {
                return res.status(403).json(errorBody(
                    'forbidden',
                    'This account has not been provisioned yet.'
                ));
            }

            // 2. Request validation
            const body = req.body;
            if (!body || typeof body !== 'object' || Array.isArray(body)) {
                return res.status(400).json(errorBody('invalid_request', 'Invalid request body.'));
            }

            // Sampling params (temperature, top_p, top_k) are deliberately not
            // read: they are never forwarded.
            const { model, max_tokens, system, messages } = body;

            if (JSON.stringify(body).length > MAX_REQUEST_BODY_SIZE) {
                return res.status(400).json(errorBody('invalid_request', 'Request body too large.'));
            }

            if (!Array.isArray(messages) || messages.length === 0) {
                return res.status(400).json(errorBody('invalid_request', 'Messages array is required.'));
            }

            const messageContent = messages.map(m =>
                typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
            ).join('');
            if (messageContent.length > MAX_MESSAGE_LENGTH) {
                return res.status(400).json(errorBody(
                    'invalid_request',
                    `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.`
                ));
            }

            if (system && typeof system === 'string' && system.length > MAX_MESSAGE_LENGTH) {
                return res.status(400).json(errorBody('invalid_request', 'System prompt too long.'));
            }

            // 3. Server API key (never from the client)
            const serverApiKey = process.env.ANTHROPIC_API_KEY;
            if (!serverApiKey) {
                console.error('ANTHROPIC_API_KEY not set in Vercel environment variables');
                return res.status(503).json(errorBody(
                    'configuration_error',
                    'AI service not configured. Please contact support.'
                ));
            }

            // 4. Per-user rate limit. Fail closed if the limiter is unavailable.
            let limit;
            try {
                limit = await getRateLimiter().check(claims.sub);
            } catch (limiterError) {
                console.error('AI rate limiter unavailable (failing closed):', limiterError && limiterError.message);
                return res.status(503).json(errorBody(
                    'service_unavailable',
                    'AI service is temporarily unavailable. Please try again later.'
                ));
            }

            if (!limit.allowed) {
                res.setHeader('retry-after', String(limit.retryAfterSeconds));
                return res.status(429).json(errorBody(
                    'rate_limit_error',
                    `AI request limit reached (${limit.limit} per hour). Please try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s).`
                ));
            }

            // 5. Call Anthropic with the allowlisted model and capped tokens
            const limitedMaxTokens = Math.min(Number(max_tokens) || 2048, MAX_TOKENS);

            console.log(`Authenticated request from user: ${claims.sub}`);

            return await callClaudeAPI({
                fetchImpl,
                apiKey: serverApiKey,
                model: resolveModel(model),
                max_tokens: limitedMaxTokens,
                system,
                messages,
                res
            });

        } catch (error) {
            console.error('Proxy error:', error);
            return res.status(500).json(errorBody('server_error', 'Internal server error'));
        }
    };
}

/**
 * Call Anthropic API
 */
async function callClaudeAPI({ fetchImpl, apiKey, model, max_tokens, system, messages, res }) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
        const response = await fetchImpl(ANTHROPIC_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            // Only these fields are ever sent. No temperature/top_p/top_k
            // (rejected by Sonnet 5 / Opus 5.5), no thinking/budget_tokens,
            // no prefill, no forced tool_choice.
            body: JSON.stringify({ model, max_tokens, system, messages }),
            signal: controller.signal
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Anthropic API error:', response.status, data && data.error && data.error.type);

            // Model not available (e.g. a newly launching model): clear error, no fallback.
            if (response.status === 404) {
                return res.status(404).json(errorBody(
                    'model_not_found',
                    `The AI model "${model}" is not available right now. Please try again later or choose a different model.`
                ));
            }

            // Our server-side key is bad: do not tell the user to sign in again.
            if (response.status === 401 || response.status === 403) {
                return res.status(502).json(errorBody(
                    'upstream_error',
                    'AI service configuration error. Please contact support.'
                ));
            }

            return res.status(response.status).json(data);
        }

        // Metadata only (never message content): lets a "blank reply" report be
        // diagnosed from the Vercel logs (model, stop_reason, block types).
        const blocks = data && Array.isArray(data.content) ? data.content : [];
        const meta = {
            model,
            stop_reason: data && data.stop_reason,
            blockTypes: blocks.map(b => b && b.type),
            output_tokens: data && data.usage && data.usage.output_tokens
        };
        const hasText = blocks.some(b => b && b.type === 'text' && typeof b.text === 'string' && b.text.trim());
        if (hasText) {
            console.log('Anthropic response ok', JSON.stringify(meta));
        } else {
            console.warn('Anthropic returned 200 with NO text block', JSON.stringify(meta));
        }

        return res.status(200).json(data);

    } catch (error) {
        if (error.name === 'AbortError') {
            return res.status(408).json(errorBody(
                'timeout_error',
                'Request timed out. Please try again.'
            ));
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

// Vercel invokes the module's export: a handler wired to the real dependencies.
module.exports = createHandler();

// Exposed for unit tests (inject verifier / rate limiter / fetch).
module.exports.createHandler = createHandler;
module.exports.resolveModel = resolveModel;
module.exports.DEFAULT_MODEL = DEFAULT_MODEL;
module.exports.MAX_TOKENS = MAX_TOKENS;
module.exports.REQUEST_TIMEOUT = REQUEST_TIMEOUT;
module.exports.ALLOWED_MODELS = ALLOWED_MODELS;
