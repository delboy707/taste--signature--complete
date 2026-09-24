// Pure-ish unit tests for qep-capture-crosswalk.js - no real Supabase, no
// network. Run: node test/qep-capture-crosswalk.test.js

const test = require('node:test');
const assert = require('node:assert/strict');

function freshCrosswalk(clientFactory) {
    delete require.cache[require.resolve('../qep-capture-crosswalk.js')];
    global.window = { getQepCaptureClient: clientFactory };
    global.getQepCaptureClient = clientFactory;
    return require('../qep-capture-crosswalk.js');
}

function makeClient({ canonical, alias }) {
    return {
        schema: () => ({
            from: (table) => ({
                select: async () => (table === 'signature_attribute_map' ? canonical : alias),
            }),
        }),
    };
}

test('canonical rows come before alias rows, in order, for canonical-wins-on-conflict downstream', async () => {
    const { fetchSignatureAttributeCrosswalk } = freshCrosswalk(() =>
        makeClient({
            canonical: { data: [{ signature_stage: 'appearance', signature_key: 'canonicalKey', variable_key: 'vk_1', kind: 'emotion' }], error: null },
            alias: { data: [{ alias_stage: 'appearance', alias_key: 'aliasKey', variable_key: 'vk_1', kind: 'emotion' }], error: null },
        })
    );
    const result = await fetchSignatureAttributeCrosswalk();
    assert.equal(result.rows.length, 2);
    assert.equal(result.rows[0].signature_key, 'canonicalKey');
    assert.equal(result.rows[1].signature_key, 'aliasKey');
});

test('a canonical-table error fails the whole fetch', async () => {
    const { fetchSignatureAttributeCrosswalk } = freshCrosswalk(() =>
        makeClient({ canonical: { data: null, error: { message: 'permission denied' } }, alias: { data: [], error: null } })
    );
    const result = await fetchSignatureAttributeCrosswalk();
    assert.match(result.error, /permission denied/);
});

test('an alias-table error is tolerated - canonical rows alone still come back', async () => {
    const { fetchSignatureAttributeCrosswalk } = freshCrosswalk(() =>
        makeClient({
            canonical: { data: [{ signature_stage: 'aroma', signature_key: 'calm', variable_key: 'vk_2', kind: 'emotion' }], error: null },
            alias: { data: null, error: { message: 'relation does not exist' } },
        })
    );
    const result = await fetchSignatureAttributeCrosswalk();
    assert.equal(result.error, undefined);
    assert.deepEqual(result.rows, [{ signature_stage: 'aroma', signature_key: 'calm', variable_key: 'vk_2', kind: 'emotion' }]);
});

test('a client-construction failure is surfaced as a plain error, never throws', async () => {
    const { fetchSignatureAttributeCrosswalk } = freshCrosswalk(() => { throw new Error('not loaded'); });
    const result = await fetchSignatureAttributeCrosswalk();
    assert.match(result.error, /not loaded/);
});
