import { describe, expect, it } from 'vitest';
import { adaptStoreCatalogResponse, formatStorePrice } from './steamStoreCatalog.js';

describe('steamStoreCatalog', () => {
    const validResponse = {
        ok: true,
        catalog: [
            { sku: 'keys_1', label: '1x Relic Key', keyCount: 1, priceUsdCents: 99, currency: 'USD' },
            { sku: 'keys_5', label: '5x Relic Keys', keyCount: 5, priceUsdCents: 449, currency: 'USD' },
            { sku: 'keys_15', label: '15x Relic Keys', keyCount: 15, priceUsdCents: 999, currency: 'USD' }
        ],
        deepRelicCacheOdds: [
            { label: 'Victory Patches (Scout/Tank/Eng)', rarity: 'uncommon', percent: 60 },
            { label: 'Rare Decals & Weapon Finishes', rarity: 'rare', percent: 25 },
            { label: 'Epic Emblems & Armaments', rarity: 'epic', percent: 12 },
            { label: 'Legendary Queen Slayer Emblem', rarity: 'legendary', percent: 3 }
        ]
    };

    it('adapts a valid store response correctly', () => {
        const adapted = adaptStoreCatalogResponse(validResponse);
        expect(adapted).not.toBeNull();
        expect(adapted.catalog).toHaveLength(3);
        expect(adapted.catalog[0]).toEqual({
            sku: 'keys_1',
            label: '1x Relic Key',
            keyCount: 1,
            priceMinor: 99,
            currency: 'USD'
        });
        expect(adapted.odds).toHaveLength(4);
    });

    it('rejects invalid responses or missing catalogs', () => {
        expect(adaptStoreCatalogResponse(null)).toBeNull();
        expect(adaptStoreCatalogResponse({})).toBeNull();
        expect(adaptStoreCatalogResponse({ ok: false })).toBeNull();
        expect(adaptStoreCatalogResponse({ ok: true, catalog: [] })).toBeNull();
    });

    it('rejects duplicate SKUs or invalid key counts', () => {
        const duplicate = {
            ...validResponse,
            catalog: [
                { sku: 'keys_1', label: '1x Key', keyCount: 1, priceUsdCents: 99 },
                { sku: 'keys_1', label: 'Duplicate', keyCount: 1, priceUsdCents: 99 }
            ]
        };
        expect(adaptStoreCatalogResponse(duplicate)).toBeNull();

        const invalidKeyCount = {
            ...validResponse,
            catalog: [{ sku: 'keys_0', label: '0x Key', keyCount: 0, priceUsdCents: 99 }]
        };
        expect(adaptStoreCatalogResponse(invalidKeyCount)).toBeNull();
    });

    it('rejects invalid or drifting odds sum', () => {
        const invalidOdds = {
            ...validResponse,
            deepRelicCacheOdds: [
                { label: 'A', rarity: 'uncommon', percent: 50 },
                { label: 'B', rarity: 'rare', percent: 40 } // Sums to 90%, not 100%
            ]
        };
        expect(adaptStoreCatalogResponse(invalidOdds)).toBeNull();
    });

    it('formats store prices correctly for currencies and locales', () => {
        const formattedUsd = formatStorePrice({ priceMinor: 99, currency: 'USD' }, 'en');
        expect(formattedUsd).toContain('0.99');
        expect(formattedUsd).toContain('USD');

        const formattedFive = formatStorePrice({ priceMinor: 449, currency: 'USD' }, 'en');
        expect(formattedFive).toContain('4.49');
    });
});
