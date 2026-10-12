/**
 * Props for the places room dressing never reached: maze corridors and the
 * open landforms (docs/planning/lived-in-world-pass-2-2026-10-09.md, Part 6).
 * Pure and deterministic per chunk. Items use room dressing's shape
 * ({ layer, type, x, y, yaw, scale, mountY, blocking, cells }) in chunk-local
 * cells, so ThreeGame draws them through the same instanced renderer.
 *
 * The props are 25k triangles each, so each chunk gets a handful placed with
 * intent rather than a scatter: a fixture every few runs of hall, a vignette at
 * dead ends, and outdoors one landmark plus a few working props.
 */
import { DRESSING_TRIANGLES } from './data/dressingTriangles.js';

export const WORLD_DRESSING_LIMITS = Object.freeze({
    corridorTriangles: 125000,
    outdoorTriangles: 150000,
    // Wall fixtures along one straight hall run are at least this far apart.
    fixtureSpacing: 7
});

// Wall fixtures by the floor family they hang over.
const CORRIDOR_FIXTURES = Object.freeze({
    cryo: ['life_parka_hooks', 'life_cochlear_intercom'],
    bio: ['life_fungal_cable_bundle', 'life_brood_comb'],
    default: ['life_cochlear_intercom', 'life_ribcage_rescue_cabinet', 'life_pneumatic_tube_node', 'life_fuse_bypass_panel']
});
const DEAD_END_PROPS = Object.freeze(['life_checkpoint_post', 'life_dropped_kit_pile', 'life_ceiling_collapse', 'life_drip_buckets']);
const JUNCTION_PROP = 'life_wayfinding_totem';

const LANDFORM_SETS = Object.freeze({
    field: { landmarks: ['life_pipeline_trestle'], props: ['life_seismic_drill', 'life_wind_mast', 'life_guide_rope_stakes', 'life_tarp_leanto'] },
    canyon: { landmarks: ['life_colossal_limb'], props: ['life_ore_cart', 'life_rope_anchor_post', 'life_guide_rope_stakes', 'life_tarp_leanto'] },
    crater: { landmarks: ['life_fallen_comm_dish', 'life_supply_drop_pod'], props: ['life_seismic_drill', 'life_wind_mast', 'life_ice_bore_winch'] },
    ruins: { landmarks: ['life_colossal_limb'], props: ['life_pod_seat_row', 'life_ceiling_collapse', 'life_dropped_kit_pile'] }
});
// Cells a prop covers, as a half-extent around its anchor (long props lie
// along x before their yaw).
const FOOTPRINT = Object.freeze({
    life_colossal_limb: [3, 1],
    life_pipeline_trestle: [2, 0],
    life_fallen_comm_dish: [1, 1],
    life_supply_drop_pod: [1, 1],
    life_tarp_leanto: [1, 0],
    life_guide_rope_stakes: [1, 0],
    life_pod_seat_row: [1, 0],
    life_ceiling_collapse: [1, 0]
});
// The crash site (chunk 0,0) is authored: the wreck, its console and its
// modules stand at fixed offsets from the ship, the spawn ring sits by the
// console and arrival wreckage takes slots along the walls. Its props are laid
// out by hand in slots relative to the ship; the first slot that fits wins.
const CRASH_SITE_PROPS = Object.freeze([
    // Torn from the wreck and thrown west, tipped toward the door hall.
    { type: 'life_pod_seat_row', slots: [{ dx: -5, dy: -1, yaw: Math.PI / 2 + 0.35 }, { dx: 4, dy: 5, yaw: -0.4 }] }
    // Prop 80 (life_hull_shard_smoldering) joins here when its model arrives.
]);
const NON_BLOCKING = new Set(['life_dropped_kit_pile', 'life_drip_buckets', 'life_guide_rope_stakes', 'life_ceiling_collapse']);
const WALL_TILES = new Set(['#', 'W']);
const FLOOR_TILES = new Set(['.', 'O']);
const DIRS = Object.freeze([[1, 0], [-1, 0], [0, 1], [0, -1]]);

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

