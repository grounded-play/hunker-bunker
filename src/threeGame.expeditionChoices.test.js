import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';
import { Act2Manager, ACT2_MAX_BOND } from './act2.js';
import { HiveSite } from './hiveSite.js';
import { CAMP_QUESTS } from './data/campQuests.js';

function manager() {
    const values = new Map();
    return new Act2Manager({ storage: {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value)
    } });
}

beforeEach(() => {
    vi.stubGlobal('window', { dispatchEvent: vi.fn(), AudioManager: { play: vi.fn() } });
});
afterEach(() => vi.unstubAllGlobals());

function makeCampGame(campId) {
    const scene = new THREE.Scene();
    const act2 = manager();
    act2.adjustCampBond(campId, 3);
    const camp = {
        id: campId, label: campId, pos: { x: 10, z: 20 },
        setLevel: vi.fn(), setAided: vi.fn(), setStatus: vi.fn(), setSuspicion: vi.fn()
    };
    const game = {
        act2, scene, camp, chunkSize: 16, chunkMeshes: new Map(), scatterSprites: [],
        player: { position: new THREE.Vector3(10, 0, 20) },
        _activeCampQuest: null,
        getCampRecord: (id) => act2.getState().camps.find((entry) => entry.id === id),
        getCampById: (id) => id === campId ? camp : null,
        isGameplayInputActive: () => true,
        isSnailTileWalkable: () => true,
        canOccupyPosition: () => true,
        spawnGearPoofEffect: vi.fn(),
        createScatterInstance: vi.fn((placement) => {
            const object = new THREE.Object3D();
            object.position.set(placement.x, 0, placement.z);
            return object;
        })
    };
    for (const method of [
        'acceptCampQuest', 'findCampQuestSpawnSpot', 'spawnCampQuestMarkerProp',
        'spawnBunkerHoldoutWave', 'interactWithCampQuestObject', 'updateCampQuest',
        'advanceCampQuestProgress', 'resolveCampQuestCompletion', 'syncCampVisualFromRecord',
        'clearActiveCampQuestEntities', 'spawnHiveArchiveObject'
    ]) game[method] = ThreeGame.prototype[method];
    return game;
}

describe('playable camp signatures', () => {
    it.each([
        ['camp_meridian', 'grid_covenant', 'interact', 1],
        ['camp_tallow', 'warm_pipes', 'interact', 3],
        ['camp_vesper', 'iron_ledger', 'wave', 3]
    ])('%s completes its signature through world objectives and earns full trust', (campId, questId, kind, target) => {
        const game = makeCampGame(campId);
        const quest = CAMP_QUESTS[campId].find((entry) => entry.id === questId);
        game.acceptCampQuest(game.camp, quest);
        expect(game._activeCampQuest).toMatchObject({ kind, target });
        expect(game.getCampRecord(campId).questFlags[questId]).toBe('active');
        expect(game.getCampRecord(campId).bond).toBe(3);

        for (let step = 0; step < target; step += 1) {
            if (kind === 'wave') {
                expect(game._activeCampQuest.props).toHaveLength(3);
                for (const enemy of game._activeCampQuest.props) {
                    enemy.userData.burstTriggered = true;
                    enemy.parent.remove(enemy);
                    game.scatterSprites = game.scatterSprites.filter((entry) => entry !== enemy);
                }
                game.updateCampQuest(0.1);
            } else {
                const prop = game._activeCampQuest.props[step];
                game.player.position.copy(prop.position);
                expect(game.interactWithCampQuestObject()).toBe(true);
            }
        }

        expect(game._activeCampQuest).toBeNull();
        expect(game.getCampRecord(campId).questFlags[questId]).toBe('done');
        expect(game.getCampRecord(campId).bond).toBe(ACT2_MAX_BOND);
        expect(game.camp.setStatus).toHaveBeenCalledWith('alive');
        expect(game.camp.setLevel).toHaveBeenCalled();
        expect(game.scatterSprites).toHaveLength(0);
        const creations = game.createScatterInstance.mock.calls.length;
        game.acceptCampQuest(game.camp, quest);
        expect(game._activeCampQuest).toBeNull();
        expect(game.createScatterInstance).toHaveBeenCalledTimes(creations);
    });

    it('does not persist an unsupported or unspawnable quest', () => {
        const game = makeCampGame('camp_meridian');
        game.acceptCampQuest(game.camp, { id: 'future_task' });
        expect(game.getCampRecord(game.camp.id).questFlags).toEqual({});
        game.createScatterInstance.mockReturnValue(null);
        const quest = CAMP_QUESTS.camp_meridian.find((entry) => entry.id === 'grid_covenant');
        game.acceptCampQuest(game.camp, quest);
        expect(game._activeCampQuest).toBeNull();
        expect(game.getCampRecord(game.camp.id).questFlags).toEqual({});
    });
});

