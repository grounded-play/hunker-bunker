import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createClassWeapon } from './player3dOverlay.js';

const model = () => {
    const scene = new THREE.Group();
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshStandardMaterial({ color: '#ffffff' })));
    return { scene };
};

afterEach(() => vi.restoreAllMocks());

describe('deployed weapon equipment', () => {
    it('mounts the selected charm and tints only the gun', async () => {
        vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockImplementation(async () => model());
        const weapon = await createClassWeapon('tesla_lock', { skinId: '4103', charmId: '4138', sheenColor: '#ff6262' });
        const charm = weapon.userData.charmSocket.children[0];
        expect(weapon.name).toContain('skin4103');
        expect(weapon.userData.weaponSheen).toBe('#ff6262');
        expect(weapon.children[0].material.color.getHexString()).toBe('ff6262');
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
        expect(weapon.children[0].isMesh).toBe(true);
        expect(weapon.userData.weaponSheen).toBe('#ff6262');
    });
});
