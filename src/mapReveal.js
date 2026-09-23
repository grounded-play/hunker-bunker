// What the tactical map may show. Everything the carrier has not scanned or
// walked stays under fog: a chunk being "discovered" only means some of it
// is known, never that all of it is.

export const MAP_FLOOR_TILES = Object.freeze(new Set(['.', 'D', 'R', 'B', 'L', 'O']));

const NEIGHBOURS = Object.freeze([[1, 0], [-1, 0], [0, 1], [0, -1]]);

function roomCells(room) {
    return room?.footprint?.length ? room.footprint : (room?.interior ?? []);
}

/**
 * Rooms a radar pulse actually reaches: any floor cell of the room inside the
 * pulse (plus the same 3-unit edge allowance cells get). A scan that clips a
 * chunk corner no longer lights up every room in that chunk.
 */
export function roomsReachedByScan(rooms, { chunkX, chunkY, chunkSize, x, z, radius }) {
    const reach = radius + 3;
    return (rooms ?? []).filter((room) => roomCells(room).some((cell) => (
        Math.hypot(chunkX * chunkSize + cell.x - x, chunkY * chunkSize + cell.y - z) <= reach
    )));
}

/**
 * The cells of one discovered chunk to draw: floor from discovered rooms and
 * from individually scanned/walked cells, plus the walls that outline them so
 * a scanned corridor reads as a path rather than a smear of dots.
 *
 * @returns {{ x: number, y: number, kind: 'room'|'hall'|'door'|'wall' }[]}
 */
export function buildRevealedChunkCells(grid, {
    chunkKey,
    chunkX,
    chunkY,
    chunkSize,
    rooms = [],
    discoveredRoomKeys = new Set(),
    discoveredCellKeys = new Set()
}) {
    const roomSet = new Set(rooms
        .filter((room) => discoveredRoomKeys.has(`${chunkKey}:${room.id}`))
        .flatMap(roomCells)
        .map((cell) => `${cell.x},${cell.y}`));
    const cells = [];
    const floor = new Set();
    for (let y = 0; y < grid.length; y += 1) {
        for (let x = 0; x < (grid[y]?.length ?? 0); x += 1) {
            const tile = grid[y][x];
            if (!MAP_FLOOR_TILES.has(tile)) continue;
            const inRoom = roomSet.has(`${x},${y}`);
            if (!inRoom && !discoveredCellKeys.has(`${chunkX * chunkSize + x},${chunkY * chunkSize + y}`)) continue;
            floor.add(`${x},${y}`);
            cells.push({ x, y, kind: tile === 'D' ? 'door' : inRoom ? 'room' : 'hall' });
        }
    }
    const walls = new Set();
    for (const key of floor) {
        const [x, y] = key.split(',').map(Number);
        for (const [dx, dy] of NEIGHBOURS) {
            const wx = x + dx;
            const wy = y + dy;
            const wallKey = `${wx},${wy}`;
            if (walls.has(wallKey) || grid[wy]?.[wx] !== '#') continue;
            walls.add(wallKey);
            cells.push({ x: wx, y: wy, kind: 'wall' });
        }
    }
    return cells;
}