describe('archive objectives stay with their ring', () => {
    it.each([
        ['camp_meridian', 'hive_suture'],
        ['camp_tallow', 'hive_carapace'],
        ['camp_vesper', 'hive_relay']
    ])('places %s archive beside %s instead of the first hive', (campId, hiveId) => {
        const game = makeCampGame(campId);
        game.hives = [
            { id: 'hive_relay', pos: { x: 100, z: 100 } },
            { id: 'hive_suture', pos: { x: 200, z: 200 } },
            { id: 'hive_carapace', pos: { x: 300, z: 300 } }
        ];
        const hive = game.hives.find((entry) => entry.id === hiveId);
        let checks = 0;
        game.canOccupyPosition = vi.fn(() => ++checks > 1);
        game.findCampQuestSpawnSpot = vi.fn((site, index) => ({ x: site.pos.x + index, z: site.pos.z }));
        game._activeCampQuest = { quest: { id: 'hive_archive_ch1' }, props: [] };
        game.spawnHiveArchiveObject(game.camp);
        expect(game._activeCampQuest.props).toHaveLength(1);
        expect(game._activeCampQuest.props[0].position.x).toBe(hive.pos.x + 1);
        expect(game._activeCampQuest.props[0].position.z).toBe(hive.pos.z);
        expect(game.canOccupyPosition).toHaveBeenCalledTimes(2);
    });

    it('falls back to reachable camp ground if the corresponding hive is blocked', () => {
        const game = makeCampGame('camp_tallow');
        game.hives = [{ id: 'hive_carapace', pos: { x: 300, z: 300 } }];
        game.canOccupyPosition = (x) => x < 50;
        game._activeCampQuest = { quest: { id: 'hive_archive_ch2' }, props: [] };
        game.spawnHiveArchiveObject(game.camp);
        expect(game._activeCampQuest.props).toHaveLength(1);
        expect(game._activeCampQuest.props[0].position.x).toBeLessThan(50);
    });
});

function makeHiveGame(hiveId = 'hive_suture') {
    const act2 = manager();
    const hive = new HiveSite(new THREE.Scene(), { id: hiveId });
    hive.reveal(10, 20);
    return {
        act2, hive,
        getHiveById: (id) => id === hiveId ? hive : null,
        getHiveRecord: (id) => act2.getState().hives.find((entry) => entry.id === id),
        resolveHiveChoice: ThreeGame.prototype.resolveHiveChoice,
        bank: { canAffordShells: () => true, spendShells: vi.fn(() => true), deposit: vi.fn(), addShells: vi.fn() },
        spawnGearPoofEffect: vi.fn(), spawnHiveHarvestBoss: vi.fn(), triggerCameraShake: vi.fn(),
        resolveDayDeadline: vi.fn()
    };
}

