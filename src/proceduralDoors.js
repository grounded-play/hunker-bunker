// Blast-door slab footprint in world units: it spans the three-cell threshold
// and is this thick across it, centred on the middle cell, and sinks into the
// floor to open. threeGame scales its wall box to these; the room gateway frame
// (kitGrammar.GATEWAY_ROOM_INSET) stands clear of the slab using them.
export const PROCEDURAL_DOOR_SLAB_SPAN = 3.35;
export const PROCEDURAL_DOOR_SLAB_THICKNESS = 0.58;

const SIDE_ORIENTATION = Object.freeze({
    n: 'horizontal',
    s: 'horizontal',
    e: 'vertical',
    w: 'vertical'
});

export function portalKeyForDoorway(room, doorway) {
    const orientation = SIDE_ORIENTATION[doorway?.side] ?? doorway?.orientation ?? 'unknown';
    const cells = (doorway?.cells ?? [])
        .filter((cell) => Number.isFinite(cell?.x) && Number.isFinite(cell?.y))
        .map((cell) => `${cell.x},${cell.y}`)
        .sort()
        .join('|');
    return `${room?.chunkKey ?? 'unknown'}:${orientation}:${cells}`;
}

export const DOOR_FAMILIES = Object.freeze({
    'blast-slab': Object.freeze({ motion: 'sink-floor', frameStyle: 'reinforced-bulkhead', materialVariant: 'bunker' }),
    'split-bulkhead': Object.freeze({ motion: 'split-sideways', frameStyle: 'pressure-frame', materialVariant: 'industrial' }),
    'arch-guillotine': Object.freeze({ motion: 'retract-crown', frameStyle: 'arched-rib', materialVariant: 'organic' }),
    'camp-barricade': Object.freeze({ motion: 'swing-fold', frameStyle: 'salvage-brace', materialVariant: 'camp' })
});

const STYLE_FAMILY = Object.freeze({
    bunker: 'blast-slab',
    security: 'blast-slab',
    utility: 'split-bulkhead',
    'medical-seal': 'split-bulkhead',
    cryo: 'split-bulkhead',
    'cryo-security': 'split-bulkhead',
    hive: 'arch-guillotine',
    resin: 'arch-guillotine',
    camp: 'camp-barricade'
});

export function doorClearanceEnvelope(door) {
    const cells = doorThresholdSupportCells(door);
    const threshold = door?.cells?.length
        ? door.cells
        : Number.isFinite(door?.localX) && Number.isFinite(door?.localY)
            ? [{ x: door.localX, y: door.localY }]
            : [];
    const all = [...threshold, ...cells];
    if (!all.length) return null;
    return {
        minX: Math.min(...all.map(({ x }) => x)) - (door.orientation === 'vertical' ? 2 : 0),
        maxX: Math.max(...all.map(({ x }) => x)) + (door.orientation === 'vertical' ? 2 : 0),
        minY: Math.min(...all.map(({ y }) => y)) - (door.orientation === 'horizontal' ? 2 : 0),
        maxY: Math.max(...all.map(({ y }) => y)) + (door.orientation === 'horizontal' ? 2 : 0),
        playerHeight: 2.15
    };
}

/** Presentation-only pose shared by every logical door state machine. */
export function resolveDoorMotionPose(door, openness, {
    span = PROCEDURAL_DOOR_SLAB_SPAN,
    closedY = 2.4,
    openY = -4.8
} = {}) {
    const t = Math.max(0, Math.min(1, Number(openness) || 0));
    const motion = door?.motion ?? 'sink-floor';
    const pose = { y: closedY, yaw: 0, offsetX: 0, offsetZ: 0, spanScale: 1 };
    if (motion === 'retract-crown') {
        pose.y = closedY + Math.abs(openY - closedY) * t;
    } else if (motion === 'split-sideways') {
        // One draw object represents the paired leaves; collapsing its long
        // axis symmetrically reads as both halves withdrawing into the jambs.
        pose.spanScale = Math.max(0.04, 1 - t);
    } else if (motion === 'swing-fold') {
        const yaw = t * Math.PI * 0.5;
        const half = span * 0.5;
        pose.yaw = yaw;
        if (door?.orientation === 'vertical') {
            pose.offsetX = half * Math.sin(yaw);
            pose.offsetZ = half * (Math.cos(yaw) - 1);
        } else {
            pose.offsetX = half * (Math.cos(yaw) - 1);
            pose.offsetZ = -half * Math.sin(yaw);
        }
    } else {
        pose.y = closedY + (openY - closedY) * t;
    }
    return pose;
}

export function doorPresentationForStyle(style = 'bunker') {
    const family = STYLE_FAMILY[style] ?? 'blast-slab';
    return { family, ...DOOR_FAMILIES[family] };
}

function doorRecord(room, doorway, center, tutorial) {
    const style = room.themeConfig?.doorStyle ?? 'bunker';
    const record = {
        id: doorway.id,
        portalKey: portalKeyForDoorway(room, doorway),
        roomId: room.id,
        roomIds: [room.id],
        doorwayIds: [doorway.id],
        chunkKey: room.chunkKey,
        localX: center.x,
        localY: center.y,
        cells: doorway.cells.map((cell) => ({ x: cell.x, y: cell.y })),
        side: doorway.side,
        orientation: SIDE_ORIENTATION[doorway.side],
        style,
        ...doorPresentationForStyle(style),
        state: 'closed',
        lock: null,
        hp: tutorial ? 3 : 6,
        maxHp: tutorial ? 3 : 6,
        autoClose: true
    };
    record.clearanceEnvelope = doorClearanceEnvelope(record);
    return record;
}

