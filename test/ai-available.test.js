// Unit tests for isAIAvailable() in config.js - no DOM, no browser.
// Run: node test/ai-available.test.js

const test = require('node:test');
const assert = require('node:assert/strict');

function withGlobals(globals, fn) {
  const saved = {};
  for (const k of Object.keys(globals)) { saved[k] = Object.getOwnPropertyDescriptor(globalThis, k); }
  Object.assign(globalThis, globals);
  try { return fn(); } finally {
    for (const k of Object.keys(globals)) {
      if (saved[k]) Object.defineProperty(globalThis, k, saved[k]); else delete globalThis[k];
    }
  }
}

const { isAIAvailable } = require('../config.js');
const signedIn = { isAuthenticated: () => true };
const signedOut = { isAuthenticated: () => false };

test('false when signed out, even if a Claude client exists', () => {
  withGlobals({ window: { authManager: signedOut, claudeAI: {} } }, () => {
    assert.equal(isAIAvailable(), false);
  });
});

test('false when there is no authManager at all (e.g. demo mode)', () => {
  withGlobals({ window: { claudeAI: {} } }, () => {
    assert.equal(isAIAvailable(), false);
  });
});

test('true when signed in and a claudeAI instance exists', () => {
  withGlobals({ window: { authManager: signedIn, claudeAI: {} } }, () => {
    assert.equal(isAIAvailable(), true);
  });
});

test('true when signed in and the ClaudeAI class is loaded (instance created lazily)', () => {
  withGlobals({ window: { authManager: signedIn, claudeAI: null }, ClaudeAI: class {} }, () => {
    assert.equal(isAIAvailable(), true);
  });
});

test('false when signed in but the AI client is not loaded at all', () => {
  withGlobals({ window: { authManager: signedIn, claudeAI: null } }, () => {
    assert.equal(isAIAvailable(), false);
  });
});

test('does not depend on the removed window.AI_CONFIG.ANTHROPIC_API_KEY', () => {
  withGlobals({ window: { authManager: signedIn, claudeAI: {}, AI_CONFIG: {} } }, () => {
    assert.equal(isAIAvailable(), true);
  });
});
