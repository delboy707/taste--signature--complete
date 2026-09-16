// Pure unit tests for save-diff.js - no Firestore, no emulator, no network.
// Run: node test/diff.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const { diffKey, computeUpsertDiff, chunk } = require('../save-diff.js');

test('no-op: identical experiences produce zero upserts', () => {
  const experiences = [
    { id: 1, productInfo: { name: 'A' }, stages: {} },
    { id: 2, productInfo: { name: 'B' }, stages: {} },
  ];
  const lastSyncedById = new Map(experiences.map(e => [String(e.id), diffKey(e)]));

  const { toUpsert, newSnapshot } = computeUpsertDiff(experiences, lastSyncedById);

  assert.equal(toUpsert.length, 0);
  assert.equal(newSnapshot.size, 2);
});

test('add: a brand-new experience (not in the baseline) is upserted', () => {
  const existing = { id: 1, productInfo: { name: 'A' }, stages: {} };
  const lastSyncedById = new Map([[String(existing.id), diffKey(existing)]]);
  const experiences = [existing, { id: 2, productInfo: { name: 'B' }, stages: {} }];

  const { toUpsert } = computeUpsertDiff(experiences, lastSyncedById);

  assert.equal(toUpsert.length, 1);
  assert.equal(toUpsert[0].id, 2);
});

test('edit: a changed field on an existing experience is upserted, unchanged ones are not', () => {
  const original = { id: 1, productInfo: { name: 'A' }, stages: { appearance: { visualAppeal: 5 } } };
  const untouched = { id: 2, productInfo: { name: 'B' }, stages: {} };
  const lastSyncedById = new Map([
    [String(original.id), diffKey(original)],
    [String(untouched.id), diffKey(untouched)],
  ]);

  const edited = { ...original, stages: { appearance: { visualAppeal: 9 } } };
  const experiences = [edited, untouched];

  const { toUpsert } = computeUpsertDiff(experiences, lastSyncedById);

  assert.equal(toUpsert.length, 1);
  assert.equal(toUpsert[0].id, 1);
});

test('delete (absence from the array) never appears as any kind of op', () => {
  const toRemove = { id: 1, productInfo: { name: 'A' }, stages: {} };
  const kept = { id: 2, productInfo: { name: 'B' }, stages: {} };
  const lastSyncedById = new Map([
    [String(toRemove.id), diffKey(toRemove)],
    [String(kept.id), diffKey(kept)],
  ]);

  // toRemove is simply absent from the current array - simulating another
  // tab's stale load, NOT a delete action.
  const experiences = [kept];

  const result = computeUpsertDiff(experiences, lastSyncedById);

  assert.equal(result.toUpsert.length, 0, 'removed-by-absence must not be upserted');
  assert.equal(result.newSnapshot.size, 1, 'baseline only ever reflects what was actually seen this call');
  assert.ok(!('toDelete' in result), 'the diff has no concept of a delete op at all');
});

test('diffKey ignores injected bookkeeping fields', () => {
  const bare = { id: 1, productInfo: { name: 'A' }, stages: {} };
  const withBookkeeping = {
    ...bare,
    addedBy: 'user_x',
    updatedBy: 'user_x',
    companyId: 'company_x',
    updatedAt: { seconds: 123 },
    createdAt: { seconds: 100 },
  };

  assert.equal(diffKey(bare), diffKey(withBookkeeping));
});

test('diffKey detects a real content change', () => {
  const a = { id: 1, productInfo: { name: 'A' }, stages: {} };
  const b = { id: 1, productInfo: { name: 'A changed' }, stages: {} };
  assert.notEqual(diffKey(a), diffKey(b));
});

test('chunk: exactly 500 items -> one chunk', () => {
  const items = Array.from({ length: 500 }, (_, i) => i);
  const chunks = chunk(items);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].length, 500);
});

test('chunk: 501 items -> two chunks, sizes 500 and 1, all items preserved in order', () => {
  const items = Array.from({ length: 501 }, (_, i) => i);
  const chunks = chunk(items);
  assert.equal(chunks.length, 2);
  assert.equal(chunks[0].length, 500);
  assert.equal(chunks[1].length, 1);
  assert.deepEqual(chunks.flat(), items);
});

test('chunk: 1200 items -> three chunks of 500/500/200', () => {
  const items = Array.from({ length: 1200 }, (_, i) => i);
  const chunks = chunk(items);
  assert.deepEqual(chunks.map(c => c.length), [500, 500, 200]);
});

test('computeUpsertDiff on >500 changed experiences returns all of them for the caller to chunk', () => {
  const experiences = Array.from({ length: 600 }, (_, i) => ({ id: i, productInfo: { name: `P${i}` }, stages: {} }));
  const { toUpsert, newSnapshot } = computeUpsertDiff(experiences, new Map());
  assert.equal(toUpsert.length, 600);
  assert.equal(newSnapshot.size, 600);
  const opChunks = chunk(toUpsert);
  assert.deepEqual(opChunks.map(c => c.length), [500, 100]);
});
