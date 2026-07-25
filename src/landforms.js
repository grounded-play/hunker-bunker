// ── Chunk landforms ───────────────────────────────────────────
// The world used to be one texture of terrain: every chunk was the same DFS
// maze, which read as an endless flat field of pillars. Landforms give each
// chunk a seeded archetype so travel alternates between claustrophobic maze,
// open fields with rock outcrops, parallel canyon halls, crater clearings,
// and collapsed ruins. All transforms are pure grid operations ('#' wall /
// '.' floor) — collision, pickups, room templates, and the radar all derive
// from the grid, so they adapt for free.
//
// threeGame.buildChunk owns the pipeline: DFS maze carve → applyLandform →
// ensureChunkPortals → connectPortalsInward (non-maze) → widen → spawn clear.

export const LANDFORMS = Object.freeze({
    MAZE: 'maze',
    FIELD: 'field',
    CANYON: 'canyon',
    CRATER: 'crater',
    RUINS: 'ruins'
});

// Weights lean on the biome fantasy while keeping hard pillar mazes as a
// discovery beat instead of the default traversal texture.
const LANDFORM_WEIGHTS = Object.freeze({
    active: Object.freeze({ maze: 0.18, field: 0.28, canyon: 0.16, crater: 0.20, ruins: 0.18 }),
    cryo: Object.freeze({ maze: 0.16, field: 0.13, canyon: 0.38, crater: 0.15, ruins: 0.18 }),
    bio: Object.freeze({ maze: 0.14, field: 0.36, canyon: 0.10, crater: 0.22, ruins: 0.18 })
});

export function pickLandform(random, biome = 'active') {
    const weights = LANDFORM_WEIGHTS[biome] ?? LANDFORM_WEIGHTS.active;
    let roll = random();
    for (const [landform, weight] of Object.entries(weights)) {
        roll -= weight;
        if (roll <= 0) return landform;
    }
    return LANDFORMS.MAZE;
}

// Open clearing with seeded rock outcrops. The border stays walled (portals
// punch through later), so it reads as a sheltered basin.
function applyFieldLandform(grid, random) {
    const size = grid.length;
    for (let y = 1; y < size - 1; y++) {
        for (let x = 1; x < size - 1; x++) grid[y][x] = '.';
    }
    // Each outcrop stays inside a 3x3 patch and patches never touch each
    // other or the border, so no blob can ever seal off a pocket of floor.
    const clusters = 5 + Math.floor(random() * 4);
    const centers = [];
    let attempts = 0;
    while (centers.length < clusters && attempts < 80) {
        attempts += 1;
        const cx = 3 + Math.floor(random() * (size - 6));
        const cy = 3 + Math.floor(random() * (size - 6));
        if (centers.some((c) => Math.max(Math.abs(c.x - cx), Math.abs(c.y - cy)) < 4)) continue;
        centers.push({ x: cx, y: cy });
        const blob = 1 + Math.floor(random() * 4);
        grid[cy][cx] = '#';
        for (let j = 1; j < blob; j++) {
            const bx = cx + Math.floor(random() * 3) - 1;
            const by = cy + Math.floor(random() * 3) - 1;
            grid[by][bx] = '#';
        }
    }
}

// Long parallel ridge walls with seeded gaps: two-tile-wide halls that force
// real routing instead of maze wiggling. Orientation is seeded per chunk.
function applyCanyonLandform(grid, random) {
    const size = grid.length;
    const vertical = random() < 0.5;
    for (let y = 1; y < size - 1; y++) {
        for (let x = 1; x < size - 1; x++) grid[y][x] = '.';
    }
    for (let line = 4; line < size - 2; line += 4) {
        for (let i = 1; i < size - 1; i++) {
            if (vertical) grid[i][line] = '#';
            else grid[line][i] = '#';
        }
        // Two guaranteed gaps per ridge keep every hall connected.
        const gaps = 3 + Math.floor(random() * 2);
        for (let g = 0; g < gaps; g++) {
            const at = 1 + Math.floor(random() * (size - 3));
            for (const j of [at - 1, at, at + 1]) {
                if (j < 1 || j > size - 2) continue;
                if (vertical) grid[j][line] = '.';
                else grid[line][j] = '.';
            }
        }
    }
}

function countFloorCells(grid) {
    return grid.reduce((sum, row) => sum + row.filter((cell) => cell === '.').length, 0);
}

