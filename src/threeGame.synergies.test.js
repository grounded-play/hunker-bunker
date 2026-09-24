import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { ThreeGame, CLASS_MELEE_PROFILES } from './threeGame.js';
import { WEAPON_OVERCLOCKS, SUIT_RELICS } from './runDrops.js';
import { applyStatus, getStatus } from './statusEffects.js';

describe('Sprint 47 Lane 3: Synergies and Class Traversal Integration', () => {
    let originalWindow;
    beforeEach(() => {
        originalWindow = globalThis.window;
        globalThis.window = {
            dispatchEvent: vi.fn(),
            AudioManager: { play: vi.fn(), playMetalStress: vi.fn() }
        };
    });
    afterEach(() => {
        globalThis.window = originalWindow;
    });

    const cryoRime = WEAPON_OVERCLOCKS.find((o) => o.id === 'cryo_rime');
    const shatterEngine = SUIT_RELICS.find((r) => r.id === 'shatter_engine');
    const causticPayload = WEAPON_OVERCLOCKS.find((o) => o.id === 'caustic_payload');
    const bioVampirism = SUIT_RELICS.find((r) => r.id === 'bio_vampirism');

    function makeMockGame(overrides = {}) {
        const game = {
            player: { position: { x: 10, y: 0, z: 10 } },
            aimDirX: 1,
            aimDirZ: 0,
            playerType: 'SCOUT',
            currentDepthTier: 0,
            isDashing: false,
            _scoutSlipstreamTimer: 0,
            runOverclocks: [],
            runRelics: [],
            scatterSprites: [],
            transientEffects: [],
            bridgedHoles: new Set(),
            playerVitals: { hp: 3, maxHp: 4, o2: 50, maxO2: 100 },
            bank: {
                salvage: 10,
                getSalvage() { return this.salvage; },
                spendSalvage(amt) { this.salvage -= amt; return true; }
            },
            spawnPhysicalBurst: vi.fn(),
            applyPlayerDamageToEnemy: vi.fn((sprite, dmg) => {
                if (sprite.userData) sprite.userData.hp = Math.max(0, (sprite.userData.hp ?? 10) - dmg);
            }),
            isEnemyType: vi.fn((type) => Boolean(type && !type.includes('prop'))),
            damageWall: vi.fn(),
            findWallMeshAt: vi.fn(),
            getHoleVisualInfo: vi.fn((x, z) => (x === 12 && z === 10 ? { fallRadius: 1.0 } : null)),
            emitO2State: vi.fn(),
            triggerCameraShake: vi.fn(),
            hasActiveOverclock: ThreeGame.prototype.hasActiveOverclock,
            hasActiveRelic: ThreeGame.prototype.hasActiveRelic,
            hasActiveSynergy: ThreeGame.prototype.hasActiveSynergy,
            triggerCryoShatter: ThreeGame.prototype.triggerCryoShatter,
            handleTankCorrosionPull: ThreeGame.prototype.handleTankCorrosionPull,
            checkCryoShatterOnDeath: ThreeGame.prototype.checkCryoShatterOnDeath,
            checkBioVampirismOnDeath: ThreeGame.prototype.checkBioVampirismOnDeath,
            isHoleBridged: ThreeGame.prototype.isHoleBridged,
            deployNaniteBridgeAt: ThreeGame.prototype.deployNaniteBridgeAt,
            isPlayerOverAnyHole: ThreeGame.prototype.isPlayerOverAnyHole,
            armRewardCache: ThreeGame.prototype.armRewardCache,
            interactWithRewardCache: ThreeGame.prototype.interactWithRewardCache,
            ...overrides
        };
        return game;
    }

    describe('CLASS_MELEE_PROFILES configurations', () => {
        it('has shatterFrozen enabled on Scout', () => {
            expect(CLASS_MELEE_PROFILES.SCOUT.shatterFrozen).toBe(true);
        });

        it('has corrosionPull enabled on Tank', () => {
            expect(CLASS_MELEE_PROFILES.TANK.corrosionPull).toBe(true);
            expect(CLASS_MELEE_PROFILES.TANK.wallBreach).toBe(true);
        });

        it('has inheritsCarrierElement enabled on Engineer', () => {
            expect(CLASS_MELEE_PROFILES.ENGINEER.inheritsCarrierElement).toBe(true);
        });
    });

    describe('Scout Melee Shatter', () => {
        it('triggers cryo shatter nova and clears freeze when striking a frozen target', () => {
            const game = makeMockGame({
                playerType: 'SCOUT',
                runOverclocks: [cryoRime],
                runRelics: [shatterEngine]
            });
            const target = {
                position: { x: 11, y: 0, z: 10 },
                userData: { hp: 30, type: 'crawler' },
                parent: {}
            };
            applyStatus(target, 'freeze', 100);
            expect(getStatus(target, 'freeze').isFrozen).toBe(true);

            const nearby = {
                position: { x: 12, y: 0, z: 10 },
                userData: { hp: 30, type: 'crawler' },
                parent: {}
            };
            game.scatterSprites = [target, nearby];

            game.triggerCryoShatter(target);

            expect(getStatus(target, 'freeze').isFrozen).toBe(false);
            expect(game.applyPlayerDamageToEnemy).toHaveBeenCalledWith(nearby, 25);
            expect(getStatus(nearby, 'freeze').stacks).toBe(34);
            expect(game.spawnPhysicalBurst).toHaveBeenCalledWith(11, 10, expect.objectContaining({ color: 0x7df2ff }));
        });
    });

    describe('Tank Melee Corrosion Pull', () => {
        it('pulls corroded targets toward the slam center', () => {
            const game = makeMockGame({
                playerType: 'TANK',
                runOverclocks: [causticPayload]
            });
            const corrodedEnemy = {
                position: { x: 14, y: 0, z: 10 },
                userData: { hp: 40, type: 'crawler', corroded: true },
                parent: {}
            };
            const uncorrodedEnemy = {
                position: { x: 14, y: 0, z: 12 },
                userData: { hp: 40, type: 'crawler' },
                parent: {}
            };
            game.scatterSprites = [corrodedEnemy, uncorrodedEnemy];

            const slamX = 11;
            const slamZ = 10;
            game.handleTankCorrosionPull(slamX, slamZ, 7.0);

            // Corroded enemy should have moved toward (11, 10):
            // old x = 14, new x = 14 + (11 - 14) * 0.65 = 14 - 1.95 = 12.05
            expect(corrodedEnemy.position.x).toBeCloseTo(12.05, 2);
            // Uncorroded enemy must remain untouched
            expect(uncorrodedEnemy.position.x).toBe(14);
            expect(game.spawnPhysicalBurst).toHaveBeenCalledWith(slamX, slamZ, expect.objectContaining({ color: 0x66ff66 }));
        });
    });

    describe('Engineer Turret Elemental Inheritance', () => {
        it('passes cryo elemental mods to spawned turret projectile', () => {
            const game = makeMockGame({
                playerType: 'ENGINEER',
                runOverclocks: [cryoRime],
                turretRange: 10,
                activeTurret: {
                    mesh: { position: { x: 5, y: 0, z: 5 } }
                }
            });
            const target = { position: { x: 7, y: 0, z: 5 } };
            game.findNearestEnemyWithinRange = vi.fn(() => target);
            game.spawnProjectile = vi.fn();

            ThreeGame.prototype.fireEngineerTurret.call(game);

            expect(game.spawnProjectile).toHaveBeenCalledWith(expect.objectContaining({
                x: 5,
                z: 5,
                element: 'cryo',
                color: 0x7df2ff,
                statusOptions: expect.objectContaining({
                    freezePerHit: 17,
                    slowDuration: 1.5
                })
            }));
        });

        it('passes bio elemental mods to spawned turret projectile', () => {
            const game = makeMockGame({
                playerType: 'ENGINEER',
                runOverclocks: [causticPayload],
                turretRange: 10,
                activeTurret: {
                    mesh: { position: { x: 5, y: 0, z: 5 } }
                }
            });
            const target = { position: { x: 7, y: 0, z: 5 } };
            game.findNearestEnemyWithinRange = vi.fn(() => target);
            game.spawnProjectile = vi.fn();

            ThreeGame.prototype.fireEngineerTurret.call(game);

            expect(game.spawnProjectile).toHaveBeenCalledWith(expect.objectContaining({
                x: 5,
                z: 5,
                element: 'bio',
                color: 0x66ff66,
                statusOptions: expect.objectContaining({
                    tickDamage: 1,
                    poisonDuration: 2.0
                })
            }));
        });
    });

    describe('Class Traversal Affordances', () => {
        it('Scout can vault across chasms when dashing or under slipstream', () => {
            const game = makeMockGame({
                playerType: 'SCOUT',
                currentDepthTier: 0,
                isDashing: false,
                _scoutSlipstreamTimer: 0
            });
            // Over hole (12, 10)
            expect(game.isPlayerOverAnyHole(12, 10)).toBe(true);

            // While dashing: vaults over hole
            game.isDashing = true;
            expect(game.isPlayerOverAnyHole(12, 10)).toBe(false);

            // While slipstream timer is active: vaults over hole
            game.isDashing = false;
            game._scoutSlipstreamTimer = 0.5;
            expect(game.isPlayerOverAnyHole(12, 10)).toBe(false);

            // Other classes still fall even if dashing
            game.playerType = 'TANK';
            game.isDashing = true;
            expect(game.isPlayerOverAnyHole(12, 10)).toBe(true);
        });

        it('Engineer can deploy nanite bridge over chasms (GAP-GP-05)', () => {
            const game = makeMockGame({
                playerType: 'ENGINEER',
                currentDepthTier: 0
            });
            expect(game.isPlayerOverAnyHole(12, 10)).toBe(true);

            const deployed = game.deployNaniteBridgeAt(12, 10);
            expect(deployed).toBe(true);
            expect(game.bank.salvage).toBe(7); // 10 - 3 spent
            expect(game.isHoleBridged(12, 10)).toBe(true);

            // With bridge deployed, nobody falls into hole (12, 10)
            expect(game.isPlayerOverAnyHole(12, 10)).toBe(false);
            expect(globalThis.window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
                type: 'nanite-bridge-deployed',
                detail: { x: 12, z: 10 }
            }));
        });
    });

    describe('High-Stakes Reward Cache', () => {
        it('arms a reward cache previewing synergy component in Ring 1', () => {
            const game = makeMockGame({
                currentDepthTier: 0,
                runOverclocks: [cryoRime],
                currentRunSeed: 42
            });
            const cache = game.armRewardCache();
            expect(cache).not.toBeNull();
            expect(cache.ring).toBe(1);
            expect(cache.dropId).toBe('shatter_engine'); // Completes cryo_shatter synergy
            expect(cache.state).toBe('sealed');
            expect(['escalated_wave', 'o2_siphon', 'lockdown']).toContain(cache.costType);
        });

        it('claims the reward cache and grants the drop', () => {
            const game = makeMockGame({
                currentDepthTier: 0,
                runOverclocks: [cryoRime],
                currentRunSeed: 42,
                playerVitals: { hp: 3, maxHp: 4, o2: 80, maxO2: 100 }
            });
            game.armRewardCache();
            const success = game.interactWithRewardCache();
            expect(success).toBe(true);
            expect(game.activeRewardCache.state).toBe('opened');
            expect(game.hasActiveRelic('shatter_engine')).toBe(true);
            expect(game.hasActiveSynergy('cryo_shatter')).toBe(true);
        });
    });

    describe('Synergy On-Death Triggers', () => {
        it('checkCryoShatterOnDeath triggers when frozen enemy dies with shatter_engine', () => {
            const game = makeMockGame({
                runRelics: [shatterEngine]
            });
            const sprite = {
                position: { x: 10, y: 0, z: 10 },
                userData: { hp: 0, frozen: true, type: 'crawler' }
            };
            const spy = vi.spyOn(game, 'triggerCryoShatter');
            game.checkCryoShatterOnDeath(sprite);
            expect(spy).toHaveBeenCalledWith(sprite);
        });

        it('checkBioVampirismOnDeath restores O2 and heart on corroded bio enemy death', () => {
            const game = makeMockGame({
                runOverclocks: [causticPayload],
                runRelics: [bioVampirism],
                playerVitals: { hp: 2, maxHp: 4, o2: 40, maxO2: 100 }
            });
            const sprite = {
                position: { x: 10, y: 0, z: 10 },
                userData: { hp: 0, corroded: true, type: 'crawler' }
            };
            game.checkBioVampirismOnDeath(sprite);
            // Bio predator restores +8 O2 and 1 heart
            expect(game.playerVitals.o2).toBe(48);
            expect(game.playerVitals.hp).toBe(3);
            expect(game.emitO2State).toHaveBeenCalled();
        });
    });
});
