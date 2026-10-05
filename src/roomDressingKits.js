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
            'prop_exhaust_blower_fan_hood', 'prop_terminal_ruptured', 'fixture_clock_dead', 'prop_overhead_cage_fluorescent'],
        wallDecals: [...COMMON.wallDecals, 'decal_wall_panel_grille_01', 'decal_wall_panel_grille_02', 'decal_hazard_stripes',
            'decal_meridian_stencil', 'prop_torn_warning_poster'],
        clutter: [...COMMON.clutter, 'prop_storage_drum_dented', 'prop_camp_crates', 'prop_valve_wheel_fused', 'prop_vent_grate_exploded'],
        corners: ['prop_storage_drum_dented', 'prop_ammo_crate_stack', 'prop_maintenance_tool_cart', 'state_column_shattered'],
        floorDecals: [...COMMON.floorDecals, 'decal_floor_grate_01', 'decal_floor_grate_02', 'decal_scorch_bloom', 'prop_blood_trail']
    },
    cryo: {
        wallProps: ['prop_icey_frost_manifold', 'prop_wall_cable_tray_swag', 'prop_conduit_junction_box', 'prop_locker_bulged',
            'prop_decon_eyewash_shower_station', 'prop_overhead_cage_fluorescent', 'fixture_clock_dead'],
        wallDecals: ['decal_water_stain', 'decal_rust_bleed_1', 'decal_hand_smears_1', 'decal_hand_smears_2',
            'decal_graffiti_tally_1', 'decal_wall_panel_grille_03', 'decal_biohazard_stencil', 'decal_scars'],
        clutter: [...COMMON.clutter, 'prop_body_human_frozen', 'prop_storage_drum_dented', 'prop_vent_grate_exploded'],
        corners: ['prop_icey_thermal_pod', 'prop_coolant_drum_leaking_pool', 'prop_icey_frost_vent', 'state_column_shattered'],
        floorDecals: ['decal_frost_bloom_1', 'decal_frost_bloom_2', 'decal_condensation_run', 'scatter_coolant_puddle',
            'decal_footprints_mud', 'decal_floor_grate_03']
    },
    bio: {
        wallProps: ['prop_biomech_tracheal_wall_pipe', 'prop_vertebral_cable_riser', 'prop_biomech_flesh_locker',
            'fixture_sconce_vine', 'prop_light_cluster_dripping', 'prop_biomech_respirator'],
        wallDecals: ['decal_spore_stain_01', 'decal_spore_stain_02', 'decal_spore_stain_03', 'decal_vine_iron_shadow_1',
            'decal_vine_iron_shadow_2', 'decal_claw_scratches', 'decal_bite_marks_02', 'decal_hand_smears_2'],
        clutter: ['prop_hive_resin_sac', 'state_growth_overrun_2', 'scatter_bolts', 'scatter_cable_coil',
            'prop_biomech_respirator', 'prop_cave_bones', 'bunker_junk_rare', 'prop_body_empty_exosuit'],
        corners: ['state_growth_overrun_1', 'state_growth_overrun_2', 'prop_hive_resin_sac', 'prop_fungal_resin_basin'],
        floorDecals: ['decal_growth_creep_1', 'decal_growth_creep_2', 'decal_spore_growth_patch', 'scatter_slime_puddle',
            'decal_fluid_seep', 'prop_blood_trail']
    },
    camp: {
        wallProps: ['prop_wall_cable_tray_swag', 'prop_locker_bulged', 'fixture_sconce_vine', 'prop_overhead_cage_fluorescent'],
        wallDecals: [...COMMON.wallDecals, 'decal_graffiti_tally_2', 'prop_torn_warning_poster'],
        clutter: ['prop_camp_crates', 'prop_camp_crate', 'prop_camp_cot', 'scatter_bolts', 'scatter_cable_coil', 'bunker_junk_uncommon'],
        corners: ['prop_camp_sandbags', 'state_barricade_improvised_1', 'state_barricade_improvised_2', 'prop_storage_drum_dented'],
        floorDecals: ['decal_footprints_mud', 'decal_oil_spill_patch', 'decal_tallow_symbol', 'prop_blood_trail']
    },
    cathedral: {
        wallProps: ['arch_niche_shrine', 'arch_window_stained', 'prop_vertebral_cable_riser', 'fixture_sconce_vine',
            'prop_biomech_tracheal_wall_pipe', 'prop_overhead_cage_fluorescent'],
        wallDecals: ['decal_wall_panel_relief', 'decal_lacquer_blister_01', 'decal_lacquer_blister_02', 'decal_lacquer_blister_03',
            'decal_mirror_tarnished', 'decal_machine_cult_shrine', 'decal_vine_iron_shadow_1', 'decal_rust_bleed_2'],
        clutter: ['scatter_bolts', 'scatter_cable_coil', 'bunker_junk_rare', 'prop_cave_bones'],
        corners: ['arch_pillar_buttress_01', 'arch_pillar_buttress_02', 'arch_pillar_buttress_03', 'arch_pillar_buttress_04'],
        floorDecals: ['decal_floor_medallion_01', 'decal_floor_medallion_02', 'decal_floor_medallion_03', 'decal_floor_medallion_04',
            'decal_fluid_seep', 'decal_growth_creep_1']
    }
});

