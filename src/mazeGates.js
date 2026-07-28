import { SOCKET } from './tileCatalog.js';

const SIDE_DELTA = Object.freeze({
    n: -3,
    e: 1,
    s: 3,
    w: -1
});

function edgeKey(a, b) {
    return a < b ? `${a}-${b}` : `${b}-${a}`;
}

export function buildLatticeEdges(lattice) {
    const size = Math.round(Math.sqrt(lattice.length));
    const edges = new Set();
    for (let index = 0; index < lattice.length; index += 1) {
        const x = index % size;
        const y = Math.floor(index / size);
        if (x + 1 < size && lattice[index].sockets.e === SOCKET.OPEN3) edges.add(edgeKey(index, index + 1));
        if (y + 1 < size && lattice[index].sockets.s === SOCKET.OPEN3) edges.add(edgeKey(index, index + size));
    }
    return edges;
}

export function reachableNodes(nodeCount, edges, start = 0) {
    const seen = new Set([start]);
    const queue = [start];
    while (queue.length > 0) {
        const current = queue.shift();
        for (let next = 0; next < nodeCount; next += 1) {
            if (seen.has(next) || !edges.has(edgeKey(current, next))) continue;
            seen.add(next);
            queue.push(next);
        }
    }
    return seen;
}

export function isBridgeEdge(nodeCount, edges, edge) {
    const [a] = edge.split('-').map(Number);
    const beforeSize = reachableNodes(nodeCount, edges, a).size;
    const without = new Set(edges);
    without.delete(edge);
    return reachableNodes(nodeCount, without, a).size < beforeSize;
}

function requirementFor(biome, depthTier) {
    if (biome === 'bio' && depthTier >= 3) {
        return { type: 'objective', id: 'purge-hive-lock', label: 'HIVE SEAL ACTIVE' };
    }
    if (biome === 'cryo') {
        return { type: 'power', id: 'cryo-grid', label: 'CRYO GRID POWER REQUIRED' };
    }
    return { type: 'credential', id: 'security-alpha', label: 'SECURITY ALPHA REQUIRED' };
}

export function planSafeGates(lattice, rooms, doors, random, {
    biome = 'active',
    depthTier = 0,
    tutorial = false
} = {}) {
    if (tutorial || depthTier < 1 || !lattice?.length) return { doors, gates: [], accessSources: [] };
    const edges = buildLatticeEdges(lattice);
    const roomById = new Map((rooms ?? []).map((room) => [room.id, room]));
    const candidates = (doors ?? []).filter((door) => {
        const room = roomById.get(door.roomId);
        const doorway = room?.doors?.find((entry) => entry.id === door.id);
        if (!room || !doorway || doorway.neighborIndex < 0 || doorway.neighborIndex >= lattice.length) return false;
        const key = edgeKey(room.latticeIndex, doorway.neighborIndex);
        return edges.has(key) && isBridgeEdge(lattice.length, edges, key);
    });
    if (candidates.length === 0 || random() > Math.min(0.5, 0.16 + depthTier * 0.08)) {
        return { doors, gates: [], accessSources: [] };
    }

    const selected = candidates[Math.floor(random() * candidates.length)];
    const room = roomById.get(selected.roomId);
    const doorway = room.doors.find((entry) => entry.id === selected.id);
    const cutKey = edgeKey(room.latticeIndex, doorway.neighborIndex);
    const withoutGate = new Set(edges);
    withoutGate.delete(cutKey);
    const preGateNodes = reachableNodes(lattice.length, withoutGate, 0);
    if (!preGateNodes.has(0) || preGateNodes.size === lattice.length) {
        return { doors, gates: [], accessSources: [] };
    }
    const sourceRoom = (rooms ?? []).find((candidate) => preGateNodes.has(candidate.latticeIndex));
    if (!sourceRoom) return { doors, gates: [], accessSources: [] };

    const requirement = requirementFor(biome, depthTier);
    const gate = {
        id: `${selected.id}:gate`,
        doorId: selected.id,
        cutEdge: cutKey,
        requirement,
        protectedNodes: [...Array(lattice.length).keys()].filter((index) => !preGateNodes.has(index)),
        sourceRoomId: sourceRoom.id
    };
    return {
        doors: doors.map((door) => (
            door.id === selected.id ? { ...door, state: 'locked', lock: requirement, gateId: gate.id } : door
        )),
        gates: [gate],
        accessSources: [{
            id: `${gate.id}:source`,
            roomId: sourceRoom.id,
            requirement
        }]
    };
}
