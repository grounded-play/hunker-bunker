/**
 * Runtime metadata and specifications for the 50 missing world-story 3D models and decals (2026-10-27 cohort).
 *
 * Covers:
 * - 10 Quest Objects (replacing stand-ins with dedicated models)
 * - 14 Lore Drops (floating 3D collectibles with hover, spin, and glowing circles)
 * - 10 Camp Props (Meridian, Tallow, Vesper camp stations and graves)
 * - 8 Alien & Hive Biomechanical Props and Iris Door
 * - 4 Scatter / Cryo Props
 * - 1 Industrial Hazard Pump & 3 Evac Props
 * - 50 Companion PBR Decals
 */

export const MISSING_WORLD_STORY_50_IDS = Object.freeze([
    // 10 Quest Objects
    'quest_reactor_valves',
    'quest_lost_probe',
    'quest_hive_archive_node',
    'quest_red_mould_bloom',
    'quest_cultist_shrine',
    'quest_kaelen_ledger_desk',
    'quest_martha_warm_pipe_junction',
    'quest_infested_armory_cabinet',
    'quest_holdout_barricade',
    'quest_briggs_memorial_wall',

    // 14 Lore Drops
    'drop_horizon_badge',
    'drop_dig_manifest',
    'drop_security_log',
    'drop_survey_probe',
    'drop_meteor_core',
    'drop_ration_ledger',
    'drop_dogtags',
    'drop_child_drawing',
    'drop_resin_locket',
    'drop_moult_shard',
    'drop_first_bore_tag',
    'drop_prayer_stone',
    'drop_frozen_letter',
    'drop_black_flask',

    // 10 Camp Props
    'prop_camp_meridian_battery_bank',
    'prop_camp_meridian_repair_rig',
    'prop_camp_tallow_still',
    'prop_camp_tallow_spore_trays',
    'prop_camp_tallow_resin_urn',
    'prop_camp_vesper_turret',
    'prop_camp_vesper_ammo_press',
    'prop_camp_vesper_shield_rack',
    'prop_camp_grave_fresh',
    'prop_camp_grave_old',

    // 8 Alien / Hive Props & Doors
    'prop_alien_feeding_basin',
    'prop_alien_respiratory_vent',
    'prop_hive_chitin_hatchery',
    'prop_hive_relay_antenna',
    'prop_hive_suture_organ',
    'prop_hive_synaptic_web',
    'prop_hive_wound_cauterizer',
    'door_biomechanical_iris',

    // 4 Scatter Props
    'scatter_broken_drone',
    'scatter_cryo_icicle',
    'scatter_ice_stalagmite',
    'scatter_cryo_shards',

    // 1 Hazard & 3 Evac Props
    'prop_ruptured_coolant_pump',
    'evac_empty_cockpit_quad',
    'evac_mixed_crew_divider',
    'evac_hidden_egg_coolant_rack'
]);

