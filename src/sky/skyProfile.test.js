import { describe, expect, it } from 'vitest';
import { createSkyProfile, SKY_BODY_IDS } from './skyProfile.js';

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
