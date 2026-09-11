import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import {
    FINISH_DEFINITIONS,
    isMaterialFinish,
    applyWeaponMaterialFinish,
    restoreWeaponMaterialFinish,
    disposeWeaponMaterialFinish
} from './weaponFinishMaterial.js';

describe('weaponFinishMaterial (Tier 1 Surface Finishes)', () => {
    it('recognizes valid material finishes and rejects bespoke meshes', () => {
        expect(isMaterialFinish('4101')).toBe(true); // Hazard Stripe
        expect(isMaterialFinish(4100)).toBe(true);  // Sub-Zero Frostbite
        expect(isMaterialFinish('4105')).toBe(true); // Obsidian Shard
        expect(isMaterialFinish('4108')).toBe(true); // Glitched Circuit
        expect(isMaterialFinish('4106')).toBe(false); // Biolume Spore Sprayer (Exotic Mesh)
        expect(isMaterialFinish('4107')).toBe(false); // Deep Core Melter (Exotic Mesh)
        expect(isMaterialFinish('4201')).toBe(false); // Deep Frost (Sprint 34 Bespoke Mesh)
    });

    it('applies PBR color, roughness, metalness, and emissive properties cleanly', () => {
        const weapon = new THREE.Group();
        const baseMat = new THREE.MeshStandardMaterial({
            color: '#888888',
            roughness: 0.5,
            metalness: 0.5,
            emissive: new THREE.Color('#000000'),
            emissiveIntensity: 0
        });
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(), baseMat);
        weapon.add(mesh);

        const applied = applyWeaponMaterialFinish(weapon, '4101');
        expect(applied).toBe(true);
        expect(weapon.userData.weaponFinish).toBe('4101');

        const activeMat = mesh.material;
        expect(activeMat).not.toBe(baseMat);
        expect(activeMat.roughness).toBe(FINISH_DEFINITIONS['4101'].roughness);
        expect(activeMat.metalness).toBe(FINISH_DEFINITIONS['4101'].metalness);
        expect(activeMat.color.getHexString()).toBe(new THREE.Color(FINISH_DEFINITIONS['4101'].color).getHexString());
        expect(activeMat.emissive.getHexString()).toBe(new THREE.Color(FINISH_DEFINITIONS['4101'].emissive).getHexString());
    });

    it('restores original factory material properties without leakage', () => {
        const weapon = new THREE.Group();
        const originalColor = new THREE.Color('#334455');
        const baseMat = new THREE.MeshStandardMaterial({
            color: originalColor.clone(),
            roughness: 0.8,
            metalness: 0.2
        });
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(), baseMat);
        weapon.add(mesh);

        applyWeaponMaterialFinish(weapon, '4105'); // Obsidian Shard
        expect(mesh.material.roughness).toBe(FINISH_DEFINITIONS['4105'].roughness);

        restoreWeaponMaterialFinish(weapon);
        expect(mesh.material.roughness).toBe(0.8);
        expect(mesh.material.metalness).toBe(0.2);
        expect(mesh.material.color.equals(originalColor)).toBe(true);
        expect(weapon.userData.weaponFinish).toBeUndefined();
    });

    it('disposes cloned finish materials cleanly on teardown', () => {
        const weapon = new THREE.Group();
        const baseMat = new THREE.MeshStandardMaterial();
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(), baseMat);
        weapon.add(mesh);

        applyWeaponMaterialFinish(weapon, '4108');
        const clonedMat = mesh.material;
        const disposeSpy = vi.spyOn(clonedMat, 'dispose');

        disposeWeaponMaterialFinish(weapon);
        expect(disposeSpy).toHaveBeenCalledOnce();
    });
});