function findFloorCell(grid) {
    for (let y = 1; y < grid.length - 1; y += 1) {
        for (let x = 1; x < grid[y].length - 1; x += 1) {
            if (grid[y][x] === '.') return { x, y };
        }
    }
    return null;
}

function reachableFloorCells(grid) {
    const start = findFloorCell(grid);
    if (!start) return 0;
    const seen = new Set([`${start.x},${start.y}`]);
    const stack = [start];
    while (stack.length) {
        const { x, y } = stack.pop();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx;
            const ny = y + dy;
            const key = `${nx},${ny}`;
            if (ny < 0 || ny >= grid.length || nx < 0 || nx >= grid[ny].length || seen.has(key)) continue;
            if (grid[ny][nx] !== '.') continue;
            seen.add(key);
            stack.push({ x: nx, y: ny });
        }
    }
    return seen.size;
}

export function openMazeTerrain(grid, random, {
    plazaCount = 6,
    floorTarget = 0.76,
    minRadius = 2.2,
    maxRadius = 4.2,
    // Optional out-param: a Set that receives "x,y" keys for every wall cell
    // forming a carved plaza's boundary. The soften/fill passes below skip
    // these cells, and the caller can keep honoring the set through its own
    // later erosion passes (widen/trim) — otherwise the shaped silhouettes
    // carved here get blindly eaten back into blobs (wave-6 punch list §2c).
    protectedCells = null
} = {}) {
    const size = grid.length;
    if (size < 7) return 0;
    const halo = protectedCells instanceof Set ? protectedCells : new Set();

    let carved = 0;
    const carve = (x, y) => {
        if (x <= 0 || y <= 0 || x >= size - 1 || y >= size - 1) return;
        if (grid[y][x] !== '#') return;
        grid[y][x] = '.';
        carved += 1;
    };
    const floorCount = () => grid.slice(1, -1).reduce((sum, row) => (
        sum + row.slice(1, -1).filter((cell) => cell === '.').length
    ), 0);
    const floorCandidates = () => {
        const candidates = [];
        for (let y = 2; y < size - 2; y += 1) {
            for (let x = 2; x < size - 2; x += 1) {
                if (grid[y][x] === '.') candidates.push({ x, y });
            }
        }
        return candidates;
    };

    // Every plaza used to carve the same silhouette (an ellipse), so even a
    // generously-opened maze read as visually uniform — one blob shape
    // repeated everywhere. Picking a shape per plaza (still seeded, still
    // respecting the same radius/center roll) gives the layout real
    // room-to-room variety without touching density, floorTarget, or the
    // reachability guarantee below, which stay exactly as they were.
    const plazaShapeRoll = () => {
        const roll = random();
        if (roll < 0.4) return 'ellipse';
        if (roll < 0.7) return 'diamond';
        return 'cross';
    };

    for (let i = 0; i < plazaCount; i += 1) {
        const floors = floorCandidates();
        if (!floors.length) break;
        const center = floors[Math.floor(random() * floors.length)];
        const radiusX = minRadius + random() * (maxRadius - minRadius);
        const radiusY = minRadius + random() * (maxRadius - minRadius);
        const shape = plazaShapeRoll();
        const insideCells = new Set();
        for (let y = Math.floor(center.y - radiusY); y <= Math.ceil(center.y + radiusY); y += 1) {
            for (let x = Math.floor(center.x - radiusX); x <= Math.ceil(center.x + radiusX); x += 1) {
                const dx = (x - center.x) / radiusX;
                const dy = (y - center.y) / radiusY;
                let inside;
                if (shape === 'diamond') {
                    // Manhattan distance instead of Euclidean — a
                    // rotated-square silhouette, distinct from both the
                    // ellipse and the maze's own axis-aligned corridors.
                    inside = Math.abs(dx) + Math.abs(dy) <= 1;
                } else if (shape === 'cross') {
                    // Two overlapping perpendicular arms through the
                    // center — reads as a deliberate room, not a blob.
                    const armWidth = 0.42;
                    inside = (Math.abs(dx) <= armWidth && Math.abs(dy) <= 1)
                        || (Math.abs(dy) <= armWidth && Math.abs(dx) <= 1);
                } else {
                    inside = (dx * dx) + (dy * dy) <= 1;
                }
                if (inside) {
                    carve(x, y);
                    insideCells.add(`${x},${y}`);
                }
            }
        }
        // The silhouette only reads if the walls tracing it survive: every
        // wall cell 4-adjacent to this plaza's interior joins the protected
        // halo. Plaza-on-plaza overlap stays allowed (a later plaza may
        // carve into an earlier halo — compound rooms are deliberate); the
        // stale halo key is harmless since every later pass only acts on
        // cells that are still walls.
        for (const key of insideCells) {
            const [cx, cy] = key.split(',').map(Number);
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = cx + dx;
                const ny = cy + dy;
                if (nx < 1 || ny < 1 || nx >= size - 1 || ny >= size - 1) continue;
                const nKey = `${nx},${ny}`;
                if (!insideCells.has(nKey) && grid[ny][nx] === '#') halo.add(nKey);
            }
        }
    }

    const soften = grid.map((row) => [...row]);
    for (let y = 2; y < size - 2; y += 1) {
        for (let x = 2; x < size - 2; x += 1) {
            if (grid[y][x] !== '#') continue;
            if (halo.has(`${x},${y}`)) continue;
            const openNeighbors =
                (grid[y - 1][x] === '.') +
                (grid[y + 1][x] === '.') +
                (grid[y][x - 1] === '.') +
                (grid[y][x + 1] === '.');
            if (openNeighbors <= 0) continue;
            const chance = openNeighbors >= 3 ? 0.78 : openNeighbors === 2 ? 0.52 : 0.18;
            if (random() < chance) soften[y][x] = '.';
        }
    }
    for (let y = 1; y < size - 1; y += 1) {
        for (let x = 1; x < size - 1; x += 1) {
            if (grid[y][x] === '#' && soften[y][x] === '.') carve(x, y);
        }
    }

    const targetFloorCount = Math.floor((size - 2) * (size - 2) * floorTarget);
    let safety = size * size;
    while (floorCount() < targetFloorCount && safety > 0) {
        safety -= 1;
        const candidates = [];
        for (let y = 2; y < size - 2; y += 1) {
            for (let x = 2; x < size - 2; x += 1) {
                if (grid[y][x] !== '#') continue;
                if (halo.has(`${x},${y}`)) continue;
                const touchesFloor =
                    grid[y - 1][x] === '.' ||
                    grid[y + 1][x] === '.' ||
                    grid[y][x - 1] === '.' ||
                    grid[y][x + 1] === '.';
                if (touchesFloor) candidates.push({ x, y });
            }
        }
        if (!candidates.length) break;
        const pick = candidates[Math.floor(random() * candidates.length)];
        carve(pick.x, pick.y);
    }

    return carved;
}

