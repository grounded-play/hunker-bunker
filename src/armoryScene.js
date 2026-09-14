import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { assetUrl } from './assetUrl.js';
import {
    CHASSIS_SKIN_MODELS,
    createPlayer3dOverlay,
    WEAPON_ARCHETYPES,
    WEAPON_SKIN_MESHES
} from './player3dOverlay.js';
import { getCatalogEntry as getItemCatalogEntry } from './itemOwnership.js';
import { getCharmSocketTransform, resolveCharmModelOffset } from './charmSockets.js';
import { applyWeaponSheen as tintWeapon, disposeWeaponSheen } from './weaponSheenMaterial.js';
import { isMaterialFinish, applyWeaponMaterialFinish, disposeWeaponMaterialFinish } from './weaponFinishMaterial.js';
import { getSelectedSheen } from './weaponSheens.js';
import { getWeaponScaleForBounds, getWeaponCalibration } from './weaponCalibration.js';

import { CHARM_GLB_MAP } from './charmModels.js';
export { CHARM_GLB_MAP } from './charmModels.js';

export const MOD_GLB_MAP = Object.freeze({
    '4140': '/3d/runtime/new3ds/mod_cryo_capacitor.glb',
    '4141': '/3d/runtime/new3ds/mod_magnetic_scavenger.glb',
    // 4142/4143/4144 — same Hyper3D Rodin generation as 4137/4138 above.
    '4142': '/3d/runtime/new3ds/mod_bio_hazard_filter.glb',
    '4143': '/3d/runtime/new3ds/mod_kinetic_impact.glb',
    '4144': '/3d/runtime/new3ds/mod_thermal_heat_exchanger.glb',
    '4145': '/3d/runtime/new3ds/mod_echo_location_transceiver.glb',
    '4146': '/3d/runtime/new3ds/mod_symbiotic_adrenaline_pump.glb',
    '4147': '/3d/runtime/new3ds/mod_zero_point_flux.glb',
    '4160': '/3d/runtime/new3ds/mod_ballast_plating.glb',
    '4161': '/3d/runtime/new3ds/mod_scrap_furnace.glb',
    '4162': '/3d/runtime/new3ds/mod_queens_bane.glb',
    '4163': '/3d/runtime/new3ds/mod_archivist_lens.glb',
    '4164': '/3d/runtime/new3ds/mod_shard_conduit.glb',
    '4165': '/3d/runtime/new3ds/mod_duplicate_refiner.glb',
    '4166': '/3d/runtime/new3ds/mod_pressure_seal.glb',
    '4167': '/3d/runtime/new3ds/mod_deep_anchor.glb'
});

export const CHASSIS_SKIN_GLB_MAP = CHASSIS_SKIN_MODELS;

// Weapon archetype/skin GLB paths come from src/player3dOverlay.js — the same maps that
// drive the in-combat held weapon — so the Armory bench preview can never drift out of
// sync with what actually renders in a run (this file used to keep its own stale copy;
// see docs/armory-and-class-weapons-worklog.md).
const WEAPON_SKIN_GLB_MAP = WEAPON_SKIN_MESHES;
const WEAPON_ARCHETYPE_GLBS = WEAPON_ARCHETYPES;
const FALLBACK_WEAPON_GLB = WEAPON_ARCHETYPES.gg1;

// Lane D fix (docs/game-audit-lane-split-and-worklog.md §2): every other overlay file
// (player3dOverlay.js, world3dOverlay.js, enemy3dOverlay.js) caches loaded GLTF templates by
// URL so repeated equips don't re-fetch/re-parse the same .glb. This file didn't, and the
// Armory is clicked far more densely than any in-run asset load — likely the main source of
// "loading makes it go slower." Mirrors player3dOverlay.js's loadWeaponTemplate() pattern
// exactly: cache the promise (so concurrent requests for the same url share one fetch, and a
// failed load evicts itself for retry), and always .clone(true) the cached template's scene
// before mutating scale/position — mutating the cached original directly would corrupt it for
// every future load of the same item.
// Module-scope so the cache also survives the Armory scene being torn down and recreated
// (e.g. closing and reopening the Armory), not just repeated clicks within one session.
const armoryGltfCache = new Map();
function loadArmoryGltfCached(loader, url) {
    if (!armoryGltfCache.has(url)) {
        const promise = loader.loadAsync(assetUrl(url)).catch((err) => {
            armoryGltfCache.delete(url);
            throw err;
        });
        armoryGltfCache.set(url, promise);
    }
    return armoryGltfCache.get(url);
}

