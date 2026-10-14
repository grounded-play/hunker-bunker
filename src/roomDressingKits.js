/**
 * Lived-in room dressing kits (src/roomDressing.js plans with these).
 *
 * Every type here is a shipped asset: a sized GLB in world3dOverlay's
 * WORLD_3D_MODELS, or a decal/scatter PNG in public/ (roomDressingKits.test.js
 * enforces both). Kits are chosen by theme family (the id prefix in
 * roomThemes.js ROOM_THEME_CATALOG), then extended by the room's role.
 *
 *   wallProps     stand against a wall, back to it, facing into the room
 *   wallDecals    flat on a wall face at eye height
 *   clutter       small floor items in the ring of cells along the walls
 *   corners       heavier pieces in concave corners
 *   floorDecals   flat story on the floor (spills, trails, scorch, growth)
 *
 * `mountY` lifts a wall prop off the floor (sconces, clocks, light cages).
 */
export const WALL_MOUNT_HEIGHT = Object.freeze({
    fixture_sconce_vine: 1.45,
    fixture_clock_dead: 1.65,
    prop_overhead_cage_fluorescent: 1.95,
    prop_wall_cable_tray_swag: 1.25,
    prop_exhaust_blower_fan_hood: 1.85,
    prop_ceiling_crane_hoist: 2.15,
    arch_window_stained: 0.45,
    prop_light_cluster_dripping: 1.35
});

const COMMON = Object.freeze({
    wallDecals: ['decal_rust_bleed_1', 'decal_rust_bleed_2', 'decal_water_stain', 'decal_hand_smears_1',
        'decal_graffiti_tally_1', 'decal_graffiti_tally_2', 'decal_bullet_holes', 'decal_scars'],
    clutter: ['scatter_bolts', 'scatter_cable_coil', 'bunker_junk_uncommon', 'bunker_junk_rare'],
    floorDecals: ['decal_oil_spill_patch', 'decal_footprints_mud', 'decal_grease_pool', 'decal_friction_burn']
});

