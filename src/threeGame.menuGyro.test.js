import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

describe('ThreeGame - Menu Gyro & Motion Parallax System', () => {
    it('sets up and cleans up motion event listeners when window is defined', () => {
        const mockWindow = {
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            innerWidth: 1920,
            innerHeight: 1080
        };
        const prevWindow = globalThis.window;
        globalThis.window = mockWindow;

        try {
            const fakeGame = {
                setupMenuGyroListeners: ThreeGame.prototype.setupMenuGyroListeners,
                removeMenuGyroListeners: ThreeGame.prototype.removeMenuGyroListeners
            };

            fakeGame.setupMenuGyroListeners();
            expect(fakeGame.handleDeviceOrientation).toBeDefined();
            expect(fakeGame.handleDeviceMotion).toBeDefined();
            expect(fakeGame.handleMenuPointerMove).toBeDefined();
            expect(mockWindow.addEventListener).toHaveBeenCalledWith('deviceorientation', expect.any(Function), { passive: true });

            fakeGame.removeMenuGyroListeners();
            expect(mockWindow.removeEventListener).toHaveBeenCalledWith('deviceorientation', fakeGame.handleDeviceOrientation);
        } finally {
            globalThis.window = prevWindow;
        }
    });

    it('calculates menu camera parallax offset from device orientation and pointer input', () => {
        const fakeGame = {
            performanceProfile: 'menu',
            cameraOffset: new THREE.Vector3(8, 10, 8),
            player: { position: new THREE.Vector3(0, 0, 0) },
            camera: new THREE.PerspectiveCamera(60, 1, 0.1, 1000),
            _rawGyroX: 0.5,
            _rawGyroY: 0.5,
            _menuParallaxX: 0,
            _menuParallaxY: 0,
            _cameraShakeTimer: 0,
            updateTiltShiftAndBokeh: () => {}
        };
        fakeGame.camera.position.set(8, 10, 8);

        ThreeGame.prototype.updateCamera.call(fakeGame, 0.016);

        expect(fakeGame._menuParallaxX).toBeGreaterThan(0);
        expect(fakeGame._menuParallaxY).toBeGreaterThan(0);
    });

    it('decays menu parallax offset when switching to gameplay profile', () => {
        const fakeGame = {
            performanceProfile: 'gameplay',
            cameraOffset: new THREE.Vector3(8, 10, 8),
            player: { position: new THREE.Vector3(0, 0, 0) },
            camera: new THREE.PerspectiveCamera(60, 1, 0.1, 1000),
            _menuParallaxX: 1.0,
            _menuParallaxY: 1.0,
            _cameraShakeTimer: 0,
            updateTiltShiftAndBokeh: () => {}
        };
        fakeGame.camera.position.set(8, 10, 8);

        ThreeGame.prototype.updateCamera.call(fakeGame, 0.016);

        expect(fakeGame._menuParallaxX).toBeLessThan(1.0);
        expect(fakeGame._menuParallaxY).toBeLessThan(1.0);
    });
});