/** Role additions layered on the family kit. */
export const ROLE_DRESSING = Object.freeze({
    medical: { wallProps: ['prop_vital_monitor'], clutter: ['prop_surgical_cart'], floorDecals: ['decal_bio_sample_spill'] },
    'cryo-lab': { wallProps: ['prop_vital_monitor'], clutter: ['prop_surgical_cart'], floorDecals: ['decal_bio_sample_spill'] },
    security: { clutter: ['prop_ammo_crate_stack'], corners: ['state_barricade_improvised_1'], wallDecals: ['decal_bullet_holes'] },
    armory: { clutter: ['prop_ammo_crate_stack'], corners: ['prop_ammo_crate_stack'], wallDecals: ['decal_hazard_stripes'] },
    storage: { clutter: ['prop_bunker_supplies', 'prop_storage_drum_dented'], corners: ['prop_camp_crates'] },
    reward: { clutter: ['prop_bunker_supplies'], corners: ['prop_ammo_crate_stack'] },
    engineering: { clutter: ['prop_maintenance_tool_cart'], wallProps: ['prop_conduit_junction_box'], floorDecals: ['decal_grease_pool'] },
    workshop: { clutter: ['prop_maintenance_tool_cart'], wallProps: ['prop_conduit_junction_box'], floorDecals: ['decal_grease_pool'] }
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
        ['prop_maintenance_tool_cart', 'prop_conduit_junction_box', 'scatter_cable_coil'],
        ['prop_camp_crates', 'prop_storage_drum_dented', 'scatter_bolts'],
        ['prop_chair_operator_wrecked', 'prop_terminal_ruptured'],
        ['prop_body_empty_exosuit', 'bunker_junk_rare', 'scatter_bolts']
    ],
    cryo: [
        ['prop_icey_thermal_pod', 'prop_coolant_drum_leaking_pool'],
        ['prop_body_human_frozen', 'prop_icey_frost_vent'],
        ['prop_broken_specimen_tank', 'prop_surgical_cart', 'scatter_cable_coil'],
        ['prop_storage_drum_dented', 'prop_camp_crates', 'bunker_junk_uncommon']
    ],
    bio: [
        ['prop_hive_resin_sac', 'prop_cave_bones'],
        ['prop_fungal_resin_basin', 'state_growth_overrun_2', 'prop_cave_bones'],
        ['prop_flesh_steel_coffin', 'prop_cave_bones'],
        ['prop_body_empty_exosuit', 'state_growth_overrun_1']
    ],
    camp: [
        ['prop_camp_cot', 'prop_camp_crate', 'scatter_cable_coil'],
        ['prop_camp_sandbags', 'prop_camp_crates'],
        ['prop_camp_cot', 'prop_storage_drum_dented'],
        ['prop_maintenance_tool_cart', 'prop_camp_crate', 'bunker_junk_uncommon']
    ],
    cathedral: [
        ['prop_shrine_plinth_broken', 'prop_cave_bones'],
        ['state_column_shattered', 'bunker_junk_rare'],
        ['prop_flesh_steel_coffin', 'prop_cave_bones'],
        ['prop_chair_operator_wrecked', 'prop_terminal_ruptured']
    ]
});

export const ROLE_VIGNETTES = Object.freeze({
    medical: [['prop_medical_bed', 'prop_vital_monitor', 'prop_surgical_cart']],
    'cryo-lab': [['prop_medical_bed', 'prop_vital_monitor', 'prop_surgical_cart']],
    security: [['prop_security_barricade', 'prop_ammo_crate_stack']],
    armory: [['prop_ammo_crate_stack', 'prop_security_barricade', 'scatter_bolts']],
    storage: [['prop_bunker_supplies', 'prop_camp_crates', 'prop_storage_drum_dented']],
    reward: [['prop_bunker_supplies', 'prop_ammo_crate_stack']],
    engineering: [['prop_fabricator_workstation', 'prop_maintenance_tool_cart', 'scatter_cable_coil']],
    workshop: [['prop_fabricator_workstation', 'prop_maintenance_tool_cart', 'scatter_cable_coil']]
});

/** Vignettes for a theme and role: role groups first, then the family's. */
export function vignettesFor(themeId, role) {
    return [...(ROLE_VIGNETTES[role] ?? []), ...(VIGNETTES[dressingFamilyForTheme(themeId)] ?? [])];
}
