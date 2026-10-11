import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { DEFAULT_GRAPHICS_SETTINGS } from './graphicsSettings.js';

const originalWindow = globalThis.window;

afterEach(() => {
    globalThis.window = originalWindow;
});

function makeAdaptiveGame() {
    let pixelRatio = 1.15;
    return {
        performanceProfile: 'gameplay',
        adaptiveGameplayPerformanceMode: false,
        // Past the deploy grace period unless a test says otherwise.
        _adaptiveGameplaySeconds: 60,
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
        // Settings > Graphics (src/graphicsSettings.js): automatic steps land here.
        graphicsSettings: DEFAULT_GRAPHICS_SETTINGS,
        chunkMeshes: new Map(),
        saveGraphics: vi.fn(),
        announceGraphicsChange: vi.fn(),
        gameplayTargetPixelRatio() {
            return ThreeGame.prototype.gameplayTargetPixelRatio.call(this);
        },
        applyGraphicsSettings() {
            return ThreeGame.prototype.applyGraphicsSettings.call(this);
        },
        autoLowerGraphics(options) {
            return ThreeGame.prototype.autoLowerGraphics.call(this, options);
        },
        setAdaptiveGameplayPerformanceMode(enabled, options) {
            return ThreeGame.prototype.setAdaptiveGameplayPerformanceMode.call(this, enabled, options);
        },
        updateAdaptiveGameplayRecovery(fps, sample) {
            return ThreeGame.prototype.updateAdaptiveGameplayRecovery.call(this, fps, sample);
        }
    };
}

