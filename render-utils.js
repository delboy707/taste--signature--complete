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

  /**
   * Convert AI response text (untrusted model output) into limited HTML for
   * the comparison-insights panel. The text is HTML-escaped FIRST, then the
   * markdown-ish markers are turned into a fixed set of tags, so nothing the
   * model (or an injected prompt) emits can become live markup.
   */
  function formatAIResponse(text) {
    if (!text) return '';
    text = esc(text);
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\n/g, '<br>');
    text = text.replace(/^- (.*?)$/gm, '<li>$1</li>');
    text = text.replace(/(<li>.*?<\/li>)/s, '<ul>$1</ul>');
    return text;
  }

  /**
   * Richer markdown-style formatter for the AI Insights view (headings,
   * emphasis, code, lists). Same rule: escape first, then add fixed tags.
   */
  function formatAIMarkdown(content) {
    return esc(content)
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^\- (.+)$/gm, '<li>$1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  }

  /** Full AI Insights response card: title and body are both escaped. */
  function buildAIResponseCardHtml(content, title) {
    return `
        <div class="ai-response-content">
            <h2 style="color: var(--primary-color); margin-top: 0;">${esc(title)}</h2>
            <div style="margin-top: 20px;">
                <p>${formatAIMarkdown(content == null ? '' : content)}</p>
            </div>
        </div>
    `;
  }

  /** Error panel for AI failures; the message may echo server/user text. */
  function buildAIErrorHtml(message, hint) {
    return `
        <div class="ai-error">
            <h3>\u26A0\uFE0F Error</h3>
            <p>${esc(message)}</p>
            ${hint ? `<p style="margin-top: 15px; font-size: 0.9rem;">${hint}</p>` : ''}
        </div>
    `;
  }

  const api = { buildRetestOptionsHtml, formatAIResponse, formatAIMarkdown, buildAIResponseCardHtml, buildAIErrorHtml };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.RenderUtils = Object.assign(window.RenderUtils || {}, api);
})();
