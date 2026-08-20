import { describe, expect, it } from 'vitest';
import {
    DROP_RARITIES,
    SUIT_RELICS,
    WEAPON_OVERCLOCKS,
    TRANSFORMATIVE_RELIC_IDS,
    computeActiveSynergies,
    rollEnemyLootDrop,
    applyLastBreathDamage
} from './runDrops.js';

describe('runDrops', () => {
    it('returns null when random roll exceeds drop chance for standard enemy', () => {
        const mockRandom = () => 0.95;
        const drop = rollEnemyLootDrop(mockRandom, { isElite: false, isBoss: false });
        expect(drop).toBeNull();
    });

    it('always drops item for bosses with mythic/corrupted bias', () => {
        const mockRandomHigh = () => 0.1;
        const dropHigh = rollEnemyLootDrop(mockRandomHigh, { isBoss: true });
        expect(dropHigh).not.toBeNull();
        expect([DROP_RARITIES.MYTHIC, DROP_RARITIES.CORRUPTED]).toContain(dropHigh.rarity);
    });

    it('computes superconductor arc synergy when cryo and tesla items are equipped', () => {
        const cryoItem = WEAPON_OVERCLOCKS.find((item) => item.element === 'cryo');
        const teslaItem = SUIT_RELICS.find((item) => item.element === 'tesla');
        const synergies = computeActiveSynergies([cryoItem, teslaItem]);
        expect(synergies).toHaveLength(1);
        expect(synergies[0].id).toBe('superconductor');
    });

    it('returns empty synergies if elements do not match combination criteria', () => {
        const synergies = computeActiveSynergies([]);
        expect(synergies).toHaveLength(0);
    });

    it('contains alien bio-relics (pheromone_aura, chitin_membrane, synapse_pulse)', () => {
        const ids = SUIT_RELICS.map((r) => r.id);
        expect(ids).toContain('pheromone_aura');
        expect(ids).toContain('chitin_membrane');
        expect(ids).toContain('synapse_pulse');
    });

    // docs/design/one-more-ring-design-pillars.md item 2: transformative
    // relics that change a rule instead of adding a flat stat bonus.
    it('every declared transformative relic id actually exists in the catalog and is marked transformative', () => {
        const allItems = [...WEAPON_OVERCLOCKS, ...SUIT_RELICS];
        for (const id of TRANSFORMATIVE_RELIC_IDS) {
            const item = allItems.find((entry) => entry.id === id);
            expect(item, `expected catalog entry for ${id}`).toBeTruthy();
            expect(item.transformative).toBe(true);
        }
    });

    describe('applyLastBreathDamage', () => {
        const lastBreath = SUIT_RELICS.find((r) => r.id === 'last_breath');

        it('is a no-op with no relics equipped', () => {
            expect(applyLastBreathDamage(10, [], 5)).toBe(10);
        });

        it('doubles damage when O2 is below the relic threshold', () => {
            expect(applyLastBreathDamage(10, [lastBreath], 15)).toBe(20);
        });

        it('leaves damage unchanged when O2 is at or above the threshold', () => {
            expect(applyLastBreathDamage(10, [lastBreath], 20)).toBe(10);
            expect(applyLastBreathDamage(10, [lastBreath], 100)).toBe(10);
        });

        it('ignores equipped relics/overclocks that have no lowO2DamageMult stat', () => {
            const splitShot = WEAPON_OVERCLOCKS.find((o) => o.id === 'split_shot');
            expect(applyLastBreathDamage(10, [splitShot], 5)).toBe(10);
        });
    });
});
