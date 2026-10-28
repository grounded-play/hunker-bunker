export const LIVED_IN_DECALS = Object.freeze({
    bunker: Object.freeze([
        'decal_abandoned_meal_tray', 'decal_emergency_oxygen_nest',
        'decal_maintenance_shrine', 'decal_failed_decon_kit',
        'decal_barricade_last_stand', 'decal_childlike_cave_map',
        'decal_bio_sample_spill', 'decal_worker_sleep_roll',
        'decal_scorch_bloom', 'decal_rust_bleed_1',
        'decal_rust_bleed_2', 'decal_water_stain',
        'decal_graffiti_tally_1', 'decal_graffiti_tally_2',
        'decal_floor_medallion_01', 'decal_floor_medallion_02',
        'decal_floor_medallion_03', 'decal_floor_medallion_04',
        'decal_floor_grate_01', 'decal_floor_grate_02',
        'decal_floor_grate_03', 'decal_floor_grate_04',
        'decal_wall_panel_grille_01', 'decal_wall_panel_grille_02',
        'decal_wall_panel_relief', 'decal_mirror_tarnished',
        'decal_lacquer_blister_01', 'decal_friction_burn',
        'decal_electrical_scorch', 'decal_hazard_chevron',
        'decal_substation_stencil', 'decal_cathedral_runic'
    ]),
    cryo: Object.freeze([
        'decal_emergency_oxygen_nest', 'decal_failed_decon_kit',
        'decal_barricade_last_stand', 'decal_childlike_cave_map',
        'decal_worker_sleep_roll', 'decal_abandoned_meal_tray',
        'decal_frost_bloom_1', 'decal_frost_bloom_2',
        'decal_water_stain', 'decal_hand_smears_1',
        'decal_condensation_run', 'decal_fluid_seep',
        'decal_floor_grate_01', 'decal_wall_panel_grille_03',
        'decal_cryo_fracture', 'decal_permafrost_icicles'
    ]),
    bio: Object.freeze([
        'decal_maintenance_shrine', 'decal_childlike_cave_map',
        'decal_bio_sample_spill', 'decal_worker_sleep_roll',
        'decal_abandoned_meal_tray', 'decal_growth_creep_1',
        'decal_growth_creep_2', 'decal_vine_iron_shadow_1',
        'decal_vine_iron_shadow_2', 'decal_grease_pool',
        'decal_flesh_press', 'decal_bite_marks_02',
        'decal_bite_marks_03', 'decal_spore_stain_01',
        'decal_spore_stain_02', 'decal_spore_stain_03',
        'decal_bio_mycelium', 'decal_chitin_cluster',
        'decal_bio_spore_vent', 'decal_giger_relief'
    ]),
    camp: Object.freeze([
        'decal_abandoned_meal_tray', 'decal_emergency_oxygen_nest',
        'decal_maintenance_shrine', 'decal_barricade_last_stand',
        'decal_childlike_cave_map', 'decal_worker_sleep_roll',
        'decal_hand_smears_2', 'decal_graffiti_tally_1',
        'decal_scorch_bloom', 'decal_grease_pool',
        'decal_lacquer_blister_02', 'decal_lacquer_blister_03',
        'decal_friction_burn', 'decal_mirror_tarnished',
        'decal_bite_marks_02', 'decal_evac_treads',
        'decal_camp_map'
    ])
});

