import { describe, expect, it } from 'vitest';
import { planWallRuns, wallRunFacadeSpec, wallRunMaterialFamily } from './wallRunPlanner.js';

const rows = (...values) => values.map((row) => [...row]);

describe('semantic wall run planner', () => {
    it('covers long straight frontage with stable 2–4-cell modules', () => {
        const grid = rows(
            '##############',
            '..............',
            '##############'
        );
        const first = planWallRuns(grid);
        const second = planWallRuns(grid);
        expect(first).toEqual(second);
        expect(first.coverage.ratio).toBeGreaterThanOrEqual(0.65);
        expect(first.runs.every(({ length }) => length >= 2 && length <= 4)).toBe(true);
        expect(new Set(first.runs.flatMap(({ cells }) => cells.map(({ key }) => key))).size)
            .toBe(first.coverage.macroCells);
        expect(first.runs.every((run, index, all) => (
            index < 4 || all.slice(index - 4, index).some(({ silhouette }) => silhouette !== run.silhouette)
        ))).toBe(true);
    });

    it('breaks runs at protected cells and style boundaries while preserving cell ids', () => {
        const grid = rows('##########', '..........');
        const result = planWallRuns(grid, {
            protectedCells: new Set(['4,0']),
            groupForCell: (x) => x < 7 ? 'bunker' : 'cryo'
        });
        expect(result.runs.flatMap(({ cells }) => cells).some(({ key }) => key === '4,0')).toBe(false);
        expect(result.runs.every((run) => new Set(run.cells.map(({ x }) => x < 7 ? 'bunker' : 'cryo')).size === 1)).toBe(true);
        expect(result.runs.some(({ group }) => group === 'cryo')).toBe(true);
    });

    it('produces facade transforms and biome material families without changing collision cells', () => {
        const run = planWallRuns(rows('######', '......')).runs[0];
        const facade = wallRunFacadeSpec(run, { wallHeight: 2.8, heightScale: 1 });
        expect(facade.scale.x).toBeGreaterThan(1);
        expect(facade.scale.z).toBeLessThan(0.3);
        expect(run.cells).toHaveLength(run.length);
        expect(wallRunMaterialFamily({ biome: 'cryo' })).toBe('cryo');
        expect(wallRunMaterialFamily({ biome: 'bio' })).toBe('bio');
        expect(wallRunMaterialFamily({ biome: 'active' })).toBe('bunker');
    });
});
