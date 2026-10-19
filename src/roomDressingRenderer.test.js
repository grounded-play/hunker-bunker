import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { buildRoomDressingGroup, hideRoomDressingItem, hideRoomDressingSupport, setRoomDressingItemCutawayHidden } from './roomDressingRenderer.js';

describe('instanced dressing lifecycle', () => {
    it('releases already-built instance buffers if a later model load fails', async () => {
        const geometry = new THREE.BoxGeometry(), material = new THREE.MeshBasicMaterial();
        const root = new THREE.Mesh(geometry, material);
        const geometryDispose = vi.spyOn(geometry, 'dispose');
        const materialDispose = vi.spyOn(material, 'dispose');
        const dispose = vi.spyOn(THREE.InstancedMesh.prototype, 'dispose');
        try {
            await expect(buildRoomDressingGroup([
                { type: 'first', layer: 'clutter', x: 0, y: 0 },
                { type: 'failure', layer: 'clutter', x: 1, y: 0 }
            ], { loadModel: async type => { if (type === 'failure') throw new Error('load failed'); return root; },
                loadDecalTexture: () => null })).rejects.toThrow('load failed');
            expect(dispose).toHaveBeenCalledTimes(1);
            expect(geometryDispose).not.toHaveBeenCalled();
            expect(materialDispose).not.toHaveBeenCalled();
        } finally { dispose.mockRestore(); }
    });

    it('hides every mesh of one object during loading without touching its neighbor or shared assets', async () => {
        const geometry = new THREE.BoxGeometry(), material = new THREE.MeshBasicMaterial();
        const root = new THREE.Group();
        root.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material));
        const geometryDispose = vi.spyOn(geometry, 'dispose'), materialDispose = vi.spyOn(material, 'dispose');
        let finish;
        const items = [0, 1].map(x => ({ id: `item${x}`, layer: 'clutter', type: 'prop_cart', x, y: 0 }));
        const promise = buildRoomDressingGroup(items, { loadModel: () => new Promise(resolve => { finish = resolve; }), loadDecalTexture: () => null });
        hideRoomDressingItem(items[0]);
        finish(root);
        const group = await promise;
        const matrix = new THREE.Matrix4();
        expect(group.children).toHaveLength(2);
        for (const batch of group.children) {
            batch.getMatrixAt(0, matrix); expect(matrix.getMaxScaleOnAxis()).toBe(0);
            batch.getMatrixAt(1, matrix); expect(matrix.getMaxScaleOnAxis()).toBe(1);
        }
        hideRoomDressingItem(items[0]);
        expect(geometryDispose).not.toHaveBeenCalled();
        expect(materialDispose).not.toHaveBeenCalled();
        group.traverse(node => { if (node.isInstancedMesh) node.dispose(); });
        expect(geometryDispose).not.toHaveBeenCalled();
        expect(materialDispose).not.toHaveBeenCalled();
    });

    it('removes wall fixtures and decals when their support breaks', async () => {
        const items = [
            { layer: 'wallProp', type: 'prop_lamp', x: 2, y: 3, supportCell: { x: 2, y: 4 } },
            { layer: 'wallDecal', type: 'decal_leak', x: 2, y: 3, supportCell: { x: 2, y: 4 } },
            { layer: 'clutter', type: 'prop_lamp', x: 5, y: 5 }
        ];
        const group = await buildRoomDressingGroup(items, {
            loadModel: async () => new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()),
            loadDecalTexture: () => new THREE.Texture()
        });
        expect(hideRoomDressingSupport(group, 2, 4)).toHaveLength(2);
        const matrix = new THREE.Matrix4();
        for (const item of items) for (const { batch, index } of item.batchInstances) {
            batch.getMatrixAt(index, matrix);
            expect(matrix.getMaxScaleOnAxis() === 0).toBe(Boolean(item.supportCell));
        }
    });

    it('temporarily hides a wall fixture with its cutaway wall and restores its matrix', async () => {
        const item = { layer: 'wallProp', type: 'prop_lamp', x: 2, y: 3, mountY: 1.4 };
        await buildRoomDressingGroup([item], {
            loadModel: async () => new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()),
            loadDecalTexture: () => null
        });
        const [{ batch, index }] = item.batchInstances;
        const matrix = new THREE.Matrix4();

        setRoomDressingItemCutawayHidden(item, true);
        batch.getMatrixAt(index, matrix);
        expect(matrix.getMaxScaleOnAxis()).toBe(0);

        setRoomDressingItemCutawayHidden(item, false);
        batch.getMatrixAt(index, matrix);
        expect(matrix.getMaxScaleOnAxis()).toBe(1);
        expect(new THREE.Vector3().setFromMatrixPosition(matrix).y).toBeCloseTo(1.4);
    });

    it('rejects a registered wall-only decal when a caller puts it on the floor', async () => {
        const misplaced = {
            layer: 'floorDecal',
            type: 'decal_vass_acoustic_diagram',
            x: 2,
            y: 3
        };
        const group = await buildRoomDressingGroup([misplaced], {
            loadModel: async () => null,
            loadDecalTexture: () => new THREE.Texture()
        });

        expect(group.children).toHaveLength(0);
        expect(group.userData.itemCount).toBe(0);
        expect(group.userData.rejectedSurfaceItems).toEqual([misplaced]);
    });

    it('keeps an interactive terminal as a standalone per-instance root', async () => {
        const collider = new THREE.Object3D();
        const item = {
            layer: 'vignette', type: 'prop_diagnostic_console', x: 3, y: 4,
            yaw: 0.7, scale: 1.1, dynamicExperience: true, collider
        };
        const root = new THREE.Group();
        root.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()));
        const onDynamicModel = vi.fn();
        const group = await buildRoomDressingGroup([item], {
            loadModel: async () => root,
            loadDecalTexture: () => null,
            onDynamicModel
        });

        expect(group.children).toEqual([root]);
        expect(group.children.some((child) => child.isInstancedMesh)).toBe(false);
        expect(root.position.toArray()).toEqual([3, 0, 4]);
        expect(root.rotation.y).toBeCloseTo(0.7);
        expect(root.scale.toArray()).toEqual([1.1, 1.1, 1.1]);
        expect(collider.userData.world3dRoot).toBe(root);
        expect(onDynamicModel).toHaveBeenCalledWith(root, item);
    });

    it('keeps a budget-approved ambient FX prop out of static instancing', async () => {
        const item = {
            layer: 'vignette', type: 'life_water_still', x: 1, y: 2,
            dynamicExperience: true
        };
        const root = new THREE.Group();
        root.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()));
        const group = await buildRoomDressingGroup([item], {
            loadModel: async () => root,
            loadDecalTexture: () => null
        });

        expect(group.children).toEqual([root]);
        expect(item.dynamicRoot).toBe(root);
    });
});
