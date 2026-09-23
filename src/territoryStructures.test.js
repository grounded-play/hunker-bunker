import { describe, expect, it } from 'vitest';
import { createTerritoryRoomBuild, TERRITORY_SITE_PROFILES } from './territoryStructures.js';
import { rotateRoomBuild, validateRoomBuild } from './roomBuilds.js';
import { buildWorldPlan, validateWorldPlan } from './ringManifest.js';
import { generateRadialMazeExpedition } from './mazeExpedition.js';
import { resolveAuthoredChunkStructure } from './authoredWorldRuntime.js';
import { CHUNK_SIZE } from './tileCatalog.js';
import { portalPoint } from './architecturalMaze.js';

const WALKABLE = new Set(['.', 'D', 'R', 'B', 'L']);
const SIDES = { '0,-1': 'north', '1,0': 'east', '0,1': 'south', '-1,0': 'west' };

function openingsFor(plan, reservation) {
    const openings = {};
    for (const edge of plan.topology.routeEdges) {
        const [a, b] = edge.split('|');
        const neighbor = a === reservation.chunkKey ? b : b === reservation.chunkKey ? a : null;
        if (!neighbor) continue;
        const [x, y] = neighbor.split(',').map(Number);
        openings[SIDES[`${x - reservation.chunkX},${y - reservation.chunkY}`]] = { open: true, offset: 8 };
    }
    return openings;
}

function connectedCells(grid, start) {
    const seen = new Set([`${start.x},${start.y}`]);
    const queue = [start];
    for (let i = 0; i < queue.length; i += 1) {
        const cell = queue[i];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const x = cell.x + dx;
            const y = cell.y + dy;
            const key = `${x},${y}`;
            if (seen.has(key) || !WALKABLE.has(grid[y]?.[x])) continue;
            seen.add(key);
            queue.push({ x, y });
        }
    }
    return seen;
}

describe('playable camp and hive territories', () => {
    it('materializes all six connected named chambers per site across the seed portfolio', () => {
        for (const seed of [1, 3, 33, 44, 91, 200, 8128, 65535]) {
            const plan = buildWorldPlan(generateRadialMazeExpedition(seed));
            expect(validateWorldPlan(plan)).toEqual({ valid: true, errors: [] });
            const structures = new Map();
            for (const territory of plan.territories) {
                const members = plan.reservations.filter((entry) => entry.territoryId === territory.id && !entry.conditional);
                expect(members).toHaveLength(6);
                expect(new Set(members.map((entry) => entry.territoryBeatKey)).size).toBe(6);
                for (const reservation of members) {
                    const openings = openingsFor(plan, reservation);
                    const result = resolveAuthoredChunkStructure(() => 0.5, plan, {
                        chunkX: reservation.chunkX, chunkY: reservation.chunkY, openings
                    });
                    expect(result.status, `${seed}: ${reservation.id}`).toBe('accepted');
                    expect(result.structure.rooms[0]).toMatchObject({
                        siteId: reservation.siteId, territoryBeatKey: reservation.territoryBeatKey
                    });
                    expect(result.structure.rooms[0].label).toContain(TERRITORY_SITE_PROFILES[reservation.siteId].label);
                    const center = result.structure.anchors.find((anchor) => anchor.id === 'territory_center');
                    expect(result.structure.grid[center.y][center.x]).toBe('.');
                    const reachable = connectedCells(result.structure.grid, center);
                    for (const [side, opening] of Object.entries(openings)) {
                        const portal = portalPoint(CHUNK_SIZE, side, opening.offset);
                        expect(reachable.has(`${portal.x},${portal.y}`), `${seed}: ${reservation.id} ${side}`).toBe(true);
                    }
                    // Connectivity is measured in final stamped floor, not
                    // merely inferred from the reciprocal socket metadata.
                    expect(reachable.size).toBe(result.structure.grid.flat().filter((cell) => WALKABLE.has(cell)).length);
                    structures.set(reservation.chunkKey, result.structure);
                }
            }
            for (const socket of plan.requiredChunkSockets) {
                const portal = portalPoint(CHUNK_SIZE, socket.side, 8);
                expect(structures.get(socket.ownerChunkKey).grid[portal.y][portal.x]).toBe('.');
            }
            const territoryChunks = new Set([...structures.keys()]);
            expect(plan.setpieceClaims.every((claim) => claim.chunkKeys.every((key) => !territoryChunks.has(key)))).toBe(true);
        }
    });

    it('varies approach cover by campaign seed while preserving identity and the safe central chamber', () => {
        const fingerprints = new Set();
        const variants = new Set();
        for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
            const plan = buildWorldPlan(generateRadialMazeExpedition(seed));
            const approach = plan.reservations.find((entry) => entry.id === 'room:camp_meridian:approach');
            const build = createTerritoryRoomBuild(approach);
            variants.add(approach.territoryVariant);
            fingerprints.add(build.pattern.join('\n'));
            expect(build.structuralAnchors[0].type).toBe('prop_camp_meridian_radio');
            expect(createTerritoryRoomBuild(JSON.parse(JSON.stringify(approach)))).toEqual(build);
            for (const siteId of Object.keys(TERRITORY_SITE_PROFILES)) {
                const heart = plan.reservations.find((entry) => entry.id === `territory:${siteId}`);
                const room = createTerritoryRoomBuild(heart);
                expect(room.safeZone).toBe(true);
                expect(room.contentBudget.enemiesMax).toBe(0);
                expect(room.encounterZones).toEqual([]);
                const centerX = Math.floor(room.pattern[0].length / 2);
                const centerY = Math.floor(room.pattern.length / 2);
                for (let dy = -7; dy <= 7; dy += 1) {
                    for (let dx = -7; dx <= 7; dx += 1) expect(room.pattern[centerY + dy][centerX + dx]).toBe('.');
                }
            }
        }
        expect(variants.size).toBe(3);
        expect(fingerprints.size).toBe(3);
    });

    it('keeps every authored layout valid through every supported rotation and variant', () => {
        const plan = buildWorldPlan(generateRadialMazeExpedition(3));
        const rooms = plan.reservations.filter((entry) => entry.territoryBeatKey && !entry.conditional);
        for (const room of rooms) {
            for (let variant = 0; variant < 3; variant += 1) {
                const build = createTerritoryRoomBuild({ ...room, territoryVariant: variant });
                for (let rotation = 0; rotation < 4; rotation += 1) {
                    expect(validateRoomBuild(rotateRoomBuild(build, rotation)), `${build.id} rotation ${rotation}`).toEqual([]);
                }
            }
        }
    });
});