function isCanyonGapCandidate(grid, x, y) {
    const left = grid[y]?.[x - 1];
    const right = grid[y]?.[x + 1];
    const up = grid[y - 1]?.[x];
    const down = grid[y + 1]?.[x];
    const verticalRidgeGap = left === '.' && right === '.' && (up === '#' || down === '#');
    const horizontalRidgeGap = up === '.' && down === '.' && (left === '#' || right === '#');
    return verticalRidgeGap || horizontalRidgeGap;
}

export function applyCanyonCollapse(grid, random, sealedGapCount = 3) {
    const target = Math.max(0, Math.floor(Number(sealedGapCount) || 0));
    if (target <= 0) return 0;
    const candidates = [];
    for (let y = 2; y < grid.length - 2; y += 1) {
        for (let x = 2; x < grid[y].length - 2; x += 1) {
            if (grid[y][x] === '.' && isCanyonGapCandidate(grid, x, y)) candidates.push({ x, y, sort: random() });
        }
    }
    candidates.sort((a, b) => a.sort - b.sort);

    let sealed = 0;
    for (const { x, y } of candidates) {
        if (sealed >= target) break;
        const floorBefore = countFloorCells(grid);
        grid[y][x] = '#';
        if (reachableFloorCells(grid) === floorBefore - 1) {
            sealed += 1;
        } else {
            grid[y][x] = '.';
        }
    }
    return sealed;
}

