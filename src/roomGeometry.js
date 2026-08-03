import { SOCKET, TILE_SIZE, CHUNK_SIZE } from './tileCatalog.js';

const WALKABLE_TILE_CHARS = new Set(['.', 'D', 'R', 'B', 'L']);
const SIDES = ['n', 'e', 's', 'w'];

export function isWalkableRoomChar(char) {
    return WALKABLE_TILE_CHARS.has(char);
}

export function getTileInteriorCells(tile) {
    if (!tile?.pattern) return [];
    const cells = [];
    for (let y = 1; y < TILE_SIZE - 1; y += 1) {
        for (let x = 1; x < TILE_SIZE - 1; x += 1) {
            if (isWalkableRoomChar(tile.pattern[y]?.[x])) cells.push({ x, y });
        }
    }
    return cells;
}

export function getTileWallCells(tile) {
    if (!tile?.pattern) return [];
    const cells = [];
    for (let y = 0; y < TILE_SIZE; y += 1) {
        for (let x = 0; x < TILE_SIZE; x += 1) {
            if (tile.pattern[y]?.[x] === '#') cells.push({ x, y });
        }
    }
    return cells;
}

export function getSocketLane(side) {
    if (side === 'n') return [{ x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }];
    if (side === 'e') return [{ x: 6, y: 2 }, { x: 6, y: 3 }, { x: 6, y: 4 }];
    if (side === 's') return [{ x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 }];
    return [{ x: 0, y: 2 }, { x: 0, y: 3 }, { x: 0, y: 4 }];
}

export function getTileDoorLanes(tile) {
    const lanes = {};
    for (const side of SIDES) {
        if (tile?.sockets?.[side] === SOCKET.OPEN3) lanes[side] = getSocketLane(side);
    }
    return lanes;
}

export function inferRoomSizeClass(tile) {
    const area = getTileInteriorCells(tile).length;
    if (area <= 12) return 'compact';
    if (area >= 23) return 'large';
    return 'standard';
}

function translateCells(cells, originX, originY) {
    return cells.map(({ x, y }) => ({ x: originX + x, y: originY + y }));
}

export function buildRoomInstances(lattice, {
    chunkX = 0,
    chunkY = 0,
    chunkSize = CHUNK_SIZE
} = {}) {
    if (!Array.isArray(lattice)) return [];
    const latticeSize = Math.round(Math.sqrt(lattice.length));
    const stride = TILE_SIZE - 1;
    const rooms = [];

    for (let index = 0; index < lattice.length; index += 1) {
        const tile = lattice[index];
        if (tile?.category !== 'room') continue;
        const mx = index % latticeSize;
        const my = Math.floor(index / latticeSize);
        const originX = mx * stride;
        const originY = my * stride;
        const localDoorLanes = getTileDoorLanes(tile);
        const doors = Object.entries(localDoorLanes).map(([side, cells]) => ({
            id: `${chunkX},${chunkY}:door:${index}:${side}`,
            side,
            cells: translateCells(cells, originX, originY),
            neighborIndex: side === 'n'
                ? index - latticeSize
                : side === 'e'
                    ? index + 1
                    : side === 's'
                        ? index + latticeSize
                        : index - 1
        }));
        rooms.push({
            id: `${chunkX},${chunkY}:room:${index}`,
            chunkKey: `${chunkX},${chunkY}`,
            latticeIndex: index,
            mx,
            my,
            originX,
            originY,
            tileId: tile.id,
            role: tile.roomRole || 'generic',
            theme: null,
            sizeClass: tile.sizeClass || inferRoomSizeClass(tile),
            footprint: translateCells(
                tile.pattern.flatMap((row, y) => [...row].flatMap((char, x) => (
                    isWalkableRoomChar(char) ? [{ x, y }] : []
                ))),
                originX,
                originY
            ).filter(({ x, y }) => x >= 0 && y >= 0 && x < chunkSize && y < chunkSize),
            interior: translateCells(getTileInteriorCells(tile), originX, originY),
            wallCells: translateCells(getTileWallCells(tile), originX, originY),
            doors,
            navigation: {
                doorLanes: doors.flatMap((door) => door.cells),
                primaryRoute: [],
                reserved: []
            },
            populationBudget: tile.populationBudget || {
                signature: 1,
                large: 1,
                small: 3,
                pickup: 1,
                enemy: 0
            },
            gate: null,
            placements: [],
            encounter: null
        });
    }

    return rooms;
}

export function validateRoomInstance(room, grid) {
    const errors = [];
    if (!room?.doors?.length) errors.push('room has no doors');
    for (const cell of room?.interior ?? []) {
        if (!isWalkableRoomChar(grid?.[cell.y]?.[cell.x])) {
            errors.push(`interior ${cell.x},${cell.y} is not walkable`);
        }
    }
    return errors;
}
