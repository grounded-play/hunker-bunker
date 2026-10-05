import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    buildRendererCatalog,
    buildSteamItemCatalog,
    validateResolverOdds
} from './build-steam-item-catalog.js';

const schema = JSON.parse(fs.readFileSync('steam/inventory_schema_hunker_bunker.json', 'utf8'));

describe('Steam renderer catalog generation', () => {
    it('projects only visible renderer-safe item metadata', () => {
        const catalog = buildRendererCatalog(schema);
        // Derived from the schema rather than pinned: this count grows every
        // time an item ships, and a literal here only ever fails for that.
        const visible = JSON.parse(
            fs.readFileSync(path.join(import.meta.dirname, '..', 'steam/inventory_schema_hunker_bunker.json'), 'utf8')
        ).items.filter((item) => item.type === 'item').length;
        expect(Object.keys(catalog)).toHaveLength(visible);
        expect(catalog[1000]).toMatchObject({
            name: 'Common Relic Fragment',
            rarity: 'common',
            localImg: '/economy/relic_common.png'
        });
        expect(catalog[4002]).toBeUndefined();
        expect(JSON.stringify(catalog)).not.toContain('bundle');
        expect(JSON.stringify(catalog)).not.toContain('price_category');
    });

    it('keeps the Steam resolver weights equal to server loot odds', () => {
        expect(validateResolverOdds(schema)).toBe(true);
        expect(() => validateResolverOdds({
            items: [{ itemdefid: 4002, bundle: '1000,100' }]
        })).toThrow(/does not match/);
    });

    it('keeps the checked-in generated module current', () => {
        expect(() => buildSteamItemCatalog({ check: true })).not.toThrow();
    });

    it('enforces 7-day trade and market restrictions on purchased items and marketable cosmetics (P6)', () => {
        const keyItem = schema.items.find((i) => i.itemdefid === 4001);
        const cacheItem = schema.items.find((i) => i.itemdefid === 4000);
        const bundle4005 = schema.items.find((i) => i.itemdefid === 4005);
        const bundle4015 = schema.items.find((i) => i.itemdefid === 4015);
        const cosmetic = schema.items.find((i) => i.itemdefid === 4100);

        expect(keyItem).toMatchObject({ market_tradable_restriction: 7, market_marketable_restriction: 7 });
        expect(cacheItem).toMatchObject({ market_tradable_restriction: 7, market_marketable_restriction: 7 });
        expect(bundle4005).toMatchObject({ market_tradable_restriction: 7, market_marketable_restriction: 7 });
        expect(bundle4015).toMatchObject({ market_tradable_restriction: 7, market_marketable_restriction: 7 });
        expect(cosmetic).toMatchObject({ market_tradable_restriction: 7, market_marketable_restriction: 7 });

        // Non-marketable items and legacy earnable patches must not have restrictions set
        const fragment = schema.items.find((i) => i.itemdefid === 1000);
        const overclock = schema.items.find((i) => i.itemdefid === 4140);
        const victoryPatch = schema.items.find((i) => i.itemdefid === 2000);

        expect(fragment.market_tradable_restriction).toBeUndefined();
        expect(fragment.market_marketable_restriction).toBeUndefined();
        expect(overclock.market_tradable_restriction).toBeUndefined();
        expect(overclock.market_marketable_restriction).toBeUndefined();
        expect(victoryPatch.market_tradable_restriction).toBeUndefined();
        expect(victoryPatch.market_marketable_restriction).toBeUndefined();
    });
});
