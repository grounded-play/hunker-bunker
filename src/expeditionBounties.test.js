import { describe, expect, it } from 'vitest';
import { BOUNTY_OBJECTIVES, bountyShellReward, createBountyProgress, recordBountyEvent } from './expeditionBounties.js';
import { EXPEDITION_BOUNTIES } from './expeditionSystem.js';

describe('expedition bounties are trackable and pay', () => {
    it('covers every bounty a deployment can roll, with a real shell reward', () => {
        for (const bounty of EXPEDITION_BOUNTIES) {
            expect(BOUNTY_OBJECTIVES[bounty.id], bounty.id).toBeTruthy();
            expect(bountyShellReward(bounty.id), bounty.id).toBe(bounty.rewardBonus);
            expect(createBountyProgress(bounty.id)).toMatchObject({ bountyId: bounty.id, progress: 0, completed: false });
        }
        expect(createBountyProgress('unknown')).toBeNull();
    });

    it('counts only its own metric and completes exactly once', () => {
        let state = createBountyProgress('clearing_breach');
        expect(recordBountyEvent(state, { metric: 'salvage' }).advanced).toBe(false);
        let completions = 0;
        for (let i = 0; i < 9; i += 1) {
            const result = recordBountyEvent(state, { metric: 'wallSmashed' });
            state = result.state;
            if (result.completedNow) completions += 1;
        }
        expect(state).toMatchObject({ progress: 6, target: 6, completed: true });
        expect(completions).toBe(1);
    });

    it('maps a compound by distinct rooms of one site, not repeat visits or scattered sites', () => {
        let state = createBountyProgress('scout_compound');
        const visit = (siteId, roomKey) => { state = recordBountyEvent(state, { metric: 'compoundRoom', siteId, roomKey }).state; };
        visit('camp_meridian', 'perimeter');
        visit('camp_meridian', 'perimeter');
        visit('camp_tallow', 'workshop');
        visit('camp_tallow', 'barracks');
        expect(state.progress).toBe(2);
        expect(state.completed).toBe(false);
        visit('camp_meridian', 'workshop');
        visit('camp_meridian', 'infirmary');
        expect(state).toMatchObject({ progress: 3, completed: true });
    });

    it('does not mutate the state it is given', () => {
        const state = createBountyProgress('eliminate_elite');
        const result = recordBountyEvent(state, { metric: 'eliteKill' });
        expect(state.progress).toBe(0);
        expect(result.state.completed).toBe(true);
    });
});
