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
        expect(result.grid[0]).toContain('.');
    });

    it('makes long bent canyon-separated connectors for traversal chunks', () => {
        const { grid } = generateArchitecturalMazeChunk(seeded([0.8, 0.2, 0.9, 0.1]), {
            openings: {
                west: { open: true, offset: 2 },
                east: { open: true, offset: 7 }
            }
        });
        expect(grid[5][0]).toBe('.');
        expect(grid[15][18]).toBe('.');
        expect(grid.flat().filter((cell) => cell === '.').length).toBeGreaterThan(45);
        expect(grid.flat().filter((cell) => cell === 'X').length).toBeGreaterThan(100);
    });
});
