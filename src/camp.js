import * as THREE from 'three';
import { getCampClassMapping } from './act2.js';
import { applyBlackChromaKey } from './textureKeying.js';

const LEADER_SPRITESHEETS = {
    'Commander Briggs': '/briggs_camp_walk.png',
    'Sister Martha': '/martha_camp_walk.png',
    'Overseer Kaelen': '/kaelen_camp_walk.png'
};

const LEADER_BOSS_SPRITESHEETS = {
    'Commander Briggs': '/boss_corrupted_tank.png',
    'Sister Martha': '/boss_corrupted_scout.png',
    'Overseer Kaelen': '/boss_corrupted_engineer.png'
};

function makeLeaderFallbackCanvas({ color = 0xffe9b0, isBoss = false, label = '?' } = {}) {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const hex = `#${color.toString(16).padStart(6, '0')}`;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const badge = label.slice(0, 1).toUpperCase();
    for (let row = 0; row < 4; row += 1) {
        for (let frame = 0; frame < 4; frame += 1) {
            const ox = frame * 32;
            const oy = row * 32;
            const step = frame % 2 === 0 ? -1 : 1;
            ctx.shadowColor = isBoss ? '#8cff96' : hex;
            ctx.shadowBlur = isBoss ? 5 : 3;
            ctx.fillStyle = isBoss ? '#17251b' : '#1b2226';
            ctx.fillRect(11 + ox, 10 + oy, 10, 15);
            ctx.fillStyle = hex;
            ctx.fillRect(12 + ox, 7 + oy, 8, 6);
            ctx.fillRect(8 + ox, 16 + oy, 4, 7);
            ctx.fillRect(20 + ox, 16 + oy, 4, 7);
            ctx.fillRect(12 + ox + step, 24 + oy, 4, 6);
            ctx.fillRect(17 + ox - step, 24 + oy, 4, 6);
            if (isBoss) {
                ctx.fillStyle = '#8cff96';
                ctx.fillRect(13 + ox, 9 + oy, 2, 2);
                ctx.fillRect(18 + ox, 9 + oy, 2, 2);
                ctx.strokeStyle = '#8cff96';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(16 + ox, 17 + oy, 10, 0.15, Math.PI * 1.1);
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
            ctx.fillStyle = isBoss ? '#8cff96' : hex;
            ctx.font = 'bold 7px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(badge, 16 + ox, 31 + oy);
        }
    }
    return canvas;
}

function applyImageToTexture(texture, image, threshold = 15) {
    if (typeof document === 'undefined') {
        texture.image = image;
        texture.needsUpdate = true;
        return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    applyBlackChromaKey(imgData, { threshold });

    ctx.putImageData(imgData, 0, 0);
    texture.image = canvas;
    texture.needsUpdate = true;
}

function applyFallbackToTexture(texture, fallbackCanvas) {
    if (!fallbackCanvas) return;
    texture.image = fallbackCanvas;
    texture.needsUpdate = true;
}

function loadKeyedTexture(path, threshold = 15, onLoad = null, fallbackCanvas = null) {
    const texture = new THREE.Texture();
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(0.25, 0.25);
    texture.offset.set(0, 0);

    applyFallbackToTexture(texture, fallbackCanvas);

    if (typeof Image === 'undefined') {
        if (onLoad) {
            setTimeout(() => onLoad(texture), 0);
        }
        return texture;
    }

    const image = new Image();
    image.onload = () => {
        applyImageToTexture(texture, image, threshold);
        if (onLoad) onLoad(texture);
    };
    image.onerror = () => {
        applyFallbackToTexture(texture, fallbackCanvas);
        if (onLoad) onLoad(texture);
    };
    image.src = path;
    return texture;
}


// ── Survivor Camp (in-world structure, Act 2) ─────────────────
// Three of these appear once the signal dish sweeps the sector. Each camp is a
// small cluster of tents + crates with a survivor beacon, plus a vessel-section
// gantry that rises while the player "helps". Culling a camp topples the tents,
// kills the beacon, and leaves embers — but the vessel section survives (the
// queen needs the ship, not the builders).
//
// Placement follows the Foundry/CaveEntrance pattern: threeGame samples a
// walkable tile and passes world coordinates in.

const INTERACT_RADIUS = 2.8;

export class SurvivorCamp {
    constructor(scene, { id = 'camp', label = 'CAMP', playerType = 'Scout' } = {}) {
        this.scene = scene;
        this.id = id;
        this.label = label;
        this.playerType = playerType;
        this.group = null;
        this.beacon = null;
        this.beaconMat = null;
        this.tents = [];
        this.sectionMat = null;
        this.section = null;
        this.built = false;
        this.revealed = false;
        this.aided = false;
        this.destroyed = false;
        this.robbed = false;
        this.recruited = false;
        this.turned = false;
        this.status = 'alive';
        this.level = 0;
        this.barricades = [];
        this.elapsed = 0;
        this.pos = { x: 0, z: 0 };

        // NPC Leader properties
        this.leaderName = '';
        this.leaderClass = '';
        this.leaderClassId = '';
        this.leaderTitle = '';
        this.leaderCallsign = '';
        this.leaderIsBoss = false;
        this.leaderColor = 0xffe9b0;
        this.campOrder = 1;
        this.leaderInfo = null;
        this.npcSprite = null;
        this.npcMaterial = null;
        this.npcTexture = null;
        this.npcSpritePath = '';
        this.npcPos = { x: 0.5, z: 0.5 };
        this.npcTarget = { x: 0.5, z: 0.5 };
        this.npcPathNodes = [
            { x: 0.5, z: 0.5, action: 'idle' },
            { x: -1.2, z: 0.8, action: 'inspect' },
            { x: 0.9, z: -1.1, action: 'interact' },
            { x: -0.5, z: -1.5, action: 'patrol' }
        ];
        this.npcNodeIndex = 0;
        this.npcActionTimer = 1.0;
        this.npcAction = 'idle';
        this.npcFacingRow = 0;
        this.campWorkers = [];
    }

    createCampWorkerFigure(color = 0xffe9b0, scale = 1) {
        const figure = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.72,
            metalness: 0.12,
            emissive: color,
            emissiveIntensity: 0.06
        });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x111820, roughness: 0.8, metalness: 0.1 });
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.42, 7), bodyMat);
        body.position.y = 0.34 * scale;
        body.scale.setScalar(scale);
        figure.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), bodyMat);
        head.position.y = 0.62 * scale;
        head.scale.setScalar(scale);
        figure.add(head);
        const tool = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.08), darkMat);
        tool.position.set(0.12 * scale, 0.38 * scale, 0);
        tool.rotation.z = 0.4;
        tool.scale.setScalar(scale);
        figure.add(tool);
        figure.userData.bodyMat = bodyMat;
        figure.userData.toolMat = darkMat;
        return figure;
    }

    createCampWorkers(group) {
        const specs = [
            { home: { x: -0.95, z: 0.95 }, radius: 0.46, speed: 0.65, phase: 0.3, scale: 0.95 },
            { home: { x: 1.05, z: -0.95 }, radius: 0.38, speed: 0.85, phase: 2.1, scale: 0.86 }
        ];
        this.campWorkers = specs.map((spec, index) => {
            const mesh = this.createCampWorkerFigure(this.leaderColor, spec.scale);
            mesh.position.set(spec.home.x, 0.02, spec.home.z);
            mesh.userData.kind = 'camp-worker';
            mesh.userData.campId = this.id;
            mesh.userData.index = index;
            group.add(mesh);
            return { ...spec, mesh };
        });
    }

    setWorkerColors(color = this.leaderColor, emissiveIntensity = 0.06) {
        for (const worker of this.campWorkers) {
            const mat = worker.mesh?.userData?.bodyMat;
            if (!mat) continue;
            mat.color.set(color);
            mat.emissive.set(color);
            mat.emissiveIntensity = emissiveIntensity;
        }
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

        // Tents: weathered cones around a small clearing.
        const tentSpecs = [
            { p: [-0.9, 0, -0.3], c: 0x5a6350 },
            { p: [0.85, 0, -0.5], c: 0x635a48 },
            { p: [0.1, 0, 0.9], c: 0x4e5a5e }
        ];
        for (const spec of tentSpecs) {
            const tent = new THREE.Mesh(
                new THREE.ConeGeometry(0.5, 0.85, 7),
                new THREE.MeshStandardMaterial({ color: spec.c, roughness: 0.9, metalness: 0.05 })
            );
            tent.position.set(spec.p[0], 0.42, spec.p[2]);
            group.add(tent);
            this.tents.push(tent);
        }

        // Supply crates.
        const crate = new THREE.Mesh(
            new THREE.BoxGeometry(0.42, 0.42, 0.42),
            new THREE.MeshStandardMaterial({ color: 0x6b5a33, roughness: 0.8, metalness: 0.2 })
        );
        crate.position.set(-0.2, 0.21, -0.95);
        crate.rotation.y = 0.5;
        group.add(crate);

        // Survivor beacon mast + light: white while alive, dead when culled.
        const mast = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.07, 1.5, 6),
            new THREE.MeshStandardMaterial({ color: 0x39424a, metalness: 0.7, roughness: 0.4 })
        );
        mast.position.set(0, 0.75, 0);
        group.add(mast);
        this.beaconMat = new THREE.MeshBasicMaterial({ color: 0xffe9b0 });
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), this.beaconMat);
        bulb.position.set(0, 1.55, 0);
        group.add(bulb);
        this.beacon = new THREE.PointLight(0xffe9b0, 0.9, 7, 2);
        this.beacon.position.set(0, 1.6, 0);
        group.add(this.beacon);

        // Vessel section gantry: hidden until the camp is aided.
        this.sectionMat = new THREE.MeshStandardMaterial({
            color: 0x9fb4c4,
            metalness: 0.85,
            roughness: 0.3,
            emissive: 0x14303c,
            emissiveIntensity: 0.4
        });
        const section = new THREE.Group();
        const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.68, 1.7, 10), this.sectionMat);
        hull.position.y = 0.85;
        section.add(hull);
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.5), this.sectionMat);
        fin.position.set(0.62, 0.5, 0);
        section.add(fin);
        section.position.set(1.5, 0, 0.9);
        section.visible = false;
        group.add(section);
        this.section = section;

        // Dynamic RPS Leader Assignment & NPC creation
        const mapping = getCampClassMapping(this.playerType);
        const leaderInfo = mapping[this.id] ?? { leader: 'Sister Martha', class: 'Scout', isBoss: false };
        this.leaderInfo = leaderInfo;
        this.leaderName = leaderInfo.leader;
        this.leaderClass = leaderInfo.class;
        this.leaderClassId = leaderInfo.classId ?? String(leaderInfo.class ?? 'Scout').toUpperCase();
        this.leaderTitle = leaderInfo.title ?? '';
        this.leaderCallsign = leaderInfo.callsign ?? '';
        this.leaderIsBoss = leaderInfo.isBoss;
        this.leaderColor = leaderInfo.color ?? 0xffe9b0;
        this.campOrder = leaderInfo.order ?? 1;

        const sheetPath = this.leaderIsBoss
            ? (leaderInfo.bossSprite ?? LEADER_BOSS_SPRITESHEETS[this.leaderName])
            : (leaderInfo.sprite ?? LEADER_SPRITESHEETS[this.leaderName] ?? '/martha_camp_walk.png');
        this.npcSpritePath = sheetPath;
        this.npcTexture = loadKeyedTexture(sheetPath, 15, (tex) => {
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(0.25, 0.25);
            tex.offset.set(0, 0);
        }, makeLeaderFallbackCanvas({
            color: this.leaderColor,
            isBoss: this.leaderIsBoss,
            label: this.leaderClass
        }));
        this.npcMaterial = new THREE.SpriteMaterial({
            map: this.npcTexture,
            transparent: true,
            alphaTest: 0.1,
            depthWrite: false,
            depthTest: true
        });
        this.npcSprite = new THREE.Sprite(this.npcMaterial);
        this.npcSprite.position.set(this.npcPos.x, 0.75, this.npcPos.z);
        this.npcSprite.scale.set(this.leaderIsBoss ? 1.85 : 1.5, this.leaderIsBoss ? 1.85 : 1.5, 1.0);
        this.npcSprite.userData = {
            kind: 'camp-leader',
            campId: this.id,
            leader: this.leaderName,
            classId: this.leaderClassId,
            isBoss: this.leaderIsBoss
        };
        group.add(this.npcSprite);

        this.createCampWorkers(group);

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

    setAided(aided = true) {
        this.aided = Boolean(aided);
        if (this.section) this.section.visible = this.aided;
        if (this.aided && !this.destroyed && this.status === 'alive') {
            if (this.beaconMat) this.beaconMat.color.set(0x9dffb0);
            this.beacon?.color.set(0x9dffb0);
        }
    }

    // Act 1 support level: each level rings the camp with barricade segments
    // and brightens the beacon — visible investment, and visible fortification
    // once the player realizes what Act 2 asks of them.
    setLevel(level = 0) {
        const next = Math.max(0, Math.min(3, Math.floor(level)));
        this.level = next;
        if (!this.group) return;

        while (this.barricades.length < next * 2) {
            const i = this.barricades.length;
            const angle = (i / 6) * Math.PI * 2 + 0.4;
            const wall = new THREE.Mesh(
                new THREE.BoxGeometry(1.0, 0.5, 0.18),
                new THREE.MeshStandardMaterial({ color: 0x55606a, roughness: 0.7, metalness: 0.45 })
            );
            wall.position.set(Math.cos(angle) * 2.1, 0.25, Math.sin(angle) * 2.1);
            wall.rotation.y = -angle + Math.PI / 2;
            this.group.add(wall);
            this.barricades.push(wall);
        }
        if (this.beacon && !this.destroyed) {
            this.beacon.intensity = 0.9 + next * 0.35;
            this.beacon.distance = 7 + next * 1.5;
        }
    }

    setStatus(status = 'alive') {
        const next = ['alive', 'robbed', 'culled', 'recruited', 'turned'].includes(status) ? status : 'alive';
        if (next === 'culled') {
            this.setDestroyed(true);
            return;
        }

        this.status = next;
        this.destroyed = false;
        this.robbed = next === 'robbed';
        this.recruited = next === 'recruited';
        this.turned = next === 'turned';
        if (!this.group) return;

        const palette = {
            alive: this.aided ? 0x9dffb0 : 0xffe9b0,
            robbed: 0xff8a3d,
            recruited: 0x7dfcff,
            turned: 0x8cff96
        };
        const color = palette[next] ?? palette.alive;
        if (this.beaconMat) this.beaconMat.color.set(color);
        if (this.beacon) {
            this.beacon.color.set(color);
            this.beacon.intensity = next === 'turned' ? 1.55 : next === 'recruited' ? 1.3 : next === 'robbed' ? 1.05 : 0.9 + this.level * 0.35;
            this.beacon.distance = next === 'turned' ? 11 : 7 + this.level * 1.5;
            this.beacon.position.y = 1.6;
        }
        if (this.sectionMat) {
            const emissive = next === 'turned' ? 0x124d1e : next === 'recruited' ? 0x0e4652 : 0x14303c;
            this.sectionMat.emissive.set(emissive);
            this.sectionMat.emissiveIntensity = next === 'turned' ? 0.72 : next === 'recruited' ? 0.58 : 0.4;
        }
        if (next === 'robbed') {
            this.tents.forEach((tent) => tent.material.color.offsetHSL(0, -0.1, -0.08));
        }
        if (next === 'turned') {
            this.tents.forEach((tent) => tent.material.color.set(0x24442c));
        }
        const workerColor = next === 'robbed' ? 0xff8a3d
            : next === 'recruited' ? 0x7dfcff
            : next === 'turned' ? 0x8cff96
            : this.leaderColor;
        this.setWorkerColors(workerColor, next === 'turned' ? 0.18 : next === 'recruited' ? 0.12 : 0.06);

        // Handle NPC sprite texture swap on state change (turned/infected vs regular)
        if (this.npcSprite && this.npcMaterial) {
            const useBossSheet = this.leaderIsBoss || next === 'turned';
            const sheetPath = useBossSheet
                ? (this.leaderInfo?.bossSprite ?? LEADER_BOSS_SPRITESHEETS[this.leaderName] ?? '/boss_corrupted_scout.png')
                : (this.leaderInfo?.sprite ?? LEADER_SPRITESHEETS[this.leaderName] ?? '/martha_camp_walk.png');
            if (sheetPath !== this.npcSpritePath) {
                this.npcSpritePath = sheetPath;
                this.npcTexture = loadKeyedTexture(sheetPath, 15, null, makeLeaderFallbackCanvas({
                    color: this.leaderColor,
                    isBoss: useBossSheet,
                    label: this.leaderClass
                }));
                this.npcMaterial.map = this.npcTexture;
                this.npcMaterial.needsUpdate = true;
            }
            this.npcSprite.scale.set(useBossSheet ? 1.85 : 1.5, useBossSheet ? 1.85 : 1.5, 1.0);
        }
    }

    setDestroyed(destroyed = true) {
        this.destroyed = Boolean(destroyed);
        if (this.npcSprite) {
            this.npcSprite.visible = !this.destroyed;
        }
        for (const worker of this.campWorkers) {
            if (worker.mesh) worker.mesh.visible = !this.destroyed;
        }
        if (!this.destroyed) return;
        this.status = 'culled';
        this.robbed = false;
        this.recruited = false;
        this.turned = false;
        // Topple + char the tents, kill the beacon, leave a low ember glow.
        this.tents.forEach((tent, i) => {
            tent.rotation.z = (i % 2 === 0 ? 1 : -1) * (Math.PI / 2.6);
            tent.position.y = 0.2;
            tent.material.color.set(0x211d18);
        });
        if (this.beaconMat) this.beaconMat.color.set(0x2a2523);
        if (this.beacon) {
            this.beacon.color.set(0xff5a2a);
            this.beacon.intensity = 0.35;
            this.beacon.position.y = 0.4;
        }
        // Barricades get breached in the cull.
        this.barricades.forEach((wall, i) => {
            wall.rotation.x = (i % 2 === 0 ? 1 : -1) * 0.9;
            wall.position.y = 0.1;
            wall.material.color.set(0x2c2a26);
        });
        // The vessel section survives the cull — it is the whole point.
        if (this.section) this.section.visible = this.aided;
    }

    reset() {
        this.revealed = false;
        this.elapsed = 0;
        if (this.group) this.group.visible = false;
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
        if (this.destroyed) {
            if (this.npcSprite) this.npcSprite.visible = false;
            // Ember flicker.
            if (this.beacon) this.beacon.intensity = 0.28 + Math.abs(Math.sin(this.elapsed * 6.1)) * 0.14;
            return;
        }
        if (this.beacon) {
            const pulse = this.turned ? 0.34 : this.recruited ? 0.2 : 0.15;
            const base = this.turned ? 1.22 : this.recruited ? 1.05 : 0.85;
            this.beacon.intensity = base + Math.sin(this.elapsed * 2.1) * pulse;
        }

        // NPC movement pathfinding and animation update loop
        if (this.npcSprite && this.npcSprite.visible) {
            if (this.npcAction !== 'walking') {
                this.npcActionTimer -= delta;
                if (this.npcActionTimer <= 0) {
                    this.npcNodeIndex = (this.npcNodeIndex + 1) % this.npcPathNodes.length;
                    this.npcTarget = this.npcPathNodes[this.npcNodeIndex];
                    this.npcAction = 'walking';
                }
            } else {
                const dx = this.npcTarget.x - this.npcPos.x;
                const dz = this.npcTarget.z - this.npcPos.z;
                const dist = Math.hypot(dx, dz);
                if (dist < 0.05) {
                    this.npcPos.x = this.npcTarget.x;
                    this.npcPos.z = this.npcTarget.z;
                    this.npcAction = this.npcTarget.action;
                    this.npcActionTimer = 2.0 + Math.random() * 3.0; // Rest at node
                } else {
                    const speed = this.status === 'turned' ? 1.4 : 0.8;
                    this.npcPos.x += (dx / dist) * speed * delta;
                    this.npcPos.z += (dz / dist) * speed * delta;

                    // Determine animation row facing
                    const absX = Math.abs(dx);
                    const absZ = Math.abs(dz);
                    if (absX > absZ) {
                        this.npcFacingRow = dx > 0 ? 2 : 3; // East / West
                    } else {
                        this.npcFacingRow = dz > 0 ? 0 : 1; // South / North
                    }
                }
            }

            // Step walk frame index (0..3) if walking, else stand idle
            const frame = this.npcAction === 'walking' ? Math.floor(this.elapsed * 6) % 4 : 0;
            if (this.npcTexture) {
                this.npcTexture.offset.set(frame * 0.25, (3 - this.npcFacingRow) * 0.25);
            }
            this.npcSprite.position.set(this.npcPos.x, 0.75, this.npcPos.z);
        }

        for (const worker of this.campWorkers) {
            if (!worker.mesh) continue;
            worker.mesh.visible = this.status !== 'culled';
            if (!worker.mesh.visible) continue;
            const t = this.elapsed * worker.speed + worker.phase;
            const gather = this.status === 'recruited';
            const turned = this.status === 'turned';
            const robbed = this.status === 'robbed';
            const centerX = gather ? 1.1 : worker.home.x;
            const centerZ = gather ? 0.55 : worker.home.z;
            const radius = gather ? 0.22 : turned ? worker.radius * 0.72 : worker.radius;
            const wobble = robbed ? Math.sin(t * 3.1) * 0.08 : 0;
            const x = centerX + Math.cos(t) * radius;
            const z = centerZ + Math.sin(t * (turned ? 1.45 : 0.9)) * radius + wobble;
            worker.mesh.position.set(x, 0.02 + Math.abs(Math.sin(t * 2.2)) * 0.035, z);
            worker.mesh.rotation.y = -t + (turned ? Math.sin(this.elapsed * 4.0) * 0.35 : 0);
            worker.mesh.rotation.z = turned ? Math.sin(this.elapsed * 5.5 + worker.phase) * 0.08 : 0;
        }
    }
}

export { INTERACT_RADIUS as CAMP_INTERACT_RADIUS };
