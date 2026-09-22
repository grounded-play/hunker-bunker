import { describe, expect, it } from 'vitest';
import { ShaderLib } from 'three';
import { TiltShiftPassShader, softenDirectSpecularHighlights } from './threeGame.js';
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

    describe('Direct specular softening (no mirrored light bulbs on walls)', () => {
        it('shades punctual lights with a raised roughness floor and restores it for IBL', () => {
            const shader = { fragmentShader: ShaderLib.standard.fragmentShader };
            softenDirectSpecularHighlights(shader);
            const frag = shader.fragmentShader;
            const raise = frag.indexOf('material.roughness = max(material.roughness, 0.60)');
            const begin = frag.indexOf('#include <lights_fragment_begin>');
            const restore = frag.indexOf('material.roughness = hbIblRoughness');
            const maps = frag.indexOf('#include <lights_fragment_maps>');
            expect(raise).toBeGreaterThan(-1);
            expect(raise).toBeLessThan(begin);
            expect(begin).toBeLessThan(restore);
            expect(restore).toBeLessThan(maps);
            expect(frag).toContain('material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg');
        });

        it('is applied to both the floor and wall materials', () => {
            expect(threeGameSource.match(/softenDirectSpecularHighlights\(shader\);/g)).toHaveLength(2);
        });

        it('truncates flashlight beam at wall boundaries instead of bending vertices vertically', () => {
            expect(threeGameSource).toContain('array[vi + 1] = 0;');
            expect(threeGameSource).not.toContain('hit ? (this.wallHeight - 0.2) : 0');
        });

        it('sets player emitter glow renderOrder behind player sprite to avoid drawing on top of walls', () => {
            expect(threeGameSource).toContain('this.playerEmitterGlow.renderOrder = 4;');
        });

        it('excludes player suit and glow point/spot lights from hitting the player model', async () => {
            const { excludePlayerSelfLights } = await import('./player3dOverlay.js');
            const mat = { onBeforeCompile: null };
            excludePlayerSelfLights(mat);
            expect(typeof mat.onBeforeCompile).toBe('function');
            const shader = { fragmentShader: '#include <lights_fragment_begin>' };
            mat.onBeforeCompile(shader);
            expect(shader.fragmentShader).toContain('length( pointLight.position - geometryPosition ) < 2.2');
            expect(shader.fragmentShader).toContain('directLight.color = vec3( 0.0 );');
            expect(shader.fragmentShader).toContain('length( spotLight.position - geometryPosition ) < 1.6');
        });

        it('damps suitFillLight when player is near a wall to prevent wall overexposure', () => {
            expect(threeGameSource).toContain('this.suitFillLight.intensity = SUIT_LIGHT_BASE_INTENSITY * lerp(1.05, 0.68, dayBlend) * (1 + movePulse) * wallGlowDamp;');
        });
    });
});
