import { describe, expect, it } from 'vitest';
import {
    planProceduralDoors,
    restoreDoorStates,
    serializeDoorStates,
    stampDoorRecords,
    transitionDoorState
} from './proceduralDoors.js';

describe('procedural doors', () => {
    const room = {
        id: 'room',
        chunkKey: '0,1',
        role: 'security',
        themeConfig: { doorStyle: 'security' },
        doors: [{ id: 'door', side: 'n', cells: [{ x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 }] }]
    };

    it('plans from explicit room boundaries and stamps a blast-width threshold', () => {
        const records = planProceduralDoors([room], () => 0);
        const grid = Array.from({ length: 7 }, () => Array(7).fill('.'));
        stampDoorRecords(grid, records);
        expect(records[0]).toMatchObject({
            localX: 3,
            localY: 6,
            side: 'n',
            style: 'security',
            autoClose: true,
            cells: [{ x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 }]
        });
        expect(grid[6].slice(2, 5)).toEqual(['D', 'D', 'D']);
    });

    it('opens ordinary doors but denies unmet locked doors', () => {
        const ordinary = { state: 'closed', lock: null };
        expect(transitionDoorState(ordinary, 'toggle').state).toBe('open');
        const locked = { state: 'closed', lock: { type: 'power', id: 'grid' } };
        expect(transitionDoorState(locked, 'toggle', false).state).toBe('locked');
        expect(transitionDoorState(locked, 'toggle', true).state).toBe('open');
    });

    it('round-trips persistent door state', () => {
        const states = new Map([['door', { id: 'door', state: 'open', hp: 4 }]]);
        expect(restoreDoorStates(serializeDoorStates(states))).toEqual(states);
    });

    it('can guarantee a mission doorway in a blocker chunk', () => {
        const records = planProceduralDoors([room], () => 1, { forceAtLeastOne: true });
        expect(records).toHaveLength(1);
        expect(records[0].roomId).toBe(room.id);
    });
});
