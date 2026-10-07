import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { skipMatrixPassWhileHidden } from './chunkMatrices.js';

describe('hidden chunks skip the matrix pass', () => {
    function chunkWithProp() {
        const scene = new THREE.Scene();
        const chunk = new THREE.Group();
        const prop = new THREE.Object3D();
        prop.position.set(12, 0, 7);
        chunk.add(prop);
        scene.add(chunk);
        return { scene, chunk, prop };
    }

    it('computes every matrix once at mount, even for a chunk mounted hidden', () => {
        const { chunk, prop } = chunkWithProp();
        chunk.visible = false;
        skipMatrixPassWhileHidden(chunk);
        expect(new THREE.Vector3().setFromMatrixPosition(prop.matrixWorld).toArray()).toEqual([12, 0, 7]);
    });

    it('skips a hidden chunk each frame and catches up on the first frame it shows', () => {
        const { scene, chunk, prop } = chunkWithProp();
        skipMatrixPassWhileHidden(chunk);
        chunk.visible = false;
        prop.position.set(20, 0, 3);
        scene.updateMatrixWorld();
        expect(new THREE.Vector3().setFromMatrixPosition(prop.matrixWorld).x).toBe(12);
        chunk.visible = true;
        scene.updateMatrixWorld();
        expect(new THREE.Vector3().setFromMatrixPosition(prop.matrixWorld).toArray()).toEqual([20, 0, 3]);
    });

    it('still gives a correct world position for an object in a hidden chunk', () => {
        const { scene, chunk, prop } = chunkWithProp();
        skipMatrixPassWhileHidden(chunk);
        chunk.visible = false;
        prop.position.set(30, 0, 1);
        scene.updateMatrixWorld();
        expect(prop.getWorldPosition(new THREE.Vector3()).toArray()).toEqual([30, 0, 1]);
    });
});
