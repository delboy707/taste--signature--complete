#!/usr/bin/env node
/**
 * fix-benchmarks-compare.js
 *
 * Taste Signature - completes the Industry Benchmarks schema-shape audit
 * by fixing the last unguarded `product.stages.aftertaste.emotions.satisfaction`
 * read in compareAgainstBenchmark (industry-benchmarks.js line 653).
 *
 * ROOT CAUSE
 * Same family as the createBenchmarkFromProducts bugs fixed in
 * 3.4.12-fix-benchmarks-create. The "Product Benchmark Comparison"
 * workflow (Industry Benchmarks → Compare button) calls
 * compareAgainstBenchmark, which reads aftertaste.emotions.satisfaction
 * without a null guard. If the selected product is missing that path
 * (mixed-vintage products, partial saves, old schema records), the
 * function throws TypeError, returns undefined, and the UI shows
 * "Error performing comparison" with no console error (the throw
 * is swallowed at the onclick boundary).
 *
 * AUDIT RESULT
 * `grep 'p\\.stages\\.\\|\\.stages\\.aftertaste\\.' industry-benchmarks.js`
 * returned exactly one match — line 653. Other reads in the file
 * (lines 627, 631) are inside surrounding null guards and are safe.
 *
 * CHANGES
 *   industry-benchmarks.js
 *     1. Line 653: add optional chaining to the satisfaction read
 *        product.stages.aftertaste.emotions.satisfaction
 *     -> product?.stages?.aftertaste?.emotions?.satisfaction
 *
 *   service-worker.js
 *     2. Bump VERSION to 3.4.13-fix-benchmarks-compare
 *
 *   No files deleted, no other features touched.
 *
 * Usage (from ~/Desktop/taste-signature-PROD/):
 *   node fix-benchmarks-compare.js
 *
 * Safe: each modified file backed up to .fix-benchmarks-compare.bak.
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

const BACKUP_SUFFIX = '.fix-benchmarks-compare.bak';

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

// ---- Change 1: line 653 satisfaction read ----
// Anchored on the full line including indentation. Confirmed unique.
const SATISFACTION_ANCHOR = `    const productSatisfaction = product.stages.aftertaste.emotions.satisfaction || 0;`;
const SATISFACTION_REPLACE = `    const productSatisfaction = product?.stages?.aftertaste?.emotions?.satisfaction || 0;`;

// ---- Change 2: service-worker.js VERSION bump ----
const SW_ANCHOR_VERSION = `const VERSION = '3.4.12-fix-benchmarks-create';`;
const SW_REPLACE_VERSION = `const VERSION = '3.4.13-fix-benchmarks-compare';`;

// Idempotency markers
const BENCHMARKS_PATCHED_MARKER = `product?.stages?.aftertaste?.emotions?.satisfaction`;
const SW_PATCHED_MARKER = `'3.4.13-fix-benchmarks-compare'`;

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
  console.log('Taste Signature - fix compareAgainstBenchmark schema bug');
  console.log('========================================================');
  try {
    patchBenchmarksJs();
    patchServiceWorker();
    console.log('\nDone.');
    console.log('\nNext steps (in chat):');
    console.log('  1. Verify with grep commands');
    console.log('  2. node -c industry-benchmarks.js   # syntax check');
    console.log('  3. git add -A');
    console.log('  4. git commit -m "Fix Industry Benchmarks: schema-shape bug in compareAgainstBenchmark"');
    console.log('  5. git push');
  } catch (err) {
    console.error('\nPATCH FAILED:', err.message);
    console.error('No partial writes - aborting.');
    process.exit(1);
  }
}

main();
