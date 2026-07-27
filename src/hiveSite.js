import * as THREE from 'three';
import { applyBlackChromaKey } from './textureKeying.js';
import { assetUrl } from './assetUrl.js';

const ALIEN_SPRITESHEETS = {
    'hive_suture': '/alien_nahl_walk.png',
    'hive_relay': '/alien_vey_walk.png',
    'hive_carapace': '/alien_rhun_walk.png'
};

const ALIEN_COLORS = {
    'hive_suture': 0x8cff96,  // Green-white
    'hive_relay': 0x00ffcc,   // Synapse cyan
    'hive_carapace': 0xffa200 // Amber carapace
};

// Shorter than the camps' distress flare (11): hives whisper, camps shout.
const HIVE_SIGNAL_HEIGHT = 8;

const INTERACT_RADIUS = 2.6;

function makeAlienFallbackCanvas({ color = 0x8cff96 } = {}) {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const hex = `#${color.toString(16).padStart(6, '0')}`;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let row = 0; row < 4; row += 1) {
        for (let frame = 0; frame < 4; frame += 1) {
            const ox = frame * 32;
            const oy = row * 32;
            const step = frame % 2 === 0 ? -1 : 1;
            // Draw simple insectoid/alien shape
            ctx.shadowColor = hex;
            ctx.shadowBlur = 4;
            ctx.fillStyle = hex;
            ctx.beginPath();
            ctx.arc(16 + ox, 10 + oy, 5, 0, Math.PI * 2);
            ctx.fill();
            // legs
            ctx.fillRect(10 + ox + step, 14 + oy, 4, 10);
            ctx.fillRect(18 + ox - step, 14 + oy, 4, 10);
            ctx.fillRect(14 + ox, 8 + oy, 4, 12);
        }
    }
    return canvas;
}

function loadAlienKeyedTexture(path, threshold = 15, fallbackCanvas = null) {
    const texture = new THREE.Texture();
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(0.25, 0.25);
    texture.offset.set(0, 0);

    if (fallbackCanvas) {
        texture.image = fallbackCanvas;
        texture.needsUpdate = true;
    }

    if (typeof Image !== 'undefined') {
        const img = new Image();
        img.onload = () => {
            if (typeof document !== 'undefined') {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                applyBlackChromaKey(imgData, { threshold });
                ctx.putImageData(imgData, 0, 0);
                texture.image = canvas;
            } else {
                texture.image = img;
            }
            texture.needsUpdate = true;
        };
        img.src = assetUrl(path);
    }

    return texture;
}

export class HiveSite {
    constructor(scene, { id, label, characterId } = {}) {
        this.scene = scene;
        this.id = id;
        this.label = label || 'HIVE SITE';
        this.characterId = characterId || 'nahl';
        this.pos = { x: 0, z: 0 };
        this.built = false;
        this.revealed = false;

        this.status = 'dormant';
        this.extractionLevel = 0;
        this.bond = 0;
        this.signalColumn = null;
        this.signalMat = null;

        // Pathfinding/ambient walk cycles
        this.npcPos = { x: 0, z: 0 };
        this.targetNode = null;
        this.npcFacingRow = 0;
        this.npcAction = 'idle';
        this.npcActionTimer = 0.5;
        this.elapsed = Math.random() * 5.0;
        this.alienDrones = [];

        this.color = ALIEN_COLORS[id] ?? 0x8cff96;
        this.eggsAudio = null;
        this.wasHurt = false;
    }

