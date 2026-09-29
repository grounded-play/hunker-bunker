import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

// The tracker shows two objective cards, which the mission and the ship-goal
// option fill -- so the bounty also drives a chip in the expedition panel.
let events;
beforeEach(() => {
    events = [];
    vi.stubGlobal('window', {
        dispatchEvent: (event) => { events.push({ type: event.type, detail: event.detail }); return true; },
        objectiveRegistry: { trackObjective: vi.fn(), resolveObjective: vi.fn() }
    });
});
afterEach(() => vi.unstubAllGlobals());

const chipEvents = () => events.filter((event) => event.type === 'expedition-bounty-progress').map((event) => event.detail);

describe('the bounty chip follows the deployment bounty', () => {
    it('shows progress, then ready, and hides when there is no bounty', () => {
        const game = { expeditionBounty: { bountyId: 'clearing_breach', progress: 2, target: 6, completed: false, settled: false } };
        ThreeGame.prototype.syncExpeditionBountyTracker.call(game);
        game.expeditionBounty = { ...game.expeditionBounty, progress: 6, completed: true };
        ThreeGame.prototype.syncExpeditionBountyTracker.call(game);
        game.expeditionBounty = null;
        ThreeGame.prototype.syncExpeditionBountyTracker.call(game);
        const [progress, ready, hidden] = chipEvents();
        expect(progress).toMatchObject({ labelKey: 'ui.expedition.bounties.clearing_breach', progress: 2, target: 6, completed: false });
        expect(progress.shells).toBeGreaterThan(0);
        expect(ready).toMatchObject({ progress: 6, completed: true });
        expect(hidden).toEqual({ hidden: true });
    });
});
