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
            shadowMap: { enabled: true },
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
    it('engages immediately on Steam Deck and keeps world visibility intact', () => {
        globalThis.window = { __hbSteamStatus: { isSteamDeck: true } };
        const fake = makeAdaptiveGame();

        ThreeGame.prototype.updateAdaptiveGameplayQuality.call(fake, 1 / 60);

        expect(fake.adaptiveGameplayPerformanceMode).toBe(true);
        expect(fake.gameplayPostProcessingEnabled).toBe(false);
        expect(fake.renderer.shadowMap.enabled).toBe(false);
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

    it('bypasses the composer after adaptive mode engages', () => {
        const composer = { render: vi.fn() };
        const renderer = { render: vi.fn() };
        const fake = {
            performanceProfile: 'gameplay',
            gameplayPostProcessingEnabled: false,
            composer,
            renderer,
            scene: {},
            camera: {},
            getPerformanceDiagnosticsSnapshot: () => ({})
        };

        ThreeGame.prototype.renderWithPerf.call(fake);

        expect(composer.render).not.toHaveBeenCalled();
        expect(renderer.render).toHaveBeenCalledOnce();
    });
});
