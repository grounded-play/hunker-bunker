import * as THREE from 'three';
import { createPropArticulation } from './propArticulation.js';
import { WORLD_EXPANSION_80_SPECS } from './data/worldExpansion80.js';

const freezeProfile = (value) => Object.freeze({
    ...value,
    behaviors: Object.freeze([...(value.behaviors ?? [])]),
    presentation: value.presentation ? Object.freeze({ ...value.presentation }) : null
});

const terminal = (color, options = {}) => freezeProfile({
    behaviors: ['use', 'proximity', 'damage'],
    dynamic: true,
    updateDistance: 18,
    presentation: {
        acknowledgeColor: color,
        acknowledgeDuration: options.duration ?? 0.55,
        acknowledgeIntensity: options.intensity ?? 2.4
    }
});

// Props with cut-out moving parts (scripts/blender/articulation_recipes.py):
// E opens/closes their doors or starts/stops their rotors.
const mechanism = (color, behaviors = ['use', 'damage'], options = {}) => freezeProfile({
    behaviors,
    dynamic: true,
    updateDistance: 18,
    articulated: true,
    presentation: {
        acknowledgeColor: color,
        acknowledgeDuration: options.duration ?? 0.45,
        acknowledgeIntensity: options.intensity ?? 1.2,
        ...(options.flicker != null ? {
            flicker: options.flicker,
            flickerSpeed: options.flickerSpeed ?? 1.0,
            dropout: options.dropout ?? false
        } : {})
    }
});

const flickering = (color, options = {}) => freezeProfile({
    behaviors: ['use', 'ambient', 'damage'],
    dynamic: true,
    updateDistance: 18,
    presentation: {
        acknowledgeColor: color,
        acknowledgeDuration: options.duration ?? 0.45,
        acknowledgeIntensity: options.intensity ?? 1.8,
        flicker: options.flicker ?? 0.28,
        flickerSpeed: options.flickerSpeed ?? 1.0,
        dropout: options.dropout ?? false
    }
});

const passive = (behaviors) => freezeProfile({ behaviors });

const WORLD_EXPANSION_80_EXPERIENCE = Object.freeze(Object.fromEntries(
    WORLD_EXPANSION_80_SPECS.map((spec) => {
        const color = spec.fx === 'organic' ? 0x84cc16
            : spec.fx === 'thermal' ? 0xf59e0b
                : spec.fx === 'liquid' ? 0x22d3ee
                    : 0x38bdf8;
        return [spec.id, mechanism(color, ['use', 'ambient', 'damage'])];
    })
));

