import * as THREE from 'three';

const MAX_CASINGS = 64;
const CASING_LIFETIME = 14.0; // 14 seconds total on the battlefield
const CASING_FADE_DURATION = 3.0; // Fades out during final 3 seconds

// Reusable math temporaries to ensure zero garbage collection during combat
const _matrix = new THREE.Matrix4();
const _position = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();

/**
 * Surface detection logic based on player biome, underfoot materials, and camp proximity.
 */
export function resolveCasingSurface(x, z, game) {
    if (!game) return 'metal';
    if (game.isInsideNoFireZone?.()) return 'metal';

    // 1. Check underfoot footprint surface from trackField
    const underfoot = game.trackField?.getSurfaceAt?.(x, z);
    if (underfoot === 'water' || underfoot === 'slime') return 'slime';
    if (underfoot === 'blood') return 'metal';

    // 2. Check camp proximity (wooden decks / platforms)
    if (Array.isArray(game.camps)) {
        for (const camp of game.camps) {
            const cx = camp?.pos?.x ?? camp?.tileX;
            const cz = camp?.pos?.z ?? camp?.tileZ;
            if (Number.isFinite(cx) && Number.isFinite(cz) && Math.hypot(x - cx, z - cz) <= 5.5) {
                return 'wood';
            }
        }
    }

    // 3. Check biome
    const biome = String(game.currentBiomeKey || 'active').toLowerCase();
    if (biome === 'cryo') return 'snow';
    if (biome === 'bio') return 'slime';

    // 4. Default to metallic bunker floor grating
    return 'metal';
}

/**
 * Synchronized 3D Shell Casing Ejection & Ballistic Physics System.
 * Manages an instanced pool of spent brass casings with tumbling physics,
 * ground bounces, surface-aware Foley playback, and persistent field presence.
 */
export class CasingSystem {
    constructor(scene) {
        this.scene = scene;
        this.casings = new Array(MAX_CASINGS);
        this.nextIndex = 0;

        for (let i = 0; i < MAX_CASINGS; i++) {
            this.casings[i] = {
                active: false,
                settled: false,
                x: 0,
                y: 0,
                z: 0,
                vx: 0,
                vy: 0,
                vz: 0,
                rotX: 0,
                rotY: 0,
                rotZ: 0,
                vrotX: 0,
                vrotY: 0,
                vrotZ: 0,
                age: 0,
                maxLife: CASING_LIFETIME,
                bounces: 0,
                surface: 'metal'
            };
        }

        // Low-poly brass cylinder geometry (18 vertices)
        // Oriented horizontally with a slight taper for authentic spent cartridge silhouette
        const geometry = new THREE.CylinderGeometry(0.018, 0.022, 0.08, 7);
        geometry.rotateZ(Math.PI / 2);

        // PBR brass material
        const material = new THREE.MeshStandardMaterial({
            color: 0xd8b248,
            roughness: 0.32,
            metalness: 0.88,
            transparent: true,
            opacity: 1.0
        });

        this.instancedMesh = new THREE.InstancedMesh(geometry, material, MAX_CASINGS);
        this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.instancedMesh.frustumCulled = false;
        this.instancedMesh.renderOrder = 18;

        // Initialize all instances to invisible scale
        _scale.set(0, 0, 0);
        _matrix.makeScale(0, 0, 0);
        for (let i = 0; i < MAX_CASINGS; i++) {
            this.instancedMesh.setMatrixAt(i, _matrix);
        }
        this.instancedMesh.instanceMatrix.needsUpdate = true;

        if (this.scene?.add) {
            this.scene.add(this.instancedMesh);
        }
    }

