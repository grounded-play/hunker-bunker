// Pure macro allocator for authored camp/hive territories. It reserves the
// complete multi-chunk sequence before any member chunk is streamed, so both
// sides of every shared boundary can reproduce the same socket contract.

export const TERRITORY_PLAN_VERSION = 1;

const DEFAULT_SOCKET_WIDTH = 3;
const DIRECTIONS = Object.freeze({
    '1,0': Object.freeze({ side: 'east', opposite: 'west' }),
    '-1,0': Object.freeze({ side: 'west', opposite: 'east' }),
    '0,1': Object.freeze({ side: 'south', opposite: 'north' }),
    '0,-1': Object.freeze({ side: 'north', opposite: 'south' })
});

function normalizeSeed(seed) {
    return Number(seed) >>> 0;
}

function stableHash(value) {
    let hash = 2166136261;
    for (const character of String(value)) {
        hash ^= character.codePointAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function normalizeId(value) {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9:_-]+/g, '-')
        .replace(/^[-:]+|[-:]+$/g, '');
}

function parseChunkKey(key) {
    const match = /^(-?\d+),(-?\d+)$/.exec(String(key ?? ''));
    if (!match) return null;
    return { chunkX: Number(match[1]), chunkY: Number(match[2]) };
}

function toChunkKey(chunkX, chunkY) {
    return `${chunkX},${chunkY}`;
}

function readEdge(edge) {
    if (typeof edge === 'string') {
        const [a, b, extra] = edge.split('|');
        return extra === undefined && parseChunkKey(a) && parseChunkKey(b) ? [a, b] : null;
    }
    const a = edge?.a ?? edge?.from ?? edge?.fromChunkKey;
    const b = edge?.b ?? edge?.to ?? edge?.toChunkKey;
    return parseChunkKey(a) && parseChunkKey(b) ? [String(a), String(b)] : null;
}

function buildTopologyIndex(topology) {
    const chunks = new Map();
    const adjacency = new Map();
    for (const chunk of topology?.routeChunks ?? []) {
        if (!Number.isInteger(chunk?.chunkX) || !Number.isInteger(chunk?.chunkY)) continue;
        const key = toChunkKey(chunk.chunkX, chunk.chunkY);
        chunks.set(key, chunk);
        adjacency.set(key, new Set());
    }
    const invalidEdges = [];
    for (const rawEdge of topology?.routeEdges ?? []) {
        const edge = readEdge(rawEdge);
        if (!edge || !chunks.has(edge[0]) || !chunks.has(edge[1])) {
            invalidEdges.push(rawEdge);
            continue;
        }
        const a = parseChunkKey(edge[0]);
        const b = parseChunkKey(edge[1]);
        if (Math.abs(a.chunkX - b.chunkX) + Math.abs(a.chunkY - b.chunkY) !== 1) {
            invalidEdges.push(rawEdge);
            continue;
        }
        adjacency.get(edge[0]).add(edge[1]);
        adjacency.get(edge[1]).add(edge[0]);
    }
    return { chunks, adjacency, invalidEdges };
}

function computeRouteDistances(index, startChunkKey) {
    const distances = new Map();
    if (!index.chunks.has(startChunkKey)) return distances;
    distances.set(startChunkKey, 0);
    const queue = [startChunkKey];
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const current = queue[cursor];
        for (const neighbor of index.adjacency.get(current) ?? []) {
            if (distances.has(neighbor)) continue;
            distances.set(neighbor, distances.get(current) + 1);
            queue.push(neighbor);
        }
    }
    return distances;
}

function reservationId(reservation) {
    return normalizeId(reservation?.id ?? reservation?.reservationId ?? reservation?.territoryId);
}

function territoryIdFor(reservation) {
    const explicit = normalizeId(reservation?.territoryId);
    if (explicit) return explicit;
    const sourceId = reservationId(reservation);
    return sourceId.startsWith('territory:') ? sourceId : `territory:${sourceId}`;
}

function reservationAnchor(reservation) {
    return String(
        reservation?.routeChunkKey
        ?? reservation?.anchorChunkKey
        ?? reservation?.ownerChunkKey
        ?? reservation?.chunkKey
        ?? ''
    );
}

