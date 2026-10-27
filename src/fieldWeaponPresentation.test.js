import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

vi.mock('./player3dOverlay.js', () => ({
    createClassWeapon: vi.fn(async () => {
        const root = new THREE.Group();
        // The real gameplay factory returns its model rotated into a hand pose.
        root.rotation.set(Math.PI, 0, -Math.PI / 2);
        root.add(new THREE.Mesh(
            new THREE.BoxGeometry(2, 0.4, 0.3),
            new THREE.MeshStandardMaterial()
        ));
        return root;
    })
}));

vi.mock('./world3dOverlay.js', () => ({
    createWorld3dModel: vi.fn(async (type) => {
        const root = new THREE.Group();
        root.name = `World3d:${type}`;
        root.userData.dispose = vi.fn();
        root.userData.propExperience = type.includes('case') ? {
            articulation: { set: vi.fn(), update: vi.fn() }
        } : null;
        root.add(new THREE.Mesh(new THREE.BoxGeometry(1, 0.4, 0.3), new THREE.MeshStandardMaterial()));
        return root;
    })
}));

import {
    FIELD_WEAPON_PRESENTATION,
    createFieldWeaponDropVisual,
    disposeFieldWeaponDropVisual,
    updateFieldWeaponDropVisual
} from './fieldWeaponPresentation.js';

describe('field weapon world presentation', () => {
    it('routes every run weapon to an authored gun archetype', () => {
        expect(Object.keys(FIELD_WEAPON_PRESENTATION)).toEqual([
            'mk1_sidearm', 'pulse_carbine', 'scatter_rep',
            'rail_marksman', 'neon_smg', 'cryo_lance', 'flamethrower'
        ]);
        expect(new Set(Object.values(FIELD_WEAPON_PRESENTATION).map(({ archetype }) => archetype).filter(Boolean)))
            .toEqual(new Set(['gg1', 'talon_c', 'siege_breaker', 'tesla_lock', 'talon']));
    });

    it('creates a grounded authored model with a pulsing rarity halo', async () => {
        const root = await createFieldWeaponDropVisual('cryo_lance');
        expect(root.userData.weapon).toBeTruthy();
        expect(root.userData.halo).toBeTruthy();
        expect(root.userData.weapon.rotation.toArray().slice(0, 3)).toEqual([0, 0, 0]);
        expect(new THREE.Box3().setFromObject(root.userData.weapon).min.y).toBeCloseTo(0);
        expect(updateFieldWeaponDropVisual(root, 1)).toBe(true);
        const remove = vi.spyOn(root, 'removeFromParent');
        disposeFieldWeaponDropVisual(root);
        expect(remove).toHaveBeenCalledOnce();
    });

    it('presents the M-70 inside its authored open case and disposes both model experiences', async () => {
        const root = await createFieldWeaponDropVisual('flamethrower');
        expect(root.userData.caseRoot.name).toBe('World3d:weapon_flamethrower_case');
        expect(root.userData.weaponRoot.name).toBe('World3d:weapon_flamethrower_m70');
        expect(root.userData.caseRoot.userData.propExperience.articulation.set)
            .toHaveBeenCalledWith({ open: true });
        disposeFieldWeaponDropVisual(root);
        expect(root.userData.caseRoot.userData.dispose).toHaveBeenCalledOnce();
        expect(root.userData.weaponRoot.userData.dispose).toHaveBeenCalledOnce();
    });
});
