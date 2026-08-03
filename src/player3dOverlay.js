import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { assetUrl } from './assetUrl.js';

const MODEL_URL = '/3d/scouting-scout/Scout.game.glb';

const ONE_SHOTS = new Set(['fire', 'hit', 'land']);

export function computeOverlayYaw(directionX, directionZ) {
    if (Math.hypot(directionX, directionZ) < 1e-5) return 0;
    // Mixamo characters face +Z after FBXLoader's axis conversion.
    return Math.atan2(directionX, directionZ);
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

export async function createPlayer3dOverlay({ targetHeight = 1.55 } = {}) {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(assetUrl(MODEL_URL));
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

    const mixer = new THREE.AnimationMixer(root);
    const actions = new Map();
    for (const clip of gltf.animations) {
        const action = mixer.clipAction(clip);
        if (ONE_SHOTS.has(clip.name)) {
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
        }
        actions.set(clip.name, action);
    }
    if (!actions.has('idle')) throw new Error('Scout GLB is missing its idle animation');
    let currentName = null;
    let currentAction = null;
    let forcedName = null;
    let forcedTimer = 0;

    function transition(name, fadeSeconds = 0.16) {
        const next = actions.get(name) ?? actions.get('idle');
        if (!next || (currentName === name && currentAction === next)) return;
        next.reset().fadeIn(fadeSeconds).play();
        currentAction?.fadeOut(fadeSeconds);
        currentAction = next;
        currentName = name;
    }

    transition('idle', 0);

    return {
        root,
        actions,
        trigger(name, duration = null) {
            if (!actions.has(name)) return;
            forcedName = name;
            forcedTimer = duration ?? actions.get(name).getClip().duration;
            if (currentName === name) {
                actions.get(name).reset().play();
                return;
            }
            transition(name, 0.06);
        },
        update(delta, state) {
            const facingX = state.hasAim ? state.aimX : state.moveX;
            const facingZ = state.hasAim ? state.aimZ : state.moveZ;
            if (Math.hypot(facingX, facingZ) > 1e-4) {
                root.rotation.y = computeOverlayYaw(facingX, facingZ);
            }
            if (forcedTimer > 0) {
                forcedTimer = Math.max(0, forcedTimer - delta);
                if (forcedTimer === 0) forcedName = null;
            }
            const desired = forcedName ?? selectOverlayAnimation(state);
            transition(desired);
            mixer.update(delta);
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
