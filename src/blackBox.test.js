import { describe, expect, it } from 'vitest';
import { createBlackBoxStorage } from './blackBox.js';

function memoryStorage() {
    const data = new Map();
    return {
        getItem: (key) => data.get(key) ?? null,
        setItem: (key, value) => data.set(key, String(value)),
        removeItem: (key) => data.delete(key)
    };
}

describe('blackBoxStore', () => {
    it('saves and loads a death stain with recoverable salvage', () => {
        const store = createBlackBoxStorage({ storage: memoryStorage(), now: () => 1000 });
        store.recordDeath({
            x: 4,
            z: -9,
            depth: 2,
            classType: 'ENGINEER',
            salvage: { tech: 3, coin: 2, med: 1 },
            cause: 'o2-depletion',
            log: 'Test log'
        });

        const state = store.load();
        expect(state.active).toBe(true);
        expect(state.salvage).toEqual({ tech: 3, coin: 2, med: 1 });
        expect(state.archive).toHaveLength(1);
        expect(state.log).toBe('Test log');
    });

    it('uses Single-Stain plus Hybrid Insurance on overwrite', () => {
        let tick = 10;
        const store = createBlackBoxStorage({ storage: memoryStorage(), now: () => tick++ });
        store.recordDeath({ salvage: { tech: 10 }, classType: 'SCOUT', cause: 'snail' });
        store.recordDeath({ salvage: { coin: 7 }, classType: 'TANK', cause: 'ship-destroyed' });

        const state = store.load();
        expect(state.active).toBe(true);
        expect(state.classType).toBe('TANK');
        expect(state.salvage).toEqual({ tech: 0, coin: 7, med: 0 });
        expect(state.archive.map((entry) => entry.classType)).toEqual(['SCOUT', 'TANK']);
    });

    it('recovery clears only the active salvage, not the archive', () => {
        const store = createBlackBoxStorage({ storage: memoryStorage() });
        store.recordDeath({ salvage: { med: 5 }, classType: 'ENGINEER' });

        const recovered = store.recoverActive();
        const state = store.load();
        expect(recovered.salvage).toEqual({ tech: 0, coin: 0, med: 5 });
        expect(state.active).toBe(false);
        expect(state.salvage).toEqual({ tech: 0, coin: 0, med: 0 });
        expect(state.archive).toHaveLength(1);
    });
});
