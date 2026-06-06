import { describe, it, expect } from 'vitest';
import { DEPTH_TIER_NAMES, DEPTH_TIER_LOOT_CONFIG, getDepthLootConfig } from './loot.js';

describe('depth-tier loot config', () => {
    it('preserves the exact pre-extraction tiers (deeper = richer)', () => {
        expect(DEPTH_TIER_NAMES).toEqual(['SURFACE', 'SHALLOW', 'DEEP', 'ABYSS']);
        expect(DEPTH_TIER_LOOT_CONFIG.map((c) => c.pickupMultiplier)).toEqual([0.8, 1.0, 1.3, 1.7]);
        expect(DEPTH_TIER_LOOT_CONFIG.map((c) => c.legendaryBoost)).toEqual([0, 0, 0.05, 0.15]);
    });

    it('clamps the lookup to valid tiers', () => {
        expect(getDepthLootConfig(-5)).toBe(DEPTH_TIER_LOOT_CONFIG[0]);
        expect(getDepthLootConfig(0)).toBe(DEPTH_TIER_LOOT_CONFIG[0]);
        expect(getDepthLootConfig(2)).toBe(DEPTH_TIER_LOOT_CONFIG[2]);
        expect(getDepthLootConfig(99)).toBe(DEPTH_TIER_LOOT_CONFIG[3]);
    });
});
