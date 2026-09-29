import { describe, expect, it, vi } from 'vitest';
import {
    applyStatus,
    clearStatus,
    createTargetStatusState,
    deserializeTargetStatuses,
    getStatus,
    grantRunDrop,
    serializeTargetStatuses,
    STATUS_DEFAULTS,
    STATUS_IDS,
    tickStatusEffects
} from './statusEffects.js';
import { callSliceContract, hasSliceContract } from './sliceContracts.js';

describe('statusEffects module (Sprint 47 Lane 3)', () => {
    it('initializes pristine status state', () => {
        const state = createTargetStatusState();
        expect(state.freezeStacks).toBe(0);
        expect(state.isFrozen).toBe(false);
        expect(state.isCorroded).toBe(false);
        expect(state.corrosionTimer).toBe(0);
    });

    it('accumulates freeze stacks and clamps to maxStacks', () => {
        const target = {};
        applyStatus(target, STATUS_IDS.FREEZE, 34);
        let status = getStatus(target, 'freeze');
        expect(status.active).toBe(true);
        expect(status.stacks).toBe(34);
        expect(status.isFrozen).toBe(false);
        expect(status.slowMult).toBe(0.5); // >= 30 stacks applies 50% slow

        applyStatus(target, 'cryo', 34);
        expect(getStatus(target, 'cryo').stacks).toBe(68);

        applyStatus(target, 'freeze', 50); // 68 + 50 = 118 -> capped at 100
        status = getStatus(target, 'freeze');
        expect(status.stacks).toBe(100);
        expect(status.isFrozen).toBe(true);
        expect(status.slowMult).toBe(0.0); // fully frozen
    });

    it('triggers onFrozen callback when threshold is reached', () => {
        const target = {};
        const onFrozen = vi.fn();
        applyStatus(target, 'freeze', 100, { onFrozen });
        expect(onFrozen).toHaveBeenCalledTimes(1);
    });

    it('decays freeze stacks after decay delay timer expires', () => {
        const target = {};
        applyStatus(target, 'freeze', 60, { decayDelay: 1.0 });

        // Delta within decay delay (0.5s) -> no stack decay yet
        tickStatusEffects(target, 0.5);
        expect(getStatus(target, 'freeze').stacks).toBe(60);

        // Exceed decay delay (another 0.6s -> delay expires, 0.1s decay at 20/s = 2 stacks)
        tickStatusEffects(target, 0.6);
        expect(getStatus(target, 'freeze').stacks).toBeCloseTo(58, 0);

        // Advance 2 more seconds -> 40 stacks decay -> 18 left
        tickStatusEffects(target, 2.0);
        expect(getStatus(target, 'freeze').stacks).toBeCloseTo(18, 0);
    });

    it('thaws frozen targets and retains baseline stacks', () => {
        const target = {};
        const onThaw = vi.fn();
        applyStatus(target, 'freeze', 100, { duration: 2.0 });
        expect(getStatus(target, 'freeze').isFrozen).toBe(true);

        tickStatusEffects(target, 1.5, { onThaw });
        expect(getStatus(target, 'freeze').isFrozen).toBe(true);
        expect(onThaw).not.toHaveBeenCalled();

        tickStatusEffects(target, 0.6, { onThaw }); // 2.1s elapsed >= 2.0s
        expect(getStatus(target, 'freeze').isFrozen).toBe(false);
        expect(getStatus(target, 'freeze').stacks).toBe(STATUS_DEFAULTS.thawRetainedStacks); // 50
        expect(onThaw).toHaveBeenCalledTimes(1);
    });

    it('applies corrosion DoT and fires ticks at interval', () => {
        const target = {};
        const onCorrosionTick = vi.fn();
        const onCorrosionExpired = vi.fn();

        applyStatus(target, 'corrosion', 2.0, { tickDamage: 3, tickInterval: 0.5 });
        const initial = getStatus(target, 'bio');
        expect(initial.active).toBe(true);
        expect(initial.tickDamage).toBe(3);

        // 0.4s: no tick yet
        tickStatusEffects(target, 0.4, { onCorrosionTick, onCorrosionExpired });
        expect(onCorrosionTick).not.toHaveBeenCalled();

        // 0.2s more (total 0.6s >= 0.5s): first tick
        tickStatusEffects(target, 0.2, { onCorrosionTick, onCorrosionExpired });
        expect(onCorrosionTick).toHaveBeenCalledTimes(1);
        expect(onCorrosionTick).toHaveBeenCalledWith(target, 3, expect.any(Object));

        // Advance past expiration (1.6s more -> 2.2s total >= 2.0s)
        tickStatusEffects(target, 1.6, { onCorrosionTick, onCorrosionExpired });
        expect(onCorrosionTick.mock.calls.length).toBeGreaterThanOrEqual(3);
        expect(onCorrosionExpired).toHaveBeenCalledTimes(1);
        expect(getStatus(target, 'corrosion').active).toBe(false);
    });

    it('clears statuses cleanly', () => {
        const target = { userData: {} };
        applyStatus(target, 'freeze', 100);
        applyStatus(target, 'corrosion', 3.0);
        expect(getStatus(target, 'freeze').active).toBe(true);
        expect(getStatus(target, 'corrosion').active).toBe(true);

        clearStatus(target, 'freeze');
        expect(getStatus(target, 'freeze').active).toBe(false);
        expect(getStatus(target, 'corrosion').active).toBe(true);

        clearStatus(target, 'corrosion');
        expect(getStatus(target, 'corrosion').active).toBe(false);
    });

    it('serializes and deserializes target status without state loss', () => {
        const target = { userData: {} };
        applyStatus(target, 'freeze', 75);
        applyStatus(target, 'corrosion', 2.5, { tickDamage: 4 });

        const snapshot = serializeTargetStatuses(target);
        expect(snapshot.freezeStacks).toBe(75);
        expect(snapshot.isCorroded).toBe(true);
        expect(snapshot.corrosionTickDamage).toBe(4);

        const restoredTarget = { userData: {} };
        deserializeTargetStatuses(restoredTarget, snapshot);
        expect(getStatus(restoredTarget, 'freeze').stacks).toBe(75);
        expect(getStatus(restoredTarget, 'corrosion').active).toBe(true);
        expect(getStatus(restoredTarget, 'corrosion').tickDamage).toBe(4);
    });

    it('registers grantRunDrop with sliceContracts and equips valid drops', () => {
        expect(hasSliceContract('grantRunDrop')).toBe(true);

        const mockGame = {
            runRelics: [],
            runOverclocks: [],
            equipRunDrop: vi.fn((drop) => {
                mockGame.runRelics.push(drop);
                return true;
            })
        };

        const result = grantRunDrop(mockGame, 'last_breath');
        expect(result).toBe(true);
        expect(mockGame.equipRunDrop).toHaveBeenCalledTimes(1);
        expect(mockGame.runRelics[0].id).toBe('last_breath');

        // Rejection for non-existent or unimplemented drop
        expect(grantRunDrop(mockGame, 'unknown_drop_xyz')).toBe(false);

        // Verification via slice contract caller
        const contractCall = callSliceContract('grantRunDrop', mockGame, 'last_breath');
        expect(contractCall.available).toBe(true);
    });
});
