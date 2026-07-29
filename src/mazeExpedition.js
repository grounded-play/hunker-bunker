// Seeded macro plan for the radial labyrinth. Story identities and allowed
// rings are fixed; angles, room clusters, spiral ingress points, blockers,
// and route lengths are generated per run.

export const RADIAL_RING_RADII = Object.freeze([0, 42, 78, 118, 160, 205]);
export const RADIAL_SITE_RULES = Object.freeze({
    camp_meridian: Object.freeze({ kind: 'camp', ring: 1 }),
    camp_tallow: Object.freeze({ kind: 'camp', ring: 2 }),
    camp_vesper: Object.freeze({ kind: 'camp', ring: 3 }),
    hive_suture: Object.freeze({ kind: 'hive_threshold', ring: 2 }),
    hive_relay: Object.freeze({ kind: 'hive_threshold', ring: 3 }),
    hive_carapace: Object.freeze({ kind: 'hive_threshold', ring: 4 }),
    queen_chamber: Object.freeze({ kind: 'mother_hive', ring: 5 })
});

export const RING_BLOCKER_FEATURES = Object.freeze([
    Object.freeze({ type: 'collapsed_bridge', mission: 'restore_canyon_crossing' }),
    Object.freeze({ type: 'blast_bulkhead', mission: 'restore_ring_power' }),
    Object.freeze({ type: 'hive_membrane', mission: 'clear_infested_threshold' }),
    Object.freeze({ type: 'flooded_service_tunnel', mission: 'restart_drainage_pumps' })
]);

// Phase 6.2 live enforcement: no literal canyon/gate geometry exists in the
// WFC-generated world yet (that's a separate, larger asset/solver task —
// see docs/master-implementation-plan-lane-split-2026-07-28.md). This is a
// soft radial boundary using position math instead, gated by the same four
// base goals (src/threeGame.js MILESTONE_BOSS_FOR_GOAL/BUILD_SITES) that
// already drive ACTIVE->CRYO->BIO sector progression — real, already-live
// signals, not new invented state. Ring 1 is always reachable (matches
// generateRadialMazeExpedition's edges: the ring-1 spiral edge is the only
// one with no blockerId).
export const RING_UNLOCK_GOAL_ORDER = Object.freeze(['o2Bubble', 'hullExpansion', 'radarNode', 'reactorCompressor']);

export function getMaxUnlockedRing(unlockedGoalKeys = new Set()) {
    let ring = 1;
    for (const goalKey of RING_UNLOCK_GOAL_ORDER) {
        if (!unlockedGoalKeys.has(goalKey)) break;
        ring += 1;
    }
    return Math.min(5, ring);
}

// Deliberately generous: the boundary sits a full ring-gap-width past the
// max unlocked ring (not right at its own radius), so it never crowds the
// existing camp/hive placement tolerance band (isSiteOnPlannedRing allows
// +/-22 units) or feels like it's trapping the player next to their own
// camp. This is a soft, tunable stand-in for real barrier geometry, not a
// claim that the final radius is playtested/correct.
export function getLockedRingBoundaryRadius(maxUnlockedRing, radialRingRadii = RADIAL_RING_RADII) {
    const ring = Math.max(0, Math.min(radialRingRadii.length - 1, Math.floor(maxUnlockedRing)));
    if (ring >= radialRingRadii.length - 1) return Infinity;
    const gap = radialRingRadii[ring + 1] - radialRingRadii[ring];
    return radialRingRadii[ring] + gap * 1.5;
}

export function clampPositionToUnlockedRing(x, z, anchor, maxUnlockedRing, radialRingRadii = RADIAL_RING_RADII) {
    const anchorX = anchor?.x ?? 0;
    const anchorZ = anchor?.z ?? 0;
    const dx = (Number(x) || 0) - anchorX;
    const dz = (Number(z) || 0) - anchorZ;
    const distance = Math.hypot(dx, dz);
    const boundary = getLockedRingBoundaryRadius(maxUnlockedRing, radialRingRadii);
    if (distance <= boundary || distance === 0) return { x, z, blocked: false };
    const scale = boundary / distance;
    return { x: anchorX + dx * scale, z: anchorZ + dz * scale, blocked: true };
}

