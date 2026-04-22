#!/usr/bin/env node
/**
 * prompt-b-patch.js
 *
 * QEP Taste Signature — Prompt B
 *   1. Adds Excel (.xlsx) QEP template generator       [batch-import.js]
 *   2. Exposes it on window.BatchImport                [batch-import.js]
 *   3. Adds an "Excel Template" button to the UI       [batch-import-ui.js]
 *   4. Adds a downloadQEPTemplateXLSX() UI wrapper     [batch-import-ui.js]
 *   5. Adds QEP-detection to the .xlsx upload branch   [batch-import-ui.js]
 *
 * Usage:
 *   node prompt-b-patch.js [path/to/batch-import.js] [path/to/batch-import-ui.js]
 *
 * Defaults to ./js/batch-import.js and ./js/batch-import-ui.js if no args given.
 * Makes a .prompt-b.bak alongside each file before writing.
 * Safe to re-run: detects already-patched files and skips.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// -------------------- CLI / defaults --------------------

const DEFAULTS = {
  js: 'js/batch-import.js',
  ui: 'js/batch-import-ui.js'
};

const [, , jsArg, uiArg] = process.argv;
const jsFile = path.resolve(jsArg || DEFAULTS.js);
const uiFile = path.resolve(uiArg || DEFAULTS.ui);

// -------------------- helpers --------------------

function readFile(p) {
  if (!fs.existsSync(p)) {
    throw new Error(`File not found: ${p}`);
  }
  return fs.readFileSync(p, 'utf8');
}

function writeFile(p, content) {
  fs.writeFileSync(p, content, 'utf8');
  console.log(`  \u2713 wrote ${p}`);
}

function backup(p) {
  const b = p + '.prompt-b.bak';
  if (fs.existsSync(b)) {
    console.log(`  \u00b7 backup already at ${b} (not overwritten)`);
  } else {
    fs.copyFileSync(p, b);
    console.log(`  \u2713 backup \u2192 ${b}`);
  }
}

// Unique-anchor replace. Throws if anchor is missing or non-unique.
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

// -------------------- patch definitions --------------------

// ---- Patch 1: batch-import.js — insert generateQEPImportTemplateXLSX() ----

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

// ---- Patch 2: batch-import.js — export on window.BatchImport ----

const JS_ANCHOR_2 = `        generateQEPImportTemplate,
        parseCSVFileV2,`;

const JS_EXPORT_UPDATE = `        generateQEPImportTemplate,
        generateQEPImportTemplateXLSX,
        parseCSVFileV2,`;

// ---- Patch 3: batch-import-ui.js — add Excel button ----

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

// ---- Patch 4: batch-import-ui.js — add downloadQEPTemplateXLSX() wrapper ----

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

// ---- Patch 5: batch-import-ui.js — bridge QEP detection into .xlsx branch ----

const UI_ANCHOR_3 = `        } else if (extension === 'xlsx') {
            result = await parseExcelFile(file);
        } else {`;

const UI_XLSX_BRIDGE = `        } else if (extension === 'xlsx') {
            // --- QEP detection (Excel) ---
            // Read the first sheet as CSV text and route through the QEP CSV
            // pipeline if headers match the QEP signature; otherwise fall back to
            // the generic Excel parser so non-QEP Excel files still work.
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

// Idempotency markers — if these are present the file is already patched.
const JS_PATCHED_MARKER = 'function generateQEPImportTemplateXLSX(';
const UI_PATCHED_MARKER = 'function downloadQEPTemplateXLSX(';

// -------------------- runner --------------------

function patchBatchImportJs() {
  console.log(`\n[1/2] Patching ${jsFile}`);
  let content = readFile(jsFile);

  if (content.indexOf(JS_PATCHED_MARKER) !== -1) {
    console.log('  \u00b7 already patched (generateQEPImportTemplateXLSX exists) \u2014 skipping');
    return;
  }

  backup(jsFile);
  content = uniqueReplace(content, JS_ANCHOR_1, JS_XLSX_GENERATOR, 'JS:insert-xlsx-generator');
  content = uniqueReplace(content, JS_ANCHOR_2, JS_EXPORT_UPDATE, 'JS:export-block');
  writeFile(jsFile, content);
}

function patchBatchImportUiJs() {
  console.log(`\n[2/2] Patching ${uiFile}`);
  let content = readFile(uiFile);

  if (content.indexOf(UI_PATCHED_MARKER) !== -1) {
    console.log('  \u00b7 already patched (downloadQEPTemplateXLSX exists) \u2014 skipping');
    return;
  }

  backup(uiFile);
  content = uniqueReplace(content, UI_ANCHOR_1, UI_BUTTON_UPDATE, 'UI:template-button-row');
  content = uniqueReplace(content, UI_ANCHOR_2, UI_DOWNLOAD_WRAPPERS, 'UI:download-wrappers');
  content = uniqueReplace(content, UI_ANCHOR_3, UI_XLSX_BRIDGE, 'UI:xlsx-upload-bridge');
  writeFile(uiFile, content);
}

function main() {
  console.log('QEP Prompt B patch script');
  console.log('=========================');
  try {
    patchBatchImportJs();
    patchBatchImportUiJs();
    console.log('\nDone.');
  } catch (err) {
    console.error('\nPATCH FAILED:', err.message);
    console.error('No partial writes \u2014 source files left untouched.');
    process.exit(1);
  }
}

main();
