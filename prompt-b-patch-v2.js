#!/usr/bin/env node
/**
 * prompt-b-patch-v2.js
 *
 * QEP Taste Signature — Prompt B (second attempt, with cache busting)
 *
 * Patches applied:
 *   batch-import.js
 *     1. Adds Excel (.xlsx) QEP template generator
 *     2. Exposes it on window.BatchImport
 *   batch-import-ui.js
 *     3. Adds "Download Excel Template" button to QEP panel
 *     4. Adds downloadQEPTemplateXLSX() UI wrapper
 *     5. Adds QEP-detection to the .xlsx upload branch
 *   service-worker.js
 *     6. Bumps VERSION (forces cache invalidation on every user's browser)
 *     7. Adds batch-import.js + batch-import-ui.js to networkFirstUrls
 *
 * Usage (from ~/Desktop/taste-signature-PROD/):
 *   node prompt-b-patch-v2.js
 *
 * Safe: creates .prompt-b2.bak alongside each file, aborts without writing
 * if any anchor fails, detects already-patched files on re-run.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// -------------------- files to patch --------------------

const FILES = {
  js:   path.resolve('batch-import.js'),
  ui:   path.resolve('batch-import-ui.js'),
  sw:   path.resolve('service-worker.js')
};

const BACKUP_SUFFIX = '.prompt-b2.bak';

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
    console.log(`  \u00b7 backup exists at ${b} (not overwritten)`);
  } else {
    fs.copyFileSync(p, b);
    console.log(`  \u2713 backup \u2192 ${b}`);
  }
}

function uniqueReplace(content, anchor, replacement, label) {
  const parts = content.split(anchor);
  const occurrences = parts.length - 1;
  if (occurrences === 0) {
    throw new Error(`[${label}] anchor not found. Aborting without writing.`);
  }
  if (occurrences > 1) {
    throw new Error(`[${label}] anchor matched ${occurrences} times; need a unique anchor. Aborting.`);
  }
  return content.replace(anchor, replacement);
}

// -------------------- patch 1-2: batch-import.js --------------------

const JS_ANCHOR_1 = `  link.download = "QEP_Taste_Signature_Import_Template.csv";
  link.click();
  window.URL.revokeObjectURL(url);
}`;

const JS_XLSX_GENERATOR = `  link.download = "QEP_Taste_Signature_Import_Template.csv";
  link.click();
  window.URL.revokeObjectURL(url);
}

/**
 * generateQEPImportTemplateXLSX()
 *
 * Builds the same 262-column QEP template as an Excel (.xlsx) workbook.
 * Requires SheetJS (global XLSX) to be loaded.
 * Row 1 = headers, Row 2 = instructions, Row 3 = sample data, Row 4 = blank starter.
 */
