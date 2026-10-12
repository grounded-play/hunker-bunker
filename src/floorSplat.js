/**
 * Blended chunk floors (lived-in pass 2, Part 5 of
 * docs/planning/lived-in-world-pass-2-2026-10-09.md).
 *
 * The floor used to be four layers of 1 m tiles: the base floor, the
 * exterior ground ledges, and the room, hallway and door-threshold overlays.
 * Every surface change was a straight cell edge. A chunk now draws its floor
 * with one material that reads a per-cell data texture (49x49 texels):
 *
 *   R  surface layer (FLOOR_LAYER), 255 = no floor (wall, canyon, cliff)
 *   G  distance to the nearest wall, in cells x WALL_DISTANCE_SCALE
 *   B  reserved for path wear
 *   A  wetness (0-255)
 *
 * The shader blends the four cells around each fragment, nudged by noise and
 * resolved by height, so boundaries read as a rough brush stroke, and darkens
 * the floor along wall feet. Surface art comes from one texture array: the
 * eight quadrants of the two floor atlases plus the three biome ground rocks.
 */
import * as THREE from 'three';

export const FLOOR_LAYER = Object.freeze({
    BASE: 0,
    GROUND: 1,
    UTILITY: 2,
    MEDICAL: 3,
    CRYO: 4,
    BIO: 5,
    HALLWAY: 6,
    CAMP: 7,
    HIVE: 8,
    ROOM: 9,
    NONE: 255
});

export const ROOM_MATERIAL_ATLAS_SLOT = Object.freeze({
    utility: Object.freeze({ x: 0, y: 0.5 }),
    medical: Object.freeze({ x: 0.5, y: 0.5 }),
    cryo: Object.freeze({ x: 0, y: 0 }),
    bio: Object.freeze({ x: 0.5, y: 0 })
});
export const SITE_FLOOR_ATLAS_SLOT = Object.freeze({
    hallway: Object.freeze({ x: 0, y: 0.5 }),
    camp: Object.freeze({ x: 0.5, y: 0.5 }),
    hive: Object.freeze({ x: 0, y: 0 }),
    room: Object.freeze({ x: 0.5, y: 0 })
});
export const ROOM_FLOOR_MATERIAL_FAMILY = Object.freeze({
    hallway: 'site:hallway',
    'bunker-standard': 'site:room',
    'bunker-utility': 'utility',
    'bunker-medical': 'medical',
    'bunker-security': 'utility',
    'bunker-storage': 'utility',
    'cryo-rough': 'cryo',
    'cryo-tile': 'cryo',
    'bio-resin': 'bio',
    'bio-hive': 'site:hive',
    camp: 'site:camp',
    storage: 'utility'
});
export const ROOM_FLOOR_WETNESS = Object.freeze({
    hallway: 0.38,
    'bunker-standard': 0.52,
    'bunker-utility': 0.68,
    'bunker-medical': 0.24,
    'bunker-security': 0.42,
    'bunker-storage': 0.46,
    'cryo-rough': 0.34,
    'cryo-tile': 0.28,
    'bio-resin': 0.72,
    'bio-hive': 0.78,
    camp: 0.2,
    storage: 0.44
});
const DEFAULT_ROOM_WETNESS = 0.45;

/**
 * The lived-in pass 2 PBR floors (T1-T10), built by
 * scripts/art/build_floor_surfaces.py. Every version the owner made ships;
 * each room, hallway and chunk picks one. A cell's layer is
 * SURFACE_LAYER_FIRST + its index in the surface arrays. `scale` is metres
 * per repeat; `fallback` is the older surface drawn until the compressed
 * arrays load, or for good on a GPU without BC7.
 */
export const SURFACE_LAYER_FIRST = 16;
export const FLOOR_SURFACES = Object.freeze([
    { id: 'tex_floor_deck_drain', variants: 4, scale: 4, fallback: FLOOR_LAYER.HALLWAY },
    { id: 'tex_floor_concrete_stained', variants: 8, scale: 4, fallback: FLOOR_LAYER.UTILITY },
    { id: 'tex_floor_chitin_resin', variants: 4, scale: 3, fallback: FLOOR_LAYER.HIVE },
    { id: 'tex_ground_regolith', variants: 4, scale: 5, fallback: FLOOR_LAYER.GROUND, groundLike: true },
    { id: 'tex_ground_rutted_dirt', variants: 4, scale: 5, fallback: FLOOR_LAYER.GROUND, groundLike: true },
    { id: 'tex_floor_slush_ice', variants: 4, scale: 4, fallback: FLOOR_LAYER.CRYO },
    { id: 'tex_floor_bone_terrazzo', variants: 4, scale: 4, fallback: FLOOR_LAYER.BASE },
    { id: 'tex_floor_latex_mat', variants: 4, scale: 2.5, fallback: FLOOR_LAYER.MEDICAL },
    { id: 'tex_floor_camp_planks', variants: 4, scale: 4, fallback: FLOOR_LAYER.CAMP },
    { id: 'tex_floor_grate_trench', variants: 4, scale: 3, fallback: FLOOR_LAYER.UTILITY },
    // 2026-10-11 World completion path & shoulder surfaces
    { id: 'tex_path_worn_deck', variants: 4, scale: 2, fallback: FLOOR_LAYER.HALLWAY },
    { id: 'tex_path_polished_concrete', variants: 4, scale: 2, fallback: FLOOR_LAYER.UTILITY },
    { id: 'tex_path_packed_snow', variants: 4, scale: 2, fallback: FLOOR_LAYER.CRYO },
    { id: 'tex_path_slush_track', variants: 4, scale: 2, fallback: FLOOR_LAYER.CRYO },
    { id: 'tex_path_resin_trail', variants: 4, scale: 2, fallback: FLOOR_LAYER.HIVE },
    { id: 'tex_path_trodden_spores', variants: 4, scale: 2, fallback: FLOOR_LAYER.BIO },
    { id: 'tex_path_mud_track', variants: 4, scale: 2, fallback: FLOOR_LAYER.CAMP },
    { id: 'tex_path_gravel_scree', variants: 4, scale: 2, fallback: FLOOR_LAYER.GROUND, groundLike: true },
    { id: 'tex_shoulder_swept_grit', variants: 4, scale: 2, fallback: FLOOR_LAYER.BASE },
    { id: 'tex_shoulder_ice_crust', variants: 4, scale: 2, fallback: FLOOR_LAYER.CRYO },
    { id: 'tex_shoulder_resin_lip', variants: 4, scale: 2, fallback: FLOOR_LAYER.BIO },
    { id: 'tex_overlay_puddles', variants: 4, scale: 3, fallback: FLOOR_LAYER.HALLWAY }
].map((surface, index, all) => Object.freeze({
    ...surface,
    groundLike: Boolean(surface.groundLike),
    first: all.slice(0, index).reduce((sum, entry) => sum + entry.variants, 0)
})));
export const FLOOR_SURFACE_COUNT = FLOOR_SURFACES.reduce((sum, surface) => sum + surface.variants, 0);
const SURFACE_BY_ID = new Map(FLOOR_SURFACES.map((surface) => [surface.id, surface]));
const VARIANT_LETTERS = 'abcdefgh';

