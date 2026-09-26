// ===== TARGETS LOADED UI (QEP-CAPTURE) =====
// Renders the "Targets loaded" panel: a picker of the caller's org's
// locked Brief projects (tss_shared.list_locked_projects(), qep-capture
// migration 0037), loads the selected/deep-linked version's targets +
// stage notes, and offers "Start Full Evaluation from this target" (see
// target-prefill.js). No import step, no writes to qep-capture - see
// targets-loaded.js for the data fetches.

const QEP_CAPTURE_DEEP_LINK_STORAGE_KEY = 'qepCaptureDeepLinkPending';

function isUuidLikeForDeepLink(value) {
    return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

// ------------------------------------------------------------
// Deep link stash: runs at script-parse time (this file loads BEFORE the
// inline script that calls authManager.initialize() - see index.html's
// script order), i.e. before the Clerk gate ever runs, so a
// ?project=&version= query string survives the sign-in card even if it
// causes navigation. Consumed once, after auth completes - see
// handleQepCaptureDeepLink() below, called from auth.js's showApp() hook.
// ------------------------------------------------------------
(function stashQepCaptureDeepLinkParams() {
    if (typeof window === 'undefined' || !window.location || !window.sessionStorage) return;
    try {
        const params = new URLSearchParams(window.location.search);
        const project = params.get('project');
        if (!project) return; // nothing to stash
        const version = params.get('version');
        window.sessionStorage.setItem(QEP_CAPTURE_DEEP_LINK_STORAGE_KEY, JSON.stringify({ project, version: version || null }));
    } catch (err) {
        // sessionStorage unavailable (private mode, etc.) - the deep link
        // is simply lost; the app still boots and works normally otherwise.
        console.warn('Targets Loaded deep link: could not stash query params.', err);
    }
})();

function readQepCaptureDeepLinkStash() {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    try {
        return window.sessionStorage.getItem(QEP_CAPTURE_DEEP_LINK_STORAGE_KEY);
    } catch (err) {
        return null;
    }
}

function clearQepCaptureDeepLinkStash() {
    try {
        if (window.sessionStorage) window.sessionStorage.removeItem(QEP_CAPTURE_DEEP_LINK_STORAGE_KEY);
    } catch (err) {
        // Nothing else to do - storage unavailable.
    }
}

// Parse a stashed deep link. Returns { projectId, versionId } or null when
// what was stashed has no syntactically valid project id.
function parseQepCaptureDeepLinkStash(raw) {
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch (err) {
        return null;
    }
    if (!parsed || !isUuidLikeForDeepLink(parsed.project)) {
        console.warn('Targets Loaded deep link: malformed project id, ignoring.');
        return null;
    }
    if (parsed.version && !isUuidLikeForDeepLink(parsed.version)) {
        console.warn('Targets Loaded deep link: malformed version id, ignoring the version (project id still honoured).');
        parsed.version = null;
    }
    return { projectId: parsed.project, versionId: parsed.version || null };
}

/**
 * Read the stashed deep link (if any) WITHOUT consuming it, and strip
 * project/version from the address bar (history.replaceState) so the URL is
 * clean whatever happens next. The stash itself stays until the brief has
 * loaded (or failed for good) - see runQepCaptureDeepLink() - so a Retry, or
 * a reload in this tab after a temporary failure, reopens it. A malformed
 * stash is dropped. Returns { projectId, versionId } (versionId may be
 * null) or null. Never throws.
 */
function peekQepCaptureDeepLinkTarget() {
    const raw = readQepCaptureDeepLinkStash();
    if (!raw) return null;

    try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('project') || url.searchParams.has('version')) {
            url.searchParams.delete('project');
            url.searchParams.delete('version');
            window.history.replaceState({}, '', url.pathname + url.search + url.hash);
        }
    } catch (err) {
        // Non-fatal - the params just stay visible in the address bar.
    }

    const target = parseQepCaptureDeepLinkStash(raw);
    if (!target) clearQepCaptureDeepLinkStash();
    return target;
}

/**
 * Consume the stashed deep link (if any): peekQepCaptureDeepLinkTarget()
 * plus removing it from sessionStorage. Returns { projectId, versionId }
 * or null. Never throws.
 */
function consumeQepCaptureDeepLinkTarget() {
    const target = peekQepCaptureDeepLinkTarget();
    clearQepCaptureDeepLinkStash();
    return target;
}

