import { describe, expect, it } from 'vitest';
import {
    ROOM_BUILD_CATALOG,
    rotateRoomBuild,
    validateRoomBuild,
    computeApproachPoint,
    classifyRoomBuildSize,
    selectRoomBuild,
    stampRoomBuild,
    buildRoomInstanceFromBuild
} from './roomBuilds.js';
import { CHUNK_SIZE } from './tileCatalog.js';
import { collectReachableCells } from './roomEncounters.js';

function seededRandom(seed) {
    let state = (seed >>> 0) || 1;
    return () => {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        return (state >>> 0) / 4294967296;
    };
}

function shortestPatternPath(pattern, start, goal, blocked = new Set()) {
    const key = ({ x, y }) => `${x},${y}`;
    const queue = [{ ...start, distance: 0 }];
    const seen = new Set([key(start)]);
    for (let index = 0; index < queue.length; index += 1) {
        const current = queue[index];
        if (current.x === goal.x && current.y === goal.y) return current.distance;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const next = { x: current.x + dx, y: current.y + dy };
            const nextKey = key(next);
            if (pattern[next.y]?.[next.x] !== '.' || blocked.has(nextKey) || seen.has(nextKey)) continue;
            seen.add(nextKey);
            queue.push({ ...next, distance: current.distance + 1 });
        }
    }
    return Infinity;
}