const PATH_SURFACES = Object.freeze({
    bunker: Object.freeze(['tex_path_worn_deck', 'tex_path_polished_concrete']),
    cryo: Object.freeze(['tex_path_packed_snow', 'tex_path_slush_track']),
    bio: Object.freeze(['tex_path_resin_trail', 'tex_path_trodden_spores']),
    camp: Object.freeze(['tex_path_mud_track']),
    ground: Object.freeze(['tex_path_gravel_scree'])
});
const SHOULDER_SURFACES = Object.freeze({
    bunker: 'tex_shoulder_swept_grit',
    cryo: 'tex_shoulder_ice_crust',
    bio: 'tex_shoulder_resin_lip',
    camp: 'tex_shoulder_swept_grit',
    ground: 'tex_shoulder_swept_grit'
});

/** Runtime pack names in array order: tex_floor_deck_drain_a, ... */
export function floorSurfaceFileNames() {
    return FLOOR_SURFACES.flatMap((surface) =>
        Array.from({ length: surface.variants }, (_, variant) => `${surface.id}_${VARIANT_LETTERS[variant]}`));
}

/** Room themes mapped to interchangeable palettes so rooms do not repeat identical styles */
export const ROOM_THEME_SURFACES = Object.freeze({
    'bunker-medical': ['tex_floor_latex_mat', 'tex_floor_bone_terrazzo'],
    'bunker-security': ['tex_floor_concrete_stained', 'tex_path_polished_concrete'],
    'bunker-armory': ['tex_floor_concrete_stained', 'tex_path_worn_deck'],
    'bunker-storage': ['tex_floor_concrete_stained', 'tex_path_polished_concrete', 'tex_floor_grate_trench'],
    'reward-cache': ['tex_floor_concrete_stained', 'tex_path_polished_concrete'],
    'bunker-workshop': ['tex_floor_grate_trench', 'tex_path_polished_concrete'],
    'cryo-engineering': ['tex_floor_grate_trench', 'tex_path_slush_track'],
    'bio-engineering': ['tex_floor_grate_trench', 'tex_path_resin_trail'],
    'cryo-rough': ['tex_floor_slush_ice', 'tex_path_packed_snow', 'tex_path_slush_track'],
    'cryo-recovery': ['tex_floor_slush_ice', 'tex_path_slush_track'],
    'bio-nest': ['tex_floor_chitin_resin', 'tex_path_resin_trail', 'tex_path_trodden_spores'],
    'bio-medical': ['tex_floor_chitin_resin', 'tex_path_resin_trail'],
    'bio-feeding-chamber': ['tex_floor_chitin_resin', 'tex_path_resin_trail'],
    'camp-fortified': ['tex_floor_camp_planks', 'tex_path_mud_track'],
    'giger-cathedral': ['tex_floor_bone_terrazzo', 'tex_path_worn_deck']
});

export const ROOM_THEME_SURFACE = Object.freeze(Object.fromEntries(
    Object.entries(ROOM_THEME_SURFACES).map(([k, v]) => [k, v[0]])
));

export function surfaceForTheme(theme, roomKey = '') {
    const palette = ROOM_THEME_SURFACES[theme];
    if (!palette || palette.length === 0) return ROOM_THEME_SURFACE[theme] ?? null;
    return palette[hashKey(`${theme}:${roomKey}:palette`) % palette.length];
}
/** Exterior ground per landform; the rest keep the biome rock. */
export const LANDFORM_GROUND_SURFACE = Object.freeze({
    field: 'tex_ground_regolith',
    crater: 'tex_ground_regolith',
    ruins: 'tex_ground_rutted_dirt'
});
export const HALLWAY_SURFACE = 'tex_floor_deck_drain';

function hashKey(key) {
    let hash = 2166136261;
    for (const char of String(key)) {
        hash ^= char.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

/** The layer for one version of a surface, picked by a stable key. */
export function surfaceLayer(surfaceId, key) {
    const surface = SURFACE_BY_ID.get(surfaceId);
    if (!surface) return null;
    return SURFACE_LAYER_FIRST + surface.first + (hashKey(`${surfaceId}:${key}`) % surface.variants);
}

export function surfaceForLayer(layer) {
    const index = layer - SURFACE_LAYER_FIRST;
    return FLOOR_SURFACES.find((surface) => index >= surface.first && index < surface.first + surface.variants) ?? null;
}

function routeCategoryForLayer(layer) {
    const surface = surfaceForLayer(layer);
    const id = surface?.id ?? '';
    const fallback = surface?.fallback ?? layer;
    if (surface?.groundLike || fallback === FLOOR_LAYER.GROUND) return 'ground';
    if (fallback === FLOOR_LAYER.CRYO || id.includes('snow') || id.includes('slush') || id.includes('ice')) return 'cryo';
    if (fallback === FLOOR_LAYER.BIO || fallback === FLOOR_LAYER.HIVE || id.includes('resin') || id.includes('spore')) return 'bio';
    if (fallback === FLOOR_LAYER.CAMP || id.includes('camp') || id.includes('mud')) return 'camp';
    return 'bunker';
}

/**
 * Selects authored path, shoulder and puddle art from the deterministic traffic
 * field. This keeps the path-wear channel's shader polish while ensuring the
 * corresponding PBR deliveries are actually visible in play rather than only
 * occupying layers in the texture array.
 */
export function routeSurfaceForCell(layer, { wear = 0, wetness = 0, key = '' } = {}) {
    const current = surfaceForLayer(layer);
    if (current && /^(?:tex_path_|tex_shoulder_|tex_overlay_)/.test(current.id)) return layer;
    const category = routeCategoryForLayer(layer);
    if (wear >= 150) {
        const choices = PATH_SURFACES[category];
        const id = choices[hashKey(`${key}:path`) % choices.length];
        return surfaceLayer(id, `${key}:path-variant`) ?? layer;
    }
    if (wear >= 24) {
        return surfaceLayer(SHOULDER_SURFACES[category], `${key}:shoulder-variant`) ?? layer;
    }
    // Wet rooms get sparse pooled cells away from the polished traffic centre.
    if (wetness >= 0.6 && hashKey(`${key}:puddle`) % 11 === 0) {
        return surfaceLayer('tex_overlay_puddles', `${key}:puddle-variant`) ?? layer;
    }
    return layer;
}

const FAMILY_LAYER = Object.freeze({
    utility: FLOOR_LAYER.UTILITY,
    medical: FLOOR_LAYER.MEDICAL,
    cryo: FLOOR_LAYER.CRYO,
    bio: FLOOR_LAYER.BIO,
    'site:hallway': FLOOR_LAYER.HALLWAY,
    'site:camp': FLOOR_LAYER.CAMP,
    'site:hive': FLOOR_LAYER.HIVE,
    'site:room': FLOOR_LAYER.ROOM
});

/**
 * Texture-array layer sources, indexed by `FLOOR_LAYER - 2` for the atlas
 * surfaces; the three ground rocks (active, cryo, bio) follow.
 */
export const FLOOR_ARRAY_SOURCES = Object.freeze([
    { atlas: 'room', slot: ROOM_MATERIAL_ATLAS_SLOT.utility },
    { atlas: 'room', slot: ROOM_MATERIAL_ATLAS_SLOT.medical },
    { atlas: 'room', slot: ROOM_MATERIAL_ATLAS_SLOT.cryo },
    { atlas: 'room', slot: ROOM_MATERIAL_ATLAS_SLOT.bio },
    { atlas: 'site', slot: SITE_FLOOR_ATLAS_SLOT.hallway },
    { atlas: 'site', slot: SITE_FLOOR_ATLAS_SLOT.camp },
    { atlas: 'site', slot: SITE_FLOOR_ATLAS_SLOT.hive },
    { atlas: 'site', slot: SITE_FLOOR_ATLAS_SLOT.room },
    { ground: 'active' },
    { ground: 'cryo' },
    { ground: 'bio' }
]);
export const FLOOR_ARRAY_GROUND_FIRST = 8;
export const FLOOR_ARRAY_LAYER_SIZE = 1024;
export const WALL_DISTANCE_SCALE = 32;

const WALL_TILES = new Set(['#', 'W']);
const NO_FLOOR_TILES = new Set(['#', 'W', 'X', 'C']);
const THRESHOLD_TILES = new Set(['.', 'D', 'R', 'B', 'L']);

export function floorLayerForStyle(style) {
    return FAMILY_LAYER[ROOM_FLOOR_MATERIAL_FAMILY[style]] ?? FLOOR_LAYER.BASE;
}

export function floorWetnessForStyle(style) {
    return ROOM_FLOOR_WETNESS[style] ?? DEFAULT_ROOM_WETNESS;
}

/** The door cells the old threshold overlay painted with the hallway surface. */
export function collectThresholdCells(grid, size, metadata) {
    const cells = new Map();
    const add = (x, y) => {
        if (!Number.isInteger(x) || !Number.isInteger(y)) return;
        if (x < 0 || y < 0 || x >= size || y >= size) return;
        if (!THRESHOLD_TILES.has(grid[y]?.[x])) return;
        cells.set(`${x},${y}`, { x, y });
    };
    for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
            if (grid[y]?.[x] === 'D') add(x, y);
        }
    }
    for (const room of metadata?.roomInstances ?? []) {
        for (const cell of room.navigation?.doorLanes ?? []) add(cell.x, cell.y);
    }
    for (const door of metadata?.doors ?? []) {
        add(door.localX, door.localY);
        for (const cell of door.cells ?? []) add(cell.x, cell.y);
    }
    return [...cells.values()];
}

