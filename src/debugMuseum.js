/**
 * Debug Hallway Museum (docs/game-audit-lane-split-and-worklog.md §4) — a dev-only, straight,
 * uninterrupted corridor that spawns one of every asset/model/decal/prop the game knows about,
 * grouped by category with labeled separators, for fast visual QA. Triggered only via
 * `window.__DEBUG__.openMuseum()`, matching the existing dev-tool console pattern.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { assetUrl } from './assetUrl.js';
import { getItemCatalogEntry } from './steamVaultUi.js';
import { createDebugWallDecalDisplay } from './debugShowroom.js';
import { createWorld3dModel, createWorld3dStructure } from './world3dOverlay.js';
import { createEnemy3dVisual } from './enemy3dOverlay.js';
import { MUSEUM_OPERATOR_HEIGHT, buildMuseumExhibitPlan } from './debugMuseumPlan.js';
import { updateKitMaterials } from './kitMaterials.js';
import { AudioManager } from './audio.js';
import { getVoiceScriptRows, getVoiceAudioManifest } from './data/voiceBanks.js';
import { SONG_INTERSTITIALS } from './songInterstitials.js';
import { GAMEPLAY_FOLEY_MANIFEST, GAMEPLAY_ENEMY_MANIFEST } from './data/gameSoundsets.js';

// Far outside any real generated terrain so the museum never overlaps a real run's chunks.
const MUSEUM_ORIGIN = Object.freeze({ x: 9000, z: 9000 });
const CATEGORY_COLUMNS = 6;
// Exhibits loading at once within a category. Unbounded, a 56-chassis wing
// (10-30 MB GLBs) dropped fetches and reported healthy models as broken.
const LOAD_CONCURRENCY = 6;

async function forEachLimited(items, limit, fn) {
    let next = 0;
    const worker = async () => {
        while (next < items.length) {
            const index = next;
            next += 1;
            await fn(items[index], index);
        }
    };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}
const CATEGORY_GAP = 3.5;

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

function startMuseumAnimationLoop(group, game) {
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
            if (game?.player?.position && group.userData?.audioConsolePosition) {
                const dist = game.player.position.distanceTo(group.userData.audioConsolePosition);
                if (dist <= 2.8) {
                    if (!group.userData.jukeboxOpen) {
                        group.userData.jukeboxOpen = true;
                        group.userData.openJukebox?.();
                    }
                } else if (dist > 5.5 && group.userData.jukeboxOpen) {
                    group.userData.jukeboxOpen = false;
                    group.userData.closeJukebox?.();
                }
            }
            updateKitMaterials(now / 1000);
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

// An operator body at its in-game height: SkeletonUtils clone (a plain clone
// leaves every copy bound to the first one's bones), feet on y=0, centred,
// no rotation (glTF/Mixamo forward is +Z, toward the placards and viewer).
async function spawnCharacterAt(loader, cache, url, x, z, height, mixersList) {
    if (!cache.has(url)) {
        cache.set(url, loader.loadAsync(assetUrl(url)).catch((err) => {
            cache.delete(url);
            throw err;
        }));
    }
    const gltf = await cache.get(url);
    const model = cloneSkeleton(gltf.scene);
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const measured = bounds.max.y - bounds.min.y;
    if (!Number.isFinite(measured) || measured <= 0) throw new Error('model has no measurable height');
    model.scale.multiplyScalar(height / measured);
    model.updateMatrixWorld(true);
    const scaled = new THREE.Box3().setFromObject(model);
    const center = scaled.getCenter(new THREE.Vector3());
    model.position.set(x - center.x, -scaled.min.y, z - center.z);
    const root = new THREE.Group();
    root.add(model);
    const clips = gltf.animations ?? [];
    const idle = clips.find((clip) => /idle/i.test(clip.name)) ?? clips[0];
    if (idle) {
        const mixer = new THREE.AnimationMixer(model);
        mixer.clipAction(idle).play();
        mixersList?.push(mixer);
    }
    return root;
}

// A reference post beside each life-size exhibit, as tall as an operator, so
// scale reads at a glance without walking the player over.
function spawnOperatorHeightPost(x, z) {
    const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, MUSEUM_OPERATOR_HEIGHT, 0.04),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.7 })
    );
    post.name = 'debug-museum-height-post';
    post.position.set(x, PEDESTAL_HEIGHT + MUSEUM_OPERATOR_HEIGHT / 2, z);
    return post;
}

function measureExhibit(object3d) {
    object3d.updateMatrixWorld(true);
    const box = new THREE.Box3();
    object3d.traverse((child) => {
        if (child.isMesh && child.visible !== false && child.userData?.museumSpecimenState !== 'damaged') box.expandByObject(child);
    });
    if (box.isEmpty()) return null;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    return { size: { x: size.x, y: size.y, z: size.z }, minY: box.min.y, center: { x: center.x, y: center.y, z: center.z } };
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

// A 2D prop's billboard (keyed exactly as the game keys it) on the left, the
// candidate GLB at its in-game height on the right, both on the floor. The
// billboard is sized to the model's height so the comparison is like for like.
const COMPARE_OFFSET = 1.25;
async function spawnComparePair(game, entry, x, z) {
    const pair = new THREE.Group();
    pair.name = `debug-museum-compare:${entry.type}`;
    const model = await (game?.createWorld3dModel ? game.createWorld3dModel(entry.modelType) : createWorld3dModel(entry.modelType));
    if (!model) return null;
    model.position.set(x + COMPARE_OFFSET, 0, z);
    pair.add(model);
    const height = Math.max(0.6, measureExhibit(model)?.size.y ?? 1);

    const material = new THREE.SpriteMaterial({ transparent: true, alphaTest: 0.05, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    sprite.center.set(0.5, 0);
    sprite.position.set(x - COMPARE_OFFSET, 0, z);
    sprite.scale.set(height, height, 1);
    sprite.name = 'debug-museum-compare-sprite';
    const fitAspect = (texture) => {
        const image = texture?.image;
        if (image?.width > 1 && image?.height > 1) sprite.scale.set(height * (image.width / image.height), height, 1);
    };
    material.map = typeof game?.loadKeyedSpriteTexture === 'function'
        ? game.loadKeyedSpriteTexture(entry.sprite, 14, fitAspect)
        : new THREE.TextureLoader().load(assetUrl(entry.sprite), fitAspect);
    pair.add(sprite);

    const tag = makeLabelSprite(entry.status === 'wired' ? 'WIRED' : 'REVIEW', {
        color: entry.status === 'wired' ? '#4ade80' : '#f59e0b', fontSize: 34
    });
    tag.position.set(x, 0.25, z + 0.9);
    tag.scale.set(1.0, 0.25, 1);
    pair.add(tag);
    return pair;
}

export function buildMuseumAudioCatalog(buffers = AudioManager.buffers) {
    const bufferKeys = Object.keys(buffers ?? {}).sort();
    const voiceRows = getVoiceScriptRows();
    const voiceKeys = new Set(voiceRows.flatMap((row) => row.takes));
    const songKeys = new Set(Object.values(SONG_INTERSTITIALS).map((song) => song.musicKey));

    // 1. Music: Core OST + context tracks + any buffer starting with music_
    const musicMap = new Map();
    if (AudioManager.CORE_OST_TRACKS) {
        for (const [key, track] of Object.entries(AudioManager.CORE_OST_TRACKS)) {
            musicMap.set(key, {
                key,
                label: track.title || key,
                source: track.url,
                available: Boolean(buffers?.[key] || track.url),
                bus: 'music'
            });
        }
    }
    for (const key of bufferKeys) {
        if (key.startsWith('music_') && !songKeys.has(key) && !musicMap.has(key)) {
            musicMap.set(key, { key, label: key, available: true, bus: 'music' });
        }
    }

    // 2. Songs: all 38 interstitial songs (exact 38 count) + side stories if requested
    const songs = Object.values(SONG_INTERSTITIALS).map((song) => ({
        key: song.musicKey,
        label: `${song.id} // ${song.title}`,
        source: song.audio,
        available: Boolean(buffers?.[song.musicKey] || song.audio),
        bus: 'music'
    }));

    // 3. Voice: voice bank takes with URLs + narrative character voices
    const voiceManifest = typeof getVoiceAudioManifest === 'function' ? getVoiceAudioManifest() : [];
    const voiceUrlByKey = new Map(voiceManifest.map((item) => [item.key, item.url]));

    const voiceItems = voiceRows.flatMap((row) => row.takes.map((key, index) => {
        const sourceUrl = voiceUrlByKey.get(key) || `/audio/generated/${key}.wav`;
        return {
            key,
            label: `${row.bankName} // ${row.cue} // TAKE ${index + 1}`,
            subtitle: row.subtitle,
            semanticId: row.semanticId,
            source: sourceUrl,
            available: Boolean(buffers?.[key] || sourceUrl),
            bus: 'voice'
        };
    }));

    const narrativeKeys = bufferKeys.filter((key) => key.startsWith('voice_') && !voiceKeys.has(key));
    for (const key of narrativeKeys) {
        voiceItems.push({
            key,
            label: `NARRATIVE // ${key.replace('voice_', '').toUpperCase()}`,
            available: true,
            bus: 'voice'
        });
    }

    // 4. Effects: Foley + enemy movement/idle + SFX/ambient
    const effectMap = new Map();
    for (const item of (GAMEPLAY_FOLEY_MANIFEST || [])) {
        effectMap.set(item.key, {
            key: item.key,
            label: `FOLEY // ${item.key}`,
            source: item.url,
            available: Boolean(buffers?.[item.key] || item.url),
            bus: 'sfx'
        });
    }
    for (const item of (GAMEPLAY_ENEMY_MANIFEST || [])) {
        effectMap.set(item.key, {
            key: item.key,
            label: `ENEMY // ${item.key}`,
            source: item.url,
            available: Boolean(buffers?.[item.key] || item.url),
            bus: 'sfx'
        });
    }
    for (const key of bufferKeys) {
        if (!key.startsWith('music_') && !voiceKeys.has(key) && !key.startsWith('voice_') && !effectMap.has(key)) {
            effectMap.set(key, {
                key,
                label: key,
                available: true,
                bus: key.startsWith('amb_') ? 'world' : 'sfx'
            });
        }
    }

    return {
        music: Array.from(musicMap.values()),
        songs,
        voice: voiceItems,
        effects: Array.from(effectMap.values())
    };
}

function stopMuseumAudition(group) {
    const active = group?.userData?.museumAudition;
    try { active?.source?.stop?.(); } catch { /* source may already have ended */ }
    if (group?.userData) group.userData.museumAudition = null;
}

