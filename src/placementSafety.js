const DEFAULT_DOOR_CLEARANCE = 1.6;

function finiteCell(cell) {
    if (!Number.isFinite(cell?.x) || !Number.isFinite(cell?.y)) return null;
    return { x: cell.x, y: cell.y };
}

function doorOrientation(door) {
    if (door?.orientation === 'horizontal' || door?.orientation === 'vertical') return door.orientation;
    if (door?.side === 'n' || door?.side === 's') return 'horizontal';
    if (door?.side === 'e' || door?.side === 'w') return 'vertical';
    return null;
}

/**
 * Expands a threshold into the non-negotiable placement envelope: the full
 * door width, one cell beyond each jamb, and two cells of approach/departure
 * depth on both sides. This is intentionally cell-based so large props cannot
 * pass a center-point-only radius check while still clipping the route.
 */
export function doorApronCellsForDoor(door, { lateral = 1, longitudinal = 2 } = {}) {
    const cells = (door?.cells ?? []).map(finiteCell).filter(Boolean);
    if (!cells.length && Number.isFinite(door?.localX) && Number.isFinite(door?.localY)) {
        cells.push({ x: door.localX, y: door.localY });
    }
    const orientation = doorOrientation(door);
    if (!cells.length || !orientation) return cells;
    const lateralPad = Math.max(0, Math.round(Number(lateral) || 0));
    const depth = Math.max(0, Math.round(Number(longitudinal) || 0));
    const fixed = orientation === 'horizontal'
        ? Math.round(cells.reduce((sum, cell) => sum + cell.y, 0) / cells.length)
        : Math.round(cells.reduce((sum, cell) => sum + cell.x, 0) / cells.length);
    const lateralValues = cells.map((cell) => orientation === 'horizontal' ? cell.x : cell.y);
    const start = Math.min(...lateralValues) - lateralPad;
    const end = Math.max(...lateralValues) + lateralPad;
    const apron = [];
    for (let along = start; along <= end; along += 1) {
        for (let normal = fixed - depth; normal <= fixed + depth; normal += 1) {
            apron.push(orientation === 'horizontal'
                ? { x: along, y: normal }
                : { x: normal, y: along });
        }
    }
    return apron;
}

/**
 * One canonical doorway list for every chunk-level placement planner.
 * Room navigation lanes catch open authored thresholds; runtime door records
 * catch locked/destroyable slabs. De-duplicating them keeps audits readable.
 */
export function collectDoorApronCells(metadata) {
    const roomDoors = (metadata?.roomInstances ?? []).flatMap((room) => room.doors ?? []);
    const recordedDoors = metadata?.doors ?? [];
    const cells = [
        ...(metadata?.roomInstances ?? []).flatMap((room) => room.navigation?.doorLanes ?? []),
        ...roomDoors.flatMap((door) => doorApronCellsForDoor(door)),
        ...recordedDoors.flatMap((door) => doorApronCellsForDoor(door))
    ];
    const unique = new Map();
    for (const raw of cells) {
        const cell = finiteCell(raw);
        if (cell) unique.set(`${cell.x},${cell.y}`, cell);
    }
    return [...unique.values()];
}

export function isOutsideDoorApron(x, y, doorCells, clearance = DEFAULT_DOOR_CLEARANCE) {
    return (doorCells ?? []).every((door) => Math.hypot(x - door.x, y - door.y) >= clearance);
}

function localPosition(placement, { chunkX = 0, chunkY = 0, chunkSize = 0 } = {}) {
    const x = Number.isFinite(placement?.localX)
        ? placement.localX
        : Number.isFinite(placement?.worldX)
            ? placement.worldX - chunkX * chunkSize
            : Number.isFinite(placement?.x)
                ? placement.x - chunkX * chunkSize
                : null;
    const y = Number.isFinite(placement?.localY)
        ? placement.localY
        : Number.isFinite(placement?.worldZ)
            ? placement.worldZ - chunkY * chunkSize
            : Number.isFinite(placement?.z)
                ? placement.z - chunkY * chunkSize
                : null;
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

export function isDoorApronExempt(placement) {
    return placement?.doorApronExempt === true
        || (placement?.groupType === 'architecture' && placement?.isSolidProp === false);
}

/**
 * Final safety pass over a composed chunk manifest. This catches regressions
 * introduced after the individual room, pickup, scatter, encounter, and
 * dressing planners have each done their own reservations.
 */
export function auditDoorApronPlacements(placements, doorCells, options = {}) {
    const safe = [];
    const violations = [];
    const clearance = Number.isFinite(options.clearance)
        ? Math.max(0, options.clearance)
        : DEFAULT_DOOR_CLEARANCE;
    for (const placement of placements ?? []) {
        const point = localPosition(placement, options);
        if (!point || isDoorApronExempt(placement) || isOutsideDoorApron(point.x, point.y, doorCells, clearance)) {
            safe.push(placement);
        } else {
            violations.push({ placement, localX: point.x, localY: point.y });
        }
    }
    return { safe, violations };
}

export function filterDoorApronPlacements(placements, doorCells, options = {}) {
    return auditDoorApronPlacements(placements, doorCells, options).safe;
}

export { DEFAULT_DOOR_CLEARANCE };
