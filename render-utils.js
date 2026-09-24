// ===== RENDER UTILS (pure HTML builders) =====
// Small pure functions that turn data into HTML strings, escaping every
// user-supplied / imported value with the shared escapeHtml from
// dom-utils.js. Kept free of DOM access so they can be unit-tested in Node
// (see test/render-utils.test.js). Loaded after dom-utils.js in index.html.
//
// Exposed as window.RenderUtils in the browser and via module.exports in Node.

(function () {
  const dom = (typeof module !== 'undefined' && module.exports)
    ? require('./dom-utils.js')
    : window.DomUtils;
  const esc = dom.escapeHtml;
  const jsArgAttr = dom.jsArgAttr;

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

  const cap = (str) => { str = String(str == null ? '' : str); return str.charAt(0).toUpperCase() + str.slice(1); };

  /** "Choose a product..." <select> options. Skips malformed entries. */
  function buildProductOptionsHtml(experiences) {
    return '<option value="">Choose a product...</option>' +
      (experiences || []).filter(e => e && e.productInfo).map(e =>
        `<option value="${esc(e.id)}">${esc(e.productInfo.name ?? 'Unknown')} - ${esc(e.productInfo.brand ?? 'Unknown')}</option>`
      ).join('');
  }

  /** Dashboard "recent activity" rows. */
  function buildRecentActivityHtml(experiences) {
    return (experiences || []).map(e => `
            <div style="padding: 10px; border-bottom: 1px solid var(--border-color);">
                <strong>${esc(e?.productInfo?.name || 'Unknown')}</strong> - ${esc(e?.productInfo?.brand || 'Unknown')}<br>
                <small style="color: var(--text-light);">${esc(new Date(e?.timestamp || Date.now()).toLocaleDateString())}</small>
            </div>
        `).join('');
  }

  /** Dashboard quick-insight rows ({title, text} - both plain text). */
  function buildQuickInsightsHtml(insights) {
    return (insights || []).map(i => `
        <div style="padding: 10px; border-bottom: 1px solid var(--border-color);">
            <strong style="color: var(--primary-color);">${esc(i.title)}</strong><br>
            <small>${esc(i.text)}</small>
        </div>
    `).join('');
  }

  /** Comparison-view product checkboxes. */
  function buildComparisonListHtml(experiences) {
    return (experiences || []).map(e => `
        <div class="comparison-checkbox">
            <input type="checkbox" id="compare-${esc(e.id)}" value="${esc(e.id)}">
            <label for="compare-${esc(e.id)}">${esc(e.productInfo.name)}</label>
        </div>
    `).join('');
  }

  /**
   * History list. Delete button passes the id as a JSON literal, escaped for the attribute.
   * opts.extraActionsHtml(e), if given, returns extra (already-escaped) button HTML
   * rendered before Delete - e.g. send-to-capture.js's "Send to Capture".
   */
  function buildHistoryHtml(experiences, opts) {
    const extraActions = opts && typeof opts.extraActionsHtml === 'function' ? opts.extraActionsHtml : () => '';
    return (experiences || []).map(e => `
            <div class="history-item">
                <div class="history-item-header">
                    <div>
                        <span class="history-item-title">${esc(e.productInfo.name)}</span>
                        <span class="history-item-brand">${esc(e.productInfo.brand)}</span>
                        <span class="history-item-type">${esc(e.productInfo.type)}</span>
                    </div>
                    <div>
                        <span class="history-item-date">${esc(new Date(e.timestamp).toLocaleDateString())}</span>
                        ${extraActions(e) || ''}<button class="delete-btn" onclick="deleteExperience(${jsArgAttr(e.id)})">Delete</button>
                    </div>
                </div>
                <div style="margin-top: 10px; font-size: 0.9rem;">
                    <strong>Need State:</strong> ${esc(cap(e.needState))}<br>
                    <strong>Satisfaction:</strong> ${esc(e.stages.aftertaste.emotions.satisfaction)}/10
                    ${e.productInfo.occasion && e.productInfo.occasion !== 'Not specified' ? `<br><strong>Occasion:</strong> ${esc(String(e.productInfo.occasion).replace('-', ' '))}` : ''}
                    ${e.productInfo.temperature && e.productInfo.temperature !== 'Not specified' ? `<br><strong>Temperature:</strong> ${esc(String(e.productInfo.temperature).replace('-', ' '))}` : ''}
                </div>
                ${e.notes ? `<div class="history-item-notes">${esc(e.notes)}</div>` : ''}
            </div>
        `).join('');
  }

  /** Comparison need-state cards. */
  function buildComparisonNeedStateHtml(products) {
    return (products || []).map(p => `
        <div style="padding: 15px; border: 2px solid var(--border-color); border-radius: 8px; margin-bottom: 10px;">
            <strong>${esc(p.productInfo.name)}</strong><br>
            <span style="display: inline-block; padding: 5px 10px; background: var(--primary-color); color: white; border-radius: 5px; margin-top: 5px;">
                ${esc(cap(p.needState))}
            </span>
        </div>
    `).join('');
  }

  /** Comparison summary cards; each arg is {name, ...} / precomputed label strings. */
  function buildComparisonSummaryCardsHtml(highest, consistent, strongest) {
    return `
        <div class="summary-card">
            <h4>\uD83C\uDFC6 Highest Rated</h4>
            <div class="value">${esc(highest.name)}</div>
            <div class="label">Average: ${esc(highest.label)}/10</div>
        </div>
        <div class="summary-card">
            <h4>\uD83D\uDCCA Most Consistent</h4>
            <div class="value">${esc(consistent.name)}</div>
            <div class="label">Std Dev: ${esc(consistent.label)}</div>
        </div>
        <div class="summary-card">
            <h4>\uD83D\uDCAB Strongest Emotions</h4>
            <div class="value">${esc(strongest.name)}</div>
            <div class="label">Total Impact: ${esc(strongest.label)}</div>
        </div>
    `;
  }

  const api = { buildRetestOptionsHtml, formatAIResponse, formatAIMarkdown, buildAIResponseCardHtml, buildAIErrorHtml,
    buildProductOptionsHtml, buildRecentActivityHtml, buildQuickInsightsHtml, buildComparisonListHtml,
    buildHistoryHtml, buildComparisonNeedStateHtml, buildComparisonSummaryCardsHtml };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.RenderUtils = Object.assign(window.RenderUtils || {}, api);
})();
