import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { BaseLights } from './baseLights.js';

function makeScene() {
    return new THREE.Scene();
}

describe('BaseLights', () => {
    it('builds a ring of dormant fixtures around the center', () => {
        const scene = makeScene();
        const lights = new BaseLights(scene);
        lights.build(9, 9);

        expect(lights.fixtures.length).toBe(8);
        // All start off: zero intensity, hidden.
        for (const f of lights.fixtures) {
            expect(f.light.intensity).toBe(0);
            expect(f.light.visible).toBe(false);
        }
        // Fixtures sit on a ring around the center.
        for (const f of lights.fixtures) {
            const dx = f.light.position.x - 9;
            const dz = f.light.position.z - 9;
            expect(Math.hypot(dx, dz)).toBeCloseTo(3.6, 1);
        }
    });

    it('does nothing on update until ignited', () => {
        const scene = makeScene();
        const lights = new BaseLights(scene);
        lights.build(0, 0);
        lights.update(1.0);
        expect(lights.fixtures.every((f) => f.light.intensity === 0)).toBe(true);
    });

    it('staggers fixtures on during the ignition sweep', () => {
        const scene = makeScene();
        const lights = new BaseLights(scene);
        lights.ignite(0, 0);
        expect(lights.isIgnited).toBe(true);

        // Just after ignition only the first fixture has started warming.
        lights.update(0.05);
        const onCount = lights.fixtures.filter((f) => f.on).length;
        expect(onCount).toBeGreaterThanOrEqual(1);
        expect(onCount).toBeLessThan(8);
    });

    it('settles every fixture to a lit idle state after the full sweep', () => {
        const scene = makeScene();
        const lights = new BaseLights(scene);
        lights.ignite(0, 0);
        // Advance well past the whole staggered sweep + ignition window.
        lights.update(10);

        for (const f of lights.fixtures) {
            expect(f.on).toBe(true);
            expect(f.light.visible).toBe(true);
            expect(f.light.intensity).toBeGreaterThan(0.5);
        }
    });

    it('igniteInstant powers all fixtures on with no sweep', () => {
        const scene = makeScene();
        const lights = new BaseLights(scene);
        lights.igniteInstant(0, 0);
        expect(lights.isIgnited).toBe(true);
        for (const f of lights.fixtures) {
            expect(f.light.intensity).toBeGreaterThan(0.5);
            expect(f.light.visible).toBe(true);
        }
    });

    it('ignite is idempotent (second call does not restart the sweep)', () => {
        const scene = makeScene();
        const lights = new BaseLights(scene);
        lights.ignite(0, 0);
        lights.update(10);
        const before = lights.elapsed;
        lights.ignite(0, 0);
        expect(lights.elapsed).toBe(before);
    });
});
