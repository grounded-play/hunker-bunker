import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { campaignWorldStore } from './campaignWorld.js';
import { createAccessState } from './accessControl.js';
import { createMilestoneBossLifecycleState, MILESTONE_BOSS_EVENT_TYPES } from './milestoneBossLifecycle.js';

function game() {
    const world = {
        chunkSize: 49,
        globalSeedOffset: 0,
        authoredWorldTiles: true,
        bank: { getState: () => ({ unlocks: { o2Bubble: true } }) },
        mazeAccessState: createAccessState(),
        proceduralDoorStates: new Map(),
        completedRingCrossingMissionIds: new Set(),
        defeatedMilestoneBosses: new Set(),
        milestoneBossLifecycleState: createMilestoneBossLifecycleState({ builtGoalKeys: ['o2Bubble'] }),
        destroyedWallKeys: new Set(),
        destroyedExteriorWallKeys: new Set(),
        discoveredMapChunkKeys: new Set(['0,0']),
        discoveredMapRoomKeys: new Set(),
        discoveredMapCellKeys: new Set()
    };
    for (const method of ['beginCampaignExpedition', 'persistCampaignWorld', 'getMazePersistenceState',
        'restoreMazePersistenceState', 'getRadialMazePlan', 'getRadialLayoutSignature',
        'ensureAuthoredWorldPlan', 'getBuiltGoalKeys', 'completeRingCrossingMission',
        'reconcileAuthoredWorldProgression', 'applyMilestoneBossRuntimeEvent', 'getAuthoredSitePosition',
        'chooseRadialSitePosition', 'isSiteOnPlannedRing', 'setActiveExpedition', 'getExpeditionEffects',
        'applyExpeditionPlayerEffects']) world[method] = ThreeGame.prototype[method];
    return world;
}

afterEach(() => { vi.restoreAllMocks(); campaignWorldStore.reset(); });

