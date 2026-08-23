import { describe, expect, it } from 'vitest';
import { adaptSteamCacheResult, createCacheOpeningResult, getCacheOpeningPools } from './cacheOpening.js';

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

    it('converts an owned cosmetic duplicate into visible shards', () => {
        const first = createCacheOpeningResult({ seed: 42 });
        const result = createCacheOpeningResult({ seed: 42, inventory: [{ itemdefid: first.rewards[0].itemdefid, quantity: 1 }] });
        expect(result.rewards[0].duplicate).toBe(true);
        expect(result.rewards[0].itemdefid).toBe(4159);
        expect(result.rewards[0].quantity).toBeGreaterThan(0);
    });

    it('adapts a Steam response without pretending an empty response is a reward', () => {
        expect(adaptSteamCacheResult({ granted: [] })).toMatchObject({ complete: false, reason: 'steam_returned_no_grant', rewards: [] });
        expect(adaptSteamCacheResult({ granted: [{ itemdefid: 4100, quantity: 1 }] }).rewards[0]).toMatchObject({ slot: 'cosmetic', itemdefid: 4100 });
    });

    it('exposes the three test pools', () => {
        const pools = getCacheOpeningPools();
        expect(pools.cosmetic).toContain(4111);
        expect(pools.powerUp).toContain(4147);
        expect(pools.material).toContain(4159);
    });
});
