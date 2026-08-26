// Seeded, run-stable description of what hangs in the sky.
//
// Pure: no THREE, no DOM, no clock. Given a seed it returns the same sky
// every time, which is what lets co-op peers agree on the sky without any
// netcode -- they already share the run seed. Celestial bodies are fixed for
// the whole run; only the weather fronts move (docs/sky-layer-and-weather-
// asset-catalog-2026-08-25.md section 2, L3/L7).

// Asset ids from the catalog's L3 table. Suns and the ring arc are additive
// black-background assets; the rest are green-keyed alpha cutouts.
export const SKY_SUN_IDS = Object.freeze([
    'sky_body_sun_primary',
    'sky_body_sun_dwarf'
]);
export const SKY_MOON_IDS = Object.freeze([
    'sky_body_moon_cratered_large',
    'sky_body_moon_cratered_small',
    'sky_body_moon_shattered'
]);
export const SKY_PLANET_IDS = Object.freeze([
    'sky_body_gasgiant_ringed',
    'sky_body_planet_rust',
    'sky_body_planet_dead_ocean'
]);
export const SKY_BODY_IDS = Object.freeze([
    ...SKY_SUN_IDS,
    ...SKY_MOON_IDS,
    ...SKY_PLANET_IDS
]);

export const SKY_WEATHER_STATES = Object.freeze([
    'clear',
    'snow',
    'spore_drift',
    'fog_gust',
    'rainstorm'
]);

// The band of the sky the player can actually see.
//
// The third-person rig (thirdPersonCamera.js: lift 1.55 over distance 3.65 +
// lookAhead 4.2) pitches ~11.2 degrees downward, and its 58 degree vertical fov
// puts the top of frame at only ~17.8 degrees elevation -- direction.y above
// about 0.306. Bodies placed on a full circular orbit spend nearly all their
// time above that, which is why the sky read as empty even with everything
// working. Every body is confined to this band instead.
export const SKY_VISIBLE_ELEVATION = Object.freeze({ min: 0.05, max: 0.28 });

// Depth tiers give the sky a front-to-back read instead of pasting everything
// on one shell. Nearer tiers sit lower and larger, the way a close body does.
export const SKY_DEPTH_TIERS = Object.freeze({
    near: { radiusScale: 0.86, elevationBias: -0.05, sizeScale: 1.45 },
    mid: { radiusScale: 0.94, elevationBias: 0.0, sizeScale: 1.0 },
    far: { radiusScale: 1.0, elevationBias: 0.05, sizeScale: 0.72 }
});
const DEPTH_TIER_KEYS = Object.freeze(['near', 'mid', 'far']);

const RUN_SCHEDULE_SECONDS = 1800;
const FRONT_MIN_DURATION = 45;
const FRONT_MAX_DURATION = 150;
const FRONT_MIN_GAP = 60;
const FRONT_MAX_GAP = 240;

import { createTransientSchedule } from './skyTransients.js';

function createSeededRandom(seed) {
    let state = (seed >>> 0) || 1;
    return function next() {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function range(random, min, max) {
    return min + random() * (max - min);
}

function makeBody(assetId, random, { minSize, maxSize, tier = null }) {
    const depthTier = tier ?? DEPTH_TIER_KEYS[Math.floor(random() * DEPTH_TIER_KEYS.length)];
    const { elevationBias, sizeScale } = SKY_DEPTH_TIERS[depthTier];
    // Seeded resting height inside the visible band, nudged by the tier so a
    // near body hangs low and a far one rides higher.
    const span = SKY_VISIBLE_ELEVATION.max - SKY_VISIBLE_ELEVATION.min;
    const elevationBand = Math.min(
        SKY_VISIBLE_ELEVATION.max,
        Math.max(SKY_VISIBLE_ELEVATION.min,
            SKY_VISIBLE_ELEVATION.min + range(random, 0.15, 0.85) * span + elevationBias)
    );
    return {
        assetId,
        depthTier,
        elevationBand,
        angularSize: range(random, minSize, maxSize) * sizeScale,
        // Where the body sits on its circular track, and how far that track is
        // tilted off the horizon. Together these are enough to place it on any
        // frame from timeOfDay alone.
        orbitPhase: range(random, 0, Math.PI * 2),
        orbitInclination: range(random, -0.42, 0.42),
        // Suns advance once per day; everything else drifts slower so the sky
        // reads differently across a long run.
        orbitRate: range(random, 0.45, 1)
    };
}

function pickDistinct(pool, count, random) {
    const remaining = [...pool];
    const picked = [];
    for (let i = 0; i < count && remaining.length > 0; i += 1) {
        picked.push(remaining.splice(Math.floor(random() * remaining.length), 1)[0]);
    }
    return picked;
}

function buildWeatherFronts(random) {
    const fronts = [];
    // Fronts roll in over the run with clear sky between them. Overlap is
    // impossible by construction: each front starts after the previous one's
    // end plus a gap.
    let cursor = range(random, 30, FRONT_MAX_GAP);
    while (cursor < RUN_SCHEDULE_SECONDS) {
        const duration = range(random, FRONT_MIN_DURATION, FRONT_MAX_DURATION);
        fronts.push({
            startTime: cursor,
            duration,
            // 'clear' is the absence of a front, never a scheduled one.
            state: SKY_WEATHER_STATES[1 + Math.floor(random() * (SKY_WEATHER_STATES.length - 1))]
        });
        cursor += duration + range(random, FRONT_MIN_GAP, FRONT_MAX_GAP);
    }
    return fronts;
}

export function createSkyProfile(seed) {
    const random = createSeededRandom(seed);

    // A primary star is mandatory -- it owns the directional light's direction
    // and colour, so a sky without one would leave the world lit by nothing.
    const suns = [makeBody(SKY_SUN_IDS[0], random, { minSize: 0.035, maxSize: 0.055 })];
    if (random() < 0.35) {
        suns.push(makeBody(SKY_SUN_IDS[1], random, { minSize: 0.018, maxSize: 0.03 }));
    }

    const moons = pickDistinct(SKY_MOON_IDS, Math.floor(random() * 4), random)
        .map((assetId) => makeBody(assetId, random, { minSize: 0.06, maxSize: 0.16 }));

    const planets = pickDistinct(SKY_PLANET_IDS, Math.floor(random() * 3), random)
        .map((assetId) => makeBody(assetId, random, { minSize: 0.09, maxSize: 0.28 }));

    return {
        seed: (seed >>> 0) || 1,
        suns,
        moons,
        planets,
        weatherFronts: buildWeatherFronts(random),
        // Scheduled off the same run seed as everything else, so co-op peers
        // see the same comet at the same moment with nothing on the wire.
        transients: createTransientSchedule(seed)
    };
}
