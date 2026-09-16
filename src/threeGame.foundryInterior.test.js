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
        discardPortalGroup: ThreeGame.prototype.discardPortalGroup,
        exitPocket: ThreeGame.prototype.exitPocket,
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

    it('opens ordinary fabrication on the surface without entering the underground plane', () => {
        const game = makeGame();
        game.isGameplayInputActive = () => true;
        game.isAct2Active = () => false;
        game.foundry.isWithinInteractRange = () => true;
        game.enterFoundryInterior = vi.fn();

        expect(ThreeGame.prototype.interactWithFoundry.call(game)).toBe(true);

        expect(game.enterFoundryInterior).not.toHaveBeenCalled();
        expect(game.player.position.toArray()).toEqual([29.5, 0, 39.5]);
        expect(game.chunkGroups.visible).toBe(true);
        expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
            type: 'open-fabrication-bay',
            detail: expect.objectContaining({ source: 'surface-foundry' })
        }));
    });

    it('preserves the Act 2 signal-dish interaction instead of opening fabrication', () => {
        const game = makeGame();
        game.isGameplayInputActive = () => true;
        game.isAct2Active = () => true;
        game.foundry.isWithinInteractRange = () => true;
        game.act2 = { getPhase: () => 'dish', buildDish: vi.fn() };
        game.triggerCameraShake = vi.fn();
        globalThis.window.AudioManager = { play: vi.fn() };

        expect(ThreeGame.prototype.interactWithFoundry.call(game)).toBe(true);

        expect(game.act2.buildDish).toHaveBeenCalledOnce();
        expect(window.dispatchEvent).not.toHaveBeenCalledWith(expect.objectContaining({
            type: 'open-fabrication-bay'
        }));
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
        const group = game.pocketGroups.get('foundry:30,40');
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

    it('does not reuse or overwrite an ordinary pit at the same world coordinate', () => {
        const game = makeGame();
        const pit = game.mountPocket(30, 40);
        const pitGrid = game.pocketCache.get('30,40');
        expect(ThreeGame.prototype.enterFoundryInterior.call(game)).toBe(true);
        expect(game.pocketGroups.get('30,40')).toBe(pit);
        expect(game.pocketCache.get('30,40')).toBe(pitGrid);
        expect(game.pocketGroups.get('foundry:30,40')).not.toBe(pit);
        expect(ThreeGame.prototype.getTileType.call(game, 30, 45)).toBe('.');
        expect(ThreeGame.prototype.getCachedTileType.call(game, 30, 45)).toBe('.');
    });

    it('rolls back a failed mount and permits a clean retry without leaking pickups', () => {
        const game = makeGame();
        const original = game.createScatterInstance;
        game.createScatterInstance = vi.fn(() => { throw new Error('asset failed'); });
        const disposeFloor = vi.spyOn(game.floorMaterial, 'dispose');
        const disposeWalls = vi.spyOn(game.wallGeometry, 'dispose');
        expect(ThreeGame.prototype.enterFoundryInterior.call(game)).toBe(false);
        expect(game.player.position.toArray()).toEqual([29.5, 0, 39.5]);
        expect(game.chunkGroups.visible).toBe(true);
        expect(game.planeState.stack).toHaveLength(1);
        expect(game.planeState.transitioning).toBe(false);
        expect(game.isInPocket).toBe(false);
        expect(game.pocketGroups.size).toBe(0);
        expect(game.pickupMeshes).toHaveLength(0);
        expect(disposeFloor).not.toHaveBeenCalled();
        expect(disposeWalls).not.toHaveBeenCalled();
        expect(window.dispatchEvent).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'portal-plane-entered' }));
        game.createScatterInstance = original;
        expect(ThreeGame.prototype.enterFoundryInterior.call(game)).toBe(true);
    });

    it('rolls back camera, player transforms and visibility if entry fails after mounting', () => {
        const game = makeGame();
        game.inputEnabled = false;
        game.player.scale.set(0.5, 0.5, 0.5);
        game.setInputEnabled = () => { throw new Error('input transition failed'); };
        expect(ThreeGame.prototype.enterFoundryInterior.call(game)).toBe(false);
        expect(game.perspectiveCamera.far).toBe(160);
        expect(game.thirdPersonCameraConfig.distance).toBe(5.4);
        expect(game.player.position.toArray()).toEqual([29.5, 0, 39.5]);
        expect(game.player.scale.toArray()).toEqual([0.5, 0.5, 0.5]);
        expect(game.inputEnabled).toBe(false);
        expect(game.chunkGroups.visible).toBe(true);
        expect(game.scene.children).toHaveLength(0);
    });

    it('keeps the transition guarded while assets mount', () => {
        const game = makeGame();
        const mount = game.mountFoundryInterior;
        game.mountFoundryInterior = (...args) => {
            expect(ThreeGame.prototype.enterFoundryInterior.call(game)).toBe(false);
            return mount.call(game, ...args);
        };
        expect(ThreeGame.prototype.enterFoundryInterior.call(game)).toBe(true);
        expect(game.planeState.stack).toHaveLength(2);
    });

    it.each([NaN, Infinity])('rejects a non-finite destination (%s) without hiding the surface', (value) => {
        const game = makeGame();
        game.foundry.getPosition = () => ({ x: value, z: 40 });
        expect(ThreeGame.prototype.enterFoundryInterior.call(game)).toBe(false);
        expect(game.chunkGroups.visible).toBe(true);
        expect(game.pocketGroups.size).toBe(0);
    });

    it('hides the interior on exit and makes the cached room visible on re-entry', () => {
        const game = makeGame();
        ThreeGame.prototype.enterFoundryInterior.call(game);
        const group = game.pocketGroups.get('foundry:30,40');
        game.exitPocket();
        expect(group.visible).toBe(false);
        expect(game._pocketCacheKey).toBeNull();
        ThreeGame.prototype.enterFoundryInterior.call(game);
        expect(game.pocketGroups.get('foundry:30,40')).toBe(group);
        expect(group.visible).toBe(true);
    });

    it.each([[30, -20, 40], [60, -6, 40], [NaN, -6, 40]])('recovers escaped position %j to the interior floor', (x, y, z) => {
        const game = makeGame();
        ThreeGame.prototype.enterFoundryInterior.call(game);
        game.player.position.set(x, y, z);
        ThreeGame.prototype.updatePortalPlanePresentation.call(game);
        expect(game.player.position.toArray()).toEqual([30, -6, 40]);
        expect(game.isInPocket).toBe(true);
        expect(game.chunkGroups.visible).toBe(false);
    });

    it('returns to the surface if the active floor is lost, then rebuilds on retry', () => {
        const game = makeGame();
        ThreeGame.prototype.enterFoundryInterior.call(game);
        const group = game.pocketGroups.get('foundry:30,40');
        group.children.find((child) => child.userData?.isPortalFloor).visible = false;
        ThreeGame.prototype.updatePortalPlanePresentation.call(game);
        expect(game.player.position.toArray()).toEqual([29.5, 0, 39.5]);
        expect(game.chunkGroups.visible).toBe(true);
        expect(game.isInPocket).toBe(false);
        expect(game.fillHoleAt).not.toHaveBeenCalled();
        expect(ThreeGame.prototype.enterFoundryInterior.call(game)).toBe(true);
        expect(game.pocketGroups.get('foundry:30,40')).not.toBe(group);
    });
});
