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
        this.throneAudio = null;
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

        // Load cave reveal interior props
        const loadCaveTex = (path) => {
            const texture = new THREE.Texture();
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.minFilter = THREE.NearestFilter;
            texture.magFilter = THREE.NearestFilter;
            texture.repeat.set(1, 1);
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
                        // apply black chroma key
                        const threshold = 15;
                        for (let i = 0; i < imgData.data.length; i += 4) {
                            const r = imgData.data[i];
                            const g = imgData.data[i + 1];
                            const b = imgData.data[i + 2];
                            if (r <= threshold && g <= threshold && b <= threshold) {
                                imgData.data[i + 3] = 0;
                            }
                        }
                        ctx.putImageData(imgData, 0, 0);
                        texture.image = canvas;
                    } else {
                        texture.image = img;
                    }
                    texture.needsUpdate = true;
                };
                img.src = path;
            }
            return texture;
        };

        const texThrone = loadCaveTex('/prop_cave_queen_throne.png');
        const texWebs = loadCaveTex('/prop_cave_webs.png');
        const texSpores = loadCaveTex('/prop_cave_spores.png');
        const texLichen = loadCaveTex('/prop_cave_lichen.png');
        const texBones = loadCaveTex('/prop_cave_bones.png');

        // Spores around mouth
        const matSpores1 = new THREE.SpriteMaterial({ map: texSpores, transparent: true, alphaTest: 0.05, depthWrite: false });
        const spriteSpores1 = new THREE.Sprite(matSpores1);
        spriteSpores1.position.set(-1.8, 0.5, 0.8);
        spriteSpores1.scale.set(0.9, 0.9, 1);
        group.add(spriteSpores1);

        const spriteSpores2 = new THREE.Sprite(matSpores1);
        spriteSpores2.position.set(1.9, 0.5, 0.7);
        spriteSpores2.scale.set(0.8, 0.8, 1);
        group.add(spriteSpores2);

        // Webs covering the path/arch
        const matWebs = new THREE.SpriteMaterial({ map: texWebs, transparent: true, alphaTest: 0.05, depthWrite: false });
        const spriteWebs1 = new THREE.Sprite(matWebs);
        spriteWebs1.position.set(-0.8, 1.2, -0.4);
        spriteWebs1.scale.set(1.2, 1.0, 1);
        group.add(spriteWebs1);

        const spriteWebs2 = new THREE.Sprite(matWebs);
        spriteWebs2.position.set(0.8, 1.2, -0.4);
        spriteWebs2.scale.set(1.2, 1.0, 1);
        group.add(spriteWebs2);

        // Lichen hanging down
        const matLichen = new THREE.SpriteMaterial({ map: texLichen, transparent: true, alphaTest: 0.05, depthWrite: false });
        const spriteLichen = new THREE.Sprite(matLichen);
        spriteLichen.position.set(0, 1.6, -0.2);
        spriteLichen.scale.set(1.4, 0.7, 1);
        group.add(spriteLichen);

        // Bones piles
        const matBones = new THREE.SpriteMaterial({ map: texBones, transparent: true, alphaTest: 0.05, depthWrite: false });
        const spriteBones = new THREE.Sprite(matBones);
        spriteBones.position.set(-1.2, 0.3, 1.2);
        spriteBones.scale.set(0.8, 0.7, 1);
        group.add(spriteBones);

        // Queen's Throne hero prop (placed behind/above the cave arch)
        const matThrone = new THREE.SpriteMaterial({ map: texThrone, transparent: true, alphaTest: 0.05, depthWrite: false });
        const spriteThrone = new THREE.Sprite(matThrone);
        spriteThrone.position.set(0, 2.0, -1.2);
        spriteThrone.scale.set(2.4, 2.4, 1);
        group.add(spriteThrone);

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
        if (this.throneAudio) {
            try { this.throneAudio.source.stop(); } catch (err) { void err; }
            this.throneAudio = null;
        }
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

        // --- AUDIO WIRING ---
        const audio = typeof window !== 'undefined' ? window.AudioManager : null;
        if (!this.throneAudio) {
            this.throneAudio = audio?.play('hive_queen_throne', { loop: true, volume: 0.0, pan: 0, bus: 'world' });
        }

        // Dynamic throne loop volume and panning based on player distance
        if (this.throneAudio) {
            const player = (typeof window !== 'undefined' && window.game) ? window.game.player : null;
            if (player && player.position) {
                const dist = this.distanceTo(player.position.x, player.position.z);
                const maxVol = 0.06;
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

                const ctx = this.throneAudio.gainNode?.context;
                if (ctx) {
                    const now = ctx.currentTime;
                    this.throneAudio.gainNode.gain.setTargetAtTime(targetVol, now, 0.1);
                    if (this.throneAudio.panner) {
                        this.throneAudio.panner.pan.setTargetAtTime(targetPan, now, 0.1);
                    }
                }
            }
        }

        if (Math.random() < 0.0028) {
            const sfx = Math.random() < 0.5 ? 'hive_spores_puff' : 'hive_webs_sticky';
            audio?.play(sfx, { volume: 0.18, bus: 'world' });
        }
    }
}

export { INTERACT_RADIUS as CAVE_INTERACT_RADIUS };
