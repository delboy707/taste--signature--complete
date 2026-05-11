#!/usr/bin/env node
/**
 * patch-add-pre-login-video.js
 *
 * Adds pre-login intro video to QEP Taste Signature.
 *   - Option A: "Watch Intro" button -> modal with Wistia player
 *   - Option B: Collapsible "See the platform in action" section with inline Wistia player
 *
 * Media: Wistia 8hicm7c4kn
 * Idempotent: re-runnable; uses HTML comment markers to replace between START/END.
 * ASCII-only: validates every injected block before writing the file.
 *
 * Usage:
 *   cd ~/Desktop/taste-signature-PROD/
 *   node patch-add-pre-login-video.js
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(process.cwd(), 'index.html');
const MEDIA_ID = '8hicm7c4kn';
const WISTIA_ASPECT = '2.2966507177033493';
const WISTIA_PADDING_TOP = '43.54%';

// ---------------------------------------------------------------------------
// 1) INJECTED BLOCKS
// ---------------------------------------------------------------------------

const CSS_BLOCK = `<!-- QEP-INTRO-CSS-START -->
<style data-qep-intro>
  /* Pre-login intro video - QEP */
  .qep-intro-btn {
    display: inline-block;
    margin: 16px 0 4px 0;
    padding: 10px 22px;
    background: transparent;
    color: #667eea;
    border: 2px solid #667eea;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
  }
  .qep-intro-btn:hover {
    background: #667eea;
    color: #fff;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.25);
  }
  .qep-intro-btn-icon {
    display: inline-block;
    margin-right: 6px;
    transform: translateY(-1px);
  }

  /* Modal */
  .qep-intro-modal {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(20, 22, 40, 0.78);
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  .qep-intro-modal.qep-intro-modal-open { display: flex; }
  .qep-intro-modal-card {
    position: relative;
    width: 100%;
    max-width: 960px;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4);
    overflow: hidden;
    animation: qepIntroIn 0.18s ease-out;
  }
  @keyframes qepIntroIn {
    from { transform: scale(0.96); opacity: 0; }
    to   { transform: scale(1);    opacity: 1; }
  }
  .qep-intro-modal-head {
    padding: 18px 24px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .qep-intro-modal-head h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    letter-spacing: 0.2px;
  }
  .qep-intro-modal-close {
    background: none;
    border: none;
    color: #fff;
    font-size: 28px;
    line-height: 1;
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    transition: background 0.15s;
  }
  .qep-intro-modal-close:hover { background: rgba(255, 255, 255, 0.18); }
  .qep-intro-modal-body {
    padding: 20px 24px 24px 24px;
    background: #f8f9fb;
  }

  /* Collapsible (Option B) */
  .qep-intro-collapse {
    margin: 18px 0 4px 0;
    border-top: 1px solid #e5e7ef;
    padding-top: 16px;
  }
  .qep-intro-collapse > summary {
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    color: #667eea;
    padding: 6px 0;
    user-select: none;
  }
  .qep-intro-collapse > summary:hover { color: #5566c8; }
  .qep-intro-collapse-body {
    margin-top: 14px;
    padding: 12px;
    background: #f8f9fb;
    border-radius: 8px;
  }
  .qep-intro-collapse-hint {
    font-size: 12px;
    color: #6b7280;
    margin: 10px 2px 0 2px;
    text-align: center;
  }

  /* Wistia swatch placeholder (matches Wistia's recommended fallback) */
  wistia-player[media-id='${MEDIA_ID}']:not(:defined) {
    background: center / contain no-repeat url('https://fast.wistia.com/embed/medias/${MEDIA_ID}/swatch');
    display: block;
    filter: blur(5px);
    padding-top: ${WISTIA_PADDING_TOP};
  }

  @media (max-width: 768px) {
    .qep-intro-modal { padding: 12px; }
    .qep-intro-modal-head { padding: 14px 18px; }
    .qep-intro-modal-head h3 { font-size: 16px; }
    .qep-intro-modal-body { padding: 14px; }
  }
</style>
<!-- QEP-INTRO-CSS-END -->`;

const BUTTON_BLOCK = `<!-- QEP-INTRO-BUTTON-START -->
            <button type="button" id="qep-intro-open" class="qep-intro-btn" aria-label="Watch platform introduction video">
                <span class="qep-intro-btn-icon" aria-hidden="true">&#9654;</span>Watch Intro
            </button>
            <!-- QEP-INTRO-BUTTON-END -->`;

const COLLAPSIBLE_BLOCK = `<!-- QEP-INTRO-COLLAPSIBLE-START -->
            <details class="qep-intro-collapse" id="qep-intro-details">
                <summary>See the platform in action</summary>
                <div class="qep-intro-collapse-body">
                    <wistia-player media-id="${MEDIA_ID}" aspect="${WISTIA_ASPECT}"></wistia-player>
                    <p class="qep-intro-collapse-hint">Use the player controls to jump between chapters.</p>
                </div>
            </details>
            <!-- QEP-INTRO-COLLAPSIBLE-END -->`;

const MODAL_BLOCK = `<!-- QEP-INTRO-MODAL-START -->
    <div class="qep-intro-modal" id="qep-intro-modal" role="dialog" aria-modal="true" aria-labelledby="qep-intro-modal-title">
        <div class="qep-intro-modal-card">
            <div class="qep-intro-modal-head">
                <h3 id="qep-intro-modal-title">Taste Signature - Platform Introduction</h3>
                <button type="button" class="qep-intro-modal-close" id="qep-intro-close" aria-label="Close video">&times;</button>
            </div>
            <div class="qep-intro-modal-body">
                <wistia-player media-id="${MEDIA_ID}" aspect="${WISTIA_ASPECT}"></wistia-player>
            </div>
        </div>
    </div>
    <!-- QEP-INTRO-MODAL-END -->`;

const JS_BLOCK = `<!-- QEP-INTRO-JS-START -->
    <script>
    (function () {
        var wistiaLoaded = false;
        function loadWistiaScripts() {
            if (wistiaLoaded) return;
            wistiaLoaded = true;
            var s1 = document.createElement('script');
            s1.src = 'https://fast.wistia.com/player.js';
            s1.async = true;
            document.head.appendChild(s1);
            var s2 = document.createElement('script');
            s2.src = 'https://fast.wistia.com/embed/${MEDIA_ID}.js';
            s2.async = true;
            s2.type = 'module';
            document.head.appendChild(s2);
        }

        var modal   = document.getElementById('qep-intro-modal');
        var openBtn = document.getElementById('qep-intro-open');
        var closeBtn = document.getElementById('qep-intro-close');
        var details = document.getElementById('qep-intro-details');

        function openModal() {
            loadWistiaScripts();
            if (modal) {
                modal.classList.add('qep-intro-modal-open');
                document.body.style.overflow = 'hidden';
            }
        }
        function closeModal() {
            if (!modal) return;
            modal.classList.remove('qep-intro-modal-open');
            document.body.style.overflow = '';
            try {
                var players = modal.querySelectorAll('wistia-player');
                for (var i = 0; i < players.length; i++) {
                    var p = players[i];
                    if (p && typeof p.pause === 'function') p.pause();
                }
            } catch (e) { /* no-op */ }
        }

        if (openBtn)  openBtn.addEventListener('click', openModal);
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (modal) {
            modal.addEventListener('click', function (e) {
                if (e.target === modal) closeModal();
            });
        }
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal && modal.classList.contains('qep-intro-modal-open')) {
                closeModal();
            }
        });

        if (details) {
            details.addEventListener('toggle', function () {
                if (details.open) loadWistiaScripts();
            });
        }
    })();
    </script>
    <!-- QEP-INTRO-JS-END -->`;

// ---------------------------------------------------------------------------
// 2) ASCII VALIDATION (per project rule - no Unicode in injected code)
// ---------------------------------------------------------------------------

function asciiCheck(name, s) {
    for (var i = 0; i < s.length; i++) {
        var c = s.charCodeAt(i);
        // Allow printable ASCII (32-126) plus tab, LF, CR
        if (c < 32 || c > 126) {
            if (c === 9 || c === 10 || c === 13) continue;
            console.error('FATAL: non-ASCII byte in ' + name +
                          ' at index ' + i + ' code=' + c +
                          ' char=' + JSON.stringify(s[i]));
            process.exit(1);
        }
    }
}
asciiCheck('CSS_BLOCK',         CSS_BLOCK);
asciiCheck('BUTTON_BLOCK',      BUTTON_BLOCK);
asciiCheck('COLLAPSIBLE_BLOCK', COLLAPSIBLE_BLOCK);
asciiCheck('MODAL_BLOCK',       MODAL_BLOCK);
asciiCheck('JS_BLOCK',          JS_BLOCK);
console.log('[OK] All injected blocks pass ASCII check.');

// ---------------------------------------------------------------------------
// 3) FILE PATCHING
// ---------------------------------------------------------------------------

if (!fs.existsSync(FILE)) {
    console.error('FATAL: ' + FILE + ' not found. Run this script from the repo root.');
    process.exit(1);
}

var html = fs.readFileSync(FILE, 'utf8');
var original = html;

function replaceBetween(src, startMarker, endMarker, newBlock) {
    var s = src.indexOf(startMarker);
    if (s === -1) return null;
    var e = src.indexOf(endMarker, s);
    if (e === -1) {
        throw new Error('Found ' + startMarker + ' but missing ' + endMarker);
    }
    return src.slice(0, s) + newBlock + src.slice(e + endMarker.length);
}

function injectBeforeAnchor(src, anchor, newBlock) {
    var idx = src.indexOf(anchor);
    if (idx === -1) throw new Error('Anchor not found: ' + anchor);
    return src.slice(0, idx) + newBlock + '\n            ' + src.slice(idx);
}

// --- CSS: before </head> ---
var step1 = replaceBetween(html, '<!-- QEP-INTRO-CSS-START -->', '<!-- QEP-INTRO-CSS-END -->', CSS_BLOCK);
if (step1) {
    html = step1;
    console.log('[OK] CSS block replaced (already present).');
} else {
    var headIdx = html.indexOf('</head>');
    if (headIdx === -1) throw new Error('</head> not found');
    html = html.slice(0, headIdx) + CSS_BLOCK + '\n' + html.slice(headIdx);
    console.log('[OK] CSS block inserted before </head>.');
}

// --- Button: before <form id="form-login"> ---
var step2 = replaceBetween(html, '<!-- QEP-INTRO-BUTTON-START -->', '<!-- QEP-INTRO-BUTTON-END -->', BUTTON_BLOCK);
if (step2) {
    html = step2;
    console.log('[OK] Button block replaced (already present).');
} else {
    html = injectBeforeAnchor(html, '<form id="form-login"', BUTTON_BLOCK);
    console.log('[OK] Button block inserted before <form id="form-login">.');
}

// --- Collapsible: after the </form> that closes form-login, inside #login-form card ---
var step3 = replaceBetween(html, '<!-- QEP-INTRO-COLLAPSIBLE-START -->', '<!-- QEP-INTRO-COLLAPSIBLE-END -->', COLLAPSIBLE_BLOCK);
if (step3) {
    html = step3;
    console.log('[OK] Collapsible block replaced (already present).');
} else {
    var loginFormOpen = html.indexOf('<form id="form-login"');
    if (loginFormOpen === -1) throw new Error('<form id="form-login"> not found');
    var loginFormClose = html.indexOf('</form>', loginFormOpen);
    if (loginFormClose === -1) throw new Error('Closing </form> for login form not found');
    var insertPoint = loginFormClose + '</form>'.length;
    html = html.slice(0, insertPoint) + '\n' + COLLAPSIBLE_BLOCK + html.slice(insertPoint);
    console.log('[OK] Collapsible block inserted after </form> of login-form.');
}

// --- Modal: before </body> ---
var step4 = replaceBetween(html, '<!-- QEP-INTRO-MODAL-START -->', '<!-- QEP-INTRO-MODAL-END -->', MODAL_BLOCK);
if (step4) {
    html = step4;
    console.log('[OK] Modal block replaced (already present).');
} else {
    var bodyIdx1 = html.indexOf('</body>');
    if (bodyIdx1 === -1) throw new Error('</body> not found');
    html = html.slice(0, bodyIdx1) + MODAL_BLOCK + '\n' + html.slice(bodyIdx1);
    console.log('[OK] Modal block inserted before </body>.');
}

// --- JS: before </body> (after modal) ---
var step5 = replaceBetween(html, '<!-- QEP-INTRO-JS-START -->', '<!-- QEP-INTRO-JS-END -->', JS_BLOCK);
if (step5) {
    html = step5;
    console.log('[OK] JS block replaced (already present).');
} else {
    var bodyIdx2 = html.indexOf('</body>');
    if (bodyIdx2 === -1) throw new Error('</body> not found');
    html = html.slice(0, bodyIdx2) + JS_BLOCK + '\n' + html.slice(bodyIdx2);
    console.log('[OK] JS block inserted before </body>.');
}

if (html === original) {
    console.log('\n[INFO] No changes - file already up to date.');
} else {
    fs.writeFileSync(FILE, html, 'utf8');
    console.log('\n[OK] index.html written.');
}

console.log('\n----- NEXT STEPS -----');
console.log('1. Bump the service worker cache version (required so users get the new HTML):');
console.log('     grep -n -E "CACHE_NAME|cacheName|CACHE_VERSION" sw.js');
console.log('   Increment the trailing number in that constant, save sw.js.');
console.log('');
console.log('2. Verify injected blocks are ASCII-clean (project rule):');
console.log("     awk '/QEP-INTRO-.*-START/,/QEP-INTRO-.*-END/' index.html | LC_ALL=C grep -cP \"[^\\x20-\\x7E\\t]\" ");
console.log('   Expected output: 0');
console.log('');
console.log('3. Local test:');
console.log('     python3 -m http.server 8000');
console.log('     open http://localhost:8000');
console.log('   Verify: button opens modal, modal closes (X / outside / Esc),');
console.log('   collapsible expands, Wistia loads only after first interaction.');
console.log('');
console.log('4. Deploy:');
console.log('     git add -A');
console.log('     git commit -m "Add pre-login intro video: button modal + collapsible (Wistia ' + MEDIA_ID + ')"');
console.log('     git push origin main');
console.log('');
console.log('5. Confirm chapter markers are set in Wistia dashboard for media ' + MEDIA_ID + '.');
console.log('----------------------\n');
