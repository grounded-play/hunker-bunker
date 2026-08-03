import { describe, expect, it } from 'vitest';
import {
    campWorkerVisualForHumanState,
    deriveCampWorkerStimulus,
    selectCampWorkerStateCue,
    updateCampWorkerHumanState,
    updateCampWorkersHumanStates
} from './campHumanBehavior.js';

describe('deriveCampWorkerStimulus', () => {
    it('has no stimulus for a calm, unchanged camp', () => {
        expect(deriveCampWorkerStimulus({ status: 'alive', suspicion: 0, previousSuspicion: 0 })).toBeNull();
    });

    it('reads rising suspicion below the lockdown line as noise', () => {
        const stimulus = deriveCampWorkerStimulus({ status: 'alive', suspicion: 25, previousSuspicion: 10 });
        expect(stimulus?.type).toBe('noise_heard');
    });

    it('does not re-fire noise when suspicion is flat or falling', () => {
        expect(deriveCampWorkerStimulus({ status: 'alive', suspicion: 25, previousSuspicion: 25 })).toBeNull();
        expect(deriveCampWorkerStimulus({ status: 'alive', suspicion: 15, previousSuspicion: 25 })).toBeNull();
    });

    it('reads the lockdown line (suspicion >= 50) as a seen threat', () => {
        expect(deriveCampWorkerStimulus({ status: 'alive', suspicion: 50, previousSuspicion: 50 })?.type).toBe('threat_seen');
    });

    it('maps camp status directly to the matching stimulus', () => {
        expect(deriveCampWorkerStimulus({ status: 'robbed', suspicion: 0 })?.type).toBe('damage_taken');
        expect(deriveCampWorkerStimulus({ status: 'turned', suspicion: 0 })?.type).toBe('infection_complete');
        expect(deriveCampWorkerStimulus({ status: 'alive', destroyed: true })?.type).toBe('ally_down');
    });
});

describe('updateCampWorkerHumanState (the actual humanAI.js activation)', () => {
    it('stays unaware with no stimulus', () => {
        expect(updateCampWorkerHumanState('unaware', { status: 'alive', suspicion: 0 })).toBe('unaware');
    });

    it('escalates unaware -> alerted -> armed as suspicion rises to the lockdown line for an armed (recruited) camp', () => {
        let state = updateCampWorkerHumanState('unaware', { status: 'recruited', suspicion: 25, previousSuspicion: 10 });
        expect(state).toBe('alerted');
        state = updateCampWorkerHumanState(state, { status: 'recruited', suspicion: 50, previousSuspicion: 25 });
        expect(state).toBe('armed');
    });

    it('an unarmed (undecided) camp only reaches alerted, never armed, at the lockdown line', () => {
        let state = updateCampWorkerHumanState('unaware', { status: 'alive', suspicion: 25, previousSuspicion: 10 });
        state = updateCampWorkerHumanState(state, { status: 'alive', suspicion: 50, previousSuspicion: 25 });
        expect(state).toBe('alerted');
    });

    it('is permanent once infected, regardless of later camp status', () => {
        const infected = updateCampWorkerHumanState('unaware', { status: 'turned' });
        expect(infected).toBe('infected');
        const stillInfected = updateCampWorkerHumanState(infected, { status: 'robbed' });
        expect(stillInfected).toBe('infected');
    });

    it('reacts to the camp being destroyed by panicking', () => {
        expect(updateCampWorkerHumanState('unaware', { status: 'alive', destroyed: true })).toBe('panicked');
    });
});

describe('escalation lines up with the real lockdown gate (Phase 8.2 Slice 2)', () => {
    it('reaches armed at suspicion 50, the exact threshold SurvivorCamp.isLockedDown (src/camp.js:533) and getActionableCampAt\'s lockdown gate (src/threeGame.js:9900) already use to refuse bond/support/quest/aid', () => {
        const state = updateCampWorkerHumanState('alerted', {
            status: 'recruited',
            suspicion: 50,
            previousSuspicion: 49
        });
        expect(state).toBe('armed');
    });

    it('is not yet escalated one point below the lockdown threshold', () => {
        const state = updateCampWorkerHumanState('unaware', {
            status: 'recruited',
            suspicion: 49,
            previousSuspicion: 30
        });
        expect(state).not.toBe('armed');
    });
});

describe('updateCampWorkersHumanStates (Phase 8.2 Slice 3: per-worker, not per-camp-shared)', () => {
    it('leaves every worker unchanged when there is no stimulus', () => {
        const result = updateCampWorkersHumanStates(['unaware', 'alerted'], { status: 'alive', suspicion: 0, previousSuspicion: 0 });
        expect(result).toEqual(['unaware', 'alerted']);
    });

    it('escalates every worker when every worker "notices" (random always below the reaction chance)', () => {
        const result = updateCampWorkersHumanStates(
            ['unaware', 'unaware'],
            { status: 'turned' },
            () => 0
        );
        expect(result).toEqual(['infected', 'infected']);
    });

    it('lets workers diverge: some notice a stimulus, some do not, based on the injected random source', () => {
        const random = (() => {
            const sequence = [0, 0.99]; // first worker always reacts, second never does
            let index = 0;
            return () => sequence[index++ % sequence.length];
        })();
        const result = updateCampWorkersHumanStates(['unaware', 'unaware'], { status: 'turned' }, random);
        expect(result).toEqual(['infected', 'unaware']);
    });

    it('defaults missing worker state to unaware', () => {
        const result = updateCampWorkersHumanStates([undefined, null], { status: 'turned' }, () => 0);
        expect(result).toEqual(['infected', 'infected']);
    });
});

describe('campWorkerVisualForHumanState', () => {
    it('gives every escalated state a distinct tint and a faster-than-normal speed', () => {
        for (const state of ['alerted', 'armed', 'panicked', 'fleeing', 'infected']) {
            const visual = campWorkerVisualForHumanState(state);
            expect(visual.tint, state).not.toBeNull();
        }
        expect(campWorkerVisualForHumanState('infected').speedMult).toBeLessThan(1);
        expect(campWorkerVisualForHumanState('panicked').speedMult).toBeGreaterThan(1);
    });

    it('has no visual override for unaware', () => {
        expect(campWorkerVisualForHumanState('unaware')).toEqual({ tint: null, speedMult: 1 });
    });
});

describe('selectCampWorkerStateCue', () => {
    it('returns one cue for a newly entered state', () => {
        expect(selectCampWorkerStateCue(['unaware'], ['alerted'])).toBe('camp_worker_alerted');
    });

    it('chooses the highest-priority changed state when workers diverge', () => {
        expect(selectCampWorkerStateCue(
            ['unaware', 'alerted', 'armed'],
            ['alerted', 'panicked', 'infected']
        )).toBe('camp_worker_infected');
    });

    it('does not repeat a cue while states remain unchanged', () => {
        expect(selectCampWorkerStateCue(['armed', 'alerted'], ['armed', 'alerted'])).toBeNull();
    });
});