describe('ROOM_BUILD_CATALOG', () => {
    // Engineering includes the two mandatory ship-goal rooms plus Meridian's
    // Ring 1 reactor-vent quest destination.
    it('has exactly the vertical-slice families the plan requires', () => {
        const families = ROOM_BUILD_CATALOG.map((build) => build.family).sort();
        expect(families).toEqual([
            'armory', 'cache', 'engineering', 'engineering', 'engineering', 'fabricator', 'gate',
            'medical', 'o2', 'puzzle', 'security', 'trap_reward'
        ].sort());
    });

    it('authors the Ring 1 reactor-vent quest at its canonical objective anchor', () => {
        const build = ROOM_BUILD_CATALOG.find((entry) => entry.id === 'reactor_vent_station');
        expect(build.tierEligibility).toContain(1);
        expect(build.interactionAnchors).toContainEqual(expect.objectContaining({
            id: 'reactor_vent_control'
        }));
    });

    it('turns the reactor vent station into a two-route false throat', () => {
        const build = ROOM_BUILD_CATALOG.find((entry) => entry.id === 'reactor_vent_station');
        expect(build.pattern).toEqual([
            '...............',
            '...............',
            '...............',
            '......####.....',
            '......#........',
            '......#........',
            '......#........',
            '......####.....',
            '...............',
            '...............',
            '...............'
        ]);
        const approach = computeApproachPoint(build);
        const farSide = { x: 7, y: 2 };
        const westOpening = new Set(Array.from({ length: 6 }, (_, x) => `${x},7`));
        const eastOpening = new Set(Array.from({ length: 5 }, (_, offset) => `${offset + 10},7`));
        expect(approach).toEqual({ x: 7, y: 8 });
        expect(build.pattern[7][approach.x]).toBe('#');
        expect(shortestPatternPath(build.pattern, approach, farSide, westOpening)).toBeLessThan(Infinity);
        expect(shortestPatternPath(build.pattern, approach, farSide, eastOpening)).toBeLessThan(Infinity);
        expect(shortestPatternPath(build.pattern, approach, { x: 4, y: 5 })).toBeLessThan(Infinity);
        expect(shortestPatternPath(build.pattern, approach, { x: 12, y: 5 })).toBeLessThan(Infinity);
        expect(build.structuralAnchors).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: 'vent_stack_a', x: 8, y: 3 }),
            expect.objectContaining({ id: 'vent_stack_b', x: 8, y: 7 })
        ]));
        expect(build.structuralAnchors.every((anchor) => build.pattern[anchor.y][anchor.x] === '#')).toBe(true);
        expect(build.interactionAnchors[0]).toMatchObject({ id: 'reactor_vent_control', x: 4, y: 5 });
        expect(build.rewardAnchors[0]).toMatchObject({ id: 'vent_service_cache', x: 12, y: 5 });
        expect(build.hazardZones[0]).toMatchObject({ id: 'steam_plume', x: 7, y: 4, w: 3, h: 3 });
    });

    it('turns the hull fabrication bay into an asymmetric press bed around a clear process line', () => {
        const build = ROOM_BUILD_CATALOG.find((entry) => entry.id === 'hull_fabrication_bay');
        expect(build.pattern).toEqual([
            '.................',
            '.................',
            '...####..........',
            '...#.............',
            '...#.............',
            '...#.............',
            '...#.............',
            '...####..........',
            '....###....###...',
            '....###....###...',
            '.................'
        ]);
        const approach = computeApproachPoint(build);
        const console = { x: 13, y: 6 };
        const bench = { x: 14, y: 3 };
        const reward = { x: 15, y: 1 };
        const exit = { x: 8, y: 0 };
        expect(approach).toEqual({ x: 8, y: 8 });
        for (let y = 0; y < build.pattern.length; y += 1) {
            for (let x = 7; x <= 10; x += 1) {
                expect(build.pattern[y][x], `process lane ${x},${y}`).toBe('.');
            }
        }
        expect(shortestPatternPath(build.pattern, approach, exit)).toBe(8);
        expect(shortestPatternPath(build.pattern, approach, console)).toBeLessThan(Infinity);
        expect(shortestPatternPath(build.pattern, console, bench)).toBeLessThan(Infinity);
        expect(shortestPatternPath(build.pattern, bench, reward)).toBeLessThan(Infinity);
        expect(shortestPatternPath(build.pattern, reward, exit)).toBeLessThan(Infinity);
        expect(build.structuralAnchors).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: 'hull_press_a', x: 3, y: 5 }),
            expect.objectContaining({ id: 'hull_press_b', x: 5, y: 2 })
        ]));
        expect(build.structuralAnchors.every((anchor) => build.pattern[anchor.y][anchor.x] === '#')).toBe(true);
        expect(build.interactionAnchors).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: 'hull_fabrication_console', x: 13, y: 6 }),
            expect.objectContaining({ id: 'hull_bench', x: 14, y: 3 })
        ]));
        expect(build.quietZones[0]).toMatchObject({ x: 12, y: 1, w: 5, h: 7 });
    });

    it('turns the radar post into a sightline court with two calibration routes', () => {
        const build = ROOM_BUILD_CATALOG.find((entry) => entry.id === 'radar_alignment_post');
        expect(build.pattern).toEqual([
            '...............',
            '...............',
            '...............',
            '..........###..',
            '............#..',
            '......###......',
            '........#......',
            '......###......',
            '........###....',
            '..........#....',
            '..........#....',
            '...............',
            '...............'
        ]);
        const approach = computeApproachPoint(build);
        const dishThreshold = { x: 7, y: 6 };
        const console = { x: 13, y: 10 };
        const exit = { x: 14, y: 6 };
        const northCrossing = new Set(Array.from({ length: 5 }, (_, y) => `7,${y}`));
        const southCrossing = new Set(Array.from({ length: 5 }, (_, offset) => `7,${offset + 8}`));
        expect(approach).toEqual({ x: 2, y: 6 });
        expect(shortestPatternPath(build.pattern, approach, dishThreshold)).toBe(5);
        expect(shortestPatternPath(build.pattern, approach, console, northCrossing)).toBeLessThan(Infinity);
        expect(shortestPatternPath(build.pattern, approach, console, southCrossing)).toBeLessThan(Infinity);
        expect(shortestPatternPath(build.pattern, console, exit)).toBeLessThan(Infinity);
        expect(build.signatureAnchors).toEqual([
            expect.objectContaining({ id: 'mast_base', type: 'radar', x: 7, y: 6, blocking: true })
        ]);
        expect(build.structuralAnchors).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: 'post_locker', x: 11, y: 3 }),
            expect.objectContaining({ id: 'calibration_bank', x: 10, y: 9 })
        ]));
        expect(build.structuralAnchors.every((anchor) => build.pattern[anchor.y][anchor.x] === '#')).toBe(true);
        expect(build.interactionAnchors).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: 'radar_alignment_console', x: 13, y: 10 }),
            expect.objectContaining({ id: 'post_terminal', x: 10, y: 2 })
        ]));
        expect(build.rewardAnchors[0]).toMatchObject({ id: 'post_ammo', x: 12, y: 8 });
        expect(build.signatureAnchorId).toBe('mast_base');
        expect(build.quietZones[0]).toMatchObject({ x: 11, y: 8, w: 4, h: 5 });
    });

    it('uses the medical P0A proof to create a reveal pivot and supply-side loop', () => {
        const build = ROOM_BUILD_CATALOG.find((entry) => entry.id === 'medical_triage');
        expect(build.pattern).toEqual([
            '...............',
            '...........#...',
            '...#######.#...',
            '...#.......#...',
            '...#.......#...',
            '...#####...#...',
            '...............',
            '...............',
            '...............'
        ]);
        expect(computeApproachPoint(build)).toEqual({ x: 7, y: 6 });
        expect(build.pattern[5][7]).toBe('#');
        expect(build.interactionAnchors).toContainEqual(expect.objectContaining({ id: 'triage_console', x: 8, y: 3 }));
        expect(build.rewardAnchors).toContainEqual(expect.objectContaining({ id: 'med_supply_case', x: 13, y: 2 }));
    });

    it('uses one compressor island with a distinct hot-side bypass in the P0A hall', () => {
        const build = ROOM_BUILD_CATALOG.find((entry) => entry.id === 'reactor_compressor_hall');
        expect(build.pattern).toEqual([
            '###................',
            '##.................',
            '#..................',
            '...................',
            '.......#####..##...',
            '......######..##...',
            '......###.....##...',
            '.......##.....##...',
            '.......##.....##...',
            '..............##...',
            '..................#',
            '.................##',
            '................###'
        ]);
        expect(build.pattern[6]).toBe('......###.....##...');
        expect(build.pattern[6].slice(12, 14)).toBe('..');
        expect(build.hazardZones).toContainEqual(expect.objectContaining({
            id: 'coolant_plume', x: 12, y: 4, w: 2, h: 5
        }));
        expect(build.signatureAnchors).toContainEqual(expect.objectContaining({
            id: 'compressor_drive', type: 'prop_tesla_coil_node', x: 10, y: 6
        }));
        expect(build.structuralAnchors).toContainEqual(expect.objectContaining({
            id: 'coolant_manifold', x: 14, y: 6
        }));
        expect(computeApproachPoint(build)).toEqual({ x: 9, y: 10 });

        const control = { x: 12, y: 3 };
        const plume = new Set();
        for (let y = 4; y < 9; y += 1) for (let x = 12; x < 14; x += 1) plume.add(`${x},${y}`);
        const hotPath = shortestPatternPath(build.pattern, computeApproachPoint(build), control);
        const servicePath = shortestPatternPath(build.pattern, computeApproachPoint(build), control, plume);
        expect(hotPath).toBeLessThan(servicePath);
        expect(servicePath).toBeLessThan(Infinity);
        expect(shortestPatternPath(build.pattern, control, { x: 9, y: 0 })).toBeLessThan(Infinity);
        for (let y = 4; y < 9; y += 1) {
            expect(build.pattern[y].slice(12, 14), `hot bypass clearance row ${y}`).toBe('..');
        }
    });

    it('turns the mandatory O2 room into a two-sided broken-ring repair route', () => {
        const build = ROOM_BUILD_CATALOG.find((entry) => entry.id === 'o2_scrubber');
        expect(build.pattern).toEqual([
            '.............',
            '.............',
            '.............',
            '.....###.....',
            '....##.##....',
            '....#...#....',
            '....#...#....',
            '.............',
            '.............',
            '.............',
            '.............'
        ]);
        expect(computeApproachPoint(build)).toEqual({ x: 6, y: 2 });
        expect(build.signatureAnchorId).toBe('o2_control');
        expect(build.interactionAnchors).toContainEqual(expect.objectContaining({
            id: 'o2_control', x: 6, y: 5
        }));
        expect(build.hazardZones).toContainEqual(expect.objectContaining({
            id: 'exhaust_leak', x: 9, y: 4, w: 3, h: 3
        }));

        const approach = computeApproachPoint(build);
        const control = { x: 6, y: 5 };
        const eastExhaust = new Set();
        for (let y = 4; y < 7; y += 1) for (let x = 9; x < 12; x += 1) eastExhaust.add(`${x},${y}`);
        const westService = new Set();
        for (let y = 3; y < 8; y += 1) for (let x = 0; x < 4; x += 1) westService.add(`${x},${y}`);
        expect(shortestPatternPath(build.pattern, approach, control, eastExhaust)).toBeLessThan(Infinity);
        expect(shortestPatternPath(build.pattern, approach, control, westService)).toBeLessThan(Infinity);
    });

    it('turns the armory into a T-choice with a shorter defended reward flank', () => {
        const build = ROOM_BUILD_CATALOG.find((entry) => entry.id === 'armory_cage');
        expect(build.pattern).toEqual([
            '...............',
            '...............',
            '.....#.........',
            '.....#.........',
            '.....######....',
            '.....#.........',
            '.....#.........',
            '...............',
            '...............'
        ]);
        const approach = computeApproachPoint(build);
        const reward = { x: 8, y: 3 };
        const north = { x: 6, y: 1 };
        const south = { x: 6, y: 7 };
        const northRoute = shortestPatternPath(build.pattern, approach, north)
            + shortestPatternPath(build.pattern, north, reward);
        const southRoute = shortestPatternPath(build.pattern, approach, south)
            + shortestPatternPath(build.pattern, south, reward);
        expect(approach).toEqual({ x: 2, y: 4 });
        expect(northRoute).toBeLessThan(southRoute);
        expect(shortestPatternPath(build.pattern, approach, { x: 14, y: 4 })).toBeLessThan(Infinity);
        expect(build.signatureAnchorId).toBe('ammo_crate');
        expect(build.interactionAnchors[0]).toMatchObject({ id: 'armory_lock', x: 3, y: 3 });
        expect(build.rewardAnchors[0]).toMatchObject({ id: 'ammo_crate', x: 8, y: 3 });
    });

    it('turns the field fabricator into an offset intake and fixed work-cell loop', () => {
        const build = ROOM_BUILD_CATALOG.find((entry) => entry.id === 'field_fabricator');
        expect(build.pattern).toEqual([
            '...............',
            '...............',
            '...............',
            '...............',
            '.....####......',
            '.....#.........',
            '.....#.........',
            '...............',
            '....##...###...',
            '....##...###...',
            '...............'
        ]);
        const approach = computeApproachPoint(build);
        const terminal = { x: 9, y: 5 };
        const cache = { x: 3, y: 5 };
        const northCrosscut = new Set();
        const southCrosscut = new Set();
        for (let x = 4; x <= 9; x += 1) {
            northCrosscut.add(`${x},3`);
            southCrosscut.add(`${x},7`);
        }
        expect(approach).toEqual({ x: 7, y: 8 });
        expect(build.pattern[8].slice(6, 9)).toBe('...');
        expect(shortestPatternPath(build.pattern, approach, terminal)).toBeLessThan(Infinity);
        expect(shortestPatternPath(build.pattern, terminal, cache, northCrosscut)).toBeLessThan(Infinity);
        expect(shortestPatternPath(build.pattern, terminal, cache, southCrosscut)).toBeLessThan(Infinity);
        expect(build.signatureAnchorId).toBe('fabricator_terminal');
        expect(build.structuralAnchors[0]).toMatchObject({ id: 'fabricator_bench', x: 7, y: 4 });
        expect(build.interactionAnchors[0]).toMatchObject({ id: 'fabricator_terminal', x: 9, y: 5 });
        expect(build.rewardAnchors[0]).toMatchObject({ id: 'schematic_cache', x: 3, y: 5 });
    });

    it('turns the power room into a teach, branch and rejoin relay circuit', () => {
        const build = ROOM_BUILD_CATALOG.find((entry) => entry.id === 'power_puzzle');
        expect(build.pattern).toEqual([
            '.................',
            '.................',
            '.................',
            '......####.......',
            '......#....#.....',
            '......#....#.....',
            '......#....#.....',
            '......####.......',
            '.................',
            '.................',
            '.................'
        ]);
        const approach = computeApproachPoint(build);
        const tutorial = { x: 4, y: 5 };
        const final = { x: 13, y: 5 };
        const upper = { x: 8, y: 2 };
        const lower = { x: 8, y: 8 };
        const upperRoute = shortestPatternPath(build.pattern, approach, tutorial)
            + shortestPatternPath(build.pattern, tutorial, upper)
            + shortestPatternPath(build.pattern, upper, final);
        const lowerRoute = shortestPatternPath(build.pattern, approach, tutorial)
            + shortestPatternPath(build.pattern, tutorial, lower)
            + shortestPatternPath(build.pattern, lower, final);
        expect(approach).toEqual({ x: 2, y: 5 });
        expect(upperRoute).toBe(lowerRoute);
        expect(upperRoute).toBeLessThan(Infinity);
        expect(build.signatureAnchorId).toBe('routing_node_a');
        expect(build.interactionAnchors).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: 'routing_node_a', x: 4, y: 5 }),
            expect.objectContaining({ id: 'routing_node_b', x: 13, y: 5 }),
            expect.objectContaining({ id: 'routing_node_c', x: 8, y: 2 }),
            expect.objectContaining({ id: 'routing_node_d', x: 8, y: 8 })
        ]));
        expect(build.rewardAnchors[0]).toMatchObject({ id: 'puzzle_reward', x: 15, y: 3 });
    });

    it('turns the trap vault into a lure court with a safe concealed bypass', () => {
        const build = ROOM_BUILD_CATALOG.find((entry) => entry.id === 'trap_vault');
        expect(build.pattern).toEqual([
            '.................',
            '.................',
            '.................',
            '....###...###....',
            '....#.......#....',
            '....#.......#....',
            '....#.......#....',
            '....###...###....',
            '.................',
            '.................',
            '.................'
        ]);
        const approach = computeApproachPoint(build);
        const lure = { x: 8, y: 5 };
        const payoff = { x: 2, y: 8 };
        const hazard = new Set();
        for (let y = 3; y < 8; y += 1) for (let x = 7; x < 17; x += 1) hazard.add(`${x},${y}`);
        expect(approach).toEqual({ x: 8, y: 2 });
        expect(shortestPatternPath(build.pattern, approach, lure)).toBeLessThan(Infinity);
        expect(shortestPatternPath(build.pattern, approach, payoff, hazard)).toBeLessThan(Infinity);
        expect(build.signatureAnchorId).toBe('false_cache');
        expect(build.structuralAnchors).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: 'trap_emitter_west', type: 'prop_laser_trap_emitter', x: 4, y: 5 }),
            expect.objectContaining({ id: 'trap_emitter_east', type: 'prop_laser_trap_emitter', x: 12, y: 5 })
        ]));
        expect(build.structuralAnchors.every((anchor) => build.pattern[anchor.y][anchor.x] === '#')).toBe(true);
        expect(build.rewardAnchors[0]).toMatchObject({ id: 'trap_payoff', x: 2, y: 8 });
        expect(build.quietZones[1]).toMatchObject({ x: 0, y: 3, w: 4, h: 6 });
    });

    it('turns the reward cache into a screened two-route reveal', () => {
        const build = ROOM_BUILD_CATALOG.find((entry) => entry.id === 'reward_cache');
        expect(build.pattern).toEqual([
            '...............',
            '...............',
            '...............',
            '...............',
            '....####.......',
            '....#..........',
            '...............',
            '....######.....',
            '...............',
            '...............',
            '...............'
        ]);
        const approach = computeApproachPoint(build);
        const vault = { x: 6, y: 5 };
        const westScreen = new Set(['0,7', '1,7', '2,7', '3,7']);
        const eastScreen = new Set(['10,7', '11,7', '12,7', '13,7', '14,7']);
        expect(approach).toEqual({ x: 7, y: 8 });
        expect(build.pattern[7][approach.x]).toBe('#');
        expect(shortestPatternPath(build.pattern, approach, vault, westScreen)).toBeLessThan(Infinity);
        expect(shortestPatternPath(build.pattern, approach, vault, eastScreen)).toBeLessThan(Infinity);
        expect(shortestPatternPath(build.pattern, approach, vault)).toBeGreaterThan(
            Math.abs(approach.x - vault.x) + Math.abs(approach.y - vault.y)
        );
        expect(build.interactionAnchors[0]).toMatchObject({ id: 'reward_vault', x: 6, y: 5 });
        expect(build.rewardAnchors[0]).toMatchObject({ id: 'reward_vault', x: 6, y: 5 });
        expect(build.loreAnchors[0]).toMatchObject({ id: 'cache_provenance_log', x: 2, y: 5 });
        expect(shortestPatternPath(build.pattern, vault, { x: 2, y: 5 })).toBeLessThan(Infinity);
    });

    it.each(ROOM_BUILD_CATALOG.map((build) => [build.id, build]))('%s is internally valid', (_, build) => {
        expect(validateRoomBuild(build)).toEqual([]);
    });

    it.each(ROOM_BUILD_CATALOG.map((build) => [build.id, build]))('%s\'s approach point sits on floor', (_, build) => {
        const point = computeApproachPoint(build);
        expect(build.pattern[point.y][point.x]).toBe('.');
    });

    it.each(ROOM_BUILD_CATALOG.map((build) => [build.id, build]))('%s fits inside a chunk with border margin', (_, build) => {
        expect(build.pattern[0].length).toBeLessThanOrEqual(CHUNK_SIZE - 6);
        expect(build.pattern.length).toBeLessThanOrEqual(CHUNK_SIZE - 6);
    });

    it('the ring crossing landmark is the only build meeting the Large size contract, matching its 2/2 content budget', () => {
        const gate = ROOM_BUILD_CATALOG.find((build) => build.id === 'ring_crossing_landmark');
        expect(classifyRoomBuildSize(gate)).toBe('large');
        expect(gate.structuralAnchors.length).toBeGreaterThanOrEqual(2);
        expect(gate.encounterZones.length + gate.interactionAnchors.length).toBeGreaterThanOrEqual(2);
    });
});

