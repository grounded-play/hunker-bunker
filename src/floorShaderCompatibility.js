const REDUNDANT_BIOME_SAMPLERS = Object.freeze([
    'tGrunge',
    'tDetail',
    'tCryoBase',
    'tCryoGrunge',
    'tCryoDetail',
    'tBioBase',
    'tBioGrunge',
    'tBioDetail'
]);

/**
 * The complete floor look uses eight custom floor samplers in addition to
 * Three's environment and shadow maps. The old biome blend contributed nine
 * more samplers by itself, which exceeds the 16-slot fragment limit common to
 * D3D11 and Steam Deck drivers. On that path, keep one visible base texture
 * for boot/fallback and let the floor arrays provide the biome and room art.
 */
export function fitFloorShaderSamplerBudget(shader, maxTextures = 16) {
    if (maxTextures > 16) return;
    for (const sampler of REDUNDANT_BIOME_SAMPLERS) {
        delete shader.uniforms[sampler];
        shader.fragmentShader = shader.fragmentShader
            .replace(new RegExp(`uniform\\s+sampler2D\\s+${sampler}\\s*;\\s*`, 'g'), '')
            .replace(new RegExp(`\\b${sampler}\\b`, 'g'), 'tBase');
    }
}

