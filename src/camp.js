import * as THREE from 'three';

// ── Survivor Camp (in-world structure, Act 2) ─────────────────
// Three of these appear once the signal dish sweeps the sector. Each camp is a
// small cluster of tents + crates with a survivor beacon, plus a vessel-section
// gantry that rises while the player "helps". Culling a camp topples the tents,
// kills the beacon, and leaves embers — but the vessel section survives (the
// queen needs the ship, not the builders).
//
// Placement follows the Foundry/CaveEntrance pattern: threeGame samples a
// walkable tile and passes world coordinates in.

const INTERACT_RADIUS = 2.8;

export class SurvivorCamp {
    constructor(scene, { id = 'camp', label = 'CAMP' } = {}) {
        this.scene = scene;
        this.id = id;
        this.label = label;
        this.group = null;
        this.beacon = null;
        this.beaconMat = null;
        this.tents = [];
        this.sectionMat = null;
        this.section = null;
        this.built = false;
        this.revealed = false;
        this.aided = false;
        this.destroyed = false;
        this.elapsed = 0;
        this.pos = { x: 0, z: 0 };
    }

    build(x, z) {
        if (this.built) {
            this.pos = { x, z };
            if (this.group) this.group.position.set(x, 0, z);
            return;
        }
        this.pos = { x, z };

        const group = new THREE.Group();
        group.position.set(x, 0, z);

        // Tents: weathered cones around a small clearing.
        const tentSpecs = [
            { p: [-0.9, 0, -0.3], c: 0x5a6350 },
            { p: [0.85, 0, -0.5], c: 0x635a48 },
            { p: [0.1, 0, 0.9], c: 0x4e5a5e }
        ];
        for (const spec of tentSpecs) {
            const tent = new THREE.Mesh(
                new THREE.ConeGeometry(0.5, 0.85, 7),
                new THREE.MeshStandardMaterial({ color: spec.c, roughness: 0.9, metalness: 0.05 })
            );
            tent.position.set(spec.p[0], 0.42, spec.p[2]);
            group.add(tent);
            this.tents.push(tent);
        }

        // Supply crates.
        const crate = new THREE.Mesh(
            new THREE.BoxGeometry(0.42, 0.42, 0.42),
            new THREE.MeshStandardMaterial({ color: 0x6b5a33, roughness: 0.8, metalness: 0.2 })
        );
        crate.position.set(-0.2, 0.21, -0.95);
        crate.rotation.y = 0.5;
        group.add(crate);

        // Survivor beacon mast + light: white while alive, dead when culled.
        const mast = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.07, 1.5, 6),
            new THREE.MeshStandardMaterial({ color: 0x39424a, metalness: 0.7, roughness: 0.4 })
        );
        mast.position.set(0, 0.75, 0);
        group.add(mast);
        this.beaconMat = new THREE.MeshBasicMaterial({ color: 0xffe9b0 });
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), this.beaconMat);
        bulb.position.set(0, 1.55, 0);
        group.add(bulb);
        this.beacon = new THREE.PointLight(0xffe9b0, 0.9, 7, 2);
        this.beacon.position.set(0, 1.6, 0);
        group.add(this.beacon);

        // Vessel section gantry: hidden until the camp is aided.
        this.sectionMat = new THREE.MeshStandardMaterial({
            color: 0x9fb4c4,
            metalness: 0.85,
            roughness: 0.3,
            emissive: 0x14303c,
            emissiveIntensity: 0.4
        });
        const section = new THREE.Group();
        const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.68, 1.7, 10), this.sectionMat);
        hull.position.y = 0.85;
        section.add(hull);
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.5), this.sectionMat);
        fin.position.set(0.62, 0.5, 0);
        section.add(fin);
        section.position.set(1.5, 0, 0.9);
        section.visible = false;
        group.add(section);
        this.section = section;

        group.visible = false;
        this.scene.add(group);
        this.group = group;
        this.built = true;
    }

    reveal(x, z) {
        if (!this.built) this.build(x, z);
        this.revealed = true;
        if (this.group) this.group.visible = true;
    }

    setAided(aided = true) {
        this.aided = Boolean(aided);
        if (this.section) this.section.visible = this.aided;
        if (this.aided && !this.destroyed) {
            if (this.beaconMat) this.beaconMat.color.set(0x9dffb0);
            this.beacon?.color.set(0x9dffb0);
        }
    }

    setDestroyed(destroyed = true) {
        this.destroyed = Boolean(destroyed);
        if (!this.destroyed) return;
        // Topple + char the tents, kill the beacon, leave a low ember glow.
        this.tents.forEach((tent, i) => {
            tent.rotation.z = (i % 2 === 0 ? 1 : -1) * (Math.PI / 2.6);
            tent.position.y = 0.2;
            tent.material.color.set(0x211d18);
        });
        if (this.beaconMat) this.beaconMat.color.set(0x2a2523);
        if (this.beacon) {
            this.beacon.color.set(0xff5a2a);
            this.beacon.intensity = 0.35;
            this.beacon.position.y = 0.4;
        }
        // The vessel section survives the cull — it is the whole point.
        if (this.section) this.section.visible = this.aided;
    }

    reset() {
        this.revealed = false;
        this.elapsed = 0;
        if (this.group) this.group.visible = false;
    }

    get isRevealed() { return this.revealed; }

    getPosition() { return this.built ? { ...this.pos } : null; }

    distanceTo(x, z) {
        if (!this.built || !this.revealed) return Infinity;
        return Math.hypot(this.pos.x - x, this.pos.z - z);
    }

    isWithinInteractRange(x, z) {
        return this.distanceTo(x, z) <= INTERACT_RADIUS;
    }

    update(delta) {
        if (!this.revealed || !this.built) return;
        this.elapsed += delta;
        if (this.destroyed) {
            // Ember flicker.
            if (this.beacon) this.beacon.intensity = 0.28 + Math.abs(Math.sin(this.elapsed * 6.1)) * 0.14;
            return;
        }
        if (this.beacon) this.beacon.intensity = 0.85 + Math.sin(this.elapsed * 2.1) * 0.15;
    }
}

export { INTERACT_RADIUS as CAMP_INTERACT_RADIUS };
