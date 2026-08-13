export const ROOM_ENCOUNTER_PROFILES = Object.freeze({
    safe: Object.freeze({ enemies: [], minDepthTier: 0 }),
    sterile: Object.freeze({ enemies: [], minDepthTier: 0 }),
    utility: Object.freeze({
        minDepthTier: 1,
        enemies: [{ type: 'cybersnail', min: 0, max: 1, weight: 1 }]
    }),
    security: Object.freeze({
        minDepthTier: 2,
        enemies: [{ type: 'sentinel', min: 1, max: 1, weight: 1 }]
    }),
    standard: Object.freeze({
        minDepthTier: 1,
        enemies: [{ type: 'cybersnail', min: 0, max: 2, weight: 1 }]
    }),
    'cryo-standard': Object.freeze({
        minDepthTier: 1,
        enemies: [{ type: 'cryosnail', min: 0, max: 2, weight: 1 }]
    }),
    'bio-standard': Object.freeze({
        minDepthTier: 2,
        enemies: [
            { type: 'sporesnail', min: 0, max: 2, weight: 1 },
            { type: 'crawler', min: 0, max: 1, weight: 0.28 }
        ]
    }),
    'bio-nest-guard': Object.freeze({
        minDepthTier: 2,
        enemies: [
            { type: 'sporesnail', min: 1, max: 2, weight: 1 },
            { type: 'crawler', min: 0, max: 1, weight: 0.4 }
        ]
    })
});

function chooseCount(config, random) {
    const min = Math.max(0, Number(config.min) || 0);
    const max = Math.max(min, Number(config.max) || min);
    return min + Math.floor(random() * (max - min + 1));
}

function isPointInBounds(x, y, bounds) {
    if (!bounds) return false;
    const minX = bounds.minX ?? bounds.left ?? bounds.x;
    const maxX = bounds.maxX ?? bounds.right ?? (bounds.x != null && bounds.width != null ? bounds.x + bounds.width : undefined);
    const minY = bounds.minY ?? bounds.top ?? bounds.y ?? bounds.z;
    const maxY = bounds.maxY ?? bounds.bottom ?? (bounds.y != null && bounds.height != null ? bounds.y + bounds.height : (bounds.z != null && bounds.height != null ? bounds.z + bounds.height : undefined));

    if (minX == null || maxX == null || minY == null || maxY == null) return false;
    return x >= minX && x <= maxX && y >= minY && y <= maxY;
}

const NAVIGATION_WALKABLE_CELLS = new Set(['.', 'D', 'R', 'B', 'L']);

function normalizeBlockedCells(blockedCells) {
    if (blockedCells instanceof Set) return blockedCells;
    return new Set((blockedCells ?? []).map((cell) => (
        typeof cell === 'string' ? cell : `${cell.x},${cell.y ?? cell.z}`
    )));
}

/**
 * Returns the final-grid navigation component connected to any walkable chunk
 * border. Closed runtime doors can be supplied as `blockedCells`; otherwise a
 * stamped `D` threshold remains traversable for planning purposes.
 */
export function collectReachableCells(grid, { blockedCells = [] } = {}) {
    const blocked = normalizeBlockedCells(blockedCells);
    const reachable = new Set();
    const queue = [];
    const isWalkable = (x, y) => (
        NAVIGATION_WALKABLE_CELLS.has(grid?.[y]?.[x])
        && !blocked.has(`${x},${y}`)
    );
    const enqueue = (x, y) => {
        const key = `${x},${y}`;
        if (!reachable.has(key) && isWalkable(x, y)) {
            reachable.add(key);
            queue.push({ x, y });
        }
    };

    for (let y = 0; y < (grid?.length ?? 0); y += 1) {
        const rowWidth = grid[y]?.length ?? 0;
        for (let x = 0; x < rowWidth; x += 1) {
            if (y === 0 || y === grid.length - 1 || x === 0 || x === rowWidth - 1) enqueue(x, y);
        }
    }

    for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const { x, y } = queue[cursor];
        enqueue(x + 1, y);
        enqueue(x - 1, y);
        enqueue(x, y + 1);
        enqueue(x, y - 1);
    }
    return reachable;
}

