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
//   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
//     node scripts/export-experiences-backup.js
//
// Writes one JSON file per company to ./backups/<companyId>.json,
// containing every document currently in that company's `experiences`
// subcollection (legacy-scheme and new-scheme docs alike, whatever is
// there right now). Read-only against Firestore - this script never
// writes anything back.

const fs = require('fs');
const path = require('path');
const { initializeApp, cert, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const OUT_DIR = path.join(__dirname, '..', 'backups');

function initAdminApp() {
  // Mirrors api/firebase-token.js's own credential handling for
  // consistency, but reads real credentials (not the emulator) - this
  // script is meant to run against the real project, once, by hand.
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL) {
    let privateKey = process.env.FIREBASE_PRIVATE_KEY.trim();
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) privateKey = privateKey.slice(1, -1);
    if (!privateKey.includes('\n')) privateKey = privateKey.replace(/\\n/g, '\n');
    return initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });
  }
  // Falls back to GOOGLE_APPLICATION_CREDENTIALS pointing at a service
  // account JSON file, the more common local-script path.
  return initializeApp({ credential: applicationDefault() });
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
