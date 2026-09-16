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
import { AudioManager } from './audio.js';
import { getVoiceScriptRows } from './data/voiceBanks.js';
import { SONG_INTERSTITIALS } from './songInterstitials.js';

// Far outside any real generated terrain so the museum never overlaps a real run's chunks.
const MUSEUM_ORIGIN = Object.freeze({ x: 9000, z: 9000 });
const ITEM_SPACING_X = 3.2;
const ITEM_SPACING_Z = 3.4;
const CATEGORY_COLUMNS = 6;
const CATEGORY_GAP = 3.5;

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
    ...SHOWROOM_CATEGORIES.SETPIECES,
    ...SHOWROOM_CATEGORIES.CAMP_PROPS,
    ...SHOWROOM_CATEGORIES.AFTERMATH_STATES,
    ...SHOWROOM_CATEGORIES.SECRETS,
    ...SHOWROOM_CATEGORIES.ARCHITECTURE_3D,
    ...SHOWROOM_CATEGORIES.FIXTURES_3D,
    ...SHOWROOM_CATEGORIES.FUNGAL_PROPS,
    ...SHOWROOM_CATEGORIES.CRYO_PROPS,
    ...SHOWROOM_CATEGORIES.RUINED_INDUSTRIAL_PROPS
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

export function buildMuseumAudioCatalog(buffers = AudioManager.buffers) {
    const bufferKeys = Object.keys(buffers ?? {}).sort();
    const voiceRows = getVoiceScriptRows();
    const voiceKeys = new Set(voiceRows.flatMap((row) => row.takes));
    const songKeys = new Set(Object.values(SONG_INTERSTITIALS).map((song) => song.musicKey));
    return {
        music: bufferKeys.filter((key) => key.startsWith('music_') && !songKeys.has(key))
            .map((key) => ({ key, label: key, available: true, bus: 'music' })),
        songs: Object.values(SONG_INTERSTITIALS).map((song) => ({
            key: song.musicKey,
            label: `${song.id} // ${song.title}`,
            source: song.audio,
            available: Boolean(buffers?.[song.musicKey]),
            bus: 'music'
        })),
        voice: voiceRows.flatMap((row) => row.takes.map((key, index) => ({
            key,
            label: `${row.bankName} // ${row.cue} // TAKE ${index + 1}`,
            subtitle: row.subtitle,
            semanticId: row.semanticId,
            available: Boolean(buffers?.[key]),
            bus: 'voice'
        }))),
        effects: bufferKeys.filter((key) => !key.startsWith('music_') && !voiceKeys.has(key))
            .map((key) => ({ key, label: key, available: true, bus: key.startsWith('amb_') ? 'world' : 'sfx' }))
    };
}

function stopMuseumAudition(group) {
    const active = group?.userData?.museumAudition;
    try { active?.source?.stop?.(); } catch { /* source may already have ended */ }
    if (group?.userData) group.userData.museumAudition = null;
}

