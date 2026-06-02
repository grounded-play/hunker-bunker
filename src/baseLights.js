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
const RING_RADIUS = 3.6;          // world units around the base center
const FIXTURE_HEIGHT = 0.95;
const FIXTURE_COLOR = 0x9ad8ff;   // cool industrial cyan-white
const FIXTURE_MAX_INTENSITY = 1.35;
const FIXTURE_DISTANCE = 5.2;
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
    build(centerX, centerZ) {
        if (this.built) return;
        this.centerX = centerX;
        this.centerZ = centerZ;
        for (let i = 0; i < FIXTURE_COUNT; i++) {
            const angle = (i / FIXTURE_COUNT) * Math.PI * 2;
            const x = centerX + Math.cos(angle) * RING_RADIUS;
            const z = centerZ + Math.sin(angle) * RING_RADIUS;

            const light = new THREE.PointLight(FIXTURE_COLOR, 0, FIXTURE_DISTANCE, FIXTURE_DECAY);
            light.position.set(x, FIXTURE_HEIGHT, z);
            light.visible = false;

            // Small emissive lamp housing so the source reads as a fixture.
            const bulb = new THREE.Mesh(
                new THREE.SphereGeometry(0.11, 10, 8),
                new THREE.MeshBasicMaterial({ color: FIXTURE_COLOR, transparent: true, opacity: 0 })
            );
            bulb.position.set(x, FIXTURE_HEIGHT, z);

            this.scene.add(light);
            this.scene.add(bulb);

            this.fixtures.push({
                light,
                bulb,
                igniteAt: i * STAGGER_DELAY,
                seed: Math.random() * 100,
                on: false
            });
        }
        this.built = true;
    }

    // Start the staggered wake-up sweep.
    ignite(centerX, centerZ) {
        if (!this.built) this.build(centerX, centerZ);
        if (this.ignited) return;
        this.ignited = true;
        this.elapsed = 0;
    }

    // Power the whole grid on instantly (returning player whose O2 is already
    // online — no theatrics, lights are just on).
    igniteInstant(centerX, centerZ) {
        if (!this.built) this.build(centerX, centerZ);
        this.ignited = true;
        this.elapsed = (FIXTURE_COUNT * STAGGER_DELAY) + IGNITE_DURATION + 1;
        for (const f of this.fixtures) {
            f.on = true;
            f.light.visible = true;
            f.light.intensity = FIXTURE_MAX_INTENSITY;
            f.bulb.material.opacity = 0.85;
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
                f.bulb.material.opacity = Math.min(0.85, ramp * flicker);
            } else {
                // Settled: gentle idle flicker so the base feels alive.
                const idle = 1 + Math.sin((this.elapsed + f.seed) * 2.1) * 0.06;
                f.light.intensity = FIXTURE_MAX_INTENSITY * idle;
                f.bulb.material.opacity = 0.85;
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
