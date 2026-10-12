import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

// Owner, 2026-10-07: "in the debug museum and walls I still see random
// placeholder arts, like machine cult in purple and just boxes". Five world
// textures were 64x64 blue cards with their own names typed on them. Every
// sprite texture the game registers for the world must be real art.
const PLACEHOLDER_MAX_BYTES = 1500;

function registeredWorldTextures() {
    const source = fs.readFileSync(new URL('./threeGame.js', import.meta.url), 'utf8');
    const paths = [...source.matchAll(/load(?:KeyedSprite|Scatter)Texture\(\s*'(\/[^']+\.(?:png|webp))'/g)].map((m) => m[1]);
    return [...new Set(paths)];
}

describe('world textures are real art', () => {
    it('finds the registered textures', () => {
        expect(registeredWorldTextures().length).toBeGreaterThan(100);
    });

    it('registers no placeholder cards', () => {
        const placeholders = registeredWorldTextures().filter((path) => {
            const file = new URL(`../public${path}`, import.meta.url);
            return !fs.existsSync(file) || fs.statSync(file).size <= PLACEHOLDER_MAX_BYTES;
        });
        expect(placeholders).toEqual([]);
    });

    it('places no prop whose art does not exist yet', async () => {
        const themes = await import('./roomThemes.js');
        const placed = JSON.stringify([themes.LIVED_IN_DECALS, themes.ROOM_THEME_CATALOG, themes.PRESENTATION_STATE_MODIFIERS]);
        expect(placed.length).toBeGreaterThan(1000);
        expect(placed).not.toContain('decal_tallow_herb_cache');
    });
});
