import { describe, expect, it } from 'vitest';
import { collapseChunkLattice, extractChunkWfcMetadata, stampLattice } from './wfcGenerator.js';
import { CHUNK_SIZE } from './tileCatalog.js';
import { assignRoomThemes } from './roomThemes.js';
import { planChunkRoomPopulation } from './roomPopulation.js';

function seededRandom(seed) {
    let state = seed >>> 0 || 1;
    return () => {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        return (state >>> 0) / 4294967296;
    };
}

const HALLWAY_CATEGORIES = new Set([
    'corridor-straight',
    'corridor-turn',
    'corridor-t',
    'corridor-cross',
    'canyon-walkway',
    'deadend'
]);

function floorIsConnected(grid) {
    const cells = [];
    for (let y = 0; y < grid.length; y += 1) {
        for (let x = 0; x < grid.length; x += 1) {
            if (grid[y][x] === '.') cells.push({ x, y });
        }
    }
    const start = cells[0];
    if (!start) return false;
    const seen = new Set([`${start.x},${start.y}`]);
    const queue = [start];
    while (queue.length > 0) {
        const current = queue.shift();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const x = current.x + dx;
            const y = current.y + dy;
            const key = `${x},${y}`;
            if (seen.has(key) || grid[y]?.[x] !== '.') continue;
            seen.add(key);
            queue.push({ x, y });
        }
    }
    return seen.size === cells.length;
}

describe('maze generation stress invariants', () => {
    it.each(['active', 'cryo', 'bio'])('holds geometry and population invariants across 2,000 %s seeds', (biome) => {
        for (let seed = 1; seed <= 2000; seed += 1) {
            const random = seededRandom(seed * 31 + biome.length);
            const lattice = collapseChunkLattice(random, { depthTier: 3 });
            const grid = stampLattice(lattice);
            expect(floorIsConnected(grid), `${biome} seed ${seed}`).toBe(true);
            for (let index = 0; index < lattice.length; index += 1) {
                const tile = lattice[index];
                if (tile.category !== 'room') continue;
                const x = index % 3;
                const y = Math.floor(index / 3);
                for (const [side, dx, dy] of [
                    ['n', 0, -1], ['e', 1, 0], ['s', 0, 1], ['w', -1, 0]
                ]) {
                    if (tile.sockets[side] !== 'OPEN3') continue;
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx < 0 || nx >= 3 || ny < 0 || ny >= 3) continue;
                    expect(
                        HALLWAY_CATEGORIES.has(lattice[ny * 3 + nx].category),
                        `${biome} seed ${seed} room ${index} ${side}`
                    ).toBe(true);
                }
            }
            // docs/sprint-22-systems-breakdown/06-engineering-wfc-chunk-math.md:
            // "Tests and callers should import the derived constants rather
            // than copy 49, 17, or older 19/13 values" -- this literal 19
            // predated the tile-bands migration to CHUNK_SIZE=49.
            const metadata = extractChunkWfcMetadata(lattice, CHUNK_SIZE, { chunkX: 1, chunkY: 1 });
            const rooms = assignRoomThemes(metadata.roomInstances, {
                biome,
                depthTier: 3,
                random
            });
            const plans = planChunkRoomPopulation(rooms, grid, random);
            for (const plan of plans) {
                expect(plan.signaturePlaced, `${biome} seed ${seed} ${plan.roomId}`).toBe(true);
            }
        }
    });
});
