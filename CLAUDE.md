# CLAUDE.md — QEP Taste Signature Project

Operating notes for working with Claude on this project.
Read this first whenever starting a new session.

---

## Project identity

- **Repo:** `delboy707/taste--signature--complete` (note: **double dashes**)
- **Local path:** `~/Desktop/taste-signature-PROD/`
- **Live URL:** https://qeptastesignature.com (Vercel)
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

## On the horizon (post-current-session)

- Firestore Security Rules + React client-side checks for trial access
- Per-user rate limiting on the Anthropic API proxy
- CSP hardening (remove `unsafe-inline`)
- Tier 1 onboarding walkthrough (incognito Chrome + plus-addressed Gmail)
- Beta launch infra: feedback mechanism, welcome email, rate limits
- Pricing: ~$1k/mo or ~$8k/yr enterprise tiers
- LinkedIn DM beta campaign (~20 contacts; The Missing Layer / Honest
  Invitation / Provocation variants, ~60/25/15 split)
