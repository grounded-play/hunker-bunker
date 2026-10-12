import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { CasingSystem } from './casingSystem.js';

describe('CasingSystem', () => {
    let scene;
    let casingSystem;

    beforeEach(() => {
        globalThis.window = globalThis;
        scene = new THREE.Scene();
        casingSystem = new CasingSystem(scene);
        globalThis.AudioManager = {
            play: vi.fn()
        };
        globalThis.window.AudioManager = globalThis.AudioManager;
    });

    it('initializes with instanced mesh and inactive slots', () => {
        expect(scene.children.length).toBe(1);
        expect(casingSystem.instancedMesh).toBeDefined();
        expect(casingSystem.casings.every(c => c.active === false)).toBe(true);
    });

    it('activates slot on spawnCasing and sets spatial coordinates', () => {
        const slotIdx = casingSystem.spawnCasing(5, 1, 10, 0, 1, 'kinetic');
        expect(slotIdx).toBe(0);
        expect(casingSystem.casings[0].active).toBe(true);
        expect(casingSystem.casings[0].x).toBeCloseTo(4.78, 2);
        expect(casingSystem.casings[0].y).toBe(1);
    });

    it('supports options object signature for spawnCasing', () => {
        const slotIdx = casingSystem.spawnCasing({ x: 3, y: 1.5, z: 8, aimDirX: 1, aimDirZ: 0 });
        expect(slotIdx).toBe(0);
        expect(casingSystem.casings[0].active).toBe(true);
        expect(casingSystem.casings[0].y).toBe(1.5);
    });

    it('simulates physics with bounces, restitution, friction and shell drop audio playback', () => {
        casingSystem.spawnCasing({ x: 0, y: 0.03, z: 0, aimDirX: 0, aimDirZ: 1 });
        const c = casingSystem.casings[0];
        c.vy = -2.0;

        const fakeGame = {
            getTerrainHeightAt: () => 0,
            audioAt: vi.fn((x, z, opts) => ({ ...opts, worldX: x, worldZ: z }))
        };

        // Step physics to ground impact
        casingSystem.update(0.1, fakeGame);

        expect(globalThis.AudioManager.play).toHaveBeenCalledWith(
            'shell_drop_metal',
            expect.objectContaining({ volume: 0.34 })
        );
        expect(c.bounces).toBe(1);
    });

    it('cleans up resources and scene on dispose', () => {
        expect(scene.children.length).toBe(1);
        casingSystem.dispose();
        expect(scene.children.length).toBe(0);
    });
});
