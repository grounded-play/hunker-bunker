// Scheduling and placement for the animated sky transients.
//
// Pure: no THREE, no clock. Seeded from the run, so co-op peers see the same
// comet at the same moment with nothing on the wire -- the same trick the
// weather fronts already use.
//
// A transient has two independent motions, and conflating them is the classic
// mistake. The PATH decides where it is in the sky; the SHEET decides what it
// looks like right now. This module owns the path and hands the sheet a
// progress value. Nothing here knows about frames.

import { SKY_SHEET_PLAYBACK } from './skySheets.js';

const RUN_SCHEDULE_SECONDS = 1800;

// Where anchored effects sit, when they are not travelling a path at all.
// Storm effects hang low because they belong to the cloud base, not the zenith.
const ANCHOR_DIRECTIONS = Object.freeze({
    zenith: { x: 0, y: 1, z: 0 },
    'storm-base': { x: 0, y: 0.22, z: -0.975 },
    'cloud-base': { x: 0, y: 0.30, z: -0.954 }
});

// Narrative beats. These are fired by the director, never scheduled -- a run
// must not spoil the mothership or the dying sun at random.
export const DIRECTOR_TRANSIENT_IDS = Object.freeze([
    'sky_fx_mothership_transit',
    'sky_fx_spore_bloom_zenith',
    'sky_fx_sun_gutter'
]);

export const SCHEDULED_TRANSIENT_IDS = Object.freeze([
    'sky_fx_comet_longtail',
    'sky_fx_meteor_shower',
    'sky_fx_reentry_debris',
    'sky_fx_satellite_tumble'
]);

const TRANSIENT_DURATIONS = Object.freeze({
    sky_fx_comet_longtail: [14, 26],
    sky_fx_meteor_shower: [6, 12],
    sky_fx_reentry_debris: [5, 9],
    sky_fx_satellite_tumble: [20, 40]
});

const TRANSIENT_SIZES = Object.freeze({
    sky_fx_comet_longtail: [0.12, 0.22],
    sky_fx_meteor_shower: [0.18, 0.30],
    sky_fx_reentry_debris: [0.10, 0.18],
    sky_fx_satellite_tumble: [0.03, 0.06]
});

const DEFAULT_EVENT_SIZE = 0.34;
const GAP_MIN = 90;
const GAP_MAX = 260;

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

const range = (random, min, max) => min + random() * (max - min);

function directionFrom(azimuth, elevation) {
    const cosElevation = Math.cos(elevation);
    return {
        x: Math.cos(azimuth) * cosElevation,
        y: Math.sin(elevation),
        z: Math.sin(azimuth) * cosElevation
    };
}

// Straight lerp between two points on the dome, renormalised. Good enough for
// the short arcs these travel, and far cheaper than a proper slerp.
function pathDirection(from, to, progress) {
    const x = from.x + (to.x - from.x) * progress;
    const y = from.y + (to.y - from.y) * progress;
    const z = from.z + (to.z - from.z) * progress;
    const length = Math.hypot(x, y, z) || 1;
    return { x: x / length, y: y / length, z: z / length };
}

export function createTransientSchedule(seed) {
    const random = createSeededRandom((seed >>> 0) ^ 0x7a1c0de);
    const schedule = [];
    let cursor = range(random, 45, GAP_MAX);

    while (cursor < RUN_SCHEDULE_SECONDS) {
        const sheetId = SCHEDULED_TRANSIENT_IDS[
            Math.floor(random() * SCHEDULED_TRANSIENT_IDS.length)
        ];
        const [minDuration, maxDuration] = TRANSIENT_DURATIONS[sheetId];
        const [minSize, maxSize] = TRANSIENT_SIZES[sheetId];
        const duration = range(random, minDuration, maxDuration);

        // Entry and exit points on the dome. Both stay above the horizon so a
        // transient does not spend its life buried in terrain.
        const azimuth = range(random, 0, Math.PI * 2);
        const sweep = range(random, 0.6, 1.9) * (random() < 0.5 ? -1 : 1);

        schedule.push({
            sheetId,
            startTime: cursor,
            duration,
            angularSize: range(random, minSize, maxSize),
            from: directionFrom(azimuth, range(random, 0.12, 0.8)),
            to: directionFrom(azimuth + sweep, range(random, 0.12, 0.8))
        });

        cursor += duration + range(random, GAP_MIN, GAP_MAX);
    }
    return schedule;
}

export function resolveActiveTransients({ schedule = [], elapsedSeconds = 0, events = [] } = {}) {
    // Director beats take the sky. A scheduled comet crossing the frame during
    // the mothership's transit would read as a bug, not as a busy sky.
    for (const event of events) {
        const progress = (elapsedSeconds - event.startedAt) / event.duration;
        if (progress < 0 || progress > 1) continue;
        const from = event.from ?? directionFrom(-0.8, 0.55);
        const to = event.to ?? directionFrom(0.8, 0.42);
        return [{
            key: `event:${event.sheetId}`,
            sheetId: event.sheetId,
            progress,
            angularSize: event.angularSize ?? DEFAULT_EVENT_SIZE,
            direction: pathDirection(from, to, progress)
        }];
    }

    for (const entry of schedule) {
        const progress = (elapsedSeconds - entry.startTime) / entry.duration;
        if (progress < 0 || progress > 1) continue;
        return [{
            key: `scheduled:${entry.startTime}`,
            sheetId: entry.sheetId,
            progress,
            angularSize: entry.angularSize,
            direction: pathDirection(entry.from, entry.to, progress)
        }];
    }

    return [];
}

// Maps a transient's own life onto the sheet's timeline.
//
// The two are not the same length and must not be conflated. A comet carries 8
// frames -- 0.67s at 12fps -- but crosses the sky over ~20s, and the art has
// its tail lengthening across the crossing, so a once-mode sheet is STRETCHED
// over the transient's lifetime. A tumbling satellite is the opposite case: it
// rotates at a real rate, and stretching it across a 30s pass would look
// frozen, so loop-mode sheets play at their true frame rate.
export function sheetTimeForTransient(definition, { progress = 0, elapsedInTransient = 0 } = {}) {
    if (definition.playback === SKY_SHEET_PLAYBACK.LOOP) {
        return Math.max(0, elapsedInTransient);
    }
    const fullSheetSeconds = definition.frames / definition.fps;
    return Math.max(0, Math.min(1, progress)) * fullSheetSeconds;
}

// Some effects do not travel. The dying sun has to gutter where the sun
// actually is, and a spore bloom stains the zenith -- giving either a path
// would put it somewhere the fiction says it cannot be.
export function anchorDirectionFor(anchor, skyState, pathDirection) {
    if (anchor === 'primary-sun') return skyState?.sunDirection ?? pathDirection;
    return ANCHOR_DIRECTIONS[anchor] ?? pathDirection;
}
