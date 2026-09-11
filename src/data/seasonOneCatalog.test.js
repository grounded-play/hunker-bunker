import { describe, expect, it } from 'vitest';
import {
    SEASON_ONE_CLASS_CHOICES,
    SEASON_ONE_COSMETICS,
    getSeasonOneCatalog,
    getSeasonOneCosmetic,
    isValidSeasonOneCosmetic
} from './seasonOneCatalog.js';

describe('Beta Season 1 Catalog (docs/hunker-bunker-beta-season-1-plan.md §4 & §6)', () => {
    it('has exactly 24 featured cosmetic definitions', () => {
        expect(SEASON_ONE_COSMETICS).toHaveLength(24);
        expect(getSeasonOneCatalog()).toHaveLength(24);
    });

    it('contains 12 free track cosmetics (including the 3 rank-15 class choices)', () => {
        const free = SEASON_ONE_COSMETICS.filter((c) => c.track === 'free');
        expect(free).toHaveLength(12);

        const rank15Choices = free.filter((c) => c.rank === 15);
        expect(rank15Choices).toHaveLength(3);
        expect(rank15Choices.map((c) => c.itemdefid)).toEqual(expect.arrayContaining([4112, 4113, 4114]));
        expect(SEASON_ONE_CLASS_CHOICES).toEqual([4112, 4113, 4114]);
    });

    it('contains 10 classified dossier premium cosmetics (including instant purchase grant 4101)', () => {
        const premium = SEASON_ONE_COSMETICS.filter((c) => c.track === 'premium');
        expect(premium).toHaveLength(10);

        const purchase = premium.find((c) => c.rank === 'purchase');
        expect(purchase).toBeDefined();
        expect(purchase?.itemdefid).toBe(4101);
    });

    it('contains 2 deterministic relic fragment workshop outputs (2100 & 2200)', () => {
        const workshop = SEASON_ONE_COSMETICS.filter((c) => c.track === 'workshop');
        expect(workshop).toHaveLength(2);

        const decal = workshop.find((c) => c.itemdefid === 2100);
        expect(decal?.recipe).toEqual({ commonFragments: 5, rareFragments: 0 });

        const sidearm = workshop.find((c) => c.itemdefid === 2200);
        expect(sidearm?.recipe).toEqual({ commonFragments: 10, rareFragments: 2 });
    });

    it('every item has required metadata, local image path, and description', () => {
        for (const item of SEASON_ONE_COSMETICS) {
            expect(item.itemdefid).toBeGreaterThan(0);
            expect(item.name).toBeTruthy();
            expect(item.category).toBeTruthy();
            expect(item.rarity).toBeTruthy();
            expect(item.desc).toBeTruthy();
            expect(item.localImg).toMatch(/^\/economy\//);
        }
    });

    it('lookups by itemdefid resolve correctly', () => {
        expect(getSeasonOneCosmetic(4120)).toMatchObject({ name: 'Sub-Zero Pioneer Patch' });
        expect(getSeasonOneCosmetic(9999)).toBeNull();
        expect(isValidSeasonOneCosmetic(4101)).toBe(true);
        expect(isValidSeasonOneCosmetic(9999)).toBe(false);
    });
});
