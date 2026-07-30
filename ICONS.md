# Emoji inventory — Taste Signature codebase

Generated 2026-07-30 from `emoji-hits.tsv`.

**Scope:** 748 emoji hits across 110 unique emojis (U+FE0F variation
selector excluded — 71 occurrences, invisible modifier, not counted).

---

## A. STRUCTURAL UI — 57 unique emojis, 460 hits

Nav items, buttons, section headers, toolbar controls, tooltip markers.

| Emoji | Hits | Primary role |
|-------|------|-------------|
| ℹ | 145 | Tooltip marker (tech-term-icon on sensory sliders) |
| 📊 | 26 | Nav icon, section/chart headers |
| 🔄 | 18 | Refresh/sync buttons, pending-status icon |
| 🤖 | 16 | AI feature nav icon, button labels |
| 🗑 | 15 | Delete buttons |
| 💡 | 15 | Tips/insights icon |
| ⚡ | 14 | Quick-action nav icon, section headers |
| ✕ | 13 | Modal close / dismiss buttons |
| 📋 | 12 | Clipboard/copy buttons, section headers |
| 🎯 | 12 | Targeting/goals nav icon |
| 📈 | 11 | Analytics nav icon, section headers |
| 👥 | 11 | Team/consumer section headers |
| ➕ | 10 | Add buttons |
| 📄 | 9 | Document/report buttons |
| 📦 | 8 | Batch/package section headers |
| 📥 | 8 | Import/download buttons |
| 📤 | 7 | Export/share buttons |
| 📝 | 6 | Form/edit section headers |
| ✏ | 6 | Edit buttons |
| 💬 | 5 | Comments section header, reply buttons |
| 💫 | 5 | Signature/portfolio nav icon |
| 👁 | 5 | View buttons, appearance-stage header |
| 🎓 | 5 | Tutorial icon |
| ⚙ | 5 | Settings gear |
| 📚 | 4 | Reference/library nav icon |
| 🔍 | 4 | Search icon |
| 🏆 | 4 | Benchmarks/ranking header |
| 🔬 | 4 | Analyst/comparison section headers |
| ❓ | 4 | Help menu item |
| 🎨 | 3 | Customisation nav icon |
| 🧪 | 3 | Experiment/test nav icon |
| 🕐 | 3 | Shelf-life section header |
| 📱 | 3 | Mobile/PWA icon |
| 👤 | 3 | User profile icon |
| 🔑 | 3 | Permissions/API-key icon |
| ⭐ | 3 | Top-performer / rating icon |
| ✨ | 3 | Tier indicator, sparkle accent |
| ⚖ | 3 | Comparison nav icon |
| ☰ | 2 | Hamburger menu toggle |
| 🚀 | 2 | Launch/import button |
| 🔔 | 2 | Notification bell |
| 📌 | 2 | Pinned/default status icon fallback |
| 📁 | 2 | Folder icon |
| 👋 | 2 | Welcome section header |
| 🎬 | 2 | Video/getting-started header |
| 📹 | 1 | Video section title |
| 📡 | 1 | Offline page icon |
| 📖 | 1 | Reference section header |
| 📍 | 1 | Location marker |
| 🏭 | 1 | Industry section header |
| 🚪 | 1 | Logout button |
| 🔒 | 1 | Unshared/locked icon |
| 🚫 | 1 | Member-removed icon |
| 👑 | 1 | Owner role badge |
| 💾 | 1 | Save button |
| 🗺 | 1 | Preference-map header |
| 💨 | 1 | Test-runner section header |

**Files (33):**
index.html, app.js, recipe-tracker-ui.js, batch-import-ui.js,
onboarding.js, export-reporting-ui.js, search-filter.js,
approval-workflow-ui.js, activity-feed-ui.js, video-player.js,
chat-ui.js, temporal-analysis-ui.js, consumer-panel-ui.js,
industry-benchmarks-ui.js, custom-lexicon-ui.js,
team-collaboration-ui.js, comments-ui.js, ui-utils.js,
push-notifications.js, tutorial.js, quick-entry.js,
need-state-questionnaire.js, templates-manager.js, user-tiers.js,
config.js, config.example.js, mobile-menu.js, offline.html,
mobile-responsive.css, ui-polish.css, styles.css, test-runner.html,
fix-benchmarks-compare.js

