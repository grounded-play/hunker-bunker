import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';
import { WandererManager } from './wandererSystem.js';
import { BankManager } from './bank.js';

const { createInstance } = vi.hoisted(() => ({ createInstance: vi.fn() }));
vi.mock('./wanderer3d.js', () => ({ createWanderer3dInstance: createInstance }));

beforeEach(() => {
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
    createInstance.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

function fixture() {
    const data = new Map();
    const storage = { getItem: (k) => data.get(k), setItem: (k, v) => data.set(k, v) };
    return {
        performanceProfile: 'gameplay', player: { position: new THREE.Vector3() },
        scene: new THREE.Group(), companions: [], runEntropy: 123,
        bank: new BankManager({ storage }), wandererManager: new WandererManager({ storage }),
        showBunkerLine: vi.fn(), syncSurvivorContract: ThreeGame.prototype.syncSurvivorContract,
        addHumanoidCompanion: ThreeGame.prototype.addHumanoidCompanion,
        isEnemyType: ThreeGame.prototype.isEnemyType, isSentinel: ThreeGame.prototype.isSentinel,
        isCrawler: ThreeGame.prototype.isCrawler, isAct2Active: () => false,
        hasCompanionFireLane: ThreeGame.prototype.hasCompanionFireLane,
        killedEnemyScatterKeys: new Set(), snailsKilledThisRun: 0, _recentKillTimestamps: [],
        spawnDamagePip: vi.fn(), _flashSnailHit: vi.fn(), spawnSentinelDrops: vi.fn(),
        spawnCrawlerDrops: vi.fn(), spawnSnailDrops: vi.fn(), spawnGearPoofEffect: vi.fn(),
        spawnPhysicalBurst: vi.fn(), spawnEnemyCorpse: vi.fn(), spawnPhysicalLootDrop: vi.fn(),
        _readLoreKeys: new Set(), scatterSprites: [], isGameplayInputActive: () => true
    };
}
function actor() { return { root: new THREE.Group(), update: vi.fn(), dispose: vi.fn() }; }
function foxhole(fake) {
    return fake.wandererManager.rollWanderer({ unlocks: { o2Bubble: true }, defeatedBosses: ['o2Bubble'] });
}
function hacker(fake) {
    fake.wandererManager.state.metWandererIds = ['some_prior'];
    return fake.wandererManager.rollWanderer({ unlocks: { o2Bubble: true }, defeatedBosses: ['o2Bubble'] }, () => 0);
}
function hybrid(fake) {
    fake.wandererManager.state.metWandererIds = ['some_prior'];
    return fake.wandererManager.rollWanderer({ unlocks: { o2Bubble: true }, defeatedBosses: ['o2Bubble'] }, () => 0.95);
}

describe('survivor runtime lifecycle', () => {
    it('coalesces arrival while loading and discards a model after run teardown', async () => {
        const fake = fixture();
        let resolve;
        createInstance.mockImplementation(() => new Promise((r) => { resolve = r; }));
        const first = ThreeGame.prototype.spawnCrashSiteWanderer.call(fake, foxhole(fake));
        await ThreeGame.prototype.spawnCrashSiteWanderer.call(fake, foxhole(fake));
        expect(createInstance).toHaveBeenCalledOnce();
        ThreeGame.prototype.clearCompanions.call(fake);
        const loaded = actor();
        resolve(loaded);
        await first;
        expect(fake.scene.children).toHaveLength(0);
        expect(fake.activeWanderer).toBeNull();
        expect(loaded.dispose).toHaveBeenCalledOnce();
    });

    it('recruits once despite repeat confirmation and restores the companion after cleanup', async () => {
        const fake = fixture();
        const survivor = foxhole(fake);
        fake.activeWanderer = survivor;
        createInstance.mockResolvedValue(actor());
        const befriend = vi.spyOn(fake.wandererManager, 'befriend');
        await Promise.all([
            ThreeGame.prototype.handleWandererBefriend.call(fake, survivor),
            ThreeGame.prototype.handleWandererBefriend.call(fake, survivor)
        ]);
        expect(befriend).toHaveBeenCalledOnce();
        expect(fake.companions).toHaveLength(1);
        ThreeGame.prototype.clearCompanions.call(fake);
        createInstance.mockResolvedValue(actor());
        ThreeGame.prototype.checkWandererSpawning.call(fake);
        await Promise.resolve();
        expect(fake.companions).toHaveLength(1);
        expect(createInstance).toHaveBeenCalledTimes(2);
    });

    it('delivers the contract through actual kill and camp completion methods', () => {
        const fake = fixture();
        fake.wandererManager.befriend(foxhole(fake));
        for (let i = 0; i < 8; i += 1) {
            const sprite = { userData: { type: 'cybersnail', hp: 1, maxHp: 3, scatterKey: `enemy:${i}` }, position: { x: 10, z: 20 } };
            ThreeGame.prototype.damageSnail.call(fake, sprite, 5);
            ThreeGame.prototype.damageSnail.call(fake, sprite, 5);
        }
        expect(fake.wandererManager.state.questProgress).toBe(8);
        fake._activeCampQuest = { campId: 'camp_meridian', quest: { id: 'supply_job', label: 'Assist camp' }, props: [] };
        fake.getCampById = () => null;
        fake.act2 = { completeCampQuest: vi.fn() };
        ThreeGame.prototype.resolveCampQuestCompletion.call(fake);
        ThreeGame.prototype.resolveCampQuestCompletion.call(fake);
        expect(fake.bank.getShells()).toBe(12);
        expect(fake.wandererManager.state.activeQuest).toBeNull();
    });

    it('fires at hostiles only and cannot fire through a blocked tile', () => {
        const fake = fixture();
        const instance3d = actor();
        fake.companions = [{ isWanderer: true, instance3d, wanderer: { assistAbility: { cooldown: 15 } } }];
        const friendly = { userData: { type: 'npc_martha', hp: 100 }, position: new THREE.Vector3(1, 0, 0) };
        const hostile = { userData: { type: 'cybersnail', hp: 3 }, position: new THREE.Vector3(4, 0, 0) };
        fake.scatterSprites = [friendly, hostile];
        fake.isSnailTileWalkable = (x) => x !== 2;
        fake.applyPlayerDamageToEnemy = vi.fn();
        ThreeGame.prototype.updateCompanions.call(fake, 0.25);
        expect(fake.applyPlayerDamageToEnemy).not.toHaveBeenCalled();
        fake.isSnailTileWalkable = () => true;
        ThreeGame.prototype.updateCompanions.call(fake, 0.25);
        expect(fake.applyPlayerDamageToEnemy).toHaveBeenCalledWith(hostile, 2);
        expect(fake.applyPlayerDamageToEnemy).toHaveBeenCalledOnce();
    });

    it('delivers the Hacker GF contract through actual terminal interactions', () => {
        const fake = fixture();
        fake.wandererManager.befriend(hacker(fake));
        expect(fake.wandererManager.state.activeQuest?.id).toBe('hacker_core_override_v1');

        for (let i = 1; i <= 3; i++) {
            const terminalSprite = {
                userData: { type: 'lore_terminal', loreKey: `terminal_node_${i}`, loreText: 'Data decrypted' },
                position: { x: 0.5, z: 0.5 }
            };
            fake.scatterSprites = [terminalSprite];
            ThreeGame.prototype.interactWithLoreTerminal.call(fake);
            // Duplicate interaction on same terminal shouldn't advance
            ThreeGame.prototype.interactWithLoreTerminal.call(fake);
            expect(fake.wandererManager.state.questProgress).toBe(i === 3 ? 0 : i);
        }

        expect(fake.wandererManager.state.activeQuest).toBeNull();
        expect(fake.bank.getShells()).toBe(15);
    });

    it('delivers the Chrysalis contract through actual hive mining interactions', () => {
        const fake = fixture();
        fake.wandererManager.befriend(hybrid(fake));
        expect(fake.wandererManager.state.activeQuest?.id).toBe('species_symbiosis_v1');

        fake.act2 = {
            mineHive: vi.fn()
        };
        const records = {
            hive_suture: { id: 'hive_suture', extractionLevel: 0, status: 'active' },
            hive_relay: { id: 'hive_relay', extractionLevel: 0, status: 'active' },
            hive_carapace: { id: 'hive_carapace', extractionLevel: 0, status: 'active' }
        };
        fake.getHiveRecord = (id) => ({ ...records[id] });
        fake.getHiveHarvestCycleKey = () => 'cycle_1';
        fake.canHarvestHiveToday = () => true;
        fake.spawnHiveHarvestBoss = vi.fn();
        fake.mineHiveSite = ThreeGame.prototype.mineHiveSite;

        const hives = [
            { id: 'hive_suture', label: 'Suture Hive', pos: { x: 10, z: 10 }, syncFromRecord: vi.fn() },
            { id: 'hive_relay', label: 'Relay Hive', pos: { x: 20, z: 20 }, syncFromRecord: vi.fn() },
            { id: 'hive_carapace', label: 'Carapace Hive', pos: { x: 30, z: 30 }, syncFromRecord: vi.fn() }
        ];

        for (let i = 0; i < 3; i++) {
            const h = hives[i];
            fake.act2.mineHive.mockImplementation(() => {
                records[h.id].extractionLevel = 1;
            });
            fake.mineHiveSite(h);
            // Duplicate mining in same harvest cycle shouldn't advance again
            fake.mineHiveSite(h);
            expect(fake.wandererManager.state.questProgress).toBe(i === 2 ? 0 : i + 1);
        }

        expect(fake.wandererManager.state.activeQuest).toBeNull();
        expect(fake.bank.getShells()).toBe(18 + 4 * 3); // 18 from quest, 4*3 from hive yields
    });
});
