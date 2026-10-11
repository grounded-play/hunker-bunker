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
            'life_cochlear_intercom', 'life_ribcage_rescue_cabinet', 'life_pneumatic_tube_node'],
        wallDecals: [...COMMON.wallDecals, 'decal_wall_panel_grille_01', 'decal_wall_panel_grille_02', 'decal_hazard_stripes',
            'decal_meridian_stencil', 'prop_torn_warning_poster', 'decal_substation_stencil', 'decal_wall_conduit_patch'],
        clutter: [...COMMON.clutter, 'prop_storage_drum_dented', 'prop_camp_crates', 'prop_valve_wheel_fused', 'prop_vent_grate_exploded',
            'life_footlocker_open', 'life_galley_hotplate', 'life_sanitation_bidet', 'life_vulval_drain_sump'],
        corners: ['prop_storage_drum_dented', 'prop_ammo_crate_stack', 'prop_maintenance_tool_cart', 'state_column_shattered',
            'life_bunk_stack', 'life_suit_drying_rack', 'life_latrine_stall'],
        floorDecals: [...COMMON.floorDecals, 'decal_floor_grate_01', 'decal_floor_grate_02', 'decal_scorch_bloom', 'prop_blood_trail',
            'decal_electrical_scorch', 'decal_hazard_chevron', 'decal_door_wear_apron', 'decal_junction_turn_wear', 'decal_strip_cart_ruts']
    },
    cryo: {
        wallProps: ['prop_icey_frost_manifold', 'prop_wall_cable_tray_swag', 'prop_conduit_junction_box', 'prop_locker_bulged',
            'prop_decon_eyewash_shower_station', 'prop_overhead_cage_fluorescent', 'fixture_clock_dead', 'life_parka_hooks'],
        wallDecals: ['decal_water_stain', 'decal_rust_bleed_1', 'decal_hand_smears_1', 'decal_hand_smears_2',
            'decal_graffiti_tally_1', 'decal_wall_panel_grille_03', 'decal_biohazard_stencil', 'decal_scars',
            'decal_permafrost_icicles'],
        clutter: [...COMMON.clutter, 'prop_body_human_frozen', 'prop_storage_drum_dented', 'prop_vent_grate_exploded',
            'life_water_still', 'life_footlocker_open', 'life_vulval_drain_sump'],
        corners: ['prop_icey_thermal_pod', 'prop_coolant_drum_leaking_pool', 'prop_icey_frost_vent', 'state_column_shattered',
            'life_cargo_pallet_netted', 'life_barrel_heater', 'life_sleep_sleeve',
            'life_ice_sled', 'life_ice_core_rack', 'life_ice_bore_winch'],
        floorDecals: ['decal_frost_bloom_1', 'decal_frost_bloom_2', 'decal_condensation_run', 'scatter_coolant_puddle',
            'decal_footprints_mud', 'decal_floor_grate_03', 'decal_cryo_fracture', 'decal_door_wear_apron', 'decal_strip_cart_ruts']
    },
    bio: {
        wallProps: ['prop_biomech_tracheal_wall_pipe', 'prop_vertebral_cable_riser', 'prop_biomech_flesh_locker',
            'fixture_sconce_vine', 'prop_light_cluster_dripping', 'prop_biomech_respirator', 'life_mask_rack',
            'life_umbilical_tether', 'life_lung_filter_bellows', 'life_vertebral_restraint_rack',
            'life_brood_comb', 'life_fungal_cable_bundle'],
        wallDecals: ['decal_spore_stain_01', 'decal_spore_stain_02', 'decal_spore_stain_03', 'decal_vine_iron_shadow_1',
            'decal_vine_iron_shadow_2', 'decal_claw_scratches', 'decal_bite_marks_02', 'decal_hand_smears_2'],
        clutter: ['prop_hive_resin_sac', 'state_growth_overrun_2', 'scatter_bolts', 'scatter_cable_coil',
            'prop_biomech_respirator', 'prop_cave_bones', 'bunker_junk_rare', 'prop_body_empty_exosuit',
            'life_sanitation_bidet', 'life_vulval_drain_sump', 'life_peristaltic_feeder', 'life_scent_distiller'],
        corners: ['state_growth_overrun_1', 'state_growth_overrun_2', 'prop_hive_resin_sac', 'prop_fungal_resin_basin',
            'life_sleep_sleeve', 'life_resin_extractor', 'life_pheromone_censer', 'life_warmth_hearth',
            'life_hive_dew_funnel', 'life_hive_feeding_bladder', 'life_assimilated_desk'],
        floorDecals: ['decal_growth_creep_1', 'decal_growth_creep_2', 'decal_spore_growth_patch', 'scatter_slime_puddle',
            'decal_fluid_seep', 'prop_blood_trail', 'decal_bio_mycelium', 'decal_chitin_cluster', 'decal_bio_spore_vent',
            'decal_door_wear_apron']
    },
    camp: {
        wallProps: ['prop_wall_cable_tray_swag', 'prop_locker_bulged', 'fixture_sconce_vine', 'prop_overhead_cage_fluorescent',
            'life_memorial_board', 'life_tally_bulkhead', 'life_mask_rack'],
        wallDecals: [...COMMON.wallDecals, 'decal_graffiti_tally_2', 'prop_torn_warning_poster', 'decal_camp_map'],
        clutter: ['prop_camp_crates', 'prop_camp_crate', 'prop_camp_cot', 'scatter_bolts', 'scatter_cable_coil', 'bunker_junk_uncommon',
            'life_footlocker_open', 'life_galley_hotplate', 'life_sanitation_bidet', 'life_vulval_drain_sump'],
        corners: ['prop_camp_sandbags', 'state_barricade_improvised_1', 'state_barricade_improvised_2', 'prop_storage_drum_dented',
            'life_latrine_stall', 'life_barrel_heater', 'life_pipe_hammock', 'life_hydro_rack',
            'life_barber_chair', 'life_devotion_tree'],
        floorDecals: ['decal_footprints_mud', 'decal_oil_spill_patch', 'decal_tallow_symbol', 'prop_blood_trail', 'decal_evac_treads',
            'decal_door_wear_apron', 'decal_strip_cart_ruts']
    },
    cathedral: {
        wallProps: ['arch_niche_shrine', 'arch_window_stained', 'prop_vertebral_cable_riser', 'fixture_sconce_vine',
            'prop_biomech_tracheal_wall_pipe', 'prop_overhead_cage_fluorescent'],
        wallDecals: ['decal_wall_panel_relief', 'decal_lacquer_blister_01', 'decal_lacquer_blister_02', 'decal_lacquer_blister_03',
            'decal_mirror_tarnished', 'decal_maintenance_shrine', 'decal_vine_iron_shadow_1', 'decal_rust_bleed_2',
            'decal_giger_relief'],
        clutter: ['scatter_bolts', 'scatter_cable_coil', 'bunker_junk_rare', 'prop_cave_bones',
            'life_pheromone_censer', 'life_sanitation_bidet', 'life_vulval_drain_sump'],
        corners: ['arch_pillar_buttress_01', 'arch_pillar_buttress_02', 'arch_pillar_buttress_03', 'arch_pillar_buttress_04',
            'life_confessional', 'life_devotion_tree'],
        floorDecals: ['decal_floor_medallion_01', 'decal_floor_medallion_02', 'decal_floor_medallion_03', 'decal_floor_medallion_04',
            'decal_fluid_seep', 'decal_growth_creep_1', 'decal_cathedral_runic']
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
        clutter: ['prop_surgical_cart', 'life_bone_clamp_rig', 'life_sensory_chair'],
        corners: ['life_infusion_cradle', 'life_pelvic_autopsy_trough', 'life_covered_stretcher'],
        floorDecals: ['decal_bio_sample_spill']
    },
    'cryo-lab': {
        wallProps: ['prop_vital_monitor'],
        clutter: ['prop_surgical_cart', 'life_water_still', 'life_bone_clamp_rig'],
        corners: ['life_infusion_cradle', 'life_pelvic_autopsy_trough', 'life_covered_stretcher'],
        floorDecals: ['decal_bio_sample_spill']
    },
    security: {
        wallProps: ['life_vertebral_restraint_rack'],
        clutter: ['prop_ammo_crate_stack', 'life_ammo_ovipositor'],
        corners: ['state_barricade_improvised_1', 'life_checkpoint_post'], wallDecals: ['decal_bullet_holes']
    },
    armory: { clutter: ['prop_ammo_crate_stack'], corners: ['prop_ammo_crate_stack', 'life_reloading_bench', 'life_ammo_ovipositor'], wallDecals: ['decal_hazard_stripes'] },
    storage: {
        clutter: ['prop_bunker_supplies', 'prop_storage_drum_dented', 'life_footlocker_open'],
        corners: ['prop_camp_crates', 'life_cargo_pallet_netted', 'life_janitor_cart', 'life_ice_sled']
    },
    reward: { clutter: ['prop_bunker_supplies'], corners: ['prop_ammo_crate_stack'] },
    engineering: {
        wallProps: ['prop_conduit_junction_box', 'prop_wall_cable_tray_swag', 'prop_exhaust_blower_fan_hood', 'prop_pipe_organ_heat_exchanger', 'life_lung_filter_bellows',
            'life_fuse_bypass_panel'],
        clutter: ['prop_maintenance_tool_cart', 'scatter_cable_coil', 'scatter_bolts', 'life_umbilical_tether'],
        corners: ['prop_oxygen_bottle_cascade_rack', 'prop_exosuit_docking_gantry', 'prop_coolant_drum_leaking_pool', 'prop_floor_drainage_sump_trough', 'life_fuel_probe_boom',
            'life_welding_station', 'life_exosuit_teardown'],
        floorDecals: ['decal_grease_pool', 'decal_oil_spill_patch', 'scatter_coolant_puddle', 'decal_floor_grate_01']
    },
    workshop: {
        wallProps: ['prop_conduit_junction_box', 'prop_wall_cable_tray_swag', 'prop_exhaust_blower_fan_hood', 'prop_pipe_organ_heat_exchanger', 'life_lung_filter_bellows',
            'life_fuse_bypass_panel'],
        clutter: ['prop_maintenance_tool_cart', 'scatter_cable_coil', 'scatter_bolts', 'life_umbilical_tether'],
        corners: ['prop_oxygen_bottle_cascade_rack', 'prop_exosuit_docking_gantry', 'prop_coolant_drum_leaking_pool', 'prop_floor_drainage_sump_trough', 'life_fuel_probe_boom',
            'life_welding_station', 'life_exosuit_teardown'],
        floorDecals: ['decal_grease_pool', 'decal_oil_spill_patch', 'scatter_coolant_puddle', 'decal_floor_grate_01']
    }
});

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
        ['prop_body_empty_exosuit', 'bunker_junk_rare', 'scatter_bolts']
    ],
    cryo: [
        ['life_water_still', 'life_cargo_pallet_netted', 'life_barrel_heater'],
        ['life_sleep_sleeve', 'life_umbilical_tether', 'life_lung_filter_bellows'],
        ['prop_icey_thermal_pod', 'prop_coolant_drum_leaking_pool'],
        ['prop_body_human_frozen', 'prop_icey_frost_vent'],
        ['prop_broken_specimen_tank', 'prop_surgical_cart', 'scatter_cable_coil'],
        ['prop_storage_drum_dented', 'prop_camp_crates', 'bunker_junk_uncommon'],
        ['life_ice_sled', 'life_ice_core_rack'],
        ['life_ice_bore_winch', 'life_drip_buckets']
    ],
    bio: [
        ['life_sleep_sleeve', 'life_pheromone_censer', 'life_resin_extractor'],
        ['life_peristaltic_feeder', 'life_vulval_drain_sump', 'life_scent_distiller'],
        ['life_tactile_console', 'life_acoustic_ear_horn', 'life_vertebral_restraint_rack'],
        ['prop_hive_resin_sac', 'prop_cave_bones'],
        ['prop_fungal_resin_basin', 'state_growth_overrun_2', 'prop_cave_bones'],
        ['prop_flesh_steel_coffin', 'prop_cave_bones'],
        ['prop_body_empty_exosuit', 'state_growth_overrun_1'],
        ['life_assimilated_desk', 'life_hive_dew_funnel'],
        ['life_hive_feeding_bladder', 'prop_cave_bones']
    ],
    camp: [
        ['life_card_table', 'life_memorial_board', 'life_barrel_heater'],
        ['life_pipe_hammock', 'life_footlocker_open', 'life_flood_lamp_tripod'],
        ['life_hydro_rack', 'life_water_still', 'life_galley_hotplate'],
        ['prop_camp_cot', 'prop_camp_crate', 'scatter_cable_coil'],
        ['prop_camp_sandbags', 'prop_camp_crates'],
        ['prop_camp_cot', 'prop_storage_drum_dented'],
        ['prop_maintenance_tool_cart', 'prop_camp_crate', 'bunker_junk_uncommon'],
        ['life_barber_chair', 'life_footlocker_open'],
        ['life_devotion_tree', 'prop_camp_crate']
    ],
    cathedral: [
        ['life_pheromone_censer', 'life_stigmata_inscriber', 'life_memorial_board'],
        ['life_tactile_console', 'life_vertebral_restraint_rack', 'life_acoustic_ear_horn'],
        ['prop_shrine_plinth_broken', 'prop_cave_bones'],
        ['state_column_shattered', 'bunker_junk_rare'],
        ['prop_flesh_steel_coffin', 'prop_cave_bones'],
        ['prop_chair_operator_wrecked', 'prop_terminal_ruptured'],
        ['life_pew_segment', 'life_devotion_tree'],
        ['life_confessional', 'life_pew_segment']
    ]
});

