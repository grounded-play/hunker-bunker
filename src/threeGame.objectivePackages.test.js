import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { buildWorldPlan } from './ringManifest.js';
import { generateRadialMazeExpedition, ROUTE_LAYOUT_VERSION } from './mazeExpedition.js';
import { GOAL_COSTS } from './bank.js';
import { planGateChallenges } from './gateChallenges.js';
import { OBJECTIVE_PACKAGES, PACKAGE_GOAL_ORDER, selectObjectivePackageId } from './objectivePackages.js';

let events;
beforeEach(() => {
    events = [];
    vi.stubGlobal('window', {
        dispatchEvent: (event) => { events.push({ type: event.type, detail: event.detail }); return true; },
        objectiveRegistry: { trackObjective: vi.fn(), resolveObjective: vi.fn() }
    });
});
afterEach(() => vi.unstubAllGlobals());

const METHODS = ['getObjectivePackageState', 'getCurrentPackageGoal', 'getPendingPackageStep', 'getPackageSitePosition',
    'updateObjectivePackage', 'setPackagePrompt', 'interactWithObjectivePackage', 'negotiatePackageDeal', 'negotiateO2Supply',
    'advanceObjectivePackage', 'applyObjectivePackageConsequence', 'getThinAirMultiplier', 'getPackageGateEffect',
    'isRerouteBlackoutChunk', 'isPackageInfestedChunk', 'getGoalBuildCost', 'getMazePersistenceState',
    'getAuthoredSitePosition', 'getTerritoryRoomCenter', 'getCampCondition', 'applyCampOvernightConditions'];

// A world whose plan rolls `packageId` for its goal, with every earlier goal built.
function world(packageId) {
    const { goalKey } = OBJECTIVE_PACKAGES[packageId];
    let seed = 1;
    const planFor = (s) => buildWorldPlan(generateRadialMazeExpedition(s, { layoutVersion: ROUTE_LAYOUT_VERSION }));
    while (selectObjectivePackageId(planFor(seed).seed, goalKey) !== packageId) seed += 1;
    const worldPlan = planFor(seed);
    const unlocks = Object.fromEntries(PACKAGE_GOAL_ORDER.slice(0, PACKAGE_GOAL_ORDER.indexOf(goalKey)).map((key) => [key, true]));
    const shells = { value: 100 };
    const w = {
        chunkSize: 49,
        performanceProfile: 'gameplay',
        worldPlan,
        authoredWorldTiles: true,
        wfcMetadataCache: new Map(),
        player: { position: { x: 0, z: 0 } },
        camps: ['camp_meridian', 'camp_tallow', 'camp_vesper'].map((id, index) => ({ id, label: id, pos: { x: 60 + index * 40, z: 60 } })),
        hives: [],
        overnightState: { version: 1, camps: {}, hives: {} },
        act2: { adjustCampBond: vi.fn() },
        bank: {
            getState: () => ({ unlocks }),
            getGoalCost: (key) => GOAL_COSTS[key],
            canAffordShells: (n) => shells.value >= n,
            spendShells: (n) => { shells.value -= n; return true; }
        },
        isGameplayInputActive: () => true,
        persistCampaignWorld: vi.fn(),
        persistOvernightState: vi.fn(),
        applyOvernightWorldPresence: vi.fn()
    };
    for (const method of METHODS) w[method] = ThreeGame.prototype[method];
    return { w, goalKey, unlocks, shells };
}

function play(w) {
    let step = w.getPendingPackageStep();
    while (step) {
        if (step.site.kind === 'camp') {
            const camp = w.camps.find((entry) => entry.id === step.site.campId);
            expect(w.negotiatePackageDeal(camp, step), step.id).toBe(true);
        } else {
            const target = w.getPackageSitePosition(step.site);
            expect(target, step.id).toBeTruthy();
            w.player.position.x = target.x + 999;
            expect(w.interactWithObjectivePackage(), `${step.id} from afar`).toBe(false);
            w.player.position.x = target.x;
            w.player.position.z = target.z;
            expect(w.interactWithObjectivePackage(), step.id).toBe(true);
        }
        step = w.getPendingPackageStep();
    }
}

