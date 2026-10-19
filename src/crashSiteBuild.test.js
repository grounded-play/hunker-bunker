import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE } from './tileCatalog.js';
import { CRASH_SITE_BUILD } from './data/crashSiteBuild.js';
import { crashSiteClearCells, stampCrashSiteApproach, stampCrashSiteOrigin, validateCrashSiteConnection } from './crashSiteBuild.js';

const blank = (tile = 'X') => Array.from({ length: CHUNK_SIZE }, () => Array(CHUNK_SIZE).fill(tile));

describe('two-zone crash site build', () => {
    it('stamps a shell-bounded 17 by 16 origin chamber with one centered north throat and solid south wall', () => {
        const grid = blank('.');
        expect(stampCrashSiteOrigin(grid)).toBe(true);
        const room = CRASH_SITE_BUILD.primaryChamber;
        expect(room.right - room.left + 1).toBe(17);
        expect(room.bottom - room.top + 1).toBe(16);
        expect(grid[room.top].slice(room.left, room.right + 1).every((tile) => tile === '.')).toBe(true);
        expect(grid[0].slice(8, 11)).toEqual(['.', '.', '.']);
        expect(grid[0][7]).toBe('#');
        expect(grid[0][11]).toBe('#');
        expect(grid[room.bottom + 1].slice(room.left, room.right + 1).every((tile) => tile === '#')).toBe(true);
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

    // 2026-10-14 playtest: the two border rows of the approach were stamped
    // after its wall shell, so the shared socket ran between walkable ledge
    // instead of walls. Both seam rows must keep a wall on each side.
    it('lines the shared socket with walls on both seam rows', () => {
        for (let variant = 0; variant < 4; variant += 1) {
            const grid = blank('X');
            stampCrashSiteApproach(grid, CRASH_SITE_BUILD, { variant });
            const x = CRASH_SITE_BUILD.center.x;
            for (const y of [CHUNK_SIZE - 1, CHUNK_SIZE - 2]) {
                expect(grid[y].slice(x - 1, x + 2), `variant ${variant} row ${y}`).toEqual(['.', '.', '.']);
                expect(grid[y][x - 2], `variant ${variant} row ${y} west`).toBe('#');
                expect(grid[y][x + 2], `variant ${variant} row ${y} east`).toBe('#');
            }
        }
    });

    // 2026-10-14 playtest: a random solid prop landed in the middle of the
    // three-cell exit hall behind the blast door.
    it('declares the exit hall, door row and maneuver lane as clear of dressing', () => {
        const cells = new Set(crashSiteClearCells().map(({ x, y }) => `${x},${y}`));
        const x = CRASH_SITE_BUILD.center.x;
        for (let y = CRASH_SITE_BUILD.northPreHall.top; y <= CRASH_SITE_BUILD.clearManeuverLane.toZ; y += 1) {
            expect(cells.has(`${x},${y}`), `centre ${x},${y}`).toBe(true);
            expect(cells.has(`${x - 1},${y}`), `west ${x - 1},${y}`).toBe(true);
            expect(cells.has(`${x + 1},${y}`), `east ${x + 1},${y}`).toBe(true);
        }
        expect(cells.has('2,10')).toBe(false);
    });

    it('varies the exterior approach footprint without moving its shared socket', () => {
        const signatures = [];
        for (let variant = 0; variant < 4; variant += 1) {
            const grid = blank('X');
            const metadata = stampCrashSiteApproach(grid, CRASH_SITE_BUILD, { variant });
            signatures.push(grid.map((row) => row.join('')).join('\n'));
            expect(metadata).toMatchObject({
                variant,
                architectural: { mode: 'crash-approach', variant }
            });
            expect(grid[CHUNK_SIZE - 1].slice(8, 11)).toEqual(['.', '.', '.']);
        }
        expect(new Set(signatures).size).toBe(4);
    });

    it('declares a four-meter maneuver lane and half-grid construction sockets', () => {
        expect(CRASH_SITE_BUILD.clearManeuverLane.halfWidth * 2).toBe(4);
        for (const socket of CRASH_SITE_BUILD.constructionSockets) {
            expect(socket.x * 2).toBe(Math.round(socket.x * 2));
            expect(socket.z * 2).toBe(Math.round(socket.z * 2));
        }
    });

    it('authors five readable Sector 0 rooms without blocking the centre route', () => {
        const grid = blank('.');
        stampCrashSiteOrigin(grid);
        const layout = CRASH_SITE_BUILD.sectorZero;

        expect(layout.rooms.map(({ id }) => id)).toEqual([
            'impact_cradle', 'pod_armory', 'salvage_bay', 'proving_ground', 'departure_airlock'
        ]);
        expect(layout.props.map(({ id }) => id)).toEqual(expect.arrayContaining([
            'sector_zero_pod_rack', 'jammed_hydraulic_cable', 'sector_zero_airlock'
        ]));
        for (let y = CRASH_SITE_BUILD.northPreHall.top; y <= CRASH_SITE_BUILD.clearManeuverLane.toZ; y += 1) {
            expect(grid[y][CRASH_SITE_BUILD.center.x], `centre route at y=${y}`).toBe('.');
        }
        expect(grid[9][5]).toBe('#');
        expect(grid[10][5]).toBe('.');
        expect(grid[6].slice(8, 11)).toEqual(['.', '.', '.']);
    });
});
