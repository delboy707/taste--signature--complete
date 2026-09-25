// ===== CONSUMER RESULTS (Stage 2C) =====
// Read-only "Consumer results" panel for an experience linked to a TSS
// project (experience.tssProjectId - set by Targets Loaded, or saved back
// after Send to Capture). For each LOCKED version of that project it calls
// qep-capture's public.get_version_results(p_version_id) (migration 0041,
// SECURITY INVOKER, org-scoped through tss_shared.project_versions RLS) and
// shows, per stage and attribute, Signature's own value for the mapped
// slider beside what Capture's consumers said:
//   - sensory / trigger codes (measure 'intensity'): mean (n, SD);
//   - emotion codes (measure 'applies', CATA): "% selected (selected of n)".
//     A proportion is never turned into a 0-10 intensity.
// Master code -> Signature slider goes through the SAME reverse crosswalk
// the Targets Loaded markers use (tss_shared.signature_attribute_map +
// signature_key_alias via qep-capture-crosswalk.js, indexed by
// target-prefill.js's buildCrosswalkIndex - canonical wins over alias).
// A code with no Signature slider is listed as "Capture only". Triggers map
// to experience.emotionalTriggers. Nothing here ever writes to the
// experience or to Supabase.
//
// Gated by qep-capture-config.js's ENABLE_CONSUMER_RESULTS (default false;
// turn on once 0041 is applied to the project the config points at).
//
// Pure logic (index, join, formatting, error mapping, RPC sequence, HTML
// builder) is DOM-free and unit-tested in test/consumer-results.test.js.
// Every interpolated string goes through dom-utils.js's escapeHtml.
// Exposed as window.ConsumerResults in the browser, module.exports in Node.

