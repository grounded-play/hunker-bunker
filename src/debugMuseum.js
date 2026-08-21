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
import { WEAPON_ARCHETYPES, WEAPON_SKIN_MESHES, CHARM_GLB_MAP, MOD_GLB_MAP, CHASSIS_SKIN_GLB_MAP, NPC_GLB_MAP } from './debugAssetCatalogs.js';
import { SHOWROOM_CATEGORIES, createDebugWallDecalDisplay } from './debugShowroom.js';
import { createWorld3dModel } from './world3dOverlay.js';

// Far outside any real generated terrain so the museum never overlaps a real run's chunks.
const MUSEUM_ORIGIN = Object.freeze({ x: 9000, z: 9000 });
const ITEM_SPACING = 2.4;
const CATEGORY_GAP = 5;

// Hand-collected from threeGame.js's isEnemyType() allowlist.
const ENEMY_TYPES = SHOWROOM_CATEGORIES.ENEMIES;

// Hand-collected from threeGame.js's WALL_DECAL_TYPES set.
const ENVIRONMENTAL_DECAL_TYPES = SHOWROOM_CATEGORIES.WALL_DECALS;

// World-model props (spawned via createWorld3dModel — a different loader than the
// createScatterInstance-based types below, since debugShowroom.js's TACTICAL_PROPS/
// BIOMECH_PROPS/SETPIECES were authored against that catalog, not the scatter one).
const WORLD_MODEL_PROP_TYPES = [
    ...SHOWROOM_CATEGORIES.TACTICAL_PROPS,
    ...SHOWROOM_CATEGORIES.BIOMECH_PROPS,
    ...SHOWROOM_CATEGORIES.SETPIECES
];

// Ground overlays / floor decals — these ARE createScatterInstance-compatible.
const PROP_AND_OVERLAY_TYPES = SHOWROOM_CATEGORIES.FLOOR_DECALS;

// Season 0 chassis skins (itemdefs 4112-4119) and cosmetic decals (4120-4129)
const CHASSIS_SKIN_ITEMDEFS = SHOWROOM_CATEGORIES.CHASSIS_SKINS;
const COSMETIC_DECAL_ITEMDEFS = SHOWROOM_CATEGORIES.COSMETIC_PLAYER_DECALS;

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

let _museumAnimFrame = null;
let _lastMuseumTickTime = 0;

function startMuseumAnimationLoop(group) {
    if (typeof requestAnimationFrame === 'undefined') return;
    if (_museumAnimFrame != null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(_museumAnimFrame);
        _museumAnimFrame = null;
    }
    _lastMuseumTickTime = performance.now();

    function tick(now) {
        const delta = Math.min((now - _lastMuseumTickTime) / 1000, 0.1);
        _lastMuseumTickTime = now;

        if (group && group.parent) {
            const mixers = group.userData.mixers || [];
            for (const mixer of mixers) {
                mixer.update(delta);
            }
            const rotatingItems = group.userData.rotatingItems || [];
            for (const item of rotatingItems) {
                item.rotation.y += delta * 0.75;
            }
            _museumAnimFrame = requestAnimationFrame(tick);
        }
    }
    _museumAnimFrame = requestAnimationFrame(tick);
}

async function spawnGlbAt(loader, cache, url, x, y, z, options = {}) {
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
        const scaleFactor = options.scale || 1.1;
        model.scale.setScalar(scaleFactor / maxDim);
        const center = bbox.getCenter(new THREE.Vector3()).multiplyScalar(scaleFactor / maxDim);
        model.position.set(x - center.x, y - center.y, z - center.z);

        // Play baked rig animations if available (randomized start time per exhibit)
        if (gltf.animations && gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(model);
            const clipIdx = Math.floor(Math.random() * gltf.animations.length);
            const clip = gltf.animations[clipIdx];
            const action = mixer.clipAction(clip);
            action.play();
            action.time = Math.random() * (clip.duration || 1);
            if (options.mixersList) options.mixersList.push(mixer);
        } else if (options.rotate && options.rotatingList) {
            options.rotatingList.push(model);
        }

        return model;
    } catch (err) {
        console.warn('[debug-museum] failed to load GLB:', url, err);
        return null;
    }
}