// A round open clearing ringed by a rim wall with cardinal breaches; the maze
// survives outside the rim. Natural arena — and a natural camp/boss stage.
function applyCraterLandform(grid, random) {
    const size = grid.length;
    const center = (size - 1) / 2;
    const innerRadius = 4.8;
    const rimRadius = 6.4;
    const gapPhase = random() * Math.PI * 2;
    for (let y = 1; y < size - 1; y++) {
        for (let x = 1; x < size - 1; x++) {
            const r = Math.hypot(x - center, y - center);
            if (r <= innerRadius) {
                grid[y][x] = '.';
            } else if (r <= rimRadius) {
                const angle = Math.atan2(y - center, x - center) - gapPhase;
                // Four breaches, one per quadrant.
                const nearest = Math.round(angle / (Math.PI / 2)) * (Math.PI / 2);
                grid[y][x] = Math.abs(angle - nearest) < 0.38 ? '.' : '#';
            }
        }
    }
}

// The maze with almost half its walls collapsed: broken rooms and rubble.
// The renderer biases these chunks toward damaged/toppled wall meshes.
function applyRuinsLandform(grid, random) {
    const size = grid.length;
    for (let y = 1; y < size - 1; y++) {
        for (let x = 1; x < size - 1; x++) {
            if (grid[y][x] === '#' && random() < 0.58) grid[y][x] = '.';
        }
    }
}

export function applyLandform(grid, landform, random) {
    switch (landform) {
        case LANDFORMS.FIELD: applyFieldLandform(grid, random); break;
        case LANDFORMS.CANYON: applyCanyonLandform(grid, random); break;
        case LANDFORMS.CRATER: applyCraterLandform(grid, random); break;
        case LANDFORMS.RUINS: applyRuinsLandform(grid, random); break;
        default: break;
    }
    return grid;
}

// Portals are punched two cells deep into the border after the landform
// transform, so a ridge or rim can sit flush behind the opening. From each
// portal, carve a straight tunnel starting past the two-cell stub until the
// lane reaches open floor. Portals that already open into floor are no-ops.
export function connectPortalsInward(grid) {
    const size = grid.length;
    const carveInward = (x, y, dx, dy) => {
        let cx = x;
        let cy = y;
        while (cx > 0 && cx < size - 1 && cy > 0 && cy < size - 1 && grid[cy][cx] === '#') {
            grid[cy][cx] = '.';
            cx += dx;
            cy += dy;
        }
    };
    for (let i = 1; i < size - 1; i++) {
        if (grid[0][i] === '.') carveInward(i, 2, 0, 1);
        if (grid[size - 1][i] === '.') carveInward(i, size - 3, 0, -1);
        if (grid[i][0] === '.') carveInward(2, i, 1, 0);
        if (grid[i][size - 1] === '.') carveInward(size - 3, i, -1, 0);
    }
    return grid;
}

export const TERRAIN_HEIGHTS = Object.freeze({
    GROUND: 0,
    TERRACE: 1.5,
    HIGH_PLATEAU: 3.0
});

export function generateHeightmapGrid(grid, landform = LANDFORMS.MAZE, random = Math.random) {
    const size = grid.length;
    const heightmap = Array.from({ length: size }, () => Array(size).fill(TERRAIN_HEIGHTS.GROUND));

    for (let y = 1; y < size - 1; y++) {
        for (let x = 1; x < size - 1; x++) {
            if (grid[y][x] === '#') {
                if (landform === LANDFORMS.CANYON) {
                    heightmap[y][x] = TERRAIN_HEIGHTS.TERRACE;
                } else if (landform === LANDFORMS.CRATER) {
                    const center = (size - 1) / 2;
                    const r = Math.hypot(x - center, y - center);
                    heightmap[y][x] = r > 4.8 ? TERRAIN_HEIGHTS.HIGH_PLATEAU : TERRAIN_HEIGHTS.TERRACE;
                } else if (landform === LANDFORMS.RUINS) {
                    heightmap[y][x] = random() < 0.4 ? TERRAIN_HEIGHTS.TERRACE : TERRAIN_HEIGHTS.GROUND;
                } else {
                    heightmap[y][x] = TERRAIN_HEIGHTS.TERRACE;
                }
            } else {
                if (landform === LANDFORMS.FIELD && (x <= 3 || x >= size - 4 || y <= 3 || y >= size - 4)) {
                    heightmap[y][x] = random() < 0.35 ? TERRAIN_HEIGHTS.TERRACE : TERRAIN_HEIGHTS.GROUND;
                }
            }
        }
    }
    return heightmap;
}

