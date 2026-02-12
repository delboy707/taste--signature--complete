# Security Audit Report — Taste Signature Complete

**Date:** 2026-02-12
**Scope:** Full codebase security review (80+ files)
**Backend:** Firebase (Firestore, Auth, Storage)
**Hosting:** Vercel
**Overall Risk Level:** HIGH

---

## Executive Summary

This audit identified **47 security findings** across the Taste Signature application, including **5 Critical**, **16 High**, **18 Medium**, and **8 Low** severity issues. The most urgent concerns are:

1. **Exposed Anthropic API key** hardcoded in documentation (FIREBASE_SETUP.md)
2. **No server-side token verification** — the backend only checks token length > 10 chars
3. **Pervasive XSS vulnerabilities** via unsanitized `innerHTML` across 10+ files
4. **All access control is client-side only** — trivially bypassable via localStorage manipulation
5. **Sensitive data stored unencrypted** in localStorage (API keys, PII, business data)

---

## Table of Contents

1. [Critical Findings](#1-critical-findings)
2. [High Severity Findings](#2-high-severity-findings)
3. [Medium Severity Findings](#3-medium-severity-findings)
4. [Low Severity Findings](#4-low-severity-findings)
5. [Cross-Cutting Concerns](#5-cross-cutting-concerns)
6. [Remediation Roadmap](#6-remediation-roadmap)
7. [Full Findings Table](#7-full-findings-table)

---

## 1. Critical Findings

### C1. Exposed Anthropic API Key in Documentation
**File:** `FIREBASE_SETUP.md` (Line 73)
**Impact:** Full unauthorized API access, billing abuse

The file contains a complete, valid-format Anthropic API key:
```
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
```

**Action Required:** Immediately rotate this key in your Anthropic account. Scrub it from git history using `git filter-branch` or BFG Repo-Cleaner.

---

### C2. No Server-Side Token Verification
**File:** `api/claude.js` (Lines 46-58)
**Impact:** Complete authentication bypass

```javascript
// Extract Firebase token (not validating it for simplicity, just checking it exists)
const firebaseToken = authHeader.replace('Bearer ', '');
if (!firebaseToken || firebaseToken.length < 10) { ... }
```

Any string longer than 10 characters passes authentication. The code explicitly acknowledges this with the comment "not validating it for simplicity." An attacker can call the API with `Authorization: Bearer anystringhere` and it will succeed.

**Fix:** Use Firebase Admin SDK's `admin.auth().verifyIdToken(token)` to cryptographically verify tokens.

---

### C3. Pervasive XSS via innerHTML
**Files:** `chat-ui.js:225`, `comments-ui.js:302,389`, `batch-import-ui.js:30`, `app.js:318,834,1261`, `search-filter.js:25`, `need-state-questionnaire.js:155`, `templates-manager.js:100,200`, `recipe-tracker-ui.js:313`, `industry-benchmarks-ui.js:456`
**Impact:** Arbitrary JavaScript execution, session hijacking, data theft

Throughout the codebase, user-controlled data is inserted into the DOM via `innerHTML` without sanitization. The most dangerous instances:

- **chat-ui.js:225** — AI responses rendered as HTML: `textDiv.innerHTML = formattedContent`
- **batch-import-ui.js:30** — CSV headers rendered as HTML: a malicious CSV with header `"><script>alert('XSS')</script>` would execute
- **comments-ui.js:302,389** — User comments inserted via `insertAdjacentHTML`
- **templates-manager.js:200** — Inline `onclick` handlers built from template data

**Fix:** Replace `innerHTML` with `textContent` for user data, or use DOMPurify for rich content. Replace inline event handlers with `addEventListener()`.

---

### C4. All Access Control is Client-Side Only
**Files:** `team-collaboration.js:76-104,397-441`, `approval-workflow.js:53-62,144-148`, `user-tiers.js` (entire file)
**Impact:** Complete authorization bypass, unlimited feature access

Every permission check reads from localStorage and decides client-side:

```javascript
// team-collaboration.js — Default fallback gives ADMIN role
function getCurrentUser() {
    // ... if no stored user:
    return { id: 'user-' + Date.now(), role: UserRoles.ADMIN };
}
```

An attacker can:
- Set their role to ADMIN via DevTools
- Bypass all tier quotas by editing localStorage
- Approve their own workflows
- Access any team member's data

**Fix:** Move all authorization decisions to Firestore Security Rules and/or backend Cloud Functions.

---

### C5. Client-Side API Key Storage + CORS Wildcard
**Files:** `config.js:8,62,83`, `claude-api.js:6-8`, `api/claude.js:19-22`
**Impact:** API key theft, cross-origin API abuse

Two compounding issues:
1. Anthropic API keys stored in `window.AI_CONFIG` and `localStorage` in plaintext
2. The server endpoint allows `Access-Control-Allow-Origin: *` with credentials

Any website can make cross-origin requests to your API endpoint, and any XSS vulnerability leaks stored API keys.

**Fix:**
- Never store API keys client-side; proxy all AI calls through backend
- Restrict CORS to your specific domain(s)

---

## 2. High Severity Findings

### H1. Webhook Secrets in Plaintext localStorage
**File:** `webhook-integration.js:69-71`
Webhook API keys stored unencrypted: `localStorage.setItem('webhookConfig', JSON.stringify(webhookConfig))`

### H2. No Webhook Signature Verification
**File:** `webhook-integration.js:861-864`
Simple string comparison instead of HMAC. No timestamp validation against replay attacks.

### H3. SSRF via URL Import
**File:** `spreadsheet-sync.js:741-763`
`importFromUrl()` fetches any user-provided URL without domain validation. Could access internal network resources.

### H4. CSV Formula Injection
**Files:** `batch-import.js`, `spreadsheet-sync.js:419-436`
No sanitization of CSV values starting with `=`, `+`, `-`, `@`. Exported/imported CSVs could execute formulas in Excel.

### H5. Prototype Pollution
**File:** `sensory-inference.js:410-419`
`setNestedValue()` assigns to arbitrary object paths without blocking `__proto__`, `constructor`, or `prototype`.

### H6. Unsafe Dynamic Script Loading
**File:** `lazy-loader.js:10-25`
Loads scripts from arbitrary URLs with no domain allowlist, no Subresource Integrity (SRI) checks.

### H7. Unencrypted PII in localStorage
**Files:** `consumer-panel.js:44-59` (demographics), `team-collaboration.js:47-49` (emails), `photo-manager.js:68,117,324` (base64 images)
Respondent demographics (age, gender), team member emails, and product photos all stored in plaintext localStorage.

### H8. No Auth Check on Exports
**File:** `export-controller.js:43-77`
Any user can export any product data — no ownership or permission verification.

### H9. URL Regex Injection in Comments
**File:** `comments-ui.js:197-200`
URL auto-linking via regex creates `<a href="$1">` without validating the URL protocol, enabling `javascript:` URLs.

### H10. Insecure Random ID Generation
**Files:** `recipe-tracker.js:75,259`, multiple others
Uses `Date.now() + Math.random()` for IDs. These are predictable and enumerable.

### H11. Demo Data Mixed with Production
**File:** `demo-mode.js:17-26`
Demo data stored in the same localStorage namespace as real data with only a flag to distinguish them.

### H12. Full Portfolio Sent with Every AI Call
**File:** `ai-chat.js:104-108`
Every API request includes a complete summary of all products — no data minimization.

### H13. Missing Firestore Write Validation
**File:** `firestore.rules:30-40`
No validation of required fields, data types, string lengths, or numeric ranges on document writes. Company members can modify any field.

### H14. No Pagination on Firestore Reads
**File:** `firestore-data.js:118-139`
`loadExperiences()` loads ALL documents with no `.limit()`. Could cause high billing and DoS.

### H15. Email Verification Not Enforced
**File:** `auth.js:154-161`
Login returns `success: true` even when `emailVerified` is false. Unverified accounts get full access.

### H16. Predictable Company IDs
**File:** `firestore-data.js:26-42`
Company IDs generated as `company_` + first 8 chars of user ID. Predictable and enumerable.

---

## 3. Medium Severity Findings

### M1. Missing Security Headers
**File:** `vercel.json:9-50`
No `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, or `Referrer-Policy` headers configured.

### M2. Missing CSRF Protection
**File:** `app.js:191`
No CSRF tokens on form submissions.

### M3. Sensitive Data in Console Logs
**File:** `auth.js:40,48`
User emails logged to browser console in production.

### M4. No Data Minimization for Consumer Panels
**File:** `consumer-panel.js:115-120`
Stores individual respondent records when only aggregates are needed. Potential GDPR/privacy violation.

### M5. Unencrypted Approval Decisions
**File:** `approval-workflow.js:22-40`
Business-sensitive approval status and comments stored in plaintext localStorage.

### M6. Analytics Without Consent
**File:** `analytics.js:5-26`
User behavior tracking with no consent mechanism or opt-out.

### M7. Path Disclosure in Documentation
**Files:** `FIREBASE_SETUP.md:21-35`, `DEPLOYMENT_GUIDE.md:21,34`
Local file paths like `/Users/derekroberts/Sense Genie App` exposed in docs.

### M8. Base64 Images Sent to External API
**File:** `photo-ai.js:166-189`
Proprietary product photos sent to Claude API in full resolution.

### M9. Sensitive Error Message Exposure
**Files:** `sensory-inference.js:276-282`, `claude-api.js:180-189`
Internal error details from API responses shown to users.

### M10. Missing Request Size Validation
**File:** `api/claude.js:81-89`
Only message content length checked — system prompts and other payload fields not validated.

### M11. Google Sheet IDs in localStorage
**File:** `spreadsheet-sync.js:688-694`
Sheet IDs stored in plaintext; exposure could compromise shared sheets.

### M12. No Camera Permission Context
**File:** `barcode-scanner.js:213-219`
Camera access requested without explaining purpose to user.

### M13. Product Data in Global Window Object
**File:** `barcode-scanner.js:467-478`
Scanned product data stored on `window.scannedProductData`, accessible to any script.

### M14. Insecure JSON Deserialization
**Files:** `onboarding.js:14`, `custom-lexicon.js:101`, `comments.js:24`
`JSON.parse()` from localStorage without try-catch or schema validation in several locations.

### M15. No Rate Limiting on AI Inference
**Files:** `sensory-inference.js:187-237`, `auto-processor.js:465-512`
Batch inference sends parallel API requests with no throttling.

### M16. Missing Data Import Validation
**File:** `auto-processor.js:183-294`
Falls back to unvalidated data if SchemaValidation module is not loaded.

### M17. PDF Exports Contain Full Business Data
**File:** `pdf-export.js:46-56`
Product names, brands, categories, and need states embedded in unencrypted PDFs without watermarking.

### M18. Webhook URL SSRF Risk
**File:** `webhook-integration.js:296-306`
Webhook URLs accepted without blocking internal/private network addresses.

---

## 4. Low Severity Findings

### L1. Empty firebase-config.example.js
No template guidance for developers.

### L2. Inline Event Handlers Throughout
Multiple files use `onclick` attributes instead of `addEventListener()`, incompatible with strict CSP.

### L3. Service Worker Cache Considerations
**File:** `service-worker.js` — Correctly excludes auth requests but no cache-clearing on logout.

### L4. No HTTPS Enforcement in App Code
Firebase enforces HTTPS, but no explicit protocol validation in configuration initialization.

### L5. Missing Timeout on Async Operations
**File:** `auto-processor.js:218-219` — No timeout on inference calls; could hang indefinitely.

### L6. No Camera Consent Logging
**File:** `camera-integration.js:38-44` — No audit trail of when camera is accessed.

### L7. Hardcoded Sample Data in Bundle
**File:** `app.js:9-10` — Large sample data arrays increase bundle size.

### L8. Demo Data Too Realistic
**File:** `demo-mode.js:249-340` — Could be confused with real products.

---

## 5. Cross-Cutting Concerns

### localStorage as Primary Data Store
The application uses browser localStorage as its primary data store for:
- Product experiences and taste data
- Team member info (names, emails, roles)
- Consumer panel demographics
- Photos (base64 encoded)
- Webhook API keys
- User tier/subscription data
- Approval workflow decisions
- Analytics data

**All stored in plaintext.** Any single XSS vulnerability compromises everything.

### No Server-Side Authorization
Every permission check happens in client-side JavaScript. The Firestore rules provide basic document-level access control by company, but there is no role-based access control enforced server-side. Users can self-elevate to any role.

### No Content Security Policy
Without CSP headers, the browser cannot prevent inline script execution, unauthorized script loading, or data exfiltration to external domains.

---

## 6. Remediation Roadmap

### Phase 1 — Immediate (This Week)
| Priority | Action | Effort |
|----------|--------|--------|
| 1 | **Rotate the exposed Anthropic API key** and scrub from git history | 1 hour |
| 2 | **Implement Firebase Admin token verification** in `api/claude.js` | 2 hours |
| 3 | **Restrict CORS** to your domain in `api/claude.js` | 30 min |
| 4 | **Remove client-side API key storage** — proxy all AI calls through backend | 4 hours |

### Phase 2 — Urgent (Week 1-2)
| Priority | Action | Effort |
|----------|--------|--------|
| 5 | **Add DOMPurify** and sanitize all `innerHTML` usage | 1 day |
| 6 | **Add Content-Security-Policy** headers in `vercel.json` | 2 hours |
| 7 | **Move quota/tier enforcement to backend** (Cloud Functions or Firestore rules) | 1 day |
| 8 | **Add Firestore rules validation** (required fields, types, lengths) | 4 hours |
| 9 | **Enforce email verification** before granting access | 1 hour |
| 10 | **Add HMAC webhook signature verification** | 4 hours |

### Phase 3 — High Priority (Week 2-4)
| Priority | Action | Effort |
|----------|--------|--------|
| 11 | **Move sensitive data from localStorage to Firestore** | 2-3 days |
| 12 | **Implement server-side RBAC** via Firestore rules + Cloud Functions | 2 days |
| 13 | **Add SRI hashes** to all externally loaded scripts | 2 hours |
| 14 | **Sanitize CSV imports/exports** against formula injection | 4 hours |
| 15 | **Add rate limiting** to API endpoints and AI inference | 4 hours |
| 16 | **Validate webhook URLs** against SSRF (block private IPs) | 2 hours |

### Phase 4 — Hardening (Month 2)
| Priority | Action | Effort |
|----------|--------|--------|
| 17 | Add pagination to all Firestore reads | 4 hours |
| 18 | Replace `Math.random()` with `crypto.getRandomValues()` for IDs | 2 hours |
| 19 | Add prototype pollution guards | 2 hours |
| 20 | Implement audit logging on server-side | 1 day |
| 21 | Add data export watermarking and access control | 1 day |
| 22 | Implement consent management for analytics | 4 hours |

---

## 7. Full Findings Table

| ID | Severity | Category | File(s) | Summary |
|----|----------|----------|---------|---------|
| C1 | CRITICAL | Credentials | FIREBASE_SETUP.md | Exposed Anthropic API key |
| C2 | CRITICAL | Auth | api/claude.js | No token verification |
| C3 | CRITICAL | XSS | 10+ files | innerHTML with unsanitized input |
| C4 | CRITICAL | AuthZ | team-collaboration.js, user-tiers.js | Client-side-only access control |
| C5 | CRITICAL | Credentials + CORS | config.js, api/claude.js | API keys in browser + CORS wildcard |
| H1 | HIGH | Credentials | webhook-integration.js | Webhook secrets in localStorage |
| H2 | HIGH | Auth | webhook-integration.js | No HMAC webhook verification |
| H3 | HIGH | SSRF | spreadsheet-sync.js | Unrestricted URL fetching |
| H4 | HIGH | Injection | batch-import.js | CSV formula injection |
| H5 | HIGH | Injection | sensory-inference.js | Prototype pollution |
| H6 | HIGH | Supply Chain | lazy-loader.js | No SRI on dynamic scripts |
| H7 | HIGH | Privacy | consumer-panel.js, team-collaboration.js, photo-manager.js | PII in plaintext localStorage |
| H8 | HIGH | AuthZ | export-controller.js | No auth check on exports |
| H9 | HIGH | XSS | comments-ui.js | URL regex injection |
| H10 | HIGH | Crypto | recipe-tracker.js | Predictable Math.random() IDs |
| H11 | HIGH | Config | demo-mode.js | Demo/prod data mixing |
| H12 | HIGH | Privacy | ai-chat.js | Full portfolio in every API call |
| H13 | HIGH | Validation | firestore.rules | No write validation |
| H14 | HIGH | DoS | firestore-data.js | No pagination on reads |
| H15 | HIGH | Auth | auth.js | Unverified emails get full access |
| H16 | HIGH | Auth | firestore-data.js | Predictable company IDs |
| M1 | MEDIUM | Headers | vercel.json | Missing security headers |
| M2 | MEDIUM | CSRF | app.js | No CSRF tokens |
| M3 | MEDIUM | Logging | auth.js | PII in console logs |
| M4 | MEDIUM | Privacy | consumer-panel.js | Individual respondent data stored |
| M5 | MEDIUM | Storage | approval-workflow.js | Unencrypted approval data |
| M6 | MEDIUM | Privacy | analytics.js | No consent mechanism |
| M7 | MEDIUM | Info Disclosure | FIREBASE_SETUP.md | Local paths in docs |
| M8 | MEDIUM | Privacy | photo-ai.js | Photos sent to external API |
| M9 | MEDIUM | Info Disclosure | sensory-inference.js | Internal errors exposed |
| M10 | MEDIUM | Validation | api/claude.js | Incomplete request validation |
| M11 | MEDIUM | Storage | spreadsheet-sync.js | Sheet IDs in localStorage |
| M12 | MEDIUM | UX/Privacy | barcode-scanner.js | No camera permission context |
| M13 | MEDIUM | Exposure | barcode-scanner.js | Data on window object |
| M14 | MEDIUM | Validation | multiple | Unsafe JSON.parse |
| M15 | MEDIUM | DoS | auto-processor.js | No rate limiting |
| M16 | MEDIUM | Validation | auto-processor.js | Missing import validation |
| M17 | MEDIUM | Privacy | pdf-export.js | Business data in PDFs |
| M18 | MEDIUM | SSRF | webhook-integration.js | No URL validation |
| L1 | LOW | Config | firebase-config.example.js | Empty example file |
| L2 | LOW | CSP | multiple | Inline event handlers |
| L3 | LOW | Cache | service-worker.js | No cache clear on logout |
| L4 | LOW | Transport | all | No explicit HTTPS enforcement |
| L5 | LOW | Reliability | auto-processor.js | No async timeouts |
| L6 | LOW | Privacy | camera-integration.js | No consent logging |
| L7 | LOW | Performance | app.js | Hardcoded sample data |
| L8 | LOW | Config | demo-mode.js | Realistic demo data |

---

## Methodology

- **Static analysis** of all 80+ source files
- **Firestore security rules** review
- **API endpoint** review (Vercel serverless function)
- **Client-side storage** audit (localStorage patterns)
- **Data flow** tracing (input -> storage -> display -> export)
- **Documentation** review for leaked credentials

---

*This report is for internal use. Address Critical and High findings before any production deployment with real user data.*