// Uniform fit inside each model's authored box (Placement Class & Dims in the
// spec): height is the model's natural height at the largest scale that keeps
// it within the spec's height and width, maxSpan caps it across. A `span`
// would stretch width and height separately and distort the model.
// Collectibles keep a readable 0.3-0.4 m instead of their true few centimetres.
export const MISSING_WORLD_STORY_50_MODELS = Object.freeze({
    // Quest Objects
    quest_reactor_valves: { url: '/3d/runtime/new3ds/quest_reactor_valves.glb', height: 0.8, maxSpan: 1.6, yaw: Math.PI },
    quest_lost_probe: { url: '/3d/runtime/new3ds/quest_lost_probe.glb', height: 1.32, maxSpan: 1.2, yaw: 0 },
    quest_hive_archive_node: { url: '/3d/runtime/new3ds/quest_hive_archive_node.glb', height: 1.56, maxSpan: 1.0, yaw: 0 },
    quest_red_mould_bloom: { url: '/3d/runtime/new3ds/quest_red_mould_bloom.glb', height: 0.6, maxSpan: 1.4, yaw: 0 },
    quest_cultist_shrine: { url: '/3d/runtime/new3ds/quest_cultist_shrine.glb', height: 0.89, maxSpan: 1.2, yaw: 0 },
    quest_kaelen_ledger_desk: { url: '/3d/runtime/new3ds/quest_kaelen_ledger_desk.glb', height: 1.3, maxSpan: 1.8, yaw: Math.PI },
    quest_martha_warm_pipe_junction: { url: '/3d/runtime/new3ds/quest_martha_warm_pipe_junction.glb', height: 1.89, maxSpan: 2.0, yaw: Math.PI },
    quest_infested_armory_cabinet: { url: '/3d/runtime/new3ds/quest_infested_armory_cabinet.glb', height: 1.86, maxSpan: 1.5, yaw: Math.PI },
    quest_holdout_barricade: { url: '/3d/runtime/new3ds/quest_holdout_barricade.glb', height: 1.4, maxSpan: 2.8, yaw: 0 },
    quest_briggs_memorial_wall: { url: '/3d/runtime/new3ds/quest_briggs_memorial_wall.glb', height: 2.4, maxSpan: 1.8, yaw: Math.PI },

    // Lore Drops (hover floating pickups)
    drop_horizon_badge: { url: '/3d/runtime/new3ds/drop_horizon_badge.glb', height: 0.35, maxSpan: 0.45, yaw: 0 },
    drop_dig_manifest: { url: '/3d/runtime/new3ds/drop_dig_manifest.glb', height: 0.35, maxSpan: 0.45, yaw: 0 },
    drop_security_log: { url: '/3d/runtime/new3ds/drop_security_log.glb', height: 0.35, maxSpan: 0.45, yaw: 0 },
    drop_survey_probe: { url: '/3d/runtime/new3ds/drop_survey_probe.glb', height: 0.4, maxSpan: 0.45, yaw: 0 },
    drop_meteor_core: { url: '/3d/runtime/new3ds/drop_meteor_core.glb', height: 0.35, maxSpan: 0.45, yaw: 0 },
    drop_ration_ledger: { url: '/3d/runtime/new3ds/drop_ration_ledger.glb', height: 0.35, maxSpan: 0.45, yaw: 0 },
    drop_dogtags: { url: '/3d/runtime/new3ds/drop_dogtags.glb', height: 0.3, maxSpan: 0.45, yaw: 0 },
    drop_child_drawing: { url: '/3d/runtime/new3ds/drop_child_drawing.glb', height: 0.3, maxSpan: 0.45, yaw: 0 },
    drop_resin_locket: { url: '/3d/runtime/new3ds/drop_resin_locket.glb', height: 0.35, maxSpan: 0.45, yaw: 0 },
    drop_moult_shard: { url: '/3d/runtime/new3ds/drop_moult_shard.glb', height: 0.38, maxSpan: 0.45, yaw: 0 },
    drop_first_bore_tag: { url: '/3d/runtime/new3ds/drop_first_bore_tag.glb', height: 0.32, maxSpan: 0.45, yaw: 0 },
    drop_prayer_stone: { url: '/3d/runtime/new3ds/drop_prayer_stone.glb', height: 0.35, maxSpan: 0.45, yaw: 0 },
    drop_frozen_letter: { url: '/3d/runtime/new3ds/drop_frozen_letter.glb', height: 0.3, maxSpan: 0.45, yaw: 0 },
    drop_black_flask: { url: '/3d/runtime/new3ds/drop_black_flask.glb', height: 0.35, maxSpan: 0.45, yaw: 0 },

    // Camp Props
    prop_camp_meridian_battery_bank: { url: '/3d/runtime/new3ds/prop_camp_meridian_battery_bank.glb', height: 1.8, maxSpan: 2.2, yaw: 0 },
    prop_camp_meridian_repair_rig: { url: '/3d/runtime/new3ds/prop_camp_meridian_repair_rig.glb', height: 1.9, maxSpan: 1.8, yaw: 0 },
    prop_camp_tallow_still: { url: '/3d/runtime/new3ds/prop_camp_tallow_still.glb', height: 2.08, maxSpan: 1.4, yaw: 0 },
    prop_camp_tallow_spore_trays: { url: '/3d/runtime/new3ds/prop_camp_tallow_spore_trays.glb', height: 1.7, maxSpan: 1.6, yaw: 0 },
    prop_camp_tallow_resin_urn: { url: '/3d/runtime/new3ds/prop_camp_tallow_resin_urn.glb', height: 1.07, maxSpan: 0.8, yaw: 0 },
    prop_camp_vesper_turret: { url: '/3d/runtime/new3ds/prop_camp_vesper_turret.glb', height: 1.09, maxSpan: 1.4, yaw: 0 },
    prop_camp_vesper_ammo_press: { url: '/3d/runtime/new3ds/prop_camp_vesper_ammo_press.glb', height: 1.5, maxSpan: 1.2, yaw: 0 },
    prop_camp_vesper_shield_rack: { url: '/3d/runtime/new3ds/prop_camp_vesper_shield_rack.glb', height: 1.8, maxSpan: 1.6, yaw: Math.PI },
    prop_camp_grave_fresh: { url: '/3d/runtime/new3ds/prop_camp_grave_fresh.glb', height: 0.7, maxSpan: 1.8, yaw: 0 },
    prop_camp_grave_old: { url: '/3d/runtime/new3ds/prop_camp_grave_old.glb', height: 0.4, maxSpan: 1.9, yaw: 0 },

    // Alien / Hive Props & Doors
    prop_alien_feeding_basin: { url: '/3d/runtime/new3ds/prop_alien_feeding_basin.glb', height: 1.3, maxSpan: 2.0, yaw: 0 },
    prop_alien_respiratory_vent: { url: '/3d/runtime/new3ds/prop_alien_respiratory_vent.glb', height: 1.29, maxSpan: 1.1, yaw: Math.PI },
    prop_hive_chitin_hatchery: { url: '/3d/runtime/new3ds/prop_hive_chitin_hatchery.glb', height: 1.9, maxSpan: 2.6, yaw: 0 },
    prop_hive_relay_antenna: { url: '/3d/runtime/new3ds/prop_hive_relay_antenna.glb', height: 2.25, maxSpan: 1.2, yaw: 0 },
    prop_hive_suture_organ: { url: '/3d/runtime/new3ds/prop_hive_suture_organ.glb', height: 1.15, maxSpan: 1.3, yaw: 0 },
    prop_hive_synaptic_web: { url: '/3d/runtime/new3ds/prop_hive_synaptic_web.glb', height: 1.61, maxSpan: 2.4, yaw: Math.PI },
    prop_hive_wound_cauterizer: { url: '/3d/runtime/new3ds/prop_hive_wound_cauterizer.glb', height: 1.04, maxSpan: 1.5, yaw: Math.PI },
    door_biomechanical_iris: { url: '/3d/runtime/new3ds/door_biomechanical_iris.glb', height: 2.2, maxSpan: 2.2, yaw: 0 },

    // Scatter Props
    scatter_broken_drone: { url: '/3d/runtime/new3ds/scatter_broken_drone.glb', height: 0.4, maxSpan: 1.1, yaw: 0 },
    scatter_cryo_icicle: { url: '/3d/runtime/new3ds/scatter_cryo_icicle.glb', height: 1.35, maxSpan: 0.8, yaw: 0 },
    scatter_ice_stalagmite: { url: '/3d/runtime/new3ds/scatter_ice_stalagmite.glb', height: 0.98, maxSpan: 1.0, yaw: 0 },
    scatter_cryo_shards: { url: '/3d/runtime/new3ds/scatter_cryo_shards.glb', height: 0.2, maxSpan: 1.2, yaw: 0 },

    // Industrial Hazard & Evac Props
    prop_ruptured_coolant_pump: { url: '/3d/runtime/new3ds/prop_ruptured_coolant_pump.glb', height: 1.6, maxSpan: 1.8, yaw: 0 },
    evac_empty_cockpit_quad: { url: '/3d/runtime/new3ds/evac_empty_cockpit_quad.glb', height: 1.5, maxSpan: 2.4, yaw: 0 },
    evac_mixed_crew_divider: { url: '/3d/runtime/new3ds/evac_mixed_crew_divider.glb', height: 2.49, maxSpan: 3.0, yaw: Math.PI },
    evac_hidden_egg_coolant_rack: { url: '/3d/runtime/new3ds/evac_hidden_egg_coolant_rack.glb', height: 1.2, maxSpan: 1.5, yaw: 0 }
});

