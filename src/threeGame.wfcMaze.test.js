import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { LANDFORMS } from './landforms.js';

function makeFakeGame(runEntropy, overrides = {}) {
    return {
        performanceProfile: 'gameplay',
        chunkSize: 19,
        chunkCellCount: 9,
        runEntropy,
        globalSeedOffset: 0,
        hashTile: ThreeGame.prototype.hashTile,
        createSeededRandom: ThreeGame.prototype.createSeededRandom,
        carveCell: ThreeGame.prototype.carveCell,
        carvePassage: ThreeGame.prototype.carvePassage,
        shuffleDirections: ThreeGame.prototype.shuffleDirections,
        ensureChunkPortals: ThreeGame.prototype.ensureChunkPortals,
        getEdgeOpening: ThreeGame.prototype.getEdgeOpening,
        widenChunkCorridors: ThreeGame.prototype.widenChunkCorridors,
        runMazeDetailPass: ThreeGame.prototype.runMazeDetailPass,
        clearSpawnArea: ThreeGame.prototype.clearSpawnArea,
        getSpawnTile: ThreeGame.prototype.getSpawnTile,
        isInTutorialRing: ThreeGame.prototype.isInTutorialRing,
        getChunkLandform: () => LANDFORMS.MAZE,
        getRunCardEffects: () => ({}),
        ...overrides
    };
}

function reachableFloorCount(grid) {
    const floorCells = [];
    for (let y = 0; y < grid.length; y += 1) {
        for (let x = 0; x < grid[y].length; x += 1) {
            if (grid[y][x] !== '#') floorCells.push([x, y]);
        }
    }
    if (floorCells.length === 0) return { floorCount: 0, reachable: 0 };

    const seen = new Set([`${floorCells[0][0]},${floorCells[0][1]}`]);
    const stack = [floorCells[0]];
    while (stack.length > 0) {
        const [x, y] = stack.pop();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx;
            const ny = y + dy;
            const key = `${nx},${ny}`;
            if (ny < 0 || ny >= grid.length || nx < 0 || nx >= grid[ny].length || seen.has(key)) continue;
            if (grid[ny][nx] === '#') continue;
            seen.add(key);
            stack.push([nx, ny]);
        }
    }
    return { floorCount: floorCells.length, reachable: seen.size };
}

describe('buildChunk — WFC MAZE generation', () => {
    it('produces a fully reachable 19x19 grid for a MAZE chunk', () => {
        for (let runEntropy = 0; runEntropy < 20; runEntropy += 1) {
            const game = makeFakeGame(runEntropy);
            const grid = ThreeGame.prototype.buildChunk.call(game, 5, 5);
            expect(grid, `runEntropy ${runEntropy}`).toHaveLength(19);

            const { floorCount, reachable } = reachableFloorCount(grid);
            expect(floorCount, `runEntropy ${runEntropy}`).toBeGreaterThan(0);
            expect(reachable, `runEntropy ${runEntropy}`).toBe(floorCount);
        }
    });

    it('is deterministic for a fixed seed and varies across runEntropy', () => {
        const gameA = makeFakeGame(1);
        const gridA = ThreeGame.prototype.buildChunk.call(gameA, 3, -2);
        const gameB = makeFakeGame(1);
        const gridB = ThreeGame.prototype.buildChunk.call(gameB, 3, -2);
        expect(gridA).toEqual(gridB);

        const gameC = makeFakeGame(2);
        const gridC = ThreeGame.prototype.buildChunk.call(gameC, 3, -2);
        expect(gridC).not.toEqual(gridA);
    });

    it('populates wfcMetadataCache with rooms and anchors for MAZE chunks', () => {
        const game = makeFakeGame(42);
        ThreeGame.prototype.buildChunk.call(game, 4, 4);
        const meta = game.wfcMetadataCache.get('4,4');
        expect(meta).toBeTruthy();
        expect(Array.isArray(meta.rooms)).toBe(true);
        expect(Array.isArray(meta.anchors)).toBe(true);
    });
});
