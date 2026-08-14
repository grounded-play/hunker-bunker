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
});