describe('hive choices apply once and change the physical site', () => {
    it('harvesting empties the hive and pays once even if the modal submits again', () => {
        const game = makeHiveGame();
        const payload = { hiveId: game.hive.id };
        game.resolveHiveChoice('hive-harvest', payload);
        game.resolveHiveChoice('hive-harvest', payload);
        expect(game.bank.addShells).toHaveBeenCalledExactlyOnceWith(12);
        expect(game.bank.deposit).toHaveBeenCalledTimes(1);
        expect(game.spawnHiveHarvestBoss).toHaveBeenCalledTimes(1);
        expect(game.getHiveRecord(game.hive.id).status).toBe('slain');
        expect(game.hive.npcSprite.visible).toBe(false);
        expect(game.hive.signalColumn.visible).toBe(false);
        expect(game.hive.coreMat.emissiveIntensity).toBe(0);
        const successes = window.dispatchEvent.mock.calls.filter(([event]) => event.type === 'hive-choice-resolved');
        expect(successes).toHaveLength(1);
    });

    it('a reducer rejection cannot pay harvest loot or emit success', () => {
        const game = makeHiveGame();
        game.act2.harvestHive = vi.fn();
        game.resolveHiveChoice('hive-harvest', { hiveId: game.hive.id });
        expect(game.bank.addShells).not.toHaveBeenCalled();
        expect(game.spawnHiveHarvestBoss).not.toHaveBeenCalled();
        expect(window.dispatchEvent.mock.calls.some(([event]) => event.type === 'hive-choice-resolved')).toBe(false);
    });

    it('requires trust and the correct rite before a quest unlocks rescue', () => {
        const game = makeHiveGame();
        const payload = { hiveId: game.hive.id, questId: 'host_mercy' };
        game.resolveHiveChoice('hive-quest', payload);
        expect(game.getHiveRecord(game.hive.id).questFlags).toEqual({});
        game.act2.adjustHiveBond(game.hive.id, 2);
        game.resolveHiveChoice('hive-quest', { ...payload, questId: 'false_clearance' });
        expect(game.getHiveRecord(game.hive.id).questFlags).toEqual({});
        game.resolveHiveChoice('hive-quest', payload);
        expect(game.getHiveRecord(game.hive.id).bond).toBe(3);
        expect(game.hive.signalMat.color.getHex()).toBe(0x7dff9a);
        expect(game.resolveDayDeadline).toHaveBeenCalledExactlyOnceWith('hive_suture_parley');
        game.resolveHiveChoice('hive-rescue', payload);
        expect(game.getHiveRecord(game.hive.id).status).toBe('rescued');
        expect(game.hive.npcSprite.visible).toBe(false);
        game.resolveHiveChoice('hive-harvest', payload);
        expect(game.bank.addShells).not.toHaveBeenCalled();
        expect(game.act2.getState().manifest.aliens).toContain(game.hive.id);
    });

    it('a missed parley cannot be bypassed by the final oath', () => {
        const game = makeHiveGame();
        game.act2.begin();
        // Public mutator, not a reach into act2.state: src/act2StateSurfaceAudit
        // forbids touching the live state field from outside act2.js.
        for (let stage = 0; stage < 3; stage += 1) game.act2.advanceDialogueStage('hive', game.hive.id);
        game.isDayDeadlineExpired = () => true;
        game.resolveHiveChoice('hive-final', { hiveId: game.hive.id });
        expect(game.getHiveRecord(game.hive.id).questFlags).toEqual({});
        expect(game.resolveDayDeadline).not.toHaveBeenCalled();
    });

    it('a fully tended hive and a vacated hive cannot consume shells', () => {
        const game = makeHiveGame();
        game.act2.adjustHiveBond(game.hive.id, 5);
        game.resolveHiveChoice('hive-tend', { hiveId: game.hive.id });
        game.act2.rescueHive(game.hive.id);
        game.resolveHiveChoice('hive-tend', { hiveId: game.hive.id });
        expect(game.bank.spendShells).not.toHaveBeenCalled();
    });

    it('linking the chorus illuminates the membrane ring and vacating extinguishes it', () => {
        const game = makeHiveGame();
        expect(game.hive.synapseRing.material.emissive.getHex()).toBe(0x000000);
        game.resolveHiveChoice('hive-network', { hiveId: game.hive.id });
        expect(game.hive.synapseRing.material.emissive.getHex()).toBe(0x00ffcc);
        expect(game.hive.synapseRing.material.emissiveIntensity).toBe(0.9);
        game.resolveHiveChoice('hive-harvest', { hiveId: game.hive.id });
        expect(game.hive.synapseRing.material.emissiveIntensity).toBe(0);
    });
});
