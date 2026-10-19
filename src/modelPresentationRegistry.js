import { WORLD_EXPANSION_80_SPECS } from './data/worldExpansion80.js';

export const MODEL_SURFACE = Object.freeze({
    FLOOR: 'floor',
    WALL: 'wall',
    CEILING: 'ceiling',
    FREE: 'free',
    HAND: 'hand',
    SOCKET: 'socket'
});

const DEFAULT_WALL_PROFILE = Object.freeze({
    surface: MODEL_SURFACE.WALL,
    forwardAxis: '+Z',
    upAxis: '+Y',
    yawCorrection: 0,
    pivot: 'bounds-center-floor',
    contact: Object.freeze({ axis: 'z', side: 'max', inset: 0.02 }),
    allowedPlacement: Object.freeze(['wall']),
    mountType: 'floor',
    mountY: 0
});

const CEILING_WALL_PROFILE = Object.freeze({
    surface: MODEL_SURFACE.CEILING,
    forwardAxis: '+Z',
    upAxis: '+Y',
    yawCorrection: 0,
    pivot: 'bounds-center-ceiling',
    contact: Object.freeze({ axis: 'y', side: 'max', inset: 0 }),
    allowedPlacement: Object.freeze(['wall', 'ceiling']),
    mountType: 'wall-hanging',
    mountY: 2.15,
    depth: 4.02
});

export const WALL_FIXTURE_ELEVATIONS = Object.freeze({
    fixture_sconce_vine: 1.45,
    fixture_clock_dead: 1.65,
    prop_overhead_cage_fluorescent: 1.95,
    prop_wall_cable_tray_swag: 1.25,
    prop_exhaust_blower_fan_hood: 1.85,
    prop_ceiling_crane_hoist: 2.15,
    arch_window_stained: 0.45,
    prop_light_cluster_dripping: 1.35,
    corp_biometric_wall_safe: 1.30,
    vesper_trench_warning_klaxon: 1.70,
    geo_pressure_relief_siren: 1.75,
    tina_secret_distress_beacon: 1.40,
    life_fuse_bypass_panel: 1.20,
    life_pneumatic_tube_node: 1.30,
    life_cochlear_intercom: 1.40,
    life_memorial_board: 1.20,
    life_planning_board: 1.20,
    life_tally_bulkhead: 1.10,
    life_parka_hooks: 1.40,
    prop_vital_monitor: 1.20,
    prop_conduit_junction_box: 1.20,
    prop_biomech_sphincter_hatch_vent: 1.50,
    evac_manual_abort_detonator: 1.30,
    chen_sealed_confession_console: 1.00
});

const CENTERED_CONTACT_MODELS = new Set([
    'hive_visceral_ovipositor',
    'prop_conduit_junction_box',
    'prop_fungal_tendril_altar',
    'prop_flesh_steel_cradle',
    'fixture_sconce_vine'
]);

