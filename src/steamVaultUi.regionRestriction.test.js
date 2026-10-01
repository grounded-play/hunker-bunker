import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    loadStoreCatalog,
    renderStoreSkuGrid,
    purchaseKeys,
    getStoreKeysRestricted,
    getStoreLegalTerms,
    getStoreRestrictedNotice
} from './steamVaultUi.js';

function element() {
    let html = '';
    const button = {
        hasAttribute: vi.fn((attr) => attr === 'disabled' && html.includes('disabled')),
        addEventListener: vi.fn((event, listener) => { button[event] = listener; })
    };
    return {
        children: [],
        parentElement: {
            children: [],
            appendChild(child) { this.children.push(child); },
            insertBefore(child, _ref) { this.children.unshift(child); }
        },
        classList: { add: vi.fn(), remove: vi.fn(), toggle: vi.fn() },
        style: {},
        get innerHTML() { return html; },
        set innerHTML(value) { html = value; this.children = []; },
        appendChild(child) { this.children.push(child); },
        querySelector: () => button,
        querySelectorAll: () => [button],
        setAttribute: vi.fn(),
        textContent: ''
    };
}

describe('Steam Vault UI - Region Restriction and Statutory Terms', () => {
    let grid;
    let statusEl;
    let api;
    let response;

    beforeEach(() => {
        grid = element();
        statusEl = element();
        response = {
            ok: true,
            purchasesEnabled: true,
            purchaseMode: 'live',
            keysRestricted: true,
            restrictedRegionReason: 'region_compliance_belgium',
            restrictedRegionNotice: 'Paid random item keys are unavailable in your region in accordance with local regulations.',
            legalTerms: 'Virtual items have no cash value. Steam Subscriber Agreement governs Steam Wallet and Community Market transactions. In-Game Purchases (Includes Random Items).',
            catalog: [
                { sku: 'key_1', label: '1x Cache Key', keyCount: 1, priceUsdCents: 99, currency: 'USD', restricted: true },
                { sku: 'key_5', label: '5x Cache Key', keyCount: 5, priceUsdCents: 399, currency: 'USD', restricted: true }
            ],
            deepRelicCacheOdds: [
                { label: 'Victory Patches', rarity: 'uncommon', percent: 60 },
                { label: 'Rare Decals', rarity: 'rare', percent: 40 }
            ]
        };
        api = {
            getSteamStoreCatalog: vi.fn(async () => response),
            purchaseSteamKeys: vi.fn(async () => ({ ok: true }))
        };

        vi.stubGlobal('window', { electronAPI: api, addEventListener: vi.fn() });
        vi.stubGlobal('document', {
            createElement: () => element(),
            getElementById: (id) => ({
                'vault-store-sku-grid': grid,
                'vault-store-open-status': statusEl
            })[id] ?? null,
            querySelector: () => null
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('handles region-restricted catalogs (Belgium / BE) cleanly in UI', async () => {
        await loadStoreCatalog();
        expect(getStoreKeysRestricted()).toBe(true);
        expect(getStoreRestrictedNotice()).toContain('Paid random item keys are unavailable in your region');
        expect(getStoreLegalTerms()).toContain('Virtual items have no cash value');

        renderStoreSkuGrid();

        expect(grid.children).toHaveLength(2);
        for (const card of grid.children) {
            expect(card.innerHTML).toContain('REGION RESTRICTED');
            expect(card.innerHTML).toContain('disabled');
        }

        // Attempting to purchase keys returns region_restricted error without calling IPC
        const result = await purchaseKeys('key_1');
        expect(result).toEqual({ ok: false, reason: 'region_restricted' });
        expect(statusEl.textContent.toLowerCase()).toContain('region');
    });
});
