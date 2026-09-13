import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

function makeGame() {
    const placements = [];
    const game = {
        scene: new THREE.Scene(),
        player: new THREE.Object3D(),
        foundry: { isRevealed: true, getPosition: () => ({ x: 30, z: 40 }) },
        chunkSize: 19,
        chunkGroups: new THREE.Group(),
        chunkMeshes: new Map([['1,2', { visible: true }]]),
        pocketCache: new Map(),
        pocketGroups: new Map(),
        pickupMeshes: [],
        wallHeight: 2.8,
        wallGeometry: new THREE.BoxGeometry(1, 2.8, 1),
        wallMaterial: new THREE.MeshStandardMaterial(),
        floorMaterial: new THREE.MeshStandardMaterial(),
        ventGeometry: new THREE.BoxGeometry(0.2, 0.2, 0.1),
        ventMaterial: new THREE.MeshBasicMaterial(),
        runEntropy: 5,
        hashTile: ThreeGame.prototype.hashTile,
        createSeededRandom: ThreeGame.prototype.createSeededRandom,
        getWallKey: ThreeGame.prototype.getWallKey,
        generatePocket: ThreeGame.prototype.generatePocket,
        configureWallMesh: vi.fn(),
        createSnailDropPlacement: vi.fn(() => ({ type: 'tech' })),
        createPickupInstance: vi.fn(() => new THREE.Object3D()),
        createScatterInstance: vi.fn((placement) => {
            placements.push(placement);
            const object = new THREE.Object3D();
            object.userData = { world3dModelType: placement.type };
            return object;
        }),
        mountPocket: ThreeGame.prototype.mountPocket,
        mountFoundryInterior: ThreeGame.prototype.mountFoundryInterior,
        captureSurfaceCameraBeforePortal: ThreeGame.prototype.captureSurfaceCameraBeforePortal,
        applyPortalCameraProfile: ThreeGame.prototype.applyPortalCameraProfile,
        restoreSurfaceCameraAfterPortal: ThreeGame.prototype.restoreSurfaceCameraAfterPortal,
        cameraOrbitRadius: 11.3,
        cameraLift: 12.5,
        perspectiveCamera: { far: 160, updateProjectionMatrix: vi.fn() },
        orthographicCamera: { far: 100, updateProjectionMatrix: vi.fn() },
        thirdPersonCameraConfig: { distance: 5.4, lift: 5.8 },
        setInputEnabled(value) { this.inputEnabled = value; },
        snapCameraToPlayer: vi.fn(),
        showBunkerLine: vi.fn(),
        fillHoleAt: vi.fn(),
        placements
    };
    game.player.position.set(29.5, 0, 39.5);
    return game;
}

describe('Foundry authored interior plane', () => {
    beforeEach(() => {
        globalThis.CustomEvent = class CustomEvent {
            constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
        };
        globalThis.window = { dispatchEvent: vi.fn() };
    });

    it('enters a covered space-kit room and applies interior camera limits', () => {
        const game = makeGame();

        expect(ThreeGame.prototype.enterFoundryInterior.call(game)).toBe(true);

        expect(game.planeState.stack.at(-1)).toMatchObject({ id: 'foundry-interior', kind: 'interior' });
        expect(game.isInPocket).toBe(true);
        expect(game.player.position.toArray()).toEqual([30, -6, 40]);
        expect(game.chunkGroups.visible).toBe(false);
        expect(game.perspectiveCamera.far).toBe(60);
        expect(game.thirdPersonCameraConfig.distance).toBe(3.1);
        expect(game.placements).toContainEqual(expect.objectContaining({ type: 'kit_space_room_small' }));
        const group = game.pocketGroups.get('30,40');
        expect(group.children.some((child) => child.userData?.isPortalCeiling)).toBe(true);
        expect(group.children.some((child) => child.userData?.isFoundryInteriorWorkbench)).toBe(true);
    });

    it('returns to the exact exterior point without sealing a doorway as a hole', () => {
        const game = makeGame();
        ThreeGame.prototype.enterFoundryInterior.call(game);

        expect(ThreeGame.prototype.exitPocket.call(game)).toBe(true);

        expect(game.player.position.toArray()).toEqual([29.5, 0, 39.5]);
        expect(game.planeState.stack).toHaveLength(1);
        expect(game.chunkGroups.visible).toBe(true);
        expect(game.perspectiveCamera.far).toBe(160);
        expect(game.thirdPersonCameraConfig.distance).toBe(5.4);
        expect(game.fillHoleAt).not.toHaveBeenCalled();
    });

    it('exposes the workbench and south airlock as contextual interactions', () => {
        const game = makeGame();
        ThreeGame.prototype.enterFoundryInterior.call(game);

        let candidates = ThreeGame.prototype.getPriorityInteractionCandidates.call(game);
        expect(candidates.map(({ id, label }) => ({ id, label }))).toEqual([{
            id: 'foundry-interior-workbench',
            label: 'FABRICATION WORKBENCH'
        }]);
        candidates[0].interact();
        expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
            type: 'open-fabrication-bay'
        }));

        game.player.position.set(30, -6, 44);
        candidates = ThreeGame.prototype.getPriorityInteractionCandidates.call(game);
        expect(candidates.map(({ id, label }) => ({ id, label }))).toEqual([{
            id: 'foundry-interior-exit',
            label: 'EXIT FOUNDRY'
        }]);
    });

    it('clears an interior prompt when returning to the surface', () => {
        const game = makeGame();
        ThreeGame.prototype.enterFoundryInterior.call(game);
        game._portalPromptLabel = 'EXIT THROUGH SOUTH AIRLOCK';
        window.dispatchEvent.mockClear();

        ThreeGame.prototype.exitPocket.call(game);

        expect(game._portalPromptLabel).toBeNull();
        expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
            type: 'camp-prompt-clear'
        }));
    });
});
