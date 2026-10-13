import { describe, expect, it } from 'vitest';
import {
    doorPresentationForStyle,
    doorThresholdSupportCells,
    ensureDoorThresholdSupports,
    planProceduralDoors,
    restoreDoorStates,
    serializeDoorStates,
    stampDoorRecords,
    transitionDoorState,
    validateDoorThresholdSupports
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
            family: 'blast-slab',
            motion: 'sink-floor',
            frameStyle: 'reinforced-bulkhead',
            autoClose: true,
            cells: [{ x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 }]
        });
        expect(grid[6].slice(2, 5)).toEqual(['D', 'D', 'D']);
        expect(grid[6][1]).toBe('#');
        expect(grid[6][5]).toBe('#');
        expect(validateDoorThresholdSupports(grid, records[0]).valid).toBe(true);
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

    it('maps biome styles to distinct presentation families without changing door state', () => {
        expect(doorPresentationForStyle('hive')).toMatchObject({
            family: 'arch-guillotine',
            motion: 'retract-crown',
            materialVariant: 'organic'
        });
        expect(doorPresentationForStyle('cryo')).toMatchObject({
            family: 'split-bulkhead',
            motion: 'split-sideways'
        });
        expect(doorPresentationForStyle('camp')).toMatchObject({ family: 'camp-barricade' });
    });

    it('repairs both jamb supports for horizontal and vertical wide doors', () => {
        const grid = Array.from({ length: 9 }, () => Array(9).fill('.'));
        const horizontal = {
            orientation: 'horizontal', localY: 4,
            cells: [{ x: 3, y: 4 }, { x: 4, y: 4 }, { x: 5, y: 4 }]
        };
        const vertical = {
            orientation: 'vertical', localX: 7,
            cells: [{ x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }]
        };
        expect(doorThresholdSupportCells(horizontal)).toEqual([{ x: 2, y: 4 }, { x: 6, y: 4 }]);
        expect(doorThresholdSupportCells(vertical)).toEqual([{ x: 7, y: 2 }, { x: 7, y: 6 }]);
        expect(ensureDoorThresholdSupports(grid, horizontal).valid).toBe(true);
        expect(ensureDoorThresholdSupports(grid, vertical).valid).toBe(true);
        expect([grid[4][2], grid[4][6], grid[2][7], grid[6][7]]).toEqual(['#', '#', '#', '#']);
    });
});
