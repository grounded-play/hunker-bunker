import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';
import { campaignWorldStore } from './campaignWorld.js';
import { createAccessState } from './accessControl.js';
import { createMilestoneBossLifecycleState, MILESTONE_BOSS_EVENT_TYPES } from './milestoneBossLifecycle.js';
import { createExpeditionProfile, EXPEDITION_CONDITIONS } from './expeditionSystem.js';
import { SurvivorCamp } from './camp.js';
import { HiveSite } from './hiveSite.js';
import { Act2Manager } from './act2.js';
import { resolveAuthoredChunkStructure } from './authoredWorldRuntime.js';
import { buildWorldPlan } from './ringManifest.js';
import { GATE_CHALLENGES, planGateChallenges } from './gateChallenges.js';
import { generateRadialMazeExpedition, LEGACY_ROUTE_LAYOUT_VERSION, ROUTE_LAYOUT_VERSION } from './mazeExpedition.js';

let events;

beforeEach(() => {
    events = [];
    vi.stubGlobal('window', {
        dispatchEvent: (event) => { events.push({ type: event.type, detail: event.detail }); return true; },
        document: { createElement: () => ({ getContext: () => null, width: 1, height: 1 }) }
    });
    campaignWorldStore.reset();
});

afterEach(() => {
    vi.unstubAllGlobals();
    campaignWorldStore.reset();
});

const METHODS = [
    'beginCampaignExpedition', 'persistCampaignWorld', 'getMazePersistenceState',
    'restoreMazePersistenceState', 'getRadialMazePlan', 'getRadialLayoutSignature',
    'ensureAuthoredWorldPlan', 'getBuiltGoalKeys', 'completeRingCrossingMission',
    'reconcileAuthoredWorldProgression', 'applyMilestoneBossRuntimeEvent', 'getAuthoredSitePosition',
    'chooseRadialSitePosition', 'isSiteOnPlannedRing',
    'setActiveExpedition', 'getExpeditionEffects', 'applyExpeditionPlayerEffects', 'announceExpeditionBriefing',
    'getTerritoryRoomCenter', 'recordWorldTransformation', 'syncCrossingBridges', 'ensureCrossingBridge',
    'clearCrossingBridges', 'syncWorldTransformations', 'announceTerritoryLocation', 'getRouteLayoutVersion',
    'applyExpeditionObstacles', 'isInTutorialRing', 'applyExpeditionDeathEffect',
    'syncBioConduits', 'clearBioConduits', 'getBioConduitAt', 'interactWithBioConduit', 'applyCrossingBridgeTiles',
    'resolveSpawnPoint', 'teleportPlayerTo', 'resolveHiveChoice',
    'getGateChallengeForChunk', 'enterGateChallengeChunk'
];

function game(overrides = {}) {
    const world = {
        chunkSize: 49,
        globalSeedOffset: 0,
        authoredWorldTiles: true,
        performanceProfile: 'gameplay',
        scene: new THREE.Scene(),
        bank: { getState: () => ({ unlocks: { o2Bubble: true, hullExpansion: true } }) },
        mazeAccessState: createAccessState(),
        proceduralDoorStates: new Map(),
        completedRingCrossingMissionIds: new Set(),
        defeatedMilestoneBosses: new Set(),
        milestoneBossLifecycleState: createMilestoneBossLifecycleState({ builtGoalKeys: ['o2Bubble', 'hullExpansion'] }),
        destroyedWallKeys: new Set(),
        destroyedExteriorWallKeys: new Set(),
        discoveredMapChunkKeys: new Set(['0,0']),
        discoveredMapRoomKeys: new Set(),
        discoveredMapCellKeys: new Set(),
        camps: [],
        hives: [],
        ...overrides
    };
    for (const method of METHODS) world[method] = ThreeGame.prototype[method];
    return world;
}

function openCrossing(world, crossing) {
    world.applyMilestoneBossRuntimeEvent({ type: MILESTONE_BOSS_EVENT_TYPES.STAGE, milestoneId: crossing.requirements.milestoneId });
    world.applyMilestoneBossRuntimeEvent({ type: MILESTONE_BOSS_EVENT_TYPES.ENEMY_KILLED, milestoneId: crossing.requirements.milestoneId });
    return world.completeRingCrossingMission(crossing.requirements.missionId);
}