/**
 * Computes deterministic path wear traffic (0-255) across walkable chunk cells.
 * Connects doors, threshold cells, chunk edge openings, and room objectives/anchors
 * via BFS shortest paths, then blurs by 1 cell to produce a smooth wear trail.
 */
export function computeChunkPathWear({ grid, size, metadata = null }) {
    const count = size * size;
    const isWalkable = (x, y) => {
        if (x < 0 || y < 0 || x >= size || y >= size) return false;
        const tile = grid[y]?.[x];
        return tile !== undefined && !NO_FLOOR_TILES.has(tile);
    };

    const points = [];
    const pointKeys = new Set();
    const addPoint = (x, y) => {
        x = Math.round(x);
        y = Math.round(y);
        const key = `${x},${y}`;
        if (!pointKeys.has(key) && isWalkable(x, y)) {
            pointKeys.add(key);
            points.push({ x, y });
        }
    };

    for (const cell of collectThresholdCells(grid, size, metadata)) {
        addPoint(cell.x, cell.y);
    }
    for (const door of metadata?.doors ?? []) {
        addPoint(door.localX ?? door.x, door.localY ?? door.y);
        for (const c of door.cells ?? []) addPoint(c.x, c.y);
    }
    for (let i = 0; i < size; i += 1) {
        if (isWalkable(i, 0)) addPoint(i, 0);
        if (isWalkable(i, size - 1)) addPoint(i, size - 1);
        if (isWalkable(0, i)) addPoint(0, i);
        if (isWalkable(size - 1, i)) addPoint(size - 1, i);
    }
    for (const room of metadata?.roomInstances ?? []) {
        if (room.approach) addPoint(room.approach.x, room.approach.y);
        for (const a of room.interactionAnchors ?? []) addPoint(a.x, a.y);
        for (const a of room.rewardAnchors ?? []) addPoint(a.x, a.y);
    }

    const traffic = new Float32Array(count);
    if (points.length >= 2) {
        const bfsPath = (start, goal) => {
            if (start.x === goal.x && start.y === goal.y) return [];
            const visited = new Int32Array(count).fill(-1);
            const queue = new Int32Array(count);
            let head = 0;
            let tail = 0;
            const startIndex = start.y * size + start.x;
            const goalIndex = goal.y * size + goal.x;
            visited[startIndex] = startIndex;
            queue[tail++] = startIndex;

            let found = false;
            while (head < tail) {
                const curr = queue[head++];
                if (curr === goalIndex) {
                    found = true;
                    break;
                }
                const cx = curr % size;
                const cy = (curr - cx) / size;
                for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    const nx = cx + dx;
                    const ny = cy + dy;
                    if (!isWalkable(nx, ny)) continue;
                    const nextIndex = ny * size + nx;
                    if (visited[nextIndex] === -1) {
                        visited[nextIndex] = curr;
                        queue[tail++] = nextIndex;
                    }
                }
            }
            if (!found) return [];
            const path = [];
            let curr = goalIndex;
            while (curr !== startIndex) {
                path.push(curr);
                curr = visited[curr];
            }
            path.push(startIndex);
            return path;
        };

        for (let i = 0; i < points.length; i += 1) {
            const nextI = (i + 1) % points.length;
            const path = bfsPath(points[i], points[nextI]);
            for (const cellIndex of path) traffic[cellIndex] += 1;

            if (points.length > 3) {
                const oppI = (i + Math.floor(points.length / 2)) % points.length;
                const oppPath = bfsPath(points[i], points[oppI]);
                for (const cellIndex of oppPath) traffic[cellIndex] += 1;
            }
        }
    }

    let maxVal = 0;
    const blurred = new Float32Array(count);
    for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
            const index = y * size + x;
            if (!isWalkable(x, y)) continue;
            let sum = traffic[index] * 4;
            let weightSum = 4;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = x + dx;
                const ny = y + dy;
                if (isWalkable(nx, ny)) {
                    sum += traffic[ny * size + nx];
                    weightSum += 1;
                }
            }
            const val = sum / weightSum;
            blurred[index] = val;
            if (val > maxVal) maxVal = val;
        }
    }

    const pathWear = new Uint8Array(count);
    if (maxVal > 0) {
        for (let i = 0; i < count; i += 1) {
            pathWear[i] = Math.min(255, Math.round((blurred[i] / maxVal) * 255));
        }
    }
    return pathWear;
}

