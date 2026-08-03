import { describe, expect, it } from 'vitest';
import { normalizePopulationBudget, planRoomPopulation } from './roomPopulation.js';

describe('room population', () => {
    it('normalizes legacy numeric budgets', () => {
        expect(normalizePopulationBudget({ large: 1, small: 3, pickup: 1, enemy: 0 })).toEqual({
            signature: 1,
            large: { min: 1, max: 1 },
            small: { min: 3, max: 3 },
            pickup: { min: 1, max: 1 },
            enemy: { min: 0, max: 0 }
        });
    });

    it('always places a signature when a valid interior cell exists', () => {
        const room = {
            id: 'room',
            interior: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }],
            navigation: { doorLanes: [{ x: 2, y: 2 }] },
            populationBudget: { large: 0, small: 0, pickup: 0, enemy: 0 },
            themeConfig: { signatureProps: ['signature'] }
        };
        const grid = Array.from({ length: 7 }, () => Array(7).fill('#'));
        grid[2][2] = grid[2][3] = grid[2][4] = '.';
        const plan = planRoomPopulation(room, grid, () => 0);
        expect(plan.signaturePlaced).toBe(true);
        expect(plan.placements[0]).toMatchObject({ kind: 'signature', type: 'signature' });
        expect(plan.reserved).toContain('2,2');
    });

    it('adds guaranteed lived-in dressing without consuming the normal small-prop budget', () => {
        const room = {
            id: 'lived-in-room',
            interior: Array.from({ length: 6 }, (_, index) => ({ x: index + 1, y: 2 })),
            navigation: { doorLanes: [] },
            populationBudget: { large: 1, small: 3, pickup: 0, enemy: 0 },
            themeConfig: {
                signatureProps: ['signature'],
                largeProps: ['large'],
                smallProps: ['small'],
                ambientProps: ['decal_worker_sleep_roll']
            }
        };
        const grid = Array.from({ length: 5 }, () => Array(8).fill('#'));
        for (const cell of room.interior) grid[cell.y][cell.x] = '.';

        const plan = planRoomPopulation(room, grid, () => 0);

        expect(plan.placements.filter(({ kind }) => kind === 'ambient')).toEqual([
            expect.objectContaining({ type: 'decal_worker_sleep_roll', blocking: false })
        ]);
        expect(plan.placements.filter(({ kind }) => kind === 'small')).toHaveLength(3);
    });
});
