import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { assetUrl } from './assetUrl.js';
import { recordAssetLoad } from './assetLoadTelemetry.js';

// The 2D-to-3D generation pipeline's gltf-transform optimize pass applies
// EXT_meshopt_compression; GLTFLoader throws "setMeshoptDecoder must be called
// before loading compressed files" without this registered first.
function createGltfLoader() {
    return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
}

const MODEL_URL = '/3d/scouting-scout/Scout.game.glb';
const WEAPON_URL = '/3d/GG.1.glb';
// Class-unique gun archetypes (docs/armory-and-class-weapons-worklog.md §2a).
// 'gg1' is the pre-Armory shared weapon and doubles as the guaranteed-available
// fallback below until each archetype's .glb lands. Paths match the live
// 2D-to-3D generation manifest (docs/season-zero-protocol/06-asset-production-
// and-prompt-manifest.md §5A "Target 3D Mesh" — that doc is the source of
// truth for these filenames, keep in sync if it changes) — NOT the
// public/3d/runtime/weapon-*.glb convention worklog §2a originally guessed.
// talon_c (Scout's Talon-C Carbine, doc 07 §4) has no generation prompt yet;
// path below is a best-effort guess at the same naming pattern, update once
// doc 06 actually adds it.
export const WEAPON_ARCHETYPES = {
    gg1: WEAPON_URL,
    talon: '/3d/runtime/new3ds/gun_scout_vector9_talon.glb',
    talon_c: '/3d/runtime/new3ds/gun_scout_talon_c.glb',
    siege_breaker: '/3d/runtime/new3ds/gun_tank_siege_breaker50.glb',
    tesla_lock: '/3d/runtime/new3ds/gun_engineer_tesla_lock.glb'
};
// Weapon skins, keyed by Steam itemdef id. The live gen pipeline produces these as whole
// separate meshes rather than a material swap on the archetype mesh (doc 07 §4 assumed the
// latter — see worklog task 6). NOTE: doc 06 §5B labels itemdef 4107 (Deep Core Melter) as a
// TANK skin, but doc 07 §4's itemdef table assigns 4107 to ENGINEER — unresolved conflict,
// flagged in the worklog; this map only records what mesh exists for what id; it doesn't take
// a side on which class 4107 actually belongs to.
export const WEAPON_SKIN_MESHES = {
    4100: '/3d/runtime/new3ds/skin_scout_frostbite.glb',          // Sub-Zero Frostbite Talon SMG
    4101: '/3d/runtime/new3ds/skin_hazard_stripe_smg.glb',        // Hazard Stripe SMG
    4102: '/3d/runtime/new3ds/skin_tectonic_driller.glb',         // Tectonic Driller Shotgun/Autocannon
    4103: '/3d/runtime/new3ds/skin_engineer_cryo_plasma.glb',     // Cryo-Plasma Arc Driver
    4104: '/3d/runtime/new3ds/skin_rust_bone_trench.glb',         // Rust & Bone Trench Carbine
    4105: '/3d/runtime/new3ds/skin_obsidian_shard.glb',           // Obsidian Shard Marksman
    4106: '/3d/runtime/new3ds/skin_biolume_spore_sprayer.glb',    // Biolume Spore Sprayer
    4107: '/3d/runtime/new3ds/skin_tank_deep_core_melter.glb',    // Deep Core Melter Autocannon
    4108: '/3d/runtime/new3ds/skin_glitched_circuit_bolter.glb',  // Glitched Circuit Bolter
    4109: '/3d/runtime/new3ds/skin_void_walker_beam.glb',         // Void-Walker Beam Cannon
    4110: '/3d/runtime/new3ds/skin_queen_carapace_carbine.glb',   // Queen's Carapace Carbine (Capstone)
    4111: '/3d/runtime/new3ds/skin_solar_flare_antimatter.glb'    // Solar Flare Antimatter Rifle
};

import { COMMUNITY_GESTURES, COMMUNITY_GLB_MAP } from './data/communitySkins.js';

