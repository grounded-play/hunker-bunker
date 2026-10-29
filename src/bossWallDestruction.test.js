import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

describe('Boss Wall Destruction & Visibility', () => {
    it('stages the first O2 boss outside to advance on a two-tile camp breach', () => {
        const game = {
            getTileType: () => '#',
            showBunkerLine: vi.fn()
        };
        const boss = { userData: {} };

        expect(ThreeGame.prototype.stageFirstBossCampBreach.call(game, boss)).toBe(true);
        expect(boss.userData.campBreachCommitted).toBe(false);
        expect(boss.userData.campBreachTarget).toEqual({ x: 15, z: 5 });
        expect(boss.userData.campBreachTiles).toEqual([{ x: 15, z: 3 }, { x: 16, z: 3 }]);
        expect(game.showBunkerLine).toHaveBeenCalledWith(expect.stringContaining('HOSTILE APPROACHING'));
    });

    it('commits the authored breach only when the approaching boss reaches the hull', () => {
        const walls = new Map([
            ['15,3', { userData: { isWall: true, wallKey: '15,3' } }],
            ['16,3', { userData: { isWall: true, wallKey: '16,3' } }]
        ]);
        const game = {
            getTileType: (x, z) => walls.has(`${x},${z}`) ? '#' : '.',
            isHoleTile: () => false,
            getBossBreachTiles: () => [{ x: 15, z: 3 }, { x: 16, z: 3 }],
            findWallMeshAt: (x, z) => walls.get(`${x},${z}`),
            damageWall: vi.fn(),
            showBunkerLine: vi.fn(),
            tryBossBreakWall: ThreeGame.prototype.tryBossBreakWall
        };
        const boss = {
            position: { x: 15, z: 2 },
            userData: {
                isBoss: true,
                wallBreakCooldown: 0,
                campBreachTarget: { x: 15, z: 5 },
                campBreachTiles: [{ x: 15, z: 3 }, { x: 16, z: 3 }],
                campBreachCommitted: false
            }
        };

        expect(game.tryBossBreakWall(boss, 15, 3)).toBe(true);
        expect(game.damageWall).toHaveBeenCalledTimes(2);
        expect(boss.userData.campBreachCommitted).toBe(true);
        expect(boss.userData.campBreachTarget).toBeNull();
    });

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
