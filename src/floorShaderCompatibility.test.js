import { describe, expect, it } from 'vitest';
import { fitFloorShaderSamplerBudget } from './floorShaderCompatibility.js';

const OPTIONAL = [
    'tGrunge', 'tDetail',
    'tCryoBase', 'tCryoGrunge', 'tCryoDetail',
    'tBioBase', 'tBioGrunge', 'tBioDetail'
];

function shader() {
    const uniforms = Object.fromEntries(['tBase', ...OPTIONAL, 'uFloorLayers', 'uSurfaceAlbedo']
        .map((key) => [key, {}]));
    return {
        uniforms,
        fragmentShader: ['tBase', ...OPTIONAL]
            .map((key) => `uniform sampler2D ${key};\nvec4 ${key}Sample = texture2D(${key}, uv);`)
            .join('\n')
    };
}

describe('floor shader hardware compatibility', () => {
    it('collapses the legacy biome maps to one visible fallback on 16-slot GPUs', () => {
        const value = shader();
        fitFloorShaderSamplerBudget(value, 16);

        for (const sampler of OPTIONAL) {
            expect(value.uniforms[sampler]).toBeUndefined();
            expect(value.fragmentShader).not.toMatch(new RegExp(`\\b${sampler}\\b`));
        }
        expect(value.uniforms.tBase).toBeDefined();
        expect(value.uniforms.uFloorLayers).toBeDefined();
        expect(value.uniforms.uSurfaceAlbedo).toBeDefined();
        expect(value.fragmentShader).toContain('texture2D(tBase, uv)');
    });

    it('retains the full biome texture set when the GPU has headroom', () => {
        const value = shader();
        const before = value.fragmentShader;
        fitFloorShaderSamplerBudget(value, 32);
        expect(value.fragmentShader).toBe(before);
        expect(value.uniforms.tBioDetail).toBeDefined();
    });
});

