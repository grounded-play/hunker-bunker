import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { assetUrl } from './assetUrl.js';

const MODEL_URL = '/3d/scouting-scout/Scout.game.glb';
const WEAPON_URL = '/3d/GG.1.glb';

export const ENGINEER_GESTURES = Object.freeze([
    'engineerWeightShift', 'engineerDismiss', 'engineerThoughtful', 'engineerCocky',
    'engineerHappy', 'engineerRelieved', 'engineerNod', 'engineerAngry',
    'engineerAnnoyed', 'engineerLookAway', 'engineerSarcastic',
    'engineerAcknowledge', 'engineerHardNod', 'engineerLongNod', 'engineerNo'
]);
const ONE_SHOTS = new Set(['fire', 'reload', 'hit', 'land', 'melee', ...ENGINEER_GESTURES]);
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
let weaponTemplatePromise = null;
const characterTemplates = new Map();

function loadCharacterTemplate(url) {
    if (!characterTemplates.has(url)) {
        characterTemplates.set(url, new GLTFLoader().loadAsync(assetUrl(url)));
    }
    return characterTemplates.get(url);
}

async function createGg1Weapon({ position = [0.03, 0.02, -0.10] } = {}) {
    weaponTemplatePromise ??= new GLTFLoader().loadAsync(assetUrl(WEAPON_URL));
    const template = await weaponTemplatePromise;
    const weapon = template.scene.clone(true);
    weapon.name = 'ScoutGG1';
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

export function computeUpperBodyAimOffset(rootYaw, aimX, aimZ, maxTurn = Math.PI / 2) {
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
    if (!hasAim) return isSprinting ? 'run' : 'walk';

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
    return isSprinting ? 'run' : 'walk';
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
    if (!state.hasAim) return { [state.isSprinting ? 'run' : 'walk']: 1 };

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
    const weapon = weaponEnabled && rightHand ? await createGg1Weapon(weaponMount) : null;
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
