import { describe, expect, it } from 'vitest';
import {
    DROP_RARITIES,
    SUIT_RELICS,
    WEAPON_OVERCLOCKS,
    computeActiveSynergies,
    rollEnemyLootDrop
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
});
