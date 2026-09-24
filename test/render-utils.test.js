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

test('AI response formatting: model output cannot inject tags', () => {
  for (const p of PAYLOADS) {
    for (const fn of [RU.formatAIResponse, RU.formatAIMarkdown]) {
      const html = fn(`**bold** ${p}\n- item`);
      assertNoUnescapedTag(html, p);
      assert.match(html, /<strong>bold<\/strong>/);
    }
    assertNoUnescapedTag(RU.buildAIResponseCardHtml(p, p), p);
    assertNoUnescapedTag(RU.buildAIErrorHtml(p), p);
  }
});

test('AI response formatting: markdown still renders after escaping', () => {
  const html = RU.formatAIMarkdown('# Title\n\n**b** and `code`');
  assert.match(html, /<h1>Title<\/h1>/);
  assert.match(html, /<code>code<\/code>/);
  assert.equal(RU.formatAIResponse(''), '');
  assert.equal(RU.formatAIResponse(null), '');
});

function full(id, name, extra = {}) {
  return {
    id, timestamp: '2024-01-02T00:00:00.000Z', needState: 'reward', notes: '',
    productInfo: { name, brand: 'Brand', type: 'snack' },
    stages: { aftertaste: { emotions: { satisfaction: 7 } } },
    ...extra,
  };
}

test('product select options, dashboard and comparison lists escape product names', () => {
  for (const p of PAYLOADS) {
    const list = [full(1, p)];
    assertNoUnescapedTag(RU.buildProductOptionsHtml(list), p);
    assertNoUnescapedTag(RU.buildRecentActivityHtml(list), p);
    assertNoUnescapedTag(RU.buildQuickInsightsHtml([{ title: p, text: p }]), p);
    assertNoUnescapedTag(RU.buildComparisonListHtml(list), p);
    assertNoUnescapedTag(RU.buildComparisonNeedStateHtml(list), p);
    assertNoUnescapedTag(
      RU.buildComparisonSummaryCardsHtml({ name: p, label: '1' }, { name: p, label: '1' }, { name: p, label: '1' }), p);
  }
});

test('history list escapes name, brand, type, notes, occasion and needState', () => {
  for (const p of PAYLOADS) {
    const e = full(1, p, {
      needState: p, notes: p,
      productInfo: { name: p, brand: p, type: p, occasion: p, temperature: p },
    });
    assertNoUnescapedTag(RU.buildHistoryHtml([e]), p);
  }
});

test('history delete button: a hostile id cannot break out of the onclick attribute', () => {
  const html = RU.buildHistoryHtml([full('1)"><img src=x onerror=alert(1)>', 'ok')]);
  assert.ok(!html.includes('<img'));
  assert.ok(!/onclick="[^"]*"[^>]*onerror/.test(html));
  // numeric ids still render as a bare number literal
  assert.match(RU.buildHistoryHtml([full(1777019020364.0994, 'ok')]), /deleteExperience\(1777019020364\.0994\)/);
});
