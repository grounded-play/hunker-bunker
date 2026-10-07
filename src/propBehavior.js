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
export const PROP_FACING = Object.freeze({
    WALL: 'wall',
    CORNER: 'corner',
    CENTER: 'center',
    FREE: 'free'
});

// Corner props: models intended to anchor inside concave wall corners
export const CORNER_PROP_TYPES = new Set([
    'arch_niche_shrine',
    'arch_pillar_buttress_01',
    'arch_pillar_buttress_02',
    'arch_pillar_buttress_03',
    'arch_pillar_buttress_04',
    'prop_biomech_sphincter_trap',
    'prop_conduit_hub'
]);

// Center / free-standing landmark props: placed toward room center or focal points
export const CENTER_PROP_TYPES = new Set([
    'prop_camp_cookfire',
    'prop_camp_cookfire_lit',
    'prop_fabricator_workstation',
    'prop_specimen_tank',
    'prop_broken_specimen_tank',
    'prop_cave_queen_throne',
    'base_console',
    'o2_generator',
    'fusion_generator'
]);

const CRUSHABLE_GROWTH = new Set([
    'prop_cave_spores',
    'prop_spore_colony',
    'prop_cave_lichen',
    'scatter_bio_moss'
]);

const FLOOR_PATTERN = /^(decal_|prop_floor_)|puddle|_grate_|^scatter_(bolts|cable_coil|gravel)$/;

const NONE = Object.freeze({ style: 'floor', collision: PROP_COLLISION.NONE, crushable: false, floor: true, facing: PROP_FACING.FREE });
const ARCH = Object.freeze({ style: 'arch', collision: PROP_COLLISION.PILLARS, crushable: false, floor: false, facing: PROP_FACING.FREE });
const GROWTH = Object.freeze({ style: 'growth', collision: PROP_COLLISION.NONE, crushable: true, floor: false, facing: PROP_FACING.FREE });
const CORNER = Object.freeze({ style: 'corner', collision: PROP_COLLISION.SOLID, crushable: false, floor: false, facing: PROP_FACING.CORNER });
const CENTER = Object.freeze({ style: 'center', collision: PROP_COLLISION.SOLID, crushable: false, floor: false, facing: PROP_FACING.CENTER });
const SOLID = Object.freeze({ style: 'prop', collision: PROP_COLLISION.SOLID, crushable: false, floor: false, facing: PROP_FACING.WALL });

export function isFloorPropType(type) {
    const id = String(type ?? '');
    return FLOOR_OVERLAY_TYPES.has(id) || FLOOR_PATTERN.test(id);
}

/** The behavior for a prop type: { style, collision, crushable, floor, facing }. */
export function getPropBehavior(type) {
    const id = String(type ?? '');
    if (WALK_THROUGH_ARCHES.has(id)) return ARCH;
    if (CRUSHABLE_GROWTH.has(id)) return GROWTH;
    if (isFloorPropType(id)) return NONE;
    if (CORNER_PROP_TYPES.has(id)) return CORNER;
    if (CENTER_PROP_TYPES.has(id)) return CENTER;
    return SOLID;
}

/** Checks whether a model type is a bed, cot or bench (V2 rule: long side against wall). */
export function isBedOrBench(type) {
    const id = String(type ?? '');
    return /bed|bench|cot|gurney/.test(id);
}

/**
 * Computes facing yaw for a placed prop following V2 rules:
 * - Against a wall: away from wall into the room.
 *   Beds, benches: long side against the wall (parallel to wall).
 * - In a corner: along corner diagonal into room.
 * - Free-standing: toward room centre or nearest door, with ±15° jitter.
 * - Free facing props: omnidirectional random yaw.
 */
export function computePropFacingYaw({
    type,
    x = 0,
    y = 0,
    wallNormal = null,
    walls = null,
    corner = false,
    roomCenter = null,
    nearestDoor = null,
    random = Math.random
} = {}) {
    const behavior = getPropBehavior(type);
    if (behavior.facing === PROP_FACING.FREE) {
        return random() * Math.PI * 2;
    }

    // 1. In a corner: along corner diagonal into room
    if (corner && walls && walls.length >= 2) {
        const towardX = walls.reduce((sum, [dx]) => sum + dx, 0);
        const towardY = walls.reduce((sum, [, dy]) => sum + dy, 0);
        return Math.atan2(-Math.sign(towardX), -Math.sign(towardY));
    }

    // 2. Against a wall
    let wn = wallNormal;
    if (!wn && walls && walls.length > 0) {
        const [wx, wy] = walls[0];
        wn = { x: -wx, z: -wy };
    }

    if (wn && (wn.x !== 0 || (wn.z ?? wn.y ?? 0) !== 0)) {
        const normZ = wn.z ?? wn.y ?? 0;
        const baseYaw = Math.atan2(wn.x, normZ);
        if (isBedOrBench(type)) {
            // Long side to the wall: turned 90° relative to wall normal
            const side = (random() < 0.5 ? 1 : -1) * (Math.PI / 2);
            return baseYaw + side;
        }
        // Faces away from wall into room with subtle natural jitter (clamped to ±8.5°)
        const jitter = (random() - 0.5) * 0.3;
        return baseYaw + jitter;
    }

    // 3. Free-standing: toward room center or nearest door, with ±15° jitter
    const target = nearestDoor ?? roomCenter;
    let targetYaw;
    if (target) {
        const tx = target.x ?? 0;
        const tz = target.z ?? target.y ?? 0;
        const dx = tx - x;
        const dz = tz - y;
        if (Math.hypot(dx, dz) > 0.01) {
            targetYaw = Math.atan2(dx, dz);
        } else {
            targetYaw = random() * Math.PI * 2;
        }
    } else {
        targetYaw = random() * Math.PI * 2;
    }

    const jitter15Deg = (random() - 0.5) * (30 * Math.PI / 180);
    return targetYaw + jitter15Deg;
}

