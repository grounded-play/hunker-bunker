import fs from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { KIT_SCALE, applyKitMaterials, getKitMaterial, kitSkinForType, kitTextureUrls } from './kitMaterials.js';
import { WORLD_3D_MODELS } from './world3dOverlay.js';

const loader = { load: (url) => Object.assign(new THREE.Texture(), { userData: { url } }) };

describe('kit surface materials', () => {
    it('maps kit types to their skin and leaves everything else alone', () => {
        expect(kitSkinForType('kit_cave_room_large')).toBe('cave');
        expect(kitSkinForType('kit_space_gate_door')).toBe('space');
        expect(kitSkinForType('prop_camp_crate')).toBeNull();
    });

    it('ships every texture the kit materials load', () => {
        for (const skin of ['cave', 'space']) {
            for (const surface of ['wall', 'floor']) {
                for (const url of Object.values(kitTextureUrls(skin, surface))) {
                    expect(fs.existsSync(`public${url}`), url).toBe(true);
                }
            }
        }
    });

    // One material per skin and surface, so 80 pieces share four texture sets
    // in memory instead of loading their own.
    it('shares one tiling, vertex-tinted material per skin and surface', () => {
        const a = getKitMaterial('cave', 'wall', loader);
        expect(getKitMaterial('cave', 'wall', loader)).toBe(a);
        expect(getKitMaterial('cave', 'floor', loader)).not.toBe(a);
        expect(a.vertexColors).toBe(true);
        expect(a.map.userData.url).toBe('/3d/runtime/kits/textures/cave_wall_color.webp');
        expect(a.map.wrapS).toBe(THREE.RepeatWrapping);
        expect(a.map.colorSpace).toBe(THREE.SRGBColorSpace);
        expect(a.normalMap).toBeTruthy();
        expect(a.roughnessMap).toBeTruthy();
    });

    it('swaps the exported kit_wall / kit_floor materials for the shared ones', () => {
        const root = new THREE.Group();
        const wall = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ name: 'kit_wall' }));
        const floor = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ name: 'kit_floor' }));
        const other = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ name: 'glass' }));
        root.add(wall, floor, other);
        expect(applyKitMaterials(root, 'kit_space_corridor', loader)).toBe(2);
        expect(wall.material).toBe(getKitMaterial('space', 'wall', loader));
        expect(floor.material).toBe(getKitMaterial('space', 'floor', loader));
        expect(other.material.name).toBe('glass');
    });

    // Kenney pieces share one 4-unit socket grid. Scaling each piece to its
    // own height (the old registry) gave rooms, stairs and floors different
    // scales, so sockets could never meet, and divided by ~0 on a flat floor.
    it('scales every kit piece by one uniform factor', () => {
        const kits = Object.entries(WORLD_3D_MODELS).filter(([type]) => type.startsWith('kit_'));
        expect(kits.length).toBe(80);
        for (const [type, config] of kits) {
            expect(config.scale, type).toBe(KIT_SCALE);
            expect(config.height, type).toBeUndefined();
        }
    });
});
