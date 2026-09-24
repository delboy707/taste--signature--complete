// Pure-ish unit tests for targets-loaded.js's data-fetch functions - no
// real Supabase, no network. A minimal fake query-builder stands in for
// the Supabase JS client (from().select().eq().maybeSingle(), etc.) and
// client.schema('tss_shared').rpc(name). Run: node test/targets-loaded.test.js

const test = require('node:test');
const assert = require('node:assert/strict');

function freshTargetsLoaded(clientFactory) {
    delete require.cache[require.resolve('../targets-loaded.js')];
    // targets-loaded.js calls the bare global `getQepCaptureClient()` (same
    // as it does in a browser <script> tag, where that resolves via
    // window) - in Node that has to be a real global, not just
    // global.window.getQepCaptureClient.
    global.window = { getQepCaptureClient: clientFactory };
    global.getQepCaptureClient = clientFactory;
    return require('../targets-loaded.js');
}

// Schema-strict client (test/helpers/strict-supabase.js): a tss_shared table
// queried without .schema('tss_shared') fails exactly like PostgREST does
// ("Could not find the table 'public.projects' in the schema cache"), and every
// such mistake is recorded in LAST_VIOLATIONS so tests can assert on it.
const { makeStrictClient } = require('./helpers/strict-supabase');
let LAST_VIOLATIONS = [];
let LAST_QUERIES = [];
function makeClient(opts = {}) {
    const { client, violations, queries } = makeStrictClient(opts);
    LAST_VIOLATIONS = violations;
    LAST_QUERIES = queries;
    return client;
}

const VALID_PROJECT_ID = '11111111-1111-1111-1111-111111111111';
const VALID_VERSION_ID = '22222222-2222-2222-2222-222222222222';

// ------------------------------------------------------------
// isUuidLike / validation
// ------------------------------------------------------------

test('isUuidLike accepts a real UUID and rejects obvious junk', () => {
    const { isUuidLike } = freshTargetsLoaded(() => ({}));
    assert.equal(isUuidLike(VALID_PROJECT_ID), true);
    assert.equal(isUuidLike('not-a-uuid'), false);
    assert.equal(isUuidLike(''), false);
    assert.equal(isUuidLike(null), false);
    assert.equal(isUuidLike(undefined), false);
    assert.equal(isUuidLike(12345), false);
});

test('fetchQepCaptureTargets rejects a malformed project id without ever calling the client', async () => {
    let clientBuilt = false;
    const { fetchQepCaptureTargets } = freshTargetsLoaded(() => { clientBuilt = true; return makeClient({}); });
    const result = await fetchQepCaptureTargets('not-a-uuid');
    assert.match(result.error, /valid project id/);
    assert.equal(clientBuilt, false);
});

test('fetchQepCaptureTargetsByVersion rejects malformed ids without ever calling the client', async () => {
    let clientBuilt = false;
    const { fetchQepCaptureTargetsByVersion } = freshTargetsLoaded(() => { clientBuilt = true; return makeClient({}); });
    const result = await fetchQepCaptureTargetsByVersion('nope', 'also-nope');
    assert.match(result.error, /Invalid project or version id/);
    assert.equal(clientBuilt, false);
});

// ------------------------------------------------------------
// fetchLockedProjects
// ------------------------------------------------------------

test('fetchLockedProjects returns the RPC rows on success', async () => {
    const rows = [{ project_id: VALID_PROJECT_ID, name: 'Zesty Cola', latest_locked_version_id: VALID_VERSION_ID, version_number: 2, locked_at: '2026-01-01T00:00:00Z' }];
    const { fetchLockedProjects } = freshTargetsLoaded(() =>
        makeClient({ rpcImpl: (name) => (name === 'list_locked_projects' ? { data: rows, error: null } : { data: null, error: { message: 'unexpected' } }) })
    );
    const result = await fetchLockedProjects();
    assert.deepEqual(result.projects, rows);
});

test('fetchLockedProjects returns an empty list without error when the caller\'s org has no locked projects', async () => {
    const { fetchLockedProjects } = freshTargetsLoaded(() => makeClient({ rpcImpl: () => ({ data: [], error: null }) }));
    const result = await fetchLockedProjects();
    assert.deepEqual(result.projects, []);
    assert.equal(result.error, undefined);
});

test('fetchLockedProjects flags a genuinely missing RPC (PGRST202) distinctly, via rpcMissing: true', async () => {
    const { fetchLockedProjects } = freshTargetsLoaded(() =>
        makeClient({ rpcImpl: () => ({ data: null, error: { code: 'PGRST202', message: 'Could not find the function tss_shared.list_locked_projects() in the schema cache' } }) })
    );
    const result = await fetchLockedProjects();
    assert.equal(result.rpcMissing, true);
    assert.ok(result.error);
});

