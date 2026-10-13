/**
 * Socket metadata for 3D props in Hunker-Bunker.
 *
 * Positions are in local model space (meters) relative to prop origin.
 * Normals define the outward trajectory of the conduit exiting the socket.
 */
export const PROP_SOCKET_REGISTRY = Object.freeze({
    // Heavy power generator: power out, coolant return
    prop_fusion_generator: Object.freeze([
        { id: 'power_out', type: 'cable', pos: [0.55, 0.45, -0.2], normal: [1, 0, 0], radius: 0.035, sides: 4, vAtlasOffset: 0.25 },
        { id: 'coolant_in', type: 'pipe', pos: [-0.55, 0.75, 0.1], normal: [-1, 0, 0], radius: 0.05, sides: 6, vAtlasOffset: 0.75 }
    ]),

    // Wall breaker / junction box
    prop_conduit_junction_box: Object.freeze([
        { id: 'feed_in', type: 'cable', pos: [0.0, -0.22, 0.12], normal: [0, -1, 0], radius: 0.03, sides: 3, vAtlasOffset: 0.25 },
        { id: 'branch_out', type: 'conduit', pos: [0.15, 0.0, 0.12], normal: [1, 0, 0], radius: 0.025, sides: 4, vAtlasOffset: 0.25 }
    ]),

    // Leaking coolant drum
    prop_coolant_drum_leaking_pool: Object.freeze([
        { id: 'discharge', type: 'pipe', pos: [0.0, 0.65, 0.25], normal: [0, 0, 1], radius: 0.045, sides: 6, vAtlasOffset: 0.75 }
    ]),

    // Wall cryo frost manifold
    prop_icey_frost_manifold: Object.freeze([
        { id: 'inlet_left', type: 'pipe', pos: [-0.4, 0.1, 0.1], normal: [-1, 0, 0], radius: 0.045, sides: 6, vAtlasOffset: 0.75 },
        { id: 'inlet_right', type: 'pipe', pos: [0.4, 0.1, 0.1], normal: [1, 0, 0], radius: 0.045, sides: 6, vAtlasOffset: 0.75 }
    ]),

    // Biomechanical incubator / pod
    prop_biomech_incubator: Object.freeze([
        { id: 'umbilical_top', type: 'trachea', pos: [0.0, 1.4, -0.4], normal: [0, 0.6, -0.8], radius: 0.06, sides: 6, vAtlasOffset: 0.5 },
        { id: 'drain_bottom', type: 'trachea', pos: [0.3, 0.15, 0.3], normal: [0.8, -0.2, 0], radius: 0.04, sides: 4, vAtlasOffset: 0.5 }
    ]),

    // Tracheal wall pipe
    prop_biomech_tracheal_wall_pipe: Object.freeze([
        { id: 'trachea_in', type: 'trachea', pos: [0.0, 0.25, 0.15], normal: [0, -1, 0], radius: 0.06, sides: 6, vAtlasOffset: 0.5 },
        { id: 'trachea_out', type: 'trachea', pos: [0.0, 2.15, 0.15], normal: [0, 1, 0], radius: 0.06, sides: 6, vAtlasOffset: 0.5 }
    ]),

    // Diagnostic console
    prop_diagnostic_console: Object.freeze([
        { id: 'data_feed', type: 'cable', pos: [0.0, 0.35, -0.25], normal: [0, -0.2, -1], radius: 0.025, sides: 3, vAtlasOffset: 0.25 }
    ]),

    // Overhead fluorescent fixture
    prop_overhead_cage_fluorescent: Object.freeze([
        { id: 'power_lead', type: 'cable', pos: [0.0, 0.15, 0.0], normal: [0, 1, 0], radius: 0.02, sides: 3, vAtlasOffset: 0.25 }
    ]),

    // Cable tray swag: dual sockets at opposite ends aligning to wall runs
    prop_wall_cable_tray_swag: Object.freeze([
        { id: 'tray_in', type: 'cable', pos: [-0.65, 0.0, 0.0], normal: [-1, 0, 0], radius: 0.035, sides: 4, vAtlasOffset: 0.25 },
        { id: 'tray_out', type: 'cable', pos: [0.65, 0.0, 0.0], normal: [1, 0, 0], radius: 0.035, sides: 4, vAtlasOffset: 0.25 }
    ]),

    // Vertebral cable riser: vertical riser transition
    prop_vertebral_cable_riser: Object.freeze([
        { id: 'riser_bottom', type: 'cable', pos: [0.0, 0.2, 0.1], normal: [0, -1, 0], radius: 0.04, sides: 4, vAtlasOffset: 0.25 },
        { id: 'riser_top', type: 'cable', pos: [0.0, 2.3, 0.1], normal: [0, 1, 0], radius: 0.04, sides: 4, vAtlasOffset: 0.25 }
    ]),

    // Biomechanical spore umbilical
    prop_biomech_spore_umbilical_cable: Object.freeze([
        { id: 'umbilical_root', type: 'trachea', pos: [0.0, 0.15, 0.0], normal: [0, -1, 0], radius: 0.05, sides: 6, vAtlasOffset: 0.5 },
        { id: 'umbilical_tip', type: 'trachea', pos: [0.0, 1.85, 0.0], normal: [0, 1, 0], radius: 0.04, sides: 6, vAtlasOffset: 0.5 }
    ]),
    prop_biomech_spore_umbilical_cable_rigged: Object.freeze([
        { id: 'umbilical_root', type: 'trachea', pos: [0.0, 0.15, 0.0], normal: [0, -1, 0], radius: 0.05, sides: 6, vAtlasOffset: 0.5 },
        { id: 'umbilical_tip', type: 'trachea', pos: [0.0, 1.85, 0.0], normal: [0, 1, 0], radius: 0.04, sides: 6, vAtlasOffset: 0.5 }
    ]),

    // Heavy life transformer bank
    life_transformer_bank: Object.freeze([
        { id: 'high_voltage_in', type: 'cable', pos: [-0.7, 1.2, 0.0], normal: [-1, 0, 0], radius: 0.045, sides: 4, vAtlasOffset: 0.25 },
        { id: 'bus_out', type: 'cable', pos: [0.7, 0.8, 0.0], normal: [1, 0, 0], radius: 0.04, sides: 4, vAtlasOffset: 0.25 }
    ]),

    // Wave relay dynamo
    engineer_wave_relay_dynamo: Object.freeze([
        { id: 'dynamo_feed', type: 'cable', pos: [0.0, 1.5, 0.3], normal: [0, 1, 0], radius: 0.04, sides: 4, vAtlasOffset: 0.25 },
        { id: 'relay_data', type: 'cable', pos: [0.4, 0.6, -0.2], normal: [1, 0, 0], radius: 0.025, sides: 3, vAtlasOffset: 0.25 }
    ]),

    // Hive assimilated generator
    hive_assimilated_generator: Object.freeze([
        { id: 'bio_power_out', type: 'trachea', pos: [0.5, 0.9, 0.0], normal: [1, 0, 0], radius: 0.055, sides: 6, vAtlasOffset: 0.5 },
        { id: 'pulse_core', type: 'cable', pos: [-0.4, 0.5, 0.2], normal: [-1, 0, 0], radius: 0.035, sides: 4, vAtlasOffset: 0.25 }
    ]),

    // Door motor assembly
    door_motor: Object.freeze([
        { id: 'power_in', type: 'cable', pos: [0.0, 0.1, 0.0], normal: [0, 1, 0], radius: 0.025, sides: 3, vAtlasOffset: 0.25 }
    ]),

    // Prop fabricator station
    prop_fabricator_station: Object.freeze([
        { id: 'power_in', type: 'cable', pos: [-0.4, 0.3, -0.3], normal: [0, 0, -1], radius: 0.035, sides: 4, vAtlasOffset: 0.25 },
        { id: 'coolant_in', type: 'pipe', pos: [0.4, 0.3, -0.3], normal: [0, 0, -1], radius: 0.045, sides: 6, vAtlasOffset: 0.75 }
    ])
});

/**
 * Returns socket definitions for a prop type if registered.
 * @param {string} type
 * @returns {readonly object[] | null}
 */
export function getPropSockets(type) {
    return PROP_SOCKET_REGISTRY[type] ?? null;
}
