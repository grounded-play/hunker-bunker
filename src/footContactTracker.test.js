import { describe, expect, it } from 'vitest';
import { FootContactTracker, StepClock } from './footContactTracker.js';

// Foot heights for a walk at `hz` strides per second: two feet in anti-phase.
function walk(tracker, seconds, { hz = 1, lift = 0.12, moving = true, dt = 1 / 60, jitter = 0 } = {}) {
    const events = [];
    for (let t = 0; t < seconds; t += dt) {
        const phase = 2 * Math.PI * hz * t;
        const left = Math.max(0, Math.sin(phase)) * lift + (Math.random() - 0.5) * jitter;
        const right = Math.max(0, Math.sin(phase + Math.PI)) * lift + (Math.random() - 0.5) * jitter;
        for (const foot of tracker.update(dt, [left, right], moving)) events.push({ t, foot });
    }
    return events;
}

describe('FootContactTracker', () => {
    it('fires one contact per footfall, alternating feet, at the stride rate', () => {
        const events = walk(new FootContactTracker(), 4, { hz: 1 });
        const steady = events.filter((e) => e.t > 1);
        expect(steady.length).toBeGreaterThanOrEqual(5);
        expect(steady.length).toBeLessThanOrEqual(7);
        for (let i = 1; i < steady.length; i++) expect(steady[i].foot).not.toBe(steady[i - 1].foot);
    });

    it('follows a faster cadence (sprint)', () => {
        const slow = walk(new FootContactTracker(), 4, { hz: 1 }).filter((e) => e.t > 1).length;
        const fast = walk(new FootContactTracker(), 4, { hz: 1.6 }).filter((e) => e.t > 1).length;
        expect(fast).toBeGreaterThan(slow + 2);
    });

    it('stays silent standing still or swaying in idle', () => {
        expect(walk(new FootContactTracker(), 3, { moving: false })).toEqual([]);
        expect(walk(new FootContactTracker(), 3, { lift: 0.01, jitter: 0.004 })).toEqual([]);
    });

    it('never fires two footfalls closer than the step gap (no flams from blended clips)', () => {
        const tracker = new FootContactTracker();
        const events = [];
        // Both feet lift and land together, as a walk/strafe blend can do.
        for (let t = 0; t < 3; t += 1 / 60) {
            const h = Math.max(0, Math.sin(2 * Math.PI * t)) * 0.12;
            for (let k = 0; k < tracker.update(1 / 60, [h, h * 0.98], true).length; k++) events.push(t);
        }
        for (let i = 1; i < events.length; i++) expect(events[i] - events[i - 1]).toBeGreaterThanOrEqual(0.2 - 1e-9);
    });
});

describe('StepClock', () => {
    const run = (clock, seconds, frame) => {
        const out = [];
        for (let t = 0; t < seconds; t += 1 / 60) for (const foot of clock.update(1 / 60, typeof frame === 'function' ? frame(t) : frame)) out.push({ t, foot });
        return out;
    };

    it('keeps a steady, alternating cadence at the clip rate when contacts are missing', () => {
        const steps = run(new StepClock(), 3, { moving: true, stepInterval: 0.5 });
        expect(steps.length).toBeGreaterThanOrEqual(5);
        expect(steps.length).toBeLessThanOrEqual(6);
        for (let i = 1; i < steps.length; i++) {
            expect(steps[i].t - steps[i - 1].t).toBeCloseTo(0.5, 1);
            expect(steps[i].foot).not.toBe(steps[i - 1].foot);
        }
    });

    it('locks its phase to the feet: a contact late in the phase is the step', () => {
        // Contacts every 0.5 s offset by 0.2 s from the clock's own phase.
        const steps = run(new StepClock(), 3, (t) => ({
            moving: true,
            stepInterval: 0.5,
            contacts: Math.abs(((t - 0.2) % 0.5)) < 1 / 120 && t > 0.1 ? [Math.round(t / 0.5) % 2] : []
        }));
        const late = steps.filter((s) => s.t > 1);
        for (const s of late) expect(Math.abs(((s.t - 0.2) % 0.5 + 0.5) % 0.5)).toBeLessThan(0.05);
    });

    it('stops when standing and speeds up with the clip', () => {
        expect(run(new StepClock(), 2, { moving: false, stepInterval: 0.5 })).toEqual([]);
        const fast = run(new StepClock(), 3, { moving: true, stepInterval: 0.3 }).length;
        expect(fast).toBeGreaterThanOrEqual(9);
    });

    it('ignores mid-phase contacts instead of letting them delay the rhythm', () => {
        // A blended clip's other foot dipping halfway through every step.
        const steps = run(new StepClock(), 4, (t) => ({
            moving: true,
            stepInterval: 0.5,
            contacts: Math.abs(((t - 0.2) % 0.5)) < 1 / 120 ? [0] : []
        }));
        const gaps = steps.slice(1).map((s, i) => s.t - steps[i].t);
        for (const gap of gaps.slice(2)) expect(gap).toBeLessThanOrEqual(0.52);
    });
});

