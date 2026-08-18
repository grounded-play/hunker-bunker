import { CHUNK_SIZE } from './tileCatalog.js';
import { collapseChunkLattice, extractChunkWfcMetadata } from './wfcGenerator.js';
import { generateArchitecturalMazeChunk } from './architecturalMaze.js';
import { ROOM_BUILD_CATALOG, selectRoomBuild, rotateRoomBuild, stampRoomBuild, buildRoomInstanceFromBuild } from './roomBuilds.js';
import { HALLWAY_BUILD_CATALOG, selectHallwayArchetype, realizeHallwayConnector } from './hallwayConnector.js';

// Sprint 23 Phase 0A / Lane B.
//
// `ThreeGame.buildChunk()`'s MAZE-landform path currently runs two
// independent full generation passes and keeps only fragments of each:
// `collapseChunkLattice` builds a spanning-tree-selected 3x3 tile lattice
// and `extractChunkWfcMetadata` derives `rooms`/`anchors`/`roomInstances`
// from it, but that lattice is never stamped into pixels here (`stampLattice`
// is only ever called by the unrelated `generatePocket()`). Instead
// `generateArchitecturalMazeChunk` independently carves its own grid, which
// unconditionally replaces `grid`, and its own single room replaces
// `roomInstances`. Confirmed by reading every consumer of
// `wfcMetadataCache` in `threeGame.js`: all of them read `.roomInstances`
// only — nothing downstream ever reads the raw WFC `.rooms`/`.anchors`
// fields, so carrying them past this seam has been pure waste, not a used
// contract. `addWfcDebugOverlay`'s `metadata.lattice` box-per-tile overlay
// is the one consumer of the discarded lattice, and it is a debug-only
// visualization gated behind `show-debug` — it will read as "wrong" against
// the architectural grid it overlays, but is not a gameplay defect.
//
// This module is the single "final structural producer" the Sprint 23 plan
// (`ChunkStructureResult`) asks for. Its first revision is deliberately
// behavior-preserving for MAZE chunks: it produces exactly one grid and one
// room list derived from that same grid (today, the architectural pass),
// instead of running a WFC pass whose grid is thrown away. Swapping
// `ThreeGame.buildChunk()`'s MAZE branch to call this instead of its inline
// three-call sequence is Lane C's integration step (Phase 0A item 4, at
// G2) — this module owns the pure logic, not the call site.
export const CHUNK_STRUCTURE_VERSION = 1;

export const STRUCTURE_GENERATOR = Object.freeze({
    ARCHITECTURAL_ROOM: 'architectural-room',
    ARCHITECTURAL_CONNECTOR: 'architectural-connector',
    AUTHORED_ROOM: 'authored-room',
    HALLWAY_CONNECTOR: 'hallway-connector'
});

function buildArchitecturalRoomInstance(architecturalRoom, chunkKey) {
    const doors = (architecturalRoom.doors ?? []).map((door, index) => ({
        id: `${chunkKey}:architectural-door:${index}:${door.side}`,
        side: door.side,
        cells: door.cells.map((cell) => ({ ...cell })),
        // No sibling room shares this chunk today (one architectural gesture
        // per chunk, by design — see architecturalMaze.js's module comment),
        // so there is no internal neighbor lattice index to record. This is
        // intentionally preserved from current behavior, not a bug this
        // module introduces; the ring-crossing work in Phase 5 is what gives
        // these doors a real crossing contract where one is needed.
        neighborIndex: null
    }));
    return {
        id: `architectural-room:${chunkKey}`,
        chunkKey,
        role: 'generic',
        theme: null,
        sizeClass: null,
        footprint: architecturalRoom.interior.map((cell) => ({ ...cell })),
        interior: architecturalRoom.interior.map((cell) => ({ ...cell })),
        bounds: { ...architecturalRoom.bounds },
        wallCells: [],
        doors,
        navigation: { doorLanes: doors.flatMap((door) => door.cells), primaryRoute: [], reserved: [] },
        populationBudget: { signature: 1, large: 1, small: 3, pickup: 1, enemy: 0 },
        gate: null,
        placements: [],
        encounter: null
    };
}

