import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { t } from './i18n.js';
import { planDeploymentEvent } from './expeditionEvents.js';
import { buildWorldPlan } from './ringManifest.js';
import { generateRadialMazeExpedition } from './mazeExpedition.js';
import { clearSliceContract, registerSliceContract } from './sliceContracts.js';

let dispatched;
let listeners;
let registry;
beforeEach(() => {
    dispatched = [];
    listeners = new Map();
    registry = { trackObjective: vi.fn(), resolveObjective: vi.fn(), getHistory: () => [] };
    vi.stubGlobal('window', {
        objectiveRegistry: registry,
        addEventListener: (type, fn) => listeners.set(type, [...(listeners.get(type) ?? []), fn]),
        dispatchEvent: (event) => {
            dispatched.push({ type: event.type, detail: event.detail });
            for (const fn of listeners.get(event.type) ?? []) fn(event);
            return true;
        }
    });
});
afterEach(() => {
    vi.unstubAllGlobals();
    clearSliceContract('grantRunDrop');
    clearSliceContract('spawnEncounterRecipe');
});

const METHODS = ['setActiveExpedition', 'syncExpeditionBountyTracker', 'armExpeditionEvent', 'disposeExpeditionEvent',
    'listenForExpeditionReportItems', 'getExpeditionEventSitePosition', 'updateExpeditionEvent', 'syncExpeditionEventRoute',
    'openExpeditionEventChoice', 'respondToExpeditionEvent', 'applyExpeditionEventAction', 'runExpeditionEventEffect',
    'onExpeditionEventEncounterCleared', 'getExpeditionReportData'];

const worldPlan = buildWorldPlan(generateRadialMazeExpedition(7));

function game({ multiplayer = false } = {}) {
    const g = {
        performanceProfile: 'gameplay',
        chunkSize: 49,
        player: { position: { x: 9, z: 12 } },
        isMultiplayer: multiplayer,
        netSocket: multiplayer ? {} : null,
        isMultiplayerHost: false,
        authoredWorldTiles: true,
        worldPlan,
        ensureAuthoredWorldPlan() { return this.worldPlan; },
        isSnailTileWalkable: () => true,
        showBunkerLine: vi.fn(),
        applyExpeditionPlayerEffects: vi.fn()
    };
    for (const method of METHODS) g[method] = ThreeGame.prototype[method];
    return g;
}

function profile(eventId, conditionId, expeditionSeed) {
    return { condition: { id: conditionId }, bounty: { id: 'salvage_run' }, eventId, expeditionSeed, expeditionIndex: 2 };
}

function seedFor(conditionId, truth) {
    for (let seed = 1; seed < 400; seed += 1) {
        if (planDeploymentEvent({ expeditionSeed: seed, conditionId, eventId: 'false_distress', worldPlan }).truth === truth) return seed;
    }
    throw new Error('no seed');
}

const of = (type) => dispatched.filter((entry) => entry.type === type).map((entry) => entry.detail);

function signalAndWalkToSite(g) {
    g.updateExpeditionEvent(0.01);
    g.updateExpeditionEvent(g._expeditionEvent.plan.signalAt);
    const site = g.getExpeditionEventSitePosition();
    g.player.position = { x: site.x, z: site.z };
    g.updateExpeditionEvent(0.01);
    return site;
}

