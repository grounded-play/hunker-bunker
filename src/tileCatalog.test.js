import { describe, expect, it } from 'vitest';
import { SOCKET, TILE_SIZE, TILE_CATALOG, rotatePatternCW, rotateSocketsCW, oppositeSide } from './tileCatalog.js';

describe('rotatePatternCW', () => {
    it('rotates a 3x3 pattern 90 degrees clockwise', () => {
        const pattern = ['abc', 'def', 'ghi'];
        expect(rotatePatternCW(pattern)).toEqual(['gda', 'heb', 'ifc']);
    });
});

describe('rotateSocketsCW', () => {
    it('maps north<-west, east<-north, south<-east, west<-south', () => {
        const sockets = { n: 'A', e: 'B', s: 'C', w: 'D' };
        expect(rotateSocketsCW(sockets)).toEqual({ n: 'D', e: 'A', s: 'B', w: 'C' });
    });
});

describe('oppositeSide', () => {
    it('returns the opposite compass side', () => {
        expect(oppositeSide('n')).toBe('s');
        expect(oppositeSide('s')).toBe('n');
        expect(oppositeSide('e')).toBe('w');
        expect(oppositeSide('w')).toBe('e');
    });
});

describe('TILE_CATALOG self-consistency', () => {
    it('every tile pattern is TILE_SIZE x TILE_SIZE', () => {
        for (const tile of TILE_CATALOG) {
            expect(tile.pattern.length, tile.id).toBe(TILE_SIZE);
            for (const row of tile.pattern) expect(row.length, tile.id).toBe(TILE_SIZE);
        }
    });

    it('every declared socket matches the tile pattern border exactly', () => {
        const OPEN3_ROW = '##...##';
        const CLOSED_ROW = '#######';
        for (const tile of TILE_CATALOG) {
            const northRow = tile.pattern[0];
            const southRow = tile.pattern[TILE_SIZE - 1];
            const westCol = tile.pattern.map((row) => row[0]).join('');
            const eastCol = tile.pattern.map((row) => row[TILE_SIZE - 1]).join('');
            expect(northRow, `${tile.id} north`).toBe(tile.sockets.n === SOCKET.OPEN3 ? OPEN3_ROW : CLOSED_ROW);
            expect(southRow, `${tile.id} south`).toBe(tile.sockets.s === SOCKET.OPEN3 ? OPEN3_ROW : CLOSED_ROW);
            expect(westCol, `${tile.id} west`).toBe(tile.sockets.w === SOCKET.OPEN3 ? OPEN3_ROW : CLOSED_ROW);
            expect(eastCol, `${tile.id} east`).toBe(tile.sockets.e === SOCKET.OPEN3 ? OPEN3_ROW : CLOSED_ROW);
        }
    });

    it('has at least one tile CLOSED on all four sides', () => {
        expect(TILE_CATALOG.some((t) => Object.values(t.sockets).every((s) => s === SOCKET.CLOSED))).toBe(true);
    });

    it('has at least one tile OPEN3 on all four sides', () => {
        expect(TILE_CATALOG.some((t) => Object.values(t.sockets).every((s) => s === SOCKET.OPEN3))).toBe(true);
    });

    it('has no duplicate tile ids', () => {
        const ids = TILE_CATALOG.map((t) => t.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('every tile has a positive weight', () => {
        for (const tile of TILE_CATALOG) expect(tile.weight, tile.id).toBeGreaterThan(0);
    });
});
