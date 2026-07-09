import * as THREE from 'three';

// ── Organic Cave Entrance (in-world structure) ────────────────
// Act 1 finale (Sprint 18 §5.2): once the ship-rebuild ladder completes, one
// cave mouth appears far beyond the BIO sector — framed to the player as the
// signal source of the final ship component. It deliberately reads unlike
// bunker architecture: dark, organic, wet. Interacting with it hands control
// to the CaveRevealController (src/caveReveal.js).
//
// Placement follows the Foundry pattern: threeGame samples a walkable far tile
// and passes the chosen world coordinates in here.

const INTERACT_RADIUS = 2.4;

export class CaveEntrance {
    constructor(scene) {
        this.scene = scene;
        this.group = null;
        this.light = null;
        this.mouthMat = null;
        this.podMats = [];
        this.built = false;
        this.revealed = false;
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

        // Rough rock/chitin lumps forming an arch around the mouth.
        const lumpMat = new THREE.MeshStandardMaterial({ color: 0x171310, metalness: 0.1, roughness: 0.95 });
        const lumps = [
            { g: [0.9, 1], p: [-0.85, 0.55, 0], s: [1.0, 1.5, 1.0] },
            { g: [0.9, 1], p: [0.85, 0.55, 0], s: [1.0, 1.5, 1.0] },
            { g: [0.8, 1], p: [0, 1.55, 0], s: [1.7, 0.9, 1.1] },
            { g: [0.5, 0], p: [-1.3, 0.2, 0.5], s: [1, 0.7, 1] },
            { g: [0.5, 0], p: [1.35, 0.22, 0.45], s: [1, 0.6, 1] }
        ];
        for (const lump of lumps) {
            const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(lump.g[0], lump.g[1]), lumpMat);
            mesh.position.set(lump.p[0], lump.p[1], lump.p[2]);
            mesh.scale.set(lump.s[0], lump.s[1], lump.s[2]);
            mesh.rotation.set(lump.p[0] * 0.4, lump.p[1] * 0.8, lump.p[2]);
            group.add(mesh);
        }

        // The mouth itself: a void-black plane angled toward the isometric camera.
        this.mouthMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.0 });
        const mouth = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 1.6), this.mouthMat);
        mouth.position.set(0, 0.82, 0.02);
        mouth.rotation.y = Math.PI / 4;
        group.add(mouth);

        // Sickly bio glow seeping from inside.
        this.light = new THREE.PointLight(0x8dff66, 0, 6.5, 2);
        this.light.position.set(0, 0.9, 0.4);
        group.add(this.light);

        // Resin pods scattered at the threshold.
        const podPositions = [[-0.55, 0.1, 0.85], [0.7, 0.09, 0.7], [0.1, 0.08, 1.05]];
        for (const [px, py, pz] of podPositions) {
            const podMat = new THREE.MeshStandardMaterial({
                color: 0x3a5a24,
                emissive: 0x1d3a10,
                emissiveIntensity: 0.0,
                roughness: 0.4
            });
            const pod = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), podMat);
            pod.position.set(px, py, pz);
            pod.scale.y = 0.75;
            group.add(pod);
            this.podMats.push(podMat);
        }

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

    revealInstant(x, z) {
        this.reveal(x, z);
        this.elapsed = 5;
        if (this.mouthMat) this.mouthMat.opacity = 0.96;
        if (this.light) this.light.intensity = 0.9;
    }

    reset() {
        this.revealed = false;
        this.elapsed = 0;
        if (this.group) this.group.visible = false;
        if (this.mouthMat) this.mouthMat.opacity = 0;
        if (this.light) this.light.intensity = 0;
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
        const ramp = Math.min(1, this.elapsed / 1.6);
        // Slow uneasy breathing pulse, not a friendly machine blink.
        const pulse = 0.68 + Math.sin(this.elapsed * 1.1) * 0.22 + Math.sin(this.elapsed * 4.7) * 0.08;
        if (this.light) this.light.intensity = 0.9 * ramp * pulse;
        if (this.mouthMat) this.mouthMat.opacity = 0.96 * ramp;
        for (const podMat of this.podMats) {
            podMat.emissiveIntensity = 0.55 * ramp * (0.7 + Math.sin(this.elapsed * 2.3) * 0.3);
        }
    }
}

export { INTERACT_RADIUS as CAVE_INTERACT_RADIUS };