export const PROP_EXPERIENCE_PROFILES = Object.freeze({
    ...WORLD_EXPANSION_80_EXPERIENCE,
    life_arcade_cabinet: terminal(0x55d9ff, { intensity: 2.1 }),
    life_surgical_lamp: terminal(0xe9fff4, { duration: 0.35, intensity: 1.5 }),
    cryo_heater_station: terminal(0xff7a24, { duration: 0.4, intensity: 1.7 }),
    hive_brood_dome: terminal(0x92d65c, { duration: 0.5, intensity: 1.5 }),
    chasm_beacon_post: terminal(0xef4444, { duration: 0.35, intensity: 2 }),
    corp_executive_sarcophagus: terminal(0xd946ef, { intensity: 2 }),
    corp_suppression_barrier: mechanism(0xef4444),
    meridian_capacitor_bomb: terminal(0xffa648, { duration: 0.45, intensity: 2.2 }),
    tina_covert_nursery_chest: terminal(0x76d95c, { duration: 0.5, intensity: 1.6 }),
    hive_sphincter_iris: mechanism(0xa3e635),
    ind_biomass_grinder: mechanism(0xff8a2b, ['use', 'ambient', 'damage']),
    crash_cockpit_canopy: terminal(0xff7a24, { duration: 0.45, intensity: 1.7 }),

    // Pass 2 world-story mature models (19 models)
    bay_c_pod_312_rupture: terminal(0x4deeea, { duration: 0.45, intensity: 1.8 }),
    chen_sealed_confession_console: terminal(0xffa834, { duration: 0.5, intensity: 2.0 }),
    decon_exosuit_scrubber_station: mechanism(0xd8f8ff, ['use', 'ambient', 'damage']),
    prop_exosuit_docking_gantry: mechanism(0xffcc00, ['use', 'ambient', 'damage']),
    engineer_wave_relay_dynamo: mechanism(0x38bdf8, ['use', 'ambient', 'damage']),
    evac_four_seat_cockpit_module: terminal(0xff7830, { duration: 0.5, intensity: 1.9 }),
    tank_orbital_siege_cannon: mechanism(0xff4433, ['use', 'damage']),

    queen_royal_brood_throne: terminal(0xa855f7, { duration: 0.6, intensity: 2.2 }),
    carapace_sentry_chrysalis: terminal(0xa3e635, { duration: 0.4, intensity: 1.6 }),
    royal_egg_clutch_caul: terminal(0xf59e0b, { duration: 0.45, intensity: 1.7 }),
    vass_acoustic_resonator_tank: mechanism(0x06b6d4, ['use', 'ambient', 'damage']),
    vass_hybrid_embryo_incubator: terminal(0x84cc16, { duration: 0.5, intensity: 1.8 }),
    suture_mercy_cocoon_canopy: terminal(0x2dd4bf, { duration: 0.55, intensity: 2.0 }),
    relay_false_beacon_spire: mechanism(0xfbbf24, ['use', 'ambient', 'damage']),

    corp_biometric_collar_chute: mechanism(0xef4444, ['use', 'damage']),
    crawler_signal_antenna_rig: mechanism(0xff3333, ['use', 'ambient', 'damage']),
    evac_manifest_allocation_terminal: terminal(0x4ade80, { duration: 0.45, intensity: 2.1 }),
    evac_preflight_fuel_umbilical: mechanism(0xfacc15, ['use', 'damage']),
    scout_tracking_beacon_core: terminal(0x60a5fa, { duration: 0.35, intensity: 2.2 }),
    sector_zero_bore_drillhead: mechanism(0xffedd5, ['use', 'ambient', 'damage']),

    // Wave D: Pass 1 Corporate, Meridian, Tallow & Vesper (15 models)
    corp_interrogation_chair: terminal(0xef4444, { duration: 0.45, intensity: 1.8 }),
    corp_debt_severing_kiosk: terminal(0xf59e0b, { duration: 0.45, intensity: 2.0 }),
    corp_dissection_gurney: terminal(0xe2e8f0, { duration: 0.4, intensity: 1.6 }),
    corp_incinerator_hopper: mechanism(0xf97316, ['use', 'ambient', 'damage']),
    meridian_cyber_graft_bench: mechanism(0x06b6d4, ['use', 'ambient', 'damage']),
    meridian_mainframe_altar: terminal(0x38bdf8, { duration: 0.5, intensity: 2.1 }),
    meridian_servitor_dock: mechanism(0x2563eb, ['use', 'damage']),
    tallow_compost_fermenter: terminal(0x65a30d, { duration: 0.4, intensity: 1.7 }),
    tallow_spore_cradle: terminal(0x84cc16, { duration: 0.45, intensity: 1.6 }),
    tallow_flesh_trellis: mechanism(0x16a34a),
    tallow_sacrificial_altar: terminal(0xdc2626, { duration: 0.5, intensity: 2.0 }),
    vesper_amputation_rig: mechanism(0xb91c1c, ['use', 'damage']),
    vesper_autocannon_bipod: mechanism(0xf59e0b, ['use', 'damage']),
    vesper_hanging_cage: mechanism(0xef4444, ['use', 'damage']),
    vesper_reloading_station: mechanism(0xfde047, ['use', 'damage']),

    // Wave E: Pass 1 Hive, Cryo Brutality, Tina & Chasm (18 models)
    tina_molted_carapace: terminal(0xa3e635, { duration: 0.4, intensity: 1.6 }),
    tina_mimic_vanity: terminal(0xf1f5f9, { duration: 0.45, intensity: 1.8 }),
    tina_trophy_trove: terminal(0xfbbf24, { duration: 0.5, intensity: 2.2 }),
    hive_visceral_ovipositor: terminal(0xe11d48, { duration: 0.5, intensity: 2.0 }),
    hive_vivisected_engineer: terminal(0x06b6d4, { duration: 0.45, intensity: 1.8 }),
    hive_gestation_sac: terminal(0xf59e0b, { duration: 0.45, intensity: 1.7 }),
    hive_pulmonary_bellows: mechanism(0xf43f5e, ['use', 'ambient', 'damage']),
    hive_amniotic_feeder_trough: terminal(0x84cc16, { duration: 0.4, intensity: 1.7 }),
    cryo_ruptured_pod: terminal(0x38bdf8, { duration: 0.45, intensity: 1.7 }),
    cryo_cannibal_butchery_table: terminal(0xd97706, { duration: 0.45, intensity: 1.8 }),
    cryo_ice_core_specimen: terminal(0x0ea5e9, { duration: 0.45, intensity: 1.9 }),
    cryo_thawing_trough: mechanism(0xf97316, ['use', 'ambient', 'damage']),
    cryo_frozen_shelter_pod: mechanism(0xef4444, ['use', 'damage']),
    chasm_hanging_elevator: mechanism(0xf59e0b, ['use', 'damage']),
    chasm_suicide_ledge_cross: terminal(0xf59e0b, { duration: 0.5, intensity: 1.8 }),
    chasm_dredge_hook_crane: mechanism(0xeab308, ['use', 'damage']),
    ind_hydraulic_manifold: mechanism(0x0284c7, ['use', 'ambient', 'damage']),
    ind_fuel_rod_cask: mechanism(0xf59e0b, ['use', 'damage']),

    // Wave F: 2026-10-11 World Completion Machinery, Daily Life & Camps (28 models)
    life_pallet_racking: mechanism(0x94a3b8),
    life_server_racks: terminal(0x38bdf8, { duration: 0.45, intensity: 2.0 }),
    life_transformer_bank: mechanism(0xef4444, ['use', 'ambient', 'damage']),
    life_fire_station: mechanism(0xdc2626, ['use', 'damage']),
    life_conveyor_section: mechanism(0xfacc15, ['use', 'damage']),
    life_cistern_tank: terminal(0x38bdf8, { duration: 0.4, intensity: 1.8 }),
    life_scaffold_tower: mechanism(0xfef08a),
    life_forklift: mechanism(0xf59e0b, ['use', 'damage']),
    life_sink_row: mechanism(0x38bdf8),
    life_shower_stall: mechanism(0x0284c7, ['use', 'ambient']),
    life_laundry_machines: mechanism(0xf59e0b),
    life_weight_bench: mechanism(0x94a3b8),
    life_filing_cabinets: mechanism(0x94a3b8),
    life_overseer_desk: terminal(0x22c55e, { duration: 0.45, intensity: 1.8 }),
    life_planning_board: terminal(0xfef08a, { duration: 0.45, intensity: 1.7 }),
    life_algae_tank: terminal(0x22c55e, { duration: 0.4, intensity: 1.8 }),
    cryo_ice_crawler: mechanism(0x7dd3fc, ['use', 'damage']),
    cryo_snowbound_crates: mechanism(0x38bdf8),
    cryo_ice_blocks: mechanism(0x7dd3fc),
    hive_resin_pillar: terminal(0x4ade80, { duration: 0.45, intensity: 1.8 }),
    hive_cocooned_crew: terminal(0x84cc16, { duration: 0.5, intensity: 2.0 }),
    hive_pheromone_node: terminal(0xa3e635, { duration: 0.4, intensity: 1.7 }),
    hive_assimilated_generator: mechanism(0x84cc16, ['use', 'ambient', 'damage']),
    crash_engine_nacelle: mechanism(0xf97316, ['use', 'damage']),
    crash_hull_panels: mechanism(0x94a3b8),
    salvage_tagged_heap: mechanism(0xf59e0b, ['use', 'damage']),
    camp_canvas_tent: mechanism(0xfbbf24, ['use']),
    camp_water_barrel: mechanism(0x38bdf8),
    life_ribcage_rescue_cabinet: mechanism(0xef4444, ['use', 'ambient', 'damage'], { flicker: 0.28, flickerSpeed: 0.9 }),
    life_confessional: mechanism(0xffb84d),
    life_seismic_drill: mechanism(0xffa648, ['use', 'ambient', 'damage']),
    life_ice_bore_winch: mechanism(0x5fe3ff, ['use', 'ambient', 'damage']),
    life_supply_drop_pod: mechanism(0xffa648, ['use', 'inspect', 'damage']),
    base_console: terminal(0x52ff9a),
    o2_generator: terminal(0x55d9ff, { intensity: 2.8 }),
    prop_diagnostic_console: terminal(0x52ff9a),
    prop_fabricator_workstation: terminal(0x55d9ff),
    prop_liturgical_terminal_lectern: terminal(0xffb84d),
    prop_terminal_ruptured: flickering(0xef4444, { duration: 0.42, intensity: 1.8, flicker: 0.35, dropout: true }),
    prop_camp_meridian_radio: terminal(0xf59e0b, { intensity: 1.9 }),
    prop_light_cluster_dripping: flickering(0x9ec8ba, { duration: 0.4, intensity: 1.6, flicker: 0.30, dropout: true }),
    prop_overhead_cage_fluorescent: flickering(0xf59e0b, { duration: 0.35, intensity: 1.5, flicker: 0.25 }),
    life_route_map_table: terminal(0x55d9ff),
    life_tactile_console: terminal(0x76d95c),
    life_assimilated_desk: terminal(0x76d95c),
    life_cochlear_intercom: flickering(0xf59e0b, { duration: 0.4, intensity: 1.8, flicker: 0.22, flickerSpeed: 1.0 }),
    life_fuse_bypass_panel: flickering(0xff3b2f, { duration: 0.4, intensity: 2.0, flicker: 0.38, dropout: true }),

    // 2026-10-12 Rebuild cohort: Doors, base modules, ship salvage, weapons & barriers
    base_door_sealable_bulkhead: mechanism(0x38bdf8, ['use', 'ambient', 'damage']),
    door_arch_guillotine_assembled: mechanism(0xff4433, ['use', 'ambient', 'damage']),
    weapon_flamethrower_case: mechanism(0xf59e0b, ['use', 'inspect', 'damage']),
    ship_module_navigation_core: mechanism(0x38bdf8, ['use', 'ambient', 'damage']),
    ship_module_comms_transceiver: mechanism(0x22c55e, ['use', 'ambient', 'damage']),
    ship_module_engine_manifold: terminal(0xf97316, { duration: 0.45, intensity: 2.0 }),
    ship_module_life_support_core: terminal(0x38bdf8, { duration: 0.5, intensity: 2.2 }),
    base_o2_atmospheric_regulator: terminal(0x38bdf8, { duration: 0.4, intensity: 2.0 }),
    base_o2_overhead_duct: terminal(0x22c55e, { duration: 0.3, intensity: 1.5 }),
    base_power_junction_box: terminal(0xfacc15, { duration: 0.45, intensity: 2.2 }),
    base_cot_installed: passive(['use', 'sleep-anchor']),
    carry_field_cot_folded: passive(['carry', 'inspect']),
    weapon_flamethrower_m70: passive(['pickup', 'inspect']),
    weapon_fuel_canister_heavy: passive(['pickup', 'inspect']),
    barrier_ice_intact: passive(['ambient', 'fire-damage']),
    barrier_ice_fractured: passive(['ambient', 'fire-damage']),
    barrier_ice_melting: passive(['ambient', 'fire-damage']),
    wall_macro_buttress_3: passive(['structural', 'damage']),
    wall_macro_straight_4: passive(['structural', 'damage']),
    door_arch_guillotine_frame: passive(['structural']),
    door_arch_guillotine_slab: passive(['structural', 'damage']),

    // 2026-10-14 Interactive World Expansion (60 models)
    geo_steam_manifold_actuator: mechanism(0xf59e0b, ['use', 'ambient', 'damage']),
    tallow_vaccine_alembic: mechanism(0x84cc16, ['use', 'ambient', 'damage']),
    hydro_mycelial_seed_vault: mechanism(0xf59e0b, ['use', 'ambient', 'damage']),
    tallow_irrigation_sluice_gate: mechanism(0x84cc16, ['use', 'damage']),
    tallow_apothecary_dryer_rack: terminal(0x84cc16, { duration: 0.45, intensity: 1.8 }),
    geo_pressure_relief_siren: terminal(0xf59e0b, { duration: 0.4, intensity: 2.0 }),
    meridian_optic_nerve_patchbay: terminal(0x22d3ee, { duration: 0.5, intensity: 2.2 }),
    substation_stepdown_transformer: mechanism(0x22d3ee, ['use', 'ambient', 'damage']),
    meridian_servitor_recharge_cradle: terminal(0x22d3ee, { duration: 0.45, intensity: 2.0 }),
    meridian_logic_core_drum: mechanism(0x22d3ee, ['use', 'ambient', 'damage']),
    substation_breaker_interlock: mechanism(0x22d3ee, ['use', 'damage']),
    meridian_soldering_hearth: terminal(0x22d3ee, { duration: 0.4, intensity: 1.8 }),
    vesper_ordnance_disarm_table: mechanism(0xef4444, ['use', 'damage']),
    vesper_trench_warning_klaxon: terminal(0xef4444, { duration: 0.45, intensity: 2.2 }),
    vesper_ballistic_chronograph: terminal(0xef4444, { duration: 0.4, intensity: 1.8 }),
    vesper_mortar_loading_cradle: mechanism(0xef4444, ['use', 'damage']),
    vesper_dogtag_retrieval_crypt: terminal(0xef4444, { duration: 0.5, intensity: 2.0 }),
    vesper_barricade_welding_rig: mechanism(0xef4444, ['use', 'damage']),
    corp_biometric_wall_safe: mechanism(0xef4444, ['use', 'damage']),
    corp_quantum_ledger_podium: terminal(0xef4444, { duration: 0.45, intensity: 2.1 }),
    corp_compliance_choker_bench: mechanism(0xef4444, ['use', 'damage']),
    corp_asset_incinerator_chute: mechanism(0xef4444, ['use', 'ambient', 'damage']),
    corp_cryo_transport_coffin: mechanism(0xef4444, ['use', 'damage']),
    corp_executive_whisper_booth: terminal(0xef4444, { duration: 0.5, intensity: 2.0 }),
    suture_flesh_mending_bath: mechanism(0x22c55e, ['use', 'ambient', 'damage']),
    suture_larval_nursery_urn: terminal(0x22c55e, { duration: 0.45, intensity: 1.9 }),
    relay_harmonic_tuning_fork: terminal(0x22d3ee, { duration: 0.5, intensity: 2.2 }),
    relay_acoustic_diaphragm: mechanism(0x22d3ee, ['use', 'ambient', 'damage']),
    carapace_chitin_press: mechanism(0x22c55e, ['use', 'ambient', 'damage']),
    carapace_ossuary_anvil: terminal(0x22c55e, { duration: 0.45, intensity: 1.9 }),
    vass_translation_phonograph: mechanism(0x22d3ee, ['use', 'ambient', 'damage']),
    vass_bio_centrifuge_rack: mechanism(0x22d3ee, ['use', 'ambient', 'damage']),
    vass_neural_sync_helmet: terminal(0x22d3ee, { duration: 0.45, intensity: 2.0 }),
    vass_hybrid_blood_synthesizer: mechanism(0x22d3ee, ['use', 'ambient', 'damage']),
    vass_containment_bell_jar: terminal(0x22d3ee, { duration: 0.4, intensity: 1.8 }),
    vass_dissection_stereomicroscope: terminal(0x22d3ee, { duration: 0.4, intensity: 1.7 }),
    tina_vocal_mimic_synthesizer: mechanism(0x84cc16, ['use', 'ambient', 'damage']),
    tina_cosmetic_skin_loom: mechanism(0x84cc16, ['use', 'damage']),
    tina_forged_council_ballot_box: terminal(0x84cc16, { duration: 0.45, intensity: 1.9 }),
    tina_shedding_cocoon_niche: terminal(0x84cc16, { duration: 0.5, intensity: 2.0 }),
    tina_secret_distress_beacon: terminal(0x84cc16, { duration: 0.4, intensity: 2.2 }),
    chasm_seismic_geophone_station: terminal(0xf59e0b, { duration: 0.45, intensity: 1.8 }),
    chasm_cable_traversal_winch: mechanism(0xf59e0b, ['use', 'ambient', 'damage']),
    chasm_abyss_sounding_mortar: mechanism(0xf59e0b, ['use', 'damage']),
    chasm_steam_whistle_buoy: mechanism(0xf59e0b, ['use', 'ambient', 'damage']),
    chasm_hanging_cage_crane: mechanism(0xf59e0b, ['use', 'damage']),
    chasm_geothermal_survey_transit: terminal(0xf59e0b, { duration: 0.4, intensity: 1.8 }),
    scout_tachyon_radar_mast: mechanism(0x22d3ee, ['use', 'ambient', 'damage']),
    scout_ejection_pod_chassis: mechanism(0x22d3ee, ['use', 'damage']),
    tank_reactive_armor_forge: mechanism(0xf59e0b, ['use', 'ambient', 'damage']),
    tank_kinetic_ram_breech: mechanism(0xf59e0b, ['use', 'damage']),
    engineer_magnetic_bottle_cell: mechanism(0x22d3ee, ['use', 'ambient', 'damage']),
    engineer_robotic_welding_arm: mechanism(0x22d3ee, ['use', 'damage']),
    evac_avionics_gyro_gimbal: mechanism(0xf59e0b, ['use', 'ambient', 'damage']),
    evac_cryo_hypergolic_manifold: mechanism(0xf59e0b, ['use', 'damage']),
    evac_cabin_co2_scrubber: terminal(0xf59e0b, { duration: 0.45, intensity: 1.8 }),
    evac_manual_abort_detonator: terminal(0xef4444, { duration: 0.4, intensity: 2.2 }),
    evac_cargo_ballast_scale: terminal(0xf59e0b, { duration: 0.35, intensity: 1.7 }),
    mothership_docking_umbilical_collar: mechanism(0xeab308, ['use', 'ambient', 'damage']),

    // 2026-10-27 Missing World Story Cohort (Quest, Camp, Alien/Hive, Scatter, Evac)
    quest_reactor_valves: mechanism(0xef4444, ['use', 'ambient', 'damage']),
    quest_lost_probe: terminal(0x22d3ee, { duration: 0.5, intensity: 2.2 }),
    quest_hive_archive_node: terminal(0x10b981, { duration: 0.55, intensity: 2.0 }),
    quest_red_mould_bloom: mechanism(0xef4444, ['use', 'ambient', 'damage']),
    quest_cultist_shrine: terminal(0xf59e0b, { duration: 0.45, intensity: 1.8 }),
    quest_kaelen_ledger_desk: terminal(0x22d3ee, { duration: 0.5, intensity: 2.1 }),
    quest_martha_warm_pipe_junction: mechanism(0xf97316, ['use', 'ambient', 'damage']),
    quest_infested_armory_cabinet: mechanism(0x84cc16, ['use', 'damage']),
    quest_holdout_barricade: mechanism(0xef4444, ['use', 'damage']),
    quest_briggs_memorial_wall: terminal(0xf59e0b, { duration: 0.45, intensity: 1.9 }),

    prop_camp_meridian_battery_bank: mechanism(0x38bdf8, ['use', 'ambient', 'damage']),
    prop_camp_meridian_repair_rig: mechanism(0x06b6d4, ['use', 'ambient', 'damage']),
    prop_camp_tallow_still: mechanism(0xf59e0b, ['use', 'ambient', 'damage']),
    prop_camp_tallow_spore_trays: mechanism(0x84cc16, ['use', 'ambient', 'damage']),
    prop_camp_tallow_resin_urn: terminal(0xf59e0b, { duration: 0.45, intensity: 1.8 }),
    prop_camp_vesper_turret: mechanism(0xef4444, ['use', 'damage']),
    prop_camp_vesper_ammo_press: mechanism(0xf59e0b, ['use', 'damage']),
    prop_camp_vesper_shield_rack: mechanism(0xfde047, ['use', 'damage']),
    prop_camp_grave_fresh: terminal(0x94a3b8, { duration: 0.35, intensity: 1.4 }),
    prop_camp_grave_old: terminal(0x7dd3fc, { duration: 0.35, intensity: 1.4 }),

    prop_alien_feeding_basin: mechanism(0x84cc16, ['use', 'ambient', 'damage']),
    prop_alien_respiratory_vent: mechanism(0xf43f5e, ['use', 'ambient', 'damage']),
    prop_hive_chitin_hatchery: mechanism(0x10b981, ['use', 'ambient', 'damage']),
    prop_hive_relay_antenna: mechanism(0x22d3ee, ['use', 'ambient', 'damage']),
    prop_hive_suture_organ: mechanism(0xf43f5e, ['use', 'ambient', 'damage']),
    prop_hive_synaptic_web: mechanism(0xa855f7, ['use', 'damage']),
    prop_hive_wound_cauterizer: mechanism(0x38bdf8, ['use', 'damage']),
    door_biomechanical_iris: mechanism(0x84cc16, ['use', 'ambient', 'damage']),

    scatter_broken_drone: terminal(0x38bdf8, { duration: 0.4, intensity: 1.6 }),
    scatter_cryo_icicle: mechanism(0xa5f3fc, ['damage']),
    scatter_ice_stalagmite: mechanism(0x7dd3fc, ['damage']),
    scatter_cryo_shards: mechanism(0xbae6fd, ['damage']),

    prop_ruptured_coolant_pump: mechanism(0x22d3ee, ['use', 'ambient', 'damage']),
    evac_empty_cockpit_quad: terminal(0xf59e0b, { duration: 0.45, intensity: 1.9 }),
    evac_mixed_crew_divider: mechanism(0x38bdf8, ['use', 'damage']),
    evac_hidden_egg_coolant_rack: mechanism(0x84cc16, ['use', 'damage'])
});

