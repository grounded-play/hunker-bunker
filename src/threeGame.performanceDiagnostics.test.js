import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

const originalWindow = globalThis.window;

afterEach(() => {
    globalThis.window = originalWindow;
});

describe('ThreeGame performance diagnostics', () => {
    it('records a completed render phase with bounded context history', () => {
        globalThis.window = {
            __hbPerfPhaseHistory: [],
            __hbPerfPhaseStack: []
        };
        const fake = {
            performanceProfile: 'gameplay',
            scene: {},
            camera: {},
            renderer: { render: () => {} },
            getPerformanceDiagnosticsSnapshot: () => ({ drawCalls: 12, wallInstances: 8 })
        };

        ThreeGame.prototype.renderWithPerf.call(fake);

        expect(globalThis.window.__hbPerfPhaseHistory).toHaveLength(1);
        expect(globalThis.window.__hbPerfPhaseHistory[0].phase).toBe('frame:render');
        expect(globalThis.window.__hbPerfPhaseHistory[0].context).toEqual({ drawCalls: 12, wallInstances: 8 });
        expect(globalThis.window.__hbPerfPhaseStack).toHaveLength(0);
    });

    it('wraps renderer submission in a non-blocking GPU query when available', () => {
        globalThis.window = {
            __hbPerfPhaseHistory: [],
            __hbPerfPhaseStack: []
        };
        const gpuFrameTimer = {
            beginFrame: vi.fn(() => true),
            endFrame: vi.fn()
        };
        const fake = {
            performanceProfile: 'gameplay',
            gameplayPostProcessingEnabled: false,
            scene: {},
            camera: {},
            renderer: { render: vi.fn() },
            gpuFrameTimer,
            getPerformanceDiagnosticsSnapshot: () => ({})
        };

        ThreeGame.prototype.renderWithPerf.call(fake);

        expect(gpuFrameTimer.beginFrame).toHaveBeenCalledOnce();
        expect(fake.renderer.render).toHaveBeenCalledOnce();
        expect(gpuFrameTimer.endFrame).toHaveBeenCalledOnce();
    });

    it('attributes an ignored wall hit without changing gameplay state', () => {
        globalThis.window = {
            __hbPerfPhaseHistory: [],
            __hbPerfPhaseStack: []
        };
        const fake = {};

        expect(ThreeGame.prototype.damageWall.call(fake, null, 1)).toBe(false);

        expect(globalThis.window.__hbPerfPhaseHistory[0].phase).toBe('wall:damage');
        expect(globalThis.window.__hbPerfPhaseHistory[0].context).toMatchObject({ amount: 1 });
    });

    it('exposes renderer, wall, projectile, chunk, and memory counters', () => {
        const fake = {
            performanceProfile: 'gameplay',
            renderer: {
                info: {
                    render: { calls: 4, triangles: 120 },
                    memory: { geometries: 7, textures: 9 },
                    programs: [{}, {}]
                }
            },
            scene: { children: [{}, {}] },
            transientEffects: [{}, {}],
            activeProjectiles: [{}],
            _wallInstanceIndex: new Map([['a', {}]]),
            wallMeshes: [{}, {}],
            destroyedWallKeys: new Set(['x']),
            pendingChunkMounts: [{}, {}, {}],
            chunkMeshes: new Map([['0,0', {}]]),
            adaptiveGameplayPerformanceMode: true,
            gameplayPostProcessingEnabled: false,
            frameProfiler: { enabled: true },
            gpuFrameTimer: {
                snapshot: () => ({ supported: true, latestMs: 6.25, averageMs: 7.5 })
            },
            gpuMemoryTracker: {
                snapshot: () => ({ estimatedBytes: 64_000_000, textureBytes: 48_000_000 })
            },
            getHardwareCapabilitiesSnapshot: () => ({
                isSteamDeck: true,
                logicalCores: 8,
                deviceMemoryGb: 16
            })
        };

        expect(ThreeGame.prototype.getPerformanceDiagnosticsSnapshot.call(fake)).toMatchObject({
            drawCalls: 4,
            triangles: 120,
            sceneObjects: 2,
            transientEffects: 2,
            activeProjectiles: 1,
            wallInstances: 1,
            wallMeshes: 2,
            destroyedWallCount: 1,
            pendingChunkMounts: 3,
            activeChunks: 1,
            geometries: 7,
            textures: 9,
            programs: 2,
            adaptiveGameplayPerformanceMode: true,
            gameplayPostProcessingEnabled: false,
            shadowsEnabled: false,
            frameProfilerEnabled: true,
            gpuFrame: { supported: true, latestMs: 6.25, averageMs: 7.5 },
            gpuMemory: { estimatedBytes: 64_000_000, textureBytes: 48_000_000 },
            hardware: { isSteamDeck: true, logicalCores: 8, deviceMemoryGb: 16 }
        });
    });
});
