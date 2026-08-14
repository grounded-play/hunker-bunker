import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';
import { wrapAngle } from './cameraYaw.js';

describe('updateFacingYaw', () => {
    it('derives aim direction and facing basis from yaw, and marks aim active', () => {
        const game = {
            facingPlanarForward: { set: vi.fn() },
            facingPlanarRight: { set: vi.fn() },
            getFacingRow: vi.fn(() => 3),
            hasActiveAim: false
        };

        ThreeGame.prototype.updateFacingYaw.call(game, Math.PI / 2);

        expect(game.facingYaw).toBeCloseTo(Math.PI / 2, 5);
        expect(game.aimDirX).toBeCloseTo(1, 5);
        expect(game.aimDirZ).toBeCloseTo(0, 5);
        const forwardArgs = game.facingPlanarForward.set.mock.calls[0];
        expect(forwardArgs[0]).toBeCloseTo(1, 5);
        expect(forwardArgs[1]).toBeCloseTo(0, 5);
        expect(game.getFacingRow).toHaveBeenCalledWith(game.aimDirX, game.aimDirZ);
        expect(game.aimFacingRow).toBe(3);
        expect(game.hasActiveAim).toBe(true);
    });

    it('wraps yaw into (-PI, PI]', () => {
        const game = {
            facingPlanarForward: { set: vi.fn() },
            facingPlanarRight: { set: vi.fn() },
            getFacingRow: vi.fn(() => 0)
        };

        ThreeGame.prototype.updateFacingYaw.call(game, Math.PI * 3);

        expect(game.facingYaw).toBeCloseTo(Math.PI, 5);
    });
});

describe('updateCamera orbit', () => {
    function makeCameraGame(facingYaw, cameraAzimuth) {
        return {
            facingYaw,
            cameraAzimuth,
            cameraOrbitRadius: Math.hypot(8, 8),
            cameraLift: 10,
            cameraOffset: new THREE.Vector3(),
            cameraPlanarForward: new THREE.Vector2(),
            cameraPlanarRight: new THREE.Vector2(),
            player: { position: new THREE.Vector3(0, 0, 0) },
            camera: {
                position: new THREE.Vector3(0, 10, 11.31),
                lookAt: () => {}
            },
            performanceProfile: 'gameplay',
            _menuParallaxX: 0,
            _menuParallaxY: 0,
            _cameraShakeTimer: 0,
            updateTiltShiftAndBokeh: () => {}
        };
    }

    it('eases cameraAzimuth toward facingYaw + PI without snapping instantly', () => {
        const game = makeCameraGame(0, Math.PI); // target = facingYaw+PI = PI, already equal on purpose for a baseline...
        game.facingYaw = Math.PI / 2; // now target = 3PI/2 (wrapped), azimuth starts at PI
        const before = game.cameraAzimuth;
        ThreeGame.prototype.updateCamera.call(game, 0.1);
        expect(game.cameraAzimuth).not.toBe(before);
        // one 0.1s step at CAMERA_ROT_SPEED=4 should not have fully arrived
        const target = wrapAngle(game.facingYaw + Math.PI);
        expect(Math.abs(wrapAngle(target - game.cameraAzimuth))).toBeGreaterThan(0.01);
    });

    it('converges over many frames and recomputes cameraOffset/basis to match', () => {
        const game = makeCameraGame(0, 0);
        game.facingYaw = Math.PI / 2;
        for (let i = 0; i < 300; i += 1) {
            ThreeGame.prototype.updateCamera.call(game, 0.016);
        }
        const target = wrapAngle(game.facingYaw + Math.PI);
        expect(game.cameraAzimuth).toBeCloseTo(target, 2);
        expect(game.cameraOffset.x).toBeCloseTo(game.cameraOrbitRadius * Math.sin(game.cameraAzimuth), 3);
        expect(game.cameraOffset.z).toBeCloseTo(game.cameraOrbitRadius * Math.cos(game.cameraAzimuth), 3);
    });
});

describe('snapCameraToPlayer orbit', () => {
    it('snaps cameraAzimuth instantly, with no easing lag', () => {
        const game = {
            facingYaw: Math.PI / 2,
            cameraAzimuth: 0,
            cameraOrbitRadius: Math.hypot(8, 8),
            cameraLift: 10,
            cameraOffset: new THREE.Vector3(),
            cameraPlanarForward: new THREE.Vector2(),
            cameraPlanarRight: new THREE.Vector2(),
            player: { position: new THREE.Vector3(1, 0, 2) },
            camera: { position: new THREE.Vector3(), lookAt: () => {} },
            updateTiltShiftAndBokeh: () => {}
        };

        ThreeGame.prototype.snapCameraToPlayer.call(game);

        expect(game.cameraAzimuth).toBeCloseTo(wrapAngle(Math.PI / 2 + Math.PI), 5);
    });
});
