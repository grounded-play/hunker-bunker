import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { BaseLights } from './baseLights.js';

// LAG-01 regression guard.
//
// Repairing the O2 generator used to freeze the game for ~10.5 seconds
// (docs/logs/log20.json, long task at elapsed 221,986 ms). Cause: BaseLights
// only called build() from ignite(), so eight PointLights entered the scene in
// the middle of the milestone beat. three.js bakes light count and type into
// its program cache key, so every lit material in the scene needed a fresh
// program -- with ~2,100 unique materials, that is a multi-second synchronous
// compile on a visible frame.
//
// The fix builds the dormant grid during world setup (threeGame.setupCrashedShips)
// so the light SET is final before gameplay starts and ignition only ramps
// intensities. These lock the properties that fix depends on, because the
// symptom is a frame-time cliff that no unit test can observe directly.
//
// NOTE: the wider O2 door/video choreography described in
// docs/planning/o2-cinematic-doors-and-boss-destruction-plan-2026-09-10.md is
// NOT implemented in the runtime yet, so nothing here asserts it. See that
// plan's review notes.
describe('LAG-01 — base light grid must not change the scene light set at ignition', () => {
    const countLights = (scene) => {
        let n = 0;
        scene.traverse((child) => { if (child?.isLight) n += 1; });
        return n;
    };

    it('adds every fixture to the scene at build time, before ignition', () => {
        const scene = new THREE.Scene();
        const lights = new BaseLights(scene);
        expect(countLights(scene)).toBe(0);

        lights.build(0, 0);
        const afterBuild = countLights(scene);
        expect(afterBuild).toBeGreaterThan(0);
        expect(lights.built).toBe(true);
    });

    it('keeps fixtures present-but-dark so the grid is invisible until ignited', () => {
        const scene = new THREE.Scene();
        const lights = new BaseLights(scene);
        lights.build(0, 0);

        const fixtures = [];
        scene.traverse((child) => { if (child?.isLight) fixtures.push(child); });
        for (const light of fixtures) {
            // Visible keeps the light in the program cache key; zero intensity
            // keeps it from lighting anything yet. Both matter.
            expect(light.visible).toBe(true);
            expect(light.intensity).toBe(0);
        }
    });

    // The actual regression: if the grid is already built, igniting must not
    // introduce a single new light, because that is what forces the recompile.
    it('ignites a pre-built grid without changing the scene light count', () => {
        const scene = new THREE.Scene();
        const lights = new BaseLights(scene);
        lights.build(0, 0);
        const before = countLights(scene);

        lights.ignite(0, 0);
        expect(countLights(scene)).toBe(before);

        lights.update(10);
        expect(countLights(scene)).toBe(before);
    });

    it('ignites instantly without changing the light count either', () => {
        const scene = new THREE.Scene();
        const lights = new BaseLights(scene);
        lights.build(0, 0);
        const before = countLights(scene);

        lights.igniteInstant(0, 0);
        expect(countLights(scene)).toBe(before);
    });

    // Documents the hazard the fix exists to avoid: ignite() still builds on
    // demand as a safety net, and that path DOES add lights mid-run. If this
    // ever becomes the normal path again, the stall is back.
    it('shows why pre-building matters: a cold ignite adds the whole grid at once', () => {
        const scene = new THREE.Scene();
        const lights = new BaseLights(scene);
        expect(countLights(scene)).toBe(0);

        lights.ignite(0, 0);
        expect(countLights(scene)).toBeGreaterThan(0);
    });

    it('recentres an already-built grid instead of adding a second one', () => {
        const scene = new THREE.Scene();
        const lights = new BaseLights(scene);
        lights.build(0, 0);
        const before = countLights(scene);

        lights.ignite(40, -25, 6);
        expect(countLights(scene)).toBe(before);
    });
});
