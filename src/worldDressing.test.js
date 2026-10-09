import { describe, expect, it } from 'vitest';
import { DRESSING_TRIANGLES } from './data/dressingTriangles.js';
import { WORLD_3D_MODELS } from './world3dOverlay.js';
import { WORLD_DRESSING_LIMITS, planWorldDressing } from './worldDressing.js';

const SIZE = 31;
// A maze chunk: one long 3-wide hall running east-west with a dead end at
// the west, and a stub north.
function mazeGrid() {
    const rows = Array.from({ length: SIZE }, () => Array(SIZE).fill('#'));
    for (let y = 14; y <= 16; y += 1) for (let x = 3; x < SIZE; x += 1) rows[y][x] = '.';
    for (let y = 2; y < 14; y += 1) for (let x = 20; x <= 22; x += 1) rows[y][x] = '.';
    return rows.map((row) => row.join(''));
}
function fieldGrid() {
    return Array.from({ length: SIZE }, (_, y) => (y === 0 || y === SIZE - 1 ? '#'.repeat(SIZE) : `#${'.'.repeat(SIZE - 2)}#`));
}
function reachable(grid, blocked) {
    const open = (x, y) => grid[y]?.[x] === '.' && !blocked.has(`${x},${y}`);
    let start = null;
    for (let y = 0; y < SIZE && !start; y += 1) for (let x = 0; x < SIZE; x += 1) if (open(x, y)) { start = [x, y]; break; }
    const seen = new Set([start.join(',')]);
    const queue = [start];
    while (queue.length) {
        const [x, y] = queue.pop();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const key = `${x + dx},${y + dy}`;
            if (!seen.has(key) && open(x + dx, y + dy)) { seen.add(key); queue.push([x + dx, y + dy]); }
        }
    }
    return seen.size;
}

describe('planWorldDressing', () => {
    it('is the same for the same chunk and differs between chunks', () => {
        const a = planWorldDressing({ grid: mazeGrid(), size: SIZE, landform: 'maze', seed: '1,2' });
        expect(planWorldDressing({ grid: mazeGrid(), size: SIZE, landform: 'maze', seed: '1,2' })).toEqual(a);
        const seeds = new Set(['1,2', '3,4', '5,6', '7,8'].map((seed) => JSON.stringify(planWorldDressing({ grid: mazeGrid(), size: SIZE, landform: 'maze', seed }).items)));
        expect(seeds.size).toBeGreaterThan(1);
    });

    it('hangs fixtures on hall walls facing into the hall, inside the corridor budget', () => {
        let fixtures = 0;
        for (const seed of ['1,2', '3,4', '5,6']) {
            const plan = planWorldDressing({ grid: mazeGrid(), size: SIZE, landform: 'maze', seed });
            expect(plan.triangles).toBeLessThanOrEqual(WORLD_DRESSING_LIMITS.corridorTriangles);
            for (const item of plan.items.filter((entry) => entry.layer === 'wallProp')) {
                fixtures += 1;
                expect(mazeGrid()[item.supportCell.y][item.supportCell.x]).toBe('#');
                // The prop faces (sin yaw, cos yaw): straight away from its wall.
                const [cell] = item.cells;
                expect(Math.round(Math.sin(item.yaw)) + 0).toBe(cell.x - item.supportCell.x);
                expect(Math.round(Math.cos(item.yaw)) + 0).toBe(cell.y - item.supportCell.y);
            }
        }
        expect(fixtures).toBeGreaterThan(0);
    });

    it('never cuts a floor cell off, indoors or out', () => {
        for (const [grid, landform] of [[mazeGrid(), 'maze'], [fieldGrid(), 'field'], [fieldGrid(), 'canyon'], [fieldGrid(), 'crater']]) {
            for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
                const { items } = planWorldDressing({ grid, size: SIZE, landform, seed });
                const blocked = new Set(items.filter((item) => item.blocking)
                    .flatMap((item) => item.cells ?? [{ x: item.x, y: item.y }]).map((cell) => `${cell.x},${cell.y}`));
                const floorCells = grid.join('').split('').filter((tile) => tile === '.').length;
                expect(reachable(grid, blocked), `${landform} ${seed}`).toBe(floorCells - blocked.size);
            }
        }
    });

    it('puts a landform\'s own props outdoors, inside the outdoor budget', () => {
        const types = new Set();
        for (const seed of 'abcdefghij') {
            const plan = planWorldDressing({ grid: fieldGrid(), size: SIZE, landform: 'field', seed });
            expect(plan.triangles).toBeLessThanOrEqual(WORLD_DRESSING_LIMITS.outdoorTriangles);
            plan.items.forEach((item) => types.add(item.type));
        }
        expect([...types].every((type) => ['life_pipeline_trestle', 'life_seismic_drill', 'life_wind_mast', 'life_guide_rope_stakes', 'life_tarp_leanto'].includes(type))).toBe(true);
        expect(types.size).toBeGreaterThan(2);
    });

    it('keeps off cells something else already stands on', () => {
        const grid = fieldGrid().map((row) => row.replace(/\./g, 'P'));
        expect(planWorldDressing({ grid, size: SIZE, landform: 'field', seed: 'a' }).items).toEqual([]);
    });

    it('only places registered, counted models', () => {
        for (const landform of ['maze', 'field', 'canyon', 'crater', 'ruins']) {
            for (const seed of 'abcdef') {
                const grid = landform === 'maze' ? mazeGrid() : fieldGrid();
                for (const item of planWorldDressing({ grid, size: SIZE, landform, seed }).items) {
                    expect(WORLD_3D_MODELS[item.type], item.type).toBeDefined();
                    expect(DRESSING_TRIANGLES[item.type], item.type).toBeGreaterThan(0);
                }
            }
        }
    });
});

describe('planWorldDressing in mazes', () => {
    it('keeps corridor props off the open exterior ground', () => {
        const grid = Array.from({ length: SIZE }, (_, y) => (y < 10 ? 'O'.repeat(SIZE) : mazeGrid()[y]));
        for (const seed of 'abcdefgh') {
            for (const item of planWorldDressing({ grid, size: SIZE, landform: 'maze', seed }).items) {
                expect(grid[Math.round(item.y)][Math.round(item.x)], `${seed} ${item.type}`).toBe('.');
            }
        }
    });
});
