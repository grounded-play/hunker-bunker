export const MODEL_SURFACE = Object.freeze({
    FLOOR: 'floor',
    WALL: 'wall',
    CEILING: 'ceiling',
    FREE: 'free',
    HAND: 'hand',
    SOCKET: 'socket'
});

const WALL_PROFILE = Object.freeze({
    surface: MODEL_SURFACE.WALL,
    forwardAxis: '+Z',
    upAxis: '+Y',
    yawCorrection: 0,
    pivot: 'bounds-center-floor',
    contact: Object.freeze({ axis: 'z', side: 'min', inset: 0.02 }),
    allowedPlacement: Object.freeze(['wall'])
});

const CEILING_WALL_PROFILE = Object.freeze({
    surface: MODEL_SURFACE.CEILING,
    forwardAxis: '+Z',
    upAxis: '+Y',
    yawCorrection: 0,
    pivot: 'bounds-center-ceiling',
    contact: Object.freeze({ axis: 'y', side: 'max', inset: 0 }),
    allowedPlacement: Object.freeze(['wall', 'ceiling'])
});

// Placement semantics belong to the model, not whichever room list happened
// to select it. These wall-backed machines, dispensers, gantries, racks,
// consoles, and architectural fixtures require support; visual axis review is
// tracked separately from this support classification.
const WALL_MODELS = [
    'arch_niche_shrine',
    'arch_window_stained',
    'bay_c_pod_312_rupture',
    'carapace_sentry_chrysalis',
    'chasm_seismic_geophone_station',
    'chen_sealed_confession_console',
    'corp_asset_incinerator_chute',
    'corp_biometric_collar_chute',
    'corp_biometric_wall_safe',
    'corp_debt_severing_kiosk',
    'corp_incinerator_hopper',
    'corp_interrogation_chair',
    'crawler_signal_antenna_rig',
    'cryo_frozen_cascade',
    'cryo_ruptured_pod',
    'evac_manual_abort_detonator',
    'fixture_clock_dead',
    'geo_pressure_relief_siren',
    'hive_pulmonary_bellows',
    'hive_resin_pillar',
    'hive_sphincter_iris',
    'hive_tendril_arch',
    'hive_visceral_ovipositor',
    'hive_vivisected_engineer',
    'life_brood_comb',
    'life_cochlear_intercom',
    'life_filing_cabinets',
    'life_fire_station',
    'life_fungal_cable_bundle',
    'life_lung_filter_bellows',
    'life_memorial_board',
    'life_parka_hooks',
    'life_planning_board',
    'life_pneumatic_tube_node',
    'life_server_racks',
    'life_tally_bulkhead',
    'life_umbilical_tether',
    'life_vending_machine',
    'meridian_cyber_graft_bench',
    'meridian_servitor_dock',
    'prop_biomech_respirator',
    'prop_conduit_junction_box',
    'prop_icey_frost_manifold',
    'prop_light_cluster_dripping',
    'prop_overhead_cage_fluorescent',
    'prop_terminal_ruptured',
    'prop_vital_monitor',
    'relay_acoustic_diaphragm',
    'scout_tachyon_radar_mast',
    'scout_tracking_beacon_core',
    'substation_breaker_interlock',
    'suture_larval_nursery_urn',
    'suture_mercy_cocoon_canopy',
    'tallow_apothecary_dryer_rack',
    'tina_cosmetic_skin_loom',
    'tina_vocal_mimic_synthesizer',
    'vass_bio_centrifuge_rack',
    'vass_hybrid_embryo_incubator',
    'vass_neural_sync_helmet',
    'vesper_reloading_station',
    'vesper_trench_warning_klaxon',
    'prop_fungal_tendril_altar',
    'prop_flesh_steel_cradle',
    'prop_shrine_plinth_broken',
    'prop_biomech_sphincter_hatch_vent',
    'prop_biomech_tracheal_wall_pipe',
    'prop_decon_eyewash_shower_station',
    'prop_exhaust_blower_fan_hood',
    'prop_wall_cable_tray_swag',
    'prop_vertebral_cable_riser',
    'prop_oxygen_bottle_cascade_rack',
    'prop_pipe_organ_heat_exchanger',
    'prop_exosuit_docking_gantry',
    'decon_exosuit_scrubber_station',
    'life_exosuit_teardown',
    'cryo_heater_station',
    'storage_locker',
    'prop_biomech_flesh_locker',
    'prop_locker_bulged',
    'life_suit_drying_rack',
    'life_mask_rack',
    'life_hydro_rack',
    'life_ice_core_rack',
    'life_meat_smoking_rack',
    'life_ribcage_rescue_cabinet',
    'life_vertebral_restraint_rack',
    'life_fuse_bypass_panel',
    'fixture_sconce_vine'
];

const MODEL_PRESENTATION = Object.freeze(Object.fromEntries([
    ...WALL_MODELS.map((type) => [type, Object.freeze({ ...WALL_PROFILE, type })]),
    ['prop_ceiling_crane_hoist', Object.freeze({ ...CEILING_WALL_PROFILE, type: 'prop_ceiling_crane_hoist' })]
]));

export function getModelPresentationProfile(type) {
    return MODEL_PRESENTATION[String(type ?? '')] ?? null;
}

export function isWallMountedModel(type) {
    const profile = getModelPresentationProfile(type);
    return profile?.surface === MODEL_SURFACE.WALL || Boolean(profile?.allowedPlacement?.includes('wall'));
}

export function isCeilingMountedModel(type) {
    return getModelPresentationProfile(type)?.surface === MODEL_SURFACE.CEILING;
}

export function getModelPresentationProfiles() {
    return { ...MODEL_PRESENTATION };
}
