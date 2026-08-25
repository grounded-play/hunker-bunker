import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

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

describe('updateCamera stable isometric tracking', () => {
    function makeCameraGame(cameraAzimuth) {
        return {
            facingYaw: 0,
            cameraAzimuth,
            cameraOrbitRadius: Math.hypot(8, 8),
            cameraLift: 10,
            cameraOffset: new THREE.Vector3(),
            cameraPlanarForward: new THREE.Vector2(),
            cameraPlanarRight: new THREE.Vector2(),
            player: { position: new THREE.Vector3(0, 0, 0) },
            camera: {
                position: new THREE.Vector3(0, 10, 11.31),
                lookAt: () => {},
                position_lerp: vi.fn()
            },
            performanceProfile: 'gameplay',
            _menuParallaxX: 0,
            _menuParallaxY: 0,
            _cameraShakeTimer: 0,
            updateTiltShiftAndBokeh: () => {}
        };
    }

    it('maintains stable isometric camera offset and updates planar basis', () => {
        const game = makeCameraGame(Math.PI / 4);
        ThreeGame.prototype.updateCamera.call(game, 0.016);

        expect(game.cameraPlanarForward.x).toBeCloseTo(-1 / Math.sqrt(2), 3);
        expect(game.cameraPlanarForward.y).toBeCloseTo(-1 / Math.sqrt(2), 3);
        expect(game.cameraPlanarRight.x).toBeCloseTo(1 / Math.sqrt(2), 3);
        expect(game.cameraPlanarRight.y).toBeCloseTo(-1 / Math.sqrt(2), 3);
        expect(game.cameraOffset.x).toBeCloseTo(8, 2);
        expect(game.cameraOffset.z).toBeCloseTo(8, 2);
    });

    it('orbits the camera from right-stick input while preserving gameplay profile', () => {
        const game = makeCameraGame(Math.PI / 4);
        game.cameraRotationInput = 1;
        ThreeGame.prototype.updateCamera.call(game, 0.5);

        expect(game.cameraAzimuth).toBeCloseTo(Math.PI / 4 + 1.4, 5);
        expect(game.cameraPlanarForward.length()).toBeCloseTo(1, 5);
        expect(game.cameraPlanarRight.length()).toBeCloseTo(1, 5);
    });

    it('orbits from mouse-right drag deltas', () => {
        const game = makeCameraGame(Math.PI / 4);
        game._cameraOrbitPointerDelta = 20;
        ThreeGame.prototype.updateCamera.call(game, 0.016);

        expect(game.cameraAzimuth).toBeCloseTo(Math.PI / 4 + 0.16, 5);
        expect(game._cameraOrbitPointerDelta).toBe(0);
    });
});

describe('updateCamera third-person steering', () => {
    it('turns actor and camera together and keeps the camera behind facing', () => {
        const game = {
            cameraMode: 'third-person',
            performanceProfile: 'gameplay',
            facingYaw: 0,
            cameraAzimuth: 0,
            cameraRotationInput: 1,
            _cameraOrbitPointerDelta: 0,
            cameraOrbitRadius: 4,
            cameraLift: 2,
            cameraOffset: new THREE.Vector3(),
            cameraPlanarForward: new THREE.Vector2(),
            cameraPlanarRight: new THREE.Vector2(),
            updateFacingYaw(yaw) { this.facingYaw = yaw; },
            updateThirdPersonCamera: vi.fn(),
            updateTiltShiftAndBokeh: vi.fn()
        };

        ThreeGame.prototype.updateCamera.call(game, 0.1);

        expect(game.facingYaw).toBeCloseTo(0.235, 3);
        expect(game.cameraAzimuth).toBeCloseTo(-Math.PI + 0.235, 3);
        expect(game.cameraPlanarForward.x).toBeCloseTo(Math.sin(game.facingYaw), 3);
        expect(game.cameraPlanarForward.y).toBeCloseTo(Math.cos(game.facingYaw), 3);
        expect(game.updateThirdPersonCamera).toHaveBeenCalledWith(0.1);
    });
});

describe('snapCameraToPlayer', () => {
    it('snaps camera position to player without altering cameraAzimuth', () => {
        const game = {
            cameraAzimuth: Math.PI / 4,
            cameraOrbitRadius: Math.hypot(8, 8),
            cameraLift: 10,
            cameraOffset: new THREE.Vector3(),
            cameraPlanarForward: new THREE.Vector2(),
            cameraPlanarRight: new THREE.Vector2(),
            player: { position: new THREE.Vector3(10, 0, 20) },
            camera: { position: new THREE.Vector3(), lookAt: vi.fn() },
            updateTiltShiftAndBokeh: () => {}
        };

        ThreeGame.prototype.snapCameraToPlayer.call(game);

        expect(game.cameraAzimuth).toBeCloseTo(Math.PI / 4, 5);
        expect(game.camera.position.x).toBeCloseTo(18, 2);
        expect(game.camera.position.z).toBeCloseTo(28, 2);
    });
});

describe('getFacingRow / getWorldDirectionForFacingRow use the camera basis', () => {
    it('getFacingRow reads cameraPlanarRight/Forward', () => {
        const game = {
            cameraPlanarRight: { x: 1, y: 0 },
            cameraPlanarForward: { x: 0, y: -1 }
        };

        const row = ThreeGame.prototype.getFacingRow.call(game, 1, 0);

        expect(row).toBe(0);
    });

    it('getWorldDirectionForFacingRow round-trips through the camera basis', () => {
        const game = {
            cameraPlanarRight: { x: 1, y: 0 },
            cameraPlanarForward: { x: 0, y: -1 }
        };

        const dir = ThreeGame.prototype.getWorldDirectionForFacingRow.call(game, 0);

        expect(dir.x).toBeCloseTo(1, 5);
        expect(dir.z).toBeCloseTo(0, 5);
    });
});

describe('fire/melee direction normalizes aimDirX/Z', () => {
    beforeEach(() => {
        globalThis.window = {
            dispatchEvent: vi.fn(),
            AudioManager: { playMetalStress: vi.fn() }
        };
        globalThis.CustomEvent = class CustomEvent {
            constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
        };
    });

    it('triggerGameplayMelee normalizes aimDirX/Z directly', () => {
        const game = {
            isGameplayInputActive: () => true,
            player: { position: { x: 0, z: 0 } },
            isPlayerDead: false,
            meleeCooldownTimer: 0,
            isInsideNoFireZone: () => false,
            aimDirX: 0,
            aimDirZ: 1,
            scatterSprites: [],
            spawnPhysicalBurst: vi.fn()
        };

        ThreeGame.prototype.triggerGameplayMelee.call(game, {});

        expect(game.aimDirX).toBe(0);
    });
});