const BASE_ENVIRONMENT_TYPES = new Set([
    'base_console', 'o2_generator', 'hull_matrix', 'radar', 'fusion_generator',
    'basic_pile', 'storage_locker', 'frozen_tanker', 'bunker_junk_rare', 'bunker_junk_uncommon'
]);

export function isEnvironmentExperienceType(type) {
    if (typeof type !== 'string') return false;
    if (BASE_ENVIRONMENT_TYPES.has(type)) return true;
    return /^(prop_|life_|scatter_|state_|arch_|fixture_|body_|base_|barrier_|carry_|door_|ship_|wall_|weapon_)/.test(type);
}

function inferredProfile(type) {
    if (!isEnvironmentExperienceType(type)) return null;
    if (/^(arch_|state_wall_|state_column_)/.test(type)) {
        return freezeProfile({ behaviors: ['structural'] });
    }
    if (/^(fixture_|state_growth_)/.test(type) || /(fire|light|vent|water|liquid|spore|fungal|hive|bellows|heater)/.test(type)) {
        return freezeProfile({ behaviors: ['ambient', 'damage'] });
    }
    if (/^(body_)|body_human|covered_stretcher/.test(type)) {
        return freezeProfile({ behaviors: ['inspect'] });
    }
    if (/crate|locker|supplies|pile|cart|rack|drum|bones|molt/.test(type)) {
        return freezeProfile({ behaviors: ['inspect', 'damage'] });
    }
    return freezeProfile({ behaviors: ['reactive', 'damage'] });
}