function normalizeBeats(reservation, territoryId) {
    return (reservation?.beats ?? []).map((beat, index) => {
        const sourceId = normalizeId(beat?.id ?? beat?.beatId ?? beat?.role ?? `beat-${index + 1}`);
        return {
            id: `${territoryId}:beat:${sourceId || index + 1}`,
            sourceId: sourceId || `beat-${index + 1}`,
            order: index,
            role: String(beat?.role ?? sourceId ?? 'territory'),
            activationState: String(beat?.activationState ?? reservation?.activationState ?? 'reserved'),
            fixedChunkKey: beat?.ownerChunkKey ?? beat?.chunkKey ?? null
        };
    });
}

function anchorBeatIndex(reservation, beats) {
    if (Number.isInteger(reservation?.anchorBeatIndex)) return reservation.anchorBeatIndex;
    const wanted = normalizeId(reservation?.anchorBeatId);
    if (wanted) {
        const found = beats.findIndex((beat) => beat.sourceId === wanted || beat.id === wanted);
        if (found >= 0) return found;
    }
    return 0;
}

function sortedNeighbors(index, current, {
    reservation,
    distances,
    seed,
    direction,
    occupied,
    path
}) {
    const currentDistance = distances.get(current);
    const expectedRing = Number.isInteger(reservation?.ring) ? reservation.ring : null;
    return [...(index.adjacency.get(current) ?? [])]
        .filter((key) => !occupied.has(key) && !path.includes(key))
        .filter((key) => Number.isFinite(currentDistance) && Number.isFinite(distances.get(key)))
        .sort((a, b) => {
            const aRingPenalty = expectedRing === null || index.chunks.get(a)?.ring === expectedRing ? 0 : 1;
            const bRingPenalty = expectedRing === null || index.chunks.get(b)?.ring === expectedRing ? 0 : 1;
            if (aRingPenalty !== bRingPenalty) return aRingPenalty - bRingPenalty;
            const aDistance = distances.get(a);
            const bDistance = distances.get(b);
            // Prefer the intended ship-to-depth direction, but do not reject a
            // valid ring-loop neighbor at a local distance maximum/minimum.
            const aDirectionPenalty = direction < 0 ? Number(aDistance > currentDistance) : Number(aDistance < currentDistance);
            const bDirectionPenalty = direction < 0 ? Number(bDistance > currentDistance) : Number(bDistance < currentDistance);
            if (aDirectionPenalty !== bDirectionPenalty) return aDirectionPenalty - bDirectionPenalty;
            if (aDistance !== bDistance) return direction < 0 ? bDistance - aDistance : aDistance - bDistance;
            const aRank = stableHash(`${seed}|${reservationId(reservation)}|${current}|${a}`);
            const bRank = stableHash(`${seed}|${reservationId(reservation)}|${current}|${b}`);
            return aRank - bRank || a.localeCompare(b);
        });
}

function enumeratePaths(index, reservation, beats, anchorIndex, distances, occupied, seed, maxPaths = 4096) {
    const anchor = reservationAnchor(reservation);
    if (!index.chunks.has(anchor) || occupied.has(anchor)) return [];
    const path = new Array(beats.length);
    const paths = [];
    path[anchorIndex] = anchor;

    const placeForward = (beatIndex) => {
        if (beatIndex >= beats.length) {
            paths.push([...path]);
            return paths.length >= maxPaths;
        }
        const previous = path[beatIndex - 1];
        const fixed = beats[beatIndex].fixedChunkKey;
        const candidates = sortedNeighbors(index, previous, {
            reservation,
            distances,
            seed,
            direction: 1,
            occupied,
            path
        }).filter((candidate) => !fixed || candidate === fixed);
        for (const candidate of candidates) {
            path[beatIndex] = candidate;
            if (placeForward(beatIndex + 1)) return true;
            path[beatIndex] = undefined;
        }
        return false;
    };

    // Complete the forward half at the base of the backward search. If the
    // forward half dead-ends, recursion revisits alternate approach chunks
    // instead of committing to the first locally-valid half path.
    const placeBackward = (beatIndex) => {
        if (beatIndex < 0) return placeForward(anchorIndex + 1);
        if (beatIndex < 0 || beatIndex >= beats.length) return true;
        const previous = path[beatIndex + 1];
        const fixed = beats[beatIndex].fixedChunkKey;
        const candidates = sortedNeighbors(index, previous, {
            reservation,
            distances,
            seed,
            direction: -1,
            occupied,
            path
        }).filter((candidate) => !fixed || candidate === fixed);
        for (const candidate of candidates) {
            path[beatIndex] = candidate;
            if (placeBackward(beatIndex - 1)) return true;
            path[beatIndex] = undefined;
        }
        return false;
    };

    const fixedAnchor = beats[anchorIndex]?.fixedChunkKey;
    if (fixedAnchor && fixedAnchor !== anchor) return [];
    placeBackward(anchorIndex - 1);
    return paths;
}

