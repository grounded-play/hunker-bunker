import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

// Owner, 2026-10-08: one TALK at a camp opened the staged conversation AND
// the choice tree, with music videos behind them. A camp now has one
// conversation: talkToLeader hands its choice tree to that window instead of
// opening a second modal. docs/planning/qa-2026-10-08-camp-interaction-audit.md
function talkTo(campId, leaderName = 'Overseer Kaelen') {
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
    const ok = fake.talkToLeader('camp', { id: campId, leaderName });
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
        const { events } = talkTo('camp_tallow', 'Sister Martha');
        expect(events.find((event) => event.type === 'leader-dialogue').detail.treeId).toBe('sister_val');
    });

    // 2026-10-07 Deck log: Meridian was led by Martha for that class, the
    // prompt said "TALK — SISTER MARTHA", and Kaelen's tree opened.
    it("follows the leader standing at the camp, not the camp's usual leader", () => {
        const { events } = talkTo('camp_meridian', 'Sister Martha');
        expect(events.find((event) => event.type === 'leader-dialogue').detail.treeId).toBe('sister_val');
    });

    it('triggers meridian_first_meeting sequence when talking at Camp Meridian', () => {
        const events = [];
        globalThis.window = { dispatchEvent: (event) => events.push(event), openNpcDialogueTree: vi.fn(), achievementEngine: null };
        globalThis.CustomEvent = class CustomEvent {
            constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
        };
        const fake = Object.create(ThreeGame.prototype);
        const runSequence = vi.fn();
        Object.assign(fake, {
            interactionSequenceRunner: {
                isSequenceCompleted: vi.fn().mockReturnValue(false),
                runSequence
            },
            act2: { recordDialogueTalk: vi.fn(), advanceDialogueStage: vi.fn() },
            getCampRecord: () => ({ status: 'alive', bond: 1, level: 1, dialogueStage: 0, stageTalks: 0 }),
            peekDialogueBeat: () => ({ type: 'beat', stage: 0, lines: ['KAELEN: ANOTHER SUIT FROM THE SURFACE.'] }),
            getDialogueContext: () => ({})
        });
        fake.talkToLeader('camp', { id: 'camp_meridian', leaderName: 'Overseer Kaelen' });
        expect(runSequence).toHaveBeenCalledWith('meridian_first_meeting');
        delete globalThis.window;
    });

    // Audit 2026-10-16 §13.4: the runner's reward and line hooks were silent
    // no-ops (bank.addPerk does not exist; nothing listened for the events).
    it('grants a sequence perk through the side stories and shows the toast', () => {
        const toast = vi.fn();
        const activePerks = new Set();
        const grantPerk = vi.fn(() => ({ storyId: 'overseer_kaelen', perk: { id: 'meridian_neural_overclock', name: 'Meridian Neural Overclock', desc: '+20m Radar' } }));
        globalThis.window = { dispatchEvent: vi.fn(), showToastNotification: toast, sideStoryManager: { grantPerk }, npcDialogueTreeManager: { activePerks } };
        const fake = Object.create(ThreeGame.prototype);
        fake.grantSequenceReward({ perk: 'meridian_neural_overclock', toast: true });
        expect(grantPerk).toHaveBeenCalledWith('meridian_neural_overclock');
        expect(activePerks.has('meridian_neural_overclock')).toBe(true);
        expect(toast).toHaveBeenCalledWith('Meridian Neural Overclock — +20m Radar', expect.objectContaining({ tone: 'info' }));
        delete globalThis.window;
    });

    it('shows a sequence line as a bunker line, with the speaker', async () => {
        globalThis.window = { dispatchEvent: vi.fn() };
        const fake = Object.create(ThreeGame.prototype);
        fake.showBunkerLine = vi.fn();
        fake.camps = [{ id: 'camp_meridian', leaderName: 'Overseer Kaelen', pos: { x: 0, z: 0 } }];
        await fake.displaySequenceSubtitle('mothership', 'narrative.sequences.missing', 'Rest infrastructure verified.', { holdMs: 0 });
        expect(fake.showBunkerLine).toHaveBeenCalledWith('MOTHERSHIP: Rest infrastructure verified.');
        delete globalThis.window;
    });

    // First contact with a hive: card first (main.js), then the choice window
    // behind the closed doors -- never the window with a card over it.
    it('holds the hive choice window until first contact has played', () => {
        const events = [];
        globalThis.window = { dispatchEvent: (event) => events.push(event) };
        globalThis.CustomEvent = class CustomEvent {
            constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
        };
        const fake = Object.create(ThreeGame.prototype);
        Object.assign(fake, {
            getHiveRecord: () => ({ id: 'hive_suture', status: 'awakened', extractionLevel: 0 }),
            act2: { getPhase: () => 'act2', getEndingVector: () => ({}) },
            buildHiveChoiceOptions: () => []
        });
        const hive = { id: 'hive_suture', label: 'SUTURE HIVE' };
        expect(fake.openHiveChoice(hive)).toBe(true);
        expect(events.map((e) => e.type)).toEqual(['hive-first-contact']);
        events[0].detail.onComplete();
        expect(events.map((e) => e.type)).toEqual(['hive-first-contact', 'camp-choice-open']);
        fake.openHiveChoice(hive);
        expect(events.map((e) => e.type)).toEqual(['hive-first-contact', 'camp-choice-open', 'camp-choice-open']);
        delete globalThis.window;
    });
});
