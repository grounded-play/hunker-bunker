import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { buildRoomDressingGroup, hideRoomDressingItem, hideRoomDressingSupport } from './roomDressingRenderer.js';

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
});
