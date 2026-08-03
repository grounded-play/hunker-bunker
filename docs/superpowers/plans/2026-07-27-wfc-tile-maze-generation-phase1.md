# WFC Tile-Based Maze Generation (Phase 1 core engine) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the MAZE landform's DFS+erosion generation with a WFC
tile-catalog engine (§1-§6 of `docs/superpowers/specs/2026-07-27-wfc-tile-maze-generation-design.md`),
fixing square-room, crash-site-door, tile-size, and wall/gap-spacing
complaints.

**Architecture:** Two new pure modules (`src/tileCatalog.js`,
`src/wfcGenerator.js`) with zero dependency on `ThreeGame`, fully unit
tested in isolation. `src/threeGame.js`'s `buildChunk` then wires them into
the existing MAZE landform branch. §7 (room population, decoration sets,
camp/nest/landmark spacing) is **not** in this plan — it depends on this
engine existing first and is a separate follow-up plan.

**Tech Stack:** Vanilla JS (ES modules), Vitest, the repo's existing
`createSeededRandom`/`hashTile` seeding convention.

## Global Constraints

- Every seeded-random call folds in `runEntropy` the same way `buildChunk`
  already does: `(this.hashTile(...) ^ this.runEntropy) >>> 0`. Never use
  `Math.random` anywhere in `tileCatalog.js` or `wfcGenerator.js`.
- `tileCatalog.js`/`wfcGenerator.js` are pure — no `THREE`, no `this`, no
  DOM. They take/return plain data (tile objects, arrays, grids) so they're
  testable with plain `describe`/`it`, no `ThreeGame.prototype.method.call(fakeThis, ...)`
  needed until Task 4 wires them into `threeGame.js`.
- `getEdgeOpening`/`ensureChunkPortals` (`src/threeGame.js:19984-20027`) are
  **never modified** — every landform, including the new MAZE path, keeps
  using them exactly as today. Portal reconciliation for MAZE reuses
  `connectPortalsInward` (`src/landforms.js:416-434`), unmodified.
- `FIELD`/`CANYON`/`CRATER`/`RUINS` code paths in `src/landforms.js` and
  `src/threeGame.js` are never touched by this plan.

---

### Task 1: Tile catalog — socket model, rotation helper, and 8 base shapes

**Files:**
- Create: `src/tileCatalog.js`
- Test: `src/tileCatalog.test.js`

**Interfaces:**
- Produces: `SOCKET` (`{ CLOSED: 'CLOSED', OPEN3: 'OPEN3' }`), `TILE_SIZE`
  (`7`), `TILE_CATALOG` (array of `{ id, category, tutorial, weight,
  pattern: string[7], sockets: { n, e, s, w } }`), `oppositeSide(side)`,
  `rotatePatternCW(pattern)`, `rotateSocketsCW(sockets)`.

- [ ] **Step 1: Write the failing tests for the rotation helpers and socket/pattern consistency**

```js
// src/tileCatalog.test.js
import { describe, expect, it } from 'vitest';
import { SOCKET, TILE_SIZE, TILE_CATALOG, rotatePatternCW, rotateSocketsCW, oppositeSide } from './tileCatalog.js';

describe('rotatePatternCW', () => {
    it('rotates a 3x3 pattern 90 degrees clockwise', () => {
        const pattern = ['abc', 'def', 'ghi'];
        expect(rotatePatternCW(pattern)).toEqual(['gda', 'heb', 'ifc']);
    });
});

describe('rotateSocketsCW', () => {
    it('maps north<-west, east<-north, south<-east, west<-south', () => {
        const sockets = { n: 'A', e: 'B', s: 'C', w: 'D' };
        expect(rotateSocketsCW(sockets)).toEqual({ n: 'D', e: 'A', s: 'B', w: 'C' });
    });
});

describe('oppositeSide', () => {
    it('returns the opposite compass side', () => {
        expect(oppositeSide('n')).toBe('s');
        expect(oppositeSide('s')).toBe('n');
        expect(oppositeSide('e')).toBe('w');
        expect(oppositeSide('w')).toBe('e');
    });
});

describe('TILE_CATALOG self-consistency', () => {
    it('every tile pattern is TILE_SIZE x TILE_SIZE', () => {
        for (const tile of TILE_CATALOG) {
            expect(tile.pattern.length, tile.id).toBe(TILE_SIZE);
            for (const row of tile.pattern) expect(row.length, tile.id).toBe(TILE_SIZE);
        }
    });

    it('every declared socket matches the tile pattern border exactly', () => {
        const OPEN3_ROW = '##...##';
        const CLOSED_ROW = '#######';
        for (const tile of TILE_CATALOG) {
            const northRow = tile.pattern[0];
            const southRow = tile.pattern[TILE_SIZE - 1];
            const westCol = tile.pattern.map((row) => row[0]).join('');
            const eastCol = tile.pattern.map((row) => row[TILE_SIZE - 1]).join('');
            expect(northRow, `${tile.id} north`).toBe(tile.sockets.n === SOCKET.OPEN3 ? OPEN3_ROW : CLOSED_ROW);
            expect(southRow, `${tile.id} south`).toBe(tile.sockets.s === SOCKET.OPEN3 ? OPEN3_ROW : CLOSED_ROW);
            expect(westCol, `${tile.id} west`).toBe(tile.sockets.w === SOCKET.OPEN3 ? OPEN3_ROW : CLOSED_ROW);
            expect(eastCol, `${tile.id} east`).toBe(tile.sockets.e === SOCKET.OPEN3 ? OPEN3_ROW : CLOSED_ROW);
        }
    });

    it('has at least one tile CLOSED on all four sides', () => {
        expect(TILE_CATALOG.some((t) => Object.values(t.sockets).every((s) => s === SOCKET.CLOSED))).toBe(true);
    });

    it('has at least one tile OPEN3 on all four sides', () => {
        expect(TILE_CATALOG.some((t) => Object.values(t.sockets).every((s) => s === SOCKET.OPEN3))).toBe(true);
    });

    it('has no duplicate tile ids', () => {
        const ids = TILE_CATALOG.map((t) => t.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('every tile has a positive weight', () => {
        for (const tile of TILE_CATALOG) expect(tile.weight, tile.id).toBeGreaterThan(0);
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail (module doesn't exist yet)**

Run: `npx vitest run src/tileCatalog.test.js`
Expected: FAIL — `Cannot find module './tileCatalog.js'`

- [ ] **Step 3: Write `src/tileCatalog.js`**

```js
// A catalog of authored 7x7 meta-tiles used by the WFC generator
// (src/wfcGenerator.js) to lay out a chunk's MAZE landform. See
// docs/superpowers/specs/2026-07-27-wfc-tile-maze-generation-design.md §1-2.