describe('rotateRoomBuild', () => {
    const build = ROOM_BUILD_CATALOG.find((b) => b.id === 'medical_triage');

    it('swaps width/height and rotates sockets n->e->s->w->n over four steps', () => {
        const original = build;
        expect(original.sockets[0].side).toBe('s');

        const once = rotateRoomBuild(build, 1);
        expect(once.pattern.length).toBe(original.pattern[0].length);
        expect(once.pattern[0].length).toBe(original.pattern.length);
        expect(once.sockets[0].side).toBe('w');

        const twice = rotateRoomBuild(build, 2);
        expect(twice.sockets[0].side).toBe('n');
        expect(twice.pattern.length).toBe(original.pattern.length);
        expect(twice.pattern[0].length).toBe(original.pattern[0].length);

        const four = rotateRoomBuild(build, 4);
        expect(four.pattern).toEqual(original.pattern);
        expect(four.sockets[0].side).toBe(original.sockets[0].side);
    });

    it('keeps every rotated build internally valid', () => {
        for (const b of ROOM_BUILD_CATALOG) {
            for (let steps = 0; steps < 4; steps += 1) {
                expect(validateRoomBuild(rotateRoomBuild(b, steps))).toEqual([]);
            }
        }
    });

    it('rotates anchor points consistently with the pattern (approach point still on floor after rotation)', () => {
        for (let steps = 0; steps < 4; steps += 1) {
            const rotated = rotateRoomBuild(build, steps);
            const point = computeApproachPoint(rotated);
            expect(rotated.pattern[point.y][point.x]).toBe('.');
        }
    });
});

