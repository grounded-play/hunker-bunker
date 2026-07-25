import { describe, expect, it } from 'vitest';
import {
    EVIDENCE_IDS,
    createRunState,
    advanceTime,
    addEvidence,
    setPain,
    applyChoice,
    completeCalibration,
    chooseFinal,
    attemptRescue,
    canExpose,
    resolveOutcome,
    gameOver
} from './state.js';

describe('createRunState', () => {
    it('matches the minimal run state from state-and-endings.md', () => {
        const state = createRunState();
        expect(state).toEqual({
            checkpoint: 'parking_lot',
            timeBand: 0,
            pain: 'stable',
            inventory: [],
            evidence: [],
            flags: {
                heardFullMessage: false,
                noticedMarisolPressure: false,
                honestErrorLog: false,
                keptNotebook: false,
                marisolWitness: false,
                marisolHarmed: false,
                luciaCallback: false,
                gaveUpAtKiosk: false
            },
            calibrationQuality: 0,
            trust4A: 0,
            finalChoice: null,
            kioskAttempts: 0,
            rescueOutcome: null
        });
    });
});

describe('advanceTime', () => {
    it('clamps the authored pressure track between 0 and 3', () => {
        let state = createRunState();
        state = advanceTime(state, 2);
        expect(state.timeBand).toBe(2);
        state = advanceTime(state, 5);
        expect(state.timeBand).toBe(3);
        state = advanceTime(state, -10);
        expect(state.timeBand).toBe(0);
    });

    it('does not mutate the input state', () => {
        const state = createRunState();
        const next = advanceTime(state, 1);
        expect(state.timeBand).toBe(0);
        expect(next).not.toBe(state);
    });
});

describe('addEvidence', () => {
    it('accepts each canonical evidence id exactly once', () => {
        let state = createRunState();
        for (const id of EVIDENCE_IDS) {
            state = addEvidence(state, id);
        }
        expect(state.evidence).toEqual(EVIDENCE_IDS);
    });

    it('does not duplicate an already-collected record', () => {
        let state = createRunState();
        state = addEvidence(state, 'swab_photo');
        state = addEvidence(state, 'swab_photo');
        expect(state.evidence).toEqual(['swab_photo']);
    });

    it('rejects unknown evidence ids', () => {
        expect(() => addEvidence(createRunState(), 'not_real')).toThrow();
    });
});

describe('setPain', () => {
    it('accepts the three authored pain levels', () => {
        expect(setPain(createRunState(), 'injured').pain).toBe('injured');
        expect(setPain(createRunState(), 'severe').pain).toBe('severe');
    });

    it('rejects an unknown pain level', () => {
        expect(() => setPain(createRunState(), 'fine')).toThrow();
    });
});

describe('applyChoice', () => {
    it('keeping the notebook sets keptNotebook', () => {
        const state = applyChoice(createRunState(), 'keep_notebook');
        expect(state.flags.keptNotebook).toBe(true);
    });

    it('surrendering the notebook clears keptNotebook', () => {
        let state = applyChoice(createRunState(), 'keep_notebook');
        state = applyChoice(state, 'surrender_notebook');
        expect(state.flags.keptNotebook).toBe(false);
    });

    it('requesting Marisol as a witness harms her only if her pressure went unnoticed', () => {
        const noticed = applyChoice(
            { ...createRunState(), flags: { ...createRunState().flags, noticedMarisolPressure: true } },
            'request_marisol_witness'
        );
        expect(noticed.flags.marisolWitness).toBe(true);
        expect(noticed.flags.marisolHarmed).toBe(false);

        const unnoticed = applyChoice(createRunState(), 'request_marisol_witness');
        expect(unnoticed.flags.marisolWitness).toBe(true);
        expect(unnoticed.flags.marisolHarmed).toBe(true);
    });

    it('releasing Marisol from the request clears witness and harm', () => {
        let state = applyChoice(createRunState(), 'request_marisol_witness');
        state = applyChoice(state, 'release_marisol_from_request');
        expect(state.flags.marisolWitness).toBe(false);
        expect(state.flags.marisolHarmed).toBe(false);
    });

    it('giving up at the kiosk sets the retryable game-over flag', () => {
        const state = applyChoice(createRunState(), 'give_up_at_kiosk');
        expect(state.flags.gaveUpAtKiosk).toBe(true);
    });

    it('rejects an unknown choice id', () => {
        expect(() => applyChoice(createRunState(), 'nonsense')).toThrow();
    });
});

