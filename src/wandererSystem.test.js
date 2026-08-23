import { describe, it, expect, beforeEach } from 'vitest';
import {
    isWandererEligible,
    WANDERER_ARCHETYPES,
    WandererManager
} from './wandererSystem.js';

class MockStorage {
    constructor() {
        this.store = new Map();
    }
    getItem(key) {
        return this.store.get(key) ?? null;
    }
    setItem(key, value) {
        this.store.set(key, String(value));
    }
    removeItem(key) {
        this.store.delete(key);
    }
    clear() {
        this.store.clear();
    }
}

describe('Wanderer & Companion System Gating', () => {
    it('rejects wanderers if O2 generator is not yet built', () => {
        const eligible = isWandererEligible({
            unlocks: { o2Bubble: false },
            defeatedBosses: new Set(['milestone_gate_1'])
        });
        expect(eligible).toBe(false);
    });

    it('rejects wanderers if O2 generator is built but no boss has been defeated yet', () => {
        const eligible = isWandererEligible({
            unlocks: { o2Bubble: true },
            defeatedBosses: new Set()
        });
        expect(eligible).toBe(false);
    });

    it('allows wanderers to arrive when O2 generator is online AND boss is defeated', () => {
        const eligible = isWandererEligible({
            unlocks: { o2Bubble: true },
            defeatedBosses: new Set(['o2Bubble'])
        });
        expect(eligible).toBe(true);
    });
});

describe('Wanderer Archetypes & Unique Dialogues', () => {
    it('defines unique dialogues, questions, and quests for all 6 archetype families', () => {
        const families = Object.values(WANDERER_ARCHETYPES);
        expect(families.length).toBe(6);

        const questions = new Set();
        const greetings = new Set();
        const questIds = new Set();

        for (const arch of families) {
            expect(arch.title).toBeTruthy();
            expect(arch.greeting).toBeTruthy();
            expect(arch.question).toBeTruthy();
            expect(arch.dialogueBefriend).toBeTruthy();
            expect(arch.dialogueChase).toBeTruthy();
            expect(arch.passiveBuff).toBeDefined();
            expect(arch.assistAbility).toBeDefined();
            expect(arch.quest).toBeDefined();
            expect(arch.skins.length).toBeGreaterThanOrEqual(3);

            // Verify uniqueness
            expect(greetings.has(arch.greeting)).toBe(false);
            expect(questions.has(arch.question)).toBe(false);
            expect(questIds.has(arch.quest.id)).toBe(false);

            greetings.add(arch.greeting);
            questions.add(arch.question);
            questIds.add(arch.quest.id);
        }
    });
});

describe('WandererManager Operations', () => {
    let storage;
    let manager;

    beforeEach(() => {
        storage = new MockStorage();
        manager = new WandererManager({ storage });
    });

    it('returns null on roll if not eligible', () => {
        const rolled = manager.rollWanderer({ unlocks: { o2Bubble: false }, defeatedBosses: [] });
        expect(rolled).toBeNull();
    });

    it('returns a full wanderer profile on roll when eligible', () => {
        const rolled = manager.rollWanderer({
            unlocks: { o2Bubble: true },
            defeatedBosses: ['milestone_1']
        });
        expect(rolled).not.toBeNull();
        expect(rolled.name).toBeTruthy();
        expect(rolled.glbUrl).toContain('.glb');
        expect(rolled.greeting).toBeTruthy();
        expect(rolled.question).toBeTruthy();
        expect(rolled.assistAbility).toBeDefined();
    });

    it('befriends a wanderer and assigns companion state & active quest', () => {
        const wanderer = manager.rollWanderer({
            unlocks: { o2Bubble: true },
            defeatedBosses: ['milestone_1']
        });

        const result = manager.befriend(wanderer);
        expect(result.success).toBe(true);
        expect(result.companion.name).toBe(wanderer.name);
        expect(manager.getActiveCompanion()).not.toBeNull();
        expect(manager.state.activeQuest.id).toBe(wanderer.quest.id);
    });

    it('chases off a wanderer and grants loot', () => {
        const wanderer = manager.rollWanderer({
            unlocks: { o2Bubble: true },
            defeatedBosses: ['milestone_1']
        });

        const result = manager.chaseOff(wanderer);
        expect(result.success).toBe(true);
        expect(result.lootGranted.scrap).toBeGreaterThan(0);
        expect(manager.getActiveCompanion()).toBeNull();
    });

    it('advances companion quest and marks complete', () => {
        const wanderer = manager.rollWanderer({
            unlocks: { o2Bubble: true },
            defeatedBosses: ['milestone_1']
        });
        manager.befriend(wanderer);

        const target = wanderer.quest.targetCount;
        const progressRes = manager.advanceQuest(target);
        expect(progressRes.completed).toBe(true);
        expect(manager.state.completedQuests[wanderer.quest.id]).toBe(true);
        expect(manager.state.activeQuest).toBeNull();
    });
});
