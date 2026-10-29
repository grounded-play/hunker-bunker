import { describe, expect, it, vi } from 'vitest';
import {
    INTIMACY_REQUIREMENT,
    NPC_DIALOGUE_TREES,
    NpcDialogueTreeManager
} from './npcDialogueTrees.js';
import { SideStoryManager } from './sideStorySystem.js';

describe('NpcDialogueTreeManager & Sensual Storyline Trees', () => {
    it('contains all 4 major mature character dialogue trees', () => {
        expect(NPC_DIALOGUE_TREES).toHaveProperty('sister_val');
        expect(NPC_DIALOGUE_TREES).toHaveProperty('commander_briggs');
        expect(NPC_DIALOGUE_TREES).toHaveProperty('overseer_kaelen');
        expect(NPC_DIALOGUE_TREES).toHaveProperty('aria_queen_mimic');
    });

    // Owner 2026-10-16: a stage's side-story card plays behind doors before
    // its node (audit §13.3), once per save, never on a greeting (first
    // contact already played the camp's card) and never behind the window.
    it('names the side-story card a choice should play, once', () => {
        const manager = new NpcDialogueTreeManager({ stories: { state: {} } });
        manager.startDialogue('sister_val', { context: { bond: 3, stage: 1 } });
        expect(manager.cardForChoice('val_lore_spores')).toBeNull();
        expect(manager.cardForChoice('val_leave')).toBeNull();
        expect(manager.cardForChoice('no_such_choice')).toBeNull();
        expect(manager.cardForChoice('val_warmth_touch')).toBe('val_spore_communion');
        manager.markCardPlayed('val_spore_communion');
        expect(manager.cardForChoice('val_warmth_touch')).toBeNull();
    });

    it('remembers played cards with the side stories, across conversations', () => {
        const stories = { state: {} };
        new NpcDialogueTreeManager({ stories }).startDialogue('sister_val', { context: { bond: 3, stage: 1 } });
        const first = new NpcDialogueTreeManager({ stories });
        first.startDialogue('sister_val', { context: { bond: 3, stage: 1 } });
        first.markCardPlayed('val_spore_communion');
        const later = new NpcDialogueTreeManager({ stories });
        later.startDialogue('sister_val', { context: { bond: 3, stage: 1 } });
        expect(later.cardForChoice('val_warmth_touch')).toBeNull();
    });

    it('never plays a card on a tree\'s opening node', () => {
        for (const tree of Object.values(NPC_DIALOGUE_TREES)) {
            const manager = new NpcDialogueTreeManager({ stories: { state: {} } });
            manager.activeTree = tree;
            manager.currentNode = { id: 'probe', choices: [{ id: 'to_start', nextNode: tree.initialNode }] };
            expect(manager.cardForChoice('to_start')).toBeNull();
        }
    });

    it('starts dialogue and transitions through choices correctly', () => {
        const stateCallback = vi.fn();
        const manager = new NpcDialogueTreeManager({ onStateChanged: stateCallback, stories: { state: {} } });

        const firstNode = manager.startDialogue('sister_val', { context: { bond: 3, stage: 1 } });
        expect(firstNode).not.toBeNull();
        expect(firstNode.id).toBe('val_greeting');
        expect(stateCallback).toHaveBeenCalled();

        // Select intimate touch choice. Intimacy carries no power perk: the
        // leader's perk lives on the trusted path.
        const secondNode = manager.selectChoice('val_warmth_touch');
        expect(secondNode.id).toBe('val_massage_response');
        expect(manager.activePerks.has('tallows_seductive_warmth')).toBe(false);

        // Select deepen intimacy choice
        const thirdNode = manager.selectChoice('val_whisper_more');
        expect(thirdNode.id).toBe('val_intimate_climax');

        // Conclude dialogue
        const conclusion = manager.selectChoice('val_parting_kiss');
        expect(conclusion.concluded).toBe(true);
        expect(manager.activeTree).toBeNull();
    });

    it('accumulates bond points and advances bond levels', () => {
        const manager = new NpcDialogueTreeManager({ stories: { state: {} } });
        expect(manager.getBondLevel('commander_briggs').level).toBe(0);

        manager.startDialogue('commander_briggs', { context: { bond: 3, stage: 1 } });
        manager.selectChoice('briggs_trust_drill');
        manager.selectChoice('briggs_flirt_clasps');
        expect(manager.bondState.commander_briggs).toBeGreaterThanOrEqual(25);
        expect(manager.getBondLevel('commander_briggs').level).toBeGreaterThanOrEqual(1);

        manager.selectChoice('briggs_turn_around');
        expect(manager.bondState.commander_briggs).toBeGreaterThanOrEqual(65);
        expect(manager.getBondLevel('commander_briggs').level).toBe(2);
    });

    it('navigates Aria queen mimic sensual telepathy tree', () => {
        const manager = new NpcDialogueTreeManager({ stories: { state: {} } });
        const start = manager.startDialogue('aria_queen_mimic', { context: { bond: 3, stage: 1 } });
        expect(start.id).toBe('aria_whisper');

        const surrender = manager.selectChoice('aria_surrender');
        expect(surrender.id).toBe('aria_surrender_response');
        expect(manager.activePerks.has('arias_psychic_mind_caress')).toBe(true);
    });

    it('navigates Dr. Nahl renegade bio-resonant symbiosis tree', () => {
        const manager = new NpcDialogueTreeManager();
        const start = manager.startDialogue('dr_nahl');
        expect(start.id).toBe('nahl_greeting');

        const accept = manager.selectChoice('nahl_mind_accept');
        expect(accept.id).toBe('nahl_symbiosis_response');
        expect(manager.activePerks.has('nahl_symbiotic_resonance')).toBe(true);

        const climax = manager.selectChoice('nahl_deep_communion');
        expect(climax.id).toBe('nahl_intimate_climax');
        expect(manager.activePerks.has('nahl_neural_freedom')).toBe(true);
    });
});

