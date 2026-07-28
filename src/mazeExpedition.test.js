import { describe, expect, it } from 'vitest';
import {
    MAZE_EXPEDITION_EDGES,
    MAZE_EXPEDITION_NODES,
    MAZE_GENERATION_RULES,
    MAZE_ROOM_TILES,
    validateMazeExpedition
} from './mazeExpedition.js';

describe('long maze expedition plan', () => {
    it('has a valid guaranteed route from the O2 ship to the Queen', () => {
        expect(validateMazeExpedition()).toEqual({ valid: true, errors: [] });
    });

    it('keeps the O2 exit north-facing and the Queen deepest', () => {
        expect(MAZE_ROOM_TILES.o2_ship.doors).toEqual(['n']);
        expect(MAZE_ROOM_TILES.o2_ship.orientationLocked).toBe(true);
        const queen = MAZE_EXPEDITION_NODES.find((node) => node.id === 'queen_chamber');
        expect(queen.depth).toBe(Math.max(...MAZE_EXPEDITION_NODES.map((node) => node.depth)));
    });

    it('contains three camps, three hives, loops, and vertical travel', () => {
        expect(MAZE_EXPEDITION_NODES.filter((node) => node.kind === 'camp')).toHaveLength(3);
        expect(MAZE_EXPEDITION_NODES.filter((node) => node.kind === 'hive_threshold')).toHaveLength(3);
        expect(MAZE_EXPEDITION_EDGES.some((edge) => edge.kind === 'shortcut')).toBe(true);
        expect(MAZE_EXPEDITION_EDGES.some((edge) => edge.vertical)).toBe(true);
        expect(MAZE_GENERATION_RULES.canyonOutsideWalkableTiles).toBe(true);
    });

    it('rejects an accidental early Queen bypass or missing critical segment', () => {
        const broken = MAZE_EXPEDITION_EDGES.filter((edge) => (
            !(edge.from === 'final_shelter' && edge.to === 'queen_chamber')
        ));
        const result = validateMazeExpedition(MAZE_EXPEDITION_NODES, broken);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('queen_chamber is not on the guaranteed critical route');
    });
});
