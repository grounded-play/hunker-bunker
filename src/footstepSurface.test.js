import { describe, expect, it } from 'vitest';
import { FLOOR_LAYER, FLOOR_SURFACES, surfaceLayer } from './floorSplat.js';
import { FOOTSTEP_BANKS, SURFACE_FOOTSTEP, WET_SPLASH_THRESHOLD, resolveFootstepSurface } from './footstepSurface.js';
import { FOOTSTEP_SOUNDSET_KEYS } from './data/gameSoundsets.js';

describe('footstep surface', () => {
    it('maps every floor texture the game can draw to a real bank', () => {
        for (const surface of FLOOR_SURFACES) {
            expect(SURFACE_FOOTSTEP[surface.id], surface.id).toBeTruthy();
        }
        for (const key of Object.values(SURFACE_FOOTSTEP)) expect(FOOTSTEP_BANKS).toContain(key);
    });

    it('reads the texture under the boot', () => {
        expect(resolveFootstepSurface({ floorLayer: surfaceLayer('tex_floor_grate_trench', 'a') }).key).toBe('footstep_metal_grate');
        expect(resolveFootstepSurface({ floorLayer: surfaceLayer('tex_floor_spent_casings_drift', 'b') }).key).toBe('footstep_shell_casings');
        expect(resolveFootstepSurface({ floorLayer: surfaceLayer('tex_path_packed_snow', 'c') }).key).toBe('footstep_snow');
        expect(resolveFootstepSurface({ floorLayer: surfaceLayer('tex_floor_shattered_safety_glass', 'd') }).key).toBe('footstep_glass');
        expect(resolveFootstepSurface({ floorLayer: FLOOR_LAYER.CAMP }).key).toBe('footstep_wood_plank');
        expect(resolveFootstepSurface({ floorLayer: FLOOR_LAYER.HALLWAY }).key).toBe('footstep_metal_deck');
    });

    it('lets a puddle, slime or blood underfoot win over the floor', () => {
        const grate = surfaceLayer('tex_floor_grate_trench', 'a');
        expect(resolveFootstepSurface({ floorLayer: grate, underfoot: 'water' }).key).toBe('footstep_wet_puddle');
        expect(resolveFootstepSurface({ floorLayer: grate, underfoot: 'blood' }).key).toBe('footstep_hive_slime');
    });

    it('adds a splash on a wet solid floor, not on one that is already wet', () => {
        const concrete = surfaceLayer('tex_floor_concrete_stained', 'a');
        expect(resolveFootstepSurface({ floorLayer: concrete, wetness: WET_SPLASH_THRESHOLD }).splash).toBe(true);
        expect(resolveFootstepSurface({ floorLayer: concrete, wetness: 0.2 }).splash).toBe(false);
        expect(resolveFootstepSurface({ floorLayer: surfaceLayer('tex_path_mud_track', 'a'), wetness: 0.9 }).splash).toBe(false);
    });

    it('falls back sensibly with no floor data (outdoors, biome)', () => {
        expect(resolveFootstepSurface({ outdoors: true }).key).toBe('footstep_deep_snow');
        expect(resolveFootstepSurface({ biome: 'cryo' }).key).toBe('footstep_ice_crunch');
        expect(resolveFootstepSurface({}).key).toBe('footstep_concrete');
        expect(resolveFootstepSurface({ floorLayer: FLOOR_LAYER.NONE, biome: 'bio' }).key).toBe('footstep_organic');
    });

    it('only names banks that exist as soundsets', () => {
        for (const key of FOOTSTEP_BANKS) expect(FOOTSTEP_SOUNDSET_KEYS).toContain(key);
    });
});