export const DRESSING_KITS = Object.freeze({
    bunker: {
        wallProps: ['prop_wall_cable_tray_swag', 'prop_conduit_junction_box', 'prop_locker_bulged',
            'prop_exhaust_blower_fan_hood', 'prop_terminal_ruptured', 'fixture_clock_dead', 'prop_overhead_cage_fluorescent',
            'life_memorial_board', 'life_tally_bulkhead', 'life_vending_machine', 'life_mask_rack',
            'life_cochlear_intercom', 'life_ribcage_rescue_cabinet', 'life_pneumatic_tube_node',
            'life_fire_station', 'life_server_racks', 'life_planning_board', 'life_filing_cabinets',
            'corp_interrogation_chair', 'corp_debt_severing_kiosk', 'corp_incinerator_hopper',
            'corp_biometric_collar_chute', 'chen_sealed_confession_console', 'decon_exosuit_scrubber_station'],
        wallDecals: [...COMMON.wallDecals, 'decal_wall_panel_grille_01', 'decal_wall_panel_grille_02', 'decal_hazard_stripes',
            'decal_meridian_stencil', 'prop_torn_warning_poster', 'decal_substation_stencil', 'decal_wall_conduit_patch',
            'decal_wall_grime_drip', 'decal_wall_breach', 'decal_pod_312_rupture_splatter'],
        clutter: [...COMMON.clutter, 'prop_storage_drum_dented', 'prop_camp_crates', 'prop_valve_wheel_fused', 'prop_vent_grate_exploded',
            'life_footlocker_open', 'life_galley_hotplate', 'life_sanitation_bidet', 'life_vulval_drain_sump',
            'camp_water_barrel', 'salvage_tagged_heap', 'life_arcade_cabinet'],
        corners: ['prop_storage_drum_dented', 'prop_ammo_crate_stack', 'prop_maintenance_tool_cart', 'state_column_shattered',
            'life_bunk_stack', 'life_suit_drying_rack', 'life_latrine_stall', 'life_pallet_racking', 'life_forklift',
            'life_transformer_bank', 'life_conveyor_section', 'life_laundry_machines', 'life_weight_bench',
            'life_overseer_desk', 'life_scaffold_tower', 'life_cistern_tank',
            'corp_suppression_barrier', 'corp_executive_sarcophagus', 'ind_biomass_grinder', 'ind_hydraulic_manifold', 'ind_fuel_rod_cask',
            'tank_orbital_siege_cannon', 'evac_four_seat_cockpit_module', 'evac_manifest_allocation_terminal', 'evac_preflight_fuel_umbilical'],
        floorDecals: [...COMMON.floorDecals, 'decal_floor_grate_01', 'decal_floor_grate_02', 'decal_floor_grate_04', 'decal_scorch_bloom', 'prop_blood_trail',
            'decal_electrical_scorch', 'decal_hazard_chevron', 'decal_door_wear_apron', 'decal_junction_turn_wear',
            'decal_strip_cart_ruts', 'decal_walkway_borders', 'decal_strip_drag_marks', 'decal_puddle_slick',
            'decal_strip_drain_gutter', 'decal_corner_grit_pocket',
            'decal_strip_arterial_spray', 'decal_strip_high_voltage_scorch', 'decal_execution_wall_splatter',
            'decal_pod_312_rupture_splatter', 'decal_strip_exosuit_coolant']
    },
    cryo: {
        wallProps: ['prop_icey_frost_manifold', 'prop_wall_cable_tray_swag', 'prop_conduit_junction_box', 'prop_locker_bulged',
            'prop_decon_eyewash_shower_station', 'prop_overhead_cage_fluorescent', 'fixture_clock_dead', 'life_parka_hooks',
            'cryo_frozen_cascade', 'cryo_ruptured_pod', 'bay_c_pod_312_rupture', 'suture_mercy_cocoon_canopy'],
        wallDecals: ['decal_water_stain', 'decal_rust_bleed_1', 'decal_hand_smears_1', 'decal_hand_smears_2',
            'decal_graffiti_tally_1', 'decal_wall_panel_grille_03', 'decal_biohazard_stencil', 'decal_scars',
            'decal_permafrost_icicles', 'decal_wall_grime_drip', 'decal_pod_312_rupture_splatter'],
        clutter: [...COMMON.clutter, 'prop_body_human_frozen', 'prop_storage_drum_dented', 'prop_vent_grate_exploded',
            'life_water_still', 'life_footlocker_open', 'life_vulval_drain_sump', 'camp_water_barrel'],
        corners: ['prop_icey_thermal_pod', 'prop_coolant_drum_leaking_pool', 'prop_icey_frost_vent', 'state_column_shattered',
            'life_cargo_pallet_netted', 'life_barrel_heater', 'life_sleep_sleeve',
            'life_ice_sled', 'life_ice_core_rack', 'life_ice_bore_winch', 'cryo_ice_crawler', 'cryo_snowbound_crates',
            'cryo_heater_station', 'cryo_ice_blocks', 'life_cistern_tank',
            'cryo_cannibal_butchery_table', 'cryo_ice_core_specimen', 'cryo_thawing_trough', 'cryo_frozen_shelter_pod',
            'sector_zero_bore_drillhead', 'relay_false_beacon_spire'],
        floorDecals: ['decal_frost_bloom_1', 'decal_frost_bloom_2', 'decal_condensation_run', 'scatter_coolant_puddle',
            'decal_footprints_mud', 'decal_floor_grate_03', 'decal_cryo_fracture', 'decal_door_wear_apron',
            'decal_strip_cart_ruts', 'decal_sled_tracks', 'decal_strip_drag_marks', 'decal_puddle_slick',
            'decal_strip_drain_gutter', 'decal_corner_grit_pocket', 'decal_strip_frost_heave',
            'decal_pod_312_rupture_splatter', 'decal_strip_exosuit_coolant']
    },
    bio: {
        wallProps: ['prop_biomech_tracheal_wall_pipe', 'prop_vertebral_cable_riser', 'prop_biomech_flesh_locker',
            'fixture_sconce_vine', 'prop_light_cluster_dripping', 'prop_biomech_respirator', 'life_mask_rack',
            'life_umbilical_tether', 'life_lung_filter_bellows', 'life_vertebral_restraint_rack',
            'life_brood_comb', 'life_fungal_cable_bundle', 'hive_resin_pillar', 'hive_tendril_arch',
            'hive_vivisected_engineer', 'hive_visceral_ovipositor', 'hive_sphincter_iris', 'hive_pulmonary_bellows',
            'vass_hybrid_embryo_incubator', 'carapace_sentry_chrysalis'],
        wallDecals: ['decal_spore_stain_01', 'decal_spore_stain_02', 'decal_spore_stain_03', 'decal_vine_iron_shadow_1',
            'decal_vine_iron_shadow_2', 'decal_claw_scratches', 'decal_bite_marks_02', 'decal_hand_smears_2',
            'decal_wall_grime_drip', 'decal_hive_growth', 'decal_vass_acoustic_diagram'],
        clutter: ['prop_hive_resin_sac', 'state_growth_overrun_2', 'scatter_bolts', 'scatter_cable_coil',
            'prop_biomech_respirator', 'prop_cave_bones', 'bunker_junk_rare', 'prop_body_empty_exosuit',
            'life_sanitation_bidet', 'life_vulval_drain_sump', 'life_peristaltic_feeder', 'life_scent_distiller'],
        corners: ['state_growth_overrun_1', 'state_growth_overrun_2', 'prop_hive_resin_sac', 'prop_fungal_resin_basin',
            'life_sleep_sleeve', 'life_resin_extractor', 'life_pheromone_censer', 'life_warmth_hearth',
            'life_hive_dew_funnel', 'life_hive_feeding_bladder', 'life_assimilated_desk', 'hive_assimilated_generator',
            'hive_brood_dome', 'hive_cocooned_crew', 'hive_pheromone_node', 'life_algae_tank',
            'hive_gestation_sac', 'hive_amniotic_feeder_trough', 'tina_molted_carapace', 'tina_covert_nursery_chest', 'tina_mimic_vanity', 'tina_trophy_trove',
            'queen_royal_brood_throne', 'royal_egg_clutch_caul', 'vass_acoustic_resonator_tank'],
        floorDecals: ['decal_growth_creep_1', 'decal_growth_creep_2', 'decal_spore_growth_patch', 'scatter_slime_puddle',
            'decal_fluid_seep', 'prop_blood_trail', 'decal_bio_mycelium', 'decal_chitin_cluster', 'decal_bio_spore_vent',
            'decal_door_wear_apron', 'decal_strip_hive_veins', 'decal_puddle_slick', 'decal_flesh_press',
            'decal_strip_drain_gutter', 'decal_corner_grit_pocket',
            'decal_strip_umbilical_veins', 'decal_strip_acid_trench', 'decal_queen_oviposition_pool',
            'decal_strip_crawler_acid', 'decal_vass_acoustic_diagram']
    },
    camp: {
        wallProps: ['prop_wall_cable_tray_swag', 'prop_locker_bulged', 'fixture_sconce_vine', 'prop_overhead_cage_fluorescent',
            'life_memorial_board', 'life_tally_bulkhead', 'life_mask_rack',
            'meridian_cyber_graft_bench', 'meridian_servitor_dock', 'vesper_reloading_station',
            'crawler_signal_antenna_rig', 'scout_tracking_beacon_core'],
        wallDecals: [...COMMON.wallDecals, 'decal_graffiti_tally_2', 'prop_torn_warning_poster', 'decal_camp_map',
            'decal_childlike_cave_map', 'decal_wall_grime_drip', 'decal_vass_acoustic_diagram'],
        clutter: ['prop_camp_crates', 'prop_camp_crate', 'prop_camp_cot', 'scatter_bolts', 'scatter_cable_coil', 'bunker_junk_uncommon',
            'life_footlocker_open', 'life_galley_hotplate', 'life_sanitation_bidet', 'life_vulval_drain_sump',
            'camp_water_barrel'],
        corners: ['prop_camp_sandbags', 'state_barricade_improvised_1', 'state_barricade_improvised_2', 'prop_storage_drum_dented',
            'life_latrine_stall', 'life_barrel_heater', 'life_pipe_hammock', 'life_hydro_rack',
            'life_barber_chair', 'life_devotion_tree', 'camp_canvas_tent', 'life_cistern_tank', 'salvage_tagged_heap',
            'meridian_mainframe_altar', 'meridian_capacitor_bomb', 'tallow_compost_fermenter', 'tallow_spore_cradle',
            'tallow_flesh_trellis', 'tallow_sacrificial_altar', 'vesper_amputation_rig', 'vesper_autocannon_bipod', 'vesper_hanging_cage',
            'engineer_wave_relay_dynamo', 'tank_orbital_siege_cannon'],
        floorDecals: ['decal_footprints_mud', 'decal_oil_spill_patch', 'decal_tallow_symbol', 'prop_blood_trail', 'decal_evac_treads',
            'decal_door_wear_apron', 'decal_strip_cart_ruts', 'decal_strip_drag_marks', 'decal_puddle_slick',
            'decal_abandoned_meal_tray', 'decal_worker_sleep_roll', 'decal_corner_grit_pocket', 'decal_strip_viscera_drag',
            'decal_strip_crawler_acid', 'decal_vass_acoustic_diagram']
    },
    cathedral: {
        wallProps: ['arch_niche_shrine', 'arch_window_stained', 'prop_vertebral_cable_riser', 'fixture_sconce_vine',
            'prop_biomech_tracheal_wall_pipe', 'prop_overhead_cage_fluorescent'],
        wallDecals: ['decal_wall_panel_relief', 'decal_lacquer_blister_01', 'decal_lacquer_blister_02', 'decal_lacquer_blister_03',
            'decal_mirror_tarnished', 'decal_maintenance_shrine', 'decal_vine_iron_shadow_1', 'decal_rust_bleed_2',
            'decal_giger_relief', 'decal_wall_grime_drip', 'decal_vass_acoustic_diagram'],
        clutter: ['scatter_bolts', 'scatter_cable_coil', 'bunker_junk_rare', 'prop_cave_bones',
            'life_pheromone_censer', 'life_sanitation_bidet', 'life_vulval_drain_sump'],
        corners: ['arch_pillar_buttress_01', 'arch_pillar_buttress_02', 'arch_pillar_buttress_03', 'arch_pillar_buttress_04',
            'life_confessional', 'life_devotion_tree',
            'chasm_hanging_elevator', 'chasm_suicide_ledge_cross', 'chasm_dredge_hook_crane', 'crash_cockpit_canopy',
            'chen_sealed_confession_console', 'vass_acoustic_resonator_tank'],
        floorDecals: ['decal_floor_medallion_01', 'decal_floor_medallion_02', 'decal_floor_medallion_03', 'decal_floor_medallion_04',
            'decal_fluid_seep', 'decal_growth_creep_1', 'decal_cathedral_runic', 'decal_strip_drag_marks',
            'decal_puddle_slick', 'decal_corner_grit_pocket',
            'decal_vass_acoustic_diagram', 'decal_pod_312_rupture_splatter']
    }
});

