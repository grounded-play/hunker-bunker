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
