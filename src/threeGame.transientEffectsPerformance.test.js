import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
    ThreeGame,
    registerTransientEffect,
    disposeTransientEffect,
    SHARED_GROUND_SHOCKWAVE_GEOMETRY,
    SHARED_FROST_SHOCKWAVE_GEOMETRY
} from './threeGame.js';

describe('transient effects performance and pooling (GAP-RN-01)', () => {
    beforeEach(() => {
        const ctx = { fillText: vi.fn() };
        vi.stubGlobal('document', {
            createElement: () => ({ width: 0, height: 0, getContext: () => ctx })
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('enforces a hard cap of 64 effects in registerTransientEffect', () => {
        const fakeGame = {
            scene: new THREE.Scene(),
            transientEffects: []
        };

        const disposed = [];
        for (let i = 0; i < 70; i++) {
            const effect = {
                id: i,
                mesh: new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial()),
                dispose: vi.fn(() => disposed.push(i))
            };
            registerTransientEffect(fakeGame, effect);
        }

        expect(fakeGame.transientEffects.length).toBe(64);
        // The first 6 effects (0..5) should have been disposed to stay within 64
        expect(disposed.length).toBe(6);
        expect(disposed).toEqual([0, 1, 2, 3, 4, 5]);
        // The remaining effects in the pool should be 6..69
        expect(fakeGame.transientEffects[0].id).toBe(6);
        expect(fakeGame.transientEffects.at(-1).id).toBe(69);
    });

    it('SHARED_GROUND_SHOCKWAVE_GEOMETRY is flagged shared and protected from disposal', () => {
        expect(SHARED_GROUND_SHOCKWAVE_GEOMETRY.userData.shared).toBe(true);

        const fakeGame = {
            scene: new THREE.Scene(),
            transientEffects: []
        };

        const mesh = new THREE.Mesh(SHARED_GROUND_SHOCKWAVE_GEOMETRY, new THREE.MeshBasicMaterial());
        const geoDisposeSpy = vi.spyOn(SHARED_GROUND_SHOCKWAVE_GEOMETRY, 'dispose');
        const matDisposeSpy = vi.spyOn(mesh.material, 'dispose');

        const effect = { mesh };
        disposeTransientEffect(fakeGame, effect);

        expect(geoDisposeSpy).not.toHaveBeenCalled();
        expect(matDisposeSpy).toHaveBeenCalled();
    });

    it('spawnFrostShockwaveEffect reuses its own shared ring, the same shape it always had', () => {
        const game = Object.create(ThreeGame.prototype);
        game.scene = new THREE.Scene();
        game.transientEffects = [];

        game.spawnFrostShockwaveEffect(10, 20, 5.0);

        expect(game.transientEffects.length).toBe(1);
        const effect = game.transientEffects[0];
        expect(effect.mesh.geometry).toBe(SHARED_FROST_SHOCKWAVE_GEOMETRY);
        expect(SHARED_FROST_SHOCKWAVE_GEOMETRY.userData.shared).toBe(true);
        expect(SHARED_FROST_SHOCKWAVE_GEOMETRY.parameters).toMatchObject({ innerRadius: 0.1, outerRadius: 0.25, thetaSegments: 32 });
    });

    // A far effect still needs fog: skipping it left one that spawned in fog
    // at full opacity, glowing through the dark.
    it('updateTransientEffects applies fog to near and far effects alike', () => {
        const game = Object.create(ThreeGame.prototype);
        game.scene = new THREE.Scene();
        game.transientEffects = [];
        game.player = { position: { x: 0, y: 0, z: 0 } };
        game.applyFogOfWarOpacity = vi.fn();
        game.getFogOfWarVisibility = vi.fn(() => 1.0);
        game.disposeTransientEffect = vi.fn();

        const nearMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
        nearMesh.position.set(5, 0, 5); // distance ~7.07m <= 35m

        const farMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
        farMesh.position.set(50, 0, 50); // distance ~70.7m > 35m

        game.transientEffects.push(
            {
                mesh: nearMesh,
                age: 0,
                duration: 1.0,
                update: vi.fn()
            },
            {
                mesh: farMesh,
                age: 0,
                duration: 1.0,
                update: vi.fn()
            }
        );

        game.updateTransientEffects(0.016);

        expect(game.applyFogOfWarOpacity).toHaveBeenCalledWith(nearMesh, 1.0, { captureCurrent: true });
        expect(game.applyFogOfWarOpacity).toHaveBeenCalledWith(farMesh, 1.0, { captureCurrent: true });
    });

    it('updateTransientEffects caps transientEffects array to 64 and cleans up expired effects', () => {
        const game = Object.create(ThreeGame.prototype);
        game.scene = new THREE.Scene();
        game.transientEffects = [];
        game.player = { position: { x: 0, y: 0, z: 0 } };
        game.applyFogOfWarOpacity = vi.fn();
        game.getFogOfWarVisibility = vi.fn(() => 1.0);
        game.disposeTransientEffect = vi.fn();

        // Push 70 active effects
        for (let i = 0; i < 70; i++) {
            game.transientEffects.push({
                age: 0,
                duration: 5.0,
                update: vi.fn()
            });
        }

        // Expire one effect in the remaining pool
        game.transientEffects[30].age = 6.0;

        game.updateTransientEffects(0.016);

        // Cap reduces 70 to 64, then the expired one is cleaned up -> 63
        expect(game.transientEffects.length).toBe(63);
        expect(game.disposeTransientEffect).toHaveBeenCalled();
    });
});
