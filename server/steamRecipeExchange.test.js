import { describe, expect, it, vi } from 'vitest';
import { performSteamRecipeExchange, planSteamRecipe } from './steamRecipeExchange.js';

const input = { steamId: '76561198000000000', appId: 4957040, key: 'test-key', requestId: 'craft-1', recipeId: 2200, materials: ['1', '2'] };
const rows = [{ itemid: '1', itemdefid: 1000, quantity: 20 }, { itemid: '2', itemdefid: 1100, quantity: 5 }];
const reply = (items) => new Response(JSON.stringify({ response: { item_json: JSON.stringify(items) } }));
function fixture({ exchange, failSave = false } = {}) {
    const records = new Map();
    const read = (key) => records.get(key);
    const save = vi.fn(async (key, record) => {
        if (failSave) throw new Error('disk unavailable');
        records.set(key, structuredClone(record));
    });
    const fetchImpl = vi.fn(async (url, options) => {
        if (url.includes('/GetInventory/')) return reply(rows);
        return exchange ? exchange(url, options) : reply([
            { ...rows[0], quantity: 10 }, { ...rows[1], quantity: 3 },
            { itemid: '3', itemdefid: 2200, quantity: 1 }
        ]);
    });
    return { records, read, save, fetchImpl };
}

describe('live fixed/cache recipe exchange', () => {
    it('accepts removed-material evidence without inventing its missing quantity', async () => {
        const f = fixture({ exchange: () => reply([
            { itemid: '1', state: 'removed' }, { itemid: '2', state: 'removed' },
            { itemid: '3', itemdefid: 2200, quantity: 1 }
        ]) });
        expect(await performSteamRecipeExchange({ ...input, ...f })).toMatchObject({
            status: 200, body: { granted: [{ itemId: '3', quantity: 1 }] }
        });
    });
    it('spends exact stack quantities and reports only the new reward, never remaining materials', async () => {
        const f = fixture();
        const result = await performSteamRecipeExchange({ ...input, ...f });
        expect(result).toMatchObject({ status: 200, body: { ok: true, consumed: ['1', '2'], granted: [{ itemId: '3', itemdefid: 2200, quantity: 1 }] } });
        expect(result.body.granted).toHaveLength(1);
        const [url, options] = f.fetchImpl.mock.calls[1];
        expect(url).toContain('/ExchangeItem/v1/');
        expect(options.body.get('materialsquantity[0]')).toBe('10');
        expect(options.body.get('materialsquantity[1]')).toBe('2');
        expect(options.signal).toBeInstanceOf(AbortSignal);
        expect(f.save.mock.calls[0][1]).toMatchObject({ state: 'submitted_unknown', plan: { consumed: [{ quantity: 10 }, { quantity: 2 }] } });
        expect([...f.records.values()][0].state).toBe('completed');
        expect(await performSteamRecipeExchange({ ...input, ...f })).toMatchObject(result);
        expect(f.fetchImpl).toHaveBeenCalledTimes(2);
    });

    it.each([
        ['transport loss', () => { throw new Error('private-key in URL'); }],
        ['HTTP error', () => new Response('failed', { status: 503 })],
        ['malformed body', () => new Response('{}')],
        ['Steam rejection', () => new Response(JSON.stringify({ response: { success: false } }))],
        ['empty exchange', () => reply([])],
        ['wrong reward', () => reply([{ itemid: '3', itemdefid: 9999, quantity: 1 }])]
    ])('retains a durable review hold after %s and never repeats the mutation', async (_label, exchange) => {
        const f = fixture({ exchange });
        const result = await performSteamRecipeExchange({ ...input, ...f });
        expect(result).toMatchObject({ status: 409, body: { ok: false, reason: 'exchange_outcome_requires_review' } });
        expect(JSON.stringify(result)).not.toContain('private-key');
        expect(await performSteamRecipeExchange({ ...input, ...f })).toMatchObject(result);
        expect(await performSteamRecipeExchange({ ...input, ...f, requestId: 'fresh-click' })).toMatchObject(result);
        expect(f.fetchImpl).toHaveBeenCalledTimes(2);
        expect([...f.records.values()][0].state).toBe('submitted_unknown');
    });

    // 2026-10-05: one rejected cache open (the 4002 itemdef had no exchange
    // recipe) left the account's active fence at submitted_unknown forever, so
    // every later open or craft answered 409. Once Steam's inventory has had
    // time to settle, materials still present at their pre-exchange quantities
    // prove the attempt was never applied, and a new request may proceed.
    describe('stuck review hold reconciliation', () => {
        const later = (ms) => () => Date.now() + ms;
        async function stuck() {
            const f = fixture({ exchange: () => new Response(JSON.stringify({ response: { success: false } })) });
            const first = await performSteamRecipeExchange({ ...input, ...f });
            expect(first).toMatchObject({ status: 409, body: { reason: 'exchange_outcome_requires_review' } });
            return f;
        }

        it('records the materials\' quantities before the exchange', async () => {
            const f = await stuck();
            expect(f.save.mock.calls[0][1].plan.before).toEqual([{ itemId: '1', quantity: 20 }, { itemId: '2', quantity: 5 }]);
        });

        it('keeps the hold, without re-reading Steam, until the inventory has settled', async () => {
            const f = await stuck();
            const result = await performSteamRecipeExchange({ ...input, ...f, requestId: 'fresh-click', now: later(30_000) });
            expect(result).toMatchObject({ status: 409, body: { reason: 'exchange_outcome_requires_review' } });
            expect(f.fetchImpl).toHaveBeenCalledTimes(2);
        });

        it('releases the hold when every material is still there and runs the new request', async () => {
            const f = await stuck();
            const exchange = vi.fn(() => reply([
                { ...rows[0], quantity: 10 }, { ...rows[1], quantity: 3 }, { itemid: '3', itemdefid: 2200, quantity: 1 }
            ]));
            f.fetchImpl.mockImplementation(async (url, options) => (url.includes('/GetInventory/') ? reply(rows) : exchange(url, options)));
            const result = await performSteamRecipeExchange({ ...input, ...f, requestId: 'fresh-click', now: later(180_000) });
            expect(result).toMatchObject({ status: 200, body: { ok: true } });
            expect(exchange).toHaveBeenCalledTimes(1);
            const states = [...f.records.entries()].map(([key, value]) => [key.startsWith('recipe-exchange-active') ? 'active' : key, value.state]);
            expect(states.find(([key, state]) => key !== 'active' && state === 'not_applied')).toBeTruthy();
            expect(states.find(([key]) => key === 'active')[1]).toBe('completed');
        });

        it('keeps the hold when any material was consumed', async () => {
            const f = await stuck();
            f.fetchImpl.mockImplementation(async (url) => (url.includes('/GetInventory/')
                ? reply([{ ...rows[0], quantity: 10 }, rows[1]])
                : reply([])));
            const result = await performSteamRecipeExchange({ ...input, ...f, requestId: 'fresh-click', now: later(180_000) });
            expect(result).toMatchObject({ status: 409, body: { reason: 'exchange_outcome_requires_review' } });
            expect(f.fetchImpl.mock.calls.filter(([url]) => url.includes('/ExchangeItem/'))).toHaveLength(1);
        });
    });

    it('cannot mutate when the preflight journal cannot be persisted', async () => {
        const f = fixture({ failSave: true });
        expect(await performSteamRecipeExchange({ ...input, ...f })).toMatchObject({ status: 503 });
        expect(f.fetchImpl).toHaveBeenCalledTimes(1);
    });

    it('does not repeat Steam after a successful exchange whose completion write fails', async () => {
        const f = fixture();
        const persist = f.save;
        f.save = async (key, record) => {
            if (record.state === 'completed') throw new Error('disk unavailable');
            return persist(key, record);
        };
        expect((await performSteamRecipeExchange({ ...input, ...f })).status).toBe(409);
        expect((await performSteamRecipeExchange({ ...input, ...f })).status).toBe(409);
        expect(f.fetchImpl).toHaveBeenCalledTimes(2);
    });

    it('binds a request to its immutable recipe and material identities', async () => {
        const f = fixture();
        await performSteamRecipeExchange({ ...input, ...f });
        expect(await performSteamRecipeExchange({ ...input, ...f, recipeId: 2100 })).toMatchObject({ status: 409, body: { reason: 'exchange_request_conflict' } });
        expect(f.fetchImpl).toHaveBeenCalledTimes(2);
    });

    it('does not return another account’s cached reward for the same caller nonce', async () => {
        const f = fixture();
        await performSteamRecipeExchange({ ...input, ...f });
        await performSteamRecipeExchange({ ...input, ...f, steamId: '76561198000000001' });
        expect(f.fetchImpl).toHaveBeenCalledTimes(4);
        expect(f.records.size).toBe(4);
    });

    it('blocks overlapping exchange attempts while the same player is busy', async () => {
        let release;
        const gate = new Promise((resolve) => { release = resolve; });
        const f = fixture({ exchange: async () => { await gate; return reply([{ itemid: '3', itemdefid: 2200, quantity: 1 }]); } });
        const first = performSteamRecipeExchange({ ...input, ...f });
        await vi.waitFor(() => expect(f.fetchImpl).toHaveBeenCalledTimes(2));
        try {
            expect(await performSteamRecipeExchange({ ...input, ...f })).toMatchObject({ status: 409, body: { reason: 'exchange_in_progress' } });
        } finally { release(); }
        expect((await first).status).toBe(200);
    });

    it('plans common-fragment crafting and cache opening across stacks without overspending', () => {
        expect(planSteamRecipe(2100, ['a', 'b'], [{ itemId: 'a', itemdefid: 1000, quantity: 3 }, { itemId: 'b', itemdefid: 1000, quantity: 10 }]))
            .toMatchObject({ consumed: [{ quantity: 3 }, { quantity: 2 }] });
        expect(planSteamRecipe(4100, ['a', 'b'], [{ itemId: 'a', itemdefid: 4000, quantity: 3 }, { itemId: 'b', itemdefid: 4001, quantity: 10 }]))
            .toMatchObject({ outputItemdefid: 4002, consumed: [{ quantity: 1 }, { quantity: 1 }] });
    });

    it.each([
        { recipeId: 9999 }, { materials: ['1', '1'] }, { materials: ['missing'] }, { materials: ['2'] }, { materials: [] }
    ])('rejects invalid/insufficient plans before mutation: %j', async (changed) => {
        const f = fixture();
        expect((await performSteamRecipeExchange({ ...input, ...f, ...changed })).status).toBe(400);
        expect(f.fetchImpl).toHaveBeenCalledTimes(1);
        expect(f.save).not.toHaveBeenCalled();
    });
});

