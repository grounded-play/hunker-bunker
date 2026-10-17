/**
 * Base construction module catalog and socket contracts.
 *
 * Defines structural pieces, life-support machinery, furniture, and recovered
 * ship components for the base rebuild and sealed-room oxygen loop.
 */

export const BASE_MODULE_CATEGORIES = Object.freeze({
    STRUCTURE: 'structure',
    LIFE_SUPPORT: 'life_support',
    FURNITURE: 'furniture',
    SHIP_PART: 'ship_part'
});

export const BASE_ARCADE_BANK_COST = Object.freeze({ tech: 25, coin: 30, med: 5 });

export const BASE_MODULE_CATALOG = Object.freeze({
    // Structural panels
    floor_plate_1x1: Object.freeze({
        id: 'floor_plate_1x1',
        label: 'COMPOSITE FLOOR PLATE',
        category: BASE_MODULE_CATEGORIES.STRUCTURE,
        footprint: { w: 1, d: 1, h: 0.1 },
        socketTypes: ['floor_snap'],
        seals: ['bottom'],
        buildCost: { scrap: 5 },
        massClass: 'medium',
        buildTags: ['floor', 'structural']
    }),
    straight_wall_1x1: Object.freeze({
        id: 'straight_wall_1x1',
        label: 'SEALED BULKHEAD WALL',
        category: BASE_MODULE_CATEGORIES.STRUCTURE,
        modelType: 'wall_macro_straight_4',
        footprint: { w: 1, d: 0.2, h: 2.8 },
        socketTypes: ['wall_edge_snap'],
        seals: ['vertical_perimeter'],
        buildCost: { scrap: 8 },
        massClass: 'heavy',
        buildTags: ['wall', 'structural', 'airtight']
    }),
    corner_wall_1x1: Object.freeze({
        id: 'corner_wall_1x1',
        label: 'CORNER REINFORCED WALL',
        category: BASE_MODULE_CATEGORIES.STRUCTURE,
        modelType: 'wall_macro_buttress_3',
        footprint: { w: 1, d: 1, h: 2.8 },
        socketTypes: ['wall_corner_snap'],
        seals: ['vertical_corner'],
        buildCost: { scrap: 10 },
        massClass: 'heavy',
        buildTags: ['wall', 'corner', 'structural', 'airtight']
    }),
    door_frame_1x1: Object.freeze({
        id: 'door_frame_1x1',
        label: 'HERMETIC DOOR FRAME',
        category: BASE_MODULE_CATEGORIES.STRUCTURE,
        modelType: 'door_arch_guillotine_frame',
        footprint: { w: 1, d: 0.2, h: 2.8 },
        socketTypes: ['doorway_snap'],
        seals: ['door_jambs'],
        buildCost: { scrap: 12 },
        massClass: 'heavy',
        buildTags: ['frame', 'structural']
    }),
    sealable_door_1x1: Object.freeze({
        id: 'sealable_door_1x1',
        label: 'AIRTIGHT BLAST DOOR',
        category: BASE_MODULE_CATEGORIES.STRUCTURE,
        modelType: 'base_door_sealable_bulkhead',
        footprint: { w: 1, d: 0.2, h: 2.6 },
        socketTypes: ['door_mount'],
        seals: ['door_seal'],
        buildCost: { scrap: 15, components: 2 },
        massClass: 'heavy',
        buildTags: ['door', 'airtight']
    }),
    ceiling_panel_1x1: Object.freeze({
        id: 'ceiling_panel_1x1',
        label: 'THERMAL CEILING PANEL',
        category: BASE_MODULE_CATEGORIES.STRUCTURE,
        footprint: { w: 1, d: 1, h: 0.1 },
        socketTypes: ['ceiling_snap'],
        seals: ['top'],
        buildCost: { scrap: 6 },
        massClass: 'medium',
        buildTags: ['ceiling', 'structural', 'airtight']
    }),
    hull_patch_panel: Object.freeze({
        id: 'hull_patch_panel',
        label: 'CRASH-HULL PATCH PANEL',
        category: BASE_MODULE_CATEGORIES.STRUCTURE,
        modelType: 'crash_hull_panels',
        damagedModelType: 'state_wall_breached_01',
        breachedModelType: 'state_wall_breached_02',
        carryModelType: 'crash_hull_panels',
        footprint: { w: 1, d: 0.2, h: 2.4 },
        socketTypes: ['wall_edge_snap'],
        seals: ['vertical_perimeter'],
        massClass: 'heavy',
        buildTags: ['wall', 'hull_patch', 'structural', 'airtight']
    }),
    door_seal_kit: Object.freeze({
        id: 'door_seal_kit',
        label: 'BERTH PRESSURE-DOOR SEAL',
        category: BASE_MODULE_CATEGORIES.STRUCTURE,
        modelType: 'base_door_sealable_bulkhead',
        damagedModelType: 'state_wall_breached_02',
        breachedModelType: 'state_wall_breached_03',
        carryModelType: 'mod_pressure_seal',
        footprint: { w: 1, d: 0.2, h: 2.6 },
        socketTypes: ['door_mount'],
        seals: ['door_seal'],
        massClass: 'medium',
        buildTags: ['door', 'seal_kit', 'airtight']
    }),

    // Life support and utilities
    o2_regulator: Object.freeze({
        id: 'o2_regulator',
        label: 'O2 ATMOSPHERIC REGULATOR',
        category: BASE_MODULE_CATEGORIES.LIFE_SUPPORT,
        modelType: 'base_o2_atmospheric_regulator',
        footprint: { w: 0.8, d: 0.8, h: 1.6 },
        socketTypes: ['machinery_mount'],
        o2OutputRate: 25.0, // cubic meters per second equivalent
        powerDraw: 10.0,
        buildCost: { scrap: 20, components: 3 },
        massClass: 'heavy',
        buildTags: ['life_support', 'o2_producer']
    }),
    o2_duct: Object.freeze({
        id: 'o2_duct',
        label: 'PRESSURIZATION DUCT',
        category: BASE_MODULE_CATEGORIES.LIFE_SUPPORT,
        modelType: 'base_o2_overhead_duct',
        footprint: { w: 1, d: 0.3, h: 0.3 },
        socketTypes: ['overhead_tray'],
        buildCost: { scrap: 4 },
        massClass: 'light',
        buildTags: ['duct', 'airtight']
    }),
    power_junction: Object.freeze({
        id: 'power_junction',
        label: 'BASE POWER JUNCTION',
        category: BASE_MODULE_CATEGORIES.LIFE_SUPPORT,
        modelType: 'base_power_junction_box',
        footprint: { w: 0.4, d: 0.3, h: 0.6 },
        socketTypes: ['wall_socket'],
        buildCost: { scrap: 5, wire: 2 },
        massClass: 'light',
        buildTags: ['utility', 'power']
    }),

    // Furniture
    cot_bed: Object.freeze({
        id: 'cot_bed',
        label: 'EXPEDITION RECOVERY COT',
        category: BASE_MODULE_CATEGORIES.FURNITURE,
        modelType: 'base_cot_installed',
        carryModelType: 'carry_field_cot_folded',
        footprint: { w: 1.0, d: 2.0, h: 0.6 },
        socketTypes: ['interior_floor_snap'],
        buildCost: { scrap: 10, fabric: 4 },
        massClass: 'heavy',
        buildTags: ['furniture', 'bed', 'sleep_anchor']
    }),
    storage_rack: Object.freeze({
        id: 'storage_rack',
        label: 'MODULAR CARGO RACK',
        category: BASE_MODULE_CATEGORIES.FURNITURE,
        footprint: { w: 1.2, d: 0.6, h: 1.8 },
        socketTypes: ['interior_floor_snap'],
        buildCost: { scrap: 8 },
        massClass: 'medium',
        buildTags: ['storage']
    }),
    arcade_blackjack_cabinet: Object.freeze({
        id: 'arcade_blackjack_cabinet',
        label: 'BLACK-ICE 21 CABINET',
        category: BASE_MODULE_CATEGORIES.FURNITURE,
        modelType: 'life_arcade_cabinet',
        footprint: { w: 1.0, d: 1.0, h: 1.8 },
        socketTypes: ['interior_floor_snap', 'recreation_socket', 'arcade'],
        buildCost: { tech: 25, coin: 30, scrap: 15 },
        bankBuildCost: BASE_ARCADE_BANK_COST,
        massClass: 'heavy',
        buildTags: ['furniture', 'arcade', 'minigame', 'blackjack']
    }),

    // Run-scoped objective cargo. These use the same two-hand reducer as base
    // modules but are delivered to characters/ship staging instead of sockets.
    camp_salvage_probe: Object.freeze({
        id: 'camp_salvage_probe',
        label: 'HORIZON METRIC PROBE',
        category: BASE_MODULE_CATEGORIES.SHIP_PART,
        modelType: 'scout_tracking_beacon_core',
        carryModelType: 'scout_tracking_beacon_core',
        footprint: { w: 0.8, d: 0.8, h: 1.1 },
        socketTypes: [],
        massClass: 'medium',
        buildTags: ['camp_delivery', 'probe', 'mission_cargo']
    }),
    hive_air_membrane: Object.freeze({
        id: 'hive_air_membrane',
        label: 'LIVING AIR MEMBRANE',
        category: BASE_MODULE_CATEGORIES.SHIP_PART,
        modelType: 'hive_pulmonary_bellows',
        carryModelType: 'hive_pulmonary_bellows',
        footprint: { w: 1.0, d: 0.8, h: 1.0 },
        socketTypes: [],
        massClass: 'heavy',
        buildTags: ['hive_cargo', 'living_cargo', 'base_delivery', 'mission_cargo']
    }),

    // Recovered Ship Modules
    ship_navigation_core: Object.freeze({
        id: 'ship_navigation_core',
        label: 'STELLAR NAVIGATION CORE',
        category: BASE_MODULE_CATEGORIES.SHIP_PART,
        modelType: 'ship_module_navigation_core',
        carryModelType: 'ship_module_navigation_core',
        footprint: { w: 1.0, d: 1.0, h: 1.4 },
        socketTypes: ['ship_bay_core'],
        massClass: 'heavy',
        buildTags: ['ship_part', 'navigation']
    }),
    ship_comms_array: Object.freeze({
        id: 'ship_comms_array',
        label: 'SUB-ETHER COMMS ARRAY',
        category: BASE_MODULE_CATEGORIES.SHIP_PART,
        modelType: 'ship_module_comms_transceiver',
        carryModelType: 'ship_module_comms_transceiver',
        footprint: { w: 0.8, d: 0.8, h: 2.2 },
        socketTypes: ['ship_bay_mount'],
        massClass: 'heavy',
        buildTags: ['ship_part', 'comms']
    }),
    ship_engine_manifold: Object.freeze({
        id: 'ship_engine_manifold',
        label: 'THERMAL THRUST MANIFOLD',
        category: BASE_MODULE_CATEGORIES.SHIP_PART,
        modelType: 'ship_module_engine_manifold',
        carryModelType: 'ship_module_engine_manifold',
        footprint: { w: 1.5, d: 1.0, h: 1.2 },
        socketTypes: ['ship_bay_engine'],
        massClass: 'heavy',
        buildTags: ['ship_part', 'engine']
    }),
    ship_life_support_core: Object.freeze({
        id: 'ship_life_support_core',
        label: 'SHIP LIFE-SUPPORT SYSTEM',
        category: BASE_MODULE_CATEGORIES.SHIP_PART,
        modelType: 'ship_module_life_support_core',
        carryModelType: 'ship_module_life_support_core',
        footprint: { w: 1.2, d: 1.2, h: 1.8 },
        socketTypes: ['ship_bay_life'],
        o2OutputRate: 50.0,
        massClass: 'heavy',
        buildTags: ['ship_part', 'life_support', 'o2_producer']
    })
});

export function getBaseModuleDefinition(id) {
    return BASE_MODULE_CATALOG[id] ?? null;
}
