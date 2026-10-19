import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE } from './tileCatalog.js';
import { CRASH_SITE_BUILD } from './data/crashSiteBuild.js';
import {
    crashSiteClearCells,
    stampCrashSiteApproach,
    stampCrashSiteOrigin,
    validateCrashSiteConnection,
    validateCrashSiteRooms
} from './crashSiteBuild.js';

const blank = (tile = 'X') => Array.from({ length: CHUNK_SIZE }, () => Array(CHUNK_SIZE).fill(tile));

describe('two-zone crash site build', () => {
    it('stamps a shell-bounded 29 by 26 origin chamber with one centered north socket and solid south wall', () => {
        const grid = blank('.');
        expect(stampCrashSiteOrigin(grid)).toBe(true);
        const room = CRASH_SITE_BUILD.primaryChamber;
        expect(room.right - room.left + 1).toBe(29);
        expect(room.bottom - room.top + 1).toBe(26);
        expect(grid[room.top].slice(room.left, room.right + 1).every((tile) => tile === '.')).toBe(true);
        expect(grid[0].slice(8, 11)).toEqual(['.', '.', '.']);
        expect(grid[0][7]).toBe('#');
        expect(grid[0][11]).toBe('#');
        expect(grid[1].slice(7, 12)).toEqual(['.', '.', '.', '.', '.']);
        expect(grid[1][6]).toBe('#');
        expect(grid[1][12]).toBe('#');
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
        const room = CRASH_SITE_BUILD.serviceApproach.releaseBounds;
        expect(grid[CRASH_SITE_BUILD.serviceApproach.hub.y].slice(room.left, room.right + 1).every((tile) => tile === '.')).toBe(true);
        expect(metadata.wayfindingMarkers.length).toBeGreaterThanOrEqual(3);
        expect(metadata.wayfindingMarkers.at(-1).landmark).toBe(true);
        expect((CHUNK_SIZE - 1) - CRASH_SITE_BUILD.serviceApproach.hub.y).toBeLessThanOrEqual(10);
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

    it('keeps every named room and the ship O2 module connected to the wreck', () => {
        const origin = blank('.');
        stampCrashSiteOrigin(origin);
        expect(validateCrashSiteRooms(origin)).toEqual({ valid: true, reason: null });

        const armory = CRASH_SITE_BUILD.sectorZero.rooms.find(({ id }) => id === 'pod_armory');
        const armoryCenter = {
            x: Math.round((armory.left + armory.right) / 2),
            y: Math.round((armory.top + armory.bottom) / 2)
        };
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            origin[armoryCenter.y + dy][armoryCenter.x + dx] = '#';
        }
        expect(validateCrashSiteRooms(origin)).toMatchObject({
            valid: false,
            reason: 'authored-room-unreachable',
            targetId: 'pod_armory'
        });
    });

    it('authors all four supply families and one encounter in the first post-hall room', () => {
        const approach = CRASH_SITE_BUILD.serviceApproach;
        expect(approach.supplies.map(({ type }) => type).sort()).toEqual(['ammo', 'coin', 'health', 'weapon']);
        for (const target of [...approach.supplies, approach.encounter]) {
            expect(target.localX).toBeGreaterThanOrEqual(approach.releaseBounds.left);
            expect(target.localX).toBeLessThanOrEqual(approach.releaseBounds.right);
            expect(target.localY).toBeGreaterThanOrEqual(approach.releaseBounds.top);
            expect(target.localY).toBeLessThanOrEqual(approach.releaseBounds.bottom);
        }
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
        for (let y = CRASH_SITE_BUILD.northPreHall.top + 1; y <= CRASH_SITE_BUILD.clearManeuverLane.toZ; y += 1) {
            expect(cells.has(`${x},${y}`), `centre ${x},${y}`).toBe(true);
            expect(cells.has(`${x - 1},${y}`), `west ${x - 1},${y}`).toBe(true);
            expect(cells.has(`${x + 1},${y}`), `east ${x + 1},${y}`).toBe(true);
            expect(cells.has(`${x - 2},${y}`), `outer west ${x - 2},${y}`).toBe(true);
            expect(cells.has(`${x + 2},${y}`), `outer east ${x + 2},${y}`).toBe(true);
        }
        expect(cells.has(`${x - 2},${CRASH_SITE_BUILD.northPreHall.top}`)).toBe(false);
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

    it('declares a five-cell maneuver lane and half-grid construction sockets', () => {
        expect(CRASH_SITE_BUILD.clearManeuverLane.halfWidth * 2 + 1).toBe(5);
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
        expect(grid[20][8]).toBe('#');
        expect(grid[23][8]).toBe('.');
        expect(grid[17].slice(7, 12)).toEqual(['.', '.', '.', '.', '.']);
    });

    it('keeps an obstacle-free 11 by 11 maneuver envelope around the ship', () => {
        const grid = blank('.');
        stampCrashSiteOrigin(grid);
        const { x: centerX, z: centerZ } = CRASH_SITE_BUILD.center;
        const solidProps = CRASH_SITE_BUILD.sectorZero.props.filter(({ solid }) => solid);

        for (let y = centerZ - 5; y <= centerZ + 5; y += 1) {
            for (let x = centerX - 5; x <= centerX + 5; x += 1) {
                expect(grid[y][x], `ship clearance ${x},${y}`).toBe('.');
                expect(
                    solidProps.some((prop) => Math.round(prop.x) === x && Math.round(prop.z) === y),
                    `solid prop at ${x},${y}`
                ).toBe(false);
            }
        }
    });

    it('keeps both O2 fixtures in the authored impact room', () => {
        const room = CRASH_SITE_BUILD.sectorZero.rooms.find(({ id }) => id === CRASH_SITE_BUILD.shipSystems.roomId);
        const shipO2 = {
            x: CRASH_SITE_BUILD.center.x + CRASH_SITE_BUILD.shipSystems.o2ModuleOffset.x,
            z: CRASH_SITE_BUILD.center.z + CRASH_SITE_BUILD.shipSystems.o2ModuleOffset.z
        };
        const berthO2 = CRASH_SITE_BUILD.constructionSockets.find(({ id }) => id === 'first-bed');
        for (const fixture of [shipO2, berthO2]) {
            expect(fixture.x).toBeGreaterThanOrEqual(room.left);
            expect(fixture.x).toBeLessThanOrEqual(room.right);
            expect(fixture.z).toBeGreaterThanOrEqual(room.top);
            expect(fixture.z).toBeLessThanOrEqual(room.bottom);
        }
    });

    it('places partitions outside the ship safe ring and gives every partition opening five cells', () => {
        const { x: centerX, z: centerZ } = CRASH_SITE_BUILD.center;
        for (const partition of CRASH_SITE_BUILD.sectorZero.partitions) {
            const crossesEnvelope = partition.axis === 'vertical'
                ? partition.at >= centerX - 5 && partition.at <= centerX + 5
                    && partition.to >= centerZ - 5 && partition.from <= centerZ + 5
                : partition.at >= centerZ - 5 && partition.at <= centerZ + 5
                    && partition.to >= centerX - 5 && partition.from <= centerX + 5;
            expect(crossesEnvelope).toBe(false);

            const openingRuns = [];
            let run = [];
            for (let cursor = partition.from; cursor <= partition.to + 1; cursor += 1) {
                if (partition.openings.includes(cursor)) run.push(cursor);
                else if (run.length) {
                    openingRuns.push(run);
                    run = [];
                }
            }
            expect(openingRuns.every((opening) => opening.length >= 5)).toBe(true);
        }
    });

    it('keeps each authored prop inside its named room and off the five-cell through-route', () => {
        const rooms = new Map(CRASH_SITE_BUILD.sectorZero.rooms.map((room) => [room.id, room]));
        const lane = CRASH_SITE_BUILD.clearManeuverLane;
        for (const prop of CRASH_SITE_BUILD.sectorZero.props) {
            const room = rooms.get(prop.roomId);
            expect(room, `${prop.id} room`).toBeDefined();
            expect(prop.x, `${prop.id} x`).toBeGreaterThanOrEqual(room.left);
            expect(prop.x, `${prop.id} x`).toBeLessThanOrEqual(room.right);
            expect(prop.z, `${prop.id} z`).toBeGreaterThanOrEqual(room.top);
            expect(prop.z, `${prop.id} z`).toBeLessThanOrEqual(room.bottom);
            if (prop.solid && prop.z >= lane.fromZ && prop.z <= lane.toZ) {
                expect(Math.abs(prop.x - lane.centerX), `${prop.id} route clearance`).toBeGreaterThan(lane.halfWidth);
            }
        }
    });

    it('keeps tutorial guidance targets synchronized with relocated objectives', () => {
        const layout = CRASH_SITE_BUILD.sectorZero;
        const cable = layout.props.find(({ id }) => id === 'jammed_hydraulic_cable');
        expect(layout.jammedCablePosition).toEqual({ x: cable.x, z: cable.z });
        expect(layout.salvageCachePosition).toEqual({ x: layout.salvageCache.x, z: layout.salvageCache.z });
        expect(layout.combatSpawnPosition).toEqual({ x: layout.combatSpawn.x, z: layout.combatSpawn.z });
    });
});
