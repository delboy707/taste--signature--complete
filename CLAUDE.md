# CLAUDE.md — QEP Taste Signature Project

Operating notes for working with Claude on this project.
Read this first whenever starting a new session.

---

## Project identity

- **Repo:** `delboy707/taste--signature--complete` (note: **double dashes**)
- **Local path:** `~/Desktop/taste-signature-PROD/`
- **Live URL:** https://signature.qeptss.com (Vercel). `qeptastesignature.com`
  308-redirects here now (legacy domain, mostly dead); bare apex domain is
  optional/unused. Update any stale `qeptastesignature.com` references you find.
- **Other project on this laptop:** `~/Desktop/freshlife-app/` (separate FRESHLife project, do NOT confuse with taste-signature)

## Tech stack

- Vanilla JS, no framework
- Firebase / Firestore (auth + data)
- Chart.js (visualization)
- jsPDF + SheetJS (export)
- Anthropic Claude API via serverless proxy (`api/`, env: `ANTHROPIC_API_KEY`)
- Wistia for demo video (media-id: `h2e5wwqxdf`)
- Hosted on Vercel; deploys auto-trigger on push to `main`

---

## Auth architecture (Clerk-in-front, added 2026-07-15)

Auth UI lives on the Clerk-hosted portal (`qep-portal` repo, `signature.qeptss.com`
registered in its `allowedRedirectOrigins`), not in this app. Flow:

1. `auth.js`'s Clerk gate (`runClerkGate()`) loads ClerkJS from `clerk.qeptss.com`,
   checks for a session and `publicMetadata.provisioned === true`. No session ->
   show the sign-in card (not a redirect - avoids a false "initialization failed"
   error on every signed-out load). Not provisioned -> redirect to the portal.
2. On success, the Clerk session token is exchanged via `POST /api/firebase-token`
   for a Firebase custom token; `signInWithCustomToken()` starts a normal Firebase
   session and the existing `onAuthStateChanged` / `showApp()` path runs unchanged.
3. `/api/firebase-token` auto-provisions Firestore on first sign-in inside a
   transaction (create-if-missing on `users/{uid}`): `companies/{companyId}` with
   the legacy shape (`companyName`/`industry`/`companySize`/`ownerId`) and
   `users/{uid}` with `role: 'owner'`.
4. The old client-side auto-provisioning path in `firestore-data.js` is neutered
   to a `console.warn` + failure return - it should never fire now that the
   server provisions first. If it ever does fire, that's a signal the server
   path failed, not something to silently paper over.
5. Demo mode (`taste_demo_mode_active` in localStorage) bypasses the Clerk gate
   entirely and is checked before any Clerk call - it never redirects.

---

## Data shape — read before editing

### Product IDs are floats, not integers

Product IDs are generated as `Date.now() + Math.random()`,
producing values like `1777019020364.0994`. HTML form values are always strings,
so any `parseInt(value)` against a product ID **silently truncates the decimal**
and breaks `.includes()` / strict-equality lookups. **Always use `parseFloat`
for product IDs.**

`parseInt` IS correct for slider values (0-10 integer scale).

### Slider defaults

All sliders default to `0`, set via `defaultValue: 0` in the data structure.
UI/validation layers must not override this.

### Lexicon

The emotion + sensory attribute lexicon was expanded across 6 stages:
Appearance, Aroma, Front of Mouth, Mid/Rear Mouth, **Texture** (added),
Aftertaste. Texture-stage uniqueness — when iterating over stages,
include `'texture'` in `stageKeys`.

### `experience.stages` shape (confirmed 2026-07-15)

`experience.stages` is a **plain object**, not an array - 7 fixed keys:
`appearance`, `aroma`, `frontMouth`, `midRearMouth`, `texture`, `aftertaste`,
`overall`. Canonical id->label map is `window.SENSORY_STAGES`
(`sensory-attributes.js`).

Each stage object holds two kinds of fields, built in `app.js` when an
experience is saved:
- A variable number of **numeric attribute fields** (integers 0-10), one per
  lexicon attribute for that stage, keyed by `attrIdToKey(attr.id)`
  (`sensory-attributes.js`) - e.g. lexicon id `visual-appeal` -> field key
  `visualAppeal`. No fixed set of names; differs per stage.