function isTargetsLoadedEnabled() {
    return !!(window.QEP_CAPTURE_CONFIG && window.QEP_CAPTURE_CONFIG.ENABLE_TARGETS_LOADED);
}

// ------------------------------------------------------------
// First-load reliability (2026-09-26): "Open in Signature" used to need
// several refreshes. The deep link now (1) shows the Targets Loaded view as
// soon as the app is visible, (2) waits for the real prerequisite - the
// Clerk-ready signal - with a visible "waiting for QEP sign-in" message,
// never silently dropping the link when the signal is slow, (3) retries
// transient qep-capture failures (targets-loaded.js marks them) with
// backoff, and (4) ends in either the targets or a clear message with a
// Retry (or Reload) button - never a silent Dashboard.
// ------------------------------------------------------------

// Delays before the 2nd and 3rd attempt of a transient failure.
const TARGETS_LOAD_RETRY_DELAYS_MS = [700, 2000];
// After auth.js's own 15 s Clerk-ready wait ran out, keep waiting this much
// longer (the message says so) before offering Retry.
const DEEP_LINK_EXTRA_CLERK_WAIT_MS = 45000;

/**
 * Call `fn` (an async qep-capture fetch returning { error, transient? } or
 * a result) and retry it while it fails transiently, up to
 * TARGETS_LOAD_RETRY_DELAYS_MS.length more times. `onRetry(attempt)` runs
 * before each retry (UI feedback). Returns the last result.
 */
async function loadWithTransientRetry(fn, onRetry) {
    let result = await fn();
    for (let i = 0; i < TARGETS_LOAD_RETRY_DELAYS_MS.length; i++) {
        if (!result || !result.error || !result.transient) return result;
        if (typeof onRetry === 'function') onRetry(i + 1);
        await new Promise((resolve) => setTimeout(resolve, TARGETS_LOAD_RETRY_DELAYS_MS[i]));
        result = await fn();
    }
    return result;
}

function renderDeepLinkStatus(html) {
    const container = document.getElementById('targets-loaded-content');
    if (container) container.innerHTML = `<div class="card" style="max-width: 640px; margin-bottom: 20px;">${html}</div>`;
}

const DEEP_LINK_WAITING_HTML = '<p id="qep-capture-deep-link-status" style="color: #666;">Opening the brief from Brief &ndash; waiting for QEP sign-in&hellip;</p>';

/**
 * Called by auth.js as soon as the app is shown (Firebase session), before
 * the Clerk-ready signal: if a valid deep link is stashed and Targets
 * Loaded is on, switch to its view and say we are waiting for sign-in, so
 * the user never sits on the Dashboard wondering. UI only - no qep-capture
 * call, and the link is not consumed. Never throws.
 */
function showQepCaptureDeepLinkPending() {
    try {
        if (!isTargetsLoadedEnabled()) return;
        const raw = readQepCaptureDeepLinkStash();
        if (!raw || !parseQepCaptureDeepLinkStash(raw)) return;
        navigateToTargetsLoadedView();
        renderDeepLinkStatus(DEEP_LINK_WAITING_HTML);
    } catch (err) {
        console.warn('Targets Loaded deep link: could not show the pending state.', err);
    }
}

/**
 * Resolve the Clerk-ready state the deep link should act on. `clerkState`
 * is what auth.js handed over (it may be a 'timeout' after its 15 s wait).
 * On a timeout, keeps waiting (DEEP_LINK_EXTRA_CLERK_WAIT_MS) with a
 * "still waiting" message. Without auth.js on the page (unit tests), the
 * fetch layer's own Clerk wait applies and this resolves signed-in.
 */
async function waitForQepSignIn(clerkState) {
    const authManager = window.authManager;
    if (!authManager || typeof authManager.whenClerkReady !== 'function') {
        return clerkState || { status: 'signed-in' };
    }
    let state = authManager.clerkReadyState || clerkState || null;
    if (!state) {
        renderDeepLinkStatus(DEEP_LINK_WAITING_HTML);
        state = await authManager.whenClerkReady();
    }
    if (state && state.status === 'error' && state.reason === 'timeout') {
        renderDeepLinkStatus('<p id="qep-capture-deep-link-status" style="color: #666;">Opening the brief from Brief &ndash; still waiting for QEP sign-in (this can take a little longer on a slow connection)&hellip;</p>');
        state = await authManager.whenClerkReady(DEEP_LINK_EXTRA_CLERK_WAIT_MS);
    }
    return state || { status: 'error', reason: 'timeout', session: null };
}

