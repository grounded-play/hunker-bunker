import { TILE_CATALOG, oppositeSide, TILE_SIZE } from './tileCatalog.js';

export const LATTICE_SIZE = 3;
const CELL_COUNT = LATTICE_SIZE * LATTICE_SIZE;
const MAX_ATTEMPTS = 5;
const CHUNK_SIZE = (TILE_SIZE - 1) * LATTICE_SIZE + 1; // 19, matches ThreeGame's chunkSize

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
function attemptCollapse(random, catalog) {
    const domains = Array.from({ length: CELL_COUNT }, () => catalog.slice());

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

    for (;;) {
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

// Lattice-level socket matching (checked during propagation above) only
// guarantees adjacent tiles *could* connect — it does NOT guarantee a
// tile's own interior connects its open sides to each other. Most authored
// tiles do (a room/corridor's floor always reaches every one of its own
// sockets), but canyon-impassable deliberately doesn't: its north and south
// notches are separated by solid wall, by design (spec §2). So the only
// sound way to confirm the whole chunk is actually walkable end-to-end is a
// real flood fill over the stamped grid, not a graph walk over lattice
// sockets.
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

// One known-good, always-connected, always-self-consistent 3x3 arrangement
// (solid-fill corners, straight corridors on the edge-mids, a cross at the
// center) — same fallback philosophy as ensureChunkPortals's "no edges
// open, force east" (src/threeGame.js:19992-19994). Used regardless of
// tutorialOnly: this is a last-resort safety net that should be essentially
// unreachable in practice (see the catalog-completeness test in
// tileCatalog.test.js), so it isn't worth maintaining a second, smaller
// tutorial-only variant just to keep corridor-cross out of it.
function fallbackLattice() {
    const catalogById = new Map(TILE_CATALOG.map((tile) => [tile.id, tile]));
    const solidFill = catalogById.get('solid-fill');
    const straightNS = catalogById.get('corridor-straight-ns');
    const straightEW = catalogById.get('corridor-straight-ew');
    const cross = catalogById.get('corridor-cross');
    return [
        solidFill, straightNS, solidFill,
        straightEW, cross, straightEW,
        solidFill, straightNS, solidFill
    ];
}

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

export function collapseChunkLattice(random, { tutorialOnly = false } = {}) {
    const catalog = tutorialOnly ? TILE_CATALOG.filter((tile) => tile.tutorial) : TILE_CATALOG;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        const result = attemptCollapse(random, catalog);
        if (!result) continue;
        if (isGridFullyConnected(stampLattice(result, CHUNK_SIZE))) return result;
    }
    return fallbackLattice();
}