// Phase 6.2 visible barrier tell: docs/phase6-wfc-ring-barrier-integration-plan.md.
// Deliberately does NOT touch the WFC lattice/tile solver -- only decides
// which existing landform enum a chunk gets. Positioned at the *nominal*
// ring radii (RADIAL_RING_RADII[1..4]), not clampPositionToUnlockedRing's
// deliberately wider soft-clamp boundary, which serves a different purpose
// (never crowding the camp-placement tolerance band) and would put the
// visible barrier in the wrong place if reused here.
//
// Default band width: live-measured against a real per-run anchor
// (docs/master-implementation-plan-lane-split-2026-07-28.md status log) --
// a full chunkSize band flagged ~44-51% of chunks within an 8-chunk radius
// of the ship as canyon, reading as "half the nearby world," not a
// boundary. Halved to chunkSize/2 (~24% in the same live sample) so it
// reads as a band, not the majority terrain. Still a default, not a
// claim of final playtested feel.
export function isChunkOnRingBarrier(chunkX, chunkY, chunkSize, anchor, bandWidth = chunkSize / 2, radialRingRadii = RADIAL_RING_RADII) {
    const anchorX = anchor?.x ?? 0;
    const anchorZ = anchor?.z ?? 0;
    const centerX = chunkX * chunkSize + chunkSize / 2;
    const centerZ = chunkY * chunkSize + chunkSize / 2;
    const distance = Math.hypot(centerX - anchorX, centerZ - anchorZ);
    return radialRingRadii.slice(1, 5).some((radius) => Math.abs(distance - radius) <= bandWidth / 2);
}

function seededRandom(seed) {
    let state = (Number(seed) >>> 0) || 1;
    return () => {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        return (state >>> 0) / 4294967296;
    };
}

function polarPoint(radius, angle) {
    return {
        x: Math.round(Math.cos(angle) * radius),
        z: Math.round(Math.sin(angle) * radius)
    };
}

export function generateRadialMazeExpedition(seed = 1) {
    const random = seededRandom(seed);
    const phase = random() * Math.PI * 2;
    const nodes = [{
        id: 'o2_ship',
        kind: 'o2_ship',
        ring: 0,
        angle: phase,
        x: 0,
        z: 0,
        required: true
    }];
    const occupiedAngles = new Map();

    for (const [id, rule] of Object.entries(RADIAL_SITE_RULES)) {
        const peers = occupiedAngles.get(rule.ring) ?? [];
        let angle = phase + rule.ring * 1.37 + (random() - 0.5) * 1.4;
        for (let attempt = 0; attempt < 12; attempt += 1) {
            const separated = peers.every((other) => {
                const delta = Math.abs(Math.atan2(Math.sin(angle - other), Math.cos(angle - other)));
                return delta >= 0.9;
            });
            if (separated) break;
            angle += 0.72 + random() * 0.42;
        }
        peers.push(angle);
        occupiedAngles.set(rule.ring, peers);
        const radius = RADIAL_RING_RADII[rule.ring] + Math.round((random() - 0.5) * 10);
        nodes.push({
            id,
            kind: rule.kind,
            ring: rule.ring,
            angle,
            radius,
            ...polarPoint(radius, angle),
            level: Math.min(2, Math.max(0, rule.ring - 1)),
            required: id !== 'hive_suture'
        });
    }

    const roomClusters = [];
    for (let ring = 1; ring <= 5; ring += 1) {
        const count = 8 + ring * 3;
        const radius = RADIAL_RING_RADII[ring];
        for (let index = 0; index < count; index += 1) {
            const spiralProgress = index / count;
            const angle = phase + ring * 1.37 + spiralProgress * Math.PI * 2
                + (random() - 0.5) * 0.32;
            const radialDrift = (spiralProgress - 0.5) * (12 + ring * 4);
            const clusterRadius = radius + radialDrift + (random() - 0.5) * 8;
            roomClusters.push({
                id: `ring-${ring}-room-${index}`,
                ring,
                angle,
                ...polarPoint(clusterRadius, angle),
                size: index === 0 || random() < 0.58 ? 'large' : 'standard',
                roomCount: 2 + Math.floor(random() * (2 + Math.min(3, ring))),
                role: index % 4 === 0 ? 'junction' : index % 3 === 0 ? 'mission' : 'room'
            });
        }
    }

    const blockers = [];
    for (let ring = 1; ring <= 4; ring += 1) {
        const feature = RING_BLOCKER_FEATURES[(ring - 1 + Math.floor(random() * 2)) % RING_BLOCKER_FEATURES.length];
        const angle = phase + ring * 1.37 + 0.35 + (random() - 0.5) * 0.38;
        const radius = (RADIAL_RING_RADII[ring] + RADIAL_RING_RADII[ring + 1]) / 2;
        blockers.push({
            id: `ring-${ring}-gate`,
            ring,
            blocksRing: ring + 1,
            angle,
            ...polarPoint(radius, angle),
            feature: feature.type,
            missionId: feature.mission,
            locked: true
        });
    }

    const edges = [];
    for (let ring = 1; ring <= 5; ring += 1) {
        edges.push({
            from: ring === 1 ? 'o2_ship' : `ring-${ring - 1}-spiral`,
            to: `ring-${ring}-spiral`,
            kind: 'spiral',
            ring,
            minSteps: 5 + ring * 3,
            blockerId: ring > 1 ? `ring-${ring - 1}-gate` : null
        });
        edges.push({
            from: `ring-${ring}-spiral`,
            to: `ring-${ring}-loop`,
            kind: 'ring',
            ring,
            minSteps: 8 + ring * 4
        });
    }

    return {
        seed: Number(seed) >>> 0,
        phase,
        radii: [...RADIAL_RING_RADII],
        nodes,
        roomClusters,
        blockers,
        edges
    };
}

