import { describe, expect, it, vi } from 'vitest';
import {
    CAMPAIGN_WORLD_STORAGE_KEY,
    createCampaignWorldStore,
    deriveExpeditionSeed
} from './campaignWorld.js';
import { generateRadialMazeExpedition, LEGACY_ROUTE_LAYOUT_VERSION, ROUTE_LAYOUT_VERSION } from './mazeExpedition.js';
import { createExpeditionProfile } from './expeditionSystem.js';
import { exportSaveCode, importSaveCode, resetActiveAttempt, startNewCampaign } from './profile.js';

function makeStorage() {
    const data = new Map();
    return {
        get length() { return data.size; },
        key: (index) => [...data.keys()][index] ?? null,
        getItem: (key) => data.get(key) ?? null,
        setItem: (key, value) => data.set(key, String(value)),
        removeItem: (key) => data.delete(key)
    };
}

function completedRoute() {
    return {
        generationVersion: 2,
        access: { flags: ['cargo_lift_online'] },
        doors: { 'ring-1-door': { state: 'open' } },
        milestoneBosses: { version: 1, milestones: { first: { status: 'defeated' } } },
        ringCrossings: { version: 1, crossings: { 'ring-1-gate': { status: 'open' } } },
        authoredWorld: { enabled: true, seed: 8128, version: 1, completedMissionIds: ['restore_power'] }
    };
}

