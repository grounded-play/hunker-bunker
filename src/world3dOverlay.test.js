import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { WORLD_3D_MODELS, hasWorld3dModel, syncWorld3dReplacement } from './world3dOverlay.js';

describe('world 3D replacement catalog', () => {
    it('maps each new world counterpart to an optimized runtime GLB', () => {
        expect(WORLD_3D_MODELS.broken_scout_ship.url).toBe('/3d/runtime/broken-scout-ship.glb');
        expect(WORLD_3D_MODELS.base_console.url).toBe('/3d/runtime/console.glb');
        expect(WORLD_3D_MODELS.o2_generator.url).toBe('/3d/runtime/o2-generator.glb');
        expect(WORLD_3D_MODELS.basic_pile.url).toBe('/3d/runtime/basic-pile.glb');
        expect(WORLD_3D_MODELS.storage_locker.url).toBe('/3d/runtime/storage-locker.glb');
        expect(WORLD_3D_MODELS.frozen_tanker.url).toBe('/3d/runtime/frozen-tanker.glb');
    });

    it('keeps every model normalized to a positive gameplay height', () => {
        for (const config of Object.values(WORLD_3D_MODELS)) {
            expect(config.url.endsWith('.glb')).toBe(true);
            expect(config.height).toBeGreaterThan(0);
        }
    });

    it('registers all thirteen new world-prop replacements', () => {
        const types = [
            'bunker_junk_rare', 'bunker_junk_uncommon', 'prop_bunker_supplies',
            'prop_specimen_tank', 'prop_broken_specimen_tank', 'prop_surgical_cart',
            'prop_medical_bed', 'prop_diagnostic_console', 'prop_security_barricade',
            'prop_conduit_hub', 'prop_cave_bones', 'prop_cave_queen_throne', 'prop_biomech_arch'
        ];
        for (const type of types) {
            expect(hasWorld3dModel(type), type).toBe(true);
            expect(WORLD_3D_MODELS[type].url).toContain('/3d/runtime/new3ds/');
        }
    });

    it('resynchronizes a loaded model when its source sprite moves during an animation', () => {
        const source = new THREE.Sprite(new THREE.SpriteMaterial({ rotation: 0.4 }));
        const root = new THREE.Group();
        source.userData.world3dRoot = root;
        source.userData.world3dDesiredVisible = true;
        source.position.set(3, -1.2, 7);

        expect(syncWorld3dReplacement(source, { scale: 0.5 })).toBe(true);
        expect(root.position.toArray()).toEqual([3, -1.2, 7]);
        expect(root.scale.toArray()).toEqual([0.5, 0.5, 0.5]);
        expect(root.rotation.y).toBeCloseTo(0.4);
        expect(root.visible).toBe(true);
    });
});