function ringNodeIds(ring) {
    return ring === 0 ? ['o2_ship'] : [`ring-${ring}-spiral`, `ring-${ring}-loop`];
}

// Undirected graph over the plan's abstract ring/spiral/loop nodes. An edge
// gated by a blocker is only included once that blocker's id is present in
// unlockedBlockerIds — this is what lets us prove a locked ring is actually
// unreachable rather than merely "intended" to be gated.
export function buildRingCrossingGraph(plan, unlockedBlockerIds = new Set()) {
    const adjacency = new Map();
    const addEdge = (a, b) => {
        if (!adjacency.has(a)) adjacency.set(a, new Set());
        if (!adjacency.has(b)) adjacency.set(b, new Set());
        adjacency.get(a).add(b);
        adjacency.get(b).add(a);
    };
    for (const edge of plan?.edges ?? []) {
        if (edge.blockerId && !unlockedBlockerIds.has(edge.blockerId)) continue;
        addEdge(edge.from, edge.to);
    }
    return adjacency;
}

export function computeReachableRings(plan, unlockedBlockerIds = new Set()) {
    const graph = buildRingCrossingGraph(plan, unlockedBlockerIds);
    const seen = new Set(['o2_ship']);
    const queue = ['o2_ship'];
    while (queue.length > 0) {
        const current = queue.shift();
        for (const next of graph.get(current) ?? []) {
            if (seen.has(next)) continue;
            seen.add(next);
            queue.push(next);
        }
    }
    const reachableRings = new Set();
    for (let ring = 0; ring <= 5; ring += 1) {
        if (ringNodeIds(ring).some((id) => seen.has(id))) reachableRings.add(ring);
    }
    return reachableRings;
}

// Shortest weighted walk (edge weight = minSteps) from the ship to each
// ring, computed on the fully-unlocked graph. This validates the macro
// plan's *designed* distance ordering (Phase 6.4); it is not yet the
// physically-realized WFC corridor distance, which requires projecting
// these route reservations into generated chunks (Phase 6.1/6.3, not done).
export function computeRingWalkDistances(plan) {
    const blockerIds = new Set((plan?.blockers ?? []).map((blocker) => blocker.id));
    const graph = buildRingCrossingGraph(plan, blockerIds);
    const weights = new Map();
    for (const edge of plan?.edges ?? []) {
        const weight = Number.isFinite(edge.minSteps) ? edge.minSteps : 1;
        weights.set(`${edge.from}|${edge.to}`, weight);
        weights.set(`${edge.to}|${edge.from}`, weight);
    }
    const distances = new Map([['o2_ship', 0]]);
    const unvisited = new Set(graph.keys());
    unvisited.add('o2_ship');
    while (unvisited.size > 0) {
        let currentNode = null;
        let currentDist = Infinity;
        for (const node of unvisited) {
            const dist = distances.get(node) ?? Infinity;
            if (dist < currentDist) {
                currentDist = dist;
                currentNode = node;
            }
        }
        if (currentNode === null) break;
        unvisited.delete(currentNode);
        for (const next of graph.get(currentNode) ?? []) {
            const weight = weights.get(`${currentNode}|${next}`) ?? 1;
            const alt = currentDist + weight;
            if (alt < (distances.get(next) ?? Infinity)) distances.set(next, alt);
        }
    }
    const ringDistances = new Map();
    for (let ring = 0; ring <= 5; ring += 1) {
        const candidates = ringNodeIds(ring).map((id) => distances.get(id) ?? Infinity);
        ringDistances.set(ring, Math.min(...candidates));
    }
    return ringDistances;
}

