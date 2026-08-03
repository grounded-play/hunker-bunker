import { describe, expect, it } from 'vitest';
import { OPERATOR_POLISHES, POLISH_UNLOCK_BY_MILESTONE, getSelectedPolish, getUnlockedPolishIds, selectPolish, unlockAllPolishes, unlockMilestonePolish, unlockPolish } from './operatorPolishes.js';

function memoryStorage() {
    const values = new Map();
    return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

describe('operator polishes', () => {
    it('starts with standard issue and refuses locked selections', () => {
        const storage = memoryStorage();
        expect([...getUnlockedPolishIds(storage)]).toEqual([0]);
        expect(selectPolish(7, storage)).toBeNull();
        expect(getSelectedPolish(storage).id).toBe(0);
    });

    it('persists unlocked selections and can unlock all sixteen in dev mode', () => {
        const storage = memoryStorage();
        unlockPolish(7, storage);
        expect(selectPolish(7, storage)?.id).toBe(7);
        expect(getSelectedPolish(storage).id).toBe(7);
        expect(unlockAllPolishes(storage).size).toBe(16);
    });

    it('uses explicit thematic milestones instead of hashing arbitrary events', () => {
        const storage = memoryStorage();
        expect(unlockMilestonePolish('black-box-recovered', storage)).toEqual({ id: 15, unlocked: true });
        expect(getUnlockedPolishIds(storage).has(15)).toBe(true);
        expect(unlockMilestonePolish('black-box-recovered', storage)).toEqual({ id: 15, unlocked: false });
        expect(unlockMilestonePolish('unrelated-event', storage)).toEqual({ id: null, unlocked: false });
    });

    it('gives every locked polish one unique reward milestone and a player clue', () => {
        const rewardIds = Object.values(POLISH_UNLOCK_BY_MILESTONE);
        expect(new Set(rewardIds).size).toBe(15);
        expect([...rewardIds].sort((a, b) => a - b)).toEqual(OPERATOR_POLISHES.slice(1).map(({ id }) => id));
        for (const polish of OPERATOR_POLISHES.slice(1)) expect(polish.hint.length).toBeGreaterThan(10);
    });
});
