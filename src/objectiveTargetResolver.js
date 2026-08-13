import { CHUNK_SIZE } from './tileCatalog.js';

export const OBJECTIVE_TARGET_SOURCE = Object.freeze({
    INTERACTION: 'interactionAnchor',
    APPROACH: 'approachAnchor',
    RESERVATION: 'reservationFallback'
});

function parseChunkKey(key) {
    if (typeof key !== 'string') return null;
    const parts = key.split(',');
    if (parts.length !== 2) return null;
    const chunkX = Number(parts[0]);
    const chunkY = Number(parts[1]);
    return Number.isInteger(chunkX) && Number.isInteger(chunkY) ? { chunkX, chunkY } : null;
}

function chunkCoordinates(record) {
    const fromKey = parseChunkKey(record?.chunkKey);
    const chunkX = Number.isInteger(record?.chunkX) ? record.chunkX : fromKey?.chunkX;
    const chunkY = Number.isInteger(record?.chunkY) ? record.chunkY : fromKey?.chunkY;
    return Number.isInteger(chunkX) && Number.isInteger(chunkY) ? { chunkX, chunkY } : null;
}

function asRecords(value) {
    if (Array.isArray(value)) return value;
    if (value instanceof Map) return [...value.values()];
    return value && typeof value === 'object' ? Object.values(value) : [];
}

function anchorRecords(structure) {
    const direct = Array.isArray(structure?.anchors)
        ? structure.anchors
        : structure?.anchors && typeof structure.anchors === 'object'
            ? Object.entries(structure.anchors).map(([id, anchor]) => ({ id, ...anchor }))
            : [];
    const roomAnchors = asRecords(structure?.rooms).flatMap((room) => {
        const anchors = Array.isArray(room?.anchors)
            ? room.anchors
            : room?.anchors && typeof room.anchors === 'object'
                ? Object.entries(room.anchors).map(([id, anchor]) => ({ id, ...anchor }))
                : [];
        return anchors.map((anchor) => ({
            roomId: room.id ?? null,
            reservationId: anchor.reservationId ?? room.reservationId ?? null,
            ...anchor
        }));
    });
    return [...direct, ...roomAnchors];
}

function anchorId(anchor) {
    return anchor?.id ?? anchor?.anchorId ?? anchor?.name ?? null;
}

function anchorMatchesReservation(anchor, reservationId) {
    return !anchor?.reservationId || anchor.reservationId === reservationId;
}

/**
 * Convert a final-space chunk anchor into the exact world-space contract used
 * by ObjectiveRegistry. Chunk anchors default to local cell coordinates;
 * callers must explicitly mark already-resolved coordinates as world space.
 */
export function objectiveAnchorToWorld(anchor, structure, {
    chunkSize = CHUNK_SIZE,
    worldOffset = { x: 0, z: 0 }
} = {}) {
    if (!anchor || typeof anchor !== 'object') return null;
    const offsetX = Number(worldOffset?.x) || 0;
    const offsetZ = Number(worldOffset?.z) || 0;
    const explicitWorld = anchor.coordinateSpace === 'world'
        || (Number.isFinite(anchor.worldX) && Number.isFinite(anchor.worldZ));
    if (explicitWorld) {
        const x = Number.isFinite(anchor.worldX) ? anchor.worldX : anchor.x;
        const z = Number.isFinite(anchor.worldZ) ? anchor.worldZ : anchor.z;
        return Number.isFinite(x) && Number.isFinite(z)
            ? { x: x + offsetX, z: z + offsetZ }
            : null;
    }

    const chunk = chunkCoordinates(structure);
    if (!chunk) return null;
    const localX = Number.isFinite(anchor.localX) ? anchor.localX : anchor.x;
    const localZ = Number.isFinite(anchor.localZ)
        ? anchor.localZ
        : Number.isFinite(anchor.z) ? anchor.z : anchor.y;
    if (!Number.isFinite(localX) || !Number.isFinite(localZ)) return null;
    return {
        x: chunk.chunkX * chunkSize + localX + offsetX,
        z: chunk.chunkY * chunkSize + localZ + offsetZ
    };
}

function findReservation(worldPlan, identifier) {
    if (!identifier || typeof identifier !== 'string') return null;
    const all = asRecords(worldPlan?.reservations);
    return all.find((entry) => (
        entry?.id === identifier
        || entry?.questId === identifier
        || entry?.goalKey === identifier
        || entry?.siteId === identifier
        || entry?.territoryId === identifier
        || entry?.blockerId === identifier
    )) ?? null;
}

