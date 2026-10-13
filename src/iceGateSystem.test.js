import { describe, expect, it, vi } from 'vitest';
import {
    ICE_BARRIER_STATES,
    createIceBarrier,
    applyHeatToBarrier,
    tickIceBarrier,
    validateFireGateReachability
} from './iceGateSystem.js';

describe('IceGateSystem', () => {
    it('initializes ice barrier in frozen state with collision active', () => {
        const barrier = createIceBarrier({ id: 'barrier_cryo_1' });
        expect(barrier.state).toBe(ICE_BARRIER_STATES.FROZEN);
        expect(barrier.stage).toBe(0);
        expect(barrier.collisionActive).toBe(true);
        expect(barrier.heat).toBe(0);
    });

    it('advances melt stages under heat and disables collision when fully melted', () => {
        const barrier = createIceBarrier({ id: 'barrier_1', heatThreshold: 100 });
        const onStageChange = vi.fn();
        const onMelted = vi.fn();

        // Apply 40 heat -> Stage 1 (melting)
        applyHeatToBarrier(barrier, 40, { onStageChange, onMelted });
        expect(barrier.state).toBe(ICE_BARRIER_STATES.MELTING);
        expect(barrier.stage).toBe(1);
        expect(barrier.collisionActive).toBe(true);
        expect(onStageChange).toHaveBeenCalledWith(barrier, 1, 0);

        // Apply 35 more heat (total 75) -> Stage 2 (fractured)
        applyHeatToBarrier(barrier, 35, { onStageChange, onMelted });
        expect(barrier.state).toBe(ICE_BARRIER_STATES.FRACTURED);
        expect(barrier.stage).toBe(2);

        // Apply 30 more heat (total 105 >= 100) -> Stage 3 (melted)
        applyHeatToBarrier(barrier, 30, { onStageChange, onMelted });
        expect(barrier.state).toBe(ICE_BARRIER_STATES.MELTED);
        expect(barrier.stage).toBe(3);
        expect(barrier.collisionActive).toBe(false);
        expect(onMelted).toHaveBeenCalledWith(barrier);
    });

    it('cools down and refreezes if heat stops', () => {
        const barrier = createIceBarrier({ id: 'barrier_cool', heatThreshold: 100, coolingRate: 20 });
        applyHeatToBarrier(barrier, 40);
        expect(barrier.stage).toBe(1);

        // Exhaust cooling delay (1.0s)
        tickIceBarrier(barrier, 1.0);

        // Cool for 2 seconds (40 heat lost)
        const onCooled = vi.fn();
        tickIceBarrier(barrier, 2.0, { onCooled });
        expect(barrier.heat).toBe(0);
        expect(barrier.stage).toBe(0);
        expect(barrier.state).toBe(ICE_BARRIER_STATES.FROZEN);
        expect(onCooled).toHaveBeenCalled();
    });

    it('validates reachability proofs: weapon must precede gate and return path must exist', () => {
        const validBarrier = createIceBarrier({ id: 'b1', returnRoute: { hasReturnRoute: true } });
        expect(validateFireGateReachability({
            barriers: [validBarrier],
            weaponSourceRing: 1,
            gateRing: 2
        }).valid).toBe(true);

        // Invalid: weapon spawns in ring 3 but gate is in ring 2
        const invalidWeapon = validateFireGateReachability({
            barriers: [validBarrier],
            weaponSourceRing: 3,
            gateRing: 2
        });
        expect(invalidWeapon.valid).toBe(false);
        expect(invalidWeapon.reason).toBe('unreachable-weapon-source');

        // Invalid: missing return route
        const trappedBarrier = createIceBarrier({ id: 'b2', returnRoute: { hasReturnRoute: false } });
        const invalidReturn = validateFireGateReachability({
            barriers: [trappedBarrier],
            weaponSourceRing: 1,
            gateRing: 2
        });
        expect(invalidReturn.valid).toBe(false);
        expect(invalidReturn.reason).toBe('missing-return-route');
    });
});
