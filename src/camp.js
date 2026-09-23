import * as THREE from 'three';
import { getCampClassMapping } from './act2.js';
import { applyBlackChromaKey } from './textureKeying.js';
import { assetUrl } from './assetUrl.js';
import { syncWorld3dReplacement, createWorld3dModel, hasWorld3dModel } from './world3dOverlay.js';
import { campWorkerVisualForHumanState, selectCampWorkerStateCue, updateCampWorkersHumanStates } from './campHumanBehavior.js';
import { CAMP_AFTERMATH_FORTIFIED_LEVEL } from './campEconomy.js';

const LEADER_SPRITESHEETS = {
    'Commander Briggs': '/briggs_camp_walk_v2.png',
    'Sister Martha': '/martha_camp_walk_v2.png',
    'Overseer Kaelen': '/kaelen_camp_walk_v2.png'
};

const LEADER_BOSS_SPRITESHEETS = {
    'Commander Briggs': '/boss_corrupted_tank_v2.png',
    'Sister Martha': '/boss_corrupted_scout_v2.png',
    'Overseer Kaelen': '/boss_corrupted_engineer_v2.png'
};

// docs/sprint-23-room-juice-and-dressing-assets.md §4 — one dedicated
// signature prop per camp, replacing the generic same-for-every-camp
// dressing (crates/cookfire/sandbags above) with faction-specific
// silhouettes. Art is queued, not rendered yet (image-gen quota); each
// path is registered now so the prop appears automatically the moment a
// real file lands at that path — loadKeyedTexture's onerror path already
// falls back gracefully (see makeSignaturePropFallbackCanvas below), so
// wiring ahead of the asset is safe.
// 3D dressing, on top of the flat signature billboards above.
//
// The camps were the last places in the game still dressed entirely in sprites
// while the rest of the world moved to GLB props, which is why they read thinner
// than the hives despite having the same amount of writing behind them. Nothing
// new was authored for this -- every model below already ships and is registered
// in world3dOverlay.
//
// Chosen from what each leader actually says about their camp:
//   Meridian / Kaelen  -- "built on clean steel. No rust. No rot." Grid hardware.
//   Tallow   / Martha  -- "the warm pipes", moss, steam, spores. Wet and growing.
//   Vesper   / Briggs  -- turrets, ammunition, a ledger of the dead. Iron.
export const CAMP_DRESSING_MODELS = Object.freeze({
    camp_meridian: Object.freeze([
        { type: 'prop_conduit_junction_box', x: -3.1, z: 2.4, yaw: 0.6 },
        { type: 'prop_light_cluster_dripping', x: 3.0, z: -2.7, yaw: -0.4 },
        { type: 'prop_conduit_hub', x: 2.8, z: 2.7, yaw: 0.8 },
        { type: 'prop_fabricator_workstation', x: -2.7, z: -2.8, yaw: -1.2 }
    ]),
    camp_tallow: Object.freeze([
        { type: 'prop_fungal_resin_basin', x: -3.0, z: 2.6, yaw: 0.2 },
        { type: 'prop_pipe_rupture', x: 3.2, z: -2.5, yaw: 1.1 },
        { type: 'prop_specimen_tank', x: 2.9, z: 2.7, yaw: -0.5 },
        { type: 'prop_o2_filter_vat', x: -2.8, z: -2.8, yaw: 0.7 }
    ]),
    camp_vesper: Object.freeze([
        { type: 'prop_base_defense_turret', x: -3.2, z: -2.6, yaw: 0.9 },
        { type: 'prop_storage_drum_dented', x: 3.1, z: 2.5, yaw: -0.7 },
        { type: 'prop_ammo_crate_stack', x: 2.8, z: -2.9, yaw: 1.4 },
        { type: 'prop_security_barricade', x: -2.9, z: 2.7, yaw: -0.3 }
    ])
});

export const CAMP_SIGNATURE_PROPS = Object.freeze({
    camp_meridian: [
        { id: 'radio', path: '/prop_camp_meridian_radio.jpg', x: 1.7, z: 2.15, y: 0.42, scale: 1.1, color: 0xffb347 },
        { id: 'battery_bank', path: '/prop_camp_meridian_battery_bank.jpg', x: -1.85, z: -2.3, y: 0.32, scale: 0.95, color: 0xffb347 },
        { id: 'repair_rig', path: '/prop_camp_meridian_repair_rig.jpg', x: 3.35, z: 1.35, y: 0.4, scale: 1.2, color: 0xffb347 }
    ],
    camp_tallow: [
        { id: 'still', path: '/prop_camp_tallow_still.jpg', x: 1.5, z: 1.95, y: 0.4, scale: 1.05, color: 0x6ee66e },
        { id: 'spore_trays', path: '/prop_camp_tallow_spore_trays.jpg', x: -2.05, z: -1.75, y: 0.38, scale: 1.15, color: 0x6ee66e },
        { id: 'resin_urn', path: '/prop_camp_tallow_resin_urn.jpg', x: 2.6, z: -2.35, y: 0.3, scale: 0.75, color: 0x6ee66e }
    ],
    camp_vesper: [
        { id: 'turret', path: '/prop_camp_vesper_turret.jpg', x: 0, z: -3.4, y: 0.46, scale: 1.3, color: 0xff5c4d },
        { id: 'ammo_press', path: '/prop_camp_vesper_ammo_press.jpg', x: -2.6, z: 1.75, y: 0.36, scale: 1.0, color: 0xff5c4d },
        { id: 'shield_rack', path: '/prop_camp_vesper_shield_rack.jpg', x: 2.45, z: 2.55, y: 0.4, scale: 1.1, color: 0xff5c4d }
    ]
});

// A plain placeholder tile (no photographic detail) so a pending signature
// prop reads as "reserved for X" rather than a blank/broken sprite while
// real art is queued. Matches makeLeaderFallbackCanvas's spirit, simplified
// since these are inanimate props, not an animated 4x4 walk sheet.
function makeSignaturePropFallbackCanvas({ color = 0xffe9b0, label = '?' } = {}) {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    const hex = `#${color.toString(16).padStart(6, '0')}`;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = hex;
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 5]);
    ctx.strokeRect(6, 6, 84, 84);
    ctx.fillStyle = hex;
    ctx.font = 'bold 34px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.slice(0, 1).toUpperCase(), 48, 50);
    return canvas;
}

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
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
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

