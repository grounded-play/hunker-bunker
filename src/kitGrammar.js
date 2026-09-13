/**
 * Biome-skinned corridor grammar over the modular kits.
 *
 * The cave and space kits share 36 of their 40 piece names -- the whole
 * corridor and room structure is identical and only the skin differs. So a
 * generator can pick a piece by ROLE and let the biome decide which skin
 * renders, instead of the two biomes carrying separate placement logic that
 * drifts apart.
 *
 * The four pieces that differ are all gates: cave has metal bars, an overhang
 * and a rock slab plus a ladder; space has a door, a windowed door, lasers and
 * cable runs. Those are looked up per skin, and a role with no piece in a skin
 * resolves to null rather than silently substituting the wrong one.
 */

export const KIT_SKINS = Object.freeze({ CAVE: 'cave', SPACE: 'space' });

/**
 * Biome -> skin. The game's biomes already carry this meaning: `bio` and the
 * deep cave sectors are rock, everything bunker-side is fabricated.
 */
export const BIOME_SKIN = Object.freeze({
    active: KIT_SKINS.SPACE,
    cryo: KIT_SKINS.SPACE,
    bio: KIT_SKINS.CAVE,
    cave: KIT_SKINS.CAVE
});

export function skinForBiome(biome) {
    return BIOME_SKIN[String(biome ?? '').toLowerCase()] ?? KIT_SKINS.SPACE;
}

/** Structural roles, identical across both skins. */
export const SHARED_ROLES = Object.freeze({
    corridor: 'corridor',
    corridorCorner: 'corridor_corner',
    corridorEnd: 'corridor_end',
    corridorT: 'corridor_junction',
    corridorCross: 'corridor_intersection',
    corridorWide: 'corridor_wide',
    corridorWideCorner: 'corridor_wide_corner',
    corridorTransition: 'corridor_transition',
    roomSmall: 'room_small',
    roomWide: 'room_wide',
    roomLarge: 'room_large',
    roomCorner: 'room_corner',
    stairs: 'stairs',
    stairsWide: 'stairs_wide',
    floor: 'template_floor',
    floorHole: 'template_floor_layer_hole',
    floorRaised: 'template_floor_layer_raised',
    wall: 'template_wall',
    wallHalf: 'template_wall_half',
    wallCorner: 'template_wall_corner'
});

/**
 * Roles that exist in only one skin. A cave has no powered door and a corridor
 * in space has no rock slab across it; substituting would read as an art bug.
 */
export const SKIN_ONLY_ROLES = Object.freeze({
    [KIT_SKINS.CAVE]: Object.freeze({
        gate: 'gate_rock',
        gateBarred: 'gate_metal_bars',
        gateOverhang: 'gate_overhang',
        ladder: 'ladder'
    }),
    [KIT_SKINS.SPACE]: Object.freeze({
        gate: 'gate_door',
        gateWindow: 'gate_door_window',
        gateHazard: 'gate_lasers',
        cables: 'cables'
    })
});

/** Variation suffixes, used to break the modular grid's repeat. */
export const VARIATION_ROLES = Object.freeze(['room_small', 'room_wide', 'room_large']);

/**
 * Resolve a role to a concrete placement type for a biome.
 *
 * Returns null for a role the skin does not have, rather than falling back:
 * a rock slab standing in for a powered door is worse than no door.
 */
export function kitPieceFor(role, biome, { variation = false } = {}) {
    const skin = skinForBiome(biome);
    const shared = SHARED_ROLES[role] ?? (Object.values(SHARED_ROLES).includes(role) ? role : null);
    const specific = SKIN_ONLY_ROLES[skin]?.[role] ?? null;
    const base = shared ?? specific;
    if (!base) return null;
    // Only some pieces ship a -variation twin; asking for one elsewhere would
    // produce a type that does not exist.
    const suffix = variation && VARIATION_ROLES.includes(base) ? '_variation' : '';
    return `kit_${skin}_${base}${suffix}`;
}

/**
 * Deterministic piece choice for a chunk, including rotation and variation.
 *
 * Modular kits repeat at a fixed interval and the eye finds it fast, so the
 * same role in two chunks should not render identically. Rotation and the
 * variation twin are chosen from the seeded random the world generator already
 * threads through, keeping the world reproducible for a given seed.
 */
export function chooseKitPiece(role, biome, random = Math.random) {
    const roll = Math.min(0.999999, Math.max(0, Number(random()) || 0));
    const type = kitPieceFor(role, biome, { variation: roll > 0.62 });
    if (!type) return null;
    return {
        type,
        // Cardinal only: these pieces socket on a grid and an arbitrary angle
        // would break the seams the kit exists to provide.
        rotationSteps: Math.floor(roll * 4) % 4,
        variation: type.endsWith('_variation')
    };
}