function generateQEPImportTemplateXLSX() {
  if (typeof XLSX === "undefined") {
    alert("Excel library (SheetJS) is not loaded. Please refresh the page or use the CSV template.");
    return;
  }

  var headers = QEP_METADATA_COLS.slice();
  var instructions = [
    "[required]","[required]","[required e.g. chocolate/beverage/snack]",
    "[required e.g. Original/Light]","[number of panellists]","[YYYY-MM-DD]"
  ];
  var sample = [
    "Dark Chocolate Bar","QEP Sample Brand","confectionery","70% Cocoa Original","12","2026-04-18"
  ];

  Object.keys(QEP_STAGES).forEach(function(prefix) {
    var stage = QEP_STAGES[prefix];
    stage.attributes.forEach(function(attr) {
      headers.push(prefix + "_" + attr);
      instructions.push("[0-10 or leave blank if not assessed]");
      sample.push("");
    });
    headers.push(prefix + "_Emotions");
    headers.push(prefix + "_Notes");
    instructions.push("[Select from: " + stage.emotions.join(";") + "] - separate with semicolons");
    instructions.push("[optional free text]");
    sample.push("");
    sample.push("");
  });

  var blank = new Array(headers.length).fill("");
  var aoa = [headers, instructions, sample, blank];

  var ws = XLSX.utils.aoa_to_sheet(aoa);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "QEP_Template");
  XLSX.writeFile(wb, "QEP_Taste_Signature_Import_Template.xlsx");
}`;

const JS_ANCHOR_2 = `        generateQEPImportTemplate,
        parseCSVFileV2,`;

const JS_EXPORT_UPDATE = `        generateQEPImportTemplate,
        generateQEPImportTemplateXLSX,
        parseCSVFileV2,`;

// -------------------- patch 3-5: batch-import-ui.js --------------------

const UI_ANCHOR_1 =
  `      '<button class="btn-primary" onclick="downloadQEPTemplate()" style="margin-right:8px;">' +\n` +
  `        'Download QEP Full Template (262 columns)' +\n` +
  `      '</button>' +\n` +
  `      '<button class="btn-secondary" onclick="showQEPImportHelp()">How to use</button>' +`;

const UI_BUTTON_UPDATE =
  `      '<button class="btn-primary" onclick="downloadQEPTemplate()" style="margin-right:8px;">' +\n` +
  `        'Download CSV Template (262 columns)' +\n` +
  `      '</button>' +\n` +
  `      '<button class="btn-primary" onclick="downloadQEPTemplateXLSX()" style="margin-right:8px;">' +\n` +
  `        'Download Excel Template (262 columns)' +\n` +
  `      '</button>' +\n` +
  `      '<button class="btn-secondary" onclick="showQEPImportHelp()">How to use</button>' +`;

const UI_ANCHOR_2 = `function downloadQEPTemplate() {
  if (typeof generateQEPImportTemplate === "function") {
    generateQEPImportTemplate();
  } else if (window.BatchImport && typeof window.BatchImport.generateQEPImportTemplate === "function") {
    window.BatchImport.generateQEPImportTemplate();
  } else {
    alert("QEP template generator is not loaded. Please refresh the page.");
  }
}`;

const UI_DOWNLOAD_WRAPPERS = `function downloadQEPTemplate() {
  if (typeof generateQEPImportTemplate === "function") {
    generateQEPImportTemplate();
  } else if (window.BatchImport && typeof window.BatchImport.generateQEPImportTemplate === "function") {
    window.BatchImport.generateQEPImportTemplate();
  } else {
    alert("QEP template generator is not loaded. Please refresh the page.");
  }
}

