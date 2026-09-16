// Tests scripts/export-experiences-backup.js's guard rails as a real
// child process (it's a one-time CLI script with process.exit() calls,
// not a module) - no Firestore/emulator needed, these checks all happen
// before any network call.

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'export-experiences-backup.js');
const REPO_ROOT = path.join(__dirname, '..');

function run(env) {
  try {
    const output = execFileSync('node', [SCRIPT], { env: { ...process.env, ...env }, encoding: 'utf8' });
    return { code: 0, output };
  } catch (err) {
    return { code: err.status, output: (err.stdout || '') + (err.stderr || '') };
  }
}

test('refuses to run with no FIREBASE_SERVICE_ACCOUNT_PATH set', () => {
  const { code, output } = run({ FIREBASE_SERVICE_ACCOUNT_PATH: '' });
  assert.notEqual(code, 0);
  assert.match(output, /FIREBASE_SERVICE_ACCOUNT_PATH is not set/);
});

test('refuses to run if the key path does not exist', () => {
  const { code, output } = run({ FIREBASE_SERVICE_ACCOUNT_PATH: '/tmp/definitely-not-a-real-key-file.json' });
  assert.notEqual(code, 0);
  assert.match(output, /not found/);
});

test('refuses to run if the key is inside the repo', () => {
  const insideRepoKeyPath = path.join(REPO_ROOT, 'test', 'fixture-service-account.json');
  fs.writeFileSync(insideRepoKeyPath, JSON.stringify({ project_id: 'not-real' }));
  try {
    const { code, output } = run({ FIREBASE_SERVICE_ACCOUNT_PATH: insideRepoKeyPath });
    assert.notEqual(code, 0);
    assert.match(output, /Refusing to run/);
    assert.match(output, /inside this repo/);
  } finally {
    fs.unlinkSync(insideRepoKeyPath);
  }
});

test('accepts a key path outside the repo and proceeds past the guard (fails later, on the fake credentials, not on the guard)', () => {
  const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'export-backup-test-'));
  const outsideKeyPath = path.join(outsideDir, 'service-account.json');
  fs.writeFileSync(outsideKeyPath, JSON.stringify({ project_id: 'not-real', private_key: 'not-real', client_email: 'not-real@example.com' }));
  try {
    const { code, output } = run({ FIREBASE_SERVICE_ACCOUNT_PATH: outsideKeyPath });
    assert.notEqual(code, 0); // fake credentials can't actually reach Firestore
    assert.doesNotMatch(output, /Refusing to run/, 'must not be rejected by the repo-location guard');
    assert.doesNotMatch(output, /is not set/, 'must not be rejected by the missing-env-var guard');
  } finally {
    fs.rmSync(outsideDir, { recursive: true, force: true });
  }
});
