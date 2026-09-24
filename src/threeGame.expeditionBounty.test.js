import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { campaignWorldStore } from './campaignWorld.js';

let events;
let registry;
beforeEach(() => {
    events = [];
    registry = { trackObjective: vi.fn(), resolveObjective: vi.fn() };
    vi.stubGlobal('window', {
        dispatchEvent: (event) => { events.push({ type: event.type, detail: event.detail }); return true; },
        objectiveRegistry: registry
    });
});
afterEach(() => {
    vi.unstubAllGlobals();
    campaignWorldStore.reset?.();
});

function game(bountyId) {
    const campaignSeed = 1001;
    const expeditionSeed = 2002;
    const shells = { value: 0 };
    const profile = {
        campaignSeed,
        expeditionSeed,
        condition: { id: 'glacial_gale' },
        bounty: { id: bountyId }
    };
    const stored = {
        seed: campaignSeed,
        expeditionSeed,
        activeExpedition: profile
    };
    campaignWorldStore.getState = () => stored;

    const g = {
        _campaignWorldSeed: campaignSeed,
        runEntropy: campaignSeed,
        performanceProfile: 'gameplay',
        bank: {
            addShells: (n) => { shells.value += n; },
            depositSeasonReward: (amounts, _receiptId) => {
                shells.value += (amounts.shells ?? 0);
                return { ok: true, duplicate: false };
            },
            getState: () => ({ shells: shells.value })
        },
        showBunkerLine: vi.fn(),
        applyExpeditionPlayerEffects: vi.fn()
    };
    for (const method of [
        'setActiveExpedition',
        'isCurrentCampaignBounty',
        'syncExpeditionBountyTracker',
        'recordExpeditionBountyEvent',
        'settleExpeditionBountyOnExtraction'
    ]) g[method] = ThreeGame.prototype[method];
    g.setActiveExpedition(profile);
    return { g, shells };
}

describe('the deployment bounty is tracked and paid in the runtime', () => {
    it('shows live progress on the tracker and pays shells on extraction once', () => {
        const { g, shells } = game('clearing_breach');
        expect(registry.trackObjective).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'expedition-bounty', source: 'expedition-bounty', priority: 60 }));
        expect(registry.trackObjective.mock.calls.at(-1)[0].label).toContain('0/6');
        for (let i = 0; i < 5; i += 1) g.recordExpeditionBountyEvent({ metric: 'wallSmashed' });
        expect(registry.trackObjective.mock.calls.at(-1)[0].label).toContain('5/6');
        expect(shells.value).toBe(0);
        g.recordExpeditionBountyEvent({ metric: 'wallSmashed' });
        expect(g.expeditionBounty.completed).toBe(true);
        expect(g.showBunkerLine).toHaveBeenCalledTimes(1);
        expect(events.filter((event) => event.type === 'expedition-bounty-ready')).toHaveLength(1);
        expect(shells.value).toBe(0);
        expect(g.expeditionBounty.settled).toBe(false);

        // Extraction settles it
        const settled = g.settleExpeditionBountyOnExtraction();
        expect(settled).toBe(true);
        expect(shells.value).toBe(50);
        expect(registry.resolveObjective).toHaveBeenCalledWith('expedition-bounty', 'complete');
        expect(events.filter((event) => event.type === 'expedition-bounty-settled')).toEqual([
            { type: 'expedition-bounty-settled', detail: { bountyId: 'clearing_breach', shells: 50, duplicate: false } }
        ]);
        expect(g.expeditionBounty.paidShells).toBe(50);
        expect(g.expeditionBounty.settled).toBe(true);
    });

    it('ignores bounty events outside gameplay and without a bounty', () => {
        const { g } = game('eliminate_elite');
        g.performanceProfile = 'menu';
        expect(g.recordExpeditionBountyEvent({ metric: 'eliteKill' })).toBe(false);
        g.performanceProfile = 'gameplay';
        expect(g.recordExpeditionBountyEvent({ metric: 'eliteKill' })).toBe(true);
        expect(g.expeditionBounty.completed).toBe(true);
        g.setActiveExpedition(null);
        expect(g.expeditionBounty).toBeNull();
        expect(registry.resolveObjective).toHaveBeenLastCalledWith('expedition-bounty', 'abandoned');
    });
});

describe('the results screen gets this deployment\'s facts', () => {
    it('reports the bounty outcome, only this deployment\'s completions and the next goal', () => {
        const { g } = game('clearing_breach');
        registry.getHistory = () => [
            { id: 'mission:active', label: 'OLD RUN', outcome: 'complete', resolvedAt: g._deploymentStartedAt - 5 },
            { id: 'mission:active', label: 'SURVEY', outcome: 'complete', resolvedAt: g._deploymentStartedAt + 5 },
            { id: 'goal-package', label: 'ABANDONED', outcome: 'abandoned', resolvedAt: g._deploymentStartedAt + 6 },
            { id: 'expedition-bounty', label: 'BOUNTY', outcome: 'complete', resolvedAt: g._deploymentStartedAt + 7 }
        ];
        g.getCurrentPackageGoal = () => 'o2Bubble';
        g.getGoalBuildCost = () => ({ tech: 20, med: 10 });
        g.bank.getState = () => ({ tech: 5, med: 12, coin: 1 });
        g.getExpeditionReportData = ThreeGame.prototype.getExpeditionReportData;
        const data = g.getExpeditionReportData();
        expect(data).toMatchObject({
            conditionNameKey: 'ui.expedition.conditions.glacial_gale.name',
            bounty: { labelKey: 'ui.expedition.bounties.clearing_breach', progress: 0, target: 6, completed: false },
            completed: ['SURVEY'],
            nextGoal: { goalKey: 'o2Bubble', cost: { tech: 20, med: 10 }, bank: { tech: 5, med: 12, coin: 1 } }
        });
    });
});
