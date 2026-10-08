import { createWorld3dModel, hasWorld3dModel } from './world3dOverlay.js';

export const COMMON_CORPSE_3D_TYPES = Object.freeze([
    'cybersnail_dead',
    'cryosnail_dead',
    'sporesnail_dead'
]);

const prewarmedCorpseRootsByRenderer = new WeakMap();

export function prepareCorpse3dModel(root) {
    const materialClones = new Map();
    root?.traverse((child) => {
        if (!child.isMesh || !child.material) return;
        const cloneMaterial = (source) => {
            if (!materialClones.has(source)) {
                const material = source.clone();
                material.transparent = true;
                materialClones.set(source, material);
            }
            return materialClones.get(source);
        };
        child.material = Array.isArray(child.material)
            ? child.material.map(cloneMaterial)
            : cloneMaterial(child.material);
    });
    return root;
}

export function corpse3dTypeForEnemy(type) {
    const corpseType = `${type}_dead`;
    return COMMON_CORPSE_3D_TYPES.includes(corpseType) && hasWorld3dModel(corpseType)
        ? corpseType
        : null;
}

// Keep one prepared root per regular corpse type alive after compileAsync.
// Three releases a program when its last material is disposed, so discarding
// the warmup material would make the first real corpse pay the compile again.
export function prewarmCorpse3dTemplate(game, type, loadModel = createWorld3dModel) {
    if (!COMMON_CORPSE_3D_TYPES.includes(type) || !game?.renderer?.compileAsync || !game.camera || !game.scene) {
        return Promise.resolve(null);
    }
    let prewarmedCorpseRoots = prewarmedCorpseRootsByRenderer.get(game.renderer);
    if (!prewarmedCorpseRoots) {
        prewarmedCorpseRoots = new Map();
        prewarmedCorpseRootsByRenderer.set(game.renderer, prewarmedCorpseRoots);
    }
    if (prewarmedCorpseRoots.has(type)) return prewarmedCorpseRoots.get(type);

    const promise = Promise.resolve(loadModel(type))
        .then(async (root) => {
            if (!root) return null;
            prepareCorpse3dModel(root);
            await game.renderer.compileAsync(root, game.camera, game.scene);
            return root;
        })
        .catch((error) => {
            prewarmedCorpseRoots.delete(type);
            throw error;
        });
    prewarmedCorpseRoots.set(type, promise);
    return promise;
}

export async function prewarmCommonCorpse3dTemplates(game, loadModel = createWorld3dModel) {
    const roots = [];
    for (const type of COMMON_CORPSE_3D_TYPES) {
        try {
            roots.push(await prewarmCorpse3dTemplate(game, type, loadModel));
        } catch (error) {
            console.warn(`[corpse-3d] shader prewarm failed for ${type}`, error);
        }
    }
    return roots.filter(Boolean);
}
