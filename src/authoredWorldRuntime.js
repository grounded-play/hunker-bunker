import { resolveChunkStructureForReservation } from './chunkStructure.js';
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
export function clampPositionToAuthoredRing(
    x,
    z,
    anchor,
    maxUnlockedRing,
    radialRingRadii = [0, 108, 201, 304, 413, 529],
    { worldPlan = null, chunkSize = 49 } = {}
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
    if (distance <= boundary || distance === 0) return { x, z, blocked: false };
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
    const stateVariant = reservation.stateKey ?? null;
    return {
        ...structure,
        reservationId: reservation.id,
        reservationRole: reservation.role ?? null,
        rooms: (structure?.rooms ?? []).map((room) => ({
            ...room,
            reservationId: reservation.id,
            stateVariant: stateVariant ?? room.stateVariant
        })),
        anchors: (structure?.anchors ?? []).map((anchor) => ({ ...anchor, reservationId: reservation.id })),
        zones: (structure?.zones ?? []).map((zone) => ({ ...zone, reservationId: reservation.id })),
        wayfindingMarkers,
        diagnostics: {
            ...(structure?.diagnostics ?? {}),
            reservationId: reservation.id,
            reservationRole: reservation.role ?? null,
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
        return fallbackResult({
            chunkKey,
            reason: AUTHORED_STRUCTURE_FALLBACK_REASONS.NO_ACTIVE_RESERVATION
        });
    }

    const attemptedRotations = [];
    const rejectedSockets = [];
    const errors = [];
    let producedAnyStructure = false;

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

    const reason = producedAnyStructure
        ? AUTHORED_STRUCTURE_FALLBACK_REASONS.SOCKET_MISMATCH
        : errors.length > 0
            ? AUTHORED_STRUCTURE_FALLBACK_REASONS.PRODUCER_ERROR
            : AUTHORED_STRUCTURE_FALLBACK_REASONS.UNSUPPORTED_RESERVATION;
    return fallbackResult({ chunkKey, reservation, reason, attemptedRotations, rejectedSockets, errors });
}
