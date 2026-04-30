#!/usr/bin/env node
/**
 * fix-benchmarks-create.js
 *
 * Taste Signature - fixes 3 schema-shape bugs in createBenchmarkFromProducts
 * (industry-benchmarks.js) that prevented the "Create Custom Benchmark"
 * workflow from succeeding on a mixed selection of old + new products.
 *
 * ROOT CAUSE
 * The function reads stage attributes from products without defensive
 * null checks. Two failure paths:
 *
 *   - Lexicon expansion added a 6th stage ("texture") between Mid/Rear
 *     Mouth and Aftertaste. The hard-coded 5-element stageKeys array
 *     missed it.
 *
 *   - Bare property access like
 *     `p.stages.aftertaste.emotions.satisfaction || 0`
 *     throws TypeError if any selected product is missing aftertaste,
 *     emotions, or satisfaction. The throw exits via the onclick event
 *     boundary which silently swallows it, causing
 *     `createBenchmarkFromProducts` to return undefined and the UI to
 *     show "Error creating benchmark" with no console error.
 *
 * This is regression #4 in the "stages.X.Y schema-shape" pattern flagged
 * in CLAUDE.md.
 *
 * CHANGES
 *   industry-benchmarks.js
 *     1. stageKeys array - add 'texture' between 'midRearMouth' and
 *        'aftertaste' to match the 6-stage post-lexicon-expansion schema
 *     2. Inner attribute map - replace `p.stages[stageKey][attrKey]`
 *        with `p?.stages?.[stageKey]?.[attrKey]` for null-safety across
 *        mixed-vintage product selections
 *     3. Satisfaction map - replace
 *        `p.stages.aftertaste.emotions.satisfaction || 0`
 *        with
 *        `p?.stages?.aftertaste?.emotions?.satisfaction || 0`
 *
 *   service-worker.js
 *     4. Bump VERSION to 3.4.12-fix-benchmarks-create
 *        (Note: industry-benchmarks.js is not in networkFirstUrls, so
 *         the SW version bump is what forces the cache to refresh.)
 *
 *   No files deleted, no other features touched.
 *
 * Usage (from ~/Desktop/taste-signature-PROD/):
 *   node fix-benchmarks-create.js
 *
 * Safe: each modified file backed up to .fix-benchmarks-create.bak.
 * Aborts on any anchor mismatch without writing.
 * Re-running detects already-applied changes.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const FILES = {
  benchmarks: path.resolve('industry-benchmarks.js'),
  sw:         path.resolve('service-worker.js')
};

const BACKUP_SUFFIX = '.fix-benchmarks-create.bak';

// ====================================================================
// HELPERS
// ====================================================================

function readFile(p) {
  if (!fs.existsSync(p)) throw new Error(`File not found: ${p}`);
  return fs.readFileSync(p, 'utf8');
}
function writeFile(p, content) {
  fs.writeFileSync(p, content, 'utf8');
  console.log(`  \u2713 wrote ${p}`);
}
function backup(p) {
  const b = p + BACKUP_SUFFIX;
  if (fs.existsSync(b)) {
    console.log(`  \u00b7 backup already exists at ${b}`);
  } else {
    fs.copyFileSync(p, b);
    console.log(`  \u2713 backup \u2192 ${b}`);
  }
}
function uniqueReplace(content, anchor, replacement, label) {
  const occurrences = content.split(anchor).length - 1;
  if (occurrences === 0) {
    throw new Error(`[${label}] anchor not found. Aborting.`);
  }
  if (occurrences > 1) {
    throw new Error(`[${label}] anchor matched ${occurrences} times. Aborting.`);
  }
  return content.replace(anchor, replacement);
}

// ====================================================================
// PATCH DEFINITIONS
// ====================================================================

// ---- Change 1: stageKeys array - add 'texture' ----
// Confirmed unique: only one stageKeys array in industry-benchmarks.js with
// this exact list of 5 stages.
const STAGEKEYS_ANCHOR = `    const stageKeys = ['appearance', 'aroma', 'frontMouth', 'midRearMouth', 'aftertaste'];`;
const STAGEKEYS_REPLACE = `    const stageKeys = ['appearance', 'aroma', 'frontMouth', 'midRearMouth', 'texture', 'aftertaste'];`;

// ---- Change 2: Inner attribute map - add optional chaining ----
// Confirmed unique: this exact .map line appears once.
const ATTR_MAP_ANCHOR = `            const values = products
                .map(p => p.stages[stageKey][attrKey])
                .filter(v => v !== undefined);`;
const ATTR_MAP_REPLACE = `            const values = products
                .map(p => p?.stages?.[stageKey]?.[attrKey])
                .filter(v => v !== undefined);`;

// ---- Change 3: Satisfaction map - add optional chaining ----
// Confirmed unique: this exact .map line appears once.
const SATISFACTION_ANCHOR = `    const satisfactionValues = products
        .map(p => p.stages.aftertaste.emotions.satisfaction || 0)
        .filter(v => v > 0);`;
const SATISFACTION_REPLACE = `    const satisfactionValues = products
        .map(p => p?.stages?.aftertaste?.emotions?.satisfaction || 0)
        .filter(v => v > 0);`;

// ---- Change 4: service-worker.js VERSION bump ----
const SW_ANCHOR_VERSION = `const VERSION = '3.4.11-remove-photo';`;
const SW_REPLACE_VERSION = `const VERSION = '3.4.12-fix-benchmarks-create';`;

// Idempotency markers
// Patched if the new 6-stage array OR new optional-chained reads are present.
// We only need one signal; pick the cleanest.
const BENCHMARKS_PATCHED_MARKER = `'midRearMouth', 'texture', 'aftertaste'`;
const SW_PATCHED_MARKER = `'3.4.12-fix-benchmarks-create'`;

// ====================================================================
// RUNNERS
// ====================================================================

function patchBenchmarksJs() {
  console.log(`\n[1/2] Patching ${FILES.benchmarks}`);
  let content = readFile(FILES.benchmarks);
  if (content.includes(BENCHMARKS_PATCHED_MARKER)) {
    console.log('  \u00b7 already patched - skipping');
    return;
  }
  backup(FILES.benchmarks);

  content = uniqueReplace(content, STAGEKEYS_ANCHOR,    STAGEKEYS_REPLACE,    'benchmarks:stageKeys');
  content = uniqueReplace(content, ATTR_MAP_ANCHOR,     ATTR_MAP_REPLACE,     'benchmarks:attr-map');
  content = uniqueReplace(content, SATISFACTION_ANCHOR, SATISFACTION_REPLACE, 'benchmarks:satisfaction');

  writeFile(FILES.benchmarks, content);
}

function patchServiceWorker() {
  console.log(`\n[2/2] Patching ${FILES.sw}`);
  let content = readFile(FILES.sw);
  if (content.includes(SW_PATCHED_MARKER)) {
    console.log('  \u00b7 already patched - skipping');
    return;
  }
  backup(FILES.sw);

  content = uniqueReplace(content, SW_ANCHOR_VERSION, SW_REPLACE_VERSION, 'sw:version');

  writeFile(FILES.sw, content);
}

function main() {
  console.log('Taste Signature - fix createBenchmarkFromProducts schema bugs');
  console.log('=============================================================');
  try {
    patchBenchmarksJs();
    patchServiceWorker();
    console.log('\nDone.');
    console.log('\nNext steps (in chat):');
    console.log('  1. Verify with grep commands');
    console.log('  2. node -c industry-benchmarks.js   # syntax check');
    console.log('  3. git add -A');
    console.log('  4. git commit -m "Fix Industry Benchmarks: schema-shape bugs in createBenchmarkFromProducts"');
    console.log('  5. git push');
  } catch (err) {
    console.error('\nPATCH FAILED:', err.message);
    console.error('No partial writes - aborting.');
    process.exit(1);
  }
}

main();
