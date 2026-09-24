// ===== RENDER UTILS (pure HTML builders) =====
// Small pure functions that turn data into HTML strings, escaping every
// user-supplied / imported value with the shared escapeHtml from
// dom-utils.js. Kept free of DOM access so they can be unit-tested in Node
// (see test/render-utils.test.js). Loaded after dom-utils.js in index.html.
//
// Exposed as window.RenderUtils in the browser and via module.exports in Node.

(function () {
  const esc = (typeof module !== 'undefined' && module.exports)
    ? require('./dom-utils.js').escapeHtml
    : window.escapeHtml;

  /**
   * <option> list for the "Is this a re-test?" selector.
   * Product name and experience id are user data: both are escaped.
   * Malformed entries (no productInfo) are skipped.
   */
  function buildRetestOptionsHtml(experiences) {
    const groups = {};
    (experiences || []).filter(exp => exp && exp.productInfo).forEach(exp => {
      const key = `${exp.productInfo.name}-${exp.productInfo.brand}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(exp);
    });

    let options = '<option value="">No - This is a new product</option>';
    Object.values(groups).forEach(exps => {
      exps.forEach((exp, idx) => {
        const testNum = exp.testNumber || (idx + 1);
        const date = new Date(exp.timestamp).toLocaleDateString();
        options += `<option value="${esc(exp.id)}">${esc(exp.productInfo.name)} - Test #${esc(testNum)} (${esc(date)})</option>`;
      });
    });
    return options;
  }

  const api = { buildRetestOptionsHtml };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.RenderUtils = Object.assign(window.RenderUtils || {}, api);
})();
