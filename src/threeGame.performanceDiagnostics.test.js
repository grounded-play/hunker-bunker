import { afterEach, describe, expect, it } from 'vitest';
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
            chunkMeshes: new Map([['0,0', {}]])
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
            programs: 2
        });
    });
});