export const ROOM_THEME_CATALOG = Object.freeze([
    {
        id: 'bunker-standard',
        biomes: ['active'],
        roles: ['generic'],
        weight: 1,
        wallStyle: 'bunker-standard',
        floorStyle: 'bunker-standard',
        doorStyle: 'bunker',
        signatureProps: ['prop_bunker_supplies', 'prop_diagnostic_console', 'prop_storage_drum_dented', 'prop_locker_bulged', 'corp_quantum_ledger_podium', 'corp_executive_whisper_booth'],
        largeProps: [
            'prop_cyber_junction', 'prop_conduit_hub', 'prop_storage_drum_dented', 'prop_terminal_ruptured',
            'prop_conduit_junction_box', 'decal_wall_breach', 'decal_meridian_stencil',
            'arch_bulkhead_frame', 'arch_deco_archway_grand_01', 'arch_rib_ceiling_vault_01', 'state_column_shattered',
            'corp_biometric_wall_safe', 'evac_cargo_ballast_scale'
        ],
        smallProps: ['scatter_cable_coil', 'scatter_bolts', 'prop_valve_wheel_fused', 'prop_torn_warning_poster', 'decal_bullet_holes', 'prop_blood_trail', 'decal_hazard_stripes', 'decal_footprints_mud'],
        ambientProps: LIVED_IN_DECALS.bunker,
        rareProps: ['arch_niche_shrine'],
        encounterProfile: 'standard'
    },
    {
        id: 'bunker-utility',
        biomes: ['active'],
        roles: ['utility', 'engineering'],
        weight: 1.2,
        wallStyle: 'bunker-utility',
        floorStyle: 'bunker-utility',
        doorStyle: 'utility',
        signatureProps: ['prop_fusion_generator', 'prop_conduit_hub', 'prop_fabricator_workstation', 'prop_o2_filter_vat', 'geo_steam_manifold_actuator', 'substation_stepdown_transformer'],
        largeProps: [
            'prop_engineering_bench', 'prop_cyber_junction', 'prop_tesla_coil_node', 'prop_pipe_rupture', 'prop_light_cluster_dripping', 'prop_vent_grate_exploded', 'decal_wall_breach',
            'substation_breaker_interlock', 'geo_pressure_relief_siren'
        ],
        smallProps: ['scatter_cable_coil', 'scatter_bolts', 'prop_valve_wheel_fused', 'prop_torn_warning_poster', 'scatter_biomech_debris', 'scatter_broken_drone', 'decal_oil_spill_patch', 'decal_hazard_stripes'],
        ambientProps: LIVED_IN_DECALS.bunker,
        rareProps: ['scatter_horizon_black_box', 'decal_machine_cult_shrine', 'fixture_clock_dead'],
        encounterProfile: 'utility'
    },
    {
        id: 'bunker-medical',
        biomes: ['active'],
        roles: ['medical'],
        weight: 1,
        wallStyle: 'bunker-medical',
        floorStyle: 'bunker-medical',
        doorStyle: 'medical-seal',
        signatureProps: ['prop_medical_bed', 'prop_diagnostic_console', 'prop_vital_monitor', 'prop_surgical_cart', 'suture_flesh_mending_bath', 'vass_hybrid_blood_synthesizer'],
        largeProps: [
            'prop_surgical_cart', 'prop_specimen_tank', 'prop_broken_specimen_tank', 'prop_biomech_triage_cradle', 'prop_flesh_steel_coffin', 'prop_flesh_steel_inhaler',
            'vass_dissection_stereomicroscope', 'vass_bio_centrifuge_rack'
        ],
        smallProps: ['scatter_bolts', 'decal_biohazard_stencil', 'decal_footprints_mud'],
        ambientProps: LIVED_IN_DECALS.bunker,
        encounterProfile: 'sterile'
    },
    {
        id: 'bunker-security',
        biomes: ['active'],
        roles: ['security'],
        weight: 1,
        wallStyle: 'bunker-security',
        floorStyle: 'bunker-security',
        doorStyle: 'security',
        signatureProps: ['prop_security_locker', 'prop_ammo_crate_stack', 'prop_security_barricade', 'prop_laser_trap_emitter', 'corp_compliance_choker_bench', 'vesper_ordnance_disarm_table'],
        largeProps: [
            'prop_security_barricade', 'prop_laser_trap_emitter', 'prop_cyber_junction', 'prop_locker_bulged', 'prop_chair_operator_wrecked', 'decal_claw_scratches',
            'arch_pillar_buttress_01', 'arch_deco_archway_grand_02', 'state_wall_breached_01',
            'state_barricade_improvised_1', 'prop_body_empty_exosuit', 'vesper_ballistic_chronograph', 'tank_reactive_armor_forge'
        ],
        smallProps: ['scatter_bolts', 'decal_hazard_stripes', 'decal_bullet_holes'],
        ambientProps: LIVED_IN_DECALS.bunker,
        rareProps: ['prop_shrine_plinth_broken'],
        encounterProfile: 'security'
    },
    {
        id: 'cryo-rough',
        biomes: ['cryo'],
        roles: ['generic', 'storage', 'reward'],
        weight: 1,
        wallStyle: 'cryo-rough',
        floorStyle: 'cryo-rough',
        doorStyle: 'cryo',
        signatureProps: ['prop_cryo_sleep_pod', 'prop_cave_lichen', 'prop_icey_thermal_pod', 'prop_icey_frost_vent', 'chasm_geothermal_survey_transit', 'scout_ejection_pod_chassis'],
        largeProps: ['prop_ruptured_coolant_pump', 'prop_bunker_supplies', 'prop_icey_thermal_pod', 'prop_storage_drum_dented', 'chasm_cable_traversal_winch', 'chasm_abyss_sounding_mortar'],
        smallProps: ['scatter_cryo_shards', 'scatter_cryo_icicle', 'prop_icey_frost_vent', 'decal_footprints_mud', 'decal_claw_scratches'],
        ambientProps: LIVED_IN_DECALS.cryo,
        encounterProfile: 'cryo-standard'
    },
    {
        id: 'cryo-medical',
        biomes: ['cryo'],
        roles: ['medical', 'cryo-lab'],
        weight: 1.2,
        wallStyle: 'cryo-clean',
        floorStyle: 'cryo-tile',
        doorStyle: 'medical-seal',
        signatureProps: ['prop_cryo_sleep_pod', 'prop_vital_monitor', 'prop_broken_specimen_tank', 'prop_medical_bed', 'corp_cryo_transport_coffin', 'hydro_mycelial_seed_vault'],
        largeProps: ['prop_diagnostic_console', 'prop_broken_specimen_tank', 'prop_biomech_triage_cradle', 'prop_icey_thermal_pod', 'prop_flesh_steel_inhaler', 'suture_flesh_mending_bath', 'vass_neural_sync_helmet'],
        smallProps: ['scatter_cryo_shards', 'decal_biohazard_stencil', 'decal_meridian_stencil'],
        ambientProps: LIVED_IN_DECALS.cryo,
        rareProps: ['decal_pod_312_breach'],
        encounterProfile: 'sterile'
    },
    {
        id: 'cryo-engineering',
        biomes: ['cryo'],
        roles: ['utility', 'engineering', 'security'],
        weight: 1,
        wallStyle: 'cryo-lab',
        floorStyle: 'cryo-tile',
        doorStyle: 'cryo-security',
        signatureProps: ['prop_ruptured_coolant_pump', 'prop_fusion_generator', 'prop_o2_filter_vat', 'prop_tesla_coil_node', 'evac_cryo_hypergolic_manifold', 'substation_stepdown_transformer'],
        largeProps: [
            'prop_engineering_bench', 'prop_cyber_junction', 'prop_tesla_coil_node', 'frozen_tanker',
            'prop_icey_frost_manifold', 'prop_icey_frost_vent', 'prop_pipe_rupture',
            'arch_pillar_buttress_02', 'arch_deco_archway_grand_03', 'state_wall_breached_02',
            'chasm_seismic_geophone_station', 'substation_breaker_interlock'
        ],
        smallProps: ['scatter_cryo_shards', 'scatter_coolant_puddle', 'decal_oil_spill_patch', 'decal_hazard_stripes'],
        ambientProps: LIVED_IN_DECALS.cryo,
        encounterProfile: 'security'
    },
    {
        id: 'bio-resin',
        biomes: ['bio'],
        roles: ['generic', 'utility', 'storage'],
        weight: 1,
        wallStyle: 'bio-resin',
        floorStyle: 'bio-resin',
        doorStyle: 'resin',
        signatureProps: ['prop_alien_respiratory_vent', 'prop_spore_colony', 'prop_biomech_respirator', 'prop_fungal_spore_dispenser', 'carapace_chitin_press', 'carapace_ossuary_anvil'],
        largeProps: [
            'prop_alien_feeding_basin', 'prop_hive_resin_sac', 'prop_biomech_incubator',
            'prop_fungal_mycelium_loom', 'prop_fungal_resin_basin', 'prop_flesh_steel_cradle',
            'decal_spore_growth_patch', 'arch_pillar_buttress_04', 'arch_rib_ceiling_vault_02', 'state_growth_overrun_1',
            'vass_containment_bell_jar', 'suture_larval_nursery_urn'
        ],
        smallProps: ['prop_cave_spores', 'prop_cave_webs', 'decal_tallow_symbol', 'fixture_sconce_vine'],
        ambientProps: LIVED_IN_DECALS.bio,
        // The guillotine door's slab, fallen out of its frame (unplaced until 2026-10-28).
        rareProps: ['prop_fungal_tendril_altar', 'door_arch_guillotine_slab'],
        encounterProfile: 'bio-standard'
    },
    {
        id: 'bio-nest',
        biomes: ['bio'],
        roles: ['nest', 'hive'],
        weight: 1.4,
        wallStyle: 'bio-nest',
        floorStyle: 'bio-hive',
        doorStyle: 'hive',
        signatureProps: ['prop_alien_feeding_basin', 'prop_cave_eggs_intact', 'prop_biomech_incubator', 'prop_hive_resin_sac', 'tina_cosmetic_skin_loom', 'tina_shedding_cocoon_niche'],
        largeProps: [
            'prop_alien_respiratory_vent', 'prop_biomech_sphincter_trap', 'prop_hive_resin_sac', 'prop_cave_hive_wounded',
            'prop_fungal_spore_dispenser', 'prop_fungal_tendril_altar', 'prop_flesh_steel_cradle',
            'decal_hive_growth', 'decal_spore_growth_patch', 'arch_rib_ceiling_vault_03', 'state_wall_breached_03',
            'state_growth_overrun_1', 'state_growth_overrun_2', 'suture_larval_nursery_urn', 'carapace_chitin_press'
        ],
        smallProps: ['prop_cave_eggs_hatched', 'prop_cave_webs', 'scatter_hive_eggs', 'prop_blood_trail', 'decal_claw_scratches', 'fixture_sconce_vine'],
        ambientProps: LIVED_IN_DECALS.bio,
        encounterProfile: 'bio-nest-guard'
    },
    {
        id: 'bio-medical',
        biomes: ['bio'],
        roles: ['medical'],
        weight: 1,
        wallStyle: 'bio-resin',
        floorStyle: 'bio-hive',
        doorStyle: 'medical-seal',
        signatureProps: ['prop_biomech_triage_cradle', 'prop_biomech_respirator', 'prop_biomech_incubator', 'prop_flesh_steel_inhaler', 'vass_hybrid_blood_synthesizer', 'suture_flesh_mending_bath'],
        largeProps: ['prop_biomech_incubator', 'prop_flesh_steel_coffin', 'prop_flesh_steel_inhaler', 'prop_broken_specimen_tank', 'vass_bio_centrifuge_rack', 'vass_dissection_stereomicroscope'],
        smallProps: ['prop_cave_spores', 'decal_biohazard_stencil', 'decal_bio_sample_spill'],
        ambientProps: LIVED_IN_DECALS.bio,
        encounterProfile: 'sterile'
    },
    {
        id: 'bio-security',
        biomes: ['bio'],
        roles: ['security'],
        weight: 1,
        wallStyle: 'bio-nest',
        floorStyle: 'bio-resin',
        doorStyle: 'hive',
        signatureProps: ['prop_biomech_sphincter_trap', 'prop_laser_trap_emitter', 'prop_hive_resin_sac', 'prop_fungal_tendril_altar', 'tank_reactive_armor_forge', 'vesper_mortar_loading_cradle'],
        largeProps: ['prop_hive_resin_sac', 'prop_security_barricade', 'state_wall_breached_03', 'corp_compliance_choker_bench', 'tank_kinetic_ram_breech'],
        smallProps: ['prop_cave_webs', 'decal_claw_scratches', 'fixture_sconce_vine'],
        ambientProps: LIVED_IN_DECALS.bio,
        encounterProfile: 'security'
    },
    {
        id: 'bio-engineering',
        biomes: ['bio'],
        roles: ['engineering'],
        weight: 1,
        wallStyle: 'bio-resin',
        floorStyle: 'bio-resin',
        doorStyle: 'resin',
        signatureProps: ['prop_fungal_mycelium_loom', 'prop_biomech_respirator', 'prop_fungal_spore_dispenser', 'prop_biomech_neural_synapse', 'engineer_robotic_welding_arm', 'geo_steam_manifold_actuator'],
        largeProps: ['prop_fungal_spore_dispenser', 'prop_fungal_resin_basin', 'prop_conduit_hub', 'prop_biomech_neural_synapse', 'hydro_mycelial_seed_vault', 'engineer_magnetic_bottle_cell'],
        smallProps: ['prop_cave_spores', 'decal_oil_spill_patch', 'fixture_sconce_vine'],
        ambientProps: LIVED_IN_DECALS.bio,
        encounterProfile: 'utility'
    },
    {
        id: 'bunker-workshop',
        biomes: ['active'],
        roles: ['engineering'],
        weight: 1.1,
        wallStyle: 'bunker-utility',
        floorStyle: 'bunker-utility',
        doorStyle: 'utility',
        signatureProps: ['prop_engineering_bench', 'prop_fabricator_workstation', 'prop_conduit_hub', 'prop_tesla_coil_node', 'tank_kinetic_ram_breech', 'scout_tachyon_radar_mast'],
        largeProps: ['prop_fusion_generator', 'prop_conduit_hub', 'prop_tesla_coil_node', 'prop_conduit_junction_box', 'prop_chair_operator_wrecked', 'prop_pipe_rupture', 'vesper_barricade_welding_rig', 'meridian_soldering_hearth'],
        smallProps: ['scatter_cable_coil', 'scatter_bolts', 'decal_oil_spill_patch', 'decal_meridian_stencil'],
        ambientProps: LIVED_IN_DECALS.bunker,
        rareProps: ['decal_machine_cult_shrine', 'fixture_clock_dead'],
        encounterProfile: 'utility'
    },
    {
        id: 'bunker-storage',
        biomes: ['active'],
        roles: ['storage'],
        weight: 1,
        wallStyle: 'bunker-storage',
        floorStyle: 'storage',
        doorStyle: 'utility',
        signatureProps: ['prop_bunker_supplies', 'prop_storage_drum_dented', 'prop_ammo_crate_stack', 'prop_locker_bulged', 'corp_asset_incinerator_chute', 'evac_cargo_ballast_scale'],
        largeProps: ['prop_ammo_crate_stack', 'prop_security_locker', 'prop_locker_bulged', 'tina_forged_council_ballot_box', 'corp_quantum_ledger_podium'],
        smallProps: ['scatter_bolts', 'scatter_cable_coil', 'decal_hazard_stripes'],
        ambientProps: LIVED_IN_DECALS.bunker,
        rareProps: ['scatter_horizon_black_box'],
        encounterProfile: 'safe'
    },
    {
        id: 'bunker-armory',
        biomes: ['active'],
        roles: ['security'],
        weight: 1,
        wallStyle: 'bunker-security',
        floorStyle: 'bunker-security',
        doorStyle: 'security',
        signatureProps: ['prop_security_locker', 'prop_ammo_crate_stack', 'prop_biomech_flesh_locker', 'prop_security_barricade', 'vesper_ordnance_disarm_table', 'vesper_dogtag_retrieval_crypt'],
        largeProps: ['prop_security_barricade', 'prop_laser_trap_emitter', 'decal_claw_scratches', 'tank_reactive_armor_forge', 'vesper_ballistic_chronograph'],
        smallProps: ['scatter_bolts', 'decal_hazard_stripes', 'decal_bullet_holes'],
        ambientProps: LIVED_IN_DECALS.bunker,
        rareProps: ['prop_iron_guild_dogtags'],
        encounterProfile: 'security'
    },
    {
        id: 'cryo-recovery',
        biomes: ['cryo'],
        roles: ['medical', 'cryo-lab'],
        weight: 0.9,
        wallStyle: 'cryo-clean',
        floorStyle: 'cryo-tile',
        doorStyle: 'medical-seal',
        signatureProps: ['prop_cryo_sleep_pod', 'prop_vital_monitor', 'prop_medical_bed', 'prop_body_human_frozen', 'corp_cryo_transport_coffin', 'hydro_mycelial_seed_vault'],
        largeProps: ['prop_medical_bed', 'prop_diagnostic_console', 'prop_biomech_triage_cradle', 'prop_body_human_frozen', 'body_frozen_human', 'chasm_geothermal_survey_transit', 'scout_ejection_pod_chassis'],
        smallProps: ['scatter_cryo_shards', 'scatter_coolant_puddle', 'decal_biohazard_stencil', 'decal_footprints_mud'],
        ambientProps: LIVED_IN_DECALS.cryo,
        rareProps: ['decal_pod_312_breach'],
        encounterProfile: 'sterile'
    },
    {
        id: 'bio-feeding-chamber',
        biomes: ['bio'],
        roles: ['hive'],
        weight: 1.15,
        wallStyle: 'bio-nest',
        floorStyle: 'bio-hive',
        doorStyle: 'hive',
        signatureProps: ['prop_alien_feeding_basin', 'prop_biomech_sphincter_trap', 'prop_fungal_resin_basin', 'prop_fungal_mycelium_loom', 'carapace_chitin_press', 'suture_larval_nursery_urn'],
        largeProps: ['prop_alien_respiratory_vent', 'prop_biomech_respirator', 'prop_hive_resin_sac', 'prop_fungal_resin_basin', 'prop_fungal_mycelium_loom', 'decal_spore_growth_patch', 'vass_containment_bell_jar'],
        smallProps: ['prop_cave_spores', 'prop_cave_webs', 'decal_tallow_symbol'],
        ambientProps: LIVED_IN_DECALS.bio,
        encounterProfile: 'bio-nest-guard'
    },
    {
        id: 'camp-fortified',
        biomes: ['active', 'cryo', 'bio'],
        roles: ['camp'],
        weight: 1,
        wallStyle: 'camp-fortified',
        floorStyle: 'camp',
        doorStyle: 'camp',
        signatureProps: ['prop_camp_crates', 'prop_camp_cookfire_lit', 'prop_ammo_crate_stack', 'prop_camp_cot', 'tallow_vaccine_alembic', 'tallow_irrigation_sluice_gate'],
        largeProps: [
            'prop_camp_sandbags', 'scatter_broken_drone', 'prop_camp_cot',
            'prop_camp_crate', 'prop_camp_cookfire_doused', 'prop_chair_operator_wrecked', 'prop_storage_drum_dented', 'arch_bulkhead_frame',
            'state_column_shattered', 'state_barricade_improvised_1', 'state_barricade_improvised_2',
            'tallow_apothecary_dryer_rack', 'relay_harmonic_tuning_fork', 'chasm_cable_traversal_winch'
        ],
        smallProps: [
            'prop_camp_bedrolls', 'scatter_cable_coil', 'scatter_bolts', 'scatter_camp_supplies',
            'prop_blood_trail', 'decal_bullet_holes', 'decal_tallow_symbol',
            'decal_footprints_mud', 'decal_meridian_stencil'
        ],
        ambientProps: LIVED_IN_DECALS.camp,
        rareProps: ['prop_iron_guild_dogtags', 'arch_niche_shrine'],
        encounterProfile: 'safe'
    },
    {
        id: 'reward-cache',
        biomes: ['active', 'cryo', 'bio'],
        roles: ['reward'],
        weight: 0.8,
        wallStyle: 'bunker-storage',
        floorStyle: 'storage',
        doorStyle: 'security',
        signatureProps: ['prop_bunker_supplies', 'prop_ammo_crate_stack', 'prop_corporate_saint_reliquary', 'prop_votive_candle_shrine', 'corp_quantum_ledger_podium', 'hydro_mycelial_seed_vault'],
        largeProps: ['prop_camp_crates', 'prop_votive_candle_shrine', 'arch_deco_archway_grand_04', 'arch_pillar_buttress_03', 'corp_biometric_wall_safe', 'evac_cargo_ballast_scale'],
        smallProps: ['scatter_bolts', 'decal_hazard_stripes', 'decal_meridian_stencil'],
        ambientProps: LIVED_IN_DECALS.bunker,
        // Tina's decoy beacon still lures salvagers into caches (unplaced until 2026-10-28).
        rareProps: ['scatter_horizon_black_box', 'arch_window_stained', 'arch_niche_shrine', 'prop_shrine_plinth_broken', 'prop_flesh_steel_coffin', 'tina_secret_distress_beacon'],
        encounterProfile: 'safe'
    },
    {
        id: 'giger-cathedral',
        biomes: ['active', 'bio', 'cryo'],
        roles: ['security', 'reward', 'engineering', 'generic'],
        weight: 1.25,
        wallStyle: 'giger',
        floorStyle: 'giger',
        doorStyle: 'hive',
        signatureProps: ['prop_corporate_saint_reliquary', 'prop_biomech_spore_umbilical_cable_rigged', 'prop_votive_candle_shrine', 'prop_oxygen_bottle_cascade_rack', 'vass_translation_phonograph', 'meridian_logic_core_drum', 'mothership_docking_umbilical_collar'],
        largeProps: [
            'prop_pipe_organ_heat_exchanger', 'prop_liturgical_terminal_lectern', 'prop_coolant_drum_leaking_pool',
            'prop_exosuit_docking_gantry', 'prop_decon_eyewash_shower_station', 'prop_autopsy_dissection_slab',
            'prop_biomech_sphincter_hatch_vent', 'prop_biomech_tracheal_wall_pipe', 'prop_vertebral_cable_riser',
            'prop_ceiling_crane_hoist', 'prop_floor_drainage_sump_trough', 'prop_floor_conduit_bridge',
            'prop_wall_cable_tray_swag', 'prop_maintenance_tool_cart', 'prop_exhaust_blower_fan_hood',
            'arch_deco_archway_grand_01', 'arch_pillar_buttress_01', 'arch_rib_ceiling_vault_01',
            'chasm_hanging_cage_crane', 'chasm_steam_whistle_buoy', 'carapace_ossuary_anvil'
        ],
        smallProps: ['prop_overhead_cage_fluorescent', 'scatter_bolts', 'scatter_cable_coil', 'fixture_sconce_vine'],
        ambientProps: LIVED_IN_DECALS.bio,
        // The assembled guillotine door stands as a working gate (unplaced until 2026-10-28).
        rareProps: ['prop_corporate_saint_reliquary', 'prop_votive_candle_shrine', 'door_arch_guillotine_assembled'],
        encounterProfile: 'security'
    },
    {
        id: 'bunker-substation',
        biomes: ['active'],
        roles: ['utility', 'engineering'],
        weight: 1.1,
        wallStyle: 'substation',
        floorStyle: 'substation',
        doorStyle: 'utility',
        signatureProps: ['prop_fusion_generator', 'prop_conduit_hub', 'prop_tesla_coil_node', 'prop_cyber_junction', 'substation_stepdown_transformer', 'substation_breaker_interlock'],
        largeProps: ['prop_engineering_bench', 'prop_conduit_junction_box', 'prop_pipe_rupture', 'prop_diagnostic_console', 'decal_substation_stencil', 'decal_electrical_scorch', 'meridian_optic_nerve_patchbay', 'meridian_logic_core_drum'],
        smallProps: ['scatter_cable_coil', 'scatter_bolts', 'prop_valve_wheel_fused', 'decal_hazard_chevron'],
        ambientProps: LIVED_IN_DECALS.bunker,
        encounterProfile: 'utility'
    },
    {
        id: 'cryo-permafrost',
        biomes: ['cryo'],
        roles: ['generic', 'storage', 'reward'],
        weight: 1.05,
        wallStyle: 'permafrost',
        floorStyle: 'permafrost',
        doorStyle: 'cryo',
        signatureProps: ['prop_icey_thermal_pod', 'prop_icey_frost_vent', 'prop_icey_frost_manifold', 'prop_cryo_sleep_pod', 'chasm_geothermal_survey_transit', 'chasm_abyss_sounding_mortar'],
        largeProps: ['prop_ruptured_coolant_pump', 'frozen_tanker', 'decal_cryo_fracture', 'decal_permafrost_icicles', 'corp_cryo_transport_coffin', 'evac_cryo_hypergolic_manifold'],
        smallProps: ['scatter_cryo_shards', 'scatter_cryo_icicle', 'scatter_coolant_puddle', 'decal_footprints_mud'],
        ambientProps: LIVED_IN_DECALS.cryo,
        encounterProfile: 'cryo-standard'
    },
    {
        id: 'bunker-cleanroom',
        biomes: ['active', 'cryo'],
        roles: ['medical', 'engineering'],
        weight: 1.0,
        wallStyle: 'cleanroom',
        floorStyle: 'cleanroom',
        doorStyle: 'medical-seal',
        signatureProps: ['prop_diagnostic_console', 'prop_vital_monitor', 'prop_medical_bed', 'prop_surgical_cart', 'vass_dissection_stereomicroscope', 'vass_bio_centrifuge_rack'],
        largeProps: ['prop_broken_specimen_tank', 'prop_specimen_tank', 'prop_biomech_triage_cradle', 'prop_decon_eyewash_shower_station', 'decal_biohazard_stencil', 'decal_substation_stencil', 'vass_hybrid_blood_synthesizer', 'vass_containment_bell_jar'],
        smallProps: ['scatter_bolts', 'prop_overhead_cage_fluorescent', 'decal_hazard_chevron'],
        ambientProps: LIVED_IN_DECALS.bunker,
        encounterProfile: 'sterile'
    },
    {
        id: 'bio-mycelium',
        biomes: ['bio'],
        roles: ['generic', 'utility', 'nest'],
        weight: 1.15,
        wallStyle: 'mycelium',
        floorStyle: 'mycelium',
        doorStyle: 'resin',
        signatureProps: ['prop_spore_colony', 'prop_fungal_spore_dispenser', 'prop_fungal_mycelium_loom', 'prop_alien_respiratory_vent', 'hydro_mycelial_seed_vault', 'tina_cosmetic_skin_loom'],
        largeProps: ['prop_fungal_resin_basin', 'prop_hive_resin_sac', 'prop_flesh_steel_cradle', 'decal_bio_mycelium', 'decal_bio_spore_vent', 'decal_spore_growth_patch', 'tallow_apothecary_dryer_rack', 'suture_larval_nursery_urn'],
        smallProps: ['prop_cave_spores', 'scatter_slime_puddle', 'fixture_sconce_vine'],
        ambientProps: LIVED_IN_DECALS.bio,
        encounterProfile: 'bio-standard'
    },
    {
        id: 'giger-obsidian',
        biomes: ['active', 'cryo', 'bio'],
        roles: ['reward', 'security'],
        weight: 1.1,
        wallStyle: 'obsidian',
        floorStyle: 'obsidian',
        doorStyle: 'hive',
        signatureProps: ['prop_corporate_saint_reliquary', 'prop_votive_candle_shrine', 'prop_liturgical_terminal_lectern', 'prop_pipe_organ_heat_exchanger', 'carapace_ossuary_anvil', 'mothership_docking_umbilical_collar'],
        largeProps: ['arch_deco_archway_grand_01', 'arch_pillar_buttress_01', 'arch_rib_ceiling_vault_01', 'decal_cathedral_runic', 'decal_giger_relief', 'relay_harmonic_tuning_fork', 'chasm_hanging_cage_crane'],
        smallProps: ['scatter_bolts', 'scatter_cable_coil', 'fixture_sconce_vine'],
        ambientProps: LIVED_IN_DECALS.bio,
        encounterProfile: 'security'
    },
    {
        id: 'bunker-toxic-sump',
        biomes: ['active', 'bio'],
        roles: ['utility', 'storage'],
        weight: 1.0,
        wallStyle: 'toxic_sump',
        floorStyle: 'toxic_sump',
        doorStyle: 'utility',
        signatureProps: ['prop_floor_drainage_sump_trough', 'prop_pipe_rupture', 'prop_o2_filter_vat', 'prop_storage_drum_dented', 'geo_pressure_relief_siren', 'geo_steam_manifold_actuator'],
        largeProps: ['prop_coolant_drum_leaking_pool', 'prop_conduit_junction_box', 'prop_exhaust_blower_fan_hood', 'decal_hazard_chevron', 'decal_evac_treads', 'evac_cabin_co2_scrubber', 'evac_manual_abort_detonator'],
        smallProps: ['scatter_bolts', 'decal_oil_spill_patch', 'decal_hazard_stripes'],
        ambientProps: LIVED_IN_DECALS.bunker,
        encounterProfile: 'utility'
    }
]);

