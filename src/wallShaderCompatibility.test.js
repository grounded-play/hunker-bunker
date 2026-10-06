import { describe, expect, it } from 'vitest';
import { fitWallShaderSamplerBudget, INSTANCED_WORLD_POSITION } from './wallShaderCompatibility.js';

function shader() {
    return {
        uniforms: { tRoomWallNormalAtlas: {}, tRoomWallColorAtlas: {} },
        fragmentShader: 'uniform sampler2D tRoomWallNormalAtlas;\nvec3 pbrNorm = texture2D(tRoomWallNormalAtlas, atlasUv).rgb * 2.0 - 1.0;'
    };
}

describe('wall shader hardware compatibility', () => {
    it('removes the seventeenth sampler on the 16-slot PC path', () => {
        const s = shader();
        fitWallShaderSamplerBudget(s, 16);
        expect(s.uniforms.tRoomWallNormalAtlas).toBeUndefined();
        expect(s.fragmentShader).not.toContain('tRoomWallNormalAtlas');
        expect(s.fragmentShader).toContain('vec3 pbrNorm = vec3(0.0, 0.0, 1.0)');
        expect(s.uniforms.tRoomWallColorAtlas).toBeDefined();
    });
    it('retains normal detail on 32-slot hardware', () => {
        const s = shader();
        const before = s.fragmentShader;
        fitWallShaderSamplerBudget(s, 32);
        expect(s.fragmentShader).toBe(before);
        expect(s.uniforms.tRoomWallNormalAtlas).toBeDefined();
    });
    it('applies each instance transform before projecting into world space', () => {
        expect(INSTANCED_WORLD_POSITION).toContain('#ifdef USE_INSTANCING');
        expect(INSTANCED_WORLD_POSITION.indexOf('instanceMatrix * hbWorldPosition'))
            .toBeLessThan(INSTANCED_WORLD_POSITION.indexOf('modelMatrix * hbWorldPosition'));
    });
});
