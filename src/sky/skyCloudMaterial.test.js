import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createSkyCloudMaterial, updateSkyCloudMaterial, CLOUD_MODES } from './skyCloudMaterial.js';

describe('createSkyCloudMaterial', () => {
    it('returns a shader material carrying every uniform the animation needs', () => {
        const material = createSkyCloudMaterial();
        expect(material).toBeInstanceOf(THREE.ShaderMaterial);
        for (const name of ['uMap', 'uTime', 'uOpacity', 'uTint', 'uWindSpeed', 'uParallax', 'uMode', 'uAdditive']) {
            expect(material.uniforms[name], `missing uniform ${name}`).toBeDefined();
        }
    });

    it('depth-tests without writing depth, like every other sky layer', () => {
        const material = createSkyCloudMaterial();
        expect(material.depthTest).toBe(true);
        expect(material.depthWrite).toBe(false);
        expect(material.fog).toBe(false);
        expect(material.transparent).toBe(true);
    });

    it('distinguishes drifting cloud from shimmering aurora', () => {
        // Aurora is not blown downwind; scrolling it sideways would read as a
        // curtain of cloth sliding past.
        const drift = createSkyCloudMaterial({ mode: CLOUD_MODES.DRIFT });
        const shimmer = createSkyCloudMaterial({ mode: CLOUD_MODES.SHIMMER });
        expect(drift.uniforms.uMode.value).not.toBe(shimmer.uniforms.uMode.value);
    });
});

describe('updateSkyCloudMaterial', () => {
    const build = () => createSkyCloudMaterial();

    it('advances time so the clouds actually move between frames', () => {
        const material = build();
        updateSkyCloudMaterial(material, { time: 4.5 });
        expect(material.uniforms.uTime.value).toBeCloseTo(4.5, 6);
    });

    it('carries parallax as a uniform rather than mutating a shared texture', () => {
        // getTexture caches by url; writing texture.offset would let two layers
        // sharing a url silently stomp each other.
        const material = build();
        const texture = new THREE.Texture();
        updateSkyCloudMaterial(material, { map: texture, parallax: -0.25 });
        expect(material.uniforms.uParallax.value).toBeCloseTo(-0.25, 6);
        expect(texture.offset.x).toBe(0);
    });

    it('passes wind speed through so storms drive faster cloud motion', () => {
        const material = build();
        updateSkyCloudMaterial(material, { wind: { speed: 0.8, direction: 1.2 } });
        expect(material.uniforms.uWindSpeed.value).toBeCloseTo(0.8, 6);
    });

    it('drives additive layers through opacity while flagging them additive', () => {
        const material = build();
        updateSkyCloudMaterial(material, { opacity: 0.4, additive: true });
        expect(material.uniforms.uOpacity.value).toBeCloseTo(0.4, 6);
        expect(material.uniforms.uAdditive.value).toBe(1);
    });

    it('tints the layer without replacing its texture', () => {
        const material = build();
        updateSkyCloudMaterial(material, { tint: { r: 0.5, g: 0.25, b: 0.125 } });
        expect(material.uniforms.uTint.value.r).toBeCloseTo(0.5, 5);
        expect(material.uniforms.uTint.value.b).toBeCloseTo(0.125, 5);
    });

    it('only marks the material dirty when the texture itself changes', () => {
        // three.js Material.needsUpdate is a write-only accessor that bumps
        // .version, so version is the only observable signal here.
        const material = build();
        updateSkyCloudMaterial(material, { map: new THREE.Texture() });
        const versionAfterFirstMap = material.version;
        updateSkyCloudMaterial(material, { map: material.uniforms.uMap.value, time: 3 });
        expect(material.version).toBe(versionAfterFirstMap);
        updateSkyCloudMaterial(material, { map: new THREE.Texture() });
        expect(material.version).toBeGreaterThan(versionAfterFirstMap);
    });
});
