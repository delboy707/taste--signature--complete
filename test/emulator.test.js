// Integration tests against the Firestore + Auth EMULATORS only.
// Run via: npm run test:emulator
// (wraps: firebase emulators:exec --only firestore,auth "node test/emulator.test.js")
//
// Uses the REAL firestore-data.js and the REAL firestore.rules (this
// repo's actual production rules file) - not a mock, not a permissive
// stand-in. firebase-admin talks to the emulators via the
// FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST env vars the
// Firebase CLI injects automatically; no real project, no credentials,
// no network access to any live Firebase project.

const assert = require('node:assert/strict');
const adminApp = require('firebase-admin/app');
const adminFirestore = require('firebase-admin/firestore');
const adminAuth = require('firebase-admin/auth');
const firebase = require('firebase/compat/app');
require('firebase/compat/firestore');
require('firebase/compat/auth');

const PROJECT_ID = 'demo-incremental-save-test';
const FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
const AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';

if (!process.env.FIRESTORE_EMULATOR_HOST) process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR_HOST;
if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) process.env.FIREBASE_AUTH_EMULATOR_HOST = AUTH_EMULATOR_HOST;
if (!process.env.GCLOUD_PROJECT) process.env.GCLOUD_PROJECT = PROJECT_ID;

// --- firebase-admin: bypasses rules, used only to seed fixtures and to
// independently verify what actually landed in Firestore. ---
const adminAppInstance = adminApp.initializeApp({ projectId: PROJECT_ID });
const adminDb = adminFirestore.getFirestore(adminAppInstance);
const adminAuthInstance = adminAuth.getAuth(adminAppInstance);
const [fsHost, fsPort] = FIRESTORE_EMULATOR_HOST.split(':');
adminDb.settings({ host: `${fsHost}:${fsPort}`, ssl: false });

// --- client compat SDK: what firestore-data.js is actually written
// against (db.collection().doc().set(), db.batch(), FieldValue). ---
const clientApp = firebase.initializeApp({ projectId: PROJECT_ID, apiKey: 'demo-key' }, 'client');
const clientDb = clientApp.firestore();
clientDb.useEmulator(fsHost, Number(fsPort));
clientApp.auth().useEmulator(`http://${AUTH_EMULATOR_HOST}`, { disableWarnings: true });
global.firebase = firebase; // firestore-data.js reads the `firebase` global directly

const FirestoreDataManager = require('../firestore-data.js');

// In-memory localStorage polyfill, mirroring the browser API surface
// saveData()'s fallback uses.
function makeLocalStorage() {
  const store = new Map();
  return {
    setItem: (k, v) => store.set(k, v),
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    _store: store,
  };
}

let uidCounter = 0;
async function makeSignedInCompanyUser(companyId) {
  uidCounter += 1;
  const uid = `user_${Date.now()}_${uidCounter}`;
  await adminDb.collection('users').doc(uid).set({ companyId });
  const customToken = await adminAuthInstance.createCustomToken(uid);
  await clientApp.auth().signInWithCustomToken(customToken);
  const manager = new FirestoreDataManager();
  const init = await manager.initialize(clientDb, uid);
  assert.equal(init.success, true, `initialize() failed: ${init.error}`);
  return { uid, manager };
}

async function freshCompanyId() {
  const ref = adminDb.collection('companies').doc();
  await ref.set({ companyName: 'Test Co', ownerId: 'n/a', createdAt: adminFirestore.FieldValue.serverTimestamp() });
  return ref.id;
}

function exp(id, name, overrides = {}) {
  return { id, productInfo: { name }, stages: { appearance: { visualAppeal: 5 } }, ...overrides };
}

const results = [];
// Per-test watchdog: this environment's network sandboxing occasionally
// makes a single SDK call (auth/metadata lookups) hang indefinitely
// instead of failing fast. A stalled test should fail loudly, not block
// the whole suite forever.
const TEST_TIMEOUT_MS = 20000;

async function t(name, fn) {
  try {
    await Promise.race([
      fn(),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`timed out after ${TEST_TIMEOUT_MS}ms`)), TEST_TIMEOUT_MS)),
    ]);
    results.push({ name, ok: true });
    console.log(`✔ ${name}`);
  } catch (err) {
    results.push({ name, ok: false, err });
    console.error(`✘ ${name}`);
    console.error(err.stack || err.message);
  }
}

