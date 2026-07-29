import { TILE_CATALOG, SOCKET, TILE_SIZE } from './tileCatalog.js';
import { buildRoomInstances } from './roomGeometry.js';
import { injectBoundedLoops } from './mazeTopology.js';

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

function buildRoomHallRoles(
    openEdges,
    neighborCache,
    random,
    hallwayContinuation = 0.45,
    minimumHallwayRun = 2
) {
    const roles = new Array(neighborCache.length).fill(null);
    const hallwayRun = new Array(neighborCache.length).fill(0);
    const queue = [0];
    roles[0] = 'room';

    while (queue.length > 0) {
        const current = queue.shift();
        for (const { index: next } of neighborCache[current]) {
            if (!openEdges.has(edgeKey(current, next)) || roles[next]) continue;

            if (roles[current] === 'room') {
                // A room door always opens into a long approach hallway.
                roles[next] = 'hallway';
                hallwayRun[next] = 1;
            } else {
                // Corridors must read as journeys between chambers rather
                // than one square connector. Guarantee two 7x7 source tiles
                // after a room, then vary the remaining run by seed.
                const continuationChance = Math.min(
                    0.92,
                    Math.max(0.05, hallwayContinuation) * Math.exp(-0.45 * Math.max(0, hallwayRun[current] - 1))
                );
                const continuesHallway = hallwayRun[current] < minimumHallwayRun
                    || random() < continuationChance;
                roles[next] = continuesHallway ? 'hallway' : 'room';
                hallwayRun[next] = continuesHallway ? hallwayRun[current] + 1 : 0;
            }
            queue.push(next);
        }
    }

    return roles;
}

function matchesRequirement(tile, required) {
    return Object.entries(required).every(([side, value]) => tile.sockets[side] === value);
}

