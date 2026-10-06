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

    it('places the encounter in Ring 2 and keeps it stable for each seed', () => {
        const positions = new Set();
        for (const runEntropy of [0, 1, 2, 3, 4, 5, 6, 99999, -1, 0xffffffff]) {
            const position = ThreeGame.prototype.getMayorTinaEncounterPosition.call({ runEntropy });
            const distance = Math.hypot(position.x - 9, position.z - 9);
            expect(distance).toBeGreaterThanOrEqual(78);
            expect(distance).toBeLessThanOrEqual(118);
            expect(ThreeGame.prototype.getMayorTinaEncounterPosition.call({ runEntropy })).toEqual(position);
            positions.add(`${position.x},${position.z}`);
        }
        expect(positions.size).toBeGreaterThanOrEqual(5);
    });

    it('gates Mayor Tina behind a deterministic ~25% rare seed distribution', () => {
        let eligible = 0;
        const total = 1000;
        for (let i = 0; i < total; i++) {
            if (ThreeGame.prototype.isMayorTinaSpawnEligible.call({ runEntropy: i })) {
                eligible++;
            }
        }
        expect(eligible / total).toBeCloseTo(0.25, 1);
        expect(ThreeGame.prototype.isMayorTinaSpawnEligible.call({ forceMayorTinaSpawn: true, runEntropy: 1 })).toBe(true);
    });

    it('keeps only teacup visible in idle and resets properly', async () => {
        const mayorRoot = new THREE.Group();
        const teacupRoot = new THREE.Group();
        const normalizedModel = new THREE.Group();
        normalizedModel.rotation.y = WORLD_3D_MODELS.secret_mayor_tina.yaw;
        mayorRoot.add(normalizedModel);
        const game = {
            runEntropy: 0,
            forceMayorTinaSpawn: true,
            isMayorTinaSpawnEligible: ThreeGame.prototype.isMayorTinaSpawnEligible,
            performanceProfile: 'gameplay',
            scene: new THREE.Scene(),
            mayorTinaEncounter: { phase: 'idle', lastSirenAt: 0, calloutIndex: 0 },
            createWorld3dModel: vi.fn(async (type) => type === 'secret_mayor_tina' ? mayorRoot : teacupRoot),
            getMayorTinaEncounterPosition: ThreeGame.prototype.getMayorTinaEncounterPosition
        };
        await expect(ThreeGame.prototype.setupMayorTinaEncounter.call(game)).resolves.toBe(true);
        await expect(ThreeGame.prototype.setupMayorTinaEncounter.call(game)).resolves.toBe(true);
        expect(game.createWorld3dModel).toHaveBeenCalledTimes(2);
        expect(mayorRoot.rotation.y + normalizedModel.rotation.y).toBeCloseTo(0, 6);
        expect(teacupRoot.rotation.y).toBe(Math.PI);
        const pos0 = game.getMayorTinaEncounterPosition();
        expect(teacupRoot.position.x).toBe(pos0.x);
        expect(teacupRoot.position.z).toBe(pos0.z);
        expect(teacupRoot.visible).toBe(true);
        expect(mayorRoot.visible).toBe(false); // Tina hidden initially!

        game.runEntropy = 6;
        ThreeGame.prototype.resetMayorTinaEncounter.call(game);
        expect(mayorRoot.rotation.y + normalizedModel.rotation.y).toBeCloseTo(0, 6);
        expect(teacupRoot.rotation.y).toBe(Math.PI);
        const pos6 = game.getMayorTinaEncounterPosition();
        expect(teacupRoot.position.x).toBe(pos6.x);
        expect(teacupRoot.position.z).toBe(pos6.z);
        expect(teacupRoot.visible).toBe(true);
        expect(mayorRoot.visible).toBe(false);
        expect(game.scene.children).toHaveLength(2);
    });

    // The roach's config yaw is what prepareWorld3dModel applies to the
    // normalized child; the hostile chase turns the root so +Z points at the
    // player. Their sum must face the player, or Tina chases backwards.
    it('faces the player while chasing, not away from them', () => {
        const mayorRoot = new THREE.Group();
        const normalizedModel = new THREE.Group();
        normalizedModel.rotation.y = WORLD_3D_MODELS.secret_mayor_tina.yaw;
        mayorRoot.add(normalizedModel);
        const game = {
            mayorTinaEncounter: { phase: 'hostile', mayorRoot, tinaDead: false, hostileLastUpdateAt: 1000, hostileAttackReadyAt: Infinity },
            player: { position: new THREE.Vector3(6, 0, 0) },
            canOccupyPosition: () => true,
            takeDamage: vi.fn()
        };
        ThreeGame.prototype.updateMayorTinaEncounter.call(game, 1050);
        const facing = mayorRoot.rotation.y + normalizedModel.rotation.y;
        const toPlayer = new THREE.Vector2(6 - mayorRoot.position.x, -mayorRoot.position.z).normalize();
        expect(Math.sin(facing)).toBeCloseTo(toPlayer.x, 3);
        expect(Math.cos(facing)).toBeCloseTo(toPlayer.y, 3);
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

    it('removes the cup, disables friendly interaction, and starts a grounded chase on the warning hit', () => {
        const scene = new THREE.Scene();
        const mayorRoot = new THREE.Group();
        const teacupRoot = new THREE.Group();
        mayorRoot.position.set(9, 0.43, -14);
        scene.add(mayorRoot, teacupRoot);
        const prompt = { classList: { add: vi.fn(), remove: vi.fn(), toggle: vi.fn() }, querySelector: vi.fn() };
        document.getElementById.mockReturnValue(prompt);
        const game = {
            mayorTinaEncounter: { phase: 'idle', mayorRoot, teacupRoot, tinaDead: false },
            player: { position: new THREE.Vector3(9, 0, -8) },
            spawnDamagePip: vi.fn(),
            audioAt: vi.fn(() => ({ volume: 0.45 })),
            showBunkerLine: vi.fn(),
            getMayorTinaEncounterPosition: () => ({ x: 9, z: -14 }),
            canOccupyPosition: vi.fn(() => true),
            takeDamage: vi.fn()
        };
        ThreeGame.prototype.onMayorTinaHit.call(game, { outcome: 'warning' });
        expect(game.mayorTinaEncounter.phase).toBe('hostile');
        expect(teacupRoot.parent).toBeNull();
        expect(mayorRoot.position.y).toBe(0);
        expect(ThreeGame.prototype.interactWithMayorTina.call({ ...game, isMultiplayer: false })).toBe(false);

        const beforeZ = mayorRoot.position.z;
        game.mayorTinaEncounter.hostileLastUpdateAt = 1000;
        ThreeGame.prototype.updateMayorTinaEncounter.call(game, 1050);
        expect(mayorRoot.position.z).toBeGreaterThan(beforeZ);
        expect(prompt.classList.add).toHaveBeenCalledWith('hidden');
        expect(game.showBunkerLine).not.toHaveBeenCalled();
    });

    it('attacks on a cooldown while hostile and slides along a blocked axis', () => {
        const mayorRoot = new THREE.Group();
        const game = {
            mayorTinaEncounter: { phase: 'hostile', mayorRoot, tinaDead: false, hostileLastUpdateAt: 1000, hostileAttackReadyAt: 0 },
            player: { position: new THREE.Vector3(0.7, 0, 0.7) },
            canOccupyPosition: vi.fn((x, _z) => x === 0),
            takeDamage: vi.fn()
        };
        ThreeGame.prototype.updateMayorTinaEncounter.call(game, 1050);
        expect(mayorRoot.position.x).toBe(0);
        expect(mayorRoot.position.z).toBeGreaterThan(0);
        expect(game.takeDamage).toHaveBeenCalledTimes(1);
        ThreeGame.prototype.updateMayorTinaEncounter.call(game, 1100);
        expect(game.takeDamage).toHaveBeenCalledTimes(1);
    });

    it('removes every residual actor and voice on death, then fully resets the encounter', () => {
        const scene = new THREE.Scene();
        const mayorRoot = new THREE.Group();
        const teacupRoot = new THREE.Group();
        scene.add(mayorRoot, teacupRoot);
        window.AudioManager.activeVoice = { speakerName: 'MAYOR TINA' };
        window.AudioManager.stopActiveVoice = vi.fn();
        window.AudioManager.playMetalStress = vi.fn();
        const game = {
            runEntropy: 0,
            performanceProfile: 'gameplay',
            scene,
            player: { position: new THREE.Vector3() },
            mayorTinaEncounter: { phase: 'hostile', mayorRoot, teacupRoot, tinaDead: true, tinaHostile: true, tinaHitsRemaining: 0 },
            spawnDamagePip: vi.fn(),
            audioAt: vi.fn(() => ({})),
            getMayorTinaEncounterPosition: ThreeGame.prototype.getMayorTinaEncounterPosition,
            act2: null
        };
        ThreeGame.prototype.onMayorTinaHit.call(game, { outcome: 'killed' });
        expect(game.mayorTinaEncounter.phase).toBe('dead');
        expect(teacupRoot.parent).toBeNull();
        expect(mayorRoot.visible).toBe(false);
        expect(window.AudioManager.stopActiveVoice).toHaveBeenCalledOnce();

        ThreeGame.prototype.resetMayorTinaEncounter.call(game);
        expect(game.mayorTinaEncounter).toMatchObject({
            phase: 'idle', tinaDead: false, tinaHostile: false, tinaHitsRemaining: 4,
            hostileLastUpdateAt: 0, hostileAttackReadyAt: 0
        });
        expect(scene.children).toContain(mayorRoot);
        expect(scene.children).toContain(teacupRoot);
        expect(teacupRoot.visible).toBe(true);
        expect(mayorRoot.visible).toBe(false);
    });

    it('allows projectiles to hit the teacup during idle and burst into hostile chasing Tina', () => {
        const mayorRoot = new THREE.Group();
        const teacupRoot = new THREE.Group();
        teacupRoot.position.set(20, 0, 80);
        mayorRoot.position.set(20, 0.43, 79.97);
        mayorRoot.visible = false;
        teacupRoot.visible = true;
        const game = {
            mayorTinaEncounter: { phase: 'idle', mayorRoot, teacupRoot, tinaDead: false, tinaHitsRemaining: 4 },
            player: { position: new THREE.Vector3(20, 0, 75) },
            onMayorTinaHit: vi.fn(),
            spawnPhysicalBurst: vi.fn(),
            triggerCameraShake: vi.fn()
        };
        const projectile = {
            isEnemy: false,
            mesh: { position: new THREE.Vector3(20, 0, 80.1) },
            radius: 0.1
        };
        const hit = ThreeGame.prototype.checkProjectileMayorTinaHit.call(game, projectile);
        expect(hit).toBe(true);
        expect(game.onMayorTinaHit).toHaveBeenCalled();
    });

    it('unlocks the Scout: Mayor Tina secret skin upon transformation completion and combat victory', () => {
        const grantSecret = vi.fn();
        window.itemOwnership = { grantSecret };
        const game = {
            mayorTinaEncounter: { phase: 'transformed' },
            act2: { adjustInfectionLoad: vi.fn() },
            showBunkerLine: vi.fn()
        };
        ThreeGame.prototype.finishMayorTinaTransformationSequence.call(game);
        expect(grantSecret).toHaveBeenCalledWith('skin_scout_mayor_tina');

        grantSecret.mockClear();
        const mayorRoot = new THREE.Group();
        const combatGame = {
            mayorTinaEncounter: { phase: 'hostile', mayorRoot, tinaDead: true },
            showBunkerLine: vi.fn(),
            spawnDamagePip: vi.fn(),
            audioAt: vi.fn(() => ({}))
        };
        ThreeGame.prototype.onMayorTinaHit.call(combatGame, { outcome: 'killed' });
        expect(grantSecret).toHaveBeenCalledWith('skin_scout_mayor_tina');
    });
});
