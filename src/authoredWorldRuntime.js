import { resolveChunkStructureForReservation } from './chunkStructure.js';
import { resolveSetpieceChunkStructure } from './setpieceBuilds.js';
import {
    RING_CROSSING_PLAN_VERSION,
    RING_CROSSING_STATES,
    getOpenRingCrossingIds,
    getRingCrossingTraversalUnlocks,
    reconcileRingCrossingState
} from './ringCrossings.js';

// Lane C's pure adapter between Lane A's complete WorldPlan envelope and the
// smaller plans/producers consumed at runtime. Keeping this translation here
// prevents ThreeGame from acquiring a second, implicit planning model.

export const AUTHORED_STRUCTURE_RESOLUTION = Object.freeze({
    ACCEPTED: 'accepted',
    FALLBACK: 'fallback'
});

export const AUTHORED_STRUCTURE_FALLBACK_REASONS = Object.freeze({
    INVALID_REQUEST: 'invalid-request',
    NO_ACTIVE_RESERVATION: 'no-active-reservation',
    UNSUPPORTED_RESERVATION: 'unsupported-reservation',
    SOCKET_MISMATCH: 'socket-mismatch',
    PRODUCER_ERROR: 'producer-error'
});

const CARDINAL_ROTATIONS = Object.freeze([0, 1, 2, 3]);

const SIDE_BY_DELTA = Object.freeze({
    '0,-1': 'n',
    '0,1': 's',
    '-1,0': 'w',
    '1,0': 'e'
});


const RESERVATION_ROLE_PRIORITY = Object.freeze({
    ringCrossing: 0,
    shipGoalObjective: 1,
    finale: 2,
    campTerritory: 3,
    hiveTerritory: 3,
    territoryRoom: 3,
    campObjective: 4,
    fallbackResourceRoute: 5,
    alternativeResourceRoute: 6,
    returnShortcut: 7,
    entry: 8
});

function stringSet(value) {
    if (value instanceof Set || Array.isArray(value)) {
        return new Set([...value].filter((entry) => typeof entry === 'string'));
    }
    return new Set();
}

function coordinatesToChunkKey(chunkX, chunkY) {
    if (typeof chunkX === 'string' && chunkY == null && /^-?\d+,-?\d+$/.test(chunkX)) return chunkX;
    if (!Number.isInteger(chunkX) || !Number.isInteger(chunkY)) return null;
    return `${chunkX},${chunkY}`;
}

/**
 * Extract the crossing sub-plan from a complete WorldPlan. The outer and
 * inner versions both happen to be 1 today, but reconciliation deliberately
 * consumes the inner versioned contract; keeping that distinction explicit
 * prevents a future WorldPlan version bump from masquerading as plan drift.
 */
export function normalizeWorldPlanRingCrossings(worldPlan) {
    const isWorldPlanEnvelope = Number.isInteger(worldPlan?.ringCrossingPlanVersion);
    const version = isWorldPlanEnvelope
        ? worldPlan.ringCrossingPlanVersion
        : Number.isInteger(worldPlan?.version)
            ? worldPlan.version
            : RING_CROSSING_PLAN_VERSION;
    const ringCrossings = Array.isArray(worldPlan?.ringCrossings)
        ? worldPlan.ringCrossings.map((crossing) => ({
            ...crossing,
            requirements: { ...(crossing?.requirements ?? {}) }
        }))
        : [];
    return {
        version,
        seed: Number(worldPlan?.seed) >>> 0,
        ringCrossings
    };
}

/**
 * Ring traversal follows consecutive physical crossings, not the count of
 * ship goals. A migrated/open later crossing cannot skip a closed earlier
 * boundary.
 */
export function deriveMaxUnlockedRing(plan, crossingState) {
    let maxUnlockedRing = 1;
    let expectedRing = 1;
    const crossings = [...(plan?.ringCrossings ?? [])]
        .sort((a, b) => (a?.ring ?? Infinity) - (b?.ring ?? Infinity) || String(a?.id).localeCompare(String(b?.id)));

    for (const crossing of crossings) {
        if (crossing?.ring !== expectedRing) break;
        if (crossingState?.crossings?.[crossing.id]?.status !== RING_CROSSING_STATES.OPEN) break;
        maxUnlockedRing = Math.max(
            maxUnlockedRing,
            Number.isInteger(crossing.blocksRing) ? crossing.blocksRing : crossing.ring + 1
        );
        expectedRing += 1;
    }
    return maxUnlockedRing;
}

