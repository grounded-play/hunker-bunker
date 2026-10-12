import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { applyClothFlutter, setClothFlutterTime } from './clothFlutter.js';

function prop({ sourceMaterial = new THREE.MeshStandardMaterial(), extras = { hb_motion: 'flutter', hb_amp: 0.03, hb_speed: 3.4, hb_axis: [0, 0, 1] } } = {}) {
    const clothGeometry = new THREE.PlaneGeometry(1, 1, 2, 2);
    const count = clothGeometry.getAttribute('position').count;
    const colors = new Float32Array(count * 4);
    for (let i = 0; i < count; i += 1) colors.set([i / count, 0.5, 0, 1], i * 4);
    clothGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));
    const cloth = new THREE.Mesh(clothGeometry, sourceMaterial);
    cloth.name = 'HB_FLUTTER_sock';
    cloth.userData = { ...extras };
    const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), sourceMaterial);
    const model = new THREE.Group();
    model.add(cloth, body);
    return { model, cloth, body, sourceMaterial };
}

describe('applyClothFlutter', () => {
    it('gives the cloth its own fluttering material and leaves the rest of the prop alone', () => {
        const { model, cloth, body, sourceMaterial } = prop();
        expect(applyClothFlutter(model)).toBe(1);
        expect(cloth.material).not.toBe(sourceMaterial);
        expect(cloth.material.vertexColors).toBe(false);
        expect(body.material).toBe(sourceMaterial);
    });

    it('moves the baked weights off the colour channel so they never tint the cloth', () => {
        const { model, cloth } = prop();
        applyClothFlutter(model);
        expect(cloth.geometry.getAttribute('color')).toBeUndefined();
        const weights = cloth.geometry.getAttribute('hbFlutter');
        expect(weights.itemSize).toBe(2);
        expect(weights.getY(0)).toBeCloseTo(0.5);
    });

    it('shares one patched material between every copy of the same prop', () => {
        const sourceMaterial = new THREE.MeshStandardMaterial();
        const a = prop({ sourceMaterial });
        const b = prop({ sourceMaterial });
        // Copies share geometry too (clones of one cached GLB).
        b.cloth.geometry = a.cloth.geometry;
        applyClothFlutter(a.model);
        applyClothFlutter(b.model);
        expect(a.cloth.material).toBe(b.cloth.material);
        expect(applyClothFlutter(a.model)).toBe(1);
    });

    it('waves the weighted vertices on one shared clock, per instance', () => {
        const { model, cloth } = prop();
        applyClothFlutter(model);
        const shader = {
            uniforms: {},
            vertexShader: '#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>',
            fragmentShader: ''
        };
        cloth.material.onBeforeCompile(shader);
        expect(shader.vertexShader).toContain('attribute vec2 hbFlutter;');
        expect(shader.vertexShader).toContain('transformed +=');
        expect(shader.vertexShader).toContain('USE_INSTANCING');
        expect(shader.uniforms.uFlutterAmp.value).toBeCloseTo(0.03);
        expect(shader.uniforms.uFlutterAxis.value.toArray()).toEqual([0, 0, 1]);
        setClothFlutterTime(7.25);
        expect(shader.uniforms.uFlutterTime.value).toBe(7.25);
    });

    it('ignores props without flutter cloth', () => {
        const model = new THREE.Group();
        model.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()));
        expect(applyClothFlutter(model)).toBe(0);
    });
});