function pickTileForCell(required, catalog, random, predicate = null) {
    const requiredOpenCount = Object.values(required).filter((v) => v === SOCKET.OPEN3).length;
    let candidates = catalog.filter((tile) => (
        matchesRequirement(tile, required)
        && (!predicate || predicate(tile))
    ));
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
const HALLWAY_CATEGORIES = new Set([
    'corridor-straight',
    'corridor-turn',
    'corridor-t',
    'corridor-cross',
    'canyon-walkway',
    'deadend'
]);

function isRoomTile(tile) {
    return tile.category === 'room';
}

function isHallwayTile(tile) {
    return HALLWAY_CATEGORIES.has(tile.category);
}

function roomHasNoExteriorDoor(tile, index, latticeSize) {
    const x = index % latticeSize;
    const y = Math.floor(index / latticeSize);
    if (x === 0 && tile.sockets.w !== SOCKET.CLOSED) return false;
    if (x === latticeSize - 1 && tile.sockets.e !== SOCKET.CLOSED) return false;
    if (y === 0 && tile.sockets.n !== SOCKET.CLOSED) return false;
    if (y === latticeSize - 1 && tile.sockets.s !== SOCKET.CLOSED) return false;
    return true;
}

export function collapseChunkLattice(random, {
    tutorialOnly = false,
    depthTier = 0,
    loopChance = null,
    maxLoops = null,
    hallwayContinuation = 0.45,
    minimumHallwayRun = 2
} = {}) {
    const catalog = tutorialOnly ? SELECTABLE_CATALOG.filter((tile) => tile.tutorial) : SELECTABLE_CATALOG;
    const cellCount = LATTICE_SIZE * LATTICE_SIZE;
    let openEdges = tutorialOnly
        ? buildHamiltonianPath(random)
        : buildBranchingSpanningTree(random, NEIGHBOR_CACHE, cellCount);
    const roles = buildRoomHallRoles(
        openEdges,
        NEIGHBOR_CACHE,
        random,
        hallwayContinuation,
        minimumHallwayRun
    );
    if (!tutorialOnly) {
        openEdges = injectBoundedLoops(openEdges, NEIGHBOR_CACHE, roles, random, {
            chance: loopChance ?? Math.min(0.65, 0.24 + Math.max(0, depthTier) * 0.08),
            maxLoops: maxLoops ?? (depthTier >= 3 ? 2 : 1),
            minCycleLength: 4
        });
    }

    // Reserve one compatible approach hall for a canyon-lined traversal.
    // Previously canyon tiles only participated through their low catalog
    // weight, so many complete sectors contained no canyon at all despite
    // the maze art contract calling for rooms separated by exposed chasms.
    const canyonEligible = [];
    if (!tutorialOnly) {
        for (let index = 0; index < cellCount; index += 1) {
            if (roles[index] !== 'hallway') continue;
            const required = requiredSocketsFor(index, openEdges, NEIGHBOR_CACHE);
            const candidates = SELECTABLE_CATALOG.filter((tile) => (
                tile.category === 'canyon-walkway'
                && matchesRequirement(tile, required)
                && tile.throughConnects !== false
            ));
            if (candidates.length > 0) canyonEligible.push(index);
        }
    }
    const canyonIndex = canyonEligible.length > 0
        ? canyonEligible[Math.floor(random() * canyonEligible.length)]
        : -1;

    const lattice = [];
    for (let index = 0; index < cellCount; index += 1) {
        const required = requiredSocketsFor(index, openEdges, NEIGHBOR_CACHE);
        const wantsRoom = roles[index] === 'room';
        let tile = pickTileForCell(
            required,
            catalog,
            random,
            index === canyonIndex
                ? (candidate) => candidate.category === 'canyon-walkway'
                : wantsRoom
                ? (tile) => isRoomTile(tile) && roomHasNoExteriorDoor(tile, index, LATTICE_SIZE)
                : isHallwayTile
        );
        // If a requested room shape is unavailable in a restricted catalog
        // (notably the degree-capped tutorial set), a hallway is the safe
        // fallback: it can lengthen an approach but can never create a room
        // door that opens directly into another room.
        if (!tile && wantsRoom) {
            tile = pickTileForCell(required, catalog, random, isHallwayTile);
        }
        // Never return an undefined lattice cell. A role-specific catalog miss
        // is allowed to degrade to any topologically valid traversable tile;
        // stamping undefined was the source of opaque "WFC maze failure"
        // crashes in production seeds.
        if (!tile) {
            tile = pickTileForCell(required, catalog, random);
        }
        lattice.push(tile);
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

export function validateLatticeSeams(lattice) {
    if (!Array.isArray(lattice)) return ['lattice is not an array'];
    const latticeSize = Math.round(Math.sqrt(lattice.length));
    const errors = [];
    const check = (aIndex, bIndex, sideA, sideB) => {
        const a = lattice[aIndex];
        const b = lattice[bIndex];
        if (!a || !b) {
            errors.push(`missing tile at seam ${aIndex}:${sideA}-${bIndex}:${sideB}`);
            return;
        }
        if (a.sockets?.[sideA] !== b.sockets?.[sideB]) {
            errors.push(`socket mismatch ${aIndex}:${sideA}-${bIndex}:${sideB}`);
        }
        const aLane = sideA === 'e'
            ? a.pattern.map((row) => row[TILE_SIZE - 1])
            : [...a.pattern[TILE_SIZE - 1]];
        const bLane = sideB === 'w'
            ? b.pattern.map((row) => row[0])
            : [...b.pattern[0]];
        if (aLane.join('') !== bLane.join('')) {
            errors.push(`pattern mismatch ${aIndex}:${sideA}-${bIndex}:${sideB}`);
        }
    };
    for (let y = 0; y < latticeSize; y += 1) {
        for (let x = 0; x < latticeSize; x += 1) {
            const index = y * latticeSize + x;
            if (x + 1 < latticeSize) check(index, index + 1, 'e', 'w');
            if (y + 1 < latticeSize) check(index, index + latticeSize, 's', 'n');
        }
    }
    return errors;
}

// Turn every unused solid cell into canyon while retaining exactly the first
// solid cell beside indoor traversal as a structural wall. Exposed
// canyon-walkway tiles deliberately skip that wall band: they are wall-less
// platforms whose declared WFC sockets are the only safe exits.
export function addCanyonVoidAroundWalkable(grid, lattice = null) {
    if (!Array.isArray(grid) || grid.length === 0) return grid;
    const height = grid.length;
    const width = grid[0]?.length ?? 0;
    const source = grid.map((row) => [...row]);
    const walkable = (char) => ['.', 'D', 'R', 'B', 'L'].includes(char);
    const exposedCells = new Set();
    if (Array.isArray(lattice)) {
        const latticeSize = Math.round(Math.sqrt(lattice.length));
        const stride = TILE_SIZE - 1;
        for (let index = 0; index < lattice.length; index += 1) {
            const tile = lattice[index];
            if (tile?.category !== 'canyon-walkway') continue;
            const originX = (index % latticeSize) * stride;
            const originY = Math.floor(index / latticeSize) * stride;
            for (let localY = 0; localY < TILE_SIZE; localY += 1) {
                for (let localX = 0; localX < TILE_SIZE; localX += 1) {
                    exposedCells.add(`${originX + localX},${originY + localY}`);
                }
            }
        }
    }
    const hasWalkableWithin = (x, y, radius) => {
        for (let dy = -radius; dy <= radius; dy += 1) {
            for (let dx = -radius; dx <= radius; dx += 1) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
                if (walkable(source[ny][nx])) return true;
            }
        }
        return false;
    };

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            if (source[y][x] !== '#') continue;
            if (exposedCells.has(`${x},${y}`)) {
                grid[y][x] = 'X';
                continue;
            }
            const touchesPath = hasWalkableWithin(x, y, 1);
            if (touchesPath) continue; // retain the visible/collidable wall band
            grid[y][x] = 'X';
        }
    }
    return grid;
}

export function extractChunkWfcMetadata(lattice, chunkSize = 19, { chunkX = 0, chunkY = 0 } = {}) {
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
        seamErrors: validateLatticeSeams(lattice),
        rooms,
        anchors,
        roomInstances: buildRoomInstances(lattice, { chunkX, chunkY, chunkSize }),
        generationVersion: 2
    };
}