/**
 * Per-cell floor data for one chunk, in the same precedence the overlays had:
 * base or ground, then hallway (maze) or crash room, then room interiors,
 * then door thresholds on top.
 */
export function buildFloorSplatData({
    grid,
    size,
    metadata = null,
    maze = false,
    crashRoom = false,
    ledgeGround = false,
    landform = null,
    variantKey = '',
    surfaces = true
} = {}) {
    const count = size * size;
    const hallwayLayer = (surfaces && surfaceLayer(HALLWAY_SURFACE, variantKey)) || FLOOR_LAYER.HALLWAY;
    const groundSurface = surfaces ? LANDFORM_GROUND_SURFACE[landform] : null;
    const groundLayer = ledgeGround
        ? ((groundSurface && surfaceLayer(groundSurface, variantKey)) || FLOOR_LAYER.GROUND)
        : FLOOR_LAYER.BASE;
    const layer = new Uint8Array(count).fill(FLOOR_LAYER.NONE);
    const wetness = new Float32Array(count);
    const set = (x, y, value, wet) => {
        const index = y * size + x;
        layer[index] = value;
        wetness[index] = wet;
    };
    const roomCells = new Set();
    for (const room of metadata?.roomInstances ?? []) {
        for (const cell of room.interior ?? []) roomCells.add(`${cell.x},${cell.y}`);
    }
    for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
            const tile = grid[y]?.[x];
            if (tile === undefined || NO_FLOOR_TILES.has(tile)) continue;
            if (tile === 'O') {
                set(x, y, groundLayer, 0);
            } else if (crashRoom && tile === '.') {
                set(x, y, FLOOR_LAYER.ROOM, floorWetnessForStyle('bunker-standard'));
            } else if (maze && tile === '.' && !roomCells.has(`${x},${y}`)) {
                set(x, y, hallwayLayer, floorWetnessForStyle('hallway'));
            } else {
                set(x, y, FLOOR_LAYER.BASE, 0);
            }
        }
    }
    for (const room of metadata?.roomInstances ?? []) {
        const style = room.themeConfig?.floorStyle ?? 'bunker-standard';
        const themeSurface = surfaces ? (ROOM_THEME_SURFACE[room.theme ?? room.themeConfig?.id] ?? surfaceForTheme(room.theme ?? room.themeConfig?.id, room.id ?? variantKey)) : null;
        for (const cell of room.interior ?? []) {
            if (cell.x < 0 || cell.y < 0 || cell.x >= size || cell.y >= size) continue;
            // Distribute interchangeable duplicate variants (_a, _b, _c, _d) across the room in 2x2 clusters
            const cellKey = `${room.id ?? variantKey}:${cell.x >> 1}:${cell.y >> 1}`;
            const value = (themeSurface && surfaceLayer(themeSurface, cellKey)) || floorLayerForStyle(style);
            const wet = value === FLOOR_LAYER.BASE ? 0 : floorWetnessForStyle(style);
            set(cell.x, cell.y, value, wet);
        }
    }
    for (const cell of collectThresholdCells(grid, size, metadata)) {
        set(cell.x, cell.y, hallwayLayer, floorWetnessForStyle('hallway'));
    }

    // Distance to the nearest wall cell (4-neighbour steps).
    const distance = new Float32Array(count).fill(Infinity);
    const queue = new Int32Array(count);
    let head = 0;
    let tail = 0;
    for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
            if (WALL_TILES.has(grid[y]?.[x])) {
                distance[y * size + x] = 0;
                queue[tail++] = y * size + x;
            }
        }
    }
    while (head < tail) {
        const index = queue[head++];
        const x = index % size;
        const y = (index - x) / size;
        const next = distance[index] + 1;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
            const neighbour = ny * size + nx;
            if (distance[neighbour] <= next) continue;
            distance[neighbour] = next;
            queue[tail++] = neighbour;
        }
    }

    const pathWear = computeChunkPathWear({ grid, size, metadata });
    if (surfaces) {
        for (let index = 0; index < count; index += 1) {
            if (layer[index] === FLOOR_LAYER.NONE) continue;
            const x = index % size;
            const y = (index - x) / size;
            layer[index] = routeSurfaceForCell(layer[index], {
                wear: pathWear[index],
                wetness: wetness[index],
                key: `${variantKey}:${x},${y}`
            });
        }
    }
    const data = new Uint8Array(count * 4);
    for (let index = 0; index < count; index += 1) {
        data[index * 4] = layer[index];
        data[index * 4 + 1] = Math.min(255, Math.round(distance[index] * WALL_DISTANCE_SCALE));
        data[index * 4 + 2] = pathWear[index];
        data[index * 4 + 3] = Math.round(Math.min(1, Math.max(0, wetness[index])) * 255);
    }
    return { data, size, layer };
}

export function createFloorSplatTexture(splat) {
    const texture = new THREE.DataTexture(splat.data, splat.size, splat.size, THREE.RGBAFormat, THREE.UnsignedByteType);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
}

/** A 1x1 "no splat" stand-in so every floor material has valid bindings. */
export function createEmptyFloorSplatTexture() {
    return createFloorSplatTexture({ data: new Uint8Array([255, 0, 0, 0]), size: 1 });
}

function createLayerArray(data, size, depth) {
    const texture = new THREE.DataArrayTexture(data, size, size, depth);
    texture.format = THREE.RGBAFormat;
    texture.type = THREE.UnsignedByteType;
    // The ground normal maps are sRGB too: the ledge material loaded them
    // through configureTerrainTexture, and that decode is part of how dark
    // the rock reads. Matching it keeps the ground's look unchanged.
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    return texture;
}

export function createPlaceholderFloorLayerArray(depth = FLOOR_ARRAY_SOURCES.length) {
    const texture = createLayerArray(new Uint8Array(depth * 4).fill(128), 1, depth);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    return texture;
}

/** One neutral layer standing in for the surface arrays until they load. */
export function createPlaceholderSurfaceArray() {
    return createPlaceholderFloorLayerArray(1);
}