// Proves the plan's ring blockers actually gate progression rather than
// merely existing alongside it: locked rings are unreachable, each blocker
// unlocks exactly its own ring (no early opens), everything is reachable
// once fully unlocked, and shortest walk distance increases ring-over-ring.
export function validateRingProgression(plan) {
    const errors = [];
    const blockers = plan?.blockers ?? [];

    const lockedReachable = computeReachableRings(plan, new Set());
    for (const blocker of blockers) {
        if (lockedReachable.has(blocker.blocksRing)) {
            errors.push(`ring ${blocker.blocksRing} reachable despite locked blocker ${blocker.id}`);
        }
    }

    const sortedBlockers = [...blockers].sort((a, b) => a.ring - b.ring);
    const unlocked = new Set();
    for (const blocker of sortedBlockers) {
        unlocked.add(blocker.id);
        const reachable = computeReachableRings(plan, unlocked);
        if (!reachable.has(blocker.blocksRing)) {
            errors.push(`unlocking ${blocker.id} did not open ring ${blocker.blocksRing}`);
        }
        for (const stillLocked of blockers.filter((candidate) => !unlocked.has(candidate.id))) {
            if (reachable.has(stillLocked.blocksRing)) {
                errors.push(`ring ${stillLocked.blocksRing} reachable before ${stillLocked.id} is unlocked`);
            }
        }
    }

    const allUnlocked = computeReachableRings(plan, new Set(blockers.map((blocker) => blocker.id)));
    for (let ring = 0; ring <= 5; ring += 1) {
        if (!allUnlocked.has(ring)) errors.push(`ring ${ring} is unreachable even with every blocker unlocked`);
    }

    const distances = computeRingWalkDistances(plan);
    for (let ring = 1; ring <= 5; ring += 1) {
        const previous = distances.get(ring - 1);
        const current = distances.get(ring);
        if (!(current > previous)) {
            errors.push(`ring ${ring} walk distance (${current}) does not exceed ring ${ring - 1} (${previous})`);
        }
    }

    return { valid: errors.length === 0, errors };
}

export function getRadialSite(plan, id) {
    return plan?.nodes?.find((node) => node.id === id) ?? null;
}

// Phase 6.1 foundation ("project route reservations into each affected
// chunk"): converts the plan's world-space sites into the same
// chunkX/chunkY grid threeGame.js already uses everywhere
// (Math.floor(worldCoord / chunkSize), chunkSize = 19). This is the data
// projection step only -- it does NOT yet feed into wfcGenerator.js/
// threeGame.js's actual chunk generation (that connection is the larger,
// still-open remainder of 6.1/6.3). Produces reservation data a future
// integration can consume without guessing the coordinate mapping.
export function worldToChunkCoords(x, z, chunkSize = 19) {
    return {
        chunkX: Math.floor((Number(x) || 0) / chunkSize),
        chunkY: Math.floor((Number(z) || 0) / chunkSize)
    };
}

export function projectPlanToChunkReservations(plan, chunkSize = 19) {
    const reservations = new Map();
    const reserve = (site, category) => {
        if (!Number.isFinite(site?.x) || !Number.isFinite(site?.z)) return;
        const { chunkX, chunkY } = worldToChunkCoords(site.x, site.z, chunkSize);
        const key = `${chunkX},${chunkY}`;
        if (!reservations.has(key)) reservations.set(key, { chunkX, chunkY, sites: [] });
        reservations.get(key).sites.push({ id: site.id, category, ring: site.ring ?? null });
    };
    for (const node of plan?.nodes ?? []) reserve(node, 'node');
    for (const cluster of plan?.roomClusters ?? []) reserve(cluster, 'roomCluster');
    for (const blocker of plan?.blockers ?? []) reserve(blocker, 'blocker');
    return reservations;
}

