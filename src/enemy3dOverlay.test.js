import { describe, expect, it } from 'vitest';
import { getEnemyAssetYaw, usesRiggedEnemyLocomotion, hasEnemy3dModel } from './enemy3dOverlay.js';

describe('enemy 3D rigged locomotion routing', () => {
    it('routes the hole-spawned stalker, charger, and corrupted bosses through the player-compatible animation rig', () => {
        expect(usesRiggedEnemyLocomotion('mycelium_stalker')).toBe(true);
        expect(usesRiggedEnemyLocomotion('crawler')).toBe(true);
        expect(usesRiggedEnemyLocomotion('bio_charger')).toBe(true);
        expect(usesRiggedEnemyLocomotion('boss_corrupted_scout')).toBe(true);
        expect(usesRiggedEnemyLocomotion('boss_corrupted_tank')).toBe(true);
        expect(usesRiggedEnemyLocomotion('boss_corrupted_engineer')).toBe(true);
    });

    it('has 3D models registered for corrupted operative bosses and key combatants', () => {
        expect(hasEnemy3dModel('sentinel')).toBe(true);
        expect(hasEnemy3dModel('alien_proto_crawler')).toBe(true);
        expect(hasEnemy3dModel('bio_charger')).toBe(true);
        expect(hasEnemy3dModel('boss_corrupted_scout')).toBe(true);
        expect(hasEnemy3dModel('boss_corrupted_tank')).toBe(true);
        expect(hasEnemy3dModel('boss_corrupted_engineer')).toBe(true);
    });

    it('leaves non-humanoid enemies on their embedded animation clips', () => {
        expect(usesRiggedEnemyLocomotion('cybersnail')).toBe(false);
        expect(usesRiggedEnemyLocomotion('fungal_spore_vent')).toBe(false);
    });

    it('keeps crawler and unique cryo boss asset-forward corrections separate', () => {
        expect(getEnemyAssetYaw('crawler')).toBe(0);
        expect(getEnemyAssetYaw('boss_cryosnail')).toBe(0);
        expect(getEnemyAssetYaw('cybersnail')).toBe(-Math.PI / 2);
        expect(getEnemyAssetYaw('boss_cybersnail')).toBe(Math.PI / 2);
        expect(getEnemyAssetYaw('sporesnail')).toBe(Math.PI / 2);
        expect(getEnemyAssetYaw('boss_sporesnail')).toBe(Math.PI / 2);
    });
});

