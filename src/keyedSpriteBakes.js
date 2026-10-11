/**
 * Keyed sprites, baked. Most world sprites arrive as PNGs keyed at runtime
 * (green and black backdrops flood-filled out on a canvas), which leaves each
 * one an uncompressed RGBA canvas on the GPU: about 400 MiB in a real run.
 * The keyed result only depends on the PNG, the threshold and the crop, so
 * it is baked ahead of time (tests/e2e/probes/keyed-sprite-bake.spec.js runs
 * the game's own keyer, scripts/art/build_keyed_sprite_ktx2.py encodes the
 * results as mipmapped UASTC KTX2 with alpha) and loaded compressed. A sprite
 * without a bake, or with baking switched off (hb_sprite_ktx2=0), keys at
 * runtime as before.
 */
import * as THREE from 'three';
import { KEYED_SPRITE_BAKES } from './data/keyedSpriteBakes.js';

function normalizePath(path) {
    let value = String(path ?? '');
    try {
        if (/^[a-z]+:\/\//i.test(value)) value = new URL(value).pathname;
    } catch { /* keep as written */ }
    value = value.replace(/^\.\//, '').replace(/^\/+/, '');
    return `/${decodeURIComponent(value)}`;
}

/** One name per keyed result: the source path, the black-key threshold and the bottom crop. */
export function keyedSpriteBakeKey(path, threshold = 15, cropBottomRatio = 0) {
    const crop = Number(cropBottomRatio) || 0;
    return `${normalizePath(path)}::${threshold}::${crop}`;
}

export function isKeyedSpriteBakeEnabled(storage = globalThis.localStorage) {
    try {
        return storage?.getItem?.('hb_sprite_ktx2') !== '0';
    } catch {
        return true;
    }
}

export function bakedKeyedSpriteUrl(key, { bakes = KEYED_SPRITE_BAKES, storage = globalThis.localStorage } = {}) {
    if (!key || !isKeyedSpriteBakeEnabled(storage)) return null;
    return bakes[key]?.url ?? null;
}

/**
 * Callers get their Texture before any pixels exist and hand it straight to
 * materials, so the compressed sprite is poured into that same object.
 */
/**
 * Whether a baked sprite can upload: block-compressed formats need sides in
 * multiples of four (627 x 627 bakes failed glTexStorage and drew nothing).
 */
export function isUploadableCompressedSprite(compressed) {
    const width = compressed?.image?.width;
    const height = compressed?.image?.height;
    return Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0
        && width % 4 === 0 && height % 4 === 0;
}

export function applyCompressedSprite(texture, compressed) {
    texture.isCompressedTexture = true;
    texture.mipmaps = compressed.mipmaps;
    texture.image = { width: compressed.image.width, height: compressed.image.height };
    texture.format = compressed.format;
    texture.type = compressed.type;
    texture.generateMipmaps = false;
    // Baked bottom-up: compressed uploads can't flip.
    texture.flipY = false;
    texture.minFilter = compressed.mipmaps?.length > 1 ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
}

// Keyed results kept for the bake probe; empty unless a bake is running.
const recorded = new Map();
export function recordKeyedSprite(key, image) {
    if (!globalThis.__HB_SPRITE_BAKE__ || !key || !image) return;
    recorded.set(key, image);
}
export function listRecordedKeyedSprites() {
    return [...recorded].map(([key, image]) => ({ key, image }));
}
