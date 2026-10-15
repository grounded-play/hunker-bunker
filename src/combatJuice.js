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
    mk1_sidearm: 0.08,
    shotgun: 0.32,
    scatter_rep: 0.32,
    siege_breaker: 0.36,
    rifle: 0.12,
    pulse_carbine: 0.14,
    neon_smg: 0.09,
    railgun: 0.48,
    rail_marksman: 0.48,
    cryo_lance: 0.20,
    tesla_lock: 0.22,
    sniper: 0.45,
    rocket: 0.55,
    explosion: 0.72,
    boss_stomp: 0.65,
    bossSlam: 0.65,
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
    weaponType = null,
    tracerFxId = null,
    camera = null,
    _forwardVec = null,
    _barrelHeight = 0.55
} = {}) {
    const group = new THREE.Group();
    group.name = 'MuzzleFlash3D';

    // Base parameters configured by weapon type archetype
    let flashColor = isCryo ? 0x9beaff : color;
    let coreRadius = isCryo ? 0.18 : 0.13;
    let glowRadius = isCryo ? 0.48 : 0.36;
    let particleCount = 4;
    let particleColor = isCryo ? 0x88e2ff : 0xff9933;
    let flashDuration = 0.14;

    if (weaponType === 'scatter_rep' || weaponType === 'siege_breaker') {
        // Concussive shotgun blast: wide orange conical flare + 8 hot ember sparks
        flashColor = 0xff6611;
        coreRadius = 0.22;
        glowRadius = 0.58;
        particleCount = 8;
        particleColor = 0xff4400;
        flashDuration = 0.18;
    } else if (weaponType === 'rail_marksman') {
        // High-voltage railgun: blinding cyan-white arc needle + 6 ion sparks
        flashColor = 0x38e1ff;
        coreRadius = 0.16;
        glowRadius = 0.52;
        particleCount = 6;
        particleColor = 0x88ffff;
        flashDuration = 0.16;
    } else if (weaponType === 'cryo_lance') {
        // Cryogenic lance: freezing pale blue frost star + ice vapor shards
        flashColor = 0xa5f3fc;
        coreRadius = 0.18;
        glowRadius = 0.48;
        particleCount = 6;
        particleColor = 0xa5f3fc;
        flashDuration = 0.15;
    } else if (weaponType === 'tesla_lock') {
        // Tesla lock: violent violet-electric plasma blossom + spark arcs
        flashColor = 0xc084fc;
        coreRadius = 0.16;
        glowRadius = 0.46;
        particleCount = 7;
        particleColor = 0xe879f9;
        flashDuration = 0.15;
    } else if (weaponType === 'neon_smg') {
        // Compact SMG: snappy amber micro-flare with fast dissipation
        flashColor = 0xffe066;
        coreRadius = 0.10;
        glowRadius = 0.28;
        particleCount = 3;
        particleColor = 0xffaa00;
        flashDuration = 0.09;
    }

    // Tracer cosmetic mutators override/enhance flash chromatic colors
    if (tracerFxId === '4152' || tracerFxId === 'fx_emerald_void_tracer') {
        flashColor = 0x10b981;
        particleColor = 0x34d399;
    } else if (tracerFxId === '4205' || tracerFxId === 'fx_tracer_deep_frost') {
        flashColor = 0x38bdf8;
        particleColor = 0xa5f3fc;
    } else if (tracerFxId === '4212' || tracerFxId === 'fx_tracer_rust_bone') {
        flashColor = 0xc2410c;
        particleColor = 0xf97316;
    } else if (tracerFxId === '4219' || tracerFxId === 'fx_tracer_hive_chitin') {
        flashColor = 0x84cc16;
        particleColor = 0xd9f99d;
    } else if (tracerFxId === '4233' || tracerFxId === 'fx_tracer_bunker404') {
        flashColor = 0xa21caf;
        particleColor = 0xd946ef;
    } else if (tracerFxId === '4240' || tracerFxId === 'fx_tracer_grand_marshal') {
        flashColor = 0xb45309;
        particleColor = 0xf59e0b;
    }

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
    const particles = [];
    const shardGeo = new THREE.PlaneGeometry(0.04, 0.08);
    const shardMat = new THREE.MeshBasicMaterial({
        color: particleColor,
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
        duration: flashDuration,
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