export function getPropExperienceProfile(type) {
    return PROP_EXPERIENCE_PROFILES[type] ?? inferredProfile(type);
}

export function isDynamicPropExperienceType(type) {
    return getPropExperienceProfile(type)?.dynamic === true;
}

function materialsOf(object) {
    return Array.isArray(object.material) ? object.material : [object.material];
}

/**
 * Per-instance presentation controller. Geometry and textures remain shared;
 * only emissive-capable materials are cloned so one console can acknowledge E
 * without lighting every copy of the same cached GLB.
 */
export function createPropExperience(root, model, type) {
    const profile = getPropExperienceProfile(type);
    const presentation = profile?.presentation;
    if (type === 'base_door_sealable_bulkhead') {
        model?.traverse?.((node) => {
            if (node.name === 'HB_DOOR_00' && node.userData) {
                node.userData.hb_motion = 'slide';
                node.userData.hb_open_angle = 0;
                node.userData.hb_open_offset = [0, -1.4, 0];
                node.userData.hb_duration = 0.9;
            }
        });
    }
    const articulation = createPropArticulation(model);
    if (!root || !model || (!presentation && !articulation)) return null;

    const clones = new Map();
    const assignments = [];
    const targets = [];
    model.traverse((object) => {
        if (!object.isMesh || !object.material) return;
        const originals = materialsOf(object);
        let changed = false;
        const replacements = originals.map((material) => {
            if (!material?.emissive?.isColor) return material;
            changed = true;
            if (!clones.has(material)) {
                const clone = material.clone();
                clone.name = `${material.name || type}:PropExperience`;
                clone.userData = { ...clone.userData, propExperienceOwned: true };
                clones.set(material, clone);
                targets.push({
                    material: clone,
                    baseEmissive: clone.emissive.clone(),
                    baseIntensity: Number.isFinite(clone.emissiveIntensity) ? clone.emissiveIntensity : 1
                });
            }
            return clones.get(material);
        });
        if (!changed) return;
        assignments.push({ object, original: object.material });
        object.material = Array.isArray(object.material) ? replacements : replacements[0];
    });

    const pulseColor = new THREE.Color(presentation?.acknowledgeColor ?? 0xffffff);
    const duration = presentation?.acknowledgeDuration ?? 0;
    const flickerAmount = presentation?.flicker ?? 0;
    const flickerSpeed = presentation?.flickerSpeed ?? 1.0;
    const hasDropout = Boolean(presentation?.dropout);
    let elapsed = ((type.length * 79 + 31) % 4096) * 0.1;
    let remaining = 0;
    let declaredState = 'ready';
    let disposed = false;

    const applyStrength = (strength) => {
        for (const target of targets) {
            target.material.emissive.copy(target.baseEmissive).lerp(pulseColor, strength);
            target.material.emissiveIntensity = target.baseIntensity
                + (presentation?.acknowledgeIntensity ?? 0) * strength;
        }
    };

    return {
        type,
        profile,
        registered: false,
        articulation,
        get state() {
            if (declaredState !== 'ready') return declaredState;
            return remaining > 0 ? 'acknowledging' : 'ready';
        },
        setState(next) {
            if (disposed) return false;
            declaredState = String(next || 'ready');
            if (articulation?.set) {
                articulation.set({
                    open: declaredState === 'open' || declaredState === 'spent' || declaredState === 'unlocked',
                    working: declaredState === 'working' || declaredState === 'on'
                });
            }
            return declaredState;
        },
        acknowledge({ toggleArticulation = true } = {}) {
            if (disposed) return false;
            if (toggleArticulation) articulation?.toggle();
            if (root?.userData?.mixer && Array.isArray(root?.userData?.animations)) {
                const interactClip = root.userData.animations.find((c) => /interact|activate|open|use/i.test(c.name));
                if (interactClip) {
                    const action = root.userData.mixer.clipAction(interactClip);
                    action.reset();
                    action.setLoop(THREE.LoopOnce, 1);
                    action.clampWhenFinished = false;
                    action.play();
                }
            }
            if (duration > 0) {
                remaining = duration;
                applyStrength(0.12);
            }
            return true;
        },
        update(delta = 0) {
            if (disposed) return;
            articulation?.update(delta);
            if (remaining > 0) {
                remaining = Math.max(0, remaining - Math.min(Math.max(Number(delta) || 0, 0), 0.1));
                const progress = 1 - remaining / duration;
                applyStrength(Math.sin(progress * Math.PI));
                if (remaining === 0) applyStrength(0);
            } else if (flickerAmount > 0 && targets.length > 0) {
                const dt = Math.min(Math.max(Number(delta) || 0, 0), 0.1);
                elapsed += dt;
                const smoothFlicker = Math.sin(elapsed * 11.7 * flickerSpeed) * 0.58
                    + Math.sin(elapsed * 17.3 * flickerSpeed + 1.2) * 0.42;
                let factor = 1 + smoothFlicker * flickerAmount;
                if (hasDropout) {
                    const drop = Math.sin(elapsed * 2.3 * flickerSpeed + 2.1);
                    if (drop > 0.84) factor *= 0.12;
                }
                for (const target of targets) {
                    target.material.emissiveIntensity = target.baseIntensity * Math.max(0.04, factor);
                }
            }
        },
        dispose() {
            if (disposed) return;
            disposed = true;
            for (const target of targets) target.material.emissiveIntensity = target.baseIntensity;
            for (const assignment of assignments) assignment.object.material = assignment.original;
            for (const material of clones.values()) material.dispose();
            clones.clear();
        }
    };
}