// Keep the in-run operator model list next to the loader that consumes it.
// Armory re-exports this map so preview and gameplay cannot silently drift.
export const CHASSIS_SKIN_MODELS = Object.freeze({
    '4112': '/3d/runtime/new3ds/chassis_subterran_drill_engineer.glb',
    '4113': '/3d/runtime/new3ds/chassis_cryo_vanguard_scout.glb',
    '4114': '/3d/runtime/new3ds/chassis_trench_warden_heavy.glb',
    '4115': '/3d/runtime/new3ds/chassis_void_commando_recon.glb',
    '4116': '/3d/runtime/new3ds/chassis_bio_synthesizer_medic.glb',
    '4117': '/3d/runtime/new3ds/chassis_dreadnought_exo_juggernaut.glb',
    '4118': '/3d/runtime/new3ds/chassis_cyber_spectre_infiltrator.glb',
    '4119': '/3d/runtime/new3ds/chassis_hive_lord_symbiote.glb',
    '5003': '/3d/runtime/new3ds/chassis_scout_cartographer.glb',
    '5004': '/3d/runtime/new3ds/chassis_scout_pioneer_courier.glb',
    '5005': '/3d/runtime/new3ds/chassis_tank_old_iron.glb',
    '5007': '/3d/runtime/new3ds/chassis_tank_colossus_hive.glb',
    '5008': '/3d/runtime/new3ds/chassis_tank_gentle_titan.glb',
    '5011': '/3d/runtime/new3ds/chassis_engineer_chen_undying.glb',
    '5012': '/3d/runtime/new3ds/chassis_engineer_exodus_vanguard.glb',
    ...(COMMUNITY_GLB_MAP || {})
});

export const ENGINEER_GESTURES = Object.freeze([
    'engineerWeightShift', 'engineerDismiss', 'engineerThoughtful', 'engineerCocky',
    'engineerHappy', 'engineerRelieved', 'engineerNod', 'engineerAngry',
    'engineerAnnoyed', 'engineerLookAway', 'engineerSarcastic',
    'engineerAcknowledge', 'engineerHardNod', 'engineerLongNod', 'engineerNo'
]);

export const SIGNATURE_GESTURES = Object.freeze([
    'standingGreeting', 'dismissingGesture', 'beckoning', 'rummaging',
    'pointingForward', 'strutWalk', 'runToStop', 'hardLanding',
    'relievedSigh', 'beingCocky', 'annoyedHeadShake', 'thoughtfulHeadShake',
    'lookAway', 'happyHand', 'angryGesture', 'hardHeadNod', 'floatingTrance',
    'pickFruit', 'crawling', 'cowMilking', 'unarmedRunForward', 'idleCartographer',
    'walkWithRifle', 'joggingWithBox', 'defeat', 'talkingAtWatercooler', 'rightStrafeWalk', 'rejected',
    ...(COMMUNITY_GESTURES || [])
]);

const ONE_SHOTS = new Set(['fire', 'reload', 'hit', 'land', 'melee', ...ENGINEER_GESTURES, ...SIGNATURE_GESTURES]);
const BLENDABLE_ACTIONS = ['idle', 'walk', 'run', 'backward', 'strafeLeft', 'strafeRight', 'fall'];
// Below INJURED_HP_RATIO, idle/walk/run cross-fade to their limping
// counterparts (see computeLocomotionWeights callers). Only these three carry
// an injured take in the source pack -- backward/strafe stay on the healthy
// clip either way.
export const INJURED_LOCOMOTION_VARIANTS = Object.freeze({
    idle: 'injuredIdle',
    walk: 'injuredWalk',
    run: 'injuredRun'
});
const characterTemplates = new Map();
const weaponTemplates = new Map();

function loadCharacterTemplate(url) {
    if (characterTemplates.has(url)) {
        recordAssetLoad(url, { group: 'player-character', cacheHit: true });
        return characterTemplates.get(url);
    }
    const started = performance.now();
    if (!characterTemplates.has(url)) {
        const promise = createGltfLoader().loadAsync(assetUrl(url)).catch((err) => {
            recordAssetLoad(url, { group: 'player-character', status: 'failed', durationMs: performance.now() - started, error: err });
            characterTemplates.delete(url);
            throw err;
        }).then((gltf) => {
            recordAssetLoad(url, { group: 'player-character', durationMs: performance.now() - started });
            return gltf;
        });
        characterTemplates.set(url, promise);
    }
    return characterTemplates.get(url);
}