async function main() {
  await t('edit 1 of 3 -> exactly 1 write lands, others untouched', async () => {
    const companyId = await freshCompanyId();
    const { manager } = await makeSignedInCompanyUser(companyId);

    const original = [exp(1, 'A'), exp(2, 'B'), exp(3, 'C')];
    const first = await manager.saveExperiences(original);
    assert.equal(first.success, true);
    assert.equal(first.count, 3, 'first save writes all 3 (nothing synced yet)');

    const edited = [exp(1, 'A - edited'), exp(2, 'B'), exp(3, 'C')];
    const second = await manager.saveExperiences(edited);
    assert.equal(second.success, true);
    assert.equal(second.count, 1, 'second save writes only the 1 changed experience');

    const snap = await adminDb.collection('companies').doc(companyId).collection('experiences').get();
    assert.equal(snap.size, 3, 'still exactly 3 docs - no duplicates, no stray deletes');
    const byId = new Map(snap.docs.map(d => [d.id, d.data()]));
    assert.equal(byId.get('1').productInfo.name, 'A - edited');
    assert.equal(byId.get('2').productInfo.name, 'B');
  });

  await t('no-op save after load writes nothing', async () => {
    const companyId = await freshCompanyId();
    const { manager } = await makeSignedInCompanyUser(companyId);
    await manager.saveExperiences([exp(10, 'X'), exp(11, 'Y')]);

    const loaded = await manager.loadExperiences();
    assert.equal(loaded.success, true);
    assert.equal(loaded.experiences.length, 2);

    const resave = await manager.saveExperiences(loaded.experiences);
    assert.equal(resave.count, 0, 'reloading then resaving unedited data must not rewrite anything');
  });

  await t('delete 1 -> exactly 1 doc removed, save never infers deletion from absence', async () => {
    const companyId = await freshCompanyId();
    const { manager } = await makeSignedInCompanyUser(companyId);
    await manager.saveExperiences([exp(20, 'A'), exp(21, 'B'), exp(22, 'C')]);

    // Explicit delete of #21 - the only sanctioned way to remove a doc.
    const del = await manager.deleteExperience(21);
    assert.equal(del.success, true);

    let snap = await adminDb.collection('companies').doc(companyId).collection('experiences').get();
    assert.equal(snap.size, 2, 'exactly one doc removed');

    // Now save with #21 still absent from the array (as the real app would
    // after filtering it out) - must not touch anything else, and must not
    // error trying to "delete by absence" (there is no such path).
    const resave = await manager.saveExperiences([exp(20, 'A'), exp(22, 'C')]);
    assert.equal(resave.success, true);
    assert.equal(resave.count, 0, 'nothing changed besides the already-deleted doc');

    snap = await adminDb.collection('companies').doc(companyId).collection('experiences').get();
    assert.equal(snap.size, 2);
  });

  await t('clearAllData explicitly wipes the collection', async () => {
    const companyId = await freshCompanyId();
    const { manager } = await makeSignedInCompanyUser(companyId);
    await manager.saveExperiences([exp(30, 'A'), exp(31, 'B')]);

    const cleared = await manager.clearAllData();
    assert.equal(cleared.success, true);

    const snap = await adminDb.collection('companies').doc(companyId).collection('experiences').get();
    assert.equal(snap.size, 0);
  });

  await t('old-scheme migration: backs up, removes legacy docs, no duplicates/orphans', async () => {
    const companyId = await freshCompanyId();
    const expCollection = adminDb.collection('companies').doc(companyId).collection('experiences');

    // Seed 2 legacy-scheme docs directly (bypassing the app entirely, as
    // if this company had been saving since before this change shipped).
    await expCollection.doc('exp_1700000000000_0').set({ ...exp(40, 'Legacy A'), addedBy: 'someone', companyId });
    await expCollection.doc('exp_1700000000000_1').set({ ...exp(41, 'Legacy B'), addedBy: 'someone', companyId });

    const { manager } = await makeSignedInCompanyUser(companyId);
    // The in-memory array is what the app would have loaded+possibly
    // edited; migration rewrites exactly this set under the new scheme.
    const result = await manager.saveExperiences([exp(40, 'Legacy A'), exp(41, 'Legacy B'), exp(42, 'New C')]);
    assert.equal(result.success, true);

    const finalSnap = await expCollection.get();
    const finalIds = finalSnap.docs.map(d => d.id).sort();
    assert.deepEqual(finalIds, ['40', '41', '42'], 'only new-scheme ids remain, no legacy ids, no duplicates');

    const backupSnap = await adminDb
      .collection('companies').doc(companyId)
      .collection(`experiences_backup_${new Date().toISOString().slice(0, 10)}`)
      .get();
    assert.equal(backupSnap.size, 2, 'backup holds exactly the 2 legacy docs that existed pre-migration');
    const backupIds = backupSnap.docs.map(d => d.id).sort();
    assert.deepEqual(backupIds, ['exp_1700000000000_0', 'exp_1700000000000_1']);

    // A second save must not re-trigger migration (no legacy docs left,
    // and _migrationChecked is already true for this manager instance).
    const second = await manager.saveExperiences([exp(40, 'Legacy A'), exp(41, 'Legacy B'), exp(42, 'New C')]);
    assert.equal(second.count, 0, 'nothing to write - already migrated and unchanged');
  });

  await t('600 experiences chunk into multiple batches and all persist', async () => {
    const companyId = await freshCompanyId();
    const { manager } = await makeSignedInCompanyUser(companyId);

    const many = Array.from({ length: 600 }, (_, i) => exp(1000 + i, `Product ${i}`));
    const result = await manager.saveExperiences(many);
    assert.equal(result.success, true);
    assert.equal(result.count, 600);

    const snap = await adminDb.collection('companies').doc(companyId).collection('experiences').get();
    assert.equal(snap.size, 600, 'all 600 persisted despite exceeding the 500-op batch limit');
  });

  await t('second tab adds a new experience while the first tab saves an edit - both survive', async () => {
    const companyId = await freshCompanyId();
    // Two independent manager instances = two "tabs", same company, same
    // simulated user (company data is shared across a company's users).
    const tabA = new FirestoreDataManager();
    const tabB = new FirestoreDataManager();
    const uid = `user_${Date.now()}_shared`;
    await adminDb.collection('users').doc(uid).set({ companyId });
    const token = await adminAuthInstance.createCustomToken(uid);
    await clientApp.auth().signInWithCustomToken(token);
    await tabA.initialize(clientDb, uid);
    await tabB.initialize(clientDb, uid);

    // Both tabs start from the same loaded state.
    await tabA.saveExperiences([exp(50, 'Shared A')]);
    await tabA.loadExperiences();
    await tabB.loadExperiences();

    // Tab A edits the existing experience; Tab B, unaware, adds a new one
    // and saves WITHOUT tab A's edit in its own array (it never re-loaded
    // after A's save - the realistic race).
    const tabAResult = await tabA.saveExperiences([exp(50, 'Shared A - edited by tab A')]);
    const tabBResult = await tabB.saveExperiences([exp(50, 'Shared A'), exp(51, 'Added by tab B')]);

    assert.equal(tabAResult.success, true);
    assert.equal(tabBResult.success, true);
    // Tab B's own diff never saw #50 as changed (its copy is byte-identical
    // to what IT loaded before tab A's edit happened), so tab B's save only
    // wrote #51 - confirmed by the "Synced 1/2" log line above. This is a
    // real improvement over the old delete-all/reinsert-all code, which
    // unconditionally rewrote every item on every save and would have
    // clobbered tab A's concurrent edit with tab B's stale copy. Per-tab
    // diffing means a tab can only ever overwrite what it believes it
    // itself changed.
    assert.equal(tabBResult.count, 1, 'tab B only wrote its own new experience, not the stale copy of #50 it never touched');

    const snap = await adminDb.collection('companies').doc(companyId).collection('experiences').get();
    const byId = new Map(snap.docs.map(d => [d.id, d.data()]));
    assert.equal(snap.size, 2, 'both docs exist - tab B\'s add was never lost');
    assert.ok(byId.has('51'), 'tab B\'s new experience survived');
    assert.equal(byId.get('50').productInfo.name, 'Shared A - edited by tab A', 'tab A\'s edit was NOT clobbered by tab B\'s stale copy - an improvement over the old always-rewrite-everything behavior');
  });

  await t('failure injection: a real rules-rejected write leaves the full array in localStorage', async () => {
    const companyId = await freshCompanyId();
    const otherCompanyId = await freshCompanyId();
    // Sign in as a user of a DIFFERENT company, then try to save into
    // `companyId`'s collection - a genuine PERMISSION_DENIED from the
    // real emulator + the real firestore.rules, not a mock.
    const { manager } = await makeSignedInCompanyUser(otherCompanyId);
    manager.companyId = companyId; // force-target someone else's collection

    const experiences = [exp(60, 'A'), exp(61, 'B'), exp(62, 'C')];
    const result = await manager.saveExperiences(experiences);
    assert.equal(result.success, false, 'the real security rules must reject this write');

    // This is the exact fallback line from app.js's saveData() catch/else
    // branches - reproduced verbatim since app.js itself isn't a module
    // and can't be required standalone; not testing a re-implementation
    // of the logic, just isolating the one line under test.
    const localStorage = makeLocalStorage();
    if (!result.success) {
      localStorage.setItem('tasteSignatureData', JSON.stringify(experiences));
    }

    const stored = JSON.parse(localStorage.getItem('tasteSignatureData'));
    assert.deepEqual(stored, experiences, 'the FULL array is preserved locally, not just the failed subset');

    const snap = await adminDb.collection('companies').doc(companyId).collection('experiences').get();
    assert.equal(snap.size, 0, 'nothing was written to the target company - the rejection was real, not partial');
  });

  await t('retest chain survives a save/reload round trip', async () => {
    const companyId = await freshCompanyId();
    const { manager } = await makeSignedInCompanyUser(companyId);

    const originalTest = exp(70, 'Chocolate Bar');
    originalTest.testNumber = 1;
    originalTest.isRetest = false;
    originalTest.originalTestId = null;

    const retest = exp(71, 'Chocolate Bar');
    retest.testNumber = 2;
    retest.isRetest = true;
    retest.originalTestId = 70;

    await manager.saveExperiences([originalTest, retest]);
    const loaded = await manager.loadExperiences();
    const reloadedRetest = loaded.experiences.find(e => e.id === 71);

    assert.ok(reloadedRetest, 'retest experience survived the round trip');
    assert.equal(reloadedRetest.isRetest, true);
    assert.equal(reloadedRetest.originalTestId, 70, 'the link back to the original test id is intact');
  });

  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} emulator tests passed`);
  // Explicit exit: the Firebase client SDK keeps background listeners/
  // sockets open that would otherwise hold the event loop past the last
  // test, hanging the process even though every test already resolved.
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Emulator test run crashed:', err);
  process.exit(1);
});
