import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createClassWeapon, resolveWeaponMountOptions } from './player3dOverlay.js';
import { sheenFactor } from './weaponSheenMaterial.js';

const model = () => {
    const scene = new THREE.Group();
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshStandardMaterial({ color: '#ffffff' })));
    return { scene };
};

// The gun's own mesh; it sits under the model-frame group, beside the charm socket.
const gunMesh = (weapon) => {
    let mesh = null;
    weapon.traverse((object) => {
        if (!mesh && object.isMesh && !weapon.userData.charmSocket?.getObjectById(object.id)) mesh = object;
    });
    return mesh;
};

afterEach(() => vi.restoreAllMocks());

describe('deployed weapon equipment', () => {
    it('preserves gameplay cosmetics supplied through weaponMount', () => {
        expect(resolveWeaponMountOptions({
            weaponMount: { position: [1, 2, 3], skinId: '4103', sheenColor: '#58efff', charmId: '4138' }
        })).toEqual({
            position: [1, 2, 3],
            skinId: '4103',
            sheenColor: '#58efff',
            charmId: '4138'
        });
    });

    it('lets explicit hero cosmetics override weaponMount', () => {
        expect(resolveWeaponMountOptions({
            weaponMount: { skinId: 'old', sheenColor: '#ffffff', charmId: 'old-charm' },
            weaponSkinId: 'new',
            weaponSheenColor: '#ff6262',
            charmId: 'new-charm'
        })).toMatchObject({ skinId: 'new', sheenColor: '#ff6262', charmId: 'new-charm' });
    });

    it('mounts the selected charm and tints only the gun', async () => {
        vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockImplementation(async () => model());
        const weapon = await createClassWeapon('tesla_lock', { skinId: '4103', charmId: '4138', sheenColor: '#ff6262' });
        const charm = weapon.userData.charmSocket.children[0];
        expect(weapon.name).toContain('skin4103');
        expect(weapon.userData.weaponSheen).toBe('#ff6262');
        expect(gunMesh(weapon).material.color.getHexString()).toBe(sheenFactor('#ff6262').getHexString());
        expect(charm.name).toBe('WeaponCharm_4138');
        expect(charm.children[0].material.color.getHexString()).toBe('ffffff');
        expect(charm.position.y).toBeLessThan(0);
    });

    it('keeps charm and sheen when a missing weapon skin falls back to its frame', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockImplementation(async (url) => {
            if (url.includes('skin_hazard_stripe_smg')) throw new Error('skin unavailable');
            return model();
        });
        const weapon = await createClassWeapon('talon_c', { skinId: '4101', charmId: '4130', sheenColor: '#58efff' });
        expect(weapon.name).toBe('ClassWeapon_talon_c');
        expect(weapon.userData.weaponSheen).toBe('#58efff');
        expect(weapon.userData.charmSocket.children[0].userData.charmId).toBe('4130');
    });

    it('keeps a usable weapon when charm art fails to load', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockImplementation(async (url) => {
            if (url.includes('charm_spent_50cal')) throw new Error('charm unavailable');
            return model();
        });
        const weapon = await createClassWeapon('siege_breaker', { charmId: '4131', sheenColor: '#ff6262' });
        expect(weapon.userData.charmSocket.children).toHaveLength(0);
        expect(gunMesh(weapon)).not.toBeNull();
        expect(weapon.userData.weaponSheen).toBe('#ff6262');
    });

    it('applies material finish PBR properties to a finish without its own model', async () => {
        vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockImplementation(async () => model());
        const weapon = await createClassWeapon('talon', { skinId: '2200', sheenColor: '#ffffff' });
        expect(weapon.userData.weaponFinish).toBe('2200');
        expect(gunMesh(weapon).material.roughness).toBe(0.14);
    });

    // 4101/4105 etc. ship their own model; painting the procedural finish over
    // it replaced its textures with a flat pattern.
    it('shows a finish with its own model unpainted', async () => {
        const urls = [];
        vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockImplementation(async (url) => { urls.push(url); return model(); });
        const weapon = await createClassWeapon('talon', { skinId: '4105', sheenColor: '#ffffff' });
        expect(urls.some((url) => url.includes('skin_obsidian_shard'))).toBe(true);
        expect(weapon.userData.weaponFinish).toBeUndefined();
        expect(gunMesh(weapon).material.map).toBeNull();
    });
});