function loadWeaponTemplate(url) {
    if (weaponTemplates.has(url)) {
        recordAssetLoad(url, { group: 'weapon', cacheHit: true });
        return weaponTemplates.get(url);
    }
    const started = performance.now();
    if (!weaponTemplates.has(url)) {
        const promise = createGltfLoader().loadAsync(assetUrl(url)).catch((err) => {
            recordAssetLoad(url, { group: 'weapon', status: 'failed', durationMs: performance.now() - started, error: err });
            weaponTemplates.delete(url);
            throw err;
        }).then((gltf) => {
            recordAssetLoad(url, { group: 'weapon', durationMs: performance.now() - started });
            return gltf;
        });
        weaponTemplates.set(url, promise);
    }
    return weaponTemplates.get(url);
}

// Generalized weapon loader keyed by archetype (docs/armory-and-class-weapons-worklog.md §2a).
// Falls back to the GG1 reference weapon if an archetype's .glb isn't in place yet, so this
// function is safe to call with any archetypeId today, before task 2's assets land.
//
// Weapon skins (opts.skinId) are whole separate meshes in the live asset pipeline, not a
// material swap on the archetype mesh — see WEAPON_SKIN_MESHES and worklog task 6. If skinId
// is given and mapped, it takes priority over archetypeId for which mesh loads; on failure it
// falls back to the archetype mesh, then to GG1, same chain as the archetype-only path.
export async function createClassWeapon(archetypeId, { position = [0.03, 0.02, -0.10], skinId = null } = {}) {
    const skinUrl = skinId ? WEAPON_SKIN_MESHES[skinId] : null;
    const archetypeUrl = WEAPON_ARCHETYPES[archetypeId] ?? WEAPON_URL;
    const url = skinUrl ?? archetypeUrl;
    let template;
    try {
        template = await loadWeaponTemplate(url);
    } catch (err) {
        if (url === WEAPON_URL) throw err;
        if (url === skinUrl) {
            console.warn(`[player-3d-overlay] weapon skin "${skinId}" (${url}) failed to load; falling back to archetype "${archetypeId}"`, err);
            return createClassWeapon(archetypeId, { position });
        }
        console.warn(`[player-3d-overlay] weapon archetype "${archetypeId}" (${url}) failed to load; falling back to GG1`, err);
        template = await loadWeaponTemplate(WEAPON_URL);
    }
    const weapon = template.scene.clone(true);
    weapon.name = archetypeId ? `ClassWeapon_${archetypeId}${skinUrl === url ? `_skin${skinId}` : ''}` : 'ScoutGG1';
    weapon.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(weapon);
    const size = bounds.getSize(new THREE.Vector3());
    const scale = 0.62 / Math.max(size.x, size.y, size.z);
    weapon.scale.multiplyScalar(scale);
    // Preserve the hand-alignment turn and rotate the flat source around its
    // remaining axis so the weapon sits upright in the Scout's grip.
    weapon.rotation.set(0, -Math.PI / 2, -Math.PI / 2);
    // Pull the grip inward toward the right palm. Rotation is intentionally
    // kept separate so placement can be tuned without re-tilting the model.
    weapon.position.fromArray(position);
    weapon.traverse((object) => {
        if (!object.isMesh) return;
        object.castShadow = true;
        object.frustumCulled = false;
    });
    return weapon;
}

export function computeOverlayYaw(directionX, directionZ) {
    if (Math.hypot(directionX, directionZ) < 1e-5) return 0;
    // Mixamo characters face +Z after FBXLoader's axis conversion.
    return Math.atan2(directionX, directionZ);
}

export function computeUpperBodyAimOffset(rootYaw, aimX, aimZ, maxTurn = Math.PI) {
    if (Math.hypot(aimX, aimZ) < 1e-5) return 0;
    const aimYaw = computeOverlayYaw(aimX, aimZ);
    const offset = Math.atan2(Math.sin(aimYaw - rootYaw), Math.cos(aimYaw - rootYaw));
    return THREE.MathUtils.clamp(offset, -maxTurn, maxTurn);
}

