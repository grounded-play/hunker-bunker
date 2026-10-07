// How each world prop behaves, by its style (Sprint 52, owner 2026-10-07:
// "each model does its thing unique to its style and placement").
//
// One table instead of rules scattered across placement paths: an arch you
// walk under, a floor piece you walk over, fungus that crushes underfoot and a
// crate that blocks all read their behavior here, however they were placed
// (room plan, scatter, 3D-only anchor, room dressing).
//
//   collision  'solid'   one round collider at the prop (the default)
//              'pillars' only its two side posts block; the opening is clear
//              'none'    never blocks
//   crushable  breaks when walked through (fungus)
//   floor      lies flat on the ground

export const PROP_COLLISION = Object.freeze({ SOLID: 'solid', PILLARS: 'pillars', NONE: 'none' });

// Flat on the floor: decals, puddles, grates, scattered bits. Never block.
export const FLOOR_OVERLAY_TYPES = new Set([
    'decal_oil_spill_patch',
    'decal_footprints_mud',
    'decal_tallow_symbol',
    'decal_bio_sample_spill',
    'decal_childlike_cave_map',
    'decal_hive_growth',
    'decal_spore_growth_patch',
    'decal_abandoned_meal_tray',
    'decal_failed_decon_kit',
    'decal_worker_sleep_roll',
    'decal_tallow_herb_cache',
    'scatter_bolts',
    'scatter_cable_coil',
    'scatter_coolant_puddle',
    'scatter_slime_puddle',
    'scatter_bio_moss',
    'scatter_horizon_black_box',
    'prop_camp_bedrolls',
    'prop_blood_trail',
    'prop_iron_guild_dogtags',
    'decal_grease_pool',
    'decal_growth_creep_1',
    'decal_growth_creep_2',
    'decal_frost_bloom_1',
    'decal_frost_bloom_2',
    'decal_scorch_bloom',
    'decal_floor_medallion_01',
    'decal_floor_medallion_02',
    'decal_floor_medallion_03',
    'decal_floor_medallion_04',
    'decal_floor_grate_01',
    'decal_floor_grate_02',
    'decal_floor_grate_03',
    'decal_floor_grate_04',
    'decal_friction_burn',
    'decal_flesh_press',
    'decal_fluid_seep',
    'decal_condensation_run'
]);

// Doorway-shaped models: the opening is the point.
const WALK_THROUGH_ARCHES = new Set([
    'arch_deco_archway_grand_01',
    'arch_deco_archway_grand_02',
    'arch_deco_archway_grand_03',
    'arch_deco_archway_grand_04',
    'prop_biomech_arch'
]);

// Low growth that breaks underfoot. Taller growth (state_growth_overrun_*,
// altars, looms) stays solid and breaks only when shot.
const CRUSHABLE_GROWTH = new Set([
    'prop_cave_spores',
    'prop_spore_colony',
    'prop_cave_lichen',
    'scatter_bio_moss'
]);

const FLOOR_PATTERN = /^(decal_|prop_floor_)|puddle|_grate_|^scatter_(bolts|cable_coil|gravel)$/;

const NONE = Object.freeze({ style: 'floor', collision: PROP_COLLISION.NONE, crushable: false, floor: true });
const ARCH = Object.freeze({ style: 'arch', collision: PROP_COLLISION.PILLARS, crushable: false, floor: false });
const GROWTH = Object.freeze({ style: 'growth', collision: PROP_COLLISION.NONE, crushable: true, floor: false });
const SOLID = Object.freeze({ style: 'prop', collision: PROP_COLLISION.SOLID, crushable: false, floor: false });

export function isFloorPropType(type) {
    const id = String(type ?? '');
    return FLOOR_OVERLAY_TYPES.has(id) || FLOOR_PATTERN.test(id);
}

/** The behavior for a prop type: { style, collision, crushable, floor }. */
export function getPropBehavior(type) {
    const id = String(type ?? '');
    if (WALK_THROUGH_ARCHES.has(id)) return ARCH;
    if (CRUSHABLE_GROWTH.has(id)) return GROWTH;
    if (isFloorPropType(id)) return NONE;
    return SOLID;
}

/**
 * The two side-post colliders of a walk-through arch, in world space, from
 * the model's measured footprint: posts sit at the ends of its longer
 * horizontal axis, so the opening between them is clear.
 */
export function archPillarColliders({ x, z, width, depth, yaw = 0 }) {
    const alongX = width >= depth;
    const span = Math.max(width, depth);
    const post = Math.max(0.22, Math.min(0.45, span * 0.14));
    const offset = Math.max(0, span / 2 - post);
    const ax = alongX ? Math.cos(yaw) : Math.sin(yaw);
    const az = alongX ? -Math.sin(yaw) : Math.cos(yaw);
    return [
        { x: x + ax * offset, z: z + az * offset, radius: post },
        { x: x - ax * offset, z: z - az * offset, radius: post }
    ];
}
