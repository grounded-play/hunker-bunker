import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { DOOR_LIGHT_POOL, createDoorLightPoolGeometry, createDoorLightPoolMaterial, doorLightPoolMatrices } from './doorLightPools.js';

function decompose(matrix) {
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    matrix.decompose(position, quaternion, scale);
    return { position, scale };
}

describe('doorLightPoolMatrices', () => {
    it('pools light on both sides of a door, across its width, just above the floor', () => {
        // A horizontal door spans x; its two sides are north and south.
        const [a, b] = doorLightPoolMatrices({ worldX: 10, worldZ: 4, horizontal: true }).map(decompose);
        expect(a.position.x).toBeCloseTo(10);
        expect(b.position.x).toBeCloseTo(10);
        expect(Math.sign(a.position.z - 4)).toBe(-Math.sign(b.position.z - 4));
        expect(Math.abs(a.position.z - 4)).toBeGreaterThan(0.5);
        expect(a.position.y).toBeGreaterThan(0);
        expect(a.position.y).toBeLessThan(0.05);
        expect(a.scale.x).toBeCloseTo(DOOR_LIGHT_POOL.width);
    });

    it('turns with a vertical door', () => {
        const [a, b] = doorLightPoolMatrices({ worldX: 10, worldZ: 4, horizontal: false }).map(decompose);
        expect(a.position.z).toBeCloseTo(4);
        expect(Math.sign(a.position.x - 10)).toBe(-Math.sign(b.position.x - 10));
    });
});

describe('door light pool look', () => {
    it('lies flat and fades out from its centre', () => {
        const geometry = createDoorLightPoolGeometry();
        geometry.computeBoundingBox();
        expect(geometry.boundingBox.max.y - geometry.boundingBox.min.y).toBeCloseTo(0);
        const material = createDoorLightPoolMaterial(new THREE.Color(1, 0.5, 0.2));
        expect(material.blending).toBe(THREE.AdditiveBlending);
        expect(material.depthWrite).toBe(false);
        expect(material.transparent).toBe(true);
        expect(material.fragmentShader).toContain('smoothstep');
        expect(material.uniforms.uColor.value.r).toBeCloseTo(1);
    });

    it('colours state, not biome: ordinary cool, route warm, locked red', () => {
        const { ordinary, route, locked } = DOOR_LIGHT_POOL.colors;
        expect(ordinary.b).toBeGreaterThan(ordinary.r);
        expect(route.r).toBeGreaterThan(route.b);
        expect(locked.r).toBeGreaterThan(locked.g * 2);
    });
});