function mountMuseumJukebox(game, group) {
    if (typeof document === 'undefined' || !document.body?.appendChild) return null;
    const catalog = buildMuseumAudioCatalog();
    const root = document.createElement('section');
    if (!root?.appendChild) return null;
    root.id = 'debug-museum-jukebox';
    root.setAttribute?.('aria-label', 'Museum audio jukebox');
    root.innerHTML = `<style>
      #debug-museum-jukebox{position:fixed;right:2vw;top:9vh;width:min(520px,42vw);max-height:82vh;z-index:10020;background:#070d14f2;border:1px solid #22d3ee;color:#e2e8f0;font:12px "Space Mono",monospace;padding:12px;box-shadow:0 0 28px #000;display:flex;flex-direction:column;gap:9px}
      #debug-museum-jukebox .museum-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:5px} #debug-museum-jukebox button,#debug-museum-jukebox input{font:inherit}
      #debug-museum-jukebox button{background:#101b28;color:#bdebf2;border:1px solid #31566b;padding:8px;cursor:pointer} #debug-museum-jukebox button[aria-selected="true"]{border-color:#f59e0b;color:#fbbf24}
      #debug-museum-jukebox .museum-list{overflow:auto;display:grid;gap:5px;min-height:180px} #debug-museum-jukebox .museum-track{text-align:left;display:grid;grid-template-columns:1fr auto;gap:8px}
      #debug-museum-jukebox .museum-track small{grid-column:1/-1;color:#7dd3fc} #debug-museum-jukebox .unavailable{opacity:.48} #debug-museum-jukebox .museum-controls{display:flex;gap:7px;align-items:center}
      #debug-museum-jukebox.collapsed .museum-tabs,#debug-museum-jukebox.collapsed .museum-search,#debug-museum-jukebox.collapsed .museum-list{display:none}
    </style><strong>AUDIO VALIDATION JUKEBOX</strong><div class="museum-tabs"></div><input class="museum-search" aria-label="Filter audio" placeholder="FILTER BY TITLE / CUE / ID"><div class="museum-list"></div><div class="museum-controls"><button data-action="stop">STOP</button><button data-action="reset">RESET SPECIMENS</button><button data-action="damage">DAMAGE STATE</button><label>GAIN <input data-action="gain" type="range" min="0" max="1" step="0.05" value="0.8"></label><button data-action="close">MINIMIZE</button></div>`;
    const tabs = root.querySelector?.('.museum-tabs');
    const list = root.querySelector?.('.museum-list');
    const search = root.querySelector?.('.museum-search');
    const gain = root.querySelector?.('[data-action="gain"]');
    let activeTab = 'music';
    const tabLabels = { music: 'MUSIC', songs: 'SONGS', voice: 'VO & TAKES', effects: 'EFFECTS' };

    const render = () => {
        if (!list) return;
        const query = String(search?.value ?? '').trim().toLowerCase();
        const rows = catalog[activeTab].filter((row) => `${row.label} ${row.subtitle ?? ''} ${row.semanticId ?? ''}`.toLowerCase().includes(query));
        list.replaceChildren?.();
        for (const row of rows) {
            const button = document.createElement('button');
            button.className = `museum-track${row.available ? '' : ' unavailable'}`;
            button.disabled = !row.available;
            button.innerHTML = `<span>${row.label}</span><b>${row.available ? 'PLAY' : 'MISSING'}</b>${row.subtitle ? `<small>${row.subtitle} // ${row.semanticId}</small>` : ''}`;
            button.addEventListener?.('click', () => {
                stopMuseumAudition(group);
                group.userData.museumAudition = AudioManager.play(row.key, {
                    bus: row.bus,
                    volume: Number(gain?.value ?? 0.8),
                    varyPitch: false
                });
            });
            list.appendChild(button);
        }
    };
    for (const key of Object.keys(tabLabels)) {
        const button = document.createElement('button');
        button.textContent = tabLabels[key];
        button.setAttribute?.('aria-selected', String(key === activeTab));
        button.addEventListener?.('click', () => {
            activeTab = key;
            for (const tab of tabs?.children ?? []) tab.setAttribute?.('aria-selected', String(tab === button));
            render();
        });
        tabs?.appendChild(button);
    }
    search?.addEventListener?.('input', render);
    root.querySelector?.('[data-action="stop"]')?.addEventListener?.('click', () => stopMuseumAudition(group));
    root.querySelector?.('[data-action="reset"]')?.addEventListener?.('click', () => setMuseumSpecimenState(game, 'intact'));
    root.querySelector?.('[data-action="damage"]')?.addEventListener?.('click', () => setMuseumSpecimenState(game, 'damaged'));
    root.querySelector?.('[data-action="close"]')?.addEventListener?.('click', (event) => {
        root.classList?.toggle('collapsed');
        event.currentTarget.textContent = root.classList?.contains('collapsed') ? 'EXPAND' : 'MINIMIZE';
        stopMuseumAudition(group);
    });
    document.body.appendChild(root);
    render();
    return root;
}

export function setMuseumSpecimenState(game, state = 'intact') {
    const group = game?.scene?.getObjectByName('debug-museum');
    if (!group) return false;
    const damaged = state === 'damaged';
    group.traverse((child) => {
        if (child.userData?.museumSpecimenState === 'intact') child.visible = !damaged;
        if (child.userData?.museumSpecimenState === 'damaged') child.visible = damaged;
    });
    return true;
}

function createPairedSpecimen(source) {
    const pair = new THREE.Group();
    pair.name = 'debug-museum-specimen-pair';
    source.userData.museumSpecimenState = 'intact';
    source.position.z -= 0.55;
    pair.add(source);
    const damaged = source.clone(true);
    damaged.userData.museumSpecimenState = 'damaged';
    damaged.position.z += 1.1;
    damaged.visible = false;
    damaged.traverse((child) => {
        if (!child.isMesh || !child.material) return;
        child.material = child.material.clone();
        if (child.material.color) child.material.color.multiplyScalar(0.35);
        if (child.material.emissive) child.material.emissive.setHex(0x4a0808);
    });
    pair.add(damaged);
    return pair;
}

