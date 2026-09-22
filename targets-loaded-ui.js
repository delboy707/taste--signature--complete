// ===== TARGETS LOADED UI (QEP-CAPTURE) =====
// Renders the read-only "Targets loaded" panel: enter a qep-capture
// project id, see its locked version's emotion targets and stage notes
// laid out against the 7 Journey-of-Taste stages. No import step, no
// writes - see targets-loaded.js for the data fetch.

function renderTargetsLoadedDashboard() {
    const container = document.getElementById('targets-loaded-content');
    if (!container) return;

    const lastId = window.localStorage.getItem('qepCaptureLastProjectId') || '';

    container.innerHTML = `
        <div class="card" style="max-width: 640px; margin-bottom: 20px;">
            <p style="color: #666; margin-bottom: 12px;">
                Read-only preview of a Brief project's locked targets from
                qep-capture - no import, nothing is saved to this product.
            </p>
            <div style="display: flex; gap: 8px;">
                <input
                    type="text"
                    id="qep-capture-project-id-input"
                    placeholder="qep-capture project id (uuid)"
                    value="${lastId.replace(/"/g, '&quot;')}"
                    style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-family: monospace;"
                />
                <button id="qep-capture-load-btn" class="btn btn-primary">Load targets</button>
            </div>
        </div>
        <div id="targets-loaded-results"></div>
    `;

    document.getElementById('qep-capture-load-btn').addEventListener('click', handleLoadQepCaptureTargets);
    document.getElementById('qep-capture-project-id-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleLoadQepCaptureTargets();
    });

    if (lastId) {
        handleLoadQepCaptureTargets();
    }
}

async function handleLoadQepCaptureTargets() {
    const input = document.getElementById('qep-capture-project-id-input');
    const resultsEl = document.getElementById('targets-loaded-results');
    const projectId = (input.value || '').trim();

    if (!projectId) {
        resultsEl.innerHTML = '<p style="color: #b00;">Enter a project id.</p>';
        return;
    }

    window.localStorage.setItem('qepCaptureLastProjectId', projectId);
    resultsEl.innerHTML = '<p style="color: #666;">Loading&hellip;</p>';

    const result = await window.fetchQepCaptureTargets(projectId);

    if (result.error) {
        resultsEl.innerHTML = `<p style="color: #b00;">${escapeHtml(result.error)}</p>`;
        return;
    }

    resultsEl.innerHTML = renderTargetsLoadedResult(result);
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

    const testInCaptureHtml =
        version.status === 'locked'
            ? `<a href="${escapeHtml(buildCaptureHandoffUrl(version.id))}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="display: inline-block; margin-bottom: 16px; text-decoration: none;">Test in Capture</a>`
            : '';

    return `
        <div class="card">
            <h3 style="margin-top: 0;">${escapeHtml(project.name)}</h3>
            <p style="color: #666; margin-bottom: 16px;">
                ${escapeHtml(project.categoryName)} &middot; v${version.versionNumber} &middot;
                ${escapeHtml(version.status)}${version.lockedAt ? ' &middot; locked ' + escapeHtml(new Date(version.lockedAt).toLocaleDateString()) : ''}
            </p>
            ${testInCaptureHtml}
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

function buildCaptureHandoffUrl(versionId) {
    const base =
        (window.QEP_CAPTURE_CONFIG && window.QEP_CAPTURE_CONFIG.CAPTURE_APP_URL) ||
        'https://capture.qeptss.com';
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
}