/**
 * @typedef {object} ChunkStructureResult
 * @property {number} version
 * @property {string} chunkKey - `${chunkX},${chunkY}`
 * @property {string} generatorId - which producer supplied the final grid
 * @property {string[][]} grid - exactly one final grid; nothing downstream
 *   should ever see a discarded intermediate grid
 * @property {object[]} rooms - room instances derived from `grid`, in the
 *   same shape `roomGeometry.js`'s `buildRoomInstances` and
 *   `threeGame.js`'s `wfcMetadataCache` consumers already expect
 *   (`roomInstances`) so Lane C's swap-over is a drop-in replacement
 * @property {object[]} anchors - authored/final interaction anchors (empty
 *   until Phase 3's room-build catalog exports real ones; deliberately not
 *   the discarded WFC tile anchors, which described tiles that were never
 *   stamped)
 * @property {object[]} zones - encounter/reward/hazard/quiet/containment
 *   zones (empty until Phase 3; owned here, consumed by Lane C's
 *   `roomEncounters.js`/`roomContainment.js`)
 * @property {object} sockets - the four edge openings this chunk was given,
 *   echoed back so callers can verify reciprocity with neighbor chunks
 * @property {object[]} wayfindingMarkers - passive route signifiers (empty
 *   until Phase 4's hallway connector work)
 * @property {object} diagnostics - selected producer and discarded-generation
 *   accounting, per the plan's "diagnostics expose selected producer and
 *   discarded-generation count" contract requirement
 */

/**
 * The single final structural producer for a MAZE-landform chunk.
 *
 * @param {() => number} random - seeded RNG, same contract as the rest of
 *   the generation pipeline
 * @param {object} options
 * @returns {ChunkStructureResult}
 */
export function buildMazeChunkStructure(random, {
    chunkX = 0,
    chunkY = 0,
    chunkSize = CHUNK_SIZE,
    openings = {},
    roomMode = false,
    important = false,
    tutorialOnly = false,
    depthTier = 0,
    hallwayContinuation = 0.45,
    minimumHallwayRun = 2,
    loopChance = null,
    maxLoops = null
} = {}) {
    const chunkKey = `${chunkX},${chunkY}`;

    // Still run the WFC pass: its role/topology signal (room-vs-hallway
    // rhythm, loop injection, canyon-eligible hallway selection) is real
    // planning work, and Phase 3/4 need a place to read it from once
    // authored rooms/hallways replace `generateArchitecturalMazeChunk`.
    // Only its *grid* and *room list* are discarded here today, matching
    // exactly (not more, not less than) current live behavior.
    const lattice = collapseChunkLattice(random, {
        tutorialOnly,
        depthTier,
        hallwayContinuation,
        minimumHallwayRun,
        loopChance,
        maxLoops
    });
    const wfcMetadata = extractChunkWfcMetadata(lattice, chunkSize, { chunkX, chunkY });

    const architectural = generateArchitecturalMazeChunk(random, {
        size: chunkSize,
        openings,
        roomMode,
        important
    });

    const generatorId = architectural.room
        ? STRUCTURE_GENERATOR.ARCHITECTURAL_ROOM
        : STRUCTURE_GENERATOR.ARCHITECTURAL_CONNECTOR;
    const rooms = architectural.room
        ? [buildArchitecturalRoomInstance(architectural.room, chunkKey)]
        : [];

    return {
        version: CHUNK_STRUCTURE_VERSION,
        chunkKey,
        generatorId,
        grid: architectural.grid,
        rooms,
        anchors: [],
        zones: [],
        sockets: { ...openings },
        wayfindingMarkers: [],
        diagnostics: {
            discardedGeneration: 'wfc-lattice-tile-selection',
            discardedGenerationCount: 1,
            wfcSeamErrors: wfcMetadata.seamErrors,
            wfcRoleCounts: (lattice.roles ?? []).reduce((counts, role) => {
                if (role) counts[role] = (counts[role] ?? 0) + 1;
                return counts;
            }, {}),
            architecturalMode: architectural.room ? 'large-room' : 'long-connector',
            canyonCellCount: architectural.grid.flat().filter((cell) => cell === 'X').length
        }
    };
}

function zonesOf(room) {
    return [
        ...room.coverZones.map((zone) => ({ ...zone, kind: 'cover' })),
        ...room.encounterZones.map((zone) => ({ ...zone, kind: 'encounter' })),
        ...room.hazardZones.map((zone) => ({ ...zone, kind: 'hazard' })),
        ...room.quietZones.map((zone) => ({ ...zone, kind: 'quiet' }))
    ];
}

function anchorsOf(room) {
    return [
        ...room.structuralAnchors.map((a) => ({ ...a, kind: 'structural' })),
        ...room.interactionAnchors.map((a) => ({ ...a, kind: 'interaction' })),
        ...room.rewardAnchors.map((a) => ({ ...a, kind: 'reward' })),
        ...room.loreAnchors.map((a) => ({ ...a, kind: 'lore' }))
    ];
}

/**
 * The authored-room structural producer (Phase 3). Unlike
 * `buildMazeChunkStructure`, this path runs no discarded WFC pass at all —
 * the authored build's own pattern IS the final grid, so
 * `diagnostics.discardedGenerationCount` is always 0 here. Returns `null`
 * when no catalog build matches the request (e.g. a family/tier/biome
 * combination the vertical-slice catalog doesn't cover yet), so callers can
 * fall back to `buildMazeChunkStructure` for chunks that aren't reserved
 * authored destinations.
 *
 * @returns {ChunkStructureResult | null}
 */