/**
 * Defense-in-depth clamp for authored crossings. Unlike the legacy generous
 * placeholder, this boundary sits on the blocker band between the currently
 * reachable ring and the next ring, so a topology detour cannot grant early
 * access while physical crossing art is still behind the feature flag.
 */
// Chunks the carrier must cross to reach a locked gate even though they lie
// past its radial boundary. The lock is radial, but routes are not: when the
// route dips inward to reach a gate (both approach chunks farther from the
// ship than the gate itself) a purely radial boundary stopped the carrier
// short of the gate, so the ring could never be opened. Keep every chunk on
// the spine's approach whose entry border lies beyond the boundary; the
// gate's far side is never on it, so the lock still holds.
const lockedApproachCache = new WeakMap();

function segmentDistance(anchorX, anchorZ, ax, az, bx, bz) {
    const dx = bx - ax;
    const dz = bz - az;
    const lengthSq = dx * dx + dz * dz;
    const t = lengthSq ? Math.max(0, Math.min(1, ((anchorX - ax) * dx + (anchorZ - az) * dz) / lengthSq)) : 0;
    return Math.hypot(anchorX - (ax + t * dx), anchorZ - (az + t * dz));
}

// Nearest distance from the anchor to the border two orthogonal chunks share.
function sharedBorderDistance(a, b, anchorX, anchorZ, chunkSize) {
    const [ax, ay] = a.split(',').map(Number);
    const [bx, by] = b.split(',').map(Number);
    if (ax !== bx) {
        const x = Math.max(ax, bx) * chunkSize;
        return segmentDistance(anchorX, anchorZ, x, ay * chunkSize, x, (ay + 1) * chunkSize);
    }
    const zEdge = Math.max(ay, by) * chunkSize;
    return segmentDistance(anchorX, anchorZ, ax * chunkSize, zEdge, (ax + 1) * chunkSize, zEdge);
}

export function getLockedApproachChunks(worldPlan, ring, { anchor = { x: 0, z: 0 }, chunkSize = 49, boundary }) {
    const crossing = worldPlan?.ringCrossings?.find((entry) => entry.ring === ring);
    const topology = worldPlan?.topology;
    if (!crossing?.chunkKey || !topology?.routeEdges || !Number.isFinite(boundary)) return new Set();
    let perPlan = lockedApproachCache.get(worldPlan);
    if (!perPlan) lockedApproachCache.set(worldPlan, (perPlan = new Map()));
    const cacheKey = `${ring}|${anchor.x},${anchor.z}|${chunkSize}|${boundary}`;
    if (perPlan.has(cacheKey)) return perPlan.get(cacheKey);

    const neighbours = new Map();
    for (const edge of topology.routeEdges) {
        const [a, b] = edge.split('|');
        if (!neighbours.has(a)) neighbours.set(a, new Set());
        if (!neighbours.has(b)) neighbours.set(b, new Set());
        neighbours.get(a).add(b);
        neighbours.get(b).add(a);
    }
    // Walk the spine -- the canonical route out from the crash site --
    // backwards from the gate. Using the spine, not a shortest path, keeps
    // this on the near side: where ring loops run round a gate, a shortest
    // path could arrive from the far side and unlock it. Consecutive spine
    // points can be diagonal; the route joins them through one shared chunk.
    const spine = topology.spineChunkKeys ?? [];
    const approach = new Set();
    const gateIndex = spine.indexOf(crossing.chunkKey);
    if (gateIndex >= 0) {
        approach.add(crossing.chunkKey);
        let child = crossing.chunkKey;
        for (let index = gateIndex - 1; index >= 0; index -= 1) {
            const previous = spine[index];
            const steps = neighbours.get(child)?.has(previous)
                ? [previous]
                : [[...(neighbours.get(child) ?? [])].find((key) => neighbours.get(key)?.has(previous)), previous];
            let reachedBoundary = false;
            for (const step of steps) {
                if (!step) { reachedBoundary = true; break; }
                if (sharedBorderDistance(step, child, anchor.x, anchor.z, chunkSize) <= boundary) {
                    reachedBoundary = true;
                    break;
                }
                approach.add(step);
                child = step;
            }
            if (reachedBoundary) break;
        }
    }
    perPlan.set(cacheKey, approach);
    return approach;
}

