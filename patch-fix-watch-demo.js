#!/usr/bin/env node
/**
 * patch-fix-watch-demo.js
 * Fixes post-login Watch Demo by hooking it into the pre-login lazy-loader.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(process.cwd(), 'index.html');
if (!fs.existsSync(FILE)) {
    console.error('FATAL: ' + FILE + ' not found. Run from repo root.');
    process.exit(1);
}

let html = fs.readFileSync(FILE, 'utf8');
const original = html;

const promoteOld = `function loadWistiaScripts() {
            if (wistiaLoaded) return;
            wistiaLoaded = true;
            var s1 = document.createElement('script');
            s1.src = 'https://fast.wistia.com/player.js';
            s1.async = true;
            document.head.appendChild(s1);
            var s2 = document.createElement('script');
            s2.src = 'https://fast.wistia.com/embed/8hicm7c4kn.js';
            s2.async = true;
            s2.type = 'module';
            document.head.appendChild(s2);
        }`;

const promoteNew = promoteOld + `
        /* QEP-INTRO-PROMOTE-START */
        window.qepLoadWistia = loadWistiaScripts;
        /* QEP-INTRO-PROMOTE-END */`;

if (html.indexOf('/* QEP-INTRO-PROMOTE-START */') !== -1) {
    console.log('[OK] Edit 1: window.qepLoadWistia already exposed.');
} else if (html.indexOf(promoteOld) !== -1) {
    html = html.replace(promoteOld, promoteNew);
    console.log('[OK] Edit 1: window.qepLoadWistia exposed.');
} else {
    console.error('FATAL Edit 1: loadWistiaScripts function not found in expected form.');
    process.exit(1);
}

const demoOpenOld = `function openDemoModal() {
            const modal = document.getElementById('demo-modal');
            modal.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }`;

const demoOpenNew = `function openDemoModal() {
            const modal = document.getElementById('demo-modal');
            /* QEP-DEMO-LAZYLOAD-START */
            if (typeof window.qepLoadWistia === 'function') { window.qepLoadWistia(); }
            /* QEP-DEMO-LAZYLOAD-END */
            modal.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }`;

if (html.indexOf('/* QEP-DEMO-LAZYLOAD-START */') !== -1) {
    console.log('[OK] Edit 2: openDemoModal already wired to lazy-loader.');
} else if (html.indexOf(demoOpenOld) !== -1) {
    html = html.replace(demoOpenOld, demoOpenNew);
    console.log('[OK] Edit 2: openDemoModal now calls window.qepLoadWistia.');
} else {
    console.error('FATAL Edit 2: openDemoModal function not found in expected form.');
    process.exit(1);
}

if (html === original) {
    console.log('\n[INFO] No changes needed - already patched.');
} else {
    fs.writeFileSync(FILE, html, 'utf8');
    console.log('\n[OK] index.html written.');
}