    /**
     * Eject a physical shell casing from weapon firing port.
     * Supports both options object { x, y, z, aimDirX, aimDirZ, weaponType }
     * and positional arguments (x, y, z, aimDirX, aimDirZ, weaponType).
     */
    spawnCasing(firstArg = {}, yArg, zArg, aimDirXArg, aimDirZArg, weaponTypeArg) {
        const isObj = typeof firstArg === 'object' && firstArg !== null;
        const x = isObj
            ? (Number.isFinite(firstArg.x) ? firstArg.x : 0)
            : (Number.isFinite(firstArg) ? firstArg : 0);
        const y = isObj
            ? (Number.isFinite(firstArg.y) ? firstArg.y : 0.52)
            : (Number.isFinite(yArg) ? yArg : 0.52);
        const z = isObj
            ? (Number.isFinite(firstArg.z) ? firstArg.z : 0)
            : (Number.isFinite(zArg) ? zArg : 0);
        const aimDirX = isObj
            ? (Number.isFinite(firstArg.aimDirX) ? firstArg.aimDirX : 0)
            : (Number.isFinite(aimDirXArg) ? aimDirXArg : 0);
        const aimDirZ = isObj
            ? (Number.isFinite(firstArg.aimDirZ) ? firstArg.aimDirZ : 1)
            : (Number.isFinite(aimDirZArg) ? aimDirZArg : 1);
        const weaponType = (isObj ? firstArg.weaponType : weaponTypeArg) || 'mk1_sidearm';

        const slot = this.casings[this.nextIndex];
        const slotIndex = this.nextIndex;
        this.nextIndex = (this.nextIndex + 1) % this.casings.length;

        // Calculate right vector relative to weapon facing direction
        // aimDir: (dx, dz) -> right vector: (-dz, dx)
        const rightX = -aimDirZ;
        const rightZ = aimDirX;

        // Weapon ejection port offset: forward 0.35m, right 0.22m, height +0.48m
        const spawnX = x + (aimDirX * 0.35) + (rightX * 0.22);
        const spawnY = Math.max(0.2, y);
        const spawnZ = z + (aimDirZ * 0.35) + (rightZ * 0.22);

        // Adjust ejection velocity based on weapon type
        let sideImpulse = 1.7 + (Math.random() * 0.5);
        let upImpulse = 1.35 + (Math.random() * 0.4);
        let recoilDrag = 0.35 + (Math.random() * 0.25);

        if (weaponType === 'scatter_rep' || weaponType === 'siege_breaker') {
            // Heavy 12-gauge shotgun shell: heavier, wider ejection
            sideImpulse = 2.1 + (Math.random() * 0.6);
            upImpulse = 1.5 + (Math.random() * 0.45);
        } else if (weaponType === 'neon_smg') {
            // Rapid high-cyclic SMG casing: snappier ejection
            sideImpulse = 1.9 + (Math.random() * 0.6);
            upImpulse = 1.2 + (Math.random() * 0.3);
        }

        slot.active = true;
        slot.settled = false;
        slot.x = spawnX;
        slot.y = spawnY;
        slot.z = spawnZ;

        // 3D Ballistic Velocity Vector
        slot.vx = (rightX * sideImpulse) - (aimDirX * recoilDrag) + ((Math.random() - 0.5) * 0.3);
        slot.vy = upImpulse;
        slot.vz = (rightZ * sideImpulse) - (aimDirZ * recoilDrag) + ((Math.random() - 0.5) * 0.3);

        // Initial Rotation and Tumbling Spin (rad/s)
        slot.rotX = Math.random() * Math.PI * 2;
        slot.rotY = Math.random() * Math.PI * 2;
        slot.rotZ = Math.random() * Math.PI * 2;

        slot.vrotX = (Math.random() - 0.5) * 32.0;
        slot.vrotY = (Math.random() - 0.5) * 20.0;
        slot.vrotZ = (Math.random() - 0.5) * 36.0;

        slot.age = 0;
        slot.bounces = 0;
        slot.surface = 'metal';

        return slotIndex;
    }