describe('selectRoomBuild', () => {
    it('filters by family/tier/biome/roles and is deterministic for a given roll', () => {
        const a = selectRoomBuild(ROOM_BUILD_CATALOG, { family: 'medical', tier: 1, biome: 'active', roll: 0.4 });
        const b = selectRoomBuild(ROOM_BUILD_CATALOG, { family: 'medical', tier: 1, biome: 'active', roll: 0.4 });
        expect(a).toBe(b);
        expect(a.family).toBe('medical');
    });

    it('returns null when nothing matches', () => {
        expect(selectRoomBuild(ROOM_BUILD_CATALOG, { family: 'nonexistent' })).toBeNull();
    });
});

describe('stampRoomBuild', () => {
    const build = ROOM_BUILD_CATALOG.find((b) => b.id === 'o2_scrubber');

    it('produces a chunk-sized grid with a non-empty interior and doors cut for the given openings', () => {
        const { grid, interior, doors } = stampRoomBuild(build, seededRandom(1), {
            openings: { north: { open: true, offset: 4 } }
        });
        expect(grid.length).toBe(CHUNK_SIZE);
        expect(grid.every((row) => row.length === CHUNK_SIZE)).toBe(true);
        expect(interior.length).toBeGreaterThan(0);
        expect(doors.length).toBeGreaterThan(0);
        for (const door of doors) {
            for (const cell of door.cells) expect(grid[cell.y][cell.x]).toBe('D');
        }
    });

    it('is deterministic for a given seed', () => {
        const options = { openings: { north: { open: true, offset: 4 }, west: { open: true, offset: 2 } } };
        const a = stampRoomBuild(build, seededRandom(9), options);
        const b = stampRoomBuild(build, seededRandom(9), options);
        expect(a.grid).toEqual(b.grid);
    });

    it('keeps offset edge portals physically connected to authored interiors after border sealing', () => {
        const sideNames = { n: 'north', e: 'east', s: 'south', w: 'west' };
        for (const catalogBuild of ROOM_BUILD_CATALOG) {
            for (let rotation = 0; rotation < 4; rotation += 1) {
                const rotated = rotateRoomBuild(catalogBuild, rotation);
                const side = sideNames[rotated.sockets[0].side];
                for (const offset of [1, 8, 22]) {
                    const stamped = stampRoomBuild(rotated, seededRandom(1), {
                        openings: { [side]: { open: true, offset } }
                    });
                    const reachable = collectReachableCells(stamped.grid);
                    expect(stamped.interior.every((cell) => reachable.has(`${cell.x},${cell.y}`)),
                        `${rotated.id}, rotation ${rotation}, offset ${offset}`).toBe(true);
                }
            }
        }
    });

    it('never carves through the room\'s own structural obstruction, and skips openings with no matching declared socket', () => {
        // o2_scrubber only declares an 'n' socket. A south opening (no
        // matching socket) must be skipped rather than connected straight
        // through the scrubber column obstruction in the room's middle.
        const { grid, origin, skippedSides } = stampRoomBuild(build, seededRandom(3), {
            openings: { north: { open: true, offset: 4 }, south: { open: true, offset: 4 } }
        });
        expect(skippedSides).toEqual(['south']);
        const obstruction = build.structuralAnchors[0];
        expect(grid[origin.y + obstruction.y][origin.x + obstruction.x]).toBe('#');
    });

    it('connects every declared-socket opening only up to the room boundary, never past it', () => {
        const gate = ROOM_BUILD_CATALOG.find((b) => b.id === 'ring_crossing_landmark');
        const { grid, origin, doors } = stampRoomBuild(gate, seededRandom(4), {
            openings: { south: { open: true, offset: 8 }, north: { open: true, offset: 8 } }
        });
        expect(doors.length).toBeGreaterThanOrEqual(2);
        for (const pillar of gate.structuralAnchors) {
            expect(grid[origin.y + pillar.y][origin.x + pillar.x]).toBe('#');
        }
    });
});

