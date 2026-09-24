#!/usr/bin/env node
// READ-ONLY backup + audit of every company in production Firestore.
//
// Usage (credentials come from an env file kept OUTSIDE this repo):
//   node --env-file=/tmp/sig-sa.env scripts/backup-and-audit.js
//
// Needs FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY -
// the same variables api/firebase-token.js uses.
//
// For every doc under companies/ it writes the company doc and ALL of its
// subcollections (recursively) to backups/<date>/<companyId>.json, then
// prints one audit row per company: name, total experiences, legacy exp_
// docs, and how many users/{uid} docs point at it.
//
// Only get() / listDocuments() / listCollections() are ever called - there
// is no write, update, delete, batch or transaction anywhere in this file.
// backups/ is gitignored (real production data).

const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, GeoPoint, DocumentReference } = require('firebase-admin/firestore');

const DATE = process.env.BACKUP_DATE || '2026-09-24';
const OUT_DIR = path.join(__dirname, '..', 'backups', DATE);
const LEGACY_PREFIX = 'exp_';

if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.error('Refusing to run: FIRESTORE_EMULATOR_HOST is set, this script is for production.');
  process.exit(1);
}
for (const name of ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY']) {
  if (!process.env[name]) {
    console.error(`${name} is not set. Run with: node --env-file=/tmp/sig-sa.env scripts/backup-and-audit.js`);
    process.exit(1);
  }
}

// Same normalisation as api/firebase-token.js.
let privateKey = process.env.FIREBASE_PRIVATE_KEY.trim();
if (privateKey.startsWith('"') && privateKey.endsWith('"')) privateKey = privateKey.slice(1, -1);
if (!privateKey.includes('\n')) privateKey = privateKey.replace(/\\n/g, '\n');

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey,
  }),
});
const db = getFirestore(app);

// Firestore value types that plain JSON would flatten or lose.
function serialise(value) {
  if (value instanceof Timestamp) return { __type: 'timestamp', iso: value.toDate().toISOString() };
  if (value instanceof GeoPoint) return { __type: 'geopoint', latitude: value.latitude, longitude: value.longitude };
  if (value instanceof DocumentReference) return { __type: 'reference', path: value.path };
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return { __type: 'bytes', base64: Buffer.from(value).toString('base64') };
  if (Array.isArray(value)) return value.map(serialise);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serialise(v)]));
  }
  return value;
}

let docsExported = 0;

// Exports a document and, recursively, every subcollection under it.
// listDocuments() (not a query) so "phantom" docs that exist only because
// they have subcollections are captured too.
async function exportDoc(ref) {
  const snap = await ref.get();
  docsExported += 1;
  const out = { id: ref.id, exists: snap.exists, data: snap.exists ? serialise(snap.data()) : null, subcollections: {} };
  for (const col of await ref.listCollections()) {
    out.subcollections[col.id] = [];
    for (const childRef of await col.listDocuments()) {
      out.subcollections[col.id].push(await exportDoc(childRef));
    }
  }
  return out;
}

async function main() {
  console.log(`Project: ${process.env.FIREBASE_PROJECT_ID}   (READ-ONLY)`);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // users/{uid}.companyId -> how many users point at each company.
  const usersByCompany = new Map();
  const usersSnap = await db.collection('users').get();
  let usersWithoutCompany = 0;
  for (const u of usersSnap.docs) {
    const companyId = u.data().companyId;
    if (!companyId) { usersWithoutCompany += 1; continue; }
    usersByCompany.set(companyId, (usersByCompany.get(companyId) || 0) + 1);
  }

  const companyRefs = await db.collection('companies').listDocuments();
  const rows = [];

  for (const ref of companyRefs) {
    docsExported = 0;
    const exported = await exportDoc(ref);
    const experiences = exported.subcollections.experiences || [];
    const legacy = experiences.filter(e => e.id.startsWith(LEGACY_PREFIX)).length;

    const file = path.join(OUT_DIR, `${ref.id}.json`);
    fs.writeFileSync(file, JSON.stringify({ companyId: ref.id, exportedAt: new Date().toISOString(), company: exported }, null, 2), { mode: 0o600 });

    rows.push({
      companyId: ref.id,
      name: exported.exists ? (exported.data.companyName || '(no name)') : '(no company doc)',
      experiences: experiences.length,
      legacy,
      users: usersByCompany.get(ref.id) || 0,
      docsExported,
      bytes: fs.statSync(file).size,
    });
  }

  const knownIds = new Set(companyRefs.map(r => r.id));
  const orphanUsers = [...usersByCompany.entries()].filter(([id]) => !knownIds.has(id));

  console.log(`\nCompanies: ${rows.length}   Users: ${usersSnap.size}   Backups: ${OUT_DIR}\n`);
  console.table(rows);
  console.log(`Users with no companyId: ${usersWithoutCompany}`);
  console.log(`Users pointing at a company that does not exist: ${orphanUsers.reduce((n, [, c]) => n + c, 0)}` +
    (orphanUsers.length ? ` (${orphanUsers.map(([id, c]) => `${id}:${c}`).join(', ')})` : ''));

  fs.writeFileSync(path.join(OUT_DIR, '_audit-summary.json'), JSON.stringify({ project: process.env.FIREBASE_PROJECT_ID, rows, usersTotal: usersSnap.size, usersWithoutCompany, orphanUsers }, null, 2), { mode: 0o600 });
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('Backup/audit failed:', err.message);
  process.exit(1);
});
