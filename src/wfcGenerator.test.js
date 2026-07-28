import { describe, expect, it } from 'vitest';
import { collapseChunkLattice, collapsePocketLattice, stampLattice, extractChunkWfcMetadata, LATTICE_SIZE, POCKET_LATTICE_SIZE } from './wfcGenerator.js';
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

function isGridFullyConnected(grid) {
    const size = grid.length;
    let start = null;
    let floorCount = 0;
    for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
            if (grid[y][x] === '.') {
                floorCount += 1;
                if (!start) start = [x, y];
            }
        }
    }
    if (!start) return false;
    const seen = new Set([`${start[0]},${start[1]}`]);
    const stack = [start];
    while (stack.length > 0) {
        const [x, y] = stack.pop();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx;
            const ny = y + dy;
            const key = `${nx},${ny}`;
            if (ny < 0 || ny >= size || nx < 0 || nx >= size || seen.has(key)) continue;
            if (grid[ny][nx] !== '.') continue;
            seen.add(key);
            stack.push([nx, ny]);
        }
    }
    return seen.size === floorCount;
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

    it('does not collapse to the same static arrangement for most seeds (regression: naive WFC arc-consistency fragmented the lattice on ~90% of seeds, always falling back to one hardcoded layout)', () => {
        const results = new Set();
        for (let seed = 1; seed <= 100; seed += 1) {
            results.add(collapseChunkLattice(seededRandom(seed)).map((t) => t.id).join(','));
        }
        expect(results.size).toBeGreaterThan(50);
    });

    it('never selects canyon-impassable (regression: it can only be selected when one of its two open sides faces the outer chunk border, and that side\'s floor is then permanently unreachable)', () => {
        for (let seed = 1; seed <= 200; seed += 1) {
            for (const tile of collapseChunkLattice(seededRandom(seed))) {
                expect(tile.category, `seed ${seed}`).not.toBe('canyon-impassable');
            }
        }
    });

    it('puts a hallway beyond every open room door while allowing hallway chains', () => {
        const hallwayCategories = new Set([
            'corridor-straight',
            'corridor-turn',
            'corridor-t',
            'corridor-cross',
            'canyon-walkway',
            'deadend'
        ]);
        for (let seed = 1; seed <= 200; seed += 1) {
            const lattice = collapseChunkLattice(seededRandom(seed));
            for (let index = 0; index < lattice.length; index += 1) {
                const x = index % LATTICE_SIZE;
                const y = Math.floor(index / LATTICE_SIZE);
                const tile = lattice[index];
                if (tile.category !== 'room') continue;
                for (const [side, dx, dy] of [
                    ['n', 0, -1],
                    ['e', 1, 0],
                    ['s', 0, 1],
                    ['w', -1, 0]
                ]) {
                    if (tile.sockets[side] !== 'OPEN3') continue;
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx < 0 || nx >= LATTICE_SIZE || ny < 0 || ny >= LATTICE_SIZE) continue;
                    const neighbor = lattice[ny * LATTICE_SIZE + nx];
                    expect(
                        hallwayCategories.has(neighbor.category),
                        `seed ${seed}, room ${index} ${side} -> ${neighbor.id}`
                    ).toBe(true);
                }
            }
        }
    });

    it('sometimes generates consecutive hallways instead of forced alternation', () => {
        const hallwayCategories = new Set([
            'corridor-straight',
            'corridor-turn',
            'corridor-t',
            'corridor-cross',
            'canyon-walkway',
            'deadend'
        ]);
        let sawHallwayChain = false;
        for (let seed = 1; seed <= 200 && !sawHallwayChain; seed += 1) {
            const lattice = collapseChunkLattice(seededRandom(seed));
            for (let y = 0; y < LATTICE_SIZE; y += 1) {
                for (let x = 0; x < LATTICE_SIZE; x += 1) {
                    const index = y * LATTICE_SIZE + x;
                    if (!hallwayCategories.has(lattice[index].category)) continue;
                    if (x + 1 < LATTICE_SIZE
                        && lattice[index].sockets.e === 'OPEN3'
                        && hallwayCategories.has(lattice[index + 1].category)) {
                        sawHallwayChain = true;
                    }
                    if (y + 1 < LATTICE_SIZE
                        && lattice[index].sockets.s === 'OPEN3'
                        && hallwayCategories.has(lattice[index + LATTICE_SIZE].category)) {
                        sawHallwayChain = true;
                    }
                }
            }
        }
        expect(sawHallwayChain).toBe(true);
    });

    it('varies room footprints and hallway widths across procedural layouts', () => {
        const ids = new Set();
        for (let seed = 1; seed <= 300; seed += 1) {
            for (const tile of collapseChunkLattice(seededRandom(seed))) ids.add(tile.id);
        }
        expect([...ids].some((id) => id.startsWith('room-compact'))).toBe(true);
        expect([...ids].some((id) => id.startsWith('room-alcove'))).toBe(true);
        expect([...ids].some((id) => id.startsWith('corridor-narrow'))).toBe(true);
        expect([...ids].some((id) => id.startsWith('corridor-straight'))).toBe(true);
        expect([...ids].some((id) => id.startsWith('canyon-walkway'))).toBe(true);
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

    // 500 seeds per mode: small enough to run instantly, large enough that
    // it reliably would have caught both real bugs found while building
    // this solver — a ~90% fragmentation rate (would show up almost
    // immediately) and a Hamiltonian-path start-cell bug that only
    // reproduced on the ~4/9 of seeds landing on a bipartite-invalid start
    // (needed ~1800 seeds to surface with bad luck; at 500 seeds the
    // chance of missing it entirely is astronomically small).
    it.each([
        ['full catalog', false],
        ['tutorialOnly', true]
    ])('every floor cell is reachable from every other floor cell (%s)', (_label, tutorialOnly) => {
        const chunkSize = (TILE_SIZE - 1) * LATTICE_SIZE + 1;
        for (let seed = 1; seed <= 500; seed += 1) {
            const grid = stampLattice(collapseChunkLattice(seededRandom(seed), { tutorialOnly }), chunkSize);
            const floorCells = [];
            for (let y = 0; y < chunkSize; y += 1) {
                for (let x = 0; x < chunkSize; x += 1) {
                    if (grid[y][x] === '.') floorCells.push(`${x},${y}`);
                }
            }
            expect(floorCells.length, `seed ${seed}`).toBeGreaterThan(0);

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

describe('collapsePocketLattice', () => {
    it('always resolves all 4 cells to a tutorial-flagged tile', () => {
        for (let seed = 1; seed <= 200; seed += 1) {
            const lattice = collapsePocketLattice(seededRandom(seed));
            expect(lattice).toHaveLength(POCKET_LATTICE_SIZE * POCKET_LATTICE_SIZE);
            for (const tile of lattice) {
                expect(tile, `seed ${seed}`).toBeTruthy();
                expect(tile.tutorial, `seed ${seed}: ${tile.id}`).toBe(true);
            }
        }
    });

    it('stamps to a fully reachable 13x13 grid with at least one multi-cell-wide room, not a uniformly 1-wide maze', () => {
        const pocketSize = (TILE_SIZE - 1) * POCKET_LATTICE_SIZE + 1; // 13
        expect(pocketSize).toBe(13);

        let sawWideRoom = false;
        for (let seed = 1; seed <= 200; seed += 1) {
            const grid = stampLattice(collapsePocketLattice(seededRandom(seed)), pocketSize);
            expect(grid).toHaveLength(pocketSize);
            expect(isGridFullyConnected(grid), `seed ${seed}`).toBe(true);

            // Any 3x3 all-floor block proves this isn't a uniformly
            // 1-wide corridor maze like the old raw DFS carve.
            for (let y = 0; y + 2 < pocketSize && !sawWideRoom; y += 1) {
                for (let x = 0; x + 2 < pocketSize && !sawWideRoom; x += 1) {
                    let allFloor = true;
                    for (let dy = 0; dy < 3 && allFloor; dy += 1) {
                        for (let dx = 0; dx < 3; dx += 1) {
                            if (grid[y + dy][x + dx] !== '.') { allFloor = false; break; }
                        }
                    }
                    if (allFloor) sawWideRoom = true;
                }
            }
        }
        expect(sawWideRoom).toBe(true);
    });

    it('is deterministic for a fixed seed', () => {
        const a = collapsePocketLattice(seededRandom(9)).map((t) => t.id);
        const b = collapsePocketLattice(seededRandom(9)).map((t) => t.id);
        expect(a).toEqual(b);
    });
});

describe('extractChunkWfcMetadata', () => {
    it('extracts room footprints and translates anchor coordinates to 19x19 chunk space', () => {
        const lattice = collapseChunkLattice(seededRandom(12));
        const metadata = extractChunkWfcMetadata(lattice, 19);
        expect(metadata).toBeTruthy();
        expect(Array.isArray(metadata.rooms)).toBe(true);
        expect(Array.isArray(metadata.anchors)).toBe(true);

        for (const anchor of metadata.anchors) {
            expect(anchor.localX).toBeGreaterThanOrEqual(0);
            expect(anchor.localX).toBeLessThan(19);
            expect(anchor.localY).toBeGreaterThanOrEqual(0);
            expect(anchor.localY).toBeLessThan(19);
            expect(anchor.decorationSet).toBeTruthy();
        }
    });
});
