import * as THREE from 'three';

/**
 * CameraTraumaManager
 * 
 * Non-linear camera shake system based on rotational and translational trauma:
 * Shake = Trauma^2 (or Trauma^3), yielding subtle micro-jitter at low trauma
 * and intense violent disorienting impact at high trauma.
 * Decays smoothly over time.
 */
export const WEAPON_TRAUMA_TABLE = Object.freeze({
    pistol: 0.08,
    shotgun: 0.28,
    rifle: 0.12,
    plasma: 0.16,
    cryo: 0.14,
    rocket: 0.45,
    grenade: 0.50,
    enemyKill: 0.18,
    bossSlam: 0.65,
    playerHit: 0.40,
    depthCrossing: 0.55
});

export class CameraTraumaManager {
    constructor(options = {}) {
        this.trauma = 0;
        this.decay = options.decay ?? 1.15; // units per second
        this.maxPitch = options.maxPitch ?? 0.045; // radians (~2.5 deg)
        this.maxYaw = options.maxYaw ?? 0.045;
        this.maxRoll = options.maxRoll ?? 0.065;
        this.maxOffsetX = options.maxOffsetX ?? 0.22;
        this.maxOffsetY = options.maxOffsetY ?? 0.18;
        this.maxOffsetZ = options.maxOffsetZ ?? 0.15;
        this.frequency = options.frequency ?? 24.0; // Hz
        this.time = 0;

        // Current shake offsets
        this.currentOffset = new THREE.Vector3(0, 0, 0);
        this.currentRotation = { pitch: 0, yaw: 0, roll: 0 };
    }

    addTrauma(amount) {
        if (!Number.isFinite(amount)) return;
        this.trauma = Math.min(1.0, Math.max(0, this.trauma + amount));
    }

    setTrauma(amount) {
        if (!Number.isFinite(amount)) return;
        this.trauma = Math.min(1.0, Math.max(0, amount));
    }

    update(delta) {
        if (delta <= 0) return;
        this.time += delta * this.frequency;
        if (this.trauma > 0) {
            this.trauma = Math.max(0, this.trauma - this.decay * delta);
        }
    }

    computeShake(delta) {
        this.update(delta);
        const shake = this.trauma * this.trauma; // Non-linear quadratic response
        if (shake <= 1e-5) {
            this.currentOffset.set(0, 0, 0);
            this.currentRotation.pitch = 0;
            this.currentRotation.yaw = 0;
            this.currentRotation.roll = 0;
            return {
                offset: this.currentOffset,
                rotation: this.currentRotation
            };
        }

        // Multi-frequency harmonic pseudo-noise (fast and deterministic)
        const t = this.time;
        const n1 = Math.sin(t * 1.0) + 0.5 * Math.sin(t * 2.37);
        const n2 = Math.cos(t * 1.31) + 0.5 * Math.cos(t * 2.89);
        const n3 = Math.sin(t * 0.77 + 1.2) + 0.5 * Math.cos(t * 1.93);
        const n4 = Math.sin(t * 1.63 + 2.1);
        const n5 = Math.cos(t * 1.45 + 0.8);
        const n6 = Math.sin(t * 2.11 + 3.4);

        this.currentOffset.set(
            n1 * this.maxOffsetX * shake * 0.67,
            n2 * this.maxOffsetY * shake * 0.67,
            n3 * this.maxOffsetZ * shake * 0.67
        );

        this.currentRotation.pitch = n4 * this.maxPitch * shake;
        this.currentRotation.yaw = n5 * this.maxYaw * shake;
        this.currentRotation.roll = n6 * this.maxRoll * shake;

        return {
            offset: this.currentOffset,
            rotation: this.currentRotation
        };
    }

    applyToCamera(camera, delta) {
        if (!camera) return { offset: this.currentOffset, rotation: this.currentRotation };
        const { offset, rotation } = this.computeShake(delta);
        camera.position.add(offset);
        camera.rotation.x += rotation.pitch;
        camera.rotation.y += rotation.yaw;
        camera.rotation.z += rotation.roll;
        return { offset, rotation };
    }
}

/**
 * 3D Additive Muzzle Flash System
 * 
 * Replaces flat 2D sprites with a layered 3D volumetric flash:
 * 1. Inner white-hot core sphere (additive)
 * 2. Outer chromatic expansion cone oriented along weapon barrel / camera forward
 * 3. Particle sparks radiating outward
 * 
 * Complies with docs/log5-dynamic-light-shader-runaway-findings-2026-08-19.md:
 * Uses unlit MeshBasicMaterial with AdditiveBlending to completely avoid runtime
 * shader recompilation spikes while producing striking cinematic bloom.
 */