export const MISSING_WORLD_STORY_50_WALL_DEPTHS = Object.freeze({
    quest_reactor_valves: 0.42,
    quest_kaelen_ledger_desk: 0.85,
    quest_martha_warm_pipe_junction: 0.75,
    quest_infested_armory_cabinet: 0.65,
    quest_briggs_memorial_wall: 0.55,
    prop_camp_vesper_shield_rack: 0.48,
    prop_alien_respiratory_vent: 0.58,
    prop_hive_synaptic_web: 0.45,
    prop_hive_wound_cauterizer: 0.62,
    door_biomechanical_iris: 0.80,
    evac_mixed_crew_divider: 0.52
});

export const MISSING_WORLD_STORY_50_DECALS = Object.freeze([
    'decal_reactor_scorch_flange_leak',
    'decal_probe_crater_scuff_impact',
    'decal_hive_optic_nerve_puddle',
    'decal_red_mould_spore_crust_ring',
    'decal_cultist_wax_runoff_pool',
    'decal_covenant_copper_arcing_burn',
    'decal_warm_pipe_condensate_drip_fan',
    'decal_armory_spent_brass_scatter',
    'decal_holdout_defensive_recoil_scuff',
    'decal_memorial_gun_oil_footprint_tally',
    'decal_melted_lanyard_char_mark',
    'decal_carbon_dust_document_ash',
    'decal_datapad_glass_shatter_spray',
    'decal_vitrified_crater_ring',
    'decal_impact_radiation_halo',
    'decal_rations_fingerprint_grime',
    'decal_dogtag_scraped_rub_halo',
    'decal_crayon_wax_floor_graffiti',
    'decal_amber_resin_fracture_leak',
    'decal_chitin_moult_calcium_bloom',
    'decal_bore_mandible_puncture_drag',
    'decal_prayer_kneeling_wear_crescent',
    'decal_sublimated_frost_paper_outline',
    'decal_liquor_spill_evaporation_stain',
    'decal_battery_acid_sulfur_boil',
    'decal_soldering_flux_droplet_spray',
    'decal_distiller_mineral_scale_runoff',
    'decal_hydro_nutrient_lime_tide',
    'decal_resin_urn_ring_overflow',
    'decal_turret_traverse_ring_swarf',
    'decal_gunpowder_spill_carbon_smear',
    'decal_shield_impact_gouges_apron',
    'decal_grave_spade_excavation_dirt',
    'decal_sunken_permafrost_grave_heave',
    'decal_feeding_slurry_regurgitation_splash',
    'decal_respiratory_exhale_spore_cone',
    'decal_hatchery_mucus_wallowing_pool',
    'decal_relay_neural_static_lichen_ring',
    'decal_suture_silk_thread_drool',
    'decal_synaptic_discharge_scorched_membrane',
    'decal_cauterizer_plasma_splatter_scab',
    'decal_iris_sphincter_rub_apron',
    'decal_drone_crash_skid_shrapnel',
    'decal_falling_icicle_impact_patter',
    'decal_stalagmite_thaw_puddle_rings',
    'decal_cryo_glass_frost_powder_fan',
    'decal_glycol_coolant_slick_flooding',
    'decal_deserted_cockpit_boot_scuff_panic',
    'decal_hybrid_claw_scratch_containment',
    'decal_hidden_egg_frost_bleed_seam'
]);

