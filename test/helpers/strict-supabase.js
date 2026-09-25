// Strict, schema-aware Supabase client mock for tests.
//
// Why this exists: the earlier mocks answered client.from(t) and
// client.schema(anything).from(t) identically, so a query that forgot
// .schema('tss_shared') passed every test and then failed in production with
// PostgREST's "Could not find the table 'public.projects' in the schema cache"
// (2026-09-24). This mock behaves like PostgREST instead: every table and RPC
// lives in exactly one schema, and querying it from the wrong schema returns
// the same PGRST205 / PGRST202 error the real API returns. It also records
// each violation so a test can assert there were none.
//
// The schema map mirrors qep-capture's supabase/migrations (derived with
// `grep "create table ... tss_shared."`). Add new objects here when a
// migration adds them.

const SCHEMA_OF_TABLE = {
    // tss_shared (qep-capture migrations 0010, 0011, 0025-0029)
    projects: 'tss_shared',
    project_versions: 'tss_shared',
    targets: 'tss_shared',
    version_stage_notes: 'tss_shared',
    organisations: 'tss_shared',
    memberships: 'tss_shared',
    scores: 'tss_shared',
    signature_attribute_map: 'tss_shared',
    signature_key_alias: 'tss_shared',
    signature_profiles: 'tss_shared',
    signature_profiles_active: 'tss_shared',
    signature_profile_values: 'tss_shared',
    signature_unmapped_keys: 'tss_shared',
    // public
    categories: 'public',
    qep_attribute: 'public',
    qep_stage: 'public',
    qep_emotion_concept: 'public',
    qep_need_state: 'public',
    brief_emotion_cell: 'public',
    brief_emotion_family: 'public',
    attribute_category_relevance: 'public',
};

const SCHEMA_OF_RPC = {
    list_locked_projects: 'tss_shared',
    upsert_signature_profile: 'tss_shared',
    soft_delete_signature_profile: 'tss_shared',
    build_qep_export_row: 'tss_shared',
    provision_org: 'tss_shared',
    auth_user_org_ids: 'tss_shared',
    // Stage 2B Send to Capture (qep-capture migrations 0038 / 0031-0032)
    create_version_from_signature: 'tss_shared',
    create_study_from_version: 'public',
};

// PostgREST resource embedding (`alias:fk_col(cols)` / `table(cols)`) only
// resolves relationships inside the schema being queried. Flag any embed of a
// table that lives in a different schema.
function crossSchemaEmbeds(selectStr, querySchema) {
    const found = [];
    const re = /(?:([a-z_]+):)?([a-z_]+)\s*\(/gi;
    let m;
    while ((m = re.exec(String(selectStr || '')))) {
        const alias = m[1];
        const target = m[2];
        // `alias:fk_column(...)` embeds via a FK column: the alias usually names
        // the target table; check both names against the registry.
        for (const name of [alias, target]) {
            if (name && SCHEMA_OF_TABLE[name] && SCHEMA_OF_TABLE[name] !== querySchema) {
                found.push(name);
            }
        }
    }
    return found;
}

/**
 * @param {object} opts
 * @param {Record<string, (filters: object, mode: 'single'|'list', ctx: object) => {data:any,error:any}>} [opts.tables]
 * @param {(name: string, params: object) => {data:any,error:any}} [opts.rpcImpl]
 * @returns {{ client: object, violations: string[], queries: object[] }}
 */
function makeStrictClient({ tables = {}, rpcImpl = null, accessToken = null } = {}) {
    const violations = [];
    const queries = [];

    // Auth, like the real Supabase gateway: when the client was built with an
    // accessToken() callback (qep-capture-client.js is), every request calls
    // it. A null/empty token means supabase-js falls back to the anon key, and
    // anon has no USAGE on tss_shared, so PostgREST answers 42501
    // "permission denied for schema tss_shared" (2026-09-24 production bug).
    async function authFor(schema) {
        if (!accessToken) return null;
        let token;
        try {
            token = await accessToken();
        } catch (err) {
            return { data: null, error: { code: '', message: `${(err && err.message) || err}` } };
        }
        if (!token && schema === 'tss_shared') {
            violations.push(`tss_shared call made without a Clerk token (sent as anon)`);
            return { data: null, error: { code: '42501', message: 'permission denied for schema tss_shared' } };
        }
        return null;
    }

    function builder(schema, tableName) {
        const state = { schema, table: tableName, filters: {}, select: '' };
        queries.push(state);

        function result(mode) {
            const home = SCHEMA_OF_TABLE[tableName];
            if (!home) {
                violations.push(`unknown table ${schema}.${tableName}`);
                return { data: null, error: { code: 'PGRST205', message: `Could not find the table '${schema}.${tableName}' in the schema cache` } };
            }
            if (home !== schema) {
                violations.push(`${tableName} queried in schema '${schema}' (lives in '${home}')`);
                return { data: null, error: { code: 'PGRST205', message: `Could not find the table '${schema}.${tableName}' in the schema cache` } };
            }
            const bad = crossSchemaEmbeds(state.select, schema);
            if (bad.length) {
                violations.push(`cross-schema embed of ${bad.join(', ')} from ${schema}.${tableName}`);
                return { data: null, error: { code: 'PGRST200', message: `Could not find a relationship between '${tableName}' and '${bad[0]}' in the schema cache` } };
            }
            const impl = tables[tableName];
            if (!impl) return mode === 'single' ? { data: null, error: null } : { data: [], error: null };
            return impl(state.filters, mode, state);
        }

        const chain = {
            select(cols) { state.select = cols || ''; return chain; },
            eq(col, val) { state.filters[col] = val; return chain; },
            in(col, vals) { state.filters[col] = { in: vals }; return chain; },
            order() { return chain; },
            limit() { return chain; },
            maybeSingle: async () => (await authFor(schema)) || result('single'),
            single: async () => (await authFor(schema)) || result('single'),
            then(resolve, reject) { authFor(schema).then(a => a || result('list')).then(resolve, reject); },
        };
        return chain;
    }

    async function rpc(schema, name, params) {
        const denied = await authFor(schema);
        if (denied) return denied;
        const home = SCHEMA_OF_RPC[name];
        if (home !== schema) {
            violations.push(`rpc ${name} called in schema '${schema}' (lives in '${home || 'unknown'}')`);
            return Promise.resolve({ data: null, error: { code: 'PGRST202', message: `Could not find the function ${schema}.${name} without parameters in the schema cache` } });
        }
        return Promise.resolve(rpcImpl ? rpcImpl(name, params) : { data: null, error: { message: `unexpected rpc ${name}` } });
    }

    const client = {
        from: (t) => builder('public', t),
        rpc: (name, params) => rpc('public', name, params),
        schema: (s) => ({
            from: (t) => builder(s, t),
            rpc: (name, params) => rpc(s, name, params),
        }),
    };
    return { client, violations, queries };
}

module.exports = { makeStrictClient, SCHEMA_OF_TABLE, SCHEMA_OF_RPC, crossSchemaEmbeds };
