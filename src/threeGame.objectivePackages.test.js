import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { buildWorldPlan } from './ringManifest.js';
import { generateRadialMazeExpedition, ROUTE_LAYOUT_VERSION } from './mazeExpedition.js';
import { GOAL_COSTS } from './bank.js';
import { createObjectivePackageState, selectObjectivePackageId } from './objectivePackages.js';

let events;
beforeEach(() => {
    events = [];
    vi.stubGlobal('window', {
        dispatchEvent: (event) => { events.push({ type: event.type, detail: event.detail }); return true; },
        objectiveRegistry: { trackObjective: vi.fn(), resolveObjective: vi.fn() }
    });
});
afterEach(() => vi.unstubAllGlobals());

const METHODS = ['getObjectivePackageState', 'getPendingPackageStep', 'getPackageSitePosition', 'updateObjectivePackage',
    'setPackagePrompt', 'interactWithObjectivePackage', 'negotiateO2Supply', 'advanceObjectivePackage',
    'applyObjectivePackageConsequence', 'getThinAirMultiplier', 'isRerouteBlackoutChunk', 'getGoalBuildCost',
    'getMazePersistenceState', 'getAuthoredSitePosition', 'getCampCondition', 'applyCampOvernightConditions'];

// A world whose plan rolls `packageId`.
function world(packageId) {
    let seed = 1;
    while (selectObjectivePackageId(buildWorldPlan(generateRadialMazeExpedition(seed, { layoutVersion: ROUTE_LAYOUT_VERSION })).seed) !== packageId) seed += 1;
    const worldPlan = buildWorldPlan(generateRadialMazeExpedition(seed, { layoutVersion: ROUTE_LAYOUT_VERSION }));
    const unlocks = {};
    const shells = { value: 50 };
    const w = {
        chunkSize: 49,
        performanceProfile: 'gameplay',
        worldPlan,
        authoredWorldTiles: true,
        wfcMetadataCache: new Map(),
        player: { position: { x: 0, z: 0 } },
        camps: [{ id: 'camp_meridian', label: 'MERIDIAN', pos: { x: 60, z: 60 } }],
        overnightState: { version: 1, camps: {}, hives: {} },
        act2: { adjustCampBond: vi.fn() },
        bank: {
            getState: () => ({ unlocks }),
            getGoalCost: (goalKey) => GOAL_COSTS[goalKey],
            canAffordShells: (n) => shells.value >= n,
            spendShells: (n) => { shells.value -= n; return true; }
        },
        isGameplayInputActive: () => true,
        persistCampaignWorld: vi.fn(),
        persistOvernightState: vi.fn()
    };
    for (const method of METHODS) w[method] = ThreeGame.prototype[method];
    return { w, unlocks, shells };
}

const standAt = (w, site) => {
    const target = w.getPackageSitePosition(site);
    w.player.position.x = target.x;
    w.player.position.z = target.z;
};

describe('objective packages in the runtime', () => {
    it('regulator recovery: halves the console build and leaves the O2 room on thin air', () => {
        const { w } = world('regulator_recovery');
        expect(w.getGoalBuildCost('o2Bubble')).toEqual(GOAL_COSTS.o2Bubble);
        w.updateObjectivePackage();
        expect(window.objectiveRegistry.trackObjective).toHaveBeenCalledWith(expect.objectContaining({ id: 'o2-package', compass: expect.any(Object) }));
        w.player.position.x = 9999;
        expect(w.interactWithObjectivePackage()).toBe(false);
        standAt(w, 'o2_room');
        expect(w.interactWithObjectivePackage()).toBe(true);
        expect(w.getGoalBuildCost('o2Bubble')).toEqual({ tech: 5, med: 3, coin: 3 });
        expect(w.getThinAirMultiplier()).toBeGreaterThan(1);
        expect(events.find((event) => event.type === 'objective-package-complete').detail.consequence).toBe('thin_air_room');
        expect(w.persistCampaignWorld).toHaveBeenCalled();
    });

    it('power reroute: gate console first, then the O2 room; free build and a dark ring-1 approach', () => {
        const { w } = world('power_reroute');
        standAt(w, 'o2_room');
        expect(w.interactWithObjectivePackage()).toBe(false);
        standAt(w, 'ring1_gate_control');
        expect(w.interactWithObjectivePackage()).toBe(true);
        expect(w.getGoalBuildCost('o2Bubble')).toEqual(GOAL_COSTS.o2Bubble);
        standAt(w, 'o2_room');
        expect(w.interactWithObjectivePackage()).toBe(true);
        expect(w.getGoalBuildCost('o2Bubble')).toEqual({});
        const gate = w.worldPlan.ringCrossings.find((entry) => entry.ring === 1);
        expect(w.isRerouteBlackoutChunk(gate.chunkKey)).toBe(true);
        expect(w.isRerouteBlackoutChunk('999,999')).toBe(false);
    });

    it('camp supply: a Meridian deal for shells, bond +1, and Meridian left strained', () => {
        const { w, shells } = world('camp_supply');
        const step = w.getPendingPackageStep('camp_meridian');
        expect(w.negotiateO2Supply(w.camps[0], step)).toBe(true);
        expect(shells.value).toBe(50 - step.shells);
        expect(w.act2.adjustCampBond).toHaveBeenCalledWith('camp_meridian', 1);
        expect(w.overnightState.camps.camp_meridian.condition).toBe('strained');
        expect(w.getGoalBuildCost('o2Bubble')).toEqual({ tech: 5, med: 3, coin: 3 });
        expect(w.negotiateO2Supply(w.camps[0], step)).toBe(false);
    });

    it('persists progress with the campaign and goes quiet once O2 is built', () => {
        const { w, unlocks } = world('power_reroute');
        standAt(w, 'ring1_gate_control');
        w.interactWithObjectivePackage();
        expect(w.getMazePersistenceState().objectivePackage).toMatchObject({ packageId: 'power_reroute', completedSteps: ['reroute_gate_power'] });
        const reloaded = world('power_reroute').w;
        reloaded._restoredObjectivePackage = w.getMazePersistenceState().objectivePackage;
        expect(reloaded.getPendingPackageStep().id).toBe('restart_o2_room');
        unlocks.o2Bubble = true;
        expect(w.getPendingPackageStep()).toBeNull();
        w.updateObjectivePackage();
        expect(window.objectiveRegistry.resolveObjective).not.toHaveBeenCalled();
        expect(createObjectivePackageState(1).completed).toBe(false);
    });
});
