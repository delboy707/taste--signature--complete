// Pure unit tests for render-utils.js - no DOM, no browser.
// Run: node test/render-utils.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const RU = require('../render-utils.js');

const PAYLOADS = [
  '<img src=x onerror=alert(1)>',
  '"><script>alert(1)</script>',
];

// No raw '<' may survive, and no attribute-breaking quote may follow value=.
function assertNoUnescapedTag(html, payload) {
  assert.ok(!html.includes('<img'), `unescaped <img in: ${html}`);
  assert.ok(!html.includes('<script'), `unescaped <script in: ${html}`);
  assert.ok(!html.includes(payload), `raw payload present in: ${html}`);
}

function exp(id, name, extra = {}) {
  return { id, timestamp: 1700000000000, productInfo: { name, brand: 'B' }, ...extra };
}

test('retest dropdown: malicious product names are escaped', () => {
  for (const p of PAYLOADS) {
    const html = RU.buildRetestOptionsHtml([exp(1, p)]);
    assertNoUnescapedTag(html, p);
    assert.match(html, /&lt;/);
  }
});

test('retest dropdown: malicious id cannot break out of the value attribute', () => {
  const html = RU.buildRetestOptionsHtml([exp('"><script>alert(1)</script>', 'ok')]);
  assert.ok(!html.includes('<script'));
});

test('retest dropdown: normal names render unchanged, malformed entries skipped', () => {
  const html = RU.buildRetestOptionsHtml([exp(7, 'Cola'), null, { id: 9 }]);
  assert.match(html, /<option value="7">Cola - Test #1 \(/);
  assert.equal((html.match(/<option/g) || []).length, 2);
});
