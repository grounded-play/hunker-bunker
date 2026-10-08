import { describe, expect, it, vi } from 'vitest';
import {
    NPC_DIALOGUE_TREES,
    NpcDialogueTreeManager
} from './npcDialogueTrees.js';

describe('NpcDialogueTreeManager & Sensual Storyline Trees', () => {
    it('contains all 4 major mature character dialogue trees', () => {
        expect(NPC_DIALOGUE_TREES).toHaveProperty('sister_val');
        expect(NPC_DIALOGUE_TREES).toHaveProperty('commander_briggs');
        expect(NPC_DIALOGUE_TREES).toHaveProperty('overseer_kaelen');
        expect(NPC_DIALOGUE_TREES).toHaveProperty('aria_queen_mimic');
    });

    it('starts dialogue and transitions through choices correctly', () => {
        const stateCallback = vi.fn();
        const manager = new NpcDialogueTreeManager({ onStateChanged: stateCallback });

        const firstNode = manager.startDialogue('sister_val');
        expect(firstNode).not.toBeNull();
        expect(firstNode.id).toBe('val_greeting');
        expect(stateCallback).toHaveBeenCalled();

        // Select intimate touch choice
        const secondNode = manager.selectChoice('val_warmth_touch');
        expect(secondNode.id).toBe('val_massage_response');
        expect(manager.activePerks.has('tallows_seductive_warmth')).toBe(true);

        // Select deepen intimacy choice
        const thirdNode = manager.selectChoice('val_whisper_more');
        expect(thirdNode.id).toBe('val_intimate_climax');

        // Conclude dialogue
        const conclusion = manager.selectChoice('val_parting_kiss');
        expect(conclusion.concluded).toBe(true);
        expect(manager.activeTree).toBeNull();
    });

    it('accumulates bond points and advances bond levels', () => {
        const manager = new NpcDialogueTreeManager();
        expect(manager.getBondLevel('commander_briggs').level).toBe(0);

        manager.startDialogue('commander_briggs');
        manager.selectChoice('briggs_flirt_clasps');
        expect(manager.bondState.commander_briggs).toBeGreaterThanOrEqual(25);
        expect(manager.getBondLevel('commander_briggs').level).toBeGreaterThanOrEqual(1);

        manager.selectChoice('briggs_turn_around');
        expect(manager.bondState.commander_briggs).toBeGreaterThanOrEqual(65);
        expect(manager.getBondLevel('commander_briggs').level).toBe(2);
    });

    it('navigates Aria queen mimic sensual telepathy tree', () => {
        const manager = new NpcDialogueTreeManager();
        const start = manager.startDialogue('aria_queen_mimic');
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
