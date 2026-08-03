import { describe, expect, it } from 'vitest';
import { generateArchitecturalMazeChunk } from './architecturalMaze.js';

function seeded(values) {
    let index = 0;
    return () => values[index++ % values.length];
}

describe('generateArchitecturalMazeChunk', () => {
    it('makes a large room surrounded by a wall shell and actual canyon', () => {
        const result = generateArchitecturalMazeChunk(seeded([0.2, 0.7, 0.4]), {
            roomMode: true,
            openings: { north: { open: true, offset: 4 } }
        });
        expect(result.room.interior.length).toBeGreaterThan(70);
        expect(result.grid.flat().filter((cell) => cell === 'X').length).toBeGreaterThan(40);
        expect(result.grid.flat()).toContain('#');
        expect(result.room.doors.length).toBeGreaterThan(0);
        expect(result.room.doors[0].cells).toHaveLength(3);
        expect(result.room.doors[0].side).toBe('n');
        for (const cell of result.room.doors[0].cells) {
            expect(result.grid[cell.y][cell.x]).toBe('D');
        }
        expect(result.grid[0]).toContain('.');
    });

    it('records correctly facing doors wherever a hallway enters a room', () => {
        const { grid, room } = generateArchitecturalMazeChunk(seeded([0.8, 0.2, 0.9, 0.1]), {
            openings: {
                west: { open: true, offset: 2 },
                east: { open: true, offset: 7 }
            }
        });
        expect(room.doors.length).toBeGreaterThanOrEqual(2);
        for (const door of room.doors) {
            expect(door.cells).toHaveLength(3);
            expect(['n', 'e', 's', 'w']).toContain(door.side);
            for (const cell of door.cells) expect(grid[cell.y][cell.x]).toBe('D');
            if (door.side === 'n' || door.side === 's') {
                expect(new Set(door.cells.map((cell) => cell.y)).size).toBe(1);
            } else {
                expect(new Set(door.cells.map((cell) => cell.x)).size).toBe(1);
            }
        }
    });

    it('makes long bent canyon-separated connectors for traversal chunks', () => {
        const { grid, room } = generateArchitecturalMazeChunk(seeded([0.8, 0.2, 0.9, 0.1]), {
            openings: {
                west: { open: true, offset: 2 },
                east: { open: true, offset: 7 }
            }
        });
        expect(grid[5][0]).toBe('.');
        expect(grid[15][18]).toBe('.');
        expect(grid.flat().filter((cell) => cell === '.').length).toBeGreaterThan(45);
        expect(grid.flat().filter((cell) => cell === 'X').length).toBeGreaterThan(100);
        expect(room?.interior.length).toBeGreaterThan(20);
    });

    it('keeps every chunk seam canyon except declared three-wide hallway sockets', () => {
        const { grid } = generateArchitecturalMazeChunk(seeded([0.8, 0.2, 0.9, 0.1]), {
            openings: {
                north: { open: true, offset: 4 },
                east: { open: true, offset: 6 }
            }
        });
        expect(grid[0].slice(8, 11)).toEqual(['.', '.', '.']);
        expect(grid[12].slice(16, 19)).toEqual(['.', '.', '.']);
        for (let i = 0; i < 19; i += 1) {
            if (i < 8 || i > 10) expect(grid[0][i]).not.toBe('.');
            expect(grid[18][i]).toBe('X');
            expect(grid[i][0]).toBe('X');
            if (i < 12 || i > 14) expect(grid[i][18]).not.toBe('.');
        }
        expect(grid[0].filter((cell) => cell === 'X').length).toBeGreaterThan(10);
        expect(grid.map((row) => row[18]).filter((cell) => cell === 'X').length).toBeGreaterThan(10);
    });
});