// Key-art composition profiles. Density is deliberately uneven: authored
// negative space and a few strong silhouettes read better than uniform noise.
export const DRESSING_PROFILES = Object.freeze({
    bunker: Object.freeze({ wallDecalChance: 0.30, wallPropChance: 0.38, cornerChance: 0.78, clutterChance: 0.36, wallDecalSpacing: 3, floorClusters: [1, 2] }),
    cryo: Object.freeze({ wallDecalChance: 0.24, wallPropChance: 0.36, cornerChance: 0.72, clutterChance: 0.30, wallDecalSpacing: 3, floorClusters: [1, 2] }),
    bio: Object.freeze({ wallDecalChance: 0.34, wallPropChance: 0.42, cornerChance: 0.86, clutterChance: 0.40, wallDecalSpacing: 2, floorClusters: [1, 3] }),
    camp: Object.freeze({ wallDecalChance: 0.24, wallPropChance: 0.34, cornerChance: 0.82, clutterChance: 0.46, wallDecalSpacing: 3, floorClusters: [1, 2] }),
    cathedral: Object.freeze({ wallDecalChance: 0.20, wallPropChance: 0.34, cornerChance: 0.76, clutterChance: 0.24, wallDecalSpacing: 4, floorClusters: [1, 2] })
});

/** Role additions layered on the family kit. */
export const ROLE_DRESSING = Object.freeze({
    medical: {
        wallProps: ['prop_vital_monitor'],
        wallDecals: ['decal_biohazard_stencil', 'decal_wall_grime_drip'],
        clutter: ['prop_surgical_cart', 'life_bone_clamp_rig', 'life_sensory_chair'],
        corners: ['life_infusion_cradle', 'life_pelvic_autopsy_trough', 'life_covered_stretcher'],
        floorDecals: ['decal_bio_sample_spill', 'decal_puddle_slick', 'decal_failed_decon_kit']
    },
    'cryo-lab': {
        wallProps: ['prop_vital_monitor'],
        wallDecals: ['decal_permafrost_icicles', 'decal_biohazard_stencil'],
        clutter: ['prop_surgical_cart', 'life_water_still', 'life_bone_clamp_rig'],
        corners: ['life_infusion_cradle', 'life_pelvic_autopsy_trough', 'life_covered_stretcher'],
        floorDecals: ['decal_bio_sample_spill', 'scatter_coolant_puddle', 'decal_emergency_oxygen_nest']
    },
    security: {
        wallProps: ['life_vertebral_restraint_rack'],
        wallDecals: ['decal_bullet_holes', 'decal_hazard_stripes', 'decal_substation_stencil', 'decal_wall_breach'],
        clutter: ['prop_ammo_crate_stack', 'life_ammo_ovipositor'],
        corners: ['state_barricade_improvised_1', 'life_checkpoint_post'],
        floorDecals: ['decal_friction_burn', 'decal_barricade_last_stand']
    },
    armory: {
        wallDecals: ['decal_hazard_stripes', 'decal_meridian_stencil'],
        clutter: ['prop_ammo_crate_stack'],
        corners: ['prop_ammo_crate_stack', 'life_reloading_bench', 'life_ammo_ovipositor'],
        floorDecals: ['decal_strip_cart_ruts', 'decal_barricade_last_stand']
    },
    storage: {
        wallDecals: ['decal_hazard_stripes', 'decal_wall_conduit_patch'],
        clutter: ['prop_bunker_supplies', 'prop_storage_drum_dented', 'life_footlocker_open'],
        corners: ['prop_camp_crates', 'life_cargo_pallet_netted', 'life_janitor_cart', 'life_ice_sled'],
        floorDecals: ['decal_walkway_borders', 'decal_strip_cart_ruts', 'decal_strip_drag_marks', 'decal_oil_spill_patch']
    },
    reward: { clutter: ['prop_bunker_supplies'], corners: ['prop_ammo_crate_stack'] },
    engineering: {
        wallProps: ['prop_conduit_junction_box', 'prop_wall_cable_tray_swag', 'prop_exhaust_blower_fan_hood', 'prop_pipe_organ_heat_exchanger', 'prop_exosuit_docking_gantry', 'life_lung_filter_bellows',
            'life_fuse_bypass_panel'],
        wallDecals: ['decal_wall_conduit_patch', 'decal_wall_grime_drip', 'decal_hazard_stripes'],
        clutter: ['prop_maintenance_tool_cart', 'scatter_cable_coil', 'scatter_bolts', 'life_umbilical_tether'],
        corners: ['prop_oxygen_bottle_cascade_rack', 'prop_coolant_drum_leaking_pool', 'prop_floor_drainage_sump_trough', 'life_fuel_probe_boom',
            'life_welding_station', 'life_exosuit_teardown'],
        floorDecals: ['decal_grease_pool', 'decal_oil_spill_patch', 'scatter_coolant_puddle', 'decal_floor_grate_01', 'decal_strip_cart_ruts', 'decal_puddle_slick']
    },
    workshop: {
        wallProps: ['prop_conduit_junction_box', 'prop_wall_cable_tray_swag', 'prop_exhaust_blower_fan_hood', 'prop_pipe_organ_heat_exchanger', 'prop_exosuit_docking_gantry', 'life_lung_filter_bellows',
            'life_fuse_bypass_panel'],
        wallDecals: ['decal_wall_conduit_patch', 'decal_wall_grime_drip', 'decal_hazard_stripes'],
        clutter: ['prop_maintenance_tool_cart', 'scatter_cable_coil', 'scatter_bolts', 'life_umbilical_tether'],
        corners: ['prop_oxygen_bottle_cascade_rack', 'prop_coolant_drum_leaking_pool', 'prop_floor_drainage_sump_trough', 'life_fuel_probe_boom',
            'life_welding_station', 'life_exosuit_teardown'],
        floorDecals: ['decal_grease_pool', 'decal_oil_spill_patch', 'scatter_coolant_puddle', 'decal_floor_grate_01', 'decal_strip_cart_ruts', 'decal_puddle_slick']
    }
});

