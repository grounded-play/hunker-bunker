import { afterEach, describe, expect, it } from 'vitest';
import {
    createMemoryStorage,
    enterSessionStory,
    isSessionStoryActive,
    leaveSessionStory,
    registerStoryManager,
    unregisterStoryManager
} from './storyScope.js';
import { ArcStateManager } from './arcState.js';
import { Act2Manager } from './act2.js';

const registered = [];
function track(manager) {
    registerStoryManager(manager);
    registered.push(manager);
    return manager;
}
afterEach(() => {
    leaveSessionStory();
    while (registered.length) unregisterStoryManager(registered.pop());
});

describe('story scope', () => {
    it('a co-op/PvP run starts the story fresh and leaves the solo save untouched', () => {
        const save = createMemoryStorage();
        const act2 = track(new Act2Manager({ storage: save }));
        act2.setQueenStatus('killed');
        expect(act2.getState().queenStatus).toBe('killed');
        const soloSnapshot = save.getItem('hb_act2_v1');

        enterSessionStory();
        expect(isSessionStoryActive()).toBe(true);
        expect(act2.getState().queenStatus).not.toBe('killed');
        // Story changes during the co-op run stay in the session.
        act2.setQueenStatus('aboard');
        expect(save.getItem('hb_act2_v1')).toBe(soloSnapshot);

        leaveSessionStory();
        expect(isSessionStoryActive()).toBe(false);
        expect(act2.getState().queenStatus).toBe('killed');
    });

    it('every co-op run is fresh, not the previous session', () => {
        const act2 = track(new Act2Manager({ storage: createMemoryStorage() }));
        enterSessionStory();
        act2.setQueenStatus('killed');
        leaveSessionStory();
        enterSessionStory();
        // The fresh default, not the previous session's outcome.
        expect(act2.getState().queenStatus).toBe('aboard');
    });

    it('a manager created during a session joins it', () => {
        const save = createMemoryStorage();
        const early = new ArcStateManager({ storage: save });
        early.save();
        enterSessionStory();
        const late = track(new ArcStateManager({ storage: save }));
        late.state.flags = { ...(late.state.flags ?? {}), sessionOnly: true };
        late.save();
        leaveSessionStory();
        expect(JSON.parse(save.getItem('hb_arc_v1')).flags?.sessionOnly).toBeUndefined();
    });

    it('leaving without a session is a no-op; bad managers are refused', () => {
        expect(leaveSessionStory()).toBe(0);
        expect(registerStoryManager({})).toBe(false);
        expect(registerStoryManager(null)).toBe(false);
    });
});
