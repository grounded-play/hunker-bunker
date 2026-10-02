import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

// QA 2026-09-30: a cryosnail chewing on the Deck guest's body took the PC
// host's three hearts from ~102 m away. Remote squadmates are valid snail
// targets, but their own client owns their HP -- a hit on a remote target
// must never land on the local player, and a downed/dead body is not a target.
function fixture({ localAt = [100, 0, 0], remoteAt = [0.3, 0, 0], remote = {} } = {}) {
    const snail = new THREE.Object3D();
    snail.position.set(0, 0, 0);
    snail.userData = {
        type: 'cryosnail', isBoss: false, aiMode: 'hunt', attackCooldown: 0,
        knockbackTimer: 0, hp: 3, maxHp: 3, baseScaleX: 1, baseScaleY: 1,
        pathNodes: null, pathIndex: 0, pathRetargetTimer: 0, speed: 1
    };
    const player = new THREE.Object3D();
    player.position.set(...localAt);
    const remoteMesh = new THREE.Object3D();
    remoteMesh.position.set(...remoteAt);
    const takeDamage = vi.fn(() => true);
    const game = {
        player, isPlayerDead: false, takeDamage, playerRadius: 0.38,
        isMultiplayer: true, isMultiplayerHost: true,
        remotePlayers: new Map([['guest', { mesh: remoteMesh, hp: 3, maxHp: 3, ...remote }]]),
        scatterSprites: [snail],
        isAct2Active: () => false,
        isHiveKinPassive: () => false,
        canEnemyTargetPlayer: () => true,
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
        getActiveShip: () => null, snailsEnabled: true,
        faceSpriteFromDir: () => {}, updateSheetSpriteFrame: () => {}
    };
    const tick = (dt = 0.016) => ThreeGame.prototype.updateSnailBehavior.call(game, snail, dt, null);
    return { game, snail, takeDamage, tick };
}

describe('enemy attacks on remote squadmates', () => {
    it('does not damage the local player when the snail reaches a remote squadmate', () => {
        const { takeDamage, tick } = fixture();
        tick();
        expect(takeDamage).not.toHaveBeenCalled();
    });

    it('still damages the local player when the snail reaches them', () => {
        const { takeDamage, tick } = fixture({ localAt: [0.3, 0, 0], remoteAt: [100, 0, 0] });
        tick();
        expect(takeDamage).toHaveBeenCalledTimes(1);
    });

    it('does not target a downed squadmate', () => {
        const { game, snail } = fixture({ localAt: [20, 0, 0], remote: { isDown: true } });
        const target = game.selectSnailTarget(snail, null);
        expect(target?.id).toBe('local');
    });
});
