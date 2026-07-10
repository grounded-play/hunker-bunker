import { describe, it, expect } from 'vitest';
import { MISSION_BRIEFINGS, pickMissionBriefing } from './missions.js';

describe('mission briefings', () => {
    it('every type has multiple label variants', () => {
        for (const type of ['retrieval', 'survey', 'elimination', 'caveSignal']) {
            expect(Array.isArray(MISSION_BRIEFINGS[type])).toBe(true);
            expect(MISSION_BRIEFINGS[type].length).toBeGreaterThanOrEqual(3);
            for (const label of MISSION_BRIEFINGS[type]) expect(typeof label).toBe('string');
        }
    });

    it('pickMissionBriefing is deterministic with injected RNG and bounded', () => {
        expect(pickMissionBriefing('retrieval', () => 0)).toBe(MISSION_BRIEFINGS.retrieval[0]);
        expect(pickMissionBriefing('caveSignal', () => 0)).toBe('OBJECTIVE: INVESTIGATE CAVE SIGNAL');
        const lastIdx = MISSION_BRIEFINGS.survey.length - 1;
        expect(pickMissionBriefing('survey', () => 0.999)).toBe(MISSION_BRIEFINGS.survey[lastIdx]);
    });

    it('unknown type returns null', () => {
        expect(pickMissionBriefing('nope')).toBeNull();
    });
});