describe('seeded expeditions in a persistent campaign', () => {
    it('re-rolls conditions per deployment over one fixed campaign geography', () => {
        campaignWorldStore.getOrCreate({ seed: 8128 });
        const world = game();
        const conditions = new Set();
        let signature = null;
        for (let deployment = 0; deployment < 8; deployment += 1) {
            const campaign = world.beginCampaignExpedition();
            expect(campaign.seed).toBe(8128);
            expect(world.activeExpedition).toEqual(createExpeditionProfile(8128, campaign.expeditionIndex));
            conditions.add(world.activeExpedition.condition.id);
            const next = world.getRadialLayoutSignature(world.getRadialMazePlan());
            if (signature) expect(next).toBe(signature);
            signature = next;
        }
        expect(conditions.size).toBeGreaterThanOrEqual(3);
    });

    it('generates each campaign on the route generation it was saved with', () => {
        const legacySeed = 5150;
        campaignWorldStore.getOrCreate({ seed: legacySeed });
        const fresh = game();
        fresh.beginCampaignExpedition();
        expect(fresh.getRouteLayoutVersion()).toBe(ROUTE_LAYOUT_VERSION);
        expect(fresh.getRadialMazePlan().layoutVersion).toBe(ROUTE_LAYOUT_VERSION);

        const legacy = game({ _campaignWorldSeed: legacySeed });
        vi.spyOn(campaignWorldStore, 'getState').mockReturnValue({ seed: legacySeed, layoutVersion: LEGACY_ROUTE_LAYOUT_VERSION });
        expect(legacy.getRouteLayoutVersion()).toBe(LEGACY_ROUTE_LAYOUT_VERSION);
        vi.restoreAllMocks();
        expect(game({ isMultiplayer: true }).getRouteLayoutVersion()).toBe(ROUTE_LAYOUT_VERSION);
    });

    it('gives fixed-seed and multiplayer peers the same shared-seed expedition', () => {
        const a = game({ isMultiplayer: true, globalSeedOffset: 4242 });
        const b = game({ isMultiplayer: true, globalSeedOffset: 4242 });
        a.beginCampaignExpedition();
        b.beginCampaignExpedition();
        expect(a.activeExpedition).toEqual(b.activeExpedition);
        expect(a.activeExpedition).toEqual(createExpeditionProfile(4242, 0));
        expect(campaignWorldStore.getState()).toBeNull();
    });

    it('swaps player effects between deployments without compounding them', () => {
        const world = game({ moveSpeed: 4, o2DrainMult: 1, loadoutMods: {}, _loadoutModsBeforeExpedition: {} });
        const byId = (id) => ({ condition: EXPEDITION_CONDITIONS.find((entry) => entry.id === id) });
        world.setActiveExpedition(byId('glacial_gale'));
        expect(world.moveSpeed).toBeCloseTo(4 * 1.04);
        expect(world.o2DrainMult).toBeCloseTo(1.1);
        world.setActiveExpedition(byId('bio_resin_surge'));
        expect(world.moveSpeed).toBeCloseTo(4 * 0.95);
        expect(world.o2DrainMult).toBeCloseTo(1);
        for (let i = 0; i < 5; i += 1) world.setActiveExpedition(byId('glacial_gale'));
        expect(world.moveSpeed).toBeCloseTo(4 * 1.04);
        world.setActiveExpedition(null);
        expect(world.moveSpeed).toBeCloseTo(4);
        expect(world.loadoutMods).toEqual({});
        world.setActiveExpedition(byId('geothermal_arc'));
        expect(world.loadoutMods.shieldRechargeDelayMultiplier).toBeCloseTo(0.8);
    });

    it('briefs the HUD on deployment with the active condition and its effects', () => {
        campaignWorldStore.getOrCreate({ seed: 77 });
        const world = game();
        world.beginCampaignExpedition();
        expect(world.announceExpeditionBriefing()).toBe(true);
        const briefing = events.find((event) => event.type === 'expedition-briefing');
        expect(briefing.detail).toMatchObject({
            expeditionIndex: world.activeExpedition.expeditionIndex,
            conditionId: world.activeExpedition.condition.id,
            threatIndex: world.activeExpedition.threatIndex
        });
        expect(briefing.detail.effects.world.salvageMultiplier).toBe(world.activeExpedition.condition.scrapMultiplier);
        world.performanceProfile = 'menu';
        expect(world.announceExpeditionBriefing()).toBe(false);
    });
});

