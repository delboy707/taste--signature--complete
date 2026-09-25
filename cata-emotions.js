// ===== CATA EMOTIONS (consumer emotion selections, display only) =====
// The QEP CSV import (batch-import.js) stores a Capture export's
// *_Emotions cells as check-all-that-apply selections:
//   experience.cataEmotions = { <stageKey>: { <emotionKey>: proportion|null } }
// null = selected, share unknown; a number 0-1 = share of consumers.
// A selection is NOT a 0-10 rating: nothing here returns a slider value,
// and no chart plots it. These pure builders turn the selections into
// escaped text/HTML for the readers that list emotions (History row,
// Shape of Taste, Emotional Mapping, Comparison, reports, AI prompt).
// Read-only: the experience is never changed.
//
// Exposed as window.CataEmotions in the browser and via module.exports in
// Node (test/cata-emotions.test.js). Loaded after dom-utils.js.

(function () {
  const dom = (typeof module !== 'undefined' && module.exports)
    ? require('./dom-utils.js')
    : window.DomUtils;
  const esc = dom.escapeHtml;

  const STAGE_ORDER = ['appearance', 'aroma', 'frontMouth', 'midRearMouth', 'texture', 'aftertaste', 'overall'];
  const STAGE_LABELS = {
    appearance: 'Appearance', aroma: 'Aroma', frontMouth: 'Front of Mouth', midRearMouth: 'Mid/Rear Mouth',
    texture: 'Texture', aftertaste: 'Aftertaste', overall: 'Overall'
  };
  const TITLE = 'Selected by consumers';
  const NOTE = 'Check-all-that-apply: a % is the share of consumers who selected the emotion; ' +
    'it is not a 0-10 rating.';
  const NOT_PLOTTED_NOTE = 'Not plotted in the chart: these are consumer selections ' +
    '(check-all-that-apply), not 0-10 ratings. A % is the share of consumers who selected the emotion.';
  const COMPARISON_NOTE = 'Not in the table above: these are consumer selections ' +
    '(check-all-that-apply), not 0-10 ratings. A % is the share of consumers who selected the emotion.';

  function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  /** 'calmRelaxed' -> 'Calm Relaxed'. */
  function emotionLabel(key) {
    const words = String(key).replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/[\s_-]+/).filter(Boolean);
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  function validShare(v) {
    return (typeof v === 'number' && isFinite(v) && v >= 0 && v <= 1) ? v : null;
  }

  /**
   * [{ stage, stageLabel, items: [{ key, label, proportion, share }] }]
   * in stage order (unknown stage keys last); empty stages are skipped.
   */
  function getCataSelections(exp) {
    const cata = exp && isPlainObject(exp.cataEmotions) ? exp.cataEmotions : null;
    if (!cata) return [];
    const keys = Object.keys(cata);
    const ordered = STAGE_ORDER.filter(k => keys.indexOf(k) !== -1)
      .concat(keys.filter(k => STAGE_ORDER.indexOf(k) === -1));
    const out = [];
    ordered.forEach(stage => {
      const sel = cata[stage];
      if (!isPlainObject(sel)) return;
      const items = Object.keys(sel).map(key => {
        const proportion = validShare(sel[key]);
        return {
          key: key,
          label: emotionLabel(key),
          proportion: proportion,
          share: proportion === null ? '' : Math.round(proportion * 100) + '%'
        };
      });
      if (items.length === 0) return;
      out.push({ stage: stage, stageLabel: STAGE_LABELS[stage] || stage, items: items });
    });
    return out;
  }

  function hasCataEmotions(exp) {
    return getCataSelections(exp).length > 0;
  }

  /** 'Excitement (62%)' or 'Excitement' (plain text, not escaped). */
  function formatCataItem(item) {
    return item.share ? item.label + ' (' + item.share + ')' : item.label;
  }

  /** ['Appearance: Excitement (62%), Curiosity', ...] (plain text). */
  function buildCataStageLines(exp) {
    return getCataSelections(exp).map(s => s.stageLabel + ': ' + s.items.map(formatCataItem).join(', '));
  }

  function chipsForStages(selections) {
    return selections.map(s => `
            <div class="cata-emotions-stage" style="margin-top: 6px;">
                <strong>${esc(s.stageLabel)}</strong>
                ${s.items.map(i => `<span class="cata-chip" style="display: inline-block; margin: 2px 4px 2px 0; padding: 2px 8px; border: 1px solid var(--qep-line, #ddd); border-radius: 10px; font-size: 0.85rem;">${esc(i.label)}${i.share ? ` <span class="cata-share" style="font-weight: 600;">${esc(i.share)}</span>` : ''}</span>`).join('')}
            </div>`).join('');
  }

  /** Panel with a title, a note and one chip row per stage; '' when none. */
  function buildCataChipsHtml(exp, opts) {
    const selections = getCataSelections(exp);
    if (selections.length === 0) return '';
    const note = opts && opts.note ? opts.note : NOTE;
    return `
        <div class="cata-emotions" style="margin-top: 12px; padding: 12px; border-radius: 8px; background: var(--qep-cream-2, #f8f9fa);">
            <div class="cata-emotions-title" style="font-weight: 600;">${esc(TITLE)}</div>
            <p class="cata-emotions-note" style="margin: 4px 0 0; font-size: 0.85rem; color: var(--text-light, #666);">${esc(note)}</p>
            ${chipsForStages(selections)}
        </div>`;
  }

  /** One line for the History row; '' when none. */
  function buildCataHistoryHtml(exp) {
    const lines = buildCataStageLines(exp);
    if (lines.length === 0) return '';
    return `<br><strong>${esc(TITLE)}:</strong> ${esc(lines.join('; '))}`;
  }

  /** Comparison: one block per product that has selections; '' when none. */
  function buildCataComparisonHtml(products) {
    const withSel = (Array.isArray(products) ? products : []).filter(p => hasCataEmotions(p));
    if (withSel.length === 0) return '';
    return `
        <div class="cata-emotions" style="margin-top: 20px; padding: 15px; border-radius: 8px; background: var(--qep-cream-2, #f8f9fa);">
            <div class="cata-emotions-title" style="font-weight: 600;">${esc(TITLE)}</div>
            <p class="cata-emotions-note" style="margin: 4px 0 0; font-size: 0.85rem; color: var(--text-light, #666);">${esc(COMPARISON_NOTE)}</p>
            ${withSel.map(p => `
            <div style="margin-top: 10px;">
                <div style="font-weight: 600;">${esc(p.productInfo && p.productInfo.name)}</div>
                ${chipsForStages(getCataSelections(p))}
            </div>`).join('')}
        </div>`;
  }

  /** Plain-text block for the AI product prompt; '' when none. */
  function buildCataPromptText(exp) {
    const lines = buildCataStageLines(exp);
    if (lines.length === 0) return '';
    return '**' + TITLE + '** (check-all-that-apply; a % is the share of consumers who selected it, ' +
      'not a 0-10 rating):\n' + lines.map(l => '- ' + l).join('\n');
  }

  /** jsPDF rows: [emotion, stage, '62%' | 'Selected']. */
  function buildCataTableRows(exp) {
    const rows = [];
    getCataSelections(exp).forEach(s => {
      s.items.forEach(i => rows.push([i.label, s.stageLabel, i.share || 'Selected']));
    });
    return rows;
  }

  /** CSV lines: 'Appearance,"Excitement (62%), Curiosity"' (quotes doubled). */
  function buildCataCsvRows(exp) {
    const q = (s) => '"' + String(s).replace(/"/g, '""') + '"';
    const cell = (s) => (/[",\n]/.test(s) ? q(s) : s);
    return getCataSelections(exp).map(s => cell(s.stageLabel) + ',' + q(s.items.map(formatCataItem).join(', ')));
  }

  const api = {
    TITLE, NOTE, NOT_PLOTTED_NOTE,
    getCataSelections, hasCataEmotions, formatCataItem, buildCataStageLines, buildCataChipsHtml,
    buildCataHistoryHtml, buildCataComparisonHtml, buildCataPromptText, buildCataTableRows, buildCataCsvRows
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.CataEmotions = api;
})();
