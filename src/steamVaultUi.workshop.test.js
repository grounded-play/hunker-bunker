import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Session 2026-10-06 (Deck, Steam): the Fragment Workshop showed 0 fragments
// with 3 Common Relic Fragments in the Steam inventory, and every recipe said
// "Service required". It read only the browser build's local ledger. The
// Steam schema already defines both recipes (2100: 1000x5, 2200: 1000x10 +
// 1100x2) and the backend already runs them as inventory exchanges.
describe('Fragment Workshop on a Steam build', () => {
    let api;

    beforeEach(() => {
        api = {
            getSteamIdentity: vi.fn(async () => ({ active: true, steamId64: '76561198000000099' })),
            getSteamMarketEligibility: vi.fn(async () => ({ ok: true, allowed: true })),
            refreshSteamInventory: vi.fn(async () => ({ ok: true, inventory: [
                { itemId: 'frag-a', itemdefid: 1000, quantity: 3 },
                { itemId: 'frag-b', itemdefid: 1000, quantity: 4 },
                { itemId: 'rare-a', itemdefid: 1100, quantity: 2 },
                { itemId: 'key-a', itemdefid: 4001, quantity: 9 }
            ], capabilities: [] })),
            exchangeSteamInventory: vi.fn(async () => ({ ok: true, granted: [{ itemId: 'decal-1', itemdefid: 2100, quantity: 1 }] }))
        };
        globalThis.window = {
            electronAPI: api,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
            localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }
        };
        globalThis.localStorage = globalThis.window.localStorage;
    });

    // The module builds DOM at import, so the stand-in document arrives after.
    async function load() {
        const mod = await import('./steamVaultUi.js');
        globalThis.document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };
        return mod;
    }

    afterEach(() => {
        delete globalThis.window;
        delete globalThis.localStorage;
        delete globalThis.document;
        vi.resetModules();
    });

    it('picks just enough fragment stacks to cover a recipe', async () => {
        const { pickRecipeMaterials } = await load();
        const items = [
            { itemId: 'frag-a', itemdefid: 1000, quantity: 3 },
            { itemId: 'frag-b', itemdefid: 1000, quantity: 4 },
            { itemId: 'rare-a', itemdefid: 1100, quantity: 2 }
        ];
        expect(pickRecipeMaterials(items, [{ itemdefid: 1000, quantity: 5 }])).toEqual(['frag-a', 'frag-b']);
        expect(pickRecipeMaterials(items, [{ itemdefid: 1000, quantity: 3 }])).toEqual(['frag-a']);
        expect(pickRecipeMaterials(items, [{ itemdefid: 1000, quantity: 10 }, { itemdefid: 1100, quantity: 2 }])).toBeNull();
    });

    it('counts fragments from the Steam inventory', async () => {
        const { getSeasonWorkshopInventory, loadVaultData } = await load();
        await loadVaultData();
        const { items } = getSeasonWorkshopInventory();
        expect(items.filter((i) => i.itemdefid === 1000).reduce((n, i) => n + i.quantity, 0)).toBe(7);
    });

    it('crafts through the Steam inventory exchange with the stacks it needs', async () => {
        const { craftSeasonRecipe, loadVaultData } = await load();
        await loadVaultData();
        const result = await craftSeasonRecipe(2100);
        expect(result).toMatchObject({ ok: true });
        expect(api.exchangeSteamInventory).toHaveBeenCalledWith(2100, ['frag-a', 'frag-b']);
    });

    it('does not call Steam when the fragments are short', async () => {
        const { craftSeasonRecipe, loadVaultData } = await load();
        await loadVaultData();
        expect(await craftSeasonRecipe(2200)).toMatchObject({ ok: false, reason: 'missing_fragments' });
        expect(api.exchangeSteamInventory).not.toHaveBeenCalled();
    });
});