describe('condition kill signatures', () => {
    const enemy = (x, z, type = 'cryosnail', extra = {}) => ({ position: { x, z }, userData: { type, hp: 2, ...extra } });
    const byId = (id) => ({ condition: EXPEDITION_CONDITIONS.find((entry) => entry.id === id) });

    it('freezes the pack around a cryo kill in a glacial gale', () => {
        const dead = enemy(0, 0);
        const near = enemy(1.5, 1);
        const far = enemy(6, 0);
        const boss = enemy(0.5, 0, 'boss_cryo', { isBoss: true });
        const world = game({
            activeExpedition: byId('glacial_gale'),
            scatterSprites: [dead, near, far, boss],
            isEnemyType: () => true,
            spawnPhysicalBurst: vi.fn()
        });
        expect(world.applyExpeditionDeathEffect(dead).kind).toBe('frost_ring');
        expect(near.userData.frozenTimer).toBeCloseTo(1.2);
        expect(far.userData.frozenTimer).toBeUndefined();
        expect(boss.userData.frozenTimer).toBeUndefined();
        expect(world.spawnPhysicalBurst).toHaveBeenCalled();
    });

    it('drops extra salvage from spore snails in a spore bloom', () => {
        const parent = { add: vi.fn() };
        const dead = { ...enemy(3, 3, 'sporesnail'), parent };
        const world = game({
            activeExpedition: byId('spore_bloom'),
            pickupMeshes: [],
            createSnailDropPlacement: vi.fn((ox, oz, tx, tz, type) => ({ type })),
            createPickupInstance: vi.fn((placement) => ({ placement })),
            spawnPhysicalBurst: vi.fn()
        });
        world.applyExpeditionDeathEffect(dead);
        expect(world.createSnailDropPlacement.mock.calls[0][4]).toBe('coin');
        expect(world.pickupMeshes).toHaveLength(1);
        expect(parent.add).toHaveBeenCalledTimes(1);
        expect(world.applyExpeditionDeathEffect(enemy(3, 3, 'cybersnail'))).toBeNull();
    });

    it('arcs into a carrier standing on a geothermal kill, never a god-mode one', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.1);
        const takeDamage = vi.fn();
        const world = game({
            activeExpedition: byId('geothermal_arc'),
            player: { position: { x: 0.5, z: 0 } },
            takeDamage,
            spawnPhysicalBurst: vi.fn()
        });
        world.applyExpeditionDeathEffect(enemy(0, 0, 'crawler'));
        expect(takeDamage).toHaveBeenCalledWith(1, 'expedition-arc', 0, 0);
        world.player.position.x = 5;
        world.applyExpeditionDeathEffect(enemy(0, 0, 'crawler'));
        world.player.position.x = 0.5;
        world.godMode = true;
        world.applyExpeditionDeathEffect(enemy(0, 0, 'crawler'));
        expect(takeDamage).toHaveBeenCalledTimes(1);
        vi.restoreAllMocks();
    });
});

describe('expedition corridor rubble', () => {
    const hall = () => Array.from({ length: 49 }, (_, y) => Array.from({ length: 49 }, (_, x) => (
        x === 0 || y === 0 || x === 48 || y === 48 ? '#' : '.'
    )));
    // Two expeditions of one campaign rubble at least one procedural chunk
    // differently; which chunks depends on the roll, so sample a spread.
    it('rubbles only generic procedural hallways, differently per expedition', () => {
        const run = (expeditionIndex) => {
            const world = game({ wfcMetadataCache: new Map() });
            world.setActiveExpedition(createExpeditionProfile(8128, expeditionIndex));
            const layout = [];
            for (let i = 2; i < 40; i += 1) {
                const room = { interior: [{ x: 10, y: 10 }, { x: 11, y: 10 }] };
                const door = { localX: 24, localY: 1, cells: [{ x: 23, y: 1 }, { x: 25, y: 1 }] };
                world.wfcMetadataCache.set(`${i},3`, { generatorId: 'architectural-room', roomInstances: [room], doors: [door] });
                const grid = hall();
                const cells = world.applyExpeditionObstacles(grid, i, 3);
                for (const { x, y } of cells) {
                    expect(grid[y][x]).toBe('#');
                    expect(Math.abs(x - 24) > 2 || y > 3).toBe(true);
                    expect(room.interior.some((cell) => cell.x === x && cell.y === y)).toBe(false);
                }
                layout.push(JSON.stringify(cells));
            }
            return layout;
        };
        const first = run(0);
        expect(first.some((entry) => entry !== '[]')).toBe(true);
        expect(run(1)).not.toEqual(first);
        expect(run(0)).toEqual(first);
    });

    it('leaves the crash site, tutorial ring, reserved rooms and crossings untouched', () => {
        const world = game({ wfcMetadataCache: new Map() });
        world.setActiveExpedition({ ...createExpeditionProfile(8128, 0), expeditionSeed: 1 });
        const cases = [
            [0, 0, { generatorId: 'architectural-room' }],
            [1, -1, { generatorId: 'architectural-room' }],
            [5, 5, { generatorId: 'authored-room' }],
            [6, 5, { generatorId: 'architectural-room', reservationId: 'territory:camp_meridian' }],
            [7, 5, { generatorId: 'architectural-room', ringCrossingId: 'ring-2-gate' }]
        ];
        for (const [x, y, metadata] of cases) {
            world.wfcMetadataCache.set(`${x},${y}`, metadata);
            for (let attempt = 0; attempt < 3; attempt += 1) expect(world.applyExpeditionObstacles(hall(), x, y)).toEqual([]);
        }
        world.performanceProfile = 'menu';
        world.wfcMetadataCache.set('9,9', { generatorId: 'architectural-room' });
        expect(world.applyExpeditionObstacles(hall(), 9, 9)).toEqual([]);
    });
});

