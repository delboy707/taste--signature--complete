#!/usr/bin/env node
/**
 * hide-broken-benchmarks.js
 *
 * Taste Signature - hides the two broken Industry Benchmarks sections
 * (Product Benchmark Comparison + Competitive Positioning) from the UI
 * for the beta launch. Create Custom Benchmark remains visible and
 * functional.
 *
 * APPROACH
 * Adds a `qep-hidden-pre-beta` class to the wrapper <div> of each
 * broken section's render function. CSS rule sets display:none on
 * any element with that class. JS continues to run normally — the
 * functions still produce output, the output just isn't visible.
 *
 * WHY HIDE INSTEAD OF REMOVE
 * - Reversible: revert this commit and the sections come back
 * - Safe: doesn't risk breaking shared functions like
 *   compareAgainstBenchmark which the Compare bug fix targets
 * - Easy to find later: grep `qep-hidden-pre-beta` finds every hidden
 *   surface in one go
 *
 * CHANGES
 *   industry-benchmarks-ui.js
 *     1. Line ~149: empty-state wrapper for Product Benchmark Comparison
 *     2. Line ~157: render wrapper for Product Benchmark Comparison
 *     3. Line ~306: render wrapper for Competitive Positioning
 *
 *   styles.css
 *     4. Append `.qep-hidden-pre-beta { display: none; }` at end of file
 *
 *   service-worker.js
 *     5. Bump VERSION to 3.4.14-hide-broken-benchmarks
 *
 * NOTE
 * `analytics-section` is a shared CSS class used by other UI files
 * (batch-import-ui, consumer-panel-ui, etc.). The patch anchors on
 * SURROUNDING CONTEXT, not on the shared class alone, to avoid
 * accidentally hiding other sections. Each anchor includes the unique
 * <h4> heading that follows the wrapper div.
 *
 * Usage (from ~/Desktop/taste-signature-PROD/):
 *   node hide-broken-benchmarks.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const FILES = {
  ui:    path.resolve('industry-benchmarks-ui.js'),
  css:   path.resolve('styles.css'),
  sw:    path.resolve('service-worker.js')
};

const BACKUP_SUFFIX = '.hide-broken-benchmarks.bak';

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

// ---- Change 1: empty-state wrapper for Product Benchmark Comparison ----
// Anchor includes the unique h4 line to ensure we hit only this wrapper.
// Note: emoji 🎯 in source - using \u{1F3AF} for safety in JS string literal.
const UI_ANCHOR_EMPTY = `        return \`
            <div class="analytics-section">
                <h4>\u{1F3AF} Product Benchmark Comparison</h4>
                <p class="empty-state">Log product experiences to compare against industry benchmarks</p>
            </div>
        \`;`;
const UI_REPLACE_EMPTY = `        return \`
            <div class="analytics-section qep-hidden-pre-beta">
                <h4>\u{1F3AF} Product Benchmark Comparison</h4>
                <p class="empty-state">Log product experiences to compare against industry benchmarks</p>
            </div>
        \`;`;

// ---- Change 2: render wrapper for Product Benchmark Comparison ----
// This is the second occurrence in renderProductBenchmarkComparison().
// Anchored on the heading + the unique section-description that follows.
const UI_ANCHOR_PBC = `    return \`
        <div class="analytics-section">
            <h4>\u{1F3AF} Product Benchmark Comparison</h4>
            <p class="section-description">Compare your products against industry standards and see percentile rankings</p>`;
const UI_REPLACE_PBC = `    return \`
        <div class="analytics-section qep-hidden-pre-beta">
            <h4>\u{1F3AF} Product Benchmark Comparison</h4>
            <p class="section-description">Compare your products against industry standards and see percentile rankings</p>`;

// ---- Change 3: render wrapper for Competitive Positioning ----
// Emoji 🏆 = \u{1F3C6}
const UI_ANCHOR_CP = `    return \`
        <div class="analytics-section">
            <h4>\u{1F3C6} Competitive Positioning</h4>
            <p class="section-description">See how your product ranks across multiple industry benchmarks</p>`;
const UI_REPLACE_CP = `    return \`
        <div class="analytics-section qep-hidden-pre-beta">
            <h4>\u{1F3C6} Competitive Positioning</h4>
            <p class="section-description">See how your product ranks across multiple industry benchmarks</p>`;

// ---- Change 4: append CSS rule to styles.css ----
const CSS_RULE = `

/* Pre-beta: hide broken benchmark sections (3.4.14) */
/* Remove this rule and the qep-hidden-pre-beta class instances */
/* in industry-benchmarks-ui.js when those sections are fixed.   */
.qep-hidden-pre-beta {
    display: none;
}
`;

// ---- Change 5: service-worker.js VERSION bump ----
const SW_ANCHOR_VERSION = `const VERSION = '3.4.13-fix-benchmarks-compare';`;
const SW_REPLACE_VERSION = `const VERSION = '3.4.14-hide-broken-benchmarks';`;

// Idempotency markers
const UI_PATCHED_MARKER = 'qep-hidden-pre-beta';            // presence = patched
const CSS_PATCHED_MARKER = '.qep-hidden-pre-beta';          // presence = patched
const SW_PATCHED_MARKER = `'3.4.14-hide-broken-benchmarks'`; // presence = patched

// ====================================================================
// RUNNERS
// ====================================================================

function patchUiJs() {
  console.log(`\n[1/3] Patching ${FILES.ui}`);
  let content = readFile(FILES.ui);
  if (content.includes(UI_PATCHED_MARKER)) {
    console.log('  \u00b7 already patched - skipping');
    return;
  }
  backup(FILES.ui);

  content = uniqueReplace(content, UI_ANCHOR_EMPTY, UI_REPLACE_EMPTY, 'ui:empty-state');
  content = uniqueReplace(content, UI_ANCHOR_PBC,   UI_REPLACE_PBC,   'ui:product-benchmark-comparison');
  content = uniqueReplace(content, UI_ANCHOR_CP,    UI_REPLACE_CP,    'ui:competitive-positioning');

  writeFile(FILES.ui, content);
}

function patchStylesCss() {
  console.log(`\n[2/3] Patching ${FILES.css}`);
  let content = readFile(FILES.css);
  if (content.includes(CSS_PATCHED_MARKER)) {
    console.log('  \u00b7 already patched - skipping');
    return;
  }
  backup(FILES.css);

  content = content + CSS_RULE;

  writeFile(FILES.css, content);
}

function patchServiceWorker() {
  console.log(`\n[3/3] Patching ${FILES.sw}`);
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
  console.log('Taste Signature - hide broken Industry Benchmark sections');
  console.log('=========================================================');
  try {
    patchUiJs();
    patchStylesCss();
    patchServiceWorker();
    console.log('\nDone.');
    console.log('\nNext steps (in chat):');
    console.log('  1. node -c industry-benchmarks-ui.js   # syntax check');
    console.log('  2. git add -A');
    console.log('  3. git commit -m "Hide broken Industry Benchmark sections (Product Comparison + Competitive Positioning)"');
    console.log('  4. git push');
  } catch (err) {
    console.error('\nPATCH FAILED:', err.message);
    console.error('No partial writes - aborting.');
    process.exit(1);
  }
}

main();