test('fetchLockedProjects flags a raw Postgres undefined_function (42883) as rpcMissing too', async () => {
    const { fetchLockedProjects } = freshTargetsLoaded(() =>
        makeClient({ rpcImpl: () => ({ data: null, error: { code: '42883', message: 'function tss_shared.list_locked_projects() does not exist' } }) })
    );
    const result = await fetchLockedProjects();
    assert.equal(result.rpcMissing, true);
});

test('fetchLockedProjects treats any OTHER error as a normal (non-rpcMissing) error', async () => {
    const { fetchLockedProjects } = freshTargetsLoaded(() =>
        makeClient({ rpcImpl: () => ({ data: null, error: { code: '42501', message: 'permission denied' } }) })
    );
    const result = await fetchLockedProjects();
    assert.equal(result.rpcMissing, undefined);
    assert.match(result.error, /permission denied/);
});

test('fetchLockedProjects surfaces a client-construction failure (e.g. Supabase JS not loaded) as a plain error', async () => {
    const { fetchLockedProjects } = freshTargetsLoaded(() => { throw new Error('QEP-Capture client: @supabase/supabase-js not loaded.'); });
    const result = await fetchLockedProjects();
    assert.match(result.error, /not loaded/);
});

// ------------------------------------------------------------
// fetchQepCaptureTargetsByVersion
// ------------------------------------------------------------

// Fixture target rows may carry a `qep_attribute` object for readability; the
// mock serves it the way the real database does: tss_shared.targets returns
// the bare row, and the attribute lives in public.qep_attribute keyed by id.
function versionTargetTables({ projectRow, versionRow, targetRows = [], noteRows = [], categoryRow = { name: 'Beverages' } }) {
    const attributes = {};
    for (const r of targetRows) if (r.qep_attribute) attributes[r.variable_key] = { id: r.variable_key, ...r.qep_attribute };
    return {
        projects: (filters) => ({ data: filters.id === projectRow?.id ? projectRow : null, error: null }),
        project_versions: (filters) => ({ data: versionRow && filters.id === versionRow.id ? versionRow : null, error: null }),
        categories: () => ({ data: categoryRow, error: null }),
        targets: () => ({ data: targetRows.map(({ qep_attribute, ...bare }) => bare), error: null }),
        qep_attribute: (filters) => {
            const ids = (filters.id && filters.id.in) || [];
            return { data: ids.filter(id => attributes[id]).map(id => attributes[id]), error: null };
        },
        version_stage_notes: () => ({ data: noteRows, error: null }),
    };
}

test('fetchQepCaptureTargetsByVersion shapes emotion targets (with variableKey + intensity) and stage notes by Signature stage id', async () => {
    const projectRow = { id: VALID_PROJECT_ID, name: 'Zesty Cola', category_id: 'cat-1' };
    const versionRow = { id: VALID_VERSION_ID, version_number: 4, status: 'locked', locked_at: '2026-01-01T00:00:00Z' };
    const targetRows = [
        { variable_key: 'ap_emo_excitement', role: 'primary', intensity: 'high', qep_attribute: { label: 'Excitement', stage_key: 'ap', emotion_concept_id: 'excitement' } },
        { variable_key: 'ar_emo_calm', role: 'secondary', intensity: 'high', qep_attribute: { label: 'Calm', stage_key: 'ar', emotion_concept_id: 'calm' } },
    ];
    const noteRows = [{ stage_key: 'tx', notes: 'Rich mouthcoating; smooth melt' }];

    const { fetchQepCaptureTargetsByVersion } = freshTargetsLoaded(() =>
        makeClient({ tables: versionTargetTables({ projectRow, versionRow, targetRows, noteRows }) })
    );

    const result = await fetchQepCaptureTargetsByVersion(VALID_PROJECT_ID, VALID_VERSION_ID);

    assert.equal(result.project.name, 'Zesty Cola');
    assert.equal(result.project.categoryName, 'Beverages');
    assert.equal(result.version.versionNumber, 4);
    assert.equal(result.stages.appearance.emotions.length, 1);
    assert.deepEqual(result.stages.appearance.emotions[0], { label: 'Excitement', role: 'primary', variableKey: 'ap_emo_excitement', intensity: 'high' });
    assert.equal(result.stages.aroma.emotions[0].variableKey, 'ar_emo_calm');
    assert.equal(result.stages.texture.notes, 'Rich mouthcoating; smooth melt');
    // Every one of the 7 stages is always present, even with no data.
    assert.deepEqual(Object.keys(result.stages).sort(), ['aftertaste', 'appearance', 'aroma', 'frontMouth', 'midRearMouth', 'overall', 'texture'].sort());
    assert.deepEqual(result.stages.overall, { emotions: [], notes: '' });
});

