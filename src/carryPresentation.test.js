import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

vi.mock('./world3dOverlay.js', () => ({
    createWorld3dModel: vi.fn(async (type) => {
        const root = new THREE.Group();
        root.userData.modelType = type;
        root.userData.dispose = vi.fn();
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
        mesh.castShadow = true;
        root.add(mesh);
        return root;
    })
}));

import { createCarryObjectVisual, disposeCarryObjectVisual, updateCarryObjectVisual } from './carryPresentation.js';

describe('carry object presentation', () => {
    it('loads the authored carry model without adding a shadow caster', async () => {
        const root = await createCarryObjectVisual({ instanceId: 'cot-1', definitionId: 'cot_bed', modelType: 'carry_field_cot_folded' });
        expect(root.name).toBe('CarryObject:cot-1');
        expect(root.children[0].castShadow).toBe(false);
        expect(updateCarryObjectVisual(root, { mode: 'held', x: 2, y: 0.8, z: 3, yaw: 1 })).toBe(true);
        expect(root.position.toArray()).toEqual([2, 0.8, 3]);
    });

    it('runs per-instance cleanup when cargo leaves the world', async () => {
        const root = await createCarryObjectVisual({ instanceId: 'cot-1', definitionId: 'cot_bed', modelType: 'carry_field_cot_folded' });
        const remove = vi.spyOn(root, 'removeFromParent');
        disposeCarryObjectVisual(root);
        expect(root.userData.dispose).toHaveBeenCalledOnce();
        expect(remove).toHaveBeenCalledOnce();
    });
});
