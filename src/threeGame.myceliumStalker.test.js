import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

describe('Mycelium Stalker Combat Grammar', () => {
    beforeEach(() => {
        vi.stubGlobal('window', {
            dispatchEvent: vi.fn(),
            AudioManager: {
                play: vi.fn(),
                playStalkerHiss: vi.fn(),
                playMetalStress: vi.fn()
            }
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    function createMockStalker(initialPos = { x: 5, y: 0.08, z: 5 }) {
        return {
            position: { x: initialPos.x, y: initialPos.y, z: initialPos.z },
            scale: {
                x: 1,
                y: 1,
                z: 1,
                set: vi.fn(function(x, y, z) {
                    this.x = x;
                    this.y = y;
                    this.z = z;
                })
            },
            material: {
                color: {
                    hex: 0xffffff,
                    setHex: vi.fn(function(h) { this.hex = h; }),
                    getHex: vi.fn(function() { return this.hex; })
                }
            },
            userData: {
                type: 'mycelium_stalker',
                hp: 3,
                maxHp: 3,
                baseScaleX: 1,
                baseScaleY: 1,
                vx: 0,
                vz: 0
            }
        };
    }

    function createGameContext({ playerPos = { x: 0, z: 0 }, playerForward = { x: 1, y: 0 }, wallBetween = false } = {}) {
        return {
            player: { position: { x: playerPos.x, y: 0, z: playerPos.z } },
            playerForwardDir: { x: playerForward.x, y: playerForward.y },
            isPlayerDead: false,
            hasWallBetween: vi.fn(() => wallBetween),
            isEnemyLitByPlayerFlashlight: ThreeGame.prototype.isEnemyLitByPlayerFlashlight,
            updateMyceliumStalkerBehavior: ThreeGame.prototype.updateMyceliumStalkerBehavior,
            updateChargerOrStalkerBehavior: ThreeGame.prototype.updateChargerOrStalkerBehavior,
            damageSnail: ThreeGame.prototype.damageSnail,
            isEnemyType: () => true,
            isCrawler: () => false,
            isSnailTileWalkable: () => true,
            faceSpriteFromDir: vi.fn(),
            spawnDamagePip: vi.fn(),
            spawnToxicSporePuddle: vi.fn(),
            takeDamage: vi.fn(() => true),
            triggerCameraShake: vi.fn(),
            _flashSnailHit: vi.fn(),
            audioAt: vi.fn(() => ({ volume: 0.5 }))
        };
    }

    it('identifies flashlight illumination when stalker is within the cone without wall occlusion', () => {
        // Player at origin looking along +X
        const game = createGameContext({
            playerPos: { x: 0, z: 0 },
            playerForward: { x: 1, y: 0 },
            wallBetween: false
        });

        const stalkerAhead = createMockStalker({ x: 6, y: 0, z: 0 });
        expect(game.isEnemyLitByPlayerFlashlight(stalkerAhead)).toBe(true);

        const stalkerBehind = createMockStalker({ x: -6, y: 0, z: 0 });
        expect(game.isEnemyLitByPlayerFlashlight(stalkerBehind)).toBe(false);

        // Blocked by wall
        game.hasWallBetween.mockReturnValue(true);
        expect(game.isEnemyLitByPlayerFlashlight(stalkerAhead)).toBe(false);
    });

    it('flinches and retreats into shadows when illuminated by player flashlight', () => {
        // Player looking at stalker
        const game = createGameContext({
            playerPos: { x: 0, z: 0 },
            playerForward: { x: 1, y: 0 },
            wallBetween: false
        });

        const stalker = createMockStalker({ x: 6, y: 0, z: 0 });
        stalker.userData.stalkState = 'stalking';

        game.updateMyceliumStalkerBehavior(stalker, 0.05);

        expect(stalker.userData.stalkState).toBe('retreating');
        expect(stalker.userData.flinchTimer).toBeGreaterThan(0);
        expect(stalker.userData.retreatTimer).toBeGreaterThan(0);
        expect(window.AudioManager.playStalkerHiss).toHaveBeenCalled();
        // Moving away from player (vx > 0 since player is at 0 and stalker is at +6)
        expect(stalker.userData.vx).toBeGreaterThan(0);
    });

    it('flinches and retreats immediately when shot while stalking or telegraphing', () => {
        const game = createGameContext({
            playerPos: { x: 0, z: 0 },
            playerForward: { x: 0, y: 1 }, // Looking away (+Z)
            wallBetween: false
        });

        const stalker = createMockStalker({ x: 5, y: 0, z: 0 });
        stalker.userData.stalkState = 'stalking';
        stalker.userData.pounceCooldown = 0;

        // Damage the stalker via damageSnail
        game.damageSnail(stalker, 1);

        expect(stalker.userData.hp).toBe(2);
        expect(stalker.userData.stalkState).toBe('retreating');
        expect(stalker.userData.flinchTimer).toBeGreaterThan(0);
        expect(window.AudioManager.playStalkerHiss).toHaveBeenCalled();
    });

    it('enters pre_pounce with mandible glow and audio hiss when in ambush range', () => {
        const game = createGameContext({
            playerPos: { x: 0, z: 0 },
            playerForward: { x: 0, y: 1 }, // Player looking north (+Z)
            wallBetween: false
        });

        // Stalker is 5 units away along +X (not in flashlight cone)
        const stalker = createMockStalker({ x: 5, y: 0, z: 0 });
        stalker.userData.stalkState = 'stalking';
        stalker.userData.pounceCooldown = 0; // Cooldown ready

        game.updateMyceliumStalkerBehavior(stalker, 0.05);

        expect(stalker.userData.stalkState).toBe('pre_pounce');
        expect(stalker.userData.mandibleGlow).toBe(1.0);
        expect(stalker.material.color.hex).toBe(0x38ef7d); // Bioluminescent mandible glow
        expect(window.AudioManager.playStalkerHiss).toHaveBeenCalled();
    });

    it('aborts pre_pounce telegraph and retreats if lit by flashlight before pouncing', () => {
        const game = createGameContext({
            playerPos: { x: 0, z: 0 },
            playerForward: { x: 0, y: 1 },
            wallBetween: false
        });

        const stalker = createMockStalker({ x: 5, y: 0, z: 0 });
        stalker.userData.stalkState = 'pre_pounce';
        stalker.userData.prePounceTimer = 0.5;
        stalker.userData.mandibleGlow = 1.0;

        // Player sweeps flashlight onto stalker (+X)
        game.playerForwardDir = { x: 1, y: 0 };

        game.updateMyceliumStalkerBehavior(stalker, 0.05);

        expect(stalker.userData.stalkState).toBe('retreating');
        expect(stalker.userData.mandibleGlow).toBe(0);
        expect(stalker.userData.flinchTimer).toBeGreaterThan(0);
    });

    it('executes explosive pounce and applies contact damage and spore puddle on hit', () => {
        const game = createGameContext({
            playerPos: { x: 0, z: 0 },
            playerForward: { x: 0, y: 1 },
            wallBetween: false
        });

        // Stalker close enough to land a hit during pounce
        const stalker = createMockStalker({ x: 0.5, y: 0, z: 0.5 });
        stalker.userData.stalkState = 'pouncing';
        stalker.userData.pounceTimer = 0.4;
        stalker.userData.vx = -9;
        stalker.userData.vz = -9;

        game.updateMyceliumStalkerBehavior(stalker, 0.05);

        expect(game.takeDamage).toHaveBeenCalledWith(1, 'mycelium_stalker', expect.any(Number), expect.any(Number));
        expect(game.spawnToxicSporePuddle).toHaveBeenCalled();
        expect(stalker.userData.stalkState).toBe('retreating');
    });

    it('delegates to updateMyceliumStalkerBehavior when isStalker is true in updateChargerOrStalkerBehavior', () => {
        const game = createGameContext();
        const spy = vi.spyOn(game, 'updateMyceliumStalkerBehavior');
        const stalker = createMockStalker();

        game.updateChargerOrStalkerBehavior(stalker, 0.05, { isStalker: true });

        expect(spy).toHaveBeenCalledWith(stalker, 0.05);
    });
});