function doorChanceForRoom(_room) {
    return 1;
}

export function planProceduralDoors(rooms, random, { tutorial = false, forceAtLeastOne = false } = {}) {
    const records = [];
    const byPortal = new Map();
    for (const room of rooms ?? []) {
        for (const doorway of room.doors ?? []) {
            const center = doorway.cells?.[Math.floor(doorway.cells.length / 2)];
            if (!center) continue;
            const key = portalKeyForDoorway(room, doorway);
            const existing = byPortal.get(key);
            if (existing) {
                if (!existing.roomIds.includes(room.id)) existing.roomIds.push(room.id);
                if (!existing.doorwayIds.includes(doorway.id)) existing.doorwayIds.push(doorway.id);
                continue;
            }
            if (random() > doorChanceForRoom(room)) continue;
            const record = doorRecord(room, doorway, center, tutorial);
            byPortal.set(key, record);
            records.push(record);
        }
    }
    if (forceAtLeastOne && records.length === 0) {
        const room = (rooms ?? []).find((candidate) => candidate.doors?.length);
        const doorway = room?.doors?.[0];
        const center = doorway?.cells?.[Math.floor((doorway.cells?.length ?? 1) / 2)];
        if (room && doorway && center) {
            records.push(doorRecord(room, doorway, center, tutorial));
        }
    }
    return records;
}

export function doorThresholdSupportCells(door) {
    const cells = door?.cells?.length
        ? door.cells.filter((cell) => Number.isFinite(cell?.x) && Number.isFinite(cell?.y))
        : Number.isFinite(door?.localX) && Number.isFinite(door?.localY)
            ? [{ x: door.localX, y: door.localY }]
            : [];
    if (!cells.length) return [];
    if (door.orientation === 'vertical') {
        const x = door.localX ?? cells[0].x;
        const ys = cells.map((cell) => cell.y);
        return [{ x, y: Math.min(...ys) - 1 }, { x, y: Math.max(...ys) + 1 }];
    }
    const y = door.localY ?? cells[0].y;
    const xs = cells.map((cell) => cell.x);
    return [{ x: Math.min(...xs) - 1, y }, { x: Math.max(...xs) + 1, y }];
}

const isStructuralSupport = (tile) => tile === '#' || tile === 'W';

export function validateDoorThresholdSupports(grid, door) {
    const supports = doorThresholdSupportCells(door);
    const missing = supports.filter(({ x, y }) => !isStructuralSupport(grid?.[y]?.[x]));
    return { valid: supports.length === 2 && missing.length === 0, supports, missing };
}

export function ensureDoorThresholdSupports(grid, door) {
    const height = grid?.length ?? 0;
    const width = grid?.[0]?.length ?? 0;
    for (const { x, y } of doorThresholdSupportCells(door)) {
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        if (!isStructuralSupport(grid[y][x])) grid[y][x] = '#';
    }
    return validateDoorThresholdSupports(grid, door);
}

const isDoorWalkable = (tile) => tile === '.' || tile === 'D' || tile === 'R' || tile === 'B' || tile === 'L';

export function doorPassageCells(door) {
    const center = { x: door?.localX, y: door?.localY };
    if (!Number.isFinite(center.x) || !Number.isFinite(center.y)) return [];
    return door?.orientation === 'vertical'
        ? [{ x: center.x - 1, y: center.y }, { x: center.x + 1, y: center.y }]
        : [{ x: center.x, y: center.y - 1 }, { x: center.x, y: center.y + 1 }];
}

export function ensureDoorPassage(grid, door) {
    for (const { x, y } of doorPassageCells(door)) {
        if (!grid?.[y] || x < 0 || x >= grid[y].length) continue;
        if (grid[y][x] === '#' || grid[y][x] === 'W') grid[y][x] = '.';
    }
    const cells = doorPassageCells(door);
    const blocked = cells.filter(({ x, y }) => !isDoorWalkable(grid?.[y]?.[x]));
    return { valid: cells.length === 2 && blocked.length === 0, cells, blocked };
}

export function stampDoorRecords(grid, records) {
    for (const door of records ?? []) {
        ensureDoorThresholdSupports(grid, door);
        const cells = door.cells?.length
            ? door.cells
            : [{ x: door.localX, y: door.localY }];
        for (const cell of cells) {
            if (grid?.[cell.y]?.[cell.x] === '.') {
                grid[cell.y][cell.x] = 'D';
            }
        }
        door.clearBothSides = ensureDoorPassage(grid, door).valid;
    }
    return grid;
}

export function transitionDoorState(door, action, unlocked = true) {
    if (!door) return null;
    if (door.state === 'destroyed') return door;
    if (door.lock && !unlocked) return { ...door, state: 'locked' };
    if (action === 'destroy') return { ...door, state: 'destroyed', hp: 0 };
    if (action === 'open' || (action === 'toggle' && door.state !== 'open')) {
        return { ...door, state: 'open' };
    }
    if (action === 'close' || action === 'toggle') return { ...door, state: 'closed' };
    return door;
}

export function serializeDoorStates(states) {
    return [...(states?.values?.() ?? [])].map((door) => ({ ...door }));
}

export function restoreDoorStates(records) {
    return new Map((records ?? []).map((door) => [door.id, { ...door }]));
}
