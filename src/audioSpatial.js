const DEFAULTS = Object.freeze({
    refDistance: 3,
    maxDistance: 32,
    rolloff: 1.25,
    maxPan: 0.72,
    obstructionGain: 0.58,
    openCutoffHz: 22000,
    obstructedCutoffHz: 1400,
    criticalMinGain: 0.12
});

const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function horizontalPoint(point = {}) {
    return {
        x: finite(point.x, 0),
        z: finite(point.z ?? point.y, 0)
    };
}

/**
 * Calculate predictable isometric-game spatial audio without depending on
 * Three.js or Web Audio. Callers can apply the returned pan, gain and cutoff
 * to any playback graph and can unit-test placement independently of a scene.
 */
export function calculateScreenSpaceAudio({
    source,
    listener,
    cameraRight = { x: 1, z: 0 },
    refDistance = DEFAULTS.refDistance,
    maxDistance = DEFAULTS.maxDistance,
    rolloff = DEFAULTS.rolloff,
    maxPan = DEFAULTS.maxPan,
    obstructed = false,
    obstructionGain = DEFAULTS.obstructionGain,
    openCutoffHz = DEFAULTS.openCutoffHz,
    obstructedCutoffHz = DEFAULTS.obstructedCutoffHz,
    critical = false,
    criticalMinGain = DEFAULTS.criticalMinGain
} = {}) {
    const sourcePoint = horizontalPoint(source);
    const listenerPoint = horizontalPoint(listener);
    const right = horizontalPoint(cameraRight);
    const dx = sourcePoint.x - listenerPoint.x;
    const dz = sourcePoint.z - listenerPoint.z;
    const distance = Math.hypot(dx, dz);

    const safeRefDistance = Math.max(0, finite(refDistance, DEFAULTS.refDistance));
    const safeMaxDistance = Math.max(safeRefDistance + 0.001, finite(maxDistance, DEFAULTS.maxDistance));
    const safeRolloff = Math.max(0, finite(rolloff, DEFAULTS.rolloff));
    const safeMaxPan = clamp(Math.abs(finite(maxPan, DEFAULTS.maxPan)), 0, 1);
    const rightLength = Math.hypot(right.x, right.z);
    const rightX = rightLength > 0 ? right.x / rightLength : 1;
    const rightZ = rightLength > 0 ? right.z / rightLength : 0;
    const sideDistance = (dx * rightX) + (dz * rightZ);
    const pan = clamp(sideDistance / safeMaxDistance, -1, 1) * safeMaxPan;

    let distanceGain = 1;
    if (distance > safeRefDistance) {
        const beyondRef = distance - safeRefDistance;
        const inverseGain = safeRefDistance > 0
            ? safeRefDistance / (safeRefDistance + (safeRolloff * beyondRef))
            : 1 / (1 + (safeRolloff * beyondRef));
        const edgeProgress = clamp(beyondRef / (safeMaxDistance - safeRefDistance), 0, 1);
        const edgeTaper = 1 - (edgeProgress * edgeProgress * (3 - (2 * edgeProgress)));
        distanceGain = inverseGain * edgeTaper;
    }
    if (distance >= safeMaxDistance) distanceGain = 0;

    const blockedGain = obstructed
        ? distanceGain * clamp(finite(obstructionGain, DEFAULTS.obstructionGain), 0, 1)
        : distanceGain;
    const gain = critical
        ? Math.max(blockedGain, clamp(finite(criticalMinGain, DEFAULTS.criticalMinGain), 0, 1))
        : blockedGain;

    return Object.freeze({
        pan,
        gain: clamp(gain, 0, 1),
        distanceGain: clamp(distanceGain, 0, 1),
        distance,
        cutoffHz: Math.max(10, finite(
            obstructed ? obstructedCutoffHz : openCutoffHz,
            obstructed ? DEFAULTS.obstructedCutoffHz : DEFAULTS.openCutoffHz
        )),
        obstructed: Boolean(obstructed),
        audible: gain > 0
    });
}

export { DEFAULTS as AUDIO_SPATIAL_DEFAULTS };
