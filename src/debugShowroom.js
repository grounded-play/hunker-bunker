import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { createWorld3dModel } from './world3dOverlay.js';
import { assetUrl } from './assetUrl.js';
import { getItemCatalogEntry } from './steamVaultUi.js';
import {
    WEAPON_ARCHETYPES,
    WEAPON_SKIN_MESHES,
    CHARM_GLB_MAP,
    MOD_GLB_MAP,
    CHASSIS_SKIN_GLB_MAP,
    NPC_GLB_MAP,
    CHASSIS_SKIN_ITEMDEFS,
    COSMETIC_DECAL_ITEMDEFS
} from './debugAssetCatalogs.js';

export const SHOWROOM_CHUNK_X = 500;
export const SHOWROOM_CHUNK_Y = 500;
export const SHOWROOM_CHUNK_KEY = `${SHOWROOM_CHUNK_X},${SHOWROOM_CHUNK_Y}`;

// Categorized catalog for exhibition
export const SHOWROOM_CATEGORIES = Object.freeze({
    TACTICAL_PROPS: [
        'base_console',
        'o2_generator',
        'fusion_generator',
        'hull_matrix',
        'radar',
        'prop_ammo_crate_stack',
        'prop_bunker_supplies',
        'prop_fabricator_workstation',
        'prop_tesla_coil_node',
        'prop_o2_filter_vat',
        'prop_security_barricade',
        'prop_conduit_hub',
        'prop_vital_monitor'
    ],
    BIOMECH_PROPS: [
        'prop_medical_bed',
        'prop_surgical_cart',
        'prop_diagnostic_console',
        'prop_specimen_tank',
        'prop_broken_specimen_tank',
        'prop_biomech_flesh_locker',
        'prop_biomech_incubator',
        'prop_biomech_respirator',
        'prop_biomech_triage_cradle',
        'prop_biomech_neural_synapse',
        'prop_biomech_sphincter_trap',
        'prop_laser_trap_emitter'
    ],
    SETPIECES: [
        'broken_scout_ship',
        'broken_tank_ship',
        'broken_engineer_ship',
        'prop_biomech_arch',
        'prop_cave_queen_throne',
        'prop_cave_bones',
        'storage_locker',
        'frozen_tanker',
        'basic_pile',
        'bunker_junk_rare',
        'bunker_junk_uncommon'
    ],
    WALL_DECALS: [
        'decal_wall_breach',
        'decal_hazard_stripes',
        'decal_biohazard_stencil',
        'decal_meridian_stencil',
        'decal_claw_scratches',
        'decal_bullet_holes',
        'decal_machine_cult_shrine',
        'decal_pod_312_breach',
        'prop_torn_warning_poster',
        'decal_scars'
    ],
    FLOOR_DECALS: [
        'decal_oil_spill_patch',
        'decal_footprints_mud',
        'decal_tallow_symbol',
        'decal_bio_sample_spill',
        'decal_childlike_cave_map',
        'decal_hive_growth',
        'decal_spore_growth_patch',
        'decal_abandoned_meal_tray',
        'decal_failed_decon_kit',
        'decal_worker_sleep_roll',
        'decal_emergency_oxygen_nest',
        'decal_maintenance_shrine',
        'decal_barricade_last_stand'
    ],
    ENEMIES: [
        'cryosnail',
        'sporesnail',
        'alien_proto_crawler',
        'alien_proto_spitter',
        'boss_cybersnail',
        'boss_cryosnail',
        'boss_sporesnail',
        'boss_corrupted_scout',
        'boss_corrupted_tank',
        'boss_corrupted_engineer',
        'fungal_spore_vent',
        'mycelium_stalker',
        'bio_charger',
        'spore_mortar'
    ],
    // Season 0 economy — added so the showroom covers the full 60-item catalog, not just
    // world dressing/enemies (docs/game-audit-lane-split-and-worklog.md §4). Category lists
    // come from src/debugAssetCatalogs.js, shared with src/debugMuseum.js, so both galleries
    // stay in sync as new Season 0 items land.
    WEAPON_ARCHETYPES: Object.keys(WEAPON_ARCHETYPES),
    WEAPON_SKINS: Object.keys(WEAPON_SKIN_MESHES),
    WEAPON_CHARMS: Object.keys(CHARM_GLB_MAP),
    RIG_OVERCLOCK_MODS: Object.keys(MOD_GLB_MAP),
    CHASSIS_SKINS: CHASSIS_SKIN_ITEMDEFS,
    COSMETIC_PLAYER_DECALS: COSMETIC_DECAL_ITEMDEFS
});

