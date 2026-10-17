import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { SPORE_MORTAR, sporeMortarTuning } from './sporeMortar.js';

function mortarSprite(extra = {}) {
    return {
        position: { x: 5, z: 5 },
        scale: { x: 1.05, y: 1.05 },
        material: { color: { setHex: vi.fn() }, opacity: 1 },
        userData: {
            type: 'spore_mortar',
            mortarTuning: sporeMortarTuning(),
            mortarState: 'idle',
            mortarCooldown: 0,
            baseScaleX: 1.05,
            baseScaleY: 1.05,
            ...extra
        }
    };
}

function mockGame() {
    const fake = Object.create(ThreeGame.prototype);
    Object.assign(fake, {
        player: { position: { x: 10, z: 5 } },
        isPlayerDead: false,
        spawnProjectile: vi.fn(),
        spawnToxicSporePuddle: vi.fn(),
        spawnPhysicalBurst: vi.fn(),
        spawnGearPoofEffect: vi.fn(),
        audioAt: vi.fn(() => ({ volume: 0.2 })),
        canEnemyTargetPlayer: () => true
    });
    return fake;
}

describe('spore mortar in ThreeGame', () => {
    it('is recognized as an enemy type with stationary speed', () => {
        const g = Object.create(ThreeGame.prototype);
        expect(g.isEnemyType('spore_mortar')).toBe(true);
        expect(SPORE_MORTAR.speed).toBe(0.0);
    });

    it('anchors position to prevent sliding or being pushed', () => {
        const g = mockGame();
        const sprite = mortarSprite({ anchorX: 5, anchorZ: 5 });
        sprite.position.x = 8; // attempt to slide
        sprite.position.z = 9;

        g.updateSporeMortarBehavior(sprite, 0.1);

        expect(sprite.position.x).toBe(5);
        expect(sprite.position.z).toBe(5);
        expect(sprite.userData.speed).toBe(0);
    });

    it('transitions to charging when player is within range and cooled down', () => {
        const g = mockGame();
        // Distance = 5 (within min 3.5 and max 18)
        const sprite = mortarSprite({ mortarState: 'idle', mortarCooldown: 0 });

        g.updateSporeMortarBehavior(sprite, 0.1);

        expect(sprite.userData.mortarState).toBe('charging');
        expect(sprite.userData.mortarChargeTimer).toBe(SPORE_MORTAR.chargeDuration);
    });

    it('does not charge if player is outside maxRange or inside minRange', () => {
        const g = mockGame();
        // Too close (distance = 2 < minRange 3.5)
        g.player.position = { x: 7, z: 5 };
        const spriteTooClose = mortarSprite({ mortarState: 'idle', mortarCooldown: 0 });
        g.updateSporeMortarBehavior(spriteTooClose, 0.1);
        expect(spriteTooClose.userData.mortarState).toBe('idle');

        // Too far (distance = 25 > maxRange 18)
        g.player.position = { x: 30, z: 5 };
        const spriteTooFar = mortarSprite({ mortarState: 'idle', mortarCooldown: 0 });
        g.updateSporeMortarBehavior(spriteTooFar, 0.1);
        expect(spriteTooFar.userData.mortarState).toBe('idle');
    });

    it('charges up with telegraph and fires lobbed toxic spore projectile on completion', () => {
        const g = mockGame();
        globalThis.window = { AudioManager: { play: vi.fn() } };

        const sprite = mortarSprite({
            mortarState: 'charging',
            mortarChargeTimer: 0.05
        });

        // Step by 0.1s to finish charge
        g.updateSporeMortarBehavior(sprite, 0.1);

        expect(sprite.userData.mortarState).toBe('idle');
        expect(sprite.userData.mortarCooldown).toBeGreaterThan(0);
        expect(g.spawnProjectile).toHaveBeenCalledTimes(1);

        const callArg = g.spawnProjectile.mock.calls[0][0];
        expect(callArg.isEnemy).toBe(true);
        expect(callArg.damage).toBe(SPORE_MORTAR.directDamage);
        expect(typeof callArg.options?.onExpire).toBe('function');

        // Verify detonation creates toxic spore puddle and physical burst
        callArg.options.onExpire(10, 5);
        expect(g.spawnToxicSporePuddle).toHaveBeenCalledWith(10, 5, true);
        expect(g.spawnPhysicalBurst).toHaveBeenCalled();

        delete globalThis.window;
    });
});
