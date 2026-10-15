// Source-frame data for every weapon GLB, so a finish's bespoke model sits in
// the hand exactly where its class frame does (src/weaponModelFrame.js).
//
// weaponCalibration.js tunes one hand pose per class frame and assumes the
// model is authored like the Talon: muzzle along +X, upright on +Y. Most
// finish models (and the Talon-C frame) were authored muzzle-first along -X,
// two lengthwise on Z, so they were held backwards; their grips and origins
// sit anywhere along the gun.
//
//   yaw     turn about the model's own up axis that puts the muzzle on +X
//   grip    where the palm closes on the pistol grip, as fractions of the
//           turned model's bounds: x from the rear (0) to the muzzle (1),
//           y from the bottom (0) to the top (1)
//   bounds  class frames only: the turned model's bounds in source units,
//           the reference a finish's grip is matched to
//
// Measured 2026-10-15 from a contact sheet of every GLB (turned, with a 10%
// grid over its bounds); remeasure when a model is replaced.
import { WEAPON_ARCHETYPES, WEAPON_SKIN_MESHES } from './operatorModelUrls.js';

const HALF = Math.PI;
const QUARTER = Math.PI / 2;

const BY_ARCHETYPE = {
    gg1: { yaw: 0, grip: [0.3, 0.5], bounds: { min: [-0.601, 0, -0.167], max: [0.506, 0.124, 0.419] } },
    talon: { yaw: 0, grip: [0.29, 0.36], bounds: { min: [-0.57, 0, -0.051], max: [0.572, 0.476, 0.057] } },
    talon_c: { yaw: HALF, grip: [0.4, 0.33], bounds: { min: [-0.61, 0, -0.053], max: [0.538, 0.451, 0.047] } },
    siege_breaker: { yaw: 0, grip: [0.08, 0.33], bounds: { min: [-0.518, 0, -0.147], max: [0.64, 0.563, 0.146] } },
    tesla_lock: { yaw: 0, grip: [0.18, 0.3], bounds: { min: [-0.573, 0, -0.125], max: [0.531, 0.602, 0.158] } }
};

const BY_SKIN = {
    4100: { yaw: 0, grip: [0.3, 0.36] },
    4101: { yaw: HALF, grip: [0.17, 0.3] },
    4102: { yaw: HALF, grip: [0.1, 0.33] },
    4103: { yaw: 0, grip: [0.13, 0.35] },
    4104: { yaw: HALF, grip: [0.37, 0.3] },
    4105: { yaw: HALF, grip: [0.13, 0.33] },
    4106: { yaw: HALF, grip: [0.27, 0.25] },
    4107: { yaw: 0, grip: [0.25, 0.2] },
    4108: { yaw: 0, grip: [0.31, 0.32] },
    4109: { yaw: QUARTER, grip: [0.2, 0.25] },
    4110: { yaw: QUARTER, grip: [0.38, 0.25] },
    4111: { yaw: HALF, grip: [0.24, 0.25] },
    4201: { yaw: HALF, grip: [0.28, 0.3] },
    4208: { yaw: HALF, grip: [0.29, 0.35] },
    4215: { yaw: HALF, grip: [0.12, 0.3] },
    4222: { yaw: HALF, grip: [0.27, 0.35] },
    4229: { yaw: HALF, grip: [0.27, 0.28] },
    4236: { yaw: HALF, grip: [0.28, 0.28] },
    5002: { yaw: HALF, grip: [0.3, 0.35] },
    5006: { yaw: HALF, grip: [0.09, 0.3] },
    5009: { yaw: HALF, grip: [0.26, 0.25] },
    5010: { yaw: HALF, grip: [0.25, 0.3] }
};

function freezeFrame(frame) {
    return Object.freeze({
        yaw: frame.yaw,
        grip: Object.freeze([...frame.grip]),
        ...(frame.bounds ? { bounds: Object.freeze({ min: Object.freeze([...frame.bounds.min]), max: Object.freeze([...frame.bounds.max]) }) } : {})
    });
}

const DEFAULT_FRAME = freezeFrame({ yaw: 0, grip: [0.3, 0.35] });

export const WEAPON_MODEL_FRAMES = Object.freeze(Object.fromEntries([
    ...Object.entries(BY_ARCHETYPE).map(([id, frame]) => [WEAPON_ARCHETYPES[id], frame]),
    ...Object.entries(BY_SKIN).map(([id, frame]) => [WEAPON_SKIN_MESHES[id], frame])
].filter(([url]) => url).map(([url, frame]) => [url, freezeFrame(frame)])));

export function getWeaponModelFrame(url) {
    return WEAPON_MODEL_FRAMES[url] ?? DEFAULT_FRAME;
}

// The class frame's grip in its own turned source units.
export function getArchetypeGripPoint(archetypeUrl) {
    const frame = getWeaponModelFrame(archetypeUrl);
    if (!frame.bounds) return null;
    const { min, max } = frame.bounds;
    return [
        min[0] + (max[0] - min[0]) * frame.grip[0],
        min[1] + (max[1] - min[1]) * frame.grip[1],
        (min[2] + max[2]) / 2
    ];
}

// Which model a class frame + finish shows, one rule for the hand, the
// Armory bench and reward previews: a finish with its own model shows that
// model as authored (no procedural paint over its textures); a finish
// without one is painted onto the class frame.
export function resolveWeaponModel(archetypeId, skinId = null) {
    const archetypeUrl = WEAPON_ARCHETYPES[archetypeId] ?? WEAPON_ARCHETYPES.gg1;
    const skinUrl = skinId != null && skinId !== '' ? WEAPON_SKIN_MESHES[skinId] ?? null : null;
    return { url: skinUrl ?? archetypeUrl, archetypeUrl, bespoke: Boolean(skinUrl) };
}