export const SOCKET = Object.freeze({ CLOSED: 'CLOSED', OPEN3: 'OPEN3' });
export const TILE_SIZE = 7;

const SIDES = ['n', 'e', 's', 'w'];
const OPPOSITE = Object.freeze({ n: 's', s: 'n', e: 'w', w: 'e' });

export function oppositeSide(side) {
    return OPPOSITE[side];
}

// Rotates a TILE_SIZE x TILE_SIZE array of equal-length strings 90 degrees
// clockwise: rotated[i][j] = original[n-1-j][i].
export function rotatePatternCW(pattern) {
    const n = pattern.length;
    const rotated = [];
    for (let i = 0; i < n; i += 1) {
        let row = '';
        for (let j = 0; j < n; j += 1) {
            row += pattern[n - 1 - j][i];
        }
        rotated.push(row);
    }
    return rotated;
}

// A 90-degree clockwise rotation turns what faced west to face north, what
// faced north to face east, and so on around the compass.
export function rotateSocketsCW(sockets) {
    return { n: sockets.w, e: sockets.n, s: sockets.e, w: sockets.s };
}

function rotateTimes(tile, times) {
    let pattern = tile.pattern;
    let sockets = tile.sockets;
    for (let i = 0; i < times; i += 1) {
        pattern = rotatePatternCW(pattern);
        sockets = rotateSocketsCW(sockets);
    }
    return { ...tile, pattern, sockets };
}

// Expands one authored base tile into its rotations. `orientationIds` names
// each rotation (0, 90, 180, 270 CW) — pass fewer than 4 names to only keep
// that many distinct rotations (e.g. a straight corridor only needs 2).
function withRotations(base, orientationIds) {
    return orientationIds.map((idSuffix, index) => ({
        ...rotateTimes(base, index),
        id: `${base.id}-${idSuffix}`
    }));
}

const O = SOCKET.OPEN3;
const C = SOCKET.CLOSED;

const ROOM_CLOSED = {
    id: 'room-closed',
    category: 'room',
    tutorial: true,
    weight: 1,
    sockets: { n: C, e: C, s: C, w: C },
    pattern: [
        '#######',
        '#.....#',
        '#.....#',
        '#.....#',
        '#.....#',
        '#.....#',
        '#######'
    ]
};

const ROOM_ALCOVE_BASE = {
    id: 'room-alcove',
    category: 'room',
    tutorial: true,
    weight: 1,
    sockets: { n: C, e: C, s: O, w: C },
    pattern: [
        '#######',
        '#.....#',
        '#.....#',
        '#.....#',
        '#.....#',
        '#.....#',
        '##...##'
    ]
};

const CORRIDOR_STRAIGHT_BASE = {
    id: 'corridor-straight',
    category: 'corridor-straight',
    tutorial: true,
    weight: 1.4,
    sockets: { n: O, e: C, s: O, w: C },
    pattern: [
        '##...##',
        '##...##',
        '##...##',
        '##...##',
        '##...##',
        '##...##',
        '##...##'
    ]
};

const CORRIDOR_TURN_BASE = {
    id: 'corridor-turn',
    category: 'corridor-turn',
    tutorial: true,
    weight: 1.2,
    sockets: { n: O, e: O, s: C, w: C },
    pattern: [
        '##...##',
        '##...##',
        '##.....',
        '##.....',
        '##.....',
        '#######',
        '#######'
    ]
};

const CORRIDOR_T_BASE = {
    id: 'corridor-t',
    category: 'corridor-t',
    tutorial: false,
    weight: 0.6,
    sockets: { n: O, e: O, s: O, w: C },
    pattern: [
        '##...##',
        '#.....#',
        '#......',
        '#......',
        '#......',
        '#.....#',
        '##...##'
    ]
};

const CORRIDOR_CROSS = {
    id: 'corridor-cross',
    category: 'corridor-cross',
    tutorial: false,
    weight: 0.4,
    sockets: { n: O, e: O, s: O, w: O },
    pattern: [
        '##...##',
        '##...##',
        '.......',
        '.......',
        '.......',
        '##...##',
        '##...##'
    ]
};

const DEADEND_BASE = {
    id: 'deadend',
    category: 'deadend',
    tutorial: false,
    weight: 0.5,
    sockets: { n: O, e: C, s: C, w: C },
    pattern: [
        '##...##',
        '##...##',
        '#######',
        '#######',
        '#######',
        '#######',
        '#######'
    ]
};

const CANYON_IMPASSABLE_BASE = {
    id: 'canyon-impassable',
    category: 'canyon-impassable',
    tutorial: false,
    weight: 0.5,
    sockets: { n: O, e: C, s: O, w: C },
    pattern: [
        '##...##',
        '#######',
        '#######',
        '#######',
        '#######',
        '#######',
        '##...##'
    ]
};

export const TILE_CATALOG = Object.freeze([
    ROOM_CLOSED,
    ...withRotations(ROOM_ALCOVE_BASE, ['s', 'w', 'n', 'e']),
    ...withRotations(CORRIDOR_STRAIGHT_BASE, ['ns', 'ew']),
    ...withRotations(CORRIDOR_TURN_BASE, ['ne', 'es', 'sw', 'wn']),
    ...withRotations(CORRIDOR_T_BASE, ['nes', 'esw', 'swn', 'wne']),
    CORRIDOR_CROSS,
    ...withRotations(DEADEND_BASE, ['n', 'e', 's', 'w']),
    ...withRotations(CANYON_IMPASSABLE_BASE, ['ns', 'ew'])
]);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/tileCatalog.test.js`
Expected: PASS (all tests green)

- [ ] **Step 5: Commit**

```bash
git add src/tileCatalog.js src/tileCatalog.test.js
git commit -m "feat: add WFC tile catalog with 22 tiles from 8 rotated base shapes"
```

---

### Task 2: WFC solver — collapse over the 9-cell lattice

**Files:**
- Create: `src/wfcGenerator.js`
- Test: `src/wfcGenerator.test.js`

**Interfaces:**
- Consumes: `TILE_CATALOG`, `SOCKET`, `oppositeSide` from `src/tileCatalog.js` (Task 1).
- Produces: `LATTICE_SIZE` (`3`), `collapseChunkLattice(random)` → array of
  9 resolved tile objects (index `my * 3 + mx`), always fully resolved
  (never contains `null`/`undefined`).

- [ ] **Step 1: Write the failing tests**

```js
// src/wfcGenerator.test.js
import { describe, expect, it } from 'vitest';
import { collapseChunkLattice, LATTICE_SIZE } from './wfcGenerator.js';
import { SOCKET, oppositeSide } from './tileCatalog.js';

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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/wfcGenerator.test.js`
Expected: FAIL — `Cannot find module './wfcGenerator.js'`

- [ ] **Step 3: Write `src/wfcGenerator.js` (collapse only, no stamping/reachability yet)**

```js
import { TILE_CATALOG, SOCKET, oppositeSide } from './tileCatalog.js';

