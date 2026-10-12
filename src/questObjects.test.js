import { describe, expect, it } from 'vitest';
import { CAMP_QUESTS } from './data/campQuests.js';
import { WORLD_3D_MODELS } from './world3dOverlay.js';
import { QUEST_OBJECTS, questObjectFor } from './questObjects.js';

// Sprint 53 V7: every camp quest target was the same gold-tinted junk sprite
// ("quest_objective_node"). Each quest now has its own object, so you know
// what you are looking for at a glance.
const allQuestIds = Object.values(CAMP_QUESTS).flat().map((quest) => quest.id);

describe('quest objects', () => {
    it('covers every camp quest', () => {
        for (const id of allQuestIds) expect(questObjectFor(id), id).not.toBeNull();
    });

    it('stands in with a shipped model until its A3 model arrives', () => {
        for (const [id, entry] of Object.entries(QUEST_OBJECTS)) {
            const part = entry.target ?? entry.landmark;
            expect(part, id).toBeTruthy();
            expect(WORLD_3D_MODELS[part.standIn], `${id} -> ${part.standIn}`).toBeTruthy();
            expect(part.model, id).toMatch(/^quest_/);
        }
    });

    it('gives each quest a silhouette of its own', () => {
        const standIns = Object.values(QUEST_OBJECTS).map((entry) => (entry.target ?? entry.landmark).standIn);
        expect(new Set(standIns).size).toBe(standIns.length);
    });

    it('tints the three archive chapters apart', () => {
        const accents = ['hive_archive_ch1', 'hive_archive_ch2', 'hive_archive_ch3'].map((id) => questObjectFor(id).accent);
        expect(new Set(accents).size).toBe(3);
        expect(questObjectFor('hive_archive_ch2').target.standIn).toBe(questObjectFor('hive_archive_ch1').target.standIn);
    });

    it('marks kill and wave quests with a landmark, not a target', () => {
        for (const id of ['armory_breach', 'bunker_holdout', 'iron_ledger']) {
            expect(questObjectFor(id).target, id).toBeUndefined();
            expect(questObjectFor(id).landmark, id).toBeTruthy();
        }
        expect(questObjectFor('nonexistent')).toBeNull();
    });
});
