// Activates src/humanAI.js's state machine for SurvivorCamp's ambient camp
// workers. Per docs/human-ai-activation-plan.md Slice 1: stimuli are
// derived from signals camp.js already computes every frame (status,
// suspicion, destroyed) instead of new proximity/LOS detection, so the
// state machine goes from zero callers to a real, connected one immediately.
import { HUMAN_STIMULI, nextHumanState } from './humanAI.js';

export function deriveCampWorkerStimulus({
    status = 'alive',
    suspicion = 0,
    previousSuspicion = 0,
    destroyed = false
} = {}) {
    if (status === 'turned') return { type: HUMAN_STIMULI.INFECTION_COMPLETE };
    if (destroyed) return { type: HUMAN_STIMULI.ALLY_DOWN };
    if (status === 'robbed') return { type: HUMAN_STIMULI.DAMAGE_TAKEN };
    if (suspicion >= 50) return { type: HUMAN_STIMULI.THREAT_SEEN, armed: status === 'recruited' };
    if (suspicion >= 20 && suspicion > previousSuspicion) return { type: HUMAN_STIMULI.NOISE_HEARD };
    return null;
}

export function updateCampWorkerHumanState(currentState, campSnapshot) {
    const stimulus = deriveCampWorkerStimulus(campSnapshot);
    if (!stimulus) return currentState ?? 'unaware';
    return nextHumanState(currentState ?? 'unaware', stimulus);
}

const HUMAN_STATE_VISUALS = Object.freeze({
    alerted: Object.freeze({ tint: 0xffe9b0, speedMult: 1.1 }),
    armed: Object.freeze({ tint: 0xff6a4a, speedMult: 1.35 }),
    panicked: Object.freeze({ tint: 0xffcf4a, speedMult: 1.8 }),
    fleeing: Object.freeze({ tint: 0xffffff, speedMult: 2.2 }),
    infected: Object.freeze({ tint: 0x7fff7a, speedMult: 0.6 })
});

export function campWorkerVisualForHumanState(state) {
    return HUMAN_STATE_VISUALS[state] ?? { tint: null, speedMult: 1 };
}