export const LATTICE_SIZE = 3;
const CELL_COUNT = LATTICE_SIZE * LATTICE_SIZE;
const MAX_ATTEMPTS = 5;

function neighborsOf(index) {
    const mx = index % LATTICE_SIZE;
    const my = Math.floor(index / LATTICE_SIZE);
    const list = [];
    if (mx > 0) list.push({ index: index - 1, side: 'w' });
    if (mx < LATTICE_SIZE - 1) list.push({ index: index + 1, side: 'e' });
    if (my > 0) list.push({ index: index - LATTICE_SIZE, side: 'n' });
    if (my < LATTICE_SIZE - 1) list.push({ index: index + LATTICE_SIZE, side: 's' });
    return list;
}

const NEIGHBOR_CACHE = Array.from({ length: CELL_COUNT }, (_, i) => neighborsOf(i));

function compatible(tileA, sideFromA, tileB) {
    return tileA.sockets[sideFromA] === tileB.sockets[oppositeSide(sideFromA)];
}

function pickWeighted(domain, random) {
    const total = domain.reduce((sum, tile) => sum + tile.weight, 0);
    let roll = random() * total;
    for (const tile of domain) {
        roll -= tile.weight;
        if (roll <= 0) return tile;
    }
    return domain[domain.length - 1];
}

// One collapse attempt. Returns the resolved lattice, or null on
// contradiction (a cell's domain emptied during propagation).
function attemptCollapse(random) {
    const domains = Array.from({ length: CELL_COUNT }, () => TILE_CATALOG.slice());

    const propagateFrom = (index) => {
        const queue = [index];
        while (queue.length > 0) {
            const current = queue.shift();
            const currentDomain = domains[current];
            for (const { index: neighborIndex, side } of NEIGHBOR_CACHE[current]) {
                const neighborDomain = domains[neighborIndex];
                const filtered = neighborDomain.filter((neighborTile) => (
                    currentDomain.some((tile) => compatible(tile, side, neighborTile))
                ));
                if (filtered.length === 0) return false;
                if (filtered.length !== neighborDomain.length) {
                    domains[neighborIndex] = filtered;
                    queue.push(neighborIndex);
                }
            }
        }
        return true;
    };

    while (true) {
        let chosenIndex = -1;
        let smallest = Infinity;
        for (let i = 0; i < CELL_COUNT; i += 1) {
            const size = domains[i].length;
            if (size > 1 && size < smallest) {
                smallest = size;
                chosenIndex = i;
            }
        }
        if (chosenIndex === -1) break; // every cell resolved to exactly one tile

        const picked = pickWeighted(domains[chosenIndex], random);
        domains[chosenIndex] = [picked];
        if (!propagateFrom(chosenIndex)) return null;
    }

    return domains.map((domain) => domain[0]);
}

function isFullyConnected(lattice) {
    const seen = new Set([0]);
    const stack = [0];
    while (stack.length > 0) {
        const current = stack.pop();
        for (const { index: neighborIndex, side } of NEIGHBOR_CACHE[current]) {
            if (seen.has(neighborIndex)) continue;
            if (lattice[current].sockets[side] !== SOCKET.OPEN3) continue;
            seen.add(neighborIndex);
            stack.push(neighborIndex);
        }
    }
    return seen.size === CELL_COUNT;
}

function fallbackLattice() {
    const catalogById = new Map(TILE_CATALOG.map((tile) => [tile.id, tile]));
    const roomClosed = catalogById.get('room-closed');
    const straightNS = catalogById.get('corridor-straight-ns');
    const straightEW = catalogById.get('corridor-straight-ew');
    const cross = catalogById.get('corridor-cross');
    // index = my * 3 + mx
    return [
        roomClosed, straightNS, roomClosed,
        straightEW, cross, straightEW,
        roomClosed, straightNS, roomClosed
    ];
}

export function collapseChunkLattice(random) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        const result = attemptCollapse(random);
        if (result && isFullyConnected(result)) return result;
    }
    return fallbackLattice();
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/wfcGenerator.test.js`
Expected: PASS. If any seed fails the connectivity assertion, re-check
`isFullyConnected` is actually gating the return in `collapseChunkLattice`
(a common mistake is checking connectivity but still returning the
disconnected result).

- [ ] **Step 5: Commit**

```bash
git add src/wfcGenerator.js src/wfcGenerator.test.js
git commit -m "feat: add WFC collapse solver for the 3x3 chunk meta-tile lattice"
```

---

### Task 3: Stamping and grid-level reachability

**Files:**
- Modify: `src/wfcGenerator.js`
- Test: `src/wfcGenerator.test.js`

**Interfaces:**
- Consumes: `TILE_SIZE` from `src/tileCatalog.js`.
- Produces: `stampLattice(lattice, chunkSize)` → `string[][]` grid of
  `'#'`/`'.'` characters, `chunkSize x chunkSize`.

- [ ] **Step 1: Write the failing test**

```js
// append to src/wfcGenerator.test.js
import { stampLattice } from './wfcGenerator.js';
import { TILE_SIZE } from './tileCatalog.js';

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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/wfcGenerator.test.js`
Expected: FAIL — `stampLattice is not a function`

- [ ] **Step 3: Add `stampLattice` to `src/wfcGenerator.js`**

```js
// add near the top, alongside the other tileCatalog import
import { TILE_CATALOG, SOCKET, oppositeSide, TILE_SIZE } from './tileCatalog.js';