const ROLE_SEQUENCE = ['generic', 'utility', 'medical', 'security', 'engineering', 'storage', 'reward'];

// Lane B room builds expose semantic planning roles (support, objective,
// challenge, ringCrossing) that intentionally do not mirror presentation
// roles. Prefer the authored family, then translate a semantic role, so those
// rooms do not silently fall through to the generic bunker theme.
export const ROOM_FAMILY_THEME_ROLES = Object.freeze({
    medical: 'medical',
    rescue: 'medical',
    armory: 'security',
    security: 'security',
    gate: 'security',
    arena: 'security',
    trap: 'security',
    trap_reward: 'security',
    o2: 'engineering',
    fabricator: 'engineering',
    engineering: 'engineering',
    puzzle: 'engineering',
    objective: 'engineering',
    mission: 'engineering',
    cache: 'reward',
    salvage: 'reward',
    storage: 'storage',
    lore: 'reward',
    camp: 'camp',
    hive: 'hive',
    queen: 'hive',
    entry: 'generic',
    connector: 'generic'
});

export const SEMANTIC_ROOM_THEME_ROLES = Object.freeze({
    support: 'utility',
    questDestination: 'utility',
    objective: 'engineering',
    shipGoalObjective: 'engineering',
    challenge: 'security',
    ringCrossing: 'security',
    fallbackResourceRoute: 'engineering'
});

