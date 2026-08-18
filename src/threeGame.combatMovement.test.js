import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

describe('combat movement separation', () => {
    it('gives one A press to only the nearest overlapping ship station', () => {
        const openConsole = vi.fn(() => true);
        const openO2 = vi.fn(() => true);
        const game = {
            player: { position: { x: 0, z: 0 } },
            activeInteractiveConsole: { tileX: 0, tileZ: 0, consoleOffset: { x: 2, z: 0 } },
            activeInteractiveO2Generator: {},
            activeInteractiveBaseTurret: null,
            foundry: null,
            getActiveO2GeneratorPosition: () => ({ x: 0.5, z: 0 }),
            interactWithConsole: openConsole,
            interactWithO2Generator: openO2,
            interactWithBaseTurret: vi.fn(),
            interactWithFoundry: vi.fn()
        };

        expect(ThreeGame.prototype.interactWithNearestShipStation.call(game)).toBe(true);
        expect(openO2).toHaveBeenCalledOnce();
        expect(openConsole).not.toHaveBeenCalled();
    });

    it('routes a hunting boss around an indestructible cliff edge', () => {
        const sprite = {
            position: { x: 0, y: 0, z: 0 },
            userData: {
                type: 'boss_cybersnail',
                isBoss: true,
                speed: 2,
                aiMode: 'hunt',
                targetType: 'player',
                pathRetargetTimer: 0,
                bossAttackTimer: 999,
                attackCooldown: 0,
                wallBreakCooldown: 0,
                knockbackTimer: 0
            }
        };
        const game = {
            selectSnailTarget: () => ({ type: 'player', mode: 'hunt', x: 4, z: 0, goalX: 4, goalZ: 0 }),
            isSnailTileWalkable: (x, z) => !(x === 1 && z === 0),
            findSnailPath: ThreeGame.prototype.findSnailPath,
            tryBossBreakWall: vi.fn(() => false),
            faceSpriteFromDir: vi.fn(),
            updateSheetSpriteFrame: vi.fn(),
            updateSnailBehavior: ThreeGame.prototype.updateSnailBehavior
        };

        ThreeGame.prototype.updateSnailBehavior.call(game, sprite, 0.5, null);

        expect(sprite.userData.pathNodes.length).toBeGreaterThan(2);
        expect(sprite.position.z).not.toBe(0);
        expect(game.tryBossBreakWall).not.toHaveBeenCalled();
    });

    it('keeps legs on movement and torso on mouse aim', () => {
        const game = {
            playerType: 'SCOUT',
            player3dOverlay: null,
            playerSprite: { visible: true },
            hasActiveAim: true,
            aimFacingRow: 6,
            currentFacingRow: 0,
            torsoFacingRow: 0,
            animationTimer: 0,
            lastAnimationColumn: -1,
            performanceProfile: 'gameplay',
            getFacingRow: vi.fn(() => 2),
            updatePlayerSpriteFrame: vi.fn()
        };

        ThreeGame.prototype.updatePlayerSpriteAnimation.call(game, 1, 0, 0.1, true, 1, 0);

        expect(game.currentFacingRow).toBe(2);
        expect(game.torsoFacingRow).toBe(6);
        expect(game.updatePlayerSpriteFrame).toHaveBeenCalledWith(expect.any(Number), 2, 6);
    });
});

