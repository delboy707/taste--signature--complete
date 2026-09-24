// UI-level regression tests for the chat: an AI failure must show a clear
// error and an assistant bubble must never be empty. chat-ui.js is a browser
// script, so it is evaluated in a vm context with a tiny DOM stub.
// Run: node test/chat-ui.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

function makeEl() {
  const el = {
    children: [], style: {}, className: '', textContent: '', innerHTML: '', scrollTop: 0, scrollHeight: 0,
    classList: { add() {}, remove() {}, toggle() {} },
    appendChild(c) { this.children.push(c); return c; },
    addEventListener() {}, setAttribute() {}, querySelector() { return makeEl(); },
    querySelectorAll() { return []; }, remove() {}, focus() {},
  };
  return el;
}

function loadChatUI() {
  const byId = {};
  const document = {
    getElementById(id) { return (byId[id] = byId[id] || makeEl()); },
    createElement() { return makeEl(); },
    addEventListener() {},
    querySelector() { return makeEl(); },
    querySelectorAll() { return []; },
    body: makeEl(),
  };
  const ctx = { window: {}, document, console: { ...console, log() {}, warn() {}, error() {} }, setTimeout, experiences: [] };
  vm.createContext(ctx);
  vm.runInContext(read('dom-utils.js'), ctx);
  vm.runInContext(read('chat-ui.js') + '\n;this.__api = { addMessageToChat, handleQuickAnalysis, setAssistant(a){ chatAssistant = a; } };', ctx);
  const messages = () => document.getElementById('chat-messages').children.map(m => ({
    cls: m.className,
    text: m.children[1].children[0].innerHTML,
  }));
  return { api: ctx.__api, messages };
}

test('an empty assistant message is replaced by a clear error, never rendered blank', () => {
  for (const empty of [undefined, null, '', '   ']) {
    const { api, messages } = loadChatUI();
    api.addMessageToChat('assistant', empty);
    const [m] = messages();
    assert.match(m.text, /empty answer/i);
  }
});

test('a normal assistant message is rendered as before', () => {
  const { api, messages } = loadChatUI();
  api.addMessageToChat('assistant', 'Alpha is **strongest**');
  assert.match(messages()[0].text, /<strong>strongest<\/strong>/);
});

test('quick analysis: success renders the reply (it was silently dropped before)', async () => {
  const { api, messages } = loadChatUI();
  api.setAssistant({
    quickAnalysis: async () => ({ success: true, response: 'Portfolio summary text', suggestions: [] }),
  });
  await api.handleQuickAnalysis('portfolio-summary');
  const texts = messages().map(m => m.text).join(' | ');
  assert.match(texts, /Portfolio summary text/);
});

test('quick analysis: failure shows the real reason, not a generic message', async () => {
  const { api, messages } = loadChatUI();
  api.setAssistant({
    quickAnalysis: async () => ({ success: false, error: 'AI request limit reached. Please try again in about 12 minute(s).' }),
  });
  await api.handleQuickAnalysis('portfolio-summary');
  assert.match(messages().map(m => m.text).join(' '), /limit reached/i);
});
