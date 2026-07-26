import { describe, it, expect } from 'vitest';
import {
    LEADER_DIALOGUE,
    LEADER_KEYS,
    leaderKeyFromName,
    nextDialogueBeat,
    isFinalStage,
    DIALOGUE_FINAL_STAGE,
    meetsRequirements
} from './campDialogue.js';

describe('leader dialogue ladders', () => {
    it('all six leaders have four stages with beats and loop lines', () => {
        expect(LEADER_KEYS).toHaveLength(6);
        for (const key of LEADER_KEYS) {
            const ladder = LEADER_DIALOGUE[key];
            expect(ladder.stages).toHaveLength(DIALOGUE_FINAL_STAGE + 1);
            for (const stage of ladder.stages) {
                expect(stage.beats.length).toBeGreaterThan(0);
                expect(typeof stage.loop).toBe('string');
                for (const beat of stage.beats) {
                    expect(beat.length).toBeGreaterThan(0);
                }
            }
            // every non-final stage must define how to progress
            for (const stage of ladder.stages.slice(0, -1)) {
                expect(stage.next).toBeTruthy();
            }
        }
    });

    it('resolves leader keys from display names', () => {
        expect(leaderKeyFromName('Sister Martha')).toBe('martha');
        expect(leaderKeyFromName('Commander Briggs')).toBe('briggs');
        expect(leaderKeyFromName('Overseer Kaelen')).toBe('kaelen');
        expect(leaderKeyFromName('unknown person')).toBeNull();
    });

    it('plays beats in order, then loops until requirements are met', () => {
        // Kaelen stage 0 needs 2 talks + camp level 1
        let beat = nextDialogueBeat('kaelen', { stage: 0, talks: 0 }, { level: 0 });
        expect(beat.type).toBe('beat');
        beat = nextDialogueBeat('kaelen', { stage: 0, talks: 1 }, { level: 0 });
        expect(beat.type).toBe('beat');
        // exhausted, level unmet → loop line
        beat = nextDialogueBeat('kaelen', { stage: 0, talks: 2 }, { level: 0 });
        expect(beat.type).toBe('loop');
        expect(beat.lines[0]).toBe(LEADER_DIALOGUE.kaelen.stages[0].loop);
        // level met → advance plays the next stage's first beat
        beat = nextDialogueBeat('kaelen', { stage: 0, talks: 2 }, { level: 1 });
        expect(beat.type).toBe('advance');
        expect(beat.stage).toBe(1);
        expect(beat.lines).toBe(LEADER_DIALOGUE.kaelen.stages[1].beats[0]);
    });

    it('human stage 2 → final requires the reveal', () => {
        let beat = nextDialogueBeat('martha', { stage: 2, talks: 2 }, { level: 3, postReveal: false });
        expect(beat.type).toBe('loop');
        beat = nextDialogueBeat('martha', { stage: 2, talks: 2 }, { level: 3, postReveal: true });
        expect(beat.type).toBe('advance');
        expect(isFinalStage(beat.stage)).toBe(true);
    });

    it('hive stage 2 → final requires bond 3', () => {
        let beat = nextDialogueBeat('vey', { stage: 2, talks: 2 }, { bond: 2, postReveal: true });
        expect(beat.type).toBe('loop');
        beat = nextDialogueBeat('vey', { stage: 2, talks: 2 }, { bond: 3, postReveal: true });
        expect(beat.type).toBe('advance');
    });

    it('the final stage loops forever after its beats', () => {
        const beat = nextDialogueBeat('rhun', { stage: 3, talks: 9 }, { bond: 5, postReveal: true });
        expect(beat.type).toBe('loop');
    });
});

describe('meetsRequirements', () => {
    it('requires the named quest flag to be done', () => {
        expect(meetsRequirements({ questFlag: 'snail_befriended' }, { questFlags: {} })).toBe(false);
        expect(meetsRequirements({ questFlag: 'snail_befriended' }, { questFlags: { snail_befriended: 'active' } })).toBe(false);
        expect(meetsRequirements({ questFlag: 'snail_befriended' }, { questFlags: { snail_befriended: 'done' } })).toBe(true);
    });

    it('is unaffected when next has no questFlag', () => {
        expect(meetsRequirements({ talks: 0 }, { questFlags: {} })).toBe(true);
    });
});