export function chooseRoomRole(room, { biome = 'active', depthTier = 0, random = () => 0.5 } = {}) {
    const familyRole = ROOM_FAMILY_THEME_ROLES[room?.family];
    if (familyRole) return familyRole;
    const authored = SEMANTIC_ROOM_THEME_ROLES[room?.role] ?? room?.role;
    if (authored && authored !== 'generic') return authored;
    if (biome === 'bio' && depthTier >= 2 && random() < 0.3) return random() < 0.62 ? 'nest' : 'hive';
    if (biome === 'cryo' && depthTier >= 1 && random() < 0.22) return 'cryo-lab';
    if ((room?.doors?.length ?? 0) === 1 && random() < 0.28) return 'reward';
    const maxIndex = Math.min(ROLE_SEQUENCE.length, 3 + Math.max(0, depthTier));
    return ROLE_SEQUENCE[Math.floor(random() * maxIndex)] ?? 'generic';
}

export function chooseRoomTheme(room, { biome = 'active', depthTier = 0, random = () => 0.5 } = {}) {
    const normalizedBiome = String(biome).toLowerCase();
    const role = chooseRoomRole(room, { biome: normalizedBiome, depthTier, random });
    let candidates = ROOM_THEME_CATALOG.filter((theme) => (
        theme.biomes.includes(normalizedBiome) && theme.roles.includes(role)
    ));
    if (candidates.length === 0) {
        candidates = ROOM_THEME_CATALOG.filter((theme) => (
            theme.biomes.includes(normalizedBiome) && theme.roles.includes('generic')
        ));
    }
    if (candidates.length === 0) candidates = [ROOM_THEME_CATALOG[0]];
    const total = candidates.reduce((sum, theme) => sum + theme.weight, 0);
    let roll = random() * total;
    let selected = candidates[candidates.length - 1];
    for (const theme of candidates) {
        roll -= theme.weight;
        if (roll <= 0) {
            selected = theme;
            break;
        }
    }
    return { role, theme: selected };
}