describe('physical world changes', () => {
    it('spans the ring 2 canyon with a bridge once its crossing opens, and persists it', () => {
        campaignWorldStore.getOrCreate({ seed: 917 });
        const world = game();
        world.beginCampaignExpedition();
        world._campaignProgressRestored = true;
        const plan = world.ensureAuthoredWorldPlan();
        const canyon = plan.ringCrossings.find((crossing) => crossing.opensTraversal === 'bridge');
        const previous = plan.ringCrossings.find((crossing) => crossing.id === canyon.requirements.previousCrossingId);
        expect(openCrossing(world, previous)).toBe(true);
        world.proceduralDoorStates.set('gantry', {
            id: 'gantry', ringCrossingId: canyon.id, state: 'locked', chunkKey: '2,-3', localX: 24, localY: 0, side: 'n'
        });
        world.reconcileAuthoredWorldProgression();
        expect(world.crossingBridges?.size ?? 0).toBe(0);

        expect(openCrossing(world, canyon)).toBe(true);
        const bridge = world.crossingBridges.get(canyon.id);
        expect(bridge.parent).toBe(world.scene);
        expect(bridge.userData).toMatchObject({ kind: 'crossing-bridge', crossingId: canyon.id });
        expect(bridge.position.x).toBe(2 * 49 + 24);
        const parts = new Set();
        bridge.traverse((child) => { if (child.userData?.part) parts.add(child.userData.part); });
        expect([...parts].sort()).toEqual(['beacon', 'deck', 'guardrail']);
        expect(campaignWorldStore.getWorldTransformations().bridgesConstructed).toEqual([canyon.id]);
        expect(events.filter((event) => event.type === 'world-transformed')).toHaveLength(1);

        world.reconcileAuthoredWorldProgression();
        expect(world.scene.children.filter((child) => child.userData?.kind === 'crossing-bridge')).toHaveLength(1);
        world.clearCrossingBridges();
        expect(world.scene.children).toHaveLength(0);
    });

    it('re-tags the canyon corridor beyond the gantry as bridge deck', () => {
        campaignWorldStore.getOrCreate({ seed: 917 });
        const world = game();
        world.beginCampaignExpedition();
        const plan = world.ensureAuthoredWorldPlan();
        const canyon = plan.ringCrossings.find((crossing) => crossing.opensTraversal === 'bridge');
        const previous = plan.ringCrossings.find((crossing) => crossing.id === canyon.requirements.previousCrossingId);
        const corridor = () => Array.from({ length: 49 }, (_, y) => Array.from({ length: 49 }, (_, x) => (
            y < 17 && x >= 23 && x <= 25 ? '.' : y === 17 && x >= 23 && x <= 25 ? 'D' : 'X'
        )));
        const door = {
            id: 'gantry', ringCrossingId: canyon.id, state: 'locked', chunkKey: '2,-3', localX: 24, localY: 17, side: 'n',
            cells: [{ x: 23, y: 17 }, { x: 24, y: 17 }, { x: 25, y: 17 }]
        };
        const grid = corridor();
        world.chunkCache = new Map([['2,-3', grid]]);
        world.wfcMetadataCache = new Map([['2,-3', { doors: [door] }]]);
        world.proceduralDoorStates.set('gantry', door);
        expect(world.applyCrossingBridgeTiles(corridor(), 2, -3)).toEqual([]);
        openCrossing(world, previous);
        openCrossing(world, canyon);
        const deck = grid.flat().filter((tile) => tile === 'B').length;
        expect(deck).toBe(3 * 17);
        // Door at z = -130; the deck starts half a cell inside it and runs the
        // 17-cell corridor to the chunk edge (z = -147.5): centre -138.5.
        expect(world.crossingBridges.get(canyon.id).position.z).toBeCloseTo(-138.5);
        const rebuilt = corridor();
        expect(world.applyCrossingBridgeTiles(rebuilt, 2, -3)).toHaveLength(3 * 17);
        expect(rebuilt[0][24]).toBe('B');
    });

    it('never bridges a crossing whose clearing opens no traversal', () => {
        campaignWorldStore.getOrCreate({ seed: 917 });
        const world = game();
        world.beginCampaignExpedition();
        const plan = world.ensureAuthoredWorldPlan();
        const bulkhead = plan.ringCrossings.find((crossing) => crossing.opensTraversal !== 'bridge');
        world.proceduralDoorStates.set('bulkhead', {
            id: 'bulkhead', ringCrossingId: bulkhead.id, state: 'locked', chunkKey: '0,-1', localX: 24, localY: 0, side: 'n'
        });
        expect(openCrossing(world, bulkhead)).toBe(true);
        expect(world.crossingBridges?.size ?? 0).toBe(0);
    });

    it('records fortified camps and hive outcomes with their passives', () => {
        campaignWorldStore.getOrCreate({ seed: 31 });
        const records = {
            camp_meridian: { level: 2, status: 'alive' },
            camp_tallow: { level: 1, status: 'alive' },
            hive_suture: { status: 'bonded' },
            hive_relay: { status: 'slain' },
            hive_carapace: { status: 'mined' }
        };
        const world = game({
            camps: [{ id: 'camp_meridian', level: 2 }, { id: 'camp_tallow', level: 1 }],
            hives: [
                { id: 'hive_suture', pos: { x: 10, z: 10 } },
                { id: 'hive_relay', pos: { x: 300, z: -40 } },
                { id: 'hive_carapace', pos: { x: -90, z: 0 } }
            ],
            getCampRecord: (id) => records[id],
            getHiveRecord: (id) => records[id]
        });
        world.beginCampaignExpedition();
        world.syncWorldTransformations();
        const saved = campaignWorldStore.getWorldTransformations();
        expect(saved.campsFortified).toEqual(['camp_meridian']);
        expect(saved.hivesTransformed.hive_suture.outcome).toBe('bonded');
        expect(saved.hivesTransformed.hive_relay.outcome).toBe('harvested');
        expect(saved.hivesTransformed.hive_carapace).toBeUndefined();
        expect(saved.shortcutsOpened).toEqual(['hive_suture:escape']);
        expect(world._bondedHiveSpeedMultiplier).toBeCloseTo(1.06);
        expect(world._harvestedHivePositions).toEqual([{ x: 300, z: -40 }]);

        const announced = events.filter((event) => event.type === 'world-transformed').length;
        world.syncWorldTransformations();
        game({ ...world, _recordedWorldTransformations: new Set() }).syncWorldTransformations();
        expect(events.filter((event) => event.type === 'world-transformed')).toHaveLength(announced);
    });

    it('keeps fixed-seed and multiplayer world changes out of the campaign save', () => {
        campaignWorldStore.getOrCreate({ seed: 5 });
        const world = game({
            isMultiplayer: true,
            camps: [{ id: 'camp_meridian', level: 3 }],
            getCampRecord: () => ({ level: 3, status: 'alive' })
        });
        world.beginCampaignExpedition();
        world.syncWorldTransformations();
        expect(campaignWorldStore.getWorldTransformations().campsFortified).toEqual([]);
    });

    it('builds the fortified defense grid inside the compound perimeter room', () => {
        const camp = new SurvivorCamp(new THREE.Scene(), { id: 'camp_meridian' });
        camp.reveal(100, 100);
        camp.setPerimeterAnchor({ x: 100, z: 149 });
        camp.setLevel(1);
        expect(camp.turrets).toHaveLength(0);
        expect(camp.searchlights).toHaveLength(0);
        camp.setLevel(3);
        expect(camp.turrets).toHaveLength(2);
        for (const turret of camp.turrets) {
            const pos = camp.turretWorldPos(turret);
            expect(Math.hypot(pos.x - 100, pos.z - 149)).toBeLessThan(3);
        }
        expect(camp.searchlights).toHaveLength(2);
        camp.update(1.5, { x: 0, z: 0 });
        expect(camp.searchlights[0].head.rotation.y).not.toBe(0);
        camp.setStatus('culled');
        expect(camp.searchlights.every((light) => light.beam.visible === false)).toBe(true);

        const lone = new SurvivorCamp(new THREE.Scene(), { id: 'camp_vesper' });
        lone.reveal(0, 0);
        lone.setLevel(3);
        expect(Math.hypot(lone.turrets[0].offset.x, lone.turrets[0].offset.z)).toBeCloseTo(3.55);
        expect(lone.searchlights).toHaveLength(0);
    });

    it('grows bio-flora over a bonded hive and thorn pods over a harvested one', () => {
        const hive = new HiveSite({ add() {} }, { id: 'hive_suture', label: 'SUTURE', characterId: 'nahl' });
        hive.syncFromRecord({ status: 'bonded', bond: 3, extractionLevel: 0 });
        expect(hive.outcomeGroup).toBeNull();
        hive.reveal(5, 5);
        expect(hive.outcomeGroup.userData).toMatchObject({ kind: 'hive-outcome', outcome: 'bonded' });
        const bondedParts = hive.outcomeParts.length;
        hive.syncFromRecord({ status: 'slain', bond: 0, extractionLevel: 3 });
        expect(hive.outcomeGroup.userData.outcome).toBe('harvested');
        expect(hive.outcomeParts.length).not.toBe(bondedParts);
        expect(hive.group.children.filter((child) => child.userData?.kind === 'hive-outcome')).toHaveLength(1);
        hive.syncFromRecord({ status: 'dormant' });
        expect(hive.outcomeGroup).toBeNull();
    });
});

