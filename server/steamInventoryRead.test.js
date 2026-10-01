import { describe, expect, it, vi } from 'vitest';
import { decodeSteamInventory, fetchSteamInventory } from './steamInventoryRead.js';

const request = { steamId: '76561198000000000', key: 'test-key', appId: 4957040 };
const item = { itemid: '17212166272724458', itemdefid: '4001', quantity: '1' };
const decode = (rows) => decodeSteamInventory({ response: { item_json: JSON.stringify(rows) } });

describe('Steam inventory evidence', () => {
    it.each([
        { itemid: '18446744073709551616' }, { itemid: '' }, { itemid: '0' },
        { itemdefid: true }, { itemdefid: '1e3' }, { quantity: true },
        { quantity: '' }, { quantity: 1.5 }, { quantity: '9007199254740992' }
    ])('rejects unsafe item values %j', (changed) => {
        expect(decode([{ ...item, ...changed }])).toMatchObject({ ok: false });
    });

    it('uses a stable unknown acquisition date rather than inventing a new acquisition on every refresh', () => {
        expect(decode([{ ...item, acquired: 'unknown' }])).toMatchObject({
            ok: true, inventory: [{ acquiredAt: 0 }]
        });
    });

    it.each([{ key: '' }, { appId: 0 }, { steamId: 'invalid' }])('does not call Steam with missing/invalid configuration %j', async (changed) => {
        const fetchImpl = vi.fn();
        expect(await fetchSteamInventory({ ...request, ...changed, fetchImpl })).toMatchObject({ ok: false });
        expect(fetchImpl).not.toHaveBeenCalled();
    });

    it('reports HTTP failure without treating it as an empty inventory', async () => {
        const fetchImpl = vi.fn().mockResolvedValue(new Response('private upstream detail', { status: 503 }));
        expect(await fetchSteamInventory({ ...request, fetchImpl })).toEqual({ ok: false, status: 502, reason: 'steam_api_error' });
    });

    it('bounds a stuck fetch and returns a safe retry failure', async () => {
        const fetchImpl = (_url, { signal }) => new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(new Error('private timeout detail')), { once: true });
        });
        expect(await fetchSteamInventory({ ...request, fetchImpl, timeoutMs: 5 })).toEqual({ ok: false, status: 502, reason: 'steam_request_failed' });
    });
});
