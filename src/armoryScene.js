import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { assetUrl } from './assetUrl.js';
import { createPlayer3dOverlay, WEAPON_ARCHETYPES, WEAPON_SKIN_MESHES } from './player3dOverlay.js';
import { DEFAULT_ARCHETYPES } from './loadout.js';

const CHARM_GLB_MAP = Object.freeze({
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

const MOD_GLB_MAP = Object.freeze({
    '4140': '/3d/runtime/new3ds/mod_cryo_capacitor.glb',
    '4141': '/3d/runtime/new3ds/mod_magnetic_scavenger.glb',
    // 4142/4143/4144 — same Hyper3D Rodin generation as 4137/4138 above.
    '4142': '/3d/runtime/new3ds/mod_bio_hazard_filter.glb',
    '4143': '/3d/runtime/new3ds/mod_kinetic_impact.glb',
    '4144': '/3d/runtime/new3ds/mod_thermal_heat_exchanger.glb',
    '4147': '/3d/runtime/new3ds/mod_zero_point_flux.glb'
});

// Weapon archetype/skin GLB paths come from src/player3dOverlay.js — the same maps that
// drive the in-combat held weapon — so the Armory bench preview can never drift out of
// sync with what actually renders in a run (this file used to keep its own stale copy;
// see docs/armory-and-class-weapons-worklog.md).
const WEAPON_SKIN_GLB_MAP = WEAPON_SKIN_MESHES;
const WEAPON_ARCHETYPE_GLBS = WEAPON_ARCHETYPES;
const FALLBACK_WEAPON_GLB = WEAPON_ARCHETYPES.gg1;

export async function createArmoryScene(canvas) {
    if (!canvas) throw new Error('Armory scene requires a canvas element');

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true });
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, 2));
    renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060b13);
    scene.fog = new THREE.FogExp2(0x060b13, 0.055);

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
    benchSpot.position.set(1.2, 3.2, 1.5);
    benchSpot.target.position.set(1.1, 1.15, 0);
    scene.add(benchSpot);
    scene.add(benchSpot.target);

    const rimLight = new THREE.PointLight(0x00f0ff, 2.8, 6.0);
    rimLight.position.set(-1.8, 2.2, -1.0);
    scene.add(rimLight);

    // ── Subterranean Bunker Environment Geometry ─────────────
    const envGroup = new THREE.Group();

    // Metallic Floor
    const floorGeo = new THREE.PlaneGeometry(16, 16, 8, 8);
    const floorMat = new THREE.MeshStandardMaterial({
        color: 0x121820,
        roughness: 0.75,
        metalness: 0.65
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    envGroup.add(floor);

    // Grated Floor Trim
    const gridHelper = new THREE.GridHelper(16, 32, 0x00e5ff, 0x1c2d3d);
    gridHelper.position.y = 0.002;
    envGroup.add(gridHelper);

    // Back Staging Wall
    const wallGeo = new THREE.PlaneGeometry(18, 8);
    const wallMat = new THREE.MeshStandardMaterial({
        color: 0x0d141d,
        roughness: 0.85,
        metalness: 0.5
    });
    const backWall = new THREE.Mesh(wallGeo, wallMat);
    backWall.position.set(0, 3.5, -2.5);
    backWall.receiveShadow = true;
    envGroup.add(backWall);

    // Magnetic Weapon Wall Mounting Panel (Right / Center-Right)
    const rackPanelGeo = new THREE.BoxGeometry(2.4, 1.3, 0.12);
    const rackPanelMat = new THREE.MeshStandardMaterial({
        color: 0x182433,
        roughness: 0.4,
        metalness: 0.85
    });
    const rackPanel = new THREE.Mesh(rackPanelGeo, rackPanelMat);
    rackPanel.position.set(1.1, 1.25, -0.6);
    rackPanel.castShadow = true;
    rackPanel.receiveShadow = true;
    envGroup.add(rackPanel);

    // Glowing Neon Guideline on Rack
    const neonLineGeo = new THREE.BoxGeometry(2.3, 0.02, 0.02);
    const neonLineMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const neonLine = new THREE.Mesh(neonLineGeo, neonLineMat);
    neonLine.position.set(1.1, 0.65, -0.53);
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

    async function loadOperatorModel(classType) {
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

        try {
            const overlay = await createPlayer3dOverlay(configs[normalized] || configs.SCOUT);
            if (gen !== loadGen) return;
            currentOverlay = overlay;
            overlay.root.rotation.y = 0.35; // Angle slightly toward center weapon bench
            operatorGroup.add(overlay.root);
        } catch (err) {
            console.warn('[armoryScene] Failed loading operator overlay:', err);
        }
    }

    // ── Weapon Workbench Group (Center / Right) ──────────────
    const weaponBenchGroup = new THREE.Group();
    weaponBenchGroup.position.set(1.1, 1.25, -0.45);
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
                gltf = await gltfLoader.loadAsync(assetUrl(url));
            } catch {
                // Fallback to GG1 if archetype or skin GLB is not authored yet
                gltf = await gltfLoader.loadAsync(assetUrl(FALLBACK_WEAPON_GLB));
            }
            if (gen !== weaponLoadGen) return;

            if (currentWeaponMesh) {
                weaponPivot.remove(currentWeaponMesh);
            }

            const model = gltf.scene;
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
            const gltf = await gltfLoader.loadAsync(assetUrl(url));
            if (currentCharmMesh) charmSocket.remove(currentCharmMesh);

            const model = gltf.scene;
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
            const gltf = await gltfLoader.loadAsync(assetUrl(url));
            if (slot === 2 && currentMod2Mesh) mod2Socket.remove(currentMod2Mesh);
            if (slot === 1 && currentMod1Mesh) mod1Socket.remove(currentMod1Mesh);

            const model = gltf.scene;
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
        async setClass(classType) {
            await loadOperatorModel(classType);
            const defaultArch = DEFAULT_ARCHETYPES[classType.toLowerCase()] || 'talon';
            await loadWeaponAsset(defaultArch, null);
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
        updateFromLoadout(loadoutManager, classType = activeClass) {
            const cls = String(classType).toLowerCase();
            const lo = loadoutManager.getClassLoadout(cls);
            this.setWeapon(lo.archetypeId, lo.weaponSkinId);
            this.setCharm(lo.charmId);
            this.setRigModule(1, lo.mod1Id);
            this.setRigModule(2, lo.mod2Id);
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