- An **`.emotions` object**, keyed by emotion name, integers 0-10, one entry
  per emotion slider for that stage regardless of whether it was moved from 0.

`overall` only ever has `.emotions` - no numeric attribute fields anywhere
in the codebase touch it.

To iterate correctly: `Object.entries(experience.stages)`, and for a given
stage's numeric attributes, `Object.entries(stageData).filter(([k, v]) =>
k !== 'emotions' && typeof v === 'number')`. `export-reporting.js` now has
this as reusable helpers (`getStageLabel`, `getStageAttributeEntries`,
`getAttributeLabel`, `getPresentEmotions`) - reuse them rather than
re-deriving the pattern. `.stages.forEach`/`.find`/`.flatMap` anywhere is a
bug signal (array methods on a plain object) - see Known issues below for
what that cost us.

---

## Working discipline

### Patch scripts only — no full-file rewrites

Full-file rewrites of large files (`app.js`, `index.html`, `industry-benchmarks.js`)
break Claude Code connections silently. Always use targeted edits:
- `sed -i ''` for single-line substitutions
- `perl -i -0pe` for multi-line edits
- Line-number deletions (`sed -i '' '32,38d'`) when text contains
  emoji or other paste-fragile characters
- One feature / fix per commit, SW VERSION bumped each time

### Always create a `.bak` before editing

Pattern: `cp file file.<descriptive-tag>.bak` before any in-place edit.
Delete `.bak` files only after the change is verified live.

### File-integrity verification — MANDATORY after every patch

Lesson learned the hard way: at ~93% disk capacity, APFS pressure caused
`git` to silently commit a partially-read truncated `industry-benchmarks.js`.
A presence-grep for new content **passed**, because the new content WAS
present — but the file ended mid-statement. Hours were lost chasing
schema-shape symptoms when the real bug was truncation.

**After every patch, before any commit, verify ALL of:**

```bash
tail -3 <file>          # confirms file end is intact
node -c <file>          # confirms JS syntax is valid (skip for HTML)
wc -l <file>            # confirms line count is reasonable
grep -c "<expected>"    # confirms new content is present
grep -c "<old>"         # confirms old content is gone
```

A presence-grep alone is **not** sufficient. Truncation can produce a file
where the new content exists AND the file is broken.

### Disk hygiene before patching

Target **20+ GiB free** before any patch session. Below ~11 GiB, APFS
slowdown causes both file-truncation risk AND terminal weirdness
(stuck `>` continuation prompts, silent paste fragmentation,
multi-line commands half-executing). Both failure modes are silent.

### Multi-line bash paste failure mode

Lesson learned this session: long multi-command shell blocks pasted from
chat can fragment when terminal state is already unhealthy
(open continuation prompt, unclosed quote, disk pressure). The visible
output looks normal, but some commands never executed.

**Mitigations:**
- Verify outcome of each command separately, not just at the end of a block
- After multi-command blocks, run an independent verification block
- If terminal looks weird, `Ctrl+C` to a clean prompt before continuing
- For commands with tricky quoting, prefer `#` or `|` as `sed` delimiters
  over `/`, and prefer line-number sed (`'32,38d'`) over content-match
  sed when the content contains emoji or smart quotes

### Chat-rendered links are not real filenames

In this chat interface, filenames like `CLAUDE.md` and code references
like `e.id` get auto-rendered as markdown links: `[CLAUDE.md](http://CLAUDE.md)`.
The brackets and URL are display-only — your source files are clean.
When pasting commands from chat, drop the bracket/URL wrapper.

### Deployment

- Stripe is NOT needed for trial enforcement. Firebase / Firestore
  handles trial access natively. Stripe only enters at paid conversion.
- Use DOMPurify, not manual escaping, for any `innerHTML` usage.
- Sensory attribute "Compressive Resistance" / "Kokumi" etc. shown via
  tooltip — consumer-facing label is the primary display text.

---

## Glossary of session-specific terms

- **AskMeAnyQuestions** — Derek's signal to invite clarifying questions
  before major research or implementation tasks
- **Agent Teams** — Claude Code with parallel sub-agents, the primary
  implementation workflow