describe('the Ring 1 event in the runtime', () => {
    it('stays quiet until its signal time, then shows an optional route below the ship goal', () => {
        const g = game();
        g.setActiveExpedition(profile('unstable_vault', 'glacial_gale', 11));
        g.updateExpeditionEvent(0.01);
        const { signalAt } = g._expeditionEvent.plan;
        expect(signalAt).toBeGreaterThanOrEqual(60);
        expect(signalAt).toBeLessThanOrEqual(150);
        g.updateExpeditionEvent(signalAt - 1);
        expect(g.showBunkerLine).not.toHaveBeenCalled();
        g.updateExpeditionEvent(1);
        expect(g.showBunkerLine).toHaveBeenCalledWith(t('ui.events.unstable_vault.signal_clear'));
        expect(t('ui.events.unstable_vault.signal_clear')).toContain('Ring 1');
        const route = of('expedition-event-route').at(-1);
        expect(route.stage).toBe('signalled');
        const tracked = registry.trackObjective.mock.calls.at(-1)[0];
        expect(tracked).toMatchObject({ id: 'expedition-event', source: 'expedition-event', priority: 40 });
        // The ship-goal option tracks at 35: the event never displaces it.
        expect(tracked.priority).toBeGreaterThan(35);
    });

    it('offers the responses at the site; closing it waits until the operator steps away and back', () => {
        const g = game();
        g.setActiveExpedition(profile('false_distress', 'spore_bloom', seedFor('spore_bloom', 'contaminated')));
        signalAndWalkToSite(g);
        const choice = of('expedition-event-choice').at(-1);
        expect(choice.responses.map((r) => r.action)).toEqual(['scan', 'open', 'leave']);
        g.respondToExpeditionEvent(null);
        g.updateExpeditionEvent(0.01);
        expect(of('expedition-event-choice')).toHaveLength(1);
        g.player.position = { x: -500, z: -500 };
        g.updateExpeditionEvent(0.01);
        signalAndWalkToSite(g);
        expect(of('expedition-event-choice')).toHaveLength(2);
    });

    it('a scan tells the truth before committing, and leaving is reported, not rewarded', () => {
        const g = game();
        g.setActiveExpedition(profile('false_distress', 'spore_bloom', seedFor('spore_bloom', 'contaminated')));
        signalAndWalkToSite(g);
        g.respondToExpeditionEvent('scan');
        const rescan = of('expedition-event-choice').at(-1);
        expect(rescan.lineKey).toBe('ui.events.false_distress.scan_contaminated');
        expect(rescan.responses.find((r) => r.action === 'scan').disabled).toBe(true);
        g.respondToExpeditionEvent('leave');
        expect(g._expeditionEvent.state.outcome).toBe('left');
        expect(registry.resolveObjective).toHaveBeenCalledWith('expedition-event', 'abandoned');
        expect(g.getExpeditionReportData().items).toEqual([
            { kind: 'event', labelKey: 'ui.events.false_distress.report_left', params: {} }
        ]);
    });

    it('rewards only through grantRunDrop, and says so plainly when no lane can grant', () => {
        const g = game();
        g.setActiveExpedition(profile('false_distress', 'glacial_gale', seedFor('glacial_gale', 'survivor')));
        signalAndWalkToSite(g);
        g.respondToExpeditionEvent('open');
        expect(g._expeditionEvent.grants).toEqual([{ dropId: g._expeditionEvent.plan.rewardDrop, available: false, delivered: false }]);
        expect(of('slice-contract-missing')).toEqual([{ name: 'grantRunDrop' }]);
        expect(g.getExpeditionReportData().items.map((item) => item.labelKey)).toEqual([
            'ui.events.report_reward_lost', 'ui.events.false_distress.report_rescued'
        ]);

        const granted = [];
        registerSliceContract('grantRunDrop', (target, dropId) => { granted.push(dropId); return true; });
        const h = game();
        h.setActiveExpedition(profile('false_distress', 'glacial_gale', seedFor('glacial_gale', 'survivor')));
        signalAndWalkToSite(h);
        h.respondToExpeditionEvent('open');
        expect(granted).toEqual([h._expeditionEvent.plan.rewardDrop]);
        expect(h.getExpeditionReportData().items[0]).toMatchObject({ kind: 'discovery', labelKey: 'ui.events.report_reward' });
        expect(registry.resolveObjective).toHaveBeenCalledWith('expedition-event', 'complete');
    });

    it('fights only through spawnEncounterRecipe; an unavailable fight leaves the bait empty', () => {
        const g = game();
        g.setActiveExpedition(profile('false_distress', 'spore_bloom', seedFor('spore_bloom', 'contaminated')));
        signalAndWalkToSite(g);
        g.respondToExpeditionEvent('open');
        expect(of('slice-contract-missing')).toEqual([{ name: 'spawnEncounterRecipe' }]);
        expect(g._expeditionEvent.state.outcome).toBe('ambush_empty');

        const spawned = [];
        const members = new Map([['a', { sprite: { userData: { burstTriggered: true } } }]]);
        registerSliceContract('spawnEncounterRecipe', (target, recipeId, origin) => {
            spawned.push({ recipeId, origin });
            return { encounterId: 'enc-1', members };
        });
        registerSliceContract('grantRunDrop', () => true);
        const h = game();
        h.setActiveExpedition(profile('false_distress', 'spore_bloom', seedFor('spore_bloom', 'contaminated')));
        const site = signalAndWalkToSite(h);
        h.respondToExpeditionEvent('open');
        expect(spawned).toEqual([{ recipeId: 'bloom_push', origin: site }]);
        expect(h._expeditionEvent.state.phase).toBe('engaged');
        expect(of('expedition-event-route').at(-1).stage).toBe('engaged');
        window.dispatchEvent(new CustomEvent('encounter-cleared', { detail: { encounterId: 'other' } }));
        expect(h._expeditionEvent.state.phase).toBe('engaged');
        window.dispatchEvent(new CustomEvent('encounter-cleared', { detail: { encounterId: 'enc-1' } }));
        expect(h._expeditionEvent.state.outcome).toBe('ambush_survived');
    });

    it('a fight that unloads behind the operator is not a win', () => {
        registerSliceContract('spawnEncounterRecipe', () => ({ encounterId: 'enc-2', members: new Map([['a', { sprite: { userData: {} } }]]) }));
        const g = game();
        g.setActiveExpedition(profile('unstable_vault', 'glacial_gale', 11));
        signalAndWalkToSite(g);
        g.respondToExpeditionEvent('breach');
        window.dispatchEvent(new CustomEvent('encounter-cleared', { detail: { encounterId: 'enc-2' } }));
        expect(g._expeditionEvent.state.outcome).toBe('left');
    });

    it('the bypass drains oxygen only while the operator stays on it', () => {
        const g = game();
        g.setActiveExpedition(profile('unstable_vault', 'subzero_stillness', 11));
        const site = signalAndWalkToSite(g);
        g.respondToExpeditionEvent('bypass');
        const { bypassO2Drain, bypassSeconds } = g._expeditionEvent.plan;
        expect(g._expeditionEventO2DrainMult).toBe(bypassO2Drain);
        g.updateExpeditionEvent(5);
        expect(g._expeditionEvent.state.bypassProgress).toBe(5);
        g.player.position = { x: site.x + 30, z: site.z };
        g.updateExpeditionEvent(5);
        expect(g._expeditionEventO2DrainMult).toBe(1);
        expect(g._expeditionEvent.state.bypassProgress).toBe(5);
        g.player.position = { x: site.x, z: site.z };
        g.updateExpeditionEvent(bypassSeconds);
        expect(g._expeditionEvent.state.outcome).toBe('bypassed');
        expect(g._expeditionEventO2DrainMult).toBe(1);
    });

    it('does not run in co-op, and a new deployment clears the old route', () => {
        const coop = game({ multiplayer: true });
        coop.setActiveExpedition(profile('unstable_vault', 'glacial_gale', 11));
        expect(coop._expeditionEvent).toBeNull();

        const g = game();
        g.setActiveExpedition(profile('unstable_vault', 'glacial_gale', 11));
        signalAndWalkToSite(g);
        g.setActiveExpedition(profile('false_distress', 'glacial_gale', 12));
        expect(registry.resolveObjective).toHaveBeenCalledWith('expedition-event', 'abandoned');
        expect(of('expedition-event-route').at(-1)).toEqual({ hidden: true });
        expect(of('expedition-event-choice').at(-1)).toEqual({ hidden: true });
        expect(g._expeditionEvent.plan).toBeNull();
    });
});
