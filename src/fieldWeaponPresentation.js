import * as THREE from 'three';
import { createClassWeapon } from './player3dOverlay.js';
import { disposeWeaponSheen } from './weaponSheenMaterial.js';
import { createWorld3dModel } from './world3dOverlay.js';

export const FIELD_WEAPON_PRESENTATION = Object.freeze({
    mk1_sidearm: Object.freeze({ archetype: 'gg1', color: 0x7fdcff }),
    pulse_carbine: Object.freeze({ archetype: 'talon_c', color: 0x70e8ff }),
    scatter_rep: Object.freeze({ archetype: 'siege_breaker', color: 0xffb55e }),
    rail_marksman: Object.freeze({ archetype: 'tesla_lock', color: 0xd791ff }),
    neon_smg: Object.freeze({ archetype: 'talon', color: 0xff5fc8 }),
    cryo_lance: Object.freeze({ archetype: 'tesla_lock', color: 0x70bfff }),
    flamethrower: Object.freeze({
        modelType: 'weapon_flamethrower_m70',
        caseModelType: 'weapon_flamethrower_case',
        color: 0xff6a21
    })
});

export function getFieldWeaponPresentation(profileId) {
    return FIELD_WEAPON_PRESENTATION[profileId] ?? null;
}

export async function createFieldWeaponDropVisual(profileId) {
    const presentation = getFieldWeaponPresentation(profileId);
    if (!presentation) return null;

    const root = new THREE.Group();
    root.name = `FieldWeaponDrop:${profileId}`;
    root.userData.isFieldWeaponDropVisual = true;
    root.userData.profileId = profileId;

    let weapon;
    if (presentation.modelType) {
        const [caseRoot, weaponRoot] = await Promise.all([
            createWorld3dModel(presentation.caseModelType),
            createWorld3dModel(presentation.modelType)
        ]);
        if (!caseRoot || !weaponRoot) {
            caseRoot?.userData?.dispose?.();
            weaponRoot?.userData?.dispose?.();
            return null;
        }
        const articulation = caseRoot.userData?.propExperience?.articulation;
        articulation?.set?.({ open: true });
        for (let step = 0; step < 20; step += 1) articulation?.update?.(1 / 30);
        weaponRoot.position.set(0, 0.32, 0.05);
        weaponRoot.rotation.y = -0.08;
        root.add(caseRoot, weaponRoot);
        root.userData.caseRoot = caseRoot;
        root.userData.weaponRoot = weaponRoot;
        weapon = weaponRoot;
    } else {
        weapon = await createClassWeapon(presentation.archetype, {
            position: [0, 0, 0],
            sheenColor: presentation.color
        });
        weapon.updateMatrixWorld(true);
        const initialBounds = new THREE.Box3().setFromObject(weapon);
        const size = initialBounds.getSize(new THREE.Vector3());
        const longestAxis = Math.max(size.x, size.y, size.z, 0.001);
        weapon.scale.multiplyScalar(1.35 / longestAxis);
        weapon.updateMatrixWorld(true);
        const fittedBounds = new THREE.Box3().setFromObject(weapon);
        weapon.position.y -= fittedBounds.min.y;
        weapon.traverse((object) => {
            if (!object.isMesh) return;
            object.castShadow = true;
            object.receiveShadow = true;
        });
        root.add(weapon);
    }

    const haloMaterial = new THREE.MeshBasicMaterial({
        color: presentation.color,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.58, 28), haloMaterial);
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.025;
    root.add(halo);
    root.userData.weapon = weapon;
    root.userData.halo = halo;
    root.userData.ownedResources = [{ geometry: halo.geometry, material: haloMaterial }];
    return root;
}

export function updateFieldWeaponDropVisual(root, elapsedSeconds) {
    if (!root?.userData?.isFieldWeaponDropVisual) return false;
    const phase = Number(elapsedSeconds) || 0;
    const halo = root.userData.halo;
    if (halo?.material) {
        halo.material.opacity = 0.58 + Math.sin(phase * 3.2) * 0.14;
        halo.scale.setScalar(1 + Math.sin(phase * 2.4) * 0.07);
    }
    return true;
}

export function disposeFieldWeaponDropVisual(root) {
    if (!root) return;
    disposeWeaponSheen(root.userData?.weapon);
    root.userData?.caseRoot?.userData?.dispose?.();
    root.userData?.weaponRoot?.userData?.dispose?.();
    for (const resource of root.userData?.ownedResources ?? []) {
        resource.geometry?.dispose?.();
        resource.material?.dispose?.();
    }
    root.removeFromParent?.();
}
