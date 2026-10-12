/**
 * One parsed glTF per URL, shared by every overlay that loads characters.
 *
 * The player overlay and the enemy overlay each kept their own template cache,
 * so `Scout.game.glb` (7.7 MB; the Tank's animation source and the corrupted
 * scout boss) was downloaded and parsed twice on every boot (2026-10-05 boot
 * trace). Callers clone the scene (SkeletonUtils) and clone a material before
 * editing it, so the shared template is never mutated.
 */
import { assetUrl } from './assetUrl.js';
import { createGltfLoader } from './gltfLoaderFactory.js';

const templates = new Map();

export function loadGltfTemplate(url, { createLoader = () => createGltfLoader() } = {}) {
    if (!templates.has(url)) {
        const promise = createLoader().loadAsync(assetUrl(url)).catch((error) => {
            templates.delete(url);
            throw error;
        });
        templates.set(url, promise);
    }
    return templates.get(url);
}

export function hasGltfTemplate(url) {
    return templates.has(url);
}
