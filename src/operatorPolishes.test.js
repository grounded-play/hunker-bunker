import { describe, expect, it } from 'vitest';
import { getSelectedPolish, getUnlockedPolishIds, selectPolish, unlockAllPolishes, unlockPolish } from './operatorPolishes.js';

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
});