describe('live campaign world integration', () => {
    it('keeps geography on retries and reloads while changing expedition challenges', () => {
        campaignWorldStore.reset();
        campaignWorldStore.getOrCreate({ seed: 8128 });
        const first = game();
        const initial = first.beginCampaignExpedition();
        const signature = first.getRadialLayoutSignature(first.getRadialMazePlan());
        first._previousRadialLayoutSignature = signature;
        first.radialMazePlan = null;
        const retry = first.beginCampaignExpedition();
        expect(retry.seed).toBe(initial.seed);
        expect(retry.expeditionSeed).not.toBe(initial.expeditionSeed);
        expect(first.getRadialLayoutSignature(first.getRadialMazePlan())).toBe(signature);
        const reloaded = game();
        reloaded.beginCampaignExpedition();
        expect(reloaded.getRadialLayoutSignature(reloaded.getRadialMazePlan())).toBe(signature);
    });

    it('restores an opened physical crossing, boss defeat, damage and explored map together', () => {
        campaignWorldStore.reset();
        campaignWorldStore.getOrCreate({ seed: 917 });
        const first = game();
        first.beginCampaignExpedition();
        first._campaignProgressRestored = true;
        const plan = first.ensureAuthoredWorldPlan();
        const crossing = plan.ringCrossings[0];
        first.proceduralDoorStates.set('threshold', { id: 'threshold', ringCrossingId: crossing.id, state: 'locked' });
        first.applyMilestoneBossRuntimeEvent({ type: MILESTONE_BOSS_EVENT_TYPES.STAGE, milestoneId: crossing.requirements.milestoneId });
        // ENEMY_KILLED is the transition that marks a milestone boss dead
        // (ACTIVE -> DEFEATED). There is no BOSS_DEFEATED event type, so
        // dispatching one fell through to `default:` and the crossing never
        // learned the boss was gone -- leaving the gate locked forever.
        first.applyMilestoneBossRuntimeEvent({ type: MILESTONE_BOSS_EVENT_TYPES.ENEMY_KILLED, milestoneId: crossing.requirements.milestoneId });
        expect(first.completeRingCrossingMission(crossing.requirements.missionId)).toBe(true);
        expect(first.proceduralDoorStates.get('threshold').state).toBe('open');
        first.destroyedWallKeys.add('70,25');
        first.discoveredMapChunkKeys.add('1,0');
        expect(first.persistCampaignWorld()).toBe(true);

        const second = game();
        const saved = second.beginCampaignExpedition();
        expect(second.restoreMazePersistenceState(saved.mazeState)).toBe(true);
        expect(second.ringCrossingState.crossings[crossing.id].status).toBe('open');
        expect(second.proceduralDoorStates.get('threshold').state).toBe('open');
        expect(second.defeatedMilestoneBosses.has('o2Bubble')).toBe(true);
        expect(second.destroyedWallKeys.has('70,25')).toBe(true);
        expect(second.discoveredMapChunkKeys.has('1,0')).toBe(true);
        expect(second.completeRingCrossingMission(crossing.requirements.missionId)).toBe(false);
    });

    it('does not overwrite saved progress before it has been restored', () => {
        campaignWorldStore.reset();
        const world = game();
        const state = world.beginCampaignExpedition();
        campaignWorldStore.saveMazeState(state.seed, { generationVersion: 2, marker: 'saved' });
        expect(world.persistCampaignWorld()).toBe(false);
        expect(campaignWorldStore.getState().mazeState.marker).toBe('saved');
    });

    it('saves before menu teardown and does not overwrite progress or count a showroom reset', () => {
        campaignWorldStore.reset();
        const world = game();
        world.beginCampaignExpedition();
        world._campaignProgressRestored = true;
        world.mazeAccessState.completedObjectives.add('restored-power');
        world.chunkMeshes = new Map();
        world.chunkCache = new Map();
        world.pendingChunkMountKeys = new Set();
        ThreeGame.prototype.clearLoadedChunksForRunReset.call(world);
        world.performanceProfile = 'menu';
        expect(world.beginCampaignExpedition()).toBeNull();
        expect(world.persistCampaignWorld()).toBe(false);
        expect(campaignWorldStore.getState().expeditionIndex).toBe(1);
        world.performanceProfile = 'gameplay';
        const resumed = world.beginCampaignExpedition();
        expect(resumed.mazeState.access.completedObjectives).toContain('restored-power');
    });

    it('opens a crossing from a recorded boss defeat even when the lifecycle state lacks it', () => {
        campaignWorldStore.reset();
        campaignWorldStore.getOrCreate({ seed: 917 });
        const world = game();
        world.beginCampaignExpedition();
        const plan = world.ensureAuthoredWorldPlan();
        const crossing = plan.ringCrossings[0];
        world.proceduralDoorStates.set('threshold', { id: 'threshold', ringCrossingId: crossing.id, state: 'locked' });
        // An older save: the defeat is recorded by goal key only.
        world.defeatedMilestoneBosses.add('o2Bubble');
        expect(world.completeRingCrossingMission(crossing.requirements.missionId)).toBe(true);
        expect(world.ringCrossingState.crossings[crossing.id].status).toBe('open');
        expect(world.proceduralDoorStates.get('threshold').state).toBe('open');
    });

    it('isolates fixed daily and multiplayer worlds from campaign progress', () => {
        campaignWorldStore.reset();
        const saved = campaignWorldStore.getOrCreate({ seed: 12 });
        for (const mode of [{ fixedRunEntropy: true }, { isMultiplayer: true }]) {
            const world = Object.assign(game(), mode, { _campaignWorldSeed: 12, _campaignProgressRestored: true, runEntropy: 12 });
            expect(world.beginCampaignExpedition()).toBeNull();
            expect(world.persistCampaignWorld()).toBe(false);
        }
        expect(campaignWorldStore.getState()).toEqual(saved);
    });

    it('ignores delayed saves from the previous campaign and changes the new layout', () => {
        campaignWorldStore.reset();
        campaignWorldStore.getOrCreate({ seed: 12 });
        const world = game();
        world.beginCampaignExpedition();
        world._campaignProgressRestored = true;
        const before = world.getRadialLayoutSignature(world.getRadialMazePlan());
        campaignWorldStore.reset();
        campaignWorldStore.getOrCreate({ seed: 13 });
        expect(world.persistCampaignWorld()).toBe(false);
        const next = game();
        next.beginCampaignExpedition();
        expect(next.getRadialLayoutSignature(next.getRadialMazePlan())).not.toBe(before);
    });

    it('places live camp and hive entities in their authored heart rooms', () => {
        campaignWorldStore.reset();
        const world = game();
        world.beginCampaignExpedition();
        const plan = world.ensureAuthoredWorldPlan();
        for (const heart of plan.reservations.filter((entry) => ['campTerritory', 'hiveTerritory'].includes(entry.role))) {
            const position = world.chooseRadialSitePosition(heart.siteId, 999);
            expect(position).toEqual({ x: heart.chunkX * 49 + 24, z: heart.chunkY * 49 + 24 });
            expect(world.isSiteOnPlannedRing(position.x, position.z, heart.siteId)).toBe(true);
            expect(world.isSiteOnPlannedRing(position.x + 5, position.z, heart.siteId)).toBe(false);
        }
    });
});
