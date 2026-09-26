// Stage 2A.5: the hand-curated Brief sensory-label crosswalk is retired.
// Markers now come straight from the locked version's coded targets
// (target-prefill.js), so the old module must be gone entirely: no file,
// no <script> tag, no reference anywhere in the repo's source or docs.
// Run: node test/markers-from-codes-retirement.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
// Built by concatenation so this test file does not match its own scan.
const OLD_FILE = 'brief-sensory' + '-crosswalk.js';
const NEEDLES = ['brief-sensory' + '-crosswalk', 'BRIEF_SENSORY' + '_TO_QEP_ATTRIBUTE'];

const SKIP_DIRS = new Set(['node_modules', '.git', 'backups', '.vercel', '.firebase']);
const TEXT_EXT = new Set(['.js', '.html', '.json', '.md', '.css', '.txt', '.yml', '.yaml', '.sh', '.rules', '']);

function walk(dir, out) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), out);
            continue;
        }
        if (!entry.isFile()) continue;
        if (/\.bak(\.|$)/.test(entry.name)) continue; // local edit backups (gitignored)
        if (!TEXT_EXT.has(path.extname(entry.name))) continue;
        out.push(path.join(dir, entry.name));
    }
    return out;
}

test('the retired crosswalk file is absent', () => {
    assert.equal(fs.existsSync(path.join(ROOT, OLD_FILE)), false);
});

test('index.html loads no script for it, and still loads target-prefill.js', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    assert.ok(!html.includes(OLD_FILE));
    assert.match(html, /<script src="target-prefill\.js"><\/script>/);
});

test('nothing in the repo references it (source, tests, service worker, package.json, docs)', () => {
    const hits = [];
    for (const file of walk(ROOT, [])) {
        const text = fs.readFileSync(file, 'utf8');
        for (const needle of NEEDLES) {
            if (text.includes(needle)) hits.push(`${path.relative(ROOT, file)}: ${needle}`);
        }
    }
    assert.deepEqual(hits, []);
});

test('target-prefill.js takes no Brief sensory crosswalk option and never requires another crosswalk module', () => {
    const src = fs.readFileSync(path.join(ROOT, 'target-prefill.js'), 'utf8');
    assert.ok(!/sensoryCrosswalk/.test(src));
    assert.ok(!/require\(['"]\.\/brief/.test(src));
});