---

## Known issues (non-blocking, 2026-07-15)

- **Console noise, harmless:** `.js.map` fetches get blocked by CSP
  `connect-src` (DevTools-only source-map requests) and the service worker's
  `FetchEvent` throws a `TypeError` on those same blocked requests. Neither
  affects real users; don't chase it as a bug.
- **Dead code:** `getCompanySettings()` in `firestore-data.js` has no
  callers anywhere in the codebase. The old login/signup/forgot-password
  form-handler functions in `index.html` (`showLoginForm`, `showSignupForm`,
  `showForgotPasswordForm`, `showResendVerification`, `clearAuthMessages`)
  are unreachable now that their only call sites were removed with the
  Clerk cutover - harmless, left in place rather than chased down.
- **This repo lives on `~/Desktop/`, which is iCloud-synced.** Combined with
  low disk space this caused `git status`/`git diff` to hang for real
  (confirmed via `git ls-remote` + `git rev-parse HEAD` working fine while
  tree-scanning commands hung) and left `.git/index 2.lock` /
  `.git/refs/remotes/origin/main.lock` debris behind from interrupted
  processes. `git log -S"<string>"` (content search across history) hangs
  the same way; plain `git log --oneline -- <path>` stays fast. Consider
  moving the repo to `~/dev/` (or anywhere outside iCloud Desktop sync)
  post-launch.
- **`qep-portal`'s own CLAUDE.md (separate repo) still documents the
  pre-Clerk `middleware.ts` setup** - it wasn't updated when this app's
  auth moved to Clerk-in-front. Needs a pass if anyone relies on it for
  onboarding context.
- **PDF/Excel exports were silently broken until 2026-07-15.**
  `export-reporting.js`/`export-reporting-ui.js` treated `experience.stages`
  as an array (`.forEach`/`.find`/`.flatMap`) - see the shape note above -
  which threw before `document.write()` and left blank `about:blank`
  popups for the per-product "PDF Report", "Bulk PDF Reports", and
  "Portfolio Summary PDF" buttons, plus silently wrong output from all
  three Excel-export functions. Fixed by migrating to the real object-keyed
  shape and wrapping every `window.open()` path in try/catch with
  `showExportNotification(..., 'error')` on failure instead of a stranded
  window. One interpretive call made in the fix: `getPresentEmotions()`
  treats any emotion rated `> 0` as "present" for display - the old broken
  code implied a curated selection, which the current dense
  every-slider-gets-a-value data can't distinguish from "rated low."
  Revisit the threshold if generated reports look noisy.
- **Emergency cache-nuke IIFE removed from `index.html` (2026-07-15).** It
  deleted every Cache Storage bucket on every page load - added at some
  point before this session; origin commit not findable, `git log -S` hangs
  under current disk pressure (see above). It fought the network-first SW
  strategy `CACHE_FIX_SUMMARY.md` documents, and would have silently
  stripped the `offline.html` precache added this session on every load.
  If stale-cache complaints resurface, bump `service-worker.js`'s
  `VERSION` - don't resurrect this.
- **Commits can land outside a Claude session's visibility.** More than
  once this session, work Claude had written to disk turned up already
  committed (and pushed) in `git log` without Claude having run `git`
  itself - Derek working in a parallel terminal. Don't assume "I didn't
  commit it" means "it's not committed"; check `git log`/`git status`
  before reporting on deployment state.

## On the horizon (post-current-session)

- Firestore Security Rules + React client-side checks for trial access
- Per-user rate limiting on the Anthropic API proxy
- CSP hardening (remove `unsafe-inline`)
- `api/claude.js` forwards the client-supplied `model` string with no
  allowlist - hardening candidate. The model string itself lives in
  `claude-api.js:7` only (not duplicated in `api/claude.js`).
- Tier 1 onboarding walkthrough (incognito Chrome + plus-addressed Gmail)
- Beta launch infra: feedback mechanism, welcome email, rate limits
- Pricing: ~$1k/mo or ~$8k/yr enterprise tiers
- LinkedIn DM beta campaign (~20 contacts; The Missing Layer / Honest
  Invitation / Provocation variants, ~60/25/15 split)