/** Mid-grey: neutral for both the macro grime and the edge breakup. */
export function createPlaceholderUtilityTexture() {
    const texture = new THREE.DataTexture(new Uint8Array([128, 128, 128, 128]), 1, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
    texture.needsUpdate = true;
    return texture;
}

async function packImageLayers(layers, { size, documentRef, yieldTask }) {
    const canvas = documentRef.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    const data = new Uint8Array(size * size * 4 * layers.length);
    for (let layer = 0; layer < layers.length; layer += 1) {
        const { image, sx, sy, sw, sh } = layers[layer];
        context.clearRect(0, 0, size, size);
        context.drawImage(image, sx, sy, sw, sh, 0, 0, size, size);
        data.set(context.getImageData(0, 0, size, size).data, layer * size * size * 4);
        await yieldTask();
    }
    return createLayerArray(data, size, layers.length);
}

const imageSize = (image) => ({ width: image.naturalWidth || image.width, height: image.naturalHeight || image.height });
const whole = (image) => {
    const { width, height } = imageSize(image);
    return { image, sx: 0, sy: 0, sw: width, sh: height };
};
const defaultYield = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Packs the floor atlases' quadrants and the ground rocks into one texture
 * array. One layer is drawn per task so boot never takes a long main-thread
 * hit. Rows are stored top-down; the shader flips v to match the flipY
 * orientation the source textures had.
 */
export function buildFloorLayerArray({
    roomAtlas,
    siteAtlas,
    ground,
    size = FLOOR_ARRAY_LAYER_SIZE,
    documentRef = globalThis.document,
    yieldTask = defaultYield
}) {
    const layers = FLOOR_ARRAY_SOURCES.map((source) => {
        if (source.ground) return whole(ground[source.ground]);
        const image = source.atlas === 'room' ? roomAtlas : siteAtlas;
        const { width, height } = imageSize(image);
        // Atlas slots are UV offsets with v up; image rows run down.
        return { image, sx: source.slot.x * width, sy: (0.5 - source.slot.y) * height, sw: width / 2, sh: height / 2 };
    });
    return packImageLayers(layers, { size, documentRef, yieldTask });
}

/** The ground rocks' normal maps (active, cryo, bio) as a second array. */
export function buildGroundNormalArray({
    normals,
    size = FLOOR_ARRAY_LAYER_SIZE,
    documentRef = globalThis.document,
    yieldTask = defaultYield
}) {
    return packImageLayers(['active', 'cryo', 'bio'].map((key) => whole(normals[key])), { size, documentRef, yieldTask });
}

/**
 * Stacks one map of every surface version (each a 2D BC7 KTX2 from
 * scripts/art/build_floor_surfaces.py) into a single compressed array, level
 * by level. KTX2Loader builds arrays only through its Basis transcoder, so
 * the stacking happens here.
 */
export function stackCompressedLayers(textures, colorSpace) {
    const [first] = textures;
    const levels = first.mipmaps.length;
    for (const texture of textures) {
        if (texture.image.width !== first.image.width || texture.mipmaps.length !== levels || texture.format !== first.format) {
            throw new Error('Floor surface textures differ in size, mips or format');
        }
    }
    const mipmaps = Array.from({ length: levels }, (_, level) => {
        const layerBytes = first.mipmaps[level].data.byteLength;
        const data = new Uint8Array(layerBytes * textures.length);
        textures.forEach((texture, layer) => data.set(texture.mipmaps[level].data, layer * layerBytes));
        return { data, width: first.mipmaps[level].width, height: first.mipmaps[level].height };
    });
    const array = new THREE.CompressedArrayTexture(mipmaps, first.image.width, first.image.height, textures.length, first.format);
    array.colorSpace = colorSpace;
    array.wrapS = THREE.RepeatWrapping;
    array.wrapT = THREE.RepeatWrapping;
    array.magFilter = THREE.LinearFilter;
    array.minFilter = THREE.LinearMipmapLinearFilter;
    array.generateMipmaps = false;
    array.needsUpdate = true;
    return array;
}

/**
 * Loads every surface version's albedo (RGB + metalness) and detail (normal,
 * roughness, height) KTX2 and stacks each map into one array. Needs BC7
 * (EXT_texture_compression_bptc); callers skip it without, and the shader
 * keeps drawing each surface's fallback.
 */
export async function loadFloorSurfaceArrays({
    loader,
    resolveUrl = (path) => path,
    yieldTask = defaultYield,
    baseUrl = '/3d/runtime/surfaces/'
}) {
    const albedo = [];
    const detail = [];
    for (const name of floorSurfaceFileNames()) {
        albedo.push(await loader.loadAsync(resolveUrl(`${baseUrl}${name}_albedo.ktx2`)));
        detail.push(await loader.loadAsync(resolveUrl(`${baseUrl}${name}_detail.ktx2`)));
        await yieldTask();
    }
    try {
        return {
            albedo: stackCompressedLayers(albedo, THREE.SRGBColorSpace),
            detail: stackCompressedLayers(detail, THREE.NoColorSpace)
        };
    } finally {
        // Their data now lives in the arrays; nothing was uploaded for these.
        for (const texture of [...albedo, ...detail]) texture.dispose();
    }
}

export const FLOOR_UTILITY_MAPS = Object.freeze({
    macro: ['tex_macro_grime_a', 'tex_macro_grime_b', 'tex_macro_grime_c', 'tex_macro_grime_d'],
    breakup: ['tex_blend_breakup_a', 'tex_blend_breakup_b', 'tex_blend_breakup_c', 'tex_blend_breakup_d']
});

/** Four greyscale maps packed into the four channels of one texture. */
export async function buildFloorUtilityTexture({ images, size = FLOOR_ARRAY_LAYER_SIZE, documentRef = globalThis.document, yieldTask = defaultYield }) {
    const canvas = documentRef.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const data = new Uint8Array(size * size * 4);
    for (let channel = 0; channel < 4; channel += 1) {
        context.clearRect(0, 0, size, size);
        context.drawImage(images[channel], 0, 0, size, size);
        const pixels = context.getImageData(0, 0, size, size).data;
        for (let i = 0; i < size * size; i += 1) data[i * 4 + channel] = pixels[i * 4];
        await yieldTask();
    }
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    return texture;
}

export function isFloorSplatEnabled(storage = globalThis.localStorage) {
    try {
        return storage?.getItem?.('hb_floor_splat') !== '0';
    } catch {
        return true;
    }
}

// Per-surface scale, ground blending and fallback, by layer range.
const SURFACE_INFO_GLSL = FLOOR_SURFACES.map((surface) => {
    const end = SURFACE_LAYER_FIRST + surface.first + surface.variants;
    return `if (layer < ${end}.0 - 0.5) { scale = ${surface.scale.toFixed(2)}; groundLike = ${surface.groundLike ? '1.0' : '0.0'}; return ${surface.fallback}.0; }`;
}).join('\n        ');

/** Declarations added to the floor fragment shader. */
export const FLOOR_SPLAT_FRAGMENT_PARS = /* glsl */ `
    uniform sampler2DArray uSurfaceAlbedo;
    uniform sampler2DArray uSurfaceDetail;
    uniform float uSurfacesReady;
    uniform sampler2D uFloorMacro;
    uniform sampler2D uFloorBreakup;
    uniform float uFloorUtilityReady;
    vec4 hbSurfAlbedoA;
    vec4 hbSurfDetailA;
    vec4 hbSurfAlbedoB;
    vec4 hbSurfDetailB;
    // Returns the fallback layer; writes the surface's scale and ground flag.
    float hbSurfaceInfo(float layer, out float scale, out float groundLike) {
        scale = 4.0;
        groundLike = 0.0;
        ${SURFACE_INFO_GLSL}
        return ${FLOOR_LAYER.BASE}.0;
    }
    // New surfaces draw as their older fallback until the arrays load.
    float hbSplatResolveLayer(float layer) {
        if (layer < ${SURFACE_LAYER_FIRST}.0 - 0.5 || layer > 254.5 || uSurfacesReady > 0.5) return layer;
        float scale;
        float groundLike;
        return hbSurfaceInfo(layer, scale, groundLike);
    }
    uniform sampler2D uSplatData;
    uniform vec3 uSplatInfo;
    uniform sampler2DArray uFloorLayers;
    uniform sampler2DArray uGroundNormals;
    uniform float uFloorLayersReady;
    uniform vec3 uGroundEmissive[3];
    uniform float uFloorTime;
    float hbSplatActive;
    float hbSplatLayerA;
    float hbSplatLayerB;
    float hbSplatMixB;
    float hbSplatWet;
    float hbSplatGrime;
    float hbSplatBaseWeight;
    float hbSplatGroundWeight;
    float hbSplatPathWear;
    float hbSplatHash(vec2 point) {
        return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
    }
    float hbSplatNoise(vec2 point) {
        vec2 cell = floor(point);
        vec2 blend = fract(point);
        blend = blend * blend * (3.0 - 2.0 * blend);
        return mix(
            mix(hbSplatHash(cell), hbSplatHash(cell + vec2(1.0, 0.0)), blend.x),
            mix(hbSplatHash(cell + vec2(0.0, 1.0)), hbSplatHash(cell + vec2(1.0, 1.0)), blend.x),
            blend.y
        );
    }
    // Four utility maps blended by slow noise, so no one map repeats.
    float hbFloorUtility(sampler2D map, vec2 uv, vec2 worldXZ) {
        vec4 weights = vec4(
            hbSplatNoise(worldXZ * 0.021),
            hbSplatNoise(worldXZ * 0.021 + 19.0),
            hbSplatNoise(worldXZ * 0.021 + 41.0),
            hbSplatNoise(worldXZ * 0.021 + 73.0)
        );
        weights *= weights;
        return dot(texture(map, uv), weights) / max(dot(weights, vec4(1.0)), 0.0001);
    }
    vec4 hbSplatTexel(ivec2 cell) {
        int size = int(uSplatInfo.z);
        if (cell.x < 0 || cell.y < 0 || cell.x >= size || cell.y >= size) return vec4(1.0, 0.0, 0.0, 0.0);
        return texelFetch(uSplatData, cell, 0);
    }
    vec3 hbSplatLayerColor(float layer, vec2 worldXZ, vec3 baseColor, float cryoMix, float bioMix) {
        if (layer < 0.5) return baseColor;
        if (layer < 1.5) {
            vec2 groundUv = vec2(worldXZ.x, -worldXZ.y) * 0.65;
            vec3 ground = texture(uFloorLayers, vec3(groundUv, ${FLOOR_ARRAY_GROUND_FIRST}.0)).rgb;
            if (cryoMix > 0.001) ground = mix(ground, texture(uFloorLayers, vec3(groundUv, ${FLOOR_ARRAY_GROUND_FIRST + 1}.0)).rgb, cryoMix);
            if (bioMix > 0.001) ground = mix(ground, texture(uFloorLayers, vec3(groundUv, ${FLOOR_ARRAY_GROUND_FIRST + 2}.0)).rgb, bioMix);
            // The ledge material's lift of its near-black rock art.
            return pow(ground, vec3(0.55)) * 1.35;
        }
        return texture(uFloorLayers, vec3(vec2(worldXZ.x, -worldXZ.y) * 0.25, layer - 2.0)).rgb;
    }
    // Samples a slot's layer (0 = A, 1 = B); new surfaces keep their albedo
    // and detail texels for the roughness, metalness and normal chunks.
    vec3 hbSplatSampleLayer(int slot, float layer, vec2 worldXZ, vec3 baseColor, float cryoMix, float bioMix) {
        if (layer < ${SURFACE_LAYER_FIRST}.0 - 0.5) return hbSplatLayerColor(layer, worldXZ, baseColor, cryoMix, bioMix);
        float scale;
        float groundLike;
        hbSurfaceInfo(layer, scale, groundLike);
        vec3 uvw = vec3(worldXZ / scale, layer - ${SURFACE_LAYER_FIRST}.0);
        vec4 albedo = texture(uSurfaceAlbedo, uvw);
        vec4 detail = texture(uSurfaceDetail, uvw);
        if (slot == 0) {
            hbSurfAlbedoA = albedo;
            hbSurfDetailA = detail;
        } else {
            hbSurfAlbedoB = albedo;
            hbSurfDetailB = detail;
        }
        vec3 color = albedo.rgb;
        // Outdoor ground still turns to ice or resin rock in those biomes.
        float biome = clamp(cryoMix + bioMix, 0.0, 1.0) * groundLike;
        if (biome > 0.001) color = mix(color, hbSplatLayerColor(1.0, worldXZ, baseColor, cryoMix, bioMix), biome);
        return color;
    }
    float hbSplatLayerHeight(float layer, vec3 color, vec4 detail) {
        if (layer > ${SURFACE_LAYER_FIRST}.0 - 0.5) return detail.a;
        return clamp(dot(color, vec3(0.299, 0.587, 0.114)) * 2.5, 0.0, 1.0);
    }
    vec3 hbSurfaceNormal(vec4 detail) {
        vec2 xy = detail.rg * 2.0 - 1.0;
        return vec3(xy, sqrt(max(1.0 - dot(xy, xy), 0.0)));
    }
    float hbSplatLayerRoughness(float layer, float baseRoughness) {
        if (layer < 0.5) return baseRoughness;
        if (layer < 1.5) return 1.0;
        return 0.82;
    }
    float hbSplatLayerMetalness(float layer, float baseMetalness) {
        if (layer < 0.5) return baseMetalness;
        if (layer < 1.5) return 0.0;
        if (abs(layer - ${FLOOR_LAYER.BIO}.0) < 0.5) return 0.02;
        if (abs(layer - ${FLOOR_LAYER.CRYO}.0) < 0.5) return 0.12;
        return 0.26;
    }
`;

/**
 * Runs inside the floor's map chunk once `floorColor`, `cryoMix` and `bioMix`
 * exist, and rewrites `floorColor`. Roughness, metalness and emissive read
 * the hbSplat* globals it leaves behind.
 */
export const FLOOR_SPLAT_FRAGMENT_BLEND = /* glsl */ `
    hbSplatActive = 0.0;
    hbSplatLayerA = 0.0;
    hbSplatLayerB = 0.0;
    hbSplatMixB = 0.0;
    hbSplatWet = 0.0;
    hbSplatGrime = 0.0;
    hbSplatBaseWeight = 1.0;
    hbSplatGroundWeight = 0.0;
    hbSplatPathWear = 0.0;
    hbSurfAlbedoA = vec4(0.5, 0.5, 0.5, 0.0);
    hbSurfAlbedoB = hbSurfAlbedoA;
    hbSurfDetailA = vec4(0.5, 0.5, 0.8, 0.5);
    hbSurfDetailB = hbSurfDetailA;
    if (uSplatInfo.z > 0.5 && uFloorLayersReady > 0.5) {
        vec2 splatWorld = vWorldPos.xz;
        vec2 splatLocal = splatWorld - uSplatInfo.xy;
        // Two octaves of offset make the boundary wander like a brush edge.
        vec2 splatJitter = vec2(hbSplatNoise(splatWorld * 1.9), hbSplatNoise(splatWorld * 1.9 + 37.0)) - 0.5;
        splatJitter += (vec2(hbSplatNoise(splatWorld * 5.3 + 11.0), hbSplatNoise(splatWorld * 5.3 + 71.0)) - 0.5) * 0.45;
        // T12: painted breakup grain pushes the edge around at a finer scale.
        float splatBreakup = uFloorUtilityReady > 0.5 ? hbFloorUtility(uFloorBreakup, splatWorld / 7.0, splatWorld) : 0.5;
        splatJitter += (splatBreakup - 0.5) * 0.5;
        vec2 splatPoint = splatLocal + splatJitter * 0.55;
        vec2 splatCell = floor(splatPoint);
        vec2 splatFrac = splatPoint - splatCell;
        ivec2 splatBase = ivec2(splatCell);
        vec4 splatTexels[4];
        splatTexels[0] = hbSplatTexel(splatBase);
        splatTexels[1] = hbSplatTexel(splatBase + ivec2(1, 0));
        splatTexels[2] = hbSplatTexel(splatBase + ivec2(0, 1));
        splatTexels[3] = hbSplatTexel(splatBase + ivec2(1, 1));
        float splatRaw[4];
        splatRaw[0] = (1.0 - splatFrac.x) * (1.0 - splatFrac.y);
        splatRaw[1] = splatFrac.x * (1.0 - splatFrac.y);
        splatRaw[2] = (1.0 - splatFrac.x) * splatFrac.y;
        splatRaw[3] = splatFrac.x * splatFrac.y;
        float splatLayers[4];
        float splatWeights[4];
        float splatTotal = 0.0;
        float splatWallDistance = 0.0;
        float splatWetness = 0.0;
        float splatPathWear = 0.0;
        for (int i = 0; i < 4; i++) {
            splatLayers[i] = hbSplatResolveLayer(floor(splatTexels[i].r * 255.0 + 0.5));
            splatWeights[i] = splatLayers[i] > 254.5 ? 0.0 : splatRaw[i];
            splatTotal += splatWeights[i];
            // Wall cells count as distance 0 here, so the floor darkens
            // toward each wall face.
            splatWallDistance += splatRaw[i] * splatTexels[i].g * 255.0 / ${WALL_DISTANCE_SCALE}.0;
            splatWetness += splatWeights[i] * splatTexels[i].a;
            splatPathWear += splatWeights[i] * splatTexels[i].b;
        }
        if (splatTotal > 0.0001) {
            float layerA = -1.0;
            float weightA = 0.0;
            float layerB = -1.0;
            float weightB = 0.0;
            for (int i = 0; i < 4; i++) {
                if (splatWeights[i] <= 0.0) continue;
                float candidate = splatLayers[i];
                if (candidate == layerA || candidate == layerB) continue;
                float sum = 0.0;
                for (int j = 0; j < 4; j++) {
                    if (splatLayers[j] == candidate) sum += splatWeights[j];
                }
                if (sum > weightA) {
                    layerB = layerA;
                    weightB = weightA;
                    layerA = candidate;
                    weightA = sum;
                } else if (sum > weightB) {
                    layerB = candidate;
                    weightB = sum;
                }
            }
            vec3 colorA = hbSplatSampleLayer(0, layerA, splatWorld, floorColor, cryoMix, bioMix);
            vec3 splatColor = colorA;
            float mixB = 0.0;
            if (layerB >= 0.0 && weightB > 0.0) {
                vec3 colorB = hbSplatSampleLayer(1, layerB, splatWorld, floorColor, cryoMix, bioMix);
                // Height blend: whichever surface stands higher wins first,
                // so grit fills the cracks before it covers the plates.
                float shareB = weightB / (weightA + weightB);
                float heightA = hbSplatLayerHeight(layerA, colorA, hbSurfDetailA) + (1.0 - shareB);
                float heightB = hbSplatLayerHeight(layerB, colorB, hbSurfDetailB) + shareB + (splatBreakup - 0.5) * 0.4;
                float ridge = max(heightA, heightB) - 0.22;
                float keepA = max(heightA - ridge, 0.0);
                float keepB = max(heightB - ridge, 0.0);
                mixB = keepB / max(keepA + keepB, 0.0001);
                splatColor = mix(colorA, colorB, mixB);
            } else {
                layerB = layerA;
            }
            hbSplatActive = 1.0;
            hbSplatLayerA = layerA;
            hbSplatLayerB = layerB;
            hbSplatMixB = mixB;
            hbSplatBaseWeight = (layerA < 0.5 ? 1.0 - mixB : 0.0) + (layerB < 0.5 ? mixB : 0.0);
            hbSplatGroundWeight = (abs(layerA - 1.0) < 0.5 ? 1.0 - mixB : 0.0) + (abs(layerB - 1.0) < 0.5 ? mixB : 0.0);
            float atlasWeight = max(0.0, 1.0 - hbSplatBaseWeight - hbSplatGroundWeight);

            hbSplatPathWear = splatPathWear / splatTotal;

            // The authored rooms' wet patches.
            float wetBroad = hbSplatNoise(splatWorld * 0.32);
            float wetBreakup = hbSplatNoise(splatWorld * 0.91 + vec2(17.0, 31.0));
            float wetMask = smoothstep(0.57, 0.78, wetBroad * 0.78 + wetBreakup * 0.22);
            hbSplatWet = wetMask * (splatWetness / splatTotal) * atlasWeight;
            splatColor *= mix(1.0, 0.78, hbSplatWet);

            // Grime packed against the foot of every wall.
            float grime = 1.0 - smoothstep(0.5, 1.05, splatWallDistance);
            grime *= 0.55 + 0.45 * hbSplatNoise(splatWorld * 3.1 + 5.0);
            hbSplatGrime = grime;
            splatColor *= 1.0 - 0.38 * grime;

            // Path wear: heavy foot traffic polishes metal decks, compresses snow, glazes resin.
            // Shoulder edge (0.04 to 0.22) collects kicked grit/dirt, while center (>0.22) is polished.
            float wearCenter = smoothstep(0.22, 0.75, hbSplatPathWear);
            float wearShoulder = smoothstep(0.04, 0.16, hbSplatPathWear) * (1.0 - smoothstep(0.16, 0.45, hbSplatPathWear));
            splatColor *= (1.0 - wearShoulder * 0.12);
            splatColor = mix(splatColor, splatColor * 1.08 + vec3(0.012), wearCenter * 0.4);

            // T11: grime that varies over tens of metres breaks up tiling.
            if (uFloorUtilityReady > 0.5) {
                float macro = hbFloorUtility(uFloorMacro, splatWorld / 32.0, splatWorld + 57.0);
                splatColor *= mix(0.8, 1.06, macro);
            }
            floorColor = splatColor;
        }
    }
`;

export const FLOOR_SPLAT_FRAGMENT_ROUGHNESS = /* glsl */ `
    if (hbSplatActive > 0.5) {
        float splatRoughness = mix(
            hbSplatLayerA > ${SURFACE_LAYER_FIRST}.0 - 0.5 ? hbSurfDetailA.b : hbSplatLayerRoughness(hbSplatLayerA, roughnessFactor),
            hbSplatLayerB > ${SURFACE_LAYER_FIRST}.0 - 0.5 ? hbSurfDetailB.b : hbSplatLayerRoughness(hbSplatLayerB, roughnessFactor),
            hbSplatMixB
        );
        splatRoughness = mix(splatRoughness, 0.1, hbSplatWet);
        splatRoughness = mix(splatRoughness, 0.95, hbSplatGrime * 0.6);
        float wearCenter = smoothstep(0.22, 0.75, hbSplatPathWear);
        float wearShoulder = smoothstep(0.04, 0.16, hbSplatPathWear) * (1.0 - smoothstep(0.16, 0.45, hbSplatPathWear));
        splatRoughness = mix(splatRoughness, splatRoughness * 0.65, wearCenter * 0.7);
        splatRoughness = mix(splatRoughness, 0.92, wearShoulder * 0.4);
        roughnessFactor = clamp(splatRoughness, 0.04, 1.0);
    }
`;

export const FLOOR_SPLAT_FRAGMENT_METALNESS = /* glsl */ `
    if (hbSplatActive > 0.5) {
        metalnessFactor = mix(
            hbSplatLayerA > ${SURFACE_LAYER_FIRST}.0 - 0.5 ? hbSurfAlbedoA.a : hbSplatLayerMetalness(hbSplatLayerA, metalnessFactor),
            hbSplatLayerB > ${SURFACE_LAYER_FIRST}.0 - 0.5 ? hbSurfAlbedoB.a : hbSplatLayerMetalness(hbSplatLayerB, metalnessFactor),
            hbSplatMixB
        );
        float wearCenter = smoothstep(0.22, 0.75, hbSplatPathWear);
        metalnessFactor = mix(metalnessFactor, min(1.0, metalnessFactor * 1.25 + 0.1), wearCenter * hbSplatBaseWeight * 0.5);
    }
`;

/** The ledge material's emissive tint and slow pulse, on ground cells only. */
export const FLOOR_SPLAT_FRAGMENT_EMISSIVE = /* glsl */ `
    if (hbSplatGroundWeight > 0.0) {
        vec3 groundEmissive = mix(mix(uGroundEmissive[0], uGroundEmissive[1], cryoMix), uGroundEmissive[2], bioMix);
        float groundPulse = 0.5 + 0.5 * sin(uFloorTime * 1.4 + vWorldPos.x * 0.37 + vWorldPos.z * 0.29 - vWorldPos.y * 0.16);
        totalEmissiveRadiance += (groundEmissive * 0.65 + diffuseColor.rgb * groundPulse * 0.075) * hbSplatGroundWeight;
    }
`;

/**
 * The ledge material's normal map on ground cells: same maps, scale and
 * tangent frame (u along +x, v along -z), blended by biome. Room and atlas
 * surfaces also drop the base plates' luminance relief, which they never had.
 */
export const FLOOR_SPLAT_FRAGMENT_NORMAL = /* glsl */ `
    hbFloorNormalPerturb *= hbSplatBaseWeight;
    normal = normalize(normal + hbFloorNormalPerturb);
    // New surfaces: tangent u along +x, v along +z, so the tangent-space
    // normal (x, y, z) is (x, z, y) in the world.
    float surfaceA = hbSplatLayerA > ${SURFACE_LAYER_FIRST}.0 - 0.5 ? 1.0 - hbSplatMixB : 0.0;
    float surfaceB = hbSplatLayerB > ${SURFACE_LAYER_FIRST}.0 - 0.5 ? hbSplatMixB : 0.0;
    if (surfaceA + surfaceB > 0.0) {
        vec3 surfaceTangentNormal = normalize(
            hbSurfaceNormal(hbSurfDetailA) * surfaceA
            + hbSurfaceNormal(hbSurfDetailB) * surfaceB
            + vec3(0.0, 0.0, 1.0) * max(0.0, 1.0 - surfaceA - surfaceB)
        );
        vec3 surfaceWorldNormal = vec3(surfaceTangentNormal.x, surfaceTangentNormal.z, surfaceTangentNormal.y);
        normal = normalize(mix(normal, normalize((viewMatrix * vec4(surfaceWorldNormal, 0.0)).xyz), min(1.0, surfaceA + surfaceB)));
    }
    if (hbSplatGroundWeight > 0.0) {
        vec2 groundNormalUv = vWorldPos.xz * 1.5;
        vec3 groundNormal = texture(uGroundNormals, vec3(groundNormalUv, 0.0)).xyz;
        if (cryoMix > 0.001) groundNormal = mix(groundNormal, texture(uGroundNormals, vec3(groundNormalUv, 1.0)).xyz, cryoMix);
        if (bioMix > 0.001) groundNormal = mix(groundNormal, texture(uGroundNormals, vec3(groundNormalUv, 2.0)).xyz, bioMix);
        groundNormal = groundNormal * 2.0 - 1.0;
        groundNormal.xy *= 0.72;
        mat3 groundTangentFrame = mat3(
            normalize((viewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz),
            normalize((viewMatrix * vec4(0.0, 0.0, -1.0, 0.0)).xyz),
            normal
        );
        normal = normalize(mix(normal, normalize(groundTangentFrame * groundNormal), hbSplatGroundWeight));
    }
`;

/**
 * softenDirectSpecularHighlights is a base-plate look. Room surfaces and the
 * ground never had it, so scale its two edits by the base plates' share.
 */
export function scopeSpecularSofteningToBaseFloor(fragmentShader) {
    return fragmentShader
        .replace(/material\.roughness = max\(material\.roughness, ([0-9.]+)\);/,
            'material.roughness = mix(material.roughness, max(material.roughness, $1), hbSplatBaseWeight);')
        .replace('reflectedLight.directSpecular *= 0.35;',
            'reflectedLight.directSpecular *= mix(1.0, 0.35, hbSplatBaseWeight);');
}
