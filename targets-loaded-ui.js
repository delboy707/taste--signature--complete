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

/**
 * Consume the stashed deep link (if any): removes it from sessionStorage
 * and strips project/version from the address bar (history.replaceState)
 * so a refresh does not re-trigger it, regardless of whether the ids turn
 * out to be valid/found. Returns { projectId, versionId } (versionId may
 * be null) or null if there was nothing stashed, or what was stashed
 * didn't contain a syntactically valid project id. Never throws.
 */
function consumeQepCaptureDeepLinkTarget() {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;

    let raw = null;
    try {
        raw = window.sessionStorage.getItem(QEP_CAPTURE_DEEP_LINK_STORAGE_KEY);
        if (raw) window.sessionStorage.removeItem(QEP_CAPTURE_DEEP_LINK_STORAGE_KEY);
    } catch (err) {
        return null;
    }
    if (!raw) return null;

    // Strip from the address bar unconditionally, even if what follows
    // turns out to be malformed/not-found - a refresh must never re-fire it.
    try {
        const url = new URL(window.location.href);
        url.searchParams.delete('project');
        url.searchParams.delete('version');
        window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    } catch (err) {
        // Non-fatal - the params just stay visible in the address bar.
    }

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
 * Called once auth completes (see auth.js's onAuthStateChanged -> showApp()
 * hook). If a deep link was stashed and Targets Loaded is enabled, switches
 * to that view and preselects/loads the referenced project/version. A
 * no-op otherwise. Never throws.
 */
async function handleQepCaptureDeepLink() {
    const target = consumeQepCaptureDeepLinkTarget();
    if (!target) return;

    const enabled = !!(window.QEP_CAPTURE_CONFIG && window.QEP_CAPTURE_CONFIG.ENABLE_TARGETS_LOADED);
    if (!enabled) return;

    navigateToTargetsLoadedView();
    await renderTargetsLoadedDashboard(target);
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
 * may be null - "use the latest locked version").
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
    await loadAndRenderPicker(deepLinkTarget || null);
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

    const result = await window.fetchLockedProjects();

    if (result.error) {
        statusEl.innerHTML = `<p style="color: #b00;">${escapeHtml(result.error)}</p>`;
        fallbackEl.style.display = 'block';
        fallbackEl.open = true;
        return;
    }

    const projects = result.projects || [];

    if (projects.length === 0) {
        statusEl.innerHTML = '<p style="color: #666;">No locked briefs yet - lock a brief in Brief first.</p>';
        fallbackEl.style.display = 'block';
        return;
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

    if (!deepLinkTarget) return;

    const match = projects.find((p) => p.project_id === deepLinkTarget.projectId);
    if (!match) {
        renderTargetsResultOrError({ error: 'That brief was not found in your organisation.' });
        return;
    }
    if (deepLinkTarget.versionId && deepLinkTarget.versionId !== match.latest_locked_version_id) {
        renderTargetsResultOrError({ error: 'That brief version was not found in your organisation.' });
        return;
    }

    select.value = match.project_id;
    await loadPickedTarget(match.project_id, match.latest_locked_version_id);
}

async function loadPickedTarget(projectId, versionId) {
    renderTargetsLoadedLoading();
    const result = await window.fetchQepCaptureTargetsByVersion(projectId, versionId);
    renderTargetsResultOrError(result);
}

function renderTargetsLoadedLoading() {
    const resultsEl = document.getElementById('targets-loaded-results');
    if (resultsEl) resultsEl.innerHTML = '<p style="color: #666;">Loading&hellip;</p>';
}

function renderTargetsResultOrError(result) {
    const resultsEl = document.getElementById('targets-loaded-results');
    if (!resultsEl) return;
    if (result.error) {
        resultsEl.innerHTML = `<p style="color: #b00;">${escapeHtml(result.error)}</p>`;
        return;
    }
    resultsEl.innerHTML = renderTargetsLoadedResult(result);
    wireStartEvaluationButton(result);
}

function renderTargetsLoadedResult(result) {
    const { project, version, stages } = result;
    const stageOrder = (window.SENSORY_STAGES || []).slice().sort((a, b) => a.position - b.position);

    const stageRows = stageOrder
        .map((stage) => {
            const stageData = stages[stage.id] || { emotions: [], notes: '' };
            const emotionsHtml = stageData.emotions.length
                ? stageData.emotions
                      .map(
                          (e) =>
                              `<span style="display: inline-block; margin: 2px 4px 2px 0; padding: 2px 8px; border-radius: 12px; font-size: 12px; background: ${
                                  e.role === 'primary' ? '#e8f0fe' : '#f3f3f3'
                              };">${escapeHtml(e.label)}${e.role === 'primary' ? '' : ' <span style="color:#999;">(secondary)</span>'}</span>`
                      )
                      .join('')
                : '<span style="color: #999;">&mdash;</span>';
            const notesHtml = stageData.notes ? escapeHtml(stageData.notes) : '<span style="color: #999;">&mdash;</span>';

            return `
                <tr>
                    <td style="font-weight: 600; padding: 8px; border-bottom: 1px solid #eee; white-space: nowrap;">${escapeHtml(
                        stage.label
                    )}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${emotionsHtml}</td>
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
                        <th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Target emotions</th>
                        <th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Sensory notes</th>
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
            window.fetchSignatureAttributeCrosswalk(),
            window.fetchQepCaptureTargetsByVersion(result.project.id, result.version.id),
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
    window.consumeQepCaptureDeepLinkTarget = consumeQepCaptureDeepLinkTarget;
}
