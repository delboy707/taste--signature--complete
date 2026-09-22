// Pure unit tests for dom-utils.js - no DOM, no browser.
// Run: node test/dom-utils.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const { escapeHtml } = require('../dom-utils.js');

test('escapes all five HTML special characters', () => {
  assert.equal(escapeHtml('&'), '&amp;');
  assert.equal(escapeHtml('<'), '&lt;');
  assert.equal(escapeHtml('>'), '&gt;');
  assert.equal(escapeHtml('"'), '&quot;');
  assert.equal(escapeHtml("'"), '&#039;');
});

test('escapes a mixed string containing every special character at once', () => {
  const input = `<script>alert("xss & 'friends'")</script>`;
  const expected =
    '&lt;script&gt;alert(&quot;xss &amp; &#039;friends&#039;&quot;)&lt;/script&gt;';
  assert.equal(escapeHtml(input), expected);
});

test('is null/undefined-safe: returns empty string instead of throwing or emitting "null"/"undefined"', () => {
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
});

test('coerces non-string values via String() rather than passing them through untouched', () => {
  assert.equal(escapeHtml(42), '42');
  assert.equal(escapeHtml(true), 'true');
});

test('leaves a string with no special characters unchanged', () => {
  assert.equal(escapeHtml('plain text 123'), 'plain text 123');
});

// Regression test for the search-filter.js:24 attribute-injection bug.
// search-filter.js's render() interpolates escapeHtml(this.currentFilters.search)
// directly inside an HTML attribute: value="${escapeHtml(searchTerm)}".
// The two DOM-based escapeHtml copies this consolidation replaced
// (createTextNode -> innerHTML, in search-filter.js and targets-loaded-ui.js)
// never escaped quote characters, because textContent/innerHTML serialization
// doesn't escape quotes - so a search term containing a `"` could break out
// of the attribute and inject arbitrary markup/attributes into the input tag.
test('closes the search-filter.js attribute-injection hole: a search term with a double quote cannot break out of value="..."', () => {
  const searchTerm = '" onmouseover="alert(1)" x="';

  // Reproduce the exact interpolation from search-filter.js's render():
  //   value="${escapeHtml(this.currentFilters.search)}"
  const html = `value="${escapeHtml(searchTerm)}"`;

  // The escaped output must not contain a bare (unescaped) double quote -
  // every quote in the original term must have become &quot;.
  const attrValueMatch = html.match(/^value="([^]*)"$/);
  assert.ok(attrValueMatch, 'the whole interpolated string must still parse as a single value="..." attribute');
  assert.ok(
    !attrValueMatch[1].includes('"'),
    'the attribute value must contain no bare double quote that could close the attribute early'
  );
  assert.ok(html.includes('&quot;'), 'the double quote must be escaped as &quot;');
  assert.equal(
    html,
    'value="&quot; onmouseover=&quot;alert(1)&quot; x=&quot;"'
  );
});
