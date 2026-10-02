import { describe, expect, it, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

describe('ThreeGame S49-26 Camera, Tilt-Shift, and Character Rim Light', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('defaults cameraMode to isometric in accordance with Decision 12', () => {
        const game = Object.create(ThreeGame.prototype);
        game.cameraMode = 'isometric';
        expect(game.cameraMode).toBe('isometric');

        // Test setCameraMode defaults and switches
        game.selectActiveCamera = vi.fn();
        game.resize = vi.fn();

        expect(game.setCameraMode('third-person')).toBe('third-person');
        expect(game.cameraMode).toBe('third-person');

        expect(game.setCameraMode('isometric')).toBe('isometric');
        expect(game.cameraMode).toBe('isometric');

        // Any non-third-person value defaults to isometric
        expect(game.setCameraMode()).toBe('isometric');
        expect(game.cameraMode).toBe('isometric');
    });

    it('disables gameplay tilt-shift blur passes by default and allows toggling', () => {
        const passV = { enabled: false, uniforms: { focusY: { value: 0.5 } } };
        const passH = { enabled: false, uniforms: { focusY: { value: 0.5 } } };

        const game = {
            tiltShiftPassV: passV,
            tiltShiftPassH: passH,
            gameplayTiltShiftBlurEnabled: false,
            setGameplayTiltShiftBlur: ThreeGame.prototype.setGameplayTiltShiftBlur
        };

        expect(game.gameplayTiltShiftBlurEnabled).toBe(false);
        expect(passV.enabled).toBe(false);
        expect(passH.enabled).toBe(false);

        game.setGameplayTiltShiftBlur(true);
        expect(game.gameplayTiltShiftBlurEnabled).toBe(true);
        expect(passV.enabled).toBe(true);
        expect(passH.enabled).toBe(true);

        game.setGameplayTiltShiftBlur(false);
        expect(game.gameplayTiltShiftBlurEnabled).toBe(false);
        expect(passV.enabled).toBe(false);
        expect(passH.enabled).toBe(false);
    });

    it('creates character rim light and tracks player position in shadow frustum updates', () => {
        const target = new THREE.Object3D();
        const dirLight = new THREE.DirectionalLight(0xd6e7ff, 2.3);
        const rimLight = new THREE.DirectionalLight(0x7bc5ff, 1.8);
        rimLight.castShadow = false;
        rimLight.target = target;

        const game = {
            player: { position: new THREE.Vector3(12, 0, -8) },
            directionalLightTarget: target,
            directionalLight: dirLight,
            characterRimLight: rimLight,
            _sunOffset: { x: 10, y: 18, z: 8 },
            updateDirectionalShadowFrustum: ThreeGame.prototype.updateDirectionalShadowFrustum
        };

        game.updateDirectionalShadowFrustum();

        // Target tracks player
        expect(target.position.x).toBe(12);
        expect(target.position.z).toBe(-8);

        // Key light positioned at player + sun offset
        expect(dirLight.position.x).toBe(22);
        expect(dirLight.position.y).toBe(18);
        expect(dirLight.position.z).toBe(0);

        // Rim light positioned opposite key light at target - 10, targetY + 14, targetZ - 10
        expect(rimLight.position.x).toBe(2);
        expect(rimLight.position.y).toBe(14);
        expect(rimLight.position.z).toBe(-18);
        expect(rimLight.castShadow).toBe(false);
    });
});
