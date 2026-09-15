import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

describe('later goal module presentation', () => {
    beforeEach(() => {
        vi.stubGlobal('window', { dispatchEvent: vi.fn() });
        vi.stubGlobal('CustomEvent', class CustomEvent {
            constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
        });
    });

    it('raises the correct structure from below ground and resolves on completion', async () => {
        const source = new THREE.Sprite();
        source.position.set(12, 0.09, 14);
        const shadowSource = new THREE.Object3D();
        const ship = { hullModuleSprite: source, hullModuleShadow: shadowSource };
        const game = {
            getActiveShip: () => ship,
            getGoalModulePresentation: ThreeGame.prototype.getGoalModulePresentation,
            setupWorld3dReplacement: vi.fn(),
            focusCinematicCamera: vi.fn()
        };

        const finished = ThreeGame.prototype.playGoalModuleWorldReveal.call(game, 'hullExpansion');
        expect(source.position.y).toBeLessThan(0);
        expect(game.focusCinematicCamera).toHaveBeenCalledWith({ x: 12, z: 14 }, { immediate: true });
        ThreeGame.prototype.updateGoalModuleRise.call(game, 1.35);

        await expect(finished).resolves.toBe(true);
        expect(source.position.y).toBeCloseTo(0.09);
        expect(source.scale.x).toBeCloseTo(1.58);
        expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'goal-structure-rise-complete' }));
    });

    it('restores a completed visual and resolves safely when interrupted', async () => {
        const source = new THREE.Sprite();
        const game = {
            _goalModuleRise: { source, shadowSource: new THREE.Object3D(), resolve: vi.fn() },
            clearCinematicCameraFocus: vi.fn()
        };
        expect(ThreeGame.prototype.cancelGoalModuleRise.call(game)).toBe(true);
        expect(source.position.y).toBeCloseTo(0.09);
        expect(game._goalModuleRise).toBeNull();
        expect(game.clearCinematicCameraFocus).toHaveBeenCalledOnce();
    });
});
