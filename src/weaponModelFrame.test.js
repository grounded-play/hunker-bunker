import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ARCHETYPE_SKINS } from './data/classArsenal.js';
import { WEAPON_ARCHETYPES, WEAPON_SKIN_MESHES } from './data/operatorModelUrls.js';
import { WEAPON_MODEL_FRAMES, getArchetypeGripPoint, getWeaponModelFrame, resolveWeaponModel } from './data/weaponModelFrames.js';
import { frameWeaponModel } from './weaponModelFrame.js';
import { getWeaponScaleForBounds } from './weaponCalibration.js';

// A stand-in gun: a 1 x 0.4 x 0.1 slab along X, origin at its rear-bottom
// corner, with a marker child at the muzzle end (+X when authored like the
// Talon, -X for a model authored backwards).
function slabGun(muzzleSign = 1) {
    const scene = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1, 0.4, 0.1));
    body.position.set(0.5 * muzzleSign, 0.2, 0);
    const muzzle = new THREE.Object3D();
    muzzle.name = 'muzzle';
    muzzle.position.set(muzzleSign, 0.2, 0);
    scene.add(body, muzzle);
    return scene;
}

function worldOf(root, name) {
    root.updateMatrixWorld(true);
    return root.getObjectByName(name).getWorldPosition(new THREE.Vector3());
}

describe('weapon model frames (data)', () => {
    it('covers every class frame and every finish model the Armory can equip', () => {
        for (const url of Object.values(WEAPON_ARCHETYPES)) expect(WEAPON_MODEL_FRAMES[url], url).toBeDefined();
        for (const ids of Object.values(ARCHETYPE_SKINS)) {
            for (const id of ids) {
                const url = WEAPON_SKIN_MESHES[id];
                if (url) expect(WEAPON_MODEL_FRAMES[url], `${id} ${url}`).toBeDefined();
            }
        }
    });

    it('keeps grips inside the model and gives every class frame reference bounds', () => {
        for (const [url, frame] of Object.entries(WEAPON_MODEL_FRAMES)) {
            for (const value of frame.grip) expect(value, url).toBeGreaterThanOrEqual(0);
            for (const value of frame.grip) expect(value, url).toBeLessThanOrEqual(1);
        }
        for (const url of Object.values(WEAPON_ARCHETYPES)) expect(getArchetypeGripPoint(url), url).toHaveLength(3);
    });

    it('turns the models authored muzzle-first along -X (the Talon-C frame and the 4105 Obsidian Shard)', () => {
        expect(getWeaponModelFrame(WEAPON_ARCHETYPES.talon).yaw).toBe(0);
        expect(getWeaponModelFrame(WEAPON_ARCHETYPES.talon_c).yaw).toBeCloseTo(Math.PI);
        expect(getWeaponModelFrame(WEAPON_SKIN_MESHES[4105]).yaw).toBeCloseTo(Math.PI);
    });
});

describe('frameWeaponModel', () => {
    it('points a backwards-authored finish model muzzle-first along +X', () => {
        const root = frameWeaponModel(slabGun(-1), { url: WEAPON_SKIN_MESHES[4105], archetypeId: 'talon', archetypeUrl: WEAPON_ARCHETYPES.talon, matchGrip: false });
        expect(worldOf(root, 'muzzle').x).toBeGreaterThan(0.9);
    });

    it('lands the finish model grip on the class frame grip once both are scaled', () => {
        const url = WEAPON_SKIN_MESHES[4105];
        const root = frameWeaponModel(slabGun(-1), { url, archetypeId: 'talon', archetypeUrl: WEAPON_ARCHETYPES.talon });
        root.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(root);
        const size = box.getSize(new THREE.Vector3());
        const { grip } = getWeaponModelFrame(url);
        const gripPoint = new THREE.Vector3(box.min.x + size.x * grip[0], box.min.y + size.y * grip[1], (box.min.z + box.max.z) / 2);

        const { min, max } = getWeaponModelFrame(WEAPON_ARCHETYPES.talon).bounds;
        const ratio = getWeaponScaleForBounds(max.map((v, i) => v - min[i]), 'talon') / getWeaponScaleForBounds(size, 'talon');
        const expected = new THREE.Vector3(...getArchetypeGripPoint(WEAPON_ARCHETYPES.talon)).multiplyScalar(ratio);
        expect(gripPoint.distanceTo(expected)).toBeLessThan(1e-6);
    });

    it('leaves a class frame where its hand calibration was tuned', () => {
        const scene = slabGun(1);
        const root = frameWeaponModel(scene, { url: WEAPON_ARCHETYPES.talon, archetypeId: 'talon', archetypeUrl: WEAPON_ARCHETYPES.talon });
        expect(scene.position.toArray()).toEqual([0, 0, 0]);
        expect(worldOf(root, 'muzzle').x).toBeCloseTo(1);
    });
});

// The Armory bench showed the class frame painted for 4100/4101/4105/4108
// while the operator held the finish's own model with the same paint on top,
// so the close-up and the hero never matched and the detail was painted over.
describe('resolveWeaponModel', () => {
    it('shows a finish with its own model as that model, unpainted', () => {
        expect(resolveWeaponModel('talon', '4105')).toEqual({ url: WEAPON_SKIN_MESHES[4105], archetypeUrl: WEAPON_ARCHETYPES.talon, bespoke: true });
    });

    it('paints the class frame for a finish without a model, and shows the frame bare without one', () => {
        expect(resolveWeaponModel('talon', '2200')).toEqual({ url: WEAPON_ARCHETYPES.talon, archetypeUrl: WEAPON_ARCHETYPES.talon, bespoke: false });
        expect(resolveWeaponModel('siege_breaker', null).url).toBe(WEAPON_ARCHETYPES.siege_breaker);
        expect(resolveWeaponModel('nope', null).url).toBe(WEAPON_ARCHETYPES.gg1);
    });
});
