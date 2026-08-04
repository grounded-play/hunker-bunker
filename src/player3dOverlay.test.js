import { describe, expect, it } from 'vitest';
import {
    ENGINEER_GESTURES,
    INJURED_LOCOMOTION_VARIANTS,
    computeOperatorPolishMaterialState,
    computeLocomotionWeights,
    computeOverlayYaw,
    computeUpperBodyAimOffset,
    selectLocomotionActionName,
    selectOverlayAnimation
} from './player3dOverlay.js';

describe('player 3D cosmetic overlay', () => {
    it('exposes the Engineer gesture pack for showroom pose cycling', () => {
        expect(ENGINEER_GESTURES).toContain('engineerThoughtful');
        expect(ENGINEER_GESTURES).toContain('engineerAcknowledge');
        expect(ENGINEER_GESTURES).toContain('engineerNo');
        expect(ENGINEER_GESTURES).toHaveLength(15);
    });

    it('applies unlocked polish color and shine without losing the base material', () => {
        const polished = computeOperatorPolishMaterialState(0x808080, 0.72, 0.08, 0x58efff);
        expect(polished.color.getHex()).not.toBe(0x808080);
        expect(polished.roughness).toBe(0.36);
        expect(polished.metalness).toBe(0.2);

        const standard = computeOperatorPolishMaterialState(0x808080, 0.72, 0.08, 0xffffff);
        expect(standard.color.getHex()).toBe(0x808080);
        expect(standard.roughness).toBe(0.72);
        expect(standard.metalness).toBe(0.08);
    });

    it('maps world directions to continuous Mixamo yaw', () => {
        expect(computeOverlayYaw(0, 1)).toBeCloseTo(0);
        expect(computeOverlayYaw(1, 0)).toBeCloseTo(Math.PI / 2);
        expect(computeOverlayYaw(-1, 0)).toBeCloseTo(-Math.PI / 2);
    });

    it('selects locomotion relative to aim', () => {
        const base = { isMoving: true, hasAim: true, aimX: 0, aimZ: 1 };
        expect(selectOverlayAnimation({ ...base, moveX: 0, moveZ: -1 })).toBe('backward');
        expect(selectOverlayAnimation({ ...base, moveX: -1, moveZ: 0 })).toBe('strafeLeft');
        expect(selectOverlayAnimation({ ...base, moveX: 1, moveZ: 0 })).toBe('strafeRight');
    });

    it('prioritizes fall and reload over locomotion', () => {
        expect(selectOverlayAnimation({ isFalling: true, isReloading: true, isMoving: true })).toBe('fall');
        expect(selectOverlayAnimation({ isReloading: true, isMoving: true })).toBe('reload');
    });

    it('continuously blends diagonal aim-relative movement', () => {
        const weights = computeLocomotionWeights({
            isMoving: true,
            hasAim: true,
            moveX: -1,
            moveZ: 1,
            aimX: 0,
            aimZ: 1
        });
        expect(weights.idle).toBeCloseTo(0.15);
        expect(weights.walk).toBeCloseTo(0.425);
        expect(weights.strafeLeft).toBeCloseTo(0.425);
        expect(Object.values(weights).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1);
    });

    it('turns the upper body toward aim without overtwisting the legs', () => {
        expect(computeUpperBodyAimOffset(0, 1, 0)).toBeCloseTo(Math.PI / 2);
        expect(computeUpperBodyAimOffset(0, -1, 0)).toBeCloseTo(-Math.PI / 2);
        expect(computeUpperBodyAimOffset(0, 0, -1)).toBeCloseTo(Math.PI / 2);
    });

    it('redirects idle/walk/run to their injured counterpart only when hurt and the clip exists', () => {
        expect(selectLocomotionActionName('walk', true, true)).toBe('injuredWalk');
        expect(selectLocomotionActionName('walk', false, true)).toBe('walk');
        expect(selectLocomotionActionName('walk', true, false)).toBe('walk');
        expect(selectLocomotionActionName('run', true, true)).toBe('injuredRun');
        expect(selectLocomotionActionName('idle', true, true)).toBe('injuredIdle');
    });

    it('does not redirect directions the injured pack has no clip for', () => {
        expect(selectLocomotionActionName('backward', true, false)).toBe('backward');
        expect(selectLocomotionActionName('strafeLeft', true, false)).toBe('strafeLeft');
        expect(INJURED_LOCOMOTION_VARIANTS.backward).toBeUndefined();
        expect(INJURED_LOCOMOTION_VARIANTS.strafeLeft).toBeUndefined();
    });
});
