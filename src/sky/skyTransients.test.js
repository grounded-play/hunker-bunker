import { describe, expect, it } from 'vitest';
import { SKY_SHEETS } from './skySheets.js';
import { createTransientSchedule, resolveActiveTransients, SCHEDULED_TRANSIENT_IDS, sheetTimeForTransient, anchorDirectionFor, transientEnvelope } from './skyTransients.js';

const schedule = createTransientSchedule(4242);
const active = (elapsedSeconds, events = []) =>
    resolveActiveTransients({ schedule, elapsedSeconds, events });

describe('createTransientSchedule', () => {
    it('produces the same schedule for the same seed', () => {
        expect(createTransientSchedule(7)).toEqual(createTransientSchedule(7));
    });

    it('produces different schedules for different seeds', () => {
        expect(createTransientSchedule(7)).not.toEqual(createTransientSchedule(8));
    });

    it('orders entries by start time', () => {
        const starts = schedule.map((t) => t.startTime);
        expect(starts).toEqual([...starts].sort((a, b) => a - b));
    });

    it('never overlaps two transients', () => {
        for (let i = 1; i < schedule.length; i += 1) {
            const previousEnd = schedule[i - 1].startTime + schedule[i - 1].duration;
            expect(schedule[i].startTime).toBeGreaterThanOrEqual(previousEnd);
        }
    });

    it('only schedules sheets that exist in the manifest', () => {
        for (const entry of schedule) {
            expect(SKY_SHEETS[entry.sheetId], entry.sheetId).toBeDefined();
        }
    });

    it('never schedules a director-only beat', () => {
        // The mothership transit, spore bloom and sun gutter are narrative
        // events; a run must not spoil them at random.
        for (const entry of schedule) {
            expect(SCHEDULED_TRANSIENT_IDS).toContain(entry.sheetId);
        }
    });

    it('gives every entry a positive duration and a travel path', () => {
        for (const entry of schedule) {
            expect(entry.duration).toBeGreaterThan(0);
            expect(entry.from).toBeDefined();
            expect(entry.to).toBeDefined();
        }
    });
});

describe('resolveActiveTransients', () => {
    const first = schedule[0];

    it('shows nothing before the first transient is due', () => {
        expect(active(0)).toEqual([]);
    });

    it('shows nothing in the gaps between transients', () => {
        expect(active(first.startTime + first.duration + 0.5)).toEqual([]);
    });

    it('reports progress running 0 to 1 across the transient lifetime', () => {
        expect(active(first.startTime + 0.001)[0].progress).toBeLessThan(0.02);
        expect(active(first.startTime + first.duration - 0.001)[0].progress).toBeGreaterThan(0.98);
    });

    it('advances progress monotonically', () => {
        let previous = -1;
        for (let t = first.startTime; t <= first.startTime + first.duration; t += 0.1) {
            const [entry] = active(t);
            if (!entry) continue;
            expect(entry.progress).toBeGreaterThanOrEqual(previous);
            previous = entry.progress;
        }
    });

    it('moves the transient across the sky as it plays', () => {
        const start = active(first.startTime + 0.01)[0].direction;
        const end = active(first.startTime + first.duration - 0.01)[0].direction;
        const travelled = Math.hypot(end.x - start.x, end.y - start.y, end.z - start.z);
        expect(travelled).toBeGreaterThan(0.1);
    });

    it('returns a unit direction at every point along the path', () => {
        for (let t = first.startTime; t <= first.startTime + first.duration; t += 0.25) {
            const [entry] = active(t);
            if (!entry) continue;
            const { x, y, z } = entry.direction;
            expect(Math.hypot(x, y, z)).toBeCloseTo(1, 5);
        }
    });

    it('plays a director event that was never on the schedule', () => {
        const events = [{ sheetId: 'sky_fx_mothership_transit', startedAt: 100, duration: 12 }];
        const [entry] = active(104, events);
        expect(entry.sheetId).toBe('sky_fx_mothership_transit');
        expect(entry.progress).toBeCloseTo(4 / 12, 5);
    });

    it('drops a director event once it has finished', () => {
        const events = [{ sheetId: 'sky_fx_sun_gutter', startedAt: 100, duration: 5 }];
        expect(active(106, events)).toEqual([]);
    });

    it('lets a director event pre-empt a scheduled transient', () => {
        const events = [{
            sheetId: 'sky_fx_mothership_transit',
            startedAt: first.startTime,
            duration: first.duration
        }];
        const result = active(first.startTime + first.duration / 2, events);
        expect(result).toHaveLength(1);
        expect(result[0].sheetId).toBe('sky_fx_mothership_transit');
    });

    it('gives every active transient a positive angular size', () => {
        const [entry] = active(first.startTime + first.duration / 2);
        expect(entry.angularSize).toBeGreaterThan(0);
    });
});

