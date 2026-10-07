// Room + biome maps consume 13 fragment samplers. Environment/DFG lighting
// and the directional/suit shadows add four: D3D11's 16-slot path cannot
// link that program. Keep colour, roughness, emission and both shadows;
// omit only the authored normal detail on the constrained path.
export function fitWallShaderSamplerBudget(shader, maxTextures = 16) {
    if (maxTextures > 16) return;
    delete shader.uniforms.tRoomWallNormalAtlas;
    shader.fragmentShader = shader.fragmentShader
        .replace(/uniform sampler2D tRoomWallNormalAtlas;\s*/g, '')
        .replace(/texture2D\(\s*tRoomWallNormalAtlas\s*,\s*[^)]+\)\.rgb\s*\*\s*2\.0\s*-\s*1\.0/g, 'vec3(0.0, 0.0, 1.0)');
}

// transformed is still object-local here; the standard worldpos chunk is
// conditionally declared and cannot be relied on without env/shadow defines.
export const INSTANCED_WORLD_POSITION = `
    vec4 hbWorldPosition = vec4(transformed, 1.0);
    #ifdef USE_INSTANCING
        hbWorldPosition = instanceMatrix * hbWorldPosition;
    #endif
    vWorldPos = (modelMatrix * hbWorldPosition).xyz;
`;
