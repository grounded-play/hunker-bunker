import { describe, expect, it } from 'vitest';
import { resolveScatterWorld3dType, isWorld3dOnlyPlacementType, WORLD_3D_MODELS } from './world3dOverlay.js';

// 3D asset audit 2026-10-01: frozen bodies were swapped for `frozen_tanker`
// (an industrial tank machine), and the higher-detail body models were never
// placed. Bodies now resolve to body models, both variants appearing.
describe('scatter body 3D models', () => {
    const positions = Array.from({ length: 40 }, (_, i) => [i * 3.7, i * 1.3]);

    it('shows frozen bodies as frozen-human models, never the tanker machine', () => {
        const types = new Set(positions.map(([x, z]) => resolveScatterWorld3dType('body_human_frozen_suit', x, z)));
        expect(types).toEqual(new Set(['prop_body_human_frozen', 'body_frozen_human']));
    });

    it('uses both exosuit models', () => {
        const types = new Set(positions.map(([x, z]) => resolveScatterWorld3dType('body_empty_exosuit', x, z)));
        expect(types).toEqual(new Set(['prop_body_empty_exosuit', 'body_empty_exosuit']));
    });

    it('is stable for a position and passes other registered types through', () => {
        expect(resolveScatterWorld3dType('body_empty_exosuit', 5, 9)).toBe(resolveScatterWorld3dType('body_empty_exosuit', 5, 9));
        expect(resolveScatterWorld3dType('cybersnail_dead', 1, 1)).toBe('cybersnail_dead');
        expect(resolveScatterWorld3dType('scatter_nothing_registered', 1, 1)).toBeNull();
    });

    it('places sprite-less models as 3D-only', () => {
        for (const type of ['frozen_tanker', 'prop_body_human_frozen', 'prop_body_empty_exosuit', 'body_frozen_human']) {
            expect(WORLD_3D_MODELS[type], type).toBeTruthy();
            expect(isWorld3dOnlyPlacementType(type), type).toBe(true);
        }
    });
});
