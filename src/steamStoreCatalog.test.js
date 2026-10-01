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

    it('adapts region restriction metadata and statutory legal terms', () => {
        const restrictedResponse = {
            ...validResponse,
            keysRestricted: true,
            restrictedRegionReason: 'region_compliance_belgium',
            restrictedRegionNotice: 'Paid keys unavailable in Belgium',
            legalTerms: 'Virtual items have no cash value. Steam Subscriber Agreement governs.'
        };
        const adapted = adaptStoreCatalogResponse(restrictedResponse);
        expect(adapted.keysRestricted).toBe(true);
        expect(adapted.restrictedRegionReason).toBe('region_compliance_belgium');
        expect(adapted.restrictedRegionNotice).toBe('Paid keys unavailable in Belgium');
        expect(adapted.legalTerms).toBe('Virtual items have no cash value. Steam Subscriber Agreement governs.');
        expect(adapted.catalog.every((sku) => sku.restricted === true)).toBe(true);
    });

    it('passes through priceCategory matching schema price tier when present', () => {
        const schemaResponse = {
            ...validResponse,
            catalog: [
                { sku: 'key_1', label: '1x Cache Key', keyCount: 1, priceCategory: '1;VLV100', priceUsdCents: 100, currency: 'USD' },
                { sku: 'key_5', label: '5x Cache Key', keyCount: 5, priceCategory: '1;VLV400', priceUsdCents: 400, currency: 'USD' }
            ]
        };
        const adapted = adaptStoreCatalogResponse(schemaResponse);
        expect(adapted.catalog[0].priceCategory).toBe('1;VLV100');
        expect(adapted.catalog[0].priceMinor).toBe(100);
        expect(adapted.catalog[1].priceCategory).toBe('1;VLV400');
        expect(adapted.catalog[1].priceMinor).toBe(400);
    });
});
