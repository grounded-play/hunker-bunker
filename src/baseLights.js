import * as THREE from 'three';

// ── Base Lights ───────────────────────────────────────────────
// When the O2 station comes online it powers the base grid: a ring of dormant
// floodlights wakes up one fixture at a time in a sweep, with a brief ignition
// flicker, then settles into a slow idle flicker. Driven from threeGame's
// update loop. Additive and self-contained — it only owns its own lights.
//
// Trigger: goal-unlocked(o2Bubble) / generator online. See arc doc
// .claude_work/02-gameplay-arc-o2-lights-boss-printer.md (Beat 2).

const FIXTURE_COUNT = 8;
const RING_RADIUS = 3.9;          // world units around the base center
const FIXTURE_HEIGHT = 0.95;
const FIXTURE_COLOR = 0x9ad8ff;   // cool industrial cyan-white
const FIXTURE_MAX_INTENSITY = 2.25;
const FIXTURE_DISTANCE = 7.4;
const FIXTURE_DECAY = 2;
const STAGGER_DELAY = 0.32;       // seconds between each fixture igniting
const IGNITE_DURATION = 0.55;     // ramp + flicker time per fixture

export class BaseLights {
    constructor(scene) {
        this.scene = scene;
        this.fixtures = [];
        this.built = false;
        this.ignited = false;
        this.elapsed = 0;
        this.centerX = 0;
        this.centerZ = 0;
    }

    // Build the dormant fixtures around a center point (the active ship/base).
    build(centerX, centerZ, radius = RING_RADIUS, colorHex = FIXTURE_COLOR) {
        if (this.built) return;
        this.centerX = centerX;
        this.centerZ = centerZ;
        this.radius = radius;
        this.colorHex = colorHex;
        for (let i = 0; i < FIXTURE_COUNT; i++) {
            const angle = (i / FIXTURE_COUNT) * Math.PI * 2;
            const x = centerX + Math.cos(angle) * radius;
            const z = centerZ + Math.sin(angle) * radius;

            const light = new THREE.PointLight(colorHex, 0, FIXTURE_DISTANCE, FIXTURE_DECAY);
            light.position.set(x, FIXTURE_HEIGHT, z);
            // Visible from build (intensity 0 = no contribution yet). Keeping the
            // scene's light COUNT stable means the one-time lit-material shader
            // recompile is paid once when the grid is built — not incrementally as
            // each fixture wakes — avoiding a stuttering hitch across the sweep.
            light.visible = true;

            // Small emissive lamp housing so the source reads as a fixture.
            const bulb = new THREE.Mesh(
                new THREE.SphereGeometry(0.11, 10, 8),
                new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0 })
            );
            bulb.position.set(x, FIXTURE_HEIGHT, z);
            bulb.visible = false; // Never render bulb meshes as per "they shouldn't be visible"

            this.scene.add(light);
            this.scene.add(bulb);

            this.fixtures.push({
                light,
                bulb,
                igniteAt: i * STAGGER_DELAY,
                seed: i * 0.61803398875,
                on: false
            });
        }
        this.built = true;
    }

    recenter(centerX, centerZ, radius = this.radius) {
        if (!this.built) {
            this.build(centerX, centerZ, radius, this.colorHex);
            return;
        }
        this.centerX = centerX;
        this.centerZ = centerZ;
        this.radius = radius;
        for (let i = 0; i < this.fixtures.length; i++) {
            const angle = (i / FIXTURE_COUNT) * Math.PI * 2;
            const x = centerX + Math.cos(angle) * radius;
            const z = centerZ + Math.sin(angle) * radius;
            this.fixtures[i].light.position.set(x, FIXTURE_HEIGHT, z);
            this.fixtures[i].bulb.position.set(x, FIXTURE_HEIGHT, z);
        }
    }

    setColor(colorHex) {
        this.colorHex = colorHex;
        if (!this.built) return;
        for (const f of this.fixtures) {
            f.light.color.setHex(colorHex);
            f.bulb.material.color.setHex(colorHex);
        }
    }

    // Start the staggered wake-up sweep.
    ignite(centerX, centerZ, radius = RING_RADIUS, colorHex = FIXTURE_COLOR) {
        this.colorHex = colorHex;
        if (!this.built) this.build(centerX, centerZ, radius, colorHex);
        else {
            this.setColor(colorHex);
            this.recenter(centerX, centerZ, radius);
        }
        if (this.ignited) return;
        this.ignited = true;
        this.elapsed = 0;
    }

    // Power the whole grid on instantly (returning player whose O2 is already
    // online — no theatrics, lights are just on).
    igniteInstant(centerX, centerZ, radius = RING_RADIUS, colorHex = FIXTURE_COLOR) {
        this.colorHex = colorHex;
        if (!this.built) this.build(centerX, centerZ, radius, colorHex);
        else {
            this.setColor(colorHex);
            this.recenter(centerX, centerZ, radius);
        }
        this.ignited = true;
        this.elapsed = (FIXTURE_COUNT * STAGGER_DELAY) + IGNITE_DURATION + 1;
        for (const f of this.fixtures) {
            f.on = true;
            f.light.visible = true;
            f.light.intensity = FIXTURE_MAX_INTENSITY;
            f.bulb.material.opacity = 0;
        }
    }

    get isIgnited() {
        return this.ignited;
    }

    update(delta) {
        if (!this.ignited || !this.built) return;
        this.elapsed += delta;

        for (const f of this.fixtures) {
            const t = this.elapsed - f.igniteAt;
            if (t < 0) continue;

            if (!f.on) {
                f.on = true;
                f.light.visible = true;
            }

            if (t < IGNITE_DURATION) {
                // Ignition: ramp up with a stuttering flicker like a tube warming.
                const ramp = t / IGNITE_DURATION;
                const flicker = 0.55 + 0.45 * Math.abs(Math.sin((t + f.seed) * 38));
                const intensity = FIXTURE_MAX_INTENSITY * ramp * flicker;
                f.light.intensity = intensity;
                f.bulb.material.opacity = 0;
            } else {
                // Keep gameplay illumination stable after the one-shot
                // ignition. Continuous intensity modulation read as global
                // exposure flicker when several fixtures overlapped.
                f.light.intensity = FIXTURE_MAX_INTENSITY;
                f.bulb.material.opacity = 0;
            }
        }
    }

    dispose() {
        for (const f of this.fixtures) {
            this.scene.remove(f.light);
            this.scene.remove(f.bulb);
            f.bulb.geometry.dispose();
            f.bulb.material.dispose();
        }
        this.fixtures = [];
        this.built = false;
        this.ignited = false;
    }
}
