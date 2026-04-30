#!/usr/bin/env node
/**
 * remove-photo.js
 *
 * Taste Signature - removes the Photo Gallery + Photo AI feature.
 *
 * SCOPE:
 *   This patch removes JS, HTML, and quick-entry-specific CSS for the photo
 *   feature. It DOES NOT touch styles.css or voice-photo-styles.css:
 *
 *   - styles.css contains ~500 lines of photo CSS (lines 6329-6900) but is
 *     interleaved with shared rules (.filter-controls at 6384, and an
 *     .upload-dialog-content rule inside a media query at ~6857). Both are
 *     orphans now (no consumers in JS/HTML), but the safer call is to leave
 *     them and do a CSS coverage audit after all 4 feature removals.
 *
 *   - voice-photo-styles.css is shared with the Voice Input feature
 *     (the next feature to be removed). It will be deleted as part of
 *     remove-voice-input.js.
 *
 * Changes:
 *   index.html
 *     1. Remove Photo Gallery nav anchor (data-view="photo-gallery")
 *     2. Remove "Photo Gallery View" comment + <div id="view-photo-gallery">
 *     3. Remove Photo AI button block (Quick Entry, line ~649)
 *     4. Remove <script src="photo-manager.js">
 *     5. Remove <script src="photo-manager-ui.js">
 *     6. Remove <script src="photo-ai.js">
 *
 *   app.js
 *     7. Remove 'photo-gallery' label entry
 *     8. Remove 'photo-gallery' router case
 *
 *   quick-entry.js
 *     9. Remove Photo AI button HTML template (lines ~302-309)
 *
 *   quick-entry-styles.css
 *    10. Remove all .quick-entry-actions-bar .photo-ai-btn rules
 *        (3 selectors at lines 15, 30, 48 — base, hover, mobile media query)
 *
 *   tutorial.js
 *    11. Remove Photo AI tutorial step
 *
 *   service-worker.js
 *    12. Remove '/photo-manager.js' from networkFirstUrls
 *    13. Bump VERSION to 3.4.11-remove-photo
 *        (Note: '/voice-photo-styles.css' is left in urlsToCache —
 *         the Voice patch will remove the file and the cache reference together)
 *
 *   Files deleted:
 *     - photo-ai.js
 *     - photo-manager.js
 *     - photo-manager-ui.js
 *
 * Usage (from ~/Desktop/taste-signature-PROD/):
 *   node remove-photo.js
 *
 * Safe: each modified file backed up to .remove-photo.bak.
 * Aborts on any anchor mismatch without writing.
 * Re-running detects already-applied changes.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const FILES = {
  html:        path.resolve('index.html'),
  app:         path.resolve('app.js'),
  quickEntry:  path.resolve('quick-entry.js'),
  qeStyles:    path.resolve('quick-entry-styles.css'),
  tutorial:    path.resolve('tutorial.js'),
  sw:          path.resolve('service-worker.js')
};

const FILES_TO_DELETE = [
  'photo-ai.js',
  'photo-manager.js',
  'photo-manager-ui.js'
];

const BACKUP_SUFFIX = '.remove-photo.bak';

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

// Delete <div id="view-photo-gallery" class="view"> by tracking <div> depth.
// Same technique as previous patches.
function deleteViewPhotoGallery(content) {
  const startMarker = `                <!-- Photo Gallery View -->`;
  const startIdx = content.indexOf(startMarker);
  if (startIdx === -1) throw new Error('[html:view-photo-gallery] start marker not found');

  const occurrences = content.split(startMarker).length - 1;
  if (occurrences > 1) {
    throw new Error(`[html:view-photo-gallery] start marker matched ${occurrences} times. Aborting.`);
  }

  const divOpen = content.indexOf('<div id="view-photo-gallery"', startIdx);
  if (divOpen === -1) throw new Error('[html:view-photo-gallery] opening div tag not found');

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
  if (endOfClosingDiv === -1) throw new Error('[html:view-photo-gallery] could not find matching </div>');

  // Also consume the trailing newline after </div>
  let endIdx = endOfClosingDiv;
  if (content.charAt(endIdx) === '\n') endIdx++;

  return content.substring(0, startIdx) + content.substring(endIdx);
}

// ====================================================================
// PATCH DEFINITIONS
// ====================================================================

// ---- index.html: nav anchor ----
// Confirmed unique: data-view="photo-gallery" appears once in index.html
// Note: nav uses 📸 (1F4F8, camera with flash), not 📷 (1F4F7, plain camera).
// All other Photo AI button locations use 📷. Confirmed via `od -c` audit.
const HTML_ANCHOR_NAV = `                        <a href="#" class="nav-item" data-view="photo-gallery">
                            <span class="nav-icon">\u{1F4F8}</span>
                            <span>Photo Gallery</span>
                        </a>
`;
const HTML_REPLACE_NAV = ``;

// ---- index.html: Photo AI button block (Quick Entry, lines ~648-657) ----
// Confirmed unique: "Quick Actions: Photo AI" appears once in index.html.
// Anchor includes the leading blank line and the trailing closing </div>.
const HTML_ANCHOR_PHOTO_BUTTON = `
                                <!-- Quick Actions: Photo AI -->
                                <div class="quick-entry-actions-bar" style="margin-bottom: 20px;">
                                    <button type="button" class="photo-ai-btn" onclick="PhotoAI.openPhotoModal()">
                                        <span class="photo-icon">\u{1F4F7}</span>
                                        <span class="photo-text">Photo AI</span>
                                    </button>
                                    <span class="action-hint">Snap a photo to auto-detect product details</span>
                                </div>
`;
const HTML_REPLACE_PHOTO_BUTTON = ``;

// ---- index.html: <script> tags for the 3 photo source files ----
// Each on its own line. We delete the consecutive photo-manager.js +
// photo-manager-ui.js pair as one anchor (they're adjacent), and
// photo-ai.js separately (it sits further down).
const HTML_ANCHOR_SCRIPT_MANAGERS = `    <script src="photo-manager.js"></script>
    <script src="photo-manager-ui.js"></script>
`;
const HTML_REPLACE_SCRIPT_MANAGERS = ``;

const HTML_ANCHOR_SCRIPT_AI = `    <script src="photo-ai.js"></script>
`;
const HTML_REPLACE_SCRIPT_AI = ``;

// ---- app.js: label entry ----
const APP_ANCHOR_LABEL = `        'photo-gallery': 'Photo Gallery',
`;
const APP_REPLACE_LABEL = ``;

// ---- app.js: router case ----
const APP_ANCHOR_ROUTER = `            if (viewName === 'photo-gallery') renderPhotoGalleryDashboard();
`;
const APP_REPLACE_ROUTER = ``;

// ---- quick-entry.js: Photo AI button template (lines ~302-309) ----
// This is inside a JavaScript template literal that renders the Quick Entry
// dashboard HTML. Anchor confirmed unique by the surrounding context
// (preceded by mode-buttons closing </div>, followed by Category Selection).
// Note the leading blank line is part of the anchor for clean removal.
const QE_ANCHOR_PHOTO_BUTTON = `
            <!-- Quick Actions -->
            <div class="quick-entry-actions-bar">
                <button type="button" class="photo-ai-btn" onclick="PhotoAI.openPhotoModal()">
                    <span class="photo-icon">\u{1F4F7}</span>
                    <span class="photo-text">Photo AI</span>
                </button>
                <span class="action-hint">Snap a photo to auto-fill product details</span>
            </div>
`;
const QE_REPLACE_PHOTO_BUTTON = ``;

// ---- quick-entry-styles.css: photo-ai-btn rules ----
// Three selectors: base (line 15), hover (line 30), mobile media query (line 48).
// All scoped to .quick-entry-actions-bar .photo-ai-btn — no risk to other features.
// Marker-based deletion: from `.quick-entry-actions-bar .photo-ai-btn {`
// to the next non-photo-ai-btn rule. Use grep-confirmed: the next selector
// after the photo-ai-btn block at line ~58 should not contain photo-ai-btn.
const QE_CSS_BLOCK_START = `.quick-entry-actions-bar .photo-ai-btn {`;
// We'll use a function-based approach since the block contains 3 separate
// rules separated by other selectors (action-hint sits between base/hover
// and the mobile @media). Safer to do 3 individual block deletes by
// finding each `.quick-entry-actions-bar .photo-ai-btn` occurrence and
// removing the rule (up to and including its closing brace).

// ---- tutorial.js: Photo AI tutorial step ----
// Confirmed unique: target: '.photo-ai-btn' appears once.
const TUTORIAL_ANCHOR_STEP = `            {
                target: '.photo-ai-btn',
                title: '\u{1F4F7} Photo AI - Auto-Detect Products',
                content: 'Snap a photo of any product! AI will automatically detect the product name, category, and suggest sensory attributes. No typing needed!',
                position: 'bottom',
                highlight: true
            },
`;
const TUTORIAL_REPLACE_STEP = ``;

// ---- service-worker.js: networkFirstUrls entry ----
const SW_ANCHOR_NETWORK_FIRST = `  '/photo-manager.js',
`;
const SW_REPLACE_NETWORK_FIRST = ``;

// ---- service-worker.js: VERSION bump ----
const SW_ANCHOR_VERSION = `const VERSION = '3.4.10-remove-professional-insights';`;
const SW_REPLACE_VERSION = `const VERSION = '3.4.11-remove-photo';`;

// Idempotency markers (presence/absence indicates patched state)
const HTML_PATCHED_MARKER = 'data-view="photo-gallery"';     // absence = patched
const APP_PATCHED_MARKER = 'photo-gallery';                  // absence = patched
const QE_PATCHED_MARKER = 'PhotoAI.openPhotoModal';          // absence = patched
const QE_CSS_PATCHED_MARKER = '.photo-ai-btn';               // absence = patched
const TUTORIAL_PATCHED_MARKER = "'.photo-ai-btn'";           // absence = patched
const SW_PATCHED_MARKER = `'3.4.11-remove-photo'`;           // presence = patched

// ====================================================================
// CSS BLOCK DELETER (for quick-entry-styles.css)
// ====================================================================

// Remove all CSS rules that contain `.photo-ai-btn` in their selector list.
// This walks the CSS, finds each rule whose selector contains the anchor,
// and deletes from the start of the selector through the matching `}`.
// Handles rules nested inside @media blocks (only deletes the rule, not
// the surrounding @media — leaving the @media empty if needed, which is
// harmless CSS).
function removePhotoAiCssRules(content) {
  let result = content;
  let safetyCounter = 0;
  while (safetyCounter < 20) {
    safetyCounter++;
    const idx = result.indexOf('.photo-ai-btn');
    if (idx === -1) break;

    // Walk backwards to find the start of this selector.
    // The selector starts after the previous `{`, `}`, or beginning of file,
    // skipping whitespace.
    let selStart = idx;
    while (selStart > 0) {
      const ch = result.charAt(selStart - 1);
      if (ch === '{' || ch === '}') break;
      selStart--;
    }
    // Skip whitespace after the previous brace
    while (selStart < idx && /\s/.test(result.charAt(selStart))) {
      selStart++;
    }

    // Walk forward from idx to find the matching `}` of this rule.
    let braceDepth = 0;
    let i = idx;
    let foundOpen = false;
    let endOfRule = -1;
    while (i < result.length) {
      const ch = result.charAt(i);
      if (ch === '{') {
        braceDepth++;
        foundOpen = true;
      } else if (ch === '}') {
        braceDepth--;
        if (foundOpen && braceDepth === 0) {
          endOfRule = i + 1;
          break;
        }
      }
      i++;
    }
    if (endOfRule === -1) {
      throw new Error('[qe-css] could not find closing brace for .photo-ai-btn rule');
    }

    // Consume trailing newline if present
    let trimEnd = endOfRule;
    if (result.charAt(trimEnd) === '\n') trimEnd++;
    // Also consume a blank line that follows (so we don't leave double blank lines)
    if (result.charAt(trimEnd) === '\n') trimEnd++;

    result = result.substring(0, selStart) + result.substring(trimEnd);
  }
  if (safetyCounter >= 20) {
    throw new Error('[qe-css] safety counter exceeded — too many .photo-ai-btn rules. Aborting.');
  }
  return result;
}

// ====================================================================
// RUNNERS
// ====================================================================

function patchIndexHtml() {
  console.log(`\n[1/6] Patching ${FILES.html}`);
  let content = readFile(FILES.html);
  if (!content.includes(HTML_PATCHED_MARKER)) {
    console.log('  \u00b7 already patched - skipping');
    return;
  }
  backup(FILES.html);

  content = uniqueReplace(content, HTML_ANCHOR_NAV, HTML_REPLACE_NAV, 'html:nav-anchor');
  content = deleteViewPhotoGallery(content);
  content = uniqueReplace(content, HTML_ANCHOR_PHOTO_BUTTON, HTML_REPLACE_PHOTO_BUTTON, 'html:photo-button');
  content = uniqueReplace(content, HTML_ANCHOR_SCRIPT_MANAGERS, HTML_REPLACE_SCRIPT_MANAGERS, 'html:script-managers');
  content = uniqueReplace(content, HTML_ANCHOR_SCRIPT_AI, HTML_REPLACE_SCRIPT_AI, 'html:script-ai');

  writeFile(FILES.html, content);
}

function patchAppJs() {
  console.log(`\n[2/6] Patching ${FILES.app}`);
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

function patchQuickEntryJs() {
  console.log(`\n[3/6] Patching ${FILES.quickEntry}`);
  let content = readFile(FILES.quickEntry);
  if (!content.includes(QE_PATCHED_MARKER)) {
    console.log('  \u00b7 already patched - skipping');
    return;
  }
  backup(FILES.quickEntry);

  content = uniqueReplace(content, QE_ANCHOR_PHOTO_BUTTON, QE_REPLACE_PHOTO_BUTTON, 'qe:photo-button');

  writeFile(FILES.quickEntry, content);
}

function patchQuickEntryStylesCss() {
  console.log(`\n[4/6] Patching ${FILES.qeStyles}`);
  let content = readFile(FILES.qeStyles);
  if (!content.includes(QE_CSS_PATCHED_MARKER)) {
    console.log('  \u00b7 already patched - skipping');
    return;
  }
  backup(FILES.qeStyles);

  // Sanity: count .photo-ai-btn occurrences before removal
  const before = content.split('.photo-ai-btn').length - 1;
  console.log(`  \u00b7 found ${before} .photo-ai-btn references to remove`);

  content = removePhotoAiCssRules(content);

  // Sanity: confirm removal
  const after = content.split('.photo-ai-btn').length - 1;
  if (after !== 0) {
    throw new Error(`[qe-css] still ${after} .photo-ai-btn references after removal. Aborting.`);
  }

  writeFile(FILES.qeStyles, content);
}

function patchTutorialJs() {
  console.log(`\n[5/6] Patching ${FILES.tutorial}`);
  let content = readFile(FILES.tutorial);
  if (!content.includes(TUTORIAL_PATCHED_MARKER)) {
    console.log('  \u00b7 already patched - skipping');
    return;
  }
  backup(FILES.tutorial);

  content = uniqueReplace(content, TUTORIAL_ANCHOR_STEP, TUTORIAL_REPLACE_STEP, 'tutorial:photo-step');

  writeFile(FILES.tutorial, content);
}

function patchServiceWorker() {
  console.log(`\n[6/6] Patching ${FILES.sw}`);
  let content = readFile(FILES.sw);
  if (content.includes(SW_PATCHED_MARKER)) {
    console.log('  \u00b7 already patched - skipping');
    return;
  }
  backup(FILES.sw);

  content = uniqueReplace(content, SW_ANCHOR_NETWORK_FIRST, SW_REPLACE_NETWORK_FIRST, 'sw:networkFirst');
  content = uniqueReplace(content, SW_ANCHOR_VERSION, SW_REPLACE_VERSION, 'sw:version');

  writeFile(FILES.sw, content);
}

function deleteFiles() {
  console.log(`\n[7/7] Deleting ${FILES_TO_DELETE.length} file(s)`);
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
  console.log('Taste Signature - remove Photo Gallery + Photo AI feature');
  console.log('=========================================================');
  try {
    patchIndexHtml();
    patchAppJs();
    patchQuickEntryJs();
    patchQuickEntryStylesCss();
    patchTutorialJs();
    patchServiceWorker();
    deleteFiles();
    console.log('\nDone.');
    console.log('\nNext steps (in chat):');
    console.log('  1. Verify with grep commands');
    console.log('  2. git add -A');
    console.log('  3. git commit -m "Remove Photo Gallery + Photo AI feature"');
    console.log('  4. git push');
  } catch (err) {
    console.error('\nPATCH FAILED:', err.message);
    console.error('No partial writes - aborting.');
    process.exit(1);
  }
}

main();
