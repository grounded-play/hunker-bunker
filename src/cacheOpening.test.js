import { describe, expect, it } from 'vitest';
import { adaptSteamCacheResult, createCacheOpeningResult, getCacheOpeningPools } from './cacheOpening.js';
import { DUPLICATE_SHARD_BONUS } from './craftingMatrix.js';

describe('cache opening contract', () => {
    it('returns three ranked reward lanes from the full current catalog', () => {
        const result = createCacheOpeningResult({ seed: 42 });
        expect(result.version).toBe(1);
        expect(result.rewards.map((reward) => reward.slot)).toEqual(['cosmetic', 'power-up', 'currency-material']);
        expect(result.rewards.every((reward) => reward.itemdefid != null && reward.quantity > 0)).toBe(true);
        expect(result.rewards[0].itemdefid).toBeGreaterThanOrEqual(4100);
    });

    it('is deterministic for a supplied seed', () => {
        expect(createCacheOpeningResult({ seed: 'qa-seed' }).rewards)
            .toEqual(createCacheOpeningResult({ seed: 'qa-seed' }).rewards);
        expect(createCacheOpeningResult({ seed: 'qa-seed' }).rewards)
            .not.toEqual(createCacheOpeningResult({ seed: 'different-seed' }).rewards);
    });

    // Doc 05 §3, the same rule the Steam server applies: a duplicate is still
    // granted, plus Deep Core Shards by rarity.
    it('keeps an owned cosmetic duplicate and adds bonus shards', () => {
        const first = createCacheOpeningResult({ seed: 42 });
        const cosmetic = first.rewards[0];
        const result = createCacheOpeningResult({ seed: 42, inventory: [{ itemdefid: cosmetic.itemdefid, quantity: 1 }] });
        expect(result.rewards[0]).toMatchObject({ itemdefid: cosmetic.itemdefid, duplicate: true });
        const bonus = result.rewards.find((reward) => reward.slot === 'duplicate-bonus');
        expect(bonus).toMatchObject({ itemdefid: 4159, quantity: DUPLICATE_SHARD_BONUS[cosmetic.rarity] });
        expect(first.rewards.some((reward) => reward.slot === 'duplicate-bonus')).toBe(false);
    });

    it('adapts a Steam response without pretending an empty response is a reward', () => {
        expect(adaptSteamCacheResult({ granted: [] })).toMatchObject({ complete: false, reason: 'steam_returned_no_grant', rewards: [] });
        expect(adaptSteamCacheResult({ granted: [{ itemdefid: 4100, quantity: 1 }] }).rewards[0]).toMatchObject({ slot: 'cosmetic', itemdefid: 4100 });
    });

    // The Steam cache grants one reward, so "three rewards" marked every real
    // open as a partial grant.
    it('treats a single Steam reward as a complete open and shows the duplicate shards as a bonus', () => {
        const opening = adaptSteamCacheResult({
            granted: [{ itemdefid: 2200, quantity: 1 }, { itemdefid: 4159, quantity: 100 }],
            duplicateBonus: { itemdefid: 4159, quantity: 100, ok: true }
        });
        expect(opening.complete).toBe(true);
        expect(opening.rewards.map((reward) => reward.slot)).toEqual(['cosmetic', 'duplicate-bonus']);
        expect(opening.rewards[0].duplicate).toBe(true);
        expect(opening.rewards[1].label).toContain('100');
    });

    it('exposes the three test pools', () => {
        const pools = getCacheOpeningPools();
        expect(pools.cosmetic).toContain(4111);
        expect(pools.powerUp).toContain(4147);
        expect(pools.material).toContain(4159);
    });
});
