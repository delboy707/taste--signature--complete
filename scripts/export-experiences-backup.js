#!/usr/bin/env node
// One-time pre-migration backup, run by Derek locally BEFORE the
// incremental-save code ships to production.
//
// Why this exists instead of a client-side backup write: the project is
// on the Spark plan (no scheduled/managed Firestore export), and any
// backup write from the app itself would need a NEW firestore.rules
// allowance for a backup collection - which is exactly what this
// migration is designed to avoid (it ships with ZERO rules changes; see
// MIGRATION_RUNBOOK.md). Running this script once, out of band, with
// real admin credentials, needs no rules changes at all: the Admin SDK
// bypasses Firestore rules entirely.
//
// Usage:
//   FIREBASE_SERVICE_ACCOUNT_PATH=/absolute/path/outside/this/repo/service-account.json \
//     node scripts/export-experiences-backup.js
//
// The service account key path is REQUIRED via that env var - there is
// no fallback to an implicit credential chain, and no default path, so a
// forgotten/misconfigured env var fails loudly instead of silently
// picking up whatever credentials happen to be ambient. The script
// refuses to run at all if the resolved key path is inside this repo's
// own working tree, even if .gitignore would have caught it before a
// commit - defense in depth against ever handling a real key that's
// sitting somewhere it could be accidentally committed.
//
// Writes one JSON file per company to ./backups/<companyId>.json,
// containing every document currently in that company's `experiences`
// subcollection (legacy-scheme and new-scheme docs alike, whatever is
// there right now). Read-only against Firestore - this script never
// writes anything back.

const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const OUT_DIR = path.join(__dirname, '..', 'backups');
const REPO_ROOT = path.resolve(__dirname, '..');

function resolveServiceAccountPath() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!raw) {
    console.error(
      'FIREBASE_SERVICE_ACCOUNT_PATH is not set. Point it at your service ' +
      'account JSON key file, e.g.:\n' +
      '  FIREBASE_SERVICE_ACCOUNT_PATH=/absolute/path/service-account.json node scripts/export-experiences-backup.js'
    );
    process.exit(1);
  }

  const resolved = path.resolve(raw);

  if (!fs.existsSync(resolved)) {
    console.error(`Service account key not found at: ${resolved}`);
    process.exit(1);
  }

  // Refuse to run if the key lives anywhere inside this repo's own
  // working tree - a real credential has no business sitting somewhere
  // `git add -A` could ever pick it up, .gitignore or not.
  const relativeToRepo = path.relative(REPO_ROOT, resolved);
  const isInsideRepo = relativeToRepo && !relativeToRepo.startsWith('..') && !path.isAbsolute(relativeToRepo);
  if (isInsideRepo) {
    console.error(
      `Refusing to run: the service account key at\n  ${resolved}\n` +
      `is inside this repo (${REPO_ROOT}).\n` +
      'Move it somewhere outside the repo (e.g. ~/.secrets/) and point ' +
      'FIREBASE_SERVICE_ACCOUNT_PATH there instead.'
    );
    process.exit(1);
  }

  return resolved;
}

function initAdminApp() {
  const keyPath = resolveServiceAccountPath();
  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  return initializeApp({ credential: cert(serviceAccount) });
}

async function main() {
  const app = initAdminApp();
  const db = getFirestore(app);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const companiesSnap = await db.collection('companies').get();
  console.log(`Found ${companiesSnap.size} compan${companiesSnap.size === 1 ? 'y' : 'ies'}.`);

  let totalDocs = 0;
  for (const companyDoc of companiesSnap.docs) {
    const expSnap = await companyDoc.ref.collection('experiences').get();
    const docs = expSnap.docs.map(d => ({ id: d.id, data: d.data() }));
    totalDocs += docs.length;

    const outPath = path.join(OUT_DIR, `${companyDoc.id}.json`);
    fs.writeFileSync(outPath, JSON.stringify({ companyId: companyDoc.id, exportedAt: new Date().toISOString(), documents: docs }, null, 2));
    console.log(`  ${companyDoc.id}: ${docs.length} experience doc(s) -> ${outPath}`);
  }

  console.log(`\nDone. ${totalDocs} total experience doc(s) backed up across ${companiesSnap.size} compan${companiesSnap.size === 1 ? 'y' : 'ies'}.`);
  console.log(`Keep ${OUT_DIR}/ somewhere safe until the migration has been verified in production.`);
}

main().catch(err => {
  console.error('Backup export failed:', err);
  process.exit(1);
});
