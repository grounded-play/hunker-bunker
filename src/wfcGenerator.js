import { TILE_CATALOG, SOCKET, oppositeSide, TILE_SIZE } from './tileCatalog.js';

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

function fallbackLattice(tutorialOnly) {
    const catalogById = new Map(TILE_CATALOG.map((tile) => [tile.id, tile]));
    const roomClosed = catalogById.get('room-closed');

    if (tutorialOnly) {
        // A closed-room center means every corridor stub touching it must
        // face the center with its CLOSED side and open away from it.
        const alcoveN = catalogById.get('room-alcove-n');
        const alcoveS = catalogById.get('room-alcove-s');
        const alcoveE = catalogById.get('room-alcove-e');
        const alcoveW = catalogById.get('room-alcove-w');
        return [
            roomClosed, alcoveN, roomClosed,
            alcoveW, roomClosed, alcoveE,
            roomClosed, alcoveS, roomClosed
        ];
    }

    const straightNS = catalogById.get('corridor-straight-ns');
    const straightEW = catalogById.get('corridor-straight-ew');
    const cross = catalogById.get('corridor-cross');
    return [
        roomClosed, straightNS, roomClosed,
        straightEW, cross, straightEW,
        roomClosed, straightNS, roomClosed
    ];
}

export function collapseChunkLattice(random, { tutorialOnly = false } = {}) {
    const catalog = tutorialOnly ? TILE_CATALOG.filter((tile) => tile.tutorial) : TILE_CATALOG;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        const result = attemptCollapse(random, catalog);
        if (result && isFullyConnected(result)) return result;
    }
    return fallbackLattice(tutorialOnly);
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