/**
 * Checks if a prop yaw faces within `maxAngleDeg` of the wall behind/beside it.
 * `wallNormal` must point INTO the room (away from the wall).
 * Returns true if the prop is facing into the wall within maxAngleDeg (which violates the rule).
 */
export function isPropFacingWall(yaw, wallNormal, maxAngleDeg = 60) {
    if (!wallNormal) return false;
    const wallDirX = -wallNormal.x;
    const wallDirZ = -(wallNormal.z ?? wallNormal.y ?? 0);
    const wallLen = Math.hypot(wallDirX, wallDirZ);
    if (wallLen < 0.001) return false;
    const normWallX = wallDirX / wallLen;
    const normWallZ = wallDirZ / wallLen;

    // Prop facing vector in Three.js (rotation about Y)
    const facingX = Math.sin(yaw);
    const facingZ = Math.cos(yaw);

    const dot = facingX * normWallX + facingZ * normWallZ;
    const clampedDot = Math.max(-1, Math.min(1, dot));
    const angleDeg = Math.acos(clampedDot) * (180 / Math.PI);

    return angleDeg <= maxAngleDeg;
}

// Minimum spacing for duplicate models in rooms and hallways (V1)
export const PROP_SPACING_MIN_TILES = 6;

// Models that are explicitly allowed to cluster (crate stacks, sandbags, bed rows, rubble, eggs, spores)
export const CLUSTER_ALLOWED_PROP_TYPES = new Set([
    'prop_ammo_crate_stack',
    'prop_camp_crates',
    'prop_camp_sandbags',
    'prop_bunker_cot',
    'prop_camp_cot',
    'prop_camp_bedrolls',
    'prop_medical_bed',
    'scatter_bolts',
    'scatter_cable_coil',
    'scatter_coolant_puddle',
    'scatter_slime_puddle',
    'scatter_bio_moss',
    'scatter_hive_eggs',
    'prop_cave_eggs_intact',
    'prop_cave_eggs_hatched',
    'prop_cave_spores',
    'prop_spore_colony',
    'prop_cave_lichen'
]);

export function isClusterAllowed(type) {
    const id = String(type ?? '');
    return CLUSTER_ALLOWED_PROP_TYPES.has(id) || isFloorPropType(id) || /crate|bed|cot|sandbag|egg|spore|moss|bolts|cable/.test(id);
}

/**
 * Checks if candidateType is spaced at least minTiles from any already placed instance
 * of the same model in placedItems.
 */
export function isModelSpaced(candidateType, x, y, placedItems = [], minTiles = PROP_SPACING_MIN_TILES) {
    if (isClusterAllowed(candidateType)) return true;
    for (const item of placedItems) {
        if (!item || item.type !== candidateType) continue;
        const dist = Math.hypot(item.x - x, (item.y ?? item.z ?? 0) - y);
        if (dist < minTiles) return false;
    }
    return true;
}

/**
 * Selects an eligible model type from candidate list, enforcing:
 * 1. Spacing: candidate does not sit within minTiles of itself in placedItems.
 * 2. Rotating weights: lowers weight for candidates recently placed in this chunk.
 */
export function chooseSpacedModel(candidates, {
    x = 0,
    y = 0,
    placedItems = [],
    chunkPlacedCounts = null,
    minTiles = PROP_SPACING_MIN_TILES,
    baseWeights = null,
    random = Math.random
} = {}) {
    if (!candidates || candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    // Filter to candidates that satisfy the spacing rule
    let pool = candidates.filter((type) => isModelSpaced(type, x, y, placedItems, minTiles));
    if (pool.length === 0) {
        // Fallback: pick the candidate whose closest duplicate is furthest away
        pool = [...candidates].sort((a, b) => {
            const distA = Math.min(...placedItems.filter((i) => i.type === a).map((i) => Math.hypot(i.x - x, (i.y ?? i.z ?? 0) - y)), Infinity);
            const distB = Math.min(...placedItems.filter((i) => i.type === b).map((i) => Math.hypot(i.x - x, (i.y ?? i.z ?? 0) - y)), Infinity);
            return distB - distA;
        });
    }

    // Weight rotation: recently placed models in chunk get lower weight
    const weights = pool.map((type) => {
        let w = baseWeights ? (baseWeights[type] ?? 1) : 1;
        const recentCount = chunkPlacedCounts?.get?.(type) ?? 0;
        return w / (1 + recentCount * 2);
    });

    let totalWeight = weights.reduce((sum, w) => sum + w, 0);
    if (totalWeight <= 0) return pool[0];

    let roll = random() * totalWeight;
    for (let i = 0; i < pool.length; i += 1) {
        roll -= weights[i];
        if (roll <= 0) return pool[i];
    }
    return pool[pool.length - 1];
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