describe('ThreeGame adaptive gameplay quality', () => {
    // Owner rules: full quality first, on the Deck too (2026-09-25); never
    // switch post-processing or shadows off automatically, never swap models
    // (2026-08-26, 2026-09-25). Owner 2026-10-11: when the game stalls, turn
    // things down one at a time in Settings > Graphics and say why there, by
    // what holds the frame up (src/graphicsSettings.js).
    it('does not drop the Steam Deck to a lower resolution on its first frame', () => {
        globalThis.window = { __hbSteamStatus: { isSteamDeck: true } };
        const fake = makeAdaptiveGame();

        ThreeGame.prototype.updateAdaptiveGameplayQuality.call(fake, 1 / 60);

        expect(fake.adaptiveGameplayPerformanceMode).toBe(false);
        expect(fake.renderer.setPixelRatio).not.toHaveBeenCalled();
    });

    it('when engaged, lowers resolution only: post-processing, shadows and world intact', () => {
        const fake = makeAdaptiveGame();

        fake.setAdaptiveGameplayPerformanceMode(true, { reason: 'test' });

        expect(fake.adaptiveGameplayPerformanceMode).toBe(true);
        expect(fake.gameplayPostProcessingEnabled).toBe(true);
        expect(fake.renderer.shadowMap.enabled).toBe(true);
        expect(fake.renderer.shadowMap.autoUpdate).toBe(true);
        expect(fake.renderer.setPixelRatio).toHaveBeenCalledWith(0.85);
        expect(fake.visibleChunkRadius).toBe(fake.defaultVisibleChunkRadius);
    });

    it('keeps full resolution when slow frames are main-thread bound', () => {
        globalThis.window = { __hbSteamStatus: { isSteamDeck: false } };
        const fake = makeAdaptiveGame();
        // PC log 2026-09-25: ~8 ms of GPU in ~48 ms frames.
        fake.gpuFrameTimer = { snapshot: () => ({ supported: true, samples: 500, averageMs: 8.4 }) };

        for (let i = 0; i < 120; i += 1) {
            ThreeGame.prototype.updateAdaptiveGameplayQuality.call(fake, 0.048);
        }
        expect(fake.adaptiveGameplayPerformanceMode).toBe(false);
        expect(fake.renderer.setPixelRatio).not.toHaveBeenCalled();
    });

    it('lowers resolution in the settings when the GPU fills most of each slow frame', () => {
        globalThis.window = { __hbSteamStatus: { isSteamDeck: false } };
        const fake = makeAdaptiveGame();
        fake.gpuFrameTimer = { snapshot: () => ({ supported: true, samples: 500, averageMs: 36 }) };

        for (let i = 0; i < 60; i += 1) {
            ThreeGame.prototype.updateAdaptiveGameplayQuality.call(fake, 0.04);
        }
        expect(fake.graphicsSettings.values.resolution).toBe('85');
        expect(fake.graphicsSettings.autoChanges[0]).toMatchObject({ key: 'resolution', from: '100', to: '85', bound: 'gpu' });
        expect(fake.renderer.setPixelRatio).toHaveBeenCalledWith(expect.closeTo(1.15 * 0.85, 5));
        expect(fake.gameplayPostProcessingEnabled).toBe(true);
        expect(fake.renderer.shadowMap.enabled).toBe(true);
        expect(fake.renderer.shadowMap.autoUpdate).toBe(true);
    });

    it('waits for sustained low FPS on ordinary hardware', () => {
        globalThis.window = { __hbSteamStatus: { isSteamDeck: false } };
        const fake = makeAdaptiveGame();

        for (let i = 0; i < 37; i += 1) {
            ThreeGame.prototype.updateAdaptiveGameplayQuality.call(fake, 0.04);
        }
        expect(fake.graphicsSettings.autoChanges).toEqual([]);

        ThreeGame.prototype.updateAdaptiveGameplayQuality.call(fake, 0.04);
        expect(fake.graphicsSettings.autoChanges).toHaveLength(1);
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

    // Deck log 2026-10-07: the deploy stall (frames of 1-3.6 s) engaged
    // adaptive mode at 3.5 FPS, and nothing ever turned it off again.
    it('ignores the first seconds after deploy', () => {
        const fake = makeAdaptiveGame();
        fake._adaptiveGameplaySeconds = 0;
        for (let i = 0; i < 40; i++) ThreeGame.prototype.updateAdaptiveGameplayQuality.call(fake, 0.25);
        expect(fake.adaptiveGameplayPerformanceMode).toBe(false);
        expect(fake.graphicsSettings.autoChanges).toEqual([]);
    });

    it('never raises anything back on its own: the player restores it in Settings', () => {
        const fake = makeAdaptiveGame();
        fake.gpuFrameTimer = { snapshot: () => ({ supported: true, samples: 60, averageMs: 36 }) };
        for (let i = 0; i < 60; i++) ThreeGame.prototype.updateAdaptiveGameplayQuality.call(fake, 0.04);
        expect(fake.graphicsSettings.values.resolution).toBe('85');
        for (let i = 0; i < 60 * 20; i++) ThreeGame.prototype.updateAdaptiveGameplayQuality.call(fake, 1 / 60);
        expect(fake.graphicsSettings.values.resolution).toBe('85');
        expect(fake.adaptiveGameplayPerformanceMode).toBe(false);
    });

    it('steps one setting at a time, waiting between steps to see whether the last helped', () => {
        const fake = makeAdaptiveGame();
        fake.gpuFrameTimer = { snapshot: () => ({ supported: true, samples: 60, averageMs: 36 }) };
        for (let i = 0; i < 25 * 5; i++) ThreeGame.prototype.updateAdaptiveGameplayQuality.call(fake, 0.04);
        expect(fake.graphicsSettings.autoChanges.map((change) => change.key)).toEqual(['resolution']);
        for (let i = 0; i < 25 * 8; i++) ThreeGame.prototype.updateAdaptiveGameplayQuality.call(fake, 0.04);
        expect(fake.graphicsSettings.autoChanges.map((change) => change.key)).toEqual(['resolution', 'shadows']);
        expect(fake.graphicsSettings.values.shadows).toBe('reduced');
    });
});