const pick = (list, random) => list[Math.floor(random() * list.length)];
const triangles = (type) => DRESSING_TRIANGLES[type] ?? 25000;

/** Connected-region label per cell (-1 = closed or blocked), 4-neighbour steps. */
function regionLabels(isOpen, size, blocked) {
    const labels = new Int32Array(size * size).fill(-1);
    let next = 0;
    for (let start = 0; start < size * size; start += 1) {
        if (labels[start] >= 0 || blocked.has(start) || !isOpen(start % size, Math.floor(start / size))) continue;
        const queue = [start];
        labels[start] = next;
        while (queue.length) {
            const index = queue.pop();
            const x = index % size;
            const y = (index - x) / size;
            for (const [dx, dy] of DIRS) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
                const neighbour = ny * size + nx;
                if (labels[neighbour] >= 0 || blocked.has(neighbour) || !isOpen(nx, ny)) continue;
                labels[neighbour] = next;
                queue.push(neighbour);
            }
        }
        next += 1;
    }
    return labels;
}

/** True when blocking more cells splits none of the regions that were connected. */
function keepsRegionsWhole(before, after) {
    const seen = new Map();
    for (let i = 0; i < before.length; i += 1) {
        if (before[i] < 0 || after[i] < 0) continue;
        const known = seen.get(before[i]);
        if (known === undefined) seen.set(before[i], after[i]);
        else if (known !== after[i]) return false;
    }
    return true;
}

function footprintCells(type, x, y, yaw) {
    const [along, across] = FOOTPRINT[type] ?? [0, 0];
    const alongX = Math.round(Math.cos(yaw));
    const alongY = Math.round(-Math.sin(yaw));
    const cells = [];
    for (let a = -along; a <= along; a += 1) {
        for (let c = -across; c <= across; c += 1) {
            cells.push({ x: x + alongX * a - alongY * c, y: y + alongY * a + alongX * c });
        }
    }
    return cells;
}

/**
 * @param {object} chunk
 * @param {string[]} chunk.grid
 * @param {number} chunk.size
 * @param {string} chunk.landform
 * @param {object} [chunk.metadata]       roomInstances are left to room dressing
 * @param {(x:number, y:number) => string|null} [chunk.categoryAt]  floor family (stickerPlanner.surfaceCategory)
 * @param {string} chunk.seed
 * @param {{ ship: { x: number, y: number } }} [chunk.crashSite]  chunk 0,0: hand-placed props around the wreck instead of the landform's
 */
