import { describe, it, expect } from 'vitest';
import { Act2Manager } from './act2.js';

// Mirrors the death_beat branch in ThreeGame.talkToLeader
// (threeGame.js:9427-9432) without needing a live ThreeGame instance.
function recordDeathBeatSeen(act2, kind, id) {
    if (kind === 'hive') {
        act2.completeHiveQuest(id, 'seen_death_beat', 0);
    } else {
        act2.completeCampQuest(id, 'seen_death_beat', 0);
    }
}

describe('death_beat quest flag', () => {
    it('marks seen_death_beat done for a camp without throwing', () => {
        const act2 = new Act2Manager({ storage: null });
        expect(() => recordDeathBeatSeen(act2, 'camp', 'camp_meridian')).not.toThrow();
        expect(act2.isQuestDone('camp_meridian', 'seen_death_beat')).toBe(true);
    });

    it('marks seen_death_beat done for a hive without throwing', () => {
        const act2 = new Act2Manager({ storage: null });
        expect(() => recordDeathBeatSeen(act2, 'hive', 'hive_suture')).not.toThrow();
    });
});
