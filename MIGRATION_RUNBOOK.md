# Incremental-save migration - rollout runbook

Branch: `fix/incremental-save`. Not merged, not deployed. This document
reflects the corrected design after reconciling against the ACTUALLY
deployed `firestore.rules` (see `firestore.rules.live`, copied by hand
from the Firebase console, revision Nov 28 2025) - the repo's checked-in
`firestore.rules` had drifted from what's live and no longer does.

## What changed, in one paragraph

`saveExperiences()` no longer deletes every experience doc and recreates
all of them under fresh random ids on every save. It now upserts only
what changed, keyed by a deterministic doc id (`String(experience.id)`).
Deletion only ever happens via the explicit `deleteExperience()` /
`clearAllData()` calls the user's own delete actions make - never
inferred from a save. A one-time migration moves any pre-existing
`exp_<timestamp>_<index>`-scheme docs to the new scheme.

## Rules: no deploy needed

The branch's `firestore.rules` is now byte-identical to the live,
deployed rules. **Zero rules changes ship with this migration.** Two
things made that possible:

1. **No client-side backup collection.** An earlier draft of this fix
   wrote a backup to `companies/{id}/experiences_backup_{date}` before
   deleting legacy docs, which needed a new rule to allow it. Removed -
   see "Backup" below for what replaces it.
2. **`addedBy` is preserved without a rules change.** Live's `experiences`
   create rule requires `request.resource.data.addedBy == request.auth.uid`,
   so a doc migrated by a different user than its original creator can't
   be freshly created with the original author's id - that write would be
   rejected. Fixed by writing it in two steps: create with `addedBy` = the
   user actually running the migration (satisfies the create rule), then
   a separate `update()` call correcting `addedBy` back to the true
   original author (live's update rule has no field restrictions at all,
   so this is unconditionally allowed). Confirmed empirically against the
   emulator + the real rules, not just reasoned about - see "3a" in the
   test results below.

*(If a future change ever needs `updatedBy` enforcement or a real backup
collection, that's a deliberate, separate rules change with its own
review - not bundled into this migration.)*

## Backup: what actually happens, given the Spark plan

The project is on Spark (no scheduled/managed Firestore export). Recommended:
run **`scripts/export-experiences-backup.js`** once, locally, with real
service-account credentials, before this branch is deployed:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
  node scripts/export-experiences-backup.js
```

Writes one JSON file per company to `./backups/<companyId>.json` -
every experience doc, whatever scheme it's currently on. Uses the Admin
SDK, so it bypasses Firestore rules entirely (no rules change needed for
it either) and is read-only against Firestore. Keep the output somewhere
safe (not committed to git) until the migration is verified in production.

## Known, accepted limitations

- **Batch failure is coarse.** If a stale-delete conflict (see "3c" below)
  hits one doc in a save, the *entire* batch containing it fails -
  including unrelated legitimate changes queued in the same batch. Those
  changes aren't lost (the existing localStorage fallback still captures
  the full array), but they need a retry on the next save rather than
  landing immediately. A future improvement would retry a batch excluding
  just the conflicting doc; not built here.
- **Migration is per-manager-instance.** `_migrationChecked` lives on the
  `FirestoreDataManager` instance, not persisted anywhere shared. Two
  tabs open at once will both attempt migration independently - verified
  safe (see "3b"), but it means migration work is duplicated across tabs
  rather than coordinated.
- **500-doc read cap in `loadExperiences()`** (`.limit(500)`) is pre-existing,
  untouched, and not part of this fix.

## Emulator test results (Firestore + Auth emulators only, real
`firestore.rules`, no real project)

10/10 pure diff unit tests (`npm run test:diff`), 12/12 emulator
integration tests (`npm run test:emulator`):

| # | Test | Result |
|---|---|---|
| 1 | Edit 1 of 3 -> exactly 1 write | PASS |
| 2 | No-op save after load -> 0 writes | PASS |
| 3 | Delete 1 -> exactly 1 doc removed | PASS |
| 4 | `clearAllData` wipes the collection | PASS |
| 5 | Old-scheme migration: clean removal, no backup write | PASS |
| 6 | **3a** - migration preserves original author when a different user runs it | PASS |
| 7 | **3b** - concurrent migration by two instances, no dupes/loss | PASS |
| 8 | 600 docs -> correct multi-batch chunking | PASS |
| 9 | Second tab adds while first tab saves an edit | PASS |
| 10 | **3c** - tab A deletes, tab B edits the stale copy and saves | PASS (fails loudly, does not resurrect) |
| 11 | Failure injection -> real `PERMISSION_DENIED`, full array in localStorage | PASS |
| 12 | Retest chain survives save/reload | PASS |

## Rollout steps

1. Run `scripts/export-experiences-backup.js` against production (Derek,
   real credentials). Confirm `./backups/*.json` looks sane (spot-check a
   company's file against what's visible in the Firebase console).
2. Code review this branch's diff (`firestore-data.js`, `app.js`,
   `save-diff.js`). `firestore.rules` in this diff should show **zero
   behavioral change** relative to what's live today - confirm the diff
   really is empty against `firestore.rules.live` before merging.
3. Merge to `main`. **No `firebase deploy --only firestore:rules` step in
   this rollout** - there is nothing to deploy on the rules side.
4. Deploy to Vercel as normal (static files + the two `api/` functions;
   package.json's `dependencies` are unchanged, only `devDependencies`
   grew - see below).
5. Watch the first few real user saves after deploy (browser console logs
   `✅ Synced N/M changed experience(s)` and, for any company with legacy
   docs, `🔄 Migrating ... / ✅ Migration complete`). Spot-check one
   migrated company's `experiences` subcollection in the Firebase console:
   doc ids should all be plain numeric strings, no `exp_...` ids left.

## Rollback steps

- **If a problem surfaces before merge**: nothing to undo - the branch
  hasn't touched `main`, hasn't been deployed, and (per above) requires no
  rules deploy either.
- **If a problem surfaces after deploy**: revert the Vercel deployment to
  the prior build (previous `main` commit's static files + `api/`
  functions). Since no `firestore.rules` change ships with this, there is
  no rules rollback step to perform. Any company that already completed
  migration stays on the new doc-id scheme even after an app-code
  rollback - the *old* `saveExperiences()` code (delete-all/reinsert-all
  under fresh random ids) still works fine against new-scheme docs too,
  since it never depended on any particular existing id scheme; it would
  simply resume its old delete-everything/recreate-everything behavior
  from that point forward. If a migrated company's data looks wrong,
  restore that company's `./backups/<companyId>.json` via a one-off
  Admin SDK script (not written - only needed if rollback is actually hit).

## Vercel / `api/` impact (task 5)

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
