// Authored macro plan for the long maze. Terrain remains seed-varied, while
// these reservations keep major story rooms ordered, spaced, and connected.

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
