import { describe, expect, it } from 'vitest';
import { buildGrammarRoomChunk } from './roomGrammarChunk.js';
import { portalPoint } from './architecturalMaze.js';

describe('room grammar chunk adapter', () => {
    it('connects all declared edge portals and preserves closed seams and final metadata', () => {
        const sides = ['north', 'east', 'south', 'west'];
        for (let seed = 0; seed < 24; seed += 1) for (let mask = 1; mask < 16; mask += 1) {
            const openings = Object.fromEntries(sides.map((s, i) => [s, { open: Boolean(mask & (1 << i)), offset: seed % 24 }]));
            const result = buildGrammarRoomChunk({ seed, openings, tier: seed % 2 ? 'major' : 'standard' });
            const floor = (x, y) => ['.', 'D'].includes(result.grid[y]?.[x]);
            const seen = new Set(), queue = [result.anchors[0]];
            while (queue.length) {
                const p = queue.pop(), k = `${p.x},${p.y}`;
                if (seen.has(k) || !floor(p.x, p.y)) continue;
                seen.add(k);
                for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) queue.push({ x: p.x + dx, y: p.y + dy });
            }
            const edgeCells = new Set();
            for (const side of sides.filter(s => openings[s].open)) {
                const p = portalPoint(49, side, openings[side].offset);
                expect(seen.has(`${p.x},${p.y}`)).toBe(true);
                for (const delta of [-1, 0, 1]) edgeCells.add(`${p.x + (side === 'north' || side === 'south' ? delta : 0)},${p.y + (side === 'east' || side === 'west' ? delta : 0)}`);
            }
            for (let i = 0; i < 49; i += 1) for (const [x, y] of [[i, 0], [i, 48], [0, i], [48, i]]) expect(floor(x, y)).toBe(edgeCells.has(`${x},${y}`));
            for (const p of [...result.rooms[0].interior, ...result.anchors]) expect(seen.has(`${p.x},${p.y}`)).toBe(true);
            for (const p of result.rooms[0].wallCells) expect(result.grid[p.y][p.x]).toBe('#');
        }
    });
    it('is reproducible after serialization and refuses incompatible dimensions', () => {
        const options = { seed: 5, chunkX: -2, chunkY: 3, openings: { east: { open: true, offset: 4 } } };
        expect(buildGrammarRoomChunk(JSON.parse(JSON.stringify(options)))).toEqual(buildGrammarRoomChunk(options));
        expect(buildGrammarRoomChunk({ seed: 1 })).toBeNull();
        expect(() => buildGrammarRoomChunk({ ...options, chunkSize: 19 })).toThrow();
    });
});
