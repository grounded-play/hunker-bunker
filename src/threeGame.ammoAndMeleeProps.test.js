import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

describe('ammo lockers, solid props, and Smash', () => {
    beforeEach(() => {
        globalThis.window = {
            dispatchEvent: vi.fn(),
            AudioManager: { playMetalStress: vi.fn() }
        };
        globalThis.CustomEvent = class CustomEvent {
            constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
        };
    });

    it('blocks movement on an intact solid prop and clears after destruction', () => {
        const prop = {
            parent: {}, position: { x: 2, z: 3 },
            userData: { isSolidProp: true, collisionRadius: 0.5, burstTriggered: false }
        };
        const game = {
            isInPocket: false, scatterSprites: [prop], playerRadius: 0.38,
            crashedShips: [], getTileType: () => '.', isHoleTile: () => false
        };
        expect(ThreeGame.prototype.canOccupyPosition.call(game, 2.2, 3)).toBe(false);
        prop.userData.burstTriggered = true;
        expect(ThreeGame.prototype.canOccupyPosition.call(game, 2.2, 3)).toBe(true);
    });

    it('does not leave a hidden 2D source sprite blocking movement after GLB replacement', () => {
        const prop = {
            parent: {}, visible: false, position: { x: 2, z: 3 },
            userData: { isSolidProp: true, collisionRadius: 0.5, burstTriggered: false }
        };
        const game = {
            isInPocket: false, scatterSprites: [prop], playerRadius: 0.38,
            crashedShips: [], getTileType: () => '.', isHoleTile: () => false
        };
        expect(ThreeGame.prototype.canOccupyPosition.call(game, 2.2, 3)).toBe(true);
    });

    it('opens a nearby supply container from the interact action', () => {
        const sprite = {
            parent: {}, position: { x: 2, z: 3 },
            userData: { type: 'prop_bunker_supplies', isDestructibleProp: true, propHp: 3, burstTriggered: false }
        };
        const game = {
            player: { position: { x: 2.5, z: 3 } }, scatterSprites: [sprite],
            damageScatterProp: vi.fn(), showToastNotification: vi.fn()
        };
        expect(ThreeGame.prototype.interactWithNearestDestructibleProp.call(game)).toBe(true);
        expect(game.damageScatterProp).toHaveBeenCalledWith(sprite, 3);
    });

    it('gives an ammo locker three guaranteed ammo drops', () => {
        const parent = { add: vi.fn() };
        const game = {
            pickupMeshes: [],
            createSnailDropPlacement: vi.fn((x, z, tx, tz, type) => ({ type })),
            createPickupInstance: vi.fn((placement) => ({ userData: placement }))
        };
        const sprite = {
            parent, position: { x: 4, z: 6 },
            userData: { type: 'prop_bunker_supplies', isAmmoLocker: true }
        };
        const count = ThreeGame.prototype.spawnDestructiblePropDrops.call(game, sprite);
        expect(count).toBe(3);
        expect(game.createSnailDropPlacement.mock.calls.map((call) => call[4])).toEqual(['ammo', 'ammo', 'ammo']);
        expect(parent.add).toHaveBeenCalledTimes(3);
    });

    it('Smash damages enemies and props inside its forward arc', () => {
        const prop = {
            parent: {}, position: { x: 1, z: 0 },
            userData: { isDestructibleProp: true, type: 'prop_bunker_supplies', burstTriggered: false }
        };
        const enemy = {
            parent: {}, position: { x: 1.4, z: 0.2 },
            userData: { type: 'cybersnail', burstTriggered: false }
        };
        const game = {
            player: { position: { x: 0, z: 0 } }, playerType: 'SCOUT', isPlayerDead: false,
            scatterSprites: [prop, enemy], hasActiveAim: true, aimDirX: 1, aimDirZ: 0,
            meleeCooldownTimer: 0, isGameplayInputActive: () => true, isInsideNoFireZone: () => false,
            isEnemyType: ThreeGame.prototype.isEnemyType,
            applyPlayerDamageToEnemy: vi.fn(), spawnPhysicalBurst: vi.fn(), triggerCameraShake: vi.fn(),
            player3dOverlay: { trigger: vi.fn() }
        };
        expect(ThreeGame.prototype.triggerGameplayMelee.call(game)).toBe(true);
        expect(game.applyPlayerDamageToEnemy).toHaveBeenCalledTimes(2);
        expect(game.applyPlayerDamageToEnemy).toHaveBeenCalledWith(prop, 4);
        expect(game.applyPlayerDamageToEnemy).toHaveBeenCalledWith(enemy, 4);
        expect(enemy.userData.knockbackTimer).toBeGreaterThan(0);
    });

    it('falls back to Smash when both clip and reserve are empty', () => {
        const game = {
            weaponClipAmmo: 0, weaponReloading: false, weaponFireCooldown: 0,
            isGameplayInputActive: () => true, isInsideNoFireZone: () => false,
            getAvailableAmmo: () => 0, triggerGameplayMelee: vi.fn(() => true)
        };
        expect(ThreeGame.prototype.fireWeaponAtCurrentAim.call(game)).toBe(true);
        expect(game.triggerGameplayMelee).toHaveBeenCalledWith({ source: 'empty-fire-fallback' });
    });

    it('detects projectile hits against intact props', () => {
        const prop = {
            parent: {}, position: new THREE.Vector3(1, 0, 1),
            userData: { isDestructibleProp: true, collisionRadius: 0.4, burstTriggered: false }
        };
        const game = { scatterSprites: [prop] };
        const projectile = { isEnemy: false, radius: 0.1, mesh: { position: new THREE.Vector3(1.2, 0, 1) } };
        expect(ThreeGame.prototype.checkProjectileDestructiblePropHit.call(game, projectile)).toBe(prop);
    });
});