/**
 * Physically grounded world scale for every decal/texture type (metres).
 * Large structural features (cart ruts, walkways, vehicle treads) are 2m-3.2m;
 * major floor hazards and grates are 1.3m-1.9m; wall panels and drips are 1m-2.2m;
 * stencils and posters are 0.65m-1.1m; micro-details (bullets, footprints, tallies) are 0.4m-0.75m.
 */
export const DECAL_WORLD_SCALES = Object.freeze({
    // Long paths, strips, boundary lines and cart ruts (2.0m - 3.2m)
    decal_strip_cart_ruts: Object.freeze({ min: 2.6, max: 3.2 }),
    decal_walkway_borders: Object.freeze({ min: 2.4, max: 3.0 }),
    decal_strip_drag_marks: Object.freeze({ min: 2.2, max: 2.8 }),
    decal_strip_hive_veins: Object.freeze({ min: 2.2, max: 2.8 }),
    decal_sled_tracks: Object.freeze({ min: 2.4, max: 3.0 }),
    decal_door_wear_apron: Object.freeze({ min: 2.0, max: 2.5 }),
    decal_junction_turn_wear: Object.freeze({ min: 2.0, max: 2.5 }),
    prop_blood_trail: Object.freeze({ min: 1.8, max: 2.4 }),
    decal_evac_treads: Object.freeze({ min: 1.8, max: 2.4 }),

    // World story expansion strips and decals (2026-10-12)
    decal_strip_arterial_spray: Object.freeze({ min: 2.6, max: 3.4 }),
    strip_arterial_spray_trail: Object.freeze({ min: 2.6, max: 3.4 }),
    decal_strip_acid_trench: Object.freeze({ min: 2.6, max: 3.4 }),
    strip_acid_trench_burn: Object.freeze({ min: 2.6, max: 3.4 }),
    decal_strip_viscera_drag: Object.freeze({ min: 2.6, max: 3.4 }),
    strip_viscera_drag_chute: Object.freeze({ min: 2.6, max: 3.4 }),
    decal_strip_high_voltage_scorch: Object.freeze({ min: 2.6, max: 3.4 }),
    strip_high_voltage_scorch: Object.freeze({ min: 2.6, max: 3.4 }),
    decal_strip_frost_heave: Object.freeze({ min: 2.6, max: 3.4 }),
    strip_frost_heave_split: Object.freeze({ min: 2.6, max: 3.4 }),
    decal_strip_umbilical_veins: Object.freeze({ min: 2.6, max: 3.4 }),
    strip_umbilical_vein_bundle: Object.freeze({ min: 2.6, max: 3.4 }),
    decal_execution_wall_splatter: Object.freeze({ min: 2.0, max: 2.6 }),
    decal_queen_oviposition_pool: Object.freeze({ min: 2.4, max: 3.2 }),

    // World story expansion pass 2 strips and decals (2026-10-12)
    decal_pod_312_rupture_splatter: Object.freeze({ min: 2.2, max: 2.8 }),
    decal_vass_acoustic_diagram: Object.freeze({ min: 1.8, max: 2.4 }),
    decal_strip_crawler_acid: Object.freeze({ min: 2.6, max: 3.4 }),
    strip_crawler_acid_scuttle: Object.freeze({ min: 2.6, max: 3.4 }),
    decal_strip_exosuit_coolant: Object.freeze({ min: 2.6, max: 3.4 }),
    strip_exosuit_fuel_coolant_trail: Object.freeze({ min: 2.6, max: 3.4 }),

    // Medium-large floor fixtures, grates, medallions, and biological/cryo growth blooms (1.2m - 2.0m)
    decal_floor_grate_01: Object.freeze({ min: 1.4, max: 1.8 }),
    decal_floor_grate_02: Object.freeze({ min: 1.4, max: 1.8 }),
    decal_floor_grate_03: Object.freeze({ min: 1.4, max: 1.8 }),
    decal_floor_grate_04: Object.freeze({ min: 1.4, max: 1.8 }),
    decal_floor_medallion_01: Object.freeze({ min: 1.5, max: 2.0 }),
    decal_floor_medallion_02: Object.freeze({ min: 1.5, max: 2.0 }),
    decal_floor_medallion_03: Object.freeze({ min: 1.5, max: 2.0 }),
    decal_floor_medallion_04: Object.freeze({ min: 1.5, max: 2.0 }),
    decal_puddle_slick: Object.freeze({ min: 1.4, max: 1.9 }),
    scatter_coolant_puddle: Object.freeze({ min: 1.4, max: 1.8 }),
    scatter_slime_puddle: Object.freeze({ min: 1.4, max: 1.8 }),
    decal_oil_spill_patch: Object.freeze({ min: 1.3, max: 1.7 }),
    decal_grease_pool: Object.freeze({ min: 1.3, max: 1.7 }),
    decal_fluid_seep: Object.freeze({ min: 1.2, max: 1.6 }),
    decal_scorch_bloom: Object.freeze({ min: 1.3, max: 1.7 }),
    decal_electrical_scorch: Object.freeze({ min: 1.2, max: 1.6 }),
    decal_friction_burn: Object.freeze({ min: 1.2, max: 1.6 }),
    decal_growth_creep_1: Object.freeze({ min: 1.4, max: 1.9 }),
    decal_growth_creep_2: Object.freeze({ min: 1.4, max: 1.9 }),
    decal_hive_growth: Object.freeze({ min: 1.4, max: 1.9 }),
    decal_spore_growth_patch: Object.freeze({ min: 1.3, max: 1.8 }),
    decal_frost_bloom_1: Object.freeze({ min: 1.3, max: 1.8 }),
    decal_frost_bloom_2: Object.freeze({ min: 1.3, max: 1.8 }),
    decal_condensation_run: Object.freeze({ min: 1.2, max: 1.6 }),
    decal_bio_mycelium: Object.freeze({ min: 1.4, max: 1.9 }),
    decal_bio_spore_vent: Object.freeze({ min: 1.2, max: 1.6 }),
    decal_chitin_cluster: Object.freeze({ min: 1.1, max: 1.5 }),
    decal_cryo_fracture: Object.freeze({ min: 1.3, max: 1.8 }),
    decal_flesh_press: Object.freeze({ min: 1.2, max: 1.6 }),
    decal_bio_sample_spill: Object.freeze({ min: 1.3, max: 1.7 }),
    decal_barricade_last_stand: Object.freeze({ min: 1.2, max: 1.6 }),
    decal_emergency_oxygen_nest: Object.freeze({ min: 1.1, max: 1.5 }),
    decal_worker_sleep_roll: Object.freeze({ min: 1.2, max: 1.6 }),

    // Corners, wall panels, grilles & vertical drips (1.0m - 2.2m)
    decal_corner_grit_pocket: Object.freeze({ min: 1.1, max: 1.45 }),
    decal_wall_grime_drip: Object.freeze({ min: 1.6, max: 2.2 }),
    decal_wall_conduit_patch: Object.freeze({ min: 1.0, max: 1.3 }),
    decal_wall_breach: Object.freeze({ min: 1.3, max: 1.8 }),
    decal_wall_panel_grille_01: Object.freeze({ min: 1.1, max: 1.5 }),
    decal_wall_panel_grille_02: Object.freeze({ min: 1.1, max: 1.5 }),
    decal_wall_panel_grille_03: Object.freeze({ min: 1.1, max: 1.5 }),
    decal_wall_panel_relief: Object.freeze({ min: 1.2, max: 1.6 }),
    decal_giger_relief: Object.freeze({ min: 1.2, max: 1.6 }),
    decal_rust_bleed_1: Object.freeze({ min: 1.2, max: 1.7 }),
    decal_rust_bleed_2: Object.freeze({ min: 1.2, max: 1.7 }),
    decal_water_stain: Object.freeze({ min: 1.2, max: 1.7 }),
    decal_permafrost_icicles: Object.freeze({ min: 1.2, max: 1.6 }),
    decal_vine_iron_shadow_1: Object.freeze({ min: 1.4, max: 1.9 }),
    decal_vine_iron_shadow_2: Object.freeze({ min: 1.4, max: 1.9 }),
    decal_spore_stain_01: Object.freeze({ min: 1.2, max: 1.6 }),
    decal_spore_stain_02: Object.freeze({ min: 1.2, max: 1.6 }),
    decal_spore_stain_03: Object.freeze({ min: 1.2, max: 1.6 }),
    decal_lacquer_blister_01: Object.freeze({ min: 1.0, max: 1.4 }),
    decal_lacquer_blister_02: Object.freeze({ min: 1.0, max: 1.4 }),
    decal_lacquer_blister_03: Object.freeze({ min: 1.0, max: 1.4 }),
    decal_maintenance_shrine: Object.freeze({ min: 1.0, max: 1.3 }),
    decal_mirror_tarnished: Object.freeze({ min: 0.9, max: 1.2 }),
    decal_failed_decon_kit: Object.freeze({ min: 0.9, max: 1.2 }),
    decal_childlike_cave_map: Object.freeze({ min: 0.8, max: 1.1 }),

    // Stencils, posters, hazard indicators & glyphs (0.65m - 1.2m)
    decal_meridian_stencil: Object.freeze({ min: 0.65, max: 0.85 }),
    decal_substation_stencil: Object.freeze({ min: 0.70, max: 0.90 }),
    decal_biohazard_stencil: Object.freeze({ min: 0.65, max: 0.85 }),
    prop_torn_warning_poster: Object.freeze({ min: 0.75, max: 0.95 }),
    decal_camp_map: Object.freeze({ min: 0.85, max: 1.15 }),
    decal_cathedral_runic: Object.freeze({ min: 0.75, max: 1.05 }),
    decal_hazard_chevron: Object.freeze({ min: 0.80, max: 1.10 }),
    decal_hazard_stripes: Object.freeze({ min: 0.85, max: 1.20 }),
    decal_tallow_symbol: Object.freeze({ min: 0.65, max: 0.90 }),
    decal_abandoned_meal_tray: Object.freeze({ min: 0.70, max: 0.95 }),

    // Small marks & micro-details (0.4m - 0.75m)
    decal_footprints_mud: Object.freeze({ min: 0.55, max: 0.75 }),
    decal_hand_smears_1: Object.freeze({ min: 0.45, max: 0.65 }),
    decal_hand_smears_2: Object.freeze({ min: 0.45, max: 0.65 }),
    decal_bullet_holes: Object.freeze({ min: 0.45, max: 0.70 }),
    decal_scars: Object.freeze({ min: 0.50, max: 0.75 }),
    decal_claw_scratches: Object.freeze({ min: 0.50, max: 0.75 }),
    decal_bite_marks_02: Object.freeze({ min: 0.40, max: 0.60 }),
    decal_bite_marks_03: Object.freeze({ min: 0.40, max: 0.60 }),
    decal_graffiti_tally_1: Object.freeze({ min: 0.40, max: 0.60 }),
    decal_graffiti_tally_2: Object.freeze({ min: 0.40, max: 0.60 }),
    scatter_bolts: Object.freeze({ min: 0.40, max: 0.60 }),
    scatter_cable_coil: Object.freeze({ min: 0.55, max: 0.80 })
});

