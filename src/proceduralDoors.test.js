import { describe, expect, it } from 'vitest';
import { planProceduralDoors, stampDoorRecords, transitionDoorState } from './proceduralDoors.js';

describe('procedural doors', () => {
    const room = {
        id: 'room',
        chunkKey: '0,1',
        role: 'security',
        themeConfig: { doorStyle: 'security' },
        doors: [{ id: 'door', side: 'n', cells: [{ x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 }] }]
    };

    it('plans from explicit room boundaries and stamps the center cell', () => {
        const records = planProceduralDoors([room], () => 0);
        const grid = Array.from({ length: 7 }, () => Array(7).fill('.'));
        stampDoorRecords(grid, records);
        expect(records[0]).toMatchObject({ localX: 3, localY: 6, style: 'security' });
        expect(grid[6][3]).toBe('D');
    });

    it('opens ordinary doors but denies unmet locked doors', () => {
        const ordinary = { state: 'closed', lock: null };
        expect(transitionDoorState(ordinary, 'toggle').state).toBe('open');
        const locked = { state: 'closed', lock: { type: 'power', id: 'grid' } };
        expect(transitionDoorState(locked, 'toggle', false).state).toBe('locked');
        expect(transitionDoorState(locked, 'toggle', true).state).toBe('open');
    });
});
