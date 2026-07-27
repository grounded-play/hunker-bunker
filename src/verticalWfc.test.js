import { describe, expect, it } from 'vitest';
import { generateHeightmapGrid } from './landforms.js';
import { TILE_CATALOG } from './tileCatalog.js';
import { ThreeGame } from './threeGame.js';
import { stampLattice } from './wfcGenerator.js';
import {
    applyVerticalBridgeFeature,
    BRIDGE_HEIGHT,
    VERTICAL_TILE
} from './verticalWfc.js';

function authoredRoomLattice() {
    const solid = TILE_CATALOG.find((tile) => tile.id === 'solid-fill');
    const room = TILE_CATALOG.find((tile) => tile.id === 'room-alcove-s');
    const lattice = Array(9).fill(solid);
    lattice[4] = room;
    return lattice;
}

describe('WFC vertical bridge rooms', () => {
    it('stamps lethal pits, a three-wide bridge, and two ramp rows into a WFC room', () => {
        const lattice = authoredRoomLattice();
        const grid = stampLattice(lattice, 19);
        const feature = applyVerticalBridgeFeature(grid, lattice, () => 0, { force: true });

        expect(feature).toBeTruthy();
        expect(feature.pitCells.length).toBeGreaterThan(0);
        expect(feature.bridgeCells.length).toBeGreaterThan(0);
        expect(feature.rampCells.length).toBe(6);
        expect(feature.pitCells.every(({ x, y }) => grid[y][x] === VERTICAL_TILE.PIT)).toBe(true);
        expect(feature.bridgeCells.every(({ x, y }) => grid[y][x] === VERTICAL_TILE.BRIDGE)).toBe(true);
    });

    it('produces a monotonic ramp that reaches the elevated bridge height', () => {
        const lattice = authoredRoomLattice();
        const grid = stampLattice(lattice, 19);
        const feature = applyVerticalBridgeFeature(grid, lattice, () => 0, { force: true });
        const heightmap = generateHeightmapGrid(grid);
        const centerRamp = feature.rampCells
            .filter((cell) => cell.x === feature.originX + 3)
            .sort((a, b) => a.y - b.y)
            .map((cell) => heightmap[cell.y][cell.x])
            .sort((a, b) => a - b);

        expect(centerRamp).toEqual([BRIDGE_HEIGHT / 2, BRIDGE_HEIGHT]);
        const bridge = feature.bridgeCells[0];
        expect(heightmap[bridge.y][bridge.x]).toBe(BRIDGE_HEIGHT);
    });

    it('keeps a continuous safe route across the pit on ramp/bridge cells', () => {
        const lattice = authoredRoomLattice();
        const grid = stampLattice(lattice, 19);
        const feature = applyVerticalBridgeFeature(grid, lattice, () => 0, { force: true });
        const safe = [...feature.rampCells, ...feature.bridgeCells];
        const centerLane = safe
            .filter((cell) => cell.x === feature.originX + 3)
            .sort((a, b) => a.y - b.y);

        expect(centerLane).toHaveLength(5);
        for (let index = 1; index < centerLane.length; index += 1) {
            expect(centerLane[index].y - centerLane[index - 1].y).toBe(1);
        }
    });

    it('can stamp a ladder approach to the raised bridge', () => {
        const lattice = authoredRoomLattice();
        const grid = stampLattice(lattice, 19);
        const rolls = [0, 0.99];
        const feature = applyVerticalBridgeFeature(
            grid,
            lattice,
            () => rolls.shift() ?? 0,
            { force: true }
        );

        expect(feature.accessType).toBe('ladder');
        expect(grid.flat().filter((tile) => tile === VERTICAL_TILE.LADDER).length).toBeGreaterThan(0);
        expect(feature.rampCells.some(({ type }) => type === VERTICAL_TILE.LADDER)).toBe(true);
    });

    it('samples elevated cells from the same chunk coordinates used by collision', () => {
        const heightmap = Array.from({ length: 19 }, () => Array(19).fill(0));
        heightmap[10][15] = BRIDGE_HEIGHT;
        const game = {
            chunkSize: 19,
            chunkCache: new Map([['0,0', { heightmap }]])
        };

        expect(ThreeGame.prototype.getTerrainHeightAt.call(game, 15, 10)).toBe(BRIDGE_HEIGHT);
    });
});
