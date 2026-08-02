import { describe, expect, it } from 'vitest';
import { SOCKET, TILE_SIZE, TILE_CATALOG, rotatePatternCW, rotateSocketsCW, rotateAnchorsCW, oppositeSide } from './tileCatalog.js';

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

describe('rotateAnchorsCW', () => {
    it('transforms anchor coordinates 90 degrees CW within the tile grid', () => {
        const anchors = [
            { id: 'center', x: 3, y: 3 },
            { id: 'top-left', x: 1, y: 1 }
        ];
        expect(rotateAnchorsCW(anchors)).toEqual([
            { id: 'center', x: (TILE_SIZE - 1) - 3, y: 3 },
            { id: 'top-left', x: (TILE_SIZE - 1) - 1, y: 1 }
        ]);
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
        // An edge lane is now the shared pit between two island tiles; an
        // OPEN3 side breaks it with the 3-wide causeway deck.
        const pad = (TILE_SIZE - 3) / 2;
        const OPEN3_ROW = 'X'.repeat(pad) + '...' + 'X'.repeat(pad);
        const LADDER_ROW = OPEN3_ROW;
        const CLOSED_ROW = 'X'.repeat(TILE_SIZE);
        const SOLID_ROW = '#'.repeat(TILE_SIZE);
        for (const tile of TILE_CATALOG) {
            const northRow = tile.pattern[0];
            const southRow = tile.pattern[TILE_SIZE - 1];
            const westCol = tile.pattern.map((row) => row[0]).join('');
            const eastCol = tile.pattern.map((row) => row[TILE_SIZE - 1]).join('');

            const isOpen = (side) => (
                tile.sockets[side] === SOCKET.OPEN3 ||
                tile.elevationSockets?.ground?.[side] === SOCKET.OPEN3 ||
                tile.elevationSockets?.elevated?.[side] === SOCKET.OPEN3
            );

            const expectedRow = (side) => {
                // A tile closed on every side is solid rock, with no pit lane at all.
                const anyOpen = ['n','e','s','w'].some(isOpen);
                if (!anyOpen) return SOLID_ROW;
                if (!isOpen(side)) return CLOSED_ROW;
                return tile.category === 'ladder' ? LADDER_ROW : OPEN3_ROW;
            };

            expect(northRow, `${tile.id} north`).toBe(expectedRow('n'));
            expect(southRow, `${tile.id} south`).toBe(expectedRow('s'));
            expect(westCol, `${tile.id} west`).toBe(expectedRow('w'));
            expect(eastCol, `${tile.id} east`).toBe(expectedRow('e'));
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

    it('every tile has a positive weight and valid population metadata', () => {
        for (const tile of TILE_CATALOG) {
            expect(tile.weight, tile.id).toBeGreaterThan(0);
            expect(tile.roomRole, tile.id).toBeTruthy();
            expect(tile.decorationSet, tile.id).toBeTruthy();
            expect(tile.populationBudget, tile.id).toBeDefined();
            expect(Array.isArray(tile.anchors), tile.id).toBe(true);
        }
    });

    it('provides multiple canyon-lined traversal geometries', () => {
        const canyonTiles = TILE_CATALOG.filter((tile) => tile.category === 'canyon-walkway');
        expect(canyonTiles.length).toBeGreaterThanOrEqual(8);
        expect(canyonTiles.some((tile) => tile.id.startsWith('canyon-walkway-turn'))).toBe(true);
        expect(canyonTiles.some((tile) => tile.id.startsWith('canyon-split-bridge'))).toBe(true);
    });
});
