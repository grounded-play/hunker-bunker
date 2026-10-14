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

// Placement semantics belong to the model, not whichever room list happened
// to select it. This is the first reviewed wall-machine batch; subsequent
// audit batches extend this registry without adding new placement allowlists.
const MODEL_PRESENTATION = Object.freeze(Object.fromEntries([
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
    'prop_ceiling_crane_hoist',
    'prop_exosuit_docking_gantry',
    'decon_exosuit_scrubber_station'
].map((type) => [type, Object.freeze({ ...WALL_PROFILE, type })])));

export function getModelPresentationProfile(type) {
    return MODEL_PRESENTATION[String(type ?? '')] ?? null;
}

export function isWallMountedModel(type) {
    return getModelPresentationProfile(type)?.surface === MODEL_SURFACE.WALL;
}

export function getModelPresentationProfiles() {
    return { ...MODEL_PRESENTATION };
}
