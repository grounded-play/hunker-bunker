import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { WORLD_3D_STRUCTURES, prepareWorld3dStructure } from './world3dOverlay.js';

describe('metric world 3D structures', () => {
    it('registers a 49x49 shell with a separate collision asset', () => {
        expect(WORLD_3D_STRUCTURES.structure_reference_49m).toMatchObject({
            footprint: { w: 49, d: 49 },
            origin: 'module-nw-corner'
        });
        expect(WORLD_3D_STRUCTURES.structure_reference_49m.collision).toContain('.collision.glb');
    });

    it('preserves authored scale and origin instead of applying prop normalization', () => {
        const render = new THREE.Group();
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(49, 2, 49));
        mesh.position.set(24.5, 1, 24.5);
        render.add(mesh);
        const collision = render.clone(true);
        const before = new THREE.Box3().setFromObject(render);

        const root = prepareWorld3dStructure(
            render,
            collision,
            'structure_reference_49m',
            WORLD_3D_STRUCTURES.structure_reference_49m
        );
        const after = new THREE.Box3().setFromObject(root.children[0]);

        expect(after.min.toArray()).toEqual(before.min.toArray());
        expect(after.max.toArray()).toEqual(before.max.toArray());
        expect(root.children[0].scale.toArray()).toEqual([1, 1, 1]);
        expect(root.children[0].position.toArray()).toEqual([0, 0, 0]);
        expect(root.children[1].visible).toBe(false);
        expect(root.children[1].children[0].userData.isStructureCollision).toBe(true);
    });
});