describe('campaign gate challenges', () => {
    const setup = () => {
        campaignWorldStore.getOrCreate({ seed: 917 });
        const world = game({ spawnDeepAnchorElite: vi.fn() });
        world.beginCampaignExpedition();
        const plan = world.ensureAuthoredWorldPlan();
        return { world, plan, challenges: planGateChallenges(plan) };
    };

    it('announces a gate challenge once per run and wakes the warden only at the gate', () => {
        const { world, challenges } = setup();
        for (const entry of challenges) {
            const approach = entry.approachChunkKeys.find((key) => key !== entry.gateChunkKey);
            world.enterGateChallengeChunk(approach);
            world.enterGateChallengeChunk(entry.gateChunkKey);
            world.enterGateChallengeChunk(entry.gateChunkKey);
        }
        const announced = events.filter((event) => event.type === 'gate-challenge').map((event) => event.detail.crossingId);
        expect(announced).toEqual(challenges.map((entry) => entry.crossingId));
        const warden = challenges.find((entry) => entry.challenge === GATE_CHALLENGES.ELITE_WARDEN);
        expect(world.spawnDeepAnchorElite.mock.calls.map(([id]) => id).every((id) => id === warden.crossingId)).toBe(true);
        expect(world.spawnDeepAnchorElite).toHaveBeenCalled();
    });

    it('lifts a gate challenge once its crossing is open', () => {
        const { world, plan, challenges } = setup();
        const first = challenges.find((entry) => entry.ring === 1);
        expect(world.getGateChallengeForChunk(first.gateChunkKey)?.crossingId).toBe(first.crossingId);
        openCrossing(world, plan.ringCrossings.find((crossing) => crossing.id === first.crossingId));
        expect(world.getGateChallengeForChunk(first.gateChunkKey)).toBeNull();
    });

    it('chokes a collapsed approach with rubble every deployment', () => {
        const { world, challenges } = setup();
        const collapsed = challenges.find((entry) => entry.challenge === GATE_CHALLENGES.COLLAPSED_APPROACH);
        const key = collapsed.approachChunkKeys.find((chunk) => chunk !== collapsed.gateChunkKey);
        const [cx, cy] = key.split(',').map(Number);
        world.wfcMetadataCache = new Map([[key, { generatorId: 'architectural-connector', roomInstances: [], doors: [] }]]);
        const hall = () => Array.from({ length: 49 }, (_, y) => Array.from({ length: 49 }, (_, x) => (
            x === 0 || y === 0 || x === 48 || y === 48 ? '#' : '.'
        )));
        for (let index = 1; index <= 6; index += 1) {
            world.setActiveExpedition(createExpeditionProfile(917, index));
            expect(world.applyExpeditionObstacles(hall(), cx, cy).length, `deployment ${index}`).toBeGreaterThan(4);
        }
    });
});

