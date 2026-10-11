import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
    isUploadableCompressedSprite,
    applyCompressedSprite, bakedKeyedSpriteUrl, isKeyedSpriteBakeEnabled, keyedSpriteBakeKey,
    listRecordedKeyedSprites, recordKeyedSprite
} from './keyedSpriteBakes.js';

describe('keyedSpriteBakeKey', () => {
    it('names a keyed sprite the same however its path is written', () => {
        const key = keyedSpriteBakeKey('/bunker_junk.png', 15, 0);
        expect(keyedSpriteBakeKey('bunker_junk.png', 15)).toBe(key);
        expect(keyedSpriteBakeKey('./bunker_junk.png', 15, undefined)).toBe(key);
        expect(keyedSpriteBakeKey('http://localhost:5199/bunker_junk.png', 15, 0)).toBe(key);
        // Threshold and crop change the keyed pixels, so they change the key.
        expect(keyedSpriteBakeKey('/bunker_junk.png', 14, 0)).not.toBe(key);
        expect(keyedSpriteBakeKey('/bunker_junk.png', 15, 0.16)).not.toBe(key);
    });
});

describe('bakedKeyedSpriteUrl', () => {
    it('finds a bake by key, and nothing for an unknown sprite or when switched off', () => {
        const bakes = { '/a.png::15::0': { url: '/3d/runtime/sprites/a.ktx2', sha1: 'x' } };
        expect(bakedKeyedSpriteUrl('/a.png::15::0', { bakes })).toBe('/3d/runtime/sprites/a.ktx2');
        expect(bakedKeyedSpriteUrl('/b.png::15::0', { bakes })).toBeNull();
        const off = { getItem: (name) => (name === 'hb_sprite_ktx2' ? '0' : null) };
        expect(isKeyedSpriteBakeEnabled(off)).toBe(false);
        expect(bakedKeyedSpriteUrl('/a.png::15::0', { bakes, storage: off })).toBeNull();
    });
});

describe('applyCompressedSprite', () => {
    it('turns the texture a material already holds into the compressed sprite, mipmapped', () => {
        const texture = new THREE.Texture();
        const compressed = new THREE.CompressedTexture(
            [{ data: new Uint8Array(16), width: 4, height: 4 }, { data: new Uint8Array(16), width: 2, height: 2 }],
            4, 4, THREE.RGBA_BPTC_Format
        );
        applyCompressedSprite(texture, compressed);
        expect(texture.isCompressedTexture).toBe(true);
        expect(texture.image.width).toBe(4);
        expect(texture.mipmaps).toHaveLength(2);
        expect(texture.format).toBe(THREE.RGBA_BPTC_Format);
        expect(texture.flipY).toBe(false);
        expect(texture.generateMipmaps).toBe(false);
        expect(texture.minFilter).toBe(THREE.LinearMipmapLinearFilter);
        expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
    });
});

describe('isUploadableCompressedSprite', () => {
    // Block-compressed uploads need sides in multiples of four: 627 x 627
    // bakes failed glTexStorage on the GPU and drew nothing.
    it('accepts only sides in multiples of four', () => {
        const make = (width, height) => new THREE.CompressedTexture([{ data: new Uint8Array(16), width, height }], width, height, THREE.RGBA_BPTC_Format);
        expect(isUploadableCompressedSprite(make(628, 628))).toBe(true);
        expect(isUploadableCompressedSprite(make(627, 627))).toBe(false);
        expect(isUploadableCompressedSprite(make(1588, 990))).toBe(false);
        expect(isUploadableCompressedSprite(null)).toBe(false);
    });
});

describe('recordKeyedSprite', () => {
    it('keeps keyed results for the bake only while a bake is running', () => {
        const canvas = { width: 2, height: 2 };
        recordKeyedSprite('/a.png::15::0', canvas);
        expect(listRecordedKeyedSprites()).toEqual([]);
        globalThis.__HB_SPRITE_BAKE__ = true;
        try {
            recordKeyedSprite('/a.png::15::0', canvas);
            expect(listRecordedKeyedSprites()).toEqual([{ key: '/a.png::15::0', image: canvas }]);
        } finally {
            delete globalThis.__HB_SPRITE_BAKE__;
        }
    });
});

describe('KEYED_SPRITE_BAKES', () => {
    it('ships every bake, each keyed from the source PNG as it is now', async () => {
        const fs = await import('node:fs');
        const crypto = await import('node:crypto');
        const { KEYED_SPRITE_BAKES } = await import('./data/keyedSpriteBakes.js');
        const stale = [];
        for (const [key, { url, sha1 }] of Object.entries(KEYED_SPRITE_BAKES)) {
            expect(fs.existsSync(`public${url}`), url).toBe(true);
            const source = `public${key.split('::')[0]}`;
            const now = crypto.createHash('sha1').update(fs.readFileSync(source)).digest('hex');
            // Re-run the bake (scripts/art/build_keyed_sprite_ktx2.py) after editing a sprite.
            if (now !== sha1) stale.push(source);
        }
        expect(stale).toEqual([]);
    });

    it('ships every bake with sides in multiples of four, so it uploads', async () => {
        const fs = await import('node:fs');
        const { KEYED_SPRITE_BAKES } = await import('./data/keyedSpriteBakes.js');
        const bad = [];
        for (const { url } of Object.values(KEYED_SPRITE_BAKES)) {
            const header = fs.readFileSync(`public${url}`).subarray(0, 28);
            const width = header.readUInt32LE(20);
            const height = header.readUInt32LE(24);
            if (width % 4 || height % 4) bad.push(`${url} ${width}x${height}`);
        }
        expect(bad).toEqual([]);
    });
});