// Owner, 2026-10-08: camps showed two conversations and music videos stacked
// behind them; earned perks vanished on reload. See
// docs/planning/qa-2026-10-08-camp-interaction-audit.md.
describe('camp conversation consolidation', () => {
    it('keeps earned perks and bond after a reload, from the saved side stories', () => {
        const stories = {
            state: {
                overseer_kaelen: { perks: ['meridian_neural_overclock'], bondScore: 65 },
                sister_val: { perks: [], bondScore: 25 }
            }
        };
        const manager = new NpcDialogueTreeManager({ stories });
        expect(manager.activePerks.has('meridian_neural_overclock')).toBe(true);
        expect(manager.bondState.overseer_kaelen).toBe(65);
        expect(manager.bondState.sister_val).toBe(25);
    });

    it('starts no music video when a choice is made', () => {
        const play = vi.fn();
        globalThis.window = { playSideStoryInterstitial: play };
        try {
            const manager = new NpcDialogueTreeManager({ stories: { state: {} } });
            manager.startDialogue('overseer_kaelen');
            manager.selectChoice('kaelen_bio_link');
            expect(play).not.toHaveBeenCalled();
        } finally {
            delete globalThis.window;
        }
    });

    it("names Tallow's leader Sister Martha, as the camp does", () => {
        const tree = NPC_DIALOGUE_TREES.sister_val;
        expect(tree.name).toBe('Sister Martha');
        const text = JSON.stringify(tree);
        expect(text).not.toMatch(/\bVal\b/);
    });
});

describe('no third way to leave', () => {
    // A paused side story was never resumed or read; [PAUSE] was just another
    // LEAVE beside the tree's own and the window's (owner, 2026-10-08).
    it('does not append a pause choice', () => {
        const manager = new NpcDialogueTreeManager({ stories: { state: {} } });
        const node = manager.startDialogue('overseer_kaelen');
        expect(node.choices.some((choice) => choice.id === 'pause_story_choice')).toBe(false);
        // The tree's own way out stays (read from the data: earlier tests in
        // this file advance Kaelen's stage on the shared side-story state).
        expect(NPC_DIALOGUE_TREES.overseer_kaelen.nodes.kaelen_greeting.choices
            .some((choice) => /LEAVE/.test(choice.tone ?? ''))).toBe(true);
    });
});

