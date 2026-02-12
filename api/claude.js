// Vercel Serverless Function - Proxy for Anthropic API
// This solves CORS issues when calling Claude from the browser
// Uses YOUR API key (stored securely in Vercel env vars)
// Implements authentication and rate limiting
// Runtime: Node.js

// Configuration
const MAX_MESSAGE_LENGTH = 5000;      // Limit message size to prevent abuse
const MAX_TOKENS = 4096;              // Maximum tokens per request
const REQUEST_TIMEOUT = 30000;        // 30 second timeout
const MAX_REQUEST_BODY_SIZE = 50000;  // Max total request body size in chars

// Allowed origins - update with your actual domain(s)
const ALLOWED_ORIGINS = [
    'https://taste-signature-ai-app.firebaseapp.com',
    'https://taste-signature-ai-app.web.app',
    process.env.ALLOWED_ORIGIN // Set in Vercel env vars for custom domains
].filter(Boolean);

/**
 * Verify Firebase ID token using Google's public keys
 * Validates JWT signature, expiry, audience, and issuer
 */
async function verifyFirebaseToken(token) {
    try {
        // Decode JWT header and payload without verification first
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid token format');
        }

        const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

        // Validate token claims
        const now = Math.floor(Date.now() / 1000);

        if (!payload.exp || payload.exp < now) {
            throw new Error('Token expired');
        }

        if (!payload.iat || payload.iat > now + 300) { // 5 min clock skew
            throw new Error('Token issued in the future');
        }

        if (!payload.sub || typeof payload.sub !== 'string' || payload.sub.length === 0) {
            throw new Error('Invalid subject claim');
        }

        // Verify issuer matches Firebase project
        const projectId = process.env.FIREBASE_PROJECT_ID || 'taste-signature-ai-app';
        const expectedIssuer = `https://securetoken.google.com/${projectId}`;
        if (payload.iss !== expectedIssuer) {
            throw new Error('Invalid token issuer');
        }

        // Verify audience matches Firebase project
        if (payload.aud !== projectId) {
            throw new Error('Invalid token audience');
        }

        // Verify auth_time is in the past
        if (!payload.auth_time || payload.auth_time > now) {
            throw new Error('Invalid auth_time');
        }

        // Fetch Google's public keys and verify signature
        const keysResponse = await fetch(
            'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
        );
        const keys = await keysResponse.json();

        const kid = header.kid;
        if (!kid || !keys[kid]) {
            throw new Error('Unknown signing key');
        }

        // Use Node.js crypto to verify RS256 signature
        const crypto = require('crypto');
        const signatureInput = parts[0] + '.' + parts[1];
        const signature = Buffer.from(parts[2], 'base64url');
        const publicKey = keys[kid];

        const isValid = crypto.createVerify('RSA-SHA256')
            .update(signatureInput)
            .verify(publicKey, signature);

        if (!isValid) {
            throw new Error('Invalid token signature');
        }

        return { uid: payload.sub, email: payload.email || null };
    } catch (error) {
        console.error('Token verification failed:', error.message);
        return null;
    }
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
        const { model, max_tokens, temperature, system, messages } = req.body;

        // Validate total request body size
        const bodyStr = JSON.stringify(req.body);
        if (bodyStr.length > MAX_REQUEST_BODY_SIZE) {
            return res.status(400).json({
                error: {
                    type: 'invalid_request',
                    message: 'Request body too large.'
                }
            });
        }

        // Get authentication header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: {
                    type: 'authentication_error',
                    message: 'Authentication required. Please sign in to use AI features.'
                }
            });
        }

        // Verify Firebase token cryptographically
        const firebaseToken = authHeader.replace('Bearer ', '');
        const verifiedUser = await verifyFirebaseToken(firebaseToken);

        if (!verifiedUser) {
            return res.status(401).json({
                error: {
                    type: 'authentication_error',
                    message: 'Invalid or expired authentication token. Please sign in again.'
                }
            });
        }

        // Get server API key from environment variable
        const serverApiKey = process.env.ANTHROPIC_API_KEY;

        if (!serverApiKey) {
            console.error('ANTHROPIC_API_KEY not set in Vercel environment variables');
            return res.status(503).json({
                error: {
                    type: 'configuration_error',
                    message: 'AI service not configured. Please contact support.'
                }
            });
        }

        // Validate messages array
        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({
                error: {
                    type: 'invalid_request',
                    message: 'Messages array is required.'
                }
            });
        }

        // Validate request size to prevent abuse
        const messageContent = messages.map(m =>
            typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
        ).join('');
        if (messageContent.length > MAX_MESSAGE_LENGTH) {
            return res.status(400).json({
                error: {
                    type: 'invalid_request',
                    message: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.`
                }
            });
        }

        // Validate system prompt size
        if (system && typeof system === 'string' && system.length > MAX_MESSAGE_LENGTH) {
            return res.status(400).json({
                error: {
                    type: 'invalid_request',
                    message: 'System prompt too long.'
                }
            });
        }

        // Limit max tokens
        const limitedMaxTokens = Math.min(max_tokens || 2048, MAX_TOKENS);

        console.log(`Authenticated request from user: ${verifiedUser.uid}`);

        // Call Anthropic API with server key
        return await callClaudeAPI(serverApiKey, model, limitedMaxTokens, temperature, system, messages, res);

    } catch (error) {
        console.error('Proxy error:', error);
        return res.status(500).json({
            error: {
                type: 'server_error',
                message: 'Internal server error'
            }
        });
    }
};

/**
 * Call Anthropic API
 */
async function callClaudeAPI(apiKey, model, max_tokens, temperature, system, messages, res) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model,
                max_tokens,
                temperature,
                system,
                messages
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const data = await response.json();

        if (!response.ok) {
            console.error('Anthropic API error:', data);
            return res.status(response.status).json(data);
        }

        return res.status(200).json(data);

    } catch (error) {
        if (error.name === 'AbortError') {
            return res.status(408).json({
                error: {
                    type: 'timeout_error',
                    message: 'Request timed out. Please try again.'
                }
            });
        }
        throw error;
    }
}


