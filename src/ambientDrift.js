import * as THREE from 'three';

/**
 * Biome Atmosphere Particulate Drift.
 * Creates an instanced floating particulate volume centered on the player/camera.
 * CRITICAL: Zero dynamic PointLights (preserves shader cache stability).
 */

export const BIOME_PARTICLE_CONFIGS = Object.freeze({
    cryo: {
        color: 0xc4f1ff,
        count: 50,
        size: 0.04,
        velocity: { x: 0.4, y: -0.25, z: 0.1 },
        turbulence: 0.2,
        opacity: 0.75
    },
    bio: {
        color: 0x86efac,
        count: 45,
        size: 0.05,
        velocity: { x: 0.2, y: 0.18, z: 0.2 },
        turbulence: 0.4,
        opacity: 0.8
    },
    bunker: {
        color: 0xfbbf24,
        count: 40,
        size: 0.035,
        velocity: { x: 0.1, y: -1.2, z: 0.1 },
        turbulence: 0.15,
        opacity: 0.85
    },
    default: {
        color: 0xe2e8f0,
        count: 55,
        size: 0.04,
        velocity: { x: -1.4, y: -0.35, z: 0.6 },
        turbulence: 0.25,
        opacity: 0.65
    }
});

export class BiomeAtmosphereSystem {
    constructor(scene, { boxRadius = 14, height = 7 } = {}) {
        this.scene = scene;
        this.boxRadius = boxRadius;
        this.height = height;
        this.currentBiome = 'default';
        this.particles = [];
        this.pointsMesh = null;
        this.geometry = null;
        this.material = null;

        this.init();
    }

    init() {
        const count = 60;
        const positions = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            positions[i * 3 + 0] = (Math.random() - 0.5) * (this.boxRadius * 2);
            positions[i * 3 + 1] = Math.random() * this.height;
            positions[i * 3 + 2] = (Math.random() - 0.5) * (this.boxRadius * 2);

            this.particles.push({
                baseVx: 0,
                baseVy: 0,
                baseVz: 0,
                phase: Math.random() * Math.PI * 2
            });
        }

        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        this.material = new THREE.PointsMaterial({
            color: 0xe2e8f0,
            size: 0.05,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.pointsMesh = new THREE.Points(this.geometry, this.material);
        this.pointsMesh.name = 'BiomeAtmospherePoints';
        this.pointsMesh.frustumCulled = false;

        if (this.scene) {
            this.scene.add(this.pointsMesh);
        }

        this.setBiome('default');
    }

    setBiome(biomeKey) {
        this.currentBiome = biomeKey;
        const config = BIOME_PARTICLE_CONFIGS[biomeKey] || BIOME_PARTICLE_CONFIGS.default;

        if (this.material) {
            this.material.color.setHex(config.color);
            this.material.size = config.size;
            this.material.opacity = config.opacity;
        }

        for (const p of this.particles) {
            p.baseVx = config.velocity.x;
            p.baseVy = config.velocity.y;
            p.baseVz = config.velocity.z;
            p.turbulence = config.turbulence;
        }
    }

    update(delta, playerPos = { x: 0, y: 0, z: 0 }) {
        if (!this.geometry || !this.pointsMesh) return;

        const positions = this.geometry.attributes.position.array;
        const count = this.particles.length;

        for (let i = 0; i < count; i++) {
            const p = this.particles[i];
            p.phase += delta * 2.0;

            let x = positions[i * 3 + 0];
            let y = positions[i * 3 + 1];
            let z = positions[i * 3 + 2];

            // Motion with harmonic turbulence
            const turb = p.turbulence || 0.2;
            x += (p.baseVx + Math.sin(p.phase) * turb) * delta;
            y += (p.baseVy + Math.cos(p.phase * 0.8) * turb * 0.5) * delta;
            z += (p.baseVz + Math.sin(p.phase * 1.2) * turb) * delta;

            // Wrap within bounding box centered on player
            const minX = playerPos.x - this.boxRadius;
            const maxX = playerPos.x + this.boxRadius;
            const minZ = playerPos.z - this.boxRadius;
            const maxZ = playerPos.z + this.boxRadius;
            const minY = Math.max(0.1, playerPos.y - 0.5);
            const maxY = playerPos.y + this.height;

            if (x < minX) x = maxX;
            else if (x > maxX) x = minX;

            if (z < minZ) z = maxZ;
            else if (z > maxZ) z = minZ;

            if (y < minY) y = maxY;
            else if (y > maxY) y = minY;

            positions[i * 3 + 0] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
        }

        this.geometry.attributes.position.needsUpdate = true;
    }

    dispose() {
        if (this.pointsMesh) {
            this.pointsMesh.removeFromParent();
        }
        this.geometry?.dispose();
        this.material?.dispose();
    }
}

/**
 * Footstep micro-puff particle for locomotion juice.
 */
export function createFootstepPuff({ x = 0, y = 0.02, z = 0, _heading = 0 } = {}) {
    const group = new THREE.Group();
    const geo = new THREE.PlaneGeometry(0.12, 0.12);
    const mat = new THREE.MeshBasicMaterial({
        color: 0xdae6f0,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    const puff = new THREE.Mesh(geo, mat);
    puff.rotation.x = -Math.PI / 2;
    group.add(puff);
    group.position.set(x, y, z);

    group.userData = {
        age: 0,
        duration: 0.28,
        update: (dt) => {
            group.userData.age += dt;
            const t = group.userData.age / group.userData.duration;
            puff.scale.setScalar(1.0 + t * 1.6);
            mat.opacity = 0.6 * (1.0 - t);
            return t >= 1.0;
        },
        dispose: () => {
            geo.dispose();
            mat.dispose();
        }
    };

    return group;
}
