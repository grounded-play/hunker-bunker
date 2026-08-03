const WALKABLE = new Set(['.', 'D', 'R', 'B', 'L']);

function carveDisk(grid, cx, cy, radius) {
    for (let y = cy - radius; y <= cy + radius; y += 1) {
        for (let x = cx - radius; x <= cx + radius; x += 1) {
            if (grid[y]?.[x] !== undefined) grid[y][x] = '.';
        }
    }
}

function carveLine(grid, from, to, width) {
    let { x, y } = from;
    carveDisk(grid, x, y, width);
    while (x !== to.x || y !== to.y) {
        if (x !== to.x) x += Math.sign(to.x - x);
        else y += Math.sign(to.y - y);
        carveDisk(grid, x, y, width);
    }
}

function portalPoint(size, side, offset) {
    const coordinate = Math.max(2, Math.min(size - 3, offset * 2 + 1));
    if (side === 'north') return { x: coordinate, y: 0 };
    if (side === 'south') return { x: coordinate, y: size - 1 };
    if (side === 'west') return { x: 0, y: coordinate };
    return { x: size - 1, y: coordinate };
}

function carveRoom(grid, bounds, shape) {
    const { left, right, top, bottom } = bounds;
    for (let y = top; y <= bottom; y += 1) {
        for (let x = left; x <= right; x += 1) {
            const cutCorner = shape === 'l'
                && x > Math.floor((left + right) / 2)
                && y < Math.floor((top + bottom) / 2);
            const angledCorner = shape === 'octagonal'
                && ((x === left || x === right) && (y === top || y === bottom));
            if (!cutCorner && !angledCorner) grid[y][x] = '.';
        }
    }
}

function addWallShell(grid) {
    const source = grid.map((row) => [...row]);
    for (let y = 0; y < grid.length; y += 1) {
        for (let x = 0; x < grid[y].length; x += 1) {
            if (source[y][x] !== 'X') continue;
            let adjacent = false;
            for (let dy = -1; dy <= 1 && !adjacent; dy += 1) {
                for (let dx = -1; dx <= 1; dx += 1) {
                    if (WALKABLE.has(source[y + dy]?.[x + dx])) {
                        adjacent = true;
                        break;
                    }
                }
            }
            if (adjacent) grid[y][x] = '#';
        }
    }
}

// Find the three-wide corridor cuts through the shell surrounding an authored
// room. Door cells live on the corridor side of the room boundary so the slab
// replaces the missing wall, instead of sitting one tile inside the chamber.
function stampRoomThresholds(grid, bounds) {
    const candidates = [
        { side: 'n', cells: Array.from({ length: bounds.right - bounds.left + 1 }, (_, i) => ({ x: bounds.left + i, y: bounds.top - 1 })) },
        { side: 'e', cells: Array.from({ length: bounds.bottom - bounds.top + 1 }, (_, i) => ({ x: bounds.right + 1, y: bounds.top + i })) },
        { side: 's', cells: Array.from({ length: bounds.right - bounds.left + 1 }, (_, i) => ({ x: bounds.left + i, y: bounds.bottom + 1 })) },
        { side: 'w', cells: Array.from({ length: bounds.bottom - bounds.top + 1 }, (_, i) => ({ x: bounds.left - 1, y: bounds.top + i })) }
    ];
    const doors = [];

    for (const candidate of candidates) {
        let run = [];
        const flushRun = () => {
            if (run.length < 3) {
                run = [];
                return;
            }
            const center = Math.floor(run.length / 2);
            const start = Math.max(0, Math.min(run.length - 3, center - 1));
            const cells = run.slice(start, start + 3);
            for (const cell of cells) grid[cell.y][cell.x] = 'D';
            doors.push({ side: candidate.side, cells });
            run = [];
        };

        for (const cell of candidate.cells) {
            if (grid[cell.y]?.[cell.x] === '.') run.push(cell);
            else flushRun();
        }
        flushRun();
    }
    return doors;
}

function constrainBorderSockets(grid, openings) {
    const size = grid.length;
    for (let i = 0; i < size; i += 1) {
        grid[0][i] = 'X';
        grid[1][i] = 'X';
        grid[size - 1][i] = 'X';
        grid[size - 2][i] = 'X';
        grid[i][0] = 'X';
        grid[i][1] = 'X';
        grid[i][size - 1] = 'X';
        grid[i][size - 2] = 'X';
    }
    for (const [side, opening] of Object.entries(openings)) {
        if (!opening?.open) continue;
        const portal = portalPoint(size, side, opening.offset);
        for (let depth = 0; depth <= 1; depth += 1) {
            for (let offset = -1; offset <= 1; offset += 1) {
                const x = side === 'north' || side === 'south'
                    ? portal.x + offset
                    : portal.x + (side === 'west' ? depth : -depth);
                const y = side === 'west' || side === 'east'
                    ? portal.y + offset
                    : portal.y + (side === 'north' ? depth : -depth);
                grid[y][x] = '.';
            }
        }
    }
}

