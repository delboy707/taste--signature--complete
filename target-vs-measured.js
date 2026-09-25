// ===== TARGET VS MEASURED + AMEND (Stage 2D) =====
// History-row view for an experience linked to a TSS project
// (experience.tssProjectId). Per Journey-of-Taste stage it lists every
// attribute / emotion / trigger that has a Brief target, a Signature score
// or a Capture consumer result, with four columns:
//   target | Signature (this experience) | consumers | gap status
// and a gap status computed SEPARATELY for Signature vs target and for
// consumers vs target (on target / under / over, with a tolerance).
//
// Data sources (all existing; nothing new server side):
//   - versions: tss_shared.project_versions of the linked project (RLS);
//   - targets: tss_shared.targets + tss_shared.version_stage_notes of the
//     chosen TARGET version, labels from public.qep_attribute (the same
//     schema-qualified reads targets-loaded.js does, plus range_min/max);
//   - Signature's own score: the experience's slider values (null = not
//     rated), matched to master codes through the SAME reverse crosswalk as
//     the markers and the Consumer results panel
//     (ConsumerResults.buildSignatureIndex over qep-capture-crosswalk.js);
//   - consumers: public.get_version_results(p_version_id) (qep-capture
//     0041) of the chosen RESULTS version (called like consumer-results.js).
//
// Gap rules (documented in the view; defaults in DEFAULT_RULES):
//   - numeric target t (range_min..range_max, usually min = max):
//     on target when min - tol <= value <= max + tol, else under / over,
//     with the signed gap to the nearest bound. tol defaults to 1.0 on the
//     0-10 scale (config TARGET_VS_MEASURED_TOLERANCE), overridable in the
//     view and remembered per browser (localStorage, try/catch).
//   - legacy word-only targets (Brief Lock writes intensity 'high' with no
//     range): 'high' = value >= 7 is on target, below is under (never over);
//     'low' = value <= 3 is on target, above is over (never under). Any
//     other word: "No numeric target".
//   - emotions, consumer side (CATA - a share of consumers, never a 0-10
//     value): a target >= 7 (or 'high') expects at least 50% of consumers
//     to select it (configurable in the view) - below is under; a target
//     <= 3 (or 'low') expects at most 20% - above is over; a target of 4-6
//     is "Not compared" (a tick-box share cannot say "moderate").
//     Signature's own emotion sliders are 0-10, so they use the numeric rule.
//
// Version choice: targets default to experience.sourceVersionId (the Brief
// version the experience was measured against - the markers the evaluator
// saw) when it is a LOCKED version of the project, else the project's latest
// locked version. Consumers default to the latest locked version whose study
// has responses, else the latest with a study, else none. Both are
// switchable; drafts are never shown.
//
// AMEND: in the view the user edits target values, removes or adds targets
// and presses "Create next version". That calls the EXISTING
// tss_shared.create_version_from_signature(payload) (qep-capture 0038)
// ONCE, with an experience-shaped payload built ONLY from the amended
// target set (never the experience's own slider values):
//   { id: experience.id, productInfo {name, brand, type}, tssProjectId,
//     sourceVersionId: <target version>, stages.<stage>.<camelKey>,
//     stages.<stage>.emotions.<key>, emotionalTriggers.<key> }
// 0038 then creates the NEXT locked version on the SAME project (targets
// stored as range_min = range_max = value, role 'primary', attributed to
// the experience via source_signature_experience_id), or returns the latest
// version unchanged when it is this experience's with an identical
// fingerprint (no duplicate). No Firestore experience is ever created or
// copied; the experience's link fields change only through
// SendToCapture.applyCaptureLink (which never overwrites an existing link).
// What the payload cannot carry is listed before creating and needs an
// explicit tick: targets with no Signature slider (or a crosswalk row for
// another stage), emotion targets of 0 (0038 treats 0 as "not felt"),
// stage notes ("Brief says" text), roles (all become primary), word-only
// targets (stored as the marker value, high = 8 / low = 2) and ranges
// (stored as their midpoint).
//
// Gated by qep-capture-config.js's ENABLE_TARGET_VS_MEASURED (default false).
// Pure logic is DOM-free and unit-tested in test/target-vs-measured.test.js;
// every interpolated string goes through dom-utils.js's escapeHtml.
// Exposed as window.TargetVsMeasured in the browser, module.exports in Node.

