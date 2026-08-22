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
import { DEFAULT_ARCHETYPES } from './loadout.js';
import { getItemCatalogEntry } from './steamVaultUi.js';

export const CHARM_GLB_MAP = Object.freeze({
    '4130': '/3d/runtime/new3ds/charm_mini_cryo_core.glb',
    '4131': '/3d/runtime/new3ds/charm_spent_50cal.glb',
    '4132': '/3d/runtime/new3ds/charm_sporesnail_pearl.glb',
    '4133': '/3d/runtime/new3ds/charm_trench_whistle.glb',
    '4134': '/3d/runtime/new3ds/charm_glitched_ram.glb',
    '4135': '/3d/runtime/new3ds/charm_geodetic_compass.glb',
    '4136': '/3d/runtime/new3ds/charm_mini_drone_bobble.glb',
    // 4137/4138: Hyper3D Rodin AI-generated via Blender MCP (docs/season-zero-protocol/08 §5
    // item 1) — same generation pipeline as the rest of this map, textured, matching quality.
    '4137': '/3d/runtime/new3ds/charm_amber_bio_flask.glb',
    '4138': '/3d/runtime/new3ds/charm_dark_matter.glb',
    '4139': '/3d/runtime/new3ds/charm_golden_sub_bunker_key.glb'
});

