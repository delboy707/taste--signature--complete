# Incremental-save migration - rollout runbook

Status (2026-09-24): rollout complete. The allowlist gate and the legacy
save path have been removed - incremental save is the only save path.
This document is kept as the design and rollout record; the sections on
the gate describe how it worked while it existed. It
reflects the design after reconciling against the ACTUALLY deployed
`firestore.rules` (originally reconciled by hand against the Firebase
console, revision Nov 28 2025 11:13 AM; the checked-in `firestore.rules`
was deployed on 2026-09-23 and is what is live).

## Files that matter here

- `firestore.rules` - what is deployed (deployed 2026-09-23); the source
  of truth. Confirm a branch does not change it with
  `git diff origin/main -- firestore.rules` before every merge; it should
  print nothing unless a rules change is the point of the branch.
- `firestore.rules.hardening-proposal` - the three rule tightenings that
  used to be silently baked into the repo's `firestore.rules` (never
  actually deployed). Pulled out into their own file, clearly marked as
  a proposal, not applied anywhere. Deploy only as its own deliberate,
  separately-reviewed change if it's ever wanted.
- `incremental-save-config.js` - REMOVED 2026-09-24 (it was the rollout
  gate, see below).
- `scripts/export-experiences-backup.js` - the pre-migration backup.

## What changed, in one paragraph

`saveExperiences()` no longer deletes every experience doc and recreates
all of them under fresh random ids on every save. It now upserts only
what changed, keyed by a deterministic doc id (`String(experience.id)`).
Deletion only ever happens via the explicit `deleteExperience()` /
`clearAllData()` calls the user's own delete actions make - never
inferred from a save, and a stale write against an already-deleted doc
is now handled softly (see "NOT_FOUND handling" below), not as a save
failure. A one-time migration moves any pre-existing
`exp_<timestamp>_<index>`-scheme docs to the new scheme, and is
idempotent if interrupted partway through. During the rollout all of this
was gated by an explicit per-company allowlist; that gate has since been
removed - see "Rollout gate (retired)".

## Rollout gate (retired)

While rolling out, `incremental-save-config.js` held an
`ALLOWLISTED_COMPANY_IDS` array: a company not on it got
`_saveExperiencesLegacy()` (the original delete-all/reinsert-all code), and
merging was not a behavior change for anyone until a companyId was added.

On 2026-09-24 the only remaining company (`MTOiWl6wdifnVNOqKMHJ`) was fully
migrated (0 legacy `exp_` docs), so the gate, `isIncrementalSaveEnabled()`,
`_saveExperiencesLegacy()`, `incremental-save-config.js` and its `<script>`
tag were deleted. Every company now gets deterministic ids and no-op
resaves; the emulator suite proves a fresh company gets that with no
config. The migration code for `exp_` docs stays, so a restored backup
still migrates on its first save. `loadExperiences()` now reads the whole
collection in pages instead of `limit(500)`.

## Rules: no deploy needed

`firestore.rules` on this branch is byte-identical to what's live. **Zero
rules changes ship with this migration.** Two things made that possible:

1. **No client-side backup collection.** An earlier draft wrote a backup
   to `companies/{id}/experiences_backup_{date}` before deleting legacy
   docs, which needed a new rule to allow it. Removed - see "Backup"
   below for what replaces it.
2. **`addedBy` is preserved without a rules change.** Live's `experiences`
   create rule requires `request.resource.data.addedBy == request.auth.uid`,
   so a doc migrated by a different user than its original creator can't
   be freshly created with the original author's id - that write would be
   rejected. Fixed by writing it in two steps: create with `addedBy` = the
   user actually running the migration (satisfies the create rule), then
   a separate `update()` call correcting `addedBy` back to the true
   original author (live's update rule has no field restrictions at all,
   so this is unconditionally allowed). Confirmed empirically against the
   emulator + the real rules (test 3a), and confirmed idempotent if the
   process crashes between the two steps (a separate test simulates
   exactly that half-migrated state and confirms the next run repairs it).

The three rule tightenings that used to live inside the repo's own
`firestore.rules`, undeployed, are now isolated in
`firestore.rules.hardening-proposal` - a proposal, not part of this
migration, deploy separately if wanted:
1. `companies` update restricted to the owner (live allows any member).
2. `experiences` create validates `productInfo` shape/length.
3. `experiences` update requires `updatedBy` (live has no field check at
   all on update).

## NOT_FOUND handling (a stale doc must never fail unrelated edits)

