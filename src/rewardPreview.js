import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { assetUrl } from './assetUrl.js';
import { CHARM_GLB_MAP, MOD_GLB_MAP } from './armoryScene.js';
import { CHASSIS_SKIN_MODELS, WEAPON_ARCHETYPES, WEAPON_SKIN_MESHES } from './player3dOverlay.js';
import { getCharmSocketTransform } from './charmSockets.js';
import { getWeaponCalibration, getWeaponScaleForBounds } from './weaponCalibration.js';
import { PRESENTATION_EVENTS, presentationTelemetry } from './presentationTelemetry.js';

const templateCache = new Map();
const NON_3D_CATEGORIES = new Set(['decal', 'emblem', 'currency', 'cache', 'voice', 'voice_pack', 'hud', 'hud_theme', 'reagent', 'token']);

function createLoader() {
    return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
}

function normalizeCategory(category) {
    const value = String(category || '').toLowerCase().replace(/[-\s]/g, '_');
    if (value.includes('weapon') || value === 'gun') return 'weapon';
    if (value.includes('chassis') || value === 'character' || value === 'skin') return 'chassis';
    if (value.includes('charm')) return 'charm';
    if (value.includes('module') || value === 'rig') return 'module';
    return value;
}

function resolveArchetype(archetypeId) {
    const requested = String(
        archetypeId
        ?? globalThis.window?.game?.currentWeaponType
        ?? globalThis.window?.loadout?.getClassLoadout?.(globalThis.window?.game?.playerType?.toLowerCase?.())?.archetypeId
        ?? 'gg1'
    ).toLowerCase();
    return WEAPON_ARCHETYPES[requested] ? requested : 'gg1';
}

function resolvePreviewUrl(itemId, category, archetypeId) {
    const id = String(itemId ?? '');
    if (category === 'weapon') return WEAPON_SKIN_MESHES[id] ?? WEAPON_ARCHETYPES[resolveArchetype(archetypeId)] ?? null;
    if (category === 'chassis') return CHASSIS_SKIN_MODELS[id] ?? null;
    if (category === 'charm') return CHARM_GLB_MAP[id] ?? null;
    if (category === 'module') return MOD_GLB_MAP[id] ?? null;
    return null;
}

function loadTemplate(url) {
    if (!templateCache.has(url)) {
        const loader = createLoader();
        const promise = loader.loadAsync(assetUrl(url)).catch((error) => {
            templateCache.delete(url);
            throw error;
        });
        templateCache.set(url, promise);
    }
    return templateCache.get(url);
}

function cloneWithOwnedMaterials(source) {
    const clone = source.clone(true);
    const textureProperties = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'alphaMap'];
    const cloneMaterial = (material) => {
        const owned = material?.clone?.() ?? material;
        if (!owned) return owned;
        for (const property of textureProperties) {
            if (owned[property]?.clone) owned[property] = owned[property].clone();
        }
        return owned;
    };
    clone.traverse((object) => {
        if (!object.isMesh) return;
        object.material = Array.isArray(object.material)
            ? object.material.map(cloneMaterial)
            : cloneMaterial(object.material);
        object.castShadow = false;
        object.receiveShadow = false;
        object.frustumCulled = true;
    });
    return clone;
}

function disposeObject(root) {
    root?.traverse?.((object) => {
        object.geometry?.dispose?.();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
            if (!material) continue;
            material.map?.dispose?.();
            material.normalMap?.dispose?.();
            material.roughnessMap?.dispose?.();
            material.metalnessMap?.dispose?.();
            material.emissiveMap?.dispose?.();
            material.dispose?.();
        }
    });
}

function getSize(root) {
    return new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
}

function centerAndFrame(root, camera, category) {
    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root);
    root.position.sub(bounds.getCenter(new THREE.Vector3()));
    root.updateMatrixWorld(true);
    const radius = Math.max(new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()).length() * 0.5, 0.35);
    const framingMultiplier = category === 'chassis' ? 2.35 : 2.8;
    camera.position.set(radius * 0.9, radius * 0.65, radius * framingMultiplier);
    camera.near = Math.max(0.01, radius * 0.01);
    camera.far = Math.max(50, radius * 12);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
}

function failResult(reason, detail = {}) {
    return { ok: false, reason, ...detail };
}