describe('camp fortify choice', () => {
    const campStub = (level, status = 'alive') => {
        const record = { id: 'camp_meridian', level, status, bond: 1, dialogueStage: 0, questFlags: {} };
        const world = {
            getCampRecord: () => record,
            getBoardingCampId: () => null,
            peekDialogueBeat: () => null,
            isDayDeadlineExpired: () => false,
            act2: { getState: () => ({ humanity: 10, camps: [] }), countCampFinalsDone: () => 0 },
            supportCamp: vi.fn(() => true)
        };
        world.buildCampChoiceOptions = ThreeGame.prototype.buildCampChoiceOptions;
        world.getCampSupportCost = ThreeGame.prototype.getCampSupportCost;
        world.getCampCondition = ThreeGame.prototype.getCampCondition;
        world.resolveCampChoice = ThreeGame.prototype.resolveCampChoice;
        world.getCampById = () => camp;
        const camp = { id: 'camp_meridian', label: 'MERIDIAN', level, leaderName: 'Martha' };
        return { world, camp };
    };

    it('offers FORTIFY PERIMETER until the grid stands, and routes it through camp support', () => {
        const { world, camp } = campStub(1);
        const fortify = world.buildCampChoiceOptions(camp).find((option) => option.action === 'fortify');
        expect(fortify.label).toMatch(/^FORTIFY PERIMETER — \d+ SHELLS$/);
        expect(world.resolveCampChoice('fortify', { campId: camp.id })).toBe(true);
        expect(world.supportCamp).toHaveBeenCalledWith(camp);

        const fortified = campStub(2);
        expect(fortified.world.buildCampChoiceOptions(fortified.camp).some((option) => option.action === 'fortify')).toBe(false);
        expect(fortified.world.resolveCampChoice('fortify', { campId: 'camp_meridian' })).toBe(false);
        expect(fortified.world.supportCamp).not.toHaveBeenCalled();
    });
});

