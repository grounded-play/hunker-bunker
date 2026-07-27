import { TILE_CATALOG, SOCKET, TILE_SIZE } from './tileCatalog.js';

export const LATTICE_SIZE = 3;
export const POCKET_LATTICE_SIZE = 2;

function neighborsOf(index, latticeSize) {
    const mx = index % latticeSize;
    const my = Math.floor(index / latticeSize);
    const list = [];
    if (mx > 0) list.push({ index: index - 1, side: 'w' });
    if (mx < latticeSize - 1) list.push({ index: index + 1, side: 'e' });
    if (my > 0) list.push({ index: index - latticeSize, side: 'n' });
    if (my < latticeSize - 1) list.push({ index: index + latticeSize, side: 's' });
    return list;
}

function buildNeighborCache(latticeSize) {
    const cellCount = latticeSize * latticeSize;
    return Array.from({ length: cellCount }, (_, i) => neighborsOf(i, latticeSize));
}

const NEIGHBOR_CACHE = buildNeighborCache(LATTICE_SIZE);
const POCKET_NEIGHBOR_CACHE = buildNeighborCache(POCKET_LATTICE_SIZE);

function edgeKey(a, b) {
    return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function shuffle(items, random) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

// A random spanning tree over the lattice graph, built the same way this
// codebase already carves mazes elsewhere (shuffled-neighbor recursive
// backtracker, ThreeGame.prototype.carveCell/carvePassage). A tree is
// connected by definition, so this — not WFC's local arc-consistency,
// which only guarantees *pairwise* compatibility and fragments constantly
// with a catalog this sparse (many tiles have only 1 or 2 open sides) — is
// what actually guarantees the whole chunk is walkable end-to-end. Cell
// degree is naturally unbounded here (a backtracker commonly revisits a
// cell to branch off a second or third direction), which is fine: the full
// catalog has a matching tile for every possible open-side count (0-4). A
// 2x2 lattice (pockets) can never produce degree > 2 regardless — every
// cell only has 2 possible neighbors there — so this same function is safe
// to reuse for pockets even with the (degree-2-capped) tutorial catalog.
function buildBranchingSpanningTree(random, neighborCache, _cellCount) {
    const openEdges = new Set();
    const visited = new Set([0]);
    const stack = [0];
    while (stack.length > 0) {
        const current = stack[stack.length - 1];
        const neighbors = shuffle(neighborCache[current], random);
        let advanced = false;
        for (const { index: next } of neighbors) {
            if (visited.has(next)) continue;
            openEdges.add(edgeKey(current, next));
            visited.add(next);
            stack.push(next);
            advanced = true;
            break;
        }
        if (!advanced) stack.pop();
    }
    return openEdges;
}

// The 3x3 lattice graph is bipartite under a checkerboard coloring: 5 cells
// (corners + center — indices 0,2,4,6,8) form one color class, the other 4
// (edge-mids — 1,3,5,7) form the other. A Hamiltonian path must alternate
// colors, and a 9-node alternating path over a 5/4 split can only start
// (and end) on the majority color — starting from an edge-mid is
// mathematically unsolvable, not just unlucky. Restricting the random
// start to the majority-color cells is what guarantees `walk()` below
// always succeeds.
const HAMILTONIAN_START_CELLS = [0, 2, 4, 6, 8];

// A degree-capped spanning tree (a simple path visiting all 9 cells,
// i.e. a Hamiltonian path) — required for tutorialOnly chunk generation,
// whose tile subset (solid-fill/alcove/straight/turn) tops out at 2 open
// sides per tile and has no T-junction or 4-way tile to satisfy a
// branching tree's degree-3/4 nodes. Real backtracking search (not
// retry-from-scratch): undoes the last step and tries a different
// neighbor when a branch dead-ends.
function buildHamiltonianPath(random) {
    const start = HAMILTONIAN_START_CELLS[Math.floor(random() * HAMILTONIAN_START_CELLS.length)];
    const cellCount = LATTICE_SIZE * LATTICE_SIZE;
    const visited = new Array(cellCount).fill(false);
    visited[start] = true;
    const path = [start];

    const walk = () => {
        if (path.length === cellCount) return true;
        const current = path[path.length - 1];
        const neighbors = shuffle(NEIGHBOR_CACHE[current], random);
        for (const { index: next } of neighbors) {
            if (visited[next]) continue;
            visited[next] = true;
            path.push(next);
            if (walk()) return true;
            path.pop();
            visited[next] = false;
        }
        return false;
    };
    walk();

    const openEdges = new Set();
    for (let i = 0; i + 1 < path.length; i += 1) {
        openEdges.add(edgeKey(path[i], path[i + 1]));
    }
    return openEdges;
}

// Every side a cell borders another lattice cell gets a hard requirement
// (OPEN3 if the tree connects them, CLOSED otherwise); a side facing the
// outer edge (chunk border, or — for pockets — simply "outside the
// self-contained room") is left out of the map entirely (free).
function requiredSocketsFor(index, openEdges, neighborCache) {
    const required = {};
    for (const { index: neighborIndex, side } of neighborCache[index]) {
        required[side] = openEdges.has(edgeKey(index, neighborIndex)) ? SOCKET.OPEN3 : SOCKET.CLOSED;
    }
    return required;
}

function matchesRequirement(tile, required) {
    return Object.entries(required).every(([side, value]) => tile.sockets[side] === value);
}

function pickTileForCell(required, catalog, random) {
    const requiredOpenCount = Object.values(required).filter((v) => v === SOCKET.OPEN3).length;
    let candidates = catalog.filter((tile) => matchesRequirement(tile, required));
    // A tile whose open sides don't actually connect to each other inside
    // its own footprint (canyon-impassable, by design — see tileCatalog.js)
    // can only safely satisfy a single required connection. If the tree
    // needs this cell to pass traffic through in two directions at once,
    // using a non-through-connecting tile here would silently break the
    // connectivity the tree just guaranteed.
    if (requiredOpenCount >= 2) {
        candidates = candidates.filter((tile) => tile.throughConnects !== false);
    }
    const total = candidates.reduce((sum, tile) => sum + tile.weight, 0);
    let roll = random() * total;
    for (const tile of candidates) {
        roll -= tile.weight;
        if (roll <= 0) return tile;
    }
    return candidates[candidates.length - 1];
}

// canyon-impassable is excluded from Phase 1 selection entirely. Its two
// OPEN3 sockets don't connect to each other internally (by design), and
// investigation found no placement of it that's both selectable by
// pickTileForCell AND fully reachable: whichever of its two matching sides
// isn't required open by the spanning tree necessarily faces the outer
// edge, and that notch's floor then has nothing connecting to it. It stays
// defined in tileCatalog.js as a building block for Phase 2, which needs
// to place it with elevation-aware logic anyway (a canyon tile is only
// meaningful once a Ramp/Bridge can actually cross it).
const VERTICAL_ONLY_CATEGORIES = new Set(['canyon-impassable', 'ramp', 'bridge', 'ladder']);
const SELECTABLE_CATALOG = TILE_CATALOG.filter((tile) => !VERTICAL_ONLY_CATEGORIES.has(tile.category));

export function collapseChunkLattice(random, { tutorialOnly = false } = {}) {
    const catalog = tutorialOnly ? SELECTABLE_CATALOG.filter((tile) => tile.tutorial) : SELECTABLE_CATALOG;
    const cellCount = LATTICE_SIZE * LATTICE_SIZE;
    const openEdges = tutorialOnly
        ? buildHamiltonianPath(random)
        : buildBranchingSpanningTree(random, NEIGHBOR_CACHE, cellCount);

    const lattice = [];
    for (let index = 0; index < cellCount; index += 1) {
        const required = requiredSocketsFor(index, openEdges, NEIGHBOR_CACHE);
        lattice.push(pickTileForCell(required, catalog, random));
    }
    return lattice;
}

// A pocket has no neighboring chunks, so it's always generated from the
// tutorial-flagged catalog subset (calmer, roomier shapes suit a small
// self-contained bonus space better than a corridor-cross-heavy roll) on a
// 2x2 lattice — 13x13 stamped (7+7-1), up from the old raw DFS maze's
// 11x11, matching Phase 1's bigger-tile philosophy. A 2x2 lattice can never
// need a degree > 2 tile (each cell has at most 2 possible neighbors), so
// the plain branching-tree builder is used directly — no Hamiltonian-path
// parity concern exists at this size.
export function collapsePocketLattice(random) {
    const catalog = SELECTABLE_CATALOG.filter((tile) => tile.tutorial);
    const cellCount = POCKET_LATTICE_SIZE * POCKET_LATTICE_SIZE;
    const openEdges = buildBranchingSpanningTree(random, POCKET_NEIGHBOR_CACHE, cellCount);

    const lattice = [];
    for (let index = 0; index < cellCount; index += 1) {
        const required = requiredSocketsFor(index, openEdges, POCKET_NEIGHBOR_CACHE);
        const mx = index % POCKET_LATTICE_SIZE;
        const my = Math.floor(index / POCKET_LATTICE_SIZE);
        if (mx === 0) required.w = SOCKET.CLOSED;
        if (mx === POCKET_LATTICE_SIZE - 1) required.e = SOCKET.CLOSED;
        if (my === 0) required.n = SOCKET.CLOSED;
        if (my === POCKET_LATTICE_SIZE - 1) required.s = SOCKET.CLOSED;
        lattice.push(pickTileForCell(required, catalog, random));
    }
    return lattice;
}

// latticeSize is derived from lattice.length rather than taken as a
// parameter, so this works unmodified for both collapseChunkLattice's 3x3
// output and collapsePocketLattice's 2x2 output.
export function stampLattice(lattice, chunkSize) {
    const latticeSize = Math.round(Math.sqrt(lattice.length));
    const grid = Array.from({ length: chunkSize }, () => Array(chunkSize).fill('#'));
    const stride = TILE_SIZE - 1; // tiles overlap by 1 cell on shared borders
    for (let my = 0; my < latticeSize; my += 1) {
        for (let mx = 0; mx < latticeSize; mx += 1) {
            const tile = lattice[my * latticeSize + mx];
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

export function extractChunkWfcMetadata(lattice, _chunkSize = 19) {
    if (!Array.isArray(lattice)) return null;
    const latticeSize = Math.round(Math.sqrt(lattice.length));
    const stride = TILE_SIZE - 1;
    const rooms = [];
    const anchors = [];

    for (let my = 0; my < latticeSize; my += 1) {
        for (let mx = 0; mx < latticeSize; mx += 1) {
            const index = my * latticeSize + mx;
            const tile = lattice[index];
            const originX = mx * stride;
            const originY = my * stride;

            if (tile.category === 'room') {
                rooms.push({
                    latticeIndex: index,
                    mx,
                    my,
                    originX,
                    originY,
                    tileId: tile.id,
                    roomRole: tile.roomRole || 'generic',
                    decorationSet: tile.decorationSet || 'bunker',
                    populationBudget: tile.populationBudget || { large: 1, small: 3, pickup: 1, enemy: 0 }
                });
            }

            if (Array.isArray(tile.anchors)) {
                for (const anchor of tile.anchors) {
                    anchors.push({
                        ...anchor,
                        latticeIndex: index,
                        tileId: tile.id,
                        localX: originX + anchor.x,
                        localY: originY + anchor.y,
                        decorationSet: tile.decorationSet || 'bunker',
                        roomRole: tile.roomRole || 'generic'
                    });
                }
            }
        }
    }

    return {
        lattice,
        rooms,
        anchors
    };
}
