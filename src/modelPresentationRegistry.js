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
// to select it. Reviewed wall-backed machines, dispensers, gantries, racks,
// consoles, and architectural fixtures.
const WALL_MODELS = [
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