export function selectOverlayAnimation({
    isFalling = false,
    isReloading = false,
    isMoving = false,
    isSprinting = false,
    hasAim = false,
    moveX = 0,
    moveZ = 0,
    aimX = 0,
    aimZ = 1
} = {}) {
    if (isFalling) return 'fall';
    if (isReloading) return 'reload';
    if (!isMoving) return 'idle';
    // Sprint follows travel, not aim. The overlay root already faces moveX/Z,
    // while the upper body independently tracks aim, so always use the
    // forward run cycle instead of aim-relative strafe/backward clips.
    if (isSprinting) return 'run';
    if (!hasAim) return 'walk';

    const moveLength = Math.hypot(moveX, moveZ) || 1;
    const aimLength = Math.hypot(aimX, aimZ) || 1;
    const mx = moveX / moveLength;
    const mz = moveZ / moveLength;
    const ax = aimX / aimLength;
    const az = aimZ / aimLength;
    const forward = mx * ax + mz * az;
    const side = ax * mz - az * mx;
    if (forward < -0.35) return 'backward';
    if (side > 0.35) return 'strafeLeft';
    if (side < -0.35) return 'strafeRight';
    return 'walk';
}

// Which concrete action name should currently carry a locomotion weight
// (e.g. does 'walk' redirect to 'injuredWalk'). Pure and name-only so it's
// testable without the mixer/GLTF machinery createPlayer3dOverlay needs.
export function selectLocomotionActionName(name, isInjured, hasVariantClip) {
    const variant = INJURED_LOCOMOTION_VARIANTS[name];
    return isInjured && variant && hasVariantClip ? variant : name;
}

export function computeLocomotionWeights(state = {}) {
    if (state.isFalling) return { fall: 1 };
    if (!state.isMoving) return { idle: 1 };
    if (state.isSprinting) return { run: 1 };
    if (!state.hasAim) return { walk: 1 };

    const moveLength = Math.hypot(state.moveX ?? 0, state.moveZ ?? 0) || 1;
    const aimLength = Math.hypot(state.aimX ?? 0, state.aimZ ?? 1) || 1;
    const mx = (state.moveX ?? 0) / moveLength;
    const mz = (state.moveZ ?? 0) / moveLength;
    const ax = (state.aimX ?? 0) / aimLength;
    const az = (state.aimZ ?? 1) / aimLength;
    const forward = mx * ax + mz * az;
    const side = ax * mz - az * mx;
    const directional = {
        [state.isSprinting ? 'run' : 'walk']: Math.max(0, forward),
        backward: Math.max(0, -forward),
        strafeLeft: Math.max(0, side),
        strafeRight: Math.max(0, -side)
    };
    const total = Object.values(directional).reduce((sum, weight) => sum + weight, 0) || 1;
    const weights = { idle: 0.15 };
    for (const [name, weight] of Object.entries(directional)) {
        if (weight > 1e-4) weights[name] = (weight / total) * 0.85;
    }
    return weights;
}

function makeClipInPlace(source) {
    const clip = source.clone();
    for (const track of clip.tracks) {
        if (!/Hips\.position$/i.test(track.name) || track.getValueSize() !== 3) continue;
        // Mixamo's imported armature stores planar travel on local X/Y and
        // vertical body motion on local Z. Keep the vertical bob, but remove
        // authored travel so the cosmetic stays on the authoritative player.
        // Preserve each channel's starting offset; zeroing it would displace
        // the skeleton from its bind position.
        const anchorX = track.values[0];
        const anchorY = track.values[1];
        for (let index = 0; index < track.values.length; index += 3) {
            track.values[index] = anchorX;
            track.values[index + 1] = anchorY;
        }
    }
    return clip;
}

