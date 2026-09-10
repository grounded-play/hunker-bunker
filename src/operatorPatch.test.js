import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createOperatorPatch } from './operatorPatch.js';

describe('createOperatorPatch', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    function createTestRig() {
        const root = new THREE.Group();
        root.name = 'TestRoot';
        const spine = new THREE.Bone();
        spine.name = 'mixamorigSpine';
        const spine1 = new THREE.Bone();
        spine1.name = 'mixamorigSpine1';
        const spine2 = new THREE.Bone();
        spine2.name = 'mixamorigSpine2';
        spine.add(spine1);
        spine1.add(spine2);
        root.add(spine);

        const bodyMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 1.85, 0.3),
            new THREE.MeshStandardMaterial({ color: 0x333333 })
        );
        bodyMesh.position.y = 0.925;
        root.add(bodyMesh);

        return { root, spine2, bodyMesh };
    }

    it('mounts to the chest bone (Spine2) when available', () => {
        const { root, spine2 } = createTestRig();
        const patch = createOperatorPatch(root, { targetHeight: 1.85 });

        expect(patch.root.name).toBe('OperatorChestPatch');
        expect(patch.root.parent).toBe(spine2);

        const backing = patch.root.getObjectByName('PatchClothBacking');
        const face = patch.root.getObjectByName('PatchArtwork');

        expect(backing).toBeDefined();
        expect(face).toBeDefined();
        expect(backing.castShadow).toBe(true);
        expect(backing.receiveShadow).toBe(true);
        expect(face.material.transparent).toBe(true);
        expect(face.material.depthTest).toBe(true);
        expect(face.material.depthWrite).toBe(true);
        expect(face.material.side).toBe(THREE.FrontSide);
    });

    it('positions the patch snug against the chest', () => {
        const { root } = createTestRig();
        const patch = createOperatorPatch(root, { targetHeight: 1.85 });

        expect(patch.root.position.x).toBeGreaterThan(0);
        expect(patch.root.position.z).toBeGreaterThan(0);
        // Snug distance in front of spine (between 3cm and 8cm)
        expect(patch.root.position.z).toBeLessThan(0.09);
    });

    it('loads patch images and manages texture lifecycle', () => {
        const { root } = createTestRig();
        let loadedCallback = null;
        const fakeLoader = {
            load: vi.fn((url, onLoad) => {
                loadedCallback = onLoad;
            })
        };

        const patch = createOperatorPatch(root, { targetHeight: 1.85, loader: fakeLoader });
        expect(patch.root.visible).toBe(false);

        patch.setImage('/economy/patch_scout.png');
        expect(fakeLoader.load).toHaveBeenCalled();

        const fakeTexture = new THREE.Texture();
        const disposeSpy = vi.spyOn(fakeTexture, 'dispose');
        loadedCallback(fakeTexture);

        expect(patch.root.visible).toBe(true);
        const face = patch.root.getObjectByName('PatchArtwork');
        expect(face.material.map).toBe(fakeTexture);

        patch.dispose();
        expect(disposeSpy).toHaveBeenCalled();
        expect(patch.root.parent).toBeNull();
    });
});
