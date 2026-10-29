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
        spawnTextureBurstEffect: vi.fn(),
        takeDamage: vi.fn(),
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
        expect(callArg.radius).toBe(0.22);
        expect(callArg.options).toMatchObject({
            ignoreWalls: true,
            ignoreContainment: true,
            impactOnly: true,
            arcHeight: 2.8,
            impactEffect: 'spore-mortar',
            impactRadius: SPORE_MORTAR.explosionRadius
        });
        expect(typeof callArg.options?.onExpire).toBe('function');

        // Verify detonation creates toxic spore puddle and physical burst
        callArg.options.onExpire(10, 5);
        expect(g.spawnToxicSporePuddle).toHaveBeenCalledWith(10, 5, true);
        expect(g.spawnPhysicalBurst).toHaveBeenCalled();
        expect(g.takeDamage).toHaveBeenCalledWith(SPORE_MORTAR.directDamage, 'spore-mortar', 10, 5);

        delete globalThis.window;
    });

    it('locks its telegraphed landing point instead of tracking the player through the charge', () => {
        const g = mockGame();
        const sprite = mortarSprite({ mortarState: 'idle', mortarCooldown: 0 });

        g.updateSporeMortarBehavior(sprite, 0.1);
        expect(sprite.userData.mortarTarget).toEqual({ x: 10, z: 5 });

        g.player.position = { x: 5, z: 14 };
        g.updateSporeMortarBehavior(sprite, SPORE_MORTAR.chargeDuration);

        const projectile = g.spawnProjectile.mock.calls[0][0];
        expect(projectile.vx * projectile.ttl).toBeCloseTo(5);
        expect(projectile.vz * projectile.ttl).toBeCloseTo(0);
    });

    it('applies blast damage only inside the authored area and always leaves denial terrain', () => {
        const g = mockGame();
        g.playerRadius = 0.35;
        g.player.position = { x: SPORE_MORTAR.explosionRadius + 0.34, z: 0 };

        g.detonateSporeMortar(0, 0);
        expect(g.takeDamage).toHaveBeenCalledTimes(1);

        g.takeDamage.mockClear();
        g.player.position.x = SPORE_MORTAR.explosionRadius + 0.36;
        g.detonateSporeMortar(0, 0);
        expect(g.takeDamage).not.toHaveBeenCalled();
        expect(g.spawnToxicSporePuddle).toHaveBeenCalledTimes(2);
    });

    it('cancels a charged shot if the player becomes untargetable', () => {
        const g = mockGame();
        const sprite = mortarSprite({ mortarState: 'charging', mortarChargeTimer: 0.1 });
        g.canEnemyTargetPlayer = () => false;

        g.updateSporeMortarBehavior(sprite, 0.2);

        expect(sprite.userData.mortarState).toBe('idle');
        expect(sprite.userData.mortarTarget).toBeNull();
        expect(g.spawnProjectile).not.toHaveBeenCalled();
    });

    it('keeps impact-only enemy shells out of both enemy and player hit branches', () => {
        const g = mockGame();
        g.checkProjectilePlayerHit = vi.fn();
        g.checkProjectileShipHit = vi.fn();
        g.checkProjectileSnailHit = vi.fn();
        g.checkProjectileRivalHit = vi.fn();
        g.destroyProjectile = vi.fn();
        g.activeProjectiles = [{
            mesh: { position: { x: 0, y: 0.42, z: 0 } },
            vx: 1,
            vz: 0,
            ttl: 1,
            duration: 1,
            age: 0,
            startY: 0.42,
            arcHeight: 2.8,
            ignoreWalls: true,
            ignoreContainment: true,
            impactOnly: true,
            isEnemy: true
        }];

        g.updateProjectiles(0.25);

        expect(g.activeProjectiles[0].mesh.position.x).toBeCloseTo(0.25);
        expect(g.activeProjectiles[0].mesh.position.y).toBeGreaterThan(0.42);
        expect(g.checkProjectilePlayerHit).not.toHaveBeenCalled();
        expect(g.checkProjectileShipHit).not.toHaveBeenCalled();
        expect(g.checkProjectileSnailHit).not.toHaveBeenCalled();
        expect(g.checkProjectileRivalHit).not.toHaveBeenCalled();
    });
});
