// Shared weapon presentation contract for gameplay, Armory, and reward previews.
// Keep this data independent of three.js so calibration can be tested without a
// WebGL context and every renderer consumes the same archetype measurements.

const PROFILE_CONTEXTS = Object.freeze(['gameplay', 'armory', 'reward']);

const WEAPON_CALIBRATION = Object.freeze({
    gg1: Object.freeze({
        gameplay: Object.freeze({ targetSize: 0.62, minScale: 0.008, maxScale: 1.4, framingRadius: 0.72 }),
        armory: Object.freeze({ targetSize: 1.15, minScale: 0.012, maxScale: 2.2, framingRadius: 1.25 }),
        reward: Object.freeze({ targetSize: 0.92, minScale: 0.01, maxScale: 1.8, framingRadius: 1.05 }),
        rotation: Object.freeze([0, -Math.PI / 2, -Math.PI / 2]),
        position: Object.freeze([0.03, 0.02, -0.10]),
        forwardAxis: '+Z',
        anchor: 'receiver-underbarrel'
    }),
    talon: Object.freeze({
        gameplay: Object.freeze({ targetSize: 0.58, minScale: 0.008, maxScale: 1.35, framingRadius: 0.68 }),
        armory: Object.freeze({ targetSize: 1.06, minScale: 0.012, maxScale: 2.1, framingRadius: 1.18 }),
        reward: Object.freeze({ targetSize: 0.86, minScale: 0.01, maxScale: 1.75, framingRadius: 1.0 }),
        rotation: Object.freeze([0, -Math.PI / 2, -Math.PI / 2]),
        position: Object.freeze([0.03, 0.02, -0.10]),
        forwardAxis: '+Z',
        anchor: 'receiver-underbarrel'
    }),
    talon_c: Object.freeze({
        gameplay: Object.freeze({ targetSize: 0.64, minScale: 0.008, maxScale: 1.45, framingRadius: 0.76 }),
        armory: Object.freeze({ targetSize: 1.18, minScale: 0.012, maxScale: 2.25, framingRadius: 1.3 }),
        reward: Object.freeze({ targetSize: 0.95, minScale: 0.01, maxScale: 1.9, framingRadius: 1.1 }),
        rotation: Object.freeze([0, -Math.PI / 2, -Math.PI / 2]),
        position: Object.freeze([0.035, 0.02, -0.11]),
        forwardAxis: '+Z',
        anchor: 'receiver-underbarrel'
    }),
    siege_breaker: Object.freeze({
        gameplay: Object.freeze({ targetSize: 0.7, minScale: 0.008, maxScale: 1.55, framingRadius: 0.84 }),
        armory: Object.freeze({ targetSize: 1.28, minScale: 0.012, maxScale: 2.45, framingRadius: 1.42 }),
        reward: Object.freeze({ targetSize: 1.03, minScale: 0.01, maxScale: 2.05, framingRadius: 1.2 }),
        rotation: Object.freeze([0, -Math.PI / 2, -Math.PI / 2]),
        position: Object.freeze([0.045, 0.025, -0.13]),
        forwardAxis: '+Z',
        anchor: 'receiver-underbarrel'
    }),
    tesla_lock: Object.freeze({
        gameplay: Object.freeze({ targetSize: 0.62, minScale: 0.008, maxScale: 1.4, framingRadius: 0.74 }),
        armory: Object.freeze({ targetSize: 1.12, minScale: 0.012, maxScale: 2.15, framingRadius: 1.22 }),
        reward: Object.freeze({ targetSize: 0.9, minScale: 0.01, maxScale: 1.82, framingRadius: 1.04 }),
        rotation: Object.freeze([0, -Math.PI / 2, -Math.PI / 2]),
        position: Object.freeze([0.035, 0.025, -0.11]),
        forwardAxis: '+Z',
        anchor: 'receiver-underbarrel'
    })
});

const FALLBACK_ARCHETYPE = 'gg1';

export function normalizeWeaponArchetype(archetypeId) {
    const value = String(archetypeId || '').trim().toLowerCase();
    return WEAPON_CALIBRATION[value] ? value : FALLBACK_ARCHETYPE;
}

export function getWeaponCalibration(archetypeId, context = 'gameplay') {
    const archetype = normalizeWeaponArchetype(archetypeId);
    const profileContext = PROFILE_CONTEXTS.includes(context) ? context : 'gameplay';
    const profile = WEAPON_CALIBRATION[archetype];
    return {
        archetype,
        context: profileContext,
        ...profile[profileContext],
        rotation: [...profile.rotation],
        position: [...profile.position],
        forwardAxis: profile.forwardAxis,
        anchor: profile.anchor
    };
}

export function getWeaponScaleForBounds(size, archetypeId, context = 'gameplay') {
    const profile = getWeaponCalibration(archetypeId, context);
    const dimensions = Array.isArray(size) ? size : [size?.x, size?.y, size?.z];
    const maxDimension = Math.max(...dimensions.map(Number).filter(Number.isFinite), 0.001);
    const unclamped = profile.targetSize / maxDimension;
    return Math.min(profile.maxScale, Math.max(profile.minScale, unclamped));
}

export function getWeaponCalibrationProfiles() {
    return Object.fromEntries(Object.keys(WEAPON_CALIBRATION).map((key) => [
        key,
        {
            gameplay: getWeaponCalibration(key, 'gameplay'),
            armory: getWeaponCalibration(key, 'armory'),
            reward: getWeaponCalibration(key, 'reward')
        }
    ]));
}

export { PROFILE_CONTEXTS };