// append at the end of the file
export function stampLattice(lattice, chunkSize) {
    const grid = Array.from({ length: chunkSize }, () => Array(chunkSize).fill('#'));
    const stride = TILE_SIZE - 1; // tiles overlap by 1 cell on shared borders
    for (let my = 0; my < LATTICE_SIZE; my += 1) {
        for (let mx = 0; mx < LATTICE_SIZE; mx += 1) {
            const tile = lattice[my * LATTICE_SIZE + mx];
            const originX = mx * stride;
            const originY = my * stride;
            for (let r = 0; r < TILE_SIZE; r += 1) {
                for (let c = 0; c < TILE_SIZE; c += 1) {
                    grid[originY + r][originX + c] = tile.pattern[r][c];
                }
            }
        }
    }
    return grid;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/wfcGenerator.test.js`
Expected: PASS. The "byte-identical shared borders" property from the spec
(§2) is what makes the second test's plain 4-directional BFS sufficient —
if it fails, the most likely cause is a socket/pattern mismatch introduced
in Task 1, not a bug in `stampLattice` itself.

- [ ] **Step 5: Commit**

```bash
git add src/wfcGenerator.js src/wfcGenerator.test.js
git commit -m "feat: stamp resolved WFC lattices into a floor/wall grid"
```

---

### Task 4: Wire WFC into `buildChunk` for the MAZE landform

**Files:**
- Modify: `src/threeGame.js:19822-19948` (`buildChunk`)
- Test: `src/threeGame.wfcMaze.test.js` (new)

**Interfaces:**
- Consumes: `collapseChunkLattice`, `stampLattice` from `src/wfcGenerator.js`;
  `connectPortalsInward` (already imported in `src/threeGame.js:46`).

This task **replaces** the MAZE-landform branch of `buildChunk`. Today
(`src/threeGame.js:19892-19900`) that branch runs `runMarkovPass` then
`openMazeTerrain` on the DFS-carved grid, and the widen/trim passes further
down (`19920-19943`) also run for MAZE. All of that goes away for MAZE —
the WFC grid replaces the DFS carve entirely, and Task 5 will add the
detail pass in its place.

- [ ] **Step 1: Write the failing test**

```js
// src/threeGame.wfcMaze.test.js
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
        clearSpawnArea: ThreeGame.prototype.clearSpawnArea,
        getSpawnTile: ThreeGame.prototype.getSpawnTile,
        getChunkLandform: () => LANDFORMS.MAZE,
        getRunCardEffects: () => ({}),
        ...overrides
    };
}

