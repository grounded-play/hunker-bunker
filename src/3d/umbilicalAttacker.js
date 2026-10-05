import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * Umbilical Squid-Arm Attacker
 * Room-centric living biomechanical hazard that hangs from the ceiling or wall breach,
 * tracking the player with multi-bone inverse kinematic flexion, lunging with whip strikes,
 * and convulsing upon destruction.
 */
export class UmbilicalAttacker {
    constructor(gltfData, options = {}) {
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.z = options.z || 0;
        this.hp = options.hp !== undefined ? options.hp : 85;
        this.maxHp = this.hp;
        this.isAlive = true;

        this.detectionRadius = options.detectionRadius || 7.0;
        this.strikeRadius = options.strikeRadius || 3.8;
        this.attackDamage = options.attackDamage || 30;
        this.infectionDelta = options.infectionDelta || 0.15;
        this.strikeCooldown = options.strikeCooldown || 2.4;
        this.cooldownTimer = 0;

        this.state = 'IDLE'; // IDLE | TRACKING | ANTICIPATION | STRIKE | RECOVERY | STUNNED | DEAD
        this.stateTimer = 0;
        this.stunTimer = 0;
        this.disposed = false;

        this.flashTimer = 0;
        this._ownsRoot = !options.root;
        this._ownedMaterials = new Set();
        this._materialRestState = new Map();

        if (options.root) {
            this.rootGroup = options.root;
            this.x = options.x !== undefined ? options.x : options.root.position.x;
            this.y = options.y !== undefined ? options.y : options.root.position.y;
            this.z = options.z !== undefined ? options.z : options.root.position.z;
        } else {
            this.rootGroup = new THREE.Group();
            this.rootGroup.position.set(this.x, this.y, this.z);
        }

        if (options.model) {
            this.mesh = options.model;
        } else if (gltfData && gltfData.scene) {
            if (options.root && gltfData.scene.parent === options.root) {
                this.mesh = gltfData.scene;
            } else {
                this.mesh = cloneSkeleton(gltfData.scene);
                this.mesh.position.set(0, 0, 0);
                this.rootGroup.add(this.mesh);
            }
        } else if (options.root) {
            this.mesh = options.root.children[0] || options.root;
        }

        if (this.mesh) {
            // Find skinned mesh & bones
            this.bones = [];
            this.mesh.traverse((child) => {
                if (child.isBone) {
                    this.bones.push(child);
                }
                if (child.isMesh && child.material) {
                    // Clone material for independent hit flashing
                    child.material = Array.isArray(child.material)
                        ? child.material.map((m) => m.clone())
                        : child.material.clone();
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    for (const material of materials) {
                        this._ownedMaterials.add(material);
                        this._materialRestState.set(material, {
                            emissive: material.emissive?.clone?.() ?? null,
                            emissiveIntensity: material.emissiveIntensity ?? 0
                        });
                    }
                }
            });

            // Set up animation mixer
            const anims = gltfData?.animations || options.animations || [];
            if (anims.length > 0) {
                this.mixer = new THREE.AnimationMixer(this.mesh);
                this.actions = {};
                for (const clip of anims) {
                    const action = this.mixer.clipAction(clip);
                    this.actions[clip.name] = action;
                }

                if (this.actions['idle_sway']) {
                    this.actions['idle_sway'].play();
                    this.activeAction = this.actions['idle_sway'];
                }
            }
        }
    }

    playAction(name, crossFadeDuration = 0.2, loop = THREE.LoopRepeat) {
        if (!this.actions || !this.actions[name]) return;
        const nextAction = this.actions[name];
        if (this.activeAction === nextAction) return;

        nextAction.reset();
        nextAction.setLoop(loop);
        if (loop === THREE.LoopOnce) {
            nextAction.clampWhenFinished = true;
        }

        if (this.activeAction) {
            this.activeAction.crossFadeTo(nextAction, crossFadeDuration, true);
        }
        nextAction.play();
        this.activeAction = nextAction;
    }

    _restoreMaterialVisuals() {
        for (const [material, rest] of this._materialRestState) {
            if (material.emissive && rest.emissive) material.emissive.copy(rest.emissive);
            if ('emissiveIntensity' in material) material.emissiveIntensity = rest.emissiveIntensity;
        }
    }

    _showFrostVisual() {
        for (const material of this._ownedMaterials) {
            if (!material.emissive) continue;
            material.emissive.setHex(0x55ccff);
            material.emissiveIntensity = 0.85;
        }
    }

    /**
     * Holds the attacker harmless for a bounded duration. Repeated applications
     * refresh to the longer remaining duration rather than stacking.
     */
    stun(seconds) {
        if (!this.isAlive || this.disposed) return false;
        const duration = Math.max(0, Number(seconds) || 0);
        if (duration <= 0) return false;
        this.stunTimer = Math.max(this.stunTimer, duration);
        this.state = 'STUNNED';
        this.stateTimer = 0;
        this.playAction('idle_sway', 0.1);
        this._showFrostVisual();
        return true;
    }