function socketDirection(fromKey, toKey) {
    const from = parseChunkKey(fromKey);
    const to = parseChunkKey(toKey);
    return DIRECTIONS[`${to.chunkX - from.chunkX},${to.chunkY - from.chunkY}`] ?? null;
}

function socketPair(territoryId, fromBeat, toBeat, index, width) {
    const direction = socketDirection(fromBeat.ownerChunkKey, toBeat.ownerChunkKey);
    const pairId = `${territoryId}:socket:${index}`;
    const aId = `${pairId}:a`;
    const bId = `${pairId}:b`;
    return [{
        id: aId,
        pairId,
        reciprocalSocketId: bId,
        territoryId,
        beatId: fromBeat.id,
        ownerChunkKey: fromBeat.ownerChunkKey,
        neighborBeatId: toBeat.id,
        neighborChunkKey: toBeat.ownerChunkKey,
        side: direction?.side ?? null,
        width,
        required: true
    }, {
        id: bId,
        pairId,
        reciprocalSocketId: aId,
        territoryId,
        beatId: toBeat.id,
        ownerChunkKey: toBeat.ownerChunkKey,
        neighborBeatId: fromBeat.id,
        neighborChunkKey: fromBeat.ownerChunkKey,
        side: direction?.opposite ?? null,
        width,
        required: true
    }];
}

/**
 * Allocates complete ordered territory paths on the macro route graph.
 *
 * Reservations are serializable descriptions with an id, routeChunkKey,
 * optional ring/anchorBeatIndex, and ordered beats. The returned plan has no
 * runtime references and is independent of local chunk generation order.
 */