// Wing 1 (docs/debug-gallery-and-architectural-grid-expansion-plan.md §2): every item sits on
// a dedicated pedestal instead of floating at floor level.
const PEDESTAL_HEIGHT = 0.6;
const PEDESTAL_RADIUS = 0.8;
function spawnPedestal(x, z) {
    const pedestal = new THREE.Group();
    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(PEDESTAL_RADIUS, PEDESTAL_RADIUS * 1.1, PEDESTAL_HEIGHT, 6),
        new THREE.MeshStandardMaterial({ color: 0x141c28, roughness: 0.5, metalness: 0.7 })
    );
    body.position.y = PEDESTAL_HEIGHT / 2;
    pedestal.add(body);

    const baseRing = new THREE.Mesh(
        new THREE.TorusGeometry(PEDESTAL_RADIUS * 1.05, 0.03, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.85 })
    );
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.y = 0.02;
    pedestal.add(baseRing);

    pedestal.position.set(x, 0, z);
    return pedestal;
}

// Counts triangles across a model's meshes for the placard's polycount readout.
function countTriangles(object3d) {
    let tris = 0;
    object3d.traverse((child) => {
        const pos = child.isMesh ? child.geometry?.attributes?.position : null;
        if (pos) tris += pos.count / 3;
    });
    return Math.round(tris);
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
    group.userData.mixers = [];
    group.userData.rotatingItems = [];
    game.scene.add(group);
    startMuseumAnimationLoop(group);

    // Teleport first, spawn after. This used to sit at the very end of the
    // function, after ~76 sequential (unbatched, one-await-at-a-time) GLB
    // loads across every category below -- confirmed live to take multiple
    // minutes with zero visible progress, directly contradicting this
    // function's own promise to let the player "walk down the hallway
    // immediately." The player now appears in the corridor right away and
    // watches pedestals fill in as each category's assets finish loading.
    game.player.position.set(MUSEUM_ORIGIN.x - 4, 0, MUSEUM_ORIGIN.z);
    if (typeof game.setGodMode === 'function') game.setGodMode(true);

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
                // Wing 1 §2.3: uniform +Z forward orientation for every asset. Best-effort —
                // GLB sources don't carry a "this is the front" convention this tool can read,
                // so this normalizes rotation to a fixed value rather than leaving whatever
                // orientation each source file happened to author it in.
                obj.rotation.y = 0;
                group.add(spawnPedestal(cursorX, z));
                obj.position.y += PEDESTAL_HEIGHT;
                group.add(obj);
                spawnedCount += 1;

                const label = typeof entry === 'string'
                    ? entry
                    : (Array.isArray(entry) ? entry[0] : (entry.label ?? String(entry)));
                const triCount = countTriangles(obj);
                const placardText = triCount > 0 ? `${label} // ${triCount} TRIS` : label;
                const nameLabel = makeLabelSprite(placardText, { fontSize: 26 });
                nameLabel.position.set(cursorX, PEDESTAL_HEIGHT + 1.1, z + 1.0);
                nameLabel.scale.set(1.8, 0.45, 1);
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
        const model = await spawnGlbAt(loader, glbCache, url, x, 1.0, zPos, { rotate: true, rotatingList: group.userData.rotatingItems });
        if (model) model.userData.label = id;
        return model;
    });

    // 2. Weapon skins
    await addCategory('WEAPON SKINS', Object.entries(WEAPON_SKIN_MESHES), async ([, url], x, zPos) => {
        return spawnGlbAt(loader, glbCache, url, x, 1.0, zPos, { rotate: true, rotatingList: group.userData.rotatingItems });
    });

    // 3. Tactical charms
    await addCategory('WEAPON CHARMS', Object.entries(CHARM_GLB_MAP), async ([, url], x, zPos) => {
        return spawnGlbAt(loader, glbCache, url, x, 0.7, zPos, { rotate: true, rotatingList: group.userData.rotatingItems });
    });

    // 4. Rig overclock mods
    await addCategory('RIG OVERCLOCK MODS', Object.entries(MOD_GLB_MAP), async ([, url], x, zPos) => {
        return spawnGlbAt(loader, glbCache, url, x, 0.7, zPos, { rotate: true, rotatingList: group.userData.rotatingItems });
    });

    // 5. Chassis skins (3D Model with icon-plane fallback)
    await addCategory('CHASSIS SKINS', CHASSIS_SKIN_ITEMDEFS, async (itemdefid, x, zPos) => {
        const glbUrl = CHASSIS_SKIN_GLB_MAP[itemdefid];
        if (glbUrl) {
            try {
                return await spawnGlbAt(loader, glbCache, glbUrl, x, 0.0, zPos, { scale: 1.4, mixersList: group.userData.mixers });
            } catch (err) {
                console.warn('[debug-museum] chassis glb fallback:', itemdefid, err);
            }
        }
        const catalog = getItemCatalogEntry(itemdefid);
        return spawnIconPlaneAt(catalog?.localImg || catalog?.img, x, 1.0, zPos);
    });

    // 5b. Camp Leaders & NPC Entities
    await addCategory('CAMP LEADERS & NPCS', Object.entries(NPC_GLB_MAP), async ([, url], x, zPos) => {
        return spawnGlbAt(loader, glbCache, url, x, 0.0, zPos, { scale: 1.4, mixersList: group.userData.mixers });
    });

    // 6. Cosmetic player decals (icon-plane)
    await addCategory('COSMETIC PLAYER DECALS', COSMETIC_DECAL_ITEMDEFS, async (itemdefid, x, zPos) => {
        const catalog = getItemCatalogEntry(itemdefid);
        return spawnIconPlaneAt(catalog?.localImg || catalog?.img, x, 1.0, zPos);
    });

    // 7. Environmental wall decals (real production spawn path)
    await addCategory('ENVIRONMENTAL WALL DECALS', ENVIRONMENTAL_DECAL_TYPES, async (type, x, zPos) => {
        const display = createDebugWallDecalDisplay(game, type, {
            wallNormal: { x: 0, z: 1 }
        });
        display.position.set(x, 0, zPos);
        return display;
    });

    // 8a. World-model props (createWorld3dModel — TACTICAL_PROPS/BIOMECH_PROPS/SETPIECES;
    // these are NOT createScatterInstance-compatible, see WORLD_MODEL_PROP_TYPES comment above)
    await addCategory('WORLD PROPS & SETPIECES', WORLD_MODEL_PROP_TYPES, async (type, x, zPos) => {
        try {
            const modelGroup = await (game?.createWorld3dModel ? game.createWorld3dModel(type) : createWorld3dModel(type));
            if (modelGroup) modelGroup.position.set(x, 0, zPos);
            return modelGroup;
        } catch (err) {
            console.warn('[debug-museum] failed to load world prop:', type, err);
            return null;
        }
    });

    // 8b. Ground overlays / floor decals (real production spawn path)
    await addCategory('GROUND OVERLAYS & FLOOR DECALS', PROP_AND_OVERLAY_TYPES, async (type, x, zPos) => {
        const placement = { type, x, z: zPos, scale: 1, tiltX: 0, elevation: 0.05, rotation: 0 };
        return game.createScatterInstance(placement);
    });

    // 9. Enemies (real production spawn path with static in-place walk cycle animation)
    await addCategory('ENEMIES & BOSSES', ENEMY_TYPES, async (type, x, zPos) => {
        const placement = { type, x, z: zPos, scale: 1, tiltX: 0, elevation: 0, isDisplayModel: true };
        return game.createScatterInstance(placement);
    });

    console.log(`[debug-museum] opened: ${spawnedCount} objects spawned, ${skippedCount} skipped. Walk +X to tour every category.`);
    return true;
}

export function closeDebugMuseum(game) {
    if (_museumAnimFrame != null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(_museumAnimFrame);
        _museumAnimFrame = null;
    }
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

export const openDebugAssetColonnade = openDebugMuseum;
export const closeDebugAssetColonnade = closeDebugMuseum;

if (typeof window !== 'undefined') {
    window.__DEBUG__ = window.__DEBUG__ || {};
    window.__DEBUG__.openMuseum = (game = window.game || window.threeGame) => openDebugMuseum(game);
    window.__DEBUG__.closeMuseum = (game = window.game || window.threeGame) => closeDebugMuseum(game);
    window.__DEBUG__.openAssetColonnade = window.__DEBUG__.openMuseum;
    window.__DEBUG__.closeAssetColonnade = window.__DEBUG__.closeMuseum;
}