// Exact lock for a gate every route must pass through: the carrier may be
// anywhere reachable from the crash site without crossing the gate chunk,
// plus the gate chunk itself (so its console and door can be worked).
// Returns null when the gate is not a cut point -- generation-1 ring loops
// can run round a gate -- and the radial boundary has to stand in.
const lockedRegionCache = new WeakMap();

/**
 * A generation-1 gate can sit on a spur: a chunk the route enters and leaves
 * by the same side. Its gate room then has a single door, and the mission
 * console is behind it -- locking that door made the gate impossible to
 * work. A spur never gates passage anyway (the ring boundary does), so its
 * door must stay open.
 */
export function isRingCrossingSpur(worldPlan, crossingId) {
    const crossing = worldPlan?.ringCrossings?.find((entry) => entry.id === crossingId);
    if (!crossing?.chunkKey) return false;
    const degree = (worldPlan.topology?.routeEdges ?? [])
        .filter((edge) => edge.split('|').includes(crossing.chunkKey)).length;
    return degree > 0 && degree < 2;
}

export function getLockedGateRegion(worldPlan, ring) {
    const crossing = worldPlan?.ringCrossings?.find((entry) => entry.ring === ring);
    const topology = worldPlan?.topology;
    if (!crossing?.chunkKey || !topology?.routeEdges) return null;
    let perPlan = lockedRegionCache.get(worldPlan);
    if (!perPlan) lockedRegionCache.set(worldPlan, (perPlan = new Map()));
    if (perPlan.has(ring)) return perPlan.get(ring);
    const neighbours = new Map();
    for (const edge of topology.routeEdges) {
        const [a, b] = edge.split('|');
        if (!neighbours.has(a)) neighbours.set(a, []);
        if (!neighbours.has(b)) neighbours.set(b, []);
        neighbours.get(a).push(b);
        neighbours.get(b).push(a);
    }
    const start = topology.startChunkKey ?? '0,0';
    const allowed = new Set([start]);
    const queue = [start];
    while (queue.length) {
        const current = queue.shift();
        for (const next of neighbours.get(current) ?? []) {
            if (next === crossing.chunkKey || allowed.has(next)) continue;
            allowed.add(next);
            queue.push(next);
        }
    }
    const goal = topology.queenChunkKey;
    // If the queen is still reachable without the gate, it is not a cut point.
    const region = goal && allowed.has(goal)
        ? null
        : { allowed: new Set([...allowed, crossing.chunkKey]), routeChunks: new Set(neighbours.keys()) };
    perPlan.set(ring, region);
    return region;
}

export function clampPositionToAuthoredRing(
    x,
    z,
    anchor,
    maxUnlockedRing,
    radialRingRadii = [0, 108, 201, 304, 413, 529],
    { worldPlan = null, chunkSize = 49, previous = null } = {}
) {
    const ring = Math.max(0, Math.min(radialRingRadii.length - 1, Math.floor(maxUnlockedRing)));
    if (ring >= radialRingRadii.length - 1) return { x, z, blocked: false };
    const inner = Number(radialRingRadii[ring]);
    const outer = Number(radialRingRadii[ring + 1]);
    if (!Number.isFinite(inner) || !Number.isFinite(outer)) return { x, z, blocked: false };
    const anchorX = Number(anchor?.x) || 0;
    const anchorZ = Number(anchor?.z) || 0;
    let boundary = (inner + outer) / 2;
    const crossing = worldPlan?.ringCrossings?.find((entry) => entry.ring === ring);
    if (Number.isFinite(crossing?.chunkX) && Number.isFinite(crossing?.chunkY)) {
        const crossingCenterX = crossing.chunkX * chunkSize + chunkSize * 0.5;
        const crossingCenterZ = crossing.chunkY * chunkSize + chunkSize * 0.5;
        const crossingApproachRadius = Math.hypot(
            crossingCenterX - anchorX,
            crossingCenterZ - anchorZ
        ) + chunkSize * 0.15;
        boundary = Math.max(boundary, crossingApproachRadius);
    }
    const dx = (Number(x) || 0) - anchorX;
    const dz = (Number(z) || 0) - anchorZ;
    const distance = Math.hypot(dx, dz);
    const chunkKey = `${Math.floor((Number(x) || 0) / chunkSize)},${Math.floor((Number(z) || 0) / chunkSize)}`;
    const region = worldPlan ? getLockedGateRegion(worldPlan, ring) : null;
    // Route chunks follow the exact lock; off-route ground (canyon, ledges
    // between route chunks) keeps the radial boundary below.
    if (region?.routeChunks.has(chunkKey)) {
        if (region.allowed.has(chunkKey)) return { x, z, blocked: false };
        if (Number.isFinite(previous?.x) && Number.isFinite(previous?.z)) {
            return { x: previous.x, z: previous.z, blocked: true };
        }
        // No last legal position (first frame, a teleport): the gate chunk
        // is always open, so fall back into it.
        const crossing = worldPlan.ringCrossings.find((entry) => entry.ring === ring);
        return {
            x: (crossing.chunkX + 0.5) * chunkSize,
            z: (crossing.chunkY + 0.5) * chunkSize,
            blocked: true
        };
    }
    if (distance <= boundary || distance === 0) return { x, z, blocked: false };
    if (worldPlan) {
        const approach = getLockedApproachChunks(worldPlan, ring, { anchor: { x: anchorX, z: anchorZ }, chunkSize, boundary });
        if (!region && approach.has(chunkKey)) return { x, z, blocked: false };
        // Step back to where the carrier last legally stood: a radial
        // projection from a route that dips inward can land inside a wall.
        if (Number.isFinite(previous?.x) && Number.isFinite(previous?.z)) {
            return { x: previous.x, z: previous.z, blocked: true };
        }
    }
    const scale = boundary / distance;
    return {
        x: anchorX + dx * scale,
        z: anchorZ + dz * scale,
        blocked: true
    };
}