export function create3DMuzzleFlash({
    color = 0xffd27a,
    isCryo = false,
    camera = null
} = {}) {
    const group = new THREE.Group();
    const duration = isCryo ? 0.14 : 0.085;

    // 1. Core Sphere (White-hot energy ignition)
    const coreGeo = new THREE.SphereGeometry(isCryo ? 0.26 : 0.18, 8, 8);
    const coreMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    group.add(coreMesh);

    // 2. Outer Chromatic Flash Flare (Oriented / Billboarded)
    const flareGeo = new THREE.PlaneGeometry(isCryo ? 1.1 : 0.75, isCryo ? 1.1 : 0.75);
    const flareMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    const flareMesh = new THREE.Mesh(flareGeo, flareMat);
    if (camera) {
        flareMesh.quaternion.copy(camera.quaternion);
    } else {
        flareMesh.rotation.x = -Math.PI / 2;
    }
    group.add(flareMesh);

    // 3. Volumetric Cross-Flares for 3D needle depth
    const crossGeo = new THREE.CylinderGeometry(0.015, isCryo ? 0.42 : 0.28, isCryo ? 0.85 : 0.55, 6);
    const crossMat = new THREE.MeshBasicMaterial({
        color: isCryo ? 0xd8f8ff : 0xffeaad,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    const cross1 = new THREE.Mesh(crossGeo, crossMat);
    cross1.rotation.z = Math.PI / 2;
    group.add(cross1);

    const cross2 = new THREE.Mesh(crossGeo, crossMat);
    cross2.rotation.x = Math.PI / 2;
    group.add(cross2);

    // 4. Directional Sparks / Shards
    const sparkCount = isCryo ? 8 : 5;
    const sparkMeshes = [];
    const sparkGeo = new THREE.PlaneGeometry(0.04, 0.18);
    for (let i = 0; i < sparkCount; i++) {
        const sparkMat = new THREE.MeshBasicMaterial({
            color: isCryo ? (i % 2 ? 0x67e8f9 : 0xffffff) : (i % 2 ? 0xffaa33 : 0xffffff),
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        const spark = new THREE.Mesh(sparkGeo, sparkMat);
        const angle = (i / sparkCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const dist = 0.08 + Math.random() * 0.08;
        spark.position.set(Math.cos(angle) * dist, 0.05 + Math.random() * 0.1, Math.sin(angle) * dist);
        spark.rotation.z = angle + Math.PI / 2;
        spark.userData = {
            vx: Math.cos(angle) * (isCryo ? 2.8 : 2.2),
            vz: Math.sin(angle) * (isCryo ? 2.8 : 2.2),
            vy: (Math.random() - 0.2) * 1.5
        };
        group.add(spark);
        sparkMeshes.push(spark);
    }

    let age = 0;
    group.userData = {
        age: 0,
        duration,
        update: (delta) => {
            age += delta;
            const progress = Math.min(1.0, age / duration);
            const fade = Math.max(0, 1.0 - progress);

            coreMat.opacity = fade * 0.95;
            coreMesh.scale.setScalar(1.0 + progress * 0.8);

            flareMat.opacity = fade * 0.85;
            flareMesh.scale.setScalar(1.0 + progress * 1.5);

            crossMat.opacity = fade * 0.7;
            cross1.scale.setScalar(1.0 + progress * 1.2);
            cross2.scale.setScalar(1.0 + progress * 1.2);

            for (const spark of sparkMeshes) {
                spark.position.x += spark.userData.vx * delta;
                spark.position.y += spark.userData.vy * delta;
                spark.position.z += spark.userData.vz * delta;
                spark.material.opacity = fade * 0.9;
            }

            return age >= duration;
        },
        dispose: () => {
            coreGeo.dispose();
            coreMat.dispose();
            flareGeo.dispose();
            flareMat.dispose();
            crossGeo.dispose();
            crossMat.dispose();
            sparkGeo.dispose();
            for (const spark of sparkMeshes) {
                spark.material.dispose();
            }
        }
    };

    return group;
}

/**
 * Killstreak Feedback System
 * 
 * Tracks rapid eliminations during combat within a sliding time window (3.5s).
 * Triggers visceral dynamic banners, audio stingers, and tactical accolades:
 * - 3 Kills: TRIPLE PURGE
 * - 5 Kills: OVERDRIVE MASSACRE
 * - 8 Kills: APEX ANNIHILATOR
 * - 12+ Kills: ZERO-POINT REAPER
 * - Boss Kill: TITAN DOWN
 */
export const KILLSTREAK_TIERS = Object.freeze([
    { count: 3, title: 'TRIPLE PURGE', subtitle: 'RAPID BIOMASS CLEAR', color: '#38bdf8' },
    { count: 5, title: 'OVERDRIVE MASSACRE', subtitle: 'SUB-ZERO RAMPAGE', color: '#818cf8' },
    { count: 8, title: 'APEX ANNIHILATOR', subtitle: 'ZONE SANITIZED', color: '#f59e0b' },
    { count: 12, title: 'ZERO-POINT REAPER', subtitle: 'EXTINCTION EVENT DECREE', color: '#ef4444' }
]);

export class KillstreakFeedbackSystem {
    constructor(options = {}) {
        this.container = options.container || globalThis.document?.body;
        this.streakWindow = options.streakWindow ?? 3.5; // seconds
        this.killCount = 0;
        this.timeSinceLastKill = 0;
        this.highestStreakThisRun = 0;
        this.bannerElement = null;
        this.bannerTimeout = null;

        this._setupDOM();
    }

    _setupDOM() {
        if (!globalThis.document) return;
        let host = globalThis.document.getElementById('killstreak-banner-container');
        if (!host) {
            host = globalThis.document.createElement('div');
            host.id = 'killstreak-banner-container';
            host.className = 'killstreak-container';
            if (this.container?.appendChild) {
                this.container.appendChild(host);
            }
        }
        this.bannerContainer = host;
    }

    registerKill({ _enemyType = 'snail', isBoss = false, _worldX = 0, _worldZ = 0 } = {}) {
        if (isBoss) {
            this.showBanner({
                title: 'TITAN DOWN',
                subtitle: 'BIOMECHANICAL THREAT ELIMINATED',
                color: '#ec4899',
                isBoss: true
            });
            window?.AudioManager?.play?.('boss_kill', { volume: 0.85, force: true });
            return;
        }

        this.killCount += 1;
        this.timeSinceLastKill = 0;
        if (this.killCount > this.highestStreakThisRun) {
            this.highestStreakThisRun = this.killCount;
        }

        // Check matching tier
        const tier = KILLSTREAK_TIERS.slice().reverse().find(t => this.killCount === t.count);
        if (tier) {
            this.showBanner(tier);
            window?.AudioManager?.play?.('killstreak_stinger', { volume: 0.75, force: true });
        }
    }

    update(delta) {
        if (this.killCount > 0) {
            this.timeSinceLastKill += delta;
            if (this.timeSinceLastKill >= this.streakWindow) {
                this.killCount = 0;
                this.timeSinceLastKill = 0;
            }
        }
    }

    showBanner({ title, subtitle, color = '#38bdf8', isBoss = false }) {
        if (!this.bannerContainer || !globalThis.document) return;

        // Clear previous banner
        if (this.bannerElement) {
            this.bannerElement.remove();
            this.bannerElement = null;
        }
        if (this.bannerTimeout) {
            clearTimeout(this.bannerTimeout);
            this.bannerTimeout = null;
        }

        const banner = globalThis.document.createElement('div');
        banner.className = `killstreak-banner ${isBoss ? 'killstreak-banner-boss' : ''}`;
        banner.style.borderColor = color;
        banner.style.boxShadow = `0 0 25px ${color}66, inset 0 0 15px ${color}33`;

        const titleEl = globalThis.document.createElement('div');
        titleEl.className = 'killstreak-title';
        titleEl.textContent = title;
        titleEl.style.color = color;
        banner.appendChild(titleEl);

        const subEl = globalThis.document.createElement('div');
        subEl.className = 'killstreak-subtitle';
        subEl.textContent = subtitle;
        banner.appendChild(subEl);

        this.bannerContainer.appendChild(banner);
        this.bannerElement = banner;

        this.bannerTimeout = setTimeout(() => {
            if (this.bannerElement === banner) {
                banner.classList.add('killstreak-fadeout');
                setTimeout(() => {
                    banner.remove();
                    if (this.bannerElement === banner) this.bannerElement = null;
                }, 400);
            }
        }, 2200);
    }

    dispose() {
        if (this.bannerTimeout) clearTimeout(this.bannerTimeout);
        if (this.bannerElement) this.bannerElement.remove();
        if (this.bannerContainer) this.bannerContainer.remove();
    }
}