function retargetMixamoClip(source, fromPrefix, toPrefix, targetRoot) {
    const clip = source.clone();
    for (const track of clip.tracks) {
        track.name = track.name.replace(fromPrefix, toPrefix);
    }
    // Some Mixamo downloads omit finger chains or auxiliary bones. Feeding
    // those tracks to AnimationMixer produces a warning every frame/action.
    clip.tracks = clip.tracks.filter((track) => {
        const separator = track.name.lastIndexOf('.');
        const nodeName = separator >= 0 ? track.name.slice(0, separator) : track.name;
        if (!targetRoot.getObjectByName(nodeName)) return false;
        const property = separator >= 0 ? track.name.slice(separator + 1) : '';
        // Rotations retarget across compatible Mixamo rigs. Per-bone position
        // and scale tracks do not: they contain the source character's limb
        // lengths and can stretch another mesh hundreds of world units.
        return property === 'quaternion';
    });
    return clip;
}

function normalizeModel(root, targetHeight) {
    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root);
    const height = bounds.max.y - bounds.min.y;
    if (!Number.isFinite(height) || height <= 0) throw new Error('Mixamo model has no measurable height');
    const scale = targetHeight / height;
    root.scale.multiplyScalar(scale);
    root.updateMatrixWorld(true);
    const scaledBounds = new THREE.Box3().setFromObject(root);
    root.position.y -= scaledBounds.min.y;
    return scale;
}

export function computeOperatorPolishMaterialState(baseColor, baseRoughness, baseMetalness, polishColor) {
    const original = new THREE.Color(baseColor);
    const tint = new THREE.Color(polishColor);
    const isStandardIssue = tint.getHex() === 0xffffff;
    const color = original.clone();
    if (!isStandardIssue) color.lerp(original.clone().multiply(tint), 0.78);
    return {
        color,
        roughness: isStandardIssue ? baseRoughness : Math.min(baseRoughness, 0.36),
        metalness: isStandardIssue ? baseMetalness : Math.max(baseMetalness, 0.2)
    };
}

