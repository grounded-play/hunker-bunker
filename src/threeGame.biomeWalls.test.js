import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Sprint 53 Section W: Biome Wall Reskinning & Overrides', () => {
    const threeGameSource = fs.readFileSync(path.resolve('src/threeGame.js'), 'utf-8');

    it('maps place overrides to their respective PBR suite styles (W2)', () => {
        expect(threeGameSource).toContain("'giger-cathedral': 6");
        expect(threeGameSource).toContain("'shrine': 5");
        expect(threeGameSource).toContain("'canyon': 7");
        expect(threeGameSource).toContain("'bunker-security': 8");
        expect(threeGameSource).toContain("'bunker-armory': 8");
    });

    it('samples modular PBR suite atlas across rings with smooth blending (W1)', () => {
        expect(threeGameSource).toContain('vec3 pbrBunkerCol = texture2D(tRoomWallColorAtlas, uvPbrBunker).rgb;');
        expect(threeGameSource).toContain('vec3 pbrCryoCol = texture2D(tRoomWallColorAtlas, uvPbrCryo).rgb;');
        expect(threeGameSource).toContain('vec3 pbrBioCol = mix(texture2D(tRoomWallColorAtlas, uvPbrBio).rgb, texture2D(tRoomWallColorAtlas, uvPbrGiger).rgb, deepBio);');
        expect(threeGameSource).toContain('vec3 pbrRingCol = mix(pbrBunkerCol, pbrCryoCol, cryoMix);');
    });

    it('applies wall top and trim shading so blocks do not read as flat cubes (W3)', () => {
        expect(threeGameSource).toContain('float wallBaseDist = clamp(vWorldPos.y * 1.7, 0.0, 1.0);');
        expect(threeGameSource).toContain('float trimDarken = smoothstep(0.0, 0.45, wallBaseDist);');
    });

    it('includes geothermal and hive_resin textures in runtime kit directory (W4)', () => {
        const texDir = path.resolve('public/3d/runtime/kits/textures');
        const requiredFiles = [
            'geothermal_wall_color.webp',
            'geothermal_wall_normal.webp',
            'geothermal_wall_rough.webp',
            'geothermal_wall_emissive.webp',
            'hive_resin_wall_color.webp',
            'hive_resin_wall_normal.webp',
            'hive_resin_wall_rough.webp',
            'hive_resin_wall_emissive.webp'
        ];
        for (const file of requiredFiles) {
            expect(fs.existsSync(path.join(texDir, file)), file).toBe(true);
        }
    });
});
