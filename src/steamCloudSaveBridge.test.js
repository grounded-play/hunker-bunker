import { describe, expect, it, vi } from 'vitest';
import { installSteamCloudSaveBridge } from './steamCloudSaveBridge.js';

// docs/steamstorestatus.log Steam Cloud gap: electron/main.cjs's
// hb:saveDataChanged handler (mirrors into save.json, the file Steam
// Cloud's Auto-Cloud config watches) was fully built but never called
// from the actual game -- every hb_*-prefixed localStorage write went
// straight to plain storage and never reached Electron. This bridge
// fixes that generically by wrapping storage.setItem/removeItem once.
function makeFakeStorage(initial = {}) {
    const data = { ...initial };
    return {
        getItem: (key) => (key in data ? data[key] : null),
        setItem: (key, value) => { data[key] = String(value); },
        removeItem: (key) => { delete data[key]; },
        get length() { return Object.keys(data).length; },
        key: (i) => Object.keys(data)[i] ?? null,
        _data: data
    };
}

describe('installSteamCloudSaveBridge', () => {
    it('does nothing and returns false when electronAPI is unavailable (plain browser tab)', () => {
        const storage = makeFakeStorage();
        const originalSetItem = storage.setItem;

        const installed = installSteamCloudSaveBridge({ storage, electronAPI: null });

        expect(installed).toBe(false);
        expect(storage.setItem).toBe(originalSetItem);
    });

    it('forwards future hb_*-prefixed writes to electronAPI.onSaveDataChanged after the real write still succeeds', () => {
        const storage = makeFakeStorage();
        const onSaveDataChanged = vi.fn();
        installSteamCloudSaveBridge({ storage, electronAPI: { onSaveDataChanged } });

        storage.setItem('hb_bank_v1', '{"salvage":100}');

        expect(storage.getItem('hb_bank_v1')).toBe('{"salvage":100}');
        expect(onSaveDataChanged).toHaveBeenCalledWith('hb_bank_v1', '{"salvage":100}');
    });

    it('does not forward writes to keys outside the hb_ prefix', () => {
        const storage = makeFakeStorage();
        const onSaveDataChanged = vi.fn();
        installSteamCloudSaveBridge({ storage, electronAPI: { onSaveDataChanged } });

        storage.setItem('some_unrelated_key', 'value');

        expect(onSaveDataChanged).not.toHaveBeenCalled();
    });

    it('bootstrap-syncs every hb_* key already present in storage at install time', () => {
        const storage = makeFakeStorage({
            hb_achievements_v1: '{"stats":{}}',
            hb_bank_v1: '{"salvage":50}',
            unrelated_setting: 'x'
        });
        const onSaveDataChanged = vi.fn();
        installSteamCloudSaveBridge({ storage, electronAPI: { onSaveDataChanged } });

        expect(onSaveDataChanged).toHaveBeenCalledWith('hb_achievements_v1', '{"stats":{}}');
        expect(onSaveDataChanged).toHaveBeenCalledWith('hb_bank_v1', '{"salvage":50}');
        expect(onSaveDataChanged).not.toHaveBeenCalledWith('unrelated_setting', expect.anything());
    });

    it('forwards hb_*-prefixed removals to electronAPI.onSaveDataRemoved', () => {
        const storage = makeFakeStorage({ hb_profile_v1: '{}' });
        const onSaveDataChanged = vi.fn();
        const onSaveDataRemoved = vi.fn();
        installSteamCloudSaveBridge({ storage, electronAPI: { onSaveDataChanged, onSaveDataRemoved } });

        storage.removeItem('hb_profile_v1');

        expect(storage.getItem('hb_profile_v1')).toBeNull();
        expect(onSaveDataRemoved).toHaveBeenCalledWith('hb_profile_v1');
    });

    it('a bootstrap-sync failure for one key does not prevent the bridge from installing or syncing the rest', () => {
        const storage = makeFakeStorage({
            hb_bad_v1: 'x',
            hb_good_v1: 'y'
        });
        const onSaveDataChanged = vi.fn((key) => {
            if (key === 'hb_bad_v1') throw new Error('boom');
        });

        const installed = installSteamCloudSaveBridge({ storage, electronAPI: { onSaveDataChanged } });

        expect(installed).toBe(true);
        expect(onSaveDataChanged).toHaveBeenCalledWith('hb_good_v1', 'y');
    });
});
