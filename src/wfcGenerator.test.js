import { describe, expect, it } from 'vitest';
import { collapseChunkLattice, stampLattice, LATTICE_SIZE } from './wfcGenerator.js';
import { TILE_SIZE } from './tileCatalog.js';

function seededRandom(seed) {
    let state = (seed >>> 0) || 1;
    return () => {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        return (state >>> 0) / 4294967296;
    };
}

function assertLatticeCompatible(lattice) {
    for (let my = 0; my < LATTICE_SIZE; my += 1) {
        for (let mx = 0; mx < LATTICE_SIZE; mx += 1) {
            const tile = lattice[my * LATTICE_SIZE + mx];
            expect(tile).toBeTruthy();
            if (mx < LATTICE_SIZE - 1) {
                const right = lattice[my * LATTICE_SIZE + mx + 1];
                expect(tile.sockets.e, `(${mx},${my}) east vs (${mx + 1},${my}) west`).toBe(right.sockets.w);
            }
            if (my < LATTICE_SIZE - 1) {
                const below = lattice[(my + 1) * LATTICE_SIZE + mx];
                expect(tile.sockets.s, `(${mx},${my}) south vs (${mx},${my + 1}) north`).toBe(below.sockets.n);
            }
        }
    }
}

describe('collapseChunkLattice', () => {
    it('always fully resolves all 9 cells', () => {
        for (let seed = 1; seed <= 30; seed += 1) {
            const lattice = collapseChunkLattice(seededRandom(seed));
            expect(lattice).toHaveLength(9);
            for (const tile of lattice) expect(tile).toBeTruthy();
        }
    });

    it('every adjacent pair of lattice cells has matching sockets', () => {
        for (let seed = 1; seed <= 30; seed += 1) {
            assertLatticeCompatible(collapseChunkLattice(seededRandom(seed)));
        }
    });

    it('is deterministic for a fixed seed', () => {
        const a = collapseChunkLattice(seededRandom(42)).map((t) => t.id);
        const b = collapseChunkLattice(seededRandom(42)).map((t) => t.id);
        expect(a).toEqual(b);
    });

    it('varies across seeds', () => {
        const results = new Set();
        for (let seed = 1; seed <= 15; seed += 1) {
            results.add(collapseChunkLattice(seededRandom(seed)).map((t) => t.id).join(','));
        }
        expect(results.size).toBeGreaterThan(1);
    });
});

describe('stampLattice', () => {
    it('produces a chunkSize x chunkSize grid matching each tile pattern at its lattice origin', () => {
        const lattice = collapseChunkLattice(seededRandom(7));
        const chunkSize = (TILE_SIZE - 1) * LATTICE_SIZE + 1; // 19
        const grid = stampLattice(lattice, chunkSize);
        expect(grid).toHaveLength(chunkSize);
        for (const row of grid) expect(row).toHaveLength(chunkSize);

        for (let my = 0; my < LATTICE_SIZE; my += 1) {
            for (let mx = 0; mx < LATTICE_SIZE; mx += 1) {
                const tile = lattice[my * LATTICE_SIZE + mx];
                const originX = mx * (TILE_SIZE - 1);
                const originY = my * (TILE_SIZE - 1);
                for (let r = 0; r < TILE_SIZE; r += 1) {
                    for (let c = 0; c < TILE_SIZE; c += 1) {
                        expect(grid[originY + r][originX + c]).toBe(tile.pattern[r][c]);
                    }
                }
            }
        }
    });

    it('every floor cell is reachable from every other floor cell', () => {
        const chunkSize = (TILE_SIZE - 1) * LATTICE_SIZE + 1;
        for (let seed = 1; seed <= 15; seed += 1) {
            const grid = stampLattice(collapseChunkLattice(seededRandom(seed)), chunkSize);
            const floorCells = [];
            for (let y = 0; y < chunkSize; y += 1) {
                for (let x = 0; x < chunkSize; x += 1) {
                    if (grid[y][x] === '.') floorCells.push(`${x},${y}`);
                }
            }
            expect(floorCells.length).toBeGreaterThan(0);

            const [startX, startY] = floorCells[0].split(',').map(Number);
            const seen = new Set([`${startX},${startY}`]);
            const stack = [[startX, startY]];
            while (stack.length > 0) {
                const [x, y] = stack.pop();
                for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    const nx = x + dx;
                    const ny = y + dy;
                    const key = `${nx},${ny}`;
                    if (ny < 0 || ny >= chunkSize || nx < 0 || nx >= chunkSize || seen.has(key)) continue;
                    if (grid[ny][nx] !== '.') continue;
                    seen.add(key);
                    stack.push([nx, ny]);
                }
            }
            expect(seen.size, `seed ${seed}`).toBe(floorCells.length);
        }
    });
});
