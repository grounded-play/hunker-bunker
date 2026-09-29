import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { campaignWorldStore } from './campaignWorld.js';
import { expeditionSuspendStore, normalizeExpeditionSuspendSnapshot } from './expeditionSuspend.js';

function position(x = 0, z = 0) {
    return { x, y: 0, z, set(nx, ny, nz) { this.x = nx; this.y = ny; this.z = nz; } };
}

function savedSnapshot() {
    return normalizeExpeditionSuspendSnapshot({
        version: 1,
        mode: 'solo',
        resumeId: 'resume-1',
        generation: 2,
        savedAt: 100,
        expedition: {
            campaignSeed: 8128,
            expeditionSeed: 9001,
            expeditionIndex: 3,
            profile: { expeditionIndex: 3, expeditionSeed: 9001, campaignSeed: 8128, condition: { id: 'glacial_gale' } }
        },
        player: {
            classType: 'ENGINEER', x: 14, z: -9, facingYaw: 2.2,
            vitals: { hp: 2, maxHp: 5, o2: 47, maxO2: 90 },
            inventory: { health: 2, ammo: 11, weapon: 4, coin: 3 },
            weapon: { clipAmmo: 2, clipSize: 6 }
        },
        run: {
            elapsedMs: 123000,
            missionState: { type: 'elimination', status: 'active', killCount: 4, targetKills: 8 },
            modifier: { key: 'blackout' },
            overclockIds: ['cryo_rime'],
            relicIds: ['shatter_engine'],
            shardCount: 2,
            depositedResources: { health: 1, weapon: 2, coin: 3 },
            kills: 9,
            maxDepthTierReached: 2,
            currentDepthTier: 1,
            totalDistanceTravelled: 321
        },
        world: {
            maze: { generationVersion: 2, doors: [], access: {}, worldChanges: {} },
            killedEnemyScatterKeys: ['dead:1'],
            depletedGearPileKeys: ['junk:1'],
            killedBosses: ['cryo'],
            visitedChunks: ['0,0', '1,0'],
            enemies: [{ scatterKey: 'live:1', type: 'cryosnail', x: 8, z: 5, hp: 2, maxHp: 4, speed: 1 }]
        }
    });
}

