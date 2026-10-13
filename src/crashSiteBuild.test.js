import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE } from './tileCatalog.js';
import { CRASH_SITE_BUILD } from './data/crashSiteBuild.js';
import { stampCrashSiteApproach, stampCrashSiteOrigin } from './crashSiteBuild.js';

const blank = (tile = 'X') => Array.from({ length: CHUNK_SIZE }, () => Array(CHUNK_SIZE).fill(tile));

describe('two-zone crash site build', () => {
    it('stamps a shell-bounded 17 by 16 origin chamber with one centered north throat', () => {
        const grid = blank('.');
        expect(stampCrashSiteOrigin(grid)).toBe(true);
        const room = CRASH_SITE_BUILD.primaryChamber;
        expect(room.right - room.left + 1).toBe(17);
        expect(room.bottom - room.top + 1).toBe(16);
        expect(grid[room.top].slice(room.left, room.right + 1).every((tile) => tile === '.')).toBe(true);
        expect(grid[0].slice(8, 11)).toEqual(['.', '.', '.']);
        expect(grid[0][7]).toBe('#');
        expect(grid[0][11]).toBe('#');
    });

    it('turns the north neighbor into a seven-cell service hall and preserves required portals', () => {
        const grid = blank('X');
        grid[CHUNK_SIZE - 1][9] = '.';
        grid[9][0] = '.';
        const metadata = stampCrashSiteApproach(grid);

        expect(metadata).toMatchObject({ generatorId: 'crash-site-approach', width: 7 });
        expect(grid[CHUNK_SIZE - 1][9]).toBe('.');
        expect(grid[9][0]).toBe('.');
        expect(grid[10].slice(6, 13).every((tile) => tile === '.')).toBe(true);
        expect(metadata.wayfindingMarkers.length).toBeGreaterThanOrEqual(3);
        expect(metadata.wayfindingMarkers.at(-1).landmark).toBe(true);
    });

    it('declares a four-meter maneuver lane and half-grid construction sockets', () => {
        expect(CRASH_SITE_BUILD.clearManeuverLane.halfWidth * 2).toBe(4);
        for (const socket of CRASH_SITE_BUILD.constructionSockets) {
            expect(socket.x * 2).toBe(Math.round(socket.x * 2));
            expect(socket.z * 2).toBe(Math.round(socket.z * 2));
        }
    });
});