describe('completeCalibration', () => {
    it('clamps quality to 0-2 and records the honesty flag', () => {
        const honest = completeCalibration(createRunState(), 2, true);
        expect(honest.calibrationQuality).toBe(2);
        expect(honest.flags.honestErrorLog).toBe(true);

        const clamped = completeCalibration(createRunState(), 9, false);
        expect(clamped.calibrationQuality).toBe(2);
        expect(clamped.flags.honestErrorLog).toBe(false);
    });

    it('grants more 4A trust for an honest error log than a falsified one', () => {
        const honest = completeCalibration(createRunState(), 1, true);
        const falsified = completeCalibration(createRunState(), 1, false);
        expect(honest.trust4A).toBeGreaterThan(falsified.trust4A);
    });
});

describe('canExpose', () => {
    function withEvidence(...ids) {
        return ids.reduce((state, id) => addEvidence(state, id), createRunState());
    }

    it('requires the training profile plus three other records', () => {
        expect(canExpose(withEvidence('training_profile'))).toBe(false);
        expect(canExpose(withEvidence('training_profile', 'swab_photo', 'payroll_record'))).toBe(false);
        expect(canExpose(withEvidence(
            'training_profile', 'swab_photo', 'payroll_record', 'kiosk_record'
        ))).toBe(true);
    });

    it('never qualifies on training_profile alone regardless of count fudging', () => {
        expect(canExpose(withEvidence('swab_photo', 'payroll_record', 'kiosk_record', 'camera_discrepancy'))).toBe(false);
    });

    it('lets an unignored Marisol witness substitute for exactly one record', () => {
        let state = withEvidence('training_profile', 'swab_photo', 'payroll_record');
        state = { ...state, flags: { ...state.flags, noticedMarisolPressure: true } };
        state = applyChoice(state, 'request_marisol_witness');
        expect(canExpose(state)).toBe(true);
    });

    it('does not let Marisol substitute if her pressure was ignored', () => {
        let state = withEvidence('training_profile', 'swab_photo', 'payroll_record');
        state = applyChoice(state, 'request_marisol_witness');
        expect(state.flags.noticedMarisolPressure).toBe(false);
        expect(canExpose(state)).toBe(false);
    });
});

describe('chooseFinal', () => {
    it('records one of the three authored resolutions', () => {
        expect(chooseFinal(createRunState(), 'preserve').finalChoice).toBe('preserve');
        expect(chooseFinal(createRunState(), 'expose').finalChoice).toBe('expose');
        expect(chooseFinal(createRunState(), 'sever').finalChoice).toBe('sever');
    });

    it('rejects an unknown resolution', () => {
        expect(() => chooseFinal(createRunState(), 'flee')).toThrow();
    });
});

describe('attemptRescue', () => {
    it('records success or failure without judging the player', () => {
        expect(attemptRescue(createRunState(), { success: true }).rescueOutcome).toBe('success');
        expect(attemptRescue(createRunState(), { success: false }).rescueOutcome).toBe('failed');
    });
});

describe('resolveOutcome', () => {
    it('resolves the System Loop ending on preserve, at any time band', () => {
        let state = chooseFinal(createRunState(), 'preserve');
        state = advanceTime(state, 3);
        expect(resolveOutcome(state)).toBe('system_loop');
    });

    it('resolves Ashes & Survival on sever plus a successful rescue', () => {
        let state = chooseFinal(createRunState(), 'sever');
        state = attemptRescue(state, { success: true });
        expect(resolveOutcome(state)).toBe('ashes_survival');
    });

    it('does not resolve sever without a completed rescue', () => {
        const state = chooseFinal(createRunState(), 'sever');
        expect(resolveOutcome(state)).toBe(null);
    });

    it('resolves Open Hand on expose only with sufficient evidence', () => {
        let state = chooseFinal(createRunState(), 'expose');
        expect(resolveOutcome(state)).toBe(null);
        state = addEvidence(state, 'training_profile');
        state = addEvidence(state, 'swab_photo');
        state = addEvidence(state, 'payroll_record');
        state = addEvidence(state, 'kiosk_record');
        expect(resolveOutcome(state)).toBe('open_hand');
    });

    it('never ranks endings; only reports which one, if any, resolved', () => {
        expect(resolveOutcome(createRunState())).toBe(null);
    });
});

describe('gameOver', () => {
    it('reports Crushed on a failed rescue after severing the trunk', () => {
        let state = chooseFinal(createRunState(), 'sever');
        state = attemptRescue(state, { success: false });
        expect(gameOver(state)).toBe('crushed');
    });

    it('reports Lockout only after an explicit give-up at the kiosk', () => {
        expect(gameOver(createRunState())).toBe(null);
        const gaveUp = applyChoice(createRunState(), 'give_up_at_kiosk');
        expect(gameOver(gaveUp)).toBe('lockout');
    });

    it('does not treat a merely poor player as a game over', () => {
        let state = createRunState();
        state = advanceTime(state, 3);
        state = setPain(state, 'severe');
        expect(gameOver(state)).toBe(null);
    });
});