export function allocateTerritories(topology, reservations = [], {
    seed = 0,
    claimedChunkKeys = [],
    socketWidth = DEFAULT_SOCKET_WIDTH
} = {}) {
    const normalizedSeed = normalizeSeed(seed);
    const index = buildTopologyIndex(topology);
    const startChunkKey = String(topology?.startChunkKey ?? '0,0');
    const distances = computeRouteDistances(index, startChunkKey);
    const rawClaimed = Array.isArray(claimedChunkKeys)
        ? claimedChunkKeys
        : claimedChunkKeys instanceof Set
            ? [...claimedChunkKeys]
            : [];
    const occupied = new Set(rawClaimed.map((key) => (
        key && typeof key === 'object' && key.chunkKey ? String(key.chunkKey)
        : Number.isInteger(key?.chunkX) && Number.isInteger(key?.chunkY) ? `${key.chunkX},${key.chunkY}`
        : String(key ?? '')
    )).filter((key) => key.length > 0));
    const protectedAnchors = new Set(reservations.map(reservationAnchor).filter((key) => index.chunks.has(key)));
    const allocationErrors = [];
    const territories = [];
    const requiredChunkSockets = [];
    const seenReservationIds = new Set();

    const orderedReservations = [...reservations].sort((a, b) => {
        const aOrder = Number.isFinite(a?.routeOrder) ? a.routeOrder : Infinity;
        const bOrder = Number.isFinite(b?.routeOrder) ? b.routeOrder : Infinity;
        if (aOrder !== bOrder) return aOrder - bOrder;
        const aDistance = distances.get(reservationAnchor(a)) ?? Infinity;
        const bDistance = distances.get(reservationAnchor(b)) ?? Infinity;
        return aDistance - bDistance || reservationId(a).localeCompare(reservationId(b));
    });

    const allocationRecords = [];
    for (const reservation of orderedReservations) {
        const sourceReservationId = reservationId(reservation);
        const territoryId = territoryIdFor(reservation);
        if (!sourceReservationId) {
            allocationErrors.push('territory reservation is missing a stable id');
            continue;
        }
        if (seenReservationIds.has(sourceReservationId)) {
            allocationErrors.push(`duplicate territory reservation ${sourceReservationId}`);
            continue;
        }
        seenReservationIds.add(sourceReservationId);
        const beats = normalizeBeats(reservation, territoryId);
        if (beats.length === 0) {
            allocationErrors.push(`${territoryId} has no territory beats`);
            continue;
        }
        const anchorIndex = anchorBeatIndex(reservation, beats);
        if (anchorIndex < 0 || anchorIndex >= beats.length) {
            allocationErrors.push(`${territoryId} has invalid anchorBeatIndex ${anchorIndex}`);
            continue;
        }
        const contentAnchorIndex = Number.isInteger(reservation?.contentAnchorBeatIndex)
            ? reservation.contentAnchorBeatIndex
            : anchorIndex;
        if (contentAnchorIndex < 0 || contentAnchorIndex >= beats.length) {
            allocationErrors.push(`${territoryId} has invalid contentAnchorBeatIndex ${contentAnchorIndex}`);
            continue;
        }
        const candidatePaths = enumeratePaths(
            index,
            reservation,
            beats,
            anchorIndex,
            distances,
            new Set([...occupied, ...[...protectedAnchors].filter((key) => key !== reservationAnchor(reservation))]),
            normalizedSeed
        );
        if (candidatePaths.length === 0) {
            allocationErrors.push(`${territoryId} cannot allocate ${beats.length} adjacent unclaimed route chunks`);
            continue;
        }
        allocationRecords.push({
            reservation,
            sourceReservationId,
            territoryId,
            beats,
            anchorIndex,
            contentAnchorIndex,
            candidatePaths
        });
    }

    // Solve the complete portfolio before claiming anything. Most-constrained
    // first backtracking avoids an early camp greedily consuming the only
    // viable approach for a later hive while retaining stable seeded choices.
    const chosenPaths = new Map();
    const searchRecords = [...allocationRecords].sort((a, b) => (
        a.candidatePaths.length - b.candidatePaths.length
        || a.territoryId.localeCompare(b.territoryId)
    ));
    const solve = (recordIndex) => {
        if (recordIndex >= searchRecords.length) return true;
        const record = searchRecords[recordIndex];
        for (const candidatePath of record.candidatePaths) {
            if (candidatePath.some((key) => occupied.has(key))) continue;
            for (const key of candidatePath) occupied.add(key);
            chosenPaths.set(record.territoryId, candidatePath);
            if (solve(recordIndex + 1)) return true;
            chosenPaths.delete(record.territoryId);
            for (const key of candidatePath) occupied.delete(key);
        }
        return false;
    };
    if (!solve(0) && allocationRecords.length > 0) {
        allocationErrors.push('territory portfolio has no conflict-free allocation');
        chosenPaths.clear();
    }

    for (const record of allocationRecords) {
        const {
            reservation,
            sourceReservationId,
            territoryId,
            beats,
            anchorIndex,
            contentAnchorIndex
        } = record;
        const ownerPath = chosenPaths.get(territoryId);
        if (!ownerPath) continue;

        const allocatedBeats = beats.map((beat, beatIndex) => {
            const ownerChunkKey = ownerPath[beatIndex];
            const coordinates = parseChunkKey(ownerChunkKey);
            return {
                id: beat.id,
                territoryId,
                reservationId: sourceReservationId,
                order: beat.order,
                role: beat.role,
                activationState: beat.activationState,
                ownerChunkKey,
                ownerChunk: coordinates,
                routeDistance: distances.get(ownerChunkKey),
                requiredNeighborBeatIds: [
                    beatIndex > 0 ? beats[beatIndex - 1].id : null,
                    beatIndex < beats.length - 1 ? beats[beatIndex + 1].id : null
                ].filter(Boolean)
            };
        });
        const socketIds = [];
        for (let index = 1; index < allocatedBeats.length; index += 1) {
            const pair = socketPair(
                territoryId,
                allocatedBeats[index - 1],
                allocatedBeats[index],
                index - 1,
                socketWidth
            );
            requiredChunkSockets.push(...pair);
            socketIds.push(...pair.map((socket) => socket.id));
        }
        territories.push({
            id: territoryId,
            reservationId: sourceReservationId,
            kind: String(reservation?.kind ?? reservation?.type ?? 'territory'),
            ring: Number.isInteger(reservation?.ring) ? reservation.ring : null,
            routeOrder: Number.isFinite(reservation?.routeOrder)
                ? reservation.routeOrder
                : distances.get(reservationAnchor(reservation)),
            activationState: String(reservation?.activationState ?? 'reserved'),
            anchorChunkKey: reservationAnchor(reservation),
            anchorBeatId: allocatedBeats[anchorIndex].id,
            contentAnchorBeatId: allocatedBeats[contentAnchorIndex].id,
            beats: allocatedBeats,
            requiredSocketIds: socketIds
        });
    }

    const plan = {
        version: TERRITORY_PLAN_VERSION,
        seed: normalizedSeed,
        territories,
        requiredChunkSockets,
        diagnostics: {
            requestedTerritories: reservations.length,
            allocatedTerritories: territories.length,
            claimedChunkCount: territories.reduce((total, territory) => total + territory.beats.length, 0),
            invalidTopologyEdgeCount: index.invalidEdges.length,
            allocationErrors
        }
    };
    const validation = validateTerritoryPlan(plan, topology, reservations);
    plan.diagnostics.valid = validation.valid;
    plan.diagnostics.errors = validation.errors;
    return plan;
}

