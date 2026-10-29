import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { VOID_DEPTH, VOID_UPLIGHT, applyVoidDepth, applyVoidUplight, setVoidDepthTime } from './voidDepth.js';

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

    it('casts each pixel onto two sparse light fields far below', () => {
        const material = applyVoidDepth(new THREE.MeshBasicMaterial({ color: 0x020304 }), { shipWorldPos: () => ship, range });
        const shader = compile(material);
        expect(shader.vertexShader).toContain('vVoidWorldPos');
        expect(shader.fragmentShader).toContain('cameraPosition');
        expect(shader.fragmentShader).toContain(`-${VOID_DEPTH.nearPlane.toFixed(1)}`);
        expect(shader.fragmentShader).toContain(`-${VOID_DEPTH.farPlane.toFixed(1)}`);
        expect(shader.fragmentShader).toContain('hbVoidLightLayer( hbNearProjection');
        expect(shader.fragmentShader).toContain('hbVoidLightLayer( hbFarProjection');
        // Light is added after the rest of the fragment, so fog and the base colour stay.
        expect(shader.fragmentShader.indexOf('gl_FragColor.rgb +=')).toBeGreaterThan(shader.fragmentShader.indexOf('#include <dithering_fragment>'));
        expect(shader.uniforms.uShipWorldPos.value).toBe(ship);
        expect(material.customProgramCacheKey()).toBe('hb-void-depth-v2');
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

describe('applyVoidUplight', () => {
    const wallShader = () => ({
        uniforms: {},
        fragmentShader: 'varying vec3 vCanyonDropWorldPos;\nvoid main() {\n#include <fog_fragment>\n#include <dithering_fragment>\n}'
    });

    it('lights the cliff wall from below and adds sparse rising motes after fog', () => {
        const shader = applyVoidUplight(wallShader(), 'active');
        expect(shader.fragmentShader).toContain(`smoothstep( ${VOID_UPLIGHT.startY.toFixed(1)}, ${VOID_UPLIGHT.fullY.toFixed(1)}, vCanyonDropWorldPos.y )`);
        expect(shader.fragmentShader).toContain('uniform float uVoidTime;');
        expect(shader.fragmentShader).toContain('float hbMotePhase');
        expect(shader.fragmentShader).toContain('float hbMoteLane');
        expect(shader.fragmentShader.indexOf('gl_FragColor.rgb +=')).toBeGreaterThan(shader.fragmentShader.indexOf('#include <fog_fragment>'));
        expect(shader.fragmentShader).toContain('fogFactor');
    });

    it('takes the district colour, and breathes on the void clock', () => {
        expect(applyVoidUplight(wallShader(), 'active').fragmentShader).toContain('vec3( 1.00, 0.42, 0.12 )');
        expect(applyVoidUplight(wallShader(), 'cryo').fragmentShader).toContain('vec3( 0.25, 0.72, 1.00 )');
        expect(applyVoidUplight(wallShader(), 'bio').fragmentShader).toContain('vec3( 0.45, 0.95, 0.25 )');
        const a = applyVoidUplight(wallShader(), 'cryo');
        const floor = { uniforms: {}, vertexShader: '#include <common>\nvoid main() {\n#include <worldpos_vertex>\n}', fragmentShader: '#include <common>\nvoid main() {\n#include <dithering_fragment>\n}' };
        applyVoidDepth(new THREE.MeshBasicMaterial(), { shipWorldPos: () => new THREE.Vector2(), range: { cryoStart: 1, cryoEnd: 2, bioStart: 3, bioEnd: 4 } }).onBeforeCompile(floor, null);
        expect(a.uniforms.uVoidTime).toBe(floor.uniforms.uVoidTime);
    });

    it('keeps the field dark while allowing readable light peaks', () => {
        expect(VOID_DEPTH.ambient).toBeLessThan(0.02);
        expect(VOID_DEPTH.nearPeak).toBeGreaterThan(0.4);
        expect(VOID_DEPTH.farPlane - VOID_DEPTH.nearPlane).toBeGreaterThan(20);
    });
});