    /**
     * Update casing simulation, collision, bounces, audio sync, and rendering.
     */
    update(delta, game) {
        if (!this.instancedMesh) return;

        let anyChanged = false;
        const dt = Math.min(0.1, Math.max(0.001, delta));

        for (let i = 0; i < MAX_CASINGS; i++) {
            const c = this.casings[i];
            if (!c.active) continue;

            anyChanged = true;
            c.age += dt;

            // 1. Expired: clean up and hide
            if (c.age >= c.maxLife) {
                c.active = false;
                _matrix.makeScale(0, 0, 0);
                this.instancedMesh.setMatrixAt(i, _matrix);
                continue;
            }

            // 2. Active in-flight physics
            if (!c.settled) {
                // Gravity
                c.vy -= 9.81 * dt;

                // Position integration
                c.x += c.vx * dt;
                c.y += c.vy * dt;
                c.z += c.vz * dt;

                // Rotation integration
                c.rotX += c.vrotX * dt;
                c.rotY += c.vrotY * dt;
                c.rotZ += c.vrotZ * dt;

                // Ground elevation collision check
                const terrainY = game?.getTerrainHeightAt?.(c.x, c.z) ?? 0;
                const floorY = terrainY + 0.02;

                if (c.y <= floorY) {
                    c.y = floorY;
                    c.surface = resolveCasingSurface(c.x, c.z, game);

                    // Landing bounce check
                    if (c.bounces < 2 && Math.abs(c.vy) > 0.35) {
                        // Play synchronized landing Foley at impact point!
                        const soundKey = `shell_drop_${c.surface}`;
                        const volume = c.bounces === 0 ? 0.34 : 0.20;
                        const spatial = game?.audioAt?.(c.x, c.z, { volume, maxDistance: 16 }) ?? { volume };
                        const audioMgr = globalThis.window?.AudioManager || globalThis.AudioManager;
                        audioMgr?.play?.(soundKey, spatial);

                        // Restitution bounce & friction
                        c.vy = -c.vy * 0.44;
                        c.vx *= 0.58;
                        c.vz *= 0.58;
                        c.vrotX *= 0.5;
                        c.vrotY *= 0.5;
                        c.vrotZ *= 0.5;
                        c.bounces++;
                    } else {
                        // Settle on ground
                        c.settled = true;
                        c.vy = 0;
                        c.vx = 0;
                        c.vz = 0;
                        c.vrotX = 0;
                        c.vrotY = 0;
                        c.vrotZ = 0;
                        c.rotX = 0; // lie flat

                        if (c.bounces === 0) {
                            const soundKey = `shell_drop_${c.surface}`;
                            const spatial = game?.audioAt?.(c.x, c.z, { volume: 0.28, maxDistance: 16 }) ?? { volume: 0.28 };
                            window.AudioManager?.play?.(soundKey, spatial);
                        }
                    }
                }
            }

            // 3. Render transform matrix with smooth fade-out over last 3 seconds
            _position.set(c.x, c.y, c.z);
            _euler.set(c.rotX, c.rotY, c.rotZ);
            _quaternion.setFromEuler(_euler);

            let scaleMult = 1.0;
            const fadeStart = c.maxLife - CASING_FADE_DURATION;
            if (c.age > fadeStart) {
                // Smooth linear fade-out ratio
                const fadeRatio = Math.max(0, (c.maxLife - c.age) / CASING_FADE_DURATION);
                scaleMult = fadeRatio;
                _position.y -= (1.0 - fadeRatio) * 0.02; // subtly settle down into ground
            }

            _scale.set(scaleMult, scaleMult, scaleMult);
            _matrix.compose(_position, _quaternion, _scale);
            this.instancedMesh.setMatrixAt(i, _matrix);
        }

        if (anyChanged) {
            this.instancedMesh.instanceMatrix.needsUpdate = true;
        }
    }

    /**
     * Clear all active casings (e.g. on scene reload or level exit).
     */
    reset() {
        _scale.set(0, 0, 0);
        _matrix.makeScale(0, 0, 0);
        for (let i = 0; i < MAX_CASINGS; i++) {
            this.casings[i].active = false;
            this.casings[i].settled = false;
            this.casings[i].age = 0;
            this.instancedMesh.setMatrixAt(i, _matrix);
        }
        this.instancedMesh.instanceMatrix.needsUpdate = true;
        this.nextIndex = 0;
    }

    destroy() {
        this.reset();
        if (this.instancedMesh?.parent) {
            this.instancedMesh.parent.remove(this.instancedMesh);
        } else if (this.scene?.remove && this.instancedMesh) {
            this.scene.remove(this.instancedMesh);
        }
        this.instancedMesh?.geometry?.dispose();
        this.instancedMesh?.material?.dispose();
        this.instancedMesh = null;
    }

    dispose() {
        this.destroy();
    }
}
