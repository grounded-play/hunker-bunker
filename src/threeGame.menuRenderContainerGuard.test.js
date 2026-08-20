import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

// docs/perf-chunk-mount-plan-2026-08-20.md Track D: live-observed
// #game-container collapsed to 0x0 (reparented into a hidden/closed
// '.map-box' preview slot on the loadout screen) while render() kept doing
// its full per-frame update + renderer.render() every tick -- real GPU/CPU
// cost spent on a canvas nothing could see, on any hardware. render() now
// bails out before any of that work when the container has no visible area.
// Uses the same Function.prototype.call() pattern as the other
// threeGame.*.test.js files (no live WebGL context here).
describe('ThreeGame.render container-visibility guard', () => {
    it('does nothing when the container has collapsed to 0x0', () => {
        const fake = {
            container: { clientWidth: 0, clientHeight: 0 },
            renderer: { render: vi.fn() }
        };

        const result = ThreeGame.prototype.render.call(fake);

        expect(result).toBeUndefined();
        expect(fake.renderer.render).not.toHaveBeenCalled();
    });

    it('does not throw evaluating the visibility guard itself when container is unset (defensive)', () => {
        const fake = {
            performanceProfile: 'menu',
            _lastMenuRenderAt: 0,
            menuFrameIntervalMs: 1000 / 30,
            lastTime: performance.now() - 100,
            hitstopTimer: 0,
            loadingPaused: false,
            updateMenuShowcase: vi.fn(),
            updatePlayer: vi.fn(),
            updateWeaponState: vi.fn(),
            updateCamera: vi.fn(),
            updateTransientEffects: vi.fn(),
            updateHiddenPlayerMarker: vi.fn(),
            renderer: { render: vi.fn() },
            scene: {},
            camera: {}
        };

        expect(() => ThreeGame.prototype.render.call(fake)).not.toThrow();
    });

    it('still renders normally when the container has a real, visible size', () => {
        const fake = {
            container: { clientWidth: 800, clientHeight: 600 },
            performanceProfile: 'menu',
            _lastMenuRenderAt: 0,
            menuFrameIntervalMs: 1000 / 30,
            lastTime: performance.now() - 100,
            hitstopTimer: 0,
            loadingPaused: false,
            darknessOverlay: null,
            menuShowroomFloor: null,
            targetMenuGridColor: null,
            updateMenuShowcase: vi.fn(),
            updatePlayer: vi.fn(),
            updateWeaponState: vi.fn(),
            updateCamera: vi.fn(),
            updateTransientEffects: vi.fn(),
            updateHiddenPlayerMarker: vi.fn(),
            renderer: { render: vi.fn() },
            scene: {},
            camera: {}
        };

        ThreeGame.prototype.render.call(fake);

        expect(fake.renderer.render).toHaveBeenCalledWith(fake.scene, fake.camera);
        expect(fake.updateMenuShowcase).toHaveBeenCalled();
    });
});
