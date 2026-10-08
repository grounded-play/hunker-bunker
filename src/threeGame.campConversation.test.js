import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

// Owner, 2026-10-08: one TALK at a camp opened the staged conversation AND
// the choice tree, with music videos behind them. A camp now has one
// conversation: talkToLeader hands its choice tree to that window instead of
// opening a second modal. docs/planning/qa-2026-10-08-camp-interaction-audit.md
function talkTo(campId) {
    const events = [];
    const openTree = vi.fn();
    globalThis.window = { dispatchEvent: (event) => events.push(event), openNpcDialogueTree: openTree, achievementEngine: null };
    globalThis.CustomEvent = class CustomEvent {
        constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
    };
    const fake = Object.create(ThreeGame.prototype);
    Object.assign(fake, {
        act2: { recordDialogueTalk: vi.fn(), advanceDialogueStage: vi.fn() },
        getCampRecord: () => ({ status: 'alive', bond: 1, level: 1, dialogueStage: 0, stageTalks: 0 }),
        peekDialogueBeat: () => ({ type: 'beat', stage: 0, lines: ['KAELEN: ANOTHER SUIT FROM THE SURFACE.'] }),
        getDialogueContext: () => ({})
    });
    const ok = fake.talkToLeader('camp', { id: campId, leaderName: 'Overseer Kaelen' });
    delete globalThis.window;
    return { ok, events, openTree };
}

describe('one conversation per camp', () => {
    it('opens the staged conversation once, carrying the choice tree, and no second modal', () => {
        const { ok, events, openTree } = talkTo('camp_meridian');
        expect(ok).toBe(true);
        const conversations = events.filter((event) => event.type === 'leader-dialogue');
        expect(conversations).toHaveLength(1);
        expect(conversations[0].detail.treeId).toBe('overseer_kaelen');
        expect(openTree).not.toHaveBeenCalled();
    });

    it("gives Tallow's conversation Sister Martha's tree", () => {
        const { events } = talkTo('camp_tallow');
        expect(events.find((event) => event.type === 'leader-dialogue').detail.treeId).toBe('sister_val');
    });
});