describe('sheetTimeForTransient', () => {
    const comet = SKY_SHEETS.sky_fx_comet_longtail;      // 8 frames, once
    const tumble = SKY_SHEETS.sky_fx_satellite_tumble;   // 16 frames, loop

    it('stretches a once-mode sheet across the whole transient lifetime', () => {
        // A comet has 0.67s of frames but a ~20s crossing, and the art brief
        // has the tail lengthening across the crossing -- so the sheet has to
        // be stretched, not played once at 12fps and then held.
        const full = comet.frames / comet.fps;
        expect(sheetTimeForTransient(comet, { progress: 0, elapsedInTransient: 0 })).toBeCloseTo(0, 6);
        expect(sheetTimeForTransient(comet, { progress: 1, elapsedInTransient: 20 })).toBeCloseTo(full, 6);
        expect(sheetTimeForTransient(comet, { progress: 0.5, elapsedInTransient: 10 }))
            .toBeCloseTo(full / 2, 6);
    });

    it('plays a loop-mode sheet at its true frame rate instead of stretching it', () => {
        // A satellite tumbles at a real rate; stretching it over a 30s pass
        // would make it appear to freeze.
        expect(sheetTimeForTransient(tumble, { progress: 0.5, elapsedInTransient: 7.25 }))
            .toBeCloseTo(7.25, 6);
    });

    it('never returns a negative sheet time', () => {
        expect(sheetTimeForTransient(comet, { progress: -0.2, elapsedInTransient: -1 }))
            .toBeGreaterThanOrEqual(0);
    });
});

describe('anchorDirectionFor', () => {
    const skyState = { sunDirection: { x: 0.6, y: 0.8, z: 0 } };

    it('pins a zenith-anchored effect to the top of what the camera can see', () => {
        // Not the true zenith: the rig tops out near 17.8 deg, so y = 1 would
        // put the effect permanently above the frame.
        const direction = anchorDirectionFor('zenith', skyState, null);
        expect(direction.y).toBeGreaterThan(0.15);
        expect(direction.y).toBeLessThan(0.31);
    });

    it('pins a sun-anchored effect to the current sun position', () => {
        // The dying sun has to guttter where the sun actually is, not on a path.
        expect(anchorDirectionFor('primary-sun', skyState, null)).toEqual(skyState.sunDirection);
    });

    it('keeps storm-anchored effects low in the sky', () => {
        for (const anchor of ['storm-base', 'cloud-base']) {
            expect(anchorDirectionFor(anchor, skyState, null).y).toBeLessThan(0.5);
        }
    });

    it('falls back to the supplied path direction for unanchored effects', () => {
        const path = { x: 0, y: 0.5, z: 0.866 };
        expect(anchorDirectionFor('center', skyState, path)).toBe(path);
    });
});

describe('transientEnvelope', () => {
    it('fades a trigger animation out over its final frames rather than cutting', () => {
        expect(transientEnvelope(1)).toBeCloseTo(0, 6);
        expect(transientEnvelope(0.97)).toBeLessThan(0.5);
        expect(transientEnvelope(0.99)).toBeLessThan(transientEnvelope(0.95));
    });

    it('holds full strength through the body of the animation', () => {
        for (const progress of [0.3, 0.5, 0.6]) {
            expect(transientEnvelope(progress)).toBeCloseTo(1, 6);
        }
    });

    it('eases in at the start so a trigger never pops onto the screen', () => {
        expect(transientEnvelope(0)).toBeCloseTo(0, 6);
        expect(transientEnvelope(0.02)).toBeLessThan(1);
        expect(transientEnvelope(0.02)).toBeGreaterThan(0);
    });

    it('decreases monotonically once the fade-out has begun', () => {
        let previous = 1;
        for (let p = 0.8; p <= 1; p += 0.01) {
            const value = transientEnvelope(p);
            expect(value).toBeLessThanOrEqual(previous + 1e-9);
            previous = value;
        }
    });

    it('never leaves the unit range, even outside the lifetime', () => {
        for (let p = -0.5; p <= 1.5; p += 0.01) {
            const value = transientEnvelope(p);
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(1);
        }
    });

    it('reads zero once the animation is over, so nothing lingers', () => {
        expect(transientEnvelope(1.2)).toBe(0);
    });

    it('lets a slow beat start fading earlier than a lightning strike', () => {
        // A shorter fadeOut begins LATER: at 90% through, a strike with a 5%
        // tail is still at full strength while a beat with a 40% tail has been
        // dimming for a quarter of its life.
        expect(transientEnvelope(0.9, { fadeOut: 0.05 })).toBeCloseTo(1, 6);
        expect(transientEnvelope(0.9, { fadeOut: 0.4 })).toBeLessThan(0.5);
    });
});
