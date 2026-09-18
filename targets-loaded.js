// ===== TARGETS LOADED (QEP-CAPTURE) =====
// Read-only: given a qep-capture project id, loads its current (locked)
// version's emotion targets and stage notes and shapes them against
// Signature's own SENSORY_STAGES ids. No writes anywhere in this file.
// Does not touch Batch Import, the existing export pipeline, or any
// scoring code - this is a standalone view.

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

/**
 * Fetch a project's current locked version's targets + stage notes from
 * qep-capture, shaped as:
 *   {
 *     project: { id, name, categoryName },
 *     version: { id, versionNumber, status, lockedAt },
 *     stages: {
 *       <signatureStageId>: { emotions: [{ label, role }], notes: string }
 *     }
 *   }
 * Returns { error: string } on any failure (not-found, no locked
 * version, RLS denial, network) - never throws, so the UI layer can
 * render a plain message either way.
 */
async function fetchQepCaptureTargets(projectId) {
    if (!projectId || typeof projectId !== 'string') {
        return { error: 'Enter a qep-capture project id.' };
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

    const [categoryResult, targetsResult, notesResult] = await Promise.all([
        client.from('categories').select('name').eq('id', project.category_id).maybeSingle(),
        client
            .from('targets')
            .select('variable_key, role, qep_attribute:variable_key(label, stage_key, emotion_concept_id)')
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
        stages[signatureId].emotions.push({ label: attr.label, role: row.role });
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

if (typeof window !== 'undefined') {
    window.fetchQepCaptureTargets = fetchQepCaptureTargets;
}