export function decalWorldScale(type, random) {
    const range = DECAL_WORLD_SCALES[type];
    if (!range) {
        return 0.85 + (random ? random() : 0.5) * 0.4;
    }
    const r = random ? random() : 0.5;
    return range.min + r * (range.max - range.min);
}

/** Theme id -> kit family. */
export function dressingFamilyForTheme(themeId) {
    const id = String(themeId ?? '');
    if (id.startsWith('giger')) return 'cathedral';
    if (id.startsWith('camp')) return 'camp';
    if (id.startsWith('cryo')) return 'cryo';
    if (id.startsWith('bio')) return 'bio';
    return 'bunker';
}

export function dressingProfileFor(themeId) {
    const family = dressingFamilyForTheme(themeId);
    return { id: family, ...DRESSING_PROFILES[family] };
}

/** The full kit for a theme and role (family kit plus role additions, de-duplicated). */
export function dressingKitFor(themeId, role) {
    const family = DRESSING_KITS[dressingFamilyForTheme(themeId)];
    const extra = ROLE_DRESSING[role] ?? {};
    const merged = {};
    for (const layer of ['wallProps', 'wallDecals', 'clutter', 'corners', 'floorDecals']) {
        merged[layer] = [...new Set([...(extra[layer] ?? []), ...(family[layer] ?? [])])];
    }
    return merged;
}

