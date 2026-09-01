// Per-frame sky state: the single source of truth for what the sky looks like
// and, through it, how the world is lit.
//
// Pure: no THREE, no clock, no scene. Everything is derived from the seeded
// profile plus the caller's time/biome inputs, so the same inputs always give
// the same sky and the whole thing is testable without a GPU.

import { resolveActiveTransients } from './skyTransients.js';
import { SKY_DEPTH_TIERS } from './skyProfile.js';

const TWO_PI = Math.PI * 2;

// Chosen fiction (design section 1): a thin alien atmosphere. Deep space never
// fully washes out, so star opacity has a hard floor at noon rather than
// falling to zero the way an Earth-like sky would.
const STAR_OPACITY_DAY_FLOOR = 0.16;

// Front edges ramp over this fraction of their own duration, so weather rolls
// in and out instead of snapping on.
const FRONT_RAMP_FRACTION = 0.25;

// Cloud drift. The floor matters: air that stops entirely reads as a painted
// backdrop, which is the whole problem the cloud shader exists to fix.
const WIND_CALM_SPEED = 0.24;
const WIND_STORM_SPEED = 1.0;

// Lightning. Strikes are seeded off the run so co-op peers flash together, and
// only fire once a front is genuinely heavy.
const FLASH_STORM_THRESHOLD = 0.45;
const FLASH_DECAY_SECONDS = 0.55;
const FLASH_MEAN_GAP_SECONDS = 4.5;

// Horizon/zenith palettes per biome, keyed to BIOME_LIGHTING in threeGame.js
// so the sky and the world agree on what sector the player is standing in.
const BIOME_SKY_COLORS = Object.freeze({
    active: { horizon: [0.72, 0.55, 0.38], zenith: [0.10, 0.13, 0.22] },
    cryo:   { horizon: [0.58, 0.72, 0.86], zenith: [0.07, 0.12, 0.24] },
    bio:    { horizon: [0.55, 0.52, 0.28], zenith: [0.09, 0.13, 0.10] }
});

function clamp01(value) {
    return value < 0 ? 0 : value > 1 ? 1 : value;
}