// Owner, 2026-10-16: every leader opened with seduction options before the
// player had done anything, and the same options came back on every visit.
// docs/planning/camp-interaction-and-cinematics-audit-2026-10-16.md
describe('earned, non-repeating leader conversations', () => {
    const CLOSE = { context: { bond: 5, stage: 3 } };
    const STRANGER = { context: { bond: 0, stage: 0 } };
    const freshStories = () => new SideStoryManager({ storage: null });
    const intimateOpening = {
        sister_val: 'val_warmth_touch',
        commander_briggs: 'briggs_inspect_scars',
        overseer_kaelen: 'kaelen_bio_link'
    };

    it('holds intimate choices until camp trust and the story allow them', () => {
        for (const treeId of ['sister_val', 'commander_briggs', 'overseer_kaelen']) {
            const stranger = new NpcDialogueTreeManager({ stories: freshStories() }).startDialogue(treeId, STRANGER);
            expect(stranger.choices.map(({ id }) => id), treeId).not.toContain(intimateOpening[treeId]);
            const below = new NpcDialogueTreeManager({ stories: freshStories() })
                .startDialogue(treeId, { context: { bond: INTIMACY_REQUIREMENT.bond - 1, stage: 3 } });
            expect(below.choices.map(({ id }) => id), treeId).not.toContain(intimateOpening[treeId]);
            const close = new NpcDialogueTreeManager({ stories: freshStories() }).startDialogue(treeId, CLOSE);
            expect(close.choices.map(({ id }) => id), treeId).toContain(intimateOpening[treeId]);
        }
    });

    it('does not offer a branch again once all of it has been heard, and ends the tree when nothing is new', () => {
        const stories = freshStories();
        const exits = NPC_DIALOGUE_TREES.sister_val.nodes.val_spores_response.choices
            .filter((choice) => !/TASTE|INTIMA|SENSUAL/.test(choice.tone ?? ''));
        for (const exit of exits) {
            const visit = new NpcDialogueTreeManager({ stories });
            visit.startDialogue('sister_val', STRANGER);
            visit.selectChoice('val_lore_spores');
            visit.selectChoice(exit.id);
        }
        const later = new NpcDialogueTreeManager({ stories });
        const nextStage = later.startDialogue('sister_val', STRANGER);
        expect(nextStage?.choices.map(({ id }) => id) ?? []).not.toContain('val_lore_spores');
    });

    it('pays bond and perks once, not on every walk down the same branch', () => {
        const stories = freshStories();
        const manager = new NpcDialogueTreeManager({ stories });
        manager.startDialogue('commander_briggs', CLOSE);
        manager.selectChoice('briggs_trust_drill');
        const afterFirst = manager.bondState.commander_briggs;
        expect(afterFirst).toBeGreaterThan(0);
        manager.closeDialogue();
        const again = new NpcDialogueTreeManager({ stories });
        again.bondState.commander_briggs = afterFirst;
        again.startDialogue('commander_briggs', CLOSE);
        const reoffered = again.currentNode.choices.find((choice) => choice.id === 'briggs_trust_drill');
        if (reoffered) again.selectChoice('briggs_trust_drill');
        expect(again.bondState.commander_briggs).toBe(afterFirst);
    });
});

// Plan step 3 (2026-10-16): a Stranger tier on first meeting, each leader's
// perk on a non-intimate Trusted path, and never more than four choices.
describe('stranger and trusted tiers', () => {
    const freshStories = () => new SideStoryManager({ storage: null });
    const LEADERS = {
        overseer_kaelen: { trust: 'kaelen_trust_cradle', perk: 'meridian_neural_overclock', assist: ['kaelen_grid_lore', 'kaelen_assist_probe'] },
        sister_val: { trust: 'val_trust_tend', perk: 'tallows_seductive_warmth', assist: ['val_lore_spores', 'val_assist_mold'] },
        commander_briggs: { trust: 'briggs_trust_drill', perk: 'vesper_vanguard_adrenaline', assist: ['briggs_tactics', 'briggs_assist_armory'] }
    };

    it('greets a stranger with the camp and its first quest, not personal or intimate talk', () => {
        for (const [treeId, leader] of Object.entries(LEADERS)) {
            const manager = new NpcDialogueTreeManager({ stories: freshStories() });
            const greeting = manager.startDialogue(treeId, { context: { bond: 0, stage: 0 } });
            expect(greeting.choices.map(({ tone }) => tone), treeId).toEqual(['[ASK]', '[LEAVE]']);
            manager.selectChoice(leader.assist[0]);
            const pointer = manager.selectChoice(leader.assist[1]);
            expect(pointer.id, treeId).toMatch(/pointer$/);
        }
    });

    it("earns each leader's perk on the trusted path, without intimacy", () => {
        for (const [treeId, leader] of Object.entries(LEADERS)) {
            const manager = new NpcDialogueTreeManager({ stories: freshStories() });
            manager.startDialogue(treeId, { context: { bond: 2, stage: 0 } });
            expect(manager.currentNode.choices.map(({ id }) => id), treeId).toContain(leader.trust);
            manager.selectChoice(leader.trust);
            expect(manager.activePerks.has(leader.perk), treeId).toBe(true);
        }
    });

    it('never opens on a node the relationship has not reached', () => {
        const stories = freshStories();
        stories.getStoryState('sister_val').stageIndex = 3;
        const node = new NpcDialogueTreeManager({ stories }).startDialogue('sister_val', { context: { bond: 0, stage: 0 } });
        expect(node.id).toBe('val_greeting');
    });

    it('shows at most four choices', () => {
        for (const tree of Object.values(NPC_DIALOGUE_TREES)) {
            for (const node of Object.values(tree.nodes)) {
                const manager = new NpcDialogueTreeManager({ stories: freshStories() });
                manager.context = { bond: 5, stage: 3 };
                const shown = manager.visibleChoices(tree, node, manager.memoryFor(tree.id));
                expect(shown.length, `${tree.id}/${node.id}`).toBeLessThanOrEqual(4);
            }
        }
    });
});
