// Pure unit tests for csv-utils.js - no DOM, no browser, no network.
// Run: node test/csv-utils.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCSVLine, sanitizeCsvValue } = require('../csv-utils.js');

test('RFC4180 doubled-quote escaping collapses to a single literal quote', () => {
  const line = '"She said ""hello"""';
  const [field] = parseCSVLine(line);
  assert.equal(field, 'She said "hello"');
});

test('multiple fields: quoted field with embedded comma + a field with doubled quotes', () => {
  const line = 'Alice,"Bristol, UK","She said ""hi"" to me",42';
  const fields = parseCSVLine(line);
  assert.deepEqual(fields, ['Alice', 'Bristol, UK', 'She said "hi" to me', '42']);
});

test('unquoted fields are split on commas and trimmed', () => {
  const line = ' foo , bar , baz ';
  assert.deepEqual(parseCSVLine(line), ['foo', 'bar', 'baz']);
});

test('a quoted field containing a comma is not split', () => {
  const line = 'a,"b,c",d';
  assert.deepEqual(parseCSVLine(line), ['a', 'b,c', 'd']);
});

test('sanitizeCsvValue strips a leading = (formula injection guard)', () => {
  assert.equal(sanitizeCsvValue('=SUM(A1:A2)'), 'SUM(A1:A2)');
});

test('sanitizeCsvValue strips a leading + / - / @', () => {
  assert.equal(sanitizeCsvValue('+1234'), '1234');
  assert.equal(sanitizeCsvValue('-1234'), '1234');
  assert.equal(sanitizeCsvValue('@cmd|calc'), 'cmd|calc');
});

test('sanitizeCsvValue strips leading tab/carriage-return characters too', () => {
  assert.equal(sanitizeCsvValue('\t=cmd'), 'cmd');
  assert.equal(sanitizeCsvValue('\r+cmd'), 'cmd');
});

test('sanitizeCsvValue only strips a run of injection characters from the start, not mid-string', () => {
  assert.equal(sanitizeCsvValue('==nested='), 'nested=');
  assert.equal(sanitizeCsvValue('normal value'), 'normal value');
});

test('sanitizeCsvValue passes through non-string values unchanged', () => {
  assert.equal(sanitizeCsvValue(42), 42);
  assert.equal(sanitizeCsvValue(undefined), undefined);
  assert.equal(sanitizeCsvValue(null), null);
});

test('parseCSVLine runs every field (quoted and unquoted) through sanitizeCsvValue', () => {
  const line = '=cmd1,"+cmd2","normal"';
  assert.deepEqual(parseCSVLine(line), ['cmd1', 'cmd2', 'normal']);
});

test('a doubled quote at the start of a quoted field parses correctly', () => {
  const line = '"""quoted"""';
  assert.deepEqual(parseCSVLine(line), ['"quoted"']);
});
