import { CHUNK_SIZE } from './tileCatalog.js';
import { carveDisk, carveLine, portalPoint, constrainBorderSockets, addWallShell } from './architecturalMaze.js';
import { HALLWAY_BUILD_CATALOG, HALLWAY_BUILD_VERSION } from './data/hallwayBuilds.js';

// Sprint 23 Phase 4 / Lane B — pure select/realize API over the hallway
// archetype data in src/data/hallwayBuilds.js.

export { HALLWAY_BUILD_CATALOG, HALLWAY_BUILD_VERSION };

/**
 * Appends an archetype id to a repetition-history list, trimmed to the
 * longest cooldown window any catalog entry declares — callers don't need
 * to know that number, they just keep feeding this back in.
 */
export function pushRecentArchetype(recentIds, archetypeId, catalog = HALLWAY_BUILD_CATALOG) {
    const maxCooldown = Math.max(1, ...catalog.map((a) => a.repetitionCooldown));
    return [...recentIds, archetypeId].slice(-maxCooldown);
}

function isFamilyCompatible(archetype, fromFamily, toFamily) {
    const fromOk = fromFamily == null || archetype.compatibleFamilies.from.includes(fromFamily);
    const toOk = toFamily == null || archetype.compatibleFamilies.to.includes(toFamily);
    return fromOk && toOk;
}

function isOnCooldown(archetype, recentIds) {
    if (archetype.repetitionCooldown <= 0) return false;
    return recentIds.slice(-archetype.repetitionCooldown).includes(archetype.id);
}

/**
 * Deterministically selects a hallway archetype for one semantic graph
 * edge. Filters by source/destination family compatibility, then by each
 * candidate's own repetition cooldown against the recent-archetype
 * history — falling back to the family-compatible set (ignoring cooldown)
 * only if every compatible archetype is currently on cooldown, so a seed
 * can never deadlock generation over presentation variety.
 */
export function selectHallwayArchetype(catalog, {
    fromFamily = null,
    toFamily = null,
    recentArchetypeIds = [],
    roll = 0
} = {}) {
    const compatible = catalog.filter((archetype) => isFamilyCompatible(archetype, fromFamily, toFamily));
    if (compatible.length === 0) return null;
    const offCooldown = compatible.filter((archetype) => !isOnCooldown(archetype, recentArchetypeIds));
    const candidates = offCooldown.length > 0 ? offCooldown : compatible;
    const index = Math.min(candidates.length - 1, Math.floor(roll * candidates.length));
    return candidates[index];
}

function widthFromRange([min, max], roll) {
    return min + Math.floor(roll * (max - min + 1));
}

/**
 * Carves one connector chunk realizing a hallway archetype between however
 * many chunk-edge portals are active, reusing architecturalMaze.js's
 * carve/border/wall-shell primitives (the same ones src/roomBuilds.js
 * reuses) so authored rooms, procedural rooms, and now archetype-driven
 * connectors all share one carving contract. Width and turn budget come
 * from the archetype rather than a flat random roll, and every carved
 * segment's midpoint is recorded as a passive wayfinding marker tagged
 * with the archetype's dressing/lighting so Lane C's rendering can lay
 * physical route signifiers along it without re-deriving the path.
 */
export function realizeHallwayConnector(archetype, random, { size = CHUNK_SIZE, openings = {} } = {}) {
    const grid = Array.from({ length: size }, () => Array(size).fill('X'));
    const center = Math.floor(size / 2);
    const portals = Object.entries(openings)
        .filter(([, opening]) => opening?.open)
        .map(([side, opening]) => portalPoint(size, side, opening.offset));

    const width = widthFromRange(archetype.widthRange, random());
    const turnBias = archetype.maxTurns >= 2 ? 0.5 : 0.15;
    const hub = {
        x: Math.max(5, Math.min(size - 6, center + Math.floor((random() - 0.5) * 8))),
        y: Math.max(5, Math.min(size - 6, center + Math.floor((random() - 0.5) * 8)))
    };
    carveDisk(grid, hub.x, hub.y, width);

    const wayfindingMarkers = [];
    const markerInterval = 6;
    const carveTrackedLine = (from, to) => {
        carveLine(grid, from, to, width);
        const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
        for (let step = markerInterval; step < steps; step += markerInterval) {
            const t = step / steps;
            wayfindingMarkers.push({
                x: Math.round(from.x + (to.x - from.x) * t),
                y: Math.round(from.y + (to.y - from.y) * t),
                dressingKit: archetype.dressingKit,
                lightingRhythm: archetype.lightingRhythm
            });
        }
    };

    for (const portal of portals) {
        const bend = random() < turnBias || archetype.maxTurns >= 2
            ? { x: hub.x, y: portal.y }
            : { x: portal.x, y: hub.y };
        carveTrackedLine(portal, bend);
        carveTrackedLine(bend, hub);
    }

    constrainBorderSockets(grid, openings);
    addWallShell(grid);

    return {
        grid,
        archetypeId: archetype.id,
        width,
        hub,
        wayfindingMarkers,
        // Passive wayfinding must never point through a locked door — this
        // realization only ever carves toward chunk-edge sockets that were
        // already declared active, so there is no path here a caller didn't
        // explicitly open. Recorded for the same diagnostics contract
        // chunkStructure.js's ChunkStructureResult already exposes.
        diagnostics: { portalCount: portals.length, sightlineBreakFrequency: archetype.sightlineBreakFrequency }
    };
}
