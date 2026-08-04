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

    it('caps ordinary rooms at two wall-biased props', () => {
        const room = {
            id: 'ordinary-room',
            role: 'generic',
            interior: Array.from({ length: 25 }, (_, index) => ({ x: index % 5 + 1, y: Math.floor(index / 5) + 1 })),
            navigation: { doorLanes: [] },
            populationBudget: { large: 1, small: 3, pickup: 0, enemy: 0 },
            themeConfig: {
                signatureProps: ['signature'],
                largeProps: ['large'],
                smallProps: ['small'],
                ambientProps: ['decal_worker_sleep_roll']
            }
        };
        const grid = Array.from({ length: 7 }, () => Array(7).fill('#'));
        for (const cell of room.interior) grid[cell.y][cell.x] = '.';

        const plan = planRoomPopulation(room, grid, () => 0);

        const props = plan.placements.filter(({ kind }) => kind !== 'pickup');
        expect(props).toHaveLength(2);
        expect(props.every(({ x, y }) => x === 1 || x === 5 || y === 1 || y === 5)).toBe(true);
        expect(plan.placements.some(({ kind }) => kind === 'small' || kind === 'ambient')).toBe(false);
    });

    it('places exactly three themed fixtures in medical rooms', () => {
        const room = {
            id: 'medical-room',
            role: 'medical',
            interior: Array.from({ length: 25 }, (_, index) => ({ x: index % 5 + 1, y: Math.floor(index / 5) + 1 })),
            navigation: { doorLanes: [] },
            populationBudget: { signature: 1, large: 3, small: 3, pickup: 0, enemy: 0 },
            themeConfig: {
                signatureProps: ['prop_medical_bed'],
                largeProps: ['prop_diagnostic_console', 'prop_surgical_cart', 'prop_specimen_tank'],
                smallProps: ['scatter_bolts']
            }
        };
        const grid = Array.from({ length: 7 }, () => Array(7).fill('#'));
        for (const cell of room.interior) grid[cell.y][cell.x] = '.';
        const plan = planRoomPopulation(room, grid, () => 0);

        expect(plan.placements.map(({ type }) => type)).toEqual([
            'prop_medical_bed', 'prop_diagnostic_console', 'prop_surgical_cart'
        ]);
        expect(plan.placements).toHaveLength(3);
    });

    it('respects reserved fixture cells and leaves the room center open', () => {
        const room = {
            id: 'fixture-room',
            role: 'generic',
            interior: Array.from({ length: 25 }, (_, index) => ({ x: index % 5 + 1, y: Math.floor(index / 5) + 1 })),
            navigation: { doorLanes: [{ x: 1, y: 1 }], reserved: [{ x: 1, y: 2 }, { x: 3, y: 3 }] },
            populationBudget: { large: 1, small: 3, pickup: 0, enemy: 0 },
            themeConfig: { signatureProps: ['signature'], largeProps: ['large'] }
        };
        const grid = Array.from({ length: 7 }, () => Array(7).fill('#'));
        for (const cell of room.interior) grid[cell.y][cell.x] = '.';
        const plan = planRoomPopulation(room, grid, () => 0);
        expect(plan.placements).not.toContainEqual(expect.objectContaining({ x: 1, y: 1 }));
        expect(plan.placements).not.toContainEqual(expect.objectContaining({ x: 1, y: 2 }));
        expect(plan.placements).not.toContainEqual(expect.objectContaining({ x: 3, y: 3 }));
    });

    it('guarantees an ammo cache in reward, storage, and security rooms', () => {
        const grid = Array.from({ length: 5 }, () => Array(8).fill('.'));
        for (const role of ['reward', 'storage', 'security']) {
            const room = {
                id: role,
                role,
                interior: Array.from({ length: 6 }, (_, index) => ({ x: index + 1, y: 2 })),
                navigation: { doorLanes: [] },
                populationBudget: { large: 0, small: 0, pickup: 0, enemy: 0 },
                themeConfig: { signatureProps: ['signature'] }
            };
            const plan = planRoomPopulation(room, grid, () => 0);
            expect(plan.placements).toContainEqual(expect.objectContaining({
                kind: 'ammo-cache', type: 'prop_bunker_supplies', blocking: true
            }));
        }
    });
});