export const PRESENTATION_STATE_MODIFIERS = Object.freeze({
    intact: Object.freeze({ propPrefix: '', decal: null }),
    dormant: Object.freeze({ propPrefix: '', decal: null }),
    questActive: Object.freeze({ propPrefix: '', decal: 'decal_hazard_stripes' }),
    resolved: Object.freeze({ propPrefix: '', decal: 'decal_meridian_stencil' }),
    abandoned: Object.freeze({ propPrefix: 'scatter_', decal: 'decal_footprints_mud' }),
    infested: Object.freeze({ propPrefix: 'prop_hive_', decal: 'decal_spore_growth_patch' }),
    looted: Object.freeze({ propPrefix: 'scatter_', decal: 'decal_wall_breach' }),
    wounded: Object.freeze({ propPrefix: 'prop_', decal: 'prop_blood_trail' }),
    bonded: Object.freeze({ propPrefix: 'prop_', decal: 'decal_growth_creep_1' }),
    culled: Object.freeze({ propPrefix: 'scatter_', decal: 'decal_barricade_last_stand' }),
    turned: Object.freeze({ propPrefix: 'prop_hive_', decal: 'decal_spore_growth_patch' })
});

export function resolveThemeWithStateVariant(themeConfig, stateVariant = 'intact') {
    if (!themeConfig) return themeConfig;
    const modifier = PRESENTATION_STATE_MODIFIERS[stateVariant] ?? PRESENTATION_STATE_MODIFIERS.intact;
    return {
        ...themeConfig,
        stateVariant,
        appliedDecal: modifier.decal
    };
}

export function assignRoomThemes(rooms, options = {}) {
    const stateVariant = options.stateVariant ?? 'intact';
    return (rooms ?? []).map((room) => {
        const selection = chooseRoomTheme(room, options);
        const resolvedTheme = resolveThemeWithStateVariant(selection.theme, room.stateVariant ?? stateVariant);
        return {
            ...room,
            role: selection.role,
            theme: resolvedTheme.id,
            themeConfig: resolvedTheme
        };
    });
}
