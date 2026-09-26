// ===== TARGETS LOADED (QEP-CAPTURE) =====
// Read-only: given a qep-capture project/version, loads its locked
// version's targets (master-coded rows: variable_key + kind, and for Stage
// 2A.5 coded rows range_min = range_max = the 0-10 target; legacy Brief
// emotion rows carry intensity 'high' and no range) and stage notes, and
// shapes them against Signature's own SENSORY_STAGES ids. No writes anywhere in this file.
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

function toFiniteNumberOrNull(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuidLike(value) {
    return typeof value === 'string' && UUID_RE.test(value);
}

/**
 * List the caller's org's locked projects via
 * tss_shared.list_locked_projects() (qep-capture migration 0037). Returns
 * { projects: [{ project_id, name, latest_locked_version_id,
 * version_number, locked_at }] } on success, or { error, rpcMissing?, transient? } on
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

    let data, error, status;
    try {
        ({ data, error, status } = await client.schema('tss_shared').rpc('list_locked_projects'));
    } catch (err) {
        return _failure(err.message || 'Could not load locked projects.', err, 0);
    }

    if (error) {
        if (isRpcMissingError(error)) {
            return { error: 'The locked-projects list isn\'t available from qep-capture yet.', rpcMissing: true };
        }
        return _failure(`Could not load locked projects: ${error.message}`, error, status);
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

// HTTP statuses worth retrying: 0 = the request never got an answer
// (network, CORS preflight, a thrown accessToken()), plus timeouts, rate
// limiting and gateway/PostgREST-restarting errors.
const TRANSIENT_HTTP_STATUSES = [0, 408, 425, 429, 500, 502, 503, 504, 520];

/**
 * True when a qep-capture failure is likely to succeed if simply tried
 * again (network blip, PostgREST 503 while it reloads its schema cache, a
 * Clerk token or sign-in that is not ready YET). False for verdicts that a
 * retry cannot change: signed out, demo mode, a missing RPC, RLS/permission
 * denials, not-found. `error` is a supabase-js error object (or a message
 * string); `status` the response's HTTP status when known. The UI
 * (targets-loaded-ui.js) retries only these, a bounded number of times.
 */
function isTransientQepCaptureError(error, status) {
    const message = String((error && error.message) || (typeof error === 'string' ? error : '') || '');
    const code = (error && error.code) || '';
    if (/demo mode/i.test(message)) return false;
    if (/not signed in to qep yet/i.test(message)) return true;
    if (/not signed in/i.test(message)) return false;
    if (isRpcMissingError(error || {})) return false;
    if (code === 'PGRST002' || code === 'PGRST301') return true;
    if (typeof status === 'number' && TRANSIENT_HTTP_STATUSES.includes(status)) return true;
    return /failed to fetch|networkerror|network request failed|load failed|timed? ?out|schema cache/i.test(message);
}

function _failure(message, error, status) {
    const result = { error: message };
    if (isTransientQepCaptureError(error, status)) result.transient = true;
    return result;
}

/**
 * Shared loader: given an already-fetched project row and version row,
 * load the version's targets + stage notes and shape them. Never throws.
 */
async function _loadVersionTargets(client, project, version) {
    // Schemas matter: projects / project_versions / targets /
    // version_stage_notes live in tss_shared; categories and qep_attribute live
    // in public. PostgREST resolves an unqualified .from() against public only,
    // so a tss_shared table MUST go through .schema('tss_shared'). The
    // attribute labels are read with a second public query rather than a
    // cross-schema embed (targets -> public.qep_attribute), which PostgREST may
    // not resolve.
    const [categoryResult, targetsResult, notesResult] = await Promise.all([
        client.from('categories').select('name').eq('id', project.category_id).maybeSingle(),
        client
            .schema('tss_shared')
            .from('targets')
            .select('variable_key, role, intensity, range_min, range_max')
            .eq('version_id', version.id),
        client.schema('tss_shared').from('version_stage_notes').select('stage_key, notes').eq('version_id', version.id),
    ]);

    if (targetsResult.error) {
        return _failure(`Could not load targets: ${targetsResult.error.message}`, targetsResult.error, targetsResult.status);
    }
    if (notesResult.error) {
        return _failure(`Could not load stage notes: ${notesResult.error.message}`, notesResult.error, notesResult.status);
    }

    const variableKeys = [...new Set((targetsResult.data || []).map(r => r.variable_key).filter(Boolean))];
    const attributeById = {};
    if (variableKeys.length > 0) {
        const attrResult = await client
            .from('qep_attribute')
            .select('id, label, stage_key, kind, emotion_concept_id')
            .in('id', variableKeys);
        if (attrResult.error) {
            return _failure(`Could not load target attributes: ${attrResult.error.message}`, attrResult.error, attrResult.status);
        }
        for (const a of attrResult.data || []) attributeById[a.id] = a;
    }
    const targetRows = (targetsResult.data || []).map(r => ({ ...r, qep_attribute: attributeById[r.variable_key] || null }));

    const stages = {};
    for (const signatureId of Object.keys(QEP_CAPTURE_STAGE_KEY_BY_SIGNATURE_ID)) {
        stages[signatureId] = { targets: [], notes: '' };
    }
    // Targets that cannot be put on a Signature stage (no readable
    // qep_attribute row, or a stage key Signature does not have). Kept, not
    // dropped: target-prefill.js lists them as "not measurable".
    const unplacedTargets = [];

    for (const row of targetRows) {
        const attr = row.qep_attribute;
        const rangeMin = toFiniteNumberOrNull(row.range_min);
        const rangeMax = toFiniteNumberOrNull(row.range_max);
        const signatureId = attr && attr.stage_key
            ? Object.keys(QEP_CAPTURE_STAGE_KEY_BY_SIGNATURE_ID).find(
                (id) => QEP_CAPTURE_STAGE_KEY_BY_SIGNATURE_ID[id] === attr.stage_key
            )
            : null;
        if (!signatureId) {
            unplacedTargets.push({
                variableKey: row.variable_key,
                label: attr ? attr.label : null,
                kind: attr ? attr.kind || null : null,
                role: row.role,
                intensity: row.intensity,
                rangeMin,
                rangeMax,
                reason: attr ? `Unknown stage "${attr.stage_key}".` : 'Attribute code not found in qep_attribute.',
            });
            continue;
        }
        stages[signatureId].targets.push({
            label: attr.label,
            role: row.role,
            variableKey: row.variable_key,
            kind: attr.kind || null,
            intensity: row.intensity,
            rangeMin,
            rangeMax,
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
        unplacedTargets,
    };
}

/**
 * Fetch a SPECIFIC version's targets + stage notes (used by the picker,
 * the "Start Full Evaluation from this target" reload, and deep links -
 * all of which already know the exact version id, e.g. from
 * list_locked_projects()'s latest_locked_version_id). Validates both ids
 * are UUIDs first. Returns { error, transient? } on any failure - never throws.
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

    const { data: project, error: projectError, status: projectStatus } = await client
        .schema('tss_shared')
        .from('projects')
        .select('id, name, category_id')
        .eq('id', projectId)
        .maybeSingle();
    if (projectError) {
        return _failure(`Could not load project: ${projectError.message}`, projectError, projectStatus);
    }
    if (!project) {
        return { error: 'No project found with that id (or it is not visible to your organisation).' };
    }

    const { data: version, error: versionError, status: versionStatus } = await client
        .schema('tss_shared')
        .from('project_versions')
        .select('id, version_number, status, locked_at')
        .eq('id', versionId)
        .eq('project_id', projectId)
        .maybeSingle();
    if (versionError) {
        return _failure(`Could not load version: ${versionError.message}`, versionError, versionStatus);
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
 * Returns { error, transient? } on any failure (not-found, no version yet, RLS
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

    const { data: project, error: projectError, status: projectStatus } = await client
        .schema('tss_shared')
        .from('projects')
        .select('id, name, category_id, current_version_id')
        .eq('id', projectId)
        .maybeSingle();

    if (projectError) {
        return _failure(`Could not load project: ${projectError.message}`, projectError, projectStatus);
    }
    if (!project) {
        return { error: 'No project found with that id (or it is not visible to your organisation).' };
    }
    if (!project.current_version_id) {
        return { error: 'This project has no locked version yet.' };
    }

    const { data: version, error: versionError, status: versionStatus } = await client
        .schema('tss_shared')
        .from('project_versions')
        .select('id, version_number, status, locked_at')
        .eq('id', project.current_version_id)
        .maybeSingle();

    if (versionError) {
        return _failure(`Could not load version: ${versionError.message}`, versionError, versionStatus);
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
        isTransientQepCaptureError,
        QEP_CAPTURE_STAGE_KEY_BY_SIGNATURE_ID,
    };
}
if (typeof window !== 'undefined') {
    window.fetchQepCaptureTargets = fetchQepCaptureTargets;
    window.fetchQepCaptureTargetsByVersion = fetchQepCaptureTargetsByVersion;
    window.fetchLockedProjects = fetchLockedProjects;
    window.isQepCaptureUuidLike = isUuidLike;
    window.isTransientQepCaptureError = isTransientQepCaptureError;
}