function renderDeepLinkBlocked(state) {
    if (state.reason === 'timeout') {
        renderDeepLinkStatus(
            '<p style="color: #b00;">QEP sign-in is taking too long, so the brief\'s targets could not be loaded yet.</p>' +
            '<button id="qep-capture-retry-btn" class="btn btn-secondary">Retry</button>'
        );
        const retry = document.getElementById('qep-capture-retry-btn');
        if (retry) retry.addEventListener('click', () => handleQepCaptureDeepLink());
        return;
    }
    const detail = state.error && state.error.message ? ` (${escapeHtml(state.error.message)})` : '';
    renderDeepLinkStatus(
        `<p style="color: #b00;">Could not finish signing in to QEP${detail}, so the brief's targets could not be loaded. Reload the page to try again - the brief will reopen.</p>` +
        '<button id="qep-capture-reload-btn" class="btn btn-secondary">Reload</button>'
    );
    const reload = document.getElementById('qep-capture-reload-btn');
    if (reload) reload.addEventListener('click', () => window.location.reload());
}

let _deepLinkRun = null;

/**
 * Called by auth.js once the Clerk-ready signal settles (any status except
 * signed-out), with that state; also by the Retry button. If a deep link is
 * stashed and Targets Loaded is enabled: switches to that view, waits for
 * QEP sign-in, then preselects/loads the referenced project/version. A
 * second call while one is running joins it. A no-op when nothing is
 * stashed. Never throws.
 */
function handleQepCaptureDeepLink(clerkState) {
    if (_deepLinkRun) return _deepLinkRun;
    _deepLinkRun = runQepCaptureDeepLink(clerkState)
        .catch((err) => console.warn('Targets Loaded deep link failed:', err))
        .finally(() => { _deepLinkRun = null; });
    return _deepLinkRun;
}

async function runQepCaptureDeepLink(clerkState) {
    const target = peekQepCaptureDeepLinkTarget();
    if (!target) return;

    if (!isTargetsLoadedEnabled()) {
        // Consumed even though disabled - a refresh must not re-fire it
        // later if the flag is turned on mid-session.
        clearQepCaptureDeepLinkStash();
        return;
    }

    navigateToTargetsLoadedView();

    const state = await waitForQepSignIn(clerkState);
    if (state.status === 'signed-out') return; // auth screen / portal takes over; stays stashed for after sign-in
    if (state.status === 'error') {
        renderDeepLinkBlocked(state); // stays stashed: Retry / Reload reopens it
        return;
    }

    const outcome = await renderTargetsLoadedDashboard(target);
    // Keep the link only while a Retry could still load it.
    if (outcome !== 'transient') clearQepCaptureDeepLinkStash();
}

function navigateToTargetsLoadedView() {
    document.querySelectorAll('.nav-item').forEach((nav) => nav.classList.remove('active'));
    const navItem = document.getElementById('nav-item-targets-loaded');
    if (navItem) navItem.classList.add('active');
    document.querySelectorAll('.view').forEach((view) => view.classList.remove('active'));
    const view = document.getElementById('view-targets-loaded');
    if (view) view.classList.add('active');
    const title = document.getElementById('current-view-title');
    if (title) title.textContent = 'Targets Loaded (QEP-Capture)';
}

// ------------------------------------------------------------
// Main render
// ------------------------------------------------------------

/**
 * `deepLinkTarget`, when given, is { projectId, versionId } (versionId
 * may be null - "use the latest locked version"). Resolves to the
 * outcome: 'loaded', 'transient' (failed, a Retry may work), 'failed' or
 * 'picker' (list shown, nothing to load).
 */
