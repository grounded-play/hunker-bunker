import * as THREE from 'three';

// ── Fabrication Foundry (in-world structure) ──────────────────
// Beat 4 of the arc (.claude_work/02-gameplay-arc-o2-lights-boss-printer.md):
// once the base is powered, a fabrication structure powers up across the base
// clearing. The player walks to it (the radar compass points the way) and
// interacts to open the Fabrication Bay (src/fabricator.js).
//
// Placement note: HB's world is a procedural maze, so threeGame samples a
// walkable far-site and passes the chosen world coordinates in here.

const INTERACT_RADIUS = 2.4;

export function foundryWorldPosition(baseX, baseZ) {
    return { x: baseX, z: baseZ };
}

export class FabricationFoundry {
    constructor(scene) {
        this.scene = scene;
        this.group = null;
        this.light = null;
        this.panelMat = null;
        this.marqueeMat = null;
        this.socketMat = null;
        this.built = false;
        this.revealed = false;
        this.elapsed = 0;
        this.pos = { x: 0, z: 0 };
    }

    build(baseX, baseZ) {
        if (this.built) {
            this.pos = foundryWorldPosition(baseX, baseZ);
            if (this.group) this.group.position.set(this.pos.x, 0, this.pos.z);
            return;
        }
        this.pos = foundryWorldPosition(baseX, baseZ);

        const group = new THREE.Group();
        group.position.set(this.pos.x, 0, this.pos.z);

        // Dedicated installation socket: a low, readable footprint that says
        // this machine belongs to the base rather than being loose room clutter.
        this.socketMat = new THREE.MeshStandardMaterial({
            color: 0x18242b,
            emissive: 0x006d78,
            emissiveIntensity: 0,
            metalness: 0.88,
            roughness: 0.38
        });
        const socket = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.08, 0.08, 8), this.socketMat);
        socket.position.y = 0.04;
        socket.rotation.y = Math.PI / 8;
        group.add(socket);

        // Dark base slab, mechanically seated inside the socket.
        const slab = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 0.18, 1.5),
            new THREE.MeshStandardMaterial({ color: 0x1a2026, metalness: 0.6, roughness: 0.6 })
        );
        slab.position.y = 0.09;
        group.add(slab);

        // Printer frame / gantry body.
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(1.0, 1.1, 0.7),
            new THREE.MeshStandardMaterial({ color: 0x2a333b, metalness: 0.7, roughness: 0.45 })
        );
        body.position.y = 0.74;
        group.add(body);

        // Minimart / ATM top marquee box.
        this.marqueeMat = new THREE.MeshStandardMaterial({
            color: 0x081a24,
            emissive: 0x005566,
            emissiveIntensity: 0.5,
            metalness: 0.8,
            roughness: 0.25
        });
        const marquee = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.24, 0.74), this.marqueeMat);
        marquee.position.y = 1.34;
        group.add(marquee);

        // Glowing print-bed / screen panel.
        this.panelMat = new THREE.MeshBasicMaterial({ color: 0x8ef0ff, transparent: true, opacity: 0.0 });
        const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.5), this.panelMat);
        panel.position.set(0, 0.85, 0.36);
        group.add(panel);

        // ATM / coin-slot keypad detail plate.
        const keypad = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, 0.34, 0.04),
            new THREE.MeshStandardMaterial({ color: 0x111822, metalness: 0.85, roughness: 0.3 })
        );
        keypad.position.set(0.34, 0.82, 0.36);
        group.add(keypad);

        // Cyan work light.
        this.light = new THREE.PointLight(0x8ef0ff, 0, 4.5, 2);
        this.light.position.set(0, 1.3, 0);
        group.add(this.light);

        group.visible = false;
        this.scene.add(group);
        this.group = group;
        this.built = true;
    }

    reveal(baseX, baseZ) {
        if (!this.built) this.build(baseX, baseZ);
        this.revealed = true;
        if (this.group) this.group.visible = true;
    }

    revealInstant(baseX, baseZ) {
        this.reveal(baseX, baseZ);
        this.elapsed = 5;
        if (this.panelMat) this.panelMat.opacity = 0.85;
        if (this.light) this.light.intensity = 1.1;
    }

    reset() {
        this.revealed = false;
        this.elapsed = 0;
        if (this.group) this.group.visible = false;
        if (this.panelMat) this.panelMat.opacity = 0;
        if (this.light) this.light.intensity = 0;
    }

    get isRevealed() { return this.revealed; }

    getPosition() { return this.built ? { ...this.pos } : null; }

    // Distance from a world point to the Foundry (Infinity until built/revealed).
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
        // Power-up ramp then a slow working pulse.
        const ramp = Math.min(1, this.elapsed / 1.2);
        const pulse = 0.8 + Math.sin(this.elapsed * 2.6) * 0.2;
        if (this.light) this.light.intensity = 1.1 * ramp * pulse;
        if (this.panelMat) this.panelMat.opacity = 0.85 * ramp;
        if (this.marqueeMat) this.marqueeMat.emissiveIntensity = 0.5 * ramp * (0.85 + Math.sin(this.elapsed * 1.8) * 0.15);
        if (this.socketMat) this.socketMat.emissiveIntensity = 0.34 * ramp * (0.8 + Math.sin(this.elapsed * 1.35) * 0.2);
    }
}

export { INTERACT_RADIUS };
