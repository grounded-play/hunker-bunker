import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE } from './tileCatalog.js';
import { CRASH_SITE_BUILD } from './data/crashSiteBuild.js';
import { stampCrashSiteApproach, stampCrashSiteOrigin, validateCrashSiteConnection } from './crashSiteBuild.js';

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
        // A generated south opening at the wrong offset must not satisfy the
        // authored portal shared with the origin chunk.
        grid[CHUNK_SIZE - 1][19] = '.';
        grid[9][0] = '.';
        const metadata = stampCrashSiteApproach(grid);

        expect(metadata).toMatchObject({ generatorId: 'crash-site-approach', width: 7 });
        expect(grid[CHUNK_SIZE - 1][9]).toBe('.');
        expect(metadata.sharedPortals[0].cells).toEqual([
            { x: 8, y: CHUNK_SIZE - 1 },
            { x: 9, y: CHUNK_SIZE - 1 },
            { x: 10, y: CHUNK_SIZE - 1 }
        ]);
        expect(grid[9][0]).toBe('.');
        expect(grid[10].slice(6, 13).every((tile) => tile === '.')).toBe(true);
        expect(metadata.wayfindingMarkers.length).toBeGreaterThanOrEqual(3);
        expect(metadata.wayfindingMarkers.at(-1).landmark).toBe(true);
    });

    it('validates one continuous shared route from the crash room into the approach hub', () => {
        const origin = blank('.');
        const approach = blank('X');
        stampCrashSiteOrigin(origin);
        stampCrashSiteApproach(approach);
        expect(validateCrashSiteConnection(origin, approach)).toEqual({ valid: true, reason: null });

        approach[CHUNK_SIZE - 1][CRASH_SITE_BUILD.center.x] = 'X';
        expect(validateCrashSiteConnection(origin, approach)).toMatchObject({
            valid: false,
            reason: 'shared-socket-blocked'
        });
    });

    it('declares a four-meter maneuver lane and half-grid construction sockets', () => {
        expect(CRASH_SITE_BUILD.clearManeuverLane.halfWidth * 2).toBe(4);
        for (const socket of CRASH_SITE_BUILD.constructionSockets) {
            expect(socket.x * 2).toBe(Math.round(socket.x * 2));
            expect(socket.z * 2).toBe(Math.round(socket.z * 2));
        }
    });
});
