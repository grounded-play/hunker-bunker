import { describe, expect, it, vi } from 'vitest';
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
