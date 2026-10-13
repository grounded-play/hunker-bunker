const WALKABLE = new Set(['.', 'D', 'R', 'B', 'L']);

export const WALL_RUN_SILHOUETTES = Object.freeze([
    'straight',
    'inset-service',
    'buttress',
    'stepped-top',
    'tall-spine'
]);

const keyOf = (x, y) => `${x},${y}`;
const isWalkable = (grid, x, y) => WALKABLE.has(grid?.[y]?.[x]);

function exposedFace(grid, x, y) {
    if (grid?.[y]?.[x] !== '#') return null;
    const open = {
        n: isWalkable(grid, x, y - 1),
        e: isWalkable(grid, x + 1, y),
        s: isWalkable(grid, x, y + 1),
        w: isWalkable(grid, x - 1, y)
    };
    const count = Object.values(open).filter(Boolean).length;
    if (count !== 1) return null;
    if (open.n) return { axis: 'x', facing: 'n', inwardNormal: { x: 0, z: -1 } };
    if (open.s) return { axis: 'x', facing: 's', inwardNormal: { x: 0, z: 1 } };
    if (open.w) return { axis: 'z', facing: 'w', inwardNormal: { x: -1, z: 0 } };
    return { axis: 'z', facing: 'e', inwardNormal: { x: 1, z: 0 } };
}

function splitLengths(total, phase = 0) {
    const pattern = [4, 3, 2, 3];
    const lengths = [];
    let remaining = total;
    let cursor = Math.abs(Math.floor(phase)) % pattern.length;
    while (remaining >= 2) {
        let length = Math.min(pattern[cursor % pattern.length], remaining);
        if (remaining - length === 1) length -= 1;
        if (length < 2) break;
        lengths.push(length);
        remaining -= length;
        cursor += 1;
    }
    return { lengths, remainder: remaining };
}

function silhouetteFor(segmentIndex, x, y) {
    const hashed = Math.abs((x * 17) ^ (y * 31) ^ (segmentIndex * 13));
    return WALL_RUN_SILHOUETTES[hashed % WALL_RUN_SILHOUETTES.length];
}

/**
 * Finds straight, floor-facing wall frontage and partitions it into stable
 * 2–4-cell visual modules. Gameplay remains cell-authoritative: every output
 * segment carries the exact cells and keys beneath it.
 */
export function planWallRuns(grid, {
    eligibleCells = null,
    protectedCells = new Set(),
    groupForCell = () => 'default'
} = {}) {
    if (!Array.isArray(grid) || grid.length === 0) return { runs: [], coverage: null };
    const candidates = new Map();
    for (let y = 0; y < grid.length; y += 1) {
        for (let x = 0; x < (grid[y]?.length ?? 0); x += 1) {
            const key = keyOf(x, y);
            if (protectedCells.has(key) || (eligibleCells && !eligibleCells.has(key))) continue;
            const face = exposedFace(grid, x, y);
            if (!face) continue;
            candidates.set(key, { x, y, key, ...face, group: groupForCell(x, y) });
        }
    }

    const lanes = new Map();
    for (const cell of candidates.values()) {
        const fixed = cell.axis === 'x' ? cell.y : cell.x;
        const laneKey = `${cell.axis}:${cell.facing}:${cell.group}:${fixed}`;
        if (!lanes.has(laneKey)) lanes.set(laneKey, []);
        lanes.get(laneKey).push(cell);
    }

    const runs = [];
    const covered = new Set();
    const recentSilhouettes = [];
    for (const [laneKey, laneCells] of [...lanes.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        const along = laneCells[0].axis === 'x' ? 'x' : 'y';
        laneCells.sort((a, b) => a[along] - b[along]);
        let contiguous = [];
        const flush = () => {
            if (contiguous.length < 2) {
                contiguous = [];
                return;
            }
            const phase = contiguous[0].x + contiguous[0].y;
            const { lengths } = splitLengths(contiguous.length, phase);
            let offset = 0;
            lengths.forEach((length, segmentIndex) => {
                const cells = contiguous.slice(offset, offset + length);
                offset += length;
                const first = cells[0];
                const last = cells.at(-1);
                const id = `${laneKey}:${first.x},${first.y}-${last.x},${last.y}`;
                let silhouette = silhouetteFor(segmentIndex, first.x, first.y);
                if (recentSilhouettes.slice(-4).every((value) => value === silhouette)) {
                    silhouette = WALL_RUN_SILHOUETTES[(WALL_RUN_SILHOUETTES.indexOf(silhouette) + 1) % WALL_RUN_SILHOUETTES.length];
                }
                recentSilhouettes.push(silhouette);
                const segment = {
                    id,
                    axis: first.axis,
                    facing: first.facing,
                    inwardNormal: first.inwardNormal,
                    group: first.group,
                    length,
                    silhouette,
                    center: {
                        x: cells.reduce((sum, cell) => sum + cell.x, 0) / cells.length,
                        y: cells.reduce((sum, cell) => sum + cell.y, 0) / cells.length
                    },
                    cells: cells.map(({ x, y, key }) => ({ x, y, key }))
                };
                for (const cell of cells) covered.add(cell.key);
                runs.push(segment);
            });
            contiguous = [];
        };
        for (const cell of laneCells) {
            const previous = contiguous.at(-1);
            if (previous && cell[along] !== previous[along] + 1) flush();
            contiguous.push(cell);
        }
        flush();
    }

    const straightCells = candidates.size;
    return {
        runs,
        coverage: {
            straightCells,
            macroCells: covered.size,
            ratio: straightCells > 0 ? covered.size / straightCells : 0
        }
    };
}

export function wallRunMaterialFamily({ biome = 'active', roomStyle = null } = {}) {
    if (roomStyle === 'corporate') return 'corporate';
    if (roomStyle === 'camp') return 'camp';
    const normalized = String(biome).toLowerCase();
    if (normalized.includes('cryo')) return 'cryo';
    if (normalized.includes('bio') || normalized.includes('hive')) return 'bio';
    if (normalized.includes('chasm') || normalized.includes('canyon')) return 'chasm';
    return 'bunker';
}

export function wallRunFacadeSpec(run, { wallHeight = 2.8, heightScale = 1 } = {}) {
    if (!run || !(run.length >= 2)) return null;
    const silhouette = run.silhouette ?? 'straight';
    const profile = {
        straight: { height: 0.72, depth: 0.10, inset: 0.015 },
        'inset-service': { height: 0.5, depth: 0.07, inset: -0.025 },
        buttress: { height: 0.9, depth: 0.22, inset: 0.055 },
        'stepped-top': { height: 0.78, depth: 0.13, inset: 0.025 },
        'tall-spine': { height: 0.96, depth: 0.16, inset: 0.04 }
    }[silhouette] ?? { height: 0.72, depth: 0.10, inset: 0.015 };
    const availableHeight = wallHeight * Math.max(0.1, heightScale);
    const height = Math.min(availableHeight - 0.08, wallHeight * profile.height);
    const normalOffset = 0.5 + profile.depth * 0.5 + profile.inset;
    return {
        position: {
            x: run.center.x + run.inwardNormal.x * normalOffset,
            y: Math.max(0.08, height) / 2,
            z: run.center.y + run.inwardNormal.z * normalOffset
        },
        scale: run.axis === 'x'
            ? { x: run.length - 0.08, y: Math.max(0.08, height) / wallHeight, z: profile.depth }
            : { x: profile.depth, y: Math.max(0.08, height) / wallHeight, z: run.length - 0.08 }
    };
}
