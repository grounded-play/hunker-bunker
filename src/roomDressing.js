/**
 * Lived-in room dressing: the dense layer that makes an authored room look
 * used, on top of the population plan's hero props (roomPopulation.js).
 *
 * Walls carry decals at eye height and wall-mounted fixtures; the ring of
 * floor cells along the walls fills with small clutter; concave corners take
 * heavier pieces; the floor gets a few clusters of story decals. Everything
 * comes from the room's kit (roomDressingKits.js). Physical props have gameplay
 * hit targets; blocking vignettes retain collision. Visuals stay instanced.
 *
 * Deterministic from the room id through a private generator, so it never
 * draws from the shared world RNG and every co-op peer dresses a room the
 * same way. Door lanes, their aprons and reserved fixtures stay clear (the
 * caller passes the population plan's `reserved` keys), and floor items never
 * share a cell with a planned hero prop (`occupied`).
 */
import { decalWorldScale, dressingKitFor, dressingProfileFor, ROLE_VIGNETTES, vignettesFor, WALL_MOUNT_HEIGHT } from './roomDressingKits.js';
import { DRESSING_TRIANGLES } from './data/dressingTriangles.js';
import { roomDressingIdentity } from './roomDressingIdentity.js';
import { computePropFacingYaw, chooseSpacedModel } from './propBehavior.js';
import { anchorLightFor } from './anchorPracticalLight.js';

export const DRESSING_LIMITS = Object.freeze({
    // Distinct types per room, per layer: the instanced renderer draws one
    // batch per type, so this bounds draw calls however dense the room is.
    typesPerLayer: Object.freeze({ wallProps: 3, wallDecals: 5, clutter: 4, corners: 2, floorDecals: 5 }),
    // GPU budget. The shipped GLBs come in 2.5k/6k/12k/18k/25k/30k-triangle
    // tiers (the 2026-10-09 lived-in batch keeps 25k: cut lower, its organic
    // curves facet); layers that repeat a model many times only take the light tiers,
    // and each room's 3D dressing is capped (decals are a quad each). Measured
    // in game 2026-10-04: without these caps the visible dressing added
    // 0.8-1.25M triangles, about half the frame.
    maxTrianglesPerModel: Object.freeze({ wallProps: 25000, clutter: 12000, corners: 25000 }),
    roomTriangles: Object.freeze({ perimeter: 120000, vignettes: 70000 }),
    // One vignette per this many open floor cells, within [min, max].
    vignettes: Object.freeze({ cellsPer: 22, min: 2, max: 6 })
});

const DIRECTIONS = Object.freeze([[0, -1], [1, 0], [0, 1], [-1, 0]]);

function stableHash(text) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i += 1) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash;
}

