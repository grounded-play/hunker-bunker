import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createSkySpriteMaterial, updateSkySpriteMaterial, SPRITE_MODES } from './skySpriteMaterial.js';

const rect = (offsetX, offsetY) => ({ offsetX, offsetY, repeatX: 0.25, repeatY: 0.5 });

describe('createSkySpriteMaterial', () => {
    it('carries two frame windows and a mix so it can cross-fade', () => {
        // A single uv window can only step between frames; slow animation needs
        // both neighbours sampled at once.
        const material = createSkySpriteMaterial();
        for (const name of ['uMap', 'uRectA', 'uRectB', 'uMix', 'uOpacity', 'uTint', 'uMode', 'uTime']) {
            expect(material.uniforms[name], `missing ${name}`).toBeDefined();
        }
    });

    it('depth-tests without writing depth, like every other sky element', () => {
        const material = createSkySpriteMaterial();
        expect(material.depthTest).toBe(true);
        expect(material.depthWrite).toBe(false);
        expect(material.fog).toBe(false);
    });

    it('defaults to no procedural effect', () => {
        expect(createSkySpriteMaterial().uniforms.uMode.value).toBe(SPRITE_MODES.NONE);
    });
});

describe('updateSkySpriteMaterial frame pair', () => {
    it('writes both frame windows into their uniforms', () => {
        const material = createSkySpriteMaterial();
        updateSkySpriteMaterial(material, { rectA: rect(0, 0.5), rectB: rect(0.25, 0.5), mix: 0.4 });
        expect(material.uniforms.uRectA.value.x).toBeCloseTo(0, 6);
        expect(material.uniforms.uRectB.value.x).toBeCloseTo(0.25, 6);
        expect(material.uniforms.uMix.value).toBeCloseTo(0.4, 6);
    });

    it('collapses to a single frame when no second window is given', () => {
        // Stepped assets and still bodies share this material; they simply
        // never blend.
        const material = createSkySpriteMaterial();
        updateSkySpriteMaterial(material, { rectA: rect(0.5, 0) });
        expect(material.uniforms.uMix.value).toBe(0);
        expect(material.uniforms.uRectB.value.x).toBeCloseTo(0.5, 6);
    });

    it('clamps the mix into the unit range', () => {
        const material = createSkySpriteMaterial();
        updateSkySpriteMaterial(material, { rectA: rect(0, 0), rectB: rect(0.25, 0), mix: 1.8 });
        expect(material.uniforms.uMix.value).toBe(1);
        updateSkySpriteMaterial(material, { rectA: rect(0, 0), rectB: rect(0.25, 0), mix: -3 });
        expect(material.uniforms.uMix.value).toBe(0);
    });

    it('only dirties the material when the texture changes', () => {
        const material = createSkySpriteMaterial();
        updateSkySpriteMaterial(material, { map: new THREE.Texture() });
        const version = material.version;
        updateSkySpriteMaterial(material, { map: material.uniforms.uMap.value, mix: 0.5 });
        expect(material.version).toBe(version);
    });
});

describe('updateSkySpriteMaterial procedural modes', () => {
    it('supports a distinct mode per effect', () => {
        const values = Object.values(SPRITE_MODES);
        expect(new Set(values).size).toBe(values.length);
    });

    it('sets the churn mode for a star surface', () => {
        const material = createSkySpriteMaterial({ mode: SPRITE_MODES.GRANULATION });
        expect(material.uniforms.uMode.value).toBe(SPRITE_MODES.GRANULATION);
    });

    it('advances time so procedural effects animate', () => {
        const material = createSkySpriteMaterial({ mode: SPRITE_MODES.BILLOW });
        updateSkySpriteMaterial(material, { time: 12.5 });
        expect(material.uniforms.uTime.value).toBeCloseTo(12.5, 6);
    });

    it('tints without disturbing the frame windows', () => {
        const material = createSkySpriteMaterial();
        updateSkySpriteMaterial(material, { rectA: rect(0.75, 0), tint: { r: 1, g: 0.6, b: 0.3 } });
        expect(material.uniforms.uTint.value.g).toBeCloseTo(0.6, 5);
        expect(material.uniforms.uRectA.value.x).toBeCloseTo(0.75, 6);
    });
});
