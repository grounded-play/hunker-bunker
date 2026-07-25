// Pure state machine for RGB: Riverside Global 'Botics, per
// docs/mini-games/rgb/state-and-endings.md. No DOM, no content data — the
// runtime and content modules call these transitions and predicates.

export const EVIDENCE_IDS = Object.freeze([
    'camera_discrepancy',
    'swab_photo',
    'payroll_record',
    'kiosk_record',
    'training_profile'
]);

export const PAIN_LEVELS = Object.freeze(['stable', 'injured', 'severe']);

// timeBand is an authored pressure track, not wall-clock time:
// 0 on time, 1 productivity penalty, 2 reduced HR options,
// 3 billing agent unavailable.
const MAX_TIME_BAND = 3;

const FINAL_CHOICES = Object.freeze(['preserve', 'expose', 'sever']);

export function createRunState() {
    return {
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
            gaveUpAtKiosk: false,
            swabCompleted: false,
            billingCase: false
        },
        calibrationQuality: 0,
        trust4A: 0,
        finalChoice: null,
        kioskAttempts: 0,
        rescueOutcome: null
    };
}

export function advanceTime(state, bands = 1) {
    const timeBand = Math.max(0, Math.min(MAX_TIME_BAND, state.timeBand + bands));
    return { ...state, timeBand };
}

export function addEvidence(state, id) {
    if (!EVIDENCE_IDS.includes(id)) {
        throw new Error(`Unknown evidence id: ${id}`);
    }
    if (state.evidence.includes(id)) return state;
    return { ...state, evidence: [...state.evidence, id] };
}

export function addItem(state, itemId) {
    if (state.inventory.includes(itemId)) return state;
    return { ...state, inventory: [...state.inventory, itemId] };
}

export function setPain(state, pain) {
    if (!PAIN_LEVELS.includes(pain)) {
        throw new Error(`Unknown pain level: ${pain}`);
    }
    return { ...state, pain };
}

export function applyChoice(state, choiceId) {
    switch (choiceId) {
        case 'keep_notebook':
            return { ...state, flags: { ...state.flags, keptNotebook: true } };
        case 'surrender_notebook':
            return { ...state, flags: { ...state.flags, keptNotebook: false } };
        case 'request_marisol_witness': {
            const harmed = !state.flags.noticedMarisolPressure;
            return { ...state, flags: { ...state.flags, marisolWitness: true, marisolHarmed: harmed } };
        }
        case 'release_marisol_from_request':
            return { ...state, flags: { ...state.flags, marisolWitness: false, marisolHarmed: false } };
        case 'give_up_at_kiosk':
            return { ...state, flags: { ...state.flags, gaveUpAtKiosk: true } };
        case 'reply_to_lucia':
            return { ...state, flags: { ...state.flags, heardFullMessage: true } };
        case 'speak_with_marisol':
            return { ...state, flags: { ...state.flags, noticedMarisolPressure: true } };
        case 'complete_swab':
            return { ...state, flags: { ...state.flags, swabCompleted: true } };
        case 'request_billing_agent':
            return { ...state, flags: { ...state.flags, billingCase: true } };
        case 'call_lucia':
            return { ...state, flags: { ...state.flags, luciaCallback: true } };
        default:
            throw new Error(`Unknown RGB choice id: ${choiceId}`);
    }
}

export function completeCalibration(state, quality, honest) {
    const calibrationQuality = Math.max(0, Math.min(2, Number(quality) || 0));
    return {
        ...state,
        calibrationQuality,
        trust4A: state.trust4A + (honest ? 2 : 1),
        flags: { ...state.flags, honestErrorLog: Boolean(honest) }
    };
}

export function chooseFinal(state, choice) {
    if (!FINAL_CHOICES.includes(choice)) {
        throw new Error(`Unknown final choice: ${choice}`);
    }
    return { ...state, finalChoice: choice };
}

export function attemptRescue(state, { success } = {}) {
    return { ...state, rescueOutcome: success ? 'success' : 'failed' };
}

// The expose route requires training_profile plus any three other records.
// Marisol's witness statement can substitute for one record only if asking
// her did not ignore the daycare pressure she was already carrying.
export function canExpose(state) {
    if (!state.evidence.includes('training_profile')) return false;
    let count = state.evidence.filter((id) => id !== 'training_profile').length;
    if (state.flags.marisolWitness && state.flags.noticedMarisolPressure) {
        count += 1;
    }
    return count >= 3;
}

export function resolveOutcome(state) {
    if (state.finalChoice === 'preserve') return 'system_loop';
    if (state.finalChoice === 'expose' && canExpose(state)) return 'open_hand';
    if (state.finalChoice === 'sever' && state.rescueOutcome === 'success') return 'ashes_survival';
    return null;
}

export function gameOver(state) {
    if (state.finalChoice === 'sever' && state.rescueOutcome === 'failed') return 'crushed';
    if (state.flags.gaveUpAtKiosk) return 'lockout';
    return null;
}
