import { describe, expect, it, vi } from 'vitest';
import { createSessionPerformanceTimeline } from './sessionPerformanceTimeline.js';

function makeGame() {
    return {
        performanceProfile: 'gameplay',
        chunkSize: 16,
        currentBiomeKey: 'cryo',
        currentDepthTier: 2,
        player: { position: { x: 33.25, y: 0.5, z: -17.5 } },
        playerVitals: { hp: 74, maxHp: 100, o2: 62, maxO2: 100 },
        frameIntervalTracker: {
            snapshot: () => ({ profiles: { gameplay: {
                averageMs: 22, p50Ms: 20, p95Ms: 35, p99Ms: 48,
                maxMs: 70, observedIntervals: 900
            } } })
        },
        gpuFrameTimer: { snapshot: () => ({ supported: true, averageMs: 12, maxMs: 24, samples: 800 }) },
        gpuMemoryTracker: { snapshot: vi.fn(() => ({ estimatedBytes: 500, textureBytes: 300 })) },
        renderer: {
            getPixelRatio: () => 0.85,
            shadowMap: { autoUpdate: false },
            info: {
                render: { calls: 40, triangles: 12000 },
                memory: { geometries: 80, textures: 90 },
                programs: [{}, {}]
            }
        },
        scene: {}, composer: {},
        adaptiveGameplayPerformanceMode: true,
        gameplayPostProcessingEnabled: false,
        scatterSprites: [
            { parent: {}, userData: { type: 'cybersnail' } },
            { parent: {}, userData: { type: 'crate' } }
        ],
        isEnemyType: (type) => type === 'cybersnail',
        activeProjectiles: [{}, {}], transientEffects: [{}],
        chunkMeshes: new Map([['2,-2', {}]]), pendingChunkMounts: [], remotePlayers: new Map()
    };
}

describe('session performance timeline', () => {
    it('captures compact time, place, frame, renderer, activity, and memory context', () => {
        let clock = 1_800_000_000_000;
        const game = makeGame();
        const timeline = createSessionPerformanceTimeline({ now: () => clock });
        const sample = timeline.capture({
            game, phase: 'gameplay', reason: 'phase:gameplay', force: true,
            performanceObject: { memory: { usedJSHeapSize: 123, totalJSHeapSize: 456 } }
        });

        expect(sample).toMatchObject({
            elapsedMs: 0, reason: 'phase:gameplay', phase: 'gameplay',
            place: { x: 33.25, z: -17.5, chunkX: 2, chunkZ: -2, biome: 'cryo', depthTier: 2 },
            frame: { p50Ms: 20, p95Ms: 35 },
            memory: { jsHeapUsedBytes: 123, gpu: { estimatedBytes: 500, textureBytes: 300 } },
            renderer: { drawCalls: 40, adaptive: true, postprocessing: false, shadowUpdates: false },
            activity: { enemies: 1, scatter: 2, projectiles: 2, activeChunks: 1 }
        });
        expect(game.gpuMemoryTracker.snapshot).toHaveBeenCalledOnce();
    });

    it('rate-limits periodic and event samples and bounds long sessions', () => {
        let clock = 100_000;
        const game = makeGame();
        const timeline = createSessionPerformanceTimeline({
            now: () => clock, sampleIntervalMs: 30_000,
            eventMinIntervalMs: 10_000, deepIntervalMs: 120_000, maxSamples: 3
        });

        expect(timeline.capture({ game, reason: 'periodic' })).not.toBeNull();
        clock += 1_000;
        expect(timeline.capture({ game, reason: 'periodic' })).toBeNull();
        clock += 9_000;
        expect(timeline.capture({ game, reason: 'event:player-damaged' })).not.toBeNull();
        clock += 5_000;
        expect(timeline.capture({ game, reason: 'event:player-damaged' })).toBeNull();
        for (let i = 0; i < 4; i += 1) {
            clock += 30_000;
            timeline.capture({ game, reason: 'periodic' });
        }

        const snapshot = timeline.snapshot();
        expect(snapshot.samples).toHaveLength(3);
        expect(snapshot.droppedSamples).toBe(3);
        expect(game.gpuMemoryTracker.snapshot).toHaveBeenCalledTimes(2);
    });
});
