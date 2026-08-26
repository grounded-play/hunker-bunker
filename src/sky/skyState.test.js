import { describe, expect, it } from 'vitest';
import { createSkyProfile } from './skyProfile.js';
import { computeSkyState } from './skyState.js';

const profile = createSkyProfile(4242);
const at = (overrides = {}) => computeSkyState({
    profile,
    timeOfDay: 0.5,
    elapsedSeconds: 0,
    cryoMix: 0,
    bioMix: 0,
    ...overrides
});

const length = (v) => Math.hypot(v.x, v.y, v.z);

describe('computeSkyState sun', () => {
    it('returns a unit-length sun direction the directional light can consume', () => {
        for (let step = 0; step <= 20; step += 1) {
            expect(length(at({ timeOfDay: step / 20 }).sunDirection)).toBeCloseTo(1, 6);
        }
    });

    it('puts the sun overhead at noon and below the horizon at midnight', () => {
        expect(at({ timeOfDay: 0.5 }).sunDirection.y).toBeGreaterThan(0.9);
        expect(at({ timeOfDay: 0.0 }).sunDirection.y).toBeLessThan(-0.9);
    });

    it('reports a day factor of 1 at noon and 0 at midnight', () => {
        expect(at({ timeOfDay: 0.5 }).dayFactor).toBeCloseTo(1, 5);
        expect(at({ timeOfDay: 0.0 }).dayFactor).toBeCloseTo(0, 5);
    });
});

describe('computeSkyState stars', () => {
    // The chosen fiction is a thin alien atmosphere: deep space never fully
    // washes out, even at noon. A zero here would mean an Earth-like sky.
    it('never fully hides the stars, even at noon', () => {
        expect(at({ timeOfDay: 0.5 }).starOpacity).toBeGreaterThan(0);
    });

    it('shows the stars far more strongly at midnight than at noon', () => {
        expect(at({ timeOfDay: 0.0 }).starOpacity)
            .toBeGreaterThan(at({ timeOfDay: 0.5 }).starOpacity * 3);
    });

    it('keeps star opacity within the unit range at every time of day', () => {
        for (let step = 0; step <= 40; step += 1) {
            const { starOpacity } = at({ timeOfDay: step / 40 });
            expect(starOpacity).toBeGreaterThanOrEqual(0);
            expect(starOpacity).toBeLessThanOrEqual(1);
        }
    });
});

describe('computeSkyState weather', () => {
    const front = profile.weatherFronts[0];

    it('reads clear before the first scheduled front arrives', () => {
        const state = at({ elapsedSeconds: 0 });
        expect(state.weatherState).toBe('clear');
        expect(state.stormDensity).toBe(0);
    });

    it('reads the scheduled state at the middle of a front', () => {
        const state = at({ elapsedSeconds: front.startTime + front.duration / 2 });
        expect(state.weatherState).toBe(front.state);
    });

    it('peaks storm density in the middle of a front', () => {
        const mid = at({ elapsedSeconds: front.startTime + front.duration / 2 }).stormDensity;
        expect(mid).toBeGreaterThan(0.9);
    });

    it('ramps storm density in and out rather than snapping', () => {
        const justInside = at({ elapsedSeconds: front.startTime + 0.5 }).stormDensity;
        expect(justInside).toBeGreaterThan(0);
        expect(justInside).toBeLessThan(0.2);
    });

    it('returns to clear after the last front has passed', () => {
        const last = profile.weatherFronts[profile.weatherFronts.length - 1];
        const state = at({ elapsedSeconds: last.startTime + last.duration + 1 });
        expect(state.weatherState).toBe('clear');
        expect(state.stormDensity).toBe(0);
    });

    it('never jumps storm density discontinuously across a front boundary', () => {
        let previous = at({ elapsedSeconds: front.startTime - 5 }).stormDensity;
        for (let t = front.startTime - 5; t < front.startTime + front.duration + 5; t += 0.5) {
            const current = at({ elapsedSeconds: t }).stormDensity;
            expect(Math.abs(current - previous)).toBeLessThan(0.25);
            previous = current;
        }
    });
});