If a doc was deleted (by another tab, or a teammate) since this instance
last knew about it, `saveExperiences()` writes it with `.update()`,
which throws `not-found` instead of silently recreating it. That failure
is now isolated per-document: the containing batch is retried op-by-op
only when it fails with `not-found`, so the one stale doc is captured in
the result's `orphanedIds` array while every other change in the same
save still lands. `app.js`'s `saveData()` drops those ids from the local
`experiences` array, shows a non-blocking toast ("This test was deleted
by a teammate."), and re-renders - the save is still reported as
`success: true` overall.

## Backup: what actually happens, given the Spark plan

The project is on Spark (no scheduled/managed Firestore export).
Recommended: run **`scripts/export-experiences-backup.js`** once,
locally, before any rollout step that could change or migrate
production data:

```bash
FIREBASE_SERVICE_ACCOUNT_PATH=/absolute/path/outside/this/repo/service-account.json \
  node scripts/export-experiences-backup.js
```

The env var is required (no implicit credential fallback) and the script
refuses to run if the resolved key path is inside this repo's working
tree, even before `.gitignore` would ever get a chance to matter -
verified by `test/backup-script.test.js`. Writes one JSON file per
company to `./backups/<companyId>.json` (gitignored). Uses the Admin
SDK, so it bypasses Firestore rules entirely - no rules change needed
for it either - and is read-only against Firestore.

## Known, accepted limitations

- **Migration is per-manager-instance.** `_migrationChecked` lives on the
  `FirestoreDataManager` instance, not persisted anywhere shared. Two
  tabs open at once will both attempt migration independently - verified
  safe (test 3b) and verified idempotent if one attempt is interrupted
  partway through, but it means migration work can be duplicated across
  tabs rather than coordinated.
- *(Resolved 2026-09-24)* The 500-doc read cap in `loadExperiences()` is
  gone: it now reads the whole collection in pages of 500.

## Test results (Firestore + Auth emulators only, real `firestore.rules`,
no real project)

Originally 14/14 pure unit tests and 16/16 emulator tests; as of
2026-09-24 `npm run test:emulator` runs 31 tests (the table below lists the
original rollout tests plus the ones changed when the gate was removed):

| # | Test | Result |
|---|---|---|
| 1 | Edit 1 of 3 -> exactly 1 write | PASS |
| 2 | No-op save after load -> 0 writes | PASS |
| 3 | Delete 1 -> exactly 1 doc removed | PASS |
| 4 | `clearAllData` wipes the collection | PASS |
| 5 | Old-scheme migration: clean removal, no backup write | PASS |
| 6 | Migration preserves original author when a different user runs it (3a) | PASS |
| 7 | Migration crash between create and addedBy-correction repairs on next run (idempotent) | PASS |
| 8 | Concurrent migration by two instances, no dupes/loss (3b) | PASS |
| 9 | 600 docs -> correct multi-batch chunking | PASS |
| 10 | Second tab adds while first tab saves an edit | PASS |
| 11 | Tab A deletes, tab B edits the stale copy and saves - orphaned, not resurrected (3c) | PASS |
| 12 | One stale doc must never fail an unrelated edit in the same save | PASS |
| 13 | Failure injection -> real `PERMISSION_DENIED`, full array in localStorage | PASS |
| 14 | Retest chain survives save/reload | PASS |
| 15 | *(Retired 2026-09-24)* Rollout gate: non-allowlisted company gets the OLD legacy behavior | removed with the gate |
| 16 | A fresh company gets incremental behaviour with no config at all (replaced the allowlist-gate test) | PASS |
| 17 | Loading 600 experiences returns all 600 (paged load, no 500-doc truncation) | PASS |
| 18 | A doc with no `updatedAt` (e.g. restored from a backup) still loads | PASS |

## Rollout steps

1. Run `scripts/export-experiences-backup.js` against production (Derek,
   real credentials, key outside the repo). Confirm `./backups/*.json`
   looks sane (spot-check a company's file against the Firebase console).
2. Code review this branch's diff. `firestore.rules` should show **zero**
   diff against the deployed rules - confirm with
   `git diff origin/main -- firestore.rules` before merging, not just by
   eye.
3. *(Done)* Merged to `main` with the allowlist empty - a
   no-behavior-change merge. No rules deploy step.
4. *(Done)* One real company (`MTOiWl6wdifnVNOqKMHJ`) was allowlisted and
   verified: saves land with deterministic ids, a no-edit resave writes
   nothing, and its 10 legacy docs migrated cleanly.
5. *(Done 2026-09-24)* The other companies were removed from production
   and the gate itself was deleted; there is no allowlist left to widen.

## Rollback steps

The allowlist rollback described in earlier revisions of this document no
longer exists. To undo the gate removal, revert the
`feat/incremental-default` commits and redeploy - that restores the gate
(empty allowlist, i.e. every company on the legacy path) and the
`limit(500)` load. A company already migrated stays on the new doc-id
scheme either way. If a company's data looks actually wrong, restore its
`backups/<date>/<companyId>.json` (from `scripts/backup-and-audit.js`, or
the older `scripts/export-experiences-backup.js`) with a one-off Admin SDK
script (not written - only needed if this is actually hit).

## Vercel / `api/` impact

- `package.json` `dependencies` (`@clerk/backend`, `firebase-admin`,
  `lucide`) are **unchanged** - byte-identical diff against `main`.
- `firebase` and `firebase-tools` were added under **`devDependencies`**
  only, for the test suite.
- Neither `api/claude.js` nor `api/firebase-token.js` import `firebase` or
  `firebase-tools` (confirmed by grepping both files' `require()` calls).
  Vercel's function bundler traces actual `require()` usage per function,
  so these devDependencies are never included in either deployed function
  regardless of the `dependencies`/`devDependencies` split. The only
  effect is a slightly longer `npm install` during Vercel's build step
  (more packages to resolve); no runtime or correctness impact.