export const planTerritories = allocateTerritories;

export function validateTerritoryPlan(plan, topology, reservations = []) {
    const errors = [];
    const index = buildTopologyIndex(topology);
    const routeDistances = computeRouteDistances(index, String(topology?.startChunkKey ?? '0,0'));
    const territories = plan?.territories ?? [];
    const sockets = plan?.requiredChunkSockets ?? [];
    const beatsById = new Map();
    const ownerToBeat = new Map();
    const territoryIds = new Set();
    let previousTerritoryOrder = -Infinity;

    if (plan?.version !== TERRITORY_PLAN_VERSION) errors.push(`unsupported territory plan version ${plan?.version}`);
    if (index.invalidEdges.length > 0) errors.push(`topology contains ${index.invalidEdges.length} invalid route edge(s)`);
    if (plan?.diagnostics?.allocationErrors?.length) errors.push(...plan.diagnostics.allocationErrors);
    if (territories.length !== reservations.length) {
        errors.push(`allocated ${territories.length} of ${reservations.length} requested territories`);
    }

    for (const territory of territories) {
        if (!territory?.id || territoryIds.has(territory.id)) errors.push(`duplicate or missing territory id ${territory?.id}`);
        territoryIds.add(territory?.id);
        if (!Number.isFinite(territory?.routeOrder) || territory.routeOrder < previousTerritoryOrder) {
            errors.push(`${territory?.id} violates territory route order`);
        }
        previousTerritoryOrder = territory?.routeOrder;
        if (!(territory?.beats ?? []).some((beat) => beat.id === territory?.anchorBeatId)) {
            errors.push(`${territory?.id} has an invalid route anchor beat`);
        }
        if (!(territory?.beats ?? []).some((beat) => beat.id === territory?.contentAnchorBeatId)) {
            errors.push(`${territory?.id} has an invalid content anchor beat`);
        }
        for (let beatIndex = 0; beatIndex < (territory?.beats ?? []).length; beatIndex += 1) {
            const beat = territory.beats[beatIndex];
            if (!beat?.id || beatsById.has(beat.id)) errors.push(`duplicate or missing beat id ${beat?.id}`);
            beatsById.set(beat?.id, beat);
            if (!index.chunks.has(beat?.ownerChunkKey)) {
                errors.push(`${beat?.id} is owned by non-route chunk ${beat?.ownerChunkKey}`);
            }
            if (ownerToBeat.has(beat?.ownerChunkKey)) {
                errors.push(`${beat?.ownerChunkKey} is owned by both ${ownerToBeat.get(beat.ownerChunkKey)} and ${beat?.id}`);
            }
            ownerToBeat.set(beat?.ownerChunkKey, beat?.id);
            if (beat?.territoryId !== territory.id) errors.push(`${beat?.id} has the wrong territory owner`);
            if (beat?.order !== beatIndex) errors.push(`${beat?.id} has route order ${beat?.order}, expected ${beatIndex}`);
            const expectedDistance = routeDistances.get(beat?.ownerChunkKey);
            if (!Number.isFinite(beat?.routeDistance) || beat.routeDistance !== expectedDistance) {
                errors.push(`${beat?.id} has an invalid route distance`);
            }
            if (beatIndex > 0) {
                const previous = territory.beats[beatIndex - 1];
                if (!(index.adjacency.get(previous.ownerChunkKey) ?? new Set()).has(beat.ownerChunkKey)) {
                    errors.push(`${previous.id} and ${beat.id} are not adjacent route chunks`);
                }
                if (!beat.requiredNeighborBeatIds?.includes(previous.id)
                    || !previous.requiredNeighborBeatIds?.includes(beat.id)) {
                    errors.push(`${previous.id} and ${beat.id} lack reciprocal neighbor requirements`);
                }
            }
        }
    }

    const socketsById = new Map();
    for (const socket of sockets) {
        if (!socket?.id || socketsById.has(socket.id)) errors.push(`duplicate or missing socket id ${socket?.id}`);
        socketsById.set(socket?.id, socket);
    }
    for (const socket of sockets) {
        const reciprocal = socketsById.get(socket?.reciprocalSocketId);
        if (!reciprocal) {
            errors.push(`${socket?.id} is missing reciprocal socket ${socket?.reciprocalSocketId}`);
            continue;
        }
        if (reciprocal.reciprocalSocketId !== socket.id
            || reciprocal.pairId !== socket.pairId
            || reciprocal.ownerChunkKey !== socket.neighborChunkKey
            || reciprocal.neighborChunkKey !== socket.ownerChunkKey
            || reciprocal.beatId !== socket.neighborBeatId
            || reciprocal.neighborBeatId !== socket.beatId
            || reciprocal.width !== socket.width) {
            errors.push(`${socket.id} and ${reciprocal.id} are not reciprocal`);
        }
        const expected = socketDirection(socket.ownerChunkKey, socket.neighborChunkKey);
        if (!expected || socket.side !== expected.side || reciprocal.side !== expected.opposite) {
            errors.push(`${socket.id} has an invalid boundary direction`);
        }
        if (!beatsById.has(socket.beatId) || !beatsById.has(socket.neighborBeatId)) {
            errors.push(`${socket.id} references an unknown territory beat`);
        }
        const ownerBeat = beatsById.get(socket.beatId);
        const neighborBeat = beatsById.get(socket.neighborBeatId);
        if (ownerBeat?.ownerChunkKey !== socket.ownerChunkKey
            || neighborBeat?.ownerChunkKey !== socket.neighborChunkKey) {
            errors.push(`${socket.id} does not match its beat ownership`);
        }
        if (!Number.isInteger(socket?.width) || socket.width <= 0) {
            errors.push(`${socket?.id} has invalid socket width ${socket?.width}`);
        }
    }
    for (const territory of territories) {
        const declaredSocketIds = new Set(territory?.requiredSocketIds ?? []);
        for (let index = 1; index < territory.beats.length; index += 1) {
            const previous = territory.beats[index - 1];
            const current = territory.beats[index];
            const boundaryEndpoints = sockets.filter((socket) => (
                socket.territoryId === territory.id
                && ((socket.beatId === previous.id && socket.neighborBeatId === current.id)
                    || (socket.beatId === current.id && socket.neighborBeatId === previous.id))
            ));
            if (boundaryEndpoints.length !== 2) {
                errors.push(`${previous.id} and ${current.id} require exactly two reciprocal socket endpoints`);
            }
            for (const socket of boundaryEndpoints) {
                if (!declaredSocketIds.has(socket.id)) errors.push(`${territory.id} does not declare socket ${socket.id}`);
            }
        }
        if (declaredSocketIds.size !== Math.max(0, territory.beats.length - 1) * 2) {
            errors.push(`${territory.id} has an invalid required socket id count`);
        }
    }
    const expectedSocketCount = territories.reduce(
        (total, territory) => total + Math.max(0, territory.beats.length - 1) * 2,
        0
    );
    if (sockets.length !== expectedSocketCount) {
        errors.push(`expected ${expectedSocketCount} reciprocal socket endpoints, found ${sockets.length}`);
    }

    return { valid: errors.length === 0, errors };
}

export function getTerritoryForChunk(plan, key) {
    const chunkKey = String(key);
    return (plan?.territories ?? []).find((territory) => (
        territory.beats.some((beat) => beat.ownerChunkKey === chunkKey)
    )) ?? null;
}

export function getTerritoryBeat(plan, beatId) {
    for (const territory of plan?.territories ?? []) {
        const beat = territory.beats.find((candidate) => candidate.id === beatId);
        if (beat) return beat;
    }
    return null;
}

export function getRequiredSocketsForChunk(plan, key) {
    const chunkKey = String(key);
    return (plan?.requiredChunkSockets ?? []).filter((socket) => socket.ownerChunkKey === chunkKey);
}
