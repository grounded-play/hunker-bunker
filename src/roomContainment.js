// Room containment rules governing safe zones, hostile aggro barriers,
// and area-of-effect clamping across protected perimeters.

/**
 * Checks whether a given world (or grid) coordinate is inside a designated
 * combat-safe zone. Quiet is presentation/spawn policy and does not, by itself,
 * grant immunity from hostile targeting or damage.
 * @param {number} x - World or local X coordinate
 * @param {number} z - World or local Z coordinate
 * @param {Array<Object>} roomsOrZones - Array of room instances or containment zone descriptors
 * @returns {boolean} True if inside an explicitly safe zone
 */
export function isCellInSafeZone(x, z, roomsOrZones = []) {
    if (!Array.isArray(roomsOrZones) || roomsOrZones.length === 0) return false;
    for (const entry of roomsOrZones) {
        if (!entry) continue;

        const hasSafePolicy = entry.isSafe === true
            || entry.safeZone === true
            || entry.type === 'safe'
            || entry.containment === true
            || entry.containment?.safeZone === true
            || entry.containment?.blocksHostiles === true
            || entry.containment?.blocksDamage === true;
        if (hasSafePolicy) {
            if (isPointInBounds(x, z, entry.bounds ?? entry)) return true;
        }

        // Nested zones remain opt-in. In particular, being listed under
        // `quietZones` is not enough to become a combat-safe zone.
        if (entry.safeZones?.length && isCellInSafeZone(x, z, entry.safeZones)) {
            return true;
        }
        if (entry.quietZones?.length) {
            for (const zone of entry.quietZones) {
                if (isCellInSafeZone(x, z, [zone])) return true;
            }
        }
    }
    return false;
}

/**
 * Converts supported 2D bounds shapes to canonical X/Z min/max coordinates.
 * `minY`/`maxY` are accepted as the grid-space Z axis used by room builders.
 * Returns null for incomplete or non-finite bounds.
 *
 * @param {Object} bounds
 * @returns {{minX: number, maxX: number, minZ: number, maxZ: number}|null}
 */
export function normalizeContainmentBounds(bounds) {
    if (!bounds) return null;

    const rawMinX = bounds.minX ?? bounds.left ?? bounds.x;
    const rawMaxX = bounds.maxX
        ?? bounds.right
        ?? (bounds.x != null && bounds.width != null ? Number(bounds.x) + Number(bounds.width) : undefined);
    const rawMinZ = bounds.minZ ?? bounds.minY ?? bounds.top ?? bounds.z ?? bounds.y;
    const rawMaxZ = bounds.maxZ
        ?? bounds.maxY
        ?? bounds.bottom
        ?? (bounds.z != null && (bounds.depth != null || bounds.height != null)
            ? Number(bounds.z) + Number(bounds.depth ?? bounds.height)
            : (bounds.y != null && bounds.height != null
                ? Number(bounds.y) + Number(bounds.height)
                : undefined));

    const values = [rawMinX, rawMaxX, rawMinZ, rawMaxZ].map(Number);
    if (!values.every(Number.isFinite)) return null;
    const [x1, x2, z1, z2] = values;
    return {
        minX: Math.min(x1, x2),
        maxX: Math.max(x1, x2),
        minZ: Math.min(z1, z2),
        maxZ: Math.max(z1, z2)
    };
}

/**
 * Translate local bounds into world space without mutating the source object.
 */
export function translateContainmentBounds(bounds, offset = {}) {
    const normalized = normalizeContainmentBounds(bounds);
    if (!normalized) return null;
    const offsetX = Number(offset.x ?? 0);
    const offsetZ = Number(offset.z ?? offset.y ?? 0);
    if (!Number.isFinite(offsetX) || !Number.isFinite(offsetZ)) return null;
    return {
        minX: normalized.minX + offsetX,
        maxX: normalized.maxX + offsetX,
        minZ: normalized.minZ + offsetZ,
        maxZ: normalized.maxZ + offsetZ
    };
}

/**
 * Translate a local room/zone descriptor, including nested safe/quiet zones,
 * into world space. Unknown metadata is preserved.
 */