export async function createArmoryScene(canvas) {
    if (!canvas) throw new Error('Armory scene requires a canvas element');

    const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, 2));
    renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    // Keep the armory renderer on the supported shadow variant. PCFSoftShadowMap
    // is deprecated in the current Three.js build and re-entering the Armory
    // created a fresh renderer that re-triggered the warning/recompile path.
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.FogExp2(0x060b13, 0.025);

    const camera = new THREE.PerspectiveCamera(40, (canvas.clientWidth || window.innerWidth) / (canvas.clientHeight || window.innerHeight), 0.1, 50);
    // The controls sidebar occupies the right of the Armory, and the weapon bay
    // sits at x = 0.45 -- far enough right that the UI covered the gun. Panning
    // the view right shifts the whole composition left on screen, which keeps
    // the operator/weapon/bay layout intact rather than moving each piece and
    // re-deriving every prop offset around them.
    const STAGE_PAN_X = 0.62;
    camera.position.set(0.15 + STAGE_PAN_X, 1.42, 3.75);
    camera.lookAt(0.1 + STAGE_PAN_X, 1.15, 0);

    // ── Bunker Lighting ──────────────────────────────────────
    const hemiLight = new THREE.HemisphereLight(0x406080, 0x0a1018, 1.8);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xd0e8ff, 3.2);
    keyLight.position.set(2.8, 4.8, 3.6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 12;
    keyLight.shadow.camera.left = -2.5;
    keyLight.shadow.camera.right = 2.5;
    keyLight.shadow.camera.top = 3.5;
    keyLight.shadow.camera.bottom = -0.5;
    keyLight.shadow.bias = -0.0003;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x00e5ff, 1.4);
    fillLight.position.set(-4.0, 2.5, 2.0);
    scene.add(fillLight);

    const benchSpot = new THREE.SpotLight(0xfff0dd, 4.5, 8.0, Math.PI / 4, 0.4, 1.2);
    benchSpot.position.set(1.2, 3.6, 1.7);
    // Tracks the center-stage weapon display below.
    benchSpot.target.position.set(0.45, 1.85, -0.05);
    benchSpot.castShadow = true;
    benchSpot.shadow.mapSize.width = 1024;
    benchSpot.shadow.mapSize.height = 1024;
    benchSpot.shadow.bias = -0.0005;
    scene.add(benchSpot);
    scene.add(benchSpot.target);

    const rimLight = new THREE.PointLight(0x00f0ff, 2.8, 6.0);
    rimLight.position.set(-1.8, 2.2, -1.0);
    scene.add(rimLight);

    // ── Subterranean Bunker Environment Geometry ─────────────
    const envGroup = new THREE.Group();
    let platRingMat = null;
    let cornerMat = null;
    let edgeMat = null;

    // Framed Holographic Weapon Inspection Bay
    // Covers the entire weapon with a sleek semi-transparent glass panel,
    // glowing perimeter bevels, and tactical L-bracket corner reticles.
    const bayWidth = 2.4;
    const bayHeight = 1.45;
    const rackPanelGeo = new THREE.PlaneGeometry(bayWidth, bayHeight);
    const rackPanelMat = new THREE.MeshStandardMaterial({
        color: 0x05131f,
        roughness: 0.3,
        metalness: 0.8,
        transparent: true,
        opacity: 0.58,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const rackPanel = new THREE.Mesh(rackPanelGeo, rackPanelMat);
    rackPanel.position.set(0.45, 1.85, -0.65);
    rackPanel.receiveShadow = true;
    envGroup.add(rackPanel);

    // Holographic corner brackets & frame lines
    const frameGroup = new THREE.Group();
    frameGroup.position.set(0.45, 1.85, -0.64);

    cornerMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.85 });
    const bracketLen = 0.22;
    const bracketThick = 0.015;
    const halfW = bayWidth / 2;
    const halfH = bayHeight / 2;

    // 4 Corner brackets (L-shapes)
    const corners = [
        { x: -halfW, y: halfH, sx: 1, sy: -1 },
        { x: halfW, y: halfH, sx: -1, sy: -1 },
        { x: -halfW, y: -halfH, sx: 1, sy: 1 },
        { x: halfW, y: -halfH, sx: -1, sy: 1 }
    ];
    corners.forEach((c) => {
        const hArm = new THREE.Mesh(new THREE.PlaneGeometry(bracketLen, bracketThick), cornerMat);
        hArm.position.set(c.x + (bracketLen / 2) * c.sx, c.y, 0.002);
        frameGroup.add(hArm);
        const vArm = new THREE.Mesh(new THREE.PlaneGeometry(bracketThick, bracketLen), cornerMat);
        vArm.position.set(c.x, c.y + (bracketLen / 2) * c.sy, 0.002);
        frameGroup.add(vArm);
    });

    // Outer frame boundary lines with subtle cyan glow
    edgeMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.28 });
    const topEdge = new THREE.Mesh(new THREE.PlaneGeometry(bayWidth, 0.006), edgeMat);
    topEdge.position.set(0, halfH, 0.001);
    frameGroup.add(topEdge);
    const bottomEdge = new THREE.Mesh(new THREE.PlaneGeometry(bayWidth, 0.006), edgeMat);
    bottomEdge.position.set(0, -halfH, 0.001);
    frameGroup.add(bottomEdge);

    envGroup.add(frameGroup);

    // Operator Hexagonal Turntable Platform (Positioned in clear central-left lane)
    const platGeo = new THREE.CylinderGeometry(0.85, 0.95, 0.12, 6);
    const platMat = new THREE.MeshStandardMaterial({
        color: 0x1a2636,
        roughness: 0.5,
        metalness: 0.8
    });
    const platform = new THREE.Mesh(platGeo, platMat);
    platform.position.set(-0.75, 0.06, 0.15);
    platform.receiveShadow = true;
    envGroup.add(platform);

    const platRingGeo = new THREE.RingGeometry(0.78, 0.82, 6);
    platRingMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, side: THREE.DoubleSide });
    const platRing = new THREE.Mesh(platRingGeo, platRingMat);
    platRing.rotation.x = -Math.PI / 2;
    platRing.position.set(-0.75, 0.125, 0.15);
    envGroup.add(platRing);

    // Soft radial contact shadow under player's boots on the turntable
    const shadowCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    if (shadowCanvas) {
        shadowCanvas.width = 128;
        shadowCanvas.height = 128;
        const sCtx = shadowCanvas.getContext('2d');
        if (sCtx) {
            const sGrad = sCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
            sGrad.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
            sGrad.addColorStop(0.35, 'rgba(0, 0, 0, 0.7)');
            sGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.28)');
            sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            sCtx.fillStyle = sGrad;
            sCtx.fillRect(0, 0, 128, 128);
            const shadowTex = new THREE.CanvasTexture(shadowCanvas);
            const contactShadowGeo = new THREE.PlaneGeometry(1.2, 1.2);
            const contactShadowMat = new THREE.MeshBasicMaterial({
                map: shadowTex,
                transparent: true,
                opacity: 0.85,
                depthWrite: false
            });
            const contactShadow = new THREE.Mesh(contactShadowGeo, contactShadowMat);
            contactShadow.rotation.x = -Math.PI / 2;
            contactShadow.position.set(-0.75, 0.126, 0.15);
            envGroup.add(contactShadow);
        }
    }

    scene.add(envGroup);

    // ── Operator Turntable Group (Left / Center Lane) ────────
    const operatorGroup = new THREE.Group();
    operatorGroup.position.set(-0.75, 0.12, 0.15);
    scene.add(operatorGroup);

    let currentOverlay = null;
    let activeClass = 'SCOUT';
    let loadGen = 0;

    // Operator Polish (colorway) and the shoulder-patch decal are both real,
    // already-shipped systems -- setOperatorPolish() is wired to the in-run
    // player and the title-screen hero preview, and the torso patch renders
    // in-run -- but neither was ever connected to the Armory's own operator
    // preview (docs/armory-layout-and-cosmetic-preview-plan-2026-08-19.md #3).
    // Stored here (not just applied once) because loadOperatorModel rebuilds
    // currentOverlay.root from scratch on every class switch, dropping
    // whatever was applied to the previous instance.
    let currentPolishColor = 0xffffff;
    // Weapon sheen (docs/planning/armory-ui-overhaul-2026-09-09.md Phase 3).
    // Stored like the operator polish, and for the same reason: the weapon mesh
    // is rebuilt from scratch on every frame/skin change, so the tint has to be
    // re-applied to the new material rather than set once.
    let currentSheenColor = getSelectedSheen().color;
    let currentDecalId = null;
    function applyDecalSprite(decalId) {
        const catalog = decalId ? getItemCatalogEntry(decalId) : null;
        currentOverlay?.setPatchImage(catalog?.localImg || catalog?.img || null);
    }

    async function loadOperatorModel(classType, chassisSkinId = null) {
        const gen = ++loadGen;
        const normalized = ['SCOUT', 'TANK', 'ENGINEER'].includes(String(classType).toUpperCase())
            ? String(classType).toUpperCase()
            : 'SCOUT';
        activeClass = normalized;

        if (currentOverlay) {
            operatorGroup.remove(currentOverlay.root);
            currentOverlay = null;
        }

        const configs = {
            SCOUT: {
                modelUrl: '/3d/scouting-scout/Scout.game.glb',
                targetHeight: 1.85,
                idleActionName: 'heroIdle',
                weaponVisible: false
            },
            ENGINEER: {
                modelUrl: '/3d/runtime/engineer-rigged-gestures.glb',
                animationModelUrl: '/3d/scouting-scout/Scout.game.glb',
                animationBonePrefix: 'mixamorig',
                targetHeight: 1.85,
                idleActionName: 'heroIdle',
                weaponVisible: false,
                weaponEnabled: true
            },
            TANK: {
                modelUrl: '/3d/runtime/tank-rigged.glb',
                animationModelUrl: '/3d/scouting-scout/Scout.game.glb',
                animationBonePrefix: 'mixamorig',
                targetHeight: 1.95,
                idleActionName: 'heroIdle',
                weaponVisible: false,
                weaponEnabled: true
            }
        };

        const baseConfig = configs[normalized] || configs.SCOUT;
        const customModel = chassisSkinId && CHASSIS_SKIN_GLB_MAP[chassisSkinId]
            ? CHASSIS_SKIN_GLB_MAP[chassisSkinId]
            : null;
        const config = customModel ? {
            ...baseConfig,
            modelUrl: customModel,
            animationModelUrl: '/3d/scouting-scout/Scout.game.glb',
            animationBonePrefix: 'mixamorig',
            allowStatic: true
        } : {
            ...baseConfig,
            allowStatic: true
        };

        try {
            const overlay = await createPlayer3dOverlay(config);
            if (gen !== loadGen) { overlay.dispose(); return; }
            currentOverlay = overlay;
            overlay.root.rotation.y = 0.35; // Angle slightly toward center weapon bench
            overlay.root.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            operatorGroup.add(overlay.root);
            overlay.setOperatorPolish?.(currentPolishColor);
            applyDecalSprite(currentDecalId);
        } catch (err) {
            console.warn('[armoryScene] Failed loading operator overlay:', err);
        }
    }

    // ── Weapon Workbench Group (Center / Right) ──────────────
    // Y raised from 1.25 and Z pulled forward (toward the camera) from -0.45
    // -- docs/armory-layout-and-cosmetic-preview-plan-2026-08-19.md #1/#2.
    // The old position put the gun's on-screen projection directly behind
    // .weapon-bench-panel's top edge (only the barrel poked out above it),
    // with a large genuinely-empty region above/around that point doing
    // nothing, and left only 0.15 units of Z clearance to rackPanel behind
    // it (which now sits further back, see above) for a gun scaled to a
    // 1.15-unit prominent size. Raising Y lifts the gun into that empty
    // space; pulling Z forward both grows the wall clearance and reads
    // better relative to the now-narrower weapon-bench-panel CSS column.
    const weaponBenchGroup = new THREE.Group();
    weaponBenchGroup.position.set(0.45, 1.85, -0.05);
    scene.add(weaponBenchGroup);

    // Interactive pivot inside weapon bench
    // Multiplies the weapon's own materials by the sheen colour rather than
    // replacing them, so a tint reads as a finish over the existing paintwork
    // instead of flattening the model to one colour. Cloning the material first
    // keeps the tint off any other mesh sharing it.
    function applyWeaponSheen() {
        tintWeapon(currentWeaponMesh, currentSheenColor);
    }

    const weaponPivot = new THREE.Group();
    weaponBenchGroup.add(weaponPivot);

    // docs/armory-and-class-weapons-worklog.md — gltf-transform's optimize pass applies
    // EXT_meshopt_compression to every charm/mod/skin asset this scene loads; GLTFLoader
    // throws without this registered first.
    const gltfLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    let currentWeaponMesh = null;
    let weaponLoadGen = 0;

    // Sockets on Weapon
    const charmSocket = new THREE.Group();
    weaponPivot.add(charmSocket);

    function applyCharmSocket(archetypeId) {
        const transform = getCharmSocketTransform(archetypeId);
        charmSocket.position.fromArray(transform.position);
        charmSocket.rotation.fromArray(transform.rotation);
        charmSocket.scale.setScalar(transform.scale);
        charmSocket.userData.archetype = transform.archetype;
        charmSocket.userData.anchor = transform.anchor;
        charmPhysics.angleX = 0;
        charmPhysics.angleZ = 0;
        charmPhysics.velX = 0;
        charmPhysics.velZ = 0;
    }

    const mod1Socket = new THREE.Group();
    mod1Socket.position.set(-0.12, 0.08, 0.05);
    weaponPivot.add(mod1Socket);

    const mod2Socket = new THREE.Group();
    mod2Socket.position.set(-0.24, 0.08, 0.05);
    weaponPivot.add(mod2Socket);

    let currentCharmMesh = null;
    let charmLoadGen = 0;
    const modLoadGen = { 1: 0, 2: 0 };
    let currentMod1Mesh = null;
    let currentMod2Mesh = null;

    // Charm Spring Physics Simulation State
    const charmPhysics = {
        angleX: 0,
        angleZ: 0,
        velX: 0,
        velZ: 0,
        stiffness: 42.0,
        damping: 4.8
    };

    function triggerCharmSpringImpulse(intensity = 1.0) {
        charmPhysics.velX += (Math.random() - 0.5) * 1.8 * intensity;
        charmPhysics.velZ += (Math.random() - 0.5) * 1.8 * intensity;
    }

    async function loadWeaponAsset(archetypeId, skinItemdefId) {
        const gen = ++weaponLoadGen;
        applyCharmSocket(archetypeId);
        const isFinish = isMaterialFinish(skinItemdefId);
        let url = (!isFinish && WEAPON_SKIN_GLB_MAP[String(skinItemdefId)]) || WEAPON_ARCHETYPE_GLBS[archetypeId] || FALLBACK_WEAPON_GLB;

        try {
            let gltf;
            try {
                gltf = await loadArmoryGltfCached(gltfLoader, url);
            } catch {
                // Fallback to GG1 if archetype or skin GLB is not authored yet
                gltf = await loadArmoryGltfCached(gltfLoader, FALLBACK_WEAPON_GLB);
            }
            if (gen !== weaponLoadGen) return;

            if (currentWeaponMesh) {
                weaponPivot.remove(currentWeaponMesh);
                disposeWeaponSheen(currentWeaponMesh);
                disposeWeaponMaterialFinish(currentWeaponMesh);
            }

            const model = gltf.scene.clone(true);
            if (isFinish) {
                applyWeaponMaterialFinish(model, skinItemdefId);
            }
            tintWeapon(model, currentSheenColor);
            // Normalize weapon scale for prominent bench inspection
            const bbox = new THREE.Box3().setFromObject(model);
            const size = bbox.getSize(new THREE.Vector3());
            const scale = getWeaponScaleForBounds(size, archetypeId, 'armory');
            model.scale.setScalar(scale);
            const calibration = getWeaponCalibration(archetypeId, 'armory');
            model.rotation.fromArray(calibration.rotation);

            // Center geometry inside pivot
            bbox.setFromObject(model);
            const center = bbox.getCenter(new THREE.Vector3());
            model.position.sub(center);

            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    if (child.material) {
                        child.material.roughness = Math.min(child.material.roughness ?? 0.5, 0.7);
                        child.material.metalness = Math.max(child.material.metalness ?? 0.5, 0.4);
                    }
                }
            });

            currentWeaponMesh = model;
            weaponPivot.add(model);
            applyWeaponSheen();
            triggerCharmSpringImpulse(1.2);
        } catch (err) {
            console.warn('[armoryScene] Failed to load weapon model:', err);
        }
    }

    async function loadCharmAsset(charmItemdefId) {
        const gen = ++charmLoadGen;
        if (!charmItemdefId || !CHARM_GLB_MAP[String(charmItemdefId)]) {
            if (currentCharmMesh) {
                charmSocket.remove(currentCharmMesh);
                currentCharmMesh = null;
            }
            return;
        }

        const url = CHARM_GLB_MAP[String(charmItemdefId)];
        try {
            const gltf = await loadArmoryGltfCached(gltfLoader, url);
            if (gen !== charmLoadGen) return;
            if (currentCharmMesh) charmSocket.remove(currentCharmMesh);

            const model = gltf.scene.clone(true);
            const bbox = new THREE.Box3().setFromObject(model);
            const maxDim = Math.max(bbox.getSize(new THREE.Vector3()).length(), 0.001);
            model.scale.setScalar((0.18 / maxDim) * (charmSocket.userData.archetype ? charmSocket.scale.x : 1));
            // Offset comes from this charm's own scaled geometry, so each one
            // hangs from its own top edge instead of sharing one constant.
            model.updateMatrixWorld(true);
            model.position.fromArray(resolveCharmModelOffset(new THREE.Box3().setFromObject(model)));

            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                }
            });

            currentCharmMesh = model;
            charmSocket.add(model);
            triggerCharmSpringImpulse(2.0);
        } catch (err) {
            console.warn('[armoryScene] Failed to load charm:', err);
        }
    }

    async function loadModAsset(slot, modItemdefId) {
        const gen = ++modLoadGen[slot];
        const socket = slot === 2 ? mod2Socket : mod1Socket;
        const current = slot === 2 ? currentMod2Mesh : currentMod1Mesh;

        if (!modItemdefId || !MOD_GLB_MAP[String(modItemdefId)]) {
            if (current) socket.remove(current);
            if (slot === 2) currentMod2Mesh = null;
            else currentMod1Mesh = null;
            return;
        }

        const url = MOD_GLB_MAP[String(modItemdefId)];
        try {
            const gltf = await loadArmoryGltfCached(gltfLoader, url);
            if (gen !== modLoadGen[slot]) return;
            if (slot === 2 && currentMod2Mesh) mod2Socket.remove(currentMod2Mesh);
            if (slot === 1 && currentMod1Mesh) mod1Socket.remove(currentMod1Mesh);

            const model = gltf.scene.clone(true);
            const bbox = new THREE.Box3().setFromObject(model);
            const maxDim = Math.max(bbox.getSize(new THREE.Vector3()).length(), 0.001);
            model.scale.setScalar(0.14 / maxDim); // Modular chip scale

            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                }
            });

            if (slot === 2) {
                currentMod2Mesh = model;
                mod2Socket.add(model);
            } else {
                currentMod1Mesh = model;
                mod1Socket.add(model);
            }
        } catch (err) {
            console.warn('[armoryScene] Failed to load mod asset:', err);
        }
    }

    // ── Turntable Mouse / Touch Drag Controls ────────────────
    let isDraggingWeapon = false;
    let isDraggingOperator = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    function onPointerDown(e) {
        const rect = canvas.getBoundingClientRect();
        const normX = (e.clientX - rect.left) / rect.width;
        if (normX > 0.4) {
            isDraggingWeapon = true;
        } else {
            isDraggingOperator = true;
        }
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
    }

    function onPointerMove(e) {
        const dx = e.clientX - prevMouseX;
        const dy = e.clientY - prevMouseY;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;

        if (isDraggingWeapon) {
            weaponPivot.rotation.y += dx * 0.012;
            weaponPivot.rotation.x = Math.max(-0.4, Math.min(0.4, weaponPivot.rotation.x + dy * 0.008));
            triggerCharmSpringImpulse(Math.hypot(dx, dy) * 0.15);
        } else if (isDraggingOperator && currentOverlay?.root) {
            currentOverlay.root.rotation.y += dx * 0.012;
        }
    }

    function onPointerUp() {
        isDraggingWeapon = false;
        isDraggingOperator = false;
    }

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    function resize() {
        const width = canvas.clientWidth || window.innerWidth;
        const height = canvas.clientHeight || window.innerHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
    }

    window.addEventListener('resize', resize);

    // Initial default load
    await loadOperatorModel('SCOUT');
    await loadWeaponAsset('talon', null);

    let isRunning = true;
    let lastTime = performance.now();
    let idleTimer = 0;

    function animate(now) {
        if (!isRunning) return;
        requestAnimationFrame(animate);

        const dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;
        idleTimer += dt;

        // 1. Procedural breathing/sway on operator if not dragging
        if (currentOverlay?.root && !isDraggingOperator) {
            currentOverlay.root.position.y = Math.sin(idleTimer * 1.8) * 0.006;
        }
        if (currentOverlay?.update) {
            // Bench preview is a static idle pose — update() requires a full
            // state object (see src/threeGame.js's call site for the live-combat
            // shape); every field defaults to "not moving, not aiming" here.
            currentOverlay.update(dt, {
                isFalling: false,
                isReloading: false,
                isMoving: false,
                isSprinting: false,
                isInjured: false,
                hasAim: false,
                moveX: 0,
                moveZ: 0,
                aimX: 0,
                aimZ: 1
            });
        }

        // 2. Subtle floating bob & rotation on weapon bench
        if (!isDraggingWeapon) {
            weaponPivot.position.y = Math.sin(idleTimer * 1.4) * 0.012;
            weaponPivot.rotation.y += dt * 0.15; // Slow gentle turntable drift
        }

        // 3. Charm Spring Physics Simulation
        const forceX = -charmPhysics.stiffness * charmPhysics.angleX - charmPhysics.damping * charmPhysics.velX;
        const forceZ = -charmPhysics.stiffness * charmPhysics.angleZ - charmPhysics.damping * charmPhysics.velZ;
        charmPhysics.velX += forceX * dt;
        charmPhysics.velZ += forceZ * dt;
        charmPhysics.angleX += charmPhysics.velX * dt;
        charmPhysics.angleZ += charmPhysics.velZ * dt;

        charmSocket.rotation.x = charmPhysics.angleX;
        charmSocket.rotation.z = charmPhysics.angleZ;

        renderer.render(scene, camera);
    }

    requestAnimationFrame(animate);

    return {
        async setClass(classType, chassisSkinId = null) {
            const cls = String(classType || 'scout').toLowerCase();
            const themeColors = {
                scout: 0x00f0ff,
                tank: 0xff9f1c,
                engineer: 0x10b981
            };
            const accentColor = themeColors[cls] || 0x00f0ff;
            if (rimLight?.color) rimLight.color.setHex(accentColor);
            if (fillLight?.color) fillLight.color.setHex(accentColor);
            if (platRingMat?.color) platRingMat.color.setHex(accentColor);
            if (cornerMat?.color) cornerMat.color.setHex(accentColor);
            if (edgeMat?.color) edgeMat.color.setHex(accentColor);

            await loadOperatorModel(classType, chassisSkinId);
            // updateFromLoadout owns weapon selection; a late operator load must not reset it.
        },
        async setChassisSkin(chassisSkinId, classType = activeClass) {
            await loadOperatorModel(classType, chassisSkinId);
        },
        async setWeapon(archetypeId, skinItemdefId) {
            await loadWeaponAsset(archetypeId, skinItemdefId);
        },
        async setCharm(charmItemdefId) {
            await loadCharmAsset(charmItemdefId);
        },
        async setRigModule(slot, modItemdefId) {
            await loadModAsset(slot, modItemdefId);
        },
        setOperatorPolish(color = 0xffffff) {
            currentPolishColor = color;
            currentOverlay?.setOperatorPolish?.(color);
        },
        setWeaponSheen(color = 0xffffff) {
            currentSheenColor = color;
            applyWeaponSheen();
        },
        setDecal(decalItemdefId) {
            currentDecalId = decalItemdefId || null;
            applyDecalSprite(currentDecalId);
        },
        updateFromLoadout(loadoutManager, classType = activeClass) {
            const cls = String(classType).toLowerCase();
            const lo = loadoutManager.getClassLoadout(cls);
            this.setWeapon(lo.archetypeId, lo.weaponSkinId);
            this.setCharm(lo.charmId);
            this.setRigModule(1, lo.mod1Id);
            this.setRigModule(2, lo.mod2Id);
            this.setDecal(loadoutManager.getEquippedDecalId?.());
        },
        resize,
        dispose() {
            isRunning = false;
            loadGen++;
            weaponLoadGen++;
            charmLoadGen++;
            modLoadGen[1]++;
            modLoadGen[2]++;
            currentOverlay?.dispose?.();
            disposeWeaponSheen(currentWeaponMesh);
            canvas.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('resize', resize);
            renderer.dispose();
        }
    };
}
