import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
    createTerritoryRoomBuild,
    getTerritoryLocation,
    TERRITORY_BEAT_KEYS,
    TERRITORY_SITE_PROFILES
} from './territoryStructures.js';
import { rotateRoomBuild, validateRoomBuild } from './roomBuilds.js';
import { buildWorldPlan, validateWorldPlan } from './ringManifest.js';
import { generateRadialMazeExpedition, LEGACY_ROUTE_LAYOUT_VERSION, ROUTE_LAYOUT_VERSION } from './mazeExpedition.js';
import { resolveAuthoredChunkStructure } from './authoredWorldRuntime.js';
import { CHUNK_SIZE } from './tileCatalog.js';
import { portalPoint } from './architecturalMaze.js';
import { planChunkRoomEncounters } from './roomEncounters.js';

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
    it.each([LEGACY_ROUTE_LAYOUT_VERSION, ROUTE_LAYOUT_VERSION])('materializes all six connected named chambers per site across the seed portfolio (route generation %i)', (layoutVersion) => {
        for (const seed of [1, 3, 33, 44, 91, 200, 8128, 65535]) {
            const plan = buildWorldPlan(generateRadialMazeExpedition(seed, { layoutVersion }));
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
                    expect(result.status, `v${layoutVersion} ${seed}: ${reservation.id}`).toBe('accepted');
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

    const threeGameSource = readFileSync(fileURLToPath(new URL('./threeGame.js', import.meta.url)), 'utf8');
    const allBuilds = () => Object.entries(TERRITORY_SITE_PROFILES).flatMap(([siteId, profile]) => (
        TERRITORY_BEAT_KEYS[profile.family].flatMap((beatKey) => [0, 1, 2].map((variant) => createTerritoryRoomBuild({
            siteId, roomFamily: profile.family, territoryBeatKey: beatKey, territoryVariant: variant
        })))
    ));

    it('dresses every beat with its own fixture set drawn from registered props', () => {
        for (const [siteId, profile] of Object.entries(TERRITORY_SITE_PROFILES)) {
            const fingerprints = new Set();
            for (const beatKey of TERRITORY_BEAT_KEYS[profile.family]) {
                const build = createTerritoryRoomBuild({ siteId, roomFamily: profile.family, territoryBeatKey: beatKey, territoryVariant: 0 });
                expect(build.structuralAnchors.length, `${siteId}:${beatKey}`).toBeGreaterThanOrEqual(3);
                fingerprints.add(build.structuralAnchors.map((anchor) => anchor.type).join('|'));
                for (const anchor of build.structuralAnchors) {
                    expect(threeGameSource, `${siteId}:${beatKey} ${anchor.type}`)
                        .toMatch(new RegExp(`\\b${anchor.type}:\\s*this\\.load(KeyedSprite|Scatter)Texture`));
                }
            }
            expect(fingerprints.size, siteId).toBe(TERRITORY_BEAT_KEYS[profile.family].length);
        }
    });

    it('never dresses one site in another site\'s signature machinery', () => {
        const siteProps = new Map(Object.entries(TERRITORY_SITE_PROFILES)
            .flatMap(([siteId, profile]) => [[profile.signature, siteId], [profile.service, siteId]]));
        for (const build of allBuilds()) {
            for (const anchor of build.structuralAnchors) {
                const owner = siteProps.get(anchor.type);
                if (owner) expect(owner, `${build.id} ${anchor.type}`).toBe(build.siteId);
            }
        }
    });

    it('gives each beat three distinct layouts and keeps its encounter square open', () => {
        const byBeat = new Map();
        for (const build of allBuilds()) {
            const key = `${build.siteId}:${build.territoryBeatKey}`;
            if (!byBeat.has(key)) byBeat.set(key, new Set());
            byBeat.get(key).add(build.pattern.join('\n'));
            for (const zone of build.encounterZones) {
                for (let y = zone.y; y < zone.y + zone.h; y += 1) {
                    for (let x = zone.x; x < zone.x + zone.w; x += 1) expect(build.pattern[y][x], build.id).toBe('.');
                }
            }
            expect(validateRoomBuild(build), build.id).toEqual([]);
        }
        for (const [key, layouts] of byBeat) expect(layouts.size, key).toBe(3);
    });

    it('marks the compound fixtures the world-change systems anchor to', () => {
        for (const siteId of ['camp_meridian', 'camp_tallow', 'camp_vesper']) {
            const perimeter = createTerritoryRoomBuild({ siteId, roomFamily: 'camp', territoryBeatKey: 'perimeter' });
            expect(perimeter.structuralAnchors.some((anchor) => anchor.role === 'turret_platform')).toBe(true);
            const workshop = createTerritoryRoomBuild({ siteId, roomFamily: 'camp', territoryBeatKey: 'service' });
            expect(workshop.structuralAnchors.find((anchor) => anchor.role === 'workbench').type)
                .toBe(TERRITORY_SITE_PROFILES[siteId].service);
        }
        const chamber = createTerritoryRoomBuild({ siteId: 'hive_relay', roomFamily: 'hive', territoryBeatKey: 'choice_chamber' });
        expect(chamber.structuralAnchors.find((anchor) => anchor.role === 'synapse_spire').type).toBe('prop_hive_relay_antenna');
    });

    it('names compound locations for the HUD title card', () => {
        expect(getTerritoryLocation('camp_meridian', 'service')).toEqual({
            siteId: 'camp_meridian', siteLabel: 'Meridian', family: 'camp', beatKey: 'service', beatLabel: 'Workshop', safe: true
        });
        expect(getTerritoryLocation('hive_suture', 'choice_chamber')).toMatchObject({ family: 'hive', beatLabel: 'Communion chamber' });
        expect(getTerritoryLocation('hive_suture', 'service')).toBeNull();
        expect(getTerritoryLocation('nowhere', 'central')).toBeNull();
    });

    it('garrisons the defended nest once its ring opens and keeps the communion chamber quiet', () => {
        const plan = buildWorldPlan(generateRadialMazeExpedition(44, { layoutVersion: ROUTE_LAYOUT_VERSION }));
        const stamp = (beatKey) => {
            const reservation = plan.reservations.find((entry) => entry.siteId === 'hive_suture'
                && entry.territoryBeatKey === beatKey && !entry.conditional);
            const { structure } = resolveAuthoredChunkStructure(() => 0.5, plan, {
                chunkX: reservation.chunkX, chunkY: reservation.chunkY, openings: openingsFor(plan, reservation)
            });
            return { reservation, structure };
        };
        let seededRandom = 7;
        const random = () => {
            seededRandom = (seededRandom * 16807) % 2147483647;
            return seededRandom / 2147483647;
        };
        const nest = stamp('outer_nest');
        const [garrison] = planChunkRoomEncounters(nest.structure.rooms, nest.structure.grid, random, { depthTier: 2, maxUnlockedRing: 5 });
        expect(garrison.spawns.length).toBeGreaterThan(0);
        expect(garrison.spawns.length).toBeLessThanOrEqual(5);
        const zone = nest.structure.rooms[0].encounterZones[0];
        const bounds = zone.bounds ?? { minX: zone.x, minY: zone.y, maxX: zone.x + zone.w - 1, maxY: zone.y + zone.h - 1 };
        for (const spawn of garrison.spawns) {
            expect(spawn.x >= bounds.minX && spawn.x <= bounds.maxX && spawn.y >= bounds.minY && spawn.y <= bounds.maxY).toBe(true);
        }
        const [locked] = planChunkRoomEncounters(nest.structure.rooms, nest.structure.grid, random, {
            depthTier: 2, maxUnlockedRing: nest.reservation.ring - 1
        });
        expect(locked.spawns).toEqual([]);
        const chamber = stamp('choice_chamber');
        const [quiet] = planChunkRoomEncounters(chamber.structure.rooms, chamber.structure.grid, random, { depthTier: 2, maxUnlockedRing: 5 });
        expect(quiet.spawns).toEqual([]);
    });
});
