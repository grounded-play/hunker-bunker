import { describe, it, expect } from 'vitest';
import { LANDFORMS, pickLandform, applyLandform, applyCanyonCollapse, connectPortalsInward, openMazeTerrain } from './landforms.js';

const SIZE = 19;

function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// A lattice stand-in for the DFS maze: alternating walls and floor cells
// inside a solid border, matching what buildChunk's carve produces.
function mazeLikeGrid() {
    return Array.from({ length: SIZE }, (_, y) =>
        Array.from({ length: SIZE }, (_, x) => {
            if (y === 0 || x === 0 || y === SIZE - 1 || x === SIZE - 1) return '#';
            return (y % 2 === 1 && (x % 2 === 1 || x % 4 === 2)) ? '.' : '#';
        })
    );
}

function connectedMazeGrid() {
    const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill('#'));
    for (let y = 1; y < SIZE - 1; y += 2) {
        for (let x = 1; x < SIZE - 1; x += 1) {
            grid[y][x] = '.';
        }
        if (y < SIZE - 2) grid[y + 1][SIZE - 2] = '.';
    }
    return grid;
}

function countWalls(grid) {
    return grid.flat().filter((c) => c === '#').length;
}

function countFloors(grid) {
    return grid.flat().filter((c) => c === '.').length;
}

function floodFillFloorCount(grid, startX, startY) {
    const seen = new Set([`${startX},${startY}`]);
    const stack = [[startX, startY]];
    while (stack.length) {
        const [x, y] = stack.pop();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx;
            const ny = y + dy;
            const key = `${nx},${ny}`;
            if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE || seen.has(key)) continue;
            if (grid[ny][nx] !== '.') continue;
            seen.add(key);
            stack.push([nx, ny]);
        }
    }
    return seen.size;
}

function firstFloor(grid) {
    for (let y = 1; y < SIZE - 1; y += 1) {
        for (let x = 1; x < SIZE - 1; x += 1) {
            if (grid[y][x] === '.') return { x, y };
        }
    }
    return { x: 1, y: 1 };
}

describe('pickLandform', () => {
    it('is deterministic for a given random stream and always valid', () => {
        const valid = Object.values(LANDFORMS);
        for (let seed = 1; seed <= 200; seed++) {
            const a = pickLandform(mulberry32(seed), 'active');
            const b = pickLandform(mulberry32(seed), 'active');
            expect(a).toBe(b);
            expect(valid).toContain(a);
        }
    });

    it('produces a mixed distribution with biome-specific dominant landforms', () => {
        const tally = (biome) => {
            const counts = {};
            for (let seed = 1; seed <= 600; seed++) {
                const l = pickLandform(mulberry32(seed * 7919), biome);
                counts[l] = (counts[l] ?? 0) + 1;
            }
            return counts;
        };
        const active = tally('active');
        expect(Object.keys(active).length).toBe(5);
        expect(active[LANDFORMS.MAZE]).toBeLessThan(active[LANDFORMS.FIELD]);
        expect(active[LANDFORMS.MAZE]).toBeLessThan(active[LANDFORMS.CRATER]);
        expect(tally('cryo')[LANDFORMS.CANYON]).toBeGreaterThan(active[LANDFORMS.CANYON]);
        expect(tally('bio')[LANDFORMS.FIELD]).toBeGreaterThan(active[LANDFORMS.FIELD]);
    });
});