export async function createPlayer3dOverlay({
    targetHeight = 1.55,
    idleActionName = 'idle',
    weaponVisible = true,
    weaponEnabled = true,
    weaponArchetype = 'gg1',
    weaponMount = undefined,
    modelUrl = MODEL_URL,
    animationModelUrl = null,
    animationBonePrefix = null,
    allowStatic = false
} = {}) {
    const [modelTemplate, animationGltf] = await Promise.all([
        loadCharacterTemplate(modelUrl),
        animationModelUrl ? loadCharacterTemplate(animationModelUrl) : Promise.resolve(null)
    ]);
    const gltf = {
        ...modelTemplate,
        scene: cloneSkeleton(modelTemplate.scene)
    };
    const root = gltf.scene;
    root.name = 'Scout3dCosmeticOverlay';
    normalizeModel(root, targetHeight);

    root.traverse((object) => {
        if (!object.isMesh) return;
        object.castShadow = true;
        object.receiveShadow = false;
        object.frustumCulled = false;
        object.renderOrder = 7;
    });

    let rightHand = root.getObjectByName('mixamorig1:RightHand')
        ?? root.getObjectByName('mixamorig1RightHand');
    if (!rightHand) {
        root.traverse((object) => {
            if (!rightHand && /RightHand$/.test(object.name)) rightHand = object;
        });
    }
    const weapon = weaponEnabled && rightHand ? await createClassWeapon(weaponArchetype, weaponMount) : null;
    if (weapon) {
        // The Mixamo rig is authored in centimeters and normalized by scaling
        // its armature. Compensate for the hand's complete inherited scale so
        // the meter-scale GG1 is not shrunk again as a bone child.
        root.updateMatrixWorld(true);
        const handWorldScale = rightHand.getWorldScale(new THREE.Vector3());
        const inverseHandScale = 1 / Math.max(
            Math.abs(handWorldScale.x),
            Math.abs(handWorldScale.y),
            Math.abs(handWorldScale.z),
            1e-6
        );
        weapon.scale.multiplyScalar(inverseHandScale);
        weapon.position.multiplyScalar(inverseHandScale);
        weapon.visible = weaponVisible;
        rightHand.add(weapon);
    } else if (weaponEnabled) {
        console.warn('[player-3d-overlay] GG1 could not find Scout right-hand bone');
    }

    // SkeletonUtils clones the scene graph but leaves material instances shared
    // with the cached GLB template. Give this operator private materials so its
    // selected polish cannot recolor menu previews or another class instance.
    const materialClones = new Map();
    const polishMaterials = [];
    root.traverse((object) => {
        if (!object.isMesh || !object.material) return;
        let ancestor = object;
        while (ancestor && ancestor !== root) {
            if (ancestor === weapon) return;
            ancestor = ancestor.parent;
        }
        const cloneMaterial = (source) => {
            if (!source) return source;
            if (!materialClones.has(source)) {
                const clone = source.clone();
                materialClones.set(source, clone);
                if (clone.color) {
                    polishMaterials.push({
                        material: clone,
                        baseColor: clone.color.clone(),
                        baseRoughness: clone.roughness,
                        baseMetalness: clone.metalness
                    });
                }
            }
            return materialClones.get(source);
        };
        object.material = Array.isArray(object.material)
            ? object.material.map(cloneMaterial)
            : cloneMaterial(object.material);
    });

    const mixer = new THREE.AnimationMixer(root);
    const actions = new Map();
    // Keep animations embedded in the operator (for example Engineer's unique
    // gestures) and layer the shared locomotion pack on top. Previously an
    // external locomotion GLB silently discarded every animation in the model.
    const animationSources = [
        ...(gltf.animations ?? []).map((clip) => ({ clip, retarget: false })),
        ...(animationGltf?.animations ?? []).map((clip) => ({ clip, retarget: Boolean(animationBonePrefix) }))
    ];
    for (const { clip: sourceClip, retarget } of animationSources) {
        const retargeted = retarget
            ? retargetMixamoClip(sourceClip, 'mixamorig1', animationBonePrefix, root)
            : sourceClip;
        const clip = makeClipInPlace(retargeted);
        const action = mixer.clipAction(clip);
        if (ONE_SHOTS.has(clip.name)) {
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
        }
        actions.set(clip.name, action);
    }
    if (!actions.has(idleActionName) && !allowStatic) {
        throw new Error(`Character GLB is missing its ${idleActionName} animation`);
    }
    const idleActions = [...new Set(['idle', 'heroIdle', idleActionName])].filter((name) => actions.has(name));
    const blendableActions = [
        ...idleActions,
        ...BLENDABLE_ACTIONS.filter((name) => name !== 'idle')
    ];
    let forcedName = null;
    let forcedTimer = 0;
    let wasFalling = false;
    let wasReloading = false;
    let upperBodyTurn = 0;
    const upperBodyBones = ['Spine', 'Spine1'].map((suffix) => {
        let match = null;
        root.traverse((object) => {
            if (!match && object.isBone && object.name.endsWith(suffix)) match = object;
        });
        return match;
    }).filter(Boolean);
    const smoothedWeights = Object.fromEntries([...actions.keys()].map((name) => [name, 0]));
    const injuredVariantActions = Object.values(INJURED_LOCOMOTION_VARIANTS).filter((name) => actions.has(name));
    for (const name of [...blendableActions, ...injuredVariantActions]) {
        actions.get(name)?.setEffectiveWeight(0).play();
    }

    return {
        root,
        actions,
        weapon,
        setOperatorPolish(color = 0xffffff) {
            for (const state of polishMaterials) {
                const polished = computeOperatorPolishMaterialState(
                    state.baseColor,
                    state.baseRoughness,
                    state.baseMetalness,
                    color
                );
                state.material.color.copy(polished.color);
                if (Number.isFinite(polished.roughness)) state.material.roughness = polished.roughness;
                if (Number.isFinite(polished.metalness)) state.material.metalness = polished.metalness;
                state.material.needsUpdate = true;
            }
        },
        setWeaponVisible(visible) {
            if (weapon) weapon.visible = Boolean(visible);
        },
        trigger(name, duration = null) {
            if (!actions.has(name)) return;
            forcedName = name;
            forcedTimer = duration ?? actions.get(name).getClip().duration;
            actions.get(name).reset().setEffectiveWeight(0).play();
        },
        update(delta, state) {
            // Hips and legs follow travel. When stationary, the whole body can
            // settle toward aim instead of leaving the operator twisted.
            const followMovement = state.isMoving && Math.hypot(state.moveX, state.moveZ) > 1e-4;
            const facingX = followMovement ? state.moveX : (state.hasAim ? state.aimX : state.moveX);
            const facingZ = followMovement ? state.moveZ : (state.hasAim ? state.aimZ : state.moveZ);
            if (Math.hypot(facingX, facingZ) > 1e-4) {
                const targetYaw = computeOverlayYaw(facingX, facingZ);
                const yawDelta = Math.atan2(
                    Math.sin(targetYaw - root.rotation.y),
                    Math.cos(targetYaw - root.rotation.y)
                );
                root.rotation.y += yawDelta * (1 - Math.exp(-delta * 14));
            }
            if (wasFalling && !state.isFalling) this.trigger('land');
            if (!wasReloading && state.isReloading) this.trigger('reload');
            wasFalling = Boolean(state.isFalling);
            wasReloading = Boolean(state.isReloading);
            if (forcedTimer > 0) {
                forcedTimer = Math.max(0, forcedTimer - delta);
                if (forcedTimer === 0) {
                    actions.get(forcedName)?.fadeOut(0.1);
                    forcedName = null;
                }
            }
            let targets = computeLocomotionWeights(state);
            const requestedLocomotion = selectOverlayAnimation(state);
            if (!actions.has(requestedLocomotion) && actions.has(idleActionName)) {
                // Bind-pose or single-clip showroom models still need a stable
                // visible action when the menu's synthetic movement requests
                // walk/run clips they do not carry.
                targets = { idle: 1 };
            }
            const locomotionScale = forcedName && !state.isFalling ? 0.62 : 1;
            const activeIdleAction = actions.has(state.idleActionName)
                ? state.idleActionName
                : idleActionName;
            for (const name of blendableActions) {
                const isIdleAction = idleActions.includes(name);
                const targetKey = isIdleAction ? 'idle' : name;
                const idleEnabled = !isIdleAction || name === activeIdleAction;
                const baseTarget = (targets[targetKey] ?? 0) * locomotionScale * (idleEnabled ? 1 : 0);
                const variantName = INJURED_LOCOMOTION_VARIANTS[name];
                const hasVariantClip = Boolean(variantName && actions.has(variantName));
                const activeName = selectLocomotionActionName(name, Boolean(state.isInjured), hasVariantClip);
                // Drive both the base clip and its injured counterpart every
                // frame (one target, one zero) so the swap cross-fades through
                // the same damping every other locomotion blend uses here,
                // instead of snapping when isInjured flips.
                for (const candidate of hasVariantClip ? [name, variantName] : [name]) {
                    const target = candidate === activeName ? baseTarget : 0;
                    smoothedWeights[candidate] = THREE.MathUtils.damp(
                        smoothedWeights[candidate] ?? 0,
                        target,
                        14,
                        delta
                    );
                    actions.get(candidate)?.setEffectiveWeight(smoothedWeights[candidate]);
                }
            }
            if (forcedName) {
                const forcedAction = actions.get(forcedName);
                const forcedWeight = THREE.MathUtils.damp(
                    forcedAction.getEffectiveWeight(),
                    state.isFalling ? 0 : 1,
                    18,
                    delta
                );
                forcedAction.setEffectiveWeight(forcedWeight);
            }
            mixer.update(delta);
            const targetUpperBodyTurn = followMovement && state.hasAim
                ? computeUpperBodyAimOffset(root.rotation.y, state.aimX, state.aimZ)
                : 0;
            upperBodyTurn = THREE.MathUtils.damp(upperBodyTurn, targetUpperBodyTurn, 12, delta);
            const turnPerBone = upperBodyTurn / Math.max(upperBodyBones.length, 1);
            for (const bone of upperBodyBones) bone.rotation.y += turnPerBone;
        },
        dispose() {
            mixer.stopAllAction();
            root.traverse((object) => {
                object.geometry?.dispose?.();
                const materials = Array.isArray(object.material) ? object.material : [object.material];
                for (const material of materials) material?.dispose?.();
            });
            root.removeFromParent();
        }
    };
}