async function renderTargetsLoadedDashboard(deepLinkTarget) {
    const container = document.getElementById('targets-loaded-content');
    if (!container) return;

    container.innerHTML = `
        <div class="card" style="max-width: 640px; margin-bottom: 20px;">
            <p style="color: #666; margin-bottom: 12px;">
                Read-only preview of a Brief project's locked targets from
                qep-capture - no import, nothing is saved to this product.
            </p>
            <div id="qep-capture-picker-status"></div>
            <div id="qep-capture-picker-wrap" style="display: none;">
                <label for="qep-capture-project-select" style="display: block; margin-bottom: 6px; font-weight: 600;">Locked brief</label>
                <select id="qep-capture-project-select" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                    <option value="">Select a locked brief&hellip;</option>
                </select>
            </div>
            <details id="qep-capture-manual-fallback" style="margin-top: 12px; display: none;">
                <summary style="cursor: pointer; color: #666;">Enter project id manually</summary>
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <input
                        type="text"
                        id="qep-capture-project-id-input"
                        placeholder="qep-capture project id (uuid)"
                        style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-family: monospace;"
                    />
                    <button id="qep-capture-load-btn" class="btn btn-secondary">Load</button>
                </div>
            </details>
        </div>
        <div id="targets-loaded-results"></div>
    `;

    wireManualFallback();
    return loadAndRenderPicker(deepLinkTarget || null);
}

function wireManualFallback() {
    const btn = document.getElementById('qep-capture-load-btn');
    const input = document.getElementById('qep-capture-project-id-input');
    if (!btn || !input) return;
    btn.addEventListener('click', () => handleManualLoad());
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleManualLoad();
    });
}

async function handleManualLoad() {
    const input = document.getElementById('qep-capture-project-id-input');
    const projectId = (input.value || '').trim();
    if (!projectId) {
        renderTargetsResultOrError({ error: 'Enter a project id.' });
        return;
    }
    renderTargetsLoadedLoading();
    const result = await window.fetchQepCaptureTargets(projectId);
    renderTargetsResultOrError(result);
}

async function loadAndRenderPicker(deepLinkTarget) {
    const statusEl = document.getElementById('qep-capture-picker-status');
    const wrapEl = document.getElementById('qep-capture-picker-wrap');
    const fallbackEl = document.getElementById('qep-capture-manual-fallback');
    if (!statusEl || !wrapEl || !fallbackEl) return;

    statusEl.innerHTML = '<p style="color: #666;">Loading your locked briefs&hellip;</p>';
    wrapEl.style.display = 'none';

    const result = await loadWithTransientRetry(
        () => window.fetchLockedProjects(),
        () => { statusEl.innerHTML = '<p style="color: #666;">Loading your locked briefs&hellip; (connection problem, retrying)</p>'; }
    );

    if (result.error) {
        const retryHtml = result.transient ? ' <button id="qep-capture-retry-btn" class="btn btn-secondary">Retry</button>' : '';
        statusEl.innerHTML = `<p style="color: #b00;">${escapeHtml(result.error)}</p>${retryHtml}`;
        fallbackEl.style.display = 'block';
        fallbackEl.open = true;
        if (result.transient) {
            const retry = document.getElementById('qep-capture-retry-btn');
            // A deep link is still stashed after a transient failure, so its
            // Retry goes back through the deep-link path (which clears it once
            // loaded); the plain picker just re-renders.
            if (retry) retry.addEventListener('click', () => (deepLinkTarget ? handleQepCaptureDeepLink() : renderTargetsLoadedDashboard()));
            return 'transient';
        }
        return 'failed';
    }

    const projects = result.projects || [];

    if (projects.length === 0) {
        statusEl.innerHTML = '<p style="color: #666;">No locked briefs yet - lock a brief in Brief first.</p>';
        fallbackEl.style.display = 'block';
        return deepLinkTarget ? 'failed' : 'picker';
    }

    statusEl.innerHTML = '';
    wrapEl.style.display = 'block';
    fallbackEl.style.display = 'block'; // still available even with a populated picker

    const select = document.getElementById('qep-capture-project-select');
    select.innerHTML =
        '<option value="">Select a locked brief&hellip;</option>' +
        projects
            .map((p) => {
                const lockedDate = p.locked_at ? new Date(p.locked_at).toLocaleDateString() : '';
                const label = `${p.name} - v${p.version_number}${lockedDate ? ' - locked ' + lockedDate : ''}`;
                return `<option value="${escapeHtml(p.project_id)}" data-version-id="${escapeHtml(p.latest_locked_version_id)}">${escapeHtml(label)}</option>`;
            })
            .join('');

    select.onchange = () => {
        const opt = select.options[select.selectedIndex];
        if (!opt || !opt.value) return undefined;
        // Returning the promise is harmless in a real browser (onchange's
        // return value is ignored) and lets tests await the full load.
        return loadPickedTarget(opt.value, opt.dataset.versionId);
    };

    if (!deepLinkTarget) return 'picker';

    const match = projects.find((p) => p.project_id === deepLinkTarget.projectId);
    if (!match) {
        renderTargetsResultOrError({ error: 'That brief was not found in your organisation.' });
        return 'failed';
    }
    if (deepLinkTarget.versionId && deepLinkTarget.versionId !== match.latest_locked_version_id) {
        renderTargetsResultOrError({ error: 'That brief version was not found in your organisation.' });
        return 'failed';
    }

    select.value = match.project_id;
    return loadPickedTarget(match.project_id, match.latest_locked_version_id, () => handleQepCaptureDeepLink());
}