describe('every objective package plays through in the runtime', () => {
    it.each(Object.keys(OBJECTIVE_PACKAGES))('%s: pays out on the console and leaves its consequence', (packageId) => {
        const { w, goalKey } = world(packageId);
        const definition = OBJECTIVE_PACKAGES[packageId];
        expect(w.getCurrentPackageGoal()).toBe(goalKey);
        w.updateObjectivePackage();
        expect(window.objectiveRegistry.trackObjective).toHaveBeenCalledWith(expect.objectContaining({ id: 'goal-package', compass: expect.any(Object) }));
        expect(w.getGoalBuildCost(goalKey)).toEqual(GOAL_COSTS[goalKey]);
        play(w);
        const expected = definition.reward.costMultiplier === 0 ? {}
            : Object.fromEntries(Object.entries(GOAL_COSTS[goalKey]).map(([key, amount]) => [key, Math.ceil(amount / 2)]));
        expect(w.getGoalBuildCost(goalKey)).toEqual(expected);
        expect(events.find((event) => event.type === 'objective-package-complete').detail).toMatchObject({ goalKey, packageId });

        const consequence = definition.consequence;
        if (consequence.kind === 'thin_air_room') {
            const room = w.worldPlan.reservations.find((entry) => entry.id === `goal:${goalKey}:objective`);
            w.player.position.x = (room.chunkX + 0.5) * 49;
            w.player.position.z = (room.chunkY + 0.5) * 49;
            expect(w.getThinAirMultiplier()).toBeGreaterThan(1);
        } else if (consequence.kind === 'gate_blackout' || consequence.kind === 'gate_infested') {
            const approach = planGateChallenges(w.worldPlan).find((entry) => entry.ring === consequence.ring).approachChunkKeys[0];
            const check = consequence.kind === 'gate_blackout' ? w.isRerouteBlackoutChunk(approach) : w.isPackageInfestedChunk(approach);
            expect(check).toBe(true);
            expect(w.isRerouteBlackoutChunk('999,999') || w.isPackageInfestedChunk('999,999')).toBe(false);
        } else if (consequence.kind === 'camp_strained') {
            expect(w.act2.adjustCampBond).toHaveBeenCalledWith(consequence.campId, 1);
            expect(w.overnightState.camps[consequence.campId].condition).toBe('strained');
        } else if (consequence.kind === 'hive_creep') {
            expect(w.overnightState.hives[consequence.hiveId].creepRings).toBe(1);
            expect(w.applyOvernightWorldPresence).toHaveBeenCalled();
        } else {
            throw new Error(`untested consequence ${consequence.kind}`);
        }
        expect(w.persistCampaignWorld).toHaveBeenCalled();
    });

    it('offers only the next unbuilt goal\'s package, and persists progress with the campaign', () => {
        const { w, unlocks } = world('mast_power_reroute');
        expect(w.getPendingPackageStep().id).toBe('tap_gate_power');
        const target = w.getPackageSitePosition(w.getPendingPackageStep().site);
        w.player.position.x = target.x;
        w.player.position.z = target.z;
        w.interactWithObjectivePackage();
        const saved = w.getMazePersistenceState().objectivePackage;
        expect(saved.goals.radarNode.completedSteps).toEqual(['tap_gate_power']);
        const reloaded = world('mast_power_reroute').w;
        reloaded._restoredObjectivePackage = saved;
        expect(reloaded.getPendingPackageStep().id).toBe('align_radar_mast');
        unlocks.radarNode = true;
        expect(w.getCurrentPackageGoal()).toBe('reactorCompressor');
        expect(w.getPendingPackageStep()?.site.key).not.toBe('goal_room:radarNode');
        unlocks.reactorCompressor = true;
        expect(w.getPendingPackageStep()).toBeNull();
    });
});
