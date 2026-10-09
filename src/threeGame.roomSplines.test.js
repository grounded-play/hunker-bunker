import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

describe('ThreeGame room splines (pipes, cables, and rigging)', () => {
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
        for (let x = 1; x <= 6; x += 1) interior.push({ x, y });
    }

    const room = {
        id: 'test_spline_room',
        theme: 'bunker-standard',
        role: 'power_puzzle',
        interior,
        populationPlan: {
            placements: [
                { type: 'prop_fusion_generator', x: 2, y: 3, yaw: 0 },
                { type: 'prop_conduit_junction_box', x: 5, y: 3, yaw: Math.PI }
            ],
            reserved: []
        }
    };

    it('mounts a single merged spline mesh for authored rooms', () => {
        const game = Object.create(ThreeGame.prototype);
        game.chunkSize = 48;
        game.getBiomeKeyForWorldPosition = () => 'bunker';
        game.scatterSprites = [];
        game.brokenPropScatterKeys = new Set();

        const group = new THREE.Group();
        const metadata = { roomInstances: [room], dressingGrid: grid };

        const mesh = ThreeGame.prototype.addRoomSplines.call(game, group, 0, 0, metadata, grid);
        expect(mesh).toBeTruthy();
        expect(mesh.name).toBe('chunk-splines-batch');
        expect(mesh.userData.isSplineDressing).toBe(true);
        expect(mesh.userData.blocking).toBe(false);
        expect(group.children).toContain(mesh);
    });

    it('spawns cuttable colliders and severs/hides the spline mesh upon breaking', () => {
        const game = Object.create(ThreeGame.prototype);
        game.chunkSize = 48;
        game.getBiomeKeyForWorldPosition = () => 'bunker';
        game.scatterSprites = [];
        game.brokenPropScatterKeys = new Set();
        game.spawnPhysicalBurst = vi.fn();
        game.triggerCameraShake = vi.fn();
        game.spawnGearPoofEffect = vi.fn();
        game.spawnDestructiblePropDrops = vi.fn();
        game.breakScatterProp = ThreeGame.prototype.breakScatterProp;

        const group = new THREE.Group();
        const metadata = { roomInstances: [room], dressingGrid: grid };

        ThreeGame.prototype.addRoomSplines.call(game, group, 0, 0, metadata, grid);

        // Should have created at least one cuttable collider
        const cuttableColliders = game.scatterSprites.filter((s) => s.userData.isCuttableSpline);
        expect(cuttableColliders.length).toBeGreaterThan(0);

        const targetCollider = cuttableColliders[0];
        const splineMesh = targetCollider.userData.splineMesh;
        expect(splineMesh).toBeTruthy();
        expect(splineMesh.visible).toBe(true);

        // Sever the spline via breakScatterProp
        game.breakScatterProp(targetCollider);

        // Mesh is severed/hidden immediately
        expect(splineMesh.visible).toBe(false);
        // Scatter key is recorded so it remains severed
        expect(game.brokenPropScatterKeys.has(targetCollider.userData.splineId)).toBe(true);
        // Burst VFX triggered
        expect(game.spawnPhysicalBurst).toHaveBeenCalled();
    });

    it('returns null and does not add meshes for empty chunks', () => {
        const game = Object.create(ThreeGame.prototype);
        game.chunkSize = 48;

        const group = new THREE.Group();
        const res = ThreeGame.prototype.addRoomSplines.call(game, group, 0, 0, { roomInstances: [] }, grid);
        expect(res).toBeNull();
        expect(group.children.length).toBe(0);
    });

    it('disposes spline geometry when chunk resources are cleaned up', () => {
        const game = Object.create(ThreeGame.prototype);
        game.chunkSize = 48;
        game.getBiomeKeyForWorldPosition = () => 'bunker';
        game.scatterSprites = [];
        game.brokenPropScatterKeys = new Set();

        const group = new THREE.Group();
        const metadata = { roomInstances: [room], dressingGrid: grid };
        const mesh = ThreeGame.prototype.addRoomSplines.call(game, group, 0, 0, metadata, grid);

        let disposed = false;
        mesh.geometry.addEventListener('dispose', () => { disposed = true; });

        ThreeGame.prototype.disposeChunkGroupResources.call(game, group);
        expect(disposed).toBe(true);
    });
});