---

## B. STATUS IN UI — 4 unique emojis, 171 hits

Success/error/warning feedback shown to the user on screen.
These four emojis also appear inside `console.log` — see split below.

| Emoji | Total | B (user-visible) | C (console/tests) | Other |
|-------|-------|-------------------|--------------------|-------|
| ✅ | 89 | 42 | 46 | 1 (nav icon, A) |
| ❌ | 54 | 37 | 17 | — |
| ⚠ | 23 | 14 | 8 | 1 (icon constant, A) |
| 🎉 | 5 | 4 | — | 1 (reaction list, D) |

### ✅ B/C split detail

**B — 42 hits (user-visible):**
Alerts (15): team-collaboration-ui.js (8), approval-workflow-ui.js (3),
app.js (2), need-state-questionnaire.js (1), comments-ui.js (1),
templates-manager.js (1).
Notifications (5): export-controller.js (5 `showExportNotification` calls).
Inline status (12): team-collaboration-ui.js permission lists (8),
batch-import-ui.js validation/result UI (5 — one shared with ⚠ ternary),
index.html success icon (1), chat-ui.js tier indicator (1),
temporal-analysis-ui.js status icon (1).
Other UI (9): recipe-tracker-ui.js comparison header (1),
activity-feed-ui.js icon mapping (1), approval-workflow-ui.js status
map + button (2).
Nav icon (1): index.html:459 — classified A.

**C — 46 hits (console.log / developer tool):**
console.log (39): firestore-data.js (9), mobile-menu.js (4),
video-player.js (4), push-notifications.js (4), app.js (4),
index.html (3), service-worker.js (2), demo-mode.js (2),
templates-manager.js (2), claude-api.js (1), chat-ui.js (1),
user-tiers.js (1), excel-import.js (1), export-controller.js (1).
test-runner.html (7): `showResult()` calls in developer test UI.

### ❌ B/C split detail

**B — 37 hits:** team-collaboration-ui.js (12), export-controller.js (10),
approval-workflow-ui.js (5), batch-import-ui.js (4),
comments-ui.js (3), app.js (1), activity-feed-ui.js (1),
recipe-tracker-ui.js (1).

**C — 17 hits:** test-runner.html (8), index.html (4), app.js (2),
push-notifications.js (1), config.example.js (1), mobile-menu.js (1).

### ⚠ B/C split detail

**B — 14 hits:** batch-import-ui.js (6), app.js (4),
push-notifications.js (2), temporal-analysis-ui.js (1),
claude-api.js (1).

**C — 8 hits:** test-runner.html (3), push-notifications.js (1),
firestore-data.js (2), config.example.js (1), index.html (1).

**A — 1 hit:** ui-utils.js icon constant.

**Files containing B-context status emojis (16):**
export-controller.js, batch-import-ui.js, approval-workflow-ui.js,
team-collaboration-ui.js, index.html, app.js, chat-ui.js,
temporal-analysis-ui.js, need-state-questionnaire.js, comments-ui.js,
templates-manager.js, recipe-tracker-ui.js, activity-feed-ui.js,
claude-api.js, push-notifications.js, tutorial.js

---

## C. DEVELOPER OUTPUT — 2 unique emojis, 4 hits

Inside console.log, comments, or test assertions. Never seen by a user.

| Emoji | Hits | Context |
|-------|------|---------|
| 🎭 | 3 | console.log demo-mode markers (app.js ×2); also 1 B hit in demo-mode.js banner |
| 👇 | 1 | Code comment in config.example.js |