export const PROP_DECAL_COMPANIONS = Object.freeze({
    quest_reactor_valves: 'decal_reactor_scorch_flange_leak',
    quest_lost_probe: 'decal_probe_crater_scuff_impact',
    quest_hive_archive_node: 'decal_hive_optic_nerve_puddle',
    quest_red_mould_bloom: 'decal_red_mould_spore_crust_ring',
    quest_cultist_shrine: 'decal_cultist_wax_runoff_pool',
    quest_kaelen_ledger_desk: 'decal_covenant_copper_arcing_burn',
    quest_martha_warm_pipe_junction: 'decal_warm_pipe_condensate_drip_fan',
    quest_infested_armory_cabinet: 'decal_armory_spent_brass_scatter',
    quest_holdout_barricade: 'decal_holdout_defensive_recoil_scuff',
    quest_briggs_memorial_wall: 'decal_memorial_gun_oil_footprint_tally',
    drop_horizon_badge: 'decal_melted_lanyard_char_mark',
    drop_dig_manifest: 'decal_carbon_dust_document_ash',
    drop_security_log: 'decal_datapad_glass_shatter_spray',
    drop_survey_probe: 'decal_vitrified_crater_ring',
    drop_meteor_core: 'decal_impact_radiation_halo',
    drop_ration_ledger: 'decal_rations_fingerprint_grime',
    drop_dogtags: 'decal_dogtag_scraped_rub_halo',
    drop_child_drawing: 'decal_crayon_wax_floor_graffiti',
    drop_resin_locket: 'decal_amber_resin_fracture_leak',
    drop_moult_shard: 'decal_chitin_moult_calcium_bloom',
    drop_first_bore_tag: 'decal_bore_mandible_puncture_drag',
    drop_prayer_stone: 'decal_prayer_kneeling_wear_crescent',
    drop_frozen_letter: 'decal_sublimated_frost_paper_outline',
    drop_black_flask: 'decal_liquor_spill_evaporation_stain',
    prop_camp_meridian_battery_bank: 'decal_battery_acid_sulfur_boil',
    prop_camp_meridian_repair_rig: 'decal_soldering_flux_droplet_spray',
    prop_camp_tallow_still: 'decal_distiller_mineral_scale_runoff',
    prop_camp_tallow_spore_trays: 'decal_hydro_nutrient_lime_tide',
    prop_camp_tallow_resin_urn: 'decal_resin_urn_ring_overflow',
    prop_camp_vesper_turret: 'decal_turret_traverse_ring_swarf',
    prop_camp_vesper_ammo_press: 'decal_gunpowder_spill_carbon_smear',
    prop_camp_vesper_shield_rack: 'decal_shield_impact_gouges_apron',
    prop_camp_grave_fresh: 'decal_grave_spade_excavation_dirt',
    prop_camp_grave_old: 'decal_sunken_permafrost_grave_heave',
    prop_alien_feeding_basin: 'decal_feeding_slurry_regurgitation_splash',
    prop_alien_respiratory_vent: 'decal_respiratory_exhale_spore_cone',
    prop_hive_chitin_hatchery: 'decal_hatchery_mucus_wallowing_pool',
    prop_hive_relay_antenna: 'decal_relay_neural_static_lichen_ring',
    prop_hive_suture_organ: 'decal_suture_silk_thread_drool',
    prop_hive_synaptic_web: 'decal_synaptic_discharge_scorched_membrane',
    prop_hive_wound_cauterizer: 'decal_cauterizer_plasma_splatter_scab',
    door_biomechanical_iris: 'decal_iris_sphincter_rub_apron',
    scatter_broken_drone: 'decal_drone_crash_skid_shrapnel',
    scatter_cryo_icicle: 'decal_falling_icicle_impact_patter',
    scatter_ice_stalagmite: 'decal_stalagmite_thaw_puddle_rings',
    scatter_cryo_shards: 'decal_cryo_glass_frost_powder_fan',
    prop_ruptured_coolant_pump: 'decal_glycol_coolant_slick_flooding',
    evac_empty_cockpit_quad: 'decal_deserted_cockpit_boot_scuff_panic',
    evac_mixed_crew_divider: 'decal_hybrid_claw_scratch_containment',
    evac_hidden_egg_coolant_rack: 'decal_hidden_egg_frost_bleed_seam'
});

