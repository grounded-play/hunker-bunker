import { describe, expect, it } from 'vitest';
import {
    doorPresentationForStyle,
    doorClearanceEnvelope,
    doorPassageCells,
    doorThresholdSupportCells,
    ensureDoorThresholdSupports,
    planProceduralDoors,
    portalKeyForDoorway,
    restoreDoorStates,
    resolveDoorMotionPose,
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
        const grid = Array.from({ length: 9 }, () => Array(9).fill('.'));
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
            clearBothSides: true,
            cells: [{ x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 }]
        });
        expect(grid[6].slice(2, 5)).toEqual(['D', 'D', 'D']);
        expect(grid[6][1]).toBe('#');
        expect(grid[6][5]).toBe('#');
        expect(validateDoorThresholdSupports(grid, records[0]).valid).toBe(true);
    });

    it('merges both room declarations of one physical opening into one portal', () => {
        const opposite = {
            ...room,
            id: 'hall',
            doors: [{ ...room.doors[0], id: 'hall-door', side: 's' }]
        };
        const records = planProceduralDoors([room, opposite], () => 0);
        expect(records).toHaveLength(1);
        expect(records[0].portalKey).toBe(portalKeyForDoorway(room, room.doors[0]));
        expect(records[0].roomIds).toEqual(['room', 'hall']);
        expect(records[0].doorwayIds).toEqual(['door', 'hall-door']);
    });

    it('repairs a structural cell directly behind a door and verifies both sides', () => {
        const [door] = planProceduralDoors([room], () => 0);
        const grid = Array.from({ length: 9 }, () => Array(9).fill('.'));
        grid[5][3] = '#';
        stampDoorRecords(grid, [door]);
        expect(doorPassageCells(door)).toEqual([{ x: 3, y: 5 }, { x: 3, y: 7 }]);
        expect(grid[5][3]).toBe('.');
        expect(door.clearBothSides).toBe(true);
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
            materialVariant: 'organic'
        });
        expect(doorPresentationForStyle('cryo')).toMatchObject({ family: 'split-bulkhead' });
        expect(doorPresentationForStyle('camp')).toMatchObject({ family: 'camp-barricade' });
    });

    // Owner, 2026-10-15: doors between rooms drop straight into the floor --
    // no hinge swing, no sideways split, no lift. The families still differ by
    // frame and material.
    it('opens every room door family by sinking it straight into the floor', () => {
        for (const style of ['bunker', 'security', 'utility', 'medical-seal', 'cryo', 'cryo-security', 'hive', 'resin', 'camp']) {
            expect(doorPresentationForStyle(style).motion, style).toBe('sink-floor');
        }
    });

    it('gives each built door a controller-height clearance envelope', () => {
        const [door] = planProceduralDoors([room], () => 0);
        expect(door.clearanceEnvelope).toEqual({
            minX: 1, maxX: 5, minY: 4, maxY: 8, playerHeight: 2.15
        });
        expect(doorClearanceEnvelope(door)).toEqual(door.clearanceEnvelope);
    });

    it('sinks a door in place, even one saved with an older swing, split or lift motion', () => {
        for (const motion of ['sink-floor', 'swing-fold', 'split-sideways', 'retract-crown', undefined]) {
            for (const orientation of ['horizontal', 'vertical']) {
                const open = resolveDoorMotionPose({ motion, orientation }, 1, { closedY: 2, openY: -4 });
                expect(open, `${motion} ${orientation}`).toEqual({ y: -4, yaw: 0, offsetX: 0, offsetZ: 0, spanScale: 1 });
            }
        }
        expect(resolveDoorMotionPose({ motion: 'sink-floor' }, 0.5, { closedY: 2, openY: -4 }).y).toBe(-1);
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
