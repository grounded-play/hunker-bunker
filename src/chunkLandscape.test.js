import { describe, expect, it } from 'vitest';
import {
    chunkSpaceMetrics,
    ensureRoomDoorAprons,
    sealRoomExteriorEdges,
    stampNaturalCrossing,
    validateRoomExteriorEnvelope
} from './chunkLandscape.js';

describe('chunk landscape contracts', () => {
    it('repairs a complete three-wide, three-deep exterior door apron', () => {
        const grid = Array.from({ length: 11 }, () => Array(11).fill('#'));
        const interior = [];
        for (let y = 5; y <= 7; y += 1) {
            for (let x = 3; x <= 5; x += 1) {
                grid[y][x] = '.';
                interior.push({ x, y });
            }
        }
        const room = { id: 'room', interior, doors: [{ id: 'north', side: 'n', cells: [{ x: 3, y: 4 }, { x: 4, y: 4 }, { x: 5, y: 4 }] }] };
        for (const cell of room.doors[0].cells) grid[cell.y][cell.x] = 'D';
        ensureRoomDoorAprons(grid, [room]);
        for (let y = 1; y <= 3; y += 1) expect(grid[y].slice(3, 6)).toEqual(['.', '.', '.']);
        expect(validateRoomExteriorEnvelope(grid, [room])).toEqual([]);
    });

    it('reports room floor that reaches a raw canyon edge', () => {
        const grid = Array.from({ length: 5 }, () => Array(5).fill('#'));
        grid[2][2] = '.';
        grid[2][3] = 'X';
        const errors = validateRoomExteriorEnvelope(grid, [{ id: 'bad', interior: [{ x: 2, y: 2 }], doors: [] }]);
        expect(errors).toEqual([expect.objectContaining({ type: 'room-opens-to-edge' })]);
        expect(sealRoomExteriorEdges(grid, [{ id: 'bad', interior: [{ x: 2, y: 2 }], doors: [] }])).toHaveLength(1);
        expect(grid[2][3]).toBe('#');
        expect(validateRoomExteriorEnvelope(grid, [{ id: 'bad', interior: [{ x: 2, y: 2 }], doors: [] }])).toEqual([]);
    });

    it('stamps one two-wide natural crossing between stable banks', () => {
        const grid = Array.from({ length: 8 }, () => Array(10).fill('#'));
        for (const y of [3, 4]) {
            grid[y][1] = 'O';
            grid[y][2] = 'C';
            grid[y][3] = 'X';
            grid[y][4] = 'X';
            grid[y][5] = 'C';
            grid[y][6] = 'O';
        }
        const bridge = stampNaturalCrossing(grid);
        expect(bridge).toMatchObject({ axis: 'horizontal', width: 2, family: 'stone' });
        expect(bridge.cells).toHaveLength(8);
        expect(bridge.cells.every(({ x, y }) => grid[y][x] === 'B')).toBe(true);
        expect(chunkSpaceMetrics(grid).bridge).toBe(8);
    });
});
