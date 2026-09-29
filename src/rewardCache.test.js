import { describe, expect, it, vi } from 'vitest';
import {
    canOpenRewardCache,
    claimRewardCache,
    planRewardCache,
    REWARD_CACHE_COSTS,
    SYNERGY_CACHE_DROPS,
    walkAwayFromRewardCache
} from './rewardCache.js';

describe('rewardCache module (Sprint 47 Lane 3)', () => {
    it('generates deterministic cache plan from seed', () => {
        const plan1 = planRewardCache({ expeditionSeed: 12345, ring: 1 });
        const plan2 = planRewardCache({ expeditionSeed: 12345, ring: 1 });
        expect(plan1.dropId).toBe(plan2.dropId);
        expect(plan1.costType).toBe(plan2.costType);
        expect(SYNERGY_CACHE_DROPS).toContain(plan1.dropId);
        expect(plan1.state).toBe('sealed');
        expect(plan1.previewed).toBe(true);
    });

    it('prioritizes partner synergy drop when player already has half a chain', () => {
        // Player has cryo_rime -> cache should offer shatter_engine
        const cryoPlan = planRewardCache({
            expeditionSeed: 999,
            equippedDrops: ['cryo_rime']
        });
        expect(cryoPlan.dropId).toBe('shatter_engine');

        // Player has caustic_payload -> cache should offer bio_vampirism
        const bioPlan = planRewardCache({
            expeditionSeed: 999,
            equippedDrops: ['caustic_payload']
        });
        expect(bioPlan.dropId).toBe('bio_vampirism');

        // Player has shatter_engine -> cache should offer cryo_rime
        const shatterPlan = planRewardCache({
            expeditionSeed: 999,
            equippedDrops: ['shatter_engine']
        });
        expect(shatterPlan.dropId).toBe('cryo_rime');
    });

    it('prevents opening when player is dead or low on O2 for siphon cost', () => {
        const cache = { state: 'sealed', costType: REWARD_CACHE_COSTS.O2_SIPHON };
        expect(canOpenRewardCache(cache, { currentO2: 100, isPlayerDead: false })).toBe(true);
        expect(canOpenRewardCache(cache, { currentO2: 10, isPlayerDead: false })).toBe(false);
        expect(canOpenRewardCache(cache, { currentO2: 80, isPlayerDead: true })).toBe(false);

        const waveCache = { state: 'sealed', costType: REWARD_CACHE_COSTS.ESCALATED_WAVE };
        expect(canOpenRewardCache(waveCache, { currentO2: 10, isPlayerDead: false })).toBe(true);
    });

    it('claims cache, applies O2 cost, and grants previewed drop', () => {
        const cache = planRewardCache({ expeditionSeed: 42 });
        cache.costType = REWARD_CACHE_COSTS.O2_SIPHON;
        cache.costConfig = { o2Drain: 25 };

        const mockGame = {
            playerVitals: { o2: 80 },
            emitO2State: vi.fn(),
            equipRunDrop: vi.fn(() => true)
        };

        const result = claimRewardCache(cache, mockGame);
        expect(result.success).toBe(true);
        expect(result.costApplied).toBe(true);
        expect(mockGame.playerVitals.o2).toBe(55);
        expect(mockGame.emitO2State).toHaveBeenCalled();
        expect(mockGame.equipRunDrop).toHaveBeenCalled();
        expect(cache.state).toBe('opened');

        // Opening again fails
        const secondAttempt = claimRewardCache(cache, mockGame);
        expect(secondAttempt.success).toBe(false);
    });

    it('reports the opening as a discovery with the localized component name key', () => {
        const dispatched = [];
        vi.stubGlobal('window', { dispatchEvent: (event) => { dispatched.push(event.detail); return true; } });
        const cache = planRewardCache({ expeditionSeed: 42 });
        claimRewardCache(cache, { playerVitals: { o2: 80 }, equipRunDrop: () => true, spawnRewardCacheDefenders: vi.fn(), triggerLockdown: vi.fn() });
        vi.unstubAllGlobals();
        expect(dispatched).toEqual([{
            kind: 'discovery',
            labelKey: 'ui.cache.report.opened',
            params: { dropId: cache.dropId, dropKey: `ui.relics.${cache.dropId}.name` }
        }]);
    });

    it('allows player to walk away from the cache without penalty', () => {
        const cache = planRewardCache({ expeditionSeed: 42 });
        expect(cache.state).toBe('sealed');

        const walkedAway = walkAwayFromRewardCache(cache);
        expect(walkedAway).toBe(true);
        expect(cache.state).toBe('refused');
    });
});