export function planWorldDressing({ grid, size, landform, metadata = null, categoryAt = () => null, seed = '', crashSite = null }) {
    const random = createRandom(`world-dressing:${seed}`);
    const at = (x, y) => (x < 0 || y < 0 || x >= size || y >= size ? null : grid[y]?.[x]);
    const inRoom = new Set();
    for (const room of metadata?.roomInstances ?? []) {
        for (const cell of room.interior ?? []) inRoom.add(`${cell.x},${cell.y}`);
        for (const cell of room.navigation?.doorLanes ?? []) inRoom.add(`${cell.x},${cell.y}`);
    }
    const doorNear = (x, y) => {
        for (let dy = -2; dy <= 2; dy += 1) {
            for (let dx = -2; dx <= 2; dx += 1) if (at(x + dx, y + dy) === 'D') return true;
        }
        return false;
    };
    // 'P' marks a cell something else already stands on: walkable, never built on.
    const isOpen = (x, y) => FLOOR_TILES.has(at(x, y)) || at(x, y) === 'D' || at(x, y) === 'P';
    // In a maze, corridor props stay on the hall floor ('.'), not the open
    // exterior ground ('O') the halls run along.
    const hallTiles = landform === 'maze' ? new Set(['.']) : FLOOR_TILES;
    const isHall = (x, y) => hallTiles.has(at(x, y)) && !inRoom.has(`${x},${y}`);
    const blocked = new Set();
    const used = new Set();
    const baseline = regionLabels(isOpen, size, blocked);
    const items = [];
    let spent = 0;
    const budget = landform === 'maze' ? WORLD_DRESSING_LIMITS.corridorTriangles : WORLD_DRESSING_LIMITS.outdoorTriangles;

    const tryPlace = (item) => {
        if (spent + triangles(item.type) > budget) return false;
        const cells = item.cells ?? [{ x: item.x, y: item.y }];
        for (const cell of cells) {
            if (!isHall(cell.x, cell.y) || used.has(`${cell.x},${cell.y}`) || doorNear(cell.x, cell.y)) return false;
        }
        if (item.blocking) {
            const trial = new Set(blocked);
            for (const cell of cells) trial.add(cell.y * size + cell.x);
            // Blocking the cells the prop stands on must never cut a region in two.
            if (!keepsRegionsWhole(baseline, regionLabels(isOpen, size, trial))) return false;
            for (const index of trial) blocked.add(index);
        }
        for (const cell of cells) {
            for (let dy = -1; dy <= 1; dy += 1) {
                for (let dx = -1; dx <= 1; dx += 1) used.add(`${cell.x + dx},${cell.y + dy}`);
            }
        }
        spent += triangles(item.type);
        items.push(item);
        return true;
    };

    if (crashSite?.ship) {
        for (const { type, slots } of CRASH_SITE_PROPS) {
            for (const { dx, dy, yaw } of slots) {
                const x = crashSite.ship.x + dx;
                const y = crashSite.ship.y + dy;
                if (tryPlace({ layer: 'corner', type, x, y, yaw, scale: 1, mountY: 0, blocking: !NON_BLOCKING.has(type), cells: footprintCells(type, x, y, yaw) })) break;
            }
        }
        return { items, triangles: spent };
    }

    if (landform === 'maze') {
        // Wall fixtures along straight runs, spaced, alternating sides.
        const candidates = [];
        for (let y = 1; y < size - 1; y += 1) {
            for (let x = 1; x < size - 1; x += 1) {
                if (!isHall(x, y)) continue;
                for (const [wx, wy] of DIRS) {
                    if (!WALL_TILES.has(at(x + wx, y + wy))) continue;
                    // A straight run: open along the wall for two cells each way.
                    const ax = Math.abs(wy);
                    const ay = Math.abs(wx);
                    if (![-2, -1, 1, 2].every((k) => isHall(x + ax * k, y + ay * k) && WALL_TILES.has(at(x + ax * k + wx, y + ay * k + wy)))) continue;
                    candidates.push({ x, y, wx, wy });
                }
            }
        }
        candidates.sort(() => random() - 0.5);
        const fixtures = [];
        for (const spot of candidates) {
            if (fixtures.some((f) => Math.abs(f.x - spot.x) + Math.abs(f.y - spot.y) < WORLD_DRESSING_LIMITS.fixtureSpacing)) continue;
            const family = categoryAt(spot.x, spot.y);
            const type = pick(CORRIDOR_FIXTURES[family] ?? CORRIDOR_FIXTURES.default, random);
            const placed = tryPlace({
                layer: 'wallProp', type, x: spot.x + spot.wx * 0.28, y: spot.y + spot.wy * 0.28,
                cells: [{ x: spot.x, y: spot.y }], yaw: Math.atan2(-spot.wx, -spot.wy), scale: 1, mountY: 0,
                supportCell: { x: spot.x + spot.wx, y: spot.y + spot.wy }, blocking: false
            });
            if (placed) fixtures.push(spot);
            if (fixtures.length >= 3) break;
        }
        // Dead ends (a 1-wide stub, or the middle of a 3-wide hall's end wall)
        // and wide crossings.
        const isDeadEnd = (x, y) => {
            const open = DIRS.filter(([dx, dy]) => isOpen(x + dx, y + dy));
            if (open.length === 1) return open[0];
            for (const [wx, wy] of DIRS) {
                if (!WALL_TILES.has(at(x + wx, y + wy))) continue;
                const ax = Math.abs(wy);
                const ay = Math.abs(wx);
                const capped = [-1, 1].every((k) => isHall(x + ax * k, y + ay * k)
                    && WALL_TILES.has(at(x + ax * k + wx, y + ay * k + wy))
                    && WALL_TILES.has(at(x + ax * 2 * k, y + ay * 2 * k)));
                if (capped && isHall(x - wx, y - wy)) return [-wx, -wy];
            }
            return null;
        };
        for (let y = 1; y < size - 1; y += 1) {
            for (let x = 1; x < size - 1; x += 1) {
                if (!isHall(x, y)) continue;
                const deadEnd = isDeadEnd(x, y);
                if (deadEnd && random() < 0.7) {
                    const type = pick(DEAD_END_PROPS, random);
                    tryPlace({ layer: 'corner', type, x, y, yaw: Math.atan2(deadEnd[0], deadEnd[1]), scale: 1, mountY: 0, blocking: !NON_BLOCKING.has(type) });
                } else if (!deadEnd && DIRS.every(([dx, dy]) => isHall(x + dx, y + dy))
                    && [[1, 1], [1, -1], [-1, 1], [-1, -1]].every(([dx, dy]) => isHall(x + dx, y + dy))
                    && DIRS.filter(([dx, dy]) => isHall(x + dx * 3, y + dy * 3)).length >= 3 && random() < 0.08) {
                    if (items.some((item) => item.type === JUNCTION_PROP && Math.abs(item.x - x) + Math.abs(item.y - y) < 12)) continue;
                    tryPlace({ layer: 'corner', type: JUNCTION_PROP, x, y, yaw: random() * Math.PI * 2, scale: 1, mountY: 0, blocking: true });
                }
            }
        }
        return { items, triangles: spent };
    }

    const set = LANDFORM_SETS[landform];
    if (!set) return { items, triangles: spent };
    const open = [];
    for (let y = 3; y < size - 3; y += 1) {
        for (let x = 3; x < size - 3; x += 1) {
            if (!isHall(x, y)) continue;
            // Clearance: the 5x5 around stays open ground, so props stand in the open.
            let clear = true;
            for (let dy = -2; dy <= 2 && clear; dy += 1) {
                for (let dx = -2; dx <= 2 && clear; dx += 1) if (!isHall(x + dx, y + dy)) clear = false;
            }
            if (clear) open.push({ x, y });
        }
    }
    open.sort(() => random() - 0.5);
    if (random() < 0.4) {
        const type = pick(set.landmarks, random);
        for (const spot of open.slice(0, 40)) {
            const yaw = Math.floor(random() * 4) * (Math.PI / 2);
            if (tryPlace({ layer: 'corner', type, x: spot.x, y: spot.y, yaw, scale: 1, mountY: 0, blocking: true, cells: footprintCells(type, spot.x, spot.y, yaw) })) break;
        }
    }
    const wanted = 2 + Math.floor(random() * 4);
    for (const spot of open) {
        if (items.length >= wanted + 1) break;
        const type = pick(set.props, random);
        const yaw = random() * Math.PI * 2;
        const snapped = FOOTPRINT[type] ? Math.round(yaw / (Math.PI / 2)) * (Math.PI / 2) : yaw;
        tryPlace({ layer: 'corner', type, x: spot.x, y: spot.y, yaw: snapped, scale: 1, mountY: 0, blocking: !NON_BLOCKING.has(type), cells: footprintCells(type, spot.x, spot.y, snapped) });
    }
    return { items, triangles: spent };
}
