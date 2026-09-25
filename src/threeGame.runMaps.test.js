import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { campaignWorldStore } from './campaignWorld.js';

// Owner's rules (2026-09-24): a run started from the menu plays a new map;
// TRY AGAIN keeps it; the story (campaign seed, expedition count, world
// transformations) carries over; co-op never touches the solo campaign.

beforeEach(() => {
    vi.stubGlobal('window', { dispatchEvent: () => true, CustomEvent });
    campaignWorldStore.reset?.();
});
afterEach(() => {
    campaignWorldStore.reset?.();
    vi.unstubAllGlobals();
});

function game(overrides = {}) {
    const g = {
        performanceProfile: 'gameplay',
        fixedRunEntropy: false,
        isMultiplayer: false,
        setActiveExpedition: vi.fn(),
        persistCampaignWorld: vi.fn(),
        ...overrides
    };
    for (const method of ['beginNewCampaignRun', 'beginCampaignExpedition', 'isCampaignMap']) g[method] = ThreeGame.prototype[method];
    return g;
}

describe('solo maps belong to the run', () => {
    it('a menu start draws a new map; a retry keeps it; the campaign stays the same', () => {
        campaignWorldStore.getOrCreate({ seed: 4242 });
        const g = game();
        g.beginCampaignExpedition();
        expect(g.runEntropy).toBe(4242);
        expect(g.isCampaignMap()).toBe(true);

        g.beginNewCampaignRun();
        g.beginCampaignExpedition();
        const firstRunMap = g.runEntropy;
        expect(firstRunMap).not.toBe(4242);
        expect(g._campaignWorldSeed).toBe(4242);
        expect(g.isCampaignMap()).toBe(true);

        // TRY AGAIN: another expedition, same map.
        g.beginCampaignExpedition();
        expect(g.runEntropy).toBe(firstRunMap);

        // MAIN MENU, then a new run: a new map.
        g.beginNewCampaignRun();
        g.beginCampaignExpedition();
        expect(g.runEntropy).not.toBe(firstRunMap);
        expect(campaignWorldStore.getState().seed).toBe(4242);
    });

    it('co-op and fixed-seed runs never change the solo campaign', () => {
        campaignWorldStore.getOrCreate({ seed: 4242 });
        const before = campaignWorldStore.getState().mapSeed;
        expect(game({ isMultiplayer: true }).beginNewCampaignRun()).toBeNull();
        expect(game({ fixedRunEntropy: true }).beginNewCampaignRun()).toBeNull();
        expect(campaignWorldStore.getState().mapSeed).toBe(before);
    });

    it('isCampaignMap is false off the campaign', () => {
        expect(game({ _campaignWorldSeed: null, runEntropy: 5 }).isCampaignMap()).toBe(false);
        expect(game({ _campaignWorldSeed: 1, _campaignMapSeed: 2, runEntropy: 3 }).isCampaignMap()).toBe(false);
        expect(game({ _campaignWorldSeed: 1, _campaignMapSeed: 2, runEntropy: 2 }).isCampaignMap()).toBe(true);
    });
});
