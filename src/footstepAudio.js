/**
 * One footstep as layered sound (2026-10-17 footstep pass): the surface
 * bank, a splash on a wet floor, and the operator's kit rattling, weighted
 * by chassis. Steps used to be one sample at one volume for every class.
 */

// Chassis weight: the Tank lands heavy and low with plates rattling; the
// Scout is light, quick and quiet. gearEvery: rattle on every Nth step.
export const CHASSIS_STEP = Object.freeze({
    TANK: Object.freeze({ gain: 1.18, pitch: 0.9, gear: 0.5, gearEvery: 1 }),
    ENGINEER: Object.freeze({ gain: 1.0, pitch: 0.97, gear: 0.34, gearEvery: 1 }),
    SCOUT: Object.freeze({ gain: 0.78, pitch: 1.07, gear: 0.22, gearEvery: 2 })
});

export const FOOTSTEP_BASE_VOLUME = 0.55;
const SPRINT = Object.freeze({ gain: 1.25, pitch: 1.04, gear: 1.4 });
// Left and right feet differ a touch, so a walk never reads as one sample
// looped; foot 0 is the lead foot.
const FOOT = Object.freeze([
    Object.freeze({ gain: 1.0, pitch: 1.012 }),
    Object.freeze({ gain: 0.93, pitch: 0.988 })
]);

/**
 * @param {object} step
 * @param {{key: string, splash: boolean}} step.surface - resolveFootstepSurface()
 * @param {string} [step.playerType]
 * @param {boolean} [step.sprinting]
 * @param {number} [step.foot] - 0 or 1, alternating
 * @param {number} [step.stepIndex] - running count, for gearEvery
 * @returns {{key: string, volume: number, playbackRate: number}[]} layers
 */
export function planFootstep({ surface, playerType = 'ENGINEER', sprinting = false, foot = 0, stepIndex = 0 } = {}) {
    if (!surface?.key) return [];
    const chassis = CHASSIS_STEP[playerType] ?? CHASSIS_STEP.ENGINEER;
    const side = FOOT[foot ? 1 : 0];
    const pace = sprinting ? SPRINT : { gain: 1, pitch: 1, gear: 1 };
    const volume = FOOTSTEP_BASE_VOLUME * chassis.gain * pace.gain * side.gain;
    const playbackRate = chassis.pitch * pace.pitch * side.pitch;
    const layers = [{ key: surface.key, volume, playbackRate }];
    if (surface.splash) {
        layers.push({ key: 'footstep_wet_puddle', volume: volume * 0.45, playbackRate: playbackRate * 1.05 });
    }
    if (stepIndex % chassis.gearEvery === 0) {
        layers.push({
            key: 'footstep_gear_rattle',
            volume: FOOTSTEP_BASE_VOLUME * chassis.gear * pace.gear,
            playbackRate: chassis.pitch * (sprinting ? 1.06 : 1)
        });
    }
    return layers;
}

/**
 * Plays a plan through AudioManager.play. `spatial(volume)` turns a volume
 * into the listener-relative options (ThreeGame.audioAt). Returns true when
 * the surface layer played (false means its buffers have not decoded yet).
 */
export function playFootstepPlan(audio, layers, spatial = (volume) => ({ volume })) {
    if (!audio?.play || !layers.length) return false;
    let surfacePlayed = false;
    layers.forEach((layer, index) => {
        const played = audio.play(layer.key, { ...spatial(layer.volume), playbackRate: layer.playbackRate });
        if (index === 0) surfacePlayed = Boolean(played);
    });
    return surfacePlayed;
}
