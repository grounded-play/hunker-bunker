import * as THREE from 'three';

/**
 * Trauma-based screen shake and weapon recoil manager.
 * Uses squared trauma (trauma^2) for visceral high-contrast impacts,
 * plus rotational camera roll and pitch kicks.
 */
export class TraumaManager {
    constructor() {
        this.trauma = 0;
        this.decayRate = 2.2; // trauma units per second
        this.maxRoll = 0.045; // radians (~2.5 degrees)
        this.maxPitch = 0.035; // radians (~2.0 degrees)
        this.maxTranslation = 0.32; // world units
    }

    addTrauma(amount) {
        this.trauma = Math.min(1.0, Math.max(0, this.trauma + amount));
    }

    getTrauma() {
        return this.trauma;
    }

    update(delta, random = Math.random) {
        if (this.trauma <= 0) {
            this.trauma = 0;
            return { offsetX: 0, offsetY: 0, offsetZ: 0, roll: 0, pitch: 0 };
        }

        const shake = this.trauma * this.trauma; // quadratic response
        const offsetX = (random() - 0.5) * 2 * this.maxTranslation * shake;
        const offsetY = (random() - 0.5) * 2 * this.maxTranslation * 0.45 * shake;
        const offsetZ = (random() - 0.5) * 2 * this.maxTranslation * shake;
        const roll = (random() - 0.5) * 2 * this.maxRoll * shake;
        const pitch = (random() - 0.5) * 2 * this.maxPitch * shake;

        this.trauma = Math.max(0, this.trauma - delta * this.decayRate);

        return { offsetX, offsetY, offsetZ, roll, pitch };
    }
}

export const WEAPON_TRAUMA_TABLE = Object.freeze({
    pistol: 0.08,
    shotgun: 0.32,
    rifle: 0.12,
    railgun: 0.48,
    sniper: 0.45,
    explosion: 0.72,
    boss_stomp: 0.65,
    heavy_hit: 0.38,
    default: 0.14
});

/**
 * Creates a camera-facing 3D volumetric muzzle flash burst at weapon barrel height.
 * Replaces old flat ground-plane circle decal.
 */
export function create3DMuzzleFlash({
    color = 0xffd27a,
    isCryo = false,
    camera = null,
    _forwardVec = null,
    _barrelHeight = 0.55
} = {}) {
    const group = new THREE.Group();
    group.name = 'MuzzleFlash3D';

    const flashColor = isCryo ? 0x9beaff : color;
    const coreRadius = isCryo ? 0.18 : 0.13;
    const glowRadius = isCryo ? 0.48 : 0.36;

    // Cross-quad billboard geometry for omnidirectional 3D volume
    const quadGeo = new THREE.PlaneGeometry(coreRadius * 2, coreRadius * 2);
    const coreMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
    });

    const quad1 = new THREE.Mesh(quadGeo, coreMat);
    const quad2 = new THREE.Mesh(quadGeo, coreMat);
    quad2.rotation.y = Math.PI / 2;
    group.add(quad1, quad2);

    // Additive aura shell
    const auraGeo = new THREE.PlaneGeometry(glowRadius * 2, glowRadius * 2);
    const auraMat = new THREE.MeshBasicMaterial({
        color: flashColor,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    const aura1 = new THREE.Mesh(auraGeo, auraMat);
    const aura2 = new THREE.Mesh(auraGeo, auraMat);
    aura2.rotation.y = Math.PI / 2;
    group.add(aura1, aura2);

    // Ejecting micro-particles (spent brass / heat vapor)
    const particleCount = 4;
    const particles = [];
    const shardGeo = new THREE.PlaneGeometry(0.04, 0.08);
    const shardMat = new THREE.MeshBasicMaterial({
        color: isCryo ? 0x88e2ff : 0xff9933,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    for (let i = 0; i < particleCount; i++) {
        const shard = new THREE.Mesh(shardGeo, shardMat);
        const ejectAngle = (Math.PI / 2) + (Math.random() - 0.5) * 0.8;
        const ejectSpeed = 0.8 + Math.random() * 0.9;
        shard.userData = {
            vx: Math.cos(ejectAngle) * ejectSpeed,
            vy: 0.6 + Math.random() * 0.5,
            vz: Math.sin(ejectAngle) * ejectSpeed,
            life: 0.18 + Math.random() * 0.12,
            age: 0
        };
        group.add(shard);
        particles.push(shard);
    }

    group.userData = {
        age: 0,
        duration: 0.14,
        is3DMuzzleFlash: true,
        update: (dt) => {
            group.userData.age += dt;
            const progress = Math.min(1.0, group.userData.age / group.userData.duration);
            const fade = 1.0 - progress;

            coreMat.opacity = 0.95 * fade;
            auraMat.opacity = 0.7 * fade;

            // Orient cross-quads to face camera if available
            if (camera) {
                group.quaternion.copy(camera.quaternion);
            }

            for (const p of particles) {
                p.userData.age += dt;
                p.position.x += p.userData.vx * dt;
                p.position.y += p.userData.vy * dt;
                p.position.z += p.userData.vz * dt;
                p.userData.vy -= 4.2 * dt; // gravity
                p.scale.setScalar(Math.max(0.1, 1.0 - (p.userData.age / p.userData.life)));
            }

            return progress >= 1.0;
        },
        dispose: () => {
            quadGeo.dispose();
            auraGeo.dispose();
            shardGeo.dispose();
            coreMat.dispose();
            auraMat.dispose();
            shardMat.dispose();
        }
    };

    return group;
}

/**
 * Computes directional squash-and-stretch scale impulse for hit reaction.
 */
export function computeHitSquashStretch(_incomingHeading = 0, currentScale = { x: 1, y: 1, z: 1 }) {
    // Compress along bullet travel vector, expand perpendicular
    const compression = 0.82;
    const expansion = 1.22;
    return {
        targetScaleX: currentScale.x * expansion,
        targetScaleY: currentScale.y * expansion,
        targetScaleZ: currentScale.z * compression,
        duration: 0.12
    };
}
