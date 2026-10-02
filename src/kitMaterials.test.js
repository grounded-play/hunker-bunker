import fs from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
    KIT_SCALE,
    KIT_THEMES,
    applyKitMaterials,
    getKitMaterial,
    kitSkinForType,
    kitTextureUrls,
    updateKitMaterials
} from './kitMaterials.js';
import { WORLD_3D_MODELS } from './world3dOverlay.js';

const loader = { load: (url) => Object.assign(new THREE.Texture(), { userData: { url } }) };

describe('kit surface materials', () => {
    it('maps kit types to their skin and leaves everything else alone', () => {
        expect(kitSkinForType('kit_cave_room_large')).toBe('cave');
        expect(kitSkinForType('kit_space_gate_door')).toBe('space');
        expect(kitSkinForType('kit_cathedral_room_wide')).toBe('cathedral');
        expect(kitSkinForType('kit_bunker_corridor')).toBe('bunker');
        expect(kitSkinForType('kit_biomech_corridor')).toBe('biomech');
        expect(kitSkinForType('prop_camp_crate')).toBeNull();
    });

    it('ships every texture across all themes (both recovered CC0 and custom suites)', () => {
        const skins = Object.values(KIT_THEMES);
        expect(skins).toContain('cave');
        expect(skins).toContain('space');
        expect(skins).toContain('cathedral');
        expect(skins).toContain('bunker');
        expect(skins).toContain('biomech');

        for (const skin of skins) {
            for (const surface of ['wall', 'floor']) {
                for (const url of Object.values(kitTextureUrls(skin, surface))) {
                    expect(fs.existsSync(`public${url}`), url).toBe(true);
                }
            }
        }
    });

    // One material per skin and surface, so pieces share texture sets
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

        // Custom cathedral set
        const cath = getKitMaterial('cathedral', 'wall', loader);
        expect(cath.map.userData.url).toBe('/3d/runtime/kits/textures/cathedral_wall_color.webp');
    });

    it('wires emissive maps and handles breathing pulse for biomech materials', () => {
        const biomechWall = getKitMaterial('biomech', 'wall', loader);
        expect(biomechWall.emissiveMap).toBeTruthy();
        expect(biomechWall.emissiveMap.userData.url).toBe('/3d/runtime/kits/textures/biomech_wall_emissive.webp');
        expect(biomechWall.emissive).toBeTruthy();

        const baseIntensity = biomechWall.emissiveIntensity;
        updateKitMaterials(1.0);
        expect(biomechWall.emissiveIntensity).not.toBeNaN();
        expect(biomechWall.emissiveIntensity).not.toBe(baseIntensity);
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

    it('supports dynamic variations combining classic and custom textures together', () => {
        const rootCave = new THREE.Group();
        const wallCave = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ name: 'kit_wall' }));
        const floorCave = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ name: 'kit_floor' }));
        rootCave.add(wallCave, floorCave);

        // Standard piece uses classic cave rock
        applyKitMaterials(rootCave, 'kit_cave_room_large', loader, { dynamicVariations: true });
        expect(wallCave.material).toBe(getKitMaterial('cave', 'wall', loader));

        // Variation piece in standard cave dynamically uses custom cathedral crypt stone
        applyKitMaterials(rootCave, 'kit_cave_room_large_variation', loader, { dynamicVariations: true });
        expect(wallCave.material).toBe(getKitMaterial('cathedral', 'wall', loader));

        // Variation piece in bio cave dynamically uses living biomech synthesis
        applyKitMaterials(rootCave, 'kit_cave_room_large_variation', loader, { dynamicVariations: true, biome: 'bio' });
        expect(wallCave.material).toBe(getKitMaterial('biomech', 'wall', loader));

        // Space variation piece dynamically upgrades to heavy bunker bulkhead & hex grating
        const rootSpace = new THREE.Group();
        const wallSpace = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ name: 'kit_wall' }));
        const floorSpace = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ name: 'kit_floor' }));
        rootSpace.add(wallSpace, floorSpace);

        applyKitMaterials(rootSpace, 'kit_space_room_wide_variation', loader, { dynamicVariations: true });
        expect(wallSpace.material).toBe(getKitMaterial('bunker', 'wall', loader));
        expect(floorSpace.material).toBe(getKitMaterial('bunker', 'floor', loader));
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