// mulberry32: small, fast and good enough for placement jitter.
function seededRandom(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function pickSubset(list, count, random) {
    const pool = [...list];
    for (let i = pool.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count);
}

const keyOf = (x, y) => `${x},${y}`;

export const PROP_BOUNDING_DEPTHS = Object.freeze({
    life_server_racks: 0.55,
    life_filing_cabinets: 0.50,
    life_vending_machine: 0.52,
    life_fire_station: 0.44,
    life_ribcage_rescue_cabinet: 0.48,
    prop_locker_bulged: 0.50,
    prop_terminal_ruptured: 0.48,
    prop_decon_eyewash_shower_station: 0.52,
    prop_biomech_flesh_locker: 0.50,
    life_vertebral_restraint_rack: 0.46,
    life_memorial_board: 0.22,
    life_tally_bulkhead: 0.20,
    life_cochlear_intercom: 0.20,
    life_mask_rack: 0.30,
    life_pneumatic_tube_node: 0.32,
    life_planning_board: 0.24,
    prop_wall_cable_tray_swag: 0.22,
    prop_conduit_junction_box: 0.24,
    prop_exhaust_blower_fan_hood: 0.38,
    fixture_clock_dead: 0.18,
    fixture_sconce_vine: 0.22,
    prop_overhead_cage_fluorescent: 0.28,
    prop_vertebral_cable_riser: 0.24,
    prop_biomech_tracheal_wall_pipe: 0.26,
    prop_light_cluster_dripping: 0.30,
    prop_biomech_respirator: 0.32,
    prop_icey_frost_manifold: 0.40,
    life_parka_hooks: 0.25,
    cryo_frozen_cascade: 0.35,
    life_umbilical_tether: 0.28,
    life_lung_filter_bellows: 0.36,
    life_brood_comb: 0.34,
    life_fungal_cable_bundle: 0.30,
    hive_resin_pillar: 0.50,
    hive_tendril_arch: 0.50
});

export function getPropBoundingDepth(type) {
    if (PROP_BOUNDING_DEPTHS[type] !== undefined) return PROP_BOUNDING_DEPTHS[type];
    const id = String(type ?? '');
    if (id.includes('rack') || id.includes('cabinet') || id.includes('locker') || id.includes('machine')) return 0.52;
    if (id.includes('console') || id.includes('station') || id.includes('terminal')) return 0.46;
    if (id.includes('board') || id.includes('tray') || id.includes('box') || id.includes('clock')) return 0.24;
    return 0.36;
}

/**
 * @param {object} room  { id, theme, role, interior: [{x,y}] }
 * @param {string[][]} grid  '#' wall, '.' floor
 * @param {object} [options]
 * @param {Iterable<string>} [options.reserved]  "x,y" keys to keep clear (door aprons, fixtures)
 * @param {Array<{x:number,y:number}>} [options.occupied]  hero prop cells
 * @returns {{ family: string, types: object, items: object[] }}
 */
export function planRoomDressing(room, grid, { reserved = [], occupied = [], recentModels = null } = {}) {
    const random = seededRandom(stableHash(`${room?.id ?? 'room'}:dressing:v1`));
    const kit = dressingKitFor(room?.theme, room?.role);
    const profile = dressingProfileFor(room?.theme);
    const types = {};
    for (const [layer, count] of Object.entries(DRESSING_LIMITS.typesPerLayer)) {
        const cap = DRESSING_LIMITS.maxTrianglesPerModel[layer];
        const eligible = cap == null ? kit[layer] ?? [] : (kit[layer] ?? []).filter((type) => (DRESSING_TRIANGLES[type] ?? Infinity) <= cap);
        types[layer] = pickSubset(eligible, count, random);
    }
    const spent = { perimeter: 0, vignettes: 0 };
    const afford = (pool, type) => {
        const cost = DRESSING_TRIANGLES[type] ?? 0;
        if (spent[pool] + cost > DRESSING_LIMITS.roomTriangles[pool]) return false;
        spent[pool] += cost;
        return true;
    };
    const choose = (list) => list[Math.floor(random() * list.length)];
    const chunkModels = recentModels ?? new Map();
    // 3D layers favour cheap models and enforce spacing (>=6 tiles) and chunk rotation
    const chooseLight = (list, cellX, cellY) => {
        const baseWeights = Object.fromEntries(
            list.map((type) => [type, 1 / Math.max(1000, DRESSING_TRIANGLES[type] ?? 1000)])
        );
        const picked = chooseSpacedModel(list, {
            x: cellX,
            y: cellY,
            placedItems: items,
            chunkPlacedCounts: chunkModels,
            baseWeights,
            random
        });
        if (picked) chunkModels.set(picked, (chunkModels.get(picked) ?? 0) + 1);
        return picked;
    };

    const blocked = new Set(reserved);
    const doorLanes = [
        ...(room?.navigation?.doorLanes ?? []),
        ...(room?.navigation?.doors ?? []),
        ...(room?.doors ?? [])
    ];
    for (const door of doorLanes) {
        for (let dy = -1; dy <= 1; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
                blocked.add(keyOf(door.x + dx, door.y + dy));
            }
        }
    }
    const taken = new Set((occupied ?? []).map(({ x, y }) => keyOf(x, y)));
    const floorCells = (room?.interior ?? [])
        .filter(({ x, y }) => grid?.[y]?.[x] === '.')
        .sort((a, b) => (a.y - b.y) || (a.x - b.x));
    const items = [];
    const wallDecalCells = [];

    for (const cell of floorCells) {
        const key = keyOf(cell.x, cell.y);
        if (blocked.has(key)) continue;
        const walls = DIRECTIONS.filter(([dx, dy]) => grid?.[cell.y + dy]?.[cell.x + dx] === '#');
        if (walls.length === 0) continue;

        for (const [dx, dy] of walls) {
            const decalCell = { x: cell.x + dx, y: cell.y + dy };
            const hasNearbyDecal = wallDecalCells.some((placed) => (
                Math.abs(placed.x - decalCell.x) + Math.abs(placed.y - decalCell.y) < profile.wallDecalSpacing
            ));
            if (!hasNearbyDecal && types.wallDecals.length && random() < profile.wallDecalChance) {
                const wallType = choose(types.wallDecals);
                const wallHeight = wallType === 'decal_wall_grime_drip'
                    ? 1.45 + random() * 0.35
                    : (wallType === 'decal_permafrost_icicles' ? 1.5 + random() * 0.3 : 0.85 + random() * 1.05);
                items.push({
                    layer: 'wallDecal',
                    type: wallType,
                    x: cell.x + dx * 0.49,
                    y: cell.y + dy * 0.49,
                    normal: { x: -dx, z: -dy },
                    supportCell: { x: cell.x + dx, y: cell.y + dy },
                    height: wallHeight,
                    size: decalWorldScale(wallType, random),
                    roll: (random() - 0.5) * 0.4
                });
                wallDecalCells.push(decalCell);

                // Layered wall decal: e.g. a grime drip beneath a vent/panel, or bullet holes/blood near graffiti
                if (types.wallDecals.length > 1 && random() < 0.35) {
                    const secondaryPool = types.wallDecals.filter((t) => t !== wallType);
                    const secondaryWallType = choose(secondaryPool.length ? secondaryPool : types.wallDecals);
                    const secondaryHeight = secondaryWallType === 'decal_wall_grime_drip'
                        ? Math.max(0.6, wallHeight - 0.4)
                        : (secondaryWallType.includes('stencil') ? 1.2 + random() * 0.2 : 0.75 + random() * 0.8);
                    items.push({
                        layer: 'wallDecal',
                        type: secondaryWallType,
                        x: cell.x + dx * 0.49,
                        y: cell.y + dy * 0.49,
                        normal: { x: -dx, z: -dy },
                        supportCell: { x: cell.x + dx, y: cell.y + dy },
                        height: secondaryHeight,
                        size: decalWorldScale(secondaryWallType, random),
                        roll: (random() - 0.5) * 0.3
                    });
                }
            }
        }

        const corner = walls.length >= 2 && walls.some(([ax, ay]) => walls.some(([bx, by]) => ax * bx + ay * by === 0 && (ax !== bx || ay !== by)));
        const towardX = walls.reduce((sum, [dx]) => sum + dx, 0);
        const towardY = walls.reduce((sum, [, dy]) => sum + dy, 0);

        // Ground grit/grime pocket wedged directly into inside corners where walls and floor meet
        if (corner && types.floorDecals.length) {
            const cornerDecalType = types.floorDecals.includes('decal_corner_grit_pocket')
                ? 'decal_corner_grit_pocket'
                : (types.floorDecals.find((t) => t.includes('grit') || t.includes('growth') || t.includes('frost') || t.includes('oil')) ?? types.floorDecals[0]);
            if (cornerDecalType && random() < 0.88) {
                items.push({
                    layer: 'floorDecal',
                    type: cornerDecalType,
                    x: cell.x + Math.sign(towardX) * 0.32,
                    y: cell.y + Math.sign(towardY) * 0.32,
                    yaw: Math.atan2(-towardX, -towardY) + (random() - 0.5) * 0.25,
                    size: decalWorldScale(cornerDecalType, random),
                    compositionRole: 'corner'
                });
            }
        }

        if (taken.has(key)) continue;
        const [wx, wy] = walls[0];
        if (corner && types.corners.length && random() < profile.cornerChance) {
            const cornerType = chooseLight(types.corners, cell.x, cell.y);
            if (!afford('perimeter', cornerType)) continue;
            const yaw = computePropFacingYaw({
                type: cornerType,
                x: cell.x,
                y: cell.y,
                walls,
                corner: true,
                random
            });
            items.push({
                layer: 'corner',
                type: cornerType,
                x: cell.x + Math.sign(towardX) * 0.18,
                y: cell.y + Math.sign(towardY) * 0.18,
                yaw,
                scale: 0.95 + random() * 0.15
            });
            taken.add(key);
            continue;
        }
        if (types.wallProps.length && random() < profile.wallPropChance) {
            const type = chooseLight(types.wallProps, cell.x, cell.y);
            if (!afford('perimeter', type)) continue;
            const yaw = computePropFacingYaw({
                type,
                x: cell.x,
                y: cell.y,
                walls: [[wx, wy]],
                random
            });
            const depth = getPropBoundingDepth(type);
            const halfDepth = depth / 2;
            const wallOffset = Math.max(0.12, Math.min(0.28, 0.48 - halfDepth));
            items.push({
                layer: 'wallProp',
                type,
                x: cell.x + wx * wallOffset,
                y: cell.y + wy * wallOffset,
                yaw,
                mountY: WALL_MOUNT_HEIGHT[type] ?? 0,
                supportCell: { x: cell.x + wx, y: cell.y + wy },
                scale: 1
            });
            taken.add(key);
            continue;
        }
        if (types.clutter.length && random() < profile.clutterChance) {
            const clutterType = chooseLight(types.clutter, cell.x, cell.y);
            if (!afford('perimeter', clutterType)) continue;
            const yaw = computePropFacingYaw({
                type: clutterType,
                x: cell.x,
                y: cell.y,
                walls: [[wx, wy]],
                random
            });
            items.push({
                layer: 'clutter',
                type: clutterType,
                x: cell.x + wx * 0.22 + (wx === 0 ? (random() - 0.5) * 0.4 : 0),
                y: cell.y + wy * 0.22 + (wy === 0 ? (random() - 0.5) * 0.4 : 0),
                yaw,
                scale: 0.85 + random() * 0.3
            });
            taken.add(key);
        }
    }

    // Vignettes on the open floor. Furniture collides, so each is accepted only
    // if every remaining floor cell is still reachable from the room's doors.
    const doorCells = (room?.navigation?.doorLanes ?? []).filter(({ x, y }) => grid?.[y]?.[x] === '.');
    const nearDoor = (x, y) => doorCells.some((door) => Math.abs(door.x - x) + Math.abs(door.y - y) <= 2);
    const centre = floorCells.length
        ? { x: floorCells.reduce((s, c) => s + c.x, 0) / floorCells.length, y: floorCells.reduce((s, c) => s + c.y, 0) / floorCells.length }
        : { x: 0, y: 0 };
    const solid = new Set(taken);
    // Cells reachable from the doors before any furniture; some authored rooms
    // (cages, machinery bays) already enclose floor pockets, which stay as they
    // are. A vignette may not cut off any cell that was reachable.
    const reachableFrom = () => {
        const walkable = floorCells.filter(({ x, y }) => !solid.has(keyOf(x, y)));
        if (walkable.length === 0) return new Set();
        const start = doorCells.find(({ x, y }) => !solid.has(keyOf(x, y))) ?? walkable[0];
        const seen = new Set([keyOf(start.x, start.y)]);
        const queue = [start];
        while (queue.length) {
            const { x, y } = queue.pop();
            for (const [dx, dy] of DIRECTIONS) {
                const nx = x + dx;
                const ny = y + dy;
                const k = keyOf(nx, ny);
                if (seen.has(k) || solid.has(k) || grid?.[ny]?.[nx] !== '.') continue;
                seen.add(k);
                queue.push({ x: nx, y: ny });
            }
        }
        return seen;
    };
    const baseline = reachableFrom();
    const reachableAll = () => {
        const now = reachableFrom();
        for (const key of baseline) if (!solid.has(key) && !now.has(key)) return false;
        return true;
    };
    const groups = vignettesFor(room?.theme, room?.role);
    const roleGroups = ROLE_VIGNETTES[room?.role] ?? [];
    const islandCandidates = floorCells.filter(({ x, y }) => {
        const k = keyOf(x, y);
        return !blocked.has(k) && !taken.has(k) && !nearDoor(x, y)
            && Math.hypot(x - centre.x, y - centre.y) >= 1.5
            && DIRECTIONS.every(([dx, dy]) => grid?.[y + dy]?.[x + dx] === '.');
    });
    const { cellsPer, min: vMin, max: vMax } = DRESSING_LIMITS.vignettes;
    const wanted = Math.min(vMax, Math.max(vMin, Math.floor(islandCandidates.length / cellsPer)));
    let placedVignettes = 0;
    const usedGroups = new Set();
    const vignetteAnchors = [];
    for (let attempt = 0; attempt < wanted * 16 && placedVignettes < wanted && groups.length; attempt += 1) {
        const anchor = islandCandidates[Math.floor(random() * islandCandidates.length)];
        const [dx, dy] = DIRECTIONS[Math.floor(random() * DIRECTIONS.length)];
        const second = { x: anchor.x + dx, y: anchor.y + dy };
        const cells = [anchor, second];
        if (cells.some(({ x, y }) => solid.has(keyOf(x, y)) || blocked.has(keyOf(x, y)) || grid?.[y]?.[x] !== '.')) continue;
        // Keep a one-cell gap between vignettes so they read as separate groups.
        if (cells.some(({ x, y }) => DIRECTIONS.some(([ax, ay]) => solid.has(keyOf(x + ax, y + ay)) && !cells.some((c) => c.x === x + ax && c.y === y + ay)))) continue;
        for (const { x, y } of cells) solid.add(keyOf(x, y));
        if (!reachableAll()) {
            for (const { x, y } of cells) solid.delete(keyOf(x, y));
            continue;
        }
        const preferred = placedVignettes === 0 && roleGroups.length
            ? roleGroups
            : groups.filter((candidate) => !usedGroups.has(candidate.join('|')));
        const pool = preferred.length ? preferred : groups;
        const conflictFree = pool.filter((candidate) => candidate.every((type) => !items.some((item) => (
            item.type === type && Math.hypot(item.x - anchor.x, item.y - anchor.y) < 6
        ))));
        const candidates = conflictFree.length ? conflictFree : pool;
        const leastUsed = Math.min(...candidates.map((candidate) => (
            candidate.reduce((sum, type) => sum + (chunkModels.get(type) ?? 0), 0)
        )));
        const balanced = candidates.filter((candidate) => (
            candidate.reduce((sum, type) => sum + (chunkModels.get(type) ?? 0), 0) === leastUsed
        ));
        const group = balanced[Math.floor(random() * balanced.length)];
        const groupCost = group.reduce((sum, type) => sum + (DRESSING_TRIANGLES[type] ?? 0), 0);
        if (spent.vignettes + groupCost > DRESSING_LIMITS.roomTriangles.vignettes) {
            for (const { x, y } of cells) solid.delete(keyOf(x, y));
            continue;
        }
        spent.vignettes += groupCost;
        const nearestDoorCell = doorCells.length
            ? doorCells.reduce((best, door) => {
                const d = Math.hypot(door.x - anchor.x, door.y - anchor.y);
                return d < best.d ? { door, d } : best;
            }, { door: null, d: Infinity }).door
            : null;
        const compositionId = `${room?.id ?? 'room'}:composition:${placedVignettes}`;
        group.forEach((type, index) => {
            const at = index === 0 ? anchor : index === 1 ? second : anchor;
            // The third piece sits beside the pair, inside the anchor cell
            // (offset + jitter stay under half a cell).
            const spread = index === 2 ? 0.2 : 0.08;
            const px = at.x + (random() - 0.5) * spread + (index === 2 ? dy * 0.3 : 0);
            const py = at.y + (random() - 0.5) * spread + (index === 2 ? -dx * 0.3 : 0);
            const yaw = index === 0
                ? computePropFacingYaw({ type, x: px, y: py, roomCenter: centre, nearestDoor: nearestDoorCell, random })
                : Math.atan2(anchor.x - px, anchor.y - py);
            chunkModels.set(type, (chunkModels.get(type) ?? 0) + 1);
            items.push({
                layer: 'vignette',
                type,
                x: px,
                y: py,
                yaw,
                scale: (index === 0 ? 1.04 : index === 1 ? 0.92 : 0.78) + random() * 0.06,
                blocking: index < 2,
                compositionId,
                compositionRole: index === 0 ? 'anchor' : index === 1 ? 'support' : 'detail'
            });
        });
        usedGroups.add(group.join('|'));
        vignetteAnchors.push({ ...anchor, compositionId });
        for (const { x, y } of cells) taken.add(keyOf(x, y));
        placedVignettes += 1;
    }

    // Story on the open floor: a few clusters of overlapping decals.
    const open = floorCells.filter(({ x, y }) => !blocked.has(keyOf(x, y)) && !nearDoor(x, y));
    if (types.floorDecals.length && open.length) {
        // Every furniture composition gets grounding marks, so it reads as a
        // single lived-in scene rather than unrelated objects on a clean floor.
        for (const anchor of vignetteAnchors) {
            const baseType = choose(types.floorDecals);
            items.push({
                layer: 'floorDecal',
                type: baseType,
                x: anchor.x + (random() - 0.5) * 0.28,
                y: anchor.y + (random() - 0.5) * 0.28,
                yaw: random() * Math.PI * 2,
                size: decalWorldScale(baseType, random),
                compositionId: anchor.compositionId,
                compositionRole: 'grounding'
            });
            // Multi-layered grounding: secondary accent under furniture cluster
            if (types.floorDecals.length > 1 && random() < 0.65) {
                const accentPool = types.floorDecals.filter((t) => t !== baseType);
                const accentType = choose(accentPool.length ? accentPool : types.floorDecals);
                items.push({
                    layer: 'floorDecal',
                    type: accentType,
                    x: anchor.x + (random() - 0.5) * 0.36,
                    y: anchor.y + (random() - 0.5) * 0.36,
                    yaw: random() * Math.PI * 2,
                    size: decalWorldScale(accentType, random),
                    compositionId: anchor.compositionId,
                    compositionRole: 'grounding'
                });
            }
        }
        const [min, max] = profile.floorClusters;
        const clusters = min + Math.floor(random() * (max - min + 1));
        const clusterCentres = [];
        for (let c = 0; c < clusters; c += 1) {
            const spaced = open.filter((candidate) => clusterCentres.every((placed) => (
                Math.hypot(candidate.x - placed.x, candidate.y - placed.y) >= 4
            )));
            const centre = (spaced.length ? spaced : open)[Math.floor(random() * (spaced.length ? spaced.length : open.length))];
            clusterCentres.push(centre);

            // Primary foundation decal for this wear cluster (spill, apron, bloom, or ruts)
            const primaryType = choose(types.floorDecals);
            items.push({
                layer: 'floorDecal',
                type: primaryType,
                x: centre.x + (random() - 0.5) * 0.35,
                y: centre.y + (random() - 0.5) * 0.35,
                yaw: random() * Math.PI * 2,
                size: decalWorldScale(primaryType, random)
            });

            // Overlapping secondary/detail decals creating a composite wear narrative
            const extraLayers = 1 + Math.floor(random() * 2);
            for (let l = 0; l < extraLayers; l += 1) {
                const secondaryPool = types.floorDecals.filter((t) => t !== primaryType);
                const secondaryType = choose(secondaryPool.length ? secondaryPool : types.floorDecals);
                items.push({
                    layer: 'floorDecal',
                    type: secondaryType,
                    x: centre.x + (random() - 0.5) * 0.95,
                    y: centre.y + (random() - 0.5) * 0.95,
                    yaw: random() * Math.PI * 2,
                    size: decalWorldScale(secondaryType, random)
                });
            }
        }
    }

    const practical = items.find((item) => anchorLightFor(item.type));
    if (practical) practical.practicalLight = anchorLightFor(practical.type);

    items.forEach((item, index) => {
        item.legacyId = `${room?.id ?? 'room'}:dressing:${item.layer}:${index}`;
        item.id = roomDressingIdentity(room?.id ?? 'room', item);
        if (isDestructibleDressingType(item.type, item.layer)) {
            item.destructible = true;
            item.hp = 3;
        }
    });

    return { family: kitFamilyLabel(room?.theme), profile: profile.id, types, items, triangles: spent.perimeter + spent.vignettes };
}

export function isDestructibleDressingType(type, layer) {
    if (layer === 'wallDecal' || layer === 'floorDecal') return false;
    if (typeof type !== 'string') return false;
    if (type.startsWith('arch_') || type.startsWith('gate_') || type === 'state_column_shattered') return false;
    if (type.includes('terminal') && !type.includes('ruptured')) return false;
    return type.startsWith('prop_')
        || type.startsWith('life_')
        || type.startsWith('bunker_junk_')
        || type.startsWith('state_barricade_')
        || type.startsWith('scatter_');
}

function kitFamilyLabel(themeId) {
    const id = String(themeId ?? '');
    return id.split('-')[0] || 'bunker';
}
