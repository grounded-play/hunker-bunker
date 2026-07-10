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

// Weights lean on the biome fantasy: cryo reads as carved ice canyons, bio as
// overgrown clearings. Maze stays the most common everywhere so the landforms
// register as discoveries, not the default.
const LANDFORM_WEIGHTS = Object.freeze({
    active: Object.freeze({ maze: 0.42, field: 0.18, canyon: 0.14, crater: 0.14, ruins: 0.12 }),
    cryo: Object.freeze({ maze: 0.34, field: 0.10, canyon: 0.30, crater: 0.12, ruins: 0.14 }),
    bio: Object.freeze({ maze: 0.34, field: 0.26, canyon: 0.10, crater: 0.18, ruins: 0.12 })
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
    const clusters = 7 + Math.floor(random() * 5);
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
    for (let line = 3; line < size - 2; line += 3) {
        for (let i = 1; i < size - 1; i++) {
            if (vertical) grid[i][line] = '#';
            else grid[line][i] = '#';
        }
        // Two guaranteed gaps per ridge keep every hall connected.
        const gaps = 2 + Math.floor(random() * 2);
        for (let g = 0; g < gaps; g++) {
            const at = 1 + Math.floor(random() * (size - 3));
            for (const j of [at, at + 1]) {
                if (j < 1 || j > size - 2) continue;
                if (vertical) grid[j][line] = '.';
                else grid[line][j] = '.';
            }
        }
    }
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
            if (grid[y][x] === '#' && random() < 0.45) grid[y][x] = '.';
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
