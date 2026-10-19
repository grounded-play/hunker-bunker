import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

describe('ammo lockers, solid props, and Smash', () => {
    beforeEach(() => {
        globalThis.window = {
            dispatchEvent: vi.fn(),
            AudioManager: { play: vi.fn(), playMetalStress: vi.fn() }
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

    it('reports empty ammo only once while the fire control remains held', () => {
        const game = {
            weaponClipAmmo: 0, weaponReloading: false, weaponFireCooldown: 0,
            unlimitedAmmo: false, isPointerFireHeld: true, _emptyFireHeldLatched: false,
            isGameplayInputActive: () => true, isInsideNoFireZone: () => false,
            getAvailableAmmo: () => 0, triggerGameplayMelee: vi.fn(() => true)
        };

        expect(ThreeGame.prototype.fireWeaponAtCurrentAim.call(game)).toBe(true);
        expect(ThreeGame.prototype.fireWeaponAtCurrentAim.call(game)).toBe(false);
        expect(game.triggerGameplayMelee).toHaveBeenCalledTimes(1);
        expect(window.AudioManager.play).toHaveBeenCalledTimes(1);
    });

    it('places scan-triggered return chevrons in world space instead of following the player', () => {
        const arrows = Array.from({ length: 5 }, () => ({
            position: new THREE.Vector3(),
            rotation: { y: 0 },
            visible: false
        }));
        const game = {
            performanceProfile: 'gameplay', isInPocket: false, isPlayerDead: false,
            player: { position: new THREE.Vector3(20, 0, 9) },
            crashSiteGuidance: {
                group: { visible: false }, arrows, material: { opacity: 0 },
                waypoints: [], passedWaypointIndexes: new Set(), revealedAt: 0, visibleForMs: 12000
            },
            findSnailPath: () => Array.from({ length: 12 }, (_, index) => ({ x: 20 - index, z: 9 })),
            getTerrainHeightAt: () => 0
        };

        ThreeGame.prototype.updateCrashSiteGuidance.call(game, 100);
        expect(game.crashSiteGuidance.group.visible).toBe(false);

        expect(ThreeGame.prototype.revealCrashSiteGuidanceFromScan.call(game, 100)).toBe(true);
        ThreeGame.prototype.updateCrashSiteGuidance.call(game, 100);
        expect(game.crashSiteGuidance.group.visible).toBe(true);
        expect(arrows[0].visible).toBe(true);
        expect(arrows[0].position.x).toBeLessThan(20);
        expect(arrows[0].position.y).toBeCloseTo(0.055);
        const placedX = arrows[0].position.x;

        game.player.position.set(18, 0, 9);
        ThreeGame.prototype.updateCrashSiteGuidance.call(game, 200);
        expect(arrows[0].position.x).toBe(placedX);
        expect(arrows[0].visible).toBe(false);
        game.player.position.set(17, 0, 9);
        ThreeGame.prototype.updateCrashSiteGuidance.call(game, 300);
        expect(arrows[0].visible).toBe(false);
    });

    it('guides player towards active objective with chevrons', () => {
        const arrows = Array.from({ length: 5 }, () => ({
            position: new THREE.Vector3(0, 0, 0),
            rotation: { y: 0 },
            visible: false
        }));
        const game = {
            performanceProfile: 'gameplay', isInPocket: false, isPlayerDead: false,
            player: { position: new THREE.Vector3(10, 0, 10) },
            crashSiteGuidance: {
                group: { visible: false }, arrows, material: { opacity: 0 },
                waypoints: [], passedWaypointIndexes: new Set(), revealedAt: 0, visibleForMs: 12000,
                isObjectiveMode: false, isManualScan: false
            },
            getActiveObjectiveTargetPosition: () => ({ x: 10, z: 25 }),
            findSnailPath: () => Array.from({ length: 16 }, (_, i) => ({ x: 10, z: 10 + i })),
            getTerrainHeightAt: () => 0
        };

        ThreeGame.prototype.updateCrashSiteGuidance.call(game, 100);
        expect(game.crashSiteGuidance.group.visible).toBe(true);
        expect(game.crashSiteGuidance.isObjectiveMode).toBe(true);
        expect(arrows[0].visible).toBe(true);
        expect(arrows[0].position.z).toBeGreaterThan(10);
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