describe('ThreeGame expedition continuation', () => {
    beforeEach(() => {
        vi.stubGlobal('window', {
            dispatchEvent: vi.fn(),
            restorePickupCounterState: vi.fn(),
            AudioManager: { play: vi.fn() }
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('captures exact player, objective, build, killed-key, and live-enemy state', () => {
        vi.spyOn(campaignWorldStore, 'getState').mockReturnValue({ seed: 8128, expeditionSeed: 9001, expeditionIndex: 3 });
        const fake = {
            isPlayerDead: false,
            isMultiplayer: false,
            fixedRunEntropy: false,
            _campaignWorldSeed: 8128,
            activeExpedition: { campaignSeed: 8128, expeditionSeed: 9001, expeditionIndex: 3 },
            player: { position: position(14, -9) },
            playerType: 'ENGINEER',
            facingYaw: 2.2,
            playerVitals: { hp: 2, maxHp: 5, o2: 47, maxO2: 90 },
            weaponClipAmmo: 2,
            weaponClipSize: 6,
            getSessionInventory: () => ({ health: 2, ammo: 11, weapon: 4, coin: 3 }),
            missionState: { status: 'active', killCount: 4 },
            currentRunModifier: { key: 'blackout' },
            runOverclocks: [{ id: 'cryo_rime' }],
            runRelics: [{ id: 'shatter_engine' }],
            runDepositedResources: { med: 1, tech: 2, coin: 3 },
            killedEnemyScatterKeys: new Set(['dead:1']),
            depletedGearPileKeys: new Set(['junk:1']),
            killedBosses: new Set(['cryo']),
            visitedChunks: new Set(['0,0']),
            scatterSprites: [{
                parent: {}, position: position(8, 5),
                userData: { isEnemy: true, scatterKey: 'live:1', type: 'cryosnail', hp: 2, maxHp: 4, speed: 1 }
            }],
            getMazePersistenceState: () => ({ generationVersion: 2 })
        };
        const value = ThreeGame.prototype.createExpeditionSuspendSnapshot.call(fake);
        expect(value).toMatchObject({
            player: { x: 14, z: -9, inventory: { ammo: 11 } },
            run: { missionState: { status: 'active', killCount: 4 }, overclockIds: ['cryo_rime'] },
            world: { killedEnemyScatterKeys: ['dead:1'], enemies: [{ scatterKey: 'live:1', hp: 2 }] }
        });
    });

    it('restores runtime state and immediately commits a newer continuation', () => {
        const snapshot = savedSnapshot();
        vi.spyOn(expeditionSuspendStore, 'save').mockImplementation((value) => ({ ...value, generation: 3 }));
        const liveEnemy = { position: position(), userData: { scatterKey: 'live:1', type: 'cryosnail', hp: 4, maxHp: 4 } };
        const fake = {
            _pendingExpeditionResume: snapshot,
            player: { position: position() },
            playerGlow: { position: position() },
            playerMarker: { position: position() },
            playerMarkerHeight: 0.05,
            playerVitals: {},
            scatterSprites: [liveEnemy],
            restoreMazePersistenceState: vi.fn(() => true),
            updateFacingYaw: vi.fn(),
            clearLoadedChunksForRunReset: vi.fn(),
            syncVisibleChunks: vi.fn(),
            applySuspendedEnemyState: ThreeGame.prototype.applySuspendedEnemyState,
            emitHealthState: vi.fn(), emitO2State: vi.fn(), emitWeaponClipState: vi.fn(),
            createExpeditionSuspendSnapshot: vi.fn(() => snapshot),
            saveExpeditionSuspend: ThreeGame.prototype.saveExpeditionSuspend
        };
        expect(ThreeGame.prototype.restoreExpeditionSuspend.call(fake, snapshot)).toBe(true);
        expect(fake.player.position).toMatchObject({ x: 14, z: -9 });
        expect(fake.playerVitals).toMatchObject({ hp: 2, maxHp: 5, o2: 47, maxO2: 90 });
        expect(window.restorePickupCounterState).toHaveBeenCalledWith(snapshot.player.inventory, 'ENGINEER');
        expect(fake.missionState).toMatchObject({ status: 'active', killCount: 4 });
        expect(fake.runOverclocks.map((drop) => drop.id)).toEqual(['cryo_rime']);
        expect(fake.runRelics.map((drop) => drop.id)).toEqual(['shatter_engine']);
        expect(fake.killedEnemyScatterKeys).toEqual(new Set(['dead:1']));
        expect(liveEnemy.userData.hp).toBe(2);
        expect(expeditionSuspendStore.save).toHaveBeenCalledOnce();
        expect(fake._pendingExpeditionResume).toBeNull();
    });

    it('resumes the saved deployment without advancing the campaign index', () => {
        const snapshot = savedSnapshot();
        const campaign = {
            seed: 8128,
            expeditionSeed: 9001,
            expeditionIndex: 3,
            activeExpedition: snapshot.expedition.profile
        };
        vi.spyOn(campaignWorldStore, 'getState').mockReturnValue(campaign);
        const advance = vi.spyOn(campaignWorldStore, 'beginExpedition');
        const fake = {
            performanceProfile: 'gameplay',
            fixedRunEntropy: false,
            isMultiplayer: false,
            _pendingExpeditionResume: snapshot,
            setActiveExpedition: vi.fn()
        };
        expect(ThreeGame.prototype.beginCampaignExpedition.call(fake)).toEqual(campaign);
        expect(advance).not.toHaveBeenCalled();
        expect(fake.expeditionIndex).toBe(3);
        expect(fake.expeditionSeed).toBe(9001);
        expect(fake.setActiveExpedition).toHaveBeenCalledWith(snapshot.expedition.profile);
    });
});
