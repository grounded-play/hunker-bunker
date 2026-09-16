import { describe, expect, it, vi } from 'vitest';
import { STEAM_ACHIEVEMENT_SYNC_KEY, SteamAchievementSync } from './steamAchievementSync.js';

function storage() {
    const map = new Map();
    return { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)) };
}

describe('SteamAchievementSync', () => {
    it('retains an unlock until Steam explicitly acknowledges it', async () => {
        const store = storage();
        const unlockAchievement = vi.fn()
            .mockResolvedValueOnce({ ok: false, reason: 'offline' })
            .mockResolvedValueOnce({ ok: true });
        const sync = new SteamAchievementSync({
            storage: store,
            bridge: { getSteamIdentity: vi.fn().mockResolvedValue({ active: true, steamId64: '7656' }), unlockAchievement }
        });
        expect((await sync.enqueue('quick_study')).ok).toBe(false);
        expect(sync.getStatus().pending).toEqual(['quick_study']);
        expect((await sync.flush()).ok).toBe(true);
        expect(sync.getStatus().pending).toEqual([]);
        expect(sync.getStatus().acknowledged).toEqual(['quick_study']);
        expect(JSON.parse(store.getItem(STEAM_ACHIEVEMENT_SYNC_KEY)).accountId).toBe('7656');
    });

    it('never carries pending achievements into another Steam account', async () => {
        const store = storage();
        const first = new SteamAchievementSync({
            storage: store,
            bridge: { getSteamIdentity: async () => ({ active: true, steamId64: 'A' }), unlockAchievement: async () => ({ ok: false }) }
        });
        await first.enqueue('hunkered');
        const second = new SteamAchievementSync({
            storage: store,
            bridge: { getSteamIdentity: async () => ({ active: true, steamId64: 'B' }), unlockAchievement: vi.fn() }
        });
        const result = await second.flush();
        // Direct flush does no network work; binding/reconcile identifies mismatch.
        expect((await second.reconcile(['hunkered'])).reason).toBe('account_mismatch');
        expect(result.pending).toBe(1);
        expect(second.bridge.unlockAchievement).not.toHaveBeenCalled();
    });

    it('reset generation discards stale retries and permits re-earning', async () => {
        const store = storage();
        const unlockAchievement = vi.fn().mockResolvedValue({ ok: true });
        const sync = new SteamAchievementSync({
            storage: store,
            bridge: { getSteamIdentity: async () => ({ active: true, steamId64: 'A' }), unlockAchievement }
        });
        await sync.enqueue('quick_study');
        sync.markReset(4);
        expect(sync.getStatus()).toMatchObject({ generation: 4, pending: [], acknowledged: [] });
        await sync.enqueue('quick_study');
        expect(unlockAchievement).toHaveBeenLastCalledWith('quick_study', 4);
    });
});
