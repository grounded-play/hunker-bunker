import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { floorSurfaceFileNames } from './floorSplat.js';
import { LEGACY_DECAL_LAYERS } from './data/legacyDecalLayers.js';
import { KEYED_SPRITE_BAKES } from './data/keyedSpriteBakes.js';
import { STICKER_LAYERS } from './data/stickerLayers.js';
import { SPLINE_LAYERS } from './splineDressingRenderer.js';

const ROOT = 'public/3d/runtime';
const files = (directory) => fs.readdirSync(path.join(ROOT, directory))
    .filter((name) => name.endsWith('.ktx2'))
    .sort();
const pairedMaps = (names) => names
    .flatMap((name) => [`${name}_albedo.ktx2`, `${name}_detail.ktx2`])
    .sort();

describe('runtime KTX2 coverage', () => {
    it('has no unregistered or missing standalone texture payloads', () => {
        expect(files('surfaces')).toEqual(pairedMaps(floorSurfaceFileNames()));
        expect(files('decals')).toEqual(pairedMaps(STICKER_LAYERS.map((layer) => layer.name)));
        expect(files('decals/legacy')).toEqual(pairedMaps(LEGACY_DECAL_LAYERS.map((layer) => layer.name)));
        expect(files('splines')).toEqual(pairedMaps(SPLINE_LAYERS.map((layer) => `spline_${layer.kind}`)));
        expect(files('sprites')).toEqual(Object.values(KEYED_SPRITE_BAKES)
            .map(({ url }) => path.basename(url))
            .sort());
    });
});
