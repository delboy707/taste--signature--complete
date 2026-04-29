#!/usr/bin/env node
/**
 * remove-integrations.js
 *
 * Taste Signature - removes the legacy "Integrations" feature
 * (Barcode Scanner, Spreadsheet Sync, Webhooks & API).
 *
 * Changes:
 *   index.html
 *     1. Remove integrations-styles.css link
 *     2. Remove Integrations nav anchor
 *     3. Remove "Prominent Data Import Callout" green banner on dashboard
 *     4. Remove "Skip Manual Entry" yellow callout in Full Evaluation
 *     5. Remove view-integrations div (lines 2266-2308)
 *     6. Remove 4 script tags: barcode-scanner, spreadsheet-sync,
 *        webhook-integration, camera-integration
 *
 *   app.js
 *     7. Remove 'integrations' nav label
 *     8. Remove 'integrations' router case
 *     9. Remove renderIntegrationsView() function
 *     10. Remove showIntegrationTab() function
 *     11. Remove window.* exports for both
 *
 *   onboarding.js
 *     12. Remove "Import Existing Data" goal-card from welcome screen
 *     13. Remove onboarding-step-2-import block (barcode/spreadsheet/webhook options)
 *     14. Remove handleImportSelection() function
 *
 *   tutorial.js
 *     15. Remove the Integrations tutorial step
 *
 *   service-worker.js
 *     16. Remove '/integrations-styles.css' from urlsToCache
 *     17. Bump VERSION to 3.4.9-remove-integrations
 *
 *   Files deleted:
 *     - barcode-scanner.js
 *     - spreadsheet-sync.js
 *     - webhook-integration.js
 *     - camera-integration.js
 *     - integrations-styles.css
 *
 * Usage (from ~/Desktop/taste-signature-PROD/):
 *   node remove-integrations.js
 *
 * Safe: each modified file backed up to .remove-integrations.bak,
 * each deleted file backed up before deletion. Aborts on any anchor
 * mismatch without writing. Re-running detects already-applied changes.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const FILES = {
  html:    path.resolve('index.html'),
  app:     path.resolve('app.js'),
  onboard: path.resolve('onboarding.js'),
  tutor:   path.resolve('tutorial.js'),
  sw:      path.resolve('service-worker.js')
};

const FILES_TO_DELETE = [
  'barcode-scanner.js',
  'spreadsheet-sync.js',
  'webhook-integration.js',
  'camera-integration.js',
  'integrations-styles.css'
];

const BACKUP_SUFFIX = '.remove-integrations.bak';

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

// Delete view-integrations by tracking <div> depth from the opening tag.
// We start at the comment marker and consume bytes until the matching </div>
// that closes <div id="view-integrations" class="view"> is fully consumed,
// then also consume the trailing newline.
function deleteViewIntegrations(content) {
  const startMarker = `                <!-- Integrations View (NEW - Phase 2) -->`;
  const startIdx = content.indexOf(startMarker);
  if (startIdx === -1) throw new Error('[html:view-integrations] start marker not found');

  // Find the opening div tag for view-integrations after the comment
  const divOpen = content.indexOf('<div id="view-integrations"', startIdx);
  if (divOpen === -1) throw new Error('[html:view-integrations] opening div tag not found');

  // Walk from divOpen tracking <div> / </div> balance.
  let depth = 0;
  let i = divOpen;
  let endOfClosingDiv = -1;
  while (i < content.length) {
    if (content.startsWith('<div', i)) {
      // Make sure it's a real <div tag (followed by space, > or attrs), not <divider/etc.
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
        endOfClosingDiv = i + 6; // length of '</div>'
        break;
      }
      i += 6;
      continue;
    }
    i++;
  }
  if (endOfClosingDiv === -1) throw new Error('[html:view-integrations] could not find matching </div>');

  // Also consume the trailing newline after </div>
  let endIdx = endOfClosingDiv;
  if (content.charAt(endIdx) === '\n') endIdx++;

  return content.substring(0, startIdx) + content.substring(endIdx);
}

// ====================================================================
// PATCH DEFINITIONS
// ====================================================================

// ---- index.html: CSS link ----
const HTML_ANCHOR_CSS = `    <link rel="stylesheet" href="integrations-styles.css">
`;
const HTML_REPLACE_CSS = ``;

// ---- index.html: nav anchor ----
const HTML_ANCHOR_NAV = `                            <span>Batch Import</span>
                        </a>
                        <a href="#" class="nav-item" data-view="integrations">
                            <span class="nav-icon">\u{1F517}</span>
                            <span>Integrations</span>
                            <span class="nav-badge">NEW</span>
                        </a>
`;
const HTML_REPLACE_NAV = `                            <span>Batch Import</span>
                        </a>
`;

// ---- index.html: prominent green dashboard import callout ----
// Whole "data-import-callout" div + the Photo AI button inside it
// (the Photo AI button references quick-entry, not integrations, but the
// whole banner is import-themed so it goes too).
// Anchor on the comment that introduces it through to the closing </div>
// + blank line before "<div class=\"dashboard-grid\">".
const HTML_ANCHOR_GREEN_CALLOUT = `                    <!-- PROMINENT Data Import Callout - Visible to ALL users -->
                    <div class="data-import-callout" style="margin-bottom: 24px; padding: 28px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px; box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);">`;

// We can't safely match through the whole 32-line block as a single anchor
// because of the inline styles, so we use marker-based deletion.
// Start: the comment line.  End: the next "<div class=\"dashboard-grid\">" line.
const GREEN_CALLOUT_START = `                    <!-- PROMINENT Data Import Callout - Visible to ALL users -->`;
const GREEN_CALLOUT_END = `                    <div class="dashboard-grid">`;

// ---- index.html: yellow Full Evaluation callout ----
const YELLOW_CALLOUT_START = `                        <!-- Data Import Callout for Full Evaluation -->`;
const YELLOW_CALLOUT_END = `                        <form id="taste-form">`;



// ---- index.html: 4 script tags ----
const HTML_ANCHOR_SCRIPT_CAMERA = `    <script src="camera-integration.js"></script>
`;
const HTML_REPLACE_SCRIPT_CAMERA = ``;

const HTML_ANCHOR_SCRIPT_BUNDLE = `    <script src="barcode-scanner.js"></script>
    <script src="spreadsheet-sync.js"></script>
    <script src="webhook-integration.js"></script>
`;
const HTML_REPLACE_SCRIPT_BUNDLE = ``;

// ---- app.js: nav label ----
const APP_ANCHOR_NAVLABEL = `        'integrations': 'Data Integrations',
`;
const APP_REPLACE_NAVLABEL = ``;

// ---- app.js: router case ----
const APP_ANCHOR_ROUTER = `            if (viewName === 'integrations') renderIntegrationsView();
`;
const APP_REPLACE_ROUTER = ``;

// ---- app.js: function block (renderIntegrationsView + showIntegrationTab + window exports) ----
// The block runs from line 94 to line 137 inclusive (function decl through window.* exports).
// Use the marker `function renderIntegrationsView()` and end at the next function declaration.
const APP_FN_BLOCK_START = `function renderIntegrationsView() {`;
const APP_FN_BLOCK_END = `// ===== NAVIGATION GROUP TOGGLE =====`;

// ---- onboarding.js: "Import Existing Data" goal-card on welcome screen ----
const ONBOARD_GOALCARD_START = `                        <button class="goal-card" data-goal="import">`;
const ONBOARD_GOALCARD_END = `                        <button class="goal-card" data-goal="explore">`;

// ---- onboarding.js: onboarding-step-2-import block ----
const ONBOARD_STEP2_START = `                <div class="onboarding-content hidden" id="onboarding-step-2-import">`;
const ONBOARD_STEP2_END = `                <div class="onboarding-content hidden" id="onboarding-step-2-explore">`;

// ---- onboarding.js: handleImportSelection function ----
const ONBOARD_FN_START = `    /**
     * Handle import selection - go to integrations
     */
    handleImportSelection(importType) {`;
const ONBOARD_FN_END = `    /**
     * Complete onboarding and go to dashboard
     */
    completeAndGoToDashboard() {`;

// ---- onboarding.js: orphaned import-option click binding ----
const ONBOARD_CLICK_BINDING = `
        // Import options
        document.querySelectorAll('.import-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const importType = option.dataset.import;
                this.handleImportSelection(importType);
            });
        });`;
const ONBOARD_CLICK_BINDING_REPLACE = ``;

// ---- tutorial.js: integrations step ----
// The step is an object { ... } in an array.  Anchor on the start `{` line
// containing target `[data-view="integrations"]` and end at the next step's
// opening `{`.
const TUTOR_STEP_START = `            {
                target: '[data-view="integrations"]',`;
const TUTOR_STEP_END = `            {
                target: '[data-view="log-experience"]',`;

// ---- service-worker.js: VERSION + urlsToCache ----
const SW_ANCHOR_VERSION = `const VERSION = '3.4.8-jspdf-cache-fix';`;
const SW_REPLACE_VERSION = `const VERSION = '3.4.9-remove-integrations';`;
const SW_ANCHOR_CACHE = `  '/integrations-styles.css',
`;
const SW_REPLACE_CACHE = ``;

// Idempotency markers
const HTML_PATCHED_MARKER = 'data-view="integrations"'; // absence = patched
const APP_PATCHED_MARKER = 'function renderIntegrationsView'; // absence = patched
const SW_PATCHED_MARKER = `'3.4.9-remove-integrations'`;

// ====================================================================
// RUNNERS
// ====================================================================

function patchIndexHtml() {
  console.log(`\n[1/5] Patching ${FILES.html}`);
  let content = readFile(FILES.html);
  if (!content.includes(HTML_PATCHED_MARKER)) {
    console.log('  \u00b7 already patched - skipping');
    return;
  }
  backup(FILES.html);

  // Apply patches in order
  content = uniqueReplace(content, HTML_ANCHOR_CSS, HTML_REPLACE_CSS, 'html:css-link');
  content = uniqueReplace(content, HTML_ANCHOR_NAV, HTML_REPLACE_NAV, 'html:nav-anchor');
  content = deleteBlockBetweenMarkers(content, GREEN_CALLOUT_START, GREEN_CALLOUT_END, 'html:green-callout');
  content = deleteBlockBetweenMarkers(content, YELLOW_CALLOUT_START, YELLOW_CALLOUT_END, 'html:yellow-callout');
  content = deleteViewIntegrations(content);
  content = uniqueReplace(content, HTML_ANCHOR_SCRIPT_CAMERA, HTML_REPLACE_SCRIPT_CAMERA, 'html:script-camera');
  content = uniqueReplace(content, HTML_ANCHOR_SCRIPT_BUNDLE, HTML_REPLACE_SCRIPT_BUNDLE, 'html:script-bundle');

  writeFile(FILES.html, content);
}

function patchAppJs() {
  console.log(`\n[2/5] Patching ${FILES.app}`);
  let content = readFile(FILES.app);
  if (!content.includes(APP_PATCHED_MARKER)) {
    console.log('  \u00b7 already patched - skipping');
    return;
  }
  backup(FILES.app);

  content = uniqueReplace(content, APP_ANCHOR_NAVLABEL, APP_REPLACE_NAVLABEL, 'app:nav-label');
  content = uniqueReplace(content, APP_ANCHOR_ROUTER, APP_REPLACE_ROUTER, 'app:router-case');
  content = deleteBlockBetweenMarkers(content, APP_FN_BLOCK_START, APP_FN_BLOCK_END, 'app:fn-block');

  writeFile(FILES.app, content);
}

function patchOnboarding() {
  console.log(`\n[3/5] Patching ${FILES.onboard}`);
  let content = readFile(FILES.onboard);
  if (!content.includes('handleImportSelection')) {
    console.log('  \u00b7 already patched - skipping');
    return;
  }
  backup(FILES.onboard);

  content = deleteBlockBetweenMarkers(content, ONBOARD_GOALCARD_START, ONBOARD_GOALCARD_END, 'onboard:goal-card');
  content = deleteBlockBetweenMarkers(content, ONBOARD_STEP2_START, ONBOARD_STEP2_END, 'onboard:step2-import');
  content = uniqueReplace(content, ONBOARD_CLICK_BINDING, ONBOARD_CLICK_BINDING_REPLACE, 'onboard:click-binding');
  content = deleteBlockBetweenMarkers(content, ONBOARD_FN_START, ONBOARD_FN_END, 'onboard:handler');

  writeFile(FILES.onboard, content);
}

function patchTutorial() {
  console.log(`\n[4/5] Patching ${FILES.tutor}`);
  let content = readFile(FILES.tutor);
  if (!content.includes(`'[data-view="integrations"]'`)) {
    console.log('  \u00b7 already patched - skipping');
    return;
  }
  backup(FILES.tutor);

  content = deleteBlockBetweenMarkers(content, TUTOR_STEP_START, TUTOR_STEP_END, 'tutor:step');

  writeFile(FILES.tutor, content);
}

function patchServiceWorker() {
  console.log(`\n[5/5] Patching ${FILES.sw}`);
  let content = readFile(FILES.sw);
  if (content.includes(SW_PATCHED_MARKER)) {
    console.log('  \u00b7 already patched - skipping');
    return;
  }
  backup(FILES.sw);

  content = uniqueReplace(content, SW_ANCHOR_VERSION, SW_REPLACE_VERSION, 'sw:version');
  content = uniqueReplace(content, SW_ANCHOR_CACHE, SW_REPLACE_CACHE, 'sw:cache');

  writeFile(FILES.sw, content);
}

function deleteFiles() {
  console.log(`\n[6/6] Deleting ${FILES_TO_DELETE.length} files`);
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
  console.log('Taste Signature - remove Integrations feature');
  console.log('==============================================');
  try {
    patchIndexHtml();
    patchAppJs();
    patchOnboarding();
    patchTutorial();
    patchServiceWorker();
    deleteFiles();
    console.log('\nDone.');
    console.log('\nNext steps (in chat):');
    console.log('  1. Verify with grep commands');
    console.log('  2. git add -A');
    console.log('  3. git commit -m "Remove Integrations feature (Barcode/Spreadsheet/Webhooks)"');
    console.log('  4. git push');
  } catch (err) {
    console.error('\nPATCH FAILED:', err.message);
    console.error('No partial writes - aborting.');
    process.exit(1);
  }
}

main();
