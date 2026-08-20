import { describe, it, expect } from 'vitest';
import {
    LEADER_DIALOGUE,
    LEADER_DEATH_BEATS,
    LEADER_KEYS,
    describeDialogueProgress,
    leaderKeyFromName,
    nextDialogueBeat,
    isFinalStage,
    DIALOGUE_FINAL_STAGE,
    meetsRequirements
} from './campDialogue.js';

describe('leader dialogue ladders', () => {
    it('explains the concrete action needed to unlock the next conversation', () => {
        const locked = describeDialogueProgress('kaelen', { stage: 0, talks: 2 }, { level: 0 });
        expect(locked.ready).toBe(false);
        expect(locked.guidance).toContain('raise camp level to 1');
        expect(locked.guidance).toContain('now 0');

        const available = describeDialogueProgress('kaelen', { stage: 0, talks: 1 }, { level: 0 });
        expect(available.ready).toBe(true);
        expect(available.guidance).toContain('available now');
    });
    it('all seven leaders have four stages with beats and loop lines', () => {
        expect(LEADER_KEYS).toHaveLength(7);
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

describe('scientist dialogue ladder', () => {
    it('stage 0 offers beats before advancing', () => {
        const beat = nextDialogueBeat('scientist', { stage: 0, talks: 0 }, { questFlags: {} });
        expect(beat.type).toBe('beat');
        expect(beat.lines.length).toBeGreaterThan(0);
    });

    it('stage 1 requires postReveal to advance to stage 2', () => {
        const ctx = { questFlags: {}, postReveal: false };
        const stage1BeatCount = LEADER_DIALOGUE.scientist.stages[1].beats.length;
        const atLoop = nextDialogueBeat('scientist', { stage: 1, talks: stage1BeatCount }, ctx);
        expect(atLoop.type).toBe('loop');
        const withReveal = nextDialogueBeat('scientist', { stage: 1, talks: stage1BeatCount }, { ...ctx, postReveal: true });
        expect(withReveal.type).toBe('advance');
        expect(withReveal.stage).toBe(2);
    });

    it('stage 2 registers the quest and stage 3 stays locked without the quest flag', () => {
        const stage2BeatCount = LEADER_DIALOGUE.scientist.stages[2].beats.length;
        const ctx = { questFlags: {}, postReveal: true };
        const atLoop = nextDialogueBeat('scientist', { stage: 2, talks: stage2BeatCount }, ctx);
        expect(atLoop.type).toBe('loop');
    });

    it('stage 3 unlocks once snail_befriended is done', () => {
        const stage2BeatCount = LEADER_DIALOGUE.scientist.stages[2].beats.length;
        const ctx = { questFlags: { snail_befriended: 'done' }, postReveal: true };
        const advanced = nextDialogueBeat('scientist', { stage: 2, talks: stage2BeatCount }, ctx);
        expect(advanced.type).toBe('advance');
        expect(advanced.stage).toBe(3);
    });

    it('is registered in LEADER_KEYS', () => {
        expect(LEADER_KEYS).toContain('scientist');
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

// Sprint 25 design pass (docs/design/camp-narrative-style-guide.md): the
// human leaders' death-return beat is the closest existing touchpoint to
// the style guide's Body/Work/Power/Intimacy structure, so it's where a
// third, more physically specific line landed for kaelen/martha/briggs.
describe('LEADER_DEATH_BEATS', () => {
    it('gives each human leader a third, more intimate line beyond the original two', () => {
        for (const key of ['kaelen', 'martha', 'briggs']) {
            expect(LEADER_DEATH_BEATS[key].length).toBeGreaterThanOrEqual(3);
        }
    });

    it('has no stray lowercase mid-caps-line typos in the human leaders (all-caps register throughout)', () => {
        for (const key of ['kaelen', 'martha', 'briggs']) {
            for (const line of LEADER_DEATH_BEATS[key]) {
                const spoken = line.split(':').slice(1).join(':');
                expect(spoken).toBe(spoken.toUpperCase());
            }
        }
    });

    it('flows the full death-beat line array through nextDialogueBeat unmodified, including new lines', () => {
        const beat = nextDialogueBeat('martha', { stage: 0, talks: 0 }, { deaths: 1, questFlags: {} });
        expect(beat.type).toBe('death_beat');
        expect(beat.lines).toEqual(LEADER_DEATH_BEATS.martha);
        expect(beat.lines.length).toBe(3);
    });
});
