import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

describe('Boss Wall Destruction & Visibility', () => {
    it('smashes forward destructible wall when boss moves into it', () => {
        const damagedWalls = [];
        const destroyedBlastDoors = [];

        const game = {
            selectSnailTarget: () => ({ type: 'player', mode: 'hunt', x: 2, z: 0, goalX: 2, goalZ: 0 }),
            isSnailTileWalkable: (x, z) => !(x === 1 && z === 0),
            getTileType: (x, z) => (x === 1 && z === 0 ? '#' : '.'),
            isHoleTile: () => false,
            findSnailPath: () => [{ x: 2, z: 0 }],
            findWallMeshAt: (x, z) => ({ userData: { wallKey: `${x},${z}` } }),
            damageWall: vi.fn((wall, dmg) => damagedWalls.push({ wall, dmg })),
            destroyBunkerBlastDoor: vi.fn((opts) => destroyedBlastDoors.push(opts)),
            tryBossBreakWall: ThreeGame.prototype.tryBossBreakWall,
            faceSpriteFromDir: vi.fn(),
            updateSheetSpriteFrame: vi.fn(),
            takeDamage: vi.fn(),
            applySnailContactKnockback: vi.fn(),
            updateSnailBehavior: ThreeGame.prototype.updateSnailBehavior
        };

        const bossSprite = {
            position: { x: 0.3, z: 0 },
            userData: {
                isBoss: true,
                speed: 1.0,
                wallBreakCooldown: 0
            }
        };

        // Advance snail behavior towards (2, 0)
        game.updateSnailBehavior(bossSprite, 0.1);

        expect(game.damageWall).toHaveBeenCalled();
        expect(bossSprite.userData.wallBreakCooldown).toBeGreaterThan(0);
    });

    it('destroys bunker blast door when boss breaches blast door coordinates', () => {
        const game = {
            bunkerBlastDoorState: {
                destroyed: false,
                doorZ: 10,
                startTileX: 5,
                endTileX: 8
            },
            getTileType: () => '#',
            isHoleTile: () => false,
            destroyBunkerBlastDoor: vi.fn(),
            tryBossBreakWall: ThreeGame.prototype.tryBossBreakWall
        };

        const bossSprite = {
            position: { x: 6, z: 10 },
            userData: {
                isBoss: true,
                wallBreakCooldown: 0
            }
        };

        const broken = game.tryBossBreakWall(bossSprite, 6, 10);
        expect(broken).toBe(true);
        expect(game.destroyBunkerBlastDoor).toHaveBeenCalledWith({ source: 'boss' });
        expect(bossSprite.userData.wallBreakCooldown).toBeGreaterThan(0);
    });

    it('does not allow non-boss snail to break walls', () => {
        const game = {
            getTileType: () => '#',
            isHoleTile: () => false,
            tryBossBreakWall: ThreeGame.prototype.tryBossBreakWall
        };

        const normalSprite = {
            position: { x: 1, z: 0 },
            userData: {
                isBoss: false
            }
        };

        const broken = game.tryBossBreakWall(normalSprite, 1, 0);
        expect(broken).toBe(false);
    });
});
