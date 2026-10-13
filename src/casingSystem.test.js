import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CasingSystem, resolveCasingSurface } from './casingSystem.js';

describe('CasingSystem', () => {
    let mockScene;

    beforeEach(() => {
        mockScene = {
            add: vi.fn(),
            remove: vi.fn(),
        };
    });

    it('instantiates CasingSystem and registers instanced mesh to scene', () => {
        const sys = new CasingSystem(mockScene);
        expect(sys.casings.length).toBe(64);
        expect(mockScene.add).toHaveBeenCalled();
        expect(sys.instancedMesh).toBeDefined();
    });

    it('spawns casings and simulates parabolic ballistic trajectory', () => {
        const sys = new CasingSystem(mockScene);
        const idx = sys.spawnCasing({
            x: 10,
            y: 1.2,
            z: 20,
            aimDirX: 1,
            aimDirZ: 0,
            weaponType: 'shotgun',
            surface: 'metal'
        });

        expect(idx).toBe(0);
        const casing = sys.casings[0];
        expect(casing.active).toBe(true);
        expect(casing.vy).toBeGreaterThan(0); // upward ejection impulse
        expect(casing.surface).toBe('metal');

        // Simulate frame update
        const mockGame = {
            camera: { position: { x: 10, y: 15, z: 20 } },
            audioAt: vi.fn(() => ({ volume: 0.5 }))
        };

        sys.update(0.05, mockGame);
        expect(casing.y).toBeLessThan(1.5);
    });

    it('handles bouncing on floor with bounce decay and surface audio trigger', () => {
        const mockAudioManager = {
            play: vi.fn(),
        };
        globalThis.AudioManager = mockAudioManager;

        const sys = new CasingSystem(mockScene);
        sys.spawnCasing({
            x: 0,
            y: 0.2,
            z: 0,
            aimDirX: 0,
            aimDirZ: 1,
            weaponType: 'rifle',
            surface: 'metal'
        });

        const casing = sys.casings[0];
        // Position casing right above the floor and hurtling down fast
        casing.y = 0.04;
        casing.vy = -4.0;

        const mockGame = {
            camera: { position: { x: 0, y: 15, z: 0 } },
            audioAt: vi.fn(() => ({ volume: 0.4 }))
        };

        sys.update(0.05, mockGame);
        expect(casing.bounces).toBeGreaterThan(0);
        expect(mockAudioManager.play).toHaveBeenCalledWith(
            expect.stringMatching(/shell_drop_/),
            expect.any(Object)
        );

        delete globalThis.AudioManager;
    });

    it('resolves surface type across metal, wood, snow, and slime correctly', () => {
        expect(resolveCasingSurface(0, 0, null)).toBe('metal');
        expect(resolveCasingSurface(0, 0, { currentBiomeKey: 'cryo' })).toBe('snow');
        expect(resolveCasingSurface(0, 0, { currentBiomeKey: 'bio' })).toBe('slime');
        expect(resolveCasingSurface(0, 0, {
            camps: [{ pos: { x: 0, z: 0 } }]
        })).toBe('wood');
    });

    it('disposes cleanly and removes mesh from scene', () => {
        const sys = new CasingSystem(mockScene);
        const mesh = sys.instancedMesh;
        sys.dispose();
        expect(mockScene.remove).toHaveBeenCalledWith(mesh);
        expect(sys.instancedMesh).toBeNull();
    });
});
