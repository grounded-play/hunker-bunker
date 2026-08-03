import { describe, expect, it } from 'vitest';
import {
    computeLocomotionWeights,
    computeOverlayYaw,
    computeUpperBodyAimOffset,
    selectOverlayAnimation
} from './player3dOverlay.js';

describe('player 3D cosmetic overlay', () => {
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
});