export const WALL_MODEL_DEPTHS = Object.freeze({
    arch_niche_shrine: 0.42,
    arch_window_stained: 0.15,
    bay_c_pod_312_rupture: 1.26,
    carapace_sentry_chrysalis: 2.16,
    chasm_seismic_geophone_station: 1.39,
    chen_sealed_confession_console: 1.44,
    corp_asset_incinerator_chute: 1.72,
    corp_biometric_collar_chute: 2.03,
    corp_biometric_wall_safe: 0.65,
    corp_debt_severing_kiosk: 0.97,
    corp_incinerator_hopper: 2.23,
    corp_interrogation_chair: 1.46,
    crawler_signal_antenna_rig: 1.79,
    cryo_frozen_cascade: 1.87,
    cryo_ruptured_pod: 2.12,
    evac_manual_abort_detonator: 0.46,
    fixture_clock_dead: 0.06,
    geo_pressure_relief_siren: 0.77,
    hive_pulmonary_bellows: 1.90,
    hive_resin_pillar: 1.50,
    hive_sphincter_iris: 0.96,
    hive_tendril_arch: 0.98,
    hive_visceral_ovipositor: 5.03,
    hive_vivisected_engineer: 1.60,
    life_brood_comb: 0.50,
    life_cochlear_intercom: 0.71,
    life_filing_cabinets: 0.83,
    life_fire_station: 0.66,
    life_fungal_cable_bundle: 0.68,
    life_lung_filter_bellows: 1.36,
    life_memorial_board: 1.11,
    life_parka_hooks: 0.86,
    life_planning_board: 0.79,
    life_pneumatic_tube_node: 0.98,
    life_server_racks: 1.38,
    life_tally_bulkhead: 1.40,
    life_umbilical_tether: 1.26,
    life_vending_machine: 1.00,
    meridian_cyber_graft_bench: 0.64,
    meridian_servitor_dock: 0.95,
    prop_biomech_respirator: 2.74,
    prop_conduit_junction_box: 0.44,
    prop_diagnostic_console: 0.50,
    prop_icey_frost_manifold: 0.50,
    prop_light_cluster_dripping: 0.49,
    prop_overhead_cage_fluorescent: 0.32,
    prop_terminal_ruptured: 0.38,
    prop_vital_monitor: 0.77,
    relay_acoustic_diaphragm: 2.35,
    scout_tachyon_radar_mast: 1.40,
    scout_tracking_beacon_core: 1.63,
    substation_breaker_interlock: 0.72,
    suture_larval_nursery_urn: 0.89,
    suture_mercy_cocoon_canopy: 0.52,
    tallow_apothecary_dryer_rack: 0.88,
    tina_cosmetic_skin_loom: 1.10,
    tina_vocal_mimic_synthesizer: 0.93,
    vass_bio_centrifuge_rack: 0.95,
    vass_hybrid_embryo_incubator: 1.33,
    vass_neural_sync_helmet: 0.61,
    vesper_reloading_station: 1.09,
    vesper_trench_warning_klaxon: 0.25,
    prop_fungal_tendril_altar: 2.34,
    prop_flesh_steel_cradle: 0.33,
    prop_shrine_plinth_broken: 1.21,
    prop_biomech_sphincter_hatch_vent: 1.19,
    prop_biomech_tracheal_wall_pipe: 2.02,
    prop_decon_eyewash_shower_station: 0.75,
    prop_exhaust_blower_fan_hood: 1.40,
    prop_wall_cable_tray_swag: 3.75,
    prop_vertebral_cable_riser: 1.84,
    prop_oxygen_bottle_cascade_rack: 0.66,
    prop_pipe_organ_heat_exchanger: 1.69,
    prop_exosuit_docking_gantry: 2.30,
    decon_exosuit_scrubber_station: 1.52,
    life_exosuit_teardown: 0.98,
    cryo_heater_station: 0.88,
    storage_locker: 0.78,
    prop_biomech_flesh_locker: 0.50,
    prop_locker_bulged: 0.90,
    life_suit_drying_rack: 0.80,
    life_mask_rack: 0.81,
    life_hydro_rack: 1.13,
    life_ice_core_rack: 0.99,
    life_meat_smoking_rack: 0.88,
    life_ribcage_rescue_cabinet: 0.36,
    life_vertebral_restraint_rack: 1.30,
    life_fuse_bypass_panel: 0.57,
    fixture_sconce_vine: 0.22,
    prop_ceiling_crane_hoist: 4.02
});

export const WALL_MODELS = Object.keys(WALL_MODEL_DEPTHS);

const MODEL_PRESENTATION = Object.freeze(Object.fromEntries([
    ...WALL_MODELS.map((type) => {
        const isCeiling = type === 'prop_ceiling_crane_hoist';
        if (isCeiling) {
            return [type, Object.freeze({ ...CEILING_WALL_PROFILE, type })];
        }
        const isCentered = CENTERED_CONTACT_MODELS.has(type);
        const mountY = WALL_FIXTURE_ELEVATIONS[type] ?? 0;
        const depth = WALL_MODEL_DEPTHS[type] ?? 0.50;
        const mountType = mountY > 0 ? 'wall-hanging' : 'floor';
        return [type, Object.freeze({
            ...DEFAULT_WALL_PROFILE,
            type,
            contact: Object.freeze({
                axis: 'z',
                side: isCentered ? 'center' : 'max',
                inset: 0.02
            }),
            depth,
            mountType,
            mountY
        })];
    }),
    ...WORLD_EXPANSION_80_SPECS
        .filter((spec) => spec.placement === 'wall' || spec.placement === 'ceiling')
        .map((spec) => {
            const ceiling = spec.placement === 'ceiling';
            return [spec.id, Object.freeze({
                ...(ceiling ? CEILING_WALL_PROFILE : DEFAULT_WALL_PROFILE),
                type: spec.id,
                mountType: 'wall-hanging',
                mountY: ceiling ? 2.15 : Math.max(0.8, spec.height * 0.72),
                depth: Math.min(1.4, Math.max(0.2, spec.maxSpan * 0.28))
            })];
        })
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

export function getWallMountElevation(type) {
    return getModelPresentationProfile(type)?.mountY ?? WALL_FIXTURE_ELEVATIONS[type] ?? 0;
}

export function getWallModelDepth(type) {
    return getModelPresentationProfile(type)?.depth ?? WALL_MODEL_DEPTHS[type] ?? null;
}
