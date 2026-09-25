import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

const originalWindow = globalThis.window;

afterEach(() => {
    globalThis.window = originalWindow;
});

function makeAdaptiveGame() {
    let pixelRatio = 1.15;
    return {
        performanceProfile: 'gameplay',
        adaptiveGameplayPerformanceMode: false,
        gameplayPostProcessingEnabled: true,
        gameplayPixelRatio: 1.15,
        visibleChunkRadius: 2,
        defaultVisibleChunkRadius: 2,
        renderer: {
            shadowMap: { enabled: true, autoUpdate: true },
            getPixelRatio: () => pixelRatio,
            setPixelRatio: vi.fn((value) => { pixelRatio = value; }),
            info: {
                render: { calls: 12, triangles: 400 },
                memory: { geometries: 8, textures: 9 },
                programs: []
            }
        },
        tiltShiftOverlay: { classList: { toggle: vi.fn() } },
        resize: vi.fn(),
        getPerformanceDiagnosticsSnapshot: () => ({ drawCalls: 12 }),
        setAdaptiveGameplayPerformanceMode(enabled, options) {
            return ThreeGame.prototype.setAdaptiveGameplayPerformanceMode.call(this, enabled, options);
        }
    };
}

describe('ThreeGame adaptive gameplay quality', () => {
    // Owner rule (2026-08-26, restated 2026-09-25): adaptive quality lowers
    // render resolution only. Post-processing, live shadows, 3D models and
    // animation stay at full quality on every tier.
    it('engages immediately on Steam Deck and keeps world visibility intact', () => {
        globalThis.window = { __hbSteamStatus: { isSteamDeck: true } };
        const fake = makeAdaptiveGame();

        ThreeGame.prototype.updateAdaptiveGameplayQuality.call(fake, 1 / 60);

        expect(fake.adaptiveGameplayPerformanceMode).toBe(true);
        expect(fake.gameplayPostProcessingEnabled).toBe(true);
        expect(fake.renderer.shadowMap.enabled).toBe(true);
        expect(fake.renderer.shadowMap.autoUpdate).toBe(true);
        expect(fake.renderer.setPixelRatio).toHaveBeenCalledWith(0.85);
        expect(fake.visibleChunkRadius).toBe(fake.defaultVisibleChunkRadius);
    });

    it('waits for sustained low FPS on ordinary hardware', () => {
        globalThis.window = { __hbSteamStatus: { isSteamDeck: false } };
        const fake = makeAdaptiveGame();

        for (let i = 0; i < 37; i += 1) {
            ThreeGame.prototype.updateAdaptiveGameplayQuality.call(fake, 0.04);
        }
        expect(fake.adaptiveGameplayPerformanceMode).toBe(false);

        ThreeGame.prototype.updateAdaptiveGameplayQuality.call(fake, 0.04);
        expect(fake.adaptiveGameplayPerformanceMode).toBe(true);
    });

    it('does not degrade after one isolated stall and clears pressure after recovery', () => {
        globalThis.window = { __hbSteamStatus: { isSteamDeck: false } };
        const fake = makeAdaptiveGame();

        ThreeGame.prototype.updateAdaptiveGameplayQuality.call(fake, 1.2);
        expect(fake._adaptiveLowFpsSeconds).toBe(0.25);
        expect(fake.adaptiveGameplayPerformanceMode).toBe(false);

        ThreeGame.prototype.updateAdaptiveGameplayQuality.call(fake, 1 / 60);
        expect(fake._adaptiveLowFpsSeconds).toBe(0);
        expect(fake.adaptiveGameplayPerformanceMode).toBe(false);
    });

    it('retains the authored focus composer after adaptive mode engages', () => {
        const composer = { render: vi.fn() };
        const renderer = { render: vi.fn() };
        const fake = {
            performanceProfile: 'gameplay',
            cameraMode: 'isometric',
            adaptiveGameplayPerformanceMode: true,
            gameplayPostProcessingEnabled: true,
            composer,
            renderer,
            scene: {},
            camera: {},
            getPerformanceDiagnosticsSnapshot: () => ({})
        };

        ThreeGame.prototype.renderWithPerf.call(fake);

        expect(composer.render).toHaveBeenCalledOnce();
        expect(renderer.render).not.toHaveBeenCalled();
    });

    it('keeps loading 3D prop models after adaptive mode engages', () => {
        const fake = {
            adaptiveGameplayPerformanceMode: true,
            _world3dLoadsInFlight: 3,
            player: { position: { x: 0, z: 0 } }
        };
        const source = { userData: { world3dModelType: 'prop_o2_filter_vat' }, position: { x: 0, z: 0 } };
        // At the in-flight cap it returns before any load; the point is that
        // the adaptive tier is not itself a reason to stop loading models.
        const src = ThreeGame.prototype.loadNearbyWorld3dReplacement.toString();
        expect(src).not.toMatch(/adaptiveGameplayPerformanceMode/);
        expect(() => ThreeGame.prototype.loadNearbyWorld3dReplacement.call(fake, source)).not.toThrow();
    });
});
