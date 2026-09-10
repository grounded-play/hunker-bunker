import { describe, expect, it, vi } from 'vitest';
import { createRunCheckpointStorage, hasRecoverableSalvage, recoverCrashedRunCheckpoint } from './runCheckpoint.js';

function memoryStorage() {
    const data = new Map();
    return {
        getItem: (key) => data.get(key) ?? null,
        setItem: (key, value) => data.set(key, String(value)),
        removeItem: (key) => data.delete(key)
    };
}

describe('runCheckpointStore', () => {
    it('saves and loads a run-in-progress snapshot', () => {
        const store = createRunCheckpointStorage({ storage: memoryStorage() });
        store.save({ x: 12, z: -4, depth: 2, classType: 'ENGINEER', salvage: { tech: 3, coin: 1, med: 0 } });

        const loaded = store.load();
        expect(loaded).toEqual({
            x: 12,
            z: -4,
            depth: 2,
            classType: 'ENGINEER',
            salvage: { tech: 3, coin: 1, med: 0 }
        });
    });

    it('returns null when there is no checkpoint (clean previous session)', () => {
        const store = createRunCheckpointStorage({ storage: memoryStorage() });
        expect(store.load()).toBeNull();
    });

    it('the latest save overwrites the previous one -- only one checkpoint at a time', () => {
        const store = createRunCheckpointStorage({ storage: memoryStorage() });
        store.save({ x: 1, z: 1, depth: 0, classType: 'SCOUT', salvage: { tech: 1 } });
        store.save({ x: 5, z: 5, depth: 1, classType: 'SCOUT', salvage: { tech: 4 } });

        expect(store.load()).toMatchObject({ x: 5, z: 5, depth: 1, salvage: { tech: 4, coin: 0, med: 0 } });
    });

    it('clear() removes the checkpoint entirely', () => {
        const store = createRunCheckpointStorage({ storage: memoryStorage() });
        store.save({ x: 1, z: 1, depth: 0, classType: 'SCOUT', salvage: { tech: 1 } });
        store.clear();

        expect(store.load()).toBeNull();
    });

    it('returns null instead of throwing on corrupted storage contents', () => {
        const storage = memoryStorage();
        storage.setItem('hb_run_checkpoint_v1', '{not valid json');
        const store = createRunCheckpointStorage({ storage });

        expect(store.load()).toBeNull();
    });

    it('does nothing (no throw) when storage is unavailable', () => {
        const store = createRunCheckpointStorage({ storage: null });
        expect(() => store.save({ x: 1, z: 1, depth: 0, classType: 'SCOUT', salvage: {} })).not.toThrow();
        expect(store.load()).toBeNull();
    });
});

describe('hasRecoverableSalvage', () => {
    it('is false for a null checkpoint or all-zero salvage', () => {
        expect(hasRecoverableSalvage(null)).toBe(false);
        expect(hasRecoverableSalvage({ salvage: { tech: 0, coin: 0, med: 0 } })).toBe(false);
    });

    it('is true when any salvage field is positive', () => {
        expect(hasRecoverableSalvage({ salvage: { tech: 1, coin: 0, med: 0 } })).toBe(true);
        expect(hasRecoverableSalvage({ salvage: { tech: 0, coin: 0, med: 2 } })).toBe(true);
    });
});

describe('recoverCrashedRunCheckpoint (SAVE-01)', () => {
    it('recovers salvage into a black-box death record and clears the checkpoint', () => {
        const storage = memoryStorage();
        const checkpointStore = createRunCheckpointStorage({ storage });
        checkpointStore.save({
            x: 42,
            z: -18,
            depth: 2,
            classType: 'TANK',
            salvage: { tech: 5, coin: 2, med: 1 }
        });

        const recordedDeaths = [];
        const deathStore = {
            recordDeath: (data) => recordedDeaths.push(data)
        };

        const result = recoverCrashedRunCheckpoint({ checkpointStore, deathStore });
        expect(result).toBe(true);
        expect(recordedDeaths).toHaveLength(1);
        expect(recordedDeaths[0]).toMatchObject({
            x: 42,
            z: -18,
            depth: 2,
            classType: 'TANK',
            salvage: { tech: 5, coin: 2, med: 1 },
            cause: 'crash-recovered'
        });
        expect(checkpointStore.load()).toBeNull();
    });

    it('is strictly idempotent: second call does nothing and does not duplicate salvage', () => {
        const storage = memoryStorage();
        const checkpointStore = createRunCheckpointStorage({ storage });
        checkpointStore.save({
            x: 10,
            z: 20,
            depth: 1,
            classType: 'SCOUT',
            salvage: { tech: 3, coin: 0, med: 0 }
        });

        const recordDeathSpy = vi.fn();
        const deathStore = { recordDeath: recordDeathSpy };

        const firstResult = recoverCrashedRunCheckpoint({ checkpointStore, deathStore });
        expect(firstResult).toBe(true);
        expect(recordDeathSpy).toHaveBeenCalledTimes(1);

        // Immediate second call simulates reboot or re-entry
        const secondResult = recoverCrashedRunCheckpoint({ checkpointStore, deathStore });
        expect(secondResult).toBe(false);
        expect(recordDeathSpy).toHaveBeenCalledTimes(1); // Never called again!
    });

    it('silently clears zero-salvage checkpoints without recording a death marker', () => {
        const storage = memoryStorage();
        const checkpointStore = createRunCheckpointStorage({ storage });
        checkpointStore.save({
            x: 0,
            z: 0,
            depth: 0,
            classType: 'ENGINEER',
            salvage: { tech: 0, coin: 0, med: 0 }
        });

        const recordDeathSpy = vi.fn();
        const deathStore = { recordDeath: recordDeathSpy };

        const result = recoverCrashedRunCheckpoint({ checkpointStore, deathStore });
        expect(result).toBe(true);
        expect(recordDeathSpy).not.toHaveBeenCalled();
        expect(checkpointStore.load()).toBeNull();
    });

    it('safely handles missing stores or corrupt data without throwing', () => {
        expect(() => recoverCrashedRunCheckpoint({ checkpointStore: null })).not.toThrow();
        expect(recoverCrashedRunCheckpoint({ checkpointStore: null })).toBe(false);

        const storage = memoryStorage();
        storage.setItem('hb_run_checkpoint_v1', '{corrupt json');
        const checkpointStore = createRunCheckpointStorage({ storage });
        expect(recoverCrashedRunCheckpoint({ checkpointStore })).toBe(false);
    });
});