// A future WFC integration can only give one chunk one special purpose at a
// time (a chunk that's a mission blocker can't simultaneously be the camp
// site next to it). Catches macro-plan spacing that's too tight for the
// chunk grid before that integration is built, not after.
export function findConflictingChunkReservations(plan, chunkSize = 19) {
    const reservations = projectPlanToChunkReservations(plan, chunkSize);
    const conflicts = [];
    for (const { chunkX, chunkY, sites } of reservations.values()) {
        const requiredSites = sites.filter((site) => site.category === 'node' || site.category === 'blocker');
        if (requiredSites.length > 1) {
            conflicts.push({ chunkX, chunkY, siteIds: requiredSites.map((site) => site.id) });
        }
    }
    return conflicts;
}

export function validateRadialMazeExpedition(plan) {
    const errors = [];
    const nodes = plan?.nodes ?? [];
    const byId = new Map(nodes.map((node) => [node.id, node]));
    for (const [id, rule] of Object.entries(RADIAL_SITE_RULES)) {
        const node = byId.get(id);
        if (!node) errors.push(`missing radial site ${id}`);
        else if (node.ring !== rule.ring) errors.push(`${id} must be on ring ${rule.ring}`);
    }
    if ((plan?.blockers ?? []).length !== 4) errors.push('rings 2-5 require four mission blockers');
    for (let ring = 1; ring <= 5; ring += 1) {
        const clusters = (plan?.roomClusters ?? []).filter((cluster) => cluster.ring === ring);
        if (clusters.length < 8) errors.push(`ring ${ring} does not contain enough room clusters`);
        if (!clusters.some((cluster) => cluster.size === 'large')) {
            errors.push(`ring ${ring} requires at least one large room cluster`);
        }
    }
    for (const blocker of plan?.blockers ?? []) {
        if (!blocker.missionId || !blocker.feature) errors.push(`${blocker.id} is not mission-backed`);
    }
    return { valid: errors.length === 0, errors };
}

export const MAZE_ROOM_TILES = Object.freeze({
    o2_ship: Object.freeze({
        doors: Object.freeze(['n']),
        orientationLocked: true,
        preHall: 'north',
        elevationChange: 0,
        role: 'start'
    }),
    camp: Object.freeze({
        doors: Object.freeze(['s', 'n', 'e']),
        minDoors: 2,
        preHall: true,
        safetyBuffer: 4,
        elevationChange: 0,
        role: 'camp'
    }),
    hive_threshold: Object.freeze({
        doors: Object.freeze(['s', 'n']),
        minDoors: 1,
        preHall: true,
        unlockExitOnClear: true,
        elevationChange: 0,
        role: 'hive'
    }),
    vertical_room: Object.freeze({
        doors: Object.freeze(['s', 'n']),
        minDoors: 2,
        preHall: true,
        elevationChange: 1,
        role: 'vertical'
    }),
    queen_chamber: Object.freeze({
        doors: Object.freeze(['s']),
        orientationLocked: true,
        preHall: 'south',
        elevationChange: 0,
        role: 'queen'
    })
});

export const MAZE_EXPEDITION_NODES = Object.freeze([
    Object.freeze({ id: 'o2_ship', kind: 'o2_ship', depth: 0, lateral: 0, level: 0, required: true }),
    Object.freeze({ id: 'camp_meridian', kind: 'camp', depth: 38, lateral: -5, level: 0, required: true }),
    Object.freeze({ id: 'camp_tallow', kind: 'camp', depth: 72, lateral: 7, level: 1, required: true }),
    Object.freeze({ id: 'hive_suture', kind: 'hive_threshold', depth: 92, lateral: -18, level: 0, required: false }),
    Object.freeze({ id: 'camp_vesper', kind: 'camp', depth: 108, lateral: -4, level: 1, required: true }),
    Object.freeze({ id: 'hive_relay', kind: 'hive_threshold', depth: 128, lateral: 17, level: 2, required: true }),
    Object.freeze({ id: 'hive_carapace', kind: 'hive_threshold', depth: 146, lateral: -15, level: 1, required: true }),
    Object.freeze({ id: 'final_shelter', kind: 'shelter', depth: 182, lateral: 8, level: 2, required: true }),
    Object.freeze({ id: 'queen_chamber', kind: 'queen_chamber', depth: 224, lateral: -3, level: 2, required: true })
]);

