import { describe, expect, it } from 'vitest';
import { getEnemyAssetYaw, usesRiggedEnemyLocomotion } from './enemy3dOverlay.js';

describe('enemy 3D rigged locomotion routing', () => {
    it('routes the hole-spawned stalker through the player-compatible animation rig', () => {
        expect(usesRiggedEnemyLocomotion('mycelium_stalker')).toBe(true);
        expect(usesRiggedEnemyLocomotion('crawler')).toBe(true);
        expect(usesRiggedEnemyLocomotion('bio_charger')).toBe(true);
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
    });
});
