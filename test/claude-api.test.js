// Regression tests for the empty-AI-reply bug (2026-09-24).
//
// Sonnet 5 runs adaptive thinking by default, so the proxy's response can
// start with a `thinking` block (empty text) before the real `text` block.
// claude-api.js used to return `data.content[0].text`, which is undefined for
// that shape, so chat saved and rendered an EMPTY assistant message.
// Run: node test/claude-api.test.js

const test = require('node:test');
const assert = require('node:assert/strict');

// claude-api.js and ai-chat.js are browser scripts: give them a window.
global.window = {
  AI_CONFIG: { ANTHROPIC_API_URL: '/api/claude', CLAUDE_MAX_TOKENS: 4096, CLAUDE_MODEL: 'claude-sonnet-5' },
  UsageTracker: class {
    canUseAI() { return { allowed: true, remaining: { today: 9 } }; }
    getUserTier() { return { name: 'Free', quotas: { aiInsightsPerDay: -1 } }; }
    recordAIUsage() { return { todayTotal: 1, monthTotal: 1 }; }
    getUsageSummary() { return {}; }
  },
  Clerk: { session: { getToken: async () => 'clerk-token' } },
  authManager: { currentUser: { uid: 'u1' } },
};
global.alert = () => {};

const { ClaudeAI, extractResponseText } = require('../claude-api.js');
const { AIChatAssistant } = require('../ai-chat.js');

const THINKING_FIRST = {
  content: [
    { type: 'thinking', thinking: '', signature: 'sig' },
    { type: 'text', text: 'Your strongest product is Alpha because...' },
  ],
  stop_reason: 'end_turn',
};

function fetchReturning(data, status = 200) {
  return async () => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => data,
  });
}

test('extractResponseText: thinking block first, text second -> the text', () => {
  assert.equal(extractResponseText(THINKING_FIRST), 'Your strongest product is Alpha because...');
});

test('extractResponseText: plain text-only shape still works', () => {
  assert.equal(extractResponseText({ content: [{ type: 'text', text: 'hi' }] }), 'hi');
  assert.equal(extractResponseText({ content: [{ text: 'legacy shape' }] }), 'legacy shape');
});

test('extractResponseText: several text blocks are joined, thinking ignored', () => {
  const out = extractResponseText({
    content: [{ type: 'thinking', thinking: 'x' }, { type: 'text', text: 'a' }, { type: 'text', text: 'b' }],
  });
  assert.equal(out, 'ab');
});

test('extractResponseText: thinking only + max_tokens -> clear "ran out of room" error', () => {
  assert.throws(
    () => extractResponseText({ content: [{ type: 'thinking', thinking: '' }], stop_reason: 'max_tokens' }),
    /ran out of room/i
  );
});

test('extractResponseText: refusal -> clear declined error', () => {
  assert.throws(() => extractResponseText({ content: [], stop_reason: 'refusal' }), /declined/i);
});

test('extractResponseText: empty / malformed payloads throw, never return empty', () => {
  for (const bad of [null, undefined, {}, { content: [] }, { content: 'nope' }, { content: [{ type: 'text', text: '   ' }] }]) {
    assert.throws(() => extractResponseText(bad), /empty answer/i);
  }
});

test('callAPI: a thinking-first proxy response yields the text (was undefined before the fix)', async () => {
  global.fetch = fetchReturning(THINKING_FIRST);
  const ai = new ClaudeAI();
  const text = await ai.callAPI('q', 'sys', null, 'tok');
  assert.equal(text, 'Your strongest product is Alpha because...');
});

test('callAPI: a 200 with no text block rejects with a clear error', async () => {
  global.fetch = fetchReturning({ content: [{ type: 'thinking', thinking: '' }], stop_reason: 'end_turn' });
  const ai = new ClaudeAI();
  await assert.rejects(() => ai.callAPI('q', 'sys', null, 'tok'), /empty answer/i);
});

test('sendMessage: empty AI result is an error and does not consume quota', async () => {
  global.fetch = fetchReturning({ content: [], stop_reason: 'end_turn' });
  const ai = new ClaudeAI();
  let recorded = 0;
  ai.usageTracker.recordAIUsage = () => { recorded++; return { todayTotal: 1, monthTotal: 1 }; };
  await assert.rejects(() => ai.sendMessage('q', 'sys'), /empty answer/i);
  assert.equal(recorded, 0);
});

test('chat: an empty reply becomes success:false, and history is not polluted', async () => {
  for (const empty of [undefined, '', '   ', null]) {
    const chat = new AIChatAssistant({ sendMessage: async () => empty });
    const result = await chat.sendMessage('What are my strongest products and why?');
    assert.equal(result.success, false);
    assert.match(result.error, /empty answer/i);
    assert.equal(chat.conversationHistory.length, 0);
  }
});

test('chat: a real reply still succeeds and is stored', async () => {
  const chat = new AIChatAssistant({ sendMessage: async () => 'Alpha is strongest.' });
  const result = await chat.sendMessage('Which is strongest?');
  assert.equal(result.success, true);
  assert.equal(result.response, 'Alpha is strongest.');
  assert.equal(chat.conversationHistory.length, 2);
});

test('sensory inference: when the AI path fails, the fallback warning says why', async () => {
  global.window.claudeAI = { sendMessage: async () => { throw new Error('AI request limit reached.'); } };
  const { SensoryInference } = require('../sensory-inference.js');
  const origLog = console.log, origErr = console.error;
  console.log = () => {}; console.error = () => {};
  let result;
  try {
    result = await SensoryInference.inferFromFeedback({ name: 'Choc bar', productName: 'Choc bar', feedback: 'sweet and creamy' });
  } finally { console.log = origLog; console.error = origErr; delete global.window.claudeAI; }
  assert.equal(result.inferenceMethod, 'keyword_rules');
  assert.ok(result.warnings.some(w => /AI unavailable: AI request limit reached/.test(w.message)), JSON.stringify(result.warnings));
});
