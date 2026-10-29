import { describe, expect, it, vi } from 'vitest';
import {
    applyBlackjackCriticalDamage,
    applyBlackjackSalvageYield,
    awardBlackjackTier,
    loadBlackjackDayPerks,
    saveBlackjackDayPerks
} from './blackjackPerks.js';

function memoryStorage() {
    const values = new Map();
    return {
        getItem: vi.fn((key) => values.get(key) ?? null),
        setItem: vi.fn((key, value) => values.set(key, value))
    };
}

describe('BLACK-ICE 21 daily expedition perks', () => {
    it('awards critical chance at tier one and salvage yield at tier two', () => {
        const tierOne = awardBlackjackTier({}, 1, 4);
        expect(tierOne).toMatchObject({ granted: true, rewardId: 'cold_calculation' });
        expect(tierOne.perks).toMatchObject({ day: 4, highestTier: 1, criticalChance: 0.15, salvageMultiplier: 1 });

        const tierTwo = awardBlackjackTier(tierOne.perks, 2, 4);
        expect(tierTwo).toMatchObject({ granted: true, rewardId: 'salvage_yield' });
        expect(tierTwo.perks).toMatchObject({ highestTier: 2, criticalChance: 0.15, salvageMultiplier: 1.1 });
    });

    it('is idempotent within a day and expires on the next campaign day', () => {
        const awarded = awardBlackjackTier({}, 2, 8);
        expect(awardBlackjackTier(awarded.perks, 2, 8).granted).toBe(false);
        expect(awardBlackjackTier(awarded.perks, 1, 9).perks).toMatchObject({ day: 9, highestTier: 1 });
    });

    it('persists the day-scoped reward and safely resets stale storage', () => {
        const storage = memoryStorage();
        saveBlackjackDayPerks(awardBlackjackTier({}, 2, 3).perks, storage);
        expect(loadBlackjackDayPerks(storage, 3).highestTier).toBe(2);
        expect(loadBlackjackDayPerks(storage, 4)).toMatchObject({ day: 4, highestTier: 0, criticalChance: 0, salvageMultiplier: 1 });
    });

    it('applies the critical and salvage effects with deterministic rounding', () => {
        expect(applyBlackjackCriticalDamage(4, { criticalChance: 0.15 }, () => 0.1)).toEqual({ damage: 6, critical: true });
        expect(applyBlackjackCriticalDamage(4, { criticalChance: 0.15 }, () => 0.2)).toEqual({ damage: 4, critical: false });
        expect(applyBlackjackSalvageYield(15, { salvageMultiplier: 1.1 })).toBe(17);
    });
});