/**
 * Select the threshold leading away from the ship along the canonical route.
 * A crossing can sit on a tangential section of a spiral, so radial direction
 * is not a reliable proxy for which of its two doors actually advances the
 * expedition.
 */
export function selectRingCrossingFarSide(worldPlan, crossingId, availableSides = []) {
    const crossing = worldPlan?.ringCrossings?.find((entry) => entry.id === crossingId);
    const topology = worldPlan?.topology;
    if (!crossing?.chunkKey || !Array.isArray(topology?.spineChunkKeys)) return null;
    const allowed = new Set(availableSides);
    const [gateX, gateY] = crossing.chunkKey.split(',').map(Number);
    const sideOf = (key) => {
        const [nx, ny] = String(key).split(',').map(Number);
        return SIDE_BY_DELTA[`${nx - gateX},${ny - gateY}`] ?? null;
    };
    // 1. Exact: where every route passes through the gate, the far side is
    //    whichever neighbour lies in the part of the world it locks away.
    const region = getLockedGateRegion(worldPlan, crossing.ring);
    if (region) {
        const farSides = (topology.routeEdges ?? [])
            .map((edge) => edge.split('|'))
            .filter((pair) => pair.includes(crossing.chunkKey))
            .map((pair) => pair.find((key) => key !== crossing.chunkKey))
            .filter((key) => !region.allowed.has(key))
            .map(sideOf)
            .filter((side) => side && allowed.has(side))
            .sort();
        if (farSides.length) return farSides[0];
    }
    // 2. The spine's next point. Consecutive spine points can be diagonal;
    //    the route then joins them through one shared chunk, which is the
    //    real next step. Previously a diagonal "next" matched no side and the
    //    fallback below picked the PREVIOUS point -- stamping the locked
    //    crossing door on the side facing the ship.
    const routeNeighbours = new Set((topology.routeEdges ?? [])
        .map((edge) => edge.split('|'))
        .filter((pair) => pair.includes(crossing.chunkKey))
        .map((pair) => pair.find((key) => key !== crossing.chunkKey)));
    const spineIndex = topology.spineChunkKeys.indexOf(crossing.chunkKey);
    const spineNext = spineIndex >= 0 ? topology.spineChunkKeys[spineIndex + 1] : null;
    if (spineNext) {
        const direct = routeNeighbours.has(spineNext) ? spineNext : null;
        const bridging = direct ?? [...routeNeighbours].find((key) => (topology.routeEdges ?? []).some((edge) => {
            const pair = edge.split('|');
            return pair.includes(key) && pair.includes(spineNext);
        }));
        const side = bridging ? sideOf(bridging) : null;
        if (side && allowed.has(side)) return side;
    }
    const matchingIndices = topology.spineChunkKeys
        .map((key, index) => key === crossing.chunkKey ? index : -1)
        .filter((index) => index >= 0);
    const [chunkX, chunkY] = crossing.chunkKey.split(',').map(Number);
    const neighborKey = matchingIndices
        .flatMap((index) => [
            { key: topology.spineChunkKeys[index + 1], priority: 0 },
            { key: topology.spineChunkKeys[index - 1], priority: 1 }
        ])
        .filter(({ key }) => {
            if (!key) return false;
            const [nx, ny] = key.split(',').map(Number);
            const side = SIDE_BY_DELTA[`${nx - chunkX},${ny - chunkY}`];
            return side && allowed.has(side);
        })
        .sort((a, b) => a.priority - b.priority || a.key.localeCompare(b.key))[0]?.key;
    if (!neighborKey) return null;
    const [neighborX, neighborY] = neighborKey.split(',').map(Number);
    const side = SIDE_BY_DELTA[`${neighborX - chunkX},${neighborY - chunkY}`];
    return side && allowed.has(side) ? side : null;
}

