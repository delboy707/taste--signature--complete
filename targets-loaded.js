// ===== TARGETS LOADED (QEP-CAPTURE) =====
// Read-only: given a qep-capture project/version, loads its locked
// version's emotion targets and stage notes and shapes them against
// Signature's own SENSORY_STAGES ids. No writes anywhere in this file.
// Does not touch Batch Import, the existing export pipeline, or any
// scoring code - this is a standalone view (plus the pure prefill mapping
// in target-prefill.js, which consumes this file's output).

// Signature stage id (sensory-attributes.js) -> qep-capture's
// qep_stage.stage_key. Same shape as tss-re1's STAGE_KEY_TO_PREFIX in
// emotions-master.ts, just the other direction and vocabulary.
const QEP_CAPTURE_STAGE_KEY_BY_SIGNATURE_ID = {
    appearance: 'ap',
    aroma: 'ar',
    frontMouth: 'fm',
    midRearMouth: 'mr',
    texture: 'tx',
    aftertaste: 'af',
    overall: 'overall',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuidLike(value) {
    return typeof value === 'string' && UUID_RE.test(value);
}

/**
 * List the caller's org's locked projects via
 * tss_shared.list_locked_projects() (qep-capture migration 0037). Returns
 * { projects: [{ project_id, name, latest_locked_version_id,
 * version_number, locked_at }] } on success, or { error, rpcMissing? } on
 * failure. `rpcMissing: true` specifically means the RPC itself doesn't
 * exist yet server-side (migration 0037 not applied) - distinct from any
 * other error (network, RLS, etc.) - so the UI can show a clearer message
 * and fall back to manual project-id entry. Never throws.
 */
async function fetchLockedProjects() {
    let client;
    try {
        client = getQepCaptureClient();
    } catch (err) {
        return { error: err.message };
    }

    let data, error;
    try {
        ({ data, error } = await client.schema('tss_shared').rpc('list_locked_projects'));
    } catch (err) {
        return { error: err.message || 'Could not load locked projects.' };
    }

    if (error) {
        if (isRpcMissingError(error)) {
            return { error: 'The locked-projects list isn\'t available from qep-capture yet.', rpcMissing: true };
        }
        return { error: `Could not load locked projects: ${error.message}` };
    }

    return { projects: data || [] };
}

// PostgREST reports a missing/uncached RPC as PGRST202 ("Could not find
// the function..."); a raw Postgres undefined_function is 42883. Match
// both, plus a text fallback, since which one surfaces depends on the
// client/proxy layer.
function isRpcMissingError(error) {
    const code = error && error.code;
    const message = ((error && error.message) || '').toLowerCase();
    return code === 'PGRST202' || code === '42883' || message.includes('could not find the function') || message.includes('does not exist');
}

/**
 * Shared loader: given an already-fetched project row and version row,
 * load the version's targets + stage notes and shape them. Never throws.
 */
async function _loadVersionTargets(client, project, version) {
    const [categoryResult, targetsResult, notesResult] = await Promise.all([
        client.from('categories').select('name').eq('id', project.category_id).maybeSingle(),
        client
            .from('targets')
            .select('variable_key, role, intensity, qep_attribute:variable_key(label, stage_key, emotion_concept_id)')
            .eq('version_id', version.id),
        client.from('version_stage_notes').select('stage_key, notes').eq('version_id', version.id),
    ]);

    if (targetsResult.error) {
        return { error: `Could not load targets: ${targetsResult.error.message}` };
    }
    if (notesResult.error) {
        return { error: `Could not load stage notes: ${notesResult.error.message}` };
    }

    const stages = {};
    for (const signatureId of Object.keys(QEP_CAPTURE_STAGE_KEY_BY_SIGNATURE_ID)) {
        stages[signatureId] = { emotions: [], notes: '' };
    }

    for (const row of targetsResult.data || []) {
        const attr = row.qep_attribute;
        if (!attr || !attr.stage_key) continue;
        const signatureId = Object.keys(QEP_CAPTURE_STAGE_KEY_BY_SIGNATURE_ID).find(
            (id) => QEP_CAPTURE_STAGE_KEY_BY_SIGNATURE_ID[id] === attr.stage_key
        );
        if (!signatureId) continue;
        stages[signatureId].emotions.push({
            label: attr.label,
            role: row.role,
            variableKey: row.variable_key,
            intensity: row.intensity,
        });
    }

    for (const row of notesResult.data || []) {
        const signatureId = Object.keys(QEP_CAPTURE_STAGE_KEY_BY_SIGNATURE_ID).find(
            (id) => QEP_CAPTURE_STAGE_KEY_BY_SIGNATURE_ID[id] === row.stage_key
        );
        if (!signatureId) continue;
        stages[signatureId].notes = row.notes || '';
    }

    return {
        project: {
            id: project.id,
            name: project.name,
            categoryName: categoryResult.data ? categoryResult.data.name : project.category_id,
        },
        version: {
            id: version.id,
            versionNumber: version.version_number,
            status: version.status,
            lockedAt: version.locked_at,
        },
        stages,
    };
}

/**
 * Fetch a SPECIFIC version's targets + stage notes (used by the picker,
 * the "Start Full Evaluation from this target" reload, and deep links -
 * all of which already know the exact version id, e.g. from
 * list_locked_projects()'s latest_locked_version_id). Validates both ids
 * are UUIDs first. Returns { error } on any failure - never throws.
 */
async function fetchQepCaptureTargetsByVersion(projectId, versionId) {
    if (!isUuidLike(projectId) || !isUuidLike(versionId)) {
        return { error: 'Invalid project or version id.' };
    }

    let client;
    try {
        client = getQepCaptureClient();
    } catch (err) {
        return { error: err.message };
    }

    const { data: project, error: projectError } = await client
        .from('projects')
        .select('id, name, category_id')
        .eq('id', projectId)
        .maybeSingle();
    if (projectError) {
        return { error: `Could not load project: ${projectError.message}` };
    }
    if (!project) {
        return { error: 'No project found with that id (or it is not visible to your organisation).' };
    }

    const { data: version, error: versionError } = await client
        .from('project_versions')
        .select('id, version_number, status, locked_at')
        .eq('id', versionId)
        .eq('project_id', projectId)
        .maybeSingle();
    if (versionError) {
        return { error: `Could not load version: ${versionError.message}` };
    }
    if (!version) {
        return { error: 'Version not found (or it does not belong to that project, or is not visible to your organisation).' };
    }

    return _loadVersionTargets(client, project, version);
}

/**
 * Fetch a project's CURRENT version's targets + stage notes, given only a
 * project id (the original, pre-picker manual-entry flow - kept as a
 * fallback for when the picker RPC is unavailable). `current_version_id`
 * may point at a draft version created by a later re-lock, not
 * necessarily the same version list_locked_projects() would show - by
 * design, this is the "whatever this project is on right now" view.
 * Returns { error } on any failure (not-found, no version yet, RLS
 * denial, network) - never throws.
 */
async function fetchQepCaptureTargets(projectId) {
    if (!projectId || typeof projectId !== 'string') {
        return { error: 'Enter a qep-capture project id.' };
    }
    if (!isUuidLike(projectId)) {
        return { error: 'That doesn\'t look like a valid project id (expected a UUID).' };
    }

    let client;
    try {
        client = getQepCaptureClient();
    } catch (err) {
        return { error: err.message };
    }

    const { data: project, error: projectError } = await client
        .from('projects')
        .select('id, name, category_id, current_version_id')
        .eq('id', projectId)
        .maybeSingle();

    if (projectError) {
        return { error: `Could not load project: ${projectError.message}` };
    }
    if (!project) {
        return { error: 'No project found with that id (or it is not visible to your organisation).' };
    }
    if (!project.current_version_id) {
        return { error: 'This project has no locked version yet.' };
    }

    const { data: version, error: versionError } = await client
        .from('project_versions')
        .select('id, version_number, status, locked_at')
        .eq('id', project.current_version_id)
        .maybeSingle();

    if (versionError) {
        return { error: `Could not load version: ${versionError.message}` };
    }
    if (!version) {
        return { error: 'Current version not found.' };
    }

    return _loadVersionTargets(client, project, version);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchQepCaptureTargets,
        fetchQepCaptureTargetsByVersion,
        fetchLockedProjects,
        isUuidLike,
        isRpcMissingError,
        QEP_CAPTURE_STAGE_KEY_BY_SIGNATURE_ID,
    };
}
if (typeof window !== 'undefined') {
    window.fetchQepCaptureTargets = fetchQepCaptureTargets;
    window.fetchQepCaptureTargetsByVersion = fetchQepCaptureTargetsByVersion;
    window.fetchLockedProjects = fetchLockedProjects;
    window.isQepCaptureUuidLike = isUuidLike;
}