/** Mount a disposable 3D reward turntable. The returned promise never rejects. */
export function mountRewardPreview({ container, itemId, category, archetypeId = null } = {}) {
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    let disposed = false;
    let animationFrame = null;
    let resizeHandler = null;
    let renderer = null;
    let scene = null;
    let root = null;
    let canvas = null;
    const dispose = () => {
        if (disposed) return;
        disposed = true;
        if (animationFrame !== null) cancelAnimationFrame(animationFrame);
        if (resizeHandler && typeof window !== 'undefined') window.removeEventListener('resize', resizeHandler);
        disposeObject(root);
        root?.removeFromParent?.();
        renderer?.dispose?.();
        renderer?.forceContextLoss?.();
        canvas?.remove?.();
        renderer = null;
        scene = null;
        root = null;
        canvas = null;
    };

    const ready = Promise.resolve().then(async () => {
        const normalizedCategory = normalizeCategory(category);
        if (disposed) return failResult('preview-disposed');
        if (NON_3D_CATEGORIES.has(normalizedCategory)) {
            presentationTelemetry.emit('REWARD', PRESENTATION_EVENTS.REWARD.PREVIEW_FAILED, { itemId, category: normalizedCategory, reason: 'preview-not-3d' });
            return failResult('preview-not-3d');
        }
        if (!container || typeof document === 'undefined' || typeof container.appendChild !== 'function') {
            presentationTelemetry.emit('REWARD', PRESENTATION_EVENTS.REWARD.PREVIEW_FAILED, { itemId, category: normalizedCategory, reason: 'container-missing' });
            return failResult('container-missing');
        }
        const resolvedArchetype = resolveArchetype(archetypeId);
        const url = resolvePreviewUrl(itemId, normalizedCategory, resolvedArchetype);
        if (!url) {
            presentationTelemetry.emit('REWARD', PRESENTATION_EVENTS.REWARD.PREVIEW_FAILED, { itemId, category: normalizedCategory, reason: 'asset-missing' });
            return failResult('asset-missing', { itemId: String(itemId ?? '') });
        }
        try {
            canvas = document.createElement('canvas');
            canvas.className = 'reward-preview-canvas';
            canvas.setAttribute('aria-hidden', 'true');
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            container.appendChild(canvas);
            const width = Math.max(1, container.clientWidth || 420);
            const height = Math.max(1, container.clientHeight || 360);
            renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
            renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.5));
            renderer.setSize(width, height, false);
            renderer.setClearColor(0x000000, 0);
            renderer.outputColorSpace = THREE.SRGBColorSpace;
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.12;
            scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(32, width / height, 0.01, 100);
            scene.add(new THREE.HemisphereLight(0x6688aa, 0x10141b, 1.8));
            const key = new THREE.DirectionalLight(0xd8eaff, 2.6);
            key.position.set(3, 4, 5);
            scene.add(key);
            const rim = new THREE.DirectionalLight(0x00e5ff, 1.15);
            rim.position.set(-4, 2, -2);
            scene.add(rim);

            const assetLoadStartedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
            const gltf = await loadTemplate(url);
            const assetLoadMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - assetLoadStartedAt;
            if (disposed) return failResult('preview-disposed');
            root = new THREE.Group();
            const model = cloneWithOwnedMaterials(gltf.scene);
            root.add(model);
            if (normalizedCategory === 'weapon' || normalizedCategory === 'charm') {
                const weaponArchetype = resolveArchetype(resolvedArchetype);
                const weaponCalibration = getWeaponCalibration(weaponArchetype, 'reward');
                let weaponModel = model;
                if (normalizedCategory === 'charm') {
                    root.remove(model);
                    weaponModel = cloneWithOwnedMaterials((await loadTemplate(WEAPON_ARCHETYPES[weaponArchetype])).scene);
                    root.add(weaponModel);
                    const socket = new THREE.Group();
                    const socketTransform = getCharmSocketTransform(weaponArchetype);
                    socket.position.fromArray(socketTransform.position);
                    socket.rotation.fromArray(socketTransform.rotation);
                    socket.scale.setScalar(socketTransform.scale);
                    weaponModel.add(socket);
                    const charmSize = getSize(model);
                    model.position.set(0, -0.05, 0);
                    model.scale.setScalar(0.18 / Math.max(charmSize.length(), 0.001));
                    socket.add(model);
                }
                const size = getSize(weaponModel);
                weaponModel.scale.setScalar(getWeaponScaleForBounds(size, weaponArchetype, 'reward'));
                weaponModel.rotation.fromArray(weaponCalibration.rotation);
            } else if (normalizedCategory === 'chassis') {
                const size = getSize(model);
                model.scale.setScalar(1.9 / Math.max(size.y, 0.001));
            } else if (normalizedCategory === 'module') {
                model.scale.setScalar(0.8 / Math.max(getSize(model).length(), 0.001));
            }
            scene.add(root);
            centerAndFrame(root, camera, normalizedCategory);
            resizeHandler = () => {
                if (!renderer || !canvas || disposed) return;
                const nextWidth = Math.max(1, container.clientWidth || 420);
                const nextHeight = Math.max(1, container.clientHeight || 360);
                camera.aspect = nextWidth / nextHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(nextWidth, nextHeight, false);
            };
            window.addEventListener('resize', resizeHandler);
            let lastTime = performance.now();
            const animate = (now) => {
                if (disposed || !renderer || !scene) return;
                animationFrame = requestAnimationFrame(animate);
                const delta = Math.min(Math.max((now - lastTime) / 1000, 0), 0.1);
                lastTime = now;
                root.rotation.y += delta * 0.22;
                renderer.render(scene, camera);
            };
            renderer.render(scene, camera);
            animationFrame = requestAnimationFrame(animate);
            const previewOpenToMountMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
            const metrics = {
                previewOpenToMountMs: Math.round(previewOpenToMountMs * 10) / 10,
                assetLoadMs: Math.round(assetLoadMs * 10) / 10,
                drawCalls: renderer.info?.render?.calls ?? null,
                triangles: renderer.info?.render?.triangles ?? null
            };
            presentationTelemetry.emit('REWARD', PRESENTATION_EVENTS.REWARD.PREVIEW_READY, { itemId, category: normalizedCategory, archetype: resolvedArchetype, metrics });
            return { ok: true, metrics };
        } catch (error) {
            dispose();
            presentationTelemetry.emit('REWARD', PRESENTATION_EVENTS.REWARD.PREVIEW_FAILED, { itemId, category: normalizedCategory, reason: 'preview-load-failed', error: error?.message ?? String(error) });
            return failResult('preview-load-failed', { error: error?.message ?? String(error) });
        }
    });
    return { ready, dispose };
}

export function clearRewardPreviewCache() {
    templateCache.clear();
}