/**
 * A room-first, MarkovJunior/Nystrom-inspired chunk stage.
 * One chunk is one architectural gesture instead of a 3x3 carpet of motifs:
 * either a genuinely large room or a long bent connector. Everything beyond
 * its one-cell structural shell is lethal open canyon.
 */
export function generateArchitecturalMazeChunk(random, {
    size = 19,
    openings = {},
    roomMode = false,
    important = false
} = {}) {
    const grid = Array.from({ length: size }, () => Array(size).fill('X'));
    const center = Math.floor(size / 2);
    const portals = Object.entries(openings)
        .filter(([, opening]) => opening?.open)
        .map(([side, opening]) => portalPoint(size, side, opening.offset));
    const shape = random() < 0.38 ? 'l' : random() < 0.52 ? 'octagonal' : 'rectangle';
    const roomWidth = important ? 13 : 9 + Math.floor(random() * 5);
    const roomDepth = important ? 13 : 8 + Math.floor(random() * 6);
    const bounds = {
        left: Math.max(3, center - Math.floor(roomWidth / 2)),
        right: Math.min(size - 4, center + Math.floor(roomWidth / 2)),
        top: Math.max(3, center - Math.floor(roomDepth / 2)),
        bottom: Math.min(size - 4, center + Math.floor(roomDepth / 2))
    };
    let authoredRoom;

    if (roomMode || portals.length < 2) {
        carveRoom(grid, bounds, shape);
        authoredRoom = { bounds, shape };
    } else {
        // Long connectors cross almost the full 19-cell chunk. Offset the
        // hub and alternate axis order so seeds produce doglegs, S bends,
        // T junctions and crosses rather than identical straight strips.
        const hub = {
            x: Math.max(5, Math.min(size - 6, center + Math.floor((random() - 0.5) * 8))),
            y: Math.max(5, Math.min(size - 6, center + Math.floor((random() - 0.5) * 8)))
        };
        carveDisk(grid, hub.x, hub.y, 2);
        for (const portal of portals) {
            const bend = random() < 0.5
                ? { x: hub.x, y: portal.y }
                : { x: portal.x, y: hub.y };
            carveLine(grid, portal, bend, 1);
            carveLine(grid, bend, hub, 1);
        }
        // Every traversal connector terminates in a recognizable junction
        // bay. Making this optional produced full-chunk corridors that felt
        // like long dead ends even when they technically reached a seam.
        const bay = {
            left: Math.max(3, hub.x - 4),
            right: Math.min(size - 4, hub.x + 4),
            top: Math.max(3, hub.y - 3),
            bottom: Math.min(size - 4, hub.y + 3)
        };
        const bayShape = random() < 0.5 ? 'l' : 'rectangle';
        carveRoom(grid, bay, bayShape);
        authoredRoom = { bounds: bay, shape: bayShape };
    }

    const target = roomMode ? { x: center, y: center } : null;
    for (const portal of portals) {
        const destination = target ?? { x: center, y: center };
        const bend = random() < 0.5
            ? { x: destination.x, y: portal.y }
            : { x: portal.x, y: destination.y };
        carveLine(grid, portal, bend, 1);
        carveLine(grid, bend, destination, 1);
    }
    // Carving wide doglegs can otherwise run along a chunk boundary and make
    // an accidental open seam. Re-author the boundary from declared sockets:
    // canyon everywhere, exactly three floor cells at each hallway opening.
    constrainBorderSockets(grid, openings);
    const doors = stampRoomThresholds(grid, authoredRoom.bounds);
    addWallShell(grid);

    const interior = [];
    for (let y = authoredRoom.bounds.top; y <= authoredRoom.bounds.bottom; y += 1) {
        for (let x = authoredRoom.bounds.left; x <= authoredRoom.bounds.right; x += 1) {
            if (grid[y][x] === '.') interior.push({ x, y });
        }
    }
    return {
        grid,
        room: interior.length ? { ...authoredRoom, interior, doors } : null
    };
}
