import { describe, expect, it } from 'vitest';
import { TiltShiftPassShader } from './threeGame.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const threeGameSource = readFileSync(fileURLToPath(new URL('./threeGame.js', import.meta.url)), 'utf8');

describe('Visual Overhaul Phase B & D (Surface Depth & Grade)', () => {
    describe('Phase D: Compositor Film Grain & Post Grade', () => {
        it('includes subtle analog film grain in TiltShiftPassShader', () => {
            const frag = TiltShiftPassShader.fragmentShader;
            expect(frag).toContain('hbFilmNoise');
            expect(frag).toContain('0.018');
        });
    });

    describe('Phase B: Surface Roughness Break-up and Normal Perturbation', () => {
        it('injects roughness variation and derived surface relief into floorMaterial', () => {
            expect(threeGameSource).toContain('hbFloorRoughness = mix(bunkerRough, cryoRough, cryoMix)');
            expect(threeGameSource).toContain('hbFloorNormalPerturb = vec3(-dFloorX * 1.5, 0.0, -dFloorY * 1.5)');
            expect(threeGameSource).toContain('roughnessFactor = clamp(hbFloorRoughness, 0.04, 1.0)');
            expect(threeGameSource).toContain('normal = normalize(normal + hbFloorNormalPerturb)');
        });

        it('injects vascular pulsation into floor emissive radiance', () => {
            expect(threeGameSource).toContain('vec3 bioVeinColor = vec3(1.0, 0.44, 0.08)');
            expect(threeGameSource).toContain('totalEmissiveRadiance += vec3(0.0, 0.7, 0.85) * glowIntensity * 1.35 + bioVeinColor');
        });

        it('injects roughness break-up and derived surface normals into wallMaterial', () => {
            expect(threeGameSource).toContain('hbWallRoughness = mix(bunkerWallRough, cryoWallRough, cryoMix)');
            expect(threeGameSource).toContain('hbWallNormalPerturb = (abs(vWorldNormal.y) > 0.5)');
            expect(threeGameSource).toContain('roughnessFactor = clamp(hbWallRoughness, 0.04, 1.0)');
            expect(threeGameSource).toContain('normal = normalize(normal + hbWallNormalPerturb)');
        });
    });
});
