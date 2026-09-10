import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

// A milestone retaliation boss beelines for the ship and only switches to the
// player when they get close (selectSnailTarget's prioritizeShip branch).
// Contact damage used to be gated on that chosen target, so a boss chewing on
// the ship could have the player standing *inside its body* and deal nothing.
// Touching a boss has to hurt regardless of what the boss is currently angry at.
function makeBoss({ scale = 3.2 } = {}) {
    const boss = new THREE.Object3D();
    boss.userData = {
        type: 'boss_cybersnail', isBoss: true, isMilestone: true, prioritizeShip: true,
        targetType: 'ship', aiMode: 'hunt', attackCooldown: 0, bossAttackTimer: 99,
        knockbackTimer: 0, hp: 5, maxHp: 5, easyTier: true,
        baseScaleX: scale, baseScaleY: scale,
        pathNodes: null, pathIndex: 0, pathRetargetTimer: 0, speed: 1
    };
    return boss;
}

function fixture(playerAt, { canTargetPlayer = true, scale = 3.2 } = {}) {
    const boss = makeBoss({ scale });
    boss.position.set(0, 0, 0);
    const player = new THREE.Object3D();
    player.position.set(...playerAt);
    const takeDamage = vi.fn(() => true);
    const ship = { hp: 10, tileX: 3, tileZ: 0 };
    const game = {
        player, isPlayerDead: false, takeDamage, playerRadius: 0.38,
        scatterSprites: [boss],
        isAct2Active: () => false,
        isHiveKinPassive: () => false,
        canEnemyTargetPlayer: () => canTargetPlayer,
        baseDefenseTurretState: null,
        bank: { getBaseTurretHp: () => 0 },
        isSnailTileWalkable: () => true,
        pickSnailWanderTile: () => null,
        applySnailContactKnockback: vi.fn(),
        applyPlayerSlow: vi.fn(),
        damageShip: vi.fn(), damageBaseTurret: vi.fn(), damageSnail: vi.fn(),
        applySnailShipKnockback: vi.fn(),
        findSnailPath: (sx, sz, gx, gz) => [{ x: sx, z: sz }, { x: gx, z: gz }],
        openSnailEncounter: vi.fn(), encounterState: null,
        spawnVisualSnailTrail: vi.fn(), getSnailSpeed: () => 1,
        selectSnailTarget: ThreeGame.prototype.selectSnailTarget,
        getSnailContactReach: ThreeGame.prototype.getSnailContactReach,
        isPlayerNearHazardWall: () => false,
        updateSporesnailFightTick: () => {}, resolveCryosnailShockwave: () => {},
        getActiveShip: () => ship, snailsEnabled: true,
        faceSpriteFromDir: () => {}, updateSheetSpriteFrame: () => {}
    };
    const tick = (dt = 0.016) => ThreeGame.prototype.updateSnailBehavior.call(game, boss, dt, ship);
    return { game, boss, takeDamage, ship, tick };
}

describe('boss contact damage', () => {
    it('hurts the player who walks into a ship-focused boss', () => {
        // The regression: boss locked onto the ship, player inside its body.
        const { takeDamage, tick } = fixture([0.2, 0, 0], { canTargetPlayer: false });
        tick();
        expect(takeDamage).toHaveBeenCalled();
        expect(takeDamage.mock.calls[0][0]).toBe(2);
        expect(takeDamage.mock.calls[0][1]).toBe('boss_cybersnail');
    });

    it('still hurts the player when the boss is targeting them', () => {
        const { takeDamage, tick } = fixture([1.5, 0, 0]);
        tick();
        expect(takeDamage).toHaveBeenCalledOnce();
    });

    it('leaves a player who is not touching the boss alone', () => {
        const { takeDamage, tick } = fixture([9, 0, 0], { canTargetPlayer: false });
        tick();
        expect(takeDamage).not.toHaveBeenCalled();
    });

    // Contact reach has to follow the body, or a bigger boss becomes safer to
    // stand inside than a small one.
    it('scales reach with the boss body so every boss is dangerous to touch', () => {
        const reachOf = (scale) => ThreeGame.prototype.getSnailContactReach.call(
            { playerRadius: 0.38 },
            { isBoss: true, baseScaleX: scale, baseScaleY: scale }
        );
        // Reach must never shrink as a boss grows...
        expect(reachOf(4.4)).toBeGreaterThanOrEqual(reachOf(3.2));
        // ...and must always cover the visible body edge. Today's scales are
        // already inside the fixed floor, so this guards a future bigger boss
        // rather than fixing a live gap.
        for (const scale of [3.2, 4.4, 8]) {
            expect(reachOf(scale)).toBeGreaterThanOrEqual(scale / 2);
        }
    });

    it('keeps ordinary snails on their small reach', () => {
        const reach = ThreeGame.prototype.getSnailContactReach.call(
            { playerRadius: 0.38 }, { isBoss: false, baseScaleX: 1, baseScaleY: 1 }
        );
        expect(reach).toBeLessThan(1.5);
    });

    it('does not machine-gun the player every frame', () => {
        const { takeDamage, tick } = fixture([0.2, 0, 0], { canTargetPlayer: false });
        tick(); tick(); tick();
        expect(takeDamage).toHaveBeenCalledOnce();
        tick(2.0); // past the cooldown
        expect(takeDamage).toHaveBeenCalledTimes(2);
    });

    it('still lets a ship-focused boss damage the ship', () => {
        const { game, boss, ship, tick } = fixture([9, 0, 0], { canTargetPlayer: false });
        boss.position.set(ship.tileX, 0, ship.tileZ);
        tick();
        expect(game.damageShip).toHaveBeenCalled();
    });
});
