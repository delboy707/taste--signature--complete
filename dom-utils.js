// ===== DOM UTILS (shared, dependency-free) =====
// Canonical escapeHtml, consolidated out of four independently-drifted
// local copies (chat-ui.js, batch-import-ui.js, search-filter.js,
// targets-loaded-ui.js). This is the regex-based, quote-safe,
// null/undefined-safe implementation (previously only in
// batch-import-ui.js) - the two DOM-based copies it replaces
// (createTextNode -> innerHTML) never escaped quote characters, which was
// an attribute-injection bug wherever their output was interpolated into
// an HTML attribute (e.g. search-filter.js's `value="${escapeHtml(...)}"`).
//
// Exposed as a bare global `escapeHtml`, matching how every call site in
// this codebase already invokes it (unqualified, not namespaced), so
// removing the four local declarations is enough to make them resolve
// here - no call site needs to change.

/**
 * Escape HTML special characters to prevent XSS and attribute injection.
 * Escapes & < > " ' . Null/undefined-safe: coerces via String(), and
 * returns '' for null/undefined instead of throwing or emitting "null"/
 * "undefined".
 */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { escapeHtml };
}
if (typeof window !== 'undefined') {
  window.DomUtils = { escapeHtml };
  // Bare global too: every existing call site invokes escapeHtml(...)
  // unqualified, so it must resolve as a global, not just window.DomUtils.escapeHtml.
  window.escapeHtml = escapeHtml;
}
