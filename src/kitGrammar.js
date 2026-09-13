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
    if (typeof role !== 'string' || role.length === 0) return null;
    const skin = skinForBiome(biome);
    // Own-property lookups only. A bare `SHARED_ROLES[role]` resolves inherited
    // Object.prototype members, so a role of 'constructor' or 'toString' came
    // back as a placement type built from a function's source text -- garbage
    // that would reach the renderer as a model name. Role names can come from
    // authored data, so this is reachable, not theoretical.
    const shared = Object.hasOwn(SHARED_ROLES, role)
        ? SHARED_ROLES[role]
        : (Object.values(SHARED_ROLES).includes(role) ? role : null);
    const skinRoles = Object.hasOwn(SKIN_ONLY_ROLES, skin) ? SKIN_ONLY_ROLES[skin] : null;
    const specific = skinRoles && Object.hasOwn(skinRoles, role) ? skinRoles[role] : null;
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
    // Clamped, and NaN folds to 0 rather than propagating into a rotation of
    // NaN -- a NaN rotation silently places the piece unrotated AND poisons any
    // transform built from it downstream.
    const raw = Number(random());
    const roll = Number.isFinite(raw) ? Math.min(0.999999, Math.max(0, raw)) : 0;
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

/**
 * Resolve a carved hallway cell to a socket-safe module and orientation.
 * Corridor pieces may vary by skin, but their rotation is topology, not
 * decoration: random cardinal turns still produce walls across the route.
 */
export function corridorKitPlacement(grid, x, y, biome) {
    if (!Array.isArray(grid) || grid[y]?.[x] !== '.') return null;
    const open = {
        n: grid[y - 1]?.[x] === '.',
        e: grid[y]?.[x + 1] === '.',
        s: grid[y + 1]?.[x] === '.',
        w: grid[y]?.[x - 1] === '.'
    };
    const directions = Object.entries(open).filter(([, value]) => value).map(([key]) => key);
    let role = 'corridor';
    let rotationSteps = 0;

    if (directions.length >= 4) {
        role = 'corridorCross';
    } else if (directions.length === 3) {
        role = 'corridorT';
        // Base T opens N/E/W; rotate until the missing socket matches.
        const missing = ['n', 'e', 's', 'w'].find((direction) => !open[direction]);
        rotationSteps = ({ s: 0, w: 1, n: 2, e: 3 })[missing] ?? 0;
    } else if (directions.length === 2 && !((open.n && open.s) || (open.e && open.w))) {
        role = 'corridorCorner';
        // Base corner opens N/E.
        const key = directions.sort().join('');
        rotationSteps = ({ en: 0, es: 1, sw: 2, nw: 3 })[key] ?? 0;
    } else if (directions.length <= 1) {
        role = 'corridorEnd';
        // Base end opens north.
        rotationSteps = ({ n: 0, e: 1, s: 2, w: 3 })[directions[0]] ?? 0;
    } else if (open.e && open.w) {
        rotationSteps = 1;
    }

    const type = kitPieceFor(role, biome);
    return type ? { type, role, rotationSteps } : null;
}