export const MOD_GLB_MAP = Object.freeze({
    '4140': '/3d/runtime/new3ds/mod_cryo_capacitor.glb',
    '4141': '/3d/runtime/new3ds/mod_magnetic_scavenger.glb',
    // 4142/4143/4144 — same Hyper3D Rodin generation as 4137/4138 above.
    '4142': '/3d/runtime/new3ds/mod_bio_hazard_filter.glb',
    '4143': '/3d/runtime/new3ds/mod_kinetic_impact.glb',
    '4144': '/3d/runtime/new3ds/mod_thermal_heat_exchanger.glb',
    '4145': '/3d/runtime/new3ds/mod_echo_location_transceiver.glb',
    '4146': '/3d/runtime/new3ds/mod_symbiotic_adrenaline_pump.glb',
    '4147': '/3d/runtime/new3ds/mod_zero_point_flux.glb'
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
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.FogExp2(0x060b13, 0.025);

    const camera = new THREE.PerspectiveCamera(40, (canvas.clientWidth || window.innerWidth) / (canvas.clientHeight || window.innerHeight), 0.1, 50);
    camera.position.set(0.15, 1.45, 4.4);
    camera.lookAt(0.1, 1.15, 0);

    // ── Bunker Lighting ──────────────────────────────────────
    const hemiLight = new THREE.HemisphereLight(0x406080, 0x0a1018, 1.8);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xd0e8ff, 3.2);
    keyLight.position.set(3.5, 5.0, 4.0);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x00e5ff, 1.4);
    fillLight.position.set(-4.0, 2.5, 2.0);
    scene.add(fillLight);

    const benchSpot = new THREE.SpotLight(0xfff0dd, 4.5, 8.0, Math.PI / 4, 0.4, 1.2);
    benchSpot.position.set(1.2, 3.6, 1.7);
    // Tracks weaponBenchGroup's new (1.05, 1.85, -0.05) position below --
    // docs/armory-layout-and-cosmetic-preview-plan-2026-08-19.md #1.
    benchSpot.target.position.set(1.05, 1.85, -0.05);
    scene.add(benchSpot);
    scene.add(benchSpot.target);

    const rimLight = new THREE.PointLight(0x00f0ff, 2.8, 6.0);
    rimLight.position.set(-1.8, 2.2, -1.0);
    scene.add(rimLight);

    // ── Subterranean Bunker Environment Geometry ─────────────
    // Opaque backdrop wall and floor are removed so the transparent WebGL canvas
    // allows the rich per-class background concept art (armory_bg_scout/tank/engineer)
    // on #armory-screen to show through behind the 3D operator and weapon models.
    const envGroup = new THREE.Group();

    // Magnetic Weapon Wall Mounting Panel (Right / Center-Right)
    // Raised and pushed back from its original (1.1, 1.25, -0.6) --
    // docs/armory-layout-and-cosmetic-preview-plan-2026-08-19.md #1/#2:
    // at the old position the gun (scaled to a 1.15-unit prominent size,
    // continuously auto-rotating via weaponPivot.rotation.y) sat only 0.15
    // units in front of this panel's own 0.12-unit-thick front face --
    // nowhere near its own ~0.575-unit half-extent, so it clipped into the
    // panel at most rotation angles. Raised to track the gun's new height
    // (see weaponBenchGroup below) and moved back in Z to restore real
    // clearance once the gun itself also moves forward.
    const rackPanelGeo = new THREE.BoxGeometry(2.4, 1.3, 0.12);
    const rackPanelMat = new THREE.MeshStandardMaterial({
        color: 0x182433,
        roughness: 0.4,
        metalness: 0.85
    });
    const rackPanel = new THREE.Mesh(rackPanelGeo, rackPanelMat);
    rackPanel.position.set(1.1, 1.7, -1.0);
    rackPanel.castShadow = true;
    rackPanel.receiveShadow = true;
    envGroup.add(rackPanel);

    // Glowing Neon Guideline on Rack -- kept at the same relative offset from
    // rackPanel (0.6 below, 0.07 toward camera from its front face) it had
    // before the panel moved.
    const neonLineGeo = new THREE.BoxGeometry(2.3, 0.02, 0.02);
    const neonLineMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const neonLine = new THREE.Mesh(neonLineGeo, neonLineMat);
    neonLine.position.set(1.1, 1.1, -0.93);
    envGroup.add(neonLine);

    // Operator Hexagonal Turntable Platform (Left)
    const platGeo = new THREE.CylinderGeometry(0.85, 0.95, 0.12, 6);
    const platMat = new THREE.MeshStandardMaterial({
        color: 0x1a2636,
        roughness: 0.5,
        metalness: 0.8
    });
    const platform = new THREE.Mesh(platGeo, platMat);
    platform.position.set(-1.15, 0.06, 0.1);
    platform.receiveShadow = true;
    envGroup.add(platform);

    const platRingGeo = new THREE.RingGeometry(0.78, 0.82, 6);
    const platRingMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, side: THREE.DoubleSide });
    const platRing = new THREE.Mesh(platRingGeo, platRingMat);
    platRing.rotation.x = -Math.PI / 2;
    platRing.position.set(-1.15, 0.125, 0.1);
    envGroup.add(platRing);

    scene.add(envGroup);

    // ── Operator Turntable Group (Left) ──────────────────────
    const operatorGroup = new THREE.Group();
    operatorGroup.position.set(-1.15, 0.12, 0.1);
    scene.add(operatorGroup);

    let currentOverlay = null;
    let activeClass = 'SCOUT';
    let loadGen = 0;

    // Operator Polish (colorway) and the shoulder-patch decal are both real,
    // already-shipped systems -- setOperatorPolish() is wired to the in-run
    // player and the title-screen hero preview, and playerDecalSprite renders
    // in-run -- but neither was ever connected to the Armory's own operator
    // preview (docs/armory-layout-and-cosmetic-preview-plan-2026-08-19.md #3).
    // Stored here (not just applied once) because loadOperatorModel rebuilds
    // currentOverlay.root from scratch on every class switch, dropping
    // whatever was applied to the previous instance.
    let currentPolishColor = 0xffffff;
    let currentDecalId = null;
    let decalSprite = null;

    // Chest-mounted, matching src/threeGame.js's playerDecalSprite placement
    // convention (same relative height/forward offset), but each class's real
    // 3D chassis has its own chest bulge/depth (TANK's armor protrudes far
    // more than SCOUT's), and a sprite tested against real mesh depth
    // (depthTest: true, needed so the badge still hides when the operator is
    // rotated to face away) disappears if it sits behind that surface. Anchors
    // tuned per class via live-screenshot iteration rather than one shared
    // offset that only worked for SCOUT.
    const DECAL_ANCHORS = {
        SCOUT: { x: 0.16, y: 1.3, z: 0.14 },
        ENGINEER: { x: 0.16, y: 1.3, z: 0.16 },
        TANK: { x: 0.18, y: 1.38, z: 0.34 }
    };

    function applyDecalSprite(decalId) {
        if (decalSprite) {
            decalSprite.material?.map?.dispose?.();
            decalSprite.material?.dispose?.();
            decalSprite.removeFromParent();
            decalSprite = null;
        }
        if (!decalId || !currentOverlay?.root) return;
        const catalog = getItemCatalogEntry(decalId);
        const iconPath = catalog?.localImg || catalog?.img;
        if (!iconPath) return;
        // normalizeModel() (player3dOverlay.js) scales the raw GLB (exported
        // in centimeter-ish units) up to targetHeight meters via root.scale --
        // confirmed live at ~184.9x for these operator rigs. DECAL_ANCHORS
        // below is expressed in the same "world meters" terms as targetHeight
        // (e.g. chest at y~1.3 out of a ~1.85-1.95 tall operator), so it has
        // to be divided back down by that same factor before being used as a
        // position/scale local to root -- otherwise (as first shipped) the
        // sprite lands ~200 units away in space, nowhere near the model.
        const rootScale = currentOverlay.root.scale.x || 1;
        const anchor = DECAL_ANCHORS[activeClass] || DECAL_ANCHORS.SCOUT;
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
        sprite.center.set(0.5, 0.5);
        sprite.position.set(anchor.x / rootScale, anchor.y / rootScale, anchor.z / rootScale);
        sprite.scale.set(0.16 / rootScale, 0.16 / rootScale, 1);
        sprite.renderOrder = 7;
        new THREE.TextureLoader().load(assetUrl(iconPath), (texture) => {
            sprite.material.map = texture;
            sprite.material.opacity = 1;
            sprite.material.needsUpdate = true;
        });
        currentOverlay.root.add(sprite);
        decalSprite = sprite;
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
        const config = customModel ? { ...baseConfig, modelUrl: customModel } : baseConfig;

        try {
            const overlay = await createPlayer3dOverlay(config);
            if (gen !== loadGen) return;
            currentOverlay = overlay;
            overlay.root.rotation.y = 0.35; // Angle slightly toward center weapon bench
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
    weaponBenchGroup.position.set(1.05, 1.85, -0.05);
    scene.add(weaponBenchGroup);

    // Interactive pivot inside weapon bench
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
    charmSocket.position.set(0.18, -0.05, 0.06);
    weaponPivot.add(charmSocket);

    const mod1Socket = new THREE.Group();
    mod1Socket.position.set(-0.12, 0.08, 0.05);
    weaponPivot.add(mod1Socket);

    const mod2Socket = new THREE.Group();
    mod2Socket.position.set(-0.24, 0.08, 0.05);
    weaponPivot.add(mod2Socket);

    let currentCharmMesh = null;
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
        let url = WEAPON_SKIN_GLB_MAP[String(skinItemdefId)] || WEAPON_ARCHETYPE_GLBS[archetypeId] || FALLBACK_WEAPON_GLB;

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
            }

            const model = gltf.scene.clone(true);
            // Normalize weapon scale for prominent bench inspection
            const bbox = new THREE.Box3().setFromObject(model);
            const size = bbox.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z, 0.001);
            const targetSize = 1.15; // Prominent large presentation
            const scale = targetSize / maxDim;
            model.scale.setScalar(scale);

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
            triggerCharmSpringImpulse(1.2);
        } catch (err) {
            console.warn('[armoryScene] Failed to load weapon model:', err);
        }
    }

    async function loadCharmAsset(charmItemdefId) {
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
            if (currentCharmMesh) charmSocket.remove(currentCharmMesh);

            const model = gltf.scene.clone(true);
            const bbox = new THREE.Box3().setFromObject(model);
            const maxDim = Math.max(bbox.getSize(new THREE.Vector3()).length(), 0.001);
            model.scale.setScalar(0.18 / maxDim); // Trinket scale
            model.position.set(0, -0.05, 0);

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
                engineer: 0x34d399
            };
            const accentColor = themeColors[cls] || 0x00f0ff;
            if (rimLight?.color) rimLight.color.setHex(accentColor);
            if (platRingMat?.color) platRingMat.color.setHex(accentColor);
            if (neonLineMat?.color) neonLineMat.color.setHex(accentColor);

            await loadOperatorModel(classType, chassisSkinId);
            const defaultArch = DEFAULT_ARCHETYPES[cls] || 'talon';
            await loadWeaponAsset(defaultArch, null);
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
            canvas.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('resize', resize);
            renderer.dispose();
        }
    };
}