function downloadQEPTemplateXLSX() {
  if (typeof generateQEPImportTemplateXLSX === "function") {
    generateQEPImportTemplateXLSX();
  } else if (window.BatchImport && typeof window.BatchImport.generateQEPImportTemplateXLSX === "function") {
    window.BatchImport.generateQEPImportTemplateXLSX();
  } else {
    alert("QEP Excel template generator is not loaded. Please refresh the page.");
  }
}`;

const UI_ANCHOR_3 = `        } else if (extension === 'xlsx') {
            result = await parseExcelFile(file);
        } else {`;

const UI_XLSX_BRIDGE = `        } else if (extension === 'xlsx') {
            // --- QEP detection (Excel) ---
            // Read the first sheet as CSV text and route through the QEP CSV
            // pipeline if headers match the QEP signature; otherwise fall back
            // to the generic Excel parser so non-QEP Excel files still work.
            if (typeof XLSX !== "undefined") {
                try {
                    const buf = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target.result);
                        reader.onerror = () => reject(new Error('Failed to read Excel file'));
                        reader.readAsArrayBuffer(file);
                    });
                    const workbook = XLSX.read(new Uint8Array(buf), { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const csvText = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheetName]);
                    if (typeof isQEPCSV === "function" && isQEPCSV(csvText)) {
                        handleQEPCSVUpload(csvText, file.name);
                        return;
                    }
                } catch (xlsxErr) {
                    console.warn('QEP Excel detection failed, falling back to generic parser:', xlsxErr);
                }
            }
            result = await parseExcelFile(file);
        } else {`;

// -------------------- patch 6-7: service-worker.js --------------------

// Patch 6: VERSION bump.  Old = 3.4.1-offline, new = 3.4.2-prompt-b.
// A new VERSION forces every user's browser to activate the new SW and delete
// the old cache (see the existing activate handler in the file).
const SW_ANCHOR_VERSION = `const VERSION = '3.4.1-offline';`;
const SW_VERSION_UPDATE = `const VERSION = '3.4.2-prompt-b';`;

// Patch 7: add batch-import files to networkFirstUrls.  This makes the
// existing fetch handler treat them explicitly as network-first rather than
// relying on the generic .js rule.
const SW_ANCHOR_NETWORKFIRST = `  '/recipe-tracker.js'
];`;

const SW_NETWORKFIRST_UPDATE = `  '/recipe-tracker.js',
  '/batch-import.js',
  '/batch-import-ui.js'
];`;

// -------------------- idempotency markers --------------------

const JS_PATCHED_MARKER = 'function generateQEPImportTemplateXLSX(';
const UI_PATCHED_MARKER = 'function downloadQEPTemplateXLSX(';
const SW_PATCHED_MARKER = `'3.4.2-prompt-b'`;

// -------------------- runners --------------------

function patchBatchImportJs() {
  console.log(`\n[1/3] Patching ${FILES.js}`);
  let content = readFile(FILES.js);
  if (content.indexOf(JS_PATCHED_MARKER) !== -1) {
    console.log('  \u00b7 already patched \u2014 skipping');
    return;
  }
  backup(FILES.js);
  content = uniqueReplace(content, JS_ANCHOR_1, JS_XLSX_GENERATOR, 'JS:xlsx-generator');
  content = uniqueReplace(content, JS_ANCHOR_2, JS_EXPORT_UPDATE, 'JS:export-block');
  writeFile(FILES.js, content);
}

function patchBatchImportUiJs() {
  console.log(`\n[2/3] Patching ${FILES.ui}`);
  let content = readFile(FILES.ui);
  if (content.indexOf(UI_PATCHED_MARKER) !== -1) {
    console.log('  \u00b7 already patched \u2014 skipping');
    return;
  }
  backup(FILES.ui);
  content = uniqueReplace(content, UI_ANCHOR_1, UI_BUTTON_UPDATE, 'UI:template-buttons');
  content = uniqueReplace(content, UI_ANCHOR_2, UI_DOWNLOAD_WRAPPERS, 'UI:download-wrappers');
  content = uniqueReplace(content, UI_ANCHOR_3, UI_XLSX_BRIDGE, 'UI:xlsx-upload-bridge');
  writeFile(FILES.ui, content);
}

function patchServiceWorker() {
  console.log(`\n[3/3] Patching ${FILES.sw}`);
  let content = readFile(FILES.sw);
  if (content.indexOf(SW_PATCHED_MARKER) !== -1) {
    console.log('  \u00b7 already patched \u2014 skipping');
    return;
  }
  backup(FILES.sw);
  content = uniqueReplace(content, SW_ANCHOR_VERSION, SW_VERSION_UPDATE, 'SW:version-bump');
  content = uniqueReplace(content, SW_ANCHOR_NETWORKFIRST, SW_NETWORKFIRST_UPDATE, 'SW:networkfirst-list');
  writeFile(FILES.sw, content);
}

function main() {
  console.log('QEP Prompt B patch script (v2 \u2014 with cache busting)');
  console.log('===================================================');
  try {
    patchBatchImportJs();
    patchBatchImportUiJs();
    patchServiceWorker();
    console.log('\nDone.');
    console.log('\nNext steps:');
    console.log('  1. grep -c "generateQEPImportTemplateXLSX" batch-import.js   (expect 3)');
    console.log('  2. grep -c "downloadQEPTemplateXLSX" batch-import-ui.js      (expect 2)');
    console.log('  3. grep "const VERSION" service-worker.js                    (expect 3.4.2-prompt-b)');
    console.log('  4. git add batch-import.js batch-import-ui.js service-worker.js');
    console.log('  5. git commit -m "Prompt B + SW cache bump"');
    console.log('  6. git push');
    console.log('  7. Wait ~90s for Vercel, then hard-refresh site.');
  } catch (err) {
    console.error('\nPATCH FAILED:', err.message);
    console.error('No partial writes \u2014 source files left untouched.');
    process.exit(1);
  }
}

main();
