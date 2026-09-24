import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { CLASS_MELEE_PROFILES, CLASS_STATS, ThreeGame } from './threeGame.js';

function mockClassGame(playerType) {
    const events = [];
    const damagedSprites = [];
    const damagedWalls = [];

    const player = {
        position: new THREE.Vector3(0, 0, 0)
    };

    const g = {
        playerType,
        player,
        isPlayerDead: false,
        performanceProfile: 'gameplay',
        aimDirX: 0,
        aimDirZ: 1, // Facing +Z
        meleeCooldownTimer: 0,
        _scoutSlipstreamTimer: 0,
        moveSpeed: CLASS_STATS[playerType].moveSpeed,
        _sprintMoveSpeedMult: 1.0,
        scatterSprites: [],
        pickups: [],
        isGameplayInputActive: () => true,
        isInsideNoFireZone: () => false,
        isEnemyType: (type) => type === 'cryosnail' || type === 'cybersnail',
        applyPlayerDamageToEnemy: (sprite, damage) => {
            damagedSprites.push({ sprite, damage });
        },
        spawnPhysicalBurst: vi.fn(),
        triggerCameraShake: vi.fn(),
        findWallMeshAt: vi.fn((x, z) => {
            // Mock wall at (0, 1.8)
            if (Math.abs(x) < 0.5 && Math.abs(z - 1.8) < 0.5) {
                return { userData: { isWall: true, destroyed: false, wallKey: '0:2' } };
            }
            return null;
        }),
        damageWall: vi.fn((wall, amount, opts) => {
            damagedWalls.push({ wall, amount, opts });
            return true;
        })
    };

    g.triggerGameplayMelee = ThreeGame.prototype.triggerGameplayMelee.bind(g);

    return { g, events, damagedSprites, damagedWalls };
}

describe('class combat tactical identity profiles', () => {
    it('defines distinct tactical profiles for all three operator classes', () => {
        expect(CLASS_MELEE_PROFILES.SCOUT).toBeDefined();
        expect(CLASS_MELEE_PROFILES.TANK).toBeDefined();
        expect(CLASS_MELEE_PROFILES.ENGINEER).toBeDefined();

        // Scout is agile and rapid
        expect(CLASS_MELEE_PROFILES.SCOUT.cooldown).toBeLessThan(CLASS_MELEE_PROFILES.TANK.cooldown);
        expect(CLASS_MELEE_PROFILES.SCOUT.onHitSpeedBoost).toBeTruthy();

        // Tank is heavy, high damage, wide cleave, and breaches walls
        expect(CLASS_MELEE_PROFILES.TANK.damage).toBe(8);
        expect(CLASS_MELEE_PROFILES.TANK.halfAngle).toBeGreaterThan(CLASS_MELEE_PROFILES.SCOUT.halfAngle);
        expect(CLASS_MELEE_PROFILES.TANK.wallBreach).toBe(true);

        // Engineer is utility-oriented with EMP stun and magnetic pickup vacuum
        expect(CLASS_MELEE_PROFILES.ENGINEER.magneticPullRadius).toBe(8.0);
        expect(CLASS_MELEE_PROFILES.ENGINEER.knockbackDuration).toBeGreaterThan(0.5);
    });

    it('Scout Slipstream Strike triggers movement speed surge upon hitting an enemy', () => {
        const { g, damagedSprites } = mockClassGame('SCOUT');
        const enemy = {
            parent: {},
            position: new THREE.Vector3(0, 0, 1.2),
            userData: { type: 'cryosnail' }
        };
        g.scatterSprites.push(enemy);

        const struck = g.triggerGameplayMelee();
        expect(struck).toBe(true);
        expect(damagedSprites).toHaveLength(1);
        expect(damagedSprites[0].damage).toBe(4);
        expect(g.meleeCooldownTimer).toBe(CLASS_MELEE_PROFILES.SCOUT.cooldown);
        // Scout gained Slipstream speed boost timer
        expect(g._scoutSlipstreamTimer).toBe(CLASS_MELEE_PROFILES.SCOUT.onHitSpeedBoost.duration);
    });

    it('Tank Seismic Slam deals 8 damage, heavy knockback, and breaches walls in front', () => {
        const { g, damagedSprites, damagedWalls } = mockClassGame('TANK');
        const enemy = {
            parent: {},
            position: new THREE.Vector3(0, 0, 1.5),
            userData: { type: 'cryosnail' }
        };
        g.scatterSprites.push(enemy);

        const struck = g.triggerGameplayMelee();
        expect(struck).toBe(true);
        expect(damagedSprites).toHaveLength(1);
        expect(damagedSprites[0].damage).toBe(8);
        expect(enemy.userData.knockbackTimer).toBe(0.50);
        expect(enemy.userData.knockbackVz).toBeCloseTo(9.5);
        expect(g.meleeCooldownTimer).toBe(CLASS_MELEE_PROFILES.TANK.cooldown);

        // Tank breaches frontal wall
        expect(damagedWalls).toHaveLength(1);
        expect(damagedWalls[0].amount).toBe(4);
        expect(damagedWalls[0].opts).toMatchObject({ source: 'player' });
    });

    it('Engineer Overcharge Pulse EMP stuns hostiles and magnetizes nearby pickups', () => {
        const { g, damagedSprites } = mockClassGame('ENGINEER');
        const enemy = {
            parent: {},
            position: new THREE.Vector3(0, 0, 1.2),
            userData: { type: 'cybersnail' }
        };
        g.scatterSprites.push(enemy);

        const nearPickup = {
            position: new THREE.Vector3(2.5, 0, 3.0), // distance ~3.9m <= 8m
            userData: { state: 'idle' }
        };
        const farPickup = {
            position: new THREE.Vector3(10.0, 0, 10.0), // distance ~14.1m > 8m
            userData: { state: 'idle' }
        };
        g.pickups.push(nearPickup, farPickup);

        const struck = g.triggerGameplayMelee();
        expect(struck).toBe(true);
        expect(damagedSprites).toHaveLength(1);
        expect(damagedSprites[0].damage).toBe(5);
        // Stun duration from EMP
        expect(enemy.userData.knockbackTimer).toBe(0.65);
        // Near pickup was pulled by EMP
        expect(nearPickup.userData.state).toBe('magnetized');
        // Far pickup unaffected
        expect(farPickup.userData.state).toBe('idle');
    });
});
