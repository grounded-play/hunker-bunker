import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { VOID_DEPTH, applyVoidDepth, setVoidDepthTime } from './voidDepth.js';

function compile(material) {
    const shader = {
        uniforms: {},
        vertexShader: '#include <common>\nvoid main() {\n#include <worldpos_vertex>\n}',
        fragmentShader: '#include <common>\nvoid main() {\n#include <dithering_fragment>\n}'
    };
    material.onBeforeCompile(shader, null);
    return shader;
}

describe('applyVoidDepth', () => {
    const ship = new THREE.Vector2(5, -7);
    const range = { cryoStart: 60, cryoEnd: 80, bioStart: 130, bioEnd: 150 };

    it('casts each pixel down to a floor far below and lights it faintly', () => {
        const material = applyVoidDepth(new THREE.MeshBasicMaterial({ color: 0x020304 }), { shipWorldPos: () => ship, range });
        const shader = compile(material);
        expect(shader.vertexShader).toContain('vVoidWorldPos');
        expect(shader.fragmentShader).toContain('cameraPosition');
        expect(shader.fragmentShader).toContain(`-${VOID_DEPTH.floorDepth.toFixed(1)}`);
        // Light is added after the rest of the fragment, so fog and the base colour stay.
        expect(shader.fragmentShader.indexOf('gl_FragColor.rgb +=')).toBeGreaterThan(shader.fragmentShader.indexOf('#include <dithering_fragment>'));
        expect(shader.uniforms.uShipWorldPos.value).toBe(ship);
        expect(material.customProgramCacheKey()).toBe('hb-void-depth');
    });

    it('tints the light by district: ember, then teal in cryo, green in bio', () => {
        const shader = compile(applyVoidDepth(new THREE.MeshBasicMaterial(), { shipWorldPos: () => ship, range }));
        expect(shader.fragmentShader).toContain('smoothstep( 60.0, 80.0');
        expect(shader.fragmentShader).toContain('smoothstep( 130.0, 150.0');
    });

    it('drifts on one shared clock', () => {
        const a = compile(applyVoidDepth(new THREE.MeshBasicMaterial(), { shipWorldPos: () => ship, range }));
        const b = compile(applyVoidDepth(new THREE.MeshBasicMaterial(), { shipWorldPos: () => ship, range }));
        expect(a.uniforms.uVoidTime).toBe(b.uniforms.uVoidTime);
        setVoidDepthTime(12.5);
        expect(a.uniforms.uVoidTime.value).toBe(12.5);
    });
});