/** Reconcile one WorldPlan using ringCrossings.js's canonical option names. */
export function reconcileWorldPlanRingCrossings(worldPlan, rawState, {
    builtGoalKeys,
    completedMissionIds,
    milestoneLifecycle,
    defeatedMilestoneIds
} = {}) {
    const plan = normalizeWorldPlanRingCrossings(worldPlan);
    const reconciled = reconcileRingCrossingState(plan, rawState, {
        builtGoalKeys,
        completedMissionIds,
        milestoneLifecycle,
        defeatedMilestoneIds
    });
    const openCrossingIds = getOpenRingCrossingIds(reconciled.state);
    return {
        plan,
        state: reconciled.state,
        changed: reconciled.changed,
        openCrossingIds,
        traversalUnlocks: getRingCrossingTraversalUnlocks(reconciled.state),
        maxUnlockedRing: deriveMaxUnlockedRing(plan, reconciled.state)
    };
}

function reservationRolePriority(reservation) {
    return RESERVATION_ROLE_PRIORITY[reservation?.role] ?? 100;
}

/**
 * Resolve aliases sharing a chunk to exactly one stable reservation. Dormant
 * conditional reservations are excluded until their ID is explicitly active;
 * an explicitly active state/quest alias takes precedence over its base room.
 */
export function selectCanonicalReservationForChunk(worldPlan, chunkX, chunkY, {
    activeReservationIds
} = {}) {
    const chunkKey = coordinatesToChunkKey(chunkX, chunkY);
    if (!chunkKey) return null;
    const activeIds = stringSet(activeReservationIds);
    const candidates = (worldPlan?.reservations ?? []).filter((reservation) => (
        reservation?.chunkKey === chunkKey
        && (!reservation.conditional
            || reservation.activationState === 'active'
            || activeIds.has(reservation.id))
    ));
    candidates.sort((a, b) => (
        Number(!activeIds.has(a.id)) - Number(!activeIds.has(b.id))
        || reservationRolePriority(a) - reservationRolePriority(b)
        || Number(Boolean(a.conditional)) - Number(Boolean(b.conditional))
        || String(a.id).localeCompare(String(b.id))
    ));
    return candidates[0] ?? null;
}

function fallbackResult({ chunkKey, reservation = null, reason, attemptedRotations = [], rejectedSockets = [], errors = [] }) {
    return {
        status: AUTHORED_STRUCTURE_RESOLUTION.FALLBACK,
        chunkKey,
        reservation,
        reservationId: reservation?.id ?? null,
        generatorId: null,
        wayfindingMarkers: [],
        structure: null,
        diagnostics: {
            fallbackRequired: true,
            reason,
            attemptedRotations,
            rejectedSockets,
            errors
        }
    };
}

