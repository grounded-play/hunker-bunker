import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

vi.mock('./player3dOverlay.js', () => ({
    createClassWeapon: vi.fn(async () => {
        const root = new THREE.Group();
        root.add(new THREE.Mesh(
            new THREE.BoxGeometry(2, 0.4, 0.3),
            new THREE.MeshStandardMaterial()
        ));
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
            'rail_marksman', 'neon_smg', 'cryo_lance'
        ]);
        expect(new Set(Object.values(FIELD_WEAPON_PRESENTATION).map(({ archetype }) => archetype)))
            .toEqual(new Set(['gg1', 'talon_c', 'siege_breaker', 'tesla_lock', 'talon']));
    });

    it('creates a grounded authored model with a pulsing rarity halo', async () => {
        const root = await createFieldWeaponDropVisual('cryo_lance');
        expect(root.userData.weapon).toBeTruthy();
        expect(root.userData.halo).toBeTruthy();
        expect(new THREE.Box3().setFromObject(root.userData.weapon).min.y).toBeCloseTo(0);
        expect(updateFieldWeaponDropVisual(root, 1)).toBe(true);
        const remove = vi.spyOn(root, 'removeFromParent');
        disposeFieldWeaponDropVisual(root);
        expect(remove).toHaveBeenCalledOnce();
    });
});
