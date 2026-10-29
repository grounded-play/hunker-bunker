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

    it('does not raise duplicate escape systems from the crash wreck', async () => {
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
        await expect(finished).resolves.toBe(false);
        expect(source.position.y).toBeCloseTo(0.09);
        expect(game.focusCinematicCamera).not.toHaveBeenCalled();
        expect(window.dispatchEvent).not.toHaveBeenCalled();
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