function withReservationMetadata(structure, reservation, rotationSteps) {
    const wayfindingMarkers = (structure?.wayfindingMarkers ?? []).map((marker) => ({ ...marker }));
    const stateVariant = reservation?.stateKey ?? null;
    return {
        ...structure,
        reservationId: reservation?.id ?? null,
        reservationRole: reservation?.role ?? null,
        rooms: (structure?.rooms ?? []).map((room) => ({
            ...room,
            reservationId: reservation?.id ?? null,
            stateVariant: stateVariant ?? room.stateVariant
        })),
        anchors: (structure?.anchors ?? []).map((anchor) => ({ ...anchor, reservationId: reservation?.id ?? null })),
        zones: (structure?.zones ?? []).map((zone) => ({ ...zone, reservationId: reservation?.id ?? null })),
        wayfindingMarkers,
        diagnostics: {
            ...(structure?.diagnostics ?? {}),
            reservationId: reservation?.id ?? null,
            reservationRole: reservation?.role ?? null,
            acceptedRotationSteps: rotationSteps
        }
    };
}

/**
 * Attempt Lane B's authored producer without sacrificing the chunk's topology.
 * Every cardinal orientation is considered in a fixed order; a nominal result
 * that skipped even one active opening is rejected in favor of legacy fallback.
 */
