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

// Signs in as a fresh uid whose users/{uid} doc already exists (seeded via
// the Admin SDK, which bypasses rules - mirroring how api/firebase-token.js
// actually provisions it), and hands back a CLIENT SDK ref to that same
// doc for exercising firestore.rules' users/{userId} block directly.
async function makeSignedInUserWithOwnDoc(companyId, extra = {}) {
  uidCounter += 1;
  const uid = `user_${Date.now()}_${uidCounter}`;
  await adminDb.collection('users').doc(uid).set({ companyId, role: 'owner', ...extra });
  const customToken = await adminAuthInstance.createCustomToken(uid);
  await clientApp.auth().signInWithCustomToken(customToken);
  return { uid, userDocRef: clientDb.collection('users').doc(uid) };
}

// Asserts a client SDK call rejects with the real emulator's
// PERMISSION_DENIED - not just any rejection.
async function assertPermissionDenied(promise, message) {
  await assert.rejects(promise, (err) => {
    assert.equal(err.code, 'permission-denied', `expected permission-denied, got ${err.code}: ${err.message}`);
    return true;
  }, message);
}

// Incremental save is the only save path - there is no config or allowlist
// to set up, so a bare company doc is all a test needs.
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

  await t('old-scheme migration: removes legacy docs, no duplicates/orphans, no backup write', async () => {
    const companyId = await freshCompanyId();
    const expCollection = adminDb.collection('companies').doc(companyId).collection('experiences');
    const { uid, manager } = await makeSignedInCompanyUser(companyId);

    // Seed 2 legacy-scheme docs directly, added by the same user who will
    // run the migration - the "different author" case is tested separately
    // in 3a below.
    await expCollection.doc('exp_1700000000000_0').set({ ...exp(40, 'Legacy A'), addedBy: uid, companyId });
    await expCollection.doc('exp_1700000000000_1').set({ ...exp(41, 'Legacy B'), addedBy: uid, companyId });

    const result = await manager.saveExperiences([exp(40, 'Legacy A'), exp(41, 'Legacy B'), exp(42, 'New C')]);
    assert.equal(result.success, true);

    const finalSnap = await expCollection.get();
    const finalIds = finalSnap.docs.map(d => d.id).sort();
    assert.deepEqual(finalIds, ['40', '41', '42'], 'only new-scheme ids remain, no legacy ids, no duplicates');

    // No client-side backup collection - migration ships with zero
    // firestore.rules changes (see MIGRATION_RUNBOOK.md); backup is a
    // pre-migration firebase-admin export run by Derek, not app code.
    const backupCollections = await adminDb.collection('companies').doc(companyId).listCollections();
    assert.ok(
      !backupCollections.some(c => c.id.startsWith('experiences_backup_')),
      'no experiences_backup_* collection was created by the app'
    );

    // A second save must not re-trigger migration (no legacy docs left,
    // and _migrationChecked is already true for this manager instance).
    const second = await manager.saveExperiences([exp(40, 'Legacy A'), exp(41, 'Legacy B'), exp(42, 'New C')]);
    assert.equal(second.count, 0, 'nothing to write - already migrated and unchanged');
  });

  await t('3a: migration preserves the ORIGINAL author when a different user runs it', async () => {
    const companyId = await freshCompanyId();
    const expCollection = adminDb.collection('companies').doc(companyId).collection('experiences');

    // Two real, distinct company members - live's create rule requires
    // request.resource.data.addedBy == request.auth.uid, so this is the
    // scenario that would break a naive delete+recreate-as-one-create.
    const { uid: userA } = await makeSignedInCompanyUser(companyId);
    const { manager: managerB, uid: userB } = await makeSignedInCompanyUser(companyId);
    assert.notEqual(userA, userB);

    await expCollection.doc('exp_1690000000000_0').set({ ...exp(80, 'Original by A'), addedBy: userA, companyId });

    const result = await managerB.saveExperiences([exp(80, 'Original by A')]);
    assert.equal(result.success, true, `migration by a different user must not be rejected: ${result.error}`);

    const finalDoc = await expCollection.doc('80').get();
    assert.ok(finalDoc.exists);
    assert.equal(finalDoc.data().addedBy, userA, 'addedBy must still be the ORIGINAL author, not whoever ran the migration');
    assert.equal(finalDoc.data().updatedBy, userB, 'updatedBy correctly reflects who actually touched it just now');

    const legacyGone = await expCollection.doc('exp_1690000000000_0').get();
    assert.equal(legacyGone.exists, false);
  });

  await t('migration crash between create and addedBy-correction: next run repairs it (idempotent)', async () => {
    const companyId = await freshCompanyId();
    const expCollection = adminDb.collection('companies').doc(companyId).collection('experiences');
    const { uid: userA } = await makeSignedInCompanyUser(companyId);

    // Simulate a crash AFTER step 1 (create, addedBy=self) but BEFORE
    // step 2 (correct addedBy) and step 3 (delete legacy) of a previous
    // migration attempt run by some other, now-irrelevant identity.
    // Both the half-migrated new-scheme doc AND the still-undeleted
    // legacy doc are left behind - exactly what a crash there produces.
    await expCollection.doc('exp_1670000000000_0').set({ ...exp(120, 'Crash-prone doc'), addedBy: userA, companyId });
    await expCollection.doc('120').set({ ...exp(120, 'Crash-prone doc'), addedBy: 'crashed_migration_runner', updatedBy: 'crashed_migration_runner', companyId });

    // A fresh manager instance (as if the page reloaded after the crash)
    // re-detects the still-present legacy doc and re-runs the full
    // migration - it must repair addedBy, not just leave it wrong.
    const { manager } = await makeSignedInCompanyUser(companyId);
    const result = await manager.saveExperiences([exp(120, 'Crash-prone doc')]);
    assert.equal(result.success, true, result.error);

    const finalSnap = await expCollection.get();
    assert.equal(finalSnap.size, 1, 'no duplicate left behind from the half-migrated attempt');
    const finalDoc = await expCollection.doc('120').get();
    assert.equal(finalDoc.data().addedBy, userA, 'addedBy repaired back to the TRUE original author, not left as crashed_migration_runner');

    const legacyGone = await expCollection.doc('exp_1670000000000_0').get();
    assert.equal(legacyGone.exists, false, 'legacy doc finally cleaned up on the repair run');
  });

  await t('3b: concurrent migration by two instances - no duplicates, no data loss', async () => {
    const companyId = await freshCompanyId();
    const expCollection = adminDb.collection('companies').doc(companyId).collection('experiences');
    const { uid } = await makeSignedInCompanyUser(companyId);

    await expCollection.doc('exp_1680000000000_0').set({ ...exp(90, 'Concurrent A'), addedBy: uid, companyId });
    await expCollection.doc('exp_1680000000000_1').set({ ...exp(91, 'Concurrent B'), addedBy: uid, companyId });

    // Two independent manager instances (e.g. two tabs), same user, both
    // discovering the same legacy docs at the same time.
    const instance1 = new FirestoreDataManager();
    const instance2 = new FirestoreDataManager();
    await instance1.initialize(clientDb, uid);
    await instance2.initialize(clientDb, uid);

    const experiences = [exp(90, 'Concurrent A'), exp(91, 'Concurrent B')];
    const [r1, r2] = await Promise.all([
      instance1.saveExperiences(experiences),
      instance2.saveExperiences(experiences),
    ]);
    assert.equal(r1.success, true, r1.error);
    assert.equal(r2.success, true, r2.error);

    const finalSnap = await expCollection.get();
    const finalIds = finalSnap.docs.map(d => d.id).sort();
    assert.deepEqual(finalIds, ['90', '91'], 'exactly the 2 expected docs - no duplicates from the race, no legacy leftovers');
    const byId = new Map(finalSnap.docs.map(d => [d.id, d.data()]));
    assert.equal(byId.get('90').addedBy, uid);
    assert.equal(byId.get('91').addedBy, uid);
  });

  await t('3c: tab A deletes, tab B edits the stale copy and saves - no resurrection', async () => {
    const companyId = await freshCompanyId();
    const expCollection = adminDb.collection('companies').doc(companyId).collection('experiences');
    const { uid } = await makeSignedInCompanyUser(companyId);

    const tabA = new FirestoreDataManager();
    const tabB = new FirestoreDataManager();
    await tabA.initialize(clientDb, uid);
    await tabB.initialize(clientDb, uid);

    await tabA.saveExperiences([exp(100, 'Shared')]);
    await tabA.loadExperiences();
    await tabB.loadExperiences(); // both tabs now know about #100

    // Tab A deletes it.
    const delResult = await tabA.deleteExperience(100);
    assert.equal(delResult.success, true);
    let snap = await expCollection.get();
    assert.equal(snap.size, 0, 'deleted for real');

    // Tab B, unaware, edits its own stale copy and saves. Because tab B's
    // _lastSyncedById already had #100 (from its own loadExperiences()
    // call above), saveExperiences() writes it with .update(), not
    // .set() - and .update() on a doc that no longer exists throws
    // 'not-found', which is now handled softly: the save still succeeds
    // overall, #100 comes back as orphaned (skipped, never resurrected),
    // and count reflects that nothing was actually written.
    const editedStale = exp(100, 'Shared - edited by tab B, unaware it was deleted');
    const saveResult = await tabB.saveExperiences([editedStale]);
    assert.equal(saveResult.success, true, 'a stale delete/edit race must not fail the whole save');
    assert.deepEqual(saveResult.orphanedIds, ['100']);
    assert.equal(saveResult.count, 0, 'nothing was actually written for the orphaned doc');

    snap = await expCollection.get();
    assert.equal(snap.size, 0, 'still deleted - no resurrection happened');
  });

  await t('3c-resilient: one stale doc must never fail an unrelated edit in the same save', async () => {
    const companyId = await freshCompanyId();
    const expCollection = adminDb.collection('companies').doc(companyId).collection('experiences');
    const { uid } = await makeSignedInCompanyUser(companyId);

    const tabA = new FirestoreDataManager();
    const tabB = new FirestoreDataManager();
    await tabA.initialize(clientDb, uid);
    await tabB.initialize(clientDb, uid);

    await tabA.saveExperiences([exp(110, 'Will be deleted'), exp(111, 'Untouched')]);
    await tabA.loadExperiences();
    await tabB.loadExperiences();

    await tabA.deleteExperience(110);

    // Tab B saves TWO changes in one call: a stale edit to the
    // now-deleted #110, AND a brand-new, completely unrelated addition.
    // Both land in the same batch chunk (well under 500 ops) - the
    // deleted doc's failure must not take the new addition down with it.
    const staleEdit = exp(110, 'Edited after deletion, unaware');
    const brandNew = exp(112, 'Genuinely new, unrelated');
    const result = await tabB.saveExperiences([staleEdit, exp(111, 'Untouched'), brandNew]);

    assert.equal(result.success, true);
    assert.deepEqual(result.orphanedIds, ['110']);
    assert.equal(result.count, 1, 'only #112 was actually new/changed and written');

    const snap = await expCollection.get();
    const ids = snap.docs.map(d => d.id).sort();
    assert.deepEqual(ids, ['111', '112'], '#110 stays deleted, #111 untouched, #112 (unrelated) landed despite #110\'s conflict');
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

  await t('loading 600 experiences returns all 600 (no 500-doc truncation)', async () => {
    const companyId = await freshCompanyId();
    const seeder = await makeSignedInCompanyUser(companyId);
    const many = Array.from({ length: 600 }, (_, i) => exp(5000 + i, `Loaded ${i}`));
    const saved = await seeder.manager.saveExperiences(many);
    assert.equal(saved.success, true, saved.error);

    const { manager } = await makeSignedInCompanyUser(companyId); // a fresh session
    const loaded = await manager.loadExperiences();
    assert.equal(loaded.success, true, loaded.error);
    assert.equal(loaded.experiences.length, 600, 'every one of the 600 docs arrived');
    const ids = new Set(loaded.experiences.map(e => String(e.id)));
    assert.equal(ids.size, 600, 'no duplicates across pages');
    for (let i = 0; i < 600; i++) assert.ok(ids.has(String(5000 + i)), `experience ${5000 + i} missing from the load`);

    const resave = await manager.saveExperiences(loaded.experiences);
    assert.equal(resave.count, 0, 'the baseline covers all 600, so an unedited resave writes nothing');
  });

  await t('loading includes a doc that has no updatedAt field (e.g. restored from a backup)', async () => {
    const companyId = await freshCompanyId();
    const { manager } = await makeSignedInCompanyUser(companyId);
    await manager.saveExperiences([exp(6001, 'Has updatedAt')]);
    await adminDb.collection('companies').doc(companyId).collection('experiences').doc('6002')
      .set({ ...exp(6002, 'No updatedAt'), companyId, addedBy: 'restored' });

    const loaded = await manager.loadExperiences();
    assert.deepEqual(loaded.experiences.map(e => e.id).sort(), [6001, 6002], 'both docs load, ordered by id then by updatedAt');
    assert.equal(loaded.experiences[0].id, 6001, 'a doc with updatedAt sorts ahead of one without');
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

  await t('a fresh company gets incremental behaviour with no config at all', async () => {
    assert.equal(global.INCREMENTAL_SAVE_CONFIG, undefined, 'no rollout config exists anywhere');
    assert.equal(typeof FirestoreDataManager.prototype._saveExperiencesLegacy, 'undefined', 'the legacy save path no longer exists');

    const companyId = await freshCompanyId();
    const { manager } = await makeSignedInCompanyUser(companyId);

    const first = await manager.saveExperiences([exp(210, 'A'), exp(211, 'B')]);
    assert.equal(first.count, 2);

    const second = await manager.saveExperiences([exp(210, 'A'), exp(211, 'B')]);
    assert.equal(second.count, 0, 'no-op resave writes nothing - incremental, not delete-all/reinsert-all');

    const third = await manager.saveExperiences([exp(210, 'A - edited'), exp(211, 'B')]);
    assert.equal(third.count, 1, 'only the edited experience is written');

    const snap = await adminDb.collection('companies').doc(companyId).collection('experiences').get();
    assert.deepEqual(snap.docs.map(d => d.id).sort(), ['210', '211'], 'deterministic doc ids, not exp_<ts>_<index>');
    assert.ok(snap.docs.every(d => !d.id.startsWith('exp_')), 'no legacy-scheme docs are ever created');
  });

  // --- firestore.rules users/{userId} lockdown (fix/users-rules-lockdown) ---

  await t('users/{uid} rules: client update of companyId is DENIED', async () => {
    const companyId = await freshCompanyId();
    const otherCompanyId = await freshCompanyId();
    const { userDocRef } = await makeSignedInUserWithOwnDoc(companyId);
    await assertPermissionDenied(
      userDocRef.update({ companyId: otherCompanyId }),
      'updating companyId on own user doc must be rejected by rules'
    );
  });

  await t('users/{uid} rules: client update of role is DENIED', async () => {
    const companyId = await freshCompanyId();
    const { userDocRef } = await makeSignedInUserWithOwnDoc(companyId);
    await assertPermissionDenied(
      userDocRef.update({ role: 'member' }),
      'updating role on own user doc must be rejected by rules'
    );
  });

  await t('users/{uid} rules: client update of a non-locked field is ALLOWED', async () => {
    const companyId = await freshCompanyId();
    const { uid, userDocRef } = await makeSignedInUserWithOwnDoc(companyId);
    await userDocRef.update({ displayName: 'Updated Name' });
    const snap = await adminDb.collection('users').doc(uid).get();
    assert.equal(snap.data().displayName, 'Updated Name', 'non-locked field update should land');
    assert.equal(snap.data().companyId, companyId, 'companyId untouched by this update');
  });

  await t('users/{uid} rules: client create of own user doc is DENIED', async () => {
    uidCounter += 1;
    const uid = `user_${Date.now()}_${uidCounter}`;
    const token = await adminAuthInstance.createCustomToken(uid);
    await clientApp.auth().signInWithCustomToken(token);
    const ref = clientDb.collection('users').doc(uid);
    await assertPermissionDenied(
      ref.set({ companyId: 'whatever', role: 'owner' }),
      'client-side creation of users/{uid} must be rejected - only the Admin SDK provisions it'
    );
  });

  await t('users/{uid} rules: client delete of own user doc is DENIED', async () => {
    const companyId = await freshCompanyId();
    const { userDocRef } = await makeSignedInUserWithOwnDoc(companyId);
    await assertPermissionDenied(
      userDocRef.delete(),
      'deleting own user doc must be rejected by rules'
    );
  });

  await t('users/{uid} rules lockdown: company access via belongsToCompany still ALLOWED', async () => {
    const companyId = await freshCompanyId();
    const { manager } = await makeSignedInCompanyUser(companyId);

    const result = await manager.saveExperiences([exp(900, 'Regression check')]);
    assert.equal(result.success, true, result.error);

    const companyDoc = await clientDb.collection('companies').doc(companyId).get();
    assert.ok(companyDoc.exists, 'company doc still readable via belongsToCompany after users/{uid} lockdown');

    const expSnap = await clientDb.collection('companies').doc(companyId).collection('experiences').get();
    assert.equal(expSnap.size, 1, 'company experiences still readable via belongsToCompany after users/{uid} lockdown');
  });

  // --- Stage 3b: ensureFirestoreProvisioned (api/firebase-token.js) ---
  // Called directly against the emulator - no Clerk, no HTTP. The default
  // firebase-admin app was initialised above, so the module reuses it
  // instead of building a credential from env vars.
  const { ensureFirestoreProvisioned } = require('../api/firebase-token.js');
  const stamp = Date.now();
  const uidA = `s3b_A_${stamp}`;
  const uidB = `s3b_B_${stamp}`;
  const uidC = `s3b_C_${stamp}`;
  const uidD = `s3b_D_${stamp}`;
  const uidE = `s3b_E_${stamp}`;
  const uidF = `s3b_F_${stamp}`;
  const companyCount = async () => (await adminDb.collection('companies').count().get()).data().count;
  const getUser = async (uid) => (await adminDb.collection('users').doc(uid).get());
  const getOrgMap = async (orgId) => (await adminDb.collection('orgCompanyMap').doc(orgId).get());
  let companyOfOrg1;

  await t('3b-1: first user of a new org -> creates company, writes orgCompanyMap, role owner', async () => {
    const before = await companyCount();
    await ensureFirestoreProvisioned(uidA, 'a@example.com', 'Alpha', 'org_TEST1');
    assert.equal(await companyCount(), before + 1, 'exactly one company created');
    const map = await getOrgMap('org_TEST1');
    assert.ok(map.exists, 'orgCompanyMap/org_TEST1 written');
    companyOfOrg1 = map.data().companyId;
    const user = (await getUser(uidA)).data();
    assert.equal(user.role, 'owner');
    assert.equal(user.companyId, companyOfOrg1);
    const company = await adminDb.collection('companies').doc(companyOfOrg1).get();
    assert.ok(company.exists, 'mapped company doc exists');
    assert.equal(company.data().ownerId, uidA);
  });

  await t('3b-2: second user, same org -> joins existing company as member, no new company', async () => {
    const before = await companyCount();
    await ensureFirestoreProvisioned(uidB, 'b@example.com', 'Bravo', 'org_TEST1');
    assert.equal(await companyCount(), before, 'company count unchanged');
    const user = (await getUser(uidB)).data();
    assert.equal(user.role, 'member');
    assert.equal(user.companyId, companyOfOrg1, "gets A's companyId");
  });

  await t('3b-3: no orgId -> own new company, no orgCompanyMap written', async () => {
    const beforeCompanies = await companyCount();
    const beforeMaps = (await adminDb.collection('orgCompanyMap').count().get()).data().count;
    await ensureFirestoreProvisioned(uidC, 'c@example.com', 'Charlie', null);
    assert.equal(await companyCount(), beforeCompanies + 1, 'own company created');
    assert.equal((await adminDb.collection('orgCompanyMap').count().get()).data().count, beforeMaps, 'no map written');
    const user = (await getUser(uidC)).data();
    assert.equal(user.role, 'owner');
    assert.notEqual(user.companyId, companyOfOrg1, 'separate from the org company');
  });

  await t('3b-4: already-provisioned user called again with a different orgId -> untouched', async () => {
    const beforeUser = (await getUser(uidA)).data();
    const beforeCompanies = await companyCount();
    await ensureFirestoreProvisioned(uidA, 'a@example.com', 'Alpha', 'org_TEST_OTHER');
    const afterUser = (await getUser(uidA)).data();
    assert.equal(afterUser.companyId, beforeUser.companyId, 'companyId unchanged');
    assert.equal(afterUser.role, beforeUser.role, 'role unchanged');
    assert.equal(await companyCount(), beforeCompanies, 'no company created');
    assert.equal((await getOrgMap('org_TEST_OTHER')).exists, false, 'no map written for the other org');
  });

  await t('3b-5: two users, same new org, concurrent -> exactly one company, shared companyId', async () => {
    await Promise.all([
      ensureFirestoreProvisioned(uidD, 'd@example.com', 'Delta', 'org_TEST2'),
      ensureFirestoreProvisioned(uidE, 'e@example.com', 'Echo', 'org_TEST2'),
    ]);
    const map = await getOrgMap('org_TEST2');
    assert.ok(map.exists, 'orgCompanyMap/org_TEST2 written');
    const orgCompanyId = map.data().companyId;
    const d = (await getUser(uidD)).data();
    const e = (await getUser(uidE)).data();
    assert.equal(d.companyId, orgCompanyId);
    assert.equal(e.companyId, orgCompanyId, 'both share the same companyId');
    const created = await adminDb.collection('companies').where('ownerId', 'in', [uidD, uidE]).get();
    assert.equal(created.size, 1, 'exactly one company created for the org');
    assert.deepEqual([d.role, e.role].sort(), ['member', 'owner'], 'one owner, one member');
  });

  await t('3b-6: pre-seeded orgCompanyMap -> new user joins that company, none created', async () => {
    const companyX = adminDb.collection('companies').doc();
    await companyX.set({ companyName: 'Preseeded X', ownerId: 'n/a', createdAt: adminFirestore.FieldValue.serverTimestamp() });
    await adminDb.collection('orgCompanyMap').doc('org_TEST3').set({ companyId: companyX.id });
    const before = await companyCount();
    await ensureFirestoreProvisioned(uidF, 'f@example.com', 'Foxtrot', 'org_TEST3');
    assert.equal(await companyCount(), before, 'no company created');
    const user = (await getUser(uidF)).data();
    assert.equal(user.companyId, companyX.id, 'joined pre-seeded company X');
    assert.equal(user.role, 'member');
  });

  // --- Adding to an existing product (the re-test selector) ---
  // The only way to add a test to an existing product is the re-test
  // selector, which is populated by updateRetestOptions(). It used to be
  // refreshed only after a NEW entry was submitted, so anything loaded from
  // Firestore/localStorage never appeared in it. These tests drive the REAL
  // app.js (stub DOM, see test/helpers/load-app.js) against the emulator.
  const { loadApp } = require('./helpers/load-app.js');
  const existingProduct = (id, name, brand) => ({
    id,
    timestamp: '2026-09-01T10:00:00.000Z',
    productInfo: { name, brand, type: 'Snack', variant: 'N/A', occasion: 'Not specified', temperature: 'Not specified' },
    needState: 'indulgence',
    stages: { aftertaste: { emotions: { satisfaction: 7 } } },
    emotionalTriggers: {},
    notes: '',
  });

  await t('retest selector lists existing products after a cloud load', async () => {
    const companyId = await freshCompanyId();
    const seeder = await makeSignedInCompanyUser(companyId);
    const seeded = await seeder.manager.saveExperiences([
      existingProduct(101, 'Dark Choc Bar', 'Acme'),
      existingProduct(102, 'Sea Salt Chips', 'Snackco'),
    ]);
    assert.equal(seeded.success, true, seeded.error);

    const { manager } = await makeSignedInCompanyUser(companyId); // a fresh session
    const { app, elements } = loadApp();
    app.updateRetestOptions(); // what initForm() does at DOMContentLoaded, before any data has loaded
    app.useCloud(manager);
    await app.loadDataFromCloud();

    assert.equal(app.getExperiences().length, 2, 'both existing products loaded from Firestore');
    const html = elements.get('retest-selector').innerHTML;
    assert.ok(html.includes('value="101"') && html.includes('Dark Choc Bar'), `Dark Choc Bar missing from re-test options: ${html}`);
    assert.ok(html.includes('value="102"') && html.includes('Sea Salt Chips'), `Sea Salt Chips missing from re-test options: ${html}`);
  });

  await t('retest selector lists existing products after a localStorage load', async () => {
    const { app, elements } = loadApp({
      localStorageData: [existingProduct(201, 'Oat Biscuit', 'Bakeco')],
    });
    app.updateRetestOptions(); // initForm() at DOMContentLoaded
    await app.loadData();      // DOMContentLoaded: loadData() ...
    app.updateDashboard();     // ... then updateDashboard()

    assert.equal(app.getExperiences().length, 1);
    const html = elements.get('retest-selector').innerHTML;
    assert.ok(html.includes('value="201"') && html.includes('Oat Biscuit'), `Oat Biscuit missing from re-test options: ${html}`);
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