// Camp prop/leader textures are reused verbatim across every SurvivorCamp
// instance (three camps per run, each with the same ~11 prop sprites). Without
// this cache each instance independently re-decoded and re-ran the
// full-resolution chroma-key flood-fill on the identical bytes, multiplying
// an already-expensive synchronous pass by the camp count for no visual gain.
const keyedTextureCache = new Map();

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

    const cacheKey = `${path}::${threshold}`;
    const cached = keyedTextureCache.get(cacheKey);
    if (cached) {
        if (cached.canvas) {
            texture.image = cached.canvas;
            texture.needsUpdate = true;
            if (onLoad) onLoad(texture);
        } else {
            cached.waiters.push((canvas) => {
                texture.image = canvas;
                texture.needsUpdate = true;
                if (onLoad) onLoad(texture);
            });
        }
        return texture;
    }

    if (typeof Image === 'undefined') {
        if (onLoad) {
            setTimeout(() => onLoad(texture), 0);
        }
        return texture;
    }

    const entry = { canvas: null, waiters: [] };
    keyedTextureCache.set(cacheKey, entry);

    const image = new Image();
    image.onload = () => {
        applyImageToTexture(texture, image, threshold);
        entry.canvas = texture.image;
        const waiters = entry.waiters.splice(0);
        waiters.forEach((notify) => notify(entry.canvas));
        if (onLoad) onLoad(texture);
    };
    image.onerror = () => {
        keyedTextureCache.delete(cacheKey);
        applyFallbackToTexture(texture, fallbackCanvas);
        if (onLoad) onLoad(texture);
    };
    image.src = assetUrl(path);
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
const SIGNAL_FLARE_HEIGHT = 11;
/**
 * How a night's raid reads on the camp itself.
 *
 * The overnight simulation already decides the condition; this is the only
 * place that decides what it LOOKS like, so a player can tell a breached camp
 * from a secure one across the clearing without opening a menu. Each step
 * removes one more sign of a working settlement, in the same order a real
 * place would lose them: first the defences, then the stores, then the fire,
 * then the people.
 */
export const CAMP_CONDITION_DRESSING = Object.freeze({
    secure: Object.freeze({ sandbagsLost: 0, storesLost: false, fireDoused: false, peopleGone: false }),
    strained: Object.freeze({ sandbagsLost: 1, storesLost: false, fireDoused: false, peopleGone: false }),
    breached: Object.freeze({ sandbagsLost: 2, storesLost: true, fireDoused: false, peopleGone: false }),
    overrun: Object.freeze({ sandbagsLost: 3, storesLost: true, fireDoused: true, peopleGone: false }),
    abandoned: Object.freeze({ sandbagsLost: 3, storesLost: true, fireDoused: true, peopleGone: true })
});

export function getCampConditionDressing(condition) {
    return CAMP_CONDITION_DRESSING[condition] ?? CAMP_CONDITION_DRESSING.secure;
}

export const CAMP_FLOOR_SIZE = 9;
export const CAMP_CLEARING_RADIUS = 4;

export function getCampPathNodes(campId = '') {
    switch (campId) {
        case 'camp_meridian':
            return [
                { x: 0.8, z: 0.6, action: 'idle' },
                { x: -2.4, z: 1.6, action: 'inspect' },
                { x: 2.2, z: -1.8, action: 'interact' },
                { x: -1.5, z: -2.5, action: 'patrol' },
                { x: 1.8, z: 2.0, action: 'inspect' }
            ];
        case 'camp_tallow':
            return [
                { x: 0.8, z: 0.6, action: 'idle' },
                { x: -2.2, z: 1.8, action: 'interact' },
                { x: 2.0, z: -1.8, action: 'inspect' },
                { x: -1.8, z: -2.2, action: 'patrol' },
                { x: 1.5, z: 1.9, action: 'inspect' }
            ];
        case 'camp_vesper':
            return [
                { x: 0.8, z: 0.6, action: 'idle' },
                { x: -2.5, z: 1.6, action: 'patrol' },
                { x: 2.3, z: -2.1, action: 'inspect' },
                { x: -2.6, z: -2.4, action: 'interact' },
                { x: 1.9, z: 2.3, action: 'inspect' }
            ];
        default:
            return [
                { x: 0.8, z: 0.6, action: 'idle' },
                { x: -2.4, z: 1.6, action: 'inspect' },
                { x: 2.2, z: -1.8, action: 'interact' },
                { x: -1.2, z: -2.6, action: 'patrol' }
            ];
    }
}