export function translateContainmentZone(zone, offset = {}) {
    if (!zone || typeof zone !== 'object') return null;
    const translatedBounds = translateContainmentBounds(zone.bounds ?? zone, offset);
    if (!translatedBounds) return null;

    const translated = { ...zone, bounds: translatedBounds };
    if (Array.isArray(zone.safeZones)) {
        translated.safeZones = zone.safeZones
            .map((entry) => translateContainmentZone(entry, offset))
            .filter(Boolean);
    }
    if (Array.isArray(zone.quietZones)) {
        translated.quietZones = zone.quietZones
            .map((entry) => translateContainmentZone(entry, offset))
            .filter(Boolean);
    }
    return translated;
}

/**
 * Translate a local door descriptor (bounds, cells, and/or center) into world
 * space without mutating it.
 */
export function translateContainmentDoor(door, offset = {}) {
    if (!door || typeof door !== 'object') return null;
    const offsetX = Number(offset.x ?? 0);
    const offsetZ = Number(offset.z ?? offset.y ?? 0);
    if (!Number.isFinite(offsetX) || !Number.isFinite(offsetZ)) return null;

    const translated = { ...door };
    if (door.bounds) {
        translated.bounds = translateContainmentBounds(door.bounds, { x: offsetX, z: offsetZ });
        if (!translated.bounds) return null;
    }
    if (Array.isArray(door.cells)) {
        translated.cells = door.cells.map((cell) => {
            if (Array.isArray(cell)) {
                return [Number(cell[0]) + offsetX, Number(cell[1]) + offsetZ, ...cell.slice(2)];
            }
            if (!cell || typeof cell !== 'object') return cell;
            const next = { ...cell, x: Number(cell.x ?? 0) + offsetX };
            if (cell.z != null) next.z = Number(cell.z) + offsetZ;
            else if (cell.y != null) next.y = Number(cell.y) + offsetZ;
            return next;
        });
    }
    if (door.x != null) translated.x = Number(door.x) + offsetX;
    if (door.z != null) translated.z = Number(door.z) + offsetZ;
    else if (door.y != null) translated.y = Number(door.y) + offsetZ;
    return translated;
}

/**
 * Helper to test if (x, z) is inside any supported containment bounds shape.
 */
export function isPointInBounds(x, z, bounds) {
    const normalized = normalizeContainmentBounds(bounds);
    if (!normalized || !Number.isFinite(Number(x)) || !Number.isFinite(Number(z))) return false;
    return Number(x) >= normalized.minX && Number(x) <= normalized.maxX
        && Number(z) >= normalized.minZ && Number(z) <= normalized.maxZ;
}

/**
 * True when a hostile attack segment crosses a closed containment door or
 * enters an explicitly combat-safe zone from outside. This radius-free form is
 * suitable for projectile movement as well as hitscan attacks.
 */