describe('campaign world continuity', () => {
    it('creates new campaigns on the current route generation and keeps old saves on theirs', () => {
        const storage = makeStorage();
        const store = createCampaignWorldStore({ storage, createSeed: () => 4040 });
        expect(store.getOrCreate().layoutVersion).toBe(ROUTE_LAYOUT_VERSION);
        expect(store.beginExpedition().layoutVersion).toBe(ROUTE_LAYOUT_VERSION);

        const legacy = makeStorage();
        legacy.setItem(CAMPAIGN_WORLD_STORAGE_KEY, JSON.stringify({ version: 1, seed: 77, expeditionIndex: 3, mazeState: null }));
        const resumed = createCampaignWorldStore({ storage: legacy });
        expect(resumed.getState().layoutVersion).toBe(LEGACY_ROUTE_LAYOUT_VERSION);
        expect(resumed.beginExpedition().layoutVersion).toBe(LEGACY_ROUTE_LAYOUT_VERSION);
        expect(JSON.parse(legacy.getItem(CAMPAIGN_WORLD_STORAGE_KEY)).layoutVersion).toBe(LEGACY_ROUTE_LAYOUT_VERSION);
    });

    it('preserves terrain through deployment, active-attempt reset, and a fresh session', () => {
        const storage = makeStorage();
        const first = createCampaignWorldStore({ storage, createSeed: () => 8128 });
        const original = first.getOrCreate();
        const terrain = generateRadialMazeExpedition(original.seed);
        first.beginExpedition();
        resetActiveAttempt(storage);
        first.beginExpedition();

        const nextSession = createCampaignWorldStore({ storage, createSeed: () => 99 });
        expect(nextSession.getOrCreate()).toMatchObject({ seed: 8128, expeditionIndex: 2 });
        expect(generateRadialMazeExpedition(nextSession.getState().seed)).toEqual(terrain);
    });

    it('varies encounter streams by deployment reproducibly without changing campaign identity', () => {
        const store = createCampaignWorldStore({ storage: makeStorage(), createSeed: () => 42 });
        const runs = Array.from({ length: 12 }, () => store.beginExpedition());
        expect(new Set(runs.map((run) => run.expeditionSeed)).size).toBe(12);
        for (const run of runs) {
            expect(run.seed).toBe(42);
            expect(run.expeditionSeed).toBe(deriveExpeditionSeed(42, run.expeditionIndex));
        }
        expect(deriveExpeditionSeed(43, 1)).not.toBe(runs[0].expeditionSeed);
    });

    it('starts a different world only after NEW CAMPAIGN and does not reuse old progression', () => {
        const storage = makeStorage();
        const createSeed = vi.fn().mockReturnValueOnce(8128).mockReturnValueOnce(99);
        const store = createCampaignWorldStore({ storage, createSeed });
        const original = store.getOrCreate();
        store.saveMazeState(original.seed, completedRoute());
        startNewCampaign(storage);

        expect(store.getState()).toBeNull();
        expect(store.saveMazeState(original.seed, completedRoute())).toBe(false);
        const next = store.getOrCreate();
        expect(next).toMatchObject({ seed: 99, expeditionIndex: 0, mazeState: null });
        expect(generateRadialMazeExpedition(next.seed).topology)
            .not.toEqual(generateRadialMazeExpedition(original.seed).topology);
        expect(store.saveMazeState(original.seed, completedRoute())).toBe(false);
    });

    it('round-trips existing maze progression without sharing mutable references', () => {
        const storage = makeStorage();
        const store = createCampaignWorldStore({ storage });
        store.getOrCreate({ seed: 8128 });
        const progress = completedRoute();
        expect(store.saveMazeState(8128, progress)).toBe(true);
        progress.authoredWorld.completedMissionIds.push('not-earned');
        store.getState().mazeState.doors['ring-1-door'].state = 'closed';
        store.getProgress(8128).authoredWorld.completedMissionIds.length = 0;
        store.beginExpedition();

        const reloaded = createCampaignWorldStore({ storage });
        expect(reloaded.getProgress(8128)).toEqual(completedRoute());
        expect(reloaded.getProgress(99)).toBeNull();
    });

    it('observes save imports in an already-created store and exports campaign identity with progress', () => {
        const sourceStorage = makeStorage();
        const source = createCampaignWorldStore({ storage: sourceStorage });
        source.getOrCreate({ seed: 8128 });
        source.beginExpedition();
        source.saveMazeState(8128, completedRoute());

        const destinationStorage = makeStorage();
        const destination = createCampaignWorldStore({ storage: destinationStorage });
        destination.getOrCreate({ seed: 99 });
        expect(importSaveCode(exportSaveCode(sourceStorage), destinationStorage)).toBe(1);
        expect(destination.getState()).toEqual(source.getState());
        expect(destination.saveMazeState(99, completedRoute())).toBe(false);
    });

    it('does not let an optional seed override an existing campaign', () => {
        const store = createCampaignWorldStore({ storage: makeStorage() });
        expect(store.ensure({ seed: 0 }).seed).toBe(0);
        expect(store.getOrCreate({ seed: 42 }).seed).toBe(0);
    });

    it.each(['{broken', 'null', '[]', '{"version":1,"seed":-1}', '{"version":1,"seed":4294967296}'])(
        'recovers invalid saved identity without adopting its progress: %s', (raw) => {
            const storage = makeStorage();
            storage.setItem(CAMPAIGN_WORLD_STORAGE_KEY, raw);
            const store = createCampaignWorldStore({ storage, createSeed: () => 123 });
            expect(store.getState()).toBeNull();
            expect(store.getOrCreate()).toMatchObject({ seed: 123, expeditionIndex: 0, mazeState: null });
        }
    );

    it('normalizes invalid deployment metadata from a valid campaign', () => {
        const storage = makeStorage();
        storage.setItem(CAMPAIGN_WORLD_STORAGE_KEY, JSON.stringify({
            version: 1, seed: 12, expeditionIndex: -100, expeditionSeed: 123, mazeState: []
        }));
        const state = createCampaignWorldStore({ storage }).getState();
        expect(state).toMatchObject({
            version: 1,
            seed: 12,
            expeditionIndex: 0,
            expeditionSeed: deriveExpeditionSeed(12, 0),
            mazeState: null,
            worldTransformations: {
                bridgesConstructed: [],
                campsFortified: [],
                hivesTransformed: {},
                shortcutsOpened: []
            }
        });
        expect(state.activeExpedition).toBeDefined();
        expect(state.activeExpedition.expeditionIndex).toBe(0);
    });

    it('tracks world transformations persistently across expeditions', () => {
        const storage = makeStorage();
        const store = createCampaignWorldStore({ storage, createSeed: () => 777 });
        store.getOrCreate();

        store.recordWorldTransformation('bridge', 'canyon_chasm_bridge');
        store.recordWorldTransformation('camp_fortified', 'camp_meridian');
        store.recordWorldTransformation('hive_transformed', 'hive_alpha', { choice: 'cleansed', modifier: 'speed_resin' });
        store.recordWorldTransformation('shortcut', 'bunker_conduit_shortcut');

        const transformations = store.getWorldTransformations();
        expect(transformations.bridgesConstructed).toEqual(['canyon_chasm_bridge']);
        expect(transformations.campsFortified).toEqual(['camp_meridian']);
        expect(transformations.hivesTransformed['hive_alpha'].choice).toBe('cleansed');
        expect(transformations.shortcutsOpened).toEqual(['bunker_conduit_shortcut']);

        // Persists across expedition roll
        store.beginExpedition();
        const afterRoll = store.getWorldTransformations();
        expect(afterRoll.bridgesConstructed).toEqual(['canyon_chasm_bridge']);
        expect(afterRoll.campsFortified).toEqual(['camp_meridian']);
    });

    it('repairs a mismatched active expedition while retaining campaign geography and earned progress', () => {
        const storage = makeStorage();
        storage.setItem(CAMPAIGN_WORLD_STORAGE_KEY, JSON.stringify({
            version: 1,
            seed: 8128,
            expeditionIndex: 7,
            layoutVersion: LEGACY_ROUTE_LAYOUT_VERSION,
            activeExpedition: createExpeditionProfile(999, 2),
            mazeState: completedRoute()
        }));
        const state = createCampaignWorldStore({ storage }).getState();
        expect(state.activeExpedition).toEqual(createExpeditionProfile(8128, 7));
        expect(state).toMatchObject({ layoutVersion: LEGACY_ROUTE_LAYOUT_VERSION, mazeState: completedRoute() });
    });

    it('normalizes malformed transformation lists without dropping valid world changes', () => {
        const storage = makeStorage();
        storage.setItem(CAMPAIGN_WORLD_STORAGE_KEY, JSON.stringify({
            version: 1, seed: 8128, expeditionIndex: 1,
            worldTransformations: {
                bridgesConstructed: ['ring-1-gate', null, '', 8, 'ring-1-gate'],
                campsFortified: ['camp_meridian', {}],
                hivesTransformed: { hive_suture: { outcome: 'bonded' }, hive_relay: ['broken'] },
                shortcutsOpened: 'shortcut'
            }
        }));
        expect(createCampaignWorldStore({ storage }).getWorldTransformations()).toEqual({
            bridgesConstructed: ['ring-1-gate'], campsFortified: ['camp_meridian'],
            hivesTransformed: { hive_suture: { outcome: 'bonded' } }, shortcutsOpened: []
        });
    });

    it('does not create a campaign for delayed world changes and records repeated outcomes once', () => {
        const storage = makeStorage();
        const store = createCampaignWorldStore({ storage });
        expect(store.recordWorldTransformation('bridge', 'ring-1-gate')).toBeNull();
        expect(store.getState()).toBeNull();
        store.getOrCreate({ seed: 0 });
        store.recordWorldTransformation('bridge', 'ring-1-gate');
        store.recordWorldTransformation('hive_transformed', 'hive_suture', { outcome: 'bonded' });
        const saved = storage.getItem(CAMPAIGN_WORLD_STORAGE_KEY);
        store.recordWorldTransformation('bridge', 'ring-1-gate');
        store.recordWorldTransformation('hive_transformed', 'hive_suture', { outcome: 'bonded' });
        const circular = {};
        circular.self = circular;
        expect(store.recordWorldTransformation('hive_transformed', 'hive_suture', circular)).toBeNull();
        expect(store.recordWorldTransformation('__proto__', 'invalid')).toBeNull();
        expect(store.recordWorldTransformation('hive_transformed', '__proto__', {})).toBeNull();
        expect(storage.getItem(CAMPAIGN_WORLD_STORAGE_KEY)).toBe(saved);
        store.reset();
        expect(store.recordWorldTransformation('bridge', 'ring-2-gate')).toBeNull();
        expect(store.getState()).toBeNull();
    });

    it('rejects nonserializable snapshots and leaves earned progress intact', () => {
        const store = createCampaignWorldStore({ storage: makeStorage() });
        store.getOrCreate({ seed: 8128 });
        store.saveProgress(8128, completedRoute());
        const circular = {};
        circular.self = circular;
        expect(store.saveMazeState(8128, circular)).toBe(false);
        expect(store.saveMazeState(8128, [])).toBe(false);
        expect(store.saveMazeState(8128, undefined)).toBe(false);
        expect(store.getProgress(8128)).toEqual(completedRoute());
    });

    it('keeps a playable session coherent when storage fails and follows later imports', () => {
        const storage = makeStorage();
        const store = createCampaignWorldStore({ storage, createSeed: () => 42 });
        store.getOrCreate();
        const write = storage.setItem;
        storage.setItem = () => { throw new Error('quota exceeded'); };
        store.beginExpedition();
        store.saveMazeState(42, completedRoute());
        expect(store.beginExpedition()).toMatchObject({ seed: 42, expeditionIndex: 2, mazeState: completedRoute() });

        storage.setItem = write;
        storage.setItem(CAMPAIGN_WORLD_STORAGE_KEY, JSON.stringify({ version: 1, seed: 99, expeditionIndex: 5 }));
        expect(store.getState()).toMatchObject({ seed: 99, expeditionIndex: 5, mazeState: null });
    });

    it('keeps identity and progress in memory if storage access is denied', () => {
        const fail = () => { throw new Error('access denied'); };
        const store = createCampaignWorldStore({
            storage: { getItem: fail, setItem: fail, removeItem: fail }, createSeed: () => 42
        });
        expect(store.beginExpedition().seed).toBe(42);
        store.saveMazeState(42, completedRoute());
        expect(store.beginExpedition()).toMatchObject({ expeditionIndex: 2, mazeState: completedRoute() });
        store.reset();
        expect(store.getState()).toBeNull();
    });
});
