export const HUMAN_AI_ENABLED = false;

export const HUMAN_STATES = Object.freeze([
    'unaware',
    'alerted',
    'armed',
    'panicked',
    'fleeing',
    'infected'
]);

export const HUMAN_STIMULI = Object.freeze({
    NOISE_HEARD: 'noise_heard',
    THREAT_SEEN: 'threat_seen',
    WEAPON_FOUND: 'weapon_found',
    DAMAGE_TAKEN: 'damage_taken',
    ALLY_DOWN: 'ally_down',
    LOW_MORALE: 'low_morale',
    EXIT_REACHED: 'exit_reached',
    LATCH_EVENT: 'latch_event',
    INFECTION_COMPLETE: 'infection_complete'
});

function normalizeState(state) {
    return HUMAN_STATES.includes(state) ? state : 'unaware';
}

export function nextHumanState(state = 'unaware', stimulus = {}) {
    const current = normalizeState(state);
    const type = typeof stimulus === 'string' ? stimulus : stimulus?.type;
    const armed = Boolean(stimulus?.armed);

    if (current === 'infected') return 'infected';
    if (type === HUMAN_STIMULI.LATCH_EVENT || type === HUMAN_STIMULI.INFECTION_COMPLETE) return 'infected';
    if (type === HUMAN_STIMULI.EXIT_REACHED) return current;
    if (type === HUMAN_STIMULI.LOW_MORALE) return 'fleeing';
    if (type === HUMAN_STIMULI.DAMAGE_TAKEN || type === HUMAN_STIMULI.ALLY_DOWN) return current === 'armed' && armed ? 'armed' : 'panicked';

    if (current === 'unaware') {
        if (type === HUMAN_STIMULI.NOISE_HEARD || type === HUMAN_STIMULI.THREAT_SEEN) return armed ? 'armed' : 'alerted';
        if (type === HUMAN_STIMULI.WEAPON_FOUND) return 'armed';
    }

    if (current === 'alerted') {
        if (type === HUMAN_STIMULI.WEAPON_FOUND || (type === HUMAN_STIMULI.THREAT_SEEN && armed)) return 'armed';
        if (type === HUMAN_STIMULI.THREAT_SEEN) return 'alerted';
    }

    if (current === 'panicked' && type === HUMAN_STIMULI.WEAPON_FOUND) return 'armed';
    return current;
}