export function buildAuthoredRoomChunkStructure(random, {
    chunkX = 0,
    chunkY = 0,
    chunkSize = CHUNK_SIZE,
    openings = {},
    family,
    tier = null,
    biome = null,
    roles = null,
    rotationSteps = 0,
    roll = 0
} = {}) {
    const catalogBuild = selectRoomBuild(ROOM_BUILD_CATALOG, { family, tier, biome, roles, roll });
    if (!catalogBuild) return null;
    const build = rotateRoomBuild(catalogBuild, rotationSteps);
    const stamped = stampRoomBuild(build, random, { size: chunkSize, openings });
    const chunkKey = `${chunkX},${chunkY}`;
    const room = buildRoomInstanceFromBuild(build, stamped, { chunkX, chunkY, ring: tier, tier });

    return {
        version: CHUNK_STRUCTURE_VERSION,
        chunkKey,
        generatorId: STRUCTURE_GENERATOR.AUTHORED_ROOM,
        grid: stamped.grid,
        rooms: [room],
        anchors: anchorsOf(room),
        zones: zonesOf(room),
        sockets: { ...openings },
        wayfindingMarkers: [],
        diagnostics: {
            discardedGeneration: 'none',
            discardedGenerationCount: 0,
            buildId: build.id,
            family: build.family,
            rotationSteps: build.rotation ?? 0,
            skippedSockets: stamped.skippedSides
        }
    };
}

/**
 * Bridges a Lane A `WorldPlan` reservation (`src/ringManifest.js`'s
 * `buildWorldPlan(...).reservations[]`) directly to the authored-room
 * producer. Deliberately duck-typed against the reservation's documented
 * shape (`roomFamily`, `ring`, `chunkX`, `chunkY`) rather than importing
 * `ringManifest.js`/`mazeExpedition.js` — this file stays a pure consumer
 * of plain data so Lane A's module boundary isn't hard-wired into Lane B's
 * production code; `chunkStructure.reservationBridge.test.js` proves the
 * shapes actually line up against Lane A's real output.
 *
 * A reservation's `roomFamily` covers far more families (`entry`, `camp`,
 * `hive`, `engineering`, `security`, `lore`, `rescue`, `arena`, `queen`,
 * `connector`, `salvage`, `mission`, ...) than this sprint's 8-build
 * vertical-slice catalog does — returning `null` for those is correct, not
 * a bug: it tells the caller to keep using `buildMazeChunkStructure` for
 * that chunk until a later wave of the catalog covers it.
 *
 * @returns {ChunkStructureResult | null}
 */
export function resolveChunkStructureForReservation(random, reservation, options = {}) {
    if (!reservation?.roomFamily || !Number.isInteger(reservation?.chunkX) || !Number.isInteger(reservation?.chunkY)) {
        return null;
    }
    return buildAuthoredRoomChunkStructure(random, {
        chunkX: reservation.chunkX,
        chunkY: reservation.chunkY,
        family: reservation.roomFamily,
        tier: Number.isInteger(reservation.ring) ? reservation.ring : null,
        ...options
    });
}

/**
 * The archetype-driven hallway structural producer (Phase 4). Also runs no
 * discarded generation pass. Returns `null` when no archetype matches the
 * requested source/destination family, same fallback contract as
 * `buildAuthoredRoomChunkStructure`.
 *
 * @returns {ChunkStructureResult | null}
 */
export function buildHallwayConnectorChunkStructure(random, {
    chunkX = 0,
    chunkY = 0,
    chunkSize = CHUNK_SIZE,
    openings = {},
    fromFamily = null,
    toFamily = null,
    recentArchetypeIds = [],
    roll = 0
} = {}) {
    const archetype = selectHallwayArchetype(HALLWAY_BUILD_CATALOG, { fromFamily, toFamily, recentArchetypeIds, roll });
    if (!archetype) return null;
    const realized = realizeHallwayConnector(archetype, random, { size: chunkSize, openings });
    const chunkKey = `${chunkX},${chunkY}`;

    return {
        version: CHUNK_STRUCTURE_VERSION,
        chunkKey,
        generatorId: STRUCTURE_GENERATOR.HALLWAY_CONNECTOR,
        grid: realized.grid,
        rooms: [],
        anchors: [],
        zones: [],
        sockets: { ...openings },
        wayfindingMarkers: realized.wayfindingMarkers,
        diagnostics: {
            discardedGeneration: 'none',
            discardedGenerationCount: 0,
            archetypeId: archetype.id,
            width: realized.width,
            ...realized.diagnostics
        }
    };
}
