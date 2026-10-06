import { describe, expect, it } from 'vitest';
import { getEnemyAssetYaw, usesRiggedEnemyLocomotion, hasEnemy3dModel, selectEmbeddedLocomotionClips } from './enemy3dOverlay.js';

describe('enemy 3D rigged locomotion routing', () => {
    it('routes the crawler and corrupted bosses through the player-compatible animation rig', () => {
        expect(usesRiggedEnemyLocomotion('crawler')).toBe(true);
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

    it('gives cryosnail its own ice model instead of a recoloured cybersnail', async () => {
        // Owner-supplied Regular Cryosnail (2026-10-01) replaces the tinted,
        // emissive cybersnail stand-in.
        const { ENEMY_3D_MODELS } = await import('./enemy3dOverlay.js');
        const cryosnail = ENEMY_3D_MODELS.cryosnail;
        expect(cryosnail.url).toBe('/3d/runtime/new3ds/cryosnail.glb');
        expect(cryosnail.url).not.toBe(ENEMY_3D_MODELS.cybersnail.url);
        expect(cryosnail.tint).toBeUndefined();
        expect(cryosnail.emissive).toBeUndefined();
    });

    it('gives boss_corrupted_engineer its own corrupted Kaelen model, not the friendly npc_kaelen', async () => {
        const { ENEMY_3D_MODELS } = await import('./enemy3dOverlay.js');
        const engineer = ENEMY_3D_MODELS.boss_corrupted_engineer;
        expect(engineer.url).toBe('/3d/runtime/new3ds/boss_corrupted_engineer.glb');
        expect(engineer.tint).toBeUndefined();
        expect(engineer.emissive).toBeUndefined();
    });

    it('gives the spitter its own acid-sac body instead of a green-tinted crawler', async () => {
        const { ENEMY_3D_MODELS } = await import('./enemy3dOverlay.js');
        const spitter = ENEMY_3D_MODELS.alien_proto_spitter;
        expect(spitter.url).toBe('/3d/runtime/new3ds/alien_proto_spitter.glb');
        expect(spitter.url).not.toBe(ENEMY_3D_MODELS.alien_proto_crawler_A.url);
        expect(spitter.tint).toBeUndefined();
    });

    it('gives the stalker and charger the owner-supplied quadruped with its own clips, not a humanoid player skin', async () => {
        const { ENEMY_3D_MODELS } = await import('./enemy3dOverlay.js');
        for (const type of ['mycelium_stalker', 'bio_charger']) {
            expect(ENEMY_3D_MODELS[type].url, type).toBe('/3d/runtime/new3ds/mycelium_stalker.glb');
            expect(usesRiggedEnemyLocomotion(type), type).toBe(false);
        }
        // The stalker slinks; the charger gallops into its ram.
        expect(ENEMY_3D_MODELS.mycelium_stalker.travelClip).toBe('walk');
        expect(ENEMY_3D_MODELS.bio_charger.travelClip).toBe('run');
    });
});

describe('selectEmbeddedLocomotionClips', () => {
    const clip = (name) => ({ name });

    it('pairs the idle clip with the named travel clip', () => {
        const clips = [clip('idle'), clip('walk'), clip('run')];
        expect(selectEmbeddedLocomotionClips(clips, 'run')).toEqual({ idle: clips[0], travel: clips[2] });
        expect(selectEmbeddedLocomotionClips(clips, 'walk')).toEqual({ idle: clips[0], travel: clips[1] });
    });

    it('returns nothing to blend when either clip is missing', () => {
        expect(selectEmbeddedLocomotionClips([clip('walk')], 'walk')).toBeNull();
        expect(selectEmbeddedLocomotionClips([clip('idle'), clip('walk')], 'run')).toBeNull();
        expect(selectEmbeddedLocomotionClips(undefined, 'walk')).toBeNull();
    });
});
