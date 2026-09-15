import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

describe('wanderer movement safety', () => {
    it('continues from an exact rounded waypoint toward the fractional target', () => {
        const root = { position: { x: 10, y: 0, z: 10 }, rotation: { y: 0 } };
        const actor = {
            name: 'Test', title: 'Survivor', arriving: true,
            targetX: 10.5, targetZ: 10.5,
            arrivalPath: [{ x: 10, z: 10 }], arrivalPathIndex: 0,
            instance3d: { root, update: vi.fn() }
        };
        const game = {
            activeWanderer: actor,
            _wandererPromptLabel: null,
            player: { position: { x: 0, z: 0 } },
            getTerrainHeightAt: () => 0,
            isSnailTileWalkable: () => true
        };
        ThreeGame.prototype.updateWandererPromptState.call(game);
        expect(root.position.x).toBeGreaterThan(10);
        expect(root.position.z).toBeGreaterThan(10);
        expect(Number.isFinite(root.position.x)).toBe(true);
    });

    it('returns ground for non-finite coordinates and malformed height rows', () => {
        const game = { chunkSize: 16, chunkCache: new Map([['0,0', { heightmap: [] }]]) };
        expect(ThreeGame.prototype.getTerrainHeightAt.call(game, Number.NaN, 2)).toBe(0);
        expect(ThreeGame.prototype.getTerrainHeightAt.call(game, 2, 2)).toBe(0);
    });
});