export function spawnAudioValidationConsole(game, group, x, z) {
    const consoleGroup = new THREE.Group();
    consoleGroup.name = 'debug-audio-validation-console';
    consoleGroup.position.set(x, 0, z);

    const pedestal = spawnPedestal(0, 0);
    consoleGroup.add(pedestal);

    const screenGeo = new THREE.BoxGeometry(0.8, 0.45, 0.35);
    const screenMat = new THREE.MeshStandardMaterial({
        color: 0x0a1622,
        emissive: 0x00f0ff,
        emissiveIntensity: 0.45,
        roughness: 0.25,
        metalness: 0.85
    });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.y = PEDESTAL_HEIGHT + 0.25;
    consoleGroup.add(screenMesh);

    const label = makeLabelSprite('◈ AUDIO VALIDATION CONSOLE // TOUCH OR [E] TO AUDITION', {
        color: '#00f0ff',
        fontSize: 34
    });
    label.position.set(0, PEDESTAL_HEIGHT + 1.15, 0);
    label.scale.set(1.4, 0.35, 1);
    consoleGroup.add(label);

    group.add(consoleGroup);
    group.userData.audioConsolePosition = new THREE.Vector3(x, 0, z);
    return consoleGroup;
}

export function mountMuseumJukebox(game, group) {
    if (typeof document === 'undefined' || !document.body?.appendChild) return null;
    const catalog = buildMuseumAudioCatalog();
    const root = document.createElement('section');
    if (!root?.appendChild) return null;
    root.id = 'debug-museum-jukebox';
    root.setAttribute?.('aria-label', 'Museum audio jukebox');
    root.innerHTML = `<style>
      #debug-museum-jukebox{display:none;position:fixed;right:2vw;top:9vh;width:min(520px,42vw);max-height:82vh;z-index:10020;background:#070d14f2;border:1px solid #22d3ee;color:#e2e8f0;font:12px "Space Mono",monospace;padding:12px;box-shadow:0 0 28px #000;flex-direction:column;gap:9px}
      #debug-museum-jukebox.visible{display:flex}
      #debug-museum-jukebox .museum-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:5px} #debug-museum-jukebox button,#debug-museum-jukebox input{font:inherit}
      #debug-museum-jukebox button{background:#101b28;color:#bdebf2;border:1px solid #31566b;padding:8px;cursor:pointer} #debug-museum-jukebox button[aria-selected="true"]{border-color:#f59e0b;color:#fbbf24}
      #debug-museum-jukebox .museum-list{overflow:auto;display:grid;gap:5px;min-height:180px} #debug-museum-jukebox .museum-track{text-align:left;display:grid;grid-template-columns:1fr auto;gap:8px}
      #debug-museum-jukebox .museum-track small{grid-column:1/-1;color:#7dd3fc} #debug-museum-jukebox .unavailable{opacity:.48} #debug-museum-jukebox .museum-controls{display:flex;gap:7px;align-items:center}
      #debug-museum-jukebox.collapsed .museum-tabs,#debug-museum-jukebox.collapsed .museum-search,#debug-museum-jukebox.collapsed .museum-list{display:none}
    </style><strong>AUDIO VALIDATION JUKEBOX</strong><div class="museum-tabs"></div><input class="museum-search" aria-label="Filter audio" placeholder="FILTER BY TITLE / CUE / ID"><div class="museum-list"></div><div class="museum-controls"><button data-action="stop">STOP</button><button data-action="reset">RESET SPECIMENS</button><button data-action="damage">DAMAGE STATE</button><label>GAIN <input data-action="gain" type="range" min="0" max="1" step="0.05" value="0.8"></label><button data-action="close">CLOSE</button></div>`;
    const tabs = root.querySelector?.('.museum-tabs');
    const list = root.querySelector?.('.museum-list');
    const search = root.querySelector?.('.museum-search');
    const gain = root.querySelector?.('[data-action="gain"]');
    let activeTab = 'music';
    const tabLabels = { music: 'MUSIC', songs: 'SONGS', voice: 'VO & TAKES', effects: 'EFFECTS' };

    const render = () => {
        if (!list) return;
        const query = String(search?.value ?? '').trim().toLowerCase();
        const rows = (catalog[activeTab] || []).filter((row) => `${row.label} ${row.subtitle ?? ''} ${row.semanticId ?? ''}`.toLowerCase().includes(query));
        list.replaceChildren?.();
        for (const row of rows) {
            const button = document.createElement('button');
            button.className = `museum-track${row.available ? '' : ' unavailable'}`;
            button.disabled = !row.available;
            button.innerHTML = `<span>${row.label}</span><b>${row.available ? 'PLAY' : 'MISSING'}</b>${row.subtitle ? `<small>${row.subtitle} // ${row.semanticId}</small>` : ''}`;
            button.addEventListener?.('click', async () => {
                stopMuseumAudition(group);
                if (row.source && !AudioManager.buffers?.[row.key] && typeof AudioManager.decodeAudioAsset === 'function') {
                    try {
                        const buffer = await AudioManager.decodeAudioAsset(row.source);
                        if (buffer) {
                            if (!AudioManager.buffers) AudioManager.buffers = {};
                            AudioManager.buffers[row.key] = buffer;
                        }
                    } catch (err) {
                        console.warn('[museum] failed to load audio', row.source, err);
                    }
                }
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

    if (group?.userData) {
        group.userData.openJukebox = () => {
            root.classList.add('visible');
            root.classList.remove('collapsed');
            render();
        };
        group.userData.closeJukebox = () => {
            root.classList.remove('visible');
            stopMuseumAudition(group);
        };
        group.userData.toggleJukebox = () => {
            if (root.classList.contains('visible')) {
                group.userData.closeJukebox();
            } else {
                group.userData.openJukebox();
            }
        };
    }

    root.querySelector?.('[data-action="close"]')?.addEventListener?.('click', () => {
        group?.userData?.closeJukebox?.();
    });
    document.body.appendChild(root);
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

// `damaged` is a second, independent spawn of the same exhibit (cloning a
// skinned model would leave the copy bound to the original's bones).
function createPairedSpecimen(source, damaged) {
    const pair = new THREE.Group();
    pair.name = 'debug-museum-specimen-pair';
    source.userData.museumSpecimenState = 'intact';
    source.position.z -= 0.55;
    pair.add(source);
    if (!damaged) return pair;
    damaged.userData.museumSpecimenState = 'damaged';
    damaged.position.z += 0.55;
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
    startMuseumAnimationLoop(group, game);

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
    // Biome fog swallows anything more than a few units off, which on a
    // 15-unit kit room or a boss reads as a broken, washed-out model.
    group.userData.restoreFog = game.scene.fog ?? null;
    game.scene.fog = null;
    if (game.scene.background?.isColor) {
        group.userData.restoreBackground = game.scene.background.clone();
        game.scene.background.setHex(0x0b0d0f);
    }
    group.userData.openJukebox = () => {};
    group.userData.closeJukebox = () => {};
    group.userData.toggleJukebox = () => {};
    group.userData.jukebox = mountMuseumJukebox(game, group);
    spawnAudioValidationConsole(game, group, MUSEUM_ORIGIN.x - 2, MUSEUM_ORIGIN.z - 1.5);

    const onConsoleKey = (e) => {
        if (e.code === 'KeyE' && game?.player?.position && group?.userData?.audioConsolePosition) {
            const dist = game.player.position.distanceTo(group.userData.audioConsolePosition);
            if (dist <= 4.0) {
                group.userData.toggleJukebox?.();
            }
        }
    };
    if (typeof window !== 'undefined') {
        window.addEventListener('keydown', onConsoleKey);
        group.userData.cleanupAudioKey = () => window.removeEventListener('keydown', onConsoleKey);
    }

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
    const plan = buildMuseumExhibitPlan();
    const corridorLength = plan.reduce((sum, category) => sum + (category.columns ?? CATEGORY_COLUMNS) * category.spacing + CATEGORY_GAP, 0);
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
    const z = MUSEUM_ORIGIN.z;
    // One row per planned exhibit: did it load, and at what size. Read it with
    // window.__DEBUG__.museumReport() to QA loading and scale without looking.
    const report = [];
    group.userData.museumReport = report;
    // The live objects behind the report, in the same order, for QA tooling
    // that frames one exhibit at a time (not serializable, so kept apart).
    const exhibits = [];
    group.userData.museumExhibits = exhibits;
    const mixers = group.userData.mixers;
    const rotating = group.userData.rotatingItems;

    const spawners = {
        item: (entry, x, zPos) => spawnGlbAt(loader, glbCache, entry.url, x, entry.size > 0.9 ? 1.0 : 0.7, zPos, { scale: entry.size, rotate: true, rotatingList: rotating }),
        character: (entry, x, zPos) => spawnCharacterAt(loader, glbCache, entry.url, x, zPos, entry.height, mixers),
        world: async (entry, x, zPos) => {
            const model = await (game?.createWorld3dModel ? game.createWorld3dModel(entry.type) : createWorld3dModel(entry.type));
            model?.position.set(x, 0, zPos);
            return model;
        },
        enemy: async (entry, x, zPos) => {
            const visual = await (game?.createEnemy3dVisual ? game.createEnemy3dVisual(entry.type) : createEnemy3dVisual(entry.type));
            if (!visual?.root) return null;
            // The live overlay grows the root in from 0.05 as the enemy
            // emerges; an exhibit is shown fully grown, idling in place.
            visual.root.scale.setScalar(1);
            visual.root.position.set(x, 0, zPos);
            if (visual.mixer) mixers.push(visual.mixer);
            return visual.root;
        },
        structure: async (entry, x, zPos) => {
            const structure = await createWorld3dStructure(entry.type);
            structure?.position.set(x, 0, zPos);
            return structure;
        },
        icon: (entry, x, zPos) => {
            const catalog = getItemCatalogEntry(entry.itemdefid);
            return spawnIconPlaneAt(catalog?.localImg || catalog?.img, x, 1.0, zPos);
        },
        wallDecal: (entry, x, zPos) => {
            const display = createDebugWallDecalDisplay(game, entry.type, { wallNormal: { x: 0, z: 1 } });
            display.position.set(x, 0, zPos);
            return display;
        },
        floorDecal: (entry, x, zPos) => game.createScatterInstance({ type: entry.type, x, z: zPos, scale: 1, tiltX: 0, elevation: 0.05, rotation: 0 }),
        compare: (entry, x, zPos) => spawnComparePair(game, entry, x, zPos)
    };
    const LIFE_SIZE = new Set(['character', 'world', 'enemy']);

    let cursorX = MUSEUM_ORIGIN.x;
    let spawnedCount = 0;
    let skippedCount = 0;
    for (const category of plan) {
        const columns = category.columns ?? CATEGORY_COLUMNS;
        const spacing = category.spacing;
        const categoryLabel = makeLabelSprite(`=== ${category.title} (${category.entries.length}) ===`, { color: '#22d3ee', fontSize: 40 });
        categoryLabel.position.set(cursorX + ((columns - 1) * spacing) / 2, 2.8, z - 1.4);
        categoryLabel.scale.set(2.4, 0.6, 1);
        group.add(categoryLabel);
        const spawn = spawners[category.kind];

        // A category's exhibits load a few at a time; categories fill in order.
        await forEachLimited(category.entries, LOAD_CONCURRENCY, async (entry, index) => {
            const itemX = cursorX + (index % columns) * spacing;
            const itemZ = z + Math.floor(index / columns) * (category.kind === 'structure' ? spacing : Math.max(3.4, spacing));
            const row = { category: category.title, kind: category.kind, label: entry.label, url: entry.url ?? null, type: entry.type ?? null, x: itemX, z: itemZ, ok: false };
            report.push(row);
            let obj = null;
            try {
                // One retry: a dropped fetch is not a broken model.
                obj = await Promise.resolve().then(() => spawn(entry, itemX, itemZ)).catch(() => spawn(entry, itemX, itemZ));
                if (!obj) row.error = 'spawn returned nothing';
            } catch (err) {
                row.error = String(err?.message ?? err);
                console.warn('[debug-museum] spawn failed:', category.title, entry.label, err);
            }
            if (!obj) {
                skippedCount += 1;
                return;
            }
            // Every exhibit faces +Z, toward the placards. Production loaders
            // (world, enemy) carry each asset's own yaw inside this root.
            obj.rotation.y = 0;
            const raised = category.kind !== 'structure' && category.raised !== false;
            if (raised) {
                group.add(spawnPedestal(itemX, itemZ));
                obj.position.y += PEDESTAL_HEIGHT;
            }
            if (LIFE_SIZE.has(category.kind)) group.add(spawnOperatorHeightPost(itemX + spacing * 0.42, itemZ));
            const intact = obj;
            if (category.paired) {
                let twin = null;
                try {
                    twin = await spawn(entry, itemX, itemZ);
                    if (twin) {
                        twin.rotation.y = 0;
                        if (raised) twin.position.y += PEDESTAL_HEIGHT;
                    }
                } catch { /* the intact exhibit is what QA needs */ }
                obj = createPairedSpecimen(obj, twin);
            }
            group.add(obj);
            exhibits.push({ row, object: obj });
            spawnedCount += 1;
            // Measured on the intact specimen in its final place (the damaged
            // twin is hidden and must not count toward size or triangles).
            const measured = measureExhibit(intact);
            const triCount = countTriangles(intact);

            Object.assign(row, { ok: true, tris: triCount, yaw: obj.rotation.y }, measured ?? {});
            const placardText = triCount > 0 ? `${entry.label} // ${triCount} TRIS` : entry.label;
            const nameLabel = makeLabelSprite(placardText, { fontSize: 26 });
            nameLabel.position.set(itemX, PEDESTAL_HEIGHT + Math.max(1.1, (measured?.size.y ?? 0) + 0.3), itemZ + 1.0);
            nameLabel.scale.set(1.8, 0.45, 1);
            group.add(nameLabel);
        });
        cursorX += columns * spacing + CATEGORY_GAP;
    }

    console.log(`[debug-museum] opened: ${spawnedCount} exhibits, ${skippedCount} failed to load (window.__DEBUG__.museumReport()).`);
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
    if (group.userData.restoreFog) game.scene.fog = group.userData.restoreFog;
    if (group.userData.restoreBackground && game.scene.background?.isColor) {
        game.scene.background.copy(group.userData.restoreBackground);
    }
    stopMuseumAudition(group);
    group.userData.cleanupAudioKey?.();
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
    window.__DEBUG__.museumReport = (game = window.game || window.threeGame) => game?.scene?.getObjectByName('debug-museum')?.userData?.museumReport ?? null;
    window.__DEBUG__.openAssetColonnade = window.__DEBUG__.openMuseum;
    window.__DEBUG__.closeAssetColonnade = window.__DEBUG__.closeMuseum;
}
