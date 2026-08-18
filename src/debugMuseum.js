/**
 * Debug Hallway Museum (docs/game-audit-lane-split-and-worklog.md §4) — a dev-only, straight,
 * uninterrupted corridor that spawns one of every asset/model/decal/prop the game knows about,
 * grouped by category with labeled separators, for fast visual QA. Triggered only via
 * `window.__DEBUG__.openMuseum()`, matching the existing dev-tool console pattern.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { assetUrl } from './assetUrl.js';
import { getItemCatalogEntry } from './steamVaultUi.js';
import { WEAPON_ARCHETYPES, WEAPON_SKIN_MESHES } from './player3dOverlay.js';
import { CHARM_GLB_MAP, MOD_GLB_MAP } from './armoryScene.js';

// Far outside any real generated terrain so the museum never overlaps a real run's chunks.
const MUSEUM_ORIGIN = Object.freeze({ x: 9000, z: 9000 });
const ITEM_SPACING = 2.4;
const CATEGORY_GAP = 5;

// Hand-collected from threeGame.js's isEnemyType() allowlist.
const ENEMY_TYPES = [
    'cybersnail', 'cryosnail', 'sporesnail', 'boss_cybersnail', 'boss_cryosnail',
    'boss_sporesnail', 'sentinel', 'crawler', 'boss_corrupted_scout', 'boss_corrupted_tank',
    'boss_corrupted_engineer', 'alien_proto_crawler', 'alien_proto_spitter', 'boss_queen',
    'fungal_spore_vent', 'mycelium_stalker', 'bio_charger', 'spore_mortar'
];

// Hand-collected from threeGame.js's WALL_DECAL_TYPES set.
const ENVIRONMENTAL_DECAL_TYPES = [
    'decal_wall_breach', 'decal_hazard_stripes', 'decal_biohazard_stencil',
    'decal_meridian_stencil', 'decal_claw_scratches', 'decal_bullet_holes',
    'decal_machine_cult_shrine', 'decal_pod_312_breach', 'prop_torn_warning_poster',
    'decal_scars'
];

// Hand-collected, de-duplicated union of threeGame.js's CRYO/BIO/ACTIVE/SPORE/JUNK scatter
// variant lists (props, ground overlays, biome-specific dressing).
const PROP_AND_OVERLAY_TYPES = [
    'scatter_coolant_puddle', 'scatter_ice_stalagmite', 'scatter_cryo_icicle',
    'scatter_cryo_shards', 'decal_oil_spill_patch', 'decal_footprints_mud',
    'body_human_frozen_suit', 'body_empty_exosuit', 'scatter_bio_pod', 'scatter_bio_moss',
    'scatter_slime_puddle', 'decal_bio_sample_spill', 'decal_spore_growth_patch',
    'decal_hive_growth', 'prop_hive_resin_sac', 'bio_spores', 'bio_spores_blue',
    'bio_spores_amber', 'scatter_gravel', 'scatter_cable_coil', 'scatter_bolts',
    'bunker_junk', 'bunker_junk_uncommon', 'bunker_junk_rare', 'bunker_junk_legendary'
];

// Season 0 chassis skins (itemdefs 4112-4119) and cosmetic decals (4120-4129)
const CHASSIS_SKIN_ITEMDEFS = ['4112', '4113', '4114', '4115', '4116', '4117', '4118', '4119'];
const COSMETIC_DECAL_ITEMDEFS = ['4120', '4121', '4122', '4123', '4124', '4125', '4126', '4127', '4128', '4129'];

function createMuseumGltfLoader() {
    return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
}

function makeLabelSprite(text, { color = '#e2e8f0', fontSize = 48 } = {}) {
    if (typeof document === 'undefined') return new THREE.Group();
    const canvas = document.createElement('canvas');
    if (!canvas?.getContext) return new THREE.Group();
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Group();
    ctx.fillStyle = 'rgba(6, 12, 20, 0.82)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    ctx.fillStyle = color;
    ctx.font = `700 ${fontSize}px 'Space Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 24);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.renderOrder = 999;
    return sprite;
}

async function spawnGlbAt(loader, cache, url, x, y, z) {
    if (!url) return null;
    try {
        if (!cache.has(url)) {
            cache.set(url, loader.loadAsync(assetUrl(url)).catch((err) => {
                cache.delete(url);
                throw err;
            }));
        }
        const gltf = await cache.get(url);
        if (!gltf?.scene) return null;
        const model = gltf.scene.clone(true);
        const bbox = new THREE.Box3().setFromObject(model);
        const size = bbox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z, 0.001);
        model.scale.setScalar(1.1 / maxDim);
        const center = bbox.getCenter(new THREE.Vector3()).multiplyScalar(1.1 / maxDim);
        model.position.set(x - center.x, y - center.y, z - center.z);
        return model;
    } catch (err) {
        console.warn('[debug-museum] failed to load GLB:', url, err);
        return null;
    }
}

function spawnIconPlaneAt(iconPath, x, y, z) {
    if (!iconPath) return null;
    try {
        const texture = new THREE.TextureLoader().load(assetUrl(iconPath));
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material);
        sprite.position.set(x, y, z);
        sprite.scale.set(1.0, 1.0, 1);
        return sprite;
    } catch {
        return null;
    }
}

/**
 * Opens the debug museum: teleports the player to a dedicated staging area and lays out one
 * of every known asset in a long line, grouped by category with labeled separators.
 */