    takeDamage(amount) {
        if (!this.isAlive) return false;
        this.hp -= amount;
        this.flashTimer = 0.15;

        // Emissive red damage flash
        if (this.mesh) {
            this.mesh.traverse((child) => {
                if (child.isMesh && child.material) {
                    const mats = Array.isArray(child.material) ? child.material : [child.material];
                    for (const mat of mats) {
                        if (mat && mat.emissive) {
                            mat.emissive.setHex(0xff2222);
                            mat.emissiveIntensity = 2.0;
                        }
                    }
                }
            });
        }

        if (this.hp <= 0) {
            this.hp = 0;
            this.isAlive = false;
            this.stunTimer = 0;
            this.state = 'DEAD';
            this.playAction('sever_convulsion', 0.1, THREE.LoopOnce);
            return true; // Fatal blow
        }
        return false;
    }

    update(dt, playerPos, callbacks = {}) {
        if (this.cooldownTimer > 0) {
            this.cooldownTimer -= dt;
        }

        // Hit flash decay
        if (this.flashTimer > 0) {
            this.flashTimer -= dt;
            if (this.flashTimer <= 0 && this.mesh) {
                this.mesh.traverse((child) => {
                    if (child.isMesh && child.material) {
                        const mats = Array.isArray(child.material) ? child.material : [child.material];
                        for (const mat of mats) {
                            if (mat && mat.emissive) {
                            if (this.state === 'STUNNED') this._showFrostVisual();
                            else this._restoreMaterialVisuals();
                        }
                        }
                    }
                });
            }
        }

        if (this.mixer) {
            this.mixer.update(dt);
        }

        if (!this.isAlive) {
            return;
        }

        if (this.state === 'STUNNED') {
            this.stunTimer = Math.max(0, this.stunTimer - dt);
            if (this.stunTimer > 0) {
                this._showFrostVisual();
                return;
            }
            this._restoreMaterialVisuals();
            this.state = 'IDLE';
            this.playAction('idle_sway', 0.2);
            return;
        }

        if (!playerPos) return;

        // Calculate distance and horizontal direction to player
        const dx = playerPos.x - this.x;
        const dz = playerPos.z - this.z;
        const distSq = dx * dx + dz * dz;
        const dist = Math.sqrt(distSq);

        // State Machine
        switch (this.state) {
            case 'IDLE':
                if (dist <= this.strikeRadius && this.cooldownTimer <= 0) {
                    callbacks.onDetectionEnter?.(this);
                    this.state = 'ANTICIPATION';
                    this.stateTimer = 0.35;
                    this.playAction('coil_anticipation', 0.1, THREE.LoopOnce);
                    if (callbacks.onAlert) callbacks.onAlert(this);
                } else if (dist <= this.detectionRadius) {
                    callbacks.onDetectionEnter?.(this);
                    this.state = 'TRACKING';
                    this.playAction('idle_sway', 0.3);
                }
                break;

            case 'TRACKING':
                if (dist > this.detectionRadius * 1.3) {
                    this.state = 'IDLE';
                    this.playAction('idle_sway', 0.4);
                    break;
                }

                // Dynamic IK / FK bone flex toward player coordinates
                if (this.bones && this.bones.length > 0) {
                    const targetAngle = Math.atan2(dx, dz);
                    // Gradually yaw root & upper spine toward player
                    this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, targetAngle, dt * 3.0);
                }

                if (dist <= this.strikeRadius && this.cooldownTimer <= 0) {
                    this.state = 'ANTICIPATION';
                    this.stateTimer = 0.35;
                    this.playAction('coil_anticipation', 0.1, THREE.LoopOnce);
                    if (callbacks.onAlert) callbacks.onAlert(this);
                }
                break;

            case 'ANTICIPATION':
                this.stateTimer -= dt;
                if (this.stateTimer <= 0) {
                    this.state = 'STRIKE';
                    this.stateTimer = 0.25;
                    this.playAction('lash_strike', 0.05, THREE.LoopOnce);

                    // Check if player still within strike radius at strike moment
                    if (dist <= this.strikeRadius + 0.5) {
                        if (callbacks.onDamagePlayer) {
                            callbacks.onDamagePlayer({
                                damage: this.attackDamage,
                                infection: this.infectionDelta,
                                source: 'prop_biomech_spore_umbilical_cable',
                                knockback: { x: dx / (dist || 1) * 3.5, z: dz / (dist || 1) * 3.5 }
                            });
                        }
                    }
                }
                break;

            case 'STRIKE':
                this.stateTimer -= dt;
                if (this.stateTimer <= 0) {
                    this.state = 'RECOVERY';
                    this.stateTimer = 0.6;
                    this.cooldownTimer = this.strikeCooldown;
                }
                break;

            case 'RECOVERY':
                this.stateTimer -= dt;
                if (this.stateTimer <= 0) {
                    this.state = 'TRACKING';
                    this.playAction('idle_sway', 0.3);
                }
                break;
        }
    }

    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.stunTimer = 0;
        if (this.mixer) {
            this.mixer.stopAllAction();
            this.mixer.uncacheRoot?.(this.mesh);
        }
        if (this._ownsRoot) {
            if (this.mesh && this.mesh.parent) {
                this.mesh.parent.remove(this.mesh);
            }
            if (this.rootGroup && this.rootGroup.parent) {
                this.rootGroup.parent.remove(this.rootGroup);
            }
        }
        for (const material of this._ownedMaterials) material.dispose?.();
        this._ownedMaterials.clear();
        this._materialRestState.clear();
    }
}
