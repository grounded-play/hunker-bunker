import { describe, expect, it } from 'vitest';
import { SHOWROOM_CATEGORIES } from './debugShowroom.js';
import { WORLD_3D_MODELS } from './world3dOverlay.js';
import { NPC_GLB_MAP } from './debugAssetCatalogs.js';

// The debug museum is how art gets visually verified without hunting for it in
// a live run. An asset registered in WORLD_3D_MODELS but absent from the
// gallery can only be checked by finding one in the world, which is exactly how
// eleven Sprint 34 props sat unverified: they were wired into world generation
// and invisible to QA.
//
// NPCs reach the museum through NPC_GLB_MAP rather than a showroom category, so
// they are matched by GLB url instead of by type key.

const showroomTypes = new Set(Object.values(SHOWROOM_CATEGORIES).flat().map(String));
const npcUrls = new Set(Object.values(NPC_GLB_MAP));

describe('debug museum coverage', () => {
    it('exhibits every registered world model', () => {
        const unreachable = Object.entries(WORLD_3D_MODELS)
            .filter(([type, config]) => !showroomTypes.has(type) && !npcUrls.has(config.url))
            .map(([type]) => type);

        expect(unreachable).toEqual([]);
    });

    // A category listing a type that no longer exists renders an empty plinth,
    // which reads as a broken asset rather than an absent one.
    it('lists no showroom type that has no model behind it', () => {
        const worldTypes = new Set(Object.keys(WORLD_3D_MODELS));
        // Categories that intentionally hold itemdef ids or decal names rather
        // than world-model types.
        const NON_WORLD = new Set([
            'WEAPON_ARCHETYPES', 'WEAPON_SKINS', 'WEAPON_CHARMS', 'RIG_OVERCLOCK_MODS',
            'CHASSIS_SKINS', 'COSMETIC_PLAYER_DECALS', 'WALL_DECALS', 'FLOOR_DECALS', 'ENEMIES'
        ]);

        const dangling = [];
        for (const [name, entries] of Object.entries(SHOWROOM_CATEGORIES)) {
            if (NON_WORLD.has(name)) continue;
            for (const type of entries) {
                if (!worldTypes.has(String(type))) dangling.push(`${name}: ${type}`);
            }
        }
        expect(dangling).toEqual([]);
    });

    it('covers the Sprint 34 world art specifically', () => {
        for (const type of [
            'prop_camp_cot', 'prop_camp_crate', 'prop_hive_resin_sac',
            'scatter_bolts', 'scatter_cable_coil',
            'state_barricade_improvised_1', 'state_growth_overrun_1',
            'body_empty_exosuit', 'body_frozen_human',
            'arch_bulkhead_frame', 'arch_deco_archway_grand_01', 'arch_deco_archway_grand_02',
            'arch_deco_archway_grand_03', 'arch_deco_archway_grand_04', 'arch_niche_shrine',
            'arch_pillar_buttress_01', 'arch_pillar_buttress_02', 'arch_pillar_buttress_03',
            'arch_pillar_buttress_04', 'arch_rib_ceiling_vault_01', 'arch_rib_ceiling_vault_02',
            'arch_rib_ceiling_vault_03', 'arch_window_stained', 'fixture_clock_dead',
            'fixture_sconce_vine', 'state_column_shattered', 'state_wall_breached_01',
            'state_wall_breached_02', 'state_wall_breached_03',
            'decal_floor_medallion_01', 'decal_floor_grate_01', 'decal_wall_panel_grille_01'
        ]) {
            expect(showroomTypes.has(type), type).toBe(true);
        }
    });

    it('covers the new fungal, cryo, biomech, and ruined industrial world props', () => {
        for (const type of [
            'prop_chair_operator_wrecked', 'prop_conduit_junction_box', 'prop_flesh_steel_coffin',
            'prop_flesh_steel_cradle', 'prop_flesh_steel_inhaler', 'prop_fungal_mycelium_loom',
            'prop_fungal_resin_basin', 'prop_fungal_spore_dispenser', 'prop_fungal_tendril_altar',
            'prop_icey_frost_manifold', 'prop_icey_frost_vent', 'prop_icey_thermal_pod',
            'prop_light_cluster_dripping', 'prop_locker_bulged', 'prop_pipe_rupture',
            'prop_shrine_plinth_broken', 'prop_storage_drum_dented', 'prop_terminal_ruptured',
            'prop_valve_wheel_fused', 'prop_vent_grate_exploded'
        ]) {
            expect(showroomTypes.has(type), type).toBe(true);
        }
    });
});
