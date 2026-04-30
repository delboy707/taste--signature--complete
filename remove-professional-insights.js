#!/usr/bin/env node
/**
 * remove-professional-insights.js
 *
 * Taste Signature - removes the "Professional Insights" feature
 * (the legacy advanced-analytics view powered by renderAdvancedAnalytics).
 *
 * Note: This is distinct from "AI Insights" (data-view="ai-insights"),
 * which is an entirely separate Claude-powered feature and is NOT touched.
 *
 * Changes:
 *   index.html
 *     1. Remove "Insights View" comment + <div id="view-insights"> block
 *     2. Remove Professional Insights nav anchor
 *     3. Remove <script src="advanced-analytics.js"> tag
 *
 *   app.js
 *     4. Remove 'insights' label entry
 *     5. Remove 'insights' router case
 *
 *   styles.css
 *     6. Remove .advanced-analytics { ... } rule (CSS block at ~line 3369).
 *        ONLY this wrapper rule. Generic-named selectors that follow
 *        (.analytics-section, .stat-cards, .trend-card, etc.) are SHARED
 *        across 8 other UI files and must NOT be removed.
 *
 *   service-worker.js
 *     7. Bump VERSION to 3.4.10-remove-professional-insights
 *
 *   Files deleted:
 *     - advanced-analytics.js
 *
 * Usage (from ~/Desktop/taste-signature-PROD/):
 *   node remove-professional-insights.js
 *
 * Safe: each modified file backed up to .remove-professional-insights.bak,
 * each deleted file backed up before deletion. Aborts on any anchor
 * mismatch without writing. Re-running detects already-applied changes.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const FILES = {
  html: path.resolve('index.html'),
  app:  path.resolve('app.js'),
  css:  path.resolve('styles.css'),
  sw:   path.resolve('service-worker.js')
};

const FILES_TO_DELETE = [
  'advanced-analytics.js'
];

const BACKUP_SUFFIX = '.remove-professional-insights.bak';

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
function deleteBlockBetweenMarkers(content, startMarker, endMarker, label) {
  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker);
  if (startIdx === -1) throw new Error(`[${label}] start marker not found`);
  if (endIdx === -1) throw new Error(`[${label}] end marker not found`);
  if (endIdx < startIdx) throw new Error(`[${label}] markers in wrong order`);
  return content.substring(0, startIdx) + content.substring(endIdx);
}

// Delete <div id="view-insights" class="view"> by tracking <div> depth.
// Same technique as the view-integrations deletion in the previous patch.
function deleteViewInsights(content) {
  const startMarker = `                <!-- Insights View -->`;
  const startIdx = content.indexOf(startMarker);
  if (startIdx === -1) throw new Error('[html:view-insights] start marker not found');

  // Verify there is exactly one occurrence
  const occurrences = content.split(startMarker).length - 1;
  if (occurrences > 1) {
    throw new Error(`[html:view-insights] start marker matched ${occurrences} times. Aborting.`);
  }

  // Find the opening div tag for view-insights after the comment
  const divOpen = content.indexOf('<div id="view-insights"', startIdx);
  if (divOpen === -1) throw new Error('[html:view-insights] opening div tag not found');

  // Walk from divOpen tracking <div> / </div> balance.
  let depth = 0;
  let i = divOpen;
  let endOfClosingDiv = -1;
  while (i < content.length) {
    if (content.startsWith('<div', i)) {
      const next = content.charAt(i + 4);
      if (next === ' ' || next === '>' || next === '\t' || next === '\n') {
        depth++;
        i += 4;
        continue;
      }
    }
    if (content.startsWith('</div>', i)) {
      depth--;
      if (depth === 0) {
        endOfClosingDiv = i + 6;
        break;
      }
      i += 6;
      continue;
    }
    i++;
  }
  if (endOfClosingDiv === -1) throw new Error('[html:view-insights] could not find matching </div>');

  // Also consume the trailing newline after </div>
  let endIdx = endOfClosingDiv;
  if (content.charAt(endIdx) === '\n') endIdx++;

  return content.substring(0, startIdx) + content.substring(endIdx);
}

// ====================================================================
// PATCH DEFINITIONS
// ====================================================================

// ---- index.html: nav anchor ----
// Anchor is the full <a> block for data-view="insights" plus surrounding
// whitespace. Confirmed unique: data-view="insights" appears once in index.html.
const HTML_ANCHOR_NAV = `                        <a href="#" class="nav-item" data-view="insights">
                            <span class="nav-icon">\u{1F4A1}</span>
                            <span>Professional Insights</span>
                        </a>
`;
const HTML_REPLACE_NAV = ``;

// ---- index.html: <script src="advanced-analytics.js"> tag ----
const HTML_ANCHOR_SCRIPT = `    <script src="advanced-analytics.js"></script>
`;
const HTML_REPLACE_SCRIPT = ``;

// ---- app.js: label entry ----
const APP_ANCHOR_LABEL = `        'insights': 'Professional Insights',
`;
const APP_REPLACE_LABEL = ``;

// ---- app.js: router case ----
const APP_ANCHOR_ROUTER = `            if (viewName === 'insights') renderAdvancedAnalytics();
`;
const APP_REPLACE_ROUTER = ``;

// ---- styles.css: .advanced-analytics { ... } rule ----
// Marker-based: start at `.advanced-analytics {` (confirmed unique top-level
// selector via grep `^\.advanced-analytics`), end at the next selector
// `.analytics-section {`. The block to delete is just the wrapper rule.
// IMPORTANT: We do NOT touch .analytics-section, .stat-cards, .trend-card,
// or any other generic-named selectors — they're shared across 8 other
// UI files (batch-import-ui, consumer-panel-ui, custom-lexicon-ui, etc.)
const CSS_BLOCK_START = `.advanced-analytics {`;
const CSS_BLOCK_END = `.analytics-section {`;

// ---- service-worker.js: VERSION bump ----
const SW_ANCHOR_VERSION = `const VERSION = '3.4.9-remove-integrations';`;
const SW_REPLACE_VERSION = `const VERSION = '3.4.10-remove-professional-insights';`;

// Idempotency markers (absence/presence indicates already-patched state)
const HTML_PATCHED_MARKER = 'data-view="insights"';        // absence = patched
const APP_PATCHED_MARKER = 'renderAdvancedAnalytics';      // absence = patched
const CSS_PATCHED_MARKER = '.advanced-analytics {';        // absence = patched
const SW_PATCHED_MARKER = `'3.4.10-remove-professional-insights'`; // presence = patched

// ====================================================================
// RUNNERS
// ====================================================================

function patchIndexHtml() {
  console.log(`\n[1/4] Patching ${FILES.html}`);
  let content = readFile(FILES.html);
  if (!content.includes(HTML_PATCHED_MARKER)) {
    console.log('  \u00b7 already patched - skipping');
    return;
  }
  backup(FILES.html);

  content = deleteViewInsights(content);
  content = uniqueReplace(content, HTML_ANCHOR_NAV, HTML_REPLACE_NAV, 'html:nav-anchor');
  content = uniqueReplace(content, HTML_ANCHOR_SCRIPT, HTML_REPLACE_SCRIPT, 'html:script-tag');

  writeFile(FILES.html, content);
}

function patchAppJs() {
  console.log(`\n[2/4] Patching ${FILES.app}`);
  let content = readFile(FILES.app);
  if (!content.includes(APP_PATCHED_MARKER)) {
    console.log('  \u00b7 already patched - skipping');
    return;
  }
  backup(FILES.app);

  content = uniqueReplace(content, APP_ANCHOR_LABEL, APP_REPLACE_LABEL, 'app:label');
  content = uniqueReplace(content, APP_ANCHOR_ROUTER, APP_REPLACE_ROUTER, 'app:router');

  writeFile(FILES.app, content);
}

function patchStylesCss() {
  console.log(`\n[3/4] Patching ${FILES.css}`);
  let content = readFile(FILES.css);
  if (!content.includes(CSS_PATCHED_MARKER)) {
    console.log('  \u00b7 already patched - skipping');
    return;
  }
  backup(FILES.css);

  // Pre-check: confirm both markers exist and start comes before end.
  // (deleteBlockBetweenMarkers will throw on its own, but we want a
  // clearer error message specific to the CSS context.)
  const startIdx = content.indexOf(CSS_BLOCK_START);
  const endIdx = content.indexOf(CSS_BLOCK_END);
  if (startIdx === -1) throw new Error('[css] .advanced-analytics block start not found');
  if (endIdx === -1) throw new Error('[css] .analytics-section selector not found (expected as block-end marker)');
  if (endIdx < startIdx) {
    throw new Error('[css] markers in wrong order — .analytics-section appears before .advanced-analytics. Aborting to avoid corrupting CSS.');
  }

  content = deleteBlockBetweenMarkers(content, CSS_BLOCK_START, CSS_BLOCK_END, 'css:advanced-analytics-block');

  writeFile(FILES.css, content);
}

function patchServiceWorker() {
  console.log(`\n[4/4] Patching ${FILES.sw}`);
  let content = readFile(FILES.sw);
  if (content.includes(SW_PATCHED_MARKER)) {
    console.log('  \u00b7 already patched - skipping');
    return;
  }
  backup(FILES.sw);

  content = uniqueReplace(content, SW_ANCHOR_VERSION, SW_REPLACE_VERSION, 'sw:version');

  writeFile(FILES.sw, content);
}

function deleteFiles() {
  console.log(`\n[5/5] Deleting ${FILES_TO_DELETE.length} file(s)`);
  FILES_TO_DELETE.forEach(name => {
    const fp = path.resolve(name);
    if (!fs.existsSync(fp)) {
      console.log(`  \u00b7 ${name} already removed - skipping`);
      return;
    }
    fs.copyFileSync(fp, fp + BACKUP_SUFFIX);
    console.log(`  \u2713 backup \u2192 ${fp}${BACKUP_SUFFIX}`);
    fs.unlinkSync(fp);
    console.log(`  \u2713 deleted ${fp}`);
  });
}

function main() {
  console.log('Taste Signature - remove Professional Insights feature');
  console.log('======================================================');
  try {
    patchIndexHtml();
    patchAppJs();
    patchStylesCss();
    patchServiceWorker();
    deleteFiles();
    console.log('\nDone.');
    console.log('\nNext steps (in chat):');
    console.log('  1. Verify with grep commands');
    console.log('  2. git add -A');
    console.log('  3. git commit -m "Remove Professional Insights feature (advanced-analytics)"');
    console.log('  4. git push');
  } catch (err) {
    console.error('\nPATCH FAILED:', err.message);
    console.error('No partial writes - aborting.');
    process.exit(1);
  }
}

main();