/**
 * Load and render one version's targets, retrying transient failures.
 * `onRetry` is what the Retry button does if they persist (default: this
 * same load again). Resolves to 'loaded', 'transient' or 'failed'.
 */
async function loadPickedTarget(projectId, versionId, onRetry) {
    renderTargetsLoadedLoading();
    const result = await loadWithTransientRetry(
        () => window.fetchQepCaptureTargetsByVersion(projectId, versionId),
        () => {
            const resultsEl = document.getElementById('targets-loaded-results');
            if (resultsEl) resultsEl.innerHTML = '<p style="color: #666;">Loading&hellip; (connection problem, retrying)</p>';
        }
    );
    renderTargetsResultOrError(result, onRetry || (() => loadPickedTarget(projectId, versionId)));
    if (!result.error) return 'loaded';
    return result.transient ? 'transient' : 'failed';
}

function renderTargetsLoadedLoading() {
    const resultsEl = document.getElementById('targets-loaded-results');
    if (resultsEl) resultsEl.innerHTML = '<p style="color: #666;">Loading&hellip;</p>';
}

function renderTargetsResultOrError(result, onRetry) {
    const resultsEl = document.getElementById('targets-loaded-results');
    if (!resultsEl) return;
    if (result.error) {
        const canRetry = !!(result.transient && typeof onRetry === 'function');
        resultsEl.innerHTML = `<p style="color: #b00;">${escapeHtml(result.error)}</p>` +
            (canRetry ? '<button id="qep-capture-retry-btn" class="btn btn-secondary">Retry</button>' : '');
        if (canRetry) {
            const retry = document.getElementById('qep-capture-retry-btn');
            if (retry) retry.addEventListener('click', () => onRetry());
        }
        return;
    }
    resultsEl.innerHTML = renderTargetsLoadedResult(result);
    wireStartEvaluationButton(result);
}

// " 7" / " 6-8" after a coded target's label (range_min/range_max, Stage
// 2A.5); nothing for a legacy target with no numeric range. Escaped.
function formatTargetValueSuffix(target) {
    const num = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
    const lo = num(target.rangeMin);
    const hi = num(target.rangeMax);
    if (lo === null && hi === null) return '';
    let label;
    if (lo !== null && hi !== null && lo !== hi) {
        label = `${Math.min(lo, hi)}-${Math.max(lo, hi)}`;
    } else {
        label = String(lo !== null ? lo : hi);
    }
    return ` ${escapeHtml(label)}`;
}