describe('applyLandform', () => {
    it('field opens the interior with scattered outcrops and keeps the border', () => {
        const grid = mazeLikeGrid();
        applyLandform(grid, LANDFORMS.FIELD, mulberry32(42));
        const interior = grid.slice(1, -1).flatMap((row) => row.slice(1, -1));
        const floorRatio = interior.filter((c) => c === '.').length / interior.length;
        expect(floorRatio).toBeGreaterThan(0.8);
        expect(interior).toContain('#'); // outcrops exist
        expect(grid[0].every((c) => c === '#')).toBe(true);
        // Every open cell is reachable: outcrops never seal off a pocket.
        const total = interior.filter((c) => c === '.').length;
        expect(floodFillFloorCount(grid, 9, 9)).toBe(total);
    });

    it('canyon carves parallel ridge walls whose gaps keep every hall connected', () => {
        for (const seed of [1, 7, 99, 1234]) {
            const grid = mazeLikeGrid();
            applyLandform(grid, LANDFORMS.CANYON, mulberry32(seed));
            const floors = grid.flat().filter((c) => c === '.').length;
            expect(floors).toBeGreaterThan(150); // wide halls, not a maze
            expect(floodFillFloorCount(grid, 9, 9 + (grid[9][9] === '.' ? 0 : 1))).toBeGreaterThanOrEqual(floors - 2);
        }
    });

    it('canyon collapse seals seeded gaps without breaking floor connectivity', () => {
        const grid = mazeLikeGrid();
        applyLandform(grid, LANDFORMS.CANYON, mulberry32(8));
        const wallsBefore = countWalls(grid);
        const sealed = applyCanyonCollapse(grid, mulberry32(99), 3);
        const floors = grid.flat().filter((c) => c === '.').length;
        const start = firstFloor(grid);

        expect(sealed).toBeGreaterThan(0);
        expect(sealed).toBeLessThanOrEqual(3);
        expect(countWalls(grid)).toBe(wallsBefore + sealed);
        expect(floodFillFloorCount(grid, start.x, start.y)).toBe(floors);
    });

    it('crater clears an open center arena ringed by a breached rim', () => {
        const grid = mazeLikeGrid();
        applyLandform(grid, LANDFORMS.CRATER, mulberry32(5));
        // Center 7x7 is fully open.
        for (let y = 7; y <= 11; y++) {
            for (let x = 7; x <= 11; x++) expect(grid[y][x]).toBe('.');
        }
        // The rim exists and has breaches: the arena connects to the outside.
        const rimCells = [];
        for (let y = 1; y < SIZE - 1; y++) {
            for (let x = 1; x < SIZE - 1; x++) {
                const r = Math.hypot(x - 9, y - 9);
                if (r > 4.8 && r <= 6.4) rimCells.push(grid[y][x]);
            }
        }
        expect(rimCells).toContain('#');
        expect(rimCells).toContain('.');
    });

    it('ruins knocks down a large share of maze walls', () => {
        const grid = mazeLikeGrid();
        const before = countWalls(grid);
        applyLandform(grid, LANDFORMS.RUINS, mulberry32(11));
        const after = countWalls(grid);
        expect(after).toBeLessThan(before * 0.8);
        expect(after).toBeGreaterThan(0);
    });

    it('maze leaves the grid untouched', () => {
        const grid = mazeLikeGrid();
        const copy = grid.map((row) => [...row]);
        applyLandform(grid, LANDFORMS.MAZE, mulberry32(3));
        expect(grid).toEqual(copy);
    });
});

describe('openMazeTerrain', () => {
    it('opens breathing room while keeping the maze border and connectivity', () => {
        const grid = connectedMazeGrid();
        const floorsBefore = countFloors(grid);
        const carved = openMazeTerrain(grid, mulberry32(101), {
            plazaCount: 7,
            floorTarget: 0.80,
            minRadius: 2.4,
            maxRadius: 4.5
        });
        const floorsAfter = countFloors(grid);
        const start = firstFloor(grid);

        expect(carved).toBeGreaterThan(70);
        expect(floorsAfter).toBeGreaterThan(floorsBefore + 70);
        expect(floorsAfter / (SIZE * SIZE)).toBeGreaterThan(0.64);
        expect(floodFillFloorCount(grid, start.x, start.y)).toBe(floorsAfter);
        expect(grid[0].every((c) => c === '#')).toBe(true);
        expect(grid[SIZE - 1].every((c) => c === '#')).toBe(true);
        for (let y = 0; y < SIZE; y += 1) {
            expect(grid[y][0]).toBe('#');
            expect(grid[y][SIZE - 1]).toBe('#');
        }
    });
});

describe('connectPortalsInward', () => {
    it('tunnels from a border opening through walls until it reaches floor', () => {
        const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill('#'));
        // Open arena in the middle, sealed rim, portal punched on the west edge.
        for (let y = 6; y <= 12; y++) {
            for (let x = 6; x <= 12; x++) grid[y][x] = '.';
        }
        grid[9][0] = '.';
        grid[9][1] = '.';
        connectPortalsInward(grid);
        // The portal row is now carved all the way to the arena.
        for (let x = 0; x <= 6; x++) expect(grid[9][x]).toBe('.');
    });
});