    createAlienDrone({ angle = 0, radius = 1.6, scale = 1 } = {}) {
        const drone = new THREE.Group();
        const glowMat = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: 0.32,
            metalness: 0.18,
            emissive: this.color,
            emissiveIntensity: 0.28
        });
        const shellMat = new THREE.MeshStandardMaterial({
            color: 0x101d18,
            roughness: 0.75,
            metalness: 0.25,
            emissive: this.color,
            emissiveIntensity: 0.08
        });

        const body = new THREE.Mesh(new THREE.SphereGeometry(0.18 * scale, 8, 8), glowMat);
        body.scale.set(1.25, 0.82, 1);
        body.position.y = 0.42 * scale;
        drone.add(body);

        const carapace = new THREE.Mesh(new THREE.ConeGeometry(0.18 * scale, 0.26 * scale, 6), shellMat);
        carapace.position.y = 0.56 * scale;
        carapace.rotation.x = Math.PI;
        drone.add(carapace);

        for (let i = 0; i < 4; i += 1) {
            const side = i < 2 ? -1 : 1;
            const spread = i % 2 === 0 ? -0.7 : 0.7;
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018 * scale, 0.018 * scale, 0.48 * scale, 5), shellMat);
            leg.position.set(0.12 * side * scale, 0.26 * scale, spread * 0.18 * scale);
            leg.rotation.z = side * 0.82;
            leg.rotation.x = spread * 0.45;
            drone.add(leg);
        }

        drone.userData = { kind: 'alien-hive-attendant', hiveId: this.id };
        return {
            mesh: drone,
            angle,
            radius,
            speed: 0.45 + Math.random() * 0.18,
            bobPhase: Math.random() * Math.PI * 2
        };
    }

    build(x, z) {
        this.pos.x = x;
        this.pos.z = z;
        this.npcPos.x = x;
        this.npcPos.z = z;

        const group = new THREE.Group();
        group.position.set(x, 0, z);

        // Core Bio-Structure Mesh (Pulsing Dome)
        const coreGeo = new THREE.SphereGeometry(1.4, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        this.coreMat = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: 0.1,
            metalness: 0.2,
            emissive: this.color,
            emissiveIntensity: 0.55
        });
        const core = new THREE.Mesh(coreGeo, this.coreMat);
        core.scale.set(1, 0.7, 1);
        group.add(core);

        // Outer membrane rings
        const ringGeo = new THREE.TorusGeometry(1.8, 0.1, 8, 24);
        const ringMat = new THREE.MeshStandardMaterial({ color: 0x1b2226, roughness: 0.8 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);

        // 3D Billboard Sprite for ambient walker
        const sheetPath = ALIEN_SPRITESHEETS[this.id] ?? '/alien_nahl_walk.png';
        const fallback = makeAlienFallbackCanvas({ color: this.color });
        this.npcTexture = loadAlienKeyedTexture(sheetPath, 25, fallback);
        
        this.npcMaterial = new THREE.SpriteMaterial({
            map: this.npcTexture,
            transparent: true,
            alphaTest: 0.1,
            depthWrite: false,
            depthTest: true
        });
        this.npcSprite = new THREE.Sprite(this.npcMaterial);
        this.npcSprite.position.set(0, 0.7, 0);
        this.npcSprite.scale.set(1.4, 1.4, 1.0);
        this.npcSprite.userData = {
            kind: 'alien-ally',
            hiveId: this.id,
            characterId: this.characterId
        };
        group.add(this.npcSprite);

        const droneSpecs = [
            { angle: 0.4, radius: 1.45, scale: 1.0 },
            { angle: 2.5, radius: 1.75, scale: 0.88 },
            { angle: 4.5, radius: 1.95, scale: 0.95 }
        ];
        this.alienDrones = droneSpecs.map((spec) => {
            const drone = this.createAlienDrone(spec);
            drone.mesh.position.set(
                Math.cos(drone.angle) * drone.radius,
                0.02,
                Math.sin(drone.angle) * drone.radius
            );
            group.add(drone.mesh);
            return drone;
        });

        // Signal column: the hive-side of the camps' flare vocabulary. One
        // shared visual language — a light column means "a living site is
        // here", and its color reads the site's state from across the maze.
        this.signalMat = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
            fog: false
        });
        this.signalColumn = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.66, HIVE_SIGNAL_HEIGHT, 10, 1, true),
            this.signalMat
        );
        this.signalColumn.position.y = HIVE_SIGNAL_HEIGHT / 2;
        group.add(this.signalColumn);

        // Load cave prop textures for hive surrounds
        this.texEggsIntact = loadAlienKeyedTexture('/prop_cave_eggs_intact.png', 15);
        this.texEggsHatched = loadAlienKeyedTexture('/prop_cave_eggs_hatched.png', 15);
        this.texSpores = loadAlienKeyedTexture('/prop_cave_spores.png', 15);
        this.texWebs = loadAlienKeyedTexture('/prop_cave_webs.png', 15);
        this.texWounded = loadAlienKeyedTexture('/prop_cave_hive_wounded.png', 15);

        // Override default 4x4 wrap/repeat logic to make static props render full size
        [this.texEggsIntact, this.texEggsHatched, this.texSpores, this.texWebs, this.texWounded].forEach(t => {
            t.repeat.set(1, 1);
        });

        this.propSprites = {};

        // Eggs Cluster (intact by default, swaps to hatched on extraction/wound)
        const matEggs = new THREE.SpriteMaterial({ map: this.texEggsIntact, transparent: true, alphaTest: 0.05, depthWrite: false });
        const spriteEggs = new THREE.Sprite(matEggs);
        spriteEggs.position.set(-1.6, 0.4, -0.6);
        spriteEggs.scale.set(0.8, 0.8, 1);
        group.add(spriteEggs);
        this.propSprites.eggs = spriteEggs;

        // Spores
        const matSpores = new THREE.SpriteMaterial({ map: this.texSpores, transparent: true, alphaTest: 0.05, depthWrite: false });
        const spriteSpores = new THREE.Sprite(matSpores);
        spriteSpores.position.set(1.4, 0.5, 1.2);
        spriteSpores.scale.set(0.9, 0.9, 1);
        group.add(spriteSpores);

        // Resin Webs
        const matWebs = new THREE.SpriteMaterial({ map: this.texWebs, transparent: true, alphaTest: 0.05, depthWrite: false });
        const spriteWebs = new THREE.Sprite(matWebs);
        spriteWebs.position.set(-1.1, 0.6, 1.3);
        spriteWebs.scale.set(1.1, 0.9, 1);
        group.add(spriteWebs);

        // Wounded membrane leak (only visible if mined or wounded)
        const matWounded = new THREE.SpriteMaterial({ map: this.texWounded, transparent: true, alphaTest: 0.05, depthWrite: false });
        const spriteWounded = new THREE.Sprite(matWounded);
        spriteWounded.position.set(0.9, 0.4, -1.2);
        spriteWounded.scale.set(1.0, 0.8, 1);
        spriteWounded.visible = false;
        group.add(spriteWounded);
        this.propSprites.wounded = spriteWounded;

        this.scene.add(group);
        this.group = group;
        this.built = true;
        this.syncSignalColumn();
    }

    reveal(x, z) {
        if (!this.built) this.build(x, z);
        this.revealed = true;
        if (this.group) this.group.visible = true;
    }

    // Column color is the state glyph: hive-native violet while dormant or
    // bonded-green once kin, wound-red while hurt or mined, and no column at
    // all over a dead or abandoned site.
    syncSignalColumn() {
        if (!this.signalColumn || !this.signalMat) return;
        const dead = ['slain', 'abandoned', 'expired_by_cure', 'queen_consumed'].includes(this.status);
        this.signalColumn.visible = !dead;
        if (dead) return;
        if (this.status === 'mined' || this.status === 'wounded') {
            this.signalMat.color.set(0xff5a3c);
        } else if (this.status === 'bonded' || this.status === 'rescued') {
            this.signalMat.color.set(0x7dff9a);
        } else {
            this.signalMat.color.set(this.color);
        }
    }

    setStatus(status) {
        this.status = status;
        if (!this.built) return;
        this.syncSignalColumn();

        // Change color / emission based on status
        if (status === 'slain' || status === 'abandoned') {
            this.coreMat.color.set(0x3a3a3a);
            this.coreMat.emissive.set(0x000000);
            if (this.npcSprite) this.npcSprite.visible = false;
            for (const drone of this.alienDrones) {
                if (drone.mesh) drone.mesh.visible = false;
            }
        } else if (status === 'mined' || status === 'wounded') {
            this.coreMat.color.set(0xff3b30);
            this.coreMat.emissive.set(0xff3b30);
            this.coreMat.emissiveIntensity = 0.3;
            for (const drone of this.alienDrones) {
                if (drone.mesh) drone.mesh.visible = true;
            }
        } else {
            this.coreMat.color.set(this.color);
            this.coreMat.emissive.set(this.color);
            this.coreMat.emissiveIntensity = 0.55;
            if (this.npcSprite) this.npcSprite.visible = true;
            for (const drone of this.alienDrones) {
                if (drone.mesh) drone.mesh.visible = true;
            }
        }
        this.updatePropVisuals();
    }

    updatePropVisuals() {
        if (!this.propSprites) return;
        const isHurt = this.status === 'wounded' || this.status === 'mined';
        const dead = ['slain', 'abandoned', 'expired_by_cure', 'queen_consumed'].includes(this.status);
        const audio = typeof window !== 'undefined' ? window.AudioManager : null;

        if (this.propSprites.eggs) {
            this.propSprites.eggs.material.map = isHurt ? this.texEggsHatched : this.texEggsIntact;
            this.propSprites.eggs.material.needsUpdate = true;
            this.propSprites.eggs.visible = !dead;
        }

        if (this.propSprites.wounded) {
            this.propSprites.wounded.visible = isHurt && !dead;
        }

        // --- AUDIO WIRING ---
        if (this.revealed) {
            if (!dead) {
                if (!this.eggsAudio) {
                    this.eggsAudio = audio?.play('hive_eggs_hum', { loop: true, volume: 0.0, pan: 0, bus: 'world' });
                }
            } else {
                if (this.eggsAudio) {
                    try { this.eggsAudio.source.stop(); } catch (err) { void err; }
                    this.eggsAudio = null;
                }
            }

            if (isHurt && !dead) {
                if (!this.wasHurt) {
                    this.wasHurt = true;
                    audio?.play('hive_eggs_hatch', { volume: 0.45, bus: 'sfx' });
                }
            } else {
                this.wasHurt = false;
            }
        }
    }

    setExtractionLevel(level) {
        this.extractionLevel = level;
    }

    setBond(bond) {
        this.bond = bond;
    }

    update(delta) {
        if (!this.built || !this.revealed) return;
        this.elapsed += delta;

        // Dynamic eggs hum volume and panning based on player distance
        if (this.eggsAudio) {
            const player = (typeof window !== 'undefined' && window.game) ? window.game.player : null;
            if (player && player.position) {
                const dist = this.distanceTo(player.position.x, player.position.z);
                const maxVol = 0.07;
                const minDistance = 2.0;
                const maxDistance = 18.0;
                let targetVol = 0.0;

                if (dist <= minDistance) {
                    targetVol = maxVol;
                } else if (dist < maxDistance) {
                    const t = (dist - minDistance) / (maxDistance - minDistance);
                    targetVol = maxVol * (1.0 - t);
                }

                const dx = this.pos.x - player.position.x;
                const targetPan = Math.max(-1.0, Math.min(1.0, dx / 12.0));

                const ctx = this.eggsAudio.gainNode?.context;
                if (ctx) {
                    const now = ctx.currentTime;
                    this.eggsAudio.gainNode.gain.setTargetAtTime(targetVol, now, 0.1);
                    if (this.eggsAudio.panner) {
                        this.eggsAudio.panner.pan.setTargetAtTime(targetPan, now, 0.1);
                    }
                }
            }
        }

        // Occasionally play dripping sounds if wounded/mined
        const isHurt = this.status === 'wounded' || this.status === 'mined';
        const audio = typeof window !== 'undefined' ? window.AudioManager : null;
        if (isHurt && Math.random() < 0.0028) {
            audio?.play('hive_wounded_drip', { volume: 0.22, bus: 'world' });
        }

        // Pulse core bioluminescence
        const pulse = 0.45 + 0.15 * Math.sin(this.elapsed * 2.8);
        if (this.coreMat && this.status !== 'slain') {
            this.coreMat.emissiveIntensity = pulse;
        }
        if (this.signalColumn?.visible && this.signalMat) {
            // Slow breathing, out of phase with the core — organic, not urgent.
            this.signalMat.opacity = 0.14 + (Math.sin(this.elapsed * 1.1) + 1) * 0.045;
        }

        // Ambient NPC walking logic
        if (this.status !== 'slain' && this.status !== 'abandoned') {
            this.npcActionTimer -= delta;
            if (this.npcActionTimer <= 0) {
                if (this.npcAction === 'idle') {
                    // Start walking to a random spot within hive radius
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 1.0 + Math.random() * 2.5;
                    this.targetNode = {
                        x: this.pos.x + Math.cos(angle) * dist,
                        z: this.pos.z + Math.sin(angle) * dist
                    };
                    this.npcAction = 'walking';
                    this.npcActionTimer = 4.0;
                } else {
                    // Rest at location
                    this.npcAction = 'idle';
                    this.npcActionTimer = 2.0 + Math.random() * 3.0;
                }
            }

            if (this.npcAction === 'walking' && this.targetNode) {
                const dx = this.targetNode.x - this.npcPos.x;
                const dz = this.targetNode.z - this.npcPos.z;
                const dist = Math.hypot(dx, dz);
                if (dist < 0.1) {
                    this.npcAction = 'idle';
                    this.npcActionTimer = 2.0 + Math.random() * 3.0;
                } else {
                    const speed = 0.65;
                    this.npcPos.x += (dx / dist) * speed * delta;
                    this.npcPos.z += (dz / dist) * speed * delta;

                    // Determine facing row
                    const absX = Math.abs(dx);
                    const absZ = Math.abs(dz);
                    if (absX > absZ) {
                        this.npcFacingRow = dx > 0 ? 2 : 3; // East / West
                    } else {
                        this.npcFacingRow = dz > 0 ? 0 : 1; // South / North
                    }
                }
            }

            // Step walk frame index (0..3) if walking
            const frame = this.npcAction === 'walking' ? Math.floor(this.elapsed * 5) % 4 : 0;
            if (this.npcTexture) {
                this.npcTexture.offset.set(frame * 0.25, (3 - this.npcFacingRow) * 0.25);
            }
            if (this.npcSprite) {
                // Keep relative position inside group
                this.npcSprite.position.set(this.npcPos.x - this.pos.x, 0.7, this.npcPos.z - this.pos.z);
            }
        }

        for (const drone of this.alienDrones) {
            if (!drone.mesh?.visible) continue;
            const angle = drone.angle + this.elapsed * drone.speed;
            drone.mesh.position.set(
                Math.cos(angle) * drone.radius,
                0.04 + Math.sin(this.elapsed * 2.5 + drone.bobPhase) * 0.05,
                Math.sin(angle) * drone.radius
            );
            drone.mesh.rotation.y = -angle + Math.PI / 2;
            drone.mesh.rotation.z = Math.sin(this.elapsed * 3.1 + drone.bobPhase) * 0.08;
        }
    }

    // Mirror the persisted act2 hive record onto the world object.
    syncFromRecord(record = {}) {
        if (Number.isFinite(record.extractionLevel)) this.setExtractionLevel(record.extractionLevel);
        if (Number.isFinite(record.bond)) this.setBond(record.bond);
        this.networked = Boolean(record.networked);
        if (record.status) {
            const worldStatus = ['rescued', 'aboard', 'queen_consumed', 'expired_by_cure'].includes(record.status)
                ? (record.status === 'rescued' || record.status === 'aboard' ? 'abandoned' : 'slain')
                : record.status;
            this.setStatus(worldStatus);
            this.status = record.status;
        }
        this.updatePropVisuals();
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

    reset() {
        this.revealed = false;
        if (this.group) this.group.visible = false;
        if (this.eggsAudio) {
            try { this.eggsAudio.source.stop(); } catch (err) { void err; }
            this.eggsAudio = null;
        }
        this.wasHurt = false;
    }
}