/**
 * Plans encounters for a single room with zone awareness, pressure budget, and reachability.
 */
export function planRoomEncounter(room, grid, random, {
    depthTier = 0,
    maxUnlockedRing = 5,
    reachableCells = null
} = {}) {
    const profileId = room.themeConfig?.encounterProfile ?? 'standard';
    const profile = ROOM_ENCOUNTER_PROFILES[profileId] ?? ROOM_ENCOUNTER_PROFILES.standard;
    const roomRing = room.ring ?? room.tier ?? 1;

    // Reject encounters if depth tier too low, profile is empty, or room is in locked ring
    if (depthTier < (profile.minDepthTier ?? 0) || profile.enemies.length === 0 || roomRing > maxUnlockedRing) {
        return { roomId: room.id, profileId, spawns: [], cleared: false };
    }

    // Quiet rooms / safe havens reject all enemy spawns
    if (room.isSafe || room.isQuiet || room.role === 'camp' || room.role === 'medical_safe' || profileId === 'safe' || profileId === 'sterile') {
        return { roomId: room.id, profileId: 'safe', spawns: [], cleared: false };
    }

    const reserved = new Set(room.populationPlan?.reserved ?? []);
    const doorCells = room.navigation?.doorLanes ?? [];
    const quietZones = room.quietZones ?? [];
    const encounterZones = room.encounterZones ?? [];
    const reachableSet = reachableCells instanceof Set ? reachableCells : null;

    // Filter candidate walkable interior cells
    let candidates = (room.interior ?? []).filter(({ x, y }) => {
        if (grid?.[y]?.[x] !== '.') return false;
        if (reserved.has(`${x},${y}`)) return false;
        // Keep distance from door thresholds
        if (doorCells.some((door) => Math.hypot((door.x ?? door[0]) - x, (door.y ?? door.z ?? door[1]) - y) < 2)) return false;
        // Exclude cells inside quiet zones
        if (quietZones.some((zone) => isPointInBounds(x, y, zone.bounds ?? zone))) return false;
        // Reachability filter
        if (reachableSet && !reachableSet.has(`${x},${y}`)) return false;
        return true;
    });

    // An authored encounter zone is a hard placement contract, not a hint.
    // Falling back to the rest of the room when its zone is obstructed or
    // unreachable can put enemies behind sealed doors (or in the very quiet
    // space the author was trying to protect).
    if (encounterZones.length > 0) {
        candidates = candidates.filter(({ x, y }) => (
            encounterZones.some((zone) => isPointInBounds(x, y, zone.bounds ?? zone))
        ));
    }

    // Maximum pressure budget for the room
    const configuredMaximum = room.contentBudget?.enemiesMax
        ?? room.populationBudget?.enemy?.max
        ?? room.populationBudget?.enemy;
    const parsedMaximum = configuredMaximum == null ? 4 : Number(configuredMaximum);
    const maxEnemies = Number.isFinite(parsedMaximum)
        ? Math.max(0, Math.floor(parsedMaximum))
        : 4;

    const spawns = [];
    for (const enemy of profile.enemies) {
        if (spawns.length >= maxEnemies) break;
        const count = chooseCount(enemy, random);
        for (let index = 0; index < count && candidates.length > 0 && spawns.length < maxEnemies; index += 1) {
            const candidateIndex = Math.floor(random() * candidates.length);
            const [cell] = candidates.splice(candidateIndex, 1);
            spawns.push({
                id: `${room.id}:encounter:${spawns.length}`,
                roomId: room.id,
                x: cell.x,
                y: cell.y,
                type: enemy.type
            });
        }
    }
    return { roomId: room.id, profileId, spawns, cleared: false };
}

export function planChunkRoomEncounters(rooms, grid, random, options = {}) {
    return (rooms ?? []).map((room) => planRoomEncounter(room, grid, random, options));
}