// Critical edges form the guaranteed expedition spine. Branch and shortcut
// edges add loops without permitting an early bypass to the Queen.
export const MAZE_EXPEDITION_EDGES = Object.freeze([
    Object.freeze({ from: 'o2_ship', to: 'camp_meridian', kind: 'critical', minSteps: 7 }),
    Object.freeze({ from: 'camp_meridian', to: 'camp_tallow', kind: 'critical', minSteps: 8 }),
    Object.freeze({ from: 'camp_tallow', to: 'camp_vesper', kind: 'critical', minSteps: 8, vertical: true }),
    Object.freeze({ from: 'camp_tallow', to: 'hive_suture', kind: 'branch', minSteps: 4 }),
    Object.freeze({ from: 'hive_suture', to: 'camp_vesper', kind: 'shortcut', minSteps: 4, unlock: 'hive_suture_cleared' }),
    Object.freeze({ from: 'camp_vesper', to: 'hive_relay', kind: 'critical', minSteps: 6, vertical: true }),
    Object.freeze({ from: 'hive_relay', to: 'hive_carapace', kind: 'critical', minSteps: 6, vertical: true }),
    Object.freeze({ from: 'hive_carapace', to: 'final_shelter', kind: 'critical', minSteps: 8, vertical: true }),
    Object.freeze({ from: 'final_shelter', to: 'queen_chamber', kind: 'critical', minSteps: 8 }),
    Object.freeze({ from: 'hive_relay', to: 'camp_vesper', kind: 'shortcut', minSteps: 4, unlock: 'hive_relay_cleared' }),
    Object.freeze({ from: 'hive_carapace', to: 'camp_tallow', kind: 'shortcut', minSteps: 5, unlock: 'hive_carapace_cleared' })
]);

export const MAZE_GENERATION_RULES = Object.freeze({
    canyonOutsideWalkableTiles: true,
    sealUnusedSockets: true,
    rewardLongBranches: true,
    maxRepeatedTileShape: 2,
    loopEveryMinRooms: 6,
    loopEveryMaxRooms: 9,
    landmarkMinDepthGap: 16,
    campHiveSafetyDepth: 18,
    elevationLevels: 3
});

export function validateMazeExpedition(
    nodes = MAZE_EXPEDITION_NODES,
    edges = MAZE_EXPEDITION_EDGES
) {
    const errors = [];
    const byId = new Map(nodes.map((node) => [node.id, node]));
    if (byId.size !== nodes.length) errors.push('landmark ids must be unique');

    for (const edge of edges) {
        if (!byId.has(edge.from) || !byId.has(edge.to)) {
            errors.push(`edge ${edge.from}->${edge.to} references a missing landmark`);
        }
        if (!Number.isFinite(edge.minSteps) || edge.minSteps < 4) {
            errors.push(`edge ${edge.from}->${edge.to} is too short`);
        }
    }

    const required = nodes.filter((node) => node.required).sort((a, b) => a.depth - b.depth);
    for (let i = 1; i < required.length; i += 1) {
        if (required[i].depth - required[i - 1].depth < MAZE_GENERATION_RULES.landmarkMinDepthGap) {
            errors.push(`${required[i - 1].id} and ${required[i].id} are too close`);
        }
    }

    const criticalAdjacency = new Map(nodes.map((node) => [node.id, []]));
    for (const edge of edges.filter((candidate) => candidate.kind === 'critical')) {
        criticalAdjacency.get(edge.from)?.push(edge.to);
    }
    const visited = new Set(['o2_ship']);
    const queue = ['o2_ship'];
    while (queue.length) {
        const current = queue.shift();
        for (const next of criticalAdjacency.get(current) ?? []) {
            if (visited.has(next)) continue;
            visited.add(next);
            queue.push(next);
        }
    }
    for (const node of required) {
        if (!visited.has(node.id)) errors.push(`${node.id} is not on the guaranteed critical route`);
    }

    const queen = byId.get('queen_chamber');
    if (!queen || queen.depth !== Math.max(...nodes.map((node) => node.depth))) {
        errors.push('queen_chamber must be the deepest landmark');
    }
    return { valid: errors.length === 0, errors };
}

export function getMazeLandmark(id) {
    return MAZE_EXPEDITION_NODES.find((node) => node.id === id) ?? null;
}