export class SurvivorCamp {
    constructor(scene, { id = 'camp', label = 'CAMP', playerType = 'Scout', groundMaterial = null } = {}) {
        this.scene = scene;
        this.id = id;
        this.label = label;
        this.playerType = playerType;
        this.groundMaterial = groundMaterial;
        this.group = null;
        this.beacon = null;
        this.beaconMat = null;
        this.signalColumn = null;
        this.signalMat = null;
        this.discovered = false;
        this.suspicion = 0;
        this.lockdownStrobe = null;
        this.lockdownStrobeMat = null;
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
        // Set by the runtime from hb_overnight_v1 after a night passes.
        this.overnightCondition = 'secure';
        // docs/human-ai-activation-plan.md Slice 3: per-worker humanAI.js
        // state (worker.humanState, set in createCampWorkers/update), derived
        // each frame from status/suspicion/destroyed. Not persisted — it's a
        // reactive readout of already-saved fields, not new save data.
        this._previousSuspicion = 0;
        this.level = 0;
        this.barricades = [];
        this.turrets = [];
        this.searchlights = [];
        // Offset from the camp heart to its defensive perimeter room, when the
        // camp sits in a multi-room compound. See setPerimeterAnchor.
        this.perimeterOffset = null;
        this.dressingModels = [];
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
        this.npcPos = { x: 0.8, z: 0.6 };
        this.npcTarget = { x: 0.8, z: 0.6 };
        this.npcPathNodes = getCampPathNodes(this.id);
        this.npcNodeIndex = 0;
        this.npcActionTimer = 1.0;
        this.npcAction = 'idle';
        this.npcFacingRow = 0;
        this.lastLeaderBarkAt = 0;
        this.isInteractingWithPlayer = false;
        this.leaderStance = 'idle';
        this.campWorkers = [];
        this.fireAudio = null;
        this.wasLockedDown = false;
        this.wasFortified = false;
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
            { home: { x: -2.2, z: 1.9 }, radius: 0.72, speed: 0.65, phase: 0.3, scale: 0.95 },
            { home: { x: 2.35, z: -1.7 }, radius: 0.68, speed: 0.85, phase: 2.1, scale: 0.86 }
        ];
        this.campWorkers = specs.map((spec, index) => {
            const mesh = this.createCampWorkerFigure(this.leaderColor, spec.scale);
            mesh.position.set(spec.home.x, 0.02, spec.home.z);
            mesh.userData.kind = 'camp-worker';
            mesh.userData.campId = this.id;
            mesh.userData.index = index;
            group.add(mesh);
            return { ...spec, mesh, humanState: 'unaware' };
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

    build(x, z, groundY = 0) {
        if (this.built) {
            this.pos = { x, z };
            this.groundY = groundY;
            if (this.group) this.group.position.set(x, groundY, z);
            return;
        }
        this.pos = { x, z };
        this.groundY = groundY;

        const group = new THREE.Group();
        group.position.set(x, groundY, z);

        if (this.groundMaterial) {
            const ground = new THREE.Mesh(new THREE.PlaneGeometry(CAMP_FLOOR_SIZE, CAMP_FLOOR_SIZE), this.groundMaterial);
            ground.rotation.x = -Math.PI / 2;
            ground.position.y = 0.018;
            ground.receiveShadow = true;
            ground.userData = { kind: 'camp-floor', campId: this.id };
            group.add(ground);
        }

        // Tents: weathered cones around a small clearing.
        const tentSpecs = [
            { p: [-2.4, 0, -1.4], c: 0x5a6350 },
            { p: [2.3, 0, -1.6], c: 0x635a48 },
            { p: [-0.4, 0, 2.5], c: 0x4e5a5e }
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
        crate.position.set(-1.15, 0.21, -2.45);
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

        // Distress flare: a tall additive light column that reads over the
        // maze walls from far away — the survivors are signalling for help,
        // and it is the player's reason to walk toward a camp they haven't
        // met yet. Doused on first contact (setDiscovered) or when the camp
        // dies.
        this.signalMat = new THREE.MeshBasicMaterial({
            color: 0xffd27a,
            transparent: true,
            opacity: 0.26,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
            fog: false
        });
        this.signalColumn = new THREE.Mesh(
            new THREE.CylinderGeometry(0.24, 0.6, SIGNAL_FLARE_HEIGHT, 10, 1, true),
            this.signalMat
        );
        this.signalColumn.position.y = SIGNAL_FLARE_HEIGHT / 2;
        group.add(this.signalColumn);

        // Lockdown strobe: hidden until suspicion crosses the lockdown line.
        // A camp that distrusts you shows it before you press anything.
        this.lockdownStrobeMat = new THREE.MeshBasicMaterial({ color: 0xff3030 });
        this.lockdownStrobe = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 8, 8),
            this.lockdownStrobeMat
        );
        this.lockdownStrobe.position.set(0, 1.78, 0);
        this.lockdownStrobe.visible = false;
        group.add(this.lockdownStrobe);

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
        section.position.set(3.0, 0, 2.35);
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

        let leader3dType = 'npc_martha';
        if (/kaelen/i.test(this.leaderName)) leader3dType = 'npc_kaelen';
        else if (/briggs/i.test(this.leaderName)) leader3dType = 'npc_briggs';
        else if (/nahl|scientist/i.test(this.leaderName)) leader3dType = 'npc_nahl';
        else if (/val/i.test(this.leaderName)) leader3dType = 'npc_val';
        else if (/aria/i.test(this.leaderName)) leader3dType = 'npc_aria';
        else if (/queen/i.test(this.leaderName)) leader3dType = 'npc_queen';
        else if (this.leaderClass === 'TANK') leader3dType = 'npc_briggs';
        else if (this.leaderClass === 'ENGINEER') leader3dType = 'npc_kaelen';

        this.npcSprite.userData = {
            kind: 'camp-leader',
            campId: this.id,
            leader: this.leaderName,
            classId: this.leaderClassId,
            isBoss: this.leaderIsBoss,
            world3dModelType: leader3dType
        };
        group.add(this.npcSprite);

        this.createCampWorkers(group);

        // Load prop textures
        this.texCookfireLit = loadKeyedTexture('/prop_camp_cookfire_lit.png', 15, tex => tex.repeat.set(1, 1));
        this.texCookfireDoused = loadKeyedTexture('/prop_camp_cookfire_doused.png', 15, tex => tex.repeat.set(1, 1));
        this.texCrates = loadKeyedTexture('/prop_camp_crates.png', 15, tex => tex.repeat.set(1, 1));
        this.texCratesChained = loadKeyedTexture('/prop_camp_crates_chained.png', 15, tex => tex.repeat.set(1, 1));
        this.texPlacard = loadKeyedTexture('/prop_camp_warning_placard.png', 15, tex => tex.repeat.set(1, 1));
        this.texShutter = loadKeyedTexture('/prop_camp_shutter_lockdown.png', 15, tex => tex.repeat.set(1, 1));
        this.texLaundry = loadKeyedTexture('/prop_camp_laundry.png', 15, tex => tex.repeat.set(1, 1));
        this.texBedrolls = loadKeyedTexture('/prop_camp_bedrolls.png', 15, tex => tex.repeat.set(1, 1));
        this.texGraveFresh = loadKeyedTexture('/prop_camp_grave_fresh.png', 15, tex => tex.repeat.set(1, 1));
        this.texGraveOld = loadKeyedTexture('/prop_camp_grave_old.png', 15, tex => tex.repeat.set(1, 1));
        this.texSandbags = loadKeyedTexture('/prop_camp_sandbags.png', 15, tex => tex.repeat.set(1, 1));

        this.propSprites = {};

        // Cookfire Sprite
        const matFire = new THREE.SpriteMaterial({ map: this.texCookfireLit, transparent: true, alphaTest: 0.05, depthWrite: false });
        const spriteFire = new THREE.Sprite(matFire);
        spriteFire.position.set(0.2, 0.4, 0.1);
        spriteFire.scale.set(0.85, 0.85, 1);
        group.add(spriteFire);
        this.propSprites.cookfire = spriteFire;

        // Crates Sprite
        const matCrates = new THREE.SpriteMaterial({ map: this.texCrates, transparent: true, alphaTest: 0.05, depthWrite: false });
        const spriteCrates = new THREE.Sprite(matCrates);
        spriteCrates.position.set(-2.7, 0.4, 2.4);
        spriteCrates.scale.set(0.8, 0.8, 1);
        group.add(spriteCrates);
        this.propSprites.crates = spriteCrates;

        // Placard Sprite
        const matPlacard = new THREE.SpriteMaterial({ map: this.texPlacard, transparent: true, alphaTest: 0.05, depthWrite: false });
        const spritePlacard = new THREE.Sprite(matPlacard);
        spritePlacard.position.set(0, 0.4, -4.0);
        spritePlacard.scale.set(0.7, 0.7, 1);
        spritePlacard.visible = false;
        group.add(spritePlacard);
        this.propSprites.placard = spritePlacard;

        // Shutter Sprite
        const matShutter = new THREE.SpriteMaterial({ map: this.texShutter, transparent: true, alphaTest: 0.05, depthWrite: false });
        const spriteShutter = new THREE.Sprite(matShutter);
        spriteShutter.position.set(2.3, 0.5, -1.6);
        spriteShutter.scale.set(0.8, 0.8, 1);
        spriteShutter.visible = false;
        group.add(spriteShutter);
        this.propSprites.shutter = spriteShutter;

        // Laundry Sprite
        const matLaundry = new THREE.SpriteMaterial({ map: this.texLaundry, transparent: true, alphaTest: 0.05, depthWrite: false });
        const spriteLaundry = new THREE.Sprite(matLaundry);
        spriteLaundry.position.set(-3.0, 0.5, -1.0);
        spriteLaundry.scale.set(1.0, 1.0, 1);
        group.add(spriteLaundry);
        this.propSprites.laundry = spriteLaundry;

        // Bedrolls Sprite
        const matBedrolls = new THREE.SpriteMaterial({ map: this.texBedrolls, transparent: true, alphaTest: 0.05, depthWrite: false });
        const spriteBedrolls = new THREE.Sprite(matBedrolls);
        spriteBedrolls.position.set(2.6, 0.3, 0.8);
        spriteBedrolls.scale.set(0.6, 0.6, 1);
        group.add(spriteBedrolls);
        this.propSprites.bedrolls = spriteBedrolls;

        // Grave Sprite
        const useOldGrave = this.id === 'camp_vesper';
        const matGrave = new THREE.SpriteMaterial({
            map: useOldGrave ? this.texGraveOld : this.texGraveFresh,
            transparent: true,
            alphaTest: 0.05,
            depthWrite: false
        });
        const spriteGrave = new THREE.Sprite(matGrave);
        spriteGrave.position.set(-3.6, 0.4, 0.7);
        spriteGrave.scale.set(0.7, 0.7, 1);
        group.add(spriteGrave);
        this.propSprites.grave = spriteGrave;

        // Sandbags Sprites (level-based)
        this.sandbagSprites = [];
        const sandbagOffsets = [
            { x: 3.2, z: -3.1 },
            { x: -3.2, z: -3.1 },
            { x: 3.8, z: 0 }
        ];
        for (let i = 0; i < 3; i++) {
            const matSandbags = new THREE.SpriteMaterial({ map: this.texSandbags, transparent: true, alphaTest: 0.05, depthWrite: false });
            const spriteSandbags = new THREE.Sprite(matSandbags);
            spriteSandbags.position.set(sandbagOffsets[i].x, 0.3, sandbagOffsets[i].z);
            spriteSandbags.scale.set(0.75, 0.75, 1);
            spriteSandbags.visible = false;
            group.add(spriteSandbags);
            this.sandbagSprites.push(spriteSandbags);
        }

        // Faction signature props (docs/sprint-23-room-juice-and-dressing-assets.md §4).
        this.signatureProps = {};
        for (const spec of CAMP_SIGNATURE_PROPS[this.id] ?? []) {
            const texture = loadKeyedTexture(
                spec.path,
                15,
                (tex) => tex.repeat.set(1, 1),
                makeSignaturePropFallbackCanvas({ color: spec.color, label: spec.id })
            );
            const material = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                alphaTest: 0.05,
                depthWrite: false
            });
            const sprite = new THREE.Sprite(material);
            sprite.position.set(spec.x, spec.y, spec.z);
            sprite.scale.set(spec.scale, spec.scale, 1);
            sprite.userData = { kind: 'camp-signature-prop', campId: this.id, propId: spec.id };
            group.add(sprite);
            this.signatureProps[spec.id] = sprite;
        }

