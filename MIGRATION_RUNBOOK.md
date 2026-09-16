# Incremental-save migration - rollout runbook

Branch: `fix/incremental-save`. Not merged, not deployed. This document
reflects the design after reconciling against the ACTUALLY deployed
`firestore.rules` (see `firestore.rules.live`, copied by hand from the
Firebase console, revision Nov 28 2025 11:13 AM) - the repo's checked-in
`firestore.rules` had drifted from what's live and no longer does.

## Files that matter here

- `firestore.rules` - now a byte-identical copy of `firestore.rules.live`.
  Confirm this with `diff firestore.rules firestore.rules.live` before
  every merge; it should always print nothing.
- `firestore.rules.hardening-proposal` - the three rule tightenings that
  used to be silently baked into the repo's `firestore.rules` (never
  actually deployed). Pulled out into their own file, clearly marked as
  a proposal, not applied anywhere. Deploy only as its own deliberate,
  separately-reviewed change if it's ever wanted.
- `incremental-save-config.js` - the rollout gate (see below).
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
idempotent if interrupted partway through. All of this is gated by an
explicit per-company allowlist - see "Rollout gate".

## Rollout gate

`incremental-save-config.js`:

```js
const INCREMENTAL_SAVE_CONFIG = {
    ALLOWLISTED_COMPANY_IDS: []
};
```

Default is empty. A company NOT on the list gets `_saveExperiencesLegacy()`
- the original, byte-for-byte-unmodified delete-all/reinsert-all code -
completely untouched by anything in this branch, including migration
(migration only ever runs from inside the new `saveExperiences()` path,
which a non-allowlisted company never reaches). Merging this branch is
therefore not itself a behavior change for anyone until a companyId is
added to the array.

Tested both paths explicitly (see test results below): a non-allowlisted
company keeps getting fresh `exp_<ts>_<index>` ids on every save; an
allowlisted company gets deterministic ids and no-op resaves.

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
locally, before this branch's allowlist is widened past the first test
company:

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
- **500-doc read cap in `loadExperiences()`** (`.limit(500)`) is
  pre-existing, untouched, and not part of this fix.

## Test results (Firestore + Auth emulators only, real `firestore.rules`,
no real project)

14/14 pure unit tests (`npm run test:diff` + backup-script guard tests),
16/16 emulator integration tests (`npm run test:emulator`):

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
| 15 | Rollout gate: non-allowlisted company gets the OLD legacy behavior | PASS |
| 16 | Rollout gate: allowlisted company gets the NEW incremental behavior | PASS |

## Rollout steps

1. Run `scripts/export-experiences-backup.js` against production (Derek,
   real credentials, key outside the repo). Confirm `./backups/*.json`
   looks sane (spot-check a company's file against the Firebase console).
2. Code review this branch's diff. `firestore.rules` should show **zero**
   diff against `firestore.rules.live` - confirm with `diff` before
   merging, not just by eye.
3. **Merge to `main` with `incremental-save-config.js`'s allowlist still
   empty.** This is a no-behavior-change merge - every company keeps
   using `_saveExperiencesLegacy()`. Deploy to Vercel as normal (no rules
   deploy step - there is nothing to deploy on the rules side).
4. **Add one real test company's `companyId`** to
   `ALLOWLISTED_COMPANY_IDS`, deploy that one-line change, and verify
   directly in that company's account: saves land with deterministic
   ids, a resave with no edits writes nothing, and (if that company had
   legacy-scheme docs) migration ran cleanly - spot-check its
   `experiences` subcollection in the console.
5. **Widen the allowlist gradually** once step 4 looks right - a handful
   of companies, then all of them. Each widening is its own small,
   revertible deploy (just the config file), independent of any further
   code changes.

## Rollback steps

- **Before merge**: nothing to undo - no rules deploy either.
- **After merge, before widening past the empty/test-company allowlist**:
  revert `incremental-save-config.js` to an empty array (or drop the one
  test company) and redeploy - a one-line, instant rollback with no data
  migration to reverse, since only allowlisted companies were ever
  touched by the new code.
- **After widening, if a problem surfaces**: narrow or empty the
  allowlist again (same one-line redeploy) to fall back every affected
  company to `_saveExperiencesLegacy()` immediately. A company that
  already completed migration stays on the new doc-id scheme even after
  this - the legacy code doesn't care what scheme existing docs are under,
  it just deletes-and-recreates everything on its next save regardless.
  If a specific company's data looks actually wrong (not just "using the
  new code again while flow is being reworked"), restore that company's
  `./backups/<companyId>.json` via a one-off Admin SDK script (not
  written - only needed if this is actually hit).

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