describe('bonded hive bio-conduit', () => {
    it('opens a conduit in the escape room that carries the carrier home', () => {
        campaignWorldStore.getOrCreate({ seed: 31 });
        const world = game({
            hives: [{ id: 'hive_suture', pos: { x: 0, z: 0 } }, { id: 'hive_relay', pos: { x: 0, z: 0 } }],
            getHiveRecord: (id) => ({ status: id === 'hive_suture' ? 'bonded' : 'slain' }),
            isGameplayInputActive: () => true,
            getSpawnTile: () => ({ x: 24, y: 24 }),
            canOccupyPosition: (x, z) => x >= 24 && z >= 24,
            isPlayerOverAnyHole: () => false,
            spawnPhysicalBurst: vi.fn(),
            syncVisibleChunks: vi.fn(),
            emitDepthTierChanged: vi.fn()
        });
        world.beginCampaignExpedition();
        world.syncWorldTransformations();
        expect([...world.bioConduits.keys()]).toEqual(['hive_suture']);
        const escape = world.getTerritoryRoomCenter('hive_suture', 'escape');
        expect(world.bioConduits.get('hive_suture').position.x).toBe(escape.x);
        world.syncWorldTransformations();
        expect(world.scene.children.filter((child) => child.userData?.kind === 'bio-conduit')).toHaveLength(1);

        world.player = { position: new THREE.Vector3(escape.x + 40, 0, escape.z) };
        expect(world.interactWithBioConduit()).toBe(false);
        world.player.position.x = escape.x + 0.5;
        expect(world.interactWithBioConduit()).toBe(true);
        expect(world.player.position).toEqual(new THREE.Vector3(24, 0, 24));
        expect(world.syncVisibleChunks).toHaveBeenCalledExactlyOnceWith(true);
        expect(world.emitDepthTierChanged).toHaveBeenCalledWith(0);
        expect(events.some((event) => event.type === 'bio-conduit-traversed' && event.detail.hiveId === 'hive_suture')).toBe(true);
        world.clearBioConduits();
        expect(world.scene.children).toHaveLength(0);
    });

    it('removes a bonded hive\'s passage and movement benefit when the actual harvest choice replaces the bond', () => {
        campaignWorldStore.getOrCreate({ seed: 31 });
        const scene = new THREE.Scene();
        const act2 = new Act2Manager({ storage: { getItem: () => null, setItem: () => {} } });
        const hive = new HiveSite(scene, { id: 'hive_suture' });
        hive.reveal(40, 50);
        const world = game({
            scene, act2, hives: [hive],
            getHiveById: (id) => id === hive.id ? hive : null,
            getHiveRecord: (id) => act2.getState().hives.find((entry) => entry.id === id),
            bank: { getState: () => ({ unlocks: {} }), deposit: vi.fn(), addShells: vi.fn() },
            spawnGearPoofEffect: vi.fn(), spawnHiveHarvestBoss: vi.fn()
        });
        world.beginCampaignExpedition();
        act2.adjustHiveBond(hive.id, 3);
        world.syncWorldTransformations();
        const conduit = world.bioConduits.get(hive.id);
        const dispose = vi.spyOn(conduit.children[0].geometry, 'dispose');
        expect(world._bondedHiveSpeedMultiplier).toBeCloseTo(1.06);

        expect(world.resolveHiveChoice('hive-harvest', { hiveId: hive.id })).toBe(true);
        expect(world.bioConduits.has(hive.id)).toBe(false);
        expect(conduit.parent).toBeNull();
        expect(dispose).toHaveBeenCalledTimes(1);
        expect(world.getBioConduitAt(conduit.position.x, conduit.position.z)).toBeNull();
        expect(world._bondedHiveSpeedMultiplier).toBe(1);
        expect(world._harvestedHivePositions).toEqual([{ x: 40, z: 50 }]);
        expect(hive.worldOutcome).toBe('harvested');
        world.syncWorldTransformations();
        expect(world.bioConduits.size).toBe(0);
    });

    it('rejects a conduit landing when the safe-spawn search finds only void', () => {
        const world = game({
            player: { position: new THREE.Vector3(1, 0, 1) },
            isGameplayInputActive: () => true,
            getSpawnTile: () => ({ x: 24, y: 24 }),
            canOccupyPosition: () => false,
            isPlayerOverAnyHole: () => true,
            syncVisibleChunks: vi.fn()
        });
        const conduit = new THREE.Group();
        conduit.position.set(1, 0, 1);
        world.bioConduits = new Map([['hive_suture', conduit]]);
        expect(world.interactWithBioConduit()).toBe(false);
        expect(world.player.position).toEqual(new THREE.Vector3(1, 0, 1));
        expect(world.syncVisibleChunks).not.toHaveBeenCalled();
        expect(events.some((event) => event.type === 'bio-conduit-traversed')).toBe(false);
    });
});

