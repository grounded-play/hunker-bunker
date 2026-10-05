/**
 * Lived-in room dressing: the dense layer that makes an authored room look
 * used, on top of the population plan's hero props (roomPopulation.js).
 *
 * Walls carry decals at eye height and wall-mounted fixtures; the ring of
 * floor cells along the walls fills with small clutter; concave corners take
 * heavier pieces; the floor gets a few clusters of story decals. Everything
 * comes from the room's kit (roomDressingKits.js) and is decorative: no
 * collision, no hit points, drawn instanced by ThreeGame.addRoomDressing.
 *
 * Deterministic from the room id through a private generator, so it never
 * draws from the shared world RNG and every co-op peer dresses a room the
 * same way. Door lanes, their aprons and reserved fixtures stay clear (the
 * caller passes the population plan's `reserved` keys), and floor items never
 * share a cell with a planned hero prop (`occupied`).
 */
import { dressingKitFor, vignettesFor, WALL_MOUNT_HEIGHT } from './roomDressingKits.js';
import { DRESSING_TRIANGLES } from './data/dressingTriangles.js';

export const DRESSING_LIMITS = Object.freeze({
    // Distinct types per room, per layer: the instanced renderer draws one
    // batch per type, so this bounds draw calls however dense the room is.
    typesPerLayer: Object.freeze({ wallProps: 3, wallDecals: 4, clutter: 4, corners: 2, floorDecals: 3 }),
    wallDecalChance: 0.55,
    wallPropChance: 0.3,
    cornerChance: 0.9,
    clutterChance: 0.42,
    floorClusters: Object.freeze({ min: 3, max: 6 }),
    // GPU budget. The shipped GLBs come in 2.5k/6k/12k/18k/25k/30k-triangle
    // tiers; layers that repeat a model many times only take the light tiers,
    // and each room's 3D dressing is capped (decals are a quad each). Measured
    // in game 2026-10-04: without these caps the visible dressing added
    // 0.8-1.25M triangles, about half the frame.
    maxTrianglesPerModel: Object.freeze({ wallProps: 18000, clutter: 12000, corners: 18000 }),
    roomTriangles: Object.freeze({ perimeter: 120000, vignettes: 60000 }),
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

/**
 * @param {object} room  { id, theme, role, interior: [{x,y}] }
 * @param {string[][]} grid  '#' wall, '.' floor
 * @param {object} [options]
 * @param {Iterable<string>} [options.reserved]  "x,y" keys to keep clear (door aprons, fixtures)
 * @param {Array<{x:number,y:number}>} [options.occupied]  hero prop cells
 * @returns {{ family: string, types: object, items: object[] }}
 */
export function planRoomDressing(room, grid, { reserved = [], occupied = [] } = {}) {
    const random = seededRandom(stableHash(`${room?.id ?? 'room'}:dressing:v1`));
    const kit = dressingKitFor(room?.theme, room?.role);
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
    // 3D layers favour cheap models: weight 1/triangles, so a 2.5k-triangle
    // crate repeats often and an 18k cable riser appears now and then.
    const chooseLight = (list) => {
        const weights = list.map((type) => 1 / Math.max(1000, DRESSING_TRIANGLES[type] ?? 1000));
        let roll = random() * weights.reduce((sum, w) => sum + w, 0);
        for (let i = 0; i < list.length; i += 1) {
            roll -= weights[i];
            if (roll <= 0) return list[i];
        }
        return list[list.length - 1];
    };

    const blocked = new Set(reserved);
    const taken = new Set((occupied ?? []).map(({ x, y }) => keyOf(x, y)));
    const floorCells = (room?.interior ?? [])
        .filter(({ x, y }) => grid?.[y]?.[x] === '.')
        .sort((a, b) => (a.y - b.y) || (a.x - b.x));
    const items = [];

    for (const cell of floorCells) {
        const key = keyOf(cell.x, cell.y);
        if (blocked.has(key)) continue;
        const walls = DIRECTIONS.filter(([dx, dy]) => grid?.[cell.y + dy]?.[cell.x + dx] === '#');
        if (walls.length === 0) continue;

        for (const [dx, dy] of walls) {
            if (types.wallDecals.length && random() < DRESSING_LIMITS.wallDecalChance) {
                items.push({
                    layer: 'wallDecal',
                    type: choose(types.wallDecals),
                    x: cell.x + dx * 0.49,
                    y: cell.y + dy * 0.49,
                    normal: { x: -dx, z: -dy },
                    height: 0.85 + random() * 1.05,
                    size: 1.05 + random() * 0.75,
                    roll: (random() - 0.5) * 0.5
                });
            }
        }

        if (taken.has(key)) continue;
        const corner = walls.length >= 2 && walls.some(([ax, ay]) => walls.some(([bx, by]) => ax * bx + ay * by === 0 && (ax !== bx || ay !== by)));
        const [wx, wy] = walls[0];
        if (corner && types.corners.length && random() < DRESSING_LIMITS.cornerChance) {
            const cornerType = chooseLight(types.corners);
            if (!afford('perimeter', cornerType)) continue;
            const towardX = walls.reduce((sum, [dx]) => sum + dx, 0);
            const towardY = walls.reduce((sum, [, dy]) => sum + dy, 0);
            items.push({
                layer: 'corner',
                type: cornerType,
                x: cell.x + Math.sign(towardX) * 0.18,
                y: cell.y + Math.sign(towardY) * 0.18,
                yaw: Math.atan2(-Math.sign(towardX), -Math.sign(towardY)),
                scale: 0.95 + random() * 0.15
            });
            taken.add(key);
            continue;
        }
        if (types.wallProps.length && random() < DRESSING_LIMITS.wallPropChance) {
            const type = chooseLight(types.wallProps);
            if (!afford('perimeter', type)) continue;
            items.push({
                layer: 'wallProp',
                type,
                x: cell.x + wx * 0.28,
                y: cell.y + wy * 0.28,
                yaw: Math.atan2(-wx, -wy),
                mountY: WALL_MOUNT_HEIGHT[type] ?? 0,
                scale: 1
            });
            taken.add(key);
            continue;
        }
        if (types.clutter.length && random() < DRESSING_LIMITS.clutterChance) {
            const clutterType = chooseLight(types.clutter);
            if (!afford('perimeter', clutterType)) continue;
            items.push({
                layer: 'clutter',
                type: clutterType,
                x: cell.x + wx * 0.22 + (wx === 0 ? (random() - 0.5) * 0.4 : 0),
                y: cell.y + wy * 0.22 + (wy === 0 ? (random() - 0.5) * 0.4 : 0),
                yaw: random() * Math.PI * 2,
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
    const islandCandidates = floorCells.filter(({ x, y }) => {
        const k = keyOf(x, y);
        return !blocked.has(k) && !taken.has(k) && !nearDoor(x, y)
            && Math.hypot(x - centre.x, y - centre.y) >= 1.5
            && DIRECTIONS.every(([dx, dy]) => grid?.[y + dy]?.[x + dx] === '.');
    });
    const { cellsPer, min: vMin, max: vMax } = DRESSING_LIMITS.vignettes;
    const wanted = Math.min(vMax, Math.max(vMin, Math.floor(islandCandidates.length / cellsPer)));
    let placedVignettes = 0;
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
        const group = groups[Math.floor(random() * groups.length)];
        const groupCost = group.reduce((sum, type) => sum + (DRESSING_TRIANGLES[type] ?? 0), 0);
        if (spent.vignettes + groupCost > DRESSING_LIMITS.roomTriangles.vignettes) {
            for (const { x, y } of cells) solid.delete(keyOf(x, y));
            continue;
        }
        spent.vignettes += groupCost;
        const facing = random() * Math.PI * 2;
        group.forEach((type, index) => {
            const at = index === 0 ? anchor : index === 1 ? second : anchor;
            // The third piece sits beside the pair, inside the anchor cell
            // (offset + jitter stay under half a cell).
            const spread = index === 2 ? 0.2 : 0.08;
            items.push({
                layer: 'vignette',
                type,
                x: at.x + (random() - 0.5) * spread + (index === 2 ? dy * 0.3 : 0),
                y: at.y + (random() - 0.5) * spread + (index === 2 ? -dx * 0.3 : 0),
                yaw: facing + (random() - 0.5) * 0.6,
                scale: 0.95 + random() * 0.1,
                blocking: index < 2
            });
        });
        for (const { x, y } of cells) taken.add(keyOf(x, y));
        placedVignettes += 1;
    }

    // Story on the open floor: a few clusters of overlapping decals.
    const open = floorCells.filter(({ x, y }) => !blocked.has(keyOf(x, y)));
    if (types.floorDecals.length && open.length) {
        const { min, max } = DRESSING_LIMITS.floorClusters;
        const clusters = min + Math.floor(random() * (max - min + 1));
        for (let c = 0; c < clusters; c += 1) {
            const centre = open[Math.floor(random() * open.length)];
            const pieces = 1 + Math.floor(random() * 3);
            for (let p = 0; p < pieces; p += 1) {
                items.push({
                    layer: 'floorDecal',
                    type: choose(types.floorDecals),
                    x: centre.x + (random() - 0.5) * 1.2,
                    y: centre.y + (random() - 0.5) * 1.2,
                    yaw: random() * Math.PI * 2,
                    size: 0.9 + random() * 0.7
                });
            }
        }
    }

    return { family: kitFamilyLabel(room?.theme), types, items, triangles: spent.perimeter + spent.vignettes };
}

function kitFamilyLabel(themeId) {
    const id = String(themeId ?? '');
    return id.split('-')[0] || 'bunker';
}