function findStructure(structures, reservation) {
    const all = asRecords(structures);
    const byReservation = all.find((structure) => (
        structure?.reservationId === reservation.id
        || asRecords(structure?.rooms).some((room) => room?.reservationId === reservation.id)
        || anchorRecords(structure).some((anchor) => anchor?.reservationId === reservation.id)
    ));
    if (byReservation) return byReservation;
    const reservationChunk = chunkCoordinates(reservation);
    if (!reservationChunk) return null;
    return all.find((structure) => {
        const structureChunk = chunkCoordinates(structure);
        return structureChunk?.chunkX === reservationChunk.chunkX
            && structureChunk?.chunkY === reservationChunk.chunkY;
    }) ?? null;
}

function findNamedAnchor(structure, reservationId, wantedId) {
    if (!wantedId) return null;
    return anchorRecords(structure).find((anchor) => (
        anchorMatchesReservation(anchor, reservationId) && anchorId(anchor) === wantedId
    )) ?? null;
}

function reservationFallback(reservation, chunkSize, worldOffset) {
    const offsetX = Number(worldOffset?.x) || 0;
    const offsetZ = Number(worldOffset?.z) || 0;
    const x = Number.isFinite(reservation?.worldX) ? reservation.worldX : reservation?.x;
    const z = Number.isFinite(reservation?.worldZ) ? reservation.worldZ : reservation?.z;
    if (Number.isFinite(x) && Number.isFinite(z)) {
        return { x: x + offsetX, z: z + offsetZ };
    }
    const chunk = chunkCoordinates(reservation);
    if (!chunk) return null;
    const center = (chunkSize - 1) / 2;
    return {
        x: chunk.chunkX * chunkSize + center + offsetX,
        z: chunk.chunkY * chunkSize + center + offsetZ
    };
}

/**
 * Resolve a stable reservation/anchor request to an ObjectiveRegistry-ready
 * `{x, z}` target. Exact interaction anchors win once revealed; approach
 * anchors are the discovery-safe fallback; a reservation coordinate is used
 * only when the caller explicitly permits the final fallback.
 */
export function resolveObjectiveTarget(request, {
    worldPlan,
    chunkStructures = [],
    chunkSize = worldPlan?.topology?.chunkSize ?? CHUNK_SIZE,
    worldOffset = { x: 0, z: 0 }
} = {}) {
    const identifier = request?.reservationId
        ?? request?.id
        ?? request?.questId
        ?? request?.goalKey
        ?? request?.siteId
        ?? (typeof request === 'string' ? request : null);
    if (!identifier) return null;
    const reservation = findReservation(worldPlan, identifier);
    if (!reservation) return null;
    const reservationId = reservation.id;
    const structure = findStructure(chunkStructures, reservation);

    const exactIsRevealed = request?.exactRevealed !== false;
    const interactionAnchorId = request?.interactionAnchorId
        ?? request?.anchorId
        ?? reservation.interactionAnchorId
        ?? reservation.objectiveAnchorId;
    if (structure && exactIsRevealed && interactionAnchorId) {
        const anchor = findNamedAnchor(structure, reservationId, interactionAnchorId);
        const position = objectiveAnchorToWorld(anchor, structure, { chunkSize, worldOffset });
        if (position) {
            return {
                reservationId,
                anchorId: anchorId(anchor),
                source: OBJECTIVE_TARGET_SOURCE.INTERACTION,
                exact: true,
                ...position
            };
        }
    }

    const approachAnchorId = request?.approachAnchorId
        ?? reservation.approachAnchorId
        ?? 'approach';
    if (structure) {
        const anchor = findNamedAnchor(structure, reservationId, approachAnchorId);
        const position = objectiveAnchorToWorld(anchor, structure, { chunkSize, worldOffset });
        if (position) {
            return {
                reservationId,
                anchorId: anchorId(anchor),
                source: OBJECTIVE_TARGET_SOURCE.APPROACH,
                exact: false,
                ...position
            };
        }
    }

    if (request?.allowReservationFallback === false) return null;
    const position = reservationFallback(reservation, chunkSize, worldOffset);
    return position ? {
        reservationId,
        anchorId: null,
        source: OBJECTIVE_TARGET_SOURCE.RESERVATION,
        exact: false,
        ...position
    } : null;
}

/** Return only the existing generic registry payload shape. */
export function toObjectiveCompass(target) {
    return target && Number.isFinite(target.x) && Number.isFinite(target.z)
        ? { x: target.x, z: target.z }
        : null;
}

/** Directly resolves a request to compass coordinates {x, z} or null. */
export function resolveObjectiveTargetPosition(request, options) {
    const target = resolveObjectiveTarget(request, options);
    return toObjectiveCompass(target);
}