export async function openDebugMuseum(game) {
    if (!game?.scene || !game?.player) {
        console.warn('[debug-museum] no active game/player — start a run first.');
        return false;
    }

    const group = new THREE.Group();
    group.name = 'debug-museum';
    game.scene.add(group);

    // Studio lighting for museum corridor
    const ambient = new THREE.AmbientLight(0xffffff, 1.4);
    group.add(ambient);
    const sunLight = new THREE.DirectionalLight(0x00f0ff, 0.9);
    sunLight.position.set(MUSEUM_ORIGIN.x + 40, 40, MUSEUM_ORIGIN.z - 20);
    group.add(sunLight);

    // Exhibition walkway floor
    const corridorLength = 280;
    const floorGeo = new THREE.PlaneGeometry(corridorLength, 14);
    const floorMat = new THREE.MeshStandardMaterial({
        color: 0x081018,
        roughness: 0.35,
        metalness: 0.8
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(MUSEUM_ORIGIN.x + corridorLength * 0.5 - 10, -0.01, MUSEUM_ORIGIN.z);
    group.add(floor);

    const grid = new THREE.GridHelper(corridorLength, Math.floor(corridorLength / 2), 0x00f0ff, 0x112233);
    grid.position.set(MUSEUM_ORIGIN.x + corridorLength * 0.5 - 10, 0.005, MUSEUM_ORIGIN.z);
    group.add(grid);

    const loader = createMuseumGltfLoader();
    const glbCache = new Map();
    let cursorX = MUSEUM_ORIGIN.x;
    const z = MUSEUM_ORIGIN.z;
    let spawnedCount = 0;
    let skippedCount = 0;

    async function addCategory(title, entries, spawnFn) {
        const categoryLabel = makeLabelSprite(`=== ${title} (${entries.length}) ===`, { color: '#22d3ee', fontSize: 40 });
        categoryLabel.position.set(cursorX, 2.6, z);
        categoryLabel.scale.set(2.4, 0.6, 1);
        group.add(categoryLabel);

        for (const entry of entries) {
            let obj = null;
            try {
                obj = await spawnFn(entry, cursorX, z);
            } catch (err) {
                console.warn('[debug-museum] spawn failed:', entry, err);
            }
            if (obj) {
                group.add(obj);
                spawnedCount += 1;
                const label = typeof entry === 'string'
                    ? entry
                    : (Array.isArray(entry) ? entry[0] : (entry.label ?? String(entry)));
                const nameLabel = makeLabelSprite(label, { fontSize: 30 });
                nameLabel.position.set(cursorX, 0.55, z + 1.0);
                nameLabel.scale.set(1.6, 0.4, 1);
                group.add(nameLabel);
            } else {
                skippedCount += 1;
            }
            cursorX += ITEM_SPACING;
        }
        cursorX += CATEGORY_GAP;
    }

    // 1. Weapon archetypes (base guns)
    await addCategory('WEAPON ARCHETYPES', Object.entries(WEAPON_ARCHETYPES), async ([id, url], x, zPos) => {
        const model = await spawnGlbAt(loader, glbCache, url, x, 1.0, zPos);
        if (model) model.userData.label = id;
        return model;
    });

    // 2. Weapon skins
    await addCategory('WEAPON SKINS', Object.entries(WEAPON_SKIN_MESHES), async ([, url], x, zPos) => {
        return spawnGlbAt(loader, glbCache, url, x, 1.0, zPos);
    });

    // 3. Tactical charms
    await addCategory('WEAPON CHARMS', Object.entries(CHARM_GLB_MAP), async ([, url], x, zPos) => {
        return spawnGlbAt(loader, glbCache, url, x, 0.7, zPos);
    });

    // 4. Rig overclock mods
    await addCategory('RIG OVERCLOCK MODS', Object.entries(MOD_GLB_MAP), async ([, url], x, zPos) => {
        return spawnGlbAt(loader, glbCache, url, x, 0.7, zPos);
    });

    // 5. Chassis skins (icon-plane)
    await addCategory('CHASSIS SKINS', CHASSIS_SKIN_ITEMDEFS, async (itemdefid, x, zPos) => {
        const catalog = getItemCatalogEntry(itemdefid);
        return spawnIconPlaneAt(catalog?.localImg || catalog?.img, x, 1.0, zPos);
    });

    // 6. Cosmetic player decals (icon-plane)
    await addCategory('COSMETIC PLAYER DECALS', COSMETIC_DECAL_ITEMDEFS, async (itemdefid, x, zPos) => {
        const catalog = getItemCatalogEntry(itemdefid);
        return spawnIconPlaneAt(catalog?.localImg || catalog?.img, x, 1.0, zPos);
    });

    // 7. Environmental wall decals (real production spawn path)
    await addCategory('ENVIRONMENTAL WALL DECALS', ENVIRONMENTAL_DECAL_TYPES, async (type, x, zPos) => {
        const placement = { type, x, z: zPos, scale: 1, tiltX: 0, elevation: 0, isWallDecal: true, wallNormal: { x: 0, z: 1 } };
        return game.createScatterInstance(placement);
    });

    // 8. Props & ground overlays (real production spawn path)
    await addCategory('PROPS & GROUND OVERLAYS', PROP_AND_OVERLAY_TYPES, async (type, x, zPos) => {
        const placement = { type, x, z: zPos, scale: 1, tiltX: 0, elevation: 0.05, rotation: 0 };
        return game.createScatterInstance(placement);
    });

    // 9. Enemies (real production spawn path)
    await addCategory('ENEMIES & BOSSES', ENEMY_TYPES, async (type, x, zPos) => {
        const placement = { type, x, z: zPos, scale: 1, tiltX: 0, elevation: 0 };
        return game.createScatterInstance(placement);
    });

    // Teleport the player into the museum so they can walk down the hallway immediately.
    game.player.position.set(MUSEUM_ORIGIN.x - 4, 0, MUSEUM_ORIGIN.z);

    console.log(`[debug-museum] opened: ${spawnedCount} objects spawned, ${skippedCount} skipped. Walk +X to tour every category.`);
    return true;
}

export function closeDebugMuseum(game) {
    const group = game?.scene?.getObjectByName('debug-museum');
    if (!group) return false;
    group.traverse((child) => {
        child.material?.map?.dispose?.();
        child.material?.dispose?.();
        child.geometry?.dispose?.();
    });
    game.scene.remove(group);
    return true;
}
