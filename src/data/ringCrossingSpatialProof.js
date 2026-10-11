// Detached P0B spatial proof for a future ring_crossing_landmark redesign.
//
// This fixture is intentionally NOT exported from roomBuilds.js and must not
// enter ROOM_BUILD_CATALOG / ALL_ROOM_BUILDS. The live build owns progression
// infrastructure: gate_control becomes a mission-control access source and
// one stamped door receives the authoritative ringCrossingId/lock state. This
// object proves only shape, sockets, routes, anchors and camera readability.
export const RING_CROSSING_SPATIAL_PROOF = Object.freeze({
    id: 'ring_crossing_landmark_spatial_proof_v1',
    sourceBuildId: 'ring_crossing_landmark',
    detachedSpatialProof: true,
    family: 'spatial_proof',
    themeStyle: 'cathedral',
    partitionThickness: 0.5,
    // Compress at the south shoulders, reveal the recessed control through
    // one notch, then fork around the sealed back of the gatehouse and rejoin
    // at the north threshold. East/west sockets join the two branch lanes.
    pattern: Object.freeze([
        '.................',
        '.................',
        '.................',
        '.....#######.....',
        '.....#.....#.....',
        '.....#.....#.....',
        '.....#.....#.....',
        '.....###.###.....',
        '.................',
        '....###...###....',
        '....###...###....',
        '.................',
        '.................'
    ]),
    sockets: Object.freeze([
        Object.freeze({ id: 'approach', side: 's', width: 3, required: true }),
        Object.freeze({ id: 'farSide', side: 'n', width: 3, required: false }),
        Object.freeze({ id: 'flankEast', side: 'e', width: 3, required: false }),
        Object.freeze({ id: 'flankWest', side: 'w', width: 3, required: false })
    ]),
    rotationPolicy: 'cardinal',
    tierEligibility: Object.freeze([1, 2, 3, 4]),
    biomeEligibility: Object.freeze(['active', 'cryo', 'bio']),
    // Neutral by design: never make this fixture eligible for a reservation.
    roles: Object.freeze(['spatialProof']),
    structuralAnchors: Object.freeze([
        Object.freeze({ id: 'flank_pillar_a', type: 'prop_biomech_pillar_left', x: 5, y: 5 }),
        Object.freeze({ id: 'flank_pillar_b', type: 'prop_biomech_pillar_right', x: 11, y: 5 })
    ]),
    interactionAnchors: Object.freeze([
        Object.freeze({ id: 'gate_control', type: 'base_console', x: 8, y: 5 })
    ]),
    signatureAnchorId: 'gate_control',
    compassAnchors: Object.freeze({ approach: 'approach', objective: 'gate_control' }),
    coverZones: Object.freeze([
        Object.freeze({ x: 4, y: 3, w: 3, h: 5 }),
        Object.freeze({ x: 10, y: 3, w: 3, h: 5 }),
        Object.freeze({ x: 4, y: 9, w: 9, h: 2 })
    ]),
    encounterZones: Object.freeze([
        Object.freeze({ id: 'gate_staging', x: 2, y: 8, w: 13, h: 4 })
    ]),
    rewardAnchors: Object.freeze([]),
    loreAnchors: Object.freeze([
        Object.freeze({ id: 'gate_placard', type: 'lore_terminal', x: 13, y: 8 })
    ]),
    hazardZones: Object.freeze([]),
    quietZones: Object.freeze([
        Object.freeze({ x: 6, y: 4, w: 5, h: 4 })
    ]),
    safeZone: false,
    containmentBounds: Object.freeze({ minX: 0, minY: 0, maxX: 16, maxY: 12 }),
    presentationVariants: Object.freeze(['detachedSpatialProof']),
    stateVariants: Object.freeze(['unbound']),
    adjacency: Object.freeze({ prefers: [], forbids: [] }),
    contentBudget: Object.freeze({ structuralLarge: 2, activityZones: 2, pickupsMin: 0, enemiesMax: 4 })
});
