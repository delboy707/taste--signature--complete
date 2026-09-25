// ===== SEND TO CAPTURE (Stage 2B, C5) =====
// "Send to Capture" on a logged experience: turns the experience into a new
// locked TSS project version (qep-capture migration 0038,
// tss_shared.create_version_from_signature) and then a Capture study from
// that version (migration 0032, public.create_study_from_version), and opens
// the new study at <CAPTURE_APP_URL>/studies/<id>.
//
// Gated by qep-capture-config.js's ENABLE_SEND_TO_CAPTURE (default false):
// with the flag off the button is never rendered and nothing here runs.
//
// Payload: the SAME raw experience object signature-supabase-sync.js sends
// to tss_shared.upsert_signature_profile (a JSON clone, no reshaping). The
// touched-field information is already encoded in it: an untouched slider
// saves as null (touched-fields.js), a measured one as a number (0 is a real
// rating). Only numbers become Capture targets - same skip rule as 0036.
// tssProjectId / sourceVersionId ride along unchanged, so a linked
// experience becomes a new version of its Brief project without needing a
// prior dual-write of the profile row. After a successful send an unlinked
// experience gets the returned project (and version) id written back
// (applyCaptureLink - never overwriting a link) and app.js's saveData()
// runs once, so later sends and the dual-write carry the link.
//
// Pure logic (name builder, payload prep, error mapping, URL building, the
// RPC sequence) is DOM-free and unit-tested in test/send-to-capture.test.js.
// The only DOM code is the toast and the click controller's button state,
// both built with textContent / properties (never innerHTML) so product
// names cannot inject markup. The button HTML escapes via dom-utils.js.
//
// Exposed as window.SendToCapture in the browser, module.exports in Node.