function smoothstep(edge0, edge1, value) {
    const t = clamp01((value - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
}

function mix(a, b, t) {
    return a + (b - a) * t;
}

function mixTriple(a, b, c, cryoMix, bioMix) {
    return a.map((channel, i) => mix(mix(channel, b[i], cryoMix), c[i], bioMix));
}

// Places one body in the sky.
//
// Bodies sweep in AZIMUTH -- around the horizon -- and only breathe gently in
// elevation, staying inside the band the camera can see. A full circular orbit
// is more physical but useless here: the third-person rig tops out at ~17.8
// degrees, so an orbiting body spends nearly the whole day above the frame and
// the sky reads as empty. Sweeping the horizon keeps them on screen and gives
// the parallax something to work against.
function directionForBody(body, dayPhase) {
    const azimuth = dayPhase * body.orbitRate + body.orbitPhase;
    // A slow, small vertical breath so the sky is never rigid. Half the azimuth
    // rate, so height and bearing do not march in lockstep.
    const drift = Math.sin(azimuth * 0.5 + body.orbitInclination) * 0.035;
    const elevation = Math.max(0.02, body.elevationBand + drift);
    const horizontal = Math.sqrt(Math.max(0, 1 - elevation * elevation));
    return {
        x: Math.cos(azimuth) * horizontal,
        y: elevation,
        z: Math.sin(azimuth) * horizontal
    };
}

// The primary sun is pinned to real solar time rather than its seeded phase --
// noon must actually be noon, because the day/night cycle and the O2 economy
// are already tuned against it.
function primarySunDirection(dayPhase, sun) {
    const elevation = Math.sin(dayPhase);
    const horizontal = Math.cos(dayPhase);
    const x = horizontal * Math.cos(sun.orbitInclination);
    const z = horizontal * Math.sin(sun.orbitInclination);
    const length = Math.hypot(x, elevation, z) || 1;
    return { x: x / length, y: elevation / length, z: z / length };
}

function resolveWeather(weatherFronts, elapsedSeconds) {
    for (const front of weatherFronts) {
        const end = front.startTime + front.duration;
        if (elapsedSeconds < front.startTime || elapsedSeconds > end) continue;
        const ramp = front.duration * FRONT_RAMP_FRACTION;
        const density = Math.min(
            smoothstep(front.startTime, front.startTime + ramp, elapsedSeconds),
            smoothstep(end, end - ramp, elapsedSeconds)
        );
        return { weatherState: front.state, stormDensity: density };
    }
    return { weatherState: 'clear', stormDensity: 0 };
}

// Deterministic hash of an integer bucket -> 0..1. Used to place lightning
// strikes without carrying any mutable state between frames, so the same
// elapsed time always produces the same flash on every peer.
function hashUnit(value) {
    let t = (value >>> 0) + 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function resolveFlash(seed, elapsedSeconds, stormDensity) {
    if (stormDensity < FLASH_STORM_THRESHOLD) return 0;
    // Strikes land in fixed time buckets; a seeded jitter inside each bucket
    // decides exactly when, so flashes are irregular but reproducible.
    const bucket = Math.floor(elapsedSeconds / FLASH_MEAN_GAP_SECONDS);
    const jitter = hashUnit(bucket ^ seed);
    // Heavier storms fire a greater share of their buckets.
    if (hashUnit((bucket * 2654435761) ^ seed) > stormDensity) return 0;
    const strikeAt = bucket * FLASH_MEAN_GAP_SECONDS + jitter * FLASH_MEAN_GAP_SECONDS;
    const since = elapsedSeconds - strikeAt;
    if (since < 0 || since > FLASH_DECAY_SECONDS) return 0;
    return clamp01(Math.exp(-since / (FLASH_DECAY_SECONDS * 0.28)));
}

export function computeSkyState({
    profile,
    timeOfDay = 0.5,
    elapsedSeconds = 0,
    cryoMix = 0,
    bioMix = 0,
    // Director beats (mothership transit, spore bloom, the dying sun). These
    // are never scheduled -- a run must not spoil them at random.
    events = []
} = {}) {
    // timeOfDay 0/1 = midnight, 0.5 = noon -- matching threeGame's own cycle.
    const dayPhase = (timeOfDay - 0.25) * TWO_PI;
    const sunDirection = primarySunDirection(dayPhase, profile.suns[0]);

    // Sun elevation drives the day factor directly, so the sky and the lights
    // can never disagree about whether it is daytime.
    const dayFactor = smoothstep(-0.25, 0.25, sunDirection.y);

    const { weatherState, stormDensity } = resolveWeather(profile.weatherFronts, elapsedSeconds);

    const starOpacity = clamp01(mix(1, STAR_OPACITY_DAY_FLOOR, dayFactor) * (1 - stormDensity * 0.9));

    const horizonBase = mixTriple(
        BIOME_SKY_COLORS.active.horizon,
        BIOME_SKY_COLORS.cryo.horizon,
        BIOME_SKY_COLORS.bio.horizon,
        clamp01(cryoMix),
        clamp01(bioMix)
    );
    const zenithBase = mixTriple(
        BIOME_SKY_COLORS.active.zenith,
        BIOME_SKY_COLORS.cryo.zenith,
        BIOME_SKY_COLORS.bio.zenith,
        clamp01(cryoMix),
        clamp01(bioMix)
    );

    // Night drains the horizon toward the zenith colour; a storm drains it
    // further, which is what makes a dust wall read as "swallowing" the sky.
    const horizonLift = mix(0.18, 1, dayFactor) * (1 - stormDensity * 0.45);
    const toColor = ([r, g, b], scale) => ({
        r: clamp01(r * scale),
        g: clamp01(g * scale),
        b: clamp01(b * scale)
    });

    return {
        timeOfDay,
        dayFactor,
        sunDirection,
        // The primary sun is included: it was previously excluded entirely, so
        // the star lighting the world was never actually drawn. Its own
        // direction stays true solar (it drives the key light), which means it
        // is simply out of frame around midday and visible low at dawn and dusk.
        bodies: [
            ...profile.suns,
            ...profile.moons,
            ...profile.planets
        ].map((body, index) => ({
            assetId: body.assetId,
            angularSize: body.angularSize,
            depthTier: body.depthTier ?? 'mid',
            radiusScale: SKY_DEPTH_TIERS[body.depthTier ?? 'mid'].radiusScale,
            direction: index === 0 ? sunDirection : directionForBody(body, dayPhase)
        })),
        starOpacity,
        weatherState,
        stormDensity,
        // The prevailing wind is a property of the run, not of the moment --
        // a bearing that swung every frame would make the sky boil.
        wind: {
            direction: (profile.seed % 628) / 100,
            speed: clamp01(mix(WIND_CALM_SPEED, WIND_STORM_SPEED, stormDensity))
        },
        flash: resolveFlash(profile.seed, elapsedSeconds, stormDensity),
        transients: resolveActiveTransients({
            schedule: profile.transients ?? [],
            elapsedSeconds,
            events
        }),
        horizonColor: toColor(horizonBase, horizonLift),
        zenithColor: toColor(zenithBase, mix(0.55, 1, dayFactor))
    };
}
