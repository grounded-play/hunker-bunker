import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PLAYER_SPRITE_LAYOUTS } from './playerSpriteLayouts.js';

// main.js renderTitleProfilePortrait draws these pre-cut frames instead of
// downloading and chroma-keying a whole walk sheet at boot (issue #106).
// Regenerate with scripts/build-title-portraits.mjs when a sheet changes.
describe('title operator portraits', () => {
    it.each(Object.keys(PLAYER_SPRITE_LAYOUTS))('has a small pre-cut portrait for %s', (type) => {
        const png = readFileSync(new URL(`../public/portraits/title_${type.toLowerCase()}.png`, import.meta.url));
        expect(png.subarray(1, 4).toString()).toBe('PNG');
        const width = png.readUInt32BE(16);
        const height = png.readUInt32BE(20);
        expect(width).toBeGreaterThan(32);
        expect(height).toBeGreaterThan(32);
        expect(png.length).toBeLessThan(150_000);
    });
});