describe('buildRoomInstanceFromBuild', () => {
    it('produces a roomInstances-compatible shape with world-translated anchors', () => {
        const build = ROOM_BUILD_CATALOG.find((b) => b.id === 'medical_triage');
        const stamped = stampRoomBuild(build, seededRandom(5), {
            openings: { south: { open: true, offset: 5 } }
        });
        const room = buildRoomInstanceFromBuild(build, stamped, { chunkX: 2, chunkY: -3 });

        expect(room.chunkKey).toBe('2,-3');
        expect(room.id).toBe(`authored-room:${build.id}:2,-3`);
        expect(room.interior.length).toBeGreaterThan(0);
        expect(room.doors.length).toBeGreaterThan(0);
        expect(room.navigation.doorLanes.length).toBeGreaterThan(0);
        expect(room.safeZone).toBe(true);

        const consoleAnchor = room.interactionAnchors.find((a) => a.id === 'triage_console');
        expect(consoleAnchor).toBeDefined();
        expect(consoleAnchor.x).toBe(stamped.origin.x + build.interactionAnchors[0].x);
        expect(consoleAnchor.y).toBe(stamped.origin.y + build.interactionAnchors[0].y);
    });

    it('carries chunkX/chunkY and ring/tier for consumers that gate on them', () => {
        const build = ROOM_BUILD_CATALOG.find((b) => b.id === 'armory_cage');
        const stamped = stampRoomBuild(build, seededRandom(5), {
            openings: { west: { open: true, offset: 3 } }
        });
        const room = buildRoomInstanceFromBuild(build, stamped, { chunkX: 4, chunkY: 1, ring: 2 });
        expect(room.chunkX).toBe(4);
        expect(room.chunkY).toBe(1);
        expect(room.ring).toBe(2);
        expect(room.tier).toBe(2);
    });

    it('exposes isSafe alongside safeZone, matching what src/roomContainment.js and threeGame.js\'s getActiveContainmentZones() read', () => {
        const safe = ROOM_BUILD_CATALOG.find((b) => b.id === 'medical_triage');
        const stampedSafe = stampRoomBuild(safe, seededRandom(1), { openings: { south: { open: true, offset: 5 } } });
        const safeRoom = buildRoomInstanceFromBuild(safe, stampedSafe, { chunkX: 0, chunkY: 0 });
        expect(safeRoom.isSafe).toBe(true);
        expect(safeRoom.safeZone).toBe(true);

        const unsafe = ROOM_BUILD_CATALOG.find((b) => b.id === 'trap_vault');
        const stampedUnsafe = stampRoomBuild(unsafe, seededRandom(1), { openings: { north: { open: true, offset: 4 } } });
        const unsafeRoom = buildRoomInstanceFromBuild(unsafe, stampedUnsafe, { chunkX: 0, chunkY: 0 });
        expect(unsafeRoom.isSafe).toBe(false);
    });

    it('exposes contentBudget verbatim so room.contentBudget?.enemiesMax resolves (roomEncounters.js reads this, not populationBudget.enemy.max)', () => {
        const build = ROOM_BUILD_CATALOG.find((b) => b.id === 'armory_cage');
        const stamped = stampRoomBuild(build, seededRandom(2), { openings: { west: { open: true, offset: 3 } } });
        const room = buildRoomInstanceFromBuild(build, stamped, { chunkX: 0, chunkY: 0 });
        expect(room.contentBudget.enemiesMax).toBe(build.contentBudget.enemiesMax);
        expect(typeof room.populationBudget.enemy).toBe('number');
    });

    it('every translated zone carries a resolvable .bounds (roomEncounters.js/roomContainment.js read zone.bounds ?? zone, and only understand minX/maxX, not w/h)', () => {
        const build = ROOM_BUILD_CATALOG.find((b) => b.id === 'ring_crossing_landmark');
        const stamped = stampRoomBuild(build, seededRandom(3), {
            openings: { south: { open: true, offset: 8 }, north: { open: true, offset: 8 } }
        });
        const room = buildRoomInstanceFromBuild(build, stamped, { chunkX: 0, chunkY: 0 });
        for (const zone of [...room.coverZones, ...room.encounterZones, ...room.hazardZones, ...room.quietZones]) {
            expect(zone.bounds.minX).toBe(zone.x);
            expect(zone.bounds.maxX).toBe(zone.x + zone.w - 1);
            expect(zone.bounds.minY).toBe(zone.y);
            expect(zone.bounds.maxY).toBe(zone.y + zone.h - 1);
        }
        for (const zone of room.quietZones) {
            expect(zone.isQuiet).toBe(true);
            expect(zone.type).toBe('quiet');
        }
    });
});