Note: The bulk of developer-context emoji hits (71 total) come from ✅/❌/⚠
used inside `console.log` and `test-runner.html`. Those emojis are classified
B above; the C-context hit counts are broken out in the split tables.

---

## D. CONTENT — 39 unique emojis, 59 hits

Food categories, expressive faces, body-part sensory markers, emotion
descriptors, need-state icons, reaction emojis. Meaningful imagery.

**Food categories (18 emojis, 30 hits):**
🍫(4) 🍺(3) 🥤(3) ☕(2) 🍷(2) 🧀(2) 🥛(2) 🥄(2) 🍽(1)
🍿(1) 🍪(1) 🍦(1) 🥨(1) 🥫(1) 🥖(1) 🥃(1) 🧃(1) 🍞(1)
Files: quick-entry.js, onboarding.js, custom-lexicon-ui.js,
batch-import-ui.js

**Expressive faces (6 emojis, 7 hits):**
😊(2) 😄(1) 😌(1) 🤤(1) 😮(1) 😂(1)
Files: quick-entry.js, comments-ui.js

**Body-part sensory markers (2 emojis, 2 hits):**
👃(1) 👅(1)
Files: batch-import-ui.js

**Emotion descriptors (6 emojis, 6 hits):**
🛋(1) 💎(1) 🕰(1) 🎩(1) 🧐(1) 💧(1)
Files: quick-entry.js

**Need-state icons (3 emojis, 6 hits):**
🎁(3) 🌅(2) 🌴(1)
Files: quick-entry.js, need-state-questionnaire.js, batch-import-ui.js

**Reaction/social emojis (4 emojis, 8 hits):**
🔥(4) 👍(2) 👏(1) ❤(1)
Files: comments-ui.js, quick-entry.js, index.html, app.js

---

## E. TYPOGRAPHIC — 8 unique emojis, 54 hits

Arrows and check/cross marks used inside sentences, labels, CSS content
properties, or tabular data — not standalone icons.

| Emoji | Hits | Context |
|-------|------|---------|
| → | 18 | "Continue →", "View all →", "Appearance → Aftertaste", date ranges, code comments |
| ✓ | 16 | CSS `content:` pseudo-elements, "Draft saved ✓", test-runner pass/fail markers |
| ← | 7 | "← Back" button labels, CSS scroll hint |
| ✗ | 7 | Test-runner fail markers ("✗ asset (Error)") |
| ↗ | 2 | Trend-direction indicator in temporal data |
| ↘ | 2 | Trend-direction indicator in temporal data |
| ⬆ | 1 | Direction arrow in comparison table |
| ⬇ | 1 | Direction arrow in comparison table |

---

## ℹ deep dive — 145 hits

All 142 occurrences in **index.html** are individually hardcoded, not
generated by a loop or template. Each is a `<span class="tech-term-icon"
title="...">ℹ</span>` attached to a sensory-attribute slider label —
one per attribute, with a unique `title` tooltip (the technical term
behind the consumer-facing label). No JS generates these; `ui-utils.js`
only handles click interaction on the existing spans.

The remaining 3:
- **ui-utils.js:24** — icon constant `info: 'ℹ'` (A)
- **claude-api.js:99** — `alert('ℹ️ Usage Alert...')` shown to user (B)
- **team-collaboration-ui.js:189** — informational label in UI (B)

**Files:** index.html (142), ui-utils.js (1), claude-api.js (1),
team-collaboration-ui.js (1)

---

## Summary

| Bucket | Unique | Hits | Description |
|--------|--------|------|-------------|
| A. Structural UI | 57 | 460 | Chrome: nav, buttons, headers, tooltips |
| B. Status in UI | 4 | 171 | Success/error/warning feedback |
| C. Developer output | 2 | 4 | console.log, comments (+ 71 cross-listed from B) |
| D. Content | 39 | 59 | Food, faces, body parts, emotions, reactions |
| E. Typographic | 8 | 54 | Arrows, check/cross marks inside text |
| **Total** | **110** | **748** | |
