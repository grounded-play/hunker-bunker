import { describe, expect, it } from 'vitest';
import { BankManager } from './bank.js';
import { COMMUNITY_SKINS } from './data/communitySkins.js';
import {
    RIG_PURCHASES_STORAGE_KEY, computeProgressionUnlocks, describeProgressionUnlock, loadRigPurchases, purchaseRigModule
} from './progressionUnlocks.js';

const memoryStorage = () => {
    const map = new Map();
    return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k) };
};

describe('what a save has earned', () => {
    it('earns nothing on a fresh save', () => {
        expect(computeProgressionUnlocks(null)).toEqual([]);
        expect(computeProgressionUnlocks({ unlocked: {}, stats: { byClass: {} } })).toEqual([]);
    });

    it('earns rig modules from achievements and depth, and achievement rewards', () => {
        const ids = computeProgressionUnlocks({
            unlocked: { slay_the_queen: {}, archivist: {}, ghost: {} },
            stats: { byClass: { TANK: { runs: 0, deepestTier: 4 } } }
        });
        expect(ids).toEqual(expect.arrayContaining(['4162', '4163', '4166', '5001']));
        expect(ids).not.toContain('4167');
    });

    it("earns a class's community skins with runs as that class, in order", () => {
        const scoutSkins = COMMUNITY_SKINS.filter((skin) => skin.classId === 'scout').map((skin) => skin.id);
        const ids = computeProgressionUnlocks({ unlocked: {}, stats: { byClass: { SCOUT: { runs: 3 } } } });
        expect(ids).toEqual(scoutSkins.slice(0, 3));
        expect(describeProgressionUnlock(scoutSkins[3])).toEqual({ key: 'ui.unlock.class_runs', params: { runs: 5, cls: 'SCOUT' } });
    });

    it('earns the Retro Pixel Snail decal from the saved arcade score while its Steam achievement is held', () => {
        expect(computeProgressionUnlocks({ unlocked: {}, stats: { arcadeBestScore: 64_999, byClass: {} } })).not.toContain('4168');
        expect(computeProgressionUnlocks({ unlocked: {}, stats: { arcadeBestScore: 65_000, byClass: {} } })).toContain('4168');
        expect(describeProgressionUnlock(4168)).toEqual({
            key: 'ui.unlock.arcade_score',
            params: { score: 65000 }
        });
    });

    it('sells purchasable rig modules for shells, once, and remembers them', () => {
        const storage = memoryStorage();
        const bank = new BankManager({ storage: memoryStorage() });
        expect(purchaseRigModule(4160, { bank, storage })).toEqual({ ok: false, reason: 'insufficient_shells' });
        bank.addShells(200);
        expect(purchaseRigModule(4160, { bank, storage })).toEqual({ ok: true });
        expect(bank.getShells()).toBe(50);
        expect(purchaseRigModule(4160, { bank, storage })).toEqual({ ok: false, reason: 'already_owned' });
        expect(loadRigPurchases(storage)).toEqual(['4160']);
        expect(computeProgressionUnlocks(null, { purchases: loadRigPurchases(storage) })).toEqual(['4160']);
        expect(purchaseRigModule(4162, { bank, storage })).toEqual({ ok: false, reason: 'not_for_sale' });
        expect(storage.getItem(RIG_PURCHASES_STORAGE_KEY)).toBe('["4160"]');
    });
});
