import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

// Regression coverage for two confirmed pocket-world bugs found during the
// Phase 2 investigation (docs/superpowers/specs/2026-07-27-wfc-tile-maze-
// generation-design.md, Phase 2 §1-2): mountPocket's loot pickup was never
// registered in pickupMeshes (permanently uncollectable — the "isn't really
// exists" complaint), and the pocket's own generation was a raw 1-wide DFS
// maze the reachability/roominess bar this file's other fixes already hold
// the surface to.

function makeFakePocket() {
    // 5x5 pocket: a solid floor block with a wall border, centerCell (2,2),
    // climbPoint (4,2) — big enough to have a floor cell that's neither
    // the center nor the climb point, which is what mountPocket's pickup
    // placement requires.
    const grid = [
        ['#', '#', '#', '#', '#'],
        ['#', '.', '.', '.', '#'],
        ['#', '.', '.', '.', '#'],
        ['#', '.', '.', '.', '#'],
        ['#', '#', '#', '#', '#']
    ];
    return { grid, size: 5, centerCell: { x: 2, y: 2 }, climbPoint: { x: 3, y: 1 } };
}

function makeFakeGame() {
    return {
        pocketGroups: new Map(),
        pocketCache: new Map(),
        pickupMeshes: [],
        runEntropy: 1,
        globalSeedOffset: 0,
        wallHeight: 2.8,
        wallGeometry: new THREE.BoxGeometry(1, 1, 1),
        wallMaterial: new THREE.MeshBasicMaterial(),
        floorMaterial: new THREE.MeshBasicMaterial(),
        ventGeometry: new THREE.BoxGeometry(0.1, 0.1, 0.1),
        ventMaterial: new THREE.MeshBasicMaterial(),
        hashTile: ThreeGame.prototype.hashTile,
        createSeededRandom: ThreeGame.prototype.createSeededRandom,
        getWallKey: (x, z) => `${x},${z}`,
        configureWallMesh: vi.fn(),
        generatePocket: vi.fn(() => makeFakePocket()),
        createSnailDropPlacement: vi.fn(() => ({ type: 'health' })),
        createPickupInstance: vi.fn(() => new THREE.Group())
    };
}

describe('mountPocket — pickup registration', () => {
    it('registers the pocket pickup in pickupMeshes, not just the scene group', () => {
        const game = makeFakeGame();
        const group = ThreeGame.prototype.mountPocket.call(game, 10, 20);

        expect(game.createPickupInstance).toHaveBeenCalled();
        expect(game.pickupMeshes).toHaveLength(1);
        // Also still a child of the mounted group, for rendering/positioning.
        expect(group.children).toContain(game.pickupMeshes[0]);
    });
});

describe('updatePocketContent — pickup scoping', () => {
    it('only runs updatePickups against this pocket\'s own pickups, not the full surface list', () => {
        const game = makeFakeGame();
        const group = ThreeGame.prototype.mountPocket.call(game, 10, 20);
        const pocketPickup = game.pickupMeshes[0];
        const surfacePickup = new THREE.Group();
        game.pickupMeshes.push(surfacePickup); // not a child of the pocket group

        game.player = { position: { x: 10, y: -6, z: 20 } };
        game._pocketHoleX = 10;
        game._pocketHoleZ = 20;
        game.updatePickups = vi.fn(function fakeUpdatePickups() {
            // Mirrors updatePickups' real contract: reads/iterates this.pickupMeshes.
            expect(this.pickupMeshes).toEqual([pocketPickup]);
        });

        ThreeGame.prototype.updatePocketContent.call(game, 0.016, 1000);

        expect(game.updatePickups).toHaveBeenCalledOnce();
        // pickupMeshes must be restored to the full list afterward, so the
        // surface's own bookkeeping isn't corrupted once the player climbs
        // back out.
        expect(game.pickupMeshes).toEqual([pocketPickup, surfacePickup]);
        expect(group.children).toContain(pocketPickup);
    });

    it('does nothing if the current pocket has no mounted group', () => {
        const game = makeFakeGame();
        game.player = { position: { x: 10, y: -6, z: 20 } };
        game._pocketHoleX = 10;
        game._pocketHoleZ = 20;
        game.updatePickups = vi.fn();

        ThreeGame.prototype.updatePocketContent.call(game, 0.016, 1000);

        expect(game.updatePickups).not.toHaveBeenCalled();
    });
});
