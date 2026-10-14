const SAFE = new Set(['.', 'D', 'O', 'B', 'R', 'L']);
const GAP = new Set(['C', 'X']);
const EXTERIOR_EDGE = new Set(['O', 'C', 'X']);

const SIDE_VECTOR = Object.freeze({
    n: { x: 0, y: -1 },
    e: { x: 1, y: 0 },
    s: { x: 0, y: 1 },
    w: { x: -1, y: 0 }
});

export function ensureRoomDoorAprons(grid, rooms, { depth = 3 } = {}) {
    const repaired = [];
    for (const room of rooms ?? []) {
        for (const door of room.doors ?? []) {
            const vector = SIDE_VECTOR[door.side];
            if (!vector) continue;
            for (const cell of door.cells ?? []) {
                for (let step = 1; step <= depth; step += 1) {
                    const x = cell.x + vector.x * step;
                    const y = cell.y + vector.y * step;
                    if (!grid?.[y] || x < 0 || x >= grid[y].length) continue;
                    if (SAFE.has(grid[y][x])) continue;
                    grid[y][x] = '.';
                    repaired.push({ roomId: room.id, doorId: door.id, x, y, step });
                }
            }
        }
    }
    return repaired;
}

/** Restore a structural wall wherever room floor would otherwise open directly outdoors. */
export function sealRoomExteriorEdges(grid, rooms) {
    const repairs = [];
    for (const room of rooms ?? []) {
        const interior = new Set((room.interior ?? []).map(({ x, y }) => `${x},${y}`));
        const doorCells = new Set((room.doors ?? []).flatMap((door) => door.cells ?? []).map(({ x, y }) => `${x},${y}`));
        for (const cell of room.interior ?? []) {
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const x = cell.x + dx;
                const y = cell.y + dy;
                if (interior.has(`${x},${y}`) || doorCells.has(`${x},${y}`)) continue;
                if (!EXTERIOR_EDGE.has(grid?.[y]?.[x])) continue;
                grid[y][x] = '#';
                repairs.push({ roomId: room.id, x, y });
            }
        }
    }
    return repairs;
}

export function validateRoomExteriorEnvelope(grid, rooms, { apronDepth = 3 } = {}) {
    const errors = [];
    for (const room of rooms ?? []) {
        const interior = new Set((room.interior ?? []).map(({ x, y }) => `${x},${y}`));
        const doorCells = new Set((room.doors ?? []).flatMap((door) => door.cells ?? []).map(({ x, y }) => `${x},${y}`));
        for (const cell of room.interior ?? []) {
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const x = cell.x + dx;
                const y = cell.y + dy;
                if (interior.has(`${x},${y}`) || doorCells.has(`${x},${y}`)) continue;
                const tile = grid?.[y]?.[x];
                if (EXTERIOR_EDGE.has(tile)) {
                    errors.push({ type: 'room-opens-to-edge', roomId: room.id, x: cell.x, y: cell.y, edgeX: x, edgeY: y });
                }
            }
        }
        for (const door of room.doors ?? []) {
            const vector = SIDE_VECTOR[door.side];
            if (!vector) continue;
            for (const cell of door.cells ?? []) {
                for (let step = 1; step <= apronDepth; step += 1) {
                    const x = cell.x + vector.x * step;
                    const y = cell.y + vector.y * step;
                    if (!SAFE.has(grid?.[y]?.[x])) {
                        errors.push({ type: 'door-apron-blocked', roomId: room.id, doorId: door.id, x, y, step });
                    }
                }
            }
        }
    }
    return errors;
}

function gapRun(grid, x, y, dx, dy, maxSpan) {
    const cells = [];
    for (let step = 1; step <= maxSpan + 1; step += 1) {
        const cx = x + dx * step;
        const cy = y + dy * step;
        const tile = grid?.[cy]?.[cx];
        if (tile === 'O') return cells.length >= 2 ? { cells, bank: { x: cx, y: cy } } : null;
        if (!GAP.has(tile)) return null;
        cells.push({ x: cx, y: cy });
    }
    return null;
}

/** Stamp at most one deterministic two-cell-wide bridge between stable banks. */
export function stampNaturalCrossing(grid, { maxSpan = 7 } = {}) {
    const height = grid?.length ?? 0;
    const width = grid?.[0]?.length ?? 0;
    const candidates = [];
    for (let y = 1; y < height - 1; y += 1) {
        for (let x = 1; x < width - 1; x += 1) {
            if (grid[y][x] !== 'O') continue;
            const horizontal = gapRun(grid, x, y, 1, 0, maxSpan);
            const horizontalMate = grid[y + 1]?.[x] === 'O' ? gapRun(grid, x, y + 1, 1, 0, maxSpan) : null;
            if (horizontal && horizontalMate && horizontal.cells.length === horizontalMate.cells.length) {
                candidates.push({ axis: 'horizontal', banks: [{ x, y }, horizontal.bank, { x, y: y + 1 }, horizontalMate.bank], cells: [...horizontal.cells, ...horizontalMate.cells] });
            }
            const vertical = gapRun(grid, x, y, 0, 1, maxSpan);
            const verticalMate = grid[y]?.[x + 1] === 'O' ? gapRun(grid, x + 1, y, 0, 1, maxSpan) : null;
            if (vertical && verticalMate && vertical.cells.length === verticalMate.cells.length) {
                candidates.push({ axis: 'vertical', banks: [{ x, y }, vertical.bank, { x: x + 1, y }, verticalMate.bank], cells: [...vertical.cells, ...verticalMate.cells] });
            }
        }
    }
    if (!candidates.length) return null;
    candidates.sort((a, b) => {
        const ak = `${a.cells[0].x},${a.cells[0].y},${a.axis}`;
        const bk = `${b.cells[0].x},${b.cells[0].y},${b.axis}`;
        return ak.localeCompare(bk);
    });
    const selected = candidates[0];
    for (const cell of selected.cells) grid[cell.y][cell.x] = 'B';
    return {
        id: `natural:${selected.axis}:${selected.cells[0].x},${selected.cells[0].y}`,
        family: 'stone',
        width: 2,
        ...selected
    };
}

export function chunkSpaceMetrics(grid) {
    const counts = { interior: 0, exterior: 0, fragile: 0, bridge: 0, void: 0, wall: 0 };
    for (const tile of grid?.flat?.() ?? []) {
        if (tile === '.' || tile === 'D' || tile === 'R' || tile === 'L') counts.interior += 1;
        else if (tile === 'O') counts.exterior += 1;
        else if (tile === 'C') counts.fragile += 1;
        else if (tile === 'B') counts.bridge += 1;
        else if (tile === 'X' || tile === 'P') counts.void += 1;
        else if (tile === '#') counts.wall += 1;
    }
    const traversable = counts.interior + counts.exterior + counts.fragile + counts.bridge;
    return {
        ...counts,
        traversable,
        interiorRatio: traversable ? counts.interior / traversable : 0,
        exteriorRatio: traversable ? (counts.exterior + counts.fragile + counts.bridge) / traversable : 0
    };
}