describe('compound location title cards', () => {
    it('announces each room change once and flags first visits', () => {
        const world = game();
        const room = (beat) => ({ siteId: 'camp_meridian', territoryBeatKey: beat });
        expect(world.announceTerritoryLocation(room('approach'))).toBe(true);
        expect(world.announceTerritoryLocation(room('approach'))).toBe(false);
        expect(world.announceTerritoryLocation(room('perimeter'))).toBe(true);
        expect(world.announceTerritoryLocation(room('approach'))).toBe(true);
        expect(world.announceTerritoryLocation({ siteId: null })).toBe(false);
        const cards = events.filter((event) => event.type === 'location-discovered').map((event) => event.detail);
        expect(cards.map((card) => [card.beatKey, card.firstVisit])).toEqual([
            ['approach', true], ['perimeter', true], ['approach', false]
        ]);
        expect(cards[1]).toMatchObject({ siteLabel: 'Meridian', beatLabel: 'Defensive perimeter', family: 'camp' });
    });

    it('stamps every compound room with the identity and bounds the banner reads', () => {
        const plan = buildWorldPlan(generateRadialMazeExpedition(44));
        for (const reservation of plan.reservations.filter((entry) => entry.territoryBeatKey && !entry.conditional)) {
            const result = resolveAuthoredChunkStructure(() => 0.5, plan, { chunkX: reservation.chunkX, chunkY: reservation.chunkY });
            const [room] = result.structure.rooms;
            expect(room).toMatchObject({ siteId: reservation.siteId, territoryBeatKey: reservation.territoryBeatKey });
            const { left, right, top, bottom } = room.bounds;
            expect(right - left, reservation.id).toBeGreaterThan(0);
            expect(bottom - top, reservation.id).toBeGreaterThan(0);
            const center = result.structure.anchors.find((anchor) => anchor.id === 'territory_center');
            expect(center.x >= left && center.x <= right && center.y >= top && center.y <= bottom).toBe(true);
        }
    });
});