(function () {
  const dom = (typeof module !== 'undefined' && module.exports)
    ? require('./dom-utils.js')
    : window.DomUtils || { escapeHtml: window.escapeHtml, jsArgAttr: window.jsArgAttr };
  const esc = dom.escapeHtml;
  const jsArgAttr = dom.jsArgAttr;

  const DEFAULT_CAPTURE_APP_URL = 'https://capture.qeptss.com';
  const UNTITLED_PRODUCT = 'Untitled product';
  const NOTHING_MEASURED_MESSAGE = 'Rate at least one attribute before sending to Capture.';
  const DEMO_MODE_MESSAGE = 'Send to Capture is not available in demo mode. Sign in to your QEP account to send an experience to Capture.';

  // Form defaults app.js writes when a field is left empty - they mean
  // "blank" and must never end up in a study name.
  const PLACEHOLDER_VALUES = ['n/a', 'na', 'not specified', 'unknown', 'none', '-'];

  function _config(config) {
    if (config) return config;
    return (typeof window !== 'undefined' && window.QEP_CAPTURE_CONFIG) || {};
  }

  // Same env guard as signature-supabase-sync.js: a dev-pointed config on the
  // production hostname must never send real users' data into the dev project.
  const PROD_HOSTNAME = 'signature.qeptss.com';

  function _hostname() {
    return (typeof window !== 'undefined' && window.location && window.location.hostname) || '';
  }

  function isSendToCaptureEnabled(config, hostname) {
    const c = _config(config);
    if (c.ENABLE_SEND_TO_CAPTURE !== true) return false;
    const host = hostname !== undefined ? hostname : _hostname();
    if (host === PROD_HOSTNAME && c.SUPABASE_ENV === 'dev') return false;
    return true;
  }

  function _cleanPart(value) {
    if (value === undefined || value === null) return '';
    const s = String(value).replace(/\s+/g, ' ').trim();
    if (!s) return '';
    if (PLACEHOLDER_VALUES.includes(s.toLowerCase())) return '';
    return s;
  }

  /**
   * '<Product> - <Brand> - <Category>', skipping blank/placeholder parts.
   * Never blank: falls back to 'Untitled product'.
   */
  function buildCaptureStudyName({ name, brand, category } = {}) {
    const parts = [name, brand, category].map(_cleanPart).filter(Boolean);
    return parts.length ? parts.join(' - ') : UNTITLED_PRODUCT;
  }

  function studyNameForExperience(experience) {
    const info = (experience && experience.productInfo) || {};
    return buildCaptureStudyName({
      name: info.name,
      brand: info.brand,
      category: info.category !== undefined ? info.category : info.type,
    });
  }

  function _isMeasured(v) {
    return typeof v === 'number' && Number.isFinite(v);
  }

  /**
   * How many sliders were actually measured (non-null numbers) - the same
   * fields 0036's upsert reads: stage attributes, stage emotions and
   * top-level emotionalTriggers. Untouched sliders are null and not counted.
   */
  function countMeasuredValues(experience) {
    if (!experience) return 0;
    let n = 0;
    const stages = experience.stages && typeof experience.stages === 'object' ? experience.stages : {};
    Object.keys(stages).forEach((stageKey) => {
      const stage = stages[stageKey];
      if (!stage || typeof stage !== 'object') return;
      Object.keys(stage).forEach((k) => {
        if (k === 'emotions') return;
        if (_isMeasured(stage[k])) n++;
      });
      const emotions = stage.emotions && typeof stage.emotions === 'object' ? stage.emotions : {};
      Object.keys(emotions).forEach((k) => { if (_isMeasured(emotions[k])) n++; });
    });
    const triggers = experience.emotionalTriggers && typeof experience.emotionalTriggers === 'object'
      ? experience.emotionalTriggers : {};
    Object.keys(triggers).forEach((k) => { if (_isMeasured(triggers[k])) n++; });
    return n;
  }

  function isLinkedExperience(experience) {
    return !!(experience && experience.tssProjectId);
  }

  /**
   * After a successful send, record the Capture project link on the
   * in-memory experience so later sends and the dual-write carry it.
   * Mirrors 0038's server-side profile link-back and never overwrites:
   * - already linked (tssProjectId set) -> nothing changes;
   * - version.profile_link 'linked_elsewhere' or no project_id -> nothing;
   * - otherwise tssProjectId = project_id, and sourceVersionId = version_id
   *   when the experience has none - except for 'already_linked' (0038 found
   *   the project through the stored profile link and kept its version; our
   *   new version id would make the dual-write re-point it).
   * Returns true when the experience changed.
   */
  function applyCaptureLink(experience, version) {
    if (!experience || typeof experience !== 'object' || !version) return false;
    if (experience.tssProjectId) return false;
    if (!version.project_id || version.profile_link === 'linked_elsewhere') return false;
    experience.tssProjectId = String(version.project_id);
    if (!experience.sourceVersionId && version.version_id && version.profile_link !== 'already_linked') {
      experience.sourceVersionId = String(version.version_id);
    }
    return true;
  }

  /**
   * The create_version_from_signature payload: a JSON clone of the raw
   * experience, exactly the shape upsert_signature_profile receives. Nulls
   * (untouched sliders) are preserved as nulls, never defaulted.
   */
  function buildSendToCapturePayload(experience) {
    if (!experience || typeof experience !== 'object') {
      throw new Error('Send to Capture: experience not found.');
    }
    if (experience.id === undefined || experience.id === null || experience.id === '') {
      throw new Error('Send to Capture: experience has no id.');
    }
    return JSON.parse(JSON.stringify(experience));
  }

  function captureAppBaseUrl(config) {
    const base = _config(config).CAPTURE_APP_URL || DEFAULT_CAPTURE_APP_URL;
    return String(base).replace(/\/+$/, '');
  }

  function buildCaptureStudyUrl(studyId, config) {
    return `${captureAppBaseUrl(config)}/studies/${encodeURIComponent(String(studyId))}`;
  }

  const CATEGORY_REQUIRED_MESSAGE = 'Choose a Capture category for this product - its product type does not match one Capture category.';

  function _messageOf(err) {
    if (!err) return '';
    if (typeof err === 'string') return err;
    return String(err.message || err.details || err.hint || '');
  }

  const ERROR_MAP = [
    [/not signed in|no clerk session|clerk.*not (loaded|available)|not authenticated/i,
      'Sign in to your QEP account to send this experience to Capture.'],
    [/demo mode/i, DEMO_MODE_MESSAGE],
    [/more than one organisation for caller/i,
      'Your QEP account belongs to more than one organisation. Select your active organisation in the QEP Portal, then try again.'],
    [/no organisation for caller|no resolvable org/i,
      'Your QEP account is not linked to an organisation yet, so Capture cannot create a study. Ask your QEP admin to set up your organisation.'],
    [/is not a project in your organisation/i,
      'This experience is linked to a Brief project that is not in your organisation (or no longer exists), so it cannot be sent to Capture.'],
    [/is not a version of project|requires experience\.tssProjectId|differs from the stored link|must be a UUID string|is not a valid UUID/i,
      'This experience\'s link to its Brief version is inconsistent, so it cannot be sent to Capture. Start a new Full Evaluation from the target and try again.'],
    [/unknown signature stage/i,
      'This experience contains a stage Capture does not recognise, so it cannot be sent. Please contact QEP support.'],
    [/out of range 0-10/i,
      'This experience has a rating outside the 0-10 scale, so it cannot be sent to Capture. Edit or re-log it and try again.'],
    [/category required/i, CATEGORY_REQUIRED_MESSAGE],
    [/is not a known category/i,
      'The product category chosen for Capture is not recognised. Please contact QEP support.'],
    [/profile was deleted/i,
      'This experience was deleted from the shared QEP database, so it cannot be sent to Capture. Log it again as a new experience.'],
    [/nothing measured|no measured|at least one attribute/i, NOTHING_MEASURED_MESSAGE],
    [/must be locked/i,
      'Capture refused the new version because it is not locked. Please try again; if it keeps happening, contact QEP support.'],
    [/project version not found|project not found/i,
      'Capture could not find the new version it was asked to use. Please try again.'],
    [/could not find the function|PGRST202/i,
      'Send to Capture is not available on this QEP database yet. Contact QEP support.'],
    [/permission denied/i,
      'The QEP database refused this request (permission denied). Try signing in again.'],
    [/supabase-js not loaded|qep-capture-config\.js not loaded|getQepCaptureClient is not available/i,
      'The connection to QEP is not configured on this page. Reload and try again.'],
    [/failed to fetch|networkerror|network request failed|load failed/i,
      'Could not reach QEP. Check your connection and try again.'],
  ];

  /** Map an RPC/client error to a clear, user-facing sentence (plain text). */
  function mapSendToCaptureError(err) {
    const msg = _messageOf(err);
    for (const [re, friendly] of ERROR_MAP) {
      if (re.test(msg)) return friendly;
    }
    return msg ? `Send to Capture failed: ${msg}` : 'Send to Capture failed. Please try again.';
  }

  function _firstRow(data) {
    if (Array.isArray(data)) return data.length ? data[0] : null;
    return data || null;
  }

  // create_study_from_version returns TABLE (study qep_study, out_of_category_count
  // int): supabase-js gives an array of rows, each with `study` as a nested
  // object. Tolerate a bare row too.
  function extractStudyResult(data) {
    const row = _firstRow(data);
    if (!row) return null;
    const study = row.study && typeof row.study === 'object' ? row.study : row;
    if (!study || !study.id) return null;
    return { study, outOfCategoryCount: Number(row.out_of_category_count) || 0 };
  }

  function _fail(message, cause) {
    const e = new Error(message);
    e.userMessage = message;
    if (cause) e.cause = cause;
    return e;
  }

  async function _callRpc(promiseFactory) {
    let res;
    try {
      res = await promiseFactory();
    } catch (err) {
      throw _fail(mapSendToCaptureError(err), err);
    }
    if (res && res.error) {
      const e = _fail(mapSendToCaptureError(res.error), res.error);
      if (/category required/i.test(_messageOf(res.error))) e.code = 'CATEGORY_REQUIRED';
      throw e;
    }
    return res ? res.data : null;
  }

  /**
   * The RPC sequence. Stops at the first error; never creates a study if
   * the version could not be created. Resolves to
   * { version, study, studyName, url, outOfCategoryCount }. Errors carry a
   * user-facing `userMessage`.
   */
  async function sendExperienceToCapture(experience, deps = {}) {
    if (deps.isDemo && deps.isDemo()) throw _fail(DEMO_MODE_MESSAGE);
    const payload = buildSendToCapturePayload(experience);
    if (countMeasuredValues(payload) === 0) throw _fail(NOTHING_MEASURED_MESSAGE);
    if (deps.categoryId) payload.tssCategoryId = String(deps.categoryId);

    let client;
    try {
      client = deps.getClient();
    } catch (err) {
      throw _fail(mapSendToCaptureError(err), err);
    }

    const versionData = await _callRpc(() =>
      client.schema('tss_shared').rpc('create_version_from_signature', { payload }));
    const version = _firstRow(versionData);
    if (!version || !version.version_id) {
      throw _fail('Capture did not return a new version. Please try again.');
    }
    if (Number(version.targets_count) === 0) throw _fail(NOTHING_MEASURED_MESSAGE);

    const studyData = await _callRpc(() =>
      client.rpc('create_study_from_version', { p_version_id: version.version_id }));
    const result = extractStudyResult(studyData);
    if (!result) throw _fail('Capture did not return the new study. Please try again.');

    const studyName = _cleanPart(result.study.name) || _cleanPart(version.study_name_hint) || studyNameForExperience(experience);
    return {
      version,
      study: result.study,
      studyName,
      url: buildCaptureStudyUrl(result.study.id, deps.config),
      outOfCategoryCount: result.outOfCategoryCount,
    };
  }

  /** Extra plain-text sentences for the success toast (leading space each). */
  function successNotes(result) {
    const v = (result && result.version) || {};
    let s = '';
    if (v.reused_existing_version === true) s += ' Nothing changed since the last send, so the existing version was reused.';
    if (result && result.outOfCategoryCount > 0) s += ` ${result.outOfCategoryCount} target(s) fall outside the study category.`;
    return s;
  }

  /** Capture's categories (public.categories), in display order. */
  async function fetchCaptureCategories(client) {
    const res = await client.from('categories').select('id, name').order('position');
    if (res && res.error) throw _fail('Could not load Capture categories to choose from. Please try again.', res.error);
    const rows = (res && res.data) || [];
    if (!rows.length) throw _fail('Capture has no categories to choose from. Please contact QEP support.');
    return rows.map(r => ({ id: String(r.id), name: String(r.name) }));
  }

  function sendToCaptureTooltip(experience) {
    return isLinkedExperience(experience)
      ? 'Create a new version of the linked Brief project from this experience and open it as a Capture study'
      : 'Create a new project from this experience and open it as a Capture study';
  }

  /** History-row button. Empty string when the flag is off. */
  function buildSendToCaptureButtonHtml(experience, config) {
    if (!isSendToCaptureEnabled(config) || !experience) return '';
    return `<button type="button" class="btn btn-secondary send-to-capture-btn" style="padding: 6px 12px; font-size: 0.85rem; margin-right: 8px;" title="${esc(sendToCaptureTooltip(experience))}" onclick="sendExperienceToCapture(${jsArgAttr(experience.id)}, this)">Send to Capture</button>`;
  }

  // ---- DOM glue (browser only; injected in tests) ----

  function showSendToCaptureToast({ type = 'info', message = '', linkUrl = '', linkText = '' } = {}) {
    if (typeof document === 'undefined') return null;
    const box = document.createElement('div');
    box.setAttribute('role', type === 'error' ? 'alert' : 'status');
    box.style.cssText = 'position: fixed; top: 80px; right: 20px; max-width: 380px; padding: 15px 20px; ' +
      `background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#C2871B'}; ` +
      'color: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 10000; font-weight: 500;';
    const text = document.createElement('div');
    text.textContent = message;
    box.appendChild(text);
    if (linkUrl) {
      const a = document.createElement('a');
      a.href = linkUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = linkText || 'Open in Capture';
      a.style.cssText = 'color: white; text-decoration: underline; display: inline-block; margin-top: 6px;';
      box.appendChild(a);
    }
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Dismiss';
    close.style.cssText = 'margin-left: 12px; background: transparent; border: 1px solid white; color: white; border-radius: 4px; cursor: pointer; font-size: 0.8rem;';
    close.addEventListener('click', () => box.remove());
    box.appendChild(close);
    document.body.appendChild(box);
    // Success/error with a link stays until dismissed (the link may be the
    // only way to reach the study if the popup was blocked).
    if (!linkUrl) setTimeout(() => { if (box.parentNode) box.remove(); }, type === 'error' ? 8000 : 4000);
    return box;
  }

  /**
   * Modal asking the user to pick a Capture category. Built with
   * textContent / option elements only (no innerHTML). onPick runs inside
   * the Send click, so the caller can open the study tab synchronously.
   */
  function showCategoryPickerDialog({ categories, productType, onPick, onCancel }) {
    if (typeof document === 'undefined') return null;
    const overlay = document.createElement('div');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 10001; display: flex; align-items: center; justify-content: center; padding: 16px;';
    const box = document.createElement('div');
    box.style.cssText = 'background: white; color: #1f2937; border-radius: 10px; padding: 20px; width: 100%; max-width: 380px; box-shadow: 0 10px 30px rgba(0,0,0,0.25);';
    const title = document.createElement('h3');
    title.textContent = 'Choose a Capture category';
    title.style.cssText = 'margin: 0 0 8px; font-size: 1.05rem;';
    const text = document.createElement('p');
    text.textContent = productType
      ? `The product type "${productType}" matches more than one Capture category. Pick the one this study belongs to.`
      : 'This product has no product type. Pick the Capture category this study belongs to.';
    text.style.cssText = 'margin: 0 0 12px; font-size: 0.9rem;';
    const select = document.createElement('select');
    select.setAttribute('aria-label', 'Capture category');
    select.style.cssText = 'width: 100%; padding: 8px; margin-bottom: 14px; font-size: 0.95rem;';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select a category...';
    select.appendChild(placeholder);
    for (const c of categories) {
      const o = document.createElement('option');
      o.value = c.id;
      o.textContent = c.name;
      select.appendChild(o);
    }
    const actions = document.createElement('div');
    actions.style.cssText = 'display: flex; justify-content: flex-end; gap: 8px;';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'btn btn-secondary';
    cancel.textContent = 'Cancel';
    const send = document.createElement('button');
    send.type = 'button';
    send.className = 'btn btn-primary';
    send.textContent = 'Send to Capture';
    send.disabled = true;
    select.addEventListener('change', () => { send.disabled = !select.value; });
    const closeDialog = () => { if (overlay.parentNode) overlay.remove(); };
    cancel.addEventListener('click', () => { closeDialog(); if (onCancel) onCancel(); });
    send.addEventListener('click', () => { if (!select.value) return; const id = select.value; closeDialog(); onPick(id); });
    actions.appendChild(cancel);
    actions.appendChild(send);
    box.appendChild(title);
    box.appendChild(text);
    box.appendChild(select);
    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    select.focus();
    return overlay;
  }

  function _defaultIsDemo() {
    return !!(typeof window !== 'undefined' && window.demoMode &&
      typeof window.demoMode.isDemoActive === 'function' && window.demoMode.isDemoActive());
  }

  function _defaultGetClient() {
    if (typeof window !== 'undefined' && typeof window.getQepCaptureClient === 'function') {
      return window.getQepCaptureClient();
    }
    throw new Error('send-to-capture: getQepCaptureClient is not available.');
  }

  function _defaultOpenWindow() {
    try { return window.open('', '_blank'); } catch { return null; }
  }

  // The normal save path: app.js's global saveData() (Firestore incremental
  // save + fire-and-forget dual-write). Never in demo mode.
  function _defaultSave() {
    if (typeof window === 'undefined' || typeof window.saveData !== 'function') return undefined;
    if (_defaultIsDemo()) return undefined;
    return window.saveData();
  }

  /**
   * Click handling with a per-experience in-flight guard (double-click never
   * sends twice) and button progress state. The new tab is opened
   * synchronously inside the click, before any await, so popup blockers
   * allow it; if it was blocked anyway the success toast carries the link.
   */
  function createSendToCaptureController(deps = {}) {
    const getClient = deps.getClient || _defaultGetClient;
    const isDemo = deps.isDemo || _defaultIsDemo;
    const openWindow = deps.openWindow || _defaultOpenWindow;
    const notify = deps.notify || showSendToCaptureToast;
    const showCategoryPicker = deps.showCategoryPicker || showCategoryPickerDialog;
    const save = deps.save || _defaultSave;
    const inFlight = new Set();

    // Link save-back: best effort, never turns a successful send into an error.
    function _saveLink(experience, version) {
      if (isDemo()) return;
      if (!applyCaptureLink(experience, version)) return;
      try {
        const p = save(experience);
        if (p && typeof p.catch === 'function') {
          p.catch((err) => console.error('Send to Capture: saving the Capture link failed:', err));
        }
      } catch (err) {
        console.error('Send to Capture: saving the Capture link failed:', err);
      }
    }

    function _setBusy(button, busy) {
      if (!button) return;
      if (busy) {
        button.dataset = button.dataset || {};
        button.dataset.label = button.textContent;
        button.disabled = true;
        button.textContent = 'Sending to Capture...';
      } else {
        button.disabled = false;
        button.textContent = (button.dataset && button.dataset.label) || 'Send to Capture';
      }
    }

    async function handleClick(experience, button, opts = {}) {
      const config = deps.config || _config();
      if (!isSendToCaptureEnabled(config)) return { status: 'disabled' };
      if (!experience) {
        notify({ type: 'error', message: 'Send to Capture: experience not found. Reload and try again.' });
        return { status: 'error' };
      }
      const key = String(experience.id);
      if (inFlight.has(key)) return { status: 'busy' };

      // Synchronous guards first - no blank tab for a request that cannot run.
      if (isDemo()) {
        notify({ type: 'error', message: DEMO_MODE_MESSAGE });
        return { status: 'error', message: DEMO_MODE_MESSAGE };
      }
      if (countMeasuredValues(experience) === 0) {
        notify({ type: 'error', message: NOTHING_MEASURED_MESSAGE });
        return { status: 'error', message: NOTHING_MEASURED_MESSAGE };
      }

      inFlight.add(key);
      _setBusy(button, true);
      const win = openWindow();
      if (win) {
        try { win.opener = null; } catch { /* cross-origin later - fine */ }
      }

      try {
        const result = await sendExperienceToCapture(experience, { getClient, isDemo, config, categoryId: opts.categoryId });
        _saveLink(experience, result.version);
        let opened = false;
        if (win && !win.closed) {
          try { win.location.href = result.url; opened = true; } catch { opened = false; }
        }
        const extra = successNotes(result);
        notify({
          type: 'success',
          message: `Capture study created: ${result.studyName}.${extra}${opened ? '' : ' Your browser blocked the new tab - use the link below.'}`,
          linkUrl: result.url,
          linkText: 'Open in Capture',
        });
        return { status: 'ok', result, opened };
      } catch (err) {
        if (win) { try { win.close(); } catch { /* ignore */ } }
        if (err && err.code === 'CATEGORY_REQUIRED' && !opts.categoryId) {
          let categories;
          try {
            categories = await fetchCaptureCategories(getClient());
          } catch (listErr) {
            const message = (listErr && listErr.userMessage) || 'Could not load Capture categories to choose from. Please try again.';
            notify({ type: 'error', message });
            return { status: 'error', message };
          }
          const productType = _cleanPart(experience.productInfo && (experience.productInfo.type || experience.productInfo.category));
          showCategoryPicker({
            categories,
            productType,
            // Runs inside the dialog's Send click, so the new tab opens synchronously.
            onPick: (categoryId) => handleClick(experience, button, { categoryId }),
            onCancel: () => {},
          });
          return { status: 'needs_category' };
        }
        const message = (err && err.userMessage) || mapSendToCaptureError(err);
        notify({ type: 'error', message });
        return { status: 'error', message };
      } finally {
        inFlight.delete(key);
        _setBusy(button, false);
      }
    }

    return { handleClick };
  }

  let _controller = null;
  function handleClick(experience, button) {
    if (!_controller) _controller = createSendToCaptureController();
    return _controller.handleClick(experience, button);
  }

  const api = {
    DEFAULT_CAPTURE_APP_URL,
    UNTITLED_PRODUCT,
    NOTHING_MEASURED_MESSAGE,
    DEMO_MODE_MESSAGE,
    isSendToCaptureEnabled,
    buildCaptureStudyName,
    studyNameForExperience,
    countMeasuredValues,
    isLinkedExperience,
    applyCaptureLink,
    buildSendToCapturePayload,
    captureAppBaseUrl,
    buildCaptureStudyUrl,
    mapSendToCaptureError,
    extractStudyResult,
    sendExperienceToCapture,
    sendToCaptureTooltip,
    successNotes,
    fetchCaptureCategories,
    showCategoryPickerDialog,
    CATEGORY_REQUIRED_MESSAGE,
    buildSendToCaptureButtonHtml,
    showSendToCaptureToast,
    createSendToCaptureController,
    handleClick,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.SendToCapture = api;
})();