// Helper to create a text sprite label in 3D world
function createLabelSprite(text, { color = '#00f0ff', bgColor = 'rgba(10, 16, 26, 0.85)', size = 48 } = {}) {
    if (typeof document === 'undefined') return new THREE.Group();
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Group();

    ctx.fillStyle = bgColor;
    ctx.roundRect(8, 8, 496, 112, 16);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.roundRect(8, 8, 496, 112, 16);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.font = `bold ${size}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.toUpperCase(), 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(2.4, 0.6, 1);
    return sprite;
}

// Isolated GLTF loader for Season 0 economy items (weapon archetypes/skins, charms, mods) —
// separate from threeGame.js's own loaders since this file is a standalone dev tool. Caches
// by URL so repeated showroom rebuilds don't re-fetch the same .glb.
let _showroomGltfLoader = null;
const _showroomGltfCache = new Map();
function getShowroomGltfLoader() {
    if (!_showroomGltfLoader) _showroomGltfLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    return _showroomGltfLoader;
}
async function loadShowroomGlb(url) {
    // Node's URL/fetch (undici) can't resolve the site-root-relative paths assetUrl()
    // returns without a document.baseURI to resolve against — every showroom GLB fails
    // this way under vitest, logging a scary "Invalid URL" stack per item even though
    // it's expected and harmless (matches makeIconPlaneSprite's guard below). Skip the
    // attempt entirely outside a real browser instead of throwing-and-catching per item.
    if (!url || typeof document === 'undefined') return null;
    if (!_showroomGltfCache.has(url)) {
        _showroomGltfCache.set(url, getShowroomGltfLoader().loadAsync(assetUrl(url)).catch((err) => {
            _showroomGltfCache.delete(url);
            throw err;
        }));
    }
    const gltf = await _showroomGltfCache.get(url);
    const model = gltf.scene.clone(true);
    const bbox = new THREE.Box3().setFromObject(model);
    const size = bbox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    model.scale.setScalar(1.3 / maxDim);
    return model;
}
function makeIconPlaneSprite(iconPath) {
    if (!iconPath || typeof document === 'undefined') return null;
    try {
        const texture = new THREE.TextureLoader().load(assetUrl(iconPath));
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
        sprite.scale.set(1.4, 1.4, 1);
        return sprite;
    } catch (err) {
        console.warn('[Showroom] Failed loading icon plane:', iconPath, err);
        return null;
    }
}

// Debug-only wall display. The production createScatterInstance() intentionally
// snaps to a world tile boundary (x/z +/- 0.5). A showroom panel is already a
// self-contained wall, so using that tile offset would place the decal behind
// or in front of the panel depending on orientation. Mount directly on the
// panel face while preserving the production wall-normal rotation convention.
export function createDebugWallDecalDisplay(game, type, {
    width = 1.54,
    panelWidth = 2.4,
    panelHeight = 2.6,
    panelDepth = 0.2,
    panelColor = 0x1b2838,
    wallNormal = { x: 0, z: 1 }
} = {}) {
    const group = new THREE.Group();
    group.name = `DebugWallDecal:${type}`;

    const panel = new THREE.Mesh(
        new THREE.BoxGeometry(panelWidth, panelHeight, panelDepth),
        new THREE.MeshStandardMaterial({ color: panelColor, roughness: 0.7, metalness: 0.3 })
    );
    panel.position.y = panelHeight * 0.5;
    group.add(panel);

    const texture = game?.scatterTextures?.[type] || game?.scatterMaterials?.[type]?.map;
    if (!texture) return group;

    const material = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.04,
        roughness: 0.85,
        metalness: 0.12,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(width, width), material);
    // The debug panel faces into the stall. Keep the same normal convention as
    // createScatterInstance: N +Z, S -Z, E -X, W +X.
    const normal = wallNormal;
    decal.position.set(normal.x * (panelDepth * 0.5 + 0.012), panelHeight * 0.48, normal.z * (panelDepth * 0.5 + 0.012));
    decal.rotation.y = Math.atan2(normal.x, normal.z);
    decal.renderOrder = 6;
    decal.userData = { isWallDecal: true, type };
    group.add(decal);
    return group;
}

// Builds the entire Showroom at (SHOWROOM_CHUNK_X, SHOWROOM_CHUNK_Y)
export async function buildShowroomScene(threeGame) {
    const root = new THREE.Group();
    root.name = 'debug-showroom-root';

    const chunkSize = threeGame.chunkSize || 19;
    const originX = SHOWROOM_CHUNK_X * chunkSize;
    const originZ = SHOWROOM_CHUNK_Y * chunkSize;

    // Floor base — enlarged from the original 160 to fit the added Season 0 economy
    // categories (~50 more stalls) without running off the edge.
    const floorSize = 320;
    const floorGeo = new THREE.PlaneGeometry(floorSize, floorSize, 80, 80);
    const floorMat = new THREE.MeshStandardMaterial({
        color: 0x0a101a,
        roughness: 0.35,
        metalness: 0.8,
        wireframe: false
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(originX + floorSize * 0.5, 0, originZ + floorSize * 0.5);
    floor.receiveShadow = true;
    root.add(floor);

    // Subtle showroom grid lines
    const gridHelper = new THREE.GridHelper(floorSize, 80, 0x00f0ff, 0x1a3d8f);
    gridHelper.position.set(originX + floorSize * 0.5, 0.01, originZ + floorSize * 0.5);
    root.add(gridHelper);

    // Welcome banner at entrance
    const welcomeLabel = createLabelSprite('DEBUG VALIDATION GALLERY // CHUNK (500,500)', { color: '#00f0ff', size: 36 });
    welcomeLabel.position.set(originX + 10, 3.2, originZ + 10);
    root.add(welcomeLabel);

    const navHelpLabel = createLabelSprite('4-WALL ORIENTATION: N(0°) S(180°) E(90°) W(270°)', { color: '#ffd000', size: 32 });
    navHelpLabel.position.set(originX + 10, 2.4, originZ + 10);
    root.add(navHelpLabel);

    // Spacing between individual exhibition stalls
    const STALL_SIZE = 8; // 8x8 meter room per prop
    const STALLS_PER_ROW = 6;

    const allItems = [
        ...SHOWROOM_CATEGORIES.TACTICAL_PROPS.map((id) => ({ id, type: 'prop', category: 'TACTICAL' })),
        ...SHOWROOM_CATEGORIES.BIOMECH_PROPS.map((id) => ({ id, type: 'prop', category: 'BIOMECH' })),
        ...SHOWROOM_CATEGORIES.SETPIECES.map((id) => ({ id, type: 'prop', category: 'SETPIECE' })),
        ...SHOWROOM_CATEGORIES.WALL_DECALS.map((id) => ({ id, type: 'wall_decal', category: 'WALL_DECAL' })),
        ...SHOWROOM_CATEGORIES.FLOOR_DECALS.map((id) => ({ id, type: 'floor_decal', category: 'FLOOR_DECAL' })),
        ...SHOWROOM_CATEGORIES.ENEMIES.map((id) => ({ id, type: 'enemy', category: 'ENEMY' })),
        ...SHOWROOM_CATEGORIES.WEAPON_ARCHETYPES.map((id) => ({ id, type: 'weapon_glb', category: 'WEAPON', glbUrl: WEAPON_ARCHETYPES[id] })),
        ...SHOWROOM_CATEGORIES.WEAPON_SKINS.map((id) => ({ id, type: 'weapon_glb', category: 'WEAPON_SKIN', glbUrl: WEAPON_SKIN_MESHES[id] })),
        ...SHOWROOM_CATEGORIES.WEAPON_CHARMS.map((id) => ({ id, type: 'weapon_glb', category: 'CHARM', glbUrl: CHARM_GLB_MAP[id] })),
        ...SHOWROOM_CATEGORIES.RIG_OVERCLOCK_MODS.map((id) => ({ id, type: 'weapon_glb', category: 'MOD', glbUrl: MOD_GLB_MAP[id] })),
        ...SHOWROOM_CATEGORIES.CHASSIS_SKINS.map((id) => ({
            id: getItemCatalogEntry(id)?.name ?? id,
            type: CHASSIS_SKIN_GLB_MAP[id] ? 'weapon_glb' : 'icon_plane',
            category: 'CHASSIS',
            itemdefid: id,
            glbUrl: CHASSIS_SKIN_GLB_MAP[id]
        })),
        ...Object.entries(NPC_GLB_MAP).map(([key, url]) => ({
            id: `NPC: ${key.toUpperCase()}`,
            type: 'weapon_glb',
            category: 'NPC',
            glbUrl: url
        })),
        ...SHOWROOM_CATEGORIES.COSMETIC_PLAYER_DECALS.map((id) => ({ id: getItemCatalogEntry(id)?.name ?? id, type: 'icon_plane', category: 'DECAL', itemdefid: id }))
    ];

    const sampleWallMat = new THREE.MeshStandardMaterial({
        color: 0x1b2838,
        roughness: 0.7,
        metalness: 0.3
    });

    for (let i = 0; i < allItems.length; i++) {
        const item = allItems[i];
        const col = i % STALLS_PER_ROW;
        const row = Math.floor(i / STALLS_PER_ROW);

        const stallCenterX = originX + 12 + col * (STALL_SIZE + 4);
        const stallCenterZ = originZ + 18 + row * (STALL_SIZE + 4);

        // Stall boundaries (subtle perimeter box)
        const boxGeo = new THREE.BoxGeometry(STALL_SIZE, 0.1, STALL_SIZE);
        const boxMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.35 });
        const box = new THREE.Mesh(boxGeo, boxMat);
        box.position.set(stallCenterX, 0.05, stallCenterZ);
        root.add(box);

        // Stall title banner
        const stallLabel = createLabelSprite(item.id, {
            color: item.type === 'enemy' ? '#ff007f' : (item.type.includes('decal') ? '#ffd000' : '#00f0ff'),
            size: 30
        });
        stallLabel.position.set(stallCenterX, 3.0, stallCenterZ - STALL_SIZE * 0.5 + 0.5);
        root.add(stallLabel);

        // Wall offsets: N, S, E, W, and Center Pedestal
        const WALL_DIST = STALL_SIZE * 0.38;
        const placements = [
            { name: 'N', x: stallCenterX, z: stallCenterZ - WALL_DIST, yaw: 0, nx: 0, nz: 1 }, // North wall, faces South
            { name: 'S', x: stallCenterX, z: stallCenterZ + WALL_DIST, yaw: Math.PI, nx: 0, nz: -1 }, // South wall, faces North
            { name: 'E', x: stallCenterX + WALL_DIST, z: stallCenterZ, yaw: -Math.PI / 2, nx: -1, nz: 0 }, // East wall, faces West
            { name: 'W', x: stallCenterX - WALL_DIST, z: stallCenterZ, yaw: Math.PI / 2, nx: 1, nz: 0 }, // West wall, faces East
            { name: 'CTR', x: stallCenterX, z: stallCenterZ, yaw: 0, nx: 0, nz: 1 } // Center pedestal
        ];

        for (const p of placements) {
            // Directional indicator floor arrow
            const markerGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.04, 16);
            const markerMat = new THREE.MeshBasicMaterial({
                color: p.name === 'CTR' ? 0xffd000 : 0x00ff66,
                transparent: true,
                opacity: 0.6
            });
            const marker = new THREE.Mesh(markerGeo, markerMat);
            marker.position.set(p.x, 0.02, p.z);
            root.add(marker);

            // Small text tag for wall direction
            const dirLabel = createLabelSprite(`${p.name}`, { color: '#ffffff', size: 28 });
            dirLabel.scale.set(0.8, 0.2, 1);
            dirLabel.position.set(p.x, 0.2, p.z + (p.name === 'N' ? 0.6 : -0.6));
            root.add(dirLabel);

            if (item.type === 'prop') {
                try {
                    const modelGroup = await (threeGame?.createWorld3dModel ? threeGame.createWorld3dModel(item.id) : createWorld3dModel(item.id));
                    if (modelGroup) {
                        modelGroup.position.set(p.x, 0, p.z);
                        modelGroup.rotation.y = p.yaw;
                        root.add(modelGroup);
                    }
                } catch (err) {
                    console.warn(`[Showroom] Failed loading prop: ${item.id}`, err);
                }
            } else if (item.type === 'enemy') {
                const enemyMesh = threeGame.createScatterMesh?.(item.id, p.x, p.z)
                    ?? threeGame.createEnemySpriteMesh?.(item.id);
                if (enemyMesh) {
                    enemyMesh.position.set(p.x, 0, p.z);
                    enemyMesh.rotation.y = p.yaw;
                    root.add(enemyMesh);
                }
            } else if (item.type === 'wall_decal') {
                // Exhibition wall panel for mounting the decal
                const wallPanelGeo = new THREE.BoxGeometry(2.4, 2.6, 0.2);
                const wallPanel = new THREE.Mesh(wallPanelGeo, sampleWallMat);
                wallPanel.position.set(p.x, 1.3, p.z);
                wallPanel.rotation.y = p.yaw;
                root.add(wallPanel);

                const texture = threeGame.scatterTextures?.[item.id]
                    || threeGame.scatterMaterials?.[item.id]?.map;
                if (texture) {
                    const decalMaterial = new THREE.MeshStandardMaterial({
                        map: texture,
                        transparent: true,
                        alphaTest: 0.04,
                        roughness: 0.85,
                        metalness: 0.12,
                        polygonOffset: true,
                        polygonOffsetFactor: -4,
                        polygonOffsetUnits: -4,
                        side: THREE.DoubleSide,
                        depthWrite: false
                    });
                    const decal = new THREE.Mesh(new THREE.PlaneGeometry(1.54, 1.54), decalMaterial);
                    const faceOffset = 0.1 + 0.012;
                    decal.position.set(p.x + p.nx * faceOffset, 1.3, p.z + p.nz * faceOffset);
                    decal.rotation.y = p.yaw;
                    decal.renderOrder = 6;
                    decal.userData = { isWallDecal: true, type: item.id, wallNormal: { x: p.nx, z: p.nz } };
                    root.add(decal);
                }
            } else if (item.type === 'floor_decal') {
                const floorInstance = threeGame.createScatterInstance?.({
                    type: item.id,
                    x: p.x,
                    z: p.z,
                    scale: 1.2,
                    rotation: p.yaw,
                    elevation: 0.035
                });
                if (floorInstance) {
                    root.add(floorInstance);
                }
            } else if (item.type === 'weapon_glb' && p.name === 'CTR') {
                // Single center pedestal only — a floating weapon/charm model doesn't need
                // the 4-wall repeat that decals use to show different mount orientations.
                try {
                    const model = await loadShowroomGlb(item.glbUrl);
                    if (model) {
                        model.position.set(p.x, 1.0, p.z);
                        root.add(model);
                    }
                } catch (err) {
                    console.warn(`[Showroom] Failed loading GLB: ${item.id}`, err);
                }
            } else if (item.type === 'icon_plane' && p.name === 'CTR') {
                const catalog = getItemCatalogEntry(item.itemdefid);
                const sprite = makeIconPlaneSprite(catalog?.localImg || catalog?.img);
                if (sprite) {
                    sprite.position.set(p.x, 1.4, p.z);
                    root.add(sprite);
                }
            }
        }
    }

    // Showroom Lighting (clean, bright studio lighting)
    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    root.add(ambient);

    const dirLight1 = new THREE.DirectionalLight(0x00f0ff, 0.8);
    dirLight1.position.set(originX + 20, 40, originZ + 20);
    root.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffd000, 0.6);
    dirLight2.position.set(originX + 80, 40, originZ + 80);
    root.add(dirLight2);

    return {
        root,
        spawnX: originX + 10,
        spawnZ: originZ + 10
    };
}
