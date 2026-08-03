import fs from 'node:fs';
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
        expect(Object.keys(catalog)).toHaveLength(11);
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
});