/**
 * Vignettes: small furniture groups set out on the open floor, so a room's
 * middle reads as used, not only its edges. Each entry is 2-3 GLB pieces laid
 * across an anchor cell and one neighbour. They collide (they are furniture),
 * so roomDressing.js only accepts one when every floor cell stays reachable.
 */
export const VIGNETTES = Object.freeze({
    bunker: [
        ['life_mess_table', 'life_galley_hotplate', 'life_vending_machine'],
        ['life_route_map_table', 'life_tactile_console', 'life_acoustic_ear_horn'],
        ['life_bunk_stack', 'life_footlocker_open', 'life_suit_drying_rack'],
        ['prop_maintenance_tool_cart', 'prop_conduit_junction_box', 'scatter_cable_coil'],
        ['prop_camp_crates', 'prop_storage_drum_dented', 'scatter_bolts'],
        ['prop_chair_operator_wrecked', 'prop_terminal_ruptured'],
        ['prop_body_empty_exosuit', 'bunker_junk_rare', 'scatter_bolts'],
        ['life_cistern_tank', 'camp_water_barrel', 'life_sink_row'],
        ['life_cistern_tank', 'camp_water_barrel', 'life_shower_stall'],
        ['life_cistern_tank', 'camp_water_barrel', 'life_laundry_machines'],
        ['life_pallet_racking', 'life_forklift'],
        ['life_server_racks', 'life_overseer_desk'],
        ['life_transformer_bank', 'life_conveyor_section'],
        ['life_planning_board', 'life_filing_cabinets'],
        ['life_weight_bench', 'life_arcade_cabinet'],
        ['life_scaffold_tower', 'salvage_tagged_heap'],
        ['corp_interrogation_chair', 'corp_debt_severing_kiosk'],
        ['corp_executive_sarcophagus', 'corp_suppression_barrier'],
        ['ind_biomass_grinder', 'corp_incinerator_hopper'],
        ['evac_four_seat_cockpit_module', 'evac_manifest_allocation_terminal'],
        ['evac_preflight_fuel_umbilical', 'decon_exosuit_scrubber_station'],
        ['corp_biometric_collar_chute', 'tank_orbital_siege_cannon']
    ],
    cryo: [
        ['life_cistern_tank', 'camp_water_barrel', 'life_sink_row'],
        ['life_cistern_tank', 'camp_water_barrel', 'life_shower_stall'],
        ['cryo_heater_station', 'life_cistern_tank', 'camp_water_barrel'],
        ['cryo_ice_blocks', 'life_cistern_tank', 'camp_water_barrel'],
        ['cryo_ice_crawler', 'cryo_snowbound_crates'],
        ['life_water_still', 'life_cargo_pallet_netted', 'life_barrel_heater'],
        ['life_sleep_sleeve', 'life_umbilical_tether', 'life_lung_filter_bellows'],
        ['prop_icey_thermal_pod', 'prop_coolant_drum_leaking_pool'],
        ['prop_body_human_frozen', 'prop_icey_frost_vent'],
        ['prop_broken_specimen_tank', 'prop_surgical_cart', 'scatter_cable_coil'],
        ['prop_storage_drum_dented', 'prop_camp_crates', 'bunker_junk_uncommon'],
        ['life_ice_sled', 'life_ice_core_rack'],
        ['life_ice_bore_winch', 'life_drip_buckets'],
        ['cryo_cannibal_butchery_table', 'cryo_ruptured_pod'],
        ['cryo_ice_core_specimen', 'cryo_thawing_trough'],
        ['cryo_frozen_shelter_pod', 'cryo_heater_station'],
        ['bay_c_pod_312_rupture', 'suture_mercy_cocoon_canopy'],
        ['sector_zero_bore_drillhead', 'relay_false_beacon_spire']
    ],
    bio: [
        ['hive_resin_pillar', 'hive_cocooned_crew'],
        ['hive_brood_dome', 'hive_pheromone_node'],
        ['hive_assimilated_generator', 'life_algae_tank'],
        ['life_sleep_sleeve', 'life_pheromone_censer', 'life_resin_extractor'],
        ['life_peristaltic_feeder', 'life_vulval_drain_sump', 'life_scent_distiller'],
        ['life_tactile_console', 'life_acoustic_ear_horn', 'life_vertebral_restraint_rack'],
        ['prop_hive_resin_sac', 'prop_cave_bones'],
        ['prop_fungal_resin_basin', 'state_growth_overrun_2', 'prop_cave_bones'],
        ['prop_flesh_steel_coffin', 'prop_cave_bones'],
        ['prop_body_empty_exosuit', 'state_growth_overrun_1'],
        ['life_assimilated_desk', 'life_hive_dew_funnel'],
        ['life_hive_feeding_bladder', 'prop_cave_bones'],
        ['hive_vivisected_engineer', 'hive_visceral_ovipositor'],
        ['hive_gestation_sac', 'hive_pulmonary_bellows'],
        ['hive_amniotic_feeder_trough', 'hive_sphincter_iris'],
        ['tina_molted_carapace', 'tina_covert_nursery_chest', 'tina_mimic_vanity'],
        ['tina_trophy_trove', 'tina_mimic_vanity'],
        ['queen_royal_brood_throne', 'royal_egg_clutch_caul'],
        ['vass_hybrid_embryo_incubator', 'vass_acoustic_resonator_tank'],
        ['carapace_sentry_chrysalis', 'vass_hybrid_embryo_incubator']
    ],
    camp: [
        ['camp_canvas_tent', 'life_cistern_tank', 'camp_water_barrel'],
        ['life_cistern_tank', 'camp_water_barrel', 'life_sink_row'],
        ['life_cistern_tank', 'camp_water_barrel', 'life_shower_stall'],
        ['life_card_table', 'life_memorial_board', 'life_barrel_heater'],
        ['life_pipe_hammock', 'life_footlocker_open', 'life_flood_lamp_tripod'],
        ['life_hydro_rack', 'life_water_still', 'life_galley_hotplate'],
        ['prop_camp_cot', 'prop_camp_crate', 'scatter_cable_coil'],
        ['prop_camp_sandbags', 'prop_camp_crates'],
        ['prop_camp_cot', 'prop_storage_drum_dented'],
        ['prop_maintenance_tool_cart', 'prop_camp_crate', 'bunker_junk_uncommon'],
        ['life_barber_chair', 'life_footlocker_open'],
        ['life_devotion_tree', 'prop_camp_crate'],
        ['salvage_tagged_heap', 'life_scaffold_tower'],
        ['meridian_mainframe_altar', 'meridian_cyber_graft_bench', 'meridian_servitor_dock'],
        ['meridian_capacitor_bomb', 'prop_camp_sandbags'],
        ['tallow_spore_cradle', 'tallow_compost_fermenter'],
        ['tallow_flesh_trellis', 'tallow_sacrificial_altar'],
        ['vesper_amputation_rig', 'vesper_reloading_station'],
        ['vesper_autocannon_bipod', 'vesper_hanging_cage'],
        ['crawler_signal_antenna_rig', 'scout_tracking_beacon_core'],
        ['engineer_wave_relay_dynamo', 'tank_orbital_siege_cannon']
    ],
    cathedral: [
        ['life_pheromone_censer', 'life_stigmata_inscriber', 'life_memorial_board'],
        ['life_tactile_console', 'life_vertebral_restraint_rack', 'life_acoustic_ear_horn'],
        ['prop_shrine_plinth_broken', 'prop_cave_bones'],
        ['state_column_shattered', 'bunker_junk_rare'],
        ['prop_flesh_steel_coffin', 'prop_cave_bones'],
        ['prop_chair_operator_wrecked', 'prop_terminal_ruptured'],
        ['life_pew_segment', 'life_devotion_tree'],
        ['life_confessional', 'life_pew_segment'],
        ['chasm_hanging_elevator', 'chasm_suicide_ledge_cross'],
        ['chasm_dredge_hook_crane', 'crash_cockpit_canopy'],
        ['chen_sealed_confession_console', 'vass_acoustic_resonator_tank']
    ]
});

