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

import { KIT_SCALE } from './kitMaterials.js';
import { PROCEDURAL_DOOR_SLAB_THICKNESS } from './proceduralDoors.js';

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
    corridorWideEnd: 'corridor_wide_end',
    corridorWideT: 'corridor_wide_junction',
    corridorWideCross: 'corridor_wide_intersection',
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

// Which sides each base module leaves open at rotation 0, measured from the
// kit GLBs' wall faces (2026-10-01; the wide pieces match the narrow ones).
// The old hand-written table assumed north/south straights and the opposite
// turn direction, so straights, corners and dead ends all faced wrong.
const BASE_OPENINGS = Object.freeze({
    corridor: ['e', 'w'],
    corridorCorner: ['n', 'w'],
    corridorEnd: ['e'],
    corridorT: ['e', 'n', 'w'],
    corridorCross: ['e', 'n', 's', 'w']
});
// rotationSteps are three.js yaw steps of +PI/2: east -> north -> west -> south.
const TURN = Object.freeze({ e: 'n', n: 'w', w: 's', s: 'e' });
const WIDE_ROLES = Object.freeze({
    corridor: 'corridorWide',
    corridorCorner: 'corridorWideCorner',
    corridorEnd: 'corridorWideEnd',
    corridorT: 'corridorWideT',
    corridorCross: 'corridorWideCross'
});
// Module widths in world units: 4 and 8 Kenney units at the kit's uniform scale.
const MODULE_WIDTH = Object.freeze({ narrow: 4 * KIT_SCALE, wide: 8 * KIT_SCALE });

function stepsToOpen(role, open) {
    const want = [...open].sort().join('');
    let dirs = BASE_OPENINGS[role];
    for (let steps = 0; steps < 4; steps += 1) {
        if ([...dirs].sort().join('') === want) return steps;
        dirs = dirs.map((d) => TURN[d]);
    }
    return 0;
}

/**
 * Resolve a carved hallway cell to a socket-safe module and orientation.
 * Corridor pieces may vary by skin, but their rotation is topology, not
 * decoration: random cardinal turns still produce walls across the route.
 *
 * `width` is the carve radius the hallway generator used (2*width+1 cells
 * across). Topology is read just past the carve, since every cell beside a
 * marker inside a wide corridor is open; corridors five or more cells across
 * take the wide modules, and `modelScale` fits the module to the carve.
 */
export function corridorKitPlacement(grid, x, y, biome, { width = 0 } = {}) {
    if (!Array.isArray(grid) || grid[y]?.[x] !== '.') return null;
    const reach = Math.max(0, Math.floor(Number(width) || 0)) + 1;
    const open = ['n', 'e', 's', 'w'].filter((direction) => {
        const [dx, dy] = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] }[direction];
        return grid[y + dy * reach]?.[x + dx * reach] === '.';
    });
    let role;
    if (open.length >= 4) role = 'corridorCross';
    else if (open.length === 3) role = 'corridorT';
    else if (open.length === 2) role = (open.includes('n') && open.includes('s')) || (open.includes('e') && open.includes('w')) ? 'corridor' : 'corridorCorner';
    else role = 'corridorEnd';
    // A lone cell opens nowhere; treat it as a dead end facing east.
    const rotationSteps = open.length ? stepsToOpen(role, open) : 0;

    const wide = reach - 1 >= 2;
    const carved = 2 * (reach - 1) + 1;
    const modelScale = reach > 1 ? carved / (wide ? MODULE_WIDTH.wide : MODULE_WIDTH.narrow) : 1;
    const placedRole = wide ? WIDE_ROLES[role] : role;
    const type = kitPieceFor(placedRole, biome);
    return type ? { type, role: placedRole, rotationSteps, modelScale } : null;
}

/** Both skins' gate.glb are 1.4 units deep before KIT_SCALE (front/back +-0.7). */
export const GATE_MODEL_HALF_DEPTH = 0.7;

/**
 * How far into the room the gateway frame stands from the threshold line.
 * The closed procedural blast door is a slab centred on that line which sinks
 * into the floor to open; a frame centred there, or inset only half a cell,
 * encloses the slab and its posts cut through it (gateway-orientation probe,
 * 2026-10-04). Clear the slab's room-side face by a few centimetres instead.
 */
export const GATEWAY_ROOM_INSET = GATE_MODEL_HALF_DEPTH * KIT_SCALE
    + PROCEDURAL_DOOR_SLAB_THICKNESS / 2
    + 0.035;

/**
 * Turn an authored three-cell room threshold into an open modular gateway.
 *
 * The base `gate.glb` in each skin is a frame, unlike the skin-only door,
 * rock and laser variants which communicate a closed or hazardous route.
 * One frame per room makes the kit visible in ordinary authored-room runs
 * without changing the tile collision or procedural-door state.
 */
export function roomGatewayKitPlacement(door, biome) {
    const cells = Array.isArray(door?.cells) ? door.cells : [];
    if (cells.length === 0 || !['n', 'e', 's', 'w'].includes(door?.side)) return null;
    const valid = cells.filter((cell) => Number.isFinite(cell?.x) && Number.isFinite(cell?.y));
    if (valid.length === 0) return null;
    const skin = skinForBiome(biome);
    const transform = {
        n: { x: 0, y: GATEWAY_ROOM_INSET, rotationSteps: 0 },
        e: { x: -GATEWAY_ROOM_INSET, y: 0, rotationSteps: 1 },
        s: { x: 0, y: -GATEWAY_ROOM_INSET, rotationSteps: 2 },
        w: { x: GATEWAY_ROOM_INSET, y: 0, rotationSteps: 3 }
    }[door.side];
    return {
        type: `kit_${skin}_gate`,
        x: valid.reduce((sum, cell) => sum + cell.x, 0) / valid.length + transform.x,
        y: valid.reduce((sum, cell) => sum + cell.y, 0) / valid.length + transform.y,
        rotationSteps: transform.rotationSteps,
        modelScale: 1
    };
}