export function shouldBlockAttackPath(origin, target, { containmentZones = [], doors = [] } = {}) {
    if (!origin || !target) return false;

    const targetInSafe = isCellInSafeZone(target.x, target.z ?? target.y, containmentZones);
    const originInSafe = isCellInSafeZone(origin.x, origin.z ?? origin.y, containmentZones);
    if (targetInSafe && !originInSafe) return true;

    if (Array.isArray(doors)) {
        for (const door of doors) {
            if (isDoorClosed(door) && doesSegmentIntersectDoor(origin, target, door)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Determines whether an Area of Effect (AoE) attack should be clamped/blocked between origin and target.
 * Prevents boss AoEs (like Cryosnail shockwaves) from penetrating closed bunker doors or entering safe havens.
 * @param {{x: number, z: number}} origin - Attack origin
 * @param {{x: number, z: number}} target - Defender / target position
 * @param {number} radius - AoE radius
 * @param {Object} options - Containment options
 * @param {Array<Object>} [options.containmentZones=[]] - Safe/containment zones
 * @param {Array<Object>} [options.doors=[]] - Active doors with closed state
 * @returns {boolean} True if AoE should be clamped/blocked (damage prevented)
 */
export function shouldClampAreaOfEffect(origin, target, radius, { containmentZones = [], doors = [] } = {}) {
    if (!origin || !target) return false;
    const distance = Math.hypot(target.x - origin.x, (target.z ?? target.y) - (origin.z ?? origin.y));
    if (distance > radius) return true; // Natural out of range
    return shouldBlockAttackPath(origin, target, { containmentZones, doors });
}

/**
 * Determines if a hostile enemy can acquire or maintain aggro on a player target.
 * @param {{x: number, z: number}} enemyPos - Enemy position
 * @param {{x: number, z: number}} playerPos - Player position
 * @param {Object} options - Containment options
 * @returns {boolean} True if aggro is permitted
 */
export function canHostileAggroTarget(enemyPos, playerPos, { containmentZones = [], doors = [] } = {}) {
    if (!enemyPos || !playerPos) return false;

    // Player in safe haven cannot be aggroed by enemies outside the safe haven
    const playerInSafe = isCellInSafeZone(playerPos.x, playerPos.z, containmentZones);
    const enemyInSafe = isCellInSafeZone(enemyPos.x, enemyPos.z, containmentZones);
    if (playerInSafe && !enemyInSafe) {
        return false;
    }

    // Line of sight obstructed by closed containment doors
    if (Array.isArray(doors) && doors.length > 0) {
        for (const door of doors) {
            if (isDoorClosed(door)) {
                if (doesSegmentIntersectDoor(enemyPos, playerPos, door)) {
                    return false;
                }
            }
        }
    }

    return true;
}

/**
 * Checks if a 2D line segment (p1 -> p2) intersects with a door rectangle or door cells.
 */
export function doesSegmentIntersectDoor(p1, p2, door) {
    if (!door) return false;
    // Door defined as bounding box
    if (door.bounds) {
        return segmentIntersectsBox(p1, p2, door.bounds);
    }
    // Door defined as collection of cells
    if (Array.isArray(door.cells)) {
        for (const cell of door.cells) {
            const cellBounds = {
                minX: (cell.x ?? cell[0]) - 0.5,
                maxX: (cell.x ?? cell[0]) + 0.5,
                minZ: (cell.z ?? cell.y ?? cell[1]) - 0.5,
                maxZ: (cell.z ?? cell.y ?? cell[1]) + 0.5
            };
            if (segmentIntersectsBox(p1, p2, cellBounds)) return true;
        }
    }
    // Door defined with center x, z and width/depth
    if (door.x != null && (door.z != null || door.y != null)) {
        const dz = door.z ?? door.y;
        const width = door.width ?? 1.5;
        const height = door.height ?? door.depth ?? 1.5;
        const box = {
            minX: door.x - width / 2,
            maxX: door.x + width / 2,
            minZ: dz - height / 2,
            maxZ: dz + height / 2
        };
        return segmentIntersectsBox(p1, p2, box);
    }
    return false;
}

/** True when runtime door state represents a collision/line-of-effect blocker. */
export function isDoorClosed(door) {
    if (!door) return false;
    return door.open === false
        || door.locked === true
        || door.state === 'closed'
        || door.state === 'locked';
}

/**
 * Cohen-Sutherland / standard line segment vs AABB intersection test
 */
export function segmentIntersectsBox(p1, p2, box) {
    const normalized = normalizeContainmentBounds(box);
    if (!normalized || !p1 || !p2) return false;
    const { minX, maxX, minZ, maxZ } = normalized;

    // Fast reject if both points are completely on one side
    if ((p1.x < minX && p2.x < minX) || (p1.x > maxX && p2.x > maxX)) return false;
    const z1 = p1.z ?? p1.y ?? 0;
    const z2 = p2.z ?? p2.y ?? 0;
    if ((z1 < minZ && z2 < minZ) || (z1 > maxZ && z2 > maxZ)) return false;

    // Check if either point is inside the box
    if (p1.x >= minX && p1.x <= maxX && z1 >= minZ && z1 <= maxZ) return true;
    if (p2.x >= minX && p2.x <= maxX && z2 >= minZ && z2 <= maxZ) return true;

    // Ray-box intersection clipping
    let tmin = 0;
    let tmax = 1;
    const dx = p2.x - p1.x;
    const dz = z2 - z1;

    if (Math.abs(dx) > 1e-7) {
        const tx1 = (minX - p1.x) / dx;
        const tx2 = (maxX - p1.x) / dx;
        tmin = Math.max(tmin, Math.min(tx1, tx2));
        tmax = Math.min(tmax, Math.max(tx1, tx2));
    }
    if (Math.abs(dz) > 1e-7) {
        const tz1 = (minZ - z1) / dz;
        const tz2 = (maxZ - z1) / dz;
        tmin = Math.max(tmin, Math.min(tz1, tz2));
        tmax = Math.min(tmax, Math.max(tz1, tz2));
    }

    return tmax >= tmin;
}