// Where each model and its companion decal live in the world, from the room,
// placement class and decal placement lines in docs/planning/missing-world-
// story-3d-props-and-decals-2026-10-27.md. Every model keeps its own
// placement: none stands in for another, and none is replaced by one.
//
// placedBy says which system puts the model in the world:
//   quest     src/questObjects.js (camp quest targets)
//   loreDrop  src/loreDrops.js (floating collectibles)
//   camp      src/camp.js signature/service props and CAMP_DRESSING_MODELS
//   hive      src/hiveSite.js signature props
//   theme     src/roomThemes.js prop pools
//   dressing  src/roomDressingKits.js, through this table (theme + placement)
// The decal always goes to its theme's dressing kit, on its plane, at its
// authored size (metres across).
const spec = (id, theme, placement, placedBy, decalPlane, decalSize) => Object.freeze({
    id, theme, placement, placedBy, decalPlane, decalSize,
    decals: Object.freeze(id === 'quest_infested_armory_cabinet'
        ? ['decal_armory_spent_brass_scatter', 'decal_armory_spent_brass_scatter1', 'decal_armory_spent_brass_scatter2', 'decal_armory_spent_brass_scatter3']
        : [PROP_DECAL_COMPANIONS[id]])
});

export const MISSING_WORLD_STORY_50_SPECS = Object.freeze([
    spec('quest_reactor_valves', 'bunker-substation', 'wall', 'quest', 'floor', 1.8),
    spec('quest_lost_probe', 'cryo-rough', 'floor', 'quest', 'floor', 2.2),
    spec('quest_hive_archive_node', 'bio-nest', 'floor', 'quest', 'floor', 1.5),
    spec('quest_red_mould_bloom', 'bio-mycelium', 'floor', 'quest', 'floor', 2.0),
    spec('quest_cultist_shrine', 'bunker-utility', 'wall', 'quest', 'floor', 1.4),
    spec('quest_kaelen_ledger_desk', 'camp-fortified', 'floor', 'quest', 'floor', 1.6),
    spec('quest_martha_warm_pipe_junction', 'camp-fortified', 'wall', 'quest', 'floor', 2.4),
    spec('quest_infested_armory_cabinet', 'bunker-armory', 'wall', 'quest', 'floor', 2.0),
    spec('quest_holdout_barricade', 'bunker-security', 'floor', 'quest', 'floor', 2.6),
    spec('quest_briggs_memorial_wall', 'camp-fortified', 'wall', 'quest', 'floor', 1.7),
    spec('drop_horizon_badge', 'bunker-standard', 'floor', 'loreDrop', 'floor', 0.8),
    spec('drop_dig_manifest', 'bunker-storage', 'floor', 'loreDrop', 'floor', 1.0),
    spec('drop_security_log', 'bunker-security', 'floor', 'loreDrop', 'floor', 1.2),
    spec('drop_survey_probe', 'cryo-rough', 'floor', 'loreDrop', 'floor', 1.4),
    spec('drop_meteor_core', 'cryo-permafrost', 'floor', 'loreDrop', 'floor', 1.2),
    spec('drop_ration_ledger', 'bunker-storage', 'floor', 'loreDrop', 'floor', 0.9),
    spec('drop_dogtags', 'bunker-armory', 'floor', 'loreDrop', 'floor', 0.7),
    spec('drop_child_drawing', 'bunker-standard', 'floor', 'loreDrop', 'floor', 1.1),
    spec('drop_resin_locket', 'bio-nest', 'floor', 'loreDrop', 'floor', 1.0),
    spec('drop_moult_shard', 'giger-cathedral', 'floor', 'loreDrop', 'floor', 1.3),
    spec('drop_first_bore_tag', 'bunker-utility', 'floor', 'loreDrop', 'floor', 1.1),
    spec('drop_prayer_stone', 'giger-obsidian', 'floor', 'loreDrop', 'floor', 1.2),
    spec('drop_frozen_letter', 'cryo-medical', 'floor', 'loreDrop', 'floor', 0.9),
    spec('drop_black_flask', 'bunker-standard', 'floor', 'loreDrop', 'floor', 1.0),
    spec('prop_camp_meridian_battery_bank', 'camp-fortified', 'floor', 'camp', 'floor', 2.0),
    spec('prop_camp_meridian_repair_rig', 'camp-fortified', 'floor', 'camp', 'floor', 1.5),
    spec('prop_camp_tallow_still', 'camp-fortified', 'floor', 'camp', 'floor', 2.2),
    spec('prop_camp_tallow_spore_trays', 'camp-fortified', 'floor', 'camp', 'floor', 1.8),
    spec('prop_camp_tallow_resin_urn', 'camp-fortified', 'floor', 'camp', 'floor', 1.3),
    spec('prop_camp_vesper_turret', 'camp-fortified', 'floor', 'camp', 'floor', 2.2),
    spec('prop_camp_vesper_ammo_press', 'camp-fortified', 'floor', 'camp', 'floor', 1.4),
    spec('prop_camp_vesper_shield_rack', 'camp-fortified', 'wall', 'camp', 'floor', 1.6),
    spec('prop_camp_grave_fresh', 'camp-fortified', 'floor', 'camp', 'floor', 2.2),
    // Also dressed into forgotten bunker corridors, as the spec places it.
    spec('prop_camp_grave_old', 'bunker-standard', 'floor', 'dressing', 'floor', 2.4),
    spec('prop_alien_feeding_basin', 'bio-feeding-chamber', 'floor', 'theme', 'floor', 2.4),
    spec('prop_alien_respiratory_vent', 'bio-nest', 'wall', 'theme', 'floor', 2.5),
    spec('prop_hive_chitin_hatchery', 'bio-nest', 'floor', 'hive', 'floor', 2.8),
    spec('prop_hive_relay_antenna', 'giger-cathedral', 'floor', 'hive', 'floor', 2.0),
    spec('prop_hive_suture_organ', 'bio-medical', 'wall', 'hive', 'floor', 1.7),
    spec('prop_hive_synaptic_web', 'bio-engineering', 'wall', 'hive', 'wall', 2.1),
    spec('prop_hive_wound_cauterizer', 'bio-medical', 'floor', 'hive', 'floor', 2.0),
    spec('door_biomechanical_iris', 'giger-cathedral', 'threshold', 'dressing', 'floor', 2.6),
    spec('scatter_broken_drone', 'bunker-utility', 'floor', 'theme', 'floor', 2.5),
    spec('scatter_cryo_icicle', 'cryo-rough', 'ceiling', 'theme', 'floor', 1.8),
    spec('scatter_ice_stalagmite', 'cryo-permafrost', 'floor', 'dressing', 'floor', 2.0),
    spec('scatter_cryo_shards', 'cryo-medical', 'floor', 'theme', 'floor', 1.9),
    spec('prop_ruptured_coolant_pump', 'cryo-engineering', 'floor', 'theme', 'floor', 2.8),
    spec('evac_empty_cockpit_quad', 'bunker-standard', 'floor', 'dressing', 'floor', 2.6),
    spec('evac_mixed_crew_divider', 'bunker-standard', 'wall', 'dressing', 'floor', 2.2),
    spec('evac_hidden_egg_coolant_rack', 'bunker-standard', 'wall', 'dressing', 'floor', 1.7)
]);

/** Decal metres -> the dressing's world scale range (kept under 4 m). */
export function missingWorldStory50DecalScale(size) {
    return Object.freeze({ min: Math.round(size * 0.85 * 100) / 100, max: Math.min(4, Math.round(size * 1.15 * 100) / 100) });
}
