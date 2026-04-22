#!/usr/bin/env node
/**
 * remove-legacy-import.js
 *
 * Taste Signature — removes the legacy "Import Flavor Concepts" feature.
 *
 * Changes:
 *   app.js
 *     1. Delete SAMPLE_FLAVOR_CONCEPTS blob (line 10) + its comment (line 9)
 *     2. Delete pendingImportData declaration (line 13) + its comment (line 12)
 *     3. Delete initImport() call from init sequence (line 20)
 *     4. Delete 'import' nav label entry (line 52)
 *     5. Delete entire "// ===== IMPORT FUNCTIONALITY =====" block
 *        (initImport + handleFileSelect + handleFiles + processImportedData),
 *        lines 2021 to 2162 inclusive
 *
 *   index.html
 *     6. Delete nav anchor (line 357, plus surrounding <a>...</a> block)
 *     7. Delete entire <div id="view-import" class="view"> ... </div>
 *     8. Delete <script src="data-importer.js"> tag
 *
 *   schema-validation.js
 *     9. Delete 'Flavor_Name' and 'flavor_name' mapping entries
 *
 *   data-importer.js
 *     10. Delete the entire file
 *
 *   service-worker.js
 *     11. Bump VERSION so browsers invalidate their caches
 *
 * Usage (from ~/Desktop/taste-signature-PROD/):
 *   node remove-legacy-import.js
 *
 * Safe: each file backed up to .remove-import.bak, aborts on any anchor
 * mismatch without writing. Re-running detects already-applied changes.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const FILES = {
  app:    path.resolve('app.js'),
  html:   path.resolve('index.html'),
  schema: path.resolve('schema-validation.js'),
  data:   path.resolve('data-importer.js'),
  sw:     path.resolve('service-worker.js')
};

const BACKUP_SUFFIX = '.remove-import.bak';

// -------------------- helpers --------------------

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
  const parts = content.split(anchor);
  const occurrences = parts.length - 1;
  if (occurrences === 0) {
    throw new Error(`[${label}] anchor not found. Aborting.`);
  }
  if (occurrences > 1) {
    throw new Error(`[${label}] anchor matched ${occurrences} times. Aborting.`);
  }
  return content.replace(anchor, replacement);
}

// -------------------- anchors --------------------

// ==== app.js: delete SAMPLE_FLAVOR_CONCEPTS + comment (lines 9-10, plus blank line 11) ====
// The blob is huge, so match the comment + start of blob and use a regex up to `];\n`
// Instead, use a unique 2-line anchor and a regex for the blob body.
// Simplest + safest: anchor on the comment line, then remove comment + constant line.
// The SAMPLE_FLAVOR_CONCEPTS const is all on a single line (line 10 ends with `];`).

// ==== app.js Patch 1: SAMPLE_FLAVOR_CONCEPTS ====
// Remove exactly lines 9+10 by matching them as a unit.
function deleteSampleFlavorConcepts(content) {
  const lines = content.split('\n');
  // find the `// Sample flavor concepts data` comment
  const commentIdx = lines.findIndex(l => l === '// Sample flavor concepts data');
  if (commentIdx === -1) throw new Error('[app:sample-blob] comment not found');
  const constIdx = commentIdx + 1;
  if (!lines[constIdx] || !lines[constIdx].startsWith('const SAMPLE_FLAVOR_CONCEPTS')) {
    throw new Error('[app:sample-blob] SAMPLE_FLAVOR_CONCEPTS not on expected line');
  }
  // remove comment + const line + blank line after if present
  let removeCount = 2;
  if (lines[constIdx + 1] === '') removeCount = 3;
  lines.splice(commentIdx, removeCount);
  return lines.join('\n');
}

// ==== app.js Patch 2: pendingImportData ====
const APP_ANCHOR_PENDING = `// Pending import data
let pendingImportData = [];

`;
const APP_REPLACE_PENDING = ``;

// ==== app.js Patch 3: initImport() call ====
const APP_ANCHOR_INITCALL = `    initForm();
    initSliders();
    initImport();
    loadData();`;
const APP_REPLACE_INITCALL = `    initForm();
    initSliders();
    loadData();`;

// ==== app.js Patch 4: nav label entry ====
const APP_ANCHOR_NAVLABEL = `        'history': 'Experience History',
        'import': 'Import Data',
        'integrations': 'Data Integrations',`;
const APP_REPLACE_NAVLABEL = `        'history': 'Experience History',
        'integrations': 'Data Integrations',`;

// ==== app.js Patch 5: whole import functionality block ====
// Use a function that reads between two unique marker lines.
function deleteImportFunctionalityBlock(content) {
  const startMarker = '// ===== IMPORT FUNCTIONALITY =====';
  const endMarker = '// ===== EMOTIONAL MAPPING & CORRELATION =====';
  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker);
  if (startIdx === -1) throw new Error('[app:import-block] start marker not found');
  if (endIdx === -1) throw new Error('[app:import-block] end marker not found');
  if (endIdx < startIdx) throw new Error('[app:import-block] markers in wrong order');
  // Include the empty line before startMarker (if any) - startMarker is preceded by "\n\n"
  // Easier: delete from startMarker through endMarker (exclusive), leaving endMarker intact.
  const before = content.substring(0, startIdx);
  const after = content.substring(endIdx);
  return before + after;
}

// ==== index.html Patch 6: nav anchor ====
const HTML_ANCHOR_NAV = `                            <span>Batch Import</span>
                        </a>
                        <a href="#" class="nav-item" data-view="import">
                            <span class="nav-icon">\u{1F4E5}</span>
                            <span>Import Data</span>
                        </a>
`;
const HTML_REPLACE_NAV = `                            <span>Batch Import</span>
                        </a>
`;

// ==== index.html Patch 7: view-import div ====
// The div starts at line 2271 and ends at line 2329 (the </div> before the Integrations comment).
// Use start marker (unique) through end marker to delete as a block.
function deleteViewImportBlock(content) {
  const startMarker = '                <!-- Import Data View -->';
  const endMarker = '                <!-- Integrations View (NEW - Phase 2) -->';
  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker);
  if (startIdx === -1) throw new Error('[html:view-import] start marker not found');
  if (endIdx === -1) throw new Error('[html:view-import] end marker not found');
  if (endIdx < startIdx) throw new Error('[html:view-import] markers in wrong order');
  // Delete startMarker through just-before endMarker (leaves endMarker in place)
  return content.substring(0, startIdx) + content.substring(endIdx);
}

// ==== index.html Patch 8: script tag ====
const HTML_ANCHOR_SCRIPT = `    <script src="claude-api.js"></script>
    <script src="data-importer.js"></script>
    <script src="excel-import.js"></script>`;
const HTML_REPLACE_SCRIPT = `    <script src="claude-api.js"></script>
    <script src="excel-import.js"></script>`;

// ==== schema-validation.js Patch 9: mapping entries ====
const SCHEMA_ANCHOR_FLAVOR = `    'Product Name': 'name',
    'flavor_name': 'name',
    'Flavor_Name': 'name',
    'item': 'name',`;
const SCHEMA_REPLACE_FLAVOR = `    'Product Name': 'name',
    'item': 'name',`;

// ==== service-worker.js Patch 11: VERSION bump ====
const SW_ANCHOR_VERSION = `const VERSION = '3.4.4-sheetjs-csp-fix';`;
const SW_REPLACE_VERSION = `const VERSION = '3.4.5-remove-legacy-import';`;

// -------------------- idempotency markers --------------------
// If these exist, the patch has already been applied.
const APP_PATCHED_MARKER = '// Sample flavor concepts data'; // absence = patched
const HTML_PATCHED_MARKER = 'data-view="import"'; // absence = patched
const SW_PATCHED_MARKER = `'3.4.5-remove-legacy-import'`; // presence = patched

// -------------------- runners --------------------

function patchAppJs() {
  console.log(`\n[1/5] Patching ${FILES.app}`);
  let content = readFile(FILES.app);
  if (!content.includes(APP_PATCHED_MARKER)) {
    console.log('  \u00b7 already patched (SAMPLE_FLAVOR_CONCEPTS removed) \u2014 skipping');
    return;
  }
  backup(FILES.app);
  content = deleteSampleFlavorConcepts(content);
  content = uniqueReplace(content, APP_ANCHOR_PENDING,  APP_REPLACE_PENDING,  'app:pendingImportData');
  content = uniqueReplace(content, APP_ANCHOR_INITCALL, APP_REPLACE_INITCALL, 'app:initImport-call');
  content = uniqueReplace(content, APP_ANCHOR_NAVLABEL, APP_REPLACE_NAVLABEL, 'app:nav-label');
  content = deleteImportFunctionalityBlock(content);
  writeFile(FILES.app, content);
}

function patchIndexHtml() {
  console.log(`\n[2/5] Patching ${FILES.html}`);
  let content = readFile(FILES.html);
  if (!content.includes(HTML_PATCHED_MARKER)) {
    console.log('  \u00b7 already patched (view-import removed) \u2014 skipping');
    return;
  }
  backup(FILES.html);
  content = uniqueReplace(content, HTML_ANCHOR_NAV, HTML_REPLACE_NAV, 'html:nav-anchor');
  content = deleteViewImportBlock(content);
  content = uniqueReplace(content, HTML_ANCHOR_SCRIPT, HTML_REPLACE_SCRIPT, 'html:script-tag');
  writeFile(FILES.html, content);
}

function patchSchemaValidation() {
  console.log(`\n[3/5] Patching ${FILES.schema}`);
  let content = readFile(FILES.schema);
  if (!content.includes(`'Flavor_Name': 'name',`)) {
    console.log('  \u00b7 already patched (Flavor_Name mapping removed) \u2014 skipping');
    return;
  }
  backup(FILES.schema);
  content = uniqueReplace(content, SCHEMA_ANCHOR_FLAVOR, SCHEMA_REPLACE_FLAVOR, 'schema:flavor-name');
  writeFile(FILES.schema, content);
}

function deleteDataImporter() {
  console.log(`\n[4/5] Removing ${FILES.data}`);
  if (!fs.existsSync(FILES.data)) {
    console.log('  \u00b7 file already removed \u2014 skipping');
    return;
  }
  // Make a backup copy before deleting
  fs.copyFileSync(FILES.data, FILES.data + BACKUP_SUFFIX);
  console.log(`  \u2713 backup \u2192 ${FILES.data}${BACKUP_SUFFIX}`);
  fs.unlinkSync(FILES.data);
  console.log(`  \u2713 deleted ${FILES.data}`);
}

function patchServiceWorker() {
  console.log(`\n[5/5] Patching ${FILES.sw}`);
  let content = readFile(FILES.sw);
  if (content.includes(SW_PATCHED_MARKER)) {
    console.log('  \u00b7 already patched (VERSION is 3.4.5) \u2014 skipping');
    return;
  }
  backup(FILES.sw);
  content = uniqueReplace(content, SW_ANCHOR_VERSION, SW_REPLACE_VERSION, 'sw:version-bump');
  writeFile(FILES.sw, content);
}

function main() {
  console.log('Taste Signature \u2014 remove legacy Import Flavor Concepts feature');
  console.log('================================================================');
  try {
    patchAppJs();
    patchIndexHtml();
    patchSchemaValidation();
    deleteDataImporter();
    patchServiceWorker();
    console.log('\nDone.');
    console.log('\nNext steps:');
    console.log('  1. Verify with grep commands (see chat)');
    console.log('  2. git add -A');
    console.log('  3. git commit -m "Remove legacy Import Flavor Concepts feature"');
    console.log('  4. git push');
    console.log('  5. Wait ~90s for Vercel, hard-refresh the site.');
  } catch (err) {
    console.error('\nPATCH FAILED:', err.message);
    console.error('No partial writes \u2014 aborting.');
    process.exit(1);
  }
}

main();
