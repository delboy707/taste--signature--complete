// Repo-wide static guard: every Supabase .from()/.rpc() call on a known
// table/function must target the schema that object lives in. Catches an
// unscoped tss_shared query even in code no other test exercises
// (regression: 2026-09-24 "Could not find the table 'public.projects'").
// Run: node test/supabase-schema-scan.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { SCHEMA_OF_TABLE, SCHEMA_OF_RPC } = require('./helpers/strict-supabase');

const ROOT = path.join(__dirname, '..');

function scanSource(src) {
    const flat = src.replace(/\s+/g, ' ');
    const re = /(\.schema\('([a-z_]+)'\)\s*)?\.(from|rpc)\('([a-z_]+)'/g;
    const calls = [];
    let m;
    while ((m = re.exec(flat))) {
        const schema = m[2] || 'public';
        const kind = m[3];
        const name = m[4];
        const home = (kind === 'from' ? SCHEMA_OF_TABLE : SCHEMA_OF_RPC)[name];
        if (home) calls.push({ kind, name, schema, home });
    }
    return calls;
}

function appFiles() {
    const out = fs.readdirSync(ROOT).filter(f => f.endsWith('.js')).map(f => path.join(ROOT, f));
    const api = path.join(ROOT, 'api');
    if (fs.existsSync(api)) out.push(...fs.readdirSync(api).filter(f => f.endsWith('.js')).map(f => path.join(api, f)));
    return out;
}

test('every Supabase call in app code targets the schema its object lives in', () => {
    const mismatches = [];
    let checked = 0;
    for (const file of appFiles()) {
        for (const c of scanSource(fs.readFileSync(file, 'utf8'))) {
            checked++;
            if (c.schema !== c.home) mismatches.push(`${path.basename(file)}: ${c.kind}('${c.name}') in '${c.schema}', lives in '${c.home}'`);
        }
    }
    assert.ok(checked > 0, 'scanner found no Supabase calls at all - pattern broken?');
    assert.deepEqual(mismatches, []);
});

test('scanner flags the pre-fix pattern (unscoped tss_shared table)', () => {
    const calls = scanSource("const { data } = await client\n    .from('projects')\n    .select('id');");
    assert.deepEqual(calls, [{ kind: 'from', name: 'projects', schema: 'public', home: 'tss_shared' }]);
    const ok = scanSource("await client.schema('tss_shared').from('projects').select('id')");
    assert.equal(ok[0].schema, 'tss_shared');
});