function renderTargetsLoadedResult(result) {
    const { project, version, stages } = result;
    const stageOrder = (window.SENSORY_STAGES || []).slice().sort((a, b) => a.position - b.position);

    const stageRows = stageOrder
        .map((stage) => {
            const stageData = stages[stage.id] || { targets: [], notes: '' };
            const stageTargets = stageData.targets || [];
            const targetsHtml = stageTargets.length
                ? stageTargets
                      .map(
                          (e) =>
                              `<span style="display: inline-block; margin: 2px 4px 2px 0; padding: 2px 8px; border-radius: 12px; font-size: 12px; background: ${
                                  e.role === 'primary' ? '#e8f0fe' : '#f3f3f3'
                              };">${escapeHtml(e.label)}${formatTargetValueSuffix(e)}${e.role === 'primary' ? '' : ' <span style="color:#999;">(secondary)</span>'}</span>`
                      )
                      .join('')
                : '<span style="color: #999;">&mdash;</span>';
            const notesHtml = stageData.notes ? escapeHtml(stageData.notes) : '<span style="color: #999;">&mdash;</span>';

            return `
                <tr>
                    <td style="font-weight: 600; padding: 8px; border-bottom: 1px solid #eee; white-space: nowrap;">${escapeHtml(
                        stage.label
                    )}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${targetsHtml}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${notesHtml}</td>
                </tr>
            `;
        })
        .join('');

    const actionsHtml =
        version.status === 'locked'
            ? `
                <div style="margin-bottom: 16px; display: flex; gap: 8px; flex-wrap: wrap;">
                    <button
                        id="qep-capture-start-evaluation-btn"
                        class="btn btn-primary"
                        data-project-id="${escapeHtml(project.id)}"
                        data-version-id="${escapeHtml(version.id)}"
                        data-project-name="${escapeHtml(project.name)}"
                    >Start Full Evaluation from this target</button>
                    <a href="${escapeHtml(buildCaptureHandoffUrl(version.id))}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="text-decoration: none;">Test in Capture</a>
                </div>
              `
            : '';

    return `
        <div class="card">
            <h3 style="margin-top: 0;">${escapeHtml(project.name)}</h3>
            <p style="color: #666; margin-bottom: 16px;">
                ${escapeHtml(project.categoryName)} &middot; v${escapeHtml(version.versionNumber)} &middot;
                ${escapeHtml(version.status)}${version.lockedAt ? ' &middot; locked ' + escapeHtml(new Date(version.lockedAt).toLocaleDateString()) : ''}
            </p>
            ${actionsHtml}
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr>
                        <th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Stage</th>
                        <th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Targets</th>
                        <th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Stage notes</th>
                    </tr>
                </thead>
                <tbody>
                    ${stageRows}
                </tbody>
            </table>
        </div>
    `;
}

function wireStartEvaluationButton(result) {
    const btn = document.getElementById('qep-capture-start-evaluation-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        handleStartEvaluationFromTarget(result);
    });
}

/**
 * "Start Full Evaluation from this target": fetches the crosswalk,
 * re-derives the prefill (target-prefill.js), switches to the Full
 * Evaluation view, and hands the prefill + project/version ids to
 * app.js's applyTargetPrefillToForm(). Re-fetches the target itself
 * (rather than reusing what's already on screen) so the ids being applied
 * always match what's rendered.
 */
async function handleStartEvaluationFromTarget(result) {
    const btn = document.getElementById('qep-capture-start-evaluation-btn');
    const originalLabel = btn ? btn.textContent : '';
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Preparing target...';
    }

    try {
        const [crosswalkResult, targetResult] = await Promise.all([
            loadWithTransientRetry(() => window.fetchSignatureAttributeCrosswalk()),
            loadWithTransientRetry(() => window.fetchQepCaptureTargetsByVersion(result.project.id, result.version.id)),
        ]);

        if (crosswalkResult.error) {
            alert(`Could not prepare the pre-fill: ${crosswalkResult.error}`);
            return;
        }
        if (targetResult.error) {
            alert(`Could not reload the target: ${targetResult.error}`);
            return;
        }

        const prefill = window.TargetPrefill.buildTargetPrefill(targetResult, crosswalkResult.rows);

        const navItem = document.querySelector('.nav-item[data-view="log-experience"]');
        if (navItem) navItem.click();

        if (typeof window.applyTargetPrefillToForm === 'function') {
            window.applyTargetPrefillToForm(prefill, {
                projectId: result.project.id,
                versionId: result.version.id,
                projectName: result.project.name,
            });
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = originalLabel || 'Start Full Evaluation from this target';
        }
    }
}

function buildCaptureHandoffUrl(versionId) {
    const base = (window.QEP_CAPTURE_CONFIG && window.QEP_CAPTURE_CONFIG.CAPTURE_APP_URL) || 'https://capture.qeptss.com';
    return `${base}/handoff?version=${encodeURIComponent(versionId)}`;
}

// Hide the nav entry entirely unless the dev-only feature flag is on.
document.addEventListener('DOMContentLoaded', () => {
    const navItem = document.getElementById('nav-item-targets-loaded');
    if (!navItem) return;
    const enabled = !!(window.QEP_CAPTURE_CONFIG && window.QEP_CAPTURE_CONFIG.ENABLE_TARGETS_LOADED);
    navItem.style.display = enabled ? '' : 'none';
});

if (typeof window !== 'undefined') {
    window.renderTargetsLoadedDashboard = renderTargetsLoadedDashboard;
    window.handleQepCaptureDeepLink = handleQepCaptureDeepLink;
    window.showQepCaptureDeepLinkPending = showQepCaptureDeepLinkPending;
    window.consumeQepCaptureDeepLinkTarget = consumeQepCaptureDeepLinkTarget;
}