/**
 * Opens the debug museum: teleports the player to an isolated staging area and lays out one
 * of every known asset in bounded category grids with labeled separators.
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
    group.userData.restoreGodMode = Boolean(game.godMode);
    group.userData.restoreMuseumSessionActive = Boolean(game._debugMuseumSessionActive);
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
    // The museum is a QA space, not a level. Nothing here should stop you
    // walking: chunk streaming still mounts real terrain around the player at
    // these coordinates, and canOccupyPosition rejects any tile the generator
    // marked '#'. noclip is the existing bypass for exactly that check --
    // speed 1 rather than its 3.5 default, so movement stays normal and only
    // the collision goes away.
    if (typeof game.setNoclip === 'function') game.setNoclip(true, 1);
    game._debugMuseumSessionActive = true;
    // Scene-level shots/effects are not children of chunkGroups. Freeze their
    // simulation in the frame profile and hide them for a genuinely clean lab.
    group.userData.restoreTransientVisibility = [];
    for (const entry of [...(game.activeProjectiles ?? []), ...(game.transientEffects ?? [])]) {
        const display = entry?.mesh ?? entry?.sprite ?? entry?.group;
        if (!display) continue;
        group.userData.restoreTransientVisibility.push([display, display.visible]);
        display.visible = false;
    }
    // ...and nothing here should be visible except what this function spawned.
    // chunkGroups holds the whole generated world (terrain, walls, scatter),
    // so one flag hides all of it -- the same lever the pocket mechanic uses.
    if (game.chunkGroups) {
        group.userData.restoreChunkGroupsVisible = game.chunkGroups.visible;
        game.chunkGroups.visible = false;
    }
    // The biome sky rig paints a lit horizon and cloud layers behind
    // everything. That is world dressing too -- a QA backdrop should be flat
    // so an exhibit's own silhouette and colour are what you are judging.
    if (game.skyRig?.group) {
        group.userData.restoreSkyVisible = game.skyRig.group.visible;
        game.skyRig.group.visible = false;
    }
    if (game.scene.background?.isColor) {
        group.userData.restoreBackground = game.scene.background.clone();
        game.scene.background.setHex(0x0b0d0f);
    }
    group.userData.jukebox = mountMuseumJukebox(game, group);

    // Studio lighting for museum corridor
    const ambient = new THREE.AmbientLight(0xffffff, 1.4);
    group.add(ambient);
    const sunLight = new THREE.DirectionalLight(0x00f0ff, 0.9);
    sunLight.position.set(MUSEUM_ORIGIN.x + 40, 40, MUSEUM_ORIGIN.z - 20);
    group.add(sunLight);

    // Exhibition floor: the same grid backdrop as the hero-select showroom
    // (threeGame.js's createMenuGridTexture / menuShowroomFloor), rather than
    // a dark metal strip plus a GridHelper drawn on top of it. Square and
    // oversized instead of a 14-wide corridor, so there is room to walk
    // around an exhibit and view it from any side.
    const corridorLength = 280;
    const floorSize = corridorLength + 100;
    const gridTexture = game.createMenuGridTexture?.();
    if (gridTexture) {
        // The hero-select floor is 96 units at 8 repeats. Match that density
        // so the squares stay the same real-world size on a much larger plane.
        gridTexture.repeat?.set?.(floorSize / 12, floorSize / 12);
    }
    const floorMat = gridTexture
        ? new THREE.MeshBasicMaterial({ map: gridTexture, transparent: true, opacity: 0.92 })
        : new THREE.MeshBasicMaterial({ color: 0x101316 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(floorSize, floorSize), floorMat);
    floor.name = 'debug-museum-floor';
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(MUSEUM_ORIGIN.x + corridorLength * 0.5 - 10, -0.01, MUSEUM_ORIGIN.z);
    group.add(floor);

    const loader = createMuseumGltfLoader();
    const glbCache = new Map();
    let cursorX = MUSEUM_ORIGIN.x;
    const z = MUSEUM_ORIGIN.z;
    let spawnedCount = 0;
    let skippedCount = 0;

    async function addCategory(title, entries, spawnFn, { paired = false } = {}) {
        const categoryLabel = makeLabelSprite(`=== ${title} (${entries.length}) ===`, { color: '#22d3ee', fontSize: 40 });
        categoryLabel.position.set(cursorX + ((CATEGORY_COLUMNS - 1) * ITEM_SPACING_X) / 2, 2.8, z - 1.4);
        categoryLabel.scale.set(2.4, 0.6, 1);
        group.add(categoryLabel);

        for (let index = 0; index < entries.length; index += 1) {
            const entry = entries[index];
            const itemX = cursorX + (index % CATEGORY_COLUMNS) * ITEM_SPACING_X;
            const itemZ = z + Math.floor(index / CATEGORY_COLUMNS) * ITEM_SPACING_Z;
            let obj = null;
            try {
                obj = await spawnFn(entry, itemX, itemZ);
            } catch (err) {
                console.warn('[debug-museum] spawn failed:', entry, err);
            }
            if (obj) {
                // Wing 1 §2.3: uniform +Z forward orientation for every asset. Best-effort —
                // GLB sources don't carry a "this is the front" convention this tool can read,
                // so this normalizes rotation to a fixed value rather than leaving whatever
                // orientation each source file happened to author it in.
                obj.rotation.y = 0;
                group.add(spawnPedestal(itemX, itemZ));
                obj.position.y += PEDESTAL_HEIGHT;
                if (paired) obj = createPairedSpecimen(obj);
                group.add(obj);
                spawnedCount += 1;

                const label = typeof entry === 'string'
                    ? entry
                    : (Array.isArray(entry) ? entry[0] : (entry.label ?? String(entry)));
                const triCount = countTriangles(obj);
                const placardText = triCount > 0 ? `${label} // ${triCount} TRIS` : label;
                const nameLabel = makeLabelSprite(placardText, { fontSize: 26 });
                nameLabel.position.set(itemX, PEDESTAL_HEIGHT + 1.1, itemZ + 1.0);
                nameLabel.scale.set(1.8, 0.45, 1);
                group.add(nameLabel);
            } else {
                skippedCount += 1;
            }
        }
        cursorX += CATEGORY_COLUMNS * ITEM_SPACING_X + CATEGORY_GAP;
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
    }, { paired: true });

    // 8b. Ground overlays / floor decals (real production spawn path)
    await addCategory('GROUND OVERLAYS & FLOOR DECALS', PROP_AND_OVERLAY_TYPES, async (type, x, zPos) => {
        const placement = { type, x, z: zPos, scale: 1, tiltX: 0, elevation: 0.05, rotation: 0 };
        return game.createScatterInstance(placement);
    });

    // 9. Enemies (real production spawn path with static in-place walk cycle animation)
    await addCategory('ENEMIES & BOSSES', ENEMY_TYPES, async (type, x, zPos) => {
        const placement = { type, x, z: zPos, scale: 1, tiltX: 0, elevation: 0, isDisplayModel: true };
        return game.createScatterInstance(placement);
    }, { paired: true });

    console.log(`[debug-museum] opened: ${spawnedCount} objects spawned, ${skippedCount} skipped across bounded category grids.`);
    return true;
}

export function closeDebugMuseum(game) {
    if (_museumAnimFrame != null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(_museumAnimFrame);
        _museumAnimFrame = null;
    }
    const group = game?.scene?.getObjectByName('debug-museum');
    if (!group) return false;
    if (game.chunkGroups) {
        game.chunkGroups.visible = group.userData.restoreChunkGroupsVisible ?? true;
    }
    if (game.skyRig?.group) {
        game.skyRig.group.visible = group.userData.restoreSkyVisible ?? true;
    }
    if (group.userData.restoreBackground && game.scene.background?.isColor) {
        game.scene.background.copy(group.userData.restoreBackground);
    }
    stopMuseumAudition(group);
    group.userData.jukebox?.remove?.();
    for (const [display, visible] of group.userData.restoreTransientVisibility ?? []) {
        display.visible = visible;
    }
    game._debugMuseumSessionActive = group.userData.restoreMuseumSessionActive ?? false;
    if (typeof game.setNoclip === 'function') game.setNoclip(false);
    if (typeof game.setGodMode === 'function') game.setGodMode(group.userData.restoreGodMode ?? false);
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
