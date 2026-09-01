import { describe, expect, it } from 'vitest';
import { createSkyProfile, SKY_BODY_IDS, SKY_VISIBLE_ELEVATION, SKY_DEPTH_TIERS } from './skyProfile.js';

describe('createSkyProfile', () => {
    it('returns an identical profile for the same seed', () => {
        expect(createSkyProfile(12345)).toEqual(createSkyProfile(12345));
    });

    it('returns a different sky for a different seed', () => {
        const a = createSkyProfile(1);
        const b = createSkyProfile(2);
        expect(a).not.toEqual(b);
    });

    it('always places at least one sun so the directional light has a source', () => {
        for (let seed = 1; seed <= 200; seed += 1) {
            expect(createSkyProfile(seed).suns.length).toBeGreaterThanOrEqual(1);
        }
    });

    it('never places more than two suns', () => {
        for (let seed = 1; seed <= 200; seed += 1) {
            expect(createSkyProfile(seed).suns.length).toBeLessThanOrEqual(2);
        }
    });

    it('only references celestial body ids that exist in the asset catalog', () => {
        for (let seed = 1; seed <= 200; seed += 1) {
            const profile = createSkyProfile(seed);
            const used = [...profile.suns, ...profile.moons, ...profile.planets].map((b) => b.assetId);
            for (const assetId of used) {
                expect(SKY_BODY_IDS).toContain(assetId);
            }
        }
    });

    it('never places the same celestial body twice in one sky', () => {
        for (let seed = 1; seed <= 200; seed += 1) {
            const profile = createSkyProfile(seed);
            const used = [...profile.suns, ...profile.moons, ...profile.planets].map((b) => b.assetId);
            expect(new Set(used).size).toBe(used.length);
        }
    });

    it('gives every body a finite orbit so it can be positioned on any frame', () => {
        const profile = createSkyProfile(99);
        for (const body of [...profile.suns, ...profile.moons, ...profile.planets]) {
            expect(Number.isFinite(body.orbitPhase)).toBe(true);
            expect(Number.isFinite(body.orbitInclination)).toBe(true);
            expect(body.angularSize).toBeGreaterThan(0);
        }
    });
});

describe('createSkyProfile weather schedule', () => {
    it('orders fronts by start time', () => {
        for (let seed = 1; seed <= 50; seed += 1) {
            const { weatherFronts } = createSkyProfile(seed);
            const starts = weatherFronts.map((f) => f.startTime);
            expect(starts).toEqual([...starts].sort((a, b) => a - b));
        }
    });

    it('never overlaps two fronts', () => {
        for (let seed = 1; seed <= 50; seed += 1) {
            const { weatherFronts } = createSkyProfile(seed);
            for (let i = 1; i < weatherFronts.length; i += 1) {
                const previousEnd = weatherFronts[i - 1].startTime + weatherFronts[i - 1].duration;
                expect(weatherFronts[i].startTime).toBeGreaterThanOrEqual(previousEnd);
            }
        }
    });

    it('only schedules weather states the runtime knows how to render', () => {
        const known = ['clear', 'snow', 'spore_drift', 'fog_gust', 'rainstorm'];
        for (let seed = 1; seed <= 50; seed += 1) {
            for (const front of createSkyProfile(seed).weatherFronts) {
                expect(known).toContain(front.state);
            }
        }
    });

    it('gives every front a positive duration', () => {
        for (let seed = 1; seed <= 50; seed += 1) {
            for (const front of createSkyProfile(seed).weatherFronts) {
                expect(front.duration).toBeGreaterThan(0);
            }
        }
    });
});

describe('createSkyProfile transients', () => {
    it('carries a seeded transient schedule alongside the weather fronts', () => {
        expect(Array.isArray(createSkyProfile(5).transients)).toBe(true);
    });

    it('gives the same run the same transients', () => {
        expect(createSkyProfile(5).transients).toEqual(createSkyProfile(5).transients);
    });
});

describe('createSkyProfile visibility and layering', () => {
    const allBodies = (profile) => [...profile.suns, ...profile.moons, ...profile.planets];

    it('places every body inside the band the camera can actually see', () => {
        // The third-person rig pitches 11.2 deg down with a 58 deg fov, so the
        // top of frame is only ~17.8 deg up: direction.y above ~0.31 is off
        // screen forever.
        for (let seed = 1; seed <= 100; seed += 1) {
            for (const body of allBodies(createSkyProfile(seed))) {
                expect(body.elevationBand).toBeGreaterThanOrEqual(SKY_VISIBLE_ELEVATION.min);
                expect(body.elevationBand).toBeLessThanOrEqual(SKY_VISIBLE_ELEVATION.max);
            }
        }
    });

    it('keeps the visible band below the top of the camera frame', () => {
        expect(SKY_VISIBLE_ELEVATION.max).toBeLessThan(0.306);
        expect(SKY_VISIBLE_ELEVATION.min).toBeGreaterThan(0);
    });

    it('assigns every body a depth tier so the sky reads as layered', () => {
        for (let seed = 1; seed <= 60; seed += 1) {
            for (const body of allBodies(createSkyProfile(seed))) {
                expect(Object.keys(SKY_DEPTH_TIERS)).toContain(body.depthTier);
            }
        }
    });

    it('spreads bodies across more than one depth tier when there are several', () => {
        // A sky where everything sits at one distance reads as a flat decal.
        let sawSpread = false;
        for (let seed = 1; seed <= 80 && !sawSpread; seed += 1) {
            const bodies = allBodies(createSkyProfile(seed));
            if (bodies.length < 3) continue;
            if (new Set(bodies.map((b) => b.depthTier)).size > 1) sawSpread = true;
        }
        expect(sawSpread).toBe(true);
    });

    it('gives each depth tier a distinct radius scale', () => {
        const scales = Object.values(SKY_DEPTH_TIERS).map((t) => t.radiusScale);
        expect(new Set(scales).size).toBe(scales.length);
    });

    it('sits nearer tiers lower in the sky, the way a large body reads as close', () => {
        const tiers = Object.values(SKY_DEPTH_TIERS)
            .slice()
            .sort((a, b) => a.radiusScale - b.radiusScale);
        for (let i = 1; i < tiers.length; i += 1) {
            expect(tiers[i].elevationBias).toBeGreaterThanOrEqual(tiers[i - 1].elevationBias);
        }
    });
});
