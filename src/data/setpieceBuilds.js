// Serializable multi-chunk authored-place definitions. Keep this catalog free
// of renderer objects and executable callbacks so chosen claims can be written
// directly into a WorldPlan/checkpoint.

export const SETPIECE_BUILD_VERSION = 1;

export const SETPIECE_BUILD_CATALOG = Object.freeze([
    Object.freeze({
        version: SETPIECE_BUILD_VERSION,
        id: 'crossing_valley_bridge_v1',
        family: 'ringCrossing',
        footprint: Object.freeze([
            Object.freeze({ dx: 0, dy: 1 }),
            Object.freeze({ dx: 0, dy: 0 }),
            Object.freeze({ dx: 0, dy: -1 })
        ]),
        pivot: Object.freeze({ dx: 0, dy: 0 }),
        eligibility: Object.freeze({
            rings: Object.freeze([1]),
            biomes: Object.freeze(['active', 'cryo']),
            roles: Object.freeze(['ringCrossing'])
        }),
        transformPolicy: Object.freeze({ rotations: Object.freeze([0, 1, 2, 3]), reflect: false }),
        sockets: Object.freeze([
            Object.freeze({ id: 'approach', at: Object.freeze({ dx: 0, dy: 1 }), side: 's', width: 3, required: true }),
            Object.freeze({ id: 'farSide', at: Object.freeze({ dx: 0, dy: -1 }), side: 'n', width: 3, required: true })
        ]),
        modules: Object.freeze([
            Object.freeze({ id: 'bridge_approach', at: Object.freeze({ dx: 0, dy: 1 }), routeAxis: 'ns' }),
            Object.freeze({ id: 'bridge_span', at: Object.freeze({ dx: 0, dy: 0 }), routeAxis: 'ns' }),
            Object.freeze({ id: 'bridge_far_abutment', at: Object.freeze({ dx: 0, dy: -1 }), routeAxis: 'ns' })
        ]),
        stages: Object.freeze(['ruined', 'surveyed', 'scaffolded', 'complete']),
        initialStage: 'ruined',
        anchors: Object.freeze([
            Object.freeze({ id: 'bridge_workbench', moduleId: 'bridge_approach' }),
            Object.freeze({ id: 'bridge_crossing', moduleId: 'bridge_span' })
        ]),
        zones: Object.freeze([
            Object.freeze({ id: 'fall_hazard', kind: 'hazard', moduleId: 'bridge_span' })
        ]),
        criticalRoute: Object.freeze(['approach', 'bridge_crossing', 'farSide'])
    })
]);
