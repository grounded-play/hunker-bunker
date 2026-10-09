/**
 * Where the lived-in pass 2 stickers go (docs/planning/
 * lived-in-world-pass-2-2026-10-09.md, Parts 3, 5.4 and 6). Pure and
 * deterministic per chunk: the same chunk always gets the same stickers.
 *
 * Coordinates: a chunk cell (x, y) is centred on world (originX + x,
 * originZ + y); cell edges sit on the half metres. Items come out in world
 * units:
 *   floor  { family, x, z, yaw, width, depth }   lying flat; image "up"
 *          points along (-sin yaw, -cos yaw)
 *   wall   { family, x, z, normalX, normalZ, bottom, width, height }
 *          standing on a wall face, facing along the normal
 * `variant` (0-3) and `flip` pick and mirror the version.
 */
import {
    FLOOR_LAYER,
    SURFACE_LAYER_FIRST,
    collectThresholdCells,
    surfaceForLayer
} from './floorSplat.js';

/** Real-world size of each sticker family, in metres; `tint` scales its colour. */
export const STICKER_FAMILIES = Object.freeze({
    decal_edge_wallbase_grime: { surface: 'floor', depth: 0.42 },
    decal_edge_frost_creep: { surface: 'floor', depth: 0.6 },
    decal_edge_resin_creep: { surface: 'floor', depth: 0.55 },
    decal_edge_dust_drift: { surface: 'floor', depth: 0.7 },
    // The fan art is light grey; tracked mud reads darker on the floor.
    decal_blend_mud_fan: { surface: 'floor', depth: 1.1, tint: 0.5 },
    decal_blend_rust_bloom: { surface: 'floor', depth: 1.2 },
    decal_blend_scuff_path: { surface: 'floor', depth: 0.75 },
    decal_blend_cracked_seam: { surface: 'floor', depth: 0.45 },
    decal_blend_spore_dusting: { surface: 'floor', depth: 1.3 },
    decal_contact_grime: { surface: 'floor', depth: 1.0 },
    decal_floor_lane_chevrons: { surface: 'floor', depth: 0.8 },
    decal_butts_and_ash: { surface: 'floor', depth: 0.45 },
    decal_spilled_rations: { surface: 'floor', depth: 0.55 },
    decal_paper_scatter: { surface: 'floor', depth: 0.7 },
    decal_spent_casings: { surface: 'floor', depth: 0.6 },
    decal_wall_soot_plume: { surface: 'wall', height: 1.5 },
    decal_wall_mineral_streaks: { surface: 'wall', height: 1.1 },
    decal_floor_taped_cables: { surface: 'floor', depth: 0.22 },
    decal_wall_home_mural: { surface: 'wall', height: 0.9 },
    decal_alien_tracks: { surface: 'floor', depth: 0.5 },
    tex_wall_kickplate_band: { surface: 'wall', height: 0.9 }
});

const WALLS = new Set(['#', 'W']);
const DIRS = Object.freeze([[1, 0], [-1, 0], [0, 1], [0, -1]]);

/** Which family of surface a splat layer belongs to, for boundary strips. */
export function surfaceCategory(layer) {
    if (layer === FLOOR_LAYER.NONE || layer == null) return null;
    if (layer >= SURFACE_LAYER_FIRST) {
        const id = surfaceForLayer(layer)?.id ?? '';
        if (id.includes('slush_ice')) return 'cryo';
        if (id.includes('chitin')) return 'bio';
        if (id.startsWith('tex_ground_')) return 'ground';
        if (id.includes('deck_drain') || id.includes('grate')) return 'metal';
        return 'floor';
    }
    if (layer === FLOOR_LAYER.CRYO) return 'cryo';
    if (layer === FLOOR_LAYER.BIO || layer === FLOOR_LAYER.HIVE) return 'bio';
    if (layer === FLOOR_LAYER.GROUND || layer === FLOOR_LAYER.BASE) return 'ground';
    if (layer === FLOOR_LAYER.HALLWAY || layer === FLOOR_LAYER.UTILITY) return 'metal';
    return 'floor';
}