        // 3D dressing loads asynchronously and attaches to the same group, so it
        // inherits the camp's visibility, destruction and disposal exactly like
        // the sprites do. Failures are non-fatal: a camp missing a prop is still
        // a camp, and blocking construction on a fetch would stall chunk mount.
        this.dressingModels = [];
        void this.attachCampDressingModels(group);

        group.visible = false;
        this.scene.add(group);
        this.group = group;
        this.built = true;
    }

    reveal(x, z, groundY = 0) {
        if (!this.built) this.build(x, z, groundY);
        else if (this.group) {
            this.pos = { x, z };
            this.groundY = groundY;
            this.group.position.set(x, groundY, z);
        }
        this.revealed = true;
        if (this.group) this.group.visible = true;
    }

    // Suspicion is a place, not a number: at the lockdown line the camp runs
    // a warning strobe and barricades read hostile. Interaction refusal lives
    // in threeGame (getActionableCampAt); this is the visible tell.
    setSuspicion(suspicion = 0) {
        this.suspicion = Math.max(0, Math.min(100, Math.floor(Number(suspicion) || 0)));
        const lockdown = this.isLockedDown;
        if (this.lockdownStrobe) this.lockdownStrobe.visible = lockdown;
        if (!this.destroyed) {
            for (const wall of this.barricades) {
                wall.material.color.set(lockdown ? 0x7a3026 : 0x55606a);
            }
        }
        this.updatePropVisuals();
    }

    get isLockedDown() {
        return this.suspicion >= 50 && !this.destroyed && this.status !== 'culled';
    }

    // First contact: dousing the flare is the visible proof the camp has been
    // found. The small beacon light stays — the camp is known now, not lost.
    setDiscovered(discovered = true) {
        this.discovered = Boolean(discovered);
        if (this.signalColumn) {
            this.signalColumn.visible = !this.discovered && !this.destroyed;
        }
        this.updatePropVisuals();
    }

    setAided(aided = true) {
        this.aided = Boolean(aided);
        if (this.section) this.section.visible = this.aided;
        if (this.aided && !this.destroyed && this.status === 'alive') {
            if (this.beaconMat) this.beaconMat.color.set(0x9dffb0);
            this.beacon?.color.set(0x9dffb0);
        }
        this.updatePropVisuals();
    }

    // Act 1 support level: each level rings the camp with barricade segments
    // and brightens the beacon — visible investment, and visible fortification
    // once the player realizes what Act 2 asks of them.
    //
    // The barricade/beacon/turret scaling below is continuous across levels
    // 0-3, but per docs/sprint-22-systems-breakdown/03-factions-and-hives.md
    // ("a fortified ... camp should not share the same ... audio ...
    // affordances") crossing CAMP_AFTERMATH_FORTIFIED_LEVEL is also a
    // one-time, unmistakable beat: a dedicated cue plus a `camp-fortified`
    // event, fired once per camp the first time it happens.
    setLevel(level = 0) {
        const next = Math.max(0, Math.min(3, Math.floor(level)));
        const crossedIntoFortified = next >= CAMP_AFTERMATH_FORTIFIED_LEVEL && !this.wasFortified;
        this.wasFortified = next >= CAMP_AFTERMATH_FORTIFIED_LEVEL;
        this.level = next;
        if (crossedIntoFortified && this.revealed && typeof window !== 'undefined') {
            // No shipped asset for this cue yet -- AudioManager.play() is a
            // silent no-op for an unmatched key, so this is safe to land
            // ahead of the asset (see docs/sprint-22-systems-breakdown/
            // 10-engineering-audio-and-soundtrack.md on missing-asset fallback).
            window.AudioManager?.play?.('camp_fortified', { volume: 0.4, bus: 'sfx' });
            window.dispatchEvent(new CustomEvent('camp-fortified', {
                detail: { campId: this.id, campLabel: this.label, level: next }
            }));
        }
        if (!this.group) return;

        while (this.barricades.length < next * 2) {
            const i = this.barricades.length;
            const angle = (i / 6) * Math.PI * 2 + 0.4;
            const wall = new THREE.Mesh(
                new THREE.BoxGeometry(1.0, 0.5, 0.18),
                new THREE.MeshStandardMaterial({ color: 0x55606a, roughness: 0.7, metalness: 0.45 })
            );
            wall.position.set(Math.cos(angle) * 3.8, 0.25, Math.sin(angle) * 3.8);
            wall.rotation.y = -angle + Math.PI / 2;
            this.group.add(wall);
            this.barricades.push(wall);
        }
        if (this.beacon && !this.destroyed) {
            this.beacon.intensity = 0.9 + next * 0.35;
            this.beacon.distance = 7 + next * 1.5;
        }

        // Level 2 builds a shock turret, level 3 a second — the defense grid
        // the survivors always wanted. In Act 1 it zaps slugs for you. After
        // the reveal, you are what it was built to shock.
        while (this.turrets.length < Math.max(0, next - 1)) {
            const i = this.turrets.length;
            const offset = this.turretOffset(i);
            const group = new THREE.Group();
            const mast = new THREE.Mesh(
                new THREE.CylinderGeometry(0.07, 0.1, 0.9, 6),
                new THREE.MeshStandardMaterial({ color: 0x3a444d, metalness: 0.7, roughness: 0.4 })
            );
            mast.position.y = 0.45;
            group.add(mast);
            const head = new THREE.Mesh(
                new THREE.BoxGeometry(0.3, 0.18, 0.42),
                new THREE.MeshStandardMaterial({ color: 0x222b31, metalness: 0.6, roughness: 0.45 })
            );
            head.position.y = 0.98;
            group.add(head);
            const tipMat = new THREE.MeshBasicMaterial({ color: 0x7df2ff });
            const tip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), tipMat);
            tip.position.set(0, 0.98, 0.26);
            group.add(tip);
            group.position.set(offset.x, 0, offset.z);
            this.group.add(group);
            this.turrets.push({
                group,
                head,
                tipMat,
                offset,
                disabled: false,
                destroyed: false,
                reprogrammed: false,
                cooldown: 1 + Math.random() * 2
            });
        }
        this.syncSearchlights();
        this.updatePropVisuals();
    }

    // Compound camps put their defense grid at the checkpoint the player walks
    // through on the way in, not around the fire. Turrets flank the axis from
    // the heart to the perimeter room; a lone camp keeps the old fire ring.
    turretOffset(index) {
        const perimeter = this.perimeterOffset;
        if (perimeter) {
            const length = Math.hypot(perimeter.x, perimeter.z) || 1;
            const spread = index === 0 ? -2.4 : 2.4;
            return {
                x: perimeter.x + (-perimeter.z / length) * spread,
                z: perimeter.z + (perimeter.x / length) * spread
            };
        }
        const angle = index === 0 ? -0.55 : 2.45;
        return { x: Math.cos(angle) * 3.55, z: Math.sin(angle) * 3.55 };
    }

    setPerimeterAnchor(worldPos) {
        this.perimeterOffset = worldPos && Number.isFinite(worldPos.x) && Number.isFinite(worldPos.z)
            ? { x: worldPos.x - this.pos.x, z: worldPos.z - this.pos.z }
            : null;
        this.turrets.forEach((turret, index) => {
            turret.offset = this.turretOffset(index);
            turret.group?.position.set(turret.offset.x, turret.group.position.y, turret.offset.z);
        });
        for (const light of this.searchlights) light.group.removeFromParent();
        this.searchlights = [];
        this.syncSearchlights();
    }

    isFortified() {
        return this.level >= CAMP_AFTERMATH_FORTIFIED_LEVEL;
    }

    // Halogen masts that sweep the perimeter once the camp is fortified.
    // Unlit additive cones rather than SpotLights: a runtime light changes
    // the scene's light count and recompiles every lit material mid-run.
    syncSearchlights() {
        if (!this.group || !this.perimeterOffset || !this.isFortified() || this.searchlights.length) return;
        for (let i = 0; i < 2; i += 1) {
            const offset = this.turretOffset(i);
            const group = new THREE.Group();
            group.position.set(offset.x * 1.02, 0, offset.z * 1.02);
            const mast = new THREE.Mesh(
                new THREE.CylinderGeometry(0.06, 0.09, 2.4, 6),
                new THREE.MeshStandardMaterial({ color: 0x3a444d, metalness: 0.7, roughness: 0.4 })
            );
            mast.position.y = 1.2;
            group.add(mast);
            const head = new THREE.Group();
            head.position.y = 2.4;
            const lamp = new THREE.Mesh(
                new THREE.SphereGeometry(0.16, 10, 8),
                new THREE.MeshBasicMaterial({ color: 0xfff2c4 })
            );
            head.add(lamp);
            const beamMat = new THREE.MeshBasicMaterial({
                color: 0xfff2c4,
                transparent: true,
                opacity: 0.1,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide
            });
            const beam = new THREE.Mesh(new THREE.ConeGeometry(1.5, 5.5, 16, 1, true), beamMat);
            // Tip at the lamp, mouth on the ground ahead of the mast.
            beam.position.set(0, -1.1, 2.2);
            beam.rotation.x = -1.15;
            head.add(beam);
            group.add(head);
            this.group.add(group);
            this.searchlights.push({ group, head, beam, beamMat, phase: i * Math.PI });
        }
        this.updateSearchlightVisibility();
    }

    updateSearchlightVisibility() {
        const lit = !this.destroyed && this.status !== 'culled';
        for (const light of this.searchlights) light.beam.visible = lit;
    }

    // World position of a turret.
    turretWorldPos(turret) {
        return { x: this.pos.x + turret.offset.x, z: this.pos.z + turret.offset.z };
    }

    // Turrets that can still fire (camp intact, unit intact).
    getActiveTurrets() {
        if (this.destroyed) return [];
        return this.turrets.filter((t) => !t.disabled && !t.destroyed);
    }

    // Nearest live turret within reach of (x, z), or null.
    getTurretNear(x, z, radius = 1.8) {
        for (const turret of this.getActiveTurrets()) {
            const pos = this.turretWorldPos(turret);
            if (Math.hypot(pos.x - x, pos.z - z) <= radius) return turret;
        }
        return null;
    }

    setTurretDisabled(turret) {
        turret.disabled = true;
        turret.tipMat?.color.set(0x33403c);
    }

    setTurretReprogrammed(turret) {
        turret.reprogrammed = true;
        turret.disabled = false;
        turret.destroyed = false;
        turret.tipMat?.color.set(0x9dffb0);
    }

    setTurretDestroyed(turret) {
        turret.destroyed = true;
        turret.reprogrammed = false;
        turret.tipMat?.color.set(0x2a2523);
        turret.group.rotation.x = 0.85;
        turret.group.position.y = -0.12;
    }

    /**
     * Apply the condition the overnight simulation left this camp in. Separate
     * from setStatus(): status is the story (culled, turned, recruited), while
     * condition is the wear a night of raids left behind, and a camp can be
     * both alive and half wrecked.
     */
    setOvernightCondition(condition = 'secure') {
        const next = CAMP_CONDITION_DRESSING[condition] ? condition : 'secure';
        if (next === this.overnightCondition) return this.overnightCondition;
        this.overnightCondition = next;
        this.updatePropVisuals();
        return this.overnightCondition;
    }

    updatePropVisuals() {
        this.updateSearchlightVisibility();
        if (!this.propSprites) return;
        const wear = getCampConditionDressing(this.overnightCondition);
        const lit = this.status !== 'culled' && !wear.fireDoused;
        const lockdown = this.isLockedDown;
        const audio = typeof window !== 'undefined' ? window.AudioManager : null;

        if (this.propSprites.cookfire) {
            this.propSprites.cookfire.material.map = lit ? this.texCookfireLit : this.texCookfireDoused;
            this.propSprites.cookfire.material.needsUpdate = true;
        }

        if (this.propSprites.crates) {
            this.propSprites.crates.material.map = (lockdown && lit) ? this.texCratesChained : this.texCrates;
            this.propSprites.crates.material.needsUpdate = true;
            this.propSprites.crates.visible = lit && this.status !== 'robbed' && !wear.storesLost;
        }

        if (this.propSprites.placard) {
            this.propSprites.placard.visible = lockdown && lit;
        }

        if (this.propSprites.shutter) {
            this.propSprites.shutter.visible = lockdown && lit;
        }

        // The same authored dressing now tells the aftermath at a glance:
        // evacuated camps are packed bare, robbed camps lose their stores,
        // turned camps abandon human routines, and a cull leaves only graves.
        const occupiedByHumans = ['alive', 'robbed'].includes(this.status) && !wear.peopleGone;
        if (this.propSprites.laundry) this.propSprites.laundry.visible = occupiedByHumans;
        if (this.propSprites.bedrolls) this.propSprites.bedrolls.visible = occupiedByHumans && this.status !== 'robbed';
        if (this.propSprites.grave) this.propSprites.grave.visible = this.status === 'culled';
        for (const sprite of Object.values(this.signatureProps ?? {})) {
            sprite.visible = lit && this.status !== 'robbed';
        }

        if (this.sandbagSprites) {
            // Defences are the first thing a raid takes, so the wall the player
            // paid for visibly thins before anything else changes.
            const standing = Math.max(0, this.level - wear.sandbagsLost);
            this.sandbagSprites.forEach((sprite, i) => {
                sprite.visible = standing > i && lit;
            });
        }

        // --- AUDIO WIRING ---
        if (this.revealed) {
            if (lit) {
                if (!this.fireAudio) {
                    this.fireAudio = audio?.play('camp_fire_loop', { loop: true, volume: 0.0, pan: 0, bus: 'world' });
                }
            } else {
                if (this.fireAudio) {
                    try { this.fireAudio.source.stop(); } catch (err) { void err; }
                    this.fireAudio = null;
                    audio?.play('camp_fire_douse', { volume: 0.35, bus: 'world' });
                }
            }

            if (lockdown && lit) {
                if (!this.wasLockedDown) {
                    this.wasLockedDown = true;
                    audio?.play('camp_lockdown_alarm', { volume: 0.28, bus: 'sfx' });
                    audio?.play('camp_lockdown_chains', { volume: 0.38, bus: 'sfx' });
                }
            } else {
                this.wasLockedDown = false;
            }
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
                ? (this.leaderInfo?.bossSprite ?? LEADER_BOSS_SPRITESHEETS[this.leaderName] ?? '/boss_corrupted_scout_v2.png')
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
        this.updatePropVisuals();
    }

    async attachCampDressingModels(group) {
        for (const spec of CAMP_DRESSING_MODELS[this.id] ?? []) {
            if (!hasWorld3dModel(spec.type)) continue;
            try {
                const model = await createWorld3dModel(spec.type);
                const root = model?.root ?? model;
                // The camp may have been torn down while this was in flight.
                if (!root || !group.parent) {
                    root?.traverse?.((child) => {
                        child.geometry?.dispose?.();
                        child.material?.dispose?.();
                    });
                    continue;
                }
                root.position.set(spec.x, 0, spec.z);
                root.rotation.y = spec.yaw ?? 0;
                root.userData = { kind: 'camp-dressing-model', campId: this.id, propType: spec.type };
                group.add(root);
                this.dressingModels.push(root);
            } catch (err) {
                console.warn(`[camp] dressing model ${spec.type} unavailable`, err);
            }
        }
        return this.dressingModels.length;
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
        // Nobody left to signal, and nobody left to distrust you.
        if (this.signalColumn) this.signalColumn.visible = false;
        if (this.lockdownStrobe) this.lockdownStrobe.visible = false;
        // Barricades get breached in the cull.
        this.barricades.forEach((wall, i) => {
            wall.rotation.x = (i % 2 === 0 ? 1 : -1) * 0.9;
            wall.position.y = 0.1;
            wall.material.color.set(0x2c2a26);
        });
        // The defense grid dies with the camp.
        for (const turret of this.turrets) this.setTurretDestroyed(turret);
        // The vessel section survives the cull — it is the whole point.
        if (this.section) this.section.visible = this.aided;
        this.updatePropVisuals();
    }

    reset() {
        this.revealed = false;
        this.elapsed = 0;
        if (this.group) this.group.visible = false;
        if (this.fireAudio) {
            try { this.fireAudio.source.stop(); } catch (err) { void err; }
            this.fireAudio = null;
        }
        this.wasLockedDown = false;
    }

    get isRevealed() { return this.revealed; }

    get isVisible() {
        return Boolean(this.revealed && this.group && this.group.visible !== false);
    }

    getPosition() { return this.built ? { ...this.pos } : null; }

    distanceTo(x, z) {
        if (!this.built || !this.revealed) return Infinity;
        return Math.hypot(this.pos.x - x, this.pos.z - z);
    }

    isWithinInteractRange(x, z) {
        return this.distanceTo(x, z) <= INTERACT_RADIUS;
    }

    update(delta, playerPos = null) {
        if (!this.revealed || !this.built) return;
        this.elapsed += delta;

        // Dynamic fire loop volume and panning based on player distance
        if (this.fireAudio) {
            const player = (typeof window !== 'undefined' && window.game) ? window.game.player : null;
            if (player && player.position) {
                const dist = this.distanceTo(player.position.x, player.position.z);
                const maxVol = 0.08;
                const minDistance = 2.0;
                const maxDistance = 20.0;
                let targetVol = 0.0;

                if (dist <= minDistance) {
                    targetVol = maxVol;
                } else if (dist < maxDistance) {
                    const t = (dist - minDistance) / (maxDistance - minDistance);
                    targetVol = maxVol * (1.0 - t);
                }

                const dx = this.pos.x - player.position.x;
                const targetPan = Math.max(-1.0, Math.min(1.0, dx / 12.0));

                const ctx = this.fireAudio.gainNode?.context;
                if (ctx) {
                    const now = ctx.currentTime;
                    this.fireAudio.gainNode.gain.setTargetAtTime(targetVol, now, 0.1);
                    if (this.fireAudio.panner) {
                        this.fireAudio.panner.pan.setTargetAtTime(targetPan, now, 0.1);
                    }
                }
            }
        }

        if (this.destroyed) {
            if (this.npcSprite) this.npcSprite.visible = false;
            // Ember flicker.
            if (this.beacon) this.beacon.intensity = 0.28 + Math.abs(Math.sin(this.elapsed * 6.1)) * 0.14;
            return;
        }

        // Subtle organic campfire scale flicker
        if (this.propSprites.cookfire && this.status !== 'culled') {
            const flicker = 0.94 + Math.sin(this.elapsed * 13.0) * 0.06 + Math.cos(this.elapsed * 8.5) * 0.03;
            this.propSprites.cookfire.scale.set(0.85 * flicker, 0.85 * flicker, 1.0);
        }
        if (this.beacon) {
            const pulse = this.turned ? 0.34 : this.recruited ? 0.2 : 0.15;
            const base = this.turned ? 1.22 : this.recruited ? 1.05 : 0.85;
            this.beacon.intensity = base + Math.sin(this.elapsed * 2.1) * pulse;
        }
        if (this.signalColumn?.visible && this.signalMat) {
            this.signalMat.opacity = 0.2 + (Math.sin(this.elapsed * 1.6) + 1) * 0.05;
        }
        for (const light of this.searchlights) {
            light.head.rotation.y = Math.sin(this.elapsed * 0.55 + light.phase) * 0.95;
        }
        if (this.lockdownStrobe?.visible && this.lockdownStrobeMat) {
            // Hard on/off blink — a warning, not a glow.
            this.lockdownStrobeMat.color.setHex(Math.sin(this.elapsed * 9) > 0 ? 0xff2222 : 0x481010);
        }

        // Dynamic player awareness and reaction update
        const resolvedPlayerPos = playerPos
            ?? ((typeof window !== 'undefined' && window.game?.player) ? window.game.player.position : null);

        let distToPlayer = Infinity;
        if (resolvedPlayerPos && Number.isFinite(resolvedPlayerPos.x) && Number.isFinite(resolvedPlayerPos.z)) {
            const leaderWorldX = this.pos.x + this.npcPos.x;
            const leaderWorldZ = this.pos.z + this.npcPos.z;
            const pdx = resolvedPlayerPos.x - leaderWorldX;
            const pdz = resolvedPlayerPos.z - leaderWorldZ;
            distToPlayer = Math.hypot(pdx, pdz);
            const isPlayerNearby = distToPlayer < 4.5;

            if (isPlayerNearby && this.npcSprite && this.npcSprite.visible) {
                // Smoothly orient leader towards approaching player
                if (Math.abs(pdx) > Math.abs(pdz)) {
                    this.npcFacingRow = pdx > 0 ? 2 : 3; // East / West
                } else {
                    this.npcFacingRow = pdz > 0 ? 0 : 1; // South / North
                }

                // Proximity reactive barks (Mayor-Tina style callouts)
                const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
                if (distToPlayer < 4.0 && now - (this.lastLeaderBarkAt ?? 0) > 8000) {
                    this.lastLeaderBarkAt = now;
                    let barkLine = null;
                    let barkAudio = null;

                    if (this.status === 'turned') {
                        if (/briggs/i.test(this.leaderName)) {
                            barkLine = 'COMMANDER BRIGGS: THE METAL MELTED INTO OUR VEINS, CARRIER. WE HEAR HER NOW.';
                        } else if (/martha/i.test(this.leaderName)) {
                            barkLine = 'SISTER MARTHA: PEACE HAS SPROUTED IN THE TISSUE. DO NOT FIGHT THE SPORES.';
                        } else {
                            barkLine = 'OVERSEER KAELEN: WORK EFFICIENCY IS NOMINAL. WE HAVE SURRENDERED THE NEED FOR SLEEP.';
                        }
                        barkAudio = 'camp_worker_infected';
                    } else if (this.isLockedDown) {
                        if (/briggs/i.test(this.leaderName)) {
                            barkLine = "COMMANDER BRIGGS: YOU'RE ENTERING A LIVE FIRE ZONE. STATE YOUR INTENT.";
                        } else if (/martha/i.test(this.leaderName)) {
                            barkLine = 'SISTER MARTHA: DISTRUST CLOUDS THIS SANCTUARY. TREAD CAREFULLY.';
                        } else {
                            barkLine = 'OVERSEER KAELEN: SECURITY CAMERAS HAVE YOU FLAGGED. KEEP YOUR HANDS VISIBLE.';
                        }
                        barkAudio = 'camp_lockdown_alarm';
                    } else if (this.status === 'recruited' || this.aided) {
                        if (/briggs/i.test(this.leaderName)) {
                            barkLine = "COMMANDER BRIGGS: PERIMETER IS SECURE. WE'RE PACKED AND READY TO BOARD.";
                        } else if (/martha/i.test(this.leaderName)) {
                            barkLine = 'SISTER MARTHA: BLESSINGS UPON YOUR EXOSUIT. THE CONGREGATION IS READY.';
                        } else {
                            barkLine = 'OVERSEER KAELEN: MANIFESTS ARE SEALED. WAITING ON YOUR LAUNCH SIGNAL.';
                        }
                        barkAudio = 'camp_worker_armed';
                    }

                    if (barkLine && typeof window !== 'undefined') {
                        window.game?.showBunkerLine?.(barkLine);
                    }
                    if (barkAudio && typeof window !== 'undefined') {
                        window.AudioManager?.play?.(barkAudio, { volume: 0.22, bus: 'world' });
                    }
                }
            }
        }

        // NPC movement pathfinding and animation update loop
        if (this.npcSprite && this.npcSprite.visible) {
            // When close to player, pause patrol to converse/react
            const pausingForPlayer = distToPlayer < 3.2 && !this.destroyed && this.status !== 'culled';
            this.isInteractingWithPlayer = pausingForPlayer;

            if (pausingForPlayer) {
                this.npcAction = this.status === 'turned' ? 'turned_stare' : this.isLockedDown ? 'wary_standoff' : 'attentive_idle';
            } else if (this.npcAction !== 'walking') {
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
                if (dist < 0.06) {
                    this.npcPos.x = this.npcTarget.x;
                    this.npcPos.z = this.npcTarget.z;
                    this.npcAction = this.npcTarget.action;
                    this.npcActionTimer = 2.2 + Math.random() * 2.8; // Rest at node
                } else {
                    const speed = this.status === 'turned' ? 1.35 : (this.isLockedDown ? 1.15 : 0.85);
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

            // Step walk frame index (0..3) if walking, else stand idle/reactive
            const isWalking = this.npcAction === 'walking';
            const cadence = this.status === 'turned' ? 9.0 : 6.5;
            const frame = isWalking ? Math.floor(this.elapsed * cadence) % 4 : 0;
            if (this.npcTexture) {
                this.npcTexture.offset.set(frame * 0.25, (3 - this.npcFacingRow) * 0.25);
            }

            // Procedural vertical bobbing and turned twitching
            const walkBob = isWalking ? Math.abs(Math.sin(this.elapsed * cadence)) * 0.04 : 0;
            const turnedTwitch = this.status === 'turned' ? Math.sin(this.elapsed * 14.0) * 0.025 : 0;
            this.npcSprite.position.set(this.npcPos.x, 0.75 + walkBob, this.npcPos.z);
            if (this.status === 'turned') {
                this.npcSprite.rotation.z = turnedTwitch;
            } else {
                this.npcSprite.rotation.z = 0;
            }
            syncWorld3dReplacement(this.npcSprite);
        }

        // docs/human-ai-activation-plan.md Slice 3: per-worker (not
        // per-camp-shared) humanAI.js state -- each worker independently
        // "notices" a shared status/suspicion/destroyed stimulus
        // (WORKER_REACTION_CHANCE per worker per new stimulus), so two
        // workers in the same camp can end up in different states.
        const previousWorkerHumanStates = this.campWorkers.map((worker) => worker.humanState ?? 'unaware');
        const workerHumanStates = updateCampWorkersHumanStates(
            previousWorkerHumanStates,
            {
                status: this.status,
                suspicion: this.suspicion,
                previousSuspicion: this._previousSuspicion,
                destroyed: this.destroyed
            }
        );
        this._previousSuspicion = this.suspicion;
        const workerStateCue = selectCampWorkerStateCue(previousWorkerHumanStates, workerHumanStates);
        if (workerStateCue && this.revealed && typeof window !== 'undefined') {
            window.AudioManager?.play?.(workerStateCue, { volume: 0.3, bus: 'world' });
        }

        for (let index = 0; index < this.campWorkers.length; index += 1) {
            const worker = this.campWorkers[index];
            worker.humanState = workerHumanStates[index];
            if (!worker.mesh) continue;
            worker.mesh.visible = this.status !== 'culled';
            if (!worker.mesh.visible) continue;
            const humanVisual = campWorkerVisualForHumanState(worker.humanState);
            const t = this.elapsed * worker.speed * humanVisual.speedMult + worker.phase;
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
            // Human-state tint layers on top of (never replaces) the status
            // base color from setStatus() -- only touched while actively
            // escalated, so an 'unaware' camp's existing colors are untouched.
            if (humanVisual.tint !== null) {
                const bodyMat = worker.mesh.userData?.bodyMat;
                if (bodyMat) {
                    bodyMat.color.setHex(humanVisual.tint);
                    bodyMat.emissive.setHex(humanVisual.tint);
                }
            }
        }
    }
}

export { INTERACT_RADIUS as CAMP_INTERACT_RADIUS };