(function () {
  const isNode = typeof module !== 'undefined' && module.exports;
  const dom = isNode ? require('./dom-utils.js') : (window.DomUtils || { escapeHtml: window.escapeHtml, jsArgAttr: window.jsArgAttr });
  const esc = dom.escapeHtml;
  const jsArgAttr = dom.jsArgAttr;
  const targetPrefill = isNode ? require('./target-prefill.js') : window.TargetPrefill;

  const DEMO_MODE_MESSAGE = 'Consumer results are not available in demo mode. Sign in to your QEP account to see Capture results.';
  const NOT_IN_ORG_MESSAGE = 'Version not found or not in your organisation.';
  const PROJECT_NOT_IN_ORG_MESSAGE = 'Linked project not found or not in your organisation.';
  const DEFAULT_CONCURRENCY = 3;
  const PROD_HOSTNAME = 'signature.qeptss.com';

  const STAGE_ORDER = ['appearance', 'aroma', 'frontMouth', 'midRearMouth', 'texture', 'aftertaste', 'overall'];
  const STAGE_LABELS = {
    appearance: 'Appearance', aroma: 'Aroma', frontMouth: 'Front of Mouth', midRearMouth: 'Mid/Rear Mouth',
    texture: 'Texture', aftertaste: 'Aftertaste', overall: 'Overall',
  };
  // get_version_results returns qep_stage.stage_key (0041); names and
  // Signature ids are accepted too so a shape change degrades gracefully.
  const STAGE_ALIASES = {
    ap: 'appearance', ar: 'aroma', fm: 'frontMouth', mr: 'midRearMouth', tx: 'texture', af: 'aftertaste', overall: 'overall',
    app: 'appearance', aroma: 'aroma', fom: 'frontMouth', mrm: 'midRearMouth', tex: 'texture', aft: 'aftertaste', oa: 'overall',
    appearance: 'appearance', frontmouth: 'frontMouth', frontofmouth: 'frontMouth', midrearmouth: 'midRearMouth',
    texture: 'texture', aftertaste: 'aftertaste', overallassessment: 'overall',
  };
  const STATUS_LABELS = { draft: 'Draft', configuring: 'Configuring', live: 'Live', closed: 'Closed', archived: 'Archived' };

  function _config(config) {
    if (config) return config;
    return (typeof window !== 'undefined' && window.QEP_CAPTURE_CONFIG) || {};
  }

  function _hostname() {
    return (typeof window !== 'undefined' && window.location && window.location.hostname) || '';
  }

  function isConsumerResultsEnabled(config, hostname) {
    const c = _config(config);
    if (c.ENABLE_CONSUMER_RESULTS !== true) return false;
    const host = hostname !== undefined ? hostname : _hostname();
    // Same env guard as send-to-capture.js / the dual-write.
    if (host === PROD_HOSTNAME && c.SUPABASE_ENV === 'dev') return false;
    return true;
  }

  function hasCaptureLink(experience) {
    return !!(experience && experience.tssProjectId);
  }

  /** History-row button. Empty string when the flag is off or the experience is unlinked. */
  function buildConsumerResultsButtonHtml(experience, config) {
    if (!experience || !hasCaptureLink(experience) || !isConsumerResultsEnabled(config)) return '';
    return `<button type="button" class="btn btn-secondary consumer-results-btn" style="padding: 6px 12px; font-size: 0.85rem; margin-right: 8px;" title="${esc('Show what Capture consumers said about the linked project (read-only)')}" onclick="showConsumerResults(${jsArgAttr(experience.id)}, this)">Consumer results</button>`;
  }

  function normalizeStageId(stage) {
    if (stage === undefined || stage === null) return null;
    const raw = String(stage).trim();
    if (STAGE_ALIASES[raw]) return STAGE_ALIASES[raw];
    const flat = raw.toLowerCase().replace(/[^a-z]/g, '');
    return STAGE_ALIASES[flat] || null;
  }

  /** code -> { stage, key } per kind, from crosswalk rows (canonical rows first). */
  function buildSignatureIndex(crosswalkRows) {
    const build = targetPrefill.buildCrosswalkIndex;
    return {
      sensory: build(crosswalkRows, 'sensory'),
      emotion: build(crosswalkRows, 'emotion'),
      trigger: build(crosswalkRows, 'trigger'),
    };
  }

  // Crosswalk sensory keys are kebab-case lexicon ids; the experience stores
  // them camelCased (sensory-attributes.js attrIdToKey, same regex).
  function _fieldKey(kebab) {
    if (typeof window !== 'undefined' && typeof window.attrIdToKey === 'function') return window.attrIdToKey(kebab);
    return String(kebab).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  }

  function _num(v) {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  /** Signature's own value for a mapped slider (null = not rated / absent). */
  function signatureValueFor(experience, kind, match) {
    if (!experience || !match) return null;
    let v;
    if (kind === 'trigger') {
      v = experience.emotionalTriggers && experience.emotionalTriggers[match.key];
    } else {
      const stage = experience.stages && experience.stages[match.stage];
      if (!stage || typeof stage !== 'object') return null;
      v = kind === 'emotion' ? (stage.emotions && stage.emotions[match.key]) : stage[_fieldKey(match.key)];
    }
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  }

  function _row(attr, stageId, experience, index) {
    const kind = attr.kind === 'emotion' || attr.kind === 'trigger' ? attr.kind : 'sensory';
    const measure = attr.measure === 'applies' || (attr.measure === undefined && kind === 'emotion') ? 'applies' : 'intensity';
    const row = {
      code: String(attr.code || ''),
      kind,
      measure,
      stageId,
      label: String(attr.label || attr.code || ''),
      n: _num(attr.n),
      signatureKey: null,
      signatureValue: null,
      signatureStatus: 'unavailable',
    };
    if (measure === 'applies') {
      row.selected = _num(attr.selected);
      row.proportion = _num(attr.proportion);
    } else {
      row.mean = _num(attr.mean);
      row.sd = _num(attr.sd);
    }
    if (index) {
      const match = index[kind] && index[kind].get(row.code);
      // Never move a value across stages: a crosswalk row for another stage is not used.
      if (match && (kind === 'trigger' || match.stage === stageId)) {
        row.signatureKey = match.key;
        row.signatureValue = signatureValueFor(experience, kind, match);
        row.signatureStatus = row.signatureValue === null ? 'not_rated' : 'value';
      } else {
        row.signatureStatus = 'capture_only';
      }
    }
    return row;
  }

  /** Pure: one get_version_results payload joined with the experience. Never mutates it. */
  function buildVersionView(result, experience, index) {
    const r = result || {};
    const studies = (Array.isArray(r.studies) ? r.studies : []).map((s) => ({
      studyId: s && s.study_id ? String(s.study_id) : '',
      name: String((s && s.name) || 'Untitled study'),
      status: String((s && s.status) || ''),
      statusLabel: STATUS_LABELS[s && s.status] || String((s && s.status) || 'Unknown'),
      closedAt: (s && s.closed_at) || null,
      nSessions: _num(s && s.n_sessions) || 0,
    }));
    const byStage = new Map();
    const triggers = [];
    let captureOnlyCount = 0;
    for (const attr of Array.isArray(r.attributes) ? r.attributes : []) {
      if (!attr || !attr.code) continue;
      const stageId = normalizeStageId(attr.stage) || (attr.kind === 'trigger' ? 'overall' : null);
      const row = _row(attr, stageId, experience, index);
      if (row.signatureStatus === 'capture_only') captureOnlyCount++;
      if (row.kind === 'trigger') { triggers.push(row); continue; }
      const key = stageId || 'unknown';
      if (!byStage.has(key)) byStage.set(key, []);
      byStage.get(key).push(row);
    }
    const order = STAGE_ORDER.concat(['unknown']);
    const stages = order.filter((s) => byStage.has(s)).map((s) => {
      const rows = byStage.get(s);
      // sensory first, then emotions; RPC order kept within each kind
      const sorted = rows.filter((x) => x.measure === 'intensity').concat(rows.filter((x) => x.measure === 'applies'));
      return { stageId: s, label: STAGE_LABELS[s] || 'Other', rows: sorted };
    });
    const nSessions = _num(r.n_sessions) || 0;
    return {
      versionId: r.version_id ? String(r.version_id) : '',
      versionNumber: _num(r.version_number),
      nSessions,
      studies,
      stages,
      triggers,
      captureOnlyCount,
      empty: nSessions === 0,
      error: null,
    };
  }

  function _fixed(n, dp) {
    return (Math.round(n * Math.pow(10, dp)) / Math.pow(10, dp)).toFixed(dp);
  }

  /** Consumer column text. Emotions: percentage of consumers; never a 0-10 value. */
  function formatConsumer(row) {
    if (!row) return '';
    const n = _num(row.n);
    if (row.measure === 'applies') {
      const selected = _num(row.selected);
      let p = _num(row.proportion);
      if (p === null && selected !== null && n) p = selected / n;
      if (p === null || !n) return 'No answers';
      return `${Math.round(p * 100)}% selected (${selected === null ? Math.round(p * n) : selected} of ${n})`;
    }
    const mean = _num(row.mean);
    if (mean === null || !n) return 'No answers';
    const sd = _num(row.sd);
    return `mean ${_fixed(mean, 2)} (n ${n}, SD ${sd === null ? '-' : _fixed(sd, 2)})`;
  }

  function formatSignature(row) {
    if (!row) return '';
    switch (row.signatureStatus) {
      case 'value': return `${row.signatureValue}/10`;
      case 'not_rated': return 'Not rated';
      case 'capture_only': return 'Capture only';
      default: return 'Unavailable';
    }
  }

  function _messageOf(err) {
    if (!err) return '';
    if (typeof err === 'string') return err;
    return String(err.message || err.details || err.hint || '');
  }

  const ERROR_MAP = [
    [/demo mode/i, DEMO_MODE_MESSAGE],
    [/not signed in|no clerk session|not authenticated/i, 'Sign in to your QEP account to see Capture results.'],
    [/version not found or not in your organisation/i, NOT_IN_ORG_MESSAGE],
    [/could not find the function|PGRST202/i, 'Consumer results are not available on this QEP database yet. Contact QEP support.'],
    [/permission denied/i, 'The QEP database refused this request (permission denied). Try signing in again.'],
    [/supabase-js not loaded|qep-capture-config\.js not loaded|getQepCaptureClient is not available/i,
      'The connection to QEP is not configured on this page. Reload and try again.'],
    [/failed to fetch|networkerror|network request failed|load failed/i, 'Could not reach QEP. Check your connection and try again.'],
  ];

  function mapConsumerResultsError(err) {
    const msg = _messageOf(err);
    const code = err && typeof err === 'object' ? String(err.code || '') : '';
    if (code === 'QEP_DEMO_MODE') return DEMO_MODE_MESSAGE;
    for (const [re, friendly] of ERROR_MAP) {
      if (re.test(msg) || (code && re.test(code))) return friendly;
    }
    return msg ? `Could not load consumer results: ${msg}` : 'Could not load consumer results. Please try again.';
  }

  /** Run fn over items with at most `limit` in flight; results keep input order. */
  async function mapWithConcurrency(items, limit, fn) {
    const out = new Array(items.length);
    let next = 0;
    const workers = Array.from({ length: Math.max(1, Math.min(limit || 1, items.length)) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    });
    await Promise.all(workers);
    return out;
  }

  function _defaultIsDemo() {
    if (typeof window === 'undefined') return false;
    if (typeof window.isQepDemoModeActive === 'function') return window.isQepDemoModeActive() === true;
    return !!(window.demoMode && typeof window.demoMode.isDemoActive === 'function' && window.demoMode.isDemoActive());
  }

  function _defaultGetClient() {
    if (typeof window !== 'undefined' && typeof window.getQepCaptureClient === 'function') return window.getQepCaptureClient();
    throw new Error('consumer-results: getQepCaptureClient is not available.');
  }

  function _defaultFetchCrosswalk() {
    if (typeof window !== 'undefined' && typeof window.fetchSignatureAttributeCrosswalk === 'function') {
      return window.fetchSignatureAttributeCrosswalk();
    }
    return Promise.resolve({ error: 'fetchSignatureAttributeCrosswalk is not available.' });
  }

  /**
   * The read sequence. Resolves (never rejects) to a model:
   *   { state: 'ok', versions: [view | {versionNumber, versionId, error}], warning? }
   *   { state: 'no_locked_versions' } | { state: 'not_linked' } | { state: 'error', message }
   */
  async function loadConsumerResults(experience, deps = {}) {
    const isDemo = deps.isDemo || _defaultIsDemo;
    const getClient = deps.getClient || _defaultGetClient;
    const fetchCrosswalk = deps.fetchCrosswalk || _defaultFetchCrosswalk;
    const concurrency = deps.concurrency || DEFAULT_CONCURRENCY;

    if (!hasCaptureLink(experience)) return { state: 'not_linked' };
    if (isDemo()) return { state: 'error', message: DEMO_MODE_MESSAGE };

    let client;
    try {
      client = getClient();
    } catch (err) {
      return { state: 'error', message: mapConsumerResultsError(err) };
    }

    const projectId = String(experience.tssProjectId);
    let versionRows;
    try {
      const res = await client.schema('tss_shared').from('project_versions')
        .select('id, version_number, status').eq('project_id', projectId);
      if (res && res.error) return { state: 'error', message: mapConsumerResultsError(res.error) };
      versionRows = (res && res.data) || [];
    } catch (err) {
      return { state: 'error', message: mapConsumerResultsError(err) };
    }
    // RLS hides another org's project entirely: no rows == not visible.
    if (!versionRows.length) return { state: 'error', message: PROJECT_NOT_IN_ORG_MESSAGE };

    const locked = versionRows.filter((v) => v && v.status === 'locked' && v.id)
      .sort((a, b) => (_num(b.version_number) || 0) - (_num(a.version_number) || 0));
    if (!locked.length) return { state: 'no_locked_versions' };

    // Crosswalk failure is not fatal: consumer data is still shown.
    let index = null;
    let warning = '';
    try {
      const cw = await fetchCrosswalk();
      if (cw && Array.isArray(cw.rows)) index = buildSignatureIndex(cw.rows);
      else warning = 'Signature values could not be loaded (attribute crosswalk unavailable); consumer results are shown on their own.';
    } catch (err) {
      warning = 'Signature values could not be loaded (attribute crosswalk unavailable); consumer results are shown on their own.';
    }

    const versions = await mapWithConcurrency(locked, concurrency, async (v) => {
      const base = { versionId: String(v.id), versionNumber: _num(v.version_number) };
      try {
        const res = await client.rpc('get_version_results', { p_version_id: String(v.id) });
        if (res && res.error) return { ...base, error: mapConsumerResultsError(res.error) };
        const view = buildVersionView(res && res.data, experience, index);
        if (view.versionNumber === null) view.versionNumber = base.versionNumber;
        if (!view.versionId) view.versionId = base.versionId;
        return view;
      } catch (err) {
        return { ...base, error: mapConsumerResultsError(err) };
      }
    });

    if (versions.every((v) => v.error)) {
      const first = versions[0].error;
      return { state: 'error', message: versions.every((v) => v.error === first) ? first : 'Could not load consumer results for any version.' };
    }
    const model = { state: 'ok', versions };
    if (warning) model.warning = warning;
    return model;
  }

  // ---- HTML (pure string builders; every value escaped) ----

  function _formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString();
  }

  function _rowsTable(rows) {
    const body = rows.map((r) => `
        <tr>
          <td title="${esc(r.code)}">${esc(r.label)}</td>
          <td class="cr-sig${r.signatureStatus === 'capture_only' ? ' cr-capture-only' : ''}">${esc(formatSignature(r))}</td>
          <td>${esc(formatConsumer(r))}</td>
        </tr>`).join('');
    return `<table class="cr-table" style="width:100%;border-collapse:collapse;font-size:0.85rem;margin:4px 0 12px;">
        <thead><tr><th style="text-align:left;">Attribute</th><th style="text-align:left;">Signature (this experience)</th><th style="text-align:left;">Capture consumers</th></tr></thead>
        <tbody>${body}</tbody></table>`;
  }

  function _studiesHtml(studies) {
    if (!studies.length) return '<p class="cr-muted">No Capture study for this version yet.</p>';
    return `<ul class="cr-studies" style="margin:4px 0 8px 18px;padding:0;">${studies.map((s) => {
      const closed = s.status === 'closed' && s.closedAt ? ` on ${esc(_formatDate(s.closedAt))}` : '';
      return `<li>${esc(s.name)} - <strong>${esc(s.statusLabel)}</strong>${closed} (${esc(s.nSessions)} ${s.nSessions === 1 ? 'consumer' : 'consumers'})</li>`;
    }).join('')}</ul>`;
  }

  function _versionHtml(v) {
    const title = `Version ${esc(v.versionNumber === null || v.versionNumber === undefined ? '?' : v.versionNumber)}`;
    if (v.error) {
      return `<section class="cr-version"><h4 style="margin:12px 0 4px;">${title}</h4><p class="cr-error" role="alert" style="color:#b91c1c;">${esc(v.error)}</p></section>`;
    }
    let html = `<section class="cr-version"><h4 style="margin:12px 0 4px;">${title} - ${esc(v.nSessions)} ${v.nSessions === 1 ? 'consumer' : 'consumers'}</h4>`;
    html += _studiesHtml(v.studies || []);
    if (v.empty) return html + '<p class="cr-muted">No consumer responses yet.</p></section>';
    for (const s of v.stages || []) {
      html += `<h5 style="margin:8px 0 2px;">${esc(s.label)}</h5>${_rowsTable(s.rows)}`;
    }
    if ((v.triggers || []).length) html += `<h5 style="margin:8px 0 2px;">Emotional triggers</h5>${_rowsTable(v.triggers)}`;
    if (v.captureOnlyCount) {
      html += `<p class="cr-muted" style="font-size:0.8rem;">${esc(v.captureOnlyCount)} attribute(s) marked "Capture only" have no Signature slider.</p>`;
    }
    return html + '</section>';
  }

  function buildConsumerResultsHtml(model) {
    const m = model || {};
    const intro = '<p class="cr-muted" style="font-size:0.85rem;margin:0 0 8px;">Read-only. Emotions show the share of consumers who selected them; they are not a 0-10 rating.</p>';
    switch (m.state) {
      case 'loading': return '<p class="cr-loading" role="status">Loading consumer results...</p>';
      case 'not_linked': return '<p>This experience is not linked to a Capture project.</p>';
      case 'no_locked_versions': return '<p>The linked project has no locked versions yet, so there are no Capture results to show.</p>';
      case 'error': return `<p class="cr-error" role="alert" style="color:#b91c1c;">${esc(m.message || 'Could not load consumer results.')}</p>`;
      default: break;
    }
    let html = intro;
    if (m.warning) html += `<p class="cr-warning" style="color:#92400e;">${esc(m.warning)}</p>`;
    for (const v of m.versions || []) html += _versionHtml(v);
    return html;
  }

  // ---- DOM glue (browser only) ----

  function _panelTitle(experience) {
    const info = (experience && experience.productInfo) || {};
    return info.name ? `Consumer results - ${info.name}` : 'Consumer results';
  }

  /** Modal panel: title/close via textContent, body via the escaped builder. */
  function openConsumerResultsPanel(experience, deps = {}) {
    if (typeof document === 'undefined') return null;
    const existing = document.getElementById('consumer-results-panel');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = 'consumer-results-panel';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 10001; display: flex; align-items: flex-start; justify-content: center; padding: 16px; overflow-y: auto;';
    const box = document.createElement('div');
    box.style.cssText = 'background: var(--card-bg, white); color: var(--text-color, #1f2937); border-radius: 10px; padding: 20px; width: 100%; max-width: 760px; margin: 40px 0; box-shadow: 0 10px 30px rgba(0,0,0,0.25);';
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 8px;';
    const title = document.createElement('h3');
    title.style.cssText = 'margin: 0; font-size: 1.1rem;';
    title.textContent = _panelTitle(experience);
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'btn btn-secondary';
    close.textContent = 'Close';
    const body = document.createElement('div');
    body.className = 'cr-body';
    body.innerHTML = buildConsumerResultsHtml({ state: 'loading' });
    header.appendChild(title);
    header.appendChild(close);
    box.appendChild(header);
    box.appendChild(body);
    overlay.appendChild(box);
    const onKey = (e) => { if (e.key === 'Escape') closePanel(); };
    function closePanel() {
      document.removeEventListener('keydown', onKey);
      if (overlay.parentNode) overlay.remove();
    }
    close.addEventListener('click', closePanel);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closePanel(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    close.focus();

    const done = loadConsumerResults(experience, deps).then((model) => {
      if (overlay.parentNode) body.innerHTML = buildConsumerResultsHtml(model);
      return model;
    });
    return { overlay, close: closePanel, done };
  }

  const api = {
    DEMO_MODE_MESSAGE,
    NOT_IN_ORG_MESSAGE,
    STAGE_ORDER,
    isConsumerResultsEnabled,
    hasCaptureLink,
    buildConsumerResultsButtonHtml,
    normalizeStageId,
    buildSignatureIndex,
    signatureValueFor,
    buildVersionView,
    formatConsumer,
    formatSignature,
    mapConsumerResultsError,
    mapWithConcurrency,
    loadConsumerResults,
    buildConsumerResultsHtml,
    openConsumerResultsPanel,
  };

  if (isNode) module.exports = api;
  if (typeof window !== 'undefined') window.ConsumerResults = api;
})();