export const ROLE_VIGNETTES = Object.freeze({
    medical: [
        ['life_cistern_tank', 'camp_water_barrel', 'life_sink_row'],
        ['life_surgical_lamp', 'life_algae_tank'],
        ['life_infusion_cradle', 'life_sensory_chair', 'life_bone_clamp_rig'],
        ['life_pelvic_autopsy_trough', 'life_covered_stretcher', 'prop_surgical_cart'],
        ['prop_medical_bed', 'prop_vital_monitor', 'prop_surgical_cart'],
        ['vesper_amputation_rig', 'corp_incinerator_hopper'],
        ['corp_dissection_gurney', 'life_surgical_lamp'],
        ['decon_exosuit_scrubber_station', 'suture_mercy_cocoon_canopy']
    ],
    'cryo-lab': [
        ['life_cistern_tank', 'camp_water_barrel', 'life_sink_row'],
        ['life_infusion_cradle', 'life_water_still', 'life_bone_clamp_rig'],
        ['prop_medical_bed', 'prop_vital_monitor', 'prop_surgical_cart'],
        ['cryo_cannibal_butchery_table', 'cryo_thawing_trough'],
        ['cryo_ice_core_specimen', 'cryo_frozen_shelter_pod'],
        ['bay_c_pod_312_rupture', 'suture_mercy_cocoon_canopy']
    ],
    security: [
        ['life_vertebral_restraint_rack', 'life_ammo_ovipositor'],
        ['prop_security_barricade', 'prop_ammo_crate_stack'],
        ['life_checkpoint_post', 'life_dropped_kit_pile'],
        ['corp_interrogation_chair', 'corp_debt_severing_kiosk'],
        ['corp_biometric_collar_chute', 'tank_orbital_siege_cannon']
    ],
    armory: [
        ['life_reloading_bench', 'life_ammo_ovipositor', 'prop_ammo_crate_stack'],
        ['prop_ammo_crate_stack', 'prop_security_barricade', 'scatter_bolts'],
        ['vesper_autocannon_bipod', 'vesper_reloading_station']
    ],
    storage: [
        ['life_pallet_racking', 'life_forklift', 'salvage_tagged_heap'],
        ['life_conveyor_section', 'salvage_tagged_heap'],
        ['life_cargo_pallet_netted', 'life_footlocker_open', 'prop_storage_drum_dented'],
        ['prop_bunker_supplies', 'prop_camp_crates', 'prop_storage_drum_dented'],
        ['ind_fuel_rod_cask', 'corp_suppression_barrier']
    ],
    reward: [['prop_bunker_supplies', 'prop_ammo_crate_stack']],
    engineering: [
        ['life_fuel_probe_boom', 'life_lung_filter_bellows', 'life_umbilical_tether'],
        ['prop_fabricator_workstation', 'prop_maintenance_tool_cart', 'scatter_cable_coil'],
        ['prop_pipe_organ_heat_exchanger', 'prop_maintenance_tool_cart', 'prop_floor_drainage_sump_trough'],
        ['prop_coolant_drum_leaking_pool', 'prop_maintenance_tool_cart', 'scatter_bolts'],
        ['life_welding_station', 'prop_maintenance_tool_cart'],
        ['life_exosuit_teardown', 'scatter_bolts'],
        ['meridian_cyber_graft_bench', 'meridian_servitor_dock'],
        ['ind_biomass_grinder', 'ind_hydraulic_manifold'],
        ['engineer_wave_relay_dynamo', 'crawler_signal_antenna_rig']
    ],
    workshop: [
        ['life_fuel_probe_boom', 'life_lung_filter_bellows', 'life_umbilical_tether'],
        ['prop_fabricator_workstation', 'prop_maintenance_tool_cart', 'scatter_cable_coil'],
        ['prop_pipe_organ_heat_exchanger', 'prop_maintenance_tool_cart', 'prop_floor_drainage_sump_trough'],
        ['prop_coolant_drum_leaking_pool', 'prop_maintenance_tool_cart', 'scatter_bolts'],
        ['life_welding_station', 'prop_maintenance_tool_cart'],
        ['life_exosuit_teardown', 'scatter_bolts'],
        ['ind_hydraulic_manifold', 'ind_fuel_rod_cask'],
        ['vesper_reloading_station', 'prop_maintenance_tool_cart'],
        ['decon_exosuit_scrubber_station', 'evac_preflight_fuel_umbilical']
    ]
});

/** Vignettes for a theme and role: role groups first, then the family's. */
export function vignettesFor(themeId, role) {
    return [...(ROLE_VIGNETTES[role] ?? []), ...(VIGNETTES[dressingFamilyForTheme(themeId)] ?? [])];
}
