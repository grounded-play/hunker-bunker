import { describe, expect, it } from 'vitest';
import { DRESSING_KITS, ROLE_DRESSING } from './roomDressingKits.js';
import {
    getSurfaceAssetProfile,
    isSurfaceAssetPlacementAllowed
} from './surfaceAssetRegistry.js';

describe('surface asset registry', () => {
    it('accounts for every room-dressing decal on its declared support plane', () => {
        for (const catalog of [DRESSING_KITS, ROLE_DRESSING]) {
            for (const kit of Object.values(catalog)) {
                for (const type of kit.wallDecals ?? []) {
                    expect(getSurfaceAssetProfile(type), type).not.toBeNull();
                    expect(isSurfaceAssetPlacementAllowed(type, 'wallDecal'), type).toBe(true);
                }
                for (const type of kit.floorDecals ?? []) {
                    expect(getSurfaceAssetProfile(type), type).not.toBeNull();
                    expect(isSurfaceAssetPlacementAllowed(type, 'floorDecal'), type).toBe(true);
                }
            }
        }
    });

    it('keeps wall diagrams and execution splatter off the floor', () => {
        for (const type of ['decal_vass_acoustic_diagram', 'decal_execution_wall_splatter']) {
            expect(getSurfaceAssetProfile(type)?.surface).toBe('wall');
            expect(isSurfaceAssetPlacementAllowed(type, 'floorDecal')).toBe(false);
        }
    });

    it('allows the authored pod rupture splash on walls and floors', () => {
        expect(getSurfaceAssetProfile('decal_pod_312_rupture_splatter')?.surface).toBe('multi');
        expect(isSurfaceAssetPlacementAllowed('decal_pod_312_rupture_splatter', 'wallDecal')).toBe(true);
        expect(isSurfaceAssetPlacementAllowed('decal_pod_312_rupture_splatter', 'floorDecal')).toBe(true);
    });
});
