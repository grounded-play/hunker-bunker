import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORE_CATALOG } from '../server/steamStore.js';
import { getDisclosedOdds } from '../server/lootTables.js';
import { hostedItemStoreUrl, loadStoreCatalog, purchaseKeys, renderOddsTable, renderStoreSkuGrid } from './steamVaultUi.js';

function element() {
    let html = '';
    const button = { addEventListener: vi.fn((event, listener) => { button[event] = listener; }) };
    return {
        children: [], classList: { add: vi.fn(), remove: vi.fn(), toggle: vi.fn() },
        get innerHTML() { return html; },
        set innerHTML(value) { html = value; this.children = []; },
        appendChild(child) { this.children.push(child); },
        querySelector: () => button,
    };
}

describe('Steam store catalog through the Vault UI', () => {
    let grid;
    let oddsTable;
    let api;
    let response;

    beforeEach(() => {
        grid = element();
        oddsTable = element();
        response = {
            ok: true, purchasesEnabled: true, purchaseMode: 'live',
            catalog: STORE_CATALOG.map((row) => ({ ...row })),
            deepRelicCacheOdds: getDisclosedOdds(),
        };
        api = {
            getSteamStoreCatalog: vi.fn(async () => response),
            purchaseSteamKeys: vi.fn(async () => ({ ok: false, reason: 'sandbox_not_allowed' })),
            openSteamOverlayToUrl: vi.fn(async () => {}),
        };
        vi.stubGlobal('window', { electronAPI: api, addEventListener: vi.fn() });
        vi.stubGlobal('document', {
            createElement: () => element(),
            getElementById: (id) => ({ 'vault-store-sku-grid': grid, 'vault-store-odds-table': oddsTable })[id] ?? null,
            querySelector: () => null,
            querySelectorAll: () => [],
        });
    });

    afterEach(() => { vi.unstubAllGlobals(); });

    it('renders real 1/5/15-key server quantities and USD totals and purchases the selected SKU', async () => {
        await loadStoreCatalog();
        renderStoreSkuGrid();
        expect(grid.children).toHaveLength(3);
        for (const [index, count] of [1, 5, 15].entries()) {
            const html = grid.children[index].innerHTML;
            expect(html).toContain(`vault-sku-count">x${count}`);
            expect(html).toContain(`data-sku="key_${count}"`);
            expect(html).toContain('USD');
            expect(html).toContain([ '1.00', '4.00', '10.00' ][index]);
            expect(html).not.toMatch(/SAVE 10%|BEST VALUE|keys_10|NaN/);
        }
        await grid.children[2].querySelector().click();
        expect(api.purchaseSteamKeys).toHaveBeenCalledExactlyOnceWith('key_15');
    });

    it('uses Steam-hosted pricing and the 15-key detail page for hosted checkout', async () => {
        response.purchasesEnabled = false;
        response.hostedItemStore = { enabled: true, url: 'https://store.steampowered.com/itemstore/4957040/' };
        await loadStoreCatalog();
        renderStoreSkuGrid();
        expect(grid.children[2].innerHTML).toContain('PRICE SHOWN ON STEAM');
        expect(grid.children[2].innerHTML).not.toContain('9.99');
        await grid.children[2].querySelector().click();
        expect(api.openSteamOverlayToUrl).toHaveBeenCalledExactlyOnceWith('https://store.steampowered.com/itemstore/4957040/detail/4015/');
        expect(api.purchaseSteamKeys).not.toHaveBeenCalled();
    });

    it('renders the actual disclosed loot table rather than stale fallback odds', async () => {
        await loadStoreCatalog();
        renderOddsTable();
        expect(oddsTable.children).toHaveLength(4);
        for (const [index, percent] of [55, 25, 12, 8].entries()) {
            expect(oddsTable.children[index].innerHTML).toContain(`>${percent}%</span>`);
            expect(oddsTable.children[index].innerHTML).toContain(getDisclosedOdds()[index].label);
        }
    });

    it('clears products and odds after an outage and blocks a stale purchase click', async () => {
        await loadStoreCatalog();
        renderStoreSkuGrid();
        const oldButton = grid.children[2].querySelector();
        api.getSteamStoreCatalog.mockRejectedValue(new Error('offline'));
        await loadStoreCatalog();
        renderStoreSkuGrid();
        renderOddsTable();
        expect(grid.children).toHaveLength(0);
        expect(grid.innerHTML).toContain('STORE CATALOG UNAVAILABLE');
        expect(oddsTable.children).toHaveLength(0);
        expect(oddsTable.innerHTML).toContain('DROP RATES UNAVAILABLE');
        await oldButton.click();
        expect(api.purchaseSteamKeys).not.toHaveBeenCalled();
    });

    it('offers no invented products when no catalog bridge exists', async () => {
        delete api.getSteamStoreCatalog;
        await loadStoreCatalog();
        renderStoreSkuGrid();
        await purchaseKeys('keys_10');
        expect(grid.children).toHaveLength(0);
        expect(api.purchaseSteamKeys).not.toHaveBeenCalled();
    });

    it.each(['keyCount', 'priceUsdCents'])('rejects missing %s instead of inventing a purchasable default', async (field) => {
        delete response.catalog[2][field];
        await loadStoreCatalog();
        renderStoreSkuGrid();
        await purchaseKeys('key_15');
        expect(grid.children).toHaveLength(0);
        expect(api.purchaseSteamKeys).not.toHaveBeenCalled();
    });

    it('displays an explicit quoted currency and amount without converting it', async () => {
        response.catalog = [{ sku: 'key_5', keyCount: 5, label: '5x Cache Key', priceMinor: 429, currency: 'EUR' }];
        await loadStoreCatalog();
        renderStoreSkuGrid();
        expect(grid.children[0].innerHTML).toContain('EUR');
        expect(grid.children[0].innerHTML).toContain('4.29');
        expect(grid.children[0].innerHTML).not.toContain('USD');
    });

    it('does not relabel USD cents as a foreign-currency quote', async () => {
        response.currency = 'EUR';
        await loadStoreCatalog();
        renderStoreSkuGrid();
        expect(grid.children).toHaveLength(0);
    });

    it('does not restore an older successful response after a newer request fails', async () => {
        let resolveOlder;
        api.getSteamStoreCatalog.mockImplementationOnce(() => new Promise((resolve) => { resolveOlder = resolve; }));
        const older = loadStoreCatalog();
        api.getSteamStoreCatalog.mockResolvedValueOnce({ ok: false });
        await loadStoreCatalog();
        resolveOlder(response);
        await older;
        renderStoreSkuGrid();
        expect(grid.children).toHaveLength(0);
    });
});

describe('Steam hosted Item Store links', () => {
    const store = { enabled: true, url: 'https://store.steampowered.com/itemstore/4957040/' };

    it('sends each key SKU to its own priced item page', () => {
        expect(hostedItemStoreUrl(store, 'key_1')).toBe('https://store.steampowered.com/itemstore/4957040/detail/4001/');
        expect(hostedItemStoreUrl(store, 'key_5')).toBe('https://store.steampowered.com/itemstore/4957040/detail/4005/');
        expect(hostedItemStoreUrl(store, 'key_15')).toBe('https://store.steampowered.com/itemstore/4957040/detail/4015/');
    });

    it('falls back to the store front, and keeps a beta query', () => {
        expect(hostedItemStoreUrl(store)).toBe(store.url);
        expect(hostedItemStoreUrl({ url: 'https://store.steampowered.com/itemstore/4957040/?beta=1' }, 'key_1'))
            .toBe('https://store.steampowered.com/itemstore/4957040/detail/4001/?beta=1');
    });

    it('has no link when the store is not configured', () => {
        expect(hostedItemStoreUrl(null, 'key_1')).toBeNull();
        expect(hostedItemStoreUrl({ enabled: true }, 'key_1')).toBeNull();
    });
});