function boundarySticker(a, b) {
    if (a === b) return null;
    const pair = new Set([a, b]);
    if (pair.has('cryo')) return { family: 'decal_edge_frost_creep', toward: 'cryo' };
    if (pair.has('bio')) return { family: 'decal_edge_resin_creep', toward: 'bio' };
    if (pair.has('ground')) return { family: 'decal_edge_dust_drift', toward: 'ground' };
    return { family: 'decal_blend_cracked_seam', toward: null };
}

function createRandom(seedText) {
    let seed = 2166136261;
    for (const char of seedText) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
    return () => {
        seed = Math.imul(seed ^ (seed >>> 15), 2246822507);
        seed = Math.imul(seed ^ (seed >>> 13), 3266489909);
        seed ^= seed >>> 16;
        return (seed >>> 0) / 4294967296;
    };
}

/** Yaw whose image "up" points along world (dx, dz). */
const yawToward = (dx, dz) => Math.atan2(-dx, -dz);

const ROOM_DETAIL = Object.freeze({
    // theme -> [family, cells per sticker]
    'bunker-standard': [['decal_paper_scatter', 18], ['decal_spilled_rations', 22], ['decal_butts_and_ash', 26]],
    'bunker-utility': [['decal_blend_rust_bloom', 14], ['decal_floor_taped_cables', 20]],
    'bunker-workshop': [['decal_blend_rust_bloom', 14], ['decal_floor_lane_chevrons', 22], ['decal_floor_taped_cables', 18]],
    'bunker-medical': [['decal_paper_scatter', 24]],
    'bunker-security': [['decal_spent_casings', 14], ['decal_butts_and_ash', 20], ['decal_paper_scatter', 22]],
    'bunker-armory': [['decal_spent_casings', 12], ['decal_floor_lane_chevrons', 22]],
    'bunker-storage': [['decal_blend_rust_bloom', 16], ['decal_floor_lane_chevrons', 24], ['decal_paper_scatter', 26]],
    'reward-cache': [['decal_spent_casings', 18], ['decal_blend_rust_bloom', 18]],
    'cryo-rough': [['decal_blend_scuff_path', 18]],
    'cryo-medical': [['decal_paper_scatter', 26]],
    'cryo-engineering': [['decal_floor_taped_cables', 18], ['decal_floor_lane_chevrons', 24]],
    'cryo-recovery': [['decal_spilled_rations', 24]],
    'bio-resin': [['decal_blend_spore_dusting', 12]],
    'bio-nest': [['decal_blend_spore_dusting', 10], ['decal_alien_tracks', 18]],
    'bio-medical': [['decal_blend_spore_dusting', 14]],
    'bio-security': [['decal_blend_spore_dusting', 14], ['decal_spent_casings', 20]],
    'bio-engineering': [['decal_blend_spore_dusting', 14], ['decal_floor_taped_cables', 20]],
    'bio-feeding-chamber': [['decal_blend_spore_dusting', 10], ['decal_alien_tracks', 16]],
    'camp-fortified': [['decal_butts_and_ash', 12], ['decal_spilled_rations', 14], ['decal_paper_scatter', 20]],
    'giger-cathedral': [['decal_blend_cracked_seam', 16]]
});
const ROOM_WALL_DETAIL = Object.freeze({
    'bunker-standard': ['decal_wall_home_mural', 'decal_wall_mineral_streaks'],
    'bunker-utility': ['decal_wall_soot_plume', 'decal_wall_mineral_streaks'],
    'bunker-workshop': ['decal_wall_soot_plume'],
    'bunker-storage': ['decal_wall_mineral_streaks'],
    'bunker-security': ['decal_wall_soot_plume'],
    'cryo-engineering': ['decal_wall_soot_plume'],
    'camp-fortified': ['decal_wall_home_mural', 'decal_wall_soot_plume'],
    'cryo-recovery': ['decal_wall_home_mural']
});
const KICKPLATE_THEMES = new Set([
    'bunker-standard', 'bunker-utility', 'bunker-workshop', 'bunker-security', 'bunker-armory',
    'bunker-storage', 'bunker-medical', 'reward-cache', 'cryo-engineering', 'cryo-medical'
]);

