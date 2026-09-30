import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { WANDERER_ARCHETYPES } from './wandererSystem.js';

beforeEach(() => {
    vi.stubGlobal('window', {
        dispatchEvent: vi.fn(),
        AudioManager: { play: vi.fn() }
    });
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('Companion Archetype Active Assist Abilities', () => {
    function createMockGame(archetypeKey) {
        const archetype = WANDERER_ARCHETYPES[archetypeKey];
        const companion = {
            isWanderer: true,
            wanderer: { familyId: archetype.familyId, assistAbility: archetype.assistAbility },
            assistCooldown: 0,
            isFiring: false,
            targetId: null
        };

        const target = {
            position: { x: 5, y: 0, z: 5 },
            userData: { scatterKey: 'enemy_1', type: 'cybersnail', dead: false }
        };

        const nearbyEnemy = {
            position: { x: 7, y: 0, z: 6 },
            userData: { scatterKey: 'enemy_2', type: 'cybersnail', dead: false }
        };

        const game = {
            companions: [companion],
            scatterSprites: [target, nearbyEnemy],
            playerShieldMax: 50,
            playerShieldHp: 10,
            emitHealthState: vi.fn(),
            spawnMuzzleFlash: vi.fn(),
            spawnPhysicalBurst: vi.fn(),
            applyPlayerDamageToEnemy: vi.fn(),
            isEnemyType: (type) => ['cybersnail', 'cryosnail', 'sporesnail'].includes(type),
            executeCompanionAssistAbility: ThreeGame.prototype.executeCompanionAssistAbility
        };

        return { game, companion, target, nearbyEnemy, archetype };
    }

    it('triggers Manic Hacker EMP Glitch Burst stunning target and chaining nearby enemies', () => {
        const { game, companion, target, nearbyEnemy } = createMockGame('manic_hacker');

        const success = game.executeCompanionAssistAbility(companion, target, { position: { x: 0, y: 0, z: 0 } });
        expect(success).toBe(true);
        expect(companion.isFiring).toBe(true);
        expect(companion.targetId).toBe('enemy_1');
        expect(companion.assistCooldown).toBe(18);
        expect(target.userData.frozenTimer).toBe(4.0);
        expect(nearbyEnemy.userData.frozenTimer).toBe(3.0);
        expect(game.applyPlayerDamageToEnemy).toHaveBeenCalledWith(target, 3);
        expect(game.applyPlayerDamageToEnemy).toHaveBeenCalledWith(nearbyEnemy, 2);
        expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
            type: 'companion-assist-triggered',
            detail: expect.objectContaining({
                familyId: 'manic_hacker',
                abilityName: 'EMP Glitch Burst',
                targetId: 'enemy_1'
            })
        }));
    });

    it('triggers Corpo Runner Precision Mark applying 35% damage vulnerability', () => {
        const { game, companion, target } = createMockGame('corpo_runner');

        game.executeCompanionAssistAbility(companion, target, { position: { x: 0, y: 0, z: 0 } });
        expect(companion.assistCooldown).toBe(20);
        expect(target.userData.markedMultiplier).toBe(1.35);
        expect(target.userData.markedTimer).toBe(6.0);
        expect(game.applyPlayerDamageToEnemy).toHaveBeenCalledWith(target, 5);
    });

    it('triggers Crash Queen Supercharged Barrier restoring player kinetic shield', () => {
        const { game, companion, target } = createMockGame('crash_queen');

        game.executeCompanionAssistAbility(companion, target, { position: { x: 0, y: 0, z: 0 } });
        expect(companion.assistCooldown).toBe(25);
        expect(game.playerShieldHp).toBe(30);
        expect(game.emitHealthState).toHaveBeenCalled();
        expect(game.applyPlayerDamageToEnemy).toHaveBeenCalledWith(target, 3);
    });

    it('triggers Species Hybrid Bio-Silk Entangle rooting target with corrosion element', () => {
        const { game, companion, target } = createMockGame('species_hybrid');

        game.executeCompanionAssistAbility(companion, target, { position: { x: 0, y: 0, z: 0 } });
        expect(companion.assistCooldown).toBe(22);
        expect(target.userData.frozenTimer).toBe(4.0);
        expect(game.applyPlayerDamageToEnemy).toHaveBeenCalledWith(target, 4, { element: 'bio' });
    });
});