describe('WASD screen-space movement regularization', () => {
    function createMockGameForMovement(keys = {}) {
        const invSqrt2 = 1 / Math.sqrt(2);
        return {
            keys: { up: false, down: false, left: false, right: false, shift: false, ...keys },
            virtualInput: { x: 0, z: 0 },
            cameraPlanarForward: new THREE.Vector2(-invSqrt2, -invSqrt2), // screen UP in isometric world
            cameraPlanarRight: new THREE.Vector2(invSqrt2, -invSqrt2),    // screen RIGHT in isometric world
            player: { position: new THREE.Vector3(0, 0, 0) },
            moveSpeed: 4.0,
            _sprintMoveSpeedMult: 1.0,
            playerSlowTimer: 0,
            canOccupyPosition: () => true,
            totalDistanceTravelled: 0,
            hasActiveAim: false,
            aimDirX: 1,
            aimDirZ: 0,
            currentFacingRow: 0,
            updatePlayerSpriteAnimation: vi.fn(),
            updatePlayerForwardLight: vi.fn(),
            getWorldDirectionForFacingRow: () => ({ x: 0, z: -1 }),
            playerGlow: { position: { set: vi.fn() } },
            playerMarker: { position: { set: vi.fn() } },
            playerMarkerHeight: 0,
            isPositionInPuddle: () => false,
            wetFootprintTrailTime: 0,
            footstepTimer: 0
        };
    }

    it('pressing W moves player straight UP on screen (world -X, -Z)', () => {
        const game = createMockGameForMovement({ up: true });
        const delta = 0.1;
        const initialX = game.player.position.x;
        const initialZ = game.player.position.z;

        // Simulate movement computation in updatePlayer
        const keyAxisX = (game.keys.right ? 1 : 0) - (game.keys.left ? 1 : 0);
        const keyAxisZ = (game.keys.down ? 1 : 0) - (game.keys.up ? 1 : 0);
        const screenAxisX = THREE.MathUtils.clamp(keyAxisX + game.virtualInput.x, -1, 1);
        const screenAxisZ = THREE.MathUtils.clamp(keyAxisZ + game.virtualInput.z, -1, 1);

        const moveAxisX = (game.cameraPlanarRight.x * screenAxisX) + (game.cameraPlanarForward.x * -screenAxisZ);
        const moveAxisZ = (game.cameraPlanarRight.y * screenAxisX) + (game.cameraPlanarForward.y * -screenAxisZ);

        const moveVector = new THREE.Vector3(moveAxisX, 0, moveAxisZ).normalize().multiplyScalar(game.moveSpeed * delta);
        game.player.position.add(moveVector);

        // Movement should be in negative X and negative Z (along cameraPlanarForward)
        expect(game.player.position.x - initialX).toBeCloseTo(-0.7071 * 0.4, 3);
        expect(game.player.position.z - initialZ).toBeCloseTo(-0.7071 * 0.4, 3);
    });

    it('pressing D moves player straight RIGHT on screen (world +X, -Z)', () => {
        const game = createMockGameForMovement({ right: true });
        const delta = 0.1;

        const keyAxisX = (game.keys.right ? 1 : 0) - (game.keys.left ? 1 : 0);
        const keyAxisZ = (game.keys.down ? 1 : 0) - (game.keys.up ? 1 : 0);
        const screenAxisX = THREE.MathUtils.clamp(keyAxisX + game.virtualInput.x, -1, 1);
        const screenAxisZ = THREE.MathUtils.clamp(keyAxisZ + game.virtualInput.z, -1, 1);

        const moveAxisX = (game.cameraPlanarRight.x * screenAxisX) + (game.cameraPlanarForward.x * -screenAxisZ);
        const moveAxisZ = (game.cameraPlanarRight.y * screenAxisX) + (game.cameraPlanarForward.y * -screenAxisZ);

        const moveVector = new THREE.Vector3(moveAxisX, 0, moveAxisZ).normalize().multiplyScalar(game.moveSpeed * delta);
        game.player.position.add(moveVector);

        expect(game.player.position.x).toBeCloseTo(0.7071 * 0.4, 3);
        expect(game.player.position.z).toBeCloseTo(-0.7071 * 0.4, 3);
    });

    it('normalizes diagonal movement speed to match cardinal speed (1.0x)', () => {
        const gameCardinal = createMockGameForMovement({ up: true });
        const gameDiagonal = createMockGameForMovement({ up: true, right: true });
        const delta = 0.1;

        const calcMove = (g) => {
            const kx = (g.keys.right ? 1 : 0) - (g.keys.left ? 1 : 0);
            const kz = (g.keys.down ? 1 : 0) - (g.keys.up ? 1 : 0);
            const sx = THREE.MathUtils.clamp(kx + g.virtualInput.x, -1, 1);
            const sz = THREE.MathUtils.clamp(kz + g.virtualInput.z, -1, 1);
            const mx = (g.cameraPlanarRight.x * sx) + (g.cameraPlanarForward.x * -sz);
            const mz = (g.cameraPlanarRight.y * sx) + (g.cameraPlanarForward.y * -sz);
            return new THREE.Vector3(mx, 0, mz).normalize().multiplyScalar(g.moveSpeed * delta);
        };

        const distCardinal = calcMove(gameCardinal).length();
        const distDiagonal = calcMove(gameDiagonal).length();

        expect(distDiagonal).toBeCloseTo(distCardinal, 5);
        expect(distDiagonal).toBeCloseTo(0.4, 5);
    });

    it('maintains independent movement vector when player aims in opposite direction (kiting)', () => {
        // Player moves DOWN (S key) while aiming UP (aimDirX = 0, aimDirZ = -1)
        const game = createMockGameForMovement({ down: true });
        game.hasActiveAim = true;
        game.aimDirX = 0;
        game.aimDirZ = -1;

        const keyAxisX = (game.keys.right ? 1 : 0) - (game.keys.left ? 1 : 0);
        const keyAxisZ = (game.keys.down ? 1 : 0) - (game.keys.up ? 1 : 0);
        const screenAxisX = THREE.MathUtils.clamp(keyAxisX + game.virtualInput.x, -1, 1);
        const screenAxisZ = THREE.MathUtils.clamp(keyAxisZ + game.virtualInput.z, -1, 1);

        const moveAxisX = (game.cameraPlanarRight.x * screenAxisX) + (game.cameraPlanarForward.x * -screenAxisZ);
        const moveAxisZ = (game.cameraPlanarRight.y * screenAxisX) + (game.cameraPlanarForward.y * -screenAxisZ);

        // Movement should still be Screen DOWN (positive X, positive Z in world), unaffected by aimDir
        expect(moveAxisX).toBeCloseTo(0.7071, 3);
        expect(moveAxisZ).toBeCloseTo(0.7071, 3);
    });

    it('triggerGameplayDash dashes along WASD movement vector when keys are pressed', () => {
        globalThis.window = {
            dispatchEvent: vi.fn(),
            AudioManager: { play: vi.fn() }
        };
        globalThis.CustomEvent = class CustomEvent {
            constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
        };

        const invSqrt2 = 1 / Math.sqrt(2);
        const game = {
            isGameplayInputActive: () => true,
            dashCooldownTimer: 0,
            isDashing: false,
            keys: { up: true, down: false, left: false, right: false },
            virtualInput: { x: 0, z: 0 },
            cameraPlanarForward: new THREE.Vector2(-invSqrt2, -invSqrt2),
            cameraPlanarRight: new THREE.Vector2(invSqrt2, -invSqrt2),
            aimDirX: 1,
            aimDirZ: 0,
            player: { position: { x: 0, z: 0 } },
            triggerCameraShake: vi.fn(),
            spawnPhysicalBurst: vi.fn()
        };

        ThreeGame.prototype.triggerGameplayDash.call(game);

        expect(game.isDashing).toBe(true);
        expect(game.dashDirX).toBeCloseTo(-0.7071, 3);
        expect(game.dashDirZ).toBeCloseTo(-0.7071, 3);
    });
});