/**
 * @param {object} chunk
 * @param {string[]} chunk.grid      tile rows
 * @param {number} chunk.size        cells per side
 * @param {Uint8Array} chunk.layer   splat layer per cell (buildFloorSplatData)
 * @param {object} [chunk.metadata]  WFC metadata (roomInstances, doors)
 * @param {string} [chunk.landform]
 * @param {number} chunk.originX     world x of cell 0
 * @param {number} chunk.originZ
 * @param {{x:number,z:number,radius?:number}[]} [chunk.props]  grounded props (world units)
 */
export function planChunkStickers({ grid, size, layer, metadata = null, landform = null, originX = 0, originZ = 0, props = [] }) {
    const random = createRandom(`stickers:${originX},${originZ}`);
    const items = [];
    const variant = () => Math.floor(random() * 4);
    const at = (x, y) => grid[y]?.[x];
    const layerAt = (x, y) => (x < 0 || y < 0 || x >= size || y >= size ? FLOOR_LAYER.NONE : layer[y * size + x]);
    const isFloor = (x, y) => layerAt(x, y) !== FLOOR_LAYER.NONE;
    const floor = (family, x, z, yaw, extra = {}) => {
        items.push({ family, surface: 'floor', x: originX + x, z: originZ + z, yaw, variant: variant(), flip: random() < 0.5, ...extra });
    };
    const wall = (family, x, z, nx, nz, bottom, extra = {}) => {
        items.push({ family, surface: 'wall', x: originX + x, z: originZ + z, normalX: nx, normalZ: nz, bottom, variant: variant(), flip: random() < 0.5, ...extra });
    };
    const roomOf = new Map();
    for (const room of metadata?.roomInstances ?? []) {
        for (const cell of room.interior ?? []) roomOf.set(`${cell.x},${cell.y}`, room);
    }

    // Wall feet: a grime strip along most floor edges that meet a wall, and
    // the kick-plate band on the bunker rooms' wall faces.
    for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
            if (!isFloor(x, y)) continue;
            for (const [dx, dy] of DIRS) {
                if (!WALLS.has(at(x + dx, y + dy))) continue;
                if (random() < 0.62) {
                    const depth = STICKER_FAMILIES.decal_edge_wallbase_grime.depth;
                    floor('decal_edge_wallbase_grime', x + dx * (0.5 - depth / 2), y + dy * (0.5 - depth / 2), yawToward(dx, dy), { length: 1.3 });
                }
                const room = roomOf.get(`${x},${y}`);
                if (room && KICKPLATE_THEMES.has(room.theme) && random() < 0.55) {
                    wall('tex_wall_kickplate_band', x + dx * 0.49, y + dy * 0.49, -dx, -dy, 0, { length: 1.02 });
                }
            }
        }
    }

    // Where one surface family meets another: frost, resin, dust or a cracked
    // seam laid along the shared edge, leaning into the surface it comes from.
    for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
            const here = surfaceCategory(layerAt(x, y));
            if (!here) continue;
            for (const [dx, dy] of [[1, 0], [0, 1]]) {
                const there = surfaceCategory(layerAt(x + dx, y + dy));
                if (!there) continue;
                const sticker = boundarySticker(here, there);
                if (!sticker || random() > 0.8) continue;
                let towardX = dx;
                let towardY = dy;
                if (sticker.toward === here) {
                    towardX = -dx;
                    towardY = -dy;
                } else if (!sticker.toward && random() < 0.5) {
                    towardX = -dx;
                    towardY = -dy;
                }
                floor(sticker.family, x + dx * 0.5, y + dy * 0.5, yawToward(towardX, towardY), { length: 1.25 + random() * 0.35 });
            }
        }
    }

    // Doors: tracked mud fanning out on both sides.
    for (const cell of collectThresholdCells(grid, size, metadata)) {
        if (at(cell.x, cell.y) !== 'D') continue;
        for (const [dx, dy] of DIRS) {
            if (!isFloor(cell.x + dx, cell.y + dy) || WALLS.has(at(cell.x + dx, cell.y + dy))) continue;
            if (!isFloor(cell.x - dx, cell.y - dy)) continue;
            floor('decal_blend_mud_fan', cell.x + dx * 0.95, cell.y + dy * 0.95, yawToward(dx, dy));
        }
    }

    // Rooms: story stickers by theme, and a wall detail or two.
    for (const room of metadata?.roomInstances ?? []) {
        const cells = (room.interior ?? []).filter((cell) => isFloor(cell.x, cell.y));
        if (cells.length === 0) continue;
        for (const [family, cellsPer] of ROOM_DETAIL[room.theme] ?? []) {
            const count = Math.floor(cells.length / cellsPer + random());
            for (let i = 0; i < count; i += 1) {
                const cell = cells[Math.floor(random() * cells.length)];
                floor(family, cell.x + (random() - 0.5) * 0.6, cell.y + (random() - 0.5) * 0.6, random() * Math.PI * 2,
                    family === 'decal_floor_taped_cables' ? { length: 2.4 } : {});
            }
        }
        const wallFamilies = ROOM_WALL_DETAIL[room.theme] ?? ['decal_wall_mineral_streaks'];
        const faces = [];
        for (const cell of cells) {
            for (const [dx, dy] of DIRS) {
                if (WALLS.has(at(cell.x + dx, cell.y + dy))) faces.push({ cell, dx, dy });
            }
        }
        const wallCount = Math.min(faces.length, 1 + Math.floor(random() * 2));
        for (let i = 0; i < wallCount; i += 1) {
            const { cell, dx, dy } = faces[Math.floor(random() * faces.length)];
            const family = wallFamilies[Math.floor(random() * wallFamilies.length)];
            const bottom = family === 'decal_wall_home_mural' ? 1.0 + random() * 0.3
                : family === 'decal_wall_soot_plume' ? 0.9 : 1.2 + random() * 0.4;
            wall(family, cell.x + dx * 0.485, cell.y + dy * 0.485, -dx, -dy, bottom);
        }
    }

    // Corridors and open ground: worn paths, rust, tracks and dead-end clutter.
    for (let y = 1; y < size - 1; y += 1) {
        for (let x = 1; x < size - 1; x += 1) {
            if (!isFloor(x, y) || roomOf.has(`${x},${y}`)) continue;
            const category = surfaceCategory(layerAt(x, y));
            const openSides = DIRS.filter(([dx, dy]) => isFloor(x + dx, y + dy));
            if (category === 'metal') {
                const straight = (isFloor(x - 1, y) && isFloor(x + 1, y)) || (isFloor(x, y - 1) && isFloor(x, y + 1));
                if (straight && random() < 0.07) {
                    const along = isFloor(x - 1, y) && isFloor(x + 1, y) ? [1, 0] : [0, 1];
                    floor('decal_blend_scuff_path', x, y, yawToward(along[1], -along[0]), { length: 2.2 });
                } else if (random() < 0.03) {
                    floor('decal_blend_rust_bloom', x, y, random() * Math.PI * 2);
                }
                if (openSides.length === 1 && random() < 0.6) {
                    floor(random() < 0.5 ? 'decal_spent_casings' : 'decal_butts_and_ash', x, y, random() * Math.PI * 2);
                }
            } else if (category === 'ground' && landform && landform !== 'maze' && random() < 0.012) {
                const [dx, dy] = DIRS[Math.floor(random() * 4)];
                floor('decal_alien_tracks', x, y, yawToward(-dy, dx), { length: 3 });
            }
        }
    }

    // Contact grime under every grounded prop the chunk knows about.
    for (const prop of props) {
        const radius = Math.max(0.5, Math.min(2.2, prop.radius ?? 0.8));
        items.push({
            family: 'decal_contact_grime', surface: 'floor', x: prop.x, z: prop.z,
            yaw: random() * Math.PI * 2, variant: variant(), flip: random() < 0.5, length: radius * 2.3, depth: radius * 1.6
        });
    }
    return items;
}
