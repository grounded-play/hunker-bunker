import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { planRoomSplineDressing } from './splineRouter.js';

describe('splineRouter', () => {
    // 8x8 room grid with border walls
    const grid = [
        ['#', '#', '#', '#', '#', '#', '#', '#'],
        ['#', '.', '.', '.', '.', '.', '.', '#'],
        ['#', '.', '.', '.', '.', '.', '.', '#'],
        ['#', '.', '.', '.', '.', '.', '.', '#'],
        ['#', '.', '.', '.', '.', '.', '.', '#'],
        ['#', '.', '.', '.', '.', '.', '.', '#'],
        ['#', '.', '.', '.', '.', '.', '.', '#'],
        ['#', '#', '#', '#', '#', '#', '#', '#']
    ];

    const interior = [];
    for (let y = 1; y <= 6; y += 1) {
        for (let x = 1; x <= 6; x += 1) {
            interior.push({ x, y });
        }
    }

    const baseRoom = {
        id: 'test_engine_room',
        theme: 'bunker-standard',
        role: 'power_puzzle',
        interior
    };

    it('generates ambient overhead swags strictly maintaining Y >= 2.15m clearance', () => {
        const splines = planRoomSplineDressing(baseRoom, grid, { placements: [] });
        const overheads = splines.filter((s) => s.category === 'overhead_swag');

        expect(overheads.length).toBeGreaterThan(0);
        for (const swag of overheads) {
            expect(swag.points.length).toBeGreaterThanOrEqual(2);
            for (const pt of swag.points) {
                expect(pt.y).toBeGreaterThanOrEqual(2.15); // Player clearance rule
            }
        }
    });

    it('connects compatible hero props socket-to-socket with cuttable properties', () => {
        const placements = [
            { type: 'prop_fusion_generator', x: 2, y: 3, yaw: 0 },
            { type: 'prop_conduit_junction_box', x: 5, y: 3, yaw: Math.PI }
        ];

        const splines = planRoomSplineDressing(baseRoom, grid, { placements });
        const connections = splines.filter((s) => s.category === 'socket_connection');

        expect(connections.length).toBeGreaterThanOrEqual(1);
        const cableConn = connections.find((s) => s.type === 'cable');
        expect(cableConn).toBeTruthy();
        expect(cableConn.points.length).toBeGreaterThanOrEqual(2);
        expect(cableConn.cuttable).toBe(true);
        expect(cableConn.cutPoint).toBeInstanceOf(THREE.Vector3);
        expect(cableConn.cuttableType).toBe('spline_wire_bunker');
    });

    it('routes orphan sockets safely to nearby wall escape with termination collars', () => {
        const placements = [
            { type: 'prop_coolant_drum_leaking_pool', x: 3, y: 3, yaw: 0 }
        ];

        const splines = planRoomSplineDressing(baseRoom, grid, { placements });
        const escapes = splines.filter((s) => s.category === 'socket_escape');

        expect(escapes.length).toBe(1);
        expect(escapes[0].points[0].y).toBeGreaterThan(0.5); // Starts at drum socket
        expect(escapes[0].points[escapes[0].points.length - 1].y).toBe(0.25); // Drops to baseboard
        expect(escapes[0].collars?.length).toBeGreaterThanOrEqual(1); // Clean physical collar
    });

    it('generates organic wall-crawling vines with undulation and branching tendrils', () => {
        const splines = planRoomSplineDressing(baseRoom, grid, { placements: [] });
        const wallVines = splines.filter((s) => s.category === 'wall_crawling_vine');

        expect(wallVines.length).toBeGreaterThan(0);
        for (const vine of wallVines) {
            expect(vine.points.length).toBeGreaterThanOrEqual(4);
            // Has clean start/stop collars or anchor snapping
            expect(vine.collars?.length).toBeGreaterThan(0);
            expect(vine.cuttable).toBe(true);
            expect(vine.cutPoint).toBeTruthy();
        }

        // Branching tendrils present on qualified wall runs
        const branches = splines.filter((s) => s.category === 'wall_vine_branch');
        expect(branches.length).toBeGreaterThanOrEqual(1);
    });

    it('connects directly into wall decals and floor drain grates when provided', () => {
        const dressingItems = [
            { layer: 'wallDecal', type: 'decal_wall_panel_grille_01', x: 1.5, y: 1.0, height: 1.35, normal: { x: 0, z: 1 } },
            { layer: 'floorDecal', type: 'decal_floor_grate_01', x: 5.5, y: 1.0 }
        ];

        const splines = planRoomSplineDressing(baseRoom, grid, { placements: [], dressingItems });
        const wallVines = splines.filter((s) => s.category === 'wall_crawling_vine');

        expect(wallVines.length).toBeGreaterThan(0);
        // At least one vine connects to the grille decal height or floor grate height
        const touchesGrille = wallVines.some((v) => Math.abs(v.points[0].y - 1.35) < 0.1);
        expect(touchesGrille).toBe(true);
    });

    it('adapts conduit types and cuttable elements across localized themes', () => {
        const bioRoom = { ...baseRoom, id: 'bio_room', theme: 'bio-flesh' };
        const cryoRoom = { ...baseRoom, id: 'cryo_room', theme: 'cryo-vault' };
        const campRoom = { ...baseRoom, id: 'camp_room', theme: 'camp-tallow' };

        const bioSplines = planRoomSplineDressing(bioRoom, grid);
        const cryoSplines = planRoomSplineDressing(cryoRoom, grid);
        const campSplines = planRoomSplineDressing(campRoom, grid);

        expect(bioSplines.some((s) => s.type === 'vein' && s.cuttableType === 'spline_vein_bio')).toBe(true);
        expect(cryoSplines.some((s) => s.type === 'coolant_pipe' && s.cuttableType === 'spline_pipe_cryo')).toBe(true);
        expect(campSplines.some((s) => s.type === 'vine' && s.cuttableType === 'spline_vine_camp')).toBe(true);
    });

    it('is completely deterministic from the room seed', () => {
        const placements = [
            { type: 'prop_fusion_generator', x: 2, y: 3, yaw: 0 },
            { type: 'prop_conduit_junction_box', x: 5, y: 3, yaw: Math.PI }
        ];

        const runA = planRoomSplineDressing(baseRoom, grid, { placements });
        const runB = planRoomSplineDressing(baseRoom, grid, { placements });

        expect(runA.length).toBe(runB.length);
        for (let i = 0; i < runA.length; i += 1) {
            expect(runA[i].id).toBe(runB[i].id);
            expect(runA[i].points.length).toBe(runB[i].points.length);
            for (let j = 0; j < runA[i].points.length; j += 1) {
                expect(runA[i].points[j].x).toBe(runB[i].points[j].x);
                expect(runA[i].points[j].y).toBe(runB[i].points[j].y);
                expect(runA[i].points[j].z).toBe(runB[i].points[j].z);
            }
        }
    });

    it('gives hanging spans sway weights: still at the brackets, freest at the deepest sag', () => {
        const splines = planRoomSplineDressing(baseRoom, grid, { placements: [] });
        const swags = splines.filter((s) => s.category === 'overhead_swag');
        expect(swags.length).toBeGreaterThan(0);
        for (const swag of swags) {
            expect(swag.sway).toHaveLength(swag.points.length);
            expect(swag.sway[0]).toBe(0);
            expect(swag.sway[swag.sway.length - 1]).toBe(0);
            expect(Math.max(...swag.sway)).toBeGreaterThan(0.5);
            const deepest = swag.points.reduce((best, p, i) => (p.y < swag.points[best].y ? i : best), 0);
            expect(swag.sway[deepest]).toBe(Math.max(...swag.sway));
        }
        // Runs fastened along a wall don't swing.
        for (const vine of splines.filter((s) => s.category === 'wall_crawling_vine')) expect(vine.sway).toBeUndefined();
    });

    describe('doorways', () => {
        // A west door at row 3: the wall cell is open, and the cell inside it is
        // the door lane. Its apron is the lane plus one cell around it.
        const doorGrid = grid.map((row) => row.slice());
        doorGrid[3][0] = '.';
        const doorRoom = { ...baseRoom, id: 'door_room', navigation: { doorLanes: [{ x: 1, y: 3 }] } };
        const apron = new Set();
        for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) apron.add(`${1 + dx},${3 + dy}`);
        // Every low point (below head height) along a run, sampled every 5 cm.
        const lowCells = (spline) => {
            const cells = [];
            for (let i = 1; i < spline.points.length; i += 1) {
                const a = spline.points[i - 1];
                const b = spline.points[i];
                const steps = Math.max(1, Math.ceil(a.distanceTo(b) / 0.05));
                for (let k = 0; k <= steps; k += 1) {
                    const p = a.clone().lerp(b, k / steps);
                    if (p.y < 1.9) cells.push(`${Math.round(p.x)},${Math.round(p.z)}`);
                }
            }
            return cells;
        };
        const layouts = [
            [{ type: 'prop_fusion_generator', x: 2, y: 5, yaw: 0 }, { type: 'prop_diagnostic_console', x: 2, y: 1, yaw: 0 }],
            [{ type: 'prop_fusion_generator', x: 1, y: 5, yaw: Math.PI / 2 }, { type: 'prop_conduit_junction_box', x: 1, y: 1, yaw: 0 }],
            [{ type: 'prop_icey_frost_manifold', x: 3, y: 1, yaw: 0 }, { type: 'prop_coolant_drum_leaking_pool', x: 2, y: 5, yaw: Math.PI }],
            [{ type: 'prop_coolant_drum_leaking_pool', x: 3, y: 3, yaw: Math.PI / 2 }]
        ];

        it('never runs a floor-level conduit across a door apron', () => {
            for (const [index, placements] of layouts.entries()) {
                const splines = planRoomSplineDressing({ ...doorRoom, id: `door_room_${index}` }, doorGrid, { placements });
                for (const spline of splines) {
                    const crossing = lowCells(spline).filter((cell) => apron.has(cell));
                    expect(crossing, `${spline.id} crosses the door apron at ${crossing[0]}`).toEqual([]);
                }
            }
        });

        it('still ends every socket on a wall when the direct run would block the door', () => {
            for (const [index, placements] of layouts.entries()) {
                const splines = planRoomSplineDressing({ ...doorRoom, id: `door_room_${index}` }, doorGrid, { placements });
                const ends = splines.filter((s) => s.category === 'socket_connection' || s.category === 'socket_escape');
                expect(ends.length, `layout ${index}`).toBeGreaterThan(0);
            }
        });
    });

    describe('placement on real walls', () => {
        // Distance from a point to the nearest wall-cell face of the grid.
        const faceGap = (pt) => {
            let best = Infinity;
            for (let z = 0; z < grid.length; z += 1) {
                for (let x = 0; x < grid[z].length; x += 1) {
                    if (grid[z][x] !== '#') continue;
                    const dx = Math.max(0, Math.abs(pt.x - x) - 0.5);
                    const dz = Math.max(0, Math.abs(pt.z - z) - 0.5);
                    best = Math.min(best, Math.hypot(dx, dz));
                }
            }
            return best;
        };

        it('hugs a wall face with every wall vine, never sinking into it', () => {
            for (const theme of ['bunker-standard', 'bio-nest', 'cryo-rough', 'camp-fortified']) {
                const splines = planRoomSplineDressing({ ...baseRoom, id: `walls:${theme}`, theme }, grid, { placements: [] });
                for (const vine of splines.filter((s) => s.category === 'wall_crawling_vine')) {
                    for (const pt of vine.points) {
                        const gap = faceGap(pt);
                        expect(gap, theme).toBeGreaterThanOrEqual(vine.radius - 1e-6);
                        expect(gap, theme).toBeLessThan(vine.radius + 0.06);
                    }
                }
            }
        });

        it('crawls all four walls across rooms, not only the north one', () => {
            const sides = new Set();
            for (let i = 0; i < 24; i += 1) {
                const splines = planRoomSplineDressing({ ...baseRoom, id: `sides:${i}`, theme: 'bio-nest' }, grid, { placements: [] });
                for (const vine of splines.filter((s) => s.category === 'wall_crawling_vine')) {
                    // A run along a wall keeps one coordinate fixed.
                    const xs = vine.points.map((pt) => pt.x);
                    const zs = vine.points.map((pt) => pt.z);
                    if (Math.max(...zs) - Math.min(...zs) < 0.01) sides.add(zs[0] < 3.5 ? 'north' : 'south');
                    else if (Math.max(...xs) - Math.min(...xs) < 0.01) sides.add(xs[0] < 3.5 ? 'west' : 'east');
                }
            }
            expect([...sides].sort()).toEqual(['east', 'north', 'south', 'west']);
        });

        it('hangs swags along a wall top between brackets, above head height', () => {
            const splines = planRoomSplineDressing({ ...baseRoom, id: 'swag-wall' }, grid, { placements: [] });
            for (const swag of splines.filter((s) => s.category === 'overhead_swag')) {
                for (const pt of swag.points) {
                    expect(pt.y).toBeGreaterThanOrEqual(2.15);
                    expect(faceGap(pt)).toBeLessThan(swag.radius + 0.06);
                }
            }
        });

        it('ends orphan sockets on a wall face and turns sockets with the prop like three.js does', () => {
            const placements = [{ type: 'prop_diagnostic_console', x: 3, y: 3, yaw: Math.PI / 2 }];
            const splines = planRoomSplineDressing({ ...baseRoom, id: 'orphan-wall' }, grid, { placements });
            const escape = splines.find((s) => s.category === 'socket_escape');
            const first = escape.points[0];
            // Socket local (0, 0.35, -0.25) turned +90 deg about Y lands at (-0.25, 0.35, 0).
            expect(first.x).toBeCloseTo(3 - 0.25);
            expect(first.z).toBeCloseTo(3);
            const last = escape.points[escape.points.length - 1];
            expect(faceGap(last)).toBeLessThan(escape.radius + 0.06);
        });
    });
});
