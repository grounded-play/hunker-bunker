import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { BaseLights } from './baseLights.js';

function makeScene() {
    return new THREE.Scene();
}

describe('BaseLights', () => {
    it('builds a ring of dormant fixtures around the center with invisible bulbs', () => {
        const scene = makeScene();
        const lights = new BaseLights(scene);
        lights.build(9, 9, 4.5, 0xff00ff);

        expect(lights.fixtures.length).toBe(8);
        // Point lights are visible, but bulb meshes are invisible.
        for (const f of lights.fixtures) {
            expect(f.light.intensity).toBe(0);
            expect(f.light.visible).toBe(true);
            expect(f.light.color.getHex()).toBe(0xff00ff);
            expect(f.bulb.visible).toBe(false);
            expect(f.bulb.material.color.getHex()).toBe(0xff00ff);
        }
        // Fixtures sit on a ring of specified radius (4.5) around the center.
        for (const f of lights.fixtures) {
            const dx = f.light.position.x - 9;
            const dz = f.light.position.z - 9;
            expect(Math.hypot(dx, dz)).toBeCloseTo(4.5, 1);
        }
    });

    it('recenters and resizes existing fixtures without rebuilding them', () => {
        const scene = makeScene();
        const lights = new BaseLights(scene);
        lights.build(9, 9, 4.5, 0xff00ff);
        const fixtureRefs = lights.fixtures.map((f) => f.light);

        lights.recenter(12, 6, 6.0);

        expect(lights.centerX).toBe(12);
        expect(lights.centerZ).toBe(6);
        expect(lights.radius).toBe(6.0);
        expect(lights.fixtures.map((f) => f.light)).toEqual(fixtureRefs);
        for (const f of lights.fixtures) {
            const dx = f.light.position.x - 12;
            const dz = f.light.position.z - 6;
            expect(Math.hypot(dx, dz)).toBeCloseTo(6.0, 1);
            expect(f.bulb.position.x).toBe(f.light.position.x);
            expect(f.bulb.position.z).toBe(f.light.position.z);
            expect(f.bulb.visible).toBe(false);
        }
    });

    it('updates light colors dynamically', () => {
        const scene = makeScene();
        const lights = new BaseLights(scene);
        lights.build(9, 9, 4.5, 0xff00ff);
        lights.setColor(0x00e5ff);

        for (const f of lights.fixtures) {
            expect(f.light.color.getHex()).toBe(0x00e5ff);
            expect(f.bulb.material.color.getHex()).toBe(0x00e5ff);
        }
    });

    it('does nothing on update until ignited', () => {
        const scene = makeScene();
        const lights = new BaseLights(scene);
        lights.build(0, 0);
        lights.update(1.0);
        expect(lights.fixtures.every((f) => f.light.intensity === 0)).toBe(true);
    });

    it('staggers fixtures on during the ignition sweep and keeps bulbs invisible', () => {
        const scene = makeScene();
        const lights = new BaseLights(scene);
        lights.ignite(0, 0, 4.5, 0x00ff00);
        expect(lights.isIgnited).toBe(true);

        // Just after ignition only the first fixture has started warming.
        lights.update(0.05);
        const onCount = lights.fixtures.filter((f) => f.on).length;
        expect(onCount).toBeGreaterThanOrEqual(1);
        expect(onCount).toBeLessThan(8);
        for (const f of lights.fixtures) {
            expect(f.bulb.visible).toBe(false);
            expect(f.bulb.material.opacity).toBe(0);
        }
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
            expect(f.bulb.material.opacity).toBe(0);
        }
    });

    it('igniteInstant powers all fixtures on with no sweep', () => {
        const scene = makeScene();
        const lights = new BaseLights(scene);
        lights.igniteInstant(0, 0, 7.5, 0x112233);
        expect(lights.isIgnited).toBe(true);
        for (const f of lights.fixtures) {
            expect(f.light.intensity).toBeGreaterThan(0.5);
            expect(f.light.visible).toBe(true);
            expect(f.light.color.getHex()).toBe(0x112233);
            expect(f.bulb.visible).toBe(false);
            expect(f.bulb.material.opacity).toBe(0);
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
