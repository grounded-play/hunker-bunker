import { describe, expect, it } from 'vitest';
import { BASE_REBUILD_STORAGE_KEY, loadInstalledBaseModules, saveInstalledBaseModules } from './baseRebuildStore.js';

function storage() {
    const values = new Map();
    return {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value))
    };
}

describe('campaign base rebuild store', () => {
    it('persists installed modules but excludes unknown and duplicate records', () => {
        const store = storage();
        expect(saveInstalledBaseModules([
            { instanceId: 'cot-1', definitionId: 'cot_bed', x: 2, z: 3, transform: { x: 2, z: 3, yaw: 1 } },
            { instanceId: 'cot-1', definitionId: 'cot_bed', x: 99, z: 99 },
            { instanceId: 'bad', definitionId: 'not-real' }
        ], store)).toBe(true);
        expect(loadInstalledBaseModules(store)).toEqual([
            expect.objectContaining({ instanceId: 'cot-1', definitionId: 'cot_bed', x: 2, z: 3, transform: { x: 2, z: 3, yaw: 1 } })
        ]);
    });

    it('fails closed for corrupt campaign data', () => {
        const store = storage();
        store.setItem(BASE_REBUILD_STORAGE_KEY, '{bad json');
        expect(loadInstalledBaseModules(store)).toEqual([]);
    });
});
