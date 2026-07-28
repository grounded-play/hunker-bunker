import { describe, expect, it } from 'vitest';
import {
    createAccessState,
    grantAccess,
    isGateRequirementMet,
    serializeAccessState
} from './accessControl.js';

describe('access control', () => {
    it('evaluates and grants every supported persistent access type', () => {
        const state = createAccessState();
        for (const type of ['power', 'credential', 'boss', 'objective']) {
            const requirement = { type, id: `${type}-id` };
            expect(isGateRequirementMet(requirement, state)).toBe(false);
            expect(grantAccess(state, requirement)).toBe(true);
            expect(isGateRequirementMet(requirement, state)).toBe(true);
        }
        expect(createAccessState(serializeAccessState(state))).toEqual(state);
    });
});