test('fetchQepCaptureTargetsByVersion: project not visible to caller (RLS) -> clear not-found error, no throw', async () => {
    const { fetchQepCaptureTargetsByVersion } = freshTargetsLoaded(() =>
        makeClient({ tables: versionTargetTables({ projectRow: null, versionRow: null }) })
    );
    const result = await fetchQepCaptureTargetsByVersion(VALID_PROJECT_ID, VALID_VERSION_ID);
    assert.match(result.error, /No project found/);
});

test('fetchQepCaptureTargetsByVersion: version does not belong to that project -> clear not-found error', async () => {
    const projectRow = { id: VALID_PROJECT_ID, name: 'Zesty Cola', category_id: 'cat-1' };
    const { fetchQepCaptureTargetsByVersion } = freshTargetsLoaded(() =>
        makeClient({ tables: versionTargetTables({ projectRow, versionRow: null }) })
    );
    const result = await fetchQepCaptureTargetsByVersion(VALID_PROJECT_ID, VALID_VERSION_ID);
    assert.match(result.error, /Version not found/);
});

test('fetchQepCaptureTargets (manual fallback) still works via project.current_version_id, unaffected by the picker split', async () => {
    const projectRow = { id: VALID_PROJECT_ID, name: 'Zesty Cola', category_id: 'cat-1', current_version_id: VALID_VERSION_ID };
    const versionRow = { id: VALID_VERSION_ID, version_number: 1, status: 'locked', locked_at: null };
    const { fetchQepCaptureTargets } = freshTargetsLoaded(() =>
        makeClient({ tables: versionTargetTables({ projectRow, versionRow }) })
    );
    const result = await fetchQepCaptureTargets(VALID_PROJECT_ID);
    assert.equal(result.project.name, 'Zesty Cola');
    assert.equal(result.version.id, VALID_VERSION_ID);
});

// ------------------------------------------------------------
// Schema correctness (regression: 2026-09-24 "Could not find the table
// 'public.projects' in the schema cache")
// ------------------------------------------------------------

test('every query targets the schema its table lives in (tss_shared tables via .schema(\'tss_shared\'))', async () => {
    const projectRow = { id: VALID_PROJECT_ID, name: 'Zesty Cola', category_id: 'cat-1', current_version_id: VALID_VERSION_ID };
    const versionRow = { id: VALID_VERSION_ID, version_number: 4, status: 'locked', locked_at: '2026-01-01T00:00:00Z' };
    const targetRows = [{ variable_key: 'ap_emo_excitement', role: 'primary', intensity: 'high', qep_attribute: { label: 'Excitement', stage_key: 'ap', emotion_concept_id: 'excitement' } }];

    for (const run of [
        (m) => m.fetchQepCaptureTargetsByVersion(VALID_PROJECT_ID, VALID_VERSION_ID),
        (m) => m.fetchQepCaptureTargets(VALID_PROJECT_ID),
    ]) {
        const mod = freshTargetsLoaded(() => makeClient({ tables: versionTargetTables({ projectRow, versionRow, targetRows }) }));
        const result = await run(mod);
        assert.equal(result.error, undefined, `load failed: ${result.error}`);
        assert.deepEqual(LAST_VIOLATIONS, []);
        const seen = LAST_QUERIES.map(q => `${q.schema}.${q.table}`).sort();
        for (const t of ['tss_shared.projects', 'tss_shared.project_versions', 'tss_shared.targets', 'tss_shared.version_stage_notes', 'public.categories', 'public.qep_attribute']) {
            assert.ok(seen.includes(t), `expected a query on ${t}; saw ${seen.join(', ')}`);
        }
    }
});

test('strict mock: an unscoped tss_shared query fails the way PostgREST does', async () => {
    const { client, violations } = makeStrictClient({});
    const { error } = await client.from('projects').select('id').eq('id', VALID_PROJECT_ID).maybeSingle();
    assert.match(error.message, /Could not find the table 'public\.projects' in the schema cache/);
    assert.equal(violations.length, 1);
    const rpc = await client.rpc('list_locked_projects');
    assert.equal(rpc.error.code, 'PGRST202');
});