// Doc 05 §3 duplicate protection: a cache that rolls a cosmetic the player
// already owns still grants it, plus Deep Core Shards by rarity. Before this,
// shards (the Dispensary's currency) had no source on Steam at all.
describe('cache-open duplicate shards', () => {
    const cacheInput = { ...input, requestId: 'open-1', recipeId: 4100, materials: ['11', '12'] };
    function cacheFixture({ owned = [], rolled, grantImpl } = {}) {
        const records = new Map();
        const inventory = [{ itemid: '11', itemdefid: 4000, quantity: 1 }, { itemid: '12', itemdefid: 4001, quantity: 1 }, ...owned];
        const fetchImpl = vi.fn(async (url) => {
            if (url.includes('/GetInventory/')) return reply(inventory);
            return reply([{ itemid: '11', state: 'removed' }, { itemid: '12', state: 'removed' }, rolled]);
        });
        return {
            records,
            read: (key) => records.get(key),
            save: vi.fn(async (key, record) => { records.set(key, structuredClone(record)); }),
            fetchImpl,
            grantImpl: grantImpl ?? vi.fn(async ({ itemdefid, quantity }) => ({ ok: true, granted: [{ itemId: 'shards', itemdefid, quantity }] }))
        };
    }

    it('grants the duplicate plus 100 shards for an owned legendary, once, with a stable request id', async () => {
        const f = cacheFixture({ owned: [{ itemid: '13', itemdefid: 2200, quantity: 1 }], rolled: { itemid: '14', itemdefid: 2200, quantity: 1 } });
        const result = await performSteamRecipeExchange({ ...cacheInput, ...f });
        expect(result.status).toBe(200);
        expect(result.body.granted.map((item) => item.itemdefid)).toEqual([2200, 4159]);
        expect(result.body.duplicateBonus).toEqual({ itemdefid: 4159, quantity: 100, ok: true });
        expect(f.grantImpl).toHaveBeenCalledTimes(1);
        const grant = f.grantImpl.mock.calls[0][0];
        expect(grant).toMatchObject({ steamId: input.steamId, itemdefid: 4159, quantity: 100, mode: 'stack', source: 'cache_duplicate' });
        expect(grant.requestId).toMatch(/^\d+$/);
        expect(await performSteamRecipeExchange({ ...cacheInput, ...f })).toMatchObject(result);
        expect(f.grantImpl).toHaveBeenCalledTimes(1);
    });

    it('grants no shards for a first copy or for fragments', async () => {
        for (const rolled of [{ itemid: '14', itemdefid: 2100, quantity: 1 }, { itemid: '14', itemdefid: 1100, quantity: 1 }]) {
            const f = cacheFixture({ owned: [{ itemid: '15', itemdefid: 1100, quantity: 4 }], rolled });
            const result = await performSteamRecipeExchange({ ...cacheInput, ...f });
            expect(result.status).toBe(200);
            expect(result.body.duplicateBonus).toBeUndefined();
            expect(f.grantImpl).not.toHaveBeenCalled();
        }
    });

    it('keeps the opened reward when the shard grant fails, and says so', async () => {
        const f = cacheFixture({
            owned: [{ itemid: '13', itemdefid: 2100, quantity: 1 }],
            rolled: { itemid: '14', itemdefid: 2100, quantity: 1 },
            grantImpl: vi.fn(async () => ({ ok: false, reason: 'steam_api_error' }))
        });
        const result = await performSteamRecipeExchange({ ...cacheInput, ...f });
        expect(result).toMatchObject({ status: 200, body: { ok: true, duplicateBonus: { itemdefid: 4159, quantity: 40, ok: false } } });
        expect(result.body.granted.map((item) => item.itemdefid)).toEqual([2100]);
    });
});
