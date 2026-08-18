import { describe, expect, it } from 'vitest';
import { SeasonPassManager, TIER_REWARDS, TOTAL_TIERS, XP_PER_TIER } from './seasonPass.js';

function createMemoryStorage() {
    const store = new Map();
    return {
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => store.set(key, value),
        removeItem: (key) => store.delete(key)
    };
}

describe('season pass reward table', () => {
    it('has exactly 50 tiers, each with a free or premium reward (or both)', () => {
        expect(TIER_REWARDS).toHaveLength(TOTAL_TIERS);
        for (const row of TIER_REWARDS) {
            expect(row.free || row.premium).toBeTruthy();
        }
    });

    it('every reward has a display label', () => {
        for (const row of TIER_REWARDS) {
            if (row.free) expect(row.free.label).toBeTruthy();
            if (row.premium) expect(row.premium.label).toBeTruthy();
        }
    });
});

describe('SeasonPassManager', () => {
    it('starts at tier 0 with no XP', () => {
        const manager = new SeasonPassManager({ storage: createMemoryStorage() });
        expect(manager.getTotalXp()).toBe(0);
        expect(manager.getCurrentTier()).toBe(0);
    });

    it('advances tiers as XP crosses each 5000 threshold', () => {
        const manager = new SeasonPassManager({ storage: createMemoryStorage() });
        manager.addXp(4999, 'test');
        expect(manager.getCurrentTier()).toBe(0);
        manager.addXp(1, 'test');
        expect(manager.getCurrentTier()).toBe(1);
        manager.addXp(XP_PER_TIER * 2, 'test');
        expect(manager.getCurrentTier()).toBe(3);
    });

    it('never exceeds the max tier even with excess XP', () => {
        const manager = new SeasonPassManager({ storage: createMemoryStorage() });
        manager.addXp(XP_PER_TIER * (TOTAL_TIERS + 10), 'test');
        expect(manager.getCurrentTier()).toBe(TOTAL_TIERS);
    });

    it('reports tier progress fraction correctly', () => {
        const manager = new SeasonPassManager({ storage: createMemoryStorage() });
        manager.addXp(2500, 'test');
        const progress = manager.getTierProgress();
        expect(progress.tier).toBe(0);
        expect(progress.xpIntoTier).toBe(2500);
        expect(progress.fraction).toBeCloseTo(0.5);
    });

    it('gates claiming on reaching the tier first', () => {
        const manager = new SeasonPassManager({ storage: createMemoryStorage() });
        expect(manager.canClaim(1, 'free')).toBe(false);
        manager.addXp(XP_PER_TIER, 'test');
        expect(manager.canClaim(1, 'free')).toBe(true);
        expect(manager.canClaim(2, 'free')).toBe(false);
    });

    it('gates premium-track claims behind hasPremium', () => {
        const manager = new SeasonPassManager({ storage: createMemoryStorage() });
        manager.addXp(XP_PER_TIER, 'test');
        expect(manager.canClaim(1, 'premium')).toBe(false);
        manager.setPremium(true);
        expect(manager.canClaim(1, 'premium')).toBe(true);
    });

    it('claim() marks the tier claimed and returns the reward once, then blocks re-claims', () => {
        const manager = new SeasonPassManager({ storage: createMemoryStorage() });
        manager.addXp(XP_PER_TIER, 'test');
        const reward = manager.claim(1, 'free');
        expect(reward).toBeTruthy();
        expect(manager.isClaimed(1, 'free')).toBe(true);
        expect(manager.claim(1, 'free')).toBeNull();
    });

    it('free and premium claim state are independent', () => {
        const manager = new SeasonPassManager({ storage: createMemoryStorage() });
        manager.addXp(XP_PER_TIER, 'test');
        manager.setPremium(true);
        manager.claim(1, 'free');
        expect(manager.isClaimed(1, 'free')).toBe(true);
        expect(manager.isClaimed(1, 'premium')).toBe(false);
    });

    it('getClaimableTiers lists every unclaimed reward up to the current tier', () => {
        const manager = new SeasonPassManager({ storage: createMemoryStorage() });
        manager.addXp(XP_PER_TIER * 2, 'test');
        manager.setPremium(true);
        const claimable = manager.getClaimableTiers();
        // Tier 1 free (scrap) + Tier 1 premium (sidearm) + Tier 2 premium (charm); tier 2 free is null.
        expect(claimable.length).toBeGreaterThanOrEqual(3);
        manager.claim(1, 'free');
        expect(manager.getClaimableTiers().some((c) => c.tier === 1 && c.track === 'free')).toBe(false);
    });

    it('persists XP, premium status, and claims across a fresh manager instance on the same storage', () => {
        const storage = createMemoryStorage();
        const first = new SeasonPassManager({ storage });
        first.addXp(XP_PER_TIER, 'test');
        first.setPremium(true);
        first.claim(1, 'free');

        const second = new SeasonPassManager({ storage });
        expect(second.getTotalXp()).toBe(XP_PER_TIER);
        expect(second.hasPremium()).toBe(true);
        expect(second.isClaimed(1, 'free')).toBe(true);
        expect(second.isClaimed(1, 'premium')).toBe(false);
    });

    it('reset() clears all progress', () => {
        const manager = new SeasonPassManager({ storage: createMemoryStorage() });
        manager.addXp(XP_PER_TIER * 5, 'test');
        manager.setPremium(true);
        manager.claim(1, 'free');
        manager.reset();
        expect(manager.getTotalXp()).toBe(0);
        expect(manager.hasPremium()).toBe(false);
        expect(manager.isClaimed(1, 'free')).toBe(false);
    });

    it('ignores non-positive XP awards without mutating state', () => {
        const manager = new SeasonPassManager({ storage: createMemoryStorage() });
        expect(manager.addXp(0, 'test').xpAwarded).toBe(0);
        expect(manager.addXp(-50, 'test').xpAwarded).toBe(0);
        expect(manager.getTotalXp()).toBe(0);
    });
});
