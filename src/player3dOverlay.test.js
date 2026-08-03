import { describe, expect, it } from 'vitest';
import { computeOverlayYaw, selectOverlayAnimation } from './player3dOverlay.js';

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
});