export const ROLE_VIGNETTES = Object.freeze({
    medical: [
        ['life_infusion_cradle', 'life_sensory_chair', 'life_bone_clamp_rig'],
        ['life_pelvic_autopsy_trough', 'life_covered_stretcher', 'prop_surgical_cart'],
        ['prop_medical_bed', 'prop_vital_monitor', 'prop_surgical_cart']
    ],
    'cryo-lab': [
        ['life_infusion_cradle', 'life_water_still', 'life_bone_clamp_rig'],
        ['prop_medical_bed', 'prop_vital_monitor', 'prop_surgical_cart']
    ],
    security: [['life_vertebral_restraint_rack', 'life_ammo_ovipositor'], ['prop_security_barricade', 'prop_ammo_crate_stack'],
        ['life_checkpoint_post', 'life_dropped_kit_pile']],
    armory: [['life_reloading_bench', 'life_ammo_ovipositor', 'prop_ammo_crate_stack'], ['prop_ammo_crate_stack', 'prop_security_barricade', 'scatter_bolts']],
    storage: [['life_cargo_pallet_netted', 'life_footlocker_open', 'prop_storage_drum_dented'], ['prop_bunker_supplies', 'prop_camp_crates', 'prop_storage_drum_dented']],
    reward: [['prop_bunker_supplies', 'prop_ammo_crate_stack']],
    engineering: [
        ['life_fuel_probe_boom', 'life_lung_filter_bellows', 'life_umbilical_tether'],
        ['prop_fabricator_workstation', 'prop_maintenance_tool_cart', 'scatter_cable_coil'],
        ['prop_pipe_organ_heat_exchanger', 'prop_maintenance_tool_cart', 'prop_floor_drainage_sump_trough'],
        ['prop_coolant_drum_leaking_pool', 'prop_maintenance_tool_cart', 'scatter_bolts'],
        ['life_welding_station', 'prop_maintenance_tool_cart'],
        ['life_exosuit_teardown', 'scatter_bolts']
    ],
    workshop: [
        ['life_fuel_probe_boom', 'life_lung_filter_bellows', 'life_umbilical_tether'],
        ['prop_fabricator_workstation', 'prop_maintenance_tool_cart', 'scatter_cable_coil'],
        ['prop_pipe_organ_heat_exchanger', 'prop_maintenance_tool_cart', 'prop_floor_drainage_sump_trough'],
        ['prop_coolant_drum_leaking_pool', 'prop_maintenance_tool_cart', 'scatter_bolts'],
        ['life_welding_station', 'prop_maintenance_tool_cart'],
        ['life_exosuit_teardown', 'scatter_bolts']
    ]
});

/** Vignettes for a theme and role: role groups first, then the family's. */
export function vignettesFor(themeId, role) {
    return [...(ROLE_VIGNETTES[role] ?? []), ...(VIGNETTES[dressingFamilyForTheme(themeId)] ?? [])];
}