describe('computeSkyState colour', () => {
    it('returns horizon and zenith colours inside the unit range', () => {
        for (const key of ['horizonColor', 'zenithColor']) {
            const c = at({ timeOfDay: 0.3 })[key];
            for (const channel of [c.r, c.g, c.b]) {
                expect(channel).toBeGreaterThanOrEqual(0);
                expect(channel).toBeLessThanOrEqual(1);
            }
        }
    });

    it('shifts the horizon colour when the player crosses into the cryo biome', () => {
        const active = at({ cryoMix: 0 }).horizonColor;
        const cryo = at({ cryoMix: 1 }).horizonColor;
        expect(cryo).not.toEqual(active);
    });

    it('darkens the horizon at night relative to noon', () => {
        const lum = (c) => c.r + c.g + c.b;
        expect(lum(at({ timeOfDay: 0.0 }).horizonColor))
            .toBeLessThan(lum(at({ timeOfDay: 0.5 }).horizonColor));
    });
});

describe('computeSkyState wind', () => {
    const front = profile.weatherFronts[0];
    const inFront = { elapsedSeconds: front.startTime + front.duration / 2 };

    it('always keeps the air moving, so clouds never freeze on a clear day', () => {
        expect(at().wind.speed).toBeGreaterThan(0);
    });

    it('blows harder as a front closes in', () => {
        expect(at(inFront).wind.speed).toBeGreaterThan(at({ elapsedSeconds: 0 }).wind.speed);
    });

    it('holds a steady bearing for the whole run rather than swinging each frame', () => {
        const a = at({ elapsedSeconds: 10 }).wind.direction;
        const b = at({ elapsedSeconds: 900 }).wind.direction;
        expect(a).toBeCloseTo(b, 6);
    });

    it('gives different runs different prevailing winds', () => {
        const other = computeSkyState({ profile: createSkyProfile(999), timeOfDay: 0.5 });
        expect(other.wind.direction).not.toBeCloseTo(at().wind.direction, 3);
    });

    it('keeps wind speed inside a sane range at every point in the run', () => {
        for (let t = 0; t < 1800; t += 17) {
            const { speed } = at({ elapsedSeconds: t }).wind;
            expect(speed).toBeGreaterThan(0);
            expect(speed).toBeLessThanOrEqual(1);
        }
    });
});

describe('computeSkyState flash', () => {
    it('reports no lightning flash while the sky is clear', () => {
        expect(at({ elapsedSeconds: 0 }).flash).toBe(0);
    });

    it('keeps the flash value inside the unit range during a storm', () => {
        const front = profile.weatherFronts[0];
        for (let t = front.startTime; t < front.startTime + front.duration; t += 0.25) {
            const { flash } = at({ elapsedSeconds: t });
            expect(flash).toBeGreaterThanOrEqual(0);
            expect(flash).toBeLessThanOrEqual(1);
        }
    });
});

describe('computeSkyState transients', () => {
    it('reports an empty transient list when nothing is crossing the sky', () => {
        expect(at({ elapsedSeconds: 0 }).transients).toEqual([]);
    });

    it('surfaces the scheduled transient that is currently playing', () => {
        const first = profile.transients[0];
        const state = at({ elapsedSeconds: first.startTime + first.duration / 2 });
        expect(state.transients).toHaveLength(1);
        expect(state.transients[0].sheetId).toBe(first.sheetId);
    });

    it('plays a director event handed in from outside the schedule', () => {
        const state = at({
            elapsedSeconds: 50,
            events: [{ sheetId: 'sky_fx_mothership_transit', startedAt: 45, duration: 20 }]
        });
        expect(state.transients[0].sheetId).toBe('sky_fx_mothership_transit');
    });
});
