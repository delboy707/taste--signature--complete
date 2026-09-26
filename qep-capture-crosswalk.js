// ===== QEP-CAPTURE ATTRIBUTE CROSSWALK (fetch) =====
// Thin IO wrapper around tss_shared.signature_attribute_map (canonical,
// migration 0025) and tss_shared.signature_key_alias (admin-curated
// additions, migration 0029) - read-only, RLS open to any authenticated
// caller (this is global reference data, same posture as the lexicon
// tables, not org-scoped). Feeds target-prefill.js's
// buildCrosswalkIndex (one code -> every slider key), which is the pure/unit-tested half of this
// - nothing in that module talks to Supabase, only this wrapper does.
//
// Returns { rows } with canonical rows BEFORE alias rows, so a
// variable_key collision resolves canonical-wins (mirrors qep-capture
// migration 0030's rule) when target-prefill.js builds its lookup.
// { error, transient? } - `transient` (targets-loaded.js's
// isTransientQepCaptureError, loaded later on the page) marks failures a
// retry can fix, e.g. a network blip; the "Start Full Evaluation" button
// retries only those.
function _crosswalkFailure(message, error, status) {
    const result = { error: message };
    const isTransient = typeof window !== 'undefined' && typeof window.isTransientQepCaptureError === 'function'
        ? window.isTransientQepCaptureError
        : null;
    if (isTransient && isTransient(error, status)) result.transient = true;
    return result;
}

async function fetchSignatureAttributeCrosswalk() {
    let client;
    try {
        client = getQepCaptureClient();
    } catch (err) {
        return { error: err.message };
    }

    let canonical, alias;
    try {
        [canonical, alias] = await Promise.all([
            client.schema('tss_shared').from('signature_attribute_map').select('signature_stage, signature_key, variable_key, kind'),
            client.schema('tss_shared').from('signature_key_alias').select('alias_stage, alias_key, variable_key, kind'),
        ]);
    } catch (err) {
        return _crosswalkFailure(err.message || 'Could not load the attribute crosswalk.', err, 0);
    }

    if (canonical.error) {
        return _crosswalkFailure(`Could not load the attribute crosswalk: ${canonical.error.message}`, canonical.error, canonical.status);
    }
    // The alias table is a smaller, newer addition - tolerate it being
    // unreadable/missing without failing the whole prefill; canonical
    // coverage alone (100% verified at authoring time, migration 0025) is
    // already usable on its own.
    const aliasRows = alias && !alias.error ? (alias.data || []) : [];

    const rows = (canonical.data || [])
        .map((r) => ({ signature_stage: r.signature_stage, signature_key: r.signature_key, variable_key: r.variable_key, kind: r.kind }))
        .concat(
            aliasRows.map((r) => ({ signature_stage: r.alias_stage, signature_key: r.alias_key, variable_key: r.variable_key, kind: r.kind }))
        );

    return { rows };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { fetchSignatureAttributeCrosswalk };
}
if (typeof window !== 'undefined') {
    window.fetchSignatureAttributeCrosswalk = fetchSignatureAttributeCrosswalk;
}