export function resolveAuthoredChunkStructure(random, worldPlan, {
    chunkX,
    chunkY,
    activeReservationIds,
    ...producerOptions
} = {}) {
    const chunkKey = coordinatesToChunkKey(chunkX, chunkY);
    if (!chunkKey || typeof random !== 'function') {
        return fallbackResult({
            chunkKey,
            reason: AUTHORED_STRUCTURE_FALLBACK_REASONS.INVALID_REQUEST
        });
    }

    const reservation = selectCanonicalReservationForChunk(worldPlan, chunkX, chunkY, { activeReservationIds });
    if (!reservation) {
        // Even without a canonical reservation directly on this chunk,
        // it may be an outer module of a multi-chunk setpiece claim
        const setpieceClaim = (worldPlan?.setpieceClaims ?? []).find((claim) => (
            claim?.chunkKeys?.includes(chunkKey)
        ));
        if (setpieceClaim) {
            const setpieceStructure = resolveSetpieceChunkStructure(setpieceClaim, chunkX, chunkY, {
                chunkSize: producerOptions.chunkSize
            });
            if (setpieceStructure) {
                const parentRes = (worldPlan?.reservations ?? []).find((entry) => entry.id === setpieceClaim.reservationId)
                    ?? { id: setpieceClaim.id };
                const acceptedStructure = withReservationMetadata(setpieceStructure, parentRes, setpieceClaim.rotation ?? 0);
                return {
                    status: AUTHORED_STRUCTURE_RESOLUTION.ACCEPTED,
                    chunkKey,
                    reservation: parentRes,
                    reservationId: parentRes.id,
                    generatorId: acceptedStructure.generatorId,
                    wayfindingMarkers: acceptedStructure.wayfindingMarkers,
                    structure: acceptedStructure,
                    diagnostics: {
                        fallbackRequired: false,
                        reason: null,
                        attemptedRotations: [setpieceClaim.rotation ?? 0],
                        rejectedSockets: [],
                        errors: [],
                        acceptedRotationSteps: setpieceClaim.rotation ?? 0,
                        setpieceClaimId: setpieceClaim.id
                    }
                };
            }
        }

        return fallbackResult({
            chunkKey,
            reason: AUTHORED_STRUCTURE_FALLBACK_REASONS.NO_ACTIVE_RESERVATION
        });
    }

    const attemptedRotations = [];
    const rejectedSockets = [];
    const errors = [];
    let producedAnyStructure = false;
    // Best-effort room for a ring crossing: see the acceptance note below.
    let crossingBestEffort = null;

    for (const rotationSteps of CARDINAL_ROTATIONS) {
        attemptedRotations.push(rotationSteps);
        let structure;
        try {
            structure = resolveChunkStructureForReservation(random, reservation, {
                ...producerOptions,
                rotationSteps
            });
        } catch (error) {
            errors.push({
                rotationSteps,
                message: error instanceof Error ? error.message : String(error)
            });
            continue;
        }
        // Catalog selection is independent of rotation, so null on the first
        // attempt means no later cardinal orientation can make it supported.
        if (!structure) break;
        producedAnyStructure = true;
        const skippedSockets = Array.isArray(structure?.diagnostics?.skippedSockets)
            ? [...structure.diagnostics.skippedSockets]
            : structure?.diagnostics?.skippedSockets
                ? [String(structure.diagnostics.skippedSockets)]
                : [];
        if (skippedSockets.length > 0) {
            rejectedSockets.push({ rotationSteps, skippedSockets });
            // A ring crossing is the one reservation that cannot be skipped:
            // its room carries both the threshold and the gate_control anchor
            // the mission needs. When no rotation covers every socket cleanly,
            // keep the first one that at least produced a room, rather than
            // falling through to a setpiece module that stamps no doors and no
            // controls -- that left the gate looking right and permanently
            // shut, blocking the ring outright.
            if (reservation?.crossingId && !crossingBestEffort) {
                crossingBestEffort = { structure, rotationSteps, skippedSockets };
            }
            continue;
        }

        const acceptedStructure = withReservationMetadata(structure, reservation, rotationSteps);
        return {
            status: AUTHORED_STRUCTURE_RESOLUTION.ACCEPTED,
            chunkKey,
            reservation,
            reservationId: reservation.id,
            generatorId: acceptedStructure.generatorId,
            wayfindingMarkers: acceptedStructure.wayfindingMarkers,
            structure: acceptedStructure,
            diagnostics: {
                fallbackRequired: false,
                reason: null,
                attemptedRotations,
                rejectedSockets,
                errors,
                acceptedRotationSteps: rotationSteps
            }
        };
    }

    if (crossingBestEffort) {
        const acceptedStructure = withReservationMetadata(
            crossingBestEffort.structure,
            reservation,
            crossingBestEffort.rotationSteps
        );
        return {
            status: AUTHORED_STRUCTURE_RESOLUTION.ACCEPTED,
            chunkKey,
            reservation,
            reservationId: reservation.id,
            generatorId: acceptedStructure.generatorId,
            wayfindingMarkers: acceptedStructure.wayfindingMarkers,
            structure: acceptedStructure,
            diagnostics: {
                fallbackRequired: false,
                reason: AUTHORED_STRUCTURE_FALLBACK_REASONS.SOCKET_MISMATCH,
                attemptedRotations,
                rejectedSockets,
                errors,
                acceptedRotationSteps: crossingBestEffort.rotationSteps,
                crossingBestEffort: true
            }
        };
    }

    // If no single-chunk room in ROOM_BUILD_CATALOG matched this reservation,
    // check if a multi-chunk setpiece claim covers it
    const setpieceClaim = (worldPlan?.setpieceClaims ?? []).find((claim) => (
        claim?.chunkKeys?.includes(chunkKey)
    ));
    if (setpieceClaim) {
        const setpieceStructure = resolveSetpieceChunkStructure(setpieceClaim, chunkX, chunkY, {
            chunkSize: producerOptions.chunkSize
        });
        // A ring crossing has to keep its threshold. Setpiece modules away from
        // the pivot stamp no doors, so accepting one here left the gate with
        // nothing to convert into a crossing door: the chunk looked right and
        // could never be opened, permanently blocking that ring. Falling
        // through instead hands the chunk to the standard generator, which
        // always cuts doors. A gate that opens beats a prettier gate that does
        // not.
        const crossingNeedsDoor = Boolean(reservation?.crossingId)
            && !(setpieceStructure?.doors?.length > 0);
        if (setpieceStructure && !crossingNeedsDoor) {
            const acceptedStructure = withReservationMetadata(setpieceStructure, reservation, setpieceClaim.rotation ?? 0);
            return {
                status: AUTHORED_STRUCTURE_RESOLUTION.ACCEPTED,
                chunkKey,
                reservation,
                reservationId: reservation.id,
                generatorId: acceptedStructure.generatorId,
                wayfindingMarkers: acceptedStructure.wayfindingMarkers,
                structure: acceptedStructure,
                diagnostics: {
                    fallbackRequired: false,
                    reason: null,
                    attemptedRotations: [setpieceClaim.rotation ?? 0],
                    rejectedSockets: [],
                    errors: [],
                    acceptedRotationSteps: setpieceClaim.rotation ?? 0,
                    setpieceClaimId: setpieceClaim.id
                }
            };
        }
    }

    const reason = producedAnyStructure
        ? AUTHORED_STRUCTURE_FALLBACK_REASONS.SOCKET_MISMATCH
        : errors.length > 0
            ? AUTHORED_STRUCTURE_FALLBACK_REASONS.PRODUCER_ERROR
            : AUTHORED_STRUCTURE_FALLBACK_REASONS.UNSUPPORTED_RESERVATION;
    return fallbackResult({ chunkKey, reservation, reason, attemptedRotations, rejectedSockets, errors });
}
