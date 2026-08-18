/**
 * Reserved world-space zones for debug/QA scenes (docs/debug-gallery-and-architectural-grid-
 * expansion-plan.md §7a item 2). Every debug scene that spawns geometry outside the normal
 * procedural world MUST register its footprint here before picking coordinates — this session
 * already hit two real collisions from hand-picked coordinates (Wing 2 vs `debugShowroom.js`,
 * Wing 1 vs `debugMuseum.js`) before this registry existed.
 */

const zones = new Map();

/**
 * Registers a rectangular debug zone. Throws if it overlaps an already-registered zone (dev-time
 * guard, not meant to be caught — a collision here is a real bug in zone placement).
 */
export function registerDebugZone(name, { originX, originZ, width, depth }) {
    if (!name || !Number.isFinite(originX) || !Number.isFinite(originZ) || !Number.isFinite(width) || !Number.isFinite(depth)) {
        throw new Error(`registerDebugZone: invalid zone descriptor for "${name}"`);
    }
    const next = { name, originX, originZ, width, depth };
    for (const existing of zones.values()) {
        if (existing.name === name) continue; // re-registering the same zone (e.g. hot reload) is fine
        if (zonesOverlap(existing, next)) {
            throw new Error(
                `registerDebugZone: "${name}" (${originX},${originZ} ${width}x${depth}) overlaps `
                + `already-registered zone "${existing.name}" (${existing.originX},${existing.originZ} `
                + `${existing.width}x${existing.depth})`
            );
        }
    }
    zones.set(name, next);
    return next;
}

function zonesOverlap(a, b) {
    const aMinX = a.originX - a.width / 2;
    const aMaxX = a.originX + a.width / 2;
    const aMinZ = a.originZ - a.depth / 2;
    const aMaxZ = a.originZ + a.depth / 2;
    const bMinX = b.originX - b.width / 2;
    const bMaxX = b.originX + b.width / 2;
    const bMinZ = b.originZ - b.depth / 2;
    const bMaxZ = b.originZ + b.depth / 2;
    return aMinX < bMaxX && aMaxX > bMinX && aMinZ < bMaxZ && aMaxZ > bMinZ;
}

export function getDebugZone(name) {
    return zones.get(name) ?? null;
}

export function listDebugZones() {
    return [...zones.values()];
}

// Pre-register the zones already shipped this session, at their REAL coordinates (verified
// against the actual source files, not the plan doc's hand-picked numbers) so new zones can't
// silently collide with them.
registerDebugZone('debugShowroom', { originX: 9500 + 160, originZ: 9500 + 160, width: 320, depth: 320 }); // SHOWROOM_CHUNK 500,500 * chunkSize 19 = 9500; floor centered at origin + floorSize(320)*0.5
registerDebugZone('debugMuseum', { originX: 9000 + 130, originZ: 9000, width: 300, depth: 20 }); // MUSEUM_ORIGIN (9000,9000), corridorLength 280 extending +X

// New zones from docs/debug-gallery-and-architectural-grid-expansion-plan.md — placed to NOT
// collide with the zones above or each other. Wing 1 (the asset colonnade) deliberately
// supersedes `debugMuseum` in place (§7a item 3) rather than getting its own zone entry —
// building it means evolving debugMuseum.js at its existing registered footprint, not adding
// a second overlapping registration for the same ground.
registerDebugZone('wing5-progression', { originX: 0, originZ: 0, width: 0, depth: 0 }); // DOM gallery, no 3D footprint
registerDebugZone('wing2-roomgrid', { originX: 11000, originZ: 9500, width: 900, depth: 500 }); // moved off the original (9500,9500) collision
registerDebugZone('wing3-bossarenas', { originX: 13000, originZ: 9500, width: 900, depth: 500 }); // 5 boss arenas with phase switches
registerDebugZone('wing4-campsimulator', { originX: 15000, originZ: 9500, width: 900, depth: 500 }); // 4 camp state testbeds
registerDebugZone('qa-nexus', { originX: 8700, originZ: 9000, width: 40, depth: 40 }); // small kiosk, west of the colonnade entrance

export const RESERVED_ZONE_NAMES = Object.freeze([...zones.keys()]);
