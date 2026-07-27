import { TILE_SIZE } from './tileCatalog.js';

export const VERTICAL_TILE = Object.freeze({
    PIT: 'P',
    RAMP: 'R',
    BRIDGE: 'B',
    LADDER: 'L'
});

export const BRIDGE_HEIGHT = 1.5;

function openSide(tile) {
    return ['n', 'e', 's', 'w'].find((side) => tile.sockets?.[side] === 'OPEN3') ?? 's';
}

function setCell(grid, heightmap, x, y, type, height = 0) {
    grid[y][x] = type;
    heightmap[y][x] = height;
}

/**
 * Converts one dead-end WFC room into a deterministic elevated bridge room.
 * The room's original socket stays at ground level, two ramp rows climb to a
 * three-wide bridge, and every exposed interior cell becomes a lethal pit.
 * Because an alcove is a graph leaf, this adds vertical traversal without
 * cutting the chunk's required through-route.
 */
export function applyVerticalBridgeFeature(grid, lattice, random, { force = false } = {}) {
    if (!grid || !Array.isArray(lattice)) return null;
    if (!force && random() > 0.42) return null;

    const roomIndices = lattice
        .map((tile, index) => ({ tile, index }))
        .filter(({ tile }) => tile.category === 'room');
    if (roomIndices.length === 0) return null;

    const selected = roomIndices[Math.floor(random() * roomIndices.length)];
    const useLadder = random() > 0.78;
    const latticeSize = Math.round(Math.sqrt(lattice.length));
    const stride = TILE_SIZE - 1;
    const mx = selected.index % latticeSize;
    const my = Math.floor(selected.index / latticeSize);
    const originX = mx * stride;
    const originY = my * stride;
    const side = openSide(selected.tile);
    const heightmap = Array.from({ length: grid.length }, () => Array(grid.length).fill(null));
    const pitCells = [];
    const rampCells = [];
    const bridgeCells = [];

    for (let localY = 1; localY <= 5; localY += 1) {
        for (let localX = 1; localX <= 5; localX += 1) {
            const x = originX + localX;
            const y = originY + localY;
            setCell(grid, heightmap, x, y, VERTICAL_TILE.PIT, 0);
            pitCells.push({ x, y });
        }
    }

    const stampWalkway = (localX, localY, type, height) => {
        const x = originX + localX;
        const y = originY + localY;
        setCell(grid, heightmap, x, y, type, height);
        const target = type === VERTICAL_TILE.BRIDGE ? bridgeCells : rampCells;
        target.push({ x, y, height, type });
        const pitIndex = pitCells.findIndex((cell) => cell.x === x && cell.y === y);
        if (pitIndex >= 0) pitCells.splice(pitIndex, 1);
    };

    for (let width = 2; width <= 4; width += 1) {
        for (let depth = 1; depth <= 5; depth += 1) {
            let localX = width;
            let localY = depth;
            let distanceFromEntrance = 6 - depth;
            if (side === 'n') distanceFromEntrance = depth;
            if (side === 'e' || side === 'w') {
                localX = depth;
                localY = width;
                distanceFromEntrance = side === 'e' ? 6 - depth : depth;
            }
            if (useLadder && distanceFromEntrance <= 2 && width !== 3) continue;
            const type = distanceFromEntrance <= 2
                ? (useLadder ? VERTICAL_TILE.LADDER : VERTICAL_TILE.RAMP)
                : VERTICAL_TILE.BRIDGE;
            const height = type === VERTICAL_TILE.RAMP || type === VERTICAL_TILE.LADDER
                ? (distanceFromEntrance / 2) * BRIDGE_HEIGHT
                : BRIDGE_HEIGHT;
            stampWalkway(localX, localY, type, height);
        }
    }

    const feature = {
        tileId: selected.tile.id,
        latticeIndex: selected.index,
        originX,
        originY,
        side,
        accessType: useLadder ? 'ladder' : 'ramp',
        pitCells,
        rampCells,
        bridgeCells,
        heightmap
    };
    grid.verticalFeature = feature;
    grid.verticalHeightmap = heightmap;
    return feature;
}