(function () {
  const isNode = typeof module !== 'undefined' && module.exports;
  const dom = isNode ? require('./dom-utils.js') : (window.DomUtils || { escapeHtml: window.escapeHtml, jsArgAttr: window.jsArgAttr });
  const esc = dom.escapeHtml;
  const jsArgAttr = dom.jsArgAttr;
  const CR = isNode ? require('./consumer-results.js') : window.ConsumerResults;
  const targetPrefill = isNode ? require('./target-prefill.js') : window.TargetPrefill;
  const sendToCapture = isNode ? require('./send-to-capture.js') : window.SendToCapture;

  const PROD_HOSTNAME = 'signature.qeptss.com';
  const PREFS_KEY = 'tss_target_vs_measured_prefs_v1';
  const DEFAULT_CONCURRENCY = 3;
  const EPS = 1e-9;
  const DEMO_MODE_MESSAGE = 'Target vs measured is not available in demo mode. Sign in to your QEP account to compare targets with results.';
  const PROJECT_NOT_IN_ORG_MESSAGE = 'Linked project not found or not in your organisation.';

  const DEFAULT_RULES = Object.freeze({
    tolerance: 1.0,
    legacyHighMin: 7,
    legacyLowMax: 3,
    emotionHighTarget: 7,
    emotionLowTarget: 3,
    emotionHighMinSelected: 0.5,
    emotionLowMaxSelected: 0.2,
  });
  const MAX_TOLERANCE = 5;

  const STAGE_ORDER = ['appearance', 'aroma', 'frontMouth', 'midRearMouth', 'texture', 'aftertaste', 'overall'];
  const STAGE_LABELS = {
    appearance: 'Appearance', aroma: 'Aroma', frontMouth: 'Front of Mouth', midRearMouth: 'Mid/Rear Mouth',
    texture: 'Texture', aftertaste: 'Aftertaste', overall: 'Overall', unknown: 'Other',
  };
  const KIND_ORDER = { sensory: 0, emotion: 1, trigger: 2 };

  const STATUS_LABELS = {
    on_target: 'On target',
    under: 'Under',
    over: 'Over',
    no_data: 'No data',
    no_target: 'No target',
    no_numeric_target: 'No numeric target',
    not_compared: 'Not compared',
  };

  function _config(config) {
    if (config) return config;
    return (typeof window !== 'undefined' && window.QEP_CAPTURE_CONFIG) || {};
  }

  function _hostname() {
    return (typeof window !== 'undefined' && window.location && window.location.hostname) || '';
  }

  function isTargetVsMeasuredEnabled(config, hostname) {
    const c = _config(config);
    if (c.ENABLE_TARGET_VS_MEASURED !== true) return false;
    const host = hostname !== undefined ? hostname : _hostname();
    // Same env guard as send-to-capture.js / consumer-results.js / the dual-write.
    if (host === PROD_HOSTNAME && c.SUPABASE_ENV === 'dev') return false;
    return true;
  }

  function hasCaptureLink(experience) {
    return !!(experience && experience.tssProjectId);
  }

  function buildTargetVsMeasuredButtonHtml(experience, config) {
    if (!experience || !hasCaptureLink(experience) || !isTargetVsMeasuredEnabled(config)) return '';
    return `<button type="button" class="btn btn-secondary target-vs-measured-btn" style="padding: 6px 12px; font-size: 0.85rem; margin-right: 8px;" title="${esc('Compare the Brief targets with this experience and with Capture consumers; amend the targets as a new version')}" onclick="showTargetVsMeasured(${jsArgAttr(experience.id)}, this)">Target vs measured</button>`;
  }

  // ---- numbers + rules ----

  function _num(v) {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function _round(n, dp) {
    const f = Math.pow(10, dp);
    const r = Math.round(n * f) / f;
    return r === 0 ? 0 : r;
  }

  function _inRange(n, lo, hi) {
    return n !== null && n >= lo && n <= hi;
  }

  /** Effective rules: defaults < config tolerance < the view's overrides (validated). */
  function resolveRules(config, prefs) {
    const c = config || {};
    const p = prefs || {};
    const rules = { ...DEFAULT_RULES };
    const cfgTol = _num(c.TARGET_VS_MEASURED_TOLERANCE);
    if (_inRange(cfgTol, 0, MAX_TOLERANCE)) rules.tolerance = cfgTol;
    const tol = _num(p.tolerance);
    if (_inRange(tol, 0, MAX_TOLERANCE)) rules.tolerance = tol;
    const pct = _num(p.emotionHighMinSelectedPct);
    if (_inRange(pct, 0, 100)) rules.emotionHighMinSelected = pct / 100;
    return rules;
  }

  function _storage(storage) {
    if (storage !== undefined) return storage;
    try {
      return (typeof window !== 'undefined' && window.localStorage) || null;
    } catch (_) {
      return null;
    }
  }

  function loadPrefs(storage) {
    const s = _storage(storage);
    if (!s) return {};
    try {
      const raw = s.getItem(PREFS_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function savePrefs(storage, prefs) {
    const s = _storage(storage);
    if (!s) return false;
    try {
      s.setItem(PREFS_KEY, JSON.stringify(prefs || {}));
      return true;
    } catch (_) {
      return false;
    }
  }

  // ---- gap classification (pure) ----

  /** A target row -> { type: 'numeric', min, max } | { type: 'legacy', intensity } | { type: 'none' }. */
  function targetSpec(row) {
    if (!row) return { type: 'none' };
    let min = _num(row.range_min !== undefined ? row.range_min : row.rangeMin);
    let max = _num(row.range_max !== undefined ? row.range_max : row.rangeMax);
    if (min !== null || max !== null) {
      if (min === null) min = max;
      if (max === null) max = min;
      if (min > max) { const t = min; min = max; max = t; }
      return { type: 'numeric', min, max };
    }
    const intensity = row.intensity ? String(row.intensity).toLowerCase() : '';
    if (intensity) return { type: 'legacy', intensity };
    return { type: 'none' };
  }

  function classifyNumeric(value, spec, tolerance) {
    const v = _num(value);
    if (v === null) return { status: 'no_data' };
    const tol = _num(tolerance) === null ? DEFAULT_RULES.tolerance : Number(tolerance);
    const nearest = Math.min(Math.max(v, spec.min), spec.max);
    const delta = _round(v - nearest, 2);
    if (v < spec.min - tol - EPS) return { status: 'under', delta };
    if (v > spec.max + tol + EPS) return { status: 'over', delta };
    return { status: 'on_target', delta };
  }

  /** Any 0-10 value (Signature slider, consumer mean) against a target spec. */
  function classifyValue(value, spec, rules) {
    const r = rules || DEFAULT_RULES;
    if (!spec) return { status: 'no_target' };
    if (spec.type === 'none') return { status: 'no_numeric_target' };
    if (spec.type === 'legacy') {
      if (spec.intensity !== 'high' && spec.intensity !== 'low') return { status: 'no_numeric_target' };
      const v = _num(value);
      if (v === null) return { status: 'no_data' };
      if (spec.intensity === 'high') {
        return v >= r.legacyHighMin - EPS
          ? { status: 'on_target', detail: `${v} >= ${r.legacyHighMin} (high)` }
          : { status: 'under', detail: `${v} < ${r.legacyHighMin} (high)` };
      }
      return v <= r.legacyLowMax + EPS
        ? { status: 'on_target', detail: `${v} <= ${r.legacyLowMax} (low)` }
        : { status: 'over', detail: `${v} > ${r.legacyLowMax} (low)` };
    }
    return classifyNumeric(value, spec, r.tolerance);
  }

  /** The level a target asks of a CATA emotion: 'high' | 'low' | 'mid' | null. */
  function _emotionLevel(spec, rules) {
    if (!spec || spec.type === 'none') return null;
    if (spec.type === 'legacy') return spec.intensity === 'high' || spec.intensity === 'low' ? spec.intensity : null;
    const t = (spec.min + spec.max) / 2;
    if (t >= rules.emotionHighTarget - EPS) return 'high';
    if (t <= rules.emotionLowTarget + EPS) return 'low';
    return 'mid';
  }

  /** Consumer CATA share (0..1) against a target. Never converted to 0-10. */
  function classifyCata(proportion, n, spec, rules) {
    const r = rules || DEFAULT_RULES;
    if (!spec) return { status: 'no_target' };
    const level = _emotionLevel(spec, r);
    if (level === null) return { status: 'no_numeric_target' };
    const p = _num(proportion);
    if (p === null || !_num(n)) return { status: 'no_data' };
    const pct = Math.round(p * 100);
    if (level === 'high') {
      const min = Math.round(r.emotionHighMinSelected * 100);
      return p >= r.emotionHighMinSelected - EPS
        ? { status: 'on_target', detail: `${pct}% selected, expected at least ${min}%` }
        : { status: 'under', detail: `${pct}% selected, expected at least ${min}%` };
    }
    if (level === 'low') {
      const max = Math.round(r.emotionLowMaxSelected * 100);
      return p <= r.emotionLowMaxSelected + EPS
        ? { status: 'on_target', detail: `${pct}% selected, expected at most ${max}%` }
        : { status: 'over', detail: `${pct}% selected, expected at most ${max}%` };
    }
    return { status: 'not_compared', detail: 'A mid-scale emotion target cannot be judged from a tick-box share.' };
  }

  // ---- crosswalk indexes ----

  function _camel(kebab) {
    if (typeof window !== 'undefined' && typeof window.attrIdToKey === 'function') return window.attrIdToKey(kebab);
    return String(kebab).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  }

  // 0038's server-side conversion, verbatim: lower(regexp_replace(k, '([A-Z])', '-\1', 'g')).
  function _kebabLike0038(camel) {
    return String(camel).replace(/([A-Z])/g, '-$1').toLowerCase();
  }

  /**
   * { reverse: ConsumerResults.buildSignatureIndex(rows) (code -> slider,
   *   per kind - the one shared adapter over target-prefill's index), forward:
   *   Map 'kind|stage|kebabKey' -> code (canonical rows first win) }.
   */
  function buildIndexes(crosswalkRows) {
    const rows = Array.isArray(crosswalkRows) ? crosswalkRows : [];
    const forward = new Map();
    for (const r of rows) {
      if (!r || !r.variable_key || !r.kind) continue;
      const stage = r.kind === 'trigger' ? 'overall' : r.signature_stage;
      const k = `${r.kind}|${stage}|${r.signature_key}`;
      if (!forward.has(k)) forward.set(k, String(r.variable_key));
    }
    return { reverse: CR.buildSignatureIndex(rows), forward };
  }

  // Tolerates both index shapes (code -> {stage,key} on main; code -> [{stage,key,kind}] on 2A.5).
  function _reverseMatch(indexes, kind, code) {
    if (!indexes || !indexes.reverse) return null;
    const map = indexes.reverse[kind];
    const v = map && typeof map.get === 'function' ? map.get(code) : null;
    if (!v) return null;
    if (Array.isArray(v)) return v.find((x) => x && (!x.kind || x.kind === kind)) || null;
    return v;
  }

  function _inferKind(code) {
    const c = String(code || '');
    if (/_emo_/.test(c)) return 'emotion';
    if (/_trig_/.test(c)) return 'trigger';
    return 'sensory';
  }

  function _humanize(key) {
    const s = String(key || '').replace(/[-_]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  /** tss_shared.targets rows + qep_attribute rows (by id) -> shaped targets. */
  function shapeTargetRows(rows, attrsById) {
    const out = [];
    const seen = new Set();
    for (const t of Array.isArray(rows) ? rows : []) {
      if (!t || !t.variable_key || seen.has(t.variable_key)) continue;
      seen.add(t.variable_key);
      const code = String(t.variable_key);
      const attr = (attrsById && attrsById[code]) || null;
      const kind = attr && (attr.kind === 'emotion' || attr.kind === 'trigger' || attr.kind === 'sensory') ? attr.kind : _inferKind(code);
      const stageId = (attr && CR.normalizeStageId(attr.stage_key)) || (kind === 'trigger' ? 'overall' : 'unknown');
      out.push({
        code,
        kind,
        stageId,
        label: String((attr && attr.label) || code),
        role: t.role || 'primary',
        intensity: t.intensity || null,
        rangeMin: _num(t.range_min),
        rangeMax: _num(t.range_max),
        spec: targetSpec(t),
      });
    }
    return out;
  }

  /** Every numeric slider of the experience: { kind, stageId, key, value }. */
  function signatureEntries(experience) {
    const out = [];
    const stages = (experience && experience.stages) || {};
    for (const stageId of STAGE_ORDER) {
      const sd = stages[stageId];
      if (!sd || typeof sd !== 'object') continue;
      for (const [k, v] of Object.entries(sd)) {
        if (k === 'emotions') continue;
        if (typeof v === 'number' && Number.isFinite(v)) out.push({ kind: 'sensory', stageId, key: k, value: v });
      }
      const emo = sd.emotions && typeof sd.emotions === 'object' ? sd.emotions : {};
      for (const [k, v] of Object.entries(emo)) {
        if (typeof v === 'number' && Number.isFinite(v)) out.push({ kind: 'emotion', stageId, key: k, value: v });
      }
    }
    const trig = (experience && experience.emotionalTriggers) || {};
    for (const [k, v] of Object.entries(trig)) {
      if (typeof v === 'number' && Number.isFinite(v)) out.push({ kind: 'trigger', stageId: 'overall', key: k, value: v });
    }
    return out;
  }

  function _forwardCode(indexes, entry) {
    if (!indexes || !indexes.forward) return null;
    const key = entry.kind === 'sensory' ? _kebabLike0038(entry.key) : entry.key;
    return indexes.forward.get(`${entry.kind}|${entry.stageId}|${key}`) || null;
  }

  /** Master codes of the experience's rated sliders (for label lookup). */
  function signatureCodes(experience, indexes) {
    const codes = [];
    for (const e of signatureEntries(experience)) {
      const c = _forwardCode(indexes, e);
      if (c && !codes.includes(c)) codes.push(c);
    }
    return codes;
  }

  function _signatureFor(experience, indexes, kind, code, stageId) {
    if (!indexes) return { status: 'unavailable', value: null, key: null };
    const match = _reverseMatch(indexes, kind, code);
    if (!match) return { status: 'no_slider', value: null, key: null };
    // Never move a value across stages.
    if (kind !== 'trigger' && match.stage !== stageId) return { status: 'no_slider', value: null, key: null };
    const value = CR.signatureValueFor(experience, kind, match);
    const key = kind === 'sensory' ? _camel(match.key) : match.key;
    return { status: value === null ? 'not_rated' : 'value', value, key };
  }

  /**
   * Pure join of one target version, one results payload and the experience.
   * Returns { stages: [{ stageId, label, notes, rows }], counts }.
   */
  function buildComparison({ targets, notes, results, experience, indexes, labels, rules } = {}) {
    const r = rules || DEFAULT_RULES;
    const lab = labels || {};
    const rows = new Map();
    const order = [];
    function add(id, row) { rows.set(id, row); order.push(id); return row; }
    function base(code, kind, stageId, label) {
      return {
        id: code, code, kind, stageId, label,
        target: null, role: null, consumer: null,
        signature: { status: 'unavailable', value: null, key: null },
      };
    }

    for (const t of Array.isArray(targets) ? targets : []) {
      if (!t || !t.code || rows.has(t.code)) continue;
      const row = add(t.code, base(t.code, t.kind, t.stageId, lab[t.code] || t.label || t.code));
      row.target = t.spec || targetSpec(t);
      row.role = t.role || null;
      row.targetRow = t;
    }

    const res = results || null;
    for (const a of res && Array.isArray(res.attributes) ? res.attributes : []) {
      if (!a || !a.code) continue;
      const code = String(a.code);
      const kind = a.kind === 'emotion' || a.kind === 'trigger' ? a.kind : 'sensory';
      const measure = a.measure === 'applies' || (a.measure === undefined && kind === 'emotion') ? 'applies' : 'intensity';
      const consumer = measure === 'applies'
        ? { measure, n: _num(a.n), selected: _num(a.selected), proportion: _num(a.proportion) }
        : { measure, n: _num(a.n), mean: _num(a.mean), sd: _num(a.sd) };
      let row = rows.get(code);
      if (!row) {
        const stageId = CR.normalizeStageId(a.stage) || (kind === 'trigger' ? 'overall' : 'unknown');
        row = add(code, base(code, kind, stageId, lab[code] || String(a.label || code)));
      }
      row.consumer = consumer;
    }

    for (const id of order) {
      const row = rows.get(id);
      row.signature = _signatureFor(experience, indexes, row.kind, row.code, row.stageId);
    }

    for (const e of signatureEntries(experience)) {
      const code = _forwardCode(indexes, e);
      if (code && rows.has(code)) {
        const row = rows.get(code);
        // An alias-keyed slider fills a row whose canonical slider is empty (same stage only).
        if (row.signature.status !== 'value' && row.kind === e.kind && (e.kind === 'trigger' || row.stageId === e.stageId)) {
          row.signature = { status: 'value', value: e.value, key: e.key };
        }
        continue;
      }
      if (code) {
        const row = add(code, base(code, e.kind, e.stageId, lab[code] || _humanize(e.key)));
        row.signature = { status: 'value', value: e.value, key: e.key };
        continue;
      }
      const id = `sig:${e.stageId}:${e.kind}:${e.key}`;
      if (rows.has(id)) continue;
      const row = add(id, base(null, e.kind, e.stageId, _humanize(e.key)));
      row.id = id;
      row.signature = { status: 'value', value: e.value, key: e.key };
    }

    const counts = { signature: {}, consumers: {} };
    for (const id of order) {
      const row = rows.get(id);
      row.sigGap = row.target ? classifyValue(row.signature.status === 'value' ? row.signature.value : null, row.target, r) : { status: 'no_target' };
      if (!row.target) row.conGap = { status: 'no_target' };
      else if (!row.consumer) row.conGap = classifyValue(null, row.target, r).status === 'no_numeric_target' ? { status: 'no_numeric_target' } : { status: 'no_data' };
      else if (row.consumer.measure === 'applies') row.conGap = classifyCata(row.consumer.proportion, row.consumer.n, row.target, r);
      else row.conGap = classifyValue(row.consumer.n ? row.consumer.mean : null, row.target, r);
      counts.signature[row.sigGap.status] = (counts.signature[row.sigGap.status] || 0) + 1;
      counts.consumers[row.conGap.status] = (counts.consumers[row.conGap.status] || 0) + 1;
    }

    const byStage = new Map();
    for (const id of order) {
      const row = rows.get(id);
      const s = STAGE_ORDER.includes(row.stageId) ? row.stageId : 'unknown';
      if (!byStage.has(s)) byStage.set(s, []);
      byStage.get(s).push(row);
    }
    const n = notes || {};
    const stages = STAGE_ORDER.concat(['unknown']).filter((s) => byStage.has(s) || (n[s] && s !== 'unknown')).map((s) => {
      const list = (byStage.get(s) || []).map((row, i) => ({ row, i }))
        .sort((a, b) => (KIND_ORDER[a.row.kind] - KIND_ORDER[b.row.kind]) || (a.i - b.i))
        .map((x) => x.row);
      return { stageId: s, label: STAGE_LABELS[s], notes: n[s] ? String(n[s]) : '', rows: list };
    });
    return { stages, counts };
  }

  // ---- version choice (pure) ----

  function lockedVersions(rows) {
    return (Array.isArray(rows) ? rows : [])
      .filter((v) => v && v.id && v.status === 'locked')
      .map((v) => ({
        id: String(v.id),
        versionNumber: _num(v.version_number),
        status: 'locked',
        source: v.source ? String(v.source) : 'brief',
        lockedAt: v.locked_at || null,
      }))
      .sort((a, b) => (b.versionNumber || 0) - (a.versionNumber || 0));
  }

  function chooseTargetVersion(locked, experience, preferredId) {
    const ids = (locked || []).map((v) => v.id);
    if (preferredId && ids.includes(String(preferredId))) return { id: String(preferredId), reason: 'selected' };
    const src = experience && experience.sourceVersionId ? String(experience.sourceVersionId) : '';
    if (src && ids.includes(src)) return { id: src, reason: 'source_version' };
    return ids.length ? { id: ids[0], reason: 'latest_locked' } : { id: null, reason: 'none' };
  }

  function chooseResultsVersion(locked, resultsById, preferredId) {
    const byId = resultsById || {};
    const ids = (locked || []).map((v) => v.id);
    if (preferredId === '') return { id: null, reason: 'selected_none' };
    if (preferredId && ids.includes(String(preferredId))) return { id: String(preferredId), reason: 'selected' };
    const withResponses = ids.find((id) => byId[id] && (_num(byId[id].n_sessions) || 0) > 0);
    if (withResponses) return { id: withResponses, reason: 'latest_with_responses' };
    const withStudy = ids.find((id) => byId[id] && Array.isArray(byId[id].studies) && byId[id].studies.length > 0);
    if (withStudy) return { id: withStudy, reason: 'latest_with_study' };
    return { id: null, reason: 'none' };
  }

  // ---- loading ----

  function _messageOf(err) {
    if (!err) return '';
    if (typeof err === 'string') return err;
    return String(err.message || err.details || err.hint || '');
  }

  const LOAD_ERROR_MAP = [
    [/demo mode/i, DEMO_MODE_MESSAGE],
    [/not signed in|no clerk session|not authenticated/i, 'Sign in to your QEP account to compare targets with results.'],
    [/version not found or not in your organisation/i, 'Version not found or not in your organisation.'],
    [/could not find the function|PGRST202/i, 'Consumer results are not available on this QEP database yet. Contact QEP support.'],
    [/permission denied/i, 'The QEP database refused this request (permission denied). Try signing in again.'],
    [/supabase-js not loaded|qep-capture-config\.js not loaded|getQepCaptureClient is not available/i,
      'The connection to QEP is not configured on this page. Reload and try again.'],
    [/failed to fetch|networkerror|network request failed|load failed/i, 'Could not reach QEP. Check your connection and try again.'],
  ];

  function mapLoadError(err) {
    if (err && typeof err === 'object' && err.code === 'QEP_DEMO_MODE') return DEMO_MODE_MESSAGE;
    const msg = _messageOf(err);
    for (const [re, friendly] of LOAD_ERROR_MAP) if (re.test(msg)) return friendly;
    return msg ? `Could not load targets and results: ${msg}` : 'Could not load targets and results. Please try again.';
  }

  function _defaultIsDemo() {
    if (typeof window === 'undefined') return false;
    if (typeof window.isQepDemoModeActive === 'function') return window.isQepDemoModeActive() === true;
    return !!(window.demoMode && typeof window.demoMode.isDemoActive === 'function' && window.demoMode.isDemoActive());
  }

  function _defaultGetClient() {
    if (typeof window !== 'undefined' && typeof window.getQepCaptureClient === 'function') return window.getQepCaptureClient();
    throw new Error('target-vs-measured: getQepCaptureClient is not available.');
  }

  function _defaultFetchCrosswalk() {
    if (typeof window !== 'undefined' && typeof window.fetchSignatureAttributeCrosswalk === 'function') {
      return window.fetchSignatureAttributeCrosswalk();
    }
    return Promise.resolve({ error: 'fetchSignatureAttributeCrosswalk is not available.' });
  }

  function _loadError(message) {
    const e = new Error(message);
    e.userMessage = message;
    return e;
  }

  /** Targets + stage notes of one version and labels for its codes and `extraCodes`. Throws a userMessage error. */
  async function loadVersionTargets(client, versionId, extraCodes) {
    let targetsRes;
    let notesRes;
    try {
      [targetsRes, notesRes] = await Promise.all([
        client.schema('tss_shared').from('targets')
          .select('variable_key, role, intensity, range_min, range_max').eq('version_id', versionId),
        client.schema('tss_shared').from('version_stage_notes').select('stage_key, notes').eq('version_id', versionId),
      ]);
    } catch (err) {
      throw _loadError(mapLoadError(err));
    }
    if (targetsRes && targetsRes.error) throw _loadError(mapLoadError(targetsRes.error));
    if (notesRes && notesRes.error) throw _loadError(mapLoadError(notesRes.error));
    const rows = (targetsRes && targetsRes.data) || [];
    const codes = [...new Set(rows.map((r) => r && r.variable_key).filter(Boolean).concat(extraCodes || []))];
    const attrsById = {};
    if (codes.length) {
      let attrRes;
      try {
        attrRes = await client.from('qep_attribute').select('id, label, stage_key, kind').in('id', codes);
      } catch (err) {
        throw _loadError(mapLoadError(err));
      }
      if (attrRes && attrRes.error) throw _loadError(mapLoadError(attrRes.error));
      for (const a of (attrRes && attrRes.data) || []) if (a && a.id) attrsById[a.id] = a;
    }
    const notes = {};
    for (const n of (notesRes && notesRes.data) || []) {
      const s = n && CR.normalizeStageId(n.stage_key);
      if (s && n.notes) notes[s] = String(n.notes);
    }
    const labels = {};
    for (const id of Object.keys(attrsById)) labels[id] = String(attrsById[id].label || id);
    return { targets: shapeTargetRows(rows, attrsById), notes, labels };
  }

  /**
   * The read sequence. Resolves (never rejects) to
   *   { state: 'ok', projectId, versions, targetVersionId, targetChoice,
   *     resultsVersionId, resultsChoice, results, resultsById, targets, notes,
   *     labels, indexes, amendAvailable, warning? }
   *   | { state: 'disabled' | 'not_linked' | 'no_locked_versions' } | { state: 'error', message }.
   */
  async function loadTargetVsMeasured(experience, deps = {}, opts = {}) {
    const config = _config(deps.config);
    if (!isTargetVsMeasuredEnabled(config)) return { state: 'disabled' };
    if (!hasCaptureLink(experience)) return { state: 'not_linked' };
    const isDemo = deps.isDemo || _defaultIsDemo;
    if (isDemo()) return { state: 'error', message: DEMO_MODE_MESSAGE };
    const getClient = deps.getClient || _defaultGetClient;
    const fetchCrosswalk = deps.fetchCrosswalk || _defaultFetchCrosswalk;
    const concurrency = deps.concurrency || DEFAULT_CONCURRENCY;

    let client;
    try {
      client = getClient();
    } catch (err) {
      return { state: 'error', message: mapLoadError(err) };
    }

    const projectId = String(experience.tssProjectId);
    let versionRows;
    try {
      const res = await client.schema('tss_shared').from('project_versions')
        .select('id, version_number, status, source, locked_at').eq('project_id', projectId);
      if (res && res.error) return { state: 'error', message: mapLoadError(res.error) };
      versionRows = (res && res.data) || [];
    } catch (err) {
      return { state: 'error', message: mapLoadError(err) };
    }
    // RLS hides another org's project entirely: no rows == not visible.
    if (!versionRows.length) return { state: 'error', message: PROJECT_NOT_IN_ORG_MESSAGE };
    const locked = lockedVersions(versionRows);
    if (!locked.length) return { state: 'no_locked_versions' };

    let indexes = null;
    let warning = '';
    try {
      const cw = await fetchCrosswalk();
      if (cw && Array.isArray(cw.rows)) indexes = buildIndexes(cw.rows);
    } catch (_) {
      indexes = null;
    }
    if (!indexes) {
      warning = 'Signature values could not be matched (attribute crosswalk unavailable), so Signature scores are not shown and Amend is off.';
    }

    const resultsById = {};
    const resultErrors = {};
    await CR.mapWithConcurrency(locked, concurrency, async (v) => {
      try {
        const res = await client.rpc('get_version_results', { p_version_id: v.id });
        if (res && res.error) resultErrors[v.id] = mapLoadError(res.error);
        else if (res && res.data) resultsById[v.id] = res.data;
      } catch (err) {
        resultErrors[v.id] = mapLoadError(err);
      }
    });

    const versions = locked.map((v) => {
      const r = resultsById[v.id];
      return {
        ...v,
        nSessions: r ? (_num(r.n_sessions) || 0) : null,
        studyCount: r && Array.isArray(r.studies) ? r.studies.length : 0,
        resultsError: resultErrors[v.id] || null,
      };
    });

    const tChoice = chooseTargetVersion(locked, experience, opts.targetVersionId);
    const rChoice = chooseResultsVersion(locked, resultsById, opts.resultsVersionId);
    let loaded;
    try {
      loaded = await loadVersionTargets(client, tChoice.id, signatureCodes(experience, indexes));
    } catch (err) {
      return { state: 'error', message: (err && err.userMessage) || mapLoadError(err) };
    }

    const model = {
      state: 'ok',
      projectId,
      versions,
      targetVersionId: tChoice.id,
      targetChoice: tChoice.reason,
      resultsVersionId: rChoice.id,
      resultsChoice: rChoice.reason,
      results: rChoice.id ? (resultsById[rChoice.id] || null) : null,
      resultsById,
      targets: loaded.targets,
      notes: loaded.notes,
      labels: loaded.labels,
      indexes,
      amendAvailable: !!indexes,
    };
    if (warning) model.warning = warning;
    return model;
  }

  /** Reload only the targets of another version (no RPC). */
  async function switchTargetVersion(model, versionId, deps = {}, experience) {
    if (!model || model.state !== 'ok') return model;
    const id = String(versionId);
    if (!model.versions.some((v) => v.id === id)) return model;
    const getClient = deps.getClient || _defaultGetClient;
    let loaded;
    try {
      loaded = await loadVersionTargets(getClient(), id, experience ? signatureCodes(experience, model.indexes) : Object.keys(model.labels || {}));
    } catch (err) {
      return { ...model, loadError: (err && err.userMessage) || mapLoadError(err) };
    }
    return { ...model, targetVersionId: id, targetChoice: 'selected', targets: loaded.targets, notes: loaded.notes, labels: { ...model.labels, ...loaded.labels }, loadError: null };
  }

  function switchResultsVersion(model, versionId) {
    if (!model || model.state !== 'ok') return model;
    const choice = chooseResultsVersion(model.versions, model.resultsById, versionId === null || versionId === undefined ? '' : String(versionId));
    return { ...model, resultsVersionId: choice.id, resultsChoice: choice.reason, results: choice.id ? (model.resultsById[choice.id] || null) : null };
  }

  // ---- Amend: draft (pure) ----

  function _draftValueFor(t) {
    const spec = t.spec || targetSpec(t);
    if (spec.type === 'numeric') {
      if (spec.min === spec.max) return { value: spec.min, origin: 'carried' };
      return { value: _round((spec.min + spec.max) / 2, 1), origin: 'range' };
    }
    if (spec.type === 'legacy') {
      const scale = (targetPrefill && targetPrefill.TARGET_INTENSITY_SCALE) || { low: 2, medium: 5, high: 8 };
      const v = Object.prototype.hasOwnProperty.call(scale, spec.intensity) ? scale[spec.intensity] : null;
      return { value: v, origin: 'legacy' };
    }
    return { value: null, origin: 'no_value' };
  }

  /** Editable copy of a version's targets. `base` is kept for change detection. */
  function createDraft(targets) {
    const entries = {};
    const base = {};
    for (const t of Array.isArray(targets) ? targets : []) {
      if (!t || !t.code || entries[t.code]) continue;
      const { value, origin } = _draftValueFor(t);
      const meta = { code: t.code, kind: t.kind, stageId: t.stageId, label: t.label, role: t.role || 'primary', spec: t.spec || targetSpec(t) };
      base[t.code] = { ...meta, value, origin };
      entries[t.code] = { ...meta, value, origin, removed: false, added: false };
    }
    return { entries, base };
  }

  function setDraftValue(draft, code, value) {
    const e = draft && draft.entries[code];
    if (!e) return false;
    e.value = value;
    return true;
  }

  function removeDraftTarget(draft, code) {
    const e = draft && draft.entries[code];
    if (!e) return false;
    if (e.added && !draft.base[code]) {
      delete draft.entries[code];
      return true;
    }
    e.removed = true;
    return true;
  }

  function addDraftTarget(draft, meta, value) {
    if (!draft || !meta || !meta.code) return false;
    const code = String(meta.code);
    const existing = draft.entries[code];
    if (existing) {
      existing.removed = false;
      if (value !== undefined) existing.value = value;
      return true;
    }
    const kind = meta.kind || _inferKind(code);
    draft.entries[code] = {
      code, kind, stageId: meta.stageId || (kind === 'trigger' ? 'overall' : 'unknown'), label: meta.label || code,
      role: 'primary', spec: null, value: value === undefined ? null : value, origin: 'added', removed: false, added: true,
    };
    return true;
  }

  function _parseValue(v) {
    if (v === null || v === undefined || v === '') return { ok: false, empty: true };
    const n = typeof v === 'number' ? v : Number(String(v).trim());
    if (!Number.isFinite(n) || n < 0 || n > 10) return { ok: false };
    return { ok: true, value: _round(n, 1) };
  }

  function _specText(spec) {
    if (!spec) return '';
    if (spec.type === 'numeric') return spec.min === spec.max ? String(spec.min) : `${spec.min}-${spec.max}`;
    if (spec.type === 'legacy') return spec.intensity;
    return '';
  }

  /**
   * Pure: the create_version_from_signature payload for the amended set,
   * plus what is carried, what cannot be, warnings and blocking problems.
   * Never reads the experience's slider values; never mutates anything.
   */
  function buildAmendPlan({ draft, experience, projectId, baseVersion, notes, indexes } = {}) {
    const carried = [];
    const dropped = [];
    const invalid = [];
    const warnings = [];
    const changes = { edited: 0, added: 0, removed: 0 };
    const stages = {};
    const triggers = {};
    const slots = new Set();
    const legacyConverted = [];
    const rangeCollapsed = [];
    let secondary = 0;

    const entries = draft && draft.entries ? Object.values(draft.entries) : [];
    for (const e of entries) {
      const b = draft.base[e.code];
      if (e.removed) {
        if (b) changes.removed++;
        continue;
      }
      const parsed = _parseValue(e.value);
      if (!b) changes.added++;
      else {
        const bv = _parseValue(b.value);
        if (parsed.ok !== bv.ok || (parsed.ok && parsed.value !== bv.value)) changes.edited++;
      }
      if (!parsed.ok) {
        if (parsed.empty) dropped.push({ code: e.code, label: e.label, reason: 'No numeric value - enter a number from 0 to 10, or remove it.' });
        else invalid.push({ code: e.code, label: e.label });
        continue;
      }
      const value = parsed.value;
      const match = _reverseMatch(indexes, e.kind, e.code);
      if (!match) {
        dropped.push({ code: e.code, label: e.label, reason: 'No Signature slider for this code, so create_version_from_signature cannot store it.' });
        continue;
      }
      if (e.kind !== 'trigger' && match.stage !== e.stageId) {
        dropped.push({ code: e.code, label: e.label, reason: `The crosswalk maps this code to another stage (${match.stage}); values are never moved across stages.` });
        continue;
      }
      if (e.kind === 'emotion' && value === 0) {
        dropped.push({ code: e.code, label: e.label, reason: 'An emotion target of 0 is not stored (0 means "not felt").' });
        continue;
      }
      const key = e.kind === 'sensory' ? _camel(match.key) : String(match.key);
      if (e.kind === 'sensory' && _kebabLike0038(key) !== match.key) {
        dropped.push({ code: e.code, label: e.label, reason: 'This slider key does not survive the camelCase round trip, so the RPC would not recognise it.' });
        continue;
      }
      const slot = `${e.kind === 'trigger' ? 'trigger' : e.kind === 'emotion' ? 'emotion' : 'sensory'}|${e.kind === 'trigger' ? 'overall' : match.stage}|${key}`;
      if (slots.has(slot)) {
        dropped.push({ code: e.code, label: e.label, reason: 'Another target already uses the same Signature slider.' });
        continue;
      }
      slots.add(slot);
      if (e.kind === 'trigger') {
        triggers[key] = value;
      } else {
        const st = stages[match.stage] || (stages[match.stage] = {});
        if (e.kind === 'emotion') (st.emotions || (st.emotions = {}))[key] = value;
        else st[key] = value;
      }
      carried.push({ code: e.code, label: e.label, kind: e.kind, stageId: e.stageId, value });
      if (b && b.role === 'secondary') secondary++;
      // Conversions are only reported while the value is still the converted one (an edit replaces it).
      const unedited = b && parsed.value === _parseValue(b.value).value;
      if (unedited && b.origin === 'legacy' && b.spec && b.spec.type === 'legacy') legacyConverted.push(`${e.label} (${b.spec.intensity} -> ${value})`);
      if (unedited && b.origin === 'range' && b.spec && b.spec.type === 'numeric') {
        rangeCollapsed.push(`${e.label}: range ${_specText(b.spec)} -> ${value}`);
      }
    }

    const noteStages = Object.keys(notes || {}).filter((s) => notes[s] && String(notes[s]).trim());
    if (noteStages.length) {
      warnings.push(`Stage notes ("Brief says" text) for ${noteStages.map((s) => STAGE_LABELS[s] || s).join(', ')} are not copied: the new version stores targets only.`);
    }
    if (secondary) warnings.push(`${secondary} secondary target(s) become primary (every target in the new version is stored as primary).`);
    if (legacyConverted.length) {
      warnings.push(`${legacyConverted.length} word-only target(s) will be stored as numbers (high = 8, low = 2, as the markers show them): ${legacyConverted.join(', ')}.`);
    }
    if (rangeCollapsed.length) warnings.push(`Ranges are stored as one value: ${rangeCollapsed.join('; ')}.`);

    let blocking = null;
    if (invalid.length) blocking = `Every target must be a number 0-10 (check: ${invalid.map((x) => x.label).join(', ')}).`;
    else if (!carried.length) blocking = 'Keep or add at least one target that Signature can store before creating a version.';
    else if (!projectId) blocking = 'This experience is not linked to a project.';
    else if (!experience || experience.id === undefined || experience.id === null || experience.id === '') blocking = 'This experience has no id.';

    let payload = null;
    if (!blocking) {
      const info = (experience && experience.productInfo) || {};
      const productInfo = {};
      for (const k of ['name', 'brand', 'type', 'productType', 'category']) {
        if (info[k] !== undefined && info[k] !== null && info[k] !== '') productInfo[k] = info[k];
      }
      payload = {
        id: experience.id,
        productInfo,
        tssProjectId: String(projectId),
        sourceVersionId: baseVersion && baseVersion.id ? String(baseVersion.id) : null,
        stages,
        emotionalTriggers: triggers,
      };
      if (!payload.sourceVersionId) delete payload.sourceVersionId;
    }

    return {
      payload,
      carried,
      dropped,
      warnings,
      changes,
      blocking,
      needsConfirm: dropped.length > 0 || warnings.length > 0,
      changeCount: changes.edited + changes.added + changes.removed,
    };
  }

  // ---- Amend: RPC ----

  const AMEND_DEMO_MESSAGE = 'Amend is not available in demo mode. Sign in to your QEP account to create a new version.';

  const AMEND_ERROR_MAP = [
    [/demo mode/i, AMEND_DEMO_MESSAGE],
    [/not signed in|no clerk session|not authenticated/i, 'Sign in to your QEP account to create a new version.'],
    [/is not a project in your organisation/i,
      'This experience\'s project is not in your organisation (or no longer exists), so no version was created.'],
    [/profile was deleted/i,
      'This experience was deleted from the shared QEP database, so no version can be created from it.'],
    [/is not a version of project|requires experience\.tssProjectId|must be a UUID string|is not a valid UUID/i,
      'The version this amend is based on does not belong to the linked project. Reload and try again.'],
    [/out of range 0-10/i, 'Every target must be a number from 0 to 10.'],
    [/no measured values|nothing measured/i, 'The new version needs at least one target that Signature can store.'],
    [/unknown signature stage/i, 'Capture did not recognise a stage in the amended targets. Please contact QEP support.'],
    [/could not find the function|PGRST202/i, 'Amend is not available on this QEP database yet. Contact QEP support.'],
    [/permission denied/i, 'The QEP database refused this request (permission denied). Try signing in again.'],
    [/supabase-js not loaded|qep-capture-config\.js not loaded|getQepCaptureClient is not available/i,
      'The connection to QEP is not configured on this page. Reload and try again.'],
    [/failed to fetch|networkerror|network request failed|load failed/i, 'Could not reach QEP. Check your connection and try again.'],
  ];

  function mapAmendError(err) {
    if (err && typeof err === 'object' && err.code === 'QEP_DEMO_MODE') return AMEND_DEMO_MESSAGE;
    const msg = _messageOf(err);
    for (const [re, friendly] of AMEND_ERROR_MAP) if (re.test(msg)) return friendly;
    return msg ? `Could not create the next version: ${msg}` : 'Could not create the next version. Please try again.';
  }

  function _defaultSave() {
    if (typeof window === 'undefined' || typeof window.saveData !== 'function') return undefined;
    if (_defaultIsDemo()) return undefined;
    return window.saveData();
  }

  function _firstRow(data) {
    if (Array.isArray(data)) return data.length ? data[0] : null;
    return data || null;
  }

  /**
   * One create_version_from_signature call for an amend plan. Resolves to
   * { status: 'ok', version, reused, linkChanged, warnings } or
   * { status: 'error' | 'disabled', message }. Never creates a study and never
   * creates or copies an experience; link fields change only via
   * SendToCapture.applyCaptureLink (then one save).
   */
  async function runAmend(experience, plan, deps = {}) {
    const config = _config(deps.config);
    if (!isTargetVsMeasuredEnabled(config)) return { status: 'disabled', message: '' };
    const isDemo = deps.isDemo || _defaultIsDemo;
    if (isDemo()) return { status: 'error', message: AMEND_DEMO_MESSAGE };
    if (!experience || !hasCaptureLink(experience)) return { status: 'error', message: 'This experience is not linked to a project.' };
    if (!plan || plan.blocking || !plan.payload) {
      return { status: 'error', message: (plan && plan.blocking) || 'Nothing to create.' };
    }
    const projectId = String(experience.tssProjectId);
    if (plan.payload.tssProjectId !== projectId || plan.payload.id !== experience.id) {
      return { status: 'error', message: 'This amend was prepared for a different experience or project. Reload the view and try again.' };
    }
    const getClient = deps.getClient || _defaultGetClient;
    const save = deps.save || _defaultSave;

    let client;
    try {
      client = getClient();
    } catch (err) {
      return { status: 'error', message: mapAmendError(err) };
    }
    let res;
    try {
      res = await client.schema('tss_shared').rpc('create_version_from_signature', { payload: plan.payload });
    } catch (err) {
      return { status: 'error', message: mapAmendError(err) };
    }
    if (res && res.error) return { status: 'error', message: mapAmendError(res.error) };
    const version = _firstRow(res && res.data);
    if (!version || !version.version_id) return { status: 'error', message: 'Capture did not return a version. Please try again.' };
    if (String(version.project_id) !== projectId) {
      return { status: 'error', message: 'Capture reported the version on a different project than the linked one. Nothing was changed here; contact QEP support.' };
    }

    const warnings = [];
    if (Array.isArray(version.unmapped_keys) && version.unmapped_keys.length) {
      warnings.push(`Capture could not store: ${version.unmapped_keys.join(', ')}.`);
    }
    const tc = _num(version.targets_count);
    if (tc !== null && tc !== plan.carried.length && version.reused_existing_version !== true) {
      warnings.push(`Capture stored ${tc} target(s); ${plan.carried.length} were sent.`);
    }

    let linkChanged = false;
    if (sendToCapture && typeof sendToCapture.applyCaptureLink === 'function') {
      linkChanged = sendToCapture.applyCaptureLink(experience, version) === true;
    }
    if (linkChanged) {
      try {
        const p = save(experience);
        if (p && typeof p.catch === 'function') p.catch((err) => console.error('Target vs measured: saving the Capture link failed:', err));
      } catch (err) {
        console.error('Target vs measured: saving the Capture link failed:', err);
      }
    }
    return { status: 'ok', version, reused: version.reused_existing_version === true, linkChanged, warnings };
  }

  function amendSuccessMessage(result) {
    const v = (result && result.version) || {};
    const n = v.version_number === undefined || v.version_number === null ? '?' : v.version_number;
    let s = result && result.reused
      ? `No change: version ${n} already has exactly these targets, so it was reused (no duplicate created).`
      : `Created version ${n}${_num(v.targets_count) !== null ? ` with ${v.targets_count} target(s)` : ''}. The view now shows it.`;
    if (result && Array.isArray(result.warnings) && result.warnings.length) s += ` ${result.warnings.join(' ')}`;
    return s;
  }

  /** Per-experience in-flight guard: a double click creates one call. */
  function createAmendController(deps = {}) {
    const inFlight = new Set();
    async function submit(experience, plan) {
      const key = experience ? String(experience.id) : '';
      if (inFlight.has(key)) return { status: 'busy' };
      inFlight.add(key);
      try {
        return await runAmend(experience, plan, deps);
      } finally {
        inFlight.delete(key);
      }
    }
    return { submit, isBusy: (experience) => inFlight.has(experience ? String(experience.id) : '') };
  }

  // ---- HTML (pure string builders; every value escaped) ----

  const STATUS_STYLE = {
    on_target: 'color: var(--success-color, #15803d); font-weight: 600;',
    under: 'color: var(--danger-color, #b91c1c); font-weight: 600;',
    over: 'color: var(--warning-color, #b45309); font-weight: 600;',
  };

  function _gapHtml(gap) {
    const g = gap || { status: 'no_data' };
    const label = STATUS_LABELS[g.status] || g.status;
    const style = STATUS_STYLE[g.status] || 'color: var(--text-muted, #6b7280);';
    let detail = '';
    if (g.delta !== undefined && g.delta !== 0 && (g.status === 'under' || g.status === 'over')) {
      detail = `${g.delta > 0 ? '+' : ''}${g.delta}`;
    } else if (g.detail && g.status !== 'on_target') {
      detail = g.detail;
    }
    const title = g.detail || (g.delta !== undefined ? `gap ${g.delta}` : label);
    return `<span class="tvm-status tvm-${esc(g.status)}" style="${style}" title="${esc(title)}">${esc(label)}</span>${detail ? ` <span class="tvm-detail" style="font-size:0.75rem;">${esc(detail)}</span>` : ''}`;
  }

  function _targetText(spec) {
    if (!spec) return 'No target';
    if (spec.type === 'numeric') return _specText(spec);
    if (spec.type === 'legacy') return `${spec.intensity} (no number)`;
    return 'No numeric target';
  }

  function _signatureText(sig) {
    switch (sig && sig.status) {
      case 'value': return `${sig.value}/10`;
      case 'not_rated': return 'Not rated';
      case 'no_slider': return 'No slider';
      default: return 'Unavailable';
    }
  }

  function _consumerText(row, hasResults) {
    if (!row.consumer) return hasResults ? 'Not asked' : 'No consumer data';
    return CR.formatConsumer({ ...row.consumer });
  }

  function _versionLabel(v) {
    const src = v.source === 'signature' ? 'Signature' : 'Brief';
    let s = `v${v.versionNumber === null ? '?' : v.versionNumber} (${src})`;
    if (v.resultsError) s += ' - results unavailable';
    else if (v.nSessions) s += ` - ${v.nSessions} consumer${v.nSessions === 1 ? '' : 's'}`;
    else if (v.studyCount) s += ' - study, no responses yet';
    return s;
  }

  function _amendCell(row, view) {
    const draft = view.draft;
    if (!row.code) return '<td></td>';
    const e = draft.entries[row.code];
    const code = esc(row.code);
    if (e && !e.removed) {
      const val = e.value === null || e.value === undefined ? '' : esc(e.value);
      return `<td><input type="number" min="0" max="10" step="0.5" value="${val}" data-tvm-action="set-value" data-code="${code}" aria-label="${esc(`New target for ${row.label}`)}" style="width:4.5em;"> <button type="button" class="btn btn-secondary" data-tvm-action="remove" data-code="${code}" style="padding:2px 8px;font-size:0.75rem;">Remove</button>${e.added ? ' <span style="font-size:0.75rem;">(new)</span>' : ''}</td>`;
    }
    if (e && e.removed) {
      return `<td><span style="font-size:0.8rem;">Removed</span> <button type="button" class="btn btn-secondary" data-tvm-action="add" data-code="${code}" style="padding:2px 8px;font-size:0.75rem;">Undo</button></td>`;
    }
    return `<td><button type="button" class="btn btn-secondary" data-tvm-action="add" data-code="${code}" style="padding:2px 8px;font-size:0.75rem;">Add target</button></td>`;
  }

  function _stageTable(stage, view, hasResults) {
    const editing = !!(view.editing && view.draft);
    const head = `<tr><th style="text-align:left;width:22%;">Attribute</th><th style="text-align:left;">Target</th><th style="text-align:left;">Signature</th><th style="text-align:left;">Consumers</th><th style="text-align:left;">Signature vs target</th><th style="text-align:left;">Consumers vs target</th>${editing ? '<th style="text-align:left;width:18%;">Amend</th>' : ''}</tr>`;
    const body = stage.rows.map((row) => {
      const kindNote = row.kind === 'trigger' ? ' (trigger)' : row.kind === 'emotion' ? ' (emotion)' : '';
      const title = row.code ? row.code : 'No master code';
      return `<tr>
          <td title="${esc(title)}">${esc(row.label)}<span style="font-size:0.75rem;">${esc(kindNote)}</span>${row.role === 'secondary' ? ' <span style="font-size:0.75rem;">(secondary)</span>' : ''}</td>
          <td>${esc(_targetText(row.target))}</td>
          <td>${esc(_signatureText(row.signature))}</td>
          <td>${esc(_consumerText(row, hasResults))}</td>
          <td>${_gapHtml(row.sigGap)}</td>
          <td>${_gapHtml(row.conGap)}</td>${editing ? _amendCell(row, view) : ''}
        </tr>`;
    }).join('');
    return `<table class="tvm-table" style="width:100%;border-collapse:collapse;font-size:0.85rem;margin:4px 0 12px;">
        <thead>${head}</thead><tbody>${body}</tbody></table>`;
  }

  function _controlsHtml(model, rules) {
    const tOpts = model.versions.map((v) => `<option value="${esc(v.id)}"${v.id === model.targetVersionId ? ' selected' : ''}>${esc(_versionLabel(v))}</option>`).join('');
    const rOpts = ['<option value="">None</option>'].concat(model.versions.map((v) => `<option value="${esc(v.id)}"${v.id === model.resultsVersionId ? ' selected' : ''}>${esc(_versionLabel(v))}</option>`)).join('');
    const pct = Math.round(rules.emotionHighMinSelected * 100);
    return `<div class="tvm-controls" style="display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;font-size:0.85rem;margin:0 0 8px;">
        <label>Targets from <select data-tvm-action="target-version">${tOpts}</select></label>
        <label>Consumers from <select data-tvm-action="results-version">${rOpts}</select></label>
        <label>Tolerance +/- <input type="number" min="0" max="${MAX_TOLERANCE}" step="0.5" value="${esc(rules.tolerance)}" data-tvm-action="tolerance" style="width:4.5em;"> (0-10 scale)</label>
        <label>Emotion target 7+ expects at least <input type="number" min="0" max="100" step="5" value="${esc(pct)}" data-tvm-action="emotion-pct" style="width:4.5em;">% selected</label>
      </div>`;
  }

  function _rulesHtml(rules) {
    const pct = Math.round(rules.emotionHighMinSelected * 100);
    const low = Math.round(rules.emotionLowMaxSelected * 100);
    return `<p class="tvm-rules" style="font-size:0.78rem;margin:0 0 10px;">On target = within +/- ${esc(rules.tolerance)} of the target (or its range). Word-only targets: "high" = ${esc(rules.legacyHighMin)} or more, "low" = ${esc(rules.legacyLowMax)} or less. Consumer emotions are tick-box shares, never 0-10: a target of ${esc(rules.emotionHighTarget)}+ expects at least ${esc(pct)}% selected, ${esc(rules.emotionLowTarget)} or less expects at most ${esc(low)}%, 4-6 is not compared.</p>`;
  }

  function _choiceNote(model) {
    const tv = model.versions.find((v) => v.id === model.targetVersionId);
    const rv = model.versions.find((v) => v.id === model.resultsVersionId);
    const why = {
      source_version: 'the Brief version this experience was measured against',
      latest_locked: 'the latest locked version',
      selected: 'your choice',
    }[model.targetChoice] || '';
    let s = tv ? `Targets: v${tv.versionNumber}${why ? ` (${why})` : ''}.` : '';
    if (rv) s += ` Consumers: v${rv.versionNumber}'s study.`;
    else s += ' No consumer results selected.';
    return `<p class="tvm-choice" style="font-size:0.8rem;margin:0 0 8px;">${esc(s)}</p>`;
  }

  function _amendFooter(model, view) {
    if (!model.amendAvailable) return '';
    if (!view.editing || !view.draft) {
      return `<div class="tvm-amend" style="margin-top:8px;"><button type="button" class="btn btn-secondary" data-tvm-action="toggle-amend">Amend targets</button> <span style="font-size:0.8rem;">Creates the next version of this project; never a new experience.</span></div>`;
    }
    const plan = view.plan || {};
    const tv = model.versions.find((v) => v.id === model.targetVersionId);
    let html = '<div class="tvm-amend" style="margin-top:8px;border-top:1px solid #e5e7eb;padding-top:8px;">';
    const c = plan.changes || { edited: 0, added: 0, removed: 0 };
    html += `<p style="margin:0 0 6px;font-size:0.85rem;">Based on v${esc(tv ? tv.versionNumber : '?')}: ${esc(c.edited)} edited, ${esc(c.added)} added, ${esc(c.removed)} removed. The new version will hold ${esc((plan.carried || []).length)} target(s).</p>`;
    if ((plan.dropped || []).length) {
      html += `<div class="tvm-dropped" role="alert" style="color:#92400e;font-size:0.82rem;"><strong>These ${esc(plan.dropped.length)} target(s) will not be in the new version:</strong><ul style="margin:2px 0 6px 18px;padding:0;">${plan.dropped.map((d) => `<li>${esc(d.label)} - ${esc(d.reason)}</li>`).join('')}</ul></div>`;
    }
    if ((plan.warnings || []).length) {
      html += `<ul class="tvm-warnings" style="color:#92400e;font-size:0.82rem;margin:2px 0 6px 18px;padding:0;">${plan.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>`;
    }
    if (plan.blocking) html += `<p class="tvm-blocking" role="alert" style="color:#b91c1c;font-size:0.85rem;">${esc(plan.blocking)}</p>`;
    if (plan.needsConfirm) {
      html += `<label style="font-size:0.82rem;display:block;margin:4px 0;"><input type="checkbox" data-tvm-action="confirm-drops"${view.confirmed ? ' checked' : ''}> I understand the points above.</label>`;
    }
    const noChange = !plan.changeCount;
    const disabled = !!(plan.blocking || noChange || (plan.needsConfirm && !view.confirmed) || view.busy);
    html += `<button type="button" class="btn btn-primary" data-tvm-action="create-version"${disabled ? ' disabled' : ''}>${view.busy ? 'Creating version...' : 'Create next version'}</button> <button type="button" class="btn btn-secondary" data-tvm-action="toggle-amend">Cancel</button>`;
    if (noChange && !plan.blocking) html += ' <span style="font-size:0.8rem;">Change, add or remove a target first.</span>';
    return html + '</div>';
  }

  function buildTargetVsMeasuredHtml(model, view = {}) {
    const m = model || {};
    switch (m.state) {
      case 'loading': return '<p class="tvm-loading" role="status">Loading targets and results...</p>';
      case 'disabled': return '<p>Target vs measured is turned off.</p>';
      case 'not_linked': return '<p>This experience is not linked to a Capture project.</p>';
      case 'no_locked_versions': return '<p>The linked project has no locked versions yet, so there are no targets to compare.</p>';
      case 'error': return `<p class="tvm-error" role="alert" style="color:#b91c1c;">${esc(m.message || 'Could not load targets and results.')}</p>`;
      default: break;
    }
    const rules = view.rules || DEFAULT_RULES;
    const cmp = buildComparison({ ...m, experience: view.experience, rules });
    let html = '<p class="tvm-intro" style="font-size:0.85rem;margin:0 0 8px;">Brief target, this experience\'s own score and what Capture consumers said. Read-only except Amend.</p>';
    if (view.message && view.message.text) {
      const color = view.message.type === 'error' ? '#b91c1c' : 'var(--success-color, #15803d)';
      html += `<p class="tvm-message" role="${view.message.type === 'error' ? 'alert' : 'status'}" style="color:${color};font-weight:600;">${esc(view.message.text)}</p>`;
    }
    if (m.warning) html += `<p class="tvm-warning" style="color:#92400e;">${esc(m.warning)}</p>`;
    if (m.loadError) html += `<p class="tvm-error" role="alert" style="color:#b91c1c;">${esc(m.loadError)}</p>`;
    html += _controlsHtml(m, rules);
    html += _rulesHtml(rules);
    html += _choiceNote(m);
    const hasResults = !!m.results;
    if (!cmp.stages.length) html += '<p>No targets, Signature scores or consumer results to compare yet.</p>';
    for (const s of cmp.stages) {
      html += `<h4 style="margin:12px 0 2px;">${esc(s.label)}</h4>`;
      if (s.notes) html += `<p class="tvm-brief-says" style="font-size:0.8rem;margin:0 0 4px;"><strong>Brief says:</strong> ${esc(s.notes)}</p>`;
      if (s.rows.length) html += _stageTable(s, view, hasResults);
    }
    html += _amendFooter(m, view);
    return html;
  }

  // ---- DOM glue (browser only) ----

  function _panelTitle(experience) {
    const info = (experience && experience.productInfo) || {};
    return info.name ? `Target vs measured - ${info.name}` : 'Target vs measured';
  }

  function _choiceKey(experience) {
    return `${experience.tssProjectId}|${experience.id}`;
  }

  /** Modal panel. Title/close via textContent, body via the escaped builder, event delegation. */
  function openTargetVsMeasuredPanel(experience, deps = {}) {
    const config = _config(deps.config);
    if (!isTargetVsMeasuredEnabled(config) || !experience) return null;
    if (typeof document === 'undefined') return null;
    const existing = document.getElementById('target-vs-measured-panel');
    if (existing) existing.remove();
    const storage = deps.storage;
    const prefs = loadPrefs(storage);
    const controller = createAmendController({ ...deps, config });

    const overlay = document.createElement('div');
    overlay.id = 'target-vs-measured-panel';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 10001; display: flex; align-items: flex-start; justify-content: center; padding: 16px; overflow-y: auto;';
    const box = document.createElement('div');
    box.style.cssText = 'background: var(--card-bg, white); color: var(--text-color, #1f2937); border-radius: 10px; padding: 20px; width: 100%; max-width: 1100px; margin: 40px 0; box-shadow: 0 10px 30px rgba(0,0,0,0.25); overflow-x: auto;';
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
    body.className = 'tvm-body';
    header.appendChild(title);
    header.appendChild(close);
    box.appendChild(header);
    box.appendChild(body);
    overlay.appendChild(box);

    const state = {
      model: { state: 'loading' },
      prefs,
      editing: false,
      draft: null,
      plan: null,
      confirmed: false,
      busy: false,
      message: null,
    };

    function rules() { return resolveRules(config, state.prefs); }
    function replan() {
      if (!state.draft || state.model.state !== 'ok') { state.plan = null; return; }
      const m = state.model;
      state.plan = buildAmendPlan({
        draft: state.draft,
        experience,
        projectId: m.projectId,
        baseVersion: { id: m.targetVersionId },
        notes: m.notes,
        indexes: m.indexes,
      });
    }
    function render() {
      if (!overlay.parentNode) return;
      body.innerHTML = buildTargetVsMeasuredHtml(state.model, {
        experience, rules: rules(), editing: state.editing, draft: state.draft, plan: state.plan,
        confirmed: state.confirmed, busy: state.busy, message: state.message,
      });
    }
    function rememberTarget(versionId) {
      const p = loadPrefs(storage);
      const map = p.targetVersionByExperience && typeof p.targetVersionByExperience === 'object' ? p.targetVersionByExperience : {};
      map[_choiceKey(experience)] = versionId;
      p.targetVersionByExperience = map;
      savePrefs(storage, p);
    }
    function stopEditing() { state.editing = false; state.draft = null; state.plan = null; state.confirmed = false; }

    async function load(opts) {
      state.model = { state: 'loading' };
      render();
      state.model = await loadTargetVsMeasured(experience, { ...deps, config }, opts);
      render();
      return state.model;
    }

    function _defaultAddValue(code) {
      const cmp = buildComparison({ ...state.model, experience, rules: rules() });
      for (const s of cmp.stages) {
        for (const r of s.rows) {
          if (r.code === code) {
            const meta = { code, kind: r.kind, stageId: r.stageId, label: r.label };
            const v = r.signature.status === 'value' ? r.signature.value : 5;
            return { meta, value: v };
          }
        }
      }
      return null;
    }

    async function onChange(e) {
      const t = e.target;
      const action = t && t.getAttribute && t.getAttribute('data-tvm-action');
      if (!action) return;
      if (action === 'tolerance' || action === 'emotion-pct') {
        const p = loadPrefs(storage);
        if (action === 'tolerance') p.tolerance = _num(t.value);
        else p.emotionHighMinSelectedPct = _num(t.value);
        state.prefs = { ...state.prefs, tolerance: p.tolerance, emotionHighMinSelectedPct: p.emotionHighMinSelectedPct };
        savePrefs(storage, p);
        render();
      } else if (action === 'target-version') {
        stopEditing();
        state.message = null;
        state.model = await switchTargetVersion(state.model, t.value, { ...deps, config }, experience);
        rememberTarget(state.model.targetVersionId);
        render();
      } else if (action === 'results-version') {
        state.model = switchResultsVersion(state.model, t.value);
        render();
      } else if (action === 'set-value') {
        setDraftValue(state.draft, t.getAttribute('data-code'), t.value);
        state.confirmed = false;
        replan();
        render();
      } else if (action === 'confirm-drops') {
        state.confirmed = !!t.checked;
        render();
      }
    }

    async function onClick(e) {
      const t = e.target && e.target.closest ? e.target.closest('button[data-tvm-action]') : null;
      if (!t || !body.contains(t)) return;
      const action = t.getAttribute('data-tvm-action');
      const code = t.getAttribute('data-code');
      if (action === 'toggle-amend') {
        if (state.editing) stopEditing();
        else { state.editing = true; state.draft = createDraft(state.model.targets); state.confirmed = false; state.message = null; replan(); }
        render();
      } else if (action === 'remove') {
        removeDraftTarget(state.draft, code);
        state.confirmed = false;
        replan();
        render();
      } else if (action === 'add') {
        if (state.draft && state.draft.entries[code]) addDraftTarget(state.draft, { code });
        else {
          const d = _defaultAddValue(code);
          if (d) addDraftTarget(state.draft, d.meta, d.value);
        }
        state.confirmed = false;
        replan();
        render();
      } else if (action === 'create-version') {
        if (state.busy || !state.plan) return;
        state.busy = true;
        render();
        const result = await controller.submit(experience, state.plan);
        state.busy = false;
        if (result.status === 'ok') {
          const newId = String(result.version.version_id);
          rememberTarget(newId);
          stopEditing();
          state.message = { type: 'success', text: amendSuccessMessage(result) };
          const keepResults = state.model.resultsVersionId === null ? '' : state.model.resultsVersionId;
          await load({ targetVersionId: newId, resultsVersionId: keepResults });
          return;
        }
        if (result.status !== 'busy') state.message = { type: 'error', text: result.message || 'Could not create the next version.' };
        render();
      }
    }

    const onKey = (ev) => { if (ev.key === 'Escape') closePanel(); };
    function closePanel() {
      document.removeEventListener('keydown', onKey);
      if (overlay.parentNode) overlay.remove();
    }
    close.addEventListener('click', closePanel);
    overlay.addEventListener('click', (ev) => { if (ev.target === overlay) closePanel(); });
    body.addEventListener('change', onChange);
    body.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    close.focus();

    const remembered = (prefs.targetVersionByExperience || {})[_choiceKey(experience)];
    const done = load({ targetVersionId: remembered });
    return { overlay, close: closePanel, done, state };
  }

  const api = {
    DEFAULT_RULES,
    STATUS_LABELS,
    PREFS_KEY,
    DEMO_MODE_MESSAGE,
    AMEND_DEMO_MESSAGE,
    STAGE_ORDER,
    isTargetVsMeasuredEnabled,
    hasCaptureLink,
    buildTargetVsMeasuredButtonHtml,
    resolveRules,
    loadPrefs,
    savePrefs,
    targetSpec,
    classifyNumeric,
    classifyValue,
    classifyCata,
    buildIndexes,
    shapeTargetRows,
    signatureEntries,
    signatureCodes,
    buildComparison,
    lockedVersions,
    chooseTargetVersion,
    chooseResultsVersion,
    mapLoadError,
    loadVersionTargets,
    loadTargetVsMeasured,
    switchTargetVersion,
    switchResultsVersion,
    createDraft,
    setDraftValue,
    removeDraftTarget,
    addDraftTarget,
    buildAmendPlan,
    mapAmendError,
    runAmend,
    amendSuccessMessage,
    createAmendController,
    buildTargetVsMeasuredHtml,
    openTargetVsMeasuredPanel,
  };

  if (isNode) module.exports = api;
  if (typeof window !== 'undefined') window.TargetVsMeasured = api;
})();