describe('buildChunk — WFC MAZE generation', () => {
    it('produces a fully reachable 19x19 grid for a MAZE chunk', () => {
        const game = makeFakeGame(777);
        const grid = ThreeGame.prototype.buildChunk.call(game, 5, 5);
        expect(grid).toHaveLength(19);

        const floorCells = [];
        for (let y = 0; y < 19; y += 1) {
            for (let x = 0; x < 19; x += 1) {
                if (grid[y][x] === '.') floorCells.push([x, y]);
            }
        }
        expect(floorCells.length).toBeGreaterThan(0);

        const seen = new Set([`${floorCells[0][0]},${floorCells[0][1]}`]);
        const stack = [floorCells[0]];
        while (stack.length > 0) {
            const [x, y] = stack.pop();
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = x + dx;
                const ny = y + dy;
                const key = `${nx},${ny}`;
                if (ny < 0 || ny >= 19 || nx < 0 || nx >= 19 || seen.has(key)) continue;
                if (grid[ny][nx] !== '.') continue;
                seen.add(key);
                stack.push([nx, ny]);
            }
        }
        expect(seen.size).toBe(floorCells.length);
    });

    it('is deterministic for a fixed seed and varies across runEntropy', () => {
        const gridA = ThreeGame.prototype.buildChunk.call(makeFakeGame(1), 3, -2);
        const gridB = ThreeGame.prototype.buildChunk.call(makeFakeGame(1), 3, -2);
        expect(gridA).toEqual(gridB);

        const gridC = ThreeGame.prototype.buildChunk.call(makeFakeGame(2), 3, -2);
        expect(gridC).not.toEqual(gridA);
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/threeGame.wfcMaze.test.js`
Expected: FAIL (the grid is still DFS-generated, so reachability likely
still passes but is coincidental — the real signal is Step 4 below; run it
now mainly to confirm the fake harness itself loads without error).

- [ ] **Step 3: Modify `buildChunk` in `src/threeGame.js`**

Replace the DFS carve + MAZE branch. The full carve loop
(`src/threeGame.js:19826-19883`, everything from `const grid = ...` through
the `applyRingRoadSystem` call) stays for **non-MAZE** landforms. For MAZE,
skip the DFS carve entirely and use WFC instead. Restructure the top of
`buildChunk` like this:

```js
buildChunk(chunkX, chunkY) {
    if (this.performanceProfile === 'menu') {
        return Array(this.chunkSize).fill(null).map(() => Array(this.chunkSize).fill('.'));
    }

    const landform = this.getChunkLandform(chunkX, chunkY);
    const random = this.createSeededRandom(((this.hashTile(chunkX + 1000, chunkY - 1000) + 101) ^ this.runEntropy) >>> 0);

    let grid;
    if (landform === LANDFORMS.MAZE) {
        const lattice = collapseChunkLattice(random);
        grid = stampLattice(lattice, this.chunkSize);
    } else {
        grid = Array(this.chunkSize).fill(null).map(() => Array(this.chunkSize).fill('#'));
        const centerCell = Math.floor(this.chunkCellCount / 2);
        const stack = [[centerCell, centerCell]];
        const visited = new Set([`${centerCell},${centerCell}`]);

        this.carveCell(grid, centerCell, centerCell);

        while (stack.length > 0) {
            const [cellX, cellY] = stack[stack.length - 1];
            const neighbors = this.shuffleDirections([
                { dx: 1, dy: 0 },
                { dx: -1, dy: 0 },
                { dx: 0, dy: 1 },
                { dx: 0, dy: -1 }
            ], random);
            let carved = false;

            for (const { dx, dy } of neighbors) {
                const nextX = cellX + dx;
                const nextY = cellY + dy;
                const key = `${nextX},${nextY}`;

                if (
                    nextX < 0 ||
                    nextX >= this.chunkCellCount ||
                    nextY < 0 ||
                    nextY >= this.chunkCellCount ||
                    visited.has(key)
                ) {
                    continue;
                }

                this.carvePassage(grid, cellX, cellY, nextX, nextY);
                visited.add(key);
                stack.push([nextX, nextY]);
                carved = true;
                break;
            }

            if (!carved) {
                stack.pop();
            }
        }

        applyLandform(grid, landform, random);
        const routeBlocks = this.getRunCardEffects().routeBlocks ?? {};
        if (landform === LANDFORMS.CANYON && routeBlocks.landform === LANDFORMS.CANYON) {
            applyCanyonCollapse(grid, random, routeBlocks.sealedGapCount ?? 0);
        }
    }

    applyRingRoadSystem(grid, chunkX, chunkY, this.chunkSize);
    this.ensureChunkPortals(grid, chunkX, chunkY);

    const plazaHalo = new Set();
    if (landform === LANDFORMS.MAZE) {
        connectPortalsInward(grid);
        // Task 7 (MarkovJr detail pass) replaces this TODO.
    } else {
        connectPortalsInward(grid);
        if (landform === LANDFORMS.RUINS) {
            openMazeTerrain(grid, random, {
                plazaCount: 5,
                floorTarget: 0.82,
                minRadius: 2.0,
                maxRadius: 3.6,
                protectedCells: plazaHalo
            });
        }
    }

    if (landform === LANDFORMS.RUINS) {
        for (let pass = 0; pass < 2; pass++) {
            this.widenChunkCorridors(grid, plazaHalo);
        }
    }

    if (landform !== LANDFORMS.MAZE) {
        for (let y = 2; y < this.chunkSize - 2; y++) {
            for (let x = 2; x < this.chunkSize - 2; x++) {
                if (grid[y][x] !== '#') continue;
                if (plazaHalo.has(`${x},${y}`)) continue;
                const openNeighbors =
                    (grid[y - 1][x] === '.') +
                    (grid[y + 1][x] === '.') +
                    (grid[y][x - 1] === '.') +
                    (grid[y][x + 1] === '.');
                if (openNeighbors < 2) continue;

                const carveChance = 0.28 + openNeighbors * 0.13;
                if (random() < carveChance) grid[y][x] = '.';
            }
        }
    }

    this.clearSpawnArea(grid, chunkX, chunkY);
    this.clearDoorways?.(grid);
    return grid;
}
```

Note what changed versus today: the MAZE branch no longer calls
`runMarkovPass`/`openMazeTerrain`/`widenChunkCorridors`/the trim pass (those
are superseded by the tile catalog per spec §6) — it now only runs
`connectPortalsInward` for portal reconciliation (spec §4). Non-MAZE
landforms are otherwise byte-for-byte unchanged from today's behavior;
double-check by diffing against `git show HEAD:src/threeGame.js` for the
`buildChunk` region before committing.

Add the import at the top of `src/threeGame.js` (near the existing
`landforms.js` import, `src/threeGame.js:46`):

```js
import { collapseChunkLattice, stampLattice } from './wfcGenerator.js';
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/threeGame.wfcMaze.test.js`
Expected: PASS

- [ ] **Step 5: Run the full existing test suite to check for regressions**

Run: `npx vitest run`
Expected: PASS, except `src/threeGame.chunkVariation.test.js` and
`src/threeGame.widenChunkCorridors.test.js` may need updates — they assert
on `runMarkovPass`/`openMazeTerrain` being invoked for MAZE chunks, which is
no longer true. If they fail, update their MAZE-specific assertions to
match the new WFC pipeline (their non-MAZE-landform assertions should be
unaffected and must still pass unchanged).

- [ ] **Step 6: Commit**

```bash
git add src/threeGame.js src/threeGame.wfcMaze.test.js src/threeGame.chunkVariation.test.js src/threeGame.widenChunkCorridors.test.js
git commit -m "feat: generate MAZE landform chunks via WFC instead of DFS+erosion"
```

---

### Task 5: Crash-site authored chunk with portal-matched doorway

**Files:**
- Modify: `src/threeGame.js` (`clearSpawnArea`, `src/threeGame.js:20129-20165`)
- Test: `src/threeGame.crashSiteDoor.test.js` (new)

**Interfaces:**
- Consumes: `ensureChunkPortals`, `getEdgeOpening` (unchanged, already on `ThreeGame.prototype`).

The confirmed bug: `clearSpawnArea`'s doorway corridor is carved at a fixed
`localX 4..13` range, independent of `ensureChunkPortals`' actual computed
south offset. This task makes the doorway target the real offset.

- [ ] **Step 1: Write the failing test**

```js
// src/threeGame.crashSiteDoor.test.js
import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';

function makeFakeGame(runEntropy) {
    return {
        performanceProfile: 'gameplay',
        chunkSize: 19,
        chunkCellCount: 9,
        runEntropy,
        globalSeedOffset: 0,
        hashTile: ThreeGame.prototype.hashTile,
        createSeededRandom: ThreeGame.prototype.createSeededRandom,
        getSpawnTile: ThreeGame.prototype.getSpawnTile,
        getEdgeOpening: ThreeGame.prototype.getEdgeOpening
    };
}

describe('clearSpawnArea — door/portal alignment', () => {
    it('the carved south doorway always contains the real south portal column, for many seeds', () => {
        for (let runEntropy = 0; runEntropy < 40; runEntropy += 1) {
            const game = makeFakeGame(runEntropy);
            const grid = Array(19).fill(null).map(() => Array(19).fill('#'));
            ThreeGame.prototype.clearSpawnArea.call(game, grid, 0, 0);

            const southOpening = game.getEdgeOpening('horizontal', 0, 1);
            if (!southOpening.open) continue; // nothing to reconcile if this run's south edge is closed
            const portalX = southOpening.offset * 2 + 1;
            expect(grid[18][portalX], `runEntropy ${runEntropy}`).toBe('.');
        }
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/threeGame.crashSiteDoor.test.js`
Expected: FAIL for at least some seeds — the fixed `localX 4..13` range
doesn't cover every possible `portalX` (which ranges over `1,3,5,...,17`).

- [ ] **Step 3: Modify `clearSpawnArea` in `src/threeGame.js`**

Replace the hardcoded doorway block (`src/threeGame.js:20149-20164`) with
one centered on the real south portal offset:

```js
clearSpawnArea(grid, chunkX, chunkY) {
    if (chunkX !== 0 || chunkY !== 0) return;
    const spawn = this.getSpawnTile();

    // 1. Spacious Bunker Base Hub: clear interior (localY 1 to 14, localX 1 to 17)
    // and a generous 9.5-unit radial clearance around spawn (9, 9)
    for (let localY = 1; localY < this.chunkSize - 1; localY++) {
        for (let localX = 1; localX < this.chunkSize - 1; localX++) {
            const dx = localX - spawn.x;
            const dy = localY - spawn.y;
            const distance = Math.hypot(dx, dy);

            if (localY <= 14 && localX >= 2 && localX <= 16) {
                grid[localY][localX] = '.';
            } else if (distance <= 9.5) {
                grid[localY][localX] = '.';
            }
        }
    }

    // 2. Blast Doorway Corridor: centered on the REAL south portal offset
    // (ensureChunkPortals/getEdgeOpening), not a fixed column range — a
    // fixed range could miss wherever the seeded portal actually opens,
    // which is the exact "door isn't to anywhere" bug this fixes.
    const southOpening = this.getEdgeOpening('horizontal', chunkX, chunkY + 1);
    const doorCenterX = southOpening.open
        ? southOpening.offset * 2 + 1
        : Math.floor(this.chunkCellCount / 2) * 2 + 1;
    const doorMinX = Math.max(1, doorCenterX - 4);
    const doorMaxX = Math.min(this.chunkSize - 2, doorCenterX + 4);

    for (let localY = 13; localY <= 18; localY++) {
        for (let localX = doorMinX; localX <= doorMaxX; localX++) {
            if (localY === 15) {
                if (localX <= doorCenterX - 3 || localX >= doorCenterX + 3) {
                    grid[localY][localX] = '#';
                } else {
                    grid[localY][localX] = '.';
                }
            } else {
                grid[localY][localX] = '.';
            }
        }
    }
}
```

This keeps the same "framed doorway with pillars at the edges, open floor
in between" shape as today, just re-centered on `doorCenterX` (the real
portal column) instead of a fixed `4..13` range. When the south edge rolls
closed (`southOpening.open === false`), it falls back to the chunk's exact
center column — a sensible default since `ensureChunkPortals` itself forces
at least one edge open elsewhere in that case
(`src/threeGame.js:19992-19994`).

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/threeGame.crashSiteDoor.test.js`
Expected: PASS for all 40 seeds

- [ ] **Step 5: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (this change only affects chunk (0,0), which no other test
should be asserting exact fixed doorway coordinates for — if one does,
update it to check `doorCenterX`-relative bounds instead of the old
literals).

- [ ] **Step 6: Commit**

```bash
git add src/threeGame.js src/threeGame.crashSiteDoor.test.js
git commit -m "fix: crash-site doorway now targets the real south portal offset"
```

---

### Task 6: Tutorial ring around the crash site

**Files:**
- Modify: `src/threeGame.js` (near `getChunkLandform`, `src/threeGame.js:19953-19967`)
- Modify: `src/wfcGenerator.js` (`collapseChunkLattice` gains an options param)
- Test: `src/threeGame.wfcMaze.test.js`

**Interfaces:**
- Modifies: `collapseChunkLattice(random, { tutorialOnly = false } = {})` —
  additive, optional second parameter; existing single-argument call sites
  (Task 2/3/4 tests, `buildChunk`) keep working unchanged unless they opt in.

- [ ] **Step 1: Write the failing tests**

```js
// append to src/wfcGenerator.test.js
describe('collapseChunkLattice tutorialOnly', () => {
    it('only selects tiles flagged tutorial:true when tutorialOnly is set', () => {
        for (let seed = 1; seed <= 20; seed += 1) {
            const lattice = collapseChunkLattice(seededRandom(seed), { tutorialOnly: true });
            for (const tile of lattice) expect(tile.tutorial, tile.id).toBe(true);
        }
    });

    it('still fully resolves and stays connected with tutorialOnly', () => {
        for (let seed = 1; seed <= 20; seed += 1) {
            const lattice = collapseChunkLattice(seededRandom(seed), { tutorialOnly: true });
            assertLatticeCompatible(lattice);
        }
    });
});
```

```js
// append to src/threeGame.wfcMaze.test.js
describe('getChunkLandform — tutorial ring uses tutorial-only tiles', () => {
    it('chunks at Chebyshev distance 1 from (0,0) never resolve a non-tutorial tile', () => {
        const ringChunks = [
            [-1, -1], [0, -1], [1, -1],
            [-1, 0], [1, 0],
            [-1, 1], [0, 1], [1, 1]
        ];
        for (const [chunkX, chunkY] of ringChunks) {
            const game = makeFakeGame(123);
            game.getChunkLandform = ThreeGame.prototype.getChunkLandform.bind(game);
            game.performanceProfile = 'gameplay';
            const grid = ThreeGame.prototype.buildChunk.call(game, chunkX, chunkY);
            expect(grid).toHaveLength(19); // sanity: still produces a valid chunk
        }
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/wfcGenerator.test.js src/threeGame.wfcMaze.test.js`
Expected: FAIL — `collapseChunkLattice` doesn't accept an options argument
yet (the tutorial-only test throws or returns non-tutorial tiles).

- [ ] **Step 3: Add the `tutorialOnly` option to `collapseChunkLattice`**

In `src/wfcGenerator.js`, thread an options object through so
`attemptCollapse`/`fallbackLattice` can restrict the domain:

```js
function attemptCollapse(random, catalog) {
    const domains = Array.from({ length: CELL_COUNT }, () => catalog.slice());
    // ...rest of the function body is unchanged, just replace every
    // `TILE_CATALOG.slice()` reference with `catalog.slice()` — there is
    // only the one at the top of this function.
```

```js
export function collapseChunkLattice(random, { tutorialOnly = false } = {}) {
    const catalog = tutorialOnly ? TILE_CATALOG.filter((tile) => tile.tutorial) : TILE_CATALOG;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        const result = attemptCollapse(random, catalog);
        if (result && isFullyConnected(result)) return result;
    }
    return fallbackLattice(); // room-closed/corridor-straight/corridor-cross are all tutorial:true already
}
```

(The fallback lattice already only uses `room-closed`, `corridor-straight-*`,
and `corridor-cross` — check Task 1's catalog and flip `corridor-cross`'s
`tutorial` field to `true` if the fallback needs to remain valid under
`tutorialOnly`. Given the fallback is the same regardless of `tutorialOnly`,
and the spec explicitly excludes `corridor-cross` from the tutorial ring,
instead special-case it: if `tutorialOnly` is true, `fallbackLattice` should
use `corridor-straight-ns` for the center cell too, forming a plain
crossroads made only of straight corridors and rooms. Implement
`fallbackLattice(tutorialOnly)`:)

```js
function fallbackLattice(tutorialOnly) {
    const catalogById = new Map(TILE_CATALOG.map((tile) => [tile.id, tile]));
    const roomClosed = catalogById.get('room-closed');
    const straightNS = catalogById.get('corridor-straight-ns');
    const straightEW = catalogById.get('corridor-straight-ew');
    const center = tutorialOnly ? catalogById.get('room-closed') : catalogById.get('corridor-cross');
    // With a closed-room center, the four straight corridors would dead-end
    // into it — swap the center-adjacent corridor ends for alcoves instead
    // when tutorialOnly is set, so the fallback stays a valid connected
    // plus-shape either way.
    if (tutorialOnly) {
        const alcoveN = catalogById.get('room-alcove-n');
        const alcoveS = catalogById.get('room-alcove-s');
        const alcoveE = catalogById.get('room-alcove-e');
        const alcoveW = catalogById.get('room-alcove-w');
        return [
            roomClosed, alcoveS, roomClosed,
            alcoveE, roomClosed, alcoveW,
            roomClosed, alcoveN, roomClosed
        ];
    }
    return [
        roomClosed, straightNS, roomClosed,
        straightEW, center, straightEW,
        roomClosed, straightNS, roomClosed
    ];
}
```

Wait — check this against Task 1's rotation IDs before using it: verify
`room-alcove-n/e/s/w` actually exist (Task 1 names them via
`withRotations(ROOM_ALCOVE_BASE, ['s', 'w', 'n', 'e'])`, i.e. IDs
`room-alcove-s`, `room-alcove-w`, `room-alcove-n`, `room-alcove-e` — all
four exist, good). Also verify the socket alignment: center `room-closed`
has all-`CLOSED` sockets, so its neighbors must face it with `CLOSED` too.
`room-alcove-s` (open south, closed n/e/w) placed north of a room-closed
center: its south side (facing the center) is `OPEN3` — **that does not
match** `room-closed`'s `CLOSED` north side. Fix: use the alcove whose
*closed* side faces the center — i.e. place `room-alcove-n` (open north,
closed e/s/w) north of center, so its south (facing center) is `CLOSED`,
matching. Corrected mapping: top-mid → `room-alcove-n`, bottom-mid →
`room-alcove-s`, left-mid → `room-alcove-w`, right-mid → `room-alcove-e`.
Update the return statement:

```js
        return [
            roomClosed, alcoveN, roomClosed,
            alcoveW, roomClosed, alcoveE,
            roomClosed, alcoveS, roomClosed
        ];
```

with `alcoveN = catalogById.get('room-alcove-n')`, etc. (variable names
unchanged, just double-check the object literal above uses this corrected
grid, not the first draft — self-review before running tests.)

Update the call site: `return fallbackLattice(tutorialOnly);` in
`collapseChunkLattice`.

- [ ] **Step 4: Wire the tutorial ring into `buildChunk`/`getChunkLandform`**

In `src/threeGame.js`, add a Chebyshev-distance helper and use it in
`buildChunk`'s WFC branch (from Task 4):

```js
isInTutorialRing(chunkX, chunkY) {
    return Math.max(Math.abs(chunkX), Math.abs(chunkY)) === 1;
}
```

Add this method near `getChunkLandform` (`src/threeGame.js:19953`). Then in
`buildChunk`, change the MAZE branch's WFC call:

```js
    if (landform === LANDFORMS.MAZE) {
        const lattice = collapseChunkLattice(random, { tutorialOnly: this.isInTutorialRing(chunkX, chunkY) });
        grid = stampLattice(lattice, this.chunkSize);
    }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/wfcGenerator.test.js src/threeGame.wfcMaze.test.js`
Expected: PASS

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/wfcGenerator.js src/wfcGenerator.test.js src/threeGame.js src/threeGame.wfcMaze.test.js
git commit -m "feat: tutorial-only tile selection for the crash-site ring"
```

---

### Task 7: MarkovJr detail pass on top of the stamped grid

**Files:**
- Modify: `src/generator.js` (`MarkovGenerator`)
- Modify: `src/threeGame.js` (`runMarkovPass` → new `runMazeDetailPass`, wired into `buildChunk`)
- Test: `src/generator.test.js`, `src/threeGame.wfcMaze.test.js`

**Interfaces:**
- Modifies: `MarkovGenerator` gains an optional `protectedCells` (a `Set` of
  `"x,y"` strings) constructor option; `applyRule` skips any match whose
  footprint intersects it.
- Produces: `ThreeGame.prototype.runMazeDetailPass(grid, random, latticeBoundaryCells)`.

- [ ] **Step 1: Write the failing test for protected-cell support**

```js
// append to src/generator.test.js
describe('MarkovGenerator protectedCells', () => {
    it('never rewrites a cell inside protectedCells', () => {
        const generator = new MarkovGenerator(4, 1, () => 0.4);
        generator.grid = [['.', '#', '#', '.']];
        generator.protectedCells = new Set(['1,0']); // the '#' at x=1 is protected
        generator.addRule(['.#'], ['..'], 1.0);
        generator.run(10);
        expect(generator.grid[0][1]).toBe('#');
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/generator.test.js`
Expected: FAIL — the rule rewrites `x=1` to `.` since `protectedCells` is
currently ignored.

- [ ] **Step 3: Add `protectedCells` support to `src/generator.js`**

```js
export class MarkovGenerator {
    constructor(width, height, random = Math.random) {
        this.width = width;
        this.height = height;
        this.random = random;
        this.grid = Array(height).fill(null).map(() => Array(width).fill(' '));
        this.rules = [];
        this.protectedCells = null; // optional Set of "x,y" strings
    }

    // ...addRule/seed/run/step/findMatches unchanged...

    matchTouchesProtected(pos, replace) {
        if (!this.protectedCells || this.protectedCells.size === 0) return false;
        for (let py = 0; py < replace.length; py += 1) {
            for (let px = 0; px < replace[py].length; px += 1) {
                if (replace[py][px] === '*') continue;
                if (this.protectedCells.has(`${pos.x + px},${pos.y + py}`)) return true;
            }
        }
        return false;
    }

    findMatches(rule) {
        const matches = [];
        const find = rule.find;
        const replace = rule.replace;
        const fHeight = find.length;
        const fWidth = find[0].length;
        const rHeight = replace.length;
        const rWidth = replace[0].length;
        const maxHeight = Math.max(fHeight, rHeight);
        const maxWidth = Math.max(fWidth, rWidth);

        for (let y = 0; y <= this.height - maxHeight; y++) {
            for (let x = 0; x <= this.width - maxWidth; x++) {
                if (this.matchAt(x, y, find) && !this.matchTouchesProtected({ x, y }, replace)) {
                    matches.push({ x, y });
                }
            }
        }
        return matches;
    }

    // ...matchAt/applyRule/getGrid unchanged...
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/generator.test.js`
Expected: PASS. Also re-run the full suite once here —
`runMarkovPass` (`src/threeGame.js:20029-20043`, still used by non-MAZE
paths per Task 4) constructs a fresh `MarkovGenerator` each call and never
sets `protectedCells`, so it defaults to `null`/empty and behaves exactly as
before: `npx vitest run` → PASS.

- [ ] **Step 5: Write the failing test for the maze detail pass**

```js
// append to src/threeGame.wfcMaze.test.js
describe('runMazeDetailPass', () => {
    it('never rewrites a cell inside the lattice boundary ring', () => {
        const game = { createSeededRandom: ThreeGame.prototype.createSeededRandom };
        const random = game.createSeededRandom(99);
        const lattice = collapseChunkLattice(random);
        const grid = stampLattice(lattice, 19);
        const before = grid.map((row) => [...row]);

        const boundary = new Set();
        for (let i = 0; i < 19; i += 1) {
            for (const [x, y] of [[i, 0], [i, 6], [i, 12], [i, 18], [0, i], [6, i], [12, i], [18, i]]) {
                boundary.add(`${x},${y}`);
            }
        }

        ThreeGame.prototype.runMazeDetailPass.call(game, grid, random, boundary);

        for (const key of boundary) {
            const [x, y] = key.split(',').map(Number);
            expect(grid[y][x], key).toBe(before[y][x]);
        }
    });
});
```

Note: this test imports `collapseChunkLattice`/`stampLattice` — add that
import line to `src/threeGame.wfcMaze.test.js` if not already present from
Task 4/6.

- [ ] **Step 6: Run the test to verify it fails**

Run: `npx vitest run src/threeGame.wfcMaze.test.js`
Expected: FAIL — `runMazeDetailPass is not a function`

- [ ] **Step 7: Add `runMazeDetailPass` to `src/threeGame.js`**

Add near `runMarkovPass` (`src/threeGame.js:20029-20043`), which stays
unchanged and in place for non-MAZE landforms:

```js
runMazeDetailPass(grid, random, protectedCells) {
    const generator = new MarkovGenerator(this.chunkSize, this.chunkSize, random);
    generator.grid = grid.map((row) => [...row]);
    generator.protectedCells = protectedCells;
    generator.addRule(['.#'], ['..'], 0.12);
    generator.addRule(['#.'], ['..'], 0.12);
    generator.addRule(['.', '#'], ['.', '.'], 0.12);
    generator.addRule(['#', '.'], ['.', '.'], 0.12);
    generator.run(30);

    for (let y = 0; y < this.chunkSize; y++) {
        for (let x = 0; x < this.chunkSize; x++) {
            grid[y][x] = generator.grid[y][x];
        }
    }
}
```

Then wire it into `buildChunk`'s MAZE branch (replacing the
`// Task 7 (MarkovJr detail pass) replaces this TODO.` comment left by
Task 4):

```js
    if (landform === LANDFORMS.MAZE) {
        connectPortalsInward(grid);
        const boundary = new Set();
        const stride = 6; // TILE_SIZE - 1, matches wfcGenerator's stamping stride
        for (let i = 0; i < this.chunkSize; i += 1) {
            for (const line of [0, stride, stride * 2, stride * 3]) {
                boundary.add(`${i},${line}`);
                boundary.add(`${line},${i}`);
            }
        }
        this.runMazeDetailPass(grid, random, boundary);
    } else {
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx vitest run src/threeGame.wfcMaze.test.js`
Expected: PASS

- [ ] **Step 9: Run the full test suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 10: Run lint**

Run: `npx eslint src/tileCatalog.js src/wfcGenerator.js src/generator.js src/threeGame.js`
Expected: no errors (warnings acceptable only if pre-existing in
`threeGame.js` — do not introduce new ones)

- [ ] **Step 11: Commit**

```bash
git add src/generator.js src/generator.test.js src/threeGame.js src/threeGame.wfcMaze.test.js
git commit -m "feat: add MarkovJr detail pass on top of WFC-stamped MAZE chunks"
```

---

## Self-Review Notes (for whoever executes this plan)

- **Spec coverage**: §1 (Task 1's lattice math), §2 (Task 1's catalog), §3
  (Task 2/3's solver+stamping), §4 (Task 5's crash-site fix, reusing
  `connectPortalsInward` per the corrected spec), §5 (Task 6's tutorial
  ring), §6 (Task 7's detail pass) are all covered. §7 (room population,
  decoration sets, camp/nest/landmark spacing) is **explicitly out of this
  plan** — it needs the chunk-metadata cache this plan's Architecture
  section mentions but does not build; write a follow-up plan once this one
  is merged and stable in play-testing.
- **Task 6's fallback-lattice alcove-orientation fix is spelled out inline
  above because it's easy to get backwards** (an alcove's *open* side must
  face *away* from a closed-socket neighbor) — verify the corrected mapping
  before writing the code, don't copy the first draft shown in the step.
- **Task 4 is the highest-risk task** (rewrites `buildChunk`, the most
  central chunk-generation function in the file) — after Step 5's full
  suite run, also start the dev server (`npm run dev`) and walk a MAZE
  chunk in-browser before moving to Task 5, since automated reachability
  tests don't catch visual regressions like a room reading as too dark/cramped.
