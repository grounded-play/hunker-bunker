import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAYOR_TINA_PLAYER_VISUAL, ThreeGame } from './threeGame.js';
import { WORLD_3D_MODELS } from './world3dOverlay.js';

describe('Mayor Tina secret encounter', () => {
    let originalWindow;
    let originalDocument;
    let originalCustomEvent;

    beforeEach(() => {
        originalWindow = globalThis.window;
        originalDocument = globalThis.document;
        originalCustomEvent = globalThis.CustomEvent;
        globalThis.window = {
            dispatchEvent: vi.fn(),
            AudioManager: { play: vi.fn() }
        };
        globalThis.document = { getElementById: vi.fn(() => null) };
        globalThis.CustomEvent = class {
            constructor(type, init = {}) {
                this.type = type;
                this.detail = init.detail;
            }
        };
    });

    afterEach(() => {
        globalThis.window = originalWindow;
        globalThis.document = originalDocument;
        globalThis.CustomEvent = originalCustomEvent;
        vi.restoreAllMocks();
    });

    it('registers both uploaded GLBs as normalized world models', () => {
        expect(WORLD_3D_MODELS.secret_mayor_tina.url).toBe('/3d/runtime/secrets/mayor-tina.glb');
        expect(WORLD_3D_MODELS.secret_teacup_roach.url).toBe('/3d/runtime/secrets/teacup-roach.glb');
        expect(WORLD_3D_MODELS.secret_mayor_tina.height).toBeGreaterThan(0);
        expect(WORLD_3D_MODELS.secret_teacup_roach.height).toBeGreaterThan(0);
    });

    it('uses the rigged Mayor mesh with the normal Scout locomotion pack', () => {
        expect(MAYOR_TINA_PLAYER_VISUAL).toMatchObject({
            modelUrl: '/3d/runtime/secrets/mayor-tina-rigged.glb',
            animationModelUrl: '/3d/scouting-scout/Scout.game.glb',
            animationBonePrefix: 'mixamorig',
            weaponEnabled: false,
            allowStatic: false
        });
    });

    it('places the encounter farther down the approach and keeps it stable for each seed', () => {
        const positions = new Set();
        for (const runEntropy of [0, 1, 2, 3, 4, 5, 6, 99999, -1, 0xffffffff]) {
            const position = ThreeGame.prototype.getMayorTinaEncounterPosition.call({ runEntropy });
            expect(position.x).toBe(9);
            expect(position.z).toBeGreaterThanOrEqual(-20);
            expect(position.z).toBeLessThanOrEqual(-14);
            expect(Math.hypot(position.x - 9, position.z - 9)).toBeGreaterThanOrEqual(23);
            expect(ThreeGame.prototype.getMayorTinaEncounterPosition.call({ runEntropy })).toEqual(position);
            positions.add(position.z);
        }
        expect(positions.size).toBe(7);
    });

    it('keeps both encounter models facing the approach after repeated setup and a new-run reset', async () => {
        const mayorRoot = new THREE.Group();
        const teacupRoot = new THREE.Group();
        const normalizedModel = new THREE.Group();
        normalizedModel.rotation.y = Math.PI;
        mayorRoot.add(normalizedModel);
        const game = {
            runEntropy: 0,
            performanceProfile: 'gameplay',
            scene: new THREE.Scene(),
            mayorTinaEncounter: { phase: 'idle', lastSirenAt: 0, calloutIndex: 0 },
            createWorld3dModel: vi.fn(async (type) => type === 'secret_mayor_tina' ? mayorRoot : teacupRoot),
            getMayorTinaEncounterPosition: ThreeGame.prototype.getMayorTinaEncounterPosition
        };
        await expect(ThreeGame.prototype.setupMayorTinaEncounter.call(game)).resolves.toBe(true);
        await expect(ThreeGame.prototype.setupMayorTinaEncounter.call(game)).resolves.toBe(true);
        expect(game.createWorld3dModel).toHaveBeenCalledTimes(2);
        expect(mayorRoot.rotation.y).toBe(Math.PI);
        expect(teacupRoot.rotation.y).toBe(Math.PI);
        expect(normalizedModel.rotation.y).toBe(Math.PI);
        expect(mayorRoot.position.z).toBeCloseTo(-14.03);
        expect(teacupRoot.position.z).toBe(-14);

        game.runEntropy = 6;
        ThreeGame.prototype.resetMayorTinaEncounter.call(game);
        expect(mayorRoot.rotation.y).toBe(Math.PI);
        expect(teacupRoot.rotation.y).toBe(Math.PI);
        expect(normalizedModel.rotation.y).toBe(Math.PI);
        expect(mayorRoot.position.z).toBeCloseTo(-20.03);
        expect(teacupRoot.position.z).toBe(-20);
        expect(game.scene.children).toHaveLength(2);
    });

    it('locks input and requests the door cinematic when the player interacts nearby', () => {
        const game = {
            mayorTinaEncounter: { phase: 'idle', mayorRoot: new THREE.Group() },
            isMultiplayer: false,
            player: { position: new THREE.Vector3(9, 0, 1.55) },
            cinematicLock: false,
            setInputEnabled: vi.fn(),
            getMayorTinaEncounterPosition: () => ({ x: 9, z: 1.55 })
        };

        expect(ThreeGame.prototype.interactWithMayorTina.call(game)).toBe(true);
        expect(game.mayorTinaEncounter.phase).toBe('transforming');
        expect(game.cinematicLock).toBe(true);
        expect(game.setInputEnabled).toHaveBeenCalledWith(false);
        expect(window.dispatchEvent.mock.calls[0][0].type).toBe('mayor-tina-transform-requested');
    });

    it('leaves the original operator downed and makes rigged Mayor Tina the controlled overlay', async () => {
        const scene = new THREE.Scene();
        const player = new THREE.Group();
        player.position.set(9, 0, 1.55);
        scene.add(player);
        const originalRoot = new THREE.Group();
        originalRoot.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 0.4)));
        player.add(originalRoot);
        const originalOverlay = {
            root: originalRoot,
            setDowned: vi.fn()
        };
        const mayorRoot = new THREE.Group();
        scene.add(mayorRoot);
        const transformedRoot = new THREE.Group();
        const transformedOverlay = {
            root: transformedRoot,
            actions: new Map([['walk', {}], ['run', {}]]),
            dispose: vi.fn()
        };
        const teacupRoot = new THREE.Group();
        scene.add(teacupRoot);
        const game = {
            scene,
            player,
            player3dOverlay: originalOverlay,
            playerSprite: { visible: true },
            playerSpriteLead: 0.08,
            facingYaw: 0,
            mayorTinaEncounter: { phase: 'transforming', mayorRoot, teacupRoot },
            createMayorTinaPlayerOverlay: vi.fn(async () => transformedOverlay),
            showBunkerLine: vi.fn()
        };

        await expect(ThreeGame.prototype.completeMayorTinaTransformation.call(game)).resolves.toBe(true);
        expect(originalOverlay.setDowned).toHaveBeenCalledWith(true);
        expect(originalRoot.parent).toBe(scene);
        expect(mayorRoot.parent).toBe(null);
        expect(teacupRoot.parent).toBe(null);
        expect(transformedRoot.parent).toBe(player);
        expect(game.player3dOverlay).toBe(transformedOverlay);
        expect(game.mayorTinaEncounter.transformedOverlay).toBe(transformedOverlay);
        expect(game.mayorTinaEncounter.phase).toBe('transformed');
        expect(game.playerSprite.visible).toBe(false);
    });
});
