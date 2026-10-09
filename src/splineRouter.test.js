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
});
